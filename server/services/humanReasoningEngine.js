/**
 * 🧠 HUMAN REASONING ENGINE 
 * Sistema de razonamiento contextual humano para el agente empresarial
 * 
 * PROPÓSITO: Hacer que el agente piense y razone como un consultor humano
 * - Entender referencias implícitas ("eso", "el tema que mencionaste")
 * - Mantener contexto conversacional natural sobre temas empresariales
 * - Razonar sobre las intenciones del cliente empresarial
 * - Responder de forma natural y especializada
 */

const logger = require('./logger')

class HumanReasoningEngine {
  constructor(geminiService, conversationMemory) {
    this.gemini = geminiService
    this.memory = conversationMemory
    this.contextWindow = 5 // Últimos 5 mensajes para contexto
    this.reasoningCache = new Map() // Cache de razonamientos recientes
    this.conversationPatterns = new Map() // Patrones de conversación por usuario
    
    // Patrones de razonamiento específicos para temas empresariales
    this.businessReasoningPatterns = this.initializeBusinessPatterns()
    
    logger.info('🧠 Human Reasoning Engine inicializado para consultoría empresarial')
  }

  /**
   * 🏢 Inicializar patrones de razonamiento empresarial
   */
  initializeBusinessPatterns() {
    return {
      // Referencias contextuales empresariales
      contextualReferences: [
        'esa estrategia', 'ese método', 'esa estructura', 'eso que mencionaste',
        'el tema anterior', 'lo que dijiste', 'esa opción', 'ese enfoque',
        'la estrategia', 'el método', 'la estructura', 'esa consulta'
      ],
      
      // Preguntas funcionales sobre temas empresariales
      functionalQuestions: {
        'legalidad': ['es legal', 'está permitido', 'puedo hacer', 'es válido'],
        'implementacion': ['cómo implemento', 'cómo aplico', 'pasos para', 'proceso'],
        'riesgos': ['qué riesgos', 'peligros', 'consecuencias', 'problemas'],
        'costos': ['cuánto cuesta', 'precio', 'inversión', 'gastos'],
        'tiempo': ['cuánto tiempo', 'duración', 'plazos', 'cuándo'],
        'beneficios': ['qué beneficios', 'ventajas', 'ganancias', 'mejoras']
      },
      
      // Confirmaciones de interés empresarial
      interestConfirmations: [
        'me interesa', 'quiero saber más', 'explícame mejor', 'profundiza',
        'si funciona', 'perfecto', 'entendido', 'adelante'
      ],
      
      // Búsquedas específicas empresariales
      specificSearches: [
        'busco', 'necesito', 'quiero', 'consulta sobre', 'información de',
        'asesoría en', 'ayuda con', 'estrategia para'
      ]
    }
  }

  /**
   * 🎯 RAZONAMIENTO PRINCIPAL - Analizar mensaje con lógica empresarial
   */
  async reasonAboutMessage(clientPhone, currentMessage, conversationHistory = []) {
    try {
      logger.info(`🧠 [REASONING] Analizando consulta empresarial: "${currentMessage}" de ${clientPhone}`)
      
      // 1. Obtener contexto conversacional reciente
      const recentContext = await this.getRecentBusinessContext(clientPhone, conversationHistory)
      
      // 2. Detectar tipo de razonamiento necesario
      const reasoningType = this.detectBusinessReasoningType(currentMessage)
      
      // 3. Aplicar razonamiento específico empresarial
      const reasoning = await this.applyBusinessReasoning(clientPhone, currentMessage, recentContext, reasoningType)
      
      return reasoning
      
    } catch (error) {
      logger.error('❌ Error en razonamiento empresarial:', error)
      return {
        type: 'error',
        confidence: 0,
        reasoning: 'No pude razonar sobre esta consulta empresarial',
        action: 'fallback'
      }
    }
  }

