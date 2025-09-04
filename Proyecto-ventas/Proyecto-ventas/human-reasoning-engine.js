/**
 * 🧠 HUMAN REASONING ENGINE
 * Sistema de razonamiento contextual humano para el agente de ventas
 * 
 * PROPÓSITO: Hacer que el agente piense y razone como un humano
 * - Entender referencias implícitas ("ese producto", "ese celular")
 * - Mantener contexto conversacional natural
 * - Razonar sobre las intenciones del cliente
 * - Responder de forma natural y coherente
 */

class HumanReasoningEngine {
  constructor(originalWhatsappService) {
    this.original = originalWhatsappService
    this.contextWindow = 5 // Últimos 5 mensajes para contexto
    this.reasoningCache = new Map() // Cache de razonamientos recientes
    this.conversationPatterns = new Map() // Patrones de conversación por usuario
  }

  /**
   * 🔍 CONSULTA DIRECTA A SUPABASE PARA CONTEXTO ENHANCED
   * Bypass de métodos inexistentes
   */
  async getEnhancedContextFromSupabase(userId) {
    try {
      // Intentar acceder a Supabase directamente
      if (this.original.db && this.original.db.client) {
        console.log(`🔍 [DIRECT SUPABASE] Consultando contexto Enhanced para ${userId}`)
        
        const { data, error } = await this.original.db.client
          .from('conversaciones')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (!error && data) {
          // Parsear displayed_products si es string JSON
          let displayed_products = []
          if (data.displayed_products) {
            try {
              displayed_products = typeof data.displayed_products === 'string' 
                ? JSON.parse(data.displayed_products)
                : data.displayed_products
            } catch (parseError) {
              console.log(`⚠️ Error parseando displayed_products: ${parseError.message}`)
            }
          }
          
          console.log(`✅ [DIRECT SUPABASE] Contexto Enhanced encontrado:`, {
            enhanced_context_active: data.enhanced_context_active,
            enhanced_last_product: data.enhanced_last_product,
            source: data.source,
            products_count: displayed_products.length
          })
          
          return {
            ...data,
            displayed_products
          }
        } else {
          console.log(`⚠️ [DIRECT SUPABASE] Sin contexto Enhanced: ${error?.message || 'Sin datos'}`)
        }
      } else {
        console.log(`⚠️ [DIRECT SUPABASE] Cliente Supabase no disponible`)
      }
      
      return null
      
    } catch (error) {
      console.log(`❌ [DIRECT SUPABASE] Error: ${error.message}`)
      return null
    }
  }

  /**
   * 🎯 RAZONAMIENTO PRINCIPAL - Analizar mensaje con lógica humana
   */
  async reasonAboutMessage(userId, currentMessage, conversationHistory = []) {
    try {
      console.log(`🧠 [HUMAN REASONING] Analizando: "${currentMessage}" para ${userId}`)
      
      // 1. Obtener contexto conversacional reciente
      const recentContext = await this.getRecentContext(userId, conversationHistory)
      
      // 2. Detectar tipo de razonamiento necesario
      const reasoningType = this.detectReasoningType(currentMessage)
      
      // 3. Aplicar razonamiento específico
      const reasoning = await this.applyHumanReasoning(userId, currentMessage, recentContext, reasoningType)
      
      return reasoning
      
    } catch (error) {
      console.error('❌ Error en razonamiento humano:', error)
      return {
        type: 'error',
        confidence: 0,
        reasoning: 'No pude razonar sobre este mensaje',
        action: 'fallback'
      }
    }
  }

  /**
   * 📝 OBTENER CONTEXTO CONVERSACIONAL RECIENTE
   * 🔄 Con consulta directa a Supabase y fallback al método original
   */
  async getRecentContext(userId, conversationHistory) {
    try {
      // Obtener últimos mensajes del historial
      const recentMessages = conversationHistory.slice(-this.contextWindow)
      
      // 🔍 PRIORIDAD 1: Consulta directa a Supabase
      let conversationData = await this.getEnhancedContextFromSupabase(userId)
      
      // 🔄 FALLBACK: Método original si Supabase no tiene datos
      if (!conversationData || !conversationData.enhanced_context_active) {
        console.log(`🔄 [FALLBACK] Intentando método original...`)
        
        if (this.original.getConversationData) {
          try {
            conversationData = await this.original.getConversationData(userId) || {}
            console.log(`🔄 [FALLBACK] Datos del método original obtenidos`)
          } catch (originalError) {
            console.log(`⚠️ [FALLBACK] Error en método original: ${originalError.message}`)
            conversationData = {}
          }
        } else {
          console.log(`⚠️ [FALLBACK] Método getConversationData no existe`)
          conversationData = {}
        }
      }
      
      // Analizar productos mencionados recientemente
      const recentProducts = this.extractRecentProducts(recentMessages, conversationData)
      
      // Analizar patrones de comportamiento del usuario
      const userPattern = this.conversationPatterns.get(userId) || this.createUserPattern(userId)
      
      return {
        recentMessages,
        recentProducts,
        userPattern,
        conversationData,
        lastProductShown: this.getLastProductShown(conversationData),
        lastUserAction: this.getLastUserAction(recentMessages),
        contextSource: conversationData.enhanced_context_active ? 'supabase_direct' : 'original_fallback'
      }
      
    } catch (error) {
      console.error('❌ Error obteniendo contexto reciente:', error)
      return {
        recentMessages: [],
        recentProducts: [],
        userPattern: this.createUserPattern(userId),
        conversationData: {},
        lastProductShown: null,
        lastUserAction: null,
        contextSource: 'error_fallback'
      }
    }
  }

