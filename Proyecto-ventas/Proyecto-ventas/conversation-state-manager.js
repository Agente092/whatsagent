/**
 * 🧠 CONVERSATION STATE MANAGER - GESTIÓN ROBUSTA DE CONTEXTO
 * 
 * Solución para evitar confusión de productos y pérdida de memoria
 * Implementa árbol de decisión conversacional con estados claros
 */

export class ConversationStateManager {
  constructor(supabaseService) {
    this.db = supabaseService
    this.userStates = new Map() // Cache en memoria para estados activos
  }

  /**
   * 🎯 OBTENER ESTADO ACTUAL DEL USUARIO
   */
  async getUserState(userId) {
    try {
      // Verificar cache primero
      if (this.userStates.has(userId)) {
        return this.userStates.get(userId)
      }

      // Buscar en base de datos
      const { data, error } = await this.db.client
        .from('conversation_states')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error obteniendo estado conversacional:', error)
        return this.createDefaultState(userId)
      }

      const state = data || this.createDefaultState(userId)
      this.userStates.set(userId, state)
      return state

    } catch (error) {
      console.error('Error en getUserState:', error)
      return this.createDefaultState(userId)
    }
  }

  /**
   * 🆕 CREAR ESTADO POR DEFECTO
   */
  createDefaultState(userId) {
    return {
      user_id: userId,
      current_state: 'inicio',
      current_product: null,
      current_product_id: null,
      current_product_type: null, // 'vip' | 'regular'
      conversation_context: {},
      search_history: [],
      last_message: null,
      state_confidence: 1.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  /**
   * 🔄 ACTUALIZAR ESTADO DEL USUARIO
   */
  async updateUserState(userId, updates) {
    try {
      const currentState = await this.getUserState(userId)
      
      const newState = {
        ...currentState,
        ...updates,
        updated_at: new Date().toISOString()
      }

      // Actualizar cache
      this.userStates.set(userId, newState)

      // Guardar en base de datos usando INSERT/UPDATE manual (sin upsert)
      let upsertSuccess = false
      
      try {
        // Intentar actualizar registro existente primero
        const { data: updateData, error: updateError } = await this.db.client
          .from('conversation_states')
          .update({
            current_state: newState.current_state,
            current_product: newState.current_product,
            current_product_id: newState.current_product_id,
            current_product_type: newState.current_product_type,
            conversation_context: newState.conversation_context,
            search_history: newState.search_history,
            last_message: newState.last_message,
            state_confidence: newState.state_confidence,
            updated_at: newState.updated_at
          })
          .eq('user_id', userId)
          .select()
        
        if (updateError || !updateData || updateData.length === 0) {
          // Si UPDATE falló o no afectó filas, intentar INSERT
          const { error: insertError } = await this.db.client
            .from('conversation_states')
            .insert({
              user_id: userId,
              current_state: newState.current_state,
              current_product: newState.current_product,
              current_product_id: newState.current_product_id,
              current_product_type: newState.current_product_type,
              conversation_context: newState.conversation_context,
              search_history: newState.search_history,
              last_message: newState.last_message,
              state_confidence: newState.state_confidence,
              created_at: newState.created_at,
              updated_at: newState.updated_at
            })
          
          if (insertError) {
            console.error('Error en INSERT:', insertError)
          } else {
            upsertSuccess = true
          }
        } else {
          upsertSuccess = true
        }
      } catch (error) {
        console.error('Error en operación de base de datos:', error)
      }

      console.log(`🧠 Estado actualizado para ${userId}: ${newState.current_state} -> ${newState.current_product || 'sin producto'}`)
      return newState

    } catch (error) {
      console.error('Error en updateUserState:', error)
      return null
    }
  }

  /**
   * 🎯 DETECTAR CAMBIO DE PRODUCTO SOLICITADO
   */
  async detectProductChange(userId, message, currentContext) {
    try {
      const state = await this.getUserState(userId)
      
      // Extraer productos mencionados en el mensaje actual
      const mentionedProducts = this.extractProductsFromMessage(message)
      
      if (mentionedProducts.length === 0) {
        return { hasChange: false, state }
      }

      const newProduct = mentionedProducts[0]
      
      // Verificar si hay cambio de producto
      if (state.current_product && 
          this.normalizeProductName(state.current_product) !== this.normalizeProductName(newProduct)) {
        
        console.log(`🔄 CAMBIO DE PRODUCTO DETECTADO: "${state.current_product}" -> "${newProduct}"`)
        
        // Limpiar contexto anterior y establecer nuevo
        await this.clearConflictingContext(userId)
        
        const updatedState = await this.updateUserState(userId, {
          current_state: 'consultando_producto',
          current_product: newProduct,
          current_product_id: null,
          conversation_context: {
            product_search: newProduct,
            previous_product: state.current_product
          },
          search_history: [...(state.search_history || []), newProduct]
        })

        return { hasChange: true, state: updatedState, newProduct }
      }

      return { hasChange: false, state }

    } catch (error) {
      console.error('Error detectando cambio de producto:', error)
      return { hasChange: false, state: await this.getUserState(userId) }
    }
  }

  /**
   * 🧹 LIMPIAR CONTEXTO CONFLICTIVO DE FORMA ROBUSTA
   */
  async clearConflictingContext(userId) {
    try {
      console.log(`🧹 Limpiando contexto conflictivo para ${userId}`)
      
      // Limpiar memoria de sesión
      await this.db.client
        .from('memory_session')
        .delete()
        .eq('user_id', userId)

      // Limpiar memoria dual
      await this.db.client
        .from('dual_memory')
        .delete()
        .eq('user_id', userId)

      // Limpiar cache
      if (this.userStates.has(userId)) {
        const state = this.userStates.get(userId)
        state.conversation_context = {}
        state.current_product_id = null
      }

      console.log(`✅ Contexto limpiado exitosamente para ${userId}`)

    } catch (error) {
      console.error('❌ Error limpiando contexto:', error)
    }
  }

  /**
   * 🔍 EXTRAER PRODUCTOS MENCIONADOS DEL MENSAJE
   */
  extractProductsFromMessage(message) {
    const productPatterns = [
      /iphone\s*(\d+)(\s*pro(\s*max)?)?/gi,
      /samsung\s*galaxy\s*s\d+/gi,
      /huawei\s*\w+/gi,
      /xiaomi\s*\w+/gi
    ]

    const products = []
    const normalizedMessage = message.toLowerCase()

    for (const pattern of productPatterns) {
      const matches = normalizedMessage.match(pattern)
      if (matches) {
        products.push(...matches)
      }
    }

    return [...new Set(products)] // Eliminar duplicados
  }

  /**
   * 🔧 NORMALIZAR NOMBRE DE PRODUCTO PARA COMPARACIÓN
   */
  normalizeProductName(productName) {
    if (!productName) return ''
    
    return productName
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\b(apple|samsung|huawei|xiaomi)\b/g, '')
      .replace(/\b(gb|tb)\b/g, '')
      .replace(/\b(vip|regular)\b/g, '')
      .trim()
  }

  /**
   * 🎯 OBTENER CONTEXTO ENRIQUECIDO PARA GEMINI
   */
  async getEnrichedContext(userId, message) {
    try {
      const state = await this.getUserState(userId)
      
      // Detectar cambio de producto
      const productChange = await this.detectProductChange(userId, message, state.conversation_context)
      
      if (productChange.hasChange) {
        return {
          contextType: 'product_change',
          currentProduct: productChange.newProduct,
          previousProduct: state.current_product,
          cleanContext: true,
          state: productChange.state
        }
      }

      // Contexto normal
      return {
        contextType: 'continuation',
        currentProduct: state.current_product,
        currentProductId: state.current_product_id,
        conversationHistory: state.conversation_context,
        cleanContext: false,
        state
      }

    } catch (error) {
      console.error('Error obteniendo contexto enriquecido:', error)
      return {
        contextType: 'error',
        cleanContext: true,
        state: await this.getUserState(userId)
      }
    }
  }

  /**
   * 📊 ESTADÍSTICAS DE CONVERSACIÓN
   */
  async getConversationStats(userId) {
    try {
      const state = await this.getUserState(userId)
      
      return {
        currentState: state.current_state,
        currentProduct: state.current_product,
        searchHistory: state.search_history || [],
        conversationDuration: this.calculateDuration(state.created_at),
        contextConfidence: state.state_confidence || 0
      }

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error)
      return null
    }
  }

  /**
   * ⏱️ CALCULAR DURACIÓN DE CONVERSACIÓN
   */
  calculateDuration(startTime) {
    const start = new Date(startTime)
    const now = new Date()
    return Math.round((now - start) / 1000 / 60) // Minutos
  }

  /**
   * 🧹 LIMPIAR ESTADOS EXPIRADOS
   */
  async cleanupExpiredStates() {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { error } = await this.db.client
        .from('conversation_states')
        .delete()
        .lt('updated_at', oneDayAgo)

      if (!error) {
        console.log('🧹 Estados expirados limpiados')
      }

    } catch (error) {
      console.error('Error limpiando estados expirados:', error)
    }
  }
}

export default ConversationStateManager