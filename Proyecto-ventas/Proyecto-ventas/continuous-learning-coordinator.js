/**
 * 🔄 CONTINUOUS LEARNING COORDINATOR
 * 
 * Sistema maestro que coordina el aprendizaje continuo integrando:
 * - Semantic Context Manager
 * - Reinforcement Learning Engine  
 * - Adaptive Personality System
 * - Feedback Loop Intelligence
 */

class ContinuousLearningCoordinator {
  constructor() {
    this.semanticContextManager = null
    this.rlEngine = null
    this.personalitySystem = null
    // ✅ SESIONES AHORA EN MAP - memoria temporal para sesiones activas
    this.conversationSessions = new Map()
    this.globalInsights = {
      successPatterns: {},
      failurePatterns: {},
      personalityEffectiveness: {},
      contextualTrends: {}
    }
    this.initialized = false
  }

  /**
   * 🚀 Inicializar el coordinador de aprendizaje continuo
   */
  initialize(semanticContextManager, rlEngine, personalitySystem) {
    console.log('🔄 Inicializando Continuous Learning Coordinator...')
    
    this.semanticContextManager = semanticContextManager
    this.rlEngine = rlEngine
    this.personalitySystem = personalitySystem
    
    this.initialized = true
    console.log('✅ Sistema de Aprendizaje Continuo inicializado')
  }

  /**
   * 🎯 Iniciar sesión de conversación con aprendizaje inteligente
   */
  async startConversationSession(clientId, initialContext = {}) {
    if (!this.initialized) {
      console.warn('⚠️ Continuous Learning no inicializado')
      return null
    }

    const sessionId = `${clientId}_${Date.now()}`
    
    // Obtener contexto semántico existente
    const semanticContext = await this.semanticContextManager.getConversationContext(clientId)
    
    // Determinar personalidad óptima basada en historial
    const conversationHistory = semanticContext.hasContext ? 
      semanticContext.summary.topicsDiscussed : []
    
    const adaptedPersonality = await this.personalitySystem.analyzeClientPersonality(
      clientId, 
      conversationHistory, 
      initialContext
    )
    
    // Obtener recomendaciones de RL
    const rlRecommendations = await this.rlEngine.generateConversationalRecommendations(
      clientId, 
      initialContext.conversationState || 'initial', 
      {
        customerType: this.determineCustomerType(semanticContext),
        messageComplexity: 'simple',
        messageLength: 'medium'
      }
    )

    // Crear sesión de conversación
    const session = {
      sessionId,
      clientId,
      startTime: Date.now(),
      semanticContext,
      personality: adaptedPersonality,
      rlRecommendations,
      conversationFlow: {
        messages: [],
        stateTransitions: [],
        personalityAdaptations: [],
        learningEvents: []
      },
      metrics: {
        responseQuality: 0,
        customerSatisfaction: 0,
        conversationEfficiency: 0,
        goalAchievement: 0
      }
    }

    this.conversationSessions.set(sessionId, session)
    
    console.log(`🎯 Sesión de aprendizaje iniciada: ${sessionId}`)
    
    return {
      sessionId,
      personalityInstructions: this.personalitySystem.generatePersonalityInstructions(adaptedPersonality),
      contextualInsights: semanticContext,
      recommendedActions: rlRecommendations
    }
  }