  /**
   * 🎯 DETECTAR TIPO DE RAZONAMIENTO NECESARIO
   */
  detectReasoningType(message) {
    const messageLC = message.toLowerCase().trim()
    
    // 🔥 PRIORIDAD MÁXIMA: Detección de confirmaciones cortas ("Si", "No", "Ok")
    const shortConfirmations = [
      'si', 'sí', 'yes', 'ok', 'dale', 'perfecto', 'excelente', 
      'no', 'nope', 'tal vez', 'quizás', 'después'
    ]
    
    // 🧠 DETECTAR CONFIRMACIONES CORTAS QUE NECESITAN CONTEXTO
    if (shortConfirmations.includes(messageLC)) {
      return 'contextual_confirmation' // ✅ NUEVO TIPO
    }
    
    // Detección de referencias contextuales
    const contextualPhrases = [
      'ese', 'esa', 'eso', 'el', 'la', 'lo',
      'ese producto', 'ese celular', 'ese teléfono', 'ese equipo',
      'esa oferta', 'el que me mostraste', 'lo puedo', 'lo funciona'
    ]
    
    // Detección de preguntas funcionales
    const functionalPhrases = [
      'viajes', 'llevar', 'grabar', 'video', 'funciona', 'sirve',
      'batería', 'duración', 'resistente', 'agua', 'cámara'
    ]
    
    // Detección de confirmaciones/interés
    const interestPhrases = [
      'si quiero', 'me interesa', 'me gusta', 'perfecto',
      'ok', 'dale', 'acepto', 'lo quiero'
    ]
    
    // Detección de búsquedas específicas
    const searchPhrases = [
      'busco', 'quiero', 'necesito', 'información', 'dame'
    ]

    if (contextualPhrases.some(phrase => messageLC.includes(phrase))) {
      return 'contextual_reference'
    } else if (functionalPhrases.some(phrase => messageLC.includes(phrase))) {
      return 'functional_question'
    } else if (interestPhrases.some(phrase => messageLC.includes(phrase))) {
      return 'interest_confirmation'
    } else if (searchPhrases.some(phrase => messageLC.includes(phrase))) {
      return 'specific_search'
    } else {
      return 'general_conversation'
    }
  }

  /**
   * 🧠 APLICAR RAZONAMIENTO HUMANO ESPECÍFICO
   */
  async applyHumanReasoning(userId, message, context, reasoningType) {
    switch (reasoningType) {
      case 'contextual_confirmation':
        return await this.reasonAboutContextualConfirmation(userId, message, context) // ✅ NUEVO
      
      case 'contextual_reference':
        return await this.reasonAboutContextualReference(userId, message, context)
      
      case 'functional_question':
        return await this.reasonAboutFunctionalQuestion(userId, message, context)
      
      case 'interest_confirmation':
        return await this.reasonAboutInterestConfirmation(userId, message, context)
      
      case 'specific_search':
        return await this.reasonAboutSpecificSearch(userId, message, context)
      
      default:
        return await this.reasonAboutGeneralConversation(userId, message, context)
    }
  }

