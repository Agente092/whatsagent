/**
 * 🔍 GOOGLE CUSTOM SEARCH API POOL
 * Sistema de rotación inteligente para maximizar búsquedas gratuitas
 * 
 * Características:
 * - 5 API Keys × 100 búsquedas gratis = 500 búsquedas diarias
 * - Rotación automática cuando se agotan límites
 * - Monitoreo de uso por API
 * - Reinicio automático de contadores diarios
 * - Fallback a DuckDuckGo si se agotan todas las APIs
 */

const logger = require('./logger')
const https = require('https')

class GoogleSearchPool {
  constructor() {
    // 🔑 POOL DE APIS Y SEARCH ENGINE IDS (1 EXISTENTE + 4 NUEVAS)
    this.searchEngineIds = [
      process.env.GOOGLE_CSE_ID, // API existente
      '9607723c0fe2c44dd',        // Nuevas APIs
      'b7a1724da026a4976', 
      '604052115897a49f7',
      '842eac9eaeb60454e'
    ]
    
    this.apiKeys = [
      process.env.GOOGLE_CSE_API_KEY, // API existente
      'AIzaSyDdX_7kufEdgHHnGFcRGmBla6dIYxAodC8', // Nuevas APIs
      'AIzaSyA_0exBFT7fIK5nETRKwA5y_cqgH5K72hg',
      'AIzaSyBGl2DpTt4GpMJi16YsRIfdiygJN6YoB-Y',
      'AIzaSyCdZrEk79_rGTav_8-tg-ci77B2wx49_u4'
    ]
    
    // 📊 CONFIGURACIÓN DEL POOL
    this.maxResults = 5
    this.dailyLimitPerApi = 100
    this.currentApiIndex = 0
    
    // 📈 ESTADÍSTICAS POR API
    this.apiStats = this.initializeApiStats()
    
    // 🕐 CONTROL DE REINICIO DIARIO
    this.lastResetDate = new Date().toDateString()
    
    // 🧹 FILTRAR APIs INVÁLIDAS
    this.filterValidApis()
    
    logger.info(`🚀 Google Search Pool inicializado con ${this.apiKeys.length} APIs válidas`)
    logger.info(`📊 Límite total diario: ${this.apiKeys.length * this.dailyLimitPerApi} búsquedas`)
    
    // 📊 LOGGING DETALLADO DE CONFIGURACIÓN
    logger.info(`🔧 Pool configurado con ${this.apiKeys.length} APIs y ${this.searchEngineIds.length} Search Engine IDs`)
    logger.info(`📈 Disponibles hoy: ${this.apiKeys.length * this.dailyLimitPerApi} búsquedas (${this.dailyLimitPerApi} por API)`)
    
    // 🔍 MOSTRAR APIs CONFIGURADAS (SEGURO)
    this.apiStats.forEach((api, index) => {
      logger.info(`   API ${index + 1}: ${api.apiKey} | Engine: ${api.searchEngineId.substring(0, 8)}... | ${api.dailyLimit} búsquedas/día`)
    })
  }
  
  /**
   * 🧹 Filtrar APIs válidas (eliminar undefined/null)
   */
  filterValidApis() {
    const validApiKeys = []
    const validSearchEngineIds = []
    
    for (let i = 0; i < this.apiKeys.length; i++) {
      if (this.apiKeys[i] && this.searchEngineIds[i]) {
        validApiKeys.push(this.apiKeys[i])
        validSearchEngineIds.push(this.searchEngineIds[i])
      }
    }
    
    this.apiKeys = validApiKeys
    this.searchEngineIds = validSearchEngineIds
    
    if (this.apiKeys.length === 0) {
      logger.error('❌ No hay APIs válidas configuradas')
    }
  }
  
  /**
   * 📊 Inicializar estadísticas para cada API
   */
  initializeApiStats() {
    return this.apiKeys.map((apiKey, index) => ({
      id: index,
      apiKey: apiKey.substring(0, 10) + '...', // Para logs seguros
      searchEngineId: this.searchEngineIds[index],
      dailyUsed: 0,
      dailyLimit: this.dailyLimitPerApi,
      isActive: true,
      lastUsed: null,
      errorCount: 0,
      successCount: 0
    }))
  }
  