  /**
   * 🧠 Procesar mensaje con inteligencia integrada
   */
  async processMessageWithLearning(sessionId, message, role, messageContext = {}) {
    const session = this.conversationSessions.get(sessionId)
    if (!session) {
      console.warn(`⚠️ Sesión no encontrada: ${sessionId}`)
      return null
    }

    // Agregar mensaje al contexto semántico
    const messageAnalysis = await this.semanticContextManager.addMessage(
      session.clientId, 
      message, 
      role, 
      messageContext
    )

    // Registrar acción en RL Engine si es del asistente
    if (role === 'assistant') {
      const rlAction = this.extractActionFromMessage(message, messageContext)
      await this.rlEngine.recordAction(
        session.clientId,
        messageContext.conversationState || 'unknown',
        rlAction,
        {
          messageLength: message.length > 100 ? 'long' : message.length < 30 ? 'short' : 'medium',
          customerType: this.determineCustomerType(session.semanticContext),
          messageComplexity: messageAnalysis?.semanticVector?.complexity || 'medium'
        }
      )
    }

    // Actualizar flujo de conversación
    session.conversationFlow.messages.push({
      timestamp: Date.now(),
      role,
      message,
      analysis: messageAnalysis,
      context: messageContext
    })

    // Detectar cambios de estado y adaptaciones necesarias
    const adaptationNeeded = this.detectAdaptationNeeds(session, messageAnalysis)
    
    if (adaptationNeeded) {
      const newPersonality = await this.adaptPersonalityRealTime(session, adaptationNeeded)
      if (newPersonality) {
        session.personality = newPersonality
        session.conversationFlow.personalityAdaptations.push({
          timestamp: Date.now(),
          reason: adaptationNeeded.reason,
          previousPersonality: session.personality.basePersonality,
          newPersonality: newPersonality.basePersonality,
          adaptations: newPersonality.adaptations
        })
      }
    }

    // Generar recomendaciones actualizadas
    const updatedRecommendations = await this.generateRealTimeRecommendations(session, messageAnalysis)

    return {
      messageAnalysis,
      personalityAdaptation: adaptationNeeded,
      recommendations: updatedRecommendations,
      sessionInsights: this.getSessionInsights(session)
    }
  }

  /**
   * 🎭 Detectar necesidades de adaptación de personalidad
   */
  detectAdaptationNeeds(session, messageAnalysis) {
    const recentMessages = session.conversationFlow.messages.slice(-3)
    
    // Detectar frustración del cliente
    if (messageAnalysis?.emotionalTone?.sentiment === 'negative') {
      return {
        type: 'emotional_adaptation',
        reason: 'Customer showing signs of frustration',
        suggestedPersonality: 'consultative',
        confidence: 0.8
      }
    }

    // Detectar cliente muy técnico
    if (messageAnalysis?.semanticVector?.technicalTerms?.length > 2) {
      return {
        type: 'technical_adaptation',
        reason: 'Customer using technical language',
        suggestedPersonality: 'technical',
        confidence: 0.7
      }
    }

    // Detectar cliente con prisa
    if (messageAnalysis?.semanticVector?.urgencyLevel === 'high') {
      return {
        type: 'urgency_adaptation',
        reason: 'Customer showing urgency signals',
        suggestedPersonality: 'professional',
        confidence: 0.6
      }
    }

    // Detectar cliente muy formal
    const formalityScore = this.calculateFormalityScore(recentMessages)
    if (formalityScore > 0.8) {
      return {
        type: 'formality_adaptation',
        reason: 'Customer using formal communication style',
        suggestedPersonality: 'professional',
        confidence: 0.6
      }
    }

    return null
  }

  /**
   * 🔄 Adaptar personalidad en tiempo real
   */
  async adaptPersonalityRealTime(session, adaptationNeeded) {
    if (!adaptationNeeded) return null

    const currentHistory = session.conversationFlow.messages.map(m => ({
      role: m.role,
      message: m.message,
      timestamp: m.timestamp
    }))

    return await this.personalitySystem.analyzeClientPersonality(
      session.clientId,
      currentHistory,
      {
        adaptationTrigger: adaptationNeeded.type,
        suggestedPersonality: adaptationNeeded.suggestedPersonality
      }
    )
  }

