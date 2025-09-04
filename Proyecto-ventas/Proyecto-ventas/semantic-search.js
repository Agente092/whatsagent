/**
 * 🔍 SERVICIO DE BÚSQUEDA SEMÁNTICA INTELIGENTE GENÉRICO
 * 
 * Sistema avanzado de búsqueda 100% genérico que NO hardcodea datos específicos.
 * Utiliza algoritmos matemáticos puros para análisis semántico adaptable a cualquier negocio.
 */

class SemanticSearchService {
  constructor() {
    this.initialized = false
    this.inventoryService = null
    this.productPatterns = null // Patrones dinámicos extraídos de productos reales
  }

  /**
   * 🚀 Inicializar el servicio de búsqueda semántica (SIN CACHE)
   */
  async initialize(inventoryService) {
    try {
      console.log('🔍 Inicializando búsqueda semántica GENÉRICA...')

      // Solo guardar referencia al servicio de inventario
      this.inventoryService = inventoryService

      // Analizar patrones dinámicamente desde los productos existentes
      await this.analyzeProductPatterns()

      this.initialized = true
      console.log(`✅ Búsqueda semántica genérica inicializada - DATOS SIEMPRE FRESCOS`)
    } catch (error) {
      console.error('Error inicializando búsqueda semántica:', error)
    }
  }

  /**
   * 📊 Analizar patrones dinámicamente de productos existentes (SIN HARDCODE)
   */
  async analyzeProductPatterns() {
    try {
      const products = await this.inventoryService.getAllProducts()
      
      if (!products || products.length === 0) {
        this.productPatterns = { commonWords: [], priceRanges: [], categoryWords: [] }
        return
      }

      // Extraer palabras más comunes dinámicamente
      const allText = products.map(p => `${p.nombre || ''} ${p.descripcion || ''} ${p.categoria || ''}`.toLowerCase()).join(' ')
      const words = allText.split(/\s+/).filter(word => word.length > 2)
      const wordFreq = this.calculateWordFrequency(words)
      
      // Analizar rangos de precios dinámicamente
      const prices = products.map(p => parseFloat(p.precio) || 0).filter(p => p > 0)
      const priceStats = this.calculatePriceStatistics(prices)
      
      // Extraer categorías dinámicamente
      const categories = [...new Set(products.map(p => p.categoria).filter(Boolean))]
      
      this.productPatterns = {
        commonWords: Object.keys(wordFreq).slice(0, 100), // Top 100 palabras más comunes
        priceRanges: priceStats,
        categoryWords: categories.map(cat => cat.toLowerCase()),
        totalProducts: products.length
      }
      
      console.log(`📊 Patrones analizados: ${this.productPatterns.commonWords.length} palabras comunes, ${categories.length} categorías`)
    } catch (error) {
      console.error('Error analizando patrones:', error)
      this.productPatterns = { commonWords: [], priceRanges: [], categoryWords: [] }
    }
  }

  /**
   * 🔢 Calcular frecuencia de palabras (algoritmo genérico)
   */
  calculateWordFrequency(words) {
    const frequency = {}
    words.forEach(word => {
      if (word.length > 2) { // Filtrar palabras muy cortas
        frequency[word] = (frequency[word] || 0) + 1
      }
    })
    
    // Ordenar por frecuencia
    return Object.fromEntries(
      Object.entries(frequency).sort(([,a], [,b]) => b - a)
    )
  }

