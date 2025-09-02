const logger = require('./logger')

class ConversationMemory {
  constructor() {
    this.conversations = new Map() // clientPhone -> conversation data
    this.maxActiveMemory = 20 // Últimas 20 interacciones activas en memoria
    this.contextWindow = 8 // Últimos 8 mensajes para contexto inmediato
    this.compressionThreshold = 50 // Comprimir después de 50 mensajes
    
    // 🧠 NUEVAS CAPACIDADES SEMÁNTICAS
    this.semanticPatterns = new Map() // Patrones semánticos por cliente
    this.intentHistory = new Map() // Historial de intenciones por cliente
    this.conversationPersonalities = new Map() // Personalidades adaptadas por cliente
    
    logger.info('🧠 Enhanced Conversation Memory inicializada con capacidades semánticas')
  }

  // 🧠 AGREGAR MENSAJE CON ANÁLISIS SEMÁNTICO MEJORADO
  addMessage(clientPhone, userMessage, botResponse, intent = 'business_query', semanticData = {}) {
    if (!this.conversations.has(clientPhone)) {
      this.conversations.set(clientPhone, {
        messages: [],
        context: {
          currentTopic: null,
          interests: [],
          stage: 'initial', // initial, exploring, planning, implementing
          lastIntent: null,
          clientProfile: {}
        },
        summary: '',
        createdAt: new Date(),
        lastActivity: new Date()
      })
    }

    const conversation = this.conversations.get(clientPhone)
    
    // 🧠 AGREGAR MENSAJE CON DATOS SEMÁNTICOS ENRIQUECIDOS
    const messageData = {
      timestamp: new Date(),
      userMessage,
      botResponse,
      intent,
      id: Date.now(),
      // Nuevos campos semánticos
      semanticVector: semanticData.semanticVector || this.generateSemanticVector(userMessage),
      emotionalTone: semanticData.emotionalTone || this.analyzeEmotionalTone(userMessage),
      complexity: semanticData.complexity || this.analyzeComplexity(userMessage),
      businessCategories: semanticData.businessCategories || this.extractBusinessCategories(userMessage),
      confidenceLevel: semanticData.confidenceLevel || this.estimateConfidenceLevel(userMessage)
    }
    
    conversation.messages.push(messageData)

    // Gestión inteligente de memoria - NUNCA eliminar, solo comprimir
    if (conversation.messages.length > this.compressionThreshold) {
      this.compressOldMessages(clientPhone)
    }

    // 🧠 ACTUALIZAR CONTEXTO CON ANÁLISIS SEMÁNTICO
    this.updateEnhancedContext(clientPhone, userMessage, intent, messageData)
    
    // 📊 ACTUALIZAR PATRONES SEMÁNTICOS
    this.updateSemanticPatterns(clientPhone, messageData)
    
    conversation.lastActivity = new Date()
    
    logger.info(`💾 Enhanced memory updated for ${clientPhone}`, {
      messageCount: conversation.messages.length,
      intent: intent,
      businessCategories: messageData.businessCategories
    })
  }

  // 🧠 ACTUALIZAR CONTEXTO MEJORADO CON SEMÁNTICA
  updateEnhancedContext(clientPhone, userMessage, intent, messageData) {
    const conversation = this.conversations.get(clientPhone)
    if (!conversation) return

    const context = conversation.context

    // Detectar temas de interés con análisis semántico mejorado
    const topics = this.extractEnhancedTopics(userMessage, messageData)
    topics.forEach(topic => {
      if (!context.interests.includes(topic.name)) {
        context.interests.push(topic.name)
      }
    })

    // Actualizar tema actual con confianza
    if (topics.length > 0) {
      const highestConfidenceTopic = topics.reduce((prev, current) => 
        (prev.confidence > current.confidence) ? prev : current
      )
      context.currentTopic = highestConfidenceTopic.name
      context.topicConfidence = highestConfidenceTopic.confidence
    }

    // Actualizar etapa de conversación con análisis semántico
    context.stage = this.determineEnhancedConversationStage(conversation.messages, intent, messageData)
    context.lastIntent = intent
    
    // 📋 NUEVOS CAMPOS DE CONTEXTO SEMÁNTICO
    context.emotionalProgression = this.analyzeEmotionalProgression(conversation.messages)
    context.complexityTrend = this.analyzeComplexityTrend(conversation.messages)
    context.consultationStyle = this.determineConsultationStyle(conversation.messages)
    context.clientSophistication = this.estimateClientSophistication(conversation.messages)

    logger.info(`🧠 Enhanced context updated`, {
      topic: context.currentTopic,
      stage: context.stage,
      sophistication: context.clientSophistication
    })
  }