  /**
   * 💡 Generar recomendaciones en tiempo real
   */
  async generateRealTimeRecommendations(session, messageAnalysis) {
    const recommendations = []

    // Recomendaciones de RL Engine
    const rlRecommendations = await this.rlEngine.generateConversationalRecommendations(
      session.clientId,
      session.conversationFlow.messages[session.conversationFlow.messages.length - 1]?.context?.conversationState || 'unknown',
      {
        customerType: this.determineCustomerType(session.semanticContext),
        messageComplexity: messageAnalysis?.semanticVector?.complexity || 'medium'
      }
    )

    recommendations.push(...rlRecommendations)

    // Recomendaciones de personalidad
    const personalityInstructions = this.personalitySystem.generatePersonalityInstructions(session.personality)
    recommendations.push({
      type: 'personality_guidance',
      instructions: personalityInstructions,
      confidence: 0.9
    })

    // Recomendaciones de contexto semántico
    const contextualRecommendations = this.generateContextualRecommendations(session, messageAnalysis)
    recommendations.push(...contextualRecommendations)

    return recommendations
  }

  /**
   * 📊 Generar recomendaciones contextuales
   */
  generateContextualRecommendations(session, messageAnalysis) {
    const recommendations = []
    const conversationLength = session.conversationFlow.messages.length

    // Recomendar basado en longitud de conversación
    if (conversationLength > 10) {
      recommendations.push({
        type: 'conversation_length',
        message: 'Conversación larga detectada - considerar resumir y enfocar',
        confidence: 0.7
      })
    }

    // Recomendar basado en temas extraídos
    if (messageAnalysis?.extractedTopics?.length > 0) {
      const mainTopic = messageAnalysis.extractedTopics[0]
      recommendations.push({
        type: 'topic_focus',
        message: `Enfocarse en tema principal: ${mainTopic.value}`,
        confidence: mainTopic.confidence
      })
    }

    // Recomendar basado en intención
    if (messageAnalysis?.intention?.type) {
      recommendations.push({
        type: 'intention_alignment',
        message: `Alinear respuesta con intención: ${messageAnalysis.intention.type}`,
        confidence: messageAnalysis.intention.confidence || 0.5
      })
    }

    return recommendations
  }

  /**
   * 🏆 Finalizar sesión de conversación y registrar aprendizaje
   */
  async endConversationSession(sessionId, outcome) {
    const session = this.conversationSessions.get(sessionId)
    if (!session) {
      console.warn(`⚠️ Sesión no encontrada para finalizar: ${sessionId}`)
      return
    }

    session.endTime = Date.now()
    session.outcome = outcome
    session.duration = session.endTime - session.startTime

    // Calcular métricas de la conversación
    const conversationMetrics = this.calculateConversationMetrics(session, outcome)

    // Registrar resultado en RL Engine
    const rlOutcome = {
      success: outcome.success || false,
      conversationLength: session.conversationFlow.messages.length,
      finalState: outcome.finalState || 'unknown',
      satisfactionLevel: outcome.satisfactionLevel || 0.5,
      conversionToSale: outcome.conversionToSale || false,
      responseTime: session.duration / session.conversationFlow.messages.length,
      ...outcome
    }

    await this.rlEngine.recordConversationOutcome(session.clientId, sessionId, rlOutcome)

    // Registrar resultado en Personality System
    await this.personalitySystem.recordPersonalitySuccess(
      session.clientId,
      session.personality.basePersonality || 'friendly',
      outcome.success || false
    )

    // Actualizar métricas globales
    this.updateGlobalInsights(session, conversationMetrics)

    // Generar insights de aprendizaje
    const learningInsights = this.generateLearningInsights(session, conversationMetrics)

    // Limpiar sesión
    this.conversationSessions.delete(sessionId)

    console.log(`🏆 Sesión finalizada con aprendizaje: ${sessionId}`)

    return {
      sessionMetrics: conversationMetrics,
      learningInsights,
      globalProgress: this.getGlobalLearningProgress()
    }
  }

