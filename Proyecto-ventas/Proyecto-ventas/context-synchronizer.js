// =======================================
// 🔄 SINCRONIZADOR DE CONTEXTO UNIFICADO
// =======================================
// Este servicio asegura que todos los sistemas de memoria
// estén sincronizados y no haya conflictos entre ellos

class ContextSynchronizer {
  constructor(database, sessionMemory, dualMemory) {
    this.db = database
    this.sessionMemory = sessionMemory
    this.dualMemory = dualMemory
  }

  /**
   * 🎯 SINCRONIZACIÓN PRINCIPAL: Producto mostrado/seleccionado
   */
  async syncProductContext(clientId, productData, contextType = 'displayed') {
    try {
      console.log(`🔄 SINCRONIZANDO contexto de producto para ${clientId}: ${productData.name} (${contextType})`)
      
      const contextTimestamp = new Date().toISOString()
      const productInfo = {
        id: productData.id,
        name: productData.name || productData.nombre,
        price: productData.price || productData.precio,
        description: productData.description || productData.descripcion,
        stock: productData.stock,
        isVip: productData.isVip || productData.es_vip || false,
        timestamp: contextTimestamp,
        contextType,
        source: 'context_synchronizer'
      }

      // 1. 🧠 SESSION MEMORY - Actualizar productos mostrados
      if (this.sessionMemory) {
        try {
          const currentSession = await this.sessionMemory.getSessionMemory(clientId)
          const existingProducts = currentSession?.displayed_products || []
          
          // Agregar nuevo producto al inicio (más reciente)
          const updatedProducts = [productInfo, ...existingProducts.slice(0, 4)] // Mantener solo 5 más recientes
          
          await this.sessionMemory.updateSessionMemory(clientId, {
            displayed_products: updatedProducts,
            vip_product_context: productInfo.isVip,
            last_product_shown: productInfo.name
          })
          
          console.log(`✅ Session Memory sincronizada: ${productInfo.name}`)
        } catch (sessionError) {
          console.warn(`⚠️ Error sincronizando Session Memory: ${sessionError.message}`)
        }
      }

      // 2. 🎆 DUAL MEMORY VIP - Si es producto VIP
      if (productInfo.isVip && this.dualMemory) {
        try {
          await this.dualMemory.activateVipMemory(clientId, [productInfo])
          console.log(`✅ Dual Memory VIP sincronizada: ${productInfo.name}`)
        } catch (vipError) {
          console.warn(`⚠️ Error sincronizando Dual Memory VIP: ${vipError.message}`)
        }
      }

      // 3. 📦 DUAL MEMORY INVENTARIO - Si es producto normal
      if (!productInfo.isVip && this.dualMemory) {
        try {
          await this.dualMemory.activateInventoryMemory(clientId, [productInfo])
          console.log(`✅ Dual Memory Inventario sincronizada: ${productInfo.name}`)
        } catch (invError) {
          console.warn(`⚠️ Error sincronizando Dual Memory Inventario: ${invError.message}`)
        }
      }

      // 4. 🗄️ CONVERSATION STATES - Actualizar estado conversacional
      if (this.db) {
        try {
          // Obtener estado actual
          const currentData = await this.getConversationData(clientId) || {}
          
          // Actualizar con nueva información
          const updatedData = {
            ...currentData,
            displayed_products: [productInfo],
            last_product_context: productInfo,
            vip_product_context: productInfo.isVip,
            context_sync_timestamp: contextTimestamp,
            synchronized: true
          }
          
          await this.setConversationData(clientId, updatedData)
          console.log(`✅ Conversation States sincronizada: ${productInfo.name}`)
        } catch (stateError) {
          console.warn(`⚠️ Error sincronizando Conversation States: ${stateError.message}`)
        }
      }

      // 5. 🔥 ENHANCED CONTEXT - Para sistemas Enhanced
      if (this.db && this.db.client) {
        try {
          const { error } = await this.db.client
            .from('conversaciones')
            .upsert({
              user_id: clientId,
              enhanced_context_active: true,
              enhanced_last_product: productInfo.name,
              enhanced_product_price: productInfo.price.toString(),
              enhanced_timestamp: contextTimestamp,
              context_preserved: true,
              source: 'context_synchronizer',
              displayed_products: JSON.stringify([productInfo]),
              updated_at: contextTimestamp
            }, {
              onConflict: 'user_id'
            })

          if (!error) {
            console.log(`✅ Enhanced Context sincronizado: ${productInfo.name}`)
          }
        } catch (enhancedError) {
          console.warn(`⚠️ Error sincronizando Enhanced Context: ${enhancedError.message}`)
        }
      }

      return {
        success: true,
        productSynced: productInfo.name,
        contextType,
        timestamp: contextTimestamp
      }

    } catch (error) {
      console.error(`❌ Error en sincronización de contexto: ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 🧹 LIMPIAR CONTEXTO OBSOLETO
   */
  async clearObsoleteContext(clientId, reason = 'new_session') {
    try {
      console.log(`🧹 LIMPIANDO contexto obsoleto para ${clientId} (razón: ${reason})`)
      
      const clearTimestamp = new Date().toISOString()
      
      // 1. Limpiar Session Memory
      if (this.sessionMemory) {
        try {
          await this.sessionMemory.clearSessionMemory(clientId)
          console.log(`✅ Session Memory limpiada`)
        } catch (error) {
          console.warn(`⚠️ Error limpiando Session Memory: ${error.message}`)
        }
      }

      // 2. Limpiar Dual Memory
      if (this.dualMemory) {
        try {
          await this.dualMemory.clearClientMemory(clientId)
          console.log(`✅ Dual Memory limpiada`)
        } catch (error) {
          console.warn(`⚠️ Error limpiando Dual Memory: ${error.message}`)
        }
      }

      // 3. Limpiar Enhanced Context
      if (this.db && this.db.client) {
        try {
          const { error } = await this.db.client
            .from('conversaciones')
            .delete()
            .eq('user_id', clientId)

          if (!error) {
            console.log(`✅ Enhanced Context limpiado`)
          }
        } catch (error) {
          console.warn(`⚠️ Error limpiando Enhanced Context: ${error.message}`)
        }
      }

      return {
        success: true,
        reason,
        clearedAt: clearTimestamp
      }

    } catch (error) {
      console.error(`❌ Error limpiando contexto: ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 🔍 VERIFICAR SINCRONIZACIÓN
   */
  async verifySynchronization(clientId) {
    try {
      console.log(`🔍 VERIFICANDO sincronización para ${clientId}`)
      
      const results = {
        sessionMemory: null,
        dualMemory: null,
        conversationStates: null,
        enhancedContext: null,
        synchronized: false,
        conflicts: []
      }

      // 1. Verificar Session Memory
      if (this.sessionMemory) {
        try {
          const sessionData = await this.sessionMemory.getSessionMemory(clientId)
          results.sessionMemory = {
            exists: !!sessionData,
            lastProduct: sessionData?.displayed_products?.[0]?.name,
            vipContext: sessionData?.vip_product_context,
            timestamp: sessionData?.context_sync_timestamp
          }
        } catch (error) {
          console.warn(`⚠️ Error verificando Session Memory: ${error.message}`)
        }
      }

      // 2. Verificar Enhanced Context
      if (this.db && this.db.client) {
        try {
          const { data: enhancedData } = await this.db.client
            .from('conversaciones')
            .select('enhanced_last_product, enhanced_context_active, enhanced_timestamp')
            .eq('user_id', clientId)
            .single()

          results.enhancedContext = {
            exists: !!enhancedData,
            lastProduct: enhancedData?.enhanced_last_product,
            contextActive: enhancedData?.enhanced_context_active,
            timestamp: enhancedData?.enhanced_timestamp
          }
        } catch (error) {
          console.warn(`⚠️ Error verificando Enhanced Context: ${error.message}`)
        }
      }

      // 3. Detectar conflictos
      const products = [
        results.sessionMemory?.lastProduct,
        results.enhancedContext?.lastProduct
      ].filter(Boolean)

      const uniqueProducts = [...new Set(products)]
      
      if (uniqueProducts.length > 1) {
        results.conflicts.push({
          type: 'product_mismatch',
          details: `Productos diferentes en sistemas: ${uniqueProducts.join(' vs ')}`
        })
      }

      results.synchronized = results.conflicts.length === 0

      console.log(`🔍 Verificación completada: ${results.synchronized ? 'SINCRONIZADO' : 'CONFLICTOS DETECTADOS'}`)

      return results

    } catch (error) {
      console.error(`❌ Error verificando sincronización: ${error.message}`)
      return {
        synchronized: false,
        error: error.message
      }
    }
  }

  /**
   * 🛠️ MÉTODOS AUXILIARES
   */
  async getConversationData(clientId) {
    try {
      const { data, error } = await this.db.client
        .from('conversation_states')
        .select('state_data')
        .eq('client_id', clientId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data?.state_data || {}
    } catch (error) {
      console.warn(`⚠️ Error obteniendo conversation data: ${error.message}`)
      return {}
    }
  }

  async setConversationData(clientId, data) {
    try {
      // Asegurar que current_state no sea null
      const safeData = {
        ...data,
        current_state: data.current_state || 'browsing' // Valor por defecto
      }
      
      const { error } = await this.db.client
        .from('conversation_states')
        .upsert({
          client_id: clientId,
          state_data: safeData,
          current_state: safeData.current_state,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'client_id'
        })

      if (error) {
        throw error
      }

    } catch (error) {
      console.warn(`⚠️ Error guardando conversation data: ${error.message}`)
    }
  }
}

export default ContextSynchronizer