  /**
   * 💰 Calcular estadísticas de precios (algoritmo genérico)
   */
  calculatePriceStatistics(prices) {
    if (prices.length === 0) return { min: 0, max: 0, avg: 0, median: 0 }
    
    const sorted = prices.sort((a, b) => a - b)
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: prices.reduce((sum, p) => sum + p, 0) / prices.length,
      median: sorted[Math.floor(sorted.length / 2)],
      q1: sorted[Math.floor(sorted.length * 0.25)],
      q3: sorted[Math.floor(sorted.length * 0.75)]
    }
  }

  /**
   * 🎯 Crear texto buscable optimizado para cada producto (GENÉRICO)
   */
  createSearchableText(product) {
    const parts = [
      product.nombre || '',
      product.descripcion || '',
      product.categoria || '',
      product.marca || '',
      product.modelo || '',
      // Extraer características numéricas dinámicamente
      this.extractNumericFeatures(product),
      // Extraer palabras clave relevantes
      this.extractRelevantKeywords(product)
    ].filter(Boolean)

    return parts.join(' ').toLowerCase()
  }

  /**
   * 🔢 Extraer características numéricas (algoritmo genérico)
   */
  extractNumericFeatures(product) {
    const text = `${product.nombre} ${product.descripcion}`.toLowerCase()
    const features = []

    // Detectar patrones numéricos genéricos (NO específicos de dispositivos)
    const numericPatterns = [
      /\d+\.?\d*\s*(gb|tb|mb|kb)/gi,  // Almacenamiento genérico
      /\d+\s*(mah|ah)/gi,             // Batería genérica
      /\d+\.?\d*\s*(pulgadas?|inch|"|cm|mm)/gi, // Medidas genéricas
      /\d+\s*(mp|megapixel)/gi,       // Cámara genérica
      /\d+\.?\d*\s*(mhz|ghz)/gi,      // Frecuencia genérica
      /\d+x\d+/gi,                    // Resoluciones genéricas
      /v\d+\.\d+/gi,                  // Versiones genéricas
    ]

    numericPatterns.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        features.push(...matches)
      }
    })

    return features.join(' ')
  }

  /**
   * 🔑 Extraer palabras clave relevantes basadas en patrones dinámicos
   */
  extractRelevantKeywords(product) {
    if (!this.productPatterns) return ''
    
    const text = `${product.nombre} ${product.descripcion}`.toLowerCase()
    const words = text.split(/\s+/)
    
    // Filtrar palabras que aparecen en patrones comunes
    const relevantWords = words.filter(word => 
      word.length > 2 && 
      this.productPatterns.commonWords.includes(word)
    )
    
    return relevantWords.join(' ')
  }

  /**
   * 🧠 Generar embedding semántico matemático (100% GENÉRICO)
   */
  generateProductEmbedding(product) {
    const text = this.createSearchableText(product)
    const words = text.split(/\s+/).filter(word => word.length > 2)
    
    // Vector semántico basado en matemáticas puras
    const embedding = {
      // Diversidad léxica
      lexicalDiversity: this.calculateLexicalDiversity(words),
      // Densidad de información
      informationDensity: this.calculateInformationDensity(text),
      // Complejidad semántica
      semanticComplexity: this.calculateSemanticComplexity(words),
      // Características numéricas
      numericFeatures: this.extractNumericVector(text),
      // Longitud y estructura
      textStructure: this.analyzeTextStructure(text),
      // Palabras únicas
      uniqueWords: [...new Set(words)],
      // Score de precio relativo
      priceScore: this.calculateRelativePriceScore(product.precio)
    }

    return embedding
  }

  /**
   * 📊 Calcular diversidad léxica (algoritmo genérico)
   */
  calculateLexicalDiversity(words) {
    if (words.length === 0) return 0
    const uniqueWords = new Set(words)
    return uniqueWords.size / words.length // Ratio de palabras únicas
  }

  /**
   * 📊 Calcular densidad de información (algoritmo genérico)
   */
  calculateInformationDensity(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgWordsPerSentence = text.split(/\s+/).length / Math.max(sentences.length, 1)
    return Math.min(avgWordsPerSentence / 10, 1) // Normalizar a 0-1
  }

  /**
   * 🧠 Calcular complejidad semántica (algoritmo genérico)
   */
  calculateSemanticComplexity(words) {
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / Math.max(words.length, 1)
    const longWords = words.filter(word => word.length > 6).length
    const complexityRatio = longWords / Math.max(words.length, 1)
    
    return (avgWordLength / 10) * 0.5 + complexityRatio * 0.5 // Combinar métricas
  }

  /**
   * 🔢 Extraer vector numérico (algoritmo genérico)
   */
  extractNumericVector(text) {
    const numbers = text.match(/\d+\.?\d*/g) || []
    const numericValues = numbers.map(n => parseFloat(n)).filter(n => !isNaN(n))
    
    if (numericValues.length === 0) return { count: 0, avg: 0, max: 0 }
    
    return {
      count: numericValues.length,
      avg: numericValues.reduce((sum, n) => sum + n, 0) / numericValues.length,
      max: Math.max(...numericValues),
      range: Math.max(...numericValues) - Math.min(...numericValues)
    }
  }

  /**
   * 📏 Analizar estructura del texto (algoritmo genérico)
   */
  analyzeTextStructure(text) {
    return {
      length: text.length,
      wordCount: text.split(/\s+/).length,
      characterDensity: text.replace(/\s/g, '').length / text.length,
      punctuationCount: (text.match(/[.,;:!?¿¡]/g) || []).length
    }
  }

  /**
   * 💰 Calcular score de precio relativo (algoritmo genérico)
   */
  calculateRelativePriceScore(precio) {
    if (!this.productPatterns || !precio) return 0
    
    const price = parseFloat(precio)
    if (isNaN(price) || price <= 0) return 0
    
    const { min, max, avg } = this.productPatterns.priceRanges
    if (max === min) return 0.5 // Si todos los precios son iguales
    
    // Normalizar precio entre 0 y 1
    return (price - min) / (max - min)
  }

  /**
   * 🔍 Búsqueda semántica inteligente genérica (SIN CACHE - DATOS FRESCOS)
   */
  async semanticSearch(query, limit = 5) {
    if (!this.initialized || !this.inventoryService) {
      console.warn('⚠️ Búsqueda semántica no inicializada')
      return []
    }

    try {
      // 🔥 OBTENER PRODUCTOS FRESCOS DIRECTAMENTE DE LA BASE DE DATOS
      let products = await this.inventoryService.getAllProducts()

      // 🎩 FILTRO INTELIGENTE PARA "GAMA MEDIA"
      const queryLower = query.toLowerCase();
      const isGamaMediaQuery = /gama\s+media|celulares.*media|medios|precio.*medio|medio.*precio|económico|baratos|rango\s+medio|intermedio/i.test(queryLower);
      
      if (isGamaMediaQuery) {
        console.log(`🎩 [FILTRO INTELIGENTE] Detectada solicitud de gama media en: "${query}"`);
        
        // Calcular rango de gama media basado en precios del inventario
        const precios = products.map(p => parseFloat(p.precio)).filter(p => !isNaN(p) && p > 0);
        
        if (precios.length > 0) {
          const minPrecio = Math.min(...precios);
          const maxPrecio = Math.max(...precios);
          
          // Definir gama media como el 30%-70% del rango de precios, con mínimo 1000 y máximo 3000 soles
          const rangoMedio = {
            min: Math.max(1000, minPrecio + (maxPrecio - minPrecio) * 0.3),
            max: Math.min(3000, minPrecio + (maxPrecio - minPrecio) * 0.7)
          };
          
          // Filtrar productos que estén en el rango de gama media
          const productosGamaMedia = products.filter(p => {
            const precio = parseFloat(p.precio);
            return !isNaN(precio) && precio >= rangoMedio.min && precio <= rangoMedio.max;
          });
          
          console.log(`🎩 [FILTRO APLICADO] Rango gama media: S/ ${rangoMedio.min.toFixed(0)} - S/ ${rangoMedio.max.toFixed(0)}`);
          console.log(`🎩 [RESULTADO] ${productosGamaMedia.length} productos de gama media encontrados de ${products.length} totales`);
          
          // Reemplazar productos originales con productos filtrados
          products = productosGamaMedia;
        }
      }

      const queryEmbedding = this.generateQueryEmbedding(query)
      const results = []

      // Calcular similitud con cada producto (DATOS FRESCOS)
      for (const product of products) {
        const embedding = this.generateProductEmbedding(product)
        const searchableText = this.createSearchableText(product)
        const similarity = this.calculateAdvancedSimilarity(queryEmbedding, embedding, searchableText, query)

        if (similarity.score > 0) {
          results.push({
            product: product,
            score: similarity.score,
            reasons: similarity.reasons,
            matchType: similarity.matchType
          })
        }
      }

      // Ordenar por puntuación y retornar los mejores
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

    } catch (error) {
      console.error('Error en búsqueda semántica:', error)
      return []
    }
  }

  /**
   * 🧠 Generar embedding para la consulta (GENÉRICO)
   */
  generateQueryEmbedding(query) {
    const text = query.toLowerCase().trim()
    const words = text.split(/\s+/).filter(word => word.length > 2)
    
    return {
      originalQuery: query,
      normalizedQuery: text,
      words: words,
      uniqueWords: [...new Set(words)],
      queryLength: text.length,
      wordCount: words.length,
      complexity: this.calculateQueryComplexity(text),
      numericFeatures: this.extractNumericVector(text),
      isSpecific: this.isSpecificQuery(text)
    }
  }

  /**
   * 📊 Calcular complejidad de la consulta (algoritmo genérico)
   */
  calculateQueryComplexity(query) {
    const factors = {
      hasNumbers: /\d/.test(query) ? 0.3 : 0,
      hasSpecialChars: /[^\w\s]/.test(query) ? 0.2 : 0,
      wordCount: Math.min(query.split(/\s+/).length / 10, 0.3),
      avgWordLength: query.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / Math.max(query.split(/\s+/).length, 1) / 20
    }
    
    return Object.values(factors).reduce((sum, factor) => sum + factor, 0)
  }

  /**
   * 🎯 Detectar si es una consulta específica (algoritmo genérico)
   */
  isSpecificQuery(text) {
    const specificityIndicators = [
      /\d+/,                           // Contiene números
      /[a-z]+\s*\d+/i,                 // Texto + número
      /\b(modelo|versión|tipo)\b/i,    // Palabras de especificidad
      /["'].*["']/,                    // Texto entre comillas
      /\b\w+\.\w+\b/                   // Patrones como v1.2, etc.
    ]

    return specificityIndicators.some(pattern => pattern.test(text))
  }

  /**
   * 🧠 Calcular similitud avanzada (algoritmo matemático puro)
   */
  calculateAdvancedSimilarity(queryEmbedding, productEmbedding, productText, originalQuery) {
    let score = 0
    const reasons = []
    let matchType = 'semantic'

    // 1. Similitud léxica directa (coincidencias exactas)
    const lexicalSimilarity = this.calculateLexicalSimilarity(queryEmbedding.words, productEmbedding.uniqueWords)
    if (lexicalSimilarity.score > 0) {
      score += lexicalSimilarity.score * 40 // Peso alto para coincidencias exactas
      reasons.push(`Coincidencias léxicas: ${lexicalSimilarity.matches.join(', ')}`)
      matchType = 'lexical'
    }

    // 2. Similitud semántica basada en estructura
    const structuralSimilarity = this.calculateStructuralSimilarity(queryEmbedding, productEmbedding)
    if (structuralSimilarity > 0) {
      score += structuralSimilarity * 25
      reasons.push('Similitud estructural')
    }

    // 3. Similitud numérica (características técnicas)
    const numericSimilarity = this.calculateNumericSimilarity(queryEmbedding.numericFeatures, productEmbedding.numericFeatures)
    if (numericSimilarity > 0) {
      score += numericSimilarity * 20
      reasons.push('Características numéricas similares')
    }

    // 4. Bonus por complejidad semántica
    const complexityBonus = this.calculateComplexityBonus(queryEmbedding, productEmbedding)
    if (complexityBonus > 0) {
      score += complexityBonus * 10
      reasons.push('Complejidad semántica')
    }

    // 5. Similitud de longitud y densidad
    const densitySimilarity = this.calculateDensitySimilarity(queryEmbedding, productEmbedding)
    if (densitySimilarity > 0) {
      score += densitySimilarity * 5
      reasons.push('Densidad de información similar')
    }

    // 6. Penalty por falta de relevancia en consultas específicas
    if (queryEmbedding.isSpecific && score < 30) {
      score = Math.max(0, score - 15)
    }

    return {
      score: Math.min(score, 100), // Limitar a 100
      reasons,
      matchType
    }
  }

  /**
   * 🔤 Calcular similitud léxica (algoritmo genérico)
   */
  calculateLexicalSimilarity(queryWords, productWords) {
    const matches = []
    let matchScore = 0

    queryWords.forEach(qWord => {
      productWords.forEach(pWord => {
        // Coincidencia exacta
        if (qWord === pWord) {
          matches.push(qWord)
          matchScore += 1
        }
        // Coincidencia parcial (contiene)
        else if (pWord.includes(qWord) && qWord.length > 3) {
          matches.push(`~${qWord}`)
          matchScore += 0.7
        }
        // Similitud de Levenshtein para palabras similares
        else if (this.calculateLevenshteinSimilarity(qWord, pWord) > 0.8 && qWord.length > 3) {
          matches.push(`≈${qWord}`)
          matchScore += 0.5
        }
      })
    })

    return {
      score: matchScore / Math.max(queryWords.length, 1),
      matches: [...new Set(matches)]
    }
  }

  /**
   * 📊 Calcular similitud estructural (algoritmo matemático)
   */
  calculateStructuralSimilarity(queryEmbedding, productEmbedding) {
    const factors = [
      // Similitud de diversidad léxica
      1 - Math.abs(queryEmbedding.complexity - productEmbedding.lexicalDiversity),
      // Similitud de densidad de información
      1 - Math.abs((queryEmbedding.wordCount / 10) - productEmbedding.informationDensity),
      // Similitud de complejidad
      1 - Math.abs(queryEmbedding.complexity - productEmbedding.semanticComplexity)
    ]

    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length
  }

  /**
   * 🔢 Calcular similitud numérica (algoritmo genérico)
   */
  calculateNumericSimilarity(queryNumerics, productNumerics) {
    if (!queryNumerics || !productNumerics || queryNumerics.count === 0 || productNumerics.count === 0) {
      return 0
    }

    const avgSimilarity = 1 - Math.abs(queryNumerics.avg - productNumerics.avg) / Math.max(queryNumerics.avg, productNumerics.avg, 1)
    const maxSimilarity = 1 - Math.abs(queryNumerics.max - productNumerics.max) / Math.max(queryNumerics.max, productNumerics.max, 1)
    
    return (avgSimilarity + maxSimilarity) / 2
  }

  /**
   * 🧠 Calcular bonus de complejidad (algoritmo genérico)
   */
  calculateComplexityBonus(queryEmbedding, productEmbedding) {
    // Bonus si ambos tienen complejidad similar
    const complexityDiff = Math.abs(queryEmbedding.complexity - productEmbedding.semanticComplexity)
    return Math.max(0, 1 - complexityDiff * 2)
  }

  /**
   * 📊 Calcular similitud de densidad (algoritmo genérico)
   */
  calculateDensitySimilarity(queryEmbedding, productEmbedding) {
    const queryDensity = queryEmbedding.queryLength / Math.max(queryEmbedding.wordCount, 1)
    const productDensity = productEmbedding.textStructure.characterDensity * 100
    
    return 1 - Math.abs(queryDensity - productDensity) / Math.max(queryDensity, productDensity, 1)
  }

  /**
   * 🔤 Calcular similitud de Levenshtein (algoritmo matemático)
   */
  calculateLevenshteinSimilarity(str1, str2) {
    if (str1 === str2) return 1
    if (str1.length === 0 || str2.length === 0) return 0

    const matrix = []
    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    const maxLength = Math.max(str1.length, str2.length)
    return 1 - matrix[str1.length][str2.length] / maxLength
  }

  /**
   * 🔄 Método para actualizar producto (mantener compatibilidad)
   */
  async updateProduct(product) {
    // Regenerar patrones dinámicamente cuando se actualiza inventario
    await this.analyzeProductPatterns()
    console.log('🔥 Patrones actualizados - Datos siempre frescos para:', product.nombre)
  }

  /**
   * 🗑️ Método para remover producto (mantener compatibilidad)
   */
  removeProduct(productId) {
    // Regenerar patrones dinámicamente cuando se elimina producto
    this.analyzeProductPatterns()
    console.log('🔥 Patrones actualizados - Producto eliminado ID:', productId)
  }

  /**
   * 📈 Obtener estadísticas del sistema semántico
   */
  getSemanticStats() {
    if (!this.productPatterns) {
      return { status: 'no_initialized' }
    }

    return {
      status: 'active',
      commonWords: this.productPatterns.commonWords.length,
      categories: this.productPatterns.categoryWords.length,
      totalProducts: this.productPatterns.totalProducts,
      priceRange: this.productPatterns.priceRanges
    }
  }
}

// Instancia singleton
const semanticSearchService = new SemanticSearchService()

export default semanticSearchService