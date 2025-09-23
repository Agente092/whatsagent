const https = require('https')
const http = require('http')
const { URL } = require('url')
const logger = require('./logger')
const GoogleSearchPool = require('./googleSearchPool')

class InternetSearchService {
  constructor() {
    this.cache = new Map()
    this.cacheExpiry = 30 * 60 * 1000 // 30 minutos
    this.maxResults = 5
    
    // 🌟 INICIALIZAR POOL DE GOOGLE SEARCH APIs
    this.googleSearchPool = new GoogleSearchPool()
    
    // Estadísticas del servicio
    this.stats = {
      searches: 0,
      cacheHits: 0,
      errors: 0,
      lastSearch: null
    }
  }

  /**
   * Realizar una búsqueda en internet usando múltiples fuentes REALES
   */
  async search(query, options = {}) {
    try {
      // Verificar cache primero
      const cacheKey = `${query}-${JSON.stringify(options)}`
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        logger.info('🔍 Usando resultados de búsqueda en caché')
        return cached
      }

      logger.info(`🔍 Realizando búsqueda REAL en internet para: "${query}"`)
      
      // Intentar búsqueda web real
      let searchResults = await this.performRealWebSearch(query)
      
      // Si no hay resultados, intentar fuentes alternativas
      if (!searchResults || searchResults.includes('No se encontraron resultados')) {
        logger.info('🔄 Intentando fuentes de búsqueda alternativas...')
        searchResults = await this.tryAlternativeSources(query)
      }
      
      // Guardar en cache
      this.saveToCache(cacheKey, searchResults)
      this.updateStats('searches', 1)
      
      return searchResults
    } catch (error) {
      logger.error('❌ Error en búsqueda en internet:', error)
      this.updateStats('errors', 1)
      return this.getSearchErrorMessage(query)
    }
  }

  /**
   * Realizar búsqueda web REAL usando pool de APIs
   */
  async performRealWebSearch(query) {
    try {
      logger.info(`🌍 Ejecutando búsqueda WEB REAL para: "${query}"`)
      
      // Estrategia 1: Pool de Google Custom Search APIs (500 búsquedas gratis por día)
      logger.info('🔍 Intentando Google Custom Search Pool...')
      const googleResults = await this.googleSearchPool.search(query)
      if (googleResults) {
        return googleResults
      }
      
      // Estrategia 2: Bing Search API (1000 búsquedas gratis por mes) - SOLO SI ESTÁ CONFIGURADO
      if (process.env.BING_SEARCH_API_KEY) {
        logger.info('🔍 Intentando Bing Search API...')
        const bingResults = await this.searchWithBingAPI(query)
        if (bingResults) {
          return bingResults
        }
      }
      
      // Estrategia 3: DuckDuckGo mejorado (gratuito, sin límites)
      logger.info('🔍 Usando DuckDuckGo como fallback...')
      const duckResults = await this.searchWithDuckDuckGo(query)
      if (duckResults) {
        return duckResults
      }
      
      // Si no hay respuesta, indicar que no se encontró información
      return this.getNoResultsMessage(query)
      
    } catch (error) {
      logger.error('❌ Error en búsqueda web real:', error)
      throw error
    }
  }

  /**
   * Búsqueda con Google Custom Search API (100 gratis/día)
   */
  async searchWithGoogleCSE(query) {
    try {
      const apiKey = process.env.GOOGLE_CSE_API_KEY
      const searchEngineId = process.env.GOOGLE_CSE_ID
      
      const encodedQuery = encodeURIComponent(query)
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodedQuery}&num=5`
      
      logger.info(`🔗 Google CSE URL: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`)
      
      const response = await this.makeWebRequest(url)
      const data = JSON.parse(response)
      
      if (data.items && data.items.length > 0) {
        return this.formatGoogleCSEResults(data.items, query)
      }
      
      return null
    } catch (error) {
      logger.warn('⚠️ Error en Google CSE:', error.message)
      return null
    }
  }

  /**
   * Búsqueda con Bing Search API (1000 gratis/mes)
   */
  async searchWithBingAPI(query) {
    try {
      const apiKey = process.env.BING_SEARCH_API_KEY
      
      const encodedQuery = encodeURIComponent(query)
      const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodedQuery}&count=5`
      
      const response = await this.makeWebRequest(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey
        }
      })
      
      const data = JSON.parse(response)
      
      if (data.webPages && data.webPages.value && data.webPages.value.length > 0) {
        return this.formatBingResults(data.webPages.value, query)
      }
      
      return null
    } catch (error) {
      logger.warn('⚠️ Error en Bing API:', error.message)
      return null
    }
  }

  /**
   * Búsqueda mejorada con DuckDuckGo (gratuito)
   */
  async searchWithDuckDuckGo(query) {
    try {
      const encodedQuery = encodeURIComponent(query)
      const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`
      
      const response = await this.makeWebRequest(url)
      const data = JSON.parse(response)
      
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        return this.formatDuckDuckGoResults(data, query)
      }
      
      return null
    } catch (error) {
      logger.warn('⚠️ Error en DuckDuckGo:', error.message)
      return null
    }
  }

  /**
   * Construir URL de búsqueda REAL
   */
  buildRealSearchUrl(query) {
    const encodedQuery = encodeURIComponent(query)
    // Usar un endpoint que permita búsquedas reales
    // Nota: En producción se usaría una API de búsqueda pagada como Google Custom Search, Bing Search API, etc.
    return `https://duckduckgo.com/lite/?q=${encodedQuery}&kl=us-en`
  }

  /**
   * Realizar petición web real
   */
  async makeWebRequest(url, customOptions = {}) {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(url)
        const client = parsedUrl.protocol === 'https:' ? https : http
        
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Connection': 'keep-alive',
            ...customOptions.headers
          },
          timeout: 10000
        }
        
        const req = client.request(options, (res) => {
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
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Formatear resultados de Google Custom Search
   */
  formatGoogleCSEResults(items, query) {
    const results = items.slice(0, this.maxResults).map((item, index) => {
      return `${index + 1}. **${item.title}**
   URL: ${item.link}
   Descripción: ${item.snippet || 'Sin descripción disponible'}`
    }).join('\n\n')
    
    return `🔍 RESULTADOS DE GOOGLE PARA "${query}":

${results}

✨ Fuente: Google Custom Search API - Búsqueda web real`
  }

  /**
   * Formatear resultados de Bing Search API
   */
  formatBingResults(webPages, query) {
    const results = webPages.slice(0, this.maxResults).map((page, index) => {
      return `${index + 1}. **${page.name}**
   URL: ${page.url}
   Descripción: ${page.snippet || 'Sin descripción disponible'}`
    }).join('\n\n')
    
    return `🔍 RESULTADOS DE BING PARA "${query}":

${results}

✨ Fuente: Bing Search API - Búsqueda web real`
  }

  /**
   * Formatear resultados de DuckDuckGo mejorado
   */
  formatDuckDuckGoResults(data, query) {
    const results = []
    
    if (data.AbstractText) {
      results.push(`1. **${data.AbstractText.substring(0, 100)}...**
   URL: ${data.AbstractURL || 'No disponible'}
   Descripción: ${data.AbstractText}`)
    }
    
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const relatedResults = data.RelatedTopics
        .filter(topic => topic.FirstURL && topic.Text)
        .slice(0, this.maxResults - 1)
        .map((topic, index) => {
          const startIndex = results.length > 0 ? 2 : 1
          return `${startIndex + index}. **${topic.Text.substring(0, 100)}...**
   URL: ${topic.FirstURL}
   Descripción: ${topic.Text}`
        })
      
      results.push(...relatedResults)
    }
    
    if (results.length === 0) {
      return null
    }
    
    return `🔍 RESULTADOS DE DUCKDUCKGO PARA "${query}":

${results.join('\n\n')}

✨ Fuente: DuckDuckGo API - Búsqueda web gratuita`
  }

  /**
   * Parsear resultados web REALES
   */
  parseRealWebResults(htmlData, query) {
    try {
      // Extraer información básica del HTML
      // Nota: En una implementación completa se usaría un parser HTML como cheerio
      
      const results = []
      
      // Buscar enlaces y títulos básicos en el HTML
      const linkMatches = htmlData.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi)
      
      if (linkMatches && linkMatches.length > 0) {
        const processedLinks = linkMatches
          .slice(0, this.maxResults)
          .map((match, index) => {
            const hrefMatch = match.match(/href="([^"]*)"/i)
            const textMatch = match.match(/>([^<]*)</i)
            
            return {
              title: textMatch ? textMatch[1].trim() : `Resultado ${index + 1}`,
              url: hrefMatch ? hrefMatch[1] : '#',
              snippet: `Información encontrada mediante búsqueda web real`
            }
          })
          .filter(link => link.title.length > 0 && !link.url.includes('javascript:'))
        
        results.push(...processedLinks)
      }
      
      if (results.length === 0) {
        return this.getNoResultsMessage(query)
      }
      
      return this.formatWebSearchResults(results, query)
      
    } catch (error) {
      logger.error('❌ Error parseando resultados web:', error)
      return this.getNoResultsMessage(query)
    }
  }

  /**
   * Intentar fuentes alternativas de búsqueda
   */
  async tryAlternativeSources(query) {
    logger.info(`🔄 Intentando fuentes alternativas para: "${query}"`)
    
    // En una implementación real, aquí se intentarían otras APIs:
    // - Google Custom Search API
    // - Bing Search API
    // - SerpAPI
    // - Otros motores de búsqueda
    
    return this.getNoResultsMessage(query)
  }

  /**
   * Formatear resultados de búsqueda web
   */
  formatWebSearchResults(results, query) {
    const formattedResults = results.map((result, index) => {
      return `${index + 1}. **${result.title}**
   URL: ${result.url}
   Descripción: ${result.snippet}`
    }).join('\n\n')
    
    return `🔍 RESULTADOS DE BÚSQUEDA WEB REAL PARA "${query}":

${formattedResults}

⚠️ NOTA: Estos resultados fueron obtenidos mediante búsqueda real en internet. La disponibilidad y precisión depende de las fuentes consultadas.`
  }

  /**
   * Mensaje cuando no se encuentran resultados
   */
  getNoResultsMessage(query) {
    return `🔍 BÚSQUEDA WEB REALIZADA PARA "${query}":

No se encontraron resultados específicos en las fuentes de internet consultadas.

Esto puede deberse a:
1. La consulta es muy específica o reciente
2. Limitaciones de acceso a las fuentes de información
3. Restricciones temporales de los servicios de búsqueda

Para obtener información actualizada sobre este tema, recomiendo:
• Consultar fuentes oficiales directamente
• Verificar sitios web gubernamentales relevantes
• Contactar especialistas en el área específica`
  }

  /**
   * Mensaje de error en búsqueda
   */
  getSearchErrorMessage(query) {
    return `🔍 ERROR EN BÚSQUEDA WEB PARA "${query}":

No fue posible realizar la búsqueda en internet debido a problemas técnicos.

Posibles causas:
1. Problemas de conectividad
2. Limitaciones de acceso a servicios de búsqueda
3. Restricciones temporales

Recomiendo intentar la búsqueda nuevamente más tarde o consultar fuentes especializadas directamente.`
  }

  /**
   * Guardar resultados en cache
   */
  saveToCache(key, data) {
    const cacheEntry = {
      data: data,
      timestamp: Date.now()
    }
    this.cache.set(key, cacheEntry)
    this.cleanupCache()
  }

  /**
   * Obtener resultados del cache
   */
  getFromCache(key) {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > this.cacheExpiry) {
      this.cache.delete(key)
      return null
    }
    
    this.updateStats('cacheHits', 1)
    return entry.data
  }

  /**
   * Actualizar estadísticas
   */
  updateStats(key, increment = 1) {
    if (this.stats.hasOwnProperty(key)) {
      this.stats[key] += increment
    }
    
    if (key === 'searches') {
      this.stats.lastSearch = new Date().toISOString()
    }
  }

  /**
   * Limpiar cache antigua
   */
  cleanupCache() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheExpiry) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Obtener estadísticas del servicio (incluyendo pool)
   */
  getStats() {
    const poolStats = this.googleSearchPool.getPoolStats()
    
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      cacheExpiryMinutes: this.cacheExpiry / (60 * 1000),
      maxResults: this.maxResults,
      googleSearchPool: poolStats
    }
  }

  /**
   * 🔄 Resetear pool de Google Search APIs
   */
  resetGooglePool() {
    this.googleSearchPool.resetPool()
    logger.info('🔄 Pool de Google Search reseteado')
  }

  /**
   * 📊 Obtener estadísticas detalladas del pool
   */
  getPoolDetails() {
    return this.googleSearchPool.getPoolStats()
  }
}

module.exports = InternetSearchService