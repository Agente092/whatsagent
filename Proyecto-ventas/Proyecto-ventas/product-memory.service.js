/**
 * 🧠 SERVICIO DE MEMORIA DE PRODUCTOS
 * 
 * Sistema inteligente de memoria conversacional que preserva el contexto
 * del producto durante toda la conversación usando Redis.
 */

class ProductMemoryService {
  constructor(redisClient = null) {
    this.redis = redisClient
    this.MEMORY_TTL = 1800 // 30 minutos
    this.CONTEXT_TTL = 900  // 15 minutos para contexto específico
  }

  /**
   * 🔧 Configurar cliente Redis
   */
  setRedisClient(redisClient) {
    this.redis = redisClient
    console.log('🧠 ProductMemory: Redis configurado')
  }

  /**
   * 💾 Guardar producto actual en memoria conversacional
   */
  async setCurrentProduct(clientId, product, context = {}) {
    try {
      if (!this.redis) {
        console.log('⚠️ Redis no disponible, usando memoria local')
        return this.setCurrentProductLocal(clientId, product, context)
      }

      const memoryKey = `product_memory:${clientId}`
      const memoryData = {
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          description: product.description,
          imagen_url: product.imagen_url || null,
          stock: product.stock || null
        },
        context: {
          state: context.state || 'interested',
          lastQuestion: context.lastQuestion || null,
          lastAction: context.lastAction || 'product_shown',
          conversationFlow: context.conversationFlow || [],
          timestamp: Date.now(),
          clientType: context.clientType || 'normal'
        },
        metadata: {
          setAt: new Date().toISOString(),
          clientId: clientId,
          version: '1.0'
        }
      }
      
      await this.redis.setEx(memoryKey, this.MEMORY_TTL, JSON.stringify(memoryData))
      console.log(`🧠 Producto guardado en memoria Redis: ${product.name} para ${clientId}`)
      
      return true
    } catch (error) {
      console.error('❌ Error guardando producto en memoria:', error)
      return false
    }
  }

  /**
   * 🔍 Obtener producto actual de memoria conversacional
   */
  async getCurrentProduct(clientId) {
    try {
      if (!this.redis) {
        return this.getCurrentProductLocal(clientId)
      }

      const memoryKey = `product_memory:${clientId}`
      const memoryData = await this.redis.get(memoryKey)
      
      if (memoryData) {
        const parsed = JSON.parse(memoryData)
        
        // Verificar si no ha expirado (doble verificación)
        const timeElapsed = Date.now() - parsed.context.timestamp
        if (timeElapsed > this.MEMORY_TTL * 1000) {
          console.log(`⏰ Memoria expirada para ${clientId}, limpiando`)
          await this.clearMemory(clientId)
          return null
        }
        
        console.log(`🧠 Producto recuperado de memoria Redis: ${parsed.product.name} para ${clientId}`)
        return parsed
      }
      
      console.log(`🤷 No hay producto en memoria para ${clientId}`)
      return null
    } catch (error) {
      console.error('❌ Error obteniendo producto de memoria:', error)
      return null
    }
  }

  /**
   * 🔄 Actualizar contexto sin cambiar producto
   */
  async updateContext(clientId, newContext) {
    try {
      const current = await this.getCurrentProduct(clientId)
      if (current) {
        current.context = { 
          ...current.context, 
          ...newContext,
          timestamp: Date.now() // Actualizar timestamp
        }
        
        const memoryKey = `product_memory:${clientId}`
        await this.redis.setEx(memoryKey, this.MEMORY_TTL, JSON.stringify(current))
        console.log(`🧠 Contexto actualizado para ${clientId}: ${JSON.stringify(newContext)}`)
        return true
      }
      return false
    } catch (error) {
      console.error('❌ Error actualizando contexto:', error)
      return false
    }
  }

  /**
   * 📝 Agregar acción al flujo conversacional
   */
  async addConversationAction(clientId, action, details = {}) {
    try {
      const current = await this.getCurrentProduct(clientId)
      if (current) {
        const flowEntry = {
          action: action,
          timestamp: Date.now(),
          details: details
        }
        
        current.context.conversationFlow.push(flowEntry)
        current.context.lastAction = action
        current.context.timestamp = Date.now()
        
        // Mantener solo las últimas 10 acciones
        if (current.context.conversationFlow.length > 10) {
          current.context.conversationFlow = current.context.conversationFlow.slice(-10)
        }
        
        const memoryKey = `product_memory:${clientId}`
        await this.redis.setEx(memoryKey, this.MEMORY_TTL, JSON.stringify(current))
        console.log(`📝 Acción agregada al flujo: ${action} para ${clientId}`)
        return true
      }
      return false
    } catch (error) {
      console.error('❌ Error agregando acción al flujo:', error)
      return false
    }
  }

  /**
   * 🧹 Limpiar memoria al finalizar compra o cambiar producto
   */
  async clearMemory(clientId) {
    try {
      if (!this.redis) {
        return this.clearMemoryLocal(clientId)
      }

      const memoryKey = `product_memory:${clientId}`
      await this.redis.del(memoryKey)
      console.log(`🧹 Memoria limpiada para ${clientId}`)
      return true
    } catch (error) {
      console.error('❌ Error limpiando memoria:', error)
      return false
    }
  }

  /**
   * 📊 Obtener estadísticas de memoria
   */
  async getMemoryStats(clientId) {
    try {
      const current = await this.getCurrentProduct(clientId)
      if (current) {
        const timeElapsed = Date.now() - current.context.timestamp
        return {
          hasMemory: true,
          productName: current.product.name,
          productId: current.product.id,
          state: current.context.state,
          lastAction: current.context.lastAction,
          timeElapsed: Math.round(timeElapsed / 1000), // segundos
          conversationFlowLength: current.context.conversationFlow.length,
          clientType: current.context.clientType
        }
      }
      return { hasMemory: false }
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de memoria:', error)
      return { hasMemory: false, error: error.message }
    }
  }

  /**
   * 🔍 Verificar si hay contexto válido para interpretar referencias
   */
  async hasValidContext(clientId) {
    try {
      const current = await this.getCurrentProduct(clientId)
      if (!current) return false
      
      const timeElapsed = Date.now() - current.context.timestamp
      const isValid = timeElapsed < (this.CONTEXT_TTL * 1000) // 15 minutos para contexto activo
      
      console.log(`🔍 Contexto válido para ${clientId}: ${isValid} (${Math.round(timeElapsed/1000)}s transcurridos)`)
      return isValid
    } catch (error) {
      console.error('❌ Error verificando contexto válido:', error)
      return false
    }
  }

  // 💾 MÉTODOS DE RESPALDO LOCAL (cuando Redis no está disponible)
  
  setCurrentProductLocal(clientId, product, context = {}) {
    if (!global.productMemoryLocal) {
      global.productMemoryLocal = new Map()
    }
    
    const memoryData = {
      product: { ...product },
      context: {
        state: context.state || 'interested',
        lastQuestion: context.lastQuestion || null,
        timestamp: Date.now(),
        ...context
      },
      metadata: {
        setAt: new Date().toISOString(),
        clientId: clientId
      }
    }
    
    global.productMemoryLocal.set(clientId, memoryData)
    console.log(`🧠 Producto guardado en memoria LOCAL: ${product.name} para ${clientId}`)
    return true
  }

  getCurrentProductLocal(clientId) {
    if (!global.productMemoryLocal) {
      return null
    }
    
    const memoryData = global.productMemoryLocal.get(clientId)
    if (memoryData) {
      // Verificar expiración
      const timeElapsed = Date.now() - memoryData.context.timestamp
      if (timeElapsed > this.MEMORY_TTL * 1000) {
        global.productMemoryLocal.delete(clientId)
        return null
      }
      
      console.log(`🧠 Producto recuperado de memoria LOCAL: ${memoryData.product.name} para ${clientId}`)
      return memoryData
    }
    
    return null
  }

  clearMemoryLocal(clientId) {
    if (global.productMemoryLocal) {
      global.productMemoryLocal.delete(clientId)
      console.log(`🧹 Memoria LOCAL limpiada para ${clientId}`)
    }
    return true
  }
}

// Instancia singleton
const productMemoryService = new ProductMemoryService()

export default productMemoryService