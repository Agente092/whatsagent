const logger = require('./logger')

class LegalFactChecker {
  constructor(knowledgeBase) {
    this.knowledgeBase = knowledgeBase
    
    // Base de datos de referencias legales verificadas
    this.verifiedLegalReferences = new Map()
    
    // Patrones para detectar referencias legales específicas
    this.legalReferencePatterns = {
      laws: /Ley N°?\s*(\d+)/gi,
      decrees: /Decreto Ley N°?\s*(\d+)/gi,
      civilCode: /Código Civil art(?:ículo)?\.?\s*(\d+)/gi,
      taxCode: /Código Tributario art(?:ículo)?\.?\s*(\d+)/gi,
      articles: /art(?:ículo)?\.?\s*(\d+)/gi,
      dlNumbers: /D\.?L\.?\s*N°?\s*(\d+)/gi
    }
    
    // Inicializar base de referencias verificadas
    this.initializeVerifiedReferences()
    
    logger.info('🔍 LegalFactChecker initialized with verification database')
  }

  /**
   * Inicializa la base de referencias legales verificadas desde la base de conocimientos
   */
  initializeVerifiedReferences() {
    try {
      const knowledgeContext = this.knowledgeBase && this.knowledgeBase.getContext ? this.knowledgeBase.getContext() : ''
      if (!knowledgeContext) {
        logger.warn('Knowledge base not available for legal fact checking')
        return
      }

      // Extraer y verificar todas las referencias legales del contexto
      this.extractVerifiedReferences(knowledgeContext)
      
      logger.info(`🔍 Initialized ${this.verifiedLegalReferences.size} verified legal references`)
      
    } catch (error) {
      logger.error('Error initializing verified legal references', error)
    }
  }

  /**
   * Extrae referencias legales verificadas de la base de conocimientos
   * @param {string} context - Contexto de la base de conocimientos
   */
  extractVerifiedReferences(context) {
    const lines = context.split('\n')
    
    lines.forEach((line, index) => {
      // Buscar referencias legales en cada línea
      Object.entries(this.legalReferencePatterns).forEach(([type, pattern]) => {
        const matches = [...line.matchAll(pattern)]
        
        matches.forEach(match => {
          const fullMatch = match[0]
          const number = match[1]
          
          // Crear clave única para la referencia
          const referenceKey = this.createReferenceKey(type, fullMatch)
          
          // Guardar referencia verificada con contexto
          this.verifiedLegalReferences.set(referenceKey, {
            type,
            fullReference: fullMatch,
            number,
            context: this.extractSurroundingContext(lines, index),
            verified: true,
            source: 'knowledge_base'
          })
        })
      })
    })
  }

  /**
   * Crea una clave única para una referencia legal
   * @param {string} type - Tipo de referencia
   * @param {string} reference - Referencia completa
   * @returns {string} - Clave única
   */
  createReferenceKey(type, reference) {
    return `${type}:${reference.toLowerCase().replace(/\s+/g, '_')}`
  }

  /**
   * Extrae contexto circundante de una línea
   * @param {Array} lines - Todas las líneas
   * @param {number} index - Índice de la línea actual
   * @returns {string} - Contexto circundante
   */
  extractSurroundingContext(lines, index) {
    const start = Math.max(0, index - 2)
    const end = Math.min(lines.length, index + 3)
    return lines.slice(start, end).join(' ').trim()
  }