  // 📊 EXTRAER TEMAS MEJORADOS CON ANÁLISIS SEMÁNTICO
  extractEnhancedTopics(message, messageData) {
    const topics = []
    const lowerMessage = message.toLowerCase()

    // Temas empresariales expandidos con niveles de confianza
    const topicKeywords = {
      'holding': {
        keywords: ['holding', 'holdings', 'estructura empresarial', 'empresa holding'],
        weight: 1.0
      },
      'fiscal': {
        keywords: ['fiscal', 'tributario', 'impuestos', 'tax', 'tributación', 'evasion'],
        weight: 1.0
      },
      'optimizacion_fiscal': {
        keywords: ['optimización fiscal', 'planificación tributaria', 'ahorro impuestos'],
        weight: 0.9
      },
      'offshore': {
        keywords: ['offshore', 'paraíso fiscal', 'extranjero', 'jurisdicción'],
        weight: 0.9
      },
      'criptomonedas': {
        keywords: ['crypto', 'bitcoin', 'blockchain', 'criptomoneda', 'defi'],
        weight: 0.8
      },
      'lavado_dinero': {
        keywords: ['lavado', 'blanqueo', 'money laundering', 'uif'],
        weight: 1.0
      },
      'compliance': {
        keywords: ['compliance', 'cumplimiento', 'normativo', 'regulación'],
        weight: 0.8
      },
      'inversion': {
        keywords: ['inversión', 'capital', 'fondos', 'portafolio', 'activos'],
        weight: 0.7
      }
    }

    Object.entries(topicKeywords).forEach(([topic, config]) => {
      const matchCount = config.keywords.filter(keyword => 
        lowerMessage.includes(keyword)
      ).length
      
      if (matchCount > 0) {
        const confidence = Math.min(1.0, (matchCount / config.keywords.length) * config.weight)
        topics.push({
          name: topic,
          confidence: confidence,
          matchedKeywords: config.keywords.filter(k => lowerMessage.includes(k)),
          category: this.determineTopicCategory(topic)
        })
      }
    })

    return topics.sort((a, b) => b.confidence - a.confidence)
  }

  // 📊 GENERAR VECTOR SEMÁNTICO SIMPLE
  generateSemanticVector(message) {
    const words = message.toLowerCase().split(' ')
    const vector = {
      length: words.length,
      businessTerms: 0,
      legalTerms: 0,
      technicalTerms: 0,
      questionWords: 0
    }
    
    const businessWords = ['empresa', 'fiscal', 'tributario', 'inversion', 'capital']
    const legalWords = ['legal', 'ley', 'normativa', 'compliance', 'regulacion']
    const technicalWords = ['estructura', 'optimizacion', 'estrategia', 'implementacion']
    const questionWords = ['como', 'que', 'cuando', 'donde', 'por que', 'cuanto']
    
    words.forEach(word => {
      if (businessWords.includes(word)) vector.businessTerms++
      if (legalWords.includes(word)) vector.legalTerms++
      if (technicalWords.includes(word)) vector.technicalTerms++
      if (questionWords.includes(word)) vector.questionWords++
    })
    
    return vector
  }
  