  /**
   * 📈 Calcular métricas de conversación
   */
  calculateConversationMetrics(session, outcome) {
    const messages = session.conversationFlow.messages
    const userMessages = messages.filter(m => m.role === 'user')
    const assistantMessages = messages.filter(m => m.role === 'assistant')

    return {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      averageResponseTime: session.duration / assistantMessages.length,
      conversationEfficiency: outcome.success ? (10 / messages.length) : 0,
      personalityAdaptations: session.conversationFlow.personalityAdaptations.length,
      topicCoherence: this.calculateTopicCoherence(messages),
      customerEngagement: this.calculateCustomerEngagement(userMessages),
      goalAchievement: outcome.goalAchievement || 0
    }
  }

  /**
   * 🔄 Actualizar insights globales
   */
  updateGlobalInsights(session, metrics) {
    const personality = session.personality.basePersonality || 'unknown'
    
    // Actualizar efectividad de personalidades
    if (!this.globalInsights.personalityEffectiveness[personality]) {
      this.globalInsights.personalityEffectiveness[personality] = {
        total: 0,
        successful: 0,
        averageLength: 0,
        averageEfficiency: 0
      }
    }

    const personalityStats = this.globalInsights.personalityEffectiveness[personality]
    personalityStats.total++
    
    if (session.outcome?.success) {
      personalityStats.successful++
    }

    personalityStats.averageLength = 
      (personalityStats.averageLength * (personalityStats.total - 1) + metrics.totalMessages) / personalityStats.total

    personalityStats.averageEfficiency = 
      (personalityStats.averageEfficiency * (personalityStats.total - 1) + metrics.conversationEfficiency) / personalityStats.total

    // Actualizar tendencias contextuales
    const timeOfDay = this.getTimeOfDay()
    if (!this.globalInsights.contextualTrends[timeOfDay]) {
      this.globalInsights.contextualTrends[timeOfDay] = {
        conversationCount: 0,
        successRate: 0,
        averageLength: 0
      }
    }

    const timeStats = this.globalInsights.contextualTrends[timeOfDay]
    timeStats.conversationCount++
    timeStats.successRate = 
      (timeStats.successRate * (timeStats.conversationCount - 1) + (session.outcome?.success ? 1 : 0)) / timeStats.conversationCount
    timeStats.averageLength = 
      (timeStats.averageLength * (timeStats.conversationCount - 1) + metrics.totalMessages) / timeStats.conversationCount
  }

  /**
   * 💡 Generar insights de aprendizaje
   */
  generateLearningInsights(session, metrics) {
    const insights = []

    // Insight sobre efectividad de personalidad
    const personalitySuccess = session.outcome?.success && metrics.conversationEfficiency > 0.5
    insights.push({
      type: 'personality_effectiveness',
      personality: session.personality.basePersonality,
      effective: personalitySuccess,
      reason: personalitySuccess ? 
        'Personalidad resultó efectiva para este cliente' : 
        'Personalidad podría mejorarse para este tipo de cliente'
    })

    // Insight sobre adaptaciones
    if (session.conversationFlow.personalityAdaptations.length > 0) {
      insights.push({
        type: 'adaptation_learning',
        adaptations: session.conversationFlow.personalityAdaptations.length,
        effectiveness: session.outcome?.success ? 'high' : 'low',
        lesson: session.outcome?.success ? 
          'Las adaptaciones mejoraron la conversación' :
          'Las adaptaciones necesitan refinamiento'
      })
    }

    // Insight sobre longitud de conversación
    if (metrics.totalMessages > 15) {
      insights.push({
        type: 'conversation_length',
        length: metrics.totalMessages,
        efficiency: metrics.conversationEfficiency,
        recommendation: 'Optimizar para conversaciones más concisas'
      })
    }

    return insights
  }