  /**
   * Verifica si una respuesta contiene referencias legales y las valida
   * @param {string} response - Respuesta generada por la IA
   * @returns {Object} - Resultado de la verificación
   */
  async verifyLegalReferences(response) {
    const startTime = Date.now()
    
    try {
      // Detectar todas las referencias legales en la respuesta
      const detectedReferences = this.detectLegalReferences(response)
      
      if (detectedReferences.length === 0) {
        return {
          isValid: true,
          hasLegalReferences: false,
          verifiedReferences: [],
          invalidReferences: [],
          correctedResponse: response,
          processingTime: Date.now() - startTime
        }
      }

      // Verificar cada referencia detectada
      const verificationResults = await this.verifyEachReference(detectedReferences)
      
      // Generar respuesta corregida si es necesario
      const correctedResponse = this.generateCorrectedResponse(response, verificationResults)
      
      const result = {
        isValid: verificationResults.invalidReferences.length === 0,
        hasLegalReferences: true,
        verifiedReferences: verificationResults.verifiedReferences,
        invalidReferences: verificationResults.invalidReferences,
        correctedResponse,
        processingTime: Date.now() - startTime,
        totalReferences: detectedReferences.length
      }
      
      if (result.invalidReferences.length > 0) {
        logger.warn('🚨 Invalid legal references detected', {
          invalid: result.invalidReferences.length,
          total: result.totalReferences
        })
      }
      
      return result
      
    } catch (error) {
      logger.error('Error verifying legal references', error)
      return {
        isValid: false,
        hasLegalReferences: false,
        verifiedReferences: [],
        invalidReferences: [],
        correctedResponse: response,
        error: error.message,
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Detecta todas las referencias legales en un texto
   * @param {string} text - Texto a analizar
   * @returns {Array} - Referencias detectadas
   */
  detectLegalReferences(text) {
    const detectedReferences = []
    
    Object.entries(this.legalReferencePatterns).forEach(([type, pattern]) => {
      const matches = [...text.matchAll(pattern)]
      
      matches.forEach(match => {
        detectedReferences.push({
          type,
          fullMatch: match[0],
          number: match[1],
          index: match.index,
          referenceKey: this.createReferenceKey(type, match[0])
        })
      })
    })
    
    return detectedReferences.sort((a, b) => a.index - b.index)
  }

  /**
   * Verifica cada referencia detectada contra la base de conocimientos
   * @param {Array} detectedReferences - Referencias detectadas
   * @returns {Object} - Resultados de verificación
   */
  async verifyEachReference(detectedReferences) {
    const verifiedReferences = []
    const invalidReferences = []
    
    for (const reference of detectedReferences) {
      const isVerified = this.verifiedLegalReferences.has(reference.referenceKey)
      
      if (isVerified) {
        const verifiedData = this.verifiedLegalReferences.get(reference.referenceKey)
        verifiedReferences.push({
          ...reference,
          verifiedData,
          isValid: true
        })
      } else {
        // Intentar búsqueda más flexible
        const flexibleMatch = this.findFlexibleMatch(reference)
        
        if (flexibleMatch) {
          verifiedReferences.push({
            ...reference,
            verifiedData: flexibleMatch,
            isValid: true,
            matchType: 'flexible'
          })
        } else {
          invalidReferences.push({
            ...reference,
            isValid: false,
            reason: 'No encontrado en base de conocimientos verificada'
          })
        }
      }
    }
    
    return { verifiedReferences, invalidReferences }
  }

  /**
   * Busca coincidencias flexibles para referencias no encontradas exactamente
   * @param {Object} reference - Referencia a buscar
   * @returns {Object|null} - Coincidencia encontrada o null
   */
  findFlexibleMatch(reference) {
    // Buscar por tipo y número similar
    for (const [key, verifiedRef] of this.verifiedLegalReferences.entries()) {
      if (verifiedRef.type === reference.type && verifiedRef.number === reference.number) {
        return verifiedRef
      }
    }
    
    // Buscar por número en cualquier tipo relacionado
    const relatedTypes = this.getRelatedTypes(reference.type)
    for (const [key, verifiedRef] of this.verifiedLegalReferences.entries()) {
      if (relatedTypes.includes(verifiedRef.type) && verifiedRef.number === reference.number) {
        return verifiedRef
      }
    }
    
    return null
  }

  /**
   * Obtiene tipos relacionados para búsqueda flexible
   * @param {string} type - Tipo de referencia
   * @returns {Array} - Tipos relacionados
   */
  getRelatedTypes(type) {
    const typeGroups = {
      laws: ['laws', 'decrees', 'dlNumbers'],
      decrees: ['laws', 'decrees', 'dlNumbers'],
      dlNumbers: ['laws', 'decrees', 'dlNumbers'],
      articles: ['articles', 'civilCode', 'taxCode'],
      civilCode: ['articles', 'civilCode'],
      taxCode: ['articles', 'taxCode']
    }
    
    return typeGroups[type] || [type]
  }

  /**
   * Genera una respuesta corregida eliminando referencias inválidas
   * @param {string} originalResponse - Respuesta original
   * @param {Object} verificationResults - Resultados de verificación
   * @returns {string} - Respuesta corregida
   */
  generateCorrectedResponse(originalResponse, verificationResults) {
    let correctedResponse = originalResponse
    
    // Si hay referencias inválidas, generar respuesta alternativa
    if (verificationResults.invalidReferences.length > 0) {
      // Remover referencias inválidas y agregar disclaimer
      verificationResults.invalidReferences.forEach(invalidRef => {
        const replacement = `[información legal específica disponible en consulta especializada]`
        correctedResponse = correctedResponse.replace(invalidRef.fullMatch, replacement)
      })
      
      // Agregar disclaimer sobre verificación
      correctedResponse += `\n\n⚠️ **Nota de verificación:** Algunas referencias legales específicas han sido omitidas para asegurar precisión. Para citas legales exactas, consulte fuentes oficiales o un abogado especializado.`
    }
    
    // Si hay referencias verificadas, agregar disclaimer de confianza
    if (verificationResults.verifiedReferences.length > 0) {
      correctedResponse += `\n\n✅ **Referencias verificadas:** La información legal mencionada ha sido verificada contra mi base de conocimientos especializada.`
    }
    
    return correctedResponse
  }

  /**
   * Obtiene estadísticas del fact checker
   * @returns {Object} - Estadísticas
   */
  getFactCheckerStats() {
    const referencesByType = {}
    
    for (const [key, reference] of this.verifiedLegalReferences.entries()) {
      if (!referencesByType[reference.type]) {
        referencesByType[reference.type] = 0
      }
      referencesByType[reference.type]++
    }
    
    return {
      totalVerifiedReferences: this.verifiedLegalReferences.size,
      referencesByType,
      patternsConfigured: Object.keys(this.legalReferencePatterns).length
    }
  }

  /**
   * Busca información específica sobre una referencia legal
   * @param {string} reference - Referencia a buscar
   * @returns {Object|null} - Información encontrada
   */
  lookupLegalReference(reference) {
    const normalizedRef = reference.toLowerCase().replace(/\s+/g, '_')
    
    for (const [key, verifiedRef] of this.verifiedLegalReferences.entries()) {
      if (key.includes(normalizedRef) || verifiedRef.fullReference.toLowerCase().includes(reference.toLowerCase())) {
        return {
          found: true,
          reference: verifiedRef.fullReference,
          context: verifiedRef.context,
          type: verifiedRef.type,
          verified: true
        }
      }
    }
    
    return {
      found: false,
      reference,
      reason: 'No encontrado en base de conocimientos verificada'
    }
  }
}

module.exports = LegalFactChecker