/**
 * 🧠🔄 DUAL MEMORY SERVICE
 * 
 * Sistema de memoria dual que separa productos VIP de inventario normal
 * para evitar confusión de contexto conversacional.
 * 
 * MEMORIA VIP: Productos VIP mostrados al cliente
 * MEMORIA INVENTARIO: Productos normales consultados después del rechazo VIP
 * 
 * LIMPIEZA AUTOMÁTICA:
 * - Nueva sesión: Ambas memorias se limpian
 * - 8 horas sin respuesta: Limpieza automática
 * - 24 horas: Limpieza forzada
 */

class DualMemoryService {
  constructor(dbService) {
    this.db = dbService
    this.initialized = false
  }

  /**
   * 🚀 Inicializar el servicio de memoria dual
   */
  async initialize() {
    try {
      console.log('🧠🔄 Inicializando Dual Memory Service...')
      
      await this.ensureTablesExist()
      await this.cleanExpiredMemories()
      
      this.initialized = true
      console.log('✅ Dual Memory Service inicializado correctamente')
      
    } catch (error) {
      console.error('❌ Error inicializando Dual Memory Service:', error)
      throw error
    }
  }

  /**
   * 🗄️ Crear tablas de memoria dual
   */
  async ensureTablesExist() {
    const queries = [
      // Tabla principal de memoria dual
      `CREATE TABLE IF NOT EXISTS dual_memory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id VARCHAR(255) NOT NULL,
        memory_type VARCHAR(20) NOT NULL, -- 'vip' or 'inventory'
        
        -- Productos almacenados
        products JSONB DEFAULT '[]',
        last_shown_product JSONB DEFAULT '{}',
        
        -- Estado del contexto
        is_active BOOLEAN DEFAULT TRUE,
        rejection_detected BOOLEAN DEFAULT FALSE,
        switch_to_inventory_time TIMESTAMP WITH TIME ZONE,
        
        -- Metadata temporal
        session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(client_id, memory_type)
      )`,
      
      // Índices para optimización
      `CREATE INDEX IF NOT EXISTS idx_dual_memory_client_type ON dual_memory(client_id, memory_type)`,
      `CREATE INDEX IF NOT EXISTS idx_dual_memory_expires ON dual_memory(expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_dual_memory_last_interaction ON dual_memory(last_interaction)`,
      
      // Función de limpieza automática
      `CREATE OR REPLACE FUNCTION clean_expired_dual_memories()
       RETURNS INTEGER AS $$
       DECLARE
         expired_count INTEGER;
       BEGIN
         DELETE FROM dual_memory 
         WHERE expires_at < NOW() OR last_interaction < NOW() - INTERVAL '8 hours';
         
         GET DIAGNOSTICS expired_count = ROW_COUNT;
         RETURN expired_count;
       END;
       $$ LANGUAGE plpgsql`,
       
      // Función para limpiar memoria de cliente específico
      `CREATE OR REPLACE FUNCTION clean_client_dual_memory(target_client_id VARCHAR(255))
       RETURNS VOID AS $$
       BEGIN
         DELETE FROM dual_memory WHERE client_id = target_client_id;
         RAISE NOTICE 'Memoria dual limpiada para cliente: %', target_client_id;
       END;
       $$ LANGUAGE plpgsql`
    ]

    for (const query of queries) {
      try {
        const { error } = await this.db.client.rpc('sql', { query })
        if (error) throw error
      } catch (error) {
        console.log(`⚠️ Error ejecutando query (continuando): ${error.message}`)
      }
    }
  }