  /**
   * ✅ RAZONAR SOBRE CONFIRMACIONES CONTEXTUALES ("Si", "No", "Ok")
   * Lógica humana: "Si" es respuesta a la última pregunta que hice
   */
  async reasonAboutContextualConfirmation(userId, message, context) {
    console.log(`✅ [CONTEXTUAL CONFIRMATION] Analizando confirmación: "${message}"`) 
    
    const messageLC = message.toLowerCase().trim()
    
    // 🔍 Analizar los últimos mensajes del agente para encontrar preguntas
    const recentMessages = context.recentMessages || []
    let lastAgentQuestion = null
    let lastProduct = context.lastProductShown
    
    // 🔍 Buscar la última pregunta del agente (orden inverso)
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i]
      if (msg.role === 'assistant' && msg.message && msg.message.includes('?')) {
        lastAgentQuestion = msg.message
        break
      }
    }
    
    console.log(`🔍 Última pregunta del agente: "${lastAgentQuestion}"`)
    console.log(`📱 Último producto mostrado: ${lastProduct?.name || 'ninguno'}`)
    
    // 🧠 RAZONAMIENTO BASADO EN LA PREGUNTA PREVIA
    let intention = 'general_confirmation'
    let confidence = 0.5
    let suggestedAction = 'general_response'
    
    if (lastAgentQuestion) {
      const questionLC = lastAgentQuestion.toLowerCase()
      
      // 💰 Detección de preguntas de compra
      if (questionLC.includes('proceder con la compra') || 
          questionLC.includes('te gustaría comprarlo') ||
          questionLC.includes('quieres comprarlo') ||
          questionLC.includes('te interesa') && (questionLC.includes('compra') || questionLC.includes('producto'))) {
        intention = 'purchase_confirmation'
        confidence = 0.95
        suggestedAction = messageLC === 'si' || messageLC === 'sí' ? 'proceed_to_purchase' : 'continue_shopping'
      }
      // 📝 Detección de preguntas de información
      else if (questionLC.includes('más información') || 
               questionLC.includes('especificaciones') ||
               questionLC.includes('características') ||
               questionLC.includes('detalles')) {
        intention = 'information_request_confirmation'
        confidence = 0.9
        suggestedAction = messageLC === 'si' || messageLC === 'sí' ? 'provide_more_info' : 'offer_alternatives'
      }
      // 🔍 Detección de preguntas generales de interés
      else if (questionLC.includes('te interesa este producto') ||
               questionLC.includes('qué te parece') ||
               questionLC.includes('te gusta')) {
        intention = 'interest_confirmation'
        confidence = 0.9
        suggestedAction = messageLC === 'si' || messageLC === 'sí' ? 'show_purchase_options' : 'show_alternatives'
      }
    }
    
    // 🚀 Si no hay producto Enhanced, intentar obtener de conversationData sincronizado
    if (!lastProduct && context.conversationData) {
      if (context.conversationData.displayed_products && context.conversationData.displayed_products.length > 0) {
        lastProduct = context.conversationData.displayed_products[context.conversationData.displayed_products.length - 1]
        console.log(`🚀 [ENHANCED SYNC] Usando producto de conversationData: ${lastProduct.name || lastProduct.nombre}`)
      } else if (context.conversationData.enhanced_last_product) {
        lastProduct = {
          name: context.conversationData.enhanced_last_product,
          nombre: context.conversationData.enhanced_last_product,
          source: 'enhanced_sync_fallback'
        }
        console.log(`🚀 [ENHANCED SYNC] Usando enhanced_last_product: ${lastProduct.name}`)
      }
    }
    
    // ⚠️ ANTI-FALLBACK: Si aún no hay producto Enhanced, evitar fallback VIP
    if (!lastProduct) {
      console.log(`❌ [CONTEXTUAL CONFIRMATION] Sin contexto Enhanced - evitando fallback VIP`)
      return {
        type: 'contextual_confirmation',
        confidence: 0.1, // 🚫 Muy baja confianza
        reasoning: `Cliente responde "${message}" pero sin contexto Enhanced válido`,
        action: 'ask_clarification',
        targetProduct: null,
        intention: 'clarification_needed',
        lastAgentQuestion,
        suggestedResponse: 'Por favor, especifica qué producto te interesa para poder ayudarte mejor.'
      }
    }
    
    return {
      type: 'contextual_confirmation',
      confidence,
      reasoning: `Cliente responde "${message}" a la pregunta: "${lastAgentQuestion}" con intención: ${intention}`,
      action: suggestedAction,
      targetProduct: lastProduct,
      intention,
      lastAgentQuestion,
      suggestedResponse: await this.generateConfirmationResponse(message, intention, lastProduct, lastAgentQuestion)
    }
  }

  /**
   * 🎯 RAZONAR SOBRE REFERENCIAS CONTEXTUALES
   * Como un humano: "ese producto" se refiere al último producto mostrado Enhanced
   * 🚫 ANTI-FALLBACK: Sin fallback a VIP
   */
  async reasonAboutContextualReference(userId, message, context) {
    console.log(`🎯 [CONTEXTUAL REASONING] Analizando referencia: "${message}"`)
    
    // Lógica humana: El cliente se refiere al último producto Enhanced que le mostré
    const lastProduct = context.lastProductShown
    
    if (!lastProduct) {
      console.log(`❌ [CONTEXTUAL] Sin producto Enhanced de referencia - evitando fallback VIP`)
      return {
        type: 'contextual_reference',
        confidence: 0.1, // 🚫 Muy baja confianza para evitar fallback
        reasoning: 'No hay producto Enhanced reciente para referenciar',
        action: 'ask_clarification',
        suggestedResponse: 'Disculpa, ¿a cuál producto te refieres exactamente? Por favor, especifica el modelo.'
      }
    }

    // Determinar la intención específica de la referencia
    const messageLC = message.toLowerCase()
    let intention = 'general_question'
    let confidence = 0.9 // Alta confianza con contexto Enhanced
    
    // 🛒 DETECTAR INTENCIONES DE COMPRA (MÁXIMA PRIORIDAD)
    if (messageLC.includes('quiero comprarlo') || messageLC.includes('quiero comprar') || 
        messageLC.includes('me interesa') || messageLC.includes('lo quiero') || 
        messageLC.includes('quiero ese') || messageLC.includes('quiero esa') ||
        messageLC.includes('si quiero') || messageLC.includes('sí quiero') ||
        messageLC.includes('comprarlo') || messageLC.includes('adquirirlo') ||
        messageLC.includes('necesito comprarlo') || messageLC.includes('voy a comprarlo')) {
      intention = 'purchase_intent'
      confidence = 0.98
    }
    // 📸 DETECTAR PREGUNTAS SOBRE FOTOS/CÁMARA (INCLUYENDO REGALOS)
    else if (messageLC.includes('foto') || messageLC.includes('fotografía') || messageLC.includes('imagen') || 
        messageLC.includes('cámara') || messageLC.includes('camara') || messageLC.includes('selfie') ||
        (messageLC.includes('regalo') && (messageLC.includes('foto') || messageLC.includes('tomar'))) ||
        messageLC.includes('tomarse fotos') || messageLC.includes('tomar fotos')) {
      intention = 'camera_question'
      confidence = 0.95
    } else if (messageLC.includes('viajes') || messageLC.includes('llevar') || 
               (messageLC.includes('regalo') && messageLC.includes('llevar'))) {
      intention = 'portability_question'
      confidence = 0.95
    } else if (messageLC.includes('grabar') || messageLC.includes('video') || messageLC.includes('grabación')) {
      intention = 'camera_question' // Video también es funcionalidad de cámara
      confidence = 0.95
    } else if (messageLC.includes('funciona') || messageLC.includes('sirve') || 
               messageLC.includes('buen regalo') || messageLC.includes('regalo para')) {
      intention = 'functionality_question'
      confidence = 0.9
    } else if (messageLC.includes('precio') || messageLC.includes('cuesta') || messageLC.includes('valor')) {
      intention = 'price_question'
      confidence = 0.95
    }

    console.log(`✅ [CONTEXTUAL] Referencia Enhanced detectada: "${lastProduct.name || lastProduct.nombre}" con intención: ${intention}`)

    return {
      type: 'contextual_reference',
      confidence,
      reasoning: `Cliente se refiere Enhanced a "${lastProduct.name || lastProduct.nombre}" con intención: ${intention}`,
      action: 'answer_about_product',
      targetProduct: lastProduct,
      intention,
      suggestedResponse: await this.generateContextualResponse(lastProduct, intention, message)
    }
  }

  /**
   * 🔧 RAZONAR SOBRE PREGUNTAS FUNCIONALES
   * 🚫 ANTI-FALLBACK: Sin fallback a VIP
   */
  async reasonAboutFunctionalQuestion(userId, message, context) {
    console.log(`🔧 [FUNCTIONAL REASONING] Analizando funcionalidad: "${message}"`)
    console.log(`🔍 [DEBUG] Context recibido:`, {
      conversationData_keys: Object.keys(context.conversationData || {}),
      lastProductShown: context.lastProductShown?.name || context.lastProductShown?.nombre || 'NULL',
      enhanced_context_active: context.conversationData?.enhanced_context_active,
      displayed_products_length: context.conversationData?.displayed_products?.length || 0,
      syncAttempts: context.syncAttempts || 0
    })
    
    const lastProduct = context.lastProductShown
    if (!lastProduct) {
      console.log(`❌ [FUNCTIONAL] Sin producto de referencia Enhanced - confidence: 0.1 (ANTI-FALLBACK)`)
      return {
        type: 'functional_question',
        confidence: 0.1, // 🚫 Muy baja confianza para evitar fallback
        reasoning: 'Pregunta funcional sin contexto Enhanced válido',
        action: 'require_enhanced_context',
        suggestion: 'Por favor, especifica qué producto te interesa para poder ayudarte mejor.'
      }
    }

    // Detectar función específica preguntada
    const messageLC = message.toLowerCase()
    let functionality = 'general'
    let confidence = 0.9 // Alta confianza cuando hay contexto Enhanced
    
    // Detectar funcionalidad basada en palabras clave del mensaje
    if (messageLC.includes('video') || messageLC.includes('grabar') || messageLC.includes('grabación')) {
      functionality = 'video_recording'
      confidence = 0.95
    } else if (messageLC.includes('viajes') || messageLC.includes('llevar') || messageLC.includes('portátil')) {
      functionality = 'portability'
      confidence = 0.95
    } else if (messageLC.includes('batería') || messageLC.includes('duración') || messageLC.includes('carga')) {
      functionality = 'battery_life'
      confidence = 0.9
    } else if (messageLC.includes('agua') || messageLC.includes('resiste') || messageLC.includes('resistente') || messageLC.includes('mojarse') || messageLC.includes('sumergir') || messageLC.includes('malogra')) {
      functionality = 'water_resistance'
      confidence = 0.95
    } else if (messageLC.includes('cámara') || messageLC.includes('foto') || messageLC.includes('fotografía') || messageLC.includes('imagen')) {
      functionality = 'camera_quality'
      confidence = 0.9
    } else if (messageLC.includes('juego') || messageLC.includes('jugar') || messageLC.includes('gaming') || messageLC.includes('rendimiento')) {
      functionality = 'gaming_performance'
      confidence = 0.9
    } else if (messageLC.includes('almacenamiento') || messageLC.includes('memoria') || messageLC.includes('espacio') || messageLC.includes('capacidad')) {
      functionality = 'storage'
      confidence = 0.9
    } else if (messageLC.includes('resistente') || messageLC.includes('durable') || messageLC.includes('durabilidad') || messageLC.includes('robusto')) {
      functionality = 'durability'
      confidence = 0.9
    }

    console.log(`✅ [FUNCTIONAL] Producto Enhanced encontrado: ${lastProduct.name || lastProduct.nombre}, functionality: ${functionality}, confidence: ${confidence}`)
    
    return {
      type: 'functional_question',
      confidence,
      reasoning: `Pregunta sobre ${functionality} del producto Enhanced "${lastProduct.name || lastProduct.nombre}"`,
      action: 'explain_functionality',
      targetProduct: lastProduct,
      functionality,
      suggestedResponse: await this.generateFunctionalResponse(lastProduct, functionality)
    }
  }

  /**
   * ✅ RAZONAR SOBRE CONFIRMACIONES DE INTERÉS
   */
  async reasonAboutInterestConfirmation(userId, message, context) {
    console.log(`✅ [INTEREST REASONING] Analizando interés: "${message}"`)
    
    const lastProduct = context.lastProductShown
    if (!lastProduct) {
      return {
        type: 'interest_confirmation',
        confidence: 0.5,
        reasoning: 'Confirmación de interés sin producto específico',
        action: 'ask_product_preference'
      }
    }

    return {
      type: 'interest_confirmation',
      confidence: 0.9,
      reasoning: `Cliente confirma interés en "${lastProduct.name}"`,
      action: 'proceed_with_product',
      targetProduct: lastProduct,
      suggestedResponse: `¡Excelente elección! El ${lastProduct.name} es perfecto. ¿Te gustaría proceder con la compra?`
    }
  }

  /**
   * 🔍 RAZONAR SOBRE BÚSQUEDAS ESPECÍFICAS
   */
  async reasonAboutSpecificSearch(userId, message, context) {
    console.log(`🔍 [SEARCH REASONING] Analizando búsqueda: "${message}"`)
    
    return {
      type: 'specific_search',
      confidence: 0.9,
      reasoning: `Cliente busca producto específico: "${message}"`,
      action: 'search_products',
      searchTerms: this.extractSearchTerms(message)
    }
  }

  /**
   * 💬 RAZONAR SOBRE CONVERSACIÓN GENERAL
   */
  async reasonAboutGeneralConversation(userId, message, context) {
    console.log(`💬 [GENERAL REASONING] Analizando conversación: "${message}"`)
    
    return {
      type: 'general_conversation',
      confidence: 0.7,
      reasoning: 'Conversación general sin intención específica',
      action: 'conversational_response'
    }
  }

  /**
   * 📱 OBTENER ÚLTIMO PRODUCTO MOSTRADO
   * 🔄 Con prioridades mejoradas para contexto Enhanced
   */
  getLastProductShown(conversationData) {
    console.log(`🔍 [DEBUG] getLastProductShown - conversationData:`, {
      enhanced_context_active: conversationData.enhanced_context_active,
      displayed_products_length: conversationData.displayed_products?.length,
      displayed_products: conversationData.displayed_products?.map(p => p.name || p.nombre),
      enhanced_last_product: conversationData.enhanced_last_product
    })
    
    // 🚀 PRIORIDAD MÁXIMA: Enhanced Context activo con enhanced_last_product
    if (conversationData.enhanced_context_active && conversationData.enhanced_last_product) {
      console.log(`🚀 [ENHANCED CONTEXT] Producto activo: ${conversationData.enhanced_last_product}`)
      return {
        name: conversationData.enhanced_last_product,
        nombre: conversationData.enhanced_last_product,
        source: 'enhanced_context_active'
      }
    }
    
    // 🔥 PRIORIDAD 1: Enhanced context con productos mostrados
    if (conversationData.displayed_products && conversationData.displayed_products.length > 0) {
      const product = conversationData.displayed_products[conversationData.displayed_products.length - 1]
      console.log(`✅ [ENHANCED PRODUCTS] Último producto de displayed_products: ${product.name || product.nombre}`)
      return product
    }
    
    // 🔥 PRIORIDAD 2: enhanced_last_product como fallback directo
    if (conversationData.enhanced_last_product) {
      console.log(`🔄 [ENHANCED FALLBACK] Usando enhanced_last_product: ${conversationData.enhanced_last_product}`)
      return {
        name: conversationData.enhanced_last_product,
        nombre: conversationData.enhanced_last_product,
        source: 'enhanced_last_product_fallback'
      }
    }
    
    // ⚠️ ANTI-FALLBACK: Evitar sistema original si no hay contexto Enhanced válido
    console.log(`❌ [NO ENHANCED CONTEXT] Sin contexto Enhanced válido - evitando fallback VIP`)
    return null
  }

  /**
   * 🎭 GENERAR RESPUESTA CONTEXTUAL - USANDO RAZONAMIENTO INTELIGENTE
   */
  async generateContextualResponse(product, intention, originalMessage) {
    const productName = product.name || product.nombre || 'el producto'
    let productDescription = product.descripcion || product.description || ''
    const productPrice = product.price || product.precio || 'consultar'
    
    // 💾 Si no hay descripción completa, obtenerla desde Supabase
    if (!productDescription && product.id && this.original?.inventory?.getProductById) {
      try {
        const fullProduct = await this.original.inventory.getProductById(product.id)
        productDescription = fullProduct?.descripcion || fullProduct?.description || ''
        console.log(`💾 Descripción obtenida desde Supabase para ${productName}:`, productDescription.substring(0, 100))
      } catch (error) {
        console.log(`⚠️ Error obteniendo descripción completa: ${error.message}`)
      }
    }
    
    // 🚀 PRIORIDAD MÁXIMA: PURCHASE_INTENT usa respuesta directa SIN Gemini
    if (intention === 'purchase_intent') {
      console.log(`🛒 PURCHASE_INTENT detectado - usando respuesta directa sin Gemini para evitar re-clasificación`)
      // Ir directamente al switch case sin llamar a Gemini
    } 
    // 🧠 USAR RAZONAMIENTO INTELIGENTE si está disponible (para intenciones NO de compra)
    else if (this.original?.conversationData?.reasoning) {
      const { personalityInstructions, semanticContext, adaptedPersonality } = this.original.conversationData.reasoning
      console.log(`🧠 APLICANDO RAZONAMIENTO CONTEXTUAL ENHANCED para respuesta sobre ${productName}`)
      
      // Generar respuesta inteligente usando el sistema de razonamiento
      const contextualPrompt = `🧠 RESPUESTA CONTEXTUAL INTELIGENTE:
- Producto: ${productName} (S/ ${productPrice})
- Pregunta específica: "${originalMessage}"
- Intención detectada: ${intention}
- Personalidad del cliente: ${adaptedPersonality.basePersonality || 'default'}
- Tono recomendado: ${personalityInstructions.tone || 'friendly'}
- Estilo: ${personalityInstructions.style || 'conversational'}
- Descripción real: ${productDescription || 'Información técnica disponible'}

INSTRUCCIONES:
- Responde de manera ${personalityInstructions.tone || 'friendly'} y ${personalityInstructions.style || 'conversational'}
- Proporciona información específica sobre el producto según la intención del cliente
- Demuestra comprensión de la pregunta específica
- Usa la descripción real del producto, NO texto genérico
- Manten una conversación natural y útil`
      
      // Si hay sistema Gemini disponible, usarlo para generar respuesta inteligente
      if (this.original?.gemini?.generateSalesResponse) {
        try {
          const intelligentResponse = await this.original.gemini.generateSalesResponse(
            contextualPrompt,
            this.original.customerName || 'Cliente',
            [product],
            'interested',
            [],
            this.original.inventory
          )
          return intelligentResponse
        } catch (error) {
          console.log(`⚠️ Error generando respuesta inteligente: ${error.message}`)
        }
      }
    }
    
    // 🚫 FALLBACK MEJORADO: Si no hay razonamiento, usar descripción real (NO genérica)
    if (!productDescription) {
      productDescription = `Información técnica disponible. Contáctanos para detalles específicos sobre ${productName}.`
    }
    
    const baseResponse = `🎯 **${productName}** - S/ ${productPrice}\n\n${productDescription}\n\n`
    
    switch (intention) {
      case 'purchase_intent':
        return `🎉 ¡Excelente elección! El **${productName}** es perfecto para ti.\n\n${baseResponse}💳 Para proceder con la compra:\n• ¿Cuántas unidades te gustaría?\n• Aceptamos pagos por Yape\n\n¿Empezamos? 😊`
      
      case 'camera_question':
        return `📸 Sobre las capacidades fotográficas del **${productName}**:\n\n${baseResponse}✨ Perfecto para personas que disfrutan la fotografía. ¿Te interesa este producto? 😊`
      
      case 'portability_question':
        return `🌍 Sobre la portabilidad del **${productName}**:\n\n${baseResponse}🎒 Ideal para uso móvil y viajes. ¿Te gustaría más información? 😊`
      
      case 'functionality_question':
        return `🎁 Sobre el **${productName}** como opción:\n\n${baseResponse}💝 Una excelente alternativa. ¿Te interesa proceder? 😊`
      
      case 'price_question':
        return `💰 **${productName}** - S/ ${productPrice}\n\n${baseResponse}💎 ¿Te interesa conocer más detalles? 😊`
      
      default:
        return `${baseResponse}😊 ¿Hay algo específico que te gustaría saber sobre este producto?`
    }
  }

  /**
   * 🔧 GENERAR RESPUESTA FUNCIONAL - USANDO RAZONAMIENTO INTELIGENTE
   */
  async generateFunctionalResponse(product, functionality) {
    const productName = product.name || product.nombre || 'el producto'
    let productDescription = product.descripcion || product.description || ''
    const productPrice = product.price || product.precio || 'consultar'
    
    // 💾 Si no hay descripción completa, obtenerla desde Supabase
    if (!productDescription && product.id && this.original?.inventory?.getProductById) {
      try {
        const fullProduct = await this.original.inventory.getProductById(product.id)
        productDescription = fullProduct?.descripcion || fullProduct?.description || ''
        console.log(`💾 Descripción obtenida desde Supabase para ${productName}:`, productDescription.substring(0, 100))
      } catch (error) {
        console.log(`⚠️ Error obteniendo descripción completa: ${error.message}`)
      }
    }
    
    // 🧠 USAR RAZONAMIENTO INTELIGENTE si está disponible
    if (this.original?.conversationData?.reasoning) {
      const { personalityInstructions, semanticContext, adaptedPersonality } = this.original.conversationData.reasoning
      console.log(`🧠 APLICANDO RAZONAMIENTO FUNCIONAL ENHANCED para ${functionality} de ${productName}`)
      
      // Generar respuesta inteligente usando el sistema de razonamiento
      const functionalPrompt = `🧠 RESPUESTA FUNCIONAL INTELIGENTE:
- Producto: ${productName} (S/ ${productPrice})
- Funcionalidad consultada: ${functionality}
- Personalidad del cliente: ${adaptedPersonality.basePersonality || 'default'}
- Tono recomendado: ${personalityInstructions.tone || 'friendly'}
- Estilo: ${personalityInstructions.style || 'conversational'}
- Descripción real: ${productDescription || 'Información técnica disponible'}

INSTRUCCIONES:
- Responde de manera ${personalityInstructions.tone || 'friendly'} y ${personalityInstructions.style || 'conversational'}
- Enfocate específicamente en la funcionalidad: ${functionality}
- Proporciona información detallada y útil sobre esta característica
- Usa la descripción real del producto para dar contexto
- Manten una conversación natural y ayuda al cliente a entender esta funcionalidad`
      
      // Si hay sistema Gemini disponible, usarlo para generar respuesta inteligente
      if (this.original?.gemini?.generateSalesResponse) {
        try {
          const intelligentResponse = await this.original.gemini.generateSalesResponse(
            functionalPrompt,
            this.original.customerName || 'Cliente',
            [product],
            'interested',
            [],
            this.original.inventory
          )
          return intelligentResponse
        } catch (error) {
          console.log(`⚠️ Error generando respuesta funcional inteligente: ${error.message}`)
        }
      }
    }
    
    // 🚫 FALLBACK MEJORADO: Si no hay razonamiento, usar descripción real (NO genérica)
    if (!productDescription) {
      productDescription = `Información técnica disponible. Contáctanos para detalles específicos sobre ${productName}.`
    }
    
    // 🚫 NO HARDCODEAR - Usar descripción REAL del producto
    const baseResponse = `🎯 **${productName}** - S/ ${productPrice}\n\n${productDescription}\n\n`
    
    switch (functionality) {
      case 'water_resistance':
        return `💧 Sobre la resistencia al agua del **${productName}**:\n\n${baseResponse}✨ ¿Te interesa este producto? 😊`
      
      case 'video_recording':
      case 'camera_quality':
        return `📸 Sobre las capacidades de cámara del **${productName}**:\n\n${baseResponse}🎥 ¿Te gustaría más información? 😊`
      
      case 'portability':
        return `🌍 Sobre la portabilidad del **${productName}**:\n\n${baseResponse}🎒 ¿Te interesa para viajes? 😊`
      
      case 'battery_life':
        return `🔋 Sobre la batería del **${productName}**:\n\n${baseResponse}⚡ ¿Te gustaría conocer más? 😊`
        
      case 'gaming_performance':
        return `🎮 Sobre el rendimiento del **${productName}**:\n\n${baseResponse}🚀 ¿Te interesa para juegos? 😊`
        
      case 'storage':
        return `💾 Sobre el almacenamiento del **${productName}**:\n\n${baseResponse}📱 ¿Te gustaría más detalles? 😊`
        
      case 'durability':
        return `💪 Sobre la durabilidad del **${productName}**:\n\n${baseResponse}🛡️ ¿Te interesa este producto resistente? 😊`
      
      default:
        return `${baseResponse}😊 ¿Hay algo específico que te gustaría saber?`
    }
  }

  /**
   * ✅ GENERAR RESPUESTA DE CONFIRMACIÓN CONTEXTUAL
   */
  generateConfirmationResponse(message, intention, product, lastQuestion) {
    const messageLC = message.toLowerCase().trim()
    const productName = product?.name || product?.nombre || 'el producto'
    const isPositive = messageLC === 'si' || messageLC === 'sí' || messageLC === 'ok' || messageLC === 'dale' || messageLC === 'perfecto'
    
    switch (intention) {
      case 'purchase_confirmation':
        if (isPositive) {
          return `🎉 ¡Excelente ${productName ? 'elección' : 'decisión'}! Me alegra que quieras el **${productName}**. 

💳 Para proceder con la compra, necesito algunos datos:
• Nombre completo
• Dirección de entrega
• Número de teléfono

¿Empezamos? 😊`
        } else {
          return `😊 Está bien, no hay presión. ¿Hay algo específico que te gustaría saber sobre el **${productName}** antes de decidir? O si prefieres, puedo mostrarte otras opciones similares. 📱✨`
        }
      
      case 'information_request_confirmation':
        if (isPositive) {
          return `📝 ¡Perfecto! Te daré toda la información detallada sobre el **${productName}**:

🔍 **Especificaciones técnicas completas**
📷 **Características de cámara avanzadas** 
🔋 **Duración de batería y rendimiento**
🌐 **Conectividad y funcionalidades**

¿Hay algo específico que más te interese? 🤔`
        } else {
          return `😊 Entiendo, quizás ya tienes suficiente información. ¿Te gustaría ver el precio final del **${productName}** o prefieres que te muestre otras opciones? 💰✨`
        }
      
      case 'interest_confirmation':
        if (isPositive) {
          return `😍 ¡Me alegra que te guste el **${productName}**! Es una excelente opción. 

🎯 ¿Qué te gustaría hacer ahora?
🔸 Ver precio y opciones de compra
🔸 Conocer más características
🔸 Comparar con otros modelos

¿Cuál prefieres? 😊`
        } else {
          return `😊 No te preocupes, hay muchas opciones. ¿Qué tipo de producto te gustaría ver? Puedo ayudarte a encontrar algo que se ajuste mejor a lo que buscas. 🔍✨`
        }
      
      default:
        if (isPositive) {
          return `😊 ¡Perfecto! ¿En qué más puedo ayudarte? Tengo excelentes productos disponibles. 😊`
        } else {
          return `😊 Entiendo. ¿Hay algo más en lo que pueda ayudarte hoy? Estoy aquí para lo que necesites. 😊`
        }
    }
  }

  /**
   * 🔍 EXTRAER TÉRMINOS DE BÚSQUEDA
   */
  extractSearchTerms(message) {
    const cleanMessage = message.toLowerCase()
      .replace(/busco|quiero|necesito|dame|información|sobre/g, '')
      .trim()
    
    return cleanMessage.split(' ').filter(term => term.length > 2)
  }

  /**
   * 👤 CREAR PATRÓN DE USUARIO
   */
  createUserPattern(userId) {
    return {
      userId,
      preferenceHistory: [],
      communicationStyle: 'neutral',
      responseTime: 'normal',
      interests: [],
      lastInteraction: Date.now()
    }
  }

  /**
   * 📱 EXTRAER PRODUCTOS RECIENTES
   */
  extractRecentProducts(messages, conversationData) {
    const products = []
    
    // De Enhanced context
    if (conversationData.displayed_products) {
      products.push(...conversationData.displayed_products)
    }
    
    // De mensajes recientes (extraer nombres de productos mencionados)
    messages.forEach(msg => {
      if (msg.content && typeof msg.content === 'string') {
        if (msg.content.includes('iPhone')) {
          const iphone = msg.content.match(/iPhone\s+\d+/i)
          if (iphone) {
            products.push({ name: iphone[0], source: 'message_extraction' })
          }
        }
      }
    })
    
    return products
  }

  /**
   * 🎬 OBTENER ÚLTIMA ACCIÓN DEL USUARIO
   */
  getLastUserAction(messages) {
    if (messages.length === 0) return null
    
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.sender === 'user') {
      return {
        message: lastMessage.content,
        timestamp: lastMessage.timestamp,
        type: this.detectReasoningType(lastMessage.content)
      }
    }
    
    return null
  }
}

export default HumanReasoningEngine