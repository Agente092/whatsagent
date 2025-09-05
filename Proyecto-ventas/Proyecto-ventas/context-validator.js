/**
 * 🛡️ CONTEXT VALIDATOR - VALIDACIÓN ROBUSTA DE CONTEXTO
 * 
 * Previene confusiones de productos y valida coherencia conversacional
 */

export class ContextValidator {
  constructor() {
    this.productSimilarity = new Map()
    this.conflictPatterns = [
      { pattern: /iphone\s*(\d+)/gi, extract: (match) => `iphone ${match[1]}` },
      { pattern: /samsung\s*galaxy\s*s(\d+)/gi, extract: (match) => `galaxy s${match[1]}` },
      { pattern: /huawei\s*(\w+)/gi, extract: (match) => `huawei ${match[1]}` }
    ]
  }

  /**
   * 🔍 VALIDAR COHERENCIA DE CONTEXTO
   */
  validateContext(userMessage, currentContext, geminiResponse) {
    try {
      console.log('🛡️ Validando coherencia de contexto...')
      
      const messageProducts = this.extractProductMentions(userMessage)
      const contextProducts = this.extractProductMentions(currentContext?.lastProduct || '')
      const responseProducts = this.extractProductMentions(geminiResponse?.products_mentioned?.[0]?.name || '')

      const validation = {
        isValid: true,
        confidence: 1.0,
        conflicts: [],
        recommendations: []
      }

      // Validación 1: Coherencia mensaje-contexto
      if (messageProducts.length > 0 && contextProducts.length > 0) {
        const messageProduct = messageProducts[0]
        const contextProduct = contextProducts[0]
        
        if (!this.areProductsSimilar(messageProduct, contextProduct)) {
          validation.conflicts.push({
            type: 'product_mismatch',
            severity: 'high',
            details: `Usuario pregunta por "${messageProduct}" pero contexto es "${contextProduct}"`
          })
          validation.isValid = false
          validation.confidence = 0.2
        }
      }

      // Validación 2: Coherencia respuesta-mensaje
      if (responseProducts.length > 0 && messageProducts.length > 0) {
        const responseProduct = responseProducts[0]
        const messageProduct = messageProducts[0]
        
        if (!this.areProductsSimilar(responseProduct, messageProduct)) {
          validation.conflicts.push({
            type: 'response_mismatch',
            severity: 'critical',
            details: `Gemini responde sobre "${responseProduct}" cuando usuario pregunta por "${messageProduct}"`
          })
          validation.isValid = false
          validation.confidence = 0.1
        }
      }

      // Validación 3: Detección de cambio de tema
      if (messageProducts.length > 0 && contextProducts.length > 0) {
        const similarity = this.calculateProductSimilarity(messageProducts[0], contextProducts[0])
        if (similarity < 0.5) {
          validation.recommendations.push({
            type: 'context_reset',
            action: 'clear_context',
            reason: `Cambio de producto detectado: ${contextProducts[0]} -> ${messageProducts[0]}`
          })
        }
      }

      console.log(`🛡️ Validación completada: ${validation.isValid ? 'VÁLIDO' : 'INVÁLIDO'} (confianza: ${validation.confidence})`)
      
      return validation

    } catch (error) {
      console.error('❌ Error en validación de contexto:', error)
      return {
        isValid: false,
        confidence: 0,
        conflicts: [{ type: 'validation_error', severity: 'critical', details: error.message }],
        recommendations: [{ type: 'context_reset', action: 'clear_all', reason: 'Error de validación' }]
      }
    }
  }

  /**
   * 🔍 EXTRAER MENCIONES DE PRODUCTOS DEL TEXTO
   */
  extractProductMentions(text) {
    if (!text) return []
    
    const mentions = []
    const normalizedText = text.toLowerCase()

    // Patrones mejorados para detección de productos
    const patterns = [
      { pattern: /iphone\s*(\d+)(\s*pro(\s*max)?)?/gi, extract: (match) => `iphone ${match[1]}${match[2] || ''}` },
      { pattern: /samsung\s*galaxy\s*s(\d+)/gi, extract: (match) => `galaxy s${match[1]}` },
      { pattern: /huawei\s*(\w+)/gi, extract: (match) => `huawei ${match[1]}` },
      { pattern: /xiaomi\s*(\w+)/gi, extract: (match) => `xiaomi ${match[1]}` }
    ]

    for (const { pattern, extract } of patterns) {
      const matches = [...normalizedText.matchAll(pattern)]
      for (const match of matches) {
        try {
          mentions.push(extract(match))
        } catch (error) {
          console.warn('⚠️ Error extrayendo producto:', error)
        }
      }
    }

    return [...new Set(mentions)]
  }