  /**
   * 📝 OBTENER CONTEXTO EMPRESARIAL RECIENTE
   */
  async getRecentBusinessContext(clientPhone, conversationHistory) {
    try {
      // Obtener últimos mensajes del historial
      const recentMessages = conversationHistory.slice(-this.contextWindow)
      
      // Obtener datos de conversación de memoria
      let conversationData = {}
      if (this.memory) {
        conversationData = this.memory.getConversationContext(clientPhone) || {}
      }
      
      // Analizar temas empresariales mencionados recientemente
      const recentBusinessTopics = this.extractBusinessTopics(recentMessages, conversationData)
      
      // Analizar patrones de comportamiento del cliente empresarial
      const clientPattern = this.conversationPatterns.get(clientPhone) || this.createBusinessClientPattern(clientPhone)
      
      return {
        recentMessages,
        recentBusinessTopics,
        clientPattern,
        conversationData,
        lastBusinessTopic: this.getLastBusinessTopic(conversationData),
        lastUserAction: this.getLastUserAction(recentMessages),
        contextSource: 'conversation_memory'
      }
      
    } catch (error) {
      logger.error('❌ Error obteniendo contexto empresarial:', error)
      return {
        recentMessages: [],
        recentBusinessTopics: [],
        clientPattern: this.createBusinessClientPattern(clientPhone),
        conversationData: {},
        lastBusinessTopic: null,
        lastUserAction: null,
        contextSource: 'error_fallback'
      }
    }
  }

  /**
   * 🎯 DETECTAR TIPO DE RAZONAMIENTO EMPRESARIAL
   */
  detectBusinessReasoningType(message) {
    const messageLC = message.toLowerCase().trim()
    
    // 🔥 PRIORIDAD MÁXIMA: Detección de confirmaciones cortas
    const shortConfirmations = [
      'si', 'sí', 'yes', 'ok', 'dale', 'perfecto', 'excelente', 
      'entendido', 'claro', 'no', 'nope', 'tal vez', 'quizás'
    ]
    
    if (shortConfirmations.includes(messageLC)) {
      return 'contextual_confirmation'
    }
    
    // Detección de referencias contextuales empresariales
    if (this.businessReasoningPatterns.contextualReferences.some(ref => messageLC.includes(ref))) {
      return 'contextual_reference'
    }
    
    // Detección de preguntas funcionales empresariales
    for (const [category, phrases] of Object.entries(this.businessReasoningPatterns.functionalQuestions)) {
      if (phrases.some(phrase => messageLC.includes(phrase))) {
        return 'functional_question'
      }
    }
    
    // Detección de confirmaciones de interés
    if (this.businessReasoningPatterns.interestConfirmations.some(phrase => messageLC.includes(phrase))) {
      return 'interest_confirmation'
    }
    
    // Detección de búsquedas específicas
    if (this.businessReasoningPatterns.specificSearches.some(phrase => messageLC.includes(phrase))) {
      return 'specific_search'
    }
    
    return 'general_business_conversation'
  }

  /**
   * 🧠 APLICAR RAZONAMIENTO EMPRESARIAL ESPECÍFICO
   */
  async applyBusinessReasoning(clientPhone, message, context, reasoningType) {
    switch (reasoningType) {
      case 'contextual_confirmation':
        return await this.reasonAboutBusinessConfirmation(clientPhone, message, context)
      
      case 'contextual_reference':
        return await this.reasonAboutBusinessReference(clientPhone, message, context)
      
      case 'functional_question':
        return await this.reasonAboutBusinessQuestion(clientPhone, message, context)
      
      case 'interest_confirmation':
        return await this.reasonAboutBusinessInterest(clientPhone, message, context)
      
      case 'specific_search':
        return await this.reasonAboutBusinessSearch(clientPhone, message, context)
      
      default:
        return await this.reasonAboutGeneralBusinessConversation(clientPhone, message, context)
    }
  }