  // 😊 ANALIZAR TONO EMOCIONAL
  analyzeEmotionalTone(message) {
    const lowerMessage = message.toLowerCase()
    
    const emotions = {
      urgency: ['urgente', 'rápido', 'inmediato', 'ya', 'pronto'],
      concern: ['preocupado', 'problema', 'riesgo', 'peligro', 'miedo'],
      interest: ['interesante', 'me gusta', 'perfecto', 'excelente'],
      confidence: ['seguro', 'confío', 'certeza', 'definitivo'],
      confusion: ['no entiendo', 'confuso', 'duda', 'explicar']
    }
    
    const toneScore = {}
    Object.entries(emotions).forEach(([emotion, words]) => {
      toneScore[emotion] = words.filter(word => lowerMessage.includes(word)).length
    })
    
    return toneScore
  }
  
  // 🧠 ANALIZAR COMPLEJIDAD DEL MENSAJE
  analyzeComplexity(message) {
    const sentences = message.split(/[.!?]+/).length
    const words = message.split(' ').length
    const avgWordsPerSentence = words / sentences
    
    if (avgWordsPerSentence > 20) return 'high'
    if (avgWordsPerSentence > 10) return 'medium'
    return 'low'
  }
  
  // 🏢 EXTRAER CATEGORÍAS EMPRESARIALES
  extractBusinessCategories(message) {
    const lowerMessage = message.toLowerCase()
    const categories = []
    
    const categoryPatterns = {
      'fiscal_strategy': ['impuesto', 'fiscal', 'tributario', 'tax'],
      'corporate_structure': ['holding', 'empresa', 'sociedad', 'estructura'],
      'investment': ['inversion', 'capital', 'portafolio', 'activos'],
      'compliance': ['legal', 'normativa', 'compliance', 'regulacion'],
      'offshore': ['offshore', 'extranjero', 'paraiso'],
      'financial_crime': ['lavado', 'blanqueo', 'evasion', 'fraude']
    }
    
    Object.entries(categoryPatterns).forEach(([category, patterns]) => {
      if (patterns.some(pattern => lowerMessage.includes(pattern))) {
        categories.push(category)
      }
    })
    
    return categories
  }
  
  // 🎯 ESTIMAR NIVEL DE CONFIANZA
  estimateConfidenceLevel(message) {
    const indicators = {
      high: ['seguro', 'definitivamente', 'sin duda', 'claramente'],
      medium: ['creo que', 'posiblemente', 'probablemente'],
      low: ['no estoy seguro', 'tal vez', 'quizás', 'no sé']
    }
    
    const lowerMessage = message.toLowerCase()
    
    if (indicators.high.some(ind => lowerMessage.includes(ind))) return 'high'
    if (indicators.low.some(ind => lowerMessage.includes(ind))) return 'low'
    return 'medium'
  }
  
  // 📈 DETERMINAR CATEGORÍA DE TEMA
  determineTopicCategory(topic) {
    const categories = {
      'holding': 'corporate',
      'fiscal': 'tax',
      'optimizacion_fiscal': 'tax',
      'offshore': 'international',
      'criptomonedas': 'technology',
      'lavado_dinero': 'compliance',
      'compliance': 'legal',
      'inversion': 'finance'
    }
    return categories[topic] || 'general'
  }
  
  // 📊 ACTUALIZAR PATRONES SEMÁNTICOS
  updateSemanticPatterns(clientPhone, messageData) {
    if (!this.semanticPatterns.has(clientPhone)) {
      this.semanticPatterns.set(clientPhone, {
        preferredComplexity: [],
        emotionalPatterns: [],
        businessFocus: [],
        questioningStyle: []
      })
    }
    
    const patterns = this.semanticPatterns.get(clientPhone)
    
    // Actualizar patrones de complejidad
    patterns.preferredComplexity.push(messageData.complexity)
    if (patterns.preferredComplexity.length > 10) {
      patterns.preferredComplexity.shift()
    }
    
    // Actualizar patrones emocionales
    const dominantEmotion = Object.entries(messageData.emotionalTone)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0]
    patterns.emotionalPatterns.push(dominantEmotion)
    if (patterns.emotionalPatterns.length > 10) {
      patterns.emotionalPatterns.shift()
    }
    