  /**
   * 🧮 CALCULAR SIMILITUD ENTRE PRODUCTOS
   */
  calculateProductSimilarity(product1, product2) {
    if (!product1 || !product2) return 0
    
    const p1 = this.normalizeProduct(product1)
    const p2 = this.normalizeProduct(product2)
    
    // Mismo producto exacto
    if (p1 === p2) return 1.0
    
    // Misma marca y serie
    const p1Parts = p1.split(' ')
    const p2Parts = p2.split(' ')
    
    if (p1Parts[0] === p2Parts[0]) { // Misma marca
      if (p1Parts[1] && p2Parts[1] && 
          Math.abs(parseInt(p1Parts[1]) - parseInt(p2Parts[1])) <= 1) {
        return 0.8 // Modelos consecutivos (iPhone 14 vs iPhone 15)
      }
      return 0.6 // Misma marca, diferentes modelos
    }
    
    return 0.1 // Productos completamente diferentes
  }

  /**
   * 🔧 NORMALIZAR PRODUCTO PARA COMPARACIÓN
   */
  normalizeProduct(product) {
    return product
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\b(apple|samsung|huawei)\b/g, '')
      .replace(/\b(pro|max|plus|ultra)\b/g, '')
      .replace(/\b\d+gb\b/g, '')
      .replace(/\bvip\b/g, '')
      .trim()
  }

  /**
   * ✅ VERIFICAR SI DOS PRODUCTOS SON SIMILARES
   */
  areProductsSimilar(product1, product2) {
    return this.calculateProductSimilarity(product1, product2) >= 0.7
  }

  /**
   * 🔧 CORREGIR CONTEXTO BASADO EN VALIDACIÓN
   */
  async fixContext(validation, userId, conversationManager) {
    try {
      if (validation.isValid) return { fixed: false }

      console.log('🔧 Aplicando correcciones de contexto...')
      
      for (const recommendation of validation.recommendations) {
        switch (recommendation.action) {
          case 'clear_context':
            await conversationManager.clearConflictingContext(userId)
            console.log('✅ Contexto conflictivo limpiado')
            break
            
          case 'clear_all':
            await conversationManager.clearConflictingContext(userId)
            await conversationManager.updateUserState(userId, {
              current_state: 'inicio',
              current_product: null,
              conversation_context: {}
            })
            console.log('✅ Contexto completamente reiniciado')
            break
        }
      }

      return { 
        fixed: true, 
        actions: validation.recommendations.map(r => r.action) 
      }

    } catch (error) {
      console.error('❌ Error corrigiendo contexto:', error)
      return { fixed: false, error: error.message }
    }
  }

  /**
   * 📊 GENERAR REPORTE DE VALIDACIÓN
   */
  generateValidationReport(validation) {
    return {
      timestamp: new Date().toISOString(),
      status: validation.isValid ? 'VALID' : 'INVALID',
      confidence: validation.confidence,
      conflictCount: validation.conflicts.length,
      recommendationCount: validation.recommendations.length,
      details: {
        conflicts: validation.conflicts,
        recommendations: validation.recommendations
      }
    }
  }

  /**
   * 🎯 SUGERIR MEJOR CONTEXTO PARA GEMINI
   */
  suggestOptimalContext(userMessage, productHistory, currentMemory) {
    try {
      const messageProducts = this.extractProductMentions(userMessage)
      
      if (messageProducts.length === 0) {
        // Sin productos mencionados, usar contexto actual si es coherente
        return {
          useCurrentContext: true,
          clearBeforeResponse: false,
          suggestedProduct: currentMemory?.lastProduct || null
        }
      }

      const mentionedProduct = messageProducts[0]
      
      // Verificar si el producto mencionado coincide con la memoria actual
      if (currentMemory?.lastProduct) {
        const similarity = this.calculateProductSimilarity(
          mentionedProduct, 
          currentMemory.lastProduct
        )
        
        if (similarity >= 0.7) {
          return {
            useCurrentContext: true,
            clearBeforeResponse: false,
            suggestedProduct: currentMemory.lastProduct
          }
        }
      }

      // Producto diferente mencionado, limpiar contexto
      return {
        useCurrentContext: false,
        clearBeforeResponse: true,
        suggestedProduct: mentionedProduct,
        reason: `Cambio de producto: ${currentMemory?.lastProduct || 'ninguno'} -> ${mentionedProduct}`
      }

    } catch (error) {
      console.error('❌ Error sugiriendo contexto:', error)
      return {
        useCurrentContext: false,
        clearBeforeResponse: true,
        suggestedProduct: null,
        error: error.message
      }
    }
  }
}

export default ContextValidator