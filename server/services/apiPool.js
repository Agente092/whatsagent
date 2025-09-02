const { GoogleGenerativeAI } = require('@google/generative-ai')
const logger = require('./logger')

class ApiPool {
  constructor() {
    // Pool de APIs de Gemini - AMPLIADO A 15 APIs COMO WHATSAPP-AGENT
    this.apiKeys = [
      'AIzaSyAPFixQAWKi2M7qDjH1n2QuHH7BeAjyTQ8',
      'AIzaSyCwhRvWvFOfJRMk9qQM2U1fDZaa7_HiB_AA',
      'AIzaSyCWQsPEq-D3nJZFdMgsTlxDOweTzPKOTwIA',
      'AIzaSyDQdZu9BKU0wthWB5MrLu6jlFqJBjobpPU',
      'AIzaSyDNmqQipY9twB5jLEWrMJHQkKRS0_5bhjw',
      'AIzaSyCpkO5REjtpZhXeMpvIhgh8oY_2X2ABIro',
      'AIzaSyARYabiYzJZ8DfDNJeq8wdjy1T_3UGFAXu',
      'AIzaSyBcYsacd3Ml2wlduHZRzkFzHLtgOcylOhQ',
      'AIzaSyD9zOtMS8Xiymc6AyusRUvhwJh3XvarsscA',
      'AIzaSyB6vyb1cb7D6u9-ef-y4KZc_8Y82kaWC2M',
      'AIzaSyDKWAZ0FkDd0_5DmGhytiu-lg0mUOdHsXg',
      'AIzaSyAlUIsKYBxfZ4RH3aimq7XBWQtlGcG1fjo', // API Key 12 (nueva)
      'AIzaSyCFR2kApUeCGSWOf_tkcLe1XH4qgKjDVJ0', // API Key 13 (nueva)
      'AIzaSyBEDtNY0MAWLsHcSn4rObEM_Cp7VdKwDjU', // API Key 14 (nueva)
      'AIzaSyD9zOtMS8Xiymc6AyusRUvhwJh3Xvarssc'  // API Key 15 (nueva)
    ]
    
    this.currentIndex = 0
    this.apiInstances = []
    this.apiStats = new Map()
    
    // Inicializar instancias de API
    this.initializeApis()
    
    // Resetear estadísticas diariamente
    this.resetStatsDaily()
  }

  // Inicializar todas las instancias de API
  initializeApis() {
    this.apiKeys.forEach((apiKey, index) => {
      try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        
        this.apiInstances.push({
          id: index,
          apiKey: apiKey.substring(0, 10) + '...', // Para logs seguros
          genAI,
          model,
          isActive: true,
          lastUsed: null,
          errorCount: 0
        })
        
        // Inicializar estadísticas
        this.apiStats.set(index, {
          requestsToday: 0,
          errorsToday: 0,
          lastReset: new Date().toDateString(),
          totalRequests: 0,
          avgResponseTime: 0
        })
        
      } catch (error) {
        logger.error(`Error initializing API ${index}:`, error)
      }
    })
    
