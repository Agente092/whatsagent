/**
 * 🔄 HYBRID DATABASE SERVICE
 *
 * Sistema híbrido SQLite + Supabase para transición segura
 * Permite rollback inmediato si hay problemas
 * Mantiene compatibilidad total durante migración
 *
 * @author Agentes 413 - Sistema AromaFlow V10
 */

import dotenv from 'dotenv'
// 🔧 CARGAR VARIABLES DE ENTORNO
dotenv.config()

import { DatabaseService } from './database.js'
import supabaseDatabaseService from './supabase-database.js'

class HybridDatabaseService {
  constructor() {
    this.sqliteDb = new DatabaseService()
    this.supabaseDb = supabaseDatabaseService
    this.useSupabase = process.env.USE_SUPABASE === 'true'
    this.fallbackToSqlite = process.env.FALLBACK_TO_SQLITE !== 'false'
    this.syncMode = process.env.SYNC_MODE === 'true' // Sincronizar ambas DBs
    
    console.log(`🔄 Hybrid Database Mode:`)
    console.log(`  - Use Supabase: ${this.useSupabase}`)
    console.log(`  - Fallback to SQLite: ${this.fallbackToSqlite}`)
    console.log(`  - Sync Mode: ${this.syncMode}`)
  }

  /**
   * 🚀 Inicializar ambas bases de datos
   */
  async initialize() {
    try {
      console.log('🔄 Inicializando Hybrid Database Service...')
      
      // Inicializar SQLite (siempre disponible)
      await this.sqliteDb.initialize()
      console.log('✅ SQLite inicializado')
      
      // Intentar inicializar Supabase
      if (this.useSupabase) {
        try {
          await this.supabaseDb.initialize()
          console.log('✅ Supabase inicializado')
        } catch (error) {
          console.error('❌ Error inicializando Supabase:', error)
          if (!this.fallbackToSqlite) {
            throw error
          }
          console.log('🔄 Fallback a SQLite activado')
          this.useSupabase = false
        }
      }
      
      console.log('✅ Hybrid Database Service inicializado')
      
    } catch (error) {
      console.error('❌ Error inicializando Hybrid Database Service:', error)
      throw error
    }
  }

  /**
   * 🎯 Ejecutar operación con fallback automático
   */
  async executeWithFallback(operation, ...args) {
    // Intentar con Supabase primero
    if (this.useSupabase) {
      try {
        const result = await this.supabaseDb[operation](...args)
        
        // Si sync mode está activo, sincronizar con SQLite
        if (this.syncMode && this.isWriteOperation(operation)) {
          try {
            await this.syncToSqlite(operation, args, result)
          } catch (syncError) {
            console.warn('⚠️ Error sincronizando con SQLite:', syncError)
          }
        }
        
        return result
      } catch (error) {
        console.error(`❌ Error en Supabase (${operation}):`, error)
        
        if (this.fallbackToSqlite) {
          console.log(`🔄 Fallback a SQLite para: ${operation}`)
          return await this.sqliteDb[operation](...args)
        }
        
        throw error
      }
    }
    
    // Usar SQLite directamente
    return await this.sqliteDb[operation](...args)
  }

  /**
   * 🔍 Verificar si es operación de escritura
   */
  isWriteOperation(operation) {
    const writeOps = [
      'addProduct', 'updateProduct', 'deleteProduct',
      'createOrder', 'updateOrder',
      'saveMessage', 'setConfig',
      'addSaleStatistic', 'createAdminSession'
    ]
    return writeOps.includes(operation)
  }

  /**
   * 🔄 Sincronizar operación con SQLite
   */
  async syncToSqlite(operation, args, result) {
    // Mapear operaciones de Supabase a SQLite
    const operationMap = {
      'addProduct': 'addProduct',
      'updateProduct': 'updateProduct',
      'deleteProduct': 'deleteProduct',
      'createOrder': 'createOrder',
      'updateOrder': 'updateOrder',
      'saveMessage': 'saveMessage',
      'setConfig': 'setConfig'
    }
    
    const sqliteOperation = operationMap[operation]
    if (sqliteOperation && this.sqliteDb[sqliteOperation]) {
      await this.sqliteDb[sqliteOperation](...args)
    }
  }

  /**
   * 📦 MÉTODOS DE PRODUCTOS
   */
  async getAllProducts() {
    return await this.executeWithFallback('getAllProducts')
  }

  async getProductById(id) {
    return await this.executeWithFallback('getProductById', id)
  }

  async searchProducts(searchTerm) {
    return await this.executeWithFallback('searchProducts', searchTerm)
  }

  async addProduct(productData) {
    return await this.executeWithFallback('addProduct', productData)
  }