  /**
   * 🔄 Verificar si necesita reinicio diario
   */
  checkDailyReset() {
    const currentDate = new Date().toDateString()
    
    if (this.lastResetDate !== currentDate) {
      logger.info(`🌅 Reiniciando contadores diarios del pool de búsqueda (${this.lastResetDate} → ${currentDate})`)
      
      // Mostrar estadísticas antes del reinicio
      const totalUsadoAyer = this.apiStats.reduce((sum, api) => sum + api.dailyUsed, 0)
      logger.info(`📊 Estadísticas de ayer: ${totalUsadoAyer}/${this.apiKeys.length * this.dailyLimitPerApi} búsquedas utilizadas`)
      
      this.apiStats.forEach(api => {
        if (api.dailyUsed > 0) {
          logger.info(`   API ${api.id + 1}: ${api.dailyUsed}/${api.dailyLimit} usadas ayer | Éxitos: ${api.successCount} | Errores: ${api.errorCount}`)
        }
        api.dailyUsed = 0
        api.isActive = true
        api.errorCount = 0
      })
      
      this.lastResetDate = currentDate
      this.currentApiIndex = 0
      
      logger.info(`📊 Pool reiniciado: ${this.apiKeys.length * this.dailyLimitPerApi} búsquedas disponibles para hoy`)
      logger.info(`🔄 Índice de API reseteado a: API 1`)
    }
  }
  
  /**
   * 🎯 Obtener la siguiente API disponible
   */
  getNextAvailableApi() {
    this.checkDailyReset()
    
    // Buscar API con búsquedas disponibles
    for (let attempts = 0; attempts < this.apiKeys.length; attempts++) {
      const api = this.apiStats[this.currentApiIndex]
      
      if (api.isActive && api.dailyUsed < api.dailyLimit) {
        return api
      }
      
      // Rotar al siguiente índice
      this.currentApiIndex = (this.currentApiIndex + 1) % this.apiKeys.length
    }
    
    // Si llegamos aquí, todas las APIs están agotadas
    logger.warn('⚠️ Todas las APIs de Google Custom Search agotadas por hoy')
    return null
  }
  
  /**
   * 🔍 Realizar búsqueda con pool de APIs
   */
  async search(query) {
    try {
      const api = this.getNextAvailableApi()
      
      if (!api) {
        logger.warn('🔄 Pool de Google agotado, usando fallback')
        return null
      }
      
      logger.info(`🔍 Búsqueda con API ${api.id + 1}/${this.apiKeys.length} (${api.dailyUsed}/${api.dailyLimit} usadas)`)
      
      const result = await this.searchWithSpecificApi(query, api)
      
      if (result) {
        // Actualizar estadísticas de éxito
        api.dailyUsed++
        api.successCount++
        api.lastUsed = new Date()
        
        // 📊 LOGGING DETALLADO DE ÉXITO Y ROTACIÓN
        logger.info(`✅ Búsqueda exitosa. API ${api.id + 1}: ${api.dailyUsed}/${api.dailyLimit} usadas`)
        
        // Rotar al siguiente API para distribuir carga
        const previousIndex = this.currentApiIndex
        this.currentApiIndex = (this.currentApiIndex + 1) % this.apiKeys.length
        
        logger.info(`🔄 Rotación: API ${previousIndex + 1} → API ${this.currentApiIndex + 1} (próxima búsqueda)`)
        
        // 📊 ESTADISTICAS DEL POOL EN TIEMPO REAL
        const totalUsed = this.apiStats.reduce((sum, a) => sum + a.dailyUsed, 0)
        const totalAvailable = this.apiStats.reduce((sum, a) => sum + (a.dailyLimit - a.dailyUsed), 0)
        logger.info(`📊 Pool: ${totalUsed}/${this.apiKeys.length * this.dailyLimitPerApi} usadas | ${totalAvailable} disponibles`)
        
        return result
      } else {
        // Manejar error
        api.errorCount++
        if (api.errorCount >= 3) {
          api.isActive = false
          logger.warn(`⚠️ API ${api.id + 1} desactivada por errores repetidos`)
        }
        return null
      }
      
    } catch (error) {
      logger.error('❌ Error en pool de búsqueda:', error)
      return null
    }
  }
  