    // Actualizar enfoque empresarial
    messageData.businessCategories.forEach(category => {
      patterns.businessFocus.push(category)
    })
    if (patterns.businessFocus.length > 20) {
      patterns.businessFocus = patterns.businessFocus.slice(-20)
    }
  }
  
  // 📊 ANALIZAR PROGRESIÓN EMOCIONAL
  analyzeEmotionalProgression(messages) {
    if (messages.length < 3) return 'insufficient_data'
    
    const recentEmotions = messages.slice(-5).map(msg => {
      if (msg.emotionalTone) {
        return Object.entries(msg.emotionalTone)
          .reduce((a, b) => a[1] > b[1] ? a : b)[0]
      }
      return 'neutral'
    })
    
    // Analizar tendencia emocional
    const emotionCounts = {}
    recentEmotions.forEach(emotion => {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
    })
    
    const dominantEmotion = Object.entries(emotionCounts)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0]
    
    return {
      trend: dominantEmotion,
      stability: recentEmotions.length === 1 ? 'stable' : 'variable',
      recentEmotions: recentEmotions
    }
  }
  
  // 📈 ANALIZAR TENDENCIA DE COMPLEJIDAD
  analyzeComplexityTrend(messages) {
    if (messages.length < 3) return 'insufficient_data'
    
    const complexities = messages.slice(-5).map(msg => {
      if (msg.complexity) {
        const complexityMap = { 'low': 1, 'medium': 2, 'high': 3 }
        return complexityMap[msg.complexity] || 2
      }
      return 2
    })
    
    const avgComplexity = complexities.reduce((a, b) => a + b, 0) / complexities.length
    const trend = complexities[complexities.length - 1] > complexities[0] ? 'increasing' : 'decreasing'
    
    return {
      average: avgComplexity,
      trend: trend,
      level: avgComplexity > 2.5 ? 'high' : avgComplexity > 1.5 ? 'medium' : 'low'
    }
  }
  
  // 🎯 DETERMINAR ESTILO DE CONSULTORÍA
  determineConsultationStyle(messages) {
    if (messages.length < 5) return 'exploratory'
    
    const businessCategories = messages.flatMap(msg => msg.businessCategories || [])
    const categoryFreq = {}
    
    businessCategories.forEach(cat => {
      categoryFreq[cat] = (categoryFreq[cat] || 0) + 1
    })
    
    const totalCategories = Object.keys(categoryFreq).length
    const dominantCategory = Object.entries(categoryFreq)
      .reduce((a, b) => a[1] > b[1] ? a : b, ['none', 0])
    
    if (totalCategories > 4) return 'comprehensive'
    if (dominantCategory[1] > 3) return 'specialized'
    if (totalCategories > 2) return 'exploratory'
    return 'focused'
  }
  
  // 🎓 ESTIMAR SOFISTICACIÓN DEL CLIENTE
  estimateClientSophistication(messages) {
    if (messages.length < 3) return 'unknown'
    
    let sophisticationScore = 0
    
    messages.forEach(msg => {
      // Puntuar por complejidad
      if (msg.complexity === 'high') sophisticationScore += 3
      else if (msg.complexity === 'medium') sophisticationScore += 2
      else sophisticationScore += 1
      
      // Puntuar por categorías de negocio avanzadas
      const advancedCategories = ['offshore', 'compliance', 'financial_crime']
      const hasAdvanced = msg.businessCategories?.some(cat => 
        advancedCategories.includes(cat)
      )
      if (hasAdvanced) sophisticationScore += 2
      
      // Puntuar por confianza
      if (msg.confidenceLevel === 'high') sophisticationScore += 1
    })
    
    const avgScore = sophisticationScore / messages.length
    
    if (avgScore > 4) return 'expert'
    if (avgScore > 3) return 'advanced'
    if (avgScore > 2) return 'intermediate'
    return 'beginner'
  }
  
  // 🚀 DETERMINAR ETAPA MEJORADA DE CONVERSACIÓN
  determineEnhancedConversationStage(messages, currentIntent, messageData) {
    if (messages.length <= 2) return 'initial'
    
    const recentIntents = messages.slice(-3).map(m => m.intent)
    const businessCategories = messages.flatMap(m => m.businessCategories || [])
    
    // Análisis avanzado de etapa
    if (recentIntents.includes('greeting') || recentIntents.includes('help')) {
      return 'exploring'
    }
    
    if (businessCategories.length > 5) {
      return 'deep_consultation'
    }
    
    if (recentIntents.filter(i => i === 'business_query').length >= 2) {
      const sophistication = this.estimateClientSophistication(messages)
      return sophistication === 'expert' ? 'strategic_planning' : 'planning'
    }
    
    return 'implementing'
  }

  // Determinar etapa de conversación
  determineConversationStage(messages, currentIntent) {
    if (messages.length <= 2) return 'initial'
    
    const recentIntents = messages.slice(-3).map(m => m.intent)
    
    if (recentIntents.includes('greeting') || recentIntents.includes('help')) {
      return 'exploring'
    }
    
    if (recentIntents.filter(i => i === 'business_query').length >= 2) {
      return 'planning'
    }
    
    return 'implementing'
  }

  // Obtener contexto para el prompt
  getConversationContext(clientPhone) {
    const conversation = this.conversations.get(clientPhone)
    if (!conversation) {
      return {
        hasHistory: false,
        context: '',
        stage: 'initial',
        interests: [],
        currentTopic: null
      }
    }

    const recentMessages = conversation.messages.slice(-this.contextWindow)
    const context = conversation.context

    let contextString = ''

    // Incluir historial comprimido si existe
    if (conversation.compressedHistory && conversation.compressedHistory.length > 0) {
      const latestSummary = conversation.compressedHistory[conversation.compressedHistory.length - 1]
      contextString += `HISTORIAL PREVIO RESUMIDO:
- Temas tratados anteriormente: ${latestSummary.summary.topics.join(', ')}
- Mensajes previos: ${latestSummary.messageCount}
- Puntos clave discutidos: ${latestSummary.summary.keyPoints.slice(0, 2).join(' | ')}

`
    }

    if (recentMessages.length > 0) {
      contextString += `CONVERSACIÓN RECIENTE:
${recentMessages.map((msg, index) =>
  `${index + 1}. Cliente: "${msg.userMessage}"
     Asesor: "${msg.botResponse.substring(0, 100)}..."`
).join('\n')}

CONTEXTO ACTUAL:
- Tema principal: ${context.currentTopic || 'No definido'}
- Intereses identificados: ${context.interests.join(', ') || 'Ninguno'}
- Etapa de conversación: ${context.stage}
- Última intención: ${context.lastIntent || 'No definida'}
- Total de interacciones: ${conversation.messages.length + (conversation.compressedHistory?.reduce((sum, h) => sum + h.messageCount, 0) || 0)}
`
    }

    return {
      hasHistory: recentMessages.length > 0,
      context: contextString,
      stage: context.stage,
      interests: context.interests,
      currentTopic: context.currentTopic,
      messageCount: conversation.messages.length
    }
  }

  // Obtener resumen de conversación
  getConversationSummary(clientPhone) {
    const conversation = this.conversations.get(clientPhone)
    if (!conversation) return null

    return {
      totalMessages: conversation.messages.length,
      interests: conversation.context.interests,
      currentTopic: conversation.context.currentTopic,
      stage: conversation.context.stage,
      lastActivity: conversation.lastActivity,
      duration: new Date() - conversation.createdAt
    }
  }

  // Comprimir mensajes antiguos manteniendo información clave
  compressOldMessages(clientPhone) {
    const conversation = this.conversations.get(clientPhone)
    if (!conversation || conversation.messages.length <= this.compressionThreshold) return

    console.log(`🗜️ Compressing old messages for ${clientPhone}`)

    // Mantener los últimos mensajes activos
    const recentMessages = conversation.messages.slice(-this.maxActiveMemory)
    const oldMessages = conversation.messages.slice(0, -this.maxActiveMemory)

    // Crear resumen de mensajes antiguos
    const summary = this.createMessagesSummary(oldMessages)

    // Actualizar conversación con resumen + mensajes recientes
    conversation.messages = recentMessages
    conversation.compressedHistory = conversation.compressedHistory || []
    conversation.compressedHistory.push({
      period: `${oldMessages[0]?.timestamp} - ${oldMessages[oldMessages.length - 1]?.timestamp}`,
      messageCount: oldMessages.length,
      summary: summary,
      compressedAt: new Date()
    })

    console.log(`✅ Compressed ${oldMessages.length} messages into summary`)
  }

  // Crear resumen inteligente de mensajes
  createMessagesSummary(messages) {
    const topics = new Set()
    const keyPoints = []

    messages.forEach(msg => {
      // Extraer temas mencionados
      const msgTopics = this.extractTopics(msg.userMessage)
      msgTopics.forEach(topic => topics.add(topic))

      // Identificar puntos clave en respuestas del bot
      if (msg.botResponse.includes('importante') || msg.botResponse.includes('clave')) {
        keyPoints.push(msg.botResponse.substring(0, 100) + '...')
      }
    })

    return {
      topics: Array.from(topics),
      keyPoints: keyPoints.slice(0, 5), // Top 5 puntos clave
      totalMessages: messages.length,
      period: `${messages[0]?.timestamp} - ${messages[messages.length - 1]?.timestamp}`
    }
  }

  // 📊 OBTENER ESTADÍSTICAS MEJORADAS DE MEMORIA
  getMemoryStats() {
    const stats = {
      totalConversations: this.conversations.size,
      totalMessages: 0,
      avgMessagesPerConversation: 0,
      semanticPatterns: this.semanticPatterns?.size || 0,
      intentDistribution: {},
      complexityDistribution: {},
      businessCategoryStats: {},
      memoryUsage: {
        conversations: this.conversations.size,
        semanticPatterns: this.semanticPatterns?.size || 0,
        intentHistory: this.intentHistory?.size || 0,
        personalities: this.conversationPersonalities?.size || 0
      },
      activeConversations: 0
    }
    
    // Calcular estadísticas de mensajes
    for (const [clientPhone, conversation] of this.conversations.entries()) {
      stats.totalMessages += conversation.messages.length
      
      // Verificar conversaciones activas (menos de 1 hora)
      if (new Date() - conversation.lastActivity < 3600000) {
        stats.activeConversations++
      }
      
      // Analizar distribuciones
      conversation.messages.forEach(msg => {
        // Distribución de intenciones
        const intent = msg.intent || 'unknown'
        stats.intentDistribution[intent] = (stats.intentDistribution[intent] || 0) + 1
        
        // Distribución de complejidad
        if (msg.complexity) {
          stats.complexityDistribution[msg.complexity] = (stats.complexityDistribution[msg.complexity] || 0) + 1
        }
        
        // Estadísticas de categorías empresariales
        if (msg.businessCategories) {
          msg.businessCategories.forEach(category => {
            stats.businessCategoryStats[category] = (stats.businessCategoryStats[category] || 0) + 1
          })
        }
      })
    }
    
    stats.avgMessagesPerConversation = stats.totalConversations > 0 ? 
      Math.round(stats.totalMessages / stats.totalConversations) : 0
    
    return stats
  }
}

module.exports = ConversationMemory