  async updateProduct(id, productData) {
    return await this.executeWithFallback('updateProduct', id, productData)
  }

  async deleteProduct(id) {
    return await this.executeWithFallback('deleteProduct', id)
  }

  async getFeaturedProducts() {
    return await this.executeWithFallback('getFeaturedProducts')
  }

  async getCategories() {
    return await this.executeWithFallback('getCategories')
  }

  /**
   * 🛒 MÉTODOS DE PEDIDOS
   */
  async createOrder(orderData) {
    return await this.executeWithFallback('createOrder', orderData)
  }

  async getOrderById(id) {
    return await this.executeWithFallback('getOrderById', id)
  }

  async updateOrder(id, orderData) {
    return await this.executeWithFallback('updateOrder', id, orderData)
  }

  async getOrdersByClient(clientWhatsapp) {
    return await this.executeWithFallback('getOrdersByClient', clientWhatsapp)
  }

  async getAllOrders() {
    return await this.executeWithFallback('getAllOrders')
  }

  /**
   * 📨 MÉTODOS DE MENSAJES
   */
  async saveMessage(messageData) {
    return await this.executeWithFallback('saveMessage', messageData)
  }

  async getMessagesByClient(clientWhatsapp, limit) {
    return await this.executeWithFallback('getMessagesByClient', clientWhatsapp, limit)
  }

  /**
   * ⚙️ MÉTODOS DE CONFIGURACIÓN
   */
  async getConfig(key) {
    return await this.executeWithFallback('getConfig', key)
  }

  async setConfig(key, value, description, type) {
    return await this.executeWithFallback('setConfig', key, value, description, type)
  }

  /**
   * 📊 MÉTODOS DE ESTADÍSTICAS
   */
  async addSaleStatistic(statData) {
    return await this.executeWithFallback('addSaleStatistic', statData)
  }

  async getSalesStatistics(startDate, endDate) {
    return await this.executeWithFallback('getSalesStatistics', startDate, endDate)
  }

  /**
   * 👥 MÉTODOS DE CLIENTES
   */
  async getRecurrentClient(whatsapp) {
    return await this.executeWithFallback('getRecurrentClient', whatsapp)
  }

  async getAllRecurrentClients() {
    return await this.executeWithFallback('getAllRecurrentClients')
  }

  /**
   * 🔐 MÉTODOS DE ADMINISTRACIÓN
   */
  async verifyAdminCode(code) {
    return await this.executeWithFallback('verifyAdminCode', code)
  }

  async createAdminSession(sessionData) {
    return await this.executeWithFallback('createAdminSession', sessionData)
  }

  /**
   * 🔄 MÉTODOS DE CONTROL
   */

  // Cambiar a Supabase
  async switchToSupabase() {
    try {
      await this.supabaseDb.initialize()
      this.useSupabase = true
      console.log('✅ Cambiado a Supabase')
    } catch (error) {
      console.error('❌ Error cambiando a Supabase:', error)
      throw error
    }
  }

  // Cambiar a SQLite
  switchToSqlite() {
    this.useSupabase = false
    console.log('✅ Cambiado a SQLite')
  }

  // Habilitar modo sincronización
  enableSyncMode() {
    this.syncMode = true
    console.log('✅ Modo sincronización habilitado')
  }

  // Deshabilitar modo sincronización
  disableSyncMode() {
    this.syncMode = false
    console.log('✅ Modo sincronización deshabilitado')
  }

  // Obtener estado actual
  getStatus() {
    return {
      useSupabase: this.useSupabase,
      fallbackToSqlite: this.fallbackToSqlite,
      syncMode: this.syncMode,
      supabaseInitialized: this.supabaseDb.initialized,
      sqliteInitialized: this.sqliteDb.db !== null
    }
  }

  /**
   * 🧪 Probar conectividad
   */
  async testConnectivity() {
    const results = {
      sqlite: false,
      supabase: false
    }

    // Probar SQLite
    try {
      await this.sqliteDb.getAllProducts()
      results.sqlite = true
    } catch (error) {
      console.error('❌ SQLite no disponible:', error)
    }

    // Probar Supabase
    try {
      await this.supabaseDb.getAllProducts()
      results.supabase = true
    } catch (error) {
      console.error('❌ Supabase no disponible:', error)
    }

    return results
  }

  /**
   * 🔄 Cerrar conexiones
   */
  async close() {
    try {
      await this.sqliteDb.close()
      await this.supabaseDb.close()
      console.log('🔒 Conexiones cerradas')
    } catch (error) {
      console.error('Error cerrando conexiones:', error)
    }
  }
}

// Instancia singleton
const hybridDatabaseService = new HybridDatabaseService()

export default hybridDatabaseService