    logger.info(`🔄 API Pool initialized with ${this.apiInstances.length} APIs`)
  }

  // Obtener la próxima API disponible - VERSIÓN ESTILO WHATSAPP-AGENT
  getNextAvailableApi() {
    const startIndex = this.currentIndex
    let attempts = 0
    
    while (attempts < this.apiInstances.length) {
      const currentApi = this.apiInstances[this.currentIndex]
      const currentStats = this.apiStats.get(this.currentIndex)
      
      // 🔧 MEJORADO: Logging más detallado del estado de la API
      logger.info(`🔍 Checking API ${this.currentIndex}: Active=${currentApi.isActive}, Requests=${currentStats.requestsToday}/45, Errors=${currentApi.errorCount}`)
      
      // Verificar si la API está disponible (como whatsapp-agent)
      if (this.isApiAvailable(this.currentIndex)) {
        currentApi.lastUsed = new Date()
        logger.info(`✅ Selected API ${this.currentIndex} for use`)
        
        // 🔧 CRÍTICO: Avanzar al siguiente índice DESPUÉS de seleccionar
        this.currentIndex = (this.currentIndex + 1) % this.apiInstances.length
        
        return currentApi
      }
      
      // Pasar a la siguiente API
      this.currentIndex = (this.currentIndex + 1) % this.apiInstances.length
      attempts++
      
      // 🔧 NUEVO: Evitar bucle infinito
      if (this.currentIndex === startIndex && attempts > 0) {
        logger.warn(`⚠️ Completed full rotation, no available APIs found`)
        break
      }
    }
    
    // Si todas las APIs están agotadas, usar la que tenga menos requests
    logger.warn(`🔄 All APIs exhausted, falling back to least used API`)
    return this.getLeastUsedApi()
  }
  
  // 🔧 NUEVO: Método para verificar si una API está disponible (estilo whatsapp-agent)
  isApiAvailable(apiIndex) {
    const api = this.apiInstances[apiIndex]
    const stats = this.apiStats.get(apiIndex)
    
    if (!api.isActive) {
      return false
    }
    
    // Verificar rate limit
    if (stats.requestsToday >= 45) {
      return false
    }
    
    // Verificar si tiene demasiados errores recientes
    if (api.errorCount > 5) {
      return false
    }
    
    return true
  }

  // Obtener la API con menos uso - VERSIÓN MEJORADA
  getLeastUsedApi() {
    let leastUsedApi = this.apiInstances[0]
    let minRequests = this.apiStats.get(0).requestsToday
    
    this.apiInstances.forEach((api, index) => {
      const stats = this.apiStats.get(index)
      if (api.isActive && stats.requestsToday < minRequests) {
        leastUsedApi = api
        minRequests = stats.requestsToday
      }
    })
    
    logger.info(`🔄 Least used API selected: ${leastUsedApi.id} with ${minRequests} requests today`)
    return leastUsedApi
  }

  // Registrar uso exitoso de API - VERSIÓN MEJORADA
  recordSuccess(apiId, responseTime) {
    const stats = this.apiStats.get(apiId)
    if (stats) {
      stats.requestsToday++
      stats.totalRequests++
      
      // Calcular tiempo promedio de respuesta
      if (stats.avgResponseTime === 0) {
        stats.avgResponseTime = responseTime
      } else {
        stats.avgResponseTime = (stats.avgResponseTime + responseTime) / 2
      }
    }
    
    // 🔧 NUEVO: Usar el método markSuccess para restaurar disponibilidad
    this.markSuccess(apiId)
  }

  // Registrar error de API - VERSIÓN MEJORADA ESTILO WHATSAPP-AGENT
  recordError(apiId, error) {
    const stats = this.apiStats.get(apiId)
    const api = this.apiInstances[apiId]
    
    if (stats && api) {
      stats.errorsToday++
      api.errorCount++
      
      // 🔧 MANEJO GRANULAR DE ERRORES COMO WHATSAPP-AGENT
      
      // Error de cuota/rate limit - marcar como agotada
      if (error.message.includes('quota') || error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) {
        stats.requestsToday = 50 // Marcar como agotada
        logger.warn(`📊 API ${apiId} quota exhausted for today`)
      }
      
      // API Key inválida - desactivar permanentemente
      else if (error.message.includes('400') || error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
        api.isActive = false
        logger.warn(`🚫 API ${apiId} (${api.apiKey}) deactivated permanently (invalid API key)`)
      }
      
      // API deshabilitada - desactivar temporalmente
      else if (error.message.includes('403') || error.message.includes('Forbidden') || error.message.includes('SERVICE_DISABLED')) {
        api.isActive = false
        logger.warn(`🚫 API ${apiId} (${api.apiKey}) deactivated temporarily (service disabled)`)
        
        // Reactivar después de 1 hora
        setTimeout(() => {
          api.isActive = true
          api.errorCount = 0
          logger.info(`✅ API ${apiId} reactivated after service disabled timeout`)
        }, 60 * 60 * 1000)
      }
      
      // Errores consecutivos - desactivar temporalmente
      else if (api.errorCount >= 3) {
        api.isActive = false
        logger.warn(`🚫 API ${apiId} (${api.apiKey}) deactivated due to consecutive errors`)
        
        // Reactivar después de 10 minutos
        setTimeout(() => {
          api.isActive = true
          api.errorCount = 0
          logger.info(`✅ API ${apiId} reactivated after error timeout`)
        }, 10 * 60 * 1000)
      }
      
      logger.warn(`❌ Error in API ${apiId}: ${error.message}`)
    }
  }

  // Obtener estadísticas del pool
  getPoolStats() {
    const totalRequests = Array.from(this.apiStats.values())
      .reduce((sum, stats) => sum + stats.requestsToday, 0)
    
    const activeApis = this.apiInstances.filter(api => api.isActive).length
    const availableRequests = activeApis * 45 - totalRequests
    
    return {
      totalApis: this.apiInstances.length,
      activeApis,
      totalRequestsToday: totalRequests,
      availableRequests: Math.max(0, availableRequests),
      currentApiIndex: this.currentIndex,
      apiDetails: this.apiInstances.map((api, index) => ({
        id: index,
        apiKey: api.apiKey,
        isActive: api.isActive,
        requestsToday: this.apiStats.get(index).requestsToday,
        errorsToday: this.apiStats.get(index).errorsToday,
        lastUsed: api.lastUsed
      }))
    }
  }

  // Resetear estadísticas diariamente
  resetStatsDaily() {
    const resetTime = new Date()
    resetTime.setHours(0, 0, 0, 0)
    resetTime.setDate(resetTime.getDate() + 1) // Próximo día a medianoche
    
    const msUntilReset = resetTime.getTime() - Date.now()
    
    setTimeout(() => {
      logger.info('🔄 Resetting daily API stats...')
      
      this.apiStats.forEach((stats, apiId) => {
        stats.requestsToday = 0
        stats.errorsToday = 0
        stats.lastReset = new Date().toDateString()
      })
      
      // Reactivar todas las APIs
      this.apiInstances.forEach(api => {
        api.isActive = true
        api.errorCount = 0
      })
      
      // Programar próximo reset
      this.resetStatsDaily()
      
    }, msUntilReset)
    
    logger.info(`📅 Next API stats reset scheduled in ${Math.round(msUntilReset / 1000 / 60 / 60)} hours`)
  }

  // Generar respuesta con pool de APIs - VERSIÓN MEJORADA ESTILO WHATSAPP-AGENT
  async generateResponse(prompt, maxRetries = null) {
    // 🔧 CRÍTICO: Usar número total de APIs como máximo de reintentos (como whatsapp-agent)
    if (maxRetries === null) {
      maxRetries = this.apiInstances.length
    }
    
    let lastError = null
    let currentApiKey = null
    let availableKeysAtStart = this.getAvailableApisCount()
    
    logger.info(`🔄 Starting executeWithRetry with ${maxRetries} max attempts (${availableKeysAtStart} APIs available)`)
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`🔄 Attempt ${attempt}/${maxRetries}`)
        
        // 🔧 CRÍTICO: Obtener nueva API en cada intento (como whatsapp-agent)
        const api = this.getNextAvailableApi()
        currentApiKey = api.apiKey
        
        logger.info(`🔑 Using API Key ${api.id + 1}/${this.apiInstances.length}`)
        
        // 🔧 NUEVO: Timeout de 30 segundos como whatsapp-agent
        const startTime = Date.now()
        const result = await Promise.race([
          api.model.generateContent(prompt),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout: Operation took too long')), 30000)
          )
        ])
        
        const response = result.response
        const text = response.text()
        const responseTime = Date.now() - startTime
        
        // Marcar éxito
        this.recordSuccess(api.id, responseTime)
        
        logger.info(`✅ API ${api.id} successful - Response time: ${responseTime}ms`)
        return text
        
      } catch (error) {
        lastError = error
        logger.warn(`❌ Error in attempt ${attempt}: ${error.message}`)
        
        // Marcar error en la API actual
        if (currentApiKey) {
          const api = this.apiInstances.find(a => a.apiKey.includes(currentApiKey.substring(0, 10)))
          if (api) {
            this.recordError(api.id, error)
          }
        }
        
        // 🔧 MEJORADO: Manejo granular de errores como whatsapp-agent
        if (
          error.message.includes('429') ||
          error.message.includes('quota') ||
          error.message.includes('overloaded') ||
          error.message.includes('RESOURCE_EXHAUSTED') ||
          error.message.includes('400') ||
          error.message.includes('API key not valid') ||
          error.message.includes('API_KEY_INVALID') ||
          error.message.includes('403') ||
          error.message.includes('Forbidden') ||
          error.message.includes('SERVICE_DISABLED')
        ) {
          if (attempt < maxRetries) {
            if (error.message.includes('429') || error.message.includes('quota')) {
              logger.info(`🔑 Rate limit detected, rotating to next API immediately...`)
            } else if (error.message.includes('400') || error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
              logger.info(`🔑 Invalid API Key detected, rotating to next API immediately...`)
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
              logger.info(`🔑 Disabled API Key detected, rotating to next API immediately...`)
            } else {
              logger.info(`🔑 Service error detected, rotating to next API immediately...`)
            }
            // 🔧 CRÍTICO: No hacer delay, rotar inmediatamente
            continue
          }
        }
        
        // Para errores de timeout, reintentar con delay
        if (error.message.includes('Timeout') || error.message.includes('500') || error.message.includes('503')) {
          if (attempt < maxRetries) {
            const delay = 1000 * Math.pow(2, attempt - 1)
            logger.info(`⏰ Waiting ${delay}ms before next attempt...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }
        
        // Para otros errores, no reintentar
        break
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    logger.error(`🚨 All ${maxRetries} attempts failed: ${lastError?.message}`)
    
    // 🔧 ÚLTIMO RECURSO: Mostrar estadísticas para debugging
    const availableKeys = this.getAvailableApisCount()
    logger.info(`📊 Available APIs: ${availableKeys}/${this.apiInstances.length}`)
    logger.info('📊 Current API stats:', this.getPoolStats())
    
    throw lastError || new Error('All API attempts failed')
  }
  
  // 🔧 NUEVO: Contar APIs disponibles
  getAvailableApisCount() {
    return this.apiInstances.filter(api => {
      const stats = this.apiStats.get(api.id)
      return api.isActive && stats.requestsToday < 45
    }).length
  }
  
  // 🔧 NUEVO: Resetear errores temporales (como whatsapp-agent)
  resetTemporaryErrors() {
    let resetCount = 0
    this.apiInstances.forEach((api, index) => {
      const stats = this.apiStats.get(index)
      
      // Solo resetear si no es API inválida permanente y no tiene rate limit activo
      if (!api.isActive && 
          api.errorCount < 10 && 
          stats.requestsToday < 45) {
        api.isActive = true
        api.errorCount = Math.max(0, api.errorCount - 2) // Reducir errores
        resetCount++
        logger.info(`🔄 API ${index} reactivated temporarily`)
      }
    })
    logger.info(`✅ ${resetCount} APIs reactivated temporarily`)
    return resetCount
  }
  
  // 🔧 NUEVO: Marcar API como exitosa (como whatsapp-agent)
  markSuccess(apiId) {
    const api = this.apiInstances[apiId]
    if (api) {
      api.errorCount = Math.max(0, api.errorCount - 1) // Reducir contador de errores
      if (!api.isActive && api.errorCount === 0) {
        api.isActive = true // Restaurar disponibilidad en caso de éxito
        logger.info(`✅ API ${apiId} restored to active status after success`)
      }
    }
  }
}

module.exports = ApiPool