  /**
   * ✅ RAZONAR SOBRE CONFIRMACIONES EMPRESARIALES
   */
  async reasonAboutBusinessConfirmation(clientPhone, message, context) {
    logger.info(`✅ [BUSINESS CONFIRMATION] Analizando confirmación: "${message}"`)
    
    const messageLC = message.toLowerCase().trim()
    const lastBusinessTopic = context.lastBusinessTopic
    const recentMessages = context.recentMessages || []
    
    // Buscar la última pregunta o tema del consultor
    let lastConsultantQuestion = null
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i]
      if (msg.role === 'assistant' && msg.message && msg.message.includes('?')) {
        lastConsultantQuestion = msg.message
        break
      }
    }
    
    let intention = 'general_confirmation'
    let confidence = 0.7
    let suggestedAction = 'continue_conversation'
    
    if (lastConsultantQuestion) {
      const questionLC = lastConsultantQuestion.toLowerCase()
      
      // Análisis de tipo de confirmación empresarial
      if (questionLC.includes('implementar') || questionLC.includes('aplicar')) {
        intention = 'implementation_confirmation'
        confidence = 0.9
      } else if (questionLC.includes('legal') || questionLC.includes('permitido')) {
        intention = 'legal_confirmation'
        confidence = 0.9
      } else if (questionLC.includes('riesgo') || questionLC.includes('problema')) {
        intention = 'risk_acknowledgment'
        confidence = 0.85
      }
    }
    
    // Determinar respuesta
    const isPositive = ['si', 'sí', 'yes', 'dale', 'perfecto', 'ok'].includes(messageLC)
    
    return {
      type: 'contextual_confirmation',
      confidence,
      reasoning: `Cliente confirma "${message}" sobre tema empresarial: ${lastBusinessTopic?.topic || 'consulta previa'}`,
      action: suggestedAction,
      targetTopic: lastBusinessTopic,
      intention,
      lastConsultantQuestion,
      isPositive,
      suggestedResponse: await this.generateBusinessConfirmationResponse(message, intention, lastBusinessTopic, isPositive)
    }
  }

  /**
   * 🎯 RAZONAR SOBRE REFERENCIAS CONTEXTUALES EMPRESARIALES
   */
  async reasonAboutBusinessReference(clientPhone, message, context) {
    logger.info(`🎯 [BUSINESS REFERENCE] Analizando referencia: "${message}"`)
    
    const lastTopic = context.lastBusinessTopic
    
    if (!lastTopic) {
      return {
        type: 'contextual_reference',
        confidence: 0.2,
        reasoning: `Cliente se refiere a algo pero no hay contexto empresarial claro`,
        action: 'ask_clarification',
        suggestedResponse: 'Disculpa, ¿podrías ser más específico sobre qué tema empresarial te refieres?'
      }
    }
    
    // Detectar intención específica sobre el tema empresarial
    const messageLC = message.toLowerCase()
    let intention = 'general_reference'
    
    if (messageLC.includes('implement') || messageLC.includes('aplic') || messageLC.includes('hag')) {
      intention = 'implementation_question'
    } else if (messageLC.includes('legal') || messageLC.includes('permit')) {
      intention = 'legality_question'
    } else if (messageLC.includes('riesg') || messageLC.includes('problem')) {
      intention = 'risk_question'
    } else if (messageLC.includes('cost') || messageLC.includes('preci') || messageLC.includes('cuant')) {
      intention = 'cost_question'
    }
    
    return {
      type: 'contextual_reference',
      confidence: 0.9,
      reasoning: `Cliente se refiere a "${lastTopic.topic}" con intención: ${intention}`,
      targetTopic: lastTopic,
      intention,
      suggestedResponse: await this.generateBusinessContextualResponse(lastTopic, intention, message)
    }
  }

  /**
   * 🔧 RAZONAR SOBRE PREGUNTAS FUNCIONALES EMPRESARIALES
   */
  async reasonAboutBusinessQuestion(clientPhone, message, context) {
    logger.info(`🔧 [BUSINESS QUESTION] Analizando pregunta funcional: "${message}"`)
    
    const messageLC = message.toLowerCase()
    let questionCategory = 'general'
    let confidence = 0.8
    
    // Categorizar la pregunta empresarial
    for (const [category, phrases] of Object.entries(this.businessReasoningPatterns.functionalQuestions)) {
      if (phrases.some(phrase => messageLC.includes(phrase))) {
        questionCategory = category
        confidence = 0.9
        break
      }
    }
    
    return {
      type: 'functional_question',
      confidence,
      reasoning: `Cliente hace pregunta funcional de categoría: ${questionCategory}`,
      questionCategory,
      suggestedResponse: await this.generateBusinessFunctionalResponse(questionCategory, message, context)
    }
  }

  /**
   * 💼 GENERAR RESPUESTA DE CONFIRMACIÓN EMPRESARIAL
   */
  async generateBusinessConfirmationResponse(message, intention, lastTopic, isPositive) {
    if (!lastTopic) {
      return isPositive ? 
        'Perfecto. ¿En qué tema empresarial específico puedo profundizar?' :
        'Entiendo. ¿Hay algún otro aspecto empresarial que te interese explorar?'
    }
    
    const topicName = lastTopic.topic || 'tema empresarial'
    
    switch (intention) {
      case 'implementation_confirmation':
        return isPositive ? 
          `Excelente. Te guiaré paso a paso en la implementación de ${topicName}. Empecemos con los aspectos legales fundamentales...` :
          `Entiendo tus reservas sobre ${topicName}. Analicemos primero los riesgos y alternativas...`
      
      case 'legal_confirmation':
        return isPositive ?
          `Perfecto. ${topicName} tiene aspectos legales específicos que debemos considerar cuidadosamente...` :
          `Comprendo tu preocupación legal sobre ${topicName}. Exploremos opciones más seguras...`
      
      case 'risk_acknowledgment':
        return isPositive ?
          `Bien que reconozcas los riesgos de ${topicName}. Esto muestra un enfoque empresarial maduro. Ahora veamos cómo mitigarlos...` :
          `Entiendo. Los riesgos de ${topicName} pueden ser significativos. Analicemos alternativas más conservadoras...`
      
      default:
        return isPositive ?
          `Excelente. Continuemos profundizando en ${topicName} desde una perspectiva estratégica...` :
          `Entiendo. ¿Hay algún aspecto específico de ${topicName} que te genere dudas?`
    }
  }

  /**
   * 🎯 GENERAR RESPUESTA CONTEXTUAL EMPRESARIAL
   */
  async generateBusinessContextualResponse(lastTopic, intention, originalMessage) {
    const topicName = lastTopic.topic || 'tema empresarial'
    
    switch (intention) {
      case 'implementation_question':
        return `🔧 Para implementar ${topicName}, necesitamos considerar estos pasos estratégicos:
        
1️⃣ **Análisis legal previo** - Verificar normativa aplicable
2️⃣ **Estructuración adecuada** - Diseñar la implementación óptima
3️⃣ **Timeline de ejecución** - Planificar fases y plazos
4️⃣ **Gestión de riesgos** - Identificar y mitigar riesgos

¿En cuál de estos aspectos quieres que profundice primero?`
      
      case 'legality_question':
        return `⚖️ Desde el punto de vista legal, ${topicName} debe analizarse considerando:

📋 **Marco normativo aplicable**
🏛️ **Jurisdicciones relevantes** 
📝 **Documentación necesaria**
⚠️ **Riesgos legales específicos**

¿Necesitas que analice algún aspecto legal específico de ${topicName}?`
      
      case 'risk_question':
        return `⚠️ Los riesgos principales de ${topicName} incluyen:

🚨 **Riesgos legales** - Posibles infracciones normativas
💰 **Riesgos financieros** - Impacto económico negativo
🕐 **Riesgos operacionales** - Problemas de implementación
📊 **Riesgos reputacionales** - Afectación de imagen empresarial

¿Quieres que desarrolle algún tipo de riesgo específico?`
      
      case 'cost_question':
        return `💰 El análisis de costos de ${topicName} debe considerar:

💵 **Inversión inicial** - Capital requerido
📈 **Costos operativos** - Gastos recurrentes
⚖️ **Costos de compliance** - Cumplimiento normativo
🛡️ **Costos de mitigación** - Gestión de riesgos

¿Necesitas un análisis detallado de algún tipo de costo específico?`
      
      default:
        return `📋 Sobre ${topicName}, puedo ayudarte con análisis detallado de:

🎯 **Estrategias de implementación**
⚖️ **Aspectos legales y normativos**
💰 **Análisis costo-beneficio**
🛡️ **Gestión de riesgos**
🏗️ **Estructuración óptima**

¿Qué aspecto específico te interesa más?`
    }
  }

  /**
   * 🏢 EXTRAER TEMAS EMPRESARIALES DE MENSAJES
   */
  extractBusinessTopics(messages, conversationData) {
    const topics = []
    
    // Extraer de contexto de conversación
    if (conversationData.context && conversationData.context.currentTopic) {
      topics.push({
        topic: conversationData.context.currentTopic,
        source: 'conversation_context',
        timestamp: Date.now()
      })
    }
    
    // Extraer de mensajes recientes
    messages.forEach(msg => {
      if (msg.content && typeof msg.content === 'string') {
        const content = msg.content.toLowerCase()
        
        // Detectar temas empresariales comunes
        const businessTopics = [
          'evasión fiscal', 'optimización tributaria', 'paraíso fiscal',
          'offshore', 'holding', 'trust', 'fundación',
          'criptomonedas', 'lavado de dinero', 'compliance',
          'estructuración', 'planificación fiscal'
        ]
        
        businessTopics.forEach(topic => {
          if (content.includes(topic)) {
            topics.push({
              topic: topic,
              source: 'message_extraction',
              timestamp: msg.timestamp || Date.now()
            })
          }
        })
      }
    })
    
    return topics
  }

  /**
   * 📊 CREAR PATRÓN DE CLIENTE EMPRESARIAL
   */
  createBusinessClientPattern(clientPhone) {
    return {
      clientPhone,
      businessProfile: 'unknown',
      preferredTopics: [],
      consultationStyle: 'formal',
      riskTolerance: 'medium',
      responsePreference: 'detailed',
      lastInteraction: Date.now()
    }
  }

  /**
   * 📱 OBTENER ÚLTIMO TEMA EMPRESARIAL
   */
  getLastBusinessTopic(conversationData) {
    if (conversationData.context && conversationData.context.currentTopic) {
      return {
        topic: conversationData.context.currentTopic,
        timestamp: Date.now()
      }
    }
    return null
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
        type: this.detectBusinessReasoningType(lastMessage.content)
      }
    }
    
    return null
  }

  // Métodos adicionales para completar la implementación
  async reasonAboutBusinessInterest(clientPhone, message, context) {
    return {
      type: 'interest_confirmation',
      confidence: 0.9,
      reasoning: `Cliente muestra interés en tema empresarial`,
      action: 'provide_detailed_information'
    }
  }

  async reasonAboutBusinessSearch(clientPhone, message, context) {
    return {
      type: 'specific_search',
      confidence: 0.9,
      reasoning: `Cliente busca información empresarial específica`,
      action: 'search_and_provide_info',
      searchTerms: this.extractSearchTerms(message)
    }
  }

  async reasonAboutGeneralBusinessConversation(clientPhone, message, context) {
    return {
      type: 'general_business_conversation',
      confidence: 0.7,
      reasoning: 'Conversación empresarial general',
      action: 'conversational_response'
    }
  }

  async generateBusinessFunctionalResponse(questionCategory, message, context) {
    return `Como consultor empresarial especializado, analicemos el aspecto de ${questionCategory} que consultas...`
  }

  extractSearchTerms(message) {
    const terms = message.toLowerCase()
      .replace(/[^a-záéíóúñ\s]/g, '')
      .split(' ')
      .filter(word => word.length > 3)
    return terms
  }
}

module.exports = HumanReasoningEngine