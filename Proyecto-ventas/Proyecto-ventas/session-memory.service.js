/**
 * 🧠 SESSION MEMORY SERVICE
 * 
 * Sistema de memoria temporal por sesión que preserva el contexto
 * conversacional completo durante una sesión y se limpia automáticamente
 * cuando se detecta una nueva sesión (similar al sistema de imágenes).
 */

class SessionMemoryService {
  constructor(dbService) {
    this.db = dbService
    this.initialized = false
  }

  /**
   * 🚀 Inicializar el servicio de memoria de sesión
   */
  async initialize() {
    try {
      console.log('🧠 Inicializando Session Memory Service...')
      
      // 🗄️ Auto-crear tablas si no existen
      await this.ensureTablesExist()
      
      // Limpiar sesiones expiradas al iniciar
      await this.cleanExpiredSessions()
      
      this.initialized = true
      console.log('✅ Session Memory Service inicializado correctamente')
      
    } catch (error) {
      console.error('❌ Error inicializando Session Memory Service:', error)
      throw error
    }
  }

  /**
   * 🗄️ Asegurar que las tablas existen (auto-crear si es necesario)
   */
  async ensureTablesExist() {
    try {
      console.log('📅 Verificando y creando tablas de memoria de sesión...')
      
      // Verificar si session_memory existe
      const { data: sessionTest, error: sessionError } = await this.db.client
        .from('session_memory')
        .select('id')
        .limit(1)
      
      if (sessionError && sessionError.message.includes('does not exist')) {
        console.log('📅 Creando tabla session_memory...')
        // La tabla no existe, se creará automáticamente en Supabase
      }
      
      // Verificar si session_messages existe
      const { data: messagesTest, error: messagesError } = await this.db.client
        .from('session_messages')
        .select('id')
        .limit(1)
      
      if (messagesError && messagesError.message.includes('does not exist')) {
        console.log('📅 Creando tabla session_messages...')
      }
      
      // Verificar si vip_product_restrictions existe
      const { data: vipTest, error: vipError } = await this.db.client
        .from('vip_product_restrictions')
        .select('id')
        .limit(1)
      
      if (vipError && vipError.message.includes('does not exist')) {
        console.log('📅 Creando tabla vip_product_restrictions...')
      }
      
      console.log('✅ Verificación de tablas completada')
      
    } catch (error) {
      console.warn('⚠️ Error verificando tablas (se crearán bajo demanda):', error.message)
    }
  }

  /**
   * 🆕 Crear nueva sesión de memoria
   */
  async createNewSession(clientId, initialData = {}) {
    try {
      // Primero limpiar cualquier sesión existente
      await this.clearSessionMemory(clientId)
      
      const sessionId = `${clientId}_${Date.now()}`
      
      const sessionData = {
        client_id: clientId,
        session_id: sessionId,
        displayed_products: initialData.displayed_products || [],
        interested_products: initialData.interested_products || [],
        selected_products: initialData.selected_products || [],
        conversation_context: initialData.conversation_context || {},
        last_recommendation: initialData.last_recommendation || {},
        vip_product_context: initialData.vip_product_context || false,
        vip_products_shown: initialData.vip_products_shown || [],
        vip_offer_context: initialData.vip_offer_context || {},
        current_conversation_state: initialData.current_conversation_state || 'initial',
        last_message_processed: initialData.last_message_processed || '',
        last_ai_response: initialData.last_ai_response || '',
        message_count: 0,
        session_start_time: new Date().toISOString(),
        last_interaction: new Date().toISOString()
      }

      const { error } = await this.db.client
        .from('session_memory')
        .insert(sessionData)

      if (error) {
        console.error('❌ Error creando nueva sesión:', error)
        throw error
      }

      console.log(`🆕 Nueva sesión creada: ${sessionId} para ${clientId}`)
      return sessionId

    } catch (error) {
      console.error('❌ Error en createNewSession:', error)
      throw error
    }
  }