  /**
   * 🎯 Obtener progreso de aprendizaje global
   */
  getGlobalLearningProgress() {
    const rlProgress = this.rlEngine?.getStatistics?.()?.learningProgress
    const personalityStats = this.personalitySystem?.getPersonalityUsageStats?.()

    return {
      reinforcementLearning: rlProgress,
      personalitySystem: personalityStats,
      globalInsights: this.globalInsights,
      sessionsProcessed: this.conversationSessions.size,
      systemMaturity: this.calculateSystemMaturity()
    }
  }

  /**
   * 🔢 Métodos auxiliares
   */
  determineCustomerType(semanticContext) {
    if (!semanticContext.hasContext) return 'new'
    
    const messageCount = semanticContext.conversationLength || 0
    if (messageCount > 10) return 'experienced'
    if (messageCount > 5) return 'returning'
    return 'new'
  }

  extractActionFromMessage(message, context) {
    // Extraer tipo de acción del mensaje del asistente
    if (message.includes('¿')) return 'ask_question'
    if (message.includes('recomiendo') || message.includes('sugiero')) return 'recommend'
    if (message.includes('precio') || message.includes('S/')) return 'provide_price'
    if (message.includes('disponible') || message.includes('stock')) return 'check_availability'
    return 'general_response'
  }

  calculateFormalityScore(messages) {
    // Calcular score de formalidad basado en mensajes recientes
    const formalWords = ['usted', 'señor', 'señora', 'disculpe', 'agradezco']
    const informalWords = ['tú', 'che', 'oye', 'genial', 'súper']
    
    let formalCount = 0
    let informalCount = 0
    
    messages.forEach(msg => {
      const text = msg.message.toLowerCase()
      formalWords.forEach(word => {
        if (text.includes(word)) formalCount++
      })
      informalWords.forEach(word => {
        if (text.includes(word)) informalCount++
      })
    })
    
    const total = formalCount + informalCount
    return total > 0 ? formalCount / total : 0.5
  }

  calculateTopicCoherence(messages) {
    // Calcular coherencia temática de la conversación
    // Implementación simplificada
    return Math.random() * 0.3 + 0.7 // Placeholder
  }

  calculateCustomerEngagement(userMessages) {
    // Calcular nivel de engagement del cliente
    const avgLength = userMessages.reduce((sum, msg) => sum + msg.message.length, 0) / userMessages.length
    return Math.min(avgLength / 50, 1) // Normalizar
  }

  calculateSystemMaturity() {
    // Calcular madurez del sistema basado en datos disponibles
    const rlStats = this.rlEngine?.getStatistics?.()
    const totalInteractions = rlStats?.performance?.totalConversations || 0
    
    if (totalInteractions < 10) return 'initial'
    if (totalInteractions < 50) return 'learning'
    if (totalInteractions < 200) return 'developing'
    return 'mature'
  }

  getTimeOfDay() {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    if (hour >= 18 && hour < 22) return 'evening'
    return 'night'
  }

  getSessionInsights(session) {
    return {
      messageCount: session.conversationFlow.messages.length,
      currentPersonality: session.personality.basePersonality,
      adaptationsMade: session.conversationFlow.personalityAdaptations.length,
      duration: Date.now() - session.startTime
    }
  }

  /**
   * 🧹 Limpiar datos antiguos
   */
  cleanup() {
    // Limpiar sesiones abandonadas (más de 1 hora sin actividad)
    const oneHour = 60 * 60 * 1000
    const now = Date.now()
    
    for (const [sessionId, session] of this.conversationSessions.entries()) {
      const lastActivity = session.conversationFlow.messages.length > 0 ? 
        session.conversationFlow.messages[session.conversationFlow.messages.length - 1].timestamp :
        session.startTime
      
      if (now - lastActivity > oneHour) {
        console.log(`🧹 Limpiando sesión abandonada: ${sessionId}`)
        this.conversationSessions.delete(sessionId)
      }
    }
  }
}

// Instancia singleton
const continuousLearningCoordinator = new ContinuousLearningCoordinator()

export default continuousLearningCoordinator