  /**
   * 🔎 Realizar búsqueda con API específica
   */
  async searchWithSpecificApi(query, api) {
    try {
      const encodedQuery = encodeURIComponent(query)
      const url = `https://www.googleapis.com/customsearch/v1?key=${this.apiKeys[api.id]}&cx=${api.searchEngineId}&q=${encodedQuery}&num=${this.maxResults}`
      
      const response = await this.makeWebRequest(url)
      const data = JSON.parse(response)
      
      if (data.error) {
        logger.error(`❌ Error API ${api.id + 1}:`, data.error.message)
        
        // Manejar límite excedido
        if (data.error.message.includes('Daily Limit Exceeded')) {
          api.dailyUsed = api.dailyLimit
          logger.warn(`📊 API ${api.id + 1} alcanzó límite diario (${api.dailyLimit}/${api.dailyLimit})`)
          
          // Verificar si todas las APIs están agotadas
          const apisAgotadas = this.apiStats.filter(a => a.dailyUsed >= a.dailyLimit).length
          const totalApis = this.apiStats.length
          logger.warn(`⚠️  APIs agotadas: ${apisAgotadas}/${totalApis}`)
          
          if (apisAgotadas === totalApis) {
            logger.error(`🚨 TODAS LAS APIs DE GOOGLE AGOTADAS - Cambiando a fallback`)
          }
        }
        
        return null
      }
      
      if (data.items && data.items.length > 0) {
        return this.formatGoogleResults(data.items, query, api.id + 1)
      }
      
      return null
      
    } catch (error) {
      logger.error(`❌ Error búsqueda API ${api.id + 1}:`, error.message)
      return null
    }
  }
  
  /**
   * 🌐 Realizar petición web
   */
  makeWebRequest(url) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url)
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        timeout: 10000
      }
      
      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve(data)
        })
      })
      
      req.on('error', (error) => {
        reject(error)
      })
      
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })
      
      req.end()
    })
  }
  
  /**
   * 📋 Formatear resultados de Google
   */
  formatGoogleResults(items, query, apiNumber) {
    const results = items.slice(0, this.maxResults).map((item, index) => {
      return `${index + 1}. **${item.title}**
   URL: ${item.link}
   Descripción: ${item.snippet || 'Sin descripción disponible'}`
    }).join('\n\n')
    
    return `🔍 RESULTADOS DE GOOGLE PARA "${query}":

${results}

✨ Fuente: Google Custom Search API ${apiNumber}/${this.apiKeys.length} - Búsqueda web real`
  }
  
  /**
   * 📊 Obtener estadísticas del pool
   */
  getPoolStats() {
    this.checkDailyReset()
    
    const totalUsed = this.apiStats.reduce((sum, api) => sum + api.dailyUsed, 0)
    const totalAvailable = this.apiStats.reduce((sum, api) => sum + (api.dailyLimit - api.dailyUsed), 0)
    const activeApis = this.apiStats.filter(api => api.isActive).length
    
    return {
      totalApis: this.apiKeys.length,
      activeApis: activeApis,
      totalUsedToday: totalUsed,
      totalAvailableToday: totalAvailable,
      dailyLimit: this.apiKeys.length * this.dailyLimitPerApi,
      usagePercentage: Math.round((totalUsed / (this.apiKeys.length * this.dailyLimitPerApi)) * 100),
      apiDetails: this.apiStats.map(api => ({
        id: api.id + 1,
        used: api.dailyUsed,
        limit: api.dailyLimit,
        available: api.dailyLimit - api.dailyUsed,
        active: api.isActive,
        successCount: api.successCount,
        errorCount: api.errorCount
      }))
    }
  }
  
  /**
   * 🔧 Resetear pool manualmente
   */
  resetPool() {
    this.apiStats.forEach(api => {
      api.dailyUsed = 0
      api.isActive = true
      api.errorCount = 0
    })
    
    this.currentApiIndex = 0
    this.lastResetDate = new Date().toDateString()
    
    logger.info('🔄 Pool de búsqueda reseteado manualmente')
  }
}

module.exports = GoogleSearchPool