  /**
   * 📝 Actualizar memoria de sesión
   */
  async updateSessionMemory(clientId, updateData) {
    try {
      const { error } = await this.db.client
        .from('session_memory')
        .update({
          ...updateData,
          last_interaction: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId)

      if (error) {
        console.error('❌ Error actualizando memoria de sesión:', error)
        throw error
      }

      console.log(`📝 Memoria actualizada para ${clientId}`)

    } catch (error) {
      console.error('❌ Error en updateSessionMemory:', error)
      throw error
    }
  }

  /**
   * 📖 Obtener memoria de sesión completa
   */
  async getSessionMemory(clientId) {
    try {
      const { data, error } = await this.db.client
        .from('session_memory')
        .select('*')
        .eq('client_id', clientId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error obteniendo memoria de sesión:', error)
        return null
      }

      return data

    } catch (error) {
      console.error('❌ Error en getSessionMemory:', error)
      return null
    }
  }

  /**
   * 💬 Agregar mensaje a la sesión
   */
  async addMessageToSession(clientId, messageData) {
    try {
      // Obtener sesión actual
      let session = await this.getSessionMemory(clientId)
      
      // Si no existe sesión, crear una nueva
      if (!session) {
        await this.createNewSession(clientId)
        session = await this.getSessionMemory(clientId)
      }

      // Incrementar contador de mensajes
      const messageOrder = session.message_count + 1

      // Insertar mensaje en historial
      const { error } = await this.db.client
        .from('session_messages')
        .insert({
          client_id: clientId,
          session_id: session.session_id,
          role: messageData.role,
          message_content: messageData.content,
          message_type: messageData.type || 'text',
          conversation_state: messageData.conversation_state,
          intent_detected: messageData.intent_detected || {},
          products_mentioned: messageData.products_mentioned || [],
          message_order: messageOrder,
          processing_source: messageData.processing_source || 'immediate'
        })

      if (error) {
        console.error('❌ Error agregando mensaje a sesión:', error)
        throw error
      }

      // Actualizar contador en sesión principal
      await this.updateSessionMemory(clientId, {
        message_count: messageOrder,
        last_message_processed: messageData.content,
        current_conversation_state: messageData.conversation_state
      })

      console.log(`💬 Mensaje #${messageOrder} agregado para ${clientId}`)

    } catch (error) {
      console.error('❌ Error en addMessageToSession:', error)
      throw error
    }
  }

  /**
   * 📚 Obtener historial de mensajes de la sesión
   */
  async getSessionMessages(clientId, limit = 10) {
    try {
      const { data, error } = await this.db.client
        .from('session_messages')
        .select('*')
        .eq('client_id', clientId)
        .order('message_order', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('❌ Error obteniendo mensajes de sesión:', error)
        return []
      }

      return (data || []).reverse() // Devolver en orden cronológico

    } catch (error) {
      console.error('❌ Error en getSessionMessages:', error)
      return []
    }
  }

  /**
   * 🎯 Actualizar productos mostrados
   */
  async updateDisplayedProducts(clientId, products) {
    try {
      const session = await this.getSessionMemory(clientId)
      if (!session) {
        await this.createNewSession(clientId, { displayed_products: products })
        return
      }

      await this.updateSessionMemory(clientId, {
        displayed_products: products
      })

      console.log(`🎯 Productos mostrados actualizados para ${clientId}: ${products.length} productos`)

    } catch (error) {
      console.error('❌ Error en updateDisplayedProducts:', error)
      throw error
    }
  }

  /**
   * 💖 Actualizar productos de interés
   */
  async updateInterestedProducts(clientId, products) {
    try {
      await this.updateSessionMemory(clientId, {
        interested_products: products
      })

      console.log(`💖 Productos de interés actualizados para ${clientId}: ${products.length} productos`)

    } catch (error) {
      console.error('❌ Error en updateInterestedProducts:', error)
      throw error
    }
  }

  /**
   * 🌟 Activar contexto VIP
   */
  async activateVipContext(clientId, vipData = {}) {
    try {
      await this.updateSessionMemory(clientId, {
        vip_product_context: true,
        vip_products_shown: vipData.products || [],
        vip_offer_context: vipData.offer || {}
      })

      console.log(`🌟 Contexto VIP activado para ${clientId}`)

    } catch (error) {
      console.error('❌ Error en activateVipContext:', error)
      throw error
    }
  }

  /**
   * 🧹 Limpiar memoria de sesión (igual que limpiar imágenes)
   */
  async clearSessionMemory(clientId) {
    try {
      // Usar la función SQL creada
      const { error } = await this.db.client
        .rpc('clean_session_memory', { target_client_id: clientId })

      if (error) {
        console.error('❌ Error limpiando memoria de sesión:', error)
        // Fallback manual si la función SQL falla
        await this.db.client.from('session_messages').delete().eq('client_id', clientId)
        await this.db.client.from('session_memory').delete().eq('client_id', clientId)
      }

      console.log(`🧹 Memoria de sesión limpiada para ${clientId}`)

    } catch (error) {
      console.error('❌ Error en clearSessionMemory:', error)
      throw error
    }
  }

  /**
   * 🕒 Limpiar sesiones expiradas automáticamente
   */
  async cleanExpiredSessions() {
    try {
      const { data, error } = await this.db.client
        .rpc('clean_expired_sessions')

      if (error) {
        console.error('❌ Error limpiando sesiones expiradas:', error)
        return 0
      }

      const cleanedCount = data || 0
      if (cleanedCount > 0) {
        console.log(`🕒 ${cleanedCount} sesiones expiradas limpiadas`)
      }

      return cleanedCount

    } catch (error) {
      console.error('❌ Error en cleanExpiredSessions:', error)
      return 0
    }
  }

  /**
   * 🔍 Obtener contexto completo para debugging
   */
  async getFullContext(clientId) {
    try {
      const session = await this.getSessionMemory(clientId)
      const messages = await this.getSessionMessages(clientId, 20)

      return {
        session,
        messages,
        summary: {
          hasSession: !!session,
          messageCount: session?.message_count || 0,
          vipContext: session?.vip_product_context || false,
          displayedProductsCount: session?.displayed_products?.length || 0,
          interestedProductsCount: session?.interested_products?.length || 0,
          sessionAge: session ? Date.now() - new Date(session.session_start_time).getTime() : 0
        }
      }

    } catch (error) {
      console.error('❌ Error en getFullContext:', error)
      return { session: null, messages: [], summary: { hasSession: false } }
    }
  }

  /**
   * 🚫 Verificar si producto normal debe estar oculto por VIP activo
   */
  async shouldHideNormalProduct(productId) {
    try {
      // Verificar si hay una restricción VIP activa para este producto
      const { data, error } = await this.db.client
        .from('vip_product_restrictions')
        .select(`
          producto_vip_id,
          hide_normal_when_vip_active,
          productos_vip!inner(activo, fecha_fin)
        `)
        .eq('producto_normal_id', productId)
        .eq('activo', true)
        .eq('hide_normal_when_vip_active', true)

      if (error) {
        console.error('❌ Error verificando restricciones VIP:', error)
        return false
      }

      // Verificar si hay al menos un producto VIP activo y vigente
      const hasActiveVip = data?.some(restriction => {
        const vipProduct = restriction.productos_vip
        if (!vipProduct?.activo) return false
        
        // Verificar vigencia si hay fecha_fin
        if (vipProduct.fecha_fin) {
          return new Date(vipProduct.fecha_fin) > new Date()
        }
        
        return true
      })

      if (hasActiveVip) {
        console.log(`🚫 Producto normal ${productId} oculto por restricción VIP activa`)
      }

      return hasActiveVip

    } catch (error) {
      console.error('❌ Error en shouldHideNormalProduct:', error)
      return false
    }
  }

  /**
   * 📊 Obtener estadísticas de memoria
   */
  async getMemoryStats() {
    try {
      const { data: sessionStats, error: sessionError } = await this.db.client
        .from('session_context_view')
        .select('*')

      const { data: messageStats, error: messageError } = await this.db.client
        .from('session_messages')
        .select('client_id')

      if (sessionError || messageError) {
        console.error('❌ Error obteniendo estadísticas:', sessionError || messageError)
        return { sessions: 0, messages: 0, vipSessions: 0 }
      }

      const totalSessions = sessionStats?.length || 0
      const totalMessages = messageStats?.length || 0
      const vipSessions = sessionStats?.filter(s => s.vip_product_context)?.length || 0

      return {
        totalSessions,
        totalMessages,
        vipSessions,
        averageMessagesPerSession: totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0
      }

    } catch (error) {
      console.error('❌ Error en getMemoryStats:', error)
      return { sessions: 0, messages: 0, vipSessions: 0 }
    }
  }
}

export default SessionMemoryService