  /**
   * 🌟 ACTIVAR MEMORIA VIP
   * Se activa cuando se muestran productos VIP al cliente
   */
  async activateVipMemory(clientId, vipProducts = []) {
    try {
      const memoryData = {
        client_id: clientId,
        memory_type: 'vip',
        products: vipProducts,
        last_shown_product: vipProducts.length > 0 ? vipProducts[vipProducts.length - 1] : {},
        is_active: true,
        rejection_detected: false,
        session_start: new Date().toISOString(),
        last_interaction: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
      }

      const { error } = await this.db.client
        .from('dual_memory')
        .upsert(memoryData, { onConflict: 'client_id,memory_type' })

      if (error) throw error

      console.log(`🌟 MEMORIA VIP ACTIVADA para ${clientId}: ${vipProducts.length} productos`)
      return true

    } catch (error) {
      console.error('❌ Error activando memoria VIP:', error)
      return false
    }
  }

  /**
   * 📦 ACTIVAR MEMORIA INVENTARIO 
   * Se activa cuando el cliente rechaza productos VIP y pregunta por inventario normal
   */
  async activateInventoryMemory(clientId, inventoryProducts = []) {
    try {
      // Marcar memoria VIP como rechazada pero conservarla
      await this.markVipAsRejected(clientId)

      const memoryData = {
        client_id: clientId,
        memory_type: 'inventory',
        products: inventoryProducts,
        last_shown_product: inventoryProducts.length > 0 ? inventoryProducts[inventoryProducts.length - 1] : {},
        is_active: true,
        rejection_detected: false,
        switch_to_inventory_time: new Date().toISOString(),
        session_start: new Date().toISOString(),
        last_interaction: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
      }

      const { error } = await this.db.client
        .from('dual_memory')
        .upsert(memoryData, { onConflict: 'client_id,memory_type' })

      if (error) throw error

      console.log(`📦 MEMORIA INVENTARIO ACTIVADA para ${clientId}: ${inventoryProducts.length} productos`)
      return true

    } catch (error) {
      console.error('❌ Error activando memoria inventario:', error)
      return false
    }
  }

  /**
   * 🚫 Marcar memoria VIP como rechazada
   */
  async markVipAsRejected(clientId) {
    try {
      const { error } = await this.db.client
        .from('dual_memory')
        .update({
          rejection_detected: true,
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId)
        .eq('memory_type', 'vip')

      if (error) throw error

      console.log(`🚫 MEMORIA VIP MARCADA COMO RECHAZADA para ${clientId}`)
      return true

    } catch (error) {
      console.error('❌ Error marcando VIP como rechazada:', error)
      return false
    }
  }

  /**
   * 🔍 OBTENER MEMORIA ACTIVA
   * Retorna qué tipo de memoria está activa para el cliente
   */
  async getActiveMemory(clientId) {
    try {
      const { data, error } = await this.db.client
        .from('dual_memory')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('last_interaction', { ascending: false })

      if (error) throw error

      // Determinar prioridad: VIP no rechazada > Inventario > VIP rechazada
      const vipMemory = data?.find(m => m.memory_type === 'vip' && !m.rejection_detected)
      const inventoryMemory = data?.find(m => m.memory_type === 'inventory')
      const rejectedVipMemory = data?.find(m => m.memory_type === 'vip' && m.rejection_detected)

      // 🔄 HELPER: Parsear memoria para asegurar formato correcto
      const parseMemory = (memory) => {
        if (!memory) return null
        
        try {
          return {
            ...memory,
            products: Array.isArray(memory.products) 
              ? memory.products 
              : (typeof memory.products === 'string' 
                  ? JSON.parse(memory.products || '[]')
                  : []),
            last_shown_product: typeof memory.last_shown_product === 'string'
              ? JSON.parse(memory.last_shown_product || '{}')
              : (memory.last_shown_product || {})
          }
        } catch (parseError) {
          console.log(`⚠️ Error parseando memoria para ${clientId}: ${parseError.message}`)
          // Retornar memoria con valores por defecto en caso de error
          return {
            ...memory,
            products: [],
            last_shown_product: {}
          }
        }
      }

      if (vipMemory) {
        return { type: 'vip', memory: parseMemory(vipMemory), status: 'active' }
      } else if (inventoryMemory) {
        return { type: 'inventory', memory: parseMemory(inventoryMemory), status: 'active' }
      } else if (rejectedVipMemory) {
        return { type: 'vip', memory: parseMemory(rejectedVipMemory), status: 'rejected' }
      }

      return { type: null, memory: null, status: 'none' }

    } catch (error) {
      console.error('❌ Error obteniendo memoria activa:', error)
      return { type: null, memory: null, status: 'error' }
    }
  }

  /**
   * 🔄 ACTUALIZAR INTERACCIÓN
   * Actualiza timestamp de última interacción para prevenir expiración
   */
  async updateInteraction(clientId, memoryType = null) {
    try {
      let query = this.db.client
        .from('dual_memory')
        .update({
          last_interaction: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId)

      if (memoryType) {
        query = query.eq('memory_type', memoryType)
      }

      const { error } = await query

      if (error) throw error

      console.log(`🔄 Interacción actualizada para ${clientId} (${memoryType || 'all'})`)
      return true

    } catch (error) {
      console.error('❌ Error actualizando interacción:', error)
      return false
    }
  }

  /**
   * 📝 AGREGAR PRODUCTO A MEMORIA
   * Agrega un producto a la memoria específica (VIP o inventario)
   */
  async addProductToMemory(clientId, memoryType, product) {
    try {
      const { data, error: selectError } = await this.db.client
        .from('dual_memory')
        .select('products')
        .eq('client_id', clientId)
        .eq('memory_type', memoryType)
        .single()

      if (selectError && selectError.code !== 'PGRST116') throw selectError

      const currentProducts = data?.products || []
      const updatedProducts = [...currentProducts, {
        ...product,
        added_at: new Date().toISOString()
      }]

      const { error } = await this.db.client
        .from('dual_memory')
        .upsert({
          client_id: clientId,
          memory_type: memoryType,
          products: updatedProducts,
          last_shown_product: product,
          last_interaction: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'client_id,memory_type' })

      if (error) throw error

      console.log(`📝 Producto agregado a memoria ${memoryType} de ${clientId}: ${product.name || product.nombre}`)
      return true

    } catch (error) {
      console.error('❌ Error agregando producto a memoria:', error)
      return false
    }
  }

  /**
   * 🧹 LIMPIAR MEMORIA DE INVENTARIO ESPECÍFICA
   * Limpia solo la memoria de inventario manteniendo VIP si existe
   */
  async clearInventoryMemory(clientId) {
    try {
      const { error } = await this.db.client
        .from('dual_memory')
        .delete()
        .eq('client_id', clientId)
        .eq('memory_type', 'inventory')

      if (error) throw error

      console.log(`🧹 Memoria de inventario limpiada para ${clientId}`)
      return true

    } catch (error) {
      console.error('❌ Error limpiando memoria de inventario:', error)
      return false
    }
  }

  /**
   * 🧹 LIMPIAR MEMORIA VIP ESPECÍFICA
   * Limpia solo la memoria VIP manteniendo inventario si existe
   */
  async clearVipMemory(clientId) {
    try {
      const { error } = await this.db.client
        .from('dual_memory')
        .delete()
        .eq('client_id', clientId)
        .eq('memory_type', 'vip')

      if (error) throw error

      console.log(`🧹 Memoria VIP limpiada para ${clientId}`)
      return true

    } catch (error) {
      console.error('❌ Error limpiando memoria VIP:', error)
      return false
    }
  }

  /**
   * 🧹 LIMPIAR MEMORIA DE CLIENTE (nueva sesión)
   */
  async clearClientMemory(clientId) {
    try {
      const { error } = await this.db.client
        .rpc('clean_client_dual_memory', { target_client_id: clientId })

      if (error) throw error

      console.log(`🧹 Memoria dual limpiada completamente para ${clientId}`)
      return true

    } catch (error) {
      console.error('❌ Error limpiando memoria dual:', error)
      return false
    }
  }

  /**
   * 🕒 LIMPIAR MEMORIAS EXPIRADAS (automático)
   */
  async cleanExpiredMemories() {
    try {
      const { data, error } = await this.db.client
        .rpc('clean_expired_dual_memories')

      if (error) throw error

      const cleanedCount = data || 0
      if (cleanedCount > 0) {
        console.log(`🕒 ${cleanedCount} memorias duales expiradas limpiadas`)
      }

      return cleanedCount

    } catch (error) {
      console.error('❌ Error limpiando memorias expiradas:', error)
      return 0
    }
  }

  /**
   * 📊 OBTENER ESTADÍSTICAS DE MEMORIA
   */
  async getMemoryStats() {
    try {
      const { data, error } = await this.db.client
        .from('dual_memory')
        .select('memory_type, is_active, rejection_detected')

      if (error) throw error

      const stats = {
        total: data.length,
        vip_active: data.filter(m => m.memory_type === 'vip' && m.is_active && !m.rejection_detected).length,
        vip_rejected: data.filter(m => m.memory_type === 'vip' && m.rejection_detected).length,
        inventory_active: data.filter(m => m.memory_type === 'inventory' && m.is_active).length
      }

      return stats

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error)
      return { total: 0, vip_active: 0, vip_rejected: 0, inventory_active: 0 }
    }
  }

  /**
   * 🔍 DETERMINAR CONTEXTO APROPIADO
   * Función principal que determina qué productos usar según el contexto
   */
  async determineAppropriateContext(clientId) {
    try {
      const activeMemory = await this.getActiveMemory(clientId)
      
      console.log(`🔍 CONTEXTO DETERMINADO para ${clientId}:`, {
        type: activeMemory.type,
        status: activeMemory.status,
        hasProducts: activeMemory.memory?.products?.length > 0,
        productCount: activeMemory.memory?.products?.length || 0,
        lastProduct: activeMemory.memory?.last_shown_product?.name || 'ninguno'
      })
      
      // 🎯 NUEVA LÓGICA: Priorizar memoria inventario activa para solicitudes específicas
      let priorityContext = null
      
      if (activeMemory.type === 'inventory' && activeMemory.status === 'active') {
        // 📦 Memoria inventario activa tiene máxima prioridad
        priorityContext = {
          contextType: 'inventory',
          contextStatus: 'active',
          products: activeMemory.memory.products || [],
          lastShownProduct: activeMemory.memory.last_shown_product || null,
          shouldUseVip: false,
          shouldUseInventory: true,
          isFromSpecificRequest: activeMemory.memory.products?.some(p => p.fromSpecificRequest) || false,
          inventoryPriority: true
        }
        
        console.log(`📦 PRIORIDAD INVENTARIO ACTIVA: ${priorityContext.products.length} productos disponibles`)
        return priorityContext
      }

      return {
        contextType: activeMemory.type,
        contextStatus: activeMemory.status,
        products: activeMemory.memory?.products || [],
        lastShownProduct: activeMemory.memory?.last_shown_product || null,
        shouldUseVip: activeMemory.type === 'vip' && activeMemory.status === 'active',
        shouldUseInventory: activeMemory.type === 'inventory' || 
                           (activeMemory.type === 'vip' && activeMemory.status === 'rejected'),
        isFromSpecificRequest: false,
        inventoryPriority: false
      }

    } catch (error) {
      console.error('❌ Error determinando contexto apropiado:', error)
      return {
        contextType: null,
        contextStatus: 'error',
        products: [],
        lastShownProduct: null,
        shouldUseVip: false,
        shouldUseInventory: true, // Por defecto usar inventario si hay error
        isFromSpecificRequest: false,
        inventoryPriority: false
      }
    }
  }
}

export default DualMemoryService