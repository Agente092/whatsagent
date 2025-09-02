class ResponseCache {
  constructor() {
    this.cache = new Map()
    this.maxSize = 100
    this.ttl = 1000 * 60 * 30 // 30 minutos
    this.hits = 0
    this.misses = 0
  }

  // Generar clave de caché basada en el mensaje
  generateKey(message, context) {
    const normalizedMessage = message.toLowerCase().trim()
    const contextHash = this.hashString(JSON.stringify(context))
    return `${normalizedMessage}_${contextHash}`
  }

  // Hash simple para el contexto
  hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convertir a 32bit integer
    }
    return hash.toString(36)
  }

  // Obtener respuesta del caché
  get(message, context) {
    const key = this.generateKey(message, context)
    const cached = this.cache.get(key)
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      this.hits++
      console.log('💾 Using cached response')
      return cached.response
    }
    
    if (cached) {
      this.cache.delete(key) // Eliminar si expiró
    }
    
    this.misses++
    return null
  }

  // Guardar respuesta en caché
  set(message, context, response) {
    const key = this.generateKey(message, context)
    
    // Limpiar caché si está lleno
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    })
    
    console.log(`💾 Cached response for key: ${key.substring(0, 20)}...`)
  }

  // Limpiar caché expirado
  cleanup() {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`)
    }
  }

  // Estadísticas del caché
  getStats() {
    const total = this.hits + this.misses
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(2) : 0
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`
    }
  }

  // Limpiar todo el caché
  clear() {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
    console.log('🧹 Cache cleared completely')
  }
}

module.exports = ResponseCache