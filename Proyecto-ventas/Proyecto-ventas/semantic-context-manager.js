/**
 * 🧠 SEMANTIC CONTEXT MANAGER - MIGRADO A SUPABASE
 * 
 * Sistema inteligente para mantener y gestionar el contexto semántico de conversaciones.
 * TODAS las estructuras de datos ahora usan Supabase en lugar de RAM (Maps).
 * Permite al agente entender el hilo conversacional y responder de manera más natural.
 */

class SemanticContextManager {
  constructor(databaseService) {
    this.db = databaseService // Recibe el servicio completo de base de datos
    this.contextWindow = 10 // Ventana de contexto (últimos N mensajes)
    this.initialized = false
  }

  /**
   * 🚀 Inicializar el gestor de contexto
   */
  async initialize() {
    console.log('🧠 Inicializando Semantic Context Manager (100% Supabase)...')
    
    // Verificar que el servicio de base de datos esté disponible
    if (!this.db) {
      throw new Error('Servicio de base de datos no proporcionado')
    }
    
    // Verificar que Supabase esté configurado (usando .client)
    if (!this.db.client) {
      throw new Error('Cliente Supabase no configurado en el servicio de base de datos')
    }
    
    this.initialized = true
    console.log('✅ Semantic Context Manager inicializado con persistencia en Supabase')
  }

  /**
   * 📊 Agregar mensaje al contexto conversacional - MIGRADO A SUPABASE
   */
  async addMessage(clientId, message, role = 'user', metadata = {}) {
    try {
      // Generar análisis semántico
      const semanticVector = this.generateSemanticVector(message)
      const extractedTopics = this.extractTopics(message)
      const intention = await this.analyzeIntention(message, clientId)
      const emotionalTone = this.analyzeEmotionalTone(message)

      // Guardar mensaje semántico en Supabase
      const { error: messageError } = await this.db.client
        .from('semantic_messages')
        .insert({
          client_id: clientId,
          message_content: message,
          semantic_vector: semanticVector,
          extracted_topics: extractedTopics,
          intent_analysis: {
            intention,
            emotional_tone: emotionalTone,
            role: role,
            ...metadata
          }
        })

      if (messageError) {
        console.error('Error guardando mensaje semántico:', messageError)
      }

      // Obtener o crear conversación semántica
      await this.ensureSemanticConversation(clientId)

      // Actualizar perfil semántico
      await this.updateSemanticProfile(clientId, {
        semanticVector,
        extractedTopics,
        intention,
        emotionalTone
      })

      // Actualizar flujo conversacional
      await this.updateConversationFlow(clientId, {
        extractedTopics,
        intention
      })

      // Mantener límite de mensajes (automático con función SQL)
      
      return {
        id: Date.now(),
        content: message,
        role: role,
        timestamp: new Date(),
        semanticVector,
        extractedTopics,
        intention,
        emotionalTone,
        ...metadata
      }
    } catch (error) {
      console.error('Error en addMessage:', error)
      return null
    }
  }

  /**
   * 🏗️ Asegurar que existe conversación semántica para el cliente
   */
  async ensureSemanticConversation(clientId) {
    try {
      const { data, error } = await this.db.client
        .from('semantic_conversations')
        .select('id')
        .eq('client_id', clientId)
        .single()

      if (!data) {
        // Crear nueva conversación semántica
        const { error: insertError } = await this.db.client
          .from('semantic_conversations')
          .insert({
            client_id: clientId,
            semantic_profile: {
              communicationStyle: 'neutral',
              preferredTopics: [],
              responsePatterns: []
            },
            conversation_flow: {
              currentTopic: null,
              topicTransitions: [],
              interestLevel: 'medium'
            },
            total_messages: 0
          })

        if (insertError) {
          console.error('Error creando conversación semántica:', insertError)
        }
      }
    } catch (error) {
      console.error('Error en ensureSemanticConversation:', error)
    }
  }

  /**
   * 🔍 Generar vector semántico para un mensaje
   */
  generateSemanticVector(message) {
    const words = message.toLowerCase().split(/\\s+/).filter(word => word.length > 2)
    
    return {
      wordCount: words.length,
      uniqueWords: [...new Set(words)],
      complexity: this.calculateComplexity(words),
      sentiment: this.analyzeSentiment(message),
      technicalTerms: this.extractTechnicalTerms(words),
      questionIndicators: this.detectQuestions(message),
      urgencyLevel: this.detectUrgency(message)
    }
  }

  /**
   * 🎯 Extraer temas principales del mensaje
   */
  extractTopics(message) {
    const text = message.toLowerCase()
    const topics = []

    // Categorías de productos (dinámicas)
    const productCategories = [
      'celular', 'telefono', 'smartphone', 'iphone', 'android',
      'laptop', 'computadora', 'tablet', 'auriculares', 'camara'
    ]

    // Características técnicas
    const technicalFeatures = [
      'bateria', 'almacenamiento', 'memoria', 'camara', 'pantalla',
      'resistente', 'agua', 'precio', 'garantia', 'durabilidad'
    ]

    // Intenciones de compra
    const purchaseIntentions = [
      'comprar', 'precio', 'costo', 'barato', 'economico',
      'recomendacion', 'mejor', 'comparar', 'diferencia'
    ]

    productCategories.forEach(category => {
      if (text.includes(category)) {
        topics.push({ type: 'product', value: category, confidence: 0.8 })
      }
    })

    technicalFeatures.forEach(feature => {
      if (text.includes(feature)) {
        topics.push({ type: 'feature', value: feature, confidence: 0.7 })
      }
    })

    purchaseIntentions.forEach(intention => {
      if (text.includes(intention)) {
        topics.push({ type: 'intention', value: intention, confidence: 0.9 })
      }
    })

    return topics
  }

  /**
   * 🎭 Analizar intención del mensaje en contexto - MIGRADO A SUPABASE
   */
  async analyzeIntention(message, clientId) {
    const text = message.toLowerCase()

    // Intenciones básicas
    if (text.includes('hola') || text.includes('buenos') || text.includes('buenas')) {
      return { type: 'greeting', confidence: 0.9 }
    }

    if (text.includes('busco') || text.includes('necesito') || text.includes('quiero')) {
      return { type: 'search', confidence: 0.8 }
    }

    if (text.includes('precio') || text.includes('costo') || text.includes('cuanto')) {
      return { type: 'price_inquiry', confidence: 0.8 }
    }

    if (text.includes('comprar') || text.includes('llevar') || text.includes('si')) {
      return { type: 'purchase_intent', confidence: 0.7 }
    }

    if (text.includes('?')) {
      return { type: 'question', confidence: 0.6 }
    }

    // Análisis contextual basado en historial de Supabase
    try {
      const { data: recentMessages } = await this.db.client
        .from('semantic_messages')
        .select('extracted_topics')
        .eq('client_id', clientId)
        .order('timestamp', { ascending: false })
        .limit(3)

      const hasProductMentions = recentMessages?.some(m => 
        m.extracted_topics?.some(t => t.type === 'product')
      )

      if (hasProductMentions && (text.includes('ese') || text.includes('esa') || text.includes('el de'))) {
        return { type: 'product_reference', confidence: 0.8 }
      }
    } catch (error) {
      console.error('Error analizando contexto:', error)
    }

    return { type: 'general', confidence: 0.5 }
  }

  /**
   * 😊 Analizar tono emocional
   */
  analyzeEmotionalTone(message) {
    const text = message.toLowerCase()
    
    // Positivo
    const positiveWords = ['excelente', 'genial', 'perfecto', 'bueno', 'gracias', 'me gusta']
    const negativeWords = ['malo', 'terrible', 'no me gusta', 'problema', 'error']
    const urgentWords = ['urgente', 'rapido', 'ya', 'ahora', 'necesito ya']

    let positiveScore = 0
    let negativeScore = 0
    let urgencyScore = 0

    positiveWords.forEach(word => {
      if (text.includes(word)) positiveScore += 1
    })

    negativeWords.forEach(word => {
      if (text.includes(word)) negativeScore += 1
    })

    urgentWords.forEach(word => {
      if (text.includes(word)) urgencyScore += 1
    })

    return {
      sentiment: positiveScore > negativeScore ? 'positive' : 
                negativeScore > positiveScore ? 'negative' : 'neutral',
      urgency: urgencyScore > 0 ? 'high' : 'normal',
      scores: { positive: positiveScore, negative: negativeScore, urgent: urgencyScore }
    }
  }

  /**
   * 🔧 Obtener contexto conversacional completo - MIGRADO A SUPABASE
   */
  async getConversationContext(clientId, includeHistory = true) {
    try {
      // Obtener conversación semántica
      const { data: conversation } = await this.db.client
        .from('semantic_conversations')
        .select('*')
        .eq('client_id', clientId)
        .single()

      if (!conversation) {
        return {
          hasContext: false,
          summary: 'Nueva conversación',
          recommendations: ['Saludar cordialmente', 'Preguntar en qué puede ayudar']
        }
      }

      let recentMessages = []
      if (includeHistory) {
        const { data: messages } = await this.db.client
          .from('semantic_messages')
          .select('*')
          .eq('client_id', clientId)
          .order('timestamp', { ascending: false })
          .limit(this.contextWindow)

        recentMessages = (messages || []).reverse()
      }

      // Generar resumen y recomendaciones
      const summary = this.generateConversationSummary(recentMessages)
      const recommendations = this.generateContextualRecommendations(conversation, recentMessages)
      const topics = this.summarizeTopics(recentMessages)

      return {
        hasContext: true,
        summary,
        topics,
        currentFlow: conversation.conversation_flow.currentTopic,
        emotionalProfile: conversation.semantic_profile.communicationStyle,
        recommendations,
        lastUserMessage: recentMessages[recentMessages.length - 1],
        conversationLength: conversation.total_messages,
        semanticProfile: conversation.semantic_profile
      }
    } catch (error) {
      console.error('Error obteniendo contexto conversacional:', error)
      return {
        hasContext: false,
        summary: 'Error obteniendo contexto',
        recommendations: ['Continuar conversación normalmente']
      }
    }
  }

  /**
   * 🔄 Actualizar perfil semántico del cliente - MIGRADO A SUPABASE
   */
  async updateSemanticProfile(clientId, messageContext) {
    try {
      // 🔧 VERIFICAR QUE EL CLIENTE SUPABASE ESTÉ DISPONIBLE
      if (!this.db || !this.db.client) {
        console.error('Cliente Supabase no disponible para updateSemanticProfile')
        return
      }

      const { data: conversation } = await this.db.client
        .from('semantic_conversations')
        .select('semantic_profile, total_messages')
        .eq('client_id', clientId)
        .single()

      if (!conversation) return

      const profile = conversation.semantic_profile || {
        communicationStyle: 'neutral',
        preferredTopics: [],
        responsePatterns: []
      }

      // Actualizar estilo de comunicación
      if (messageContext.semanticVector.complexity > 0.7) {
        profile.communicationStyle = 'technical'
      } else if (messageContext.semanticVector.wordCount < 5) {
        profile.communicationStyle = 'concise'
      } else {
        profile.communicationStyle = 'conversational'
      }

      // Actualizar temas preferidos
      messageContext.extractedTopics.forEach(topic => {
        if (!profile.preferredTopics.find(t => t.value === topic.value)) {
          profile.preferredTopics.push(topic)
        }
      })

      // Limitar temas preferidos a 10
      if (profile.preferredTopics.length > 10) {
        profile.preferredTopics = profile.preferredTopics.slice(-8)
      }

      // Actualizar en Supabase
      await this.db.client
        .from('semantic_conversations')
        .update({
          semantic_profile: profile,
          total_messages: (conversation.total_messages || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId)

    } catch (error) {
      console.error('Error actualizando perfil semántico:', error)
    }
  }

  /**
   * 🌊 Actualizar flujo conversacional - MIGRADO A SUPABASE
   */
  async updateConversationFlow(clientId, messageContext) {
    try {
      // 🔧 VERIFICAR QUE EL CLIENTE SUPABASE ESTÉ DISPONIBLE
      if (!this.db || !this.db.client) {
        console.error('Cliente Supabase no disponible para updateConversationFlow')
        return
      }

      const { data: conversation } = await this.db.client
        .from('semantic_conversations')
        .select('conversation_flow')
        .eq('client_id', clientId)
        .single()

      if (!conversation) return

      const flow = conversation.conversation_flow || {
        currentTopic: null,
        topicTransitions: [],
        interestLevel: 'medium'
      }

      // Actualizar tema actual
      const mainTopic = messageContext.extractedTopics.find(t => t.confidence > 0.7)
      if (mainTopic) {
        if (flow.currentTopic !== mainTopic.value) {
          flow.topicTransitions.push({
            from: flow.currentTopic,
            to: mainTopic.value,
            timestamp: new Date().toISOString()
          })
          flow.currentTopic = mainTopic.value
        }
      }

      // Actualizar nivel de interés
      if (messageContext.intention.type === 'purchase_intent') {
        flow.interestLevel = 'high'
      } else if (messageContext.intention.type === 'price_inquiry') {
        flow.interestLevel = 'medium'
      }

      // Limitar transiciones a 20
      if (flow.topicTransitions.length > 20) {
        flow.topicTransitions = flow.topicTransitions.slice(-15)
      }

      // Actualizar en Supabase
      await this.db.client
        .from('semantic_conversations')
        .update({
          conversation_flow: flow,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId)

    } catch (error) {
      console.error('Error actualizando flujo conversacional:', error)
    }
  }

  /**
   * 📝 Generar resumen de conversación
   */
  generateConversationSummary(messages) {
    if (!messages || messages.length === 0) {
      return 'Nueva conversación sin historial'
    }

    const userMessages = messages.filter(m => m.intent_analysis?.role === 'user')
    const topics = []
    const intentions = []

    userMessages.forEach(msg => {
      if (msg.extracted_topics) {
        msg.extracted_topics.forEach(topic => {
          if (!topics.find(t => t.value === topic.value)) {
            topics.push(topic)
          }
        })
      }
      if (msg.intent_analysis?.intention?.type) {
        intentions.push(msg.intent_analysis.intention.type)
      }
    })

    const mainTopics = topics.slice(0, 3).map(t => t.value).join(', ')
    const mainIntention = intentions[intentions.length - 1] || 'general'

    return `Cliente ha mencionado: ${mainTopics}. Intención principal: ${mainIntention}. Total mensajes: ${messages.length}`
  }

  /**
   * 💡 Generar recomendaciones contextuales
   */
  generateContextualRecommendations(conversation, recentMessages) {
    const recommendations = []

    if (!recentMessages || recentMessages.length === 0) {
      return ['Dar la bienvenida', 'Preguntar en qué puede ayudar']
    }

    const lastMessage = recentMessages[recentMessages.length - 1]
    const lastIntention = lastMessage?.intent_analysis?.intention

    switch (lastIntention?.type) {
      case 'search':
        recommendations.push('Mostrar productos relevantes')
        recommendations.push('Hacer preguntas para especificar necesidades')
        break
      case 'price_inquiry':
        recommendations.push('Proporcionar información de precios clara')
        recommendations.push('Destacar valor agregado')
        break
      case 'purchase_intent':
        recommendations.push('Facilitar el proceso de compra')
        recommendations.push('Confirmar detalles del pedido')
        break
      default:
        recommendations.push('Continuar conversación naturalmente')
        recommendations.push('Ofrecer ayuda específica')
    }

    return recommendations
  }

  /**
   * 📊 Resumir temas de conversación
   */
  summarizeTopics(messages) {
    const topicCounts = {}
    
    messages.forEach(msg => {
      if (msg.extracted_topics) {
        msg.extracted_topics.forEach(topic => {
          topicCounts[topic.value] = (topicCounts[topic.value] || 0) + 1
        })
      }
    })

    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, mentions: count }))
  }

  /**
   * 📊 Calcular complejidad del mensaje
   */
  calculateComplexity(words) {
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
    const uniqueRatio = new Set(words).size / words.length
    return (avgWordLength / 10) * 0.6 + uniqueRatio * 0.4
  }

  /**
   * 💭 Analizar sentimiento básico
   */
  analyzeSentiment(message) {
    const text = message.toLowerCase()
    const positiveCount = (text.match(/\\b(bueno|excelente|genial|perfecto|me gusta)\\b/g) || []).length
    const negativeCount = (text.match(/\\b(malo|terrible|odio|no me gusta)\\b/g) || []).length
    
    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }

  /**
   * 🔧 Extraer términos técnicos
   */
  extractTechnicalTerms(words) {
    const technicalTerms = [
      'gb', 'tb', 'mah', 'mp', 'ghz', 'ram', 'rom', 'hd', '4k', '5g',
      'bluetooth', 'wifi', 'usb', 'tipo-c', 'lightning', 'oled', 'amoled'
    ]
    
    return words.filter(word => technicalTerms.includes(word.toLowerCase()))
  }

  /**
   * ❓ Detectar preguntas en el mensaje
   */
  detectQuestions(message) {
    const questionWords = ['qué', 'cómo', 'cuándo', 'dónde', 'por qué', 'cuál', 'cuánto']
    const text = message.toLowerCase()
    
    const hasQuestionMark = message.includes('?')
    const hasQuestionWords = questionWords.some(word => text.includes(word))
    
    return { hasQuestionMark, hasQuestionWords, questions: this.classifyQuestion(text) }
  }

  /**
   * ⚡ Detectar urgencia en el mensaje
   */
  detectUrgency(message) {
    const urgentWords = ['urgente', 'rápido', 'ya', 'ahora', 'inmediato', 'pronto']
    const text = message.toLowerCase()
    
    const urgencyCount = urgentWords.filter(word => text.includes(word)).length
    return urgencyCount > 0 ? 'high' : 'normal'
  }

  /**
   * 🏷️ Clasificar tipo de pregunta
   */
  classifyQuestion(text) {
    // Preguntas sobre precio
    if (text.includes('precio') || text.includes('costo') || text.includes('cuanto')) {
      return 'price_inquiry'
    }
    
    // Preguntas sobre características
    if (text.includes('como') || text.includes('caracteristica') || text.includes('especificacion')) {
      return 'feature_inquiry'
    }
    
    // Preguntas sobre disponibilidad
    if (text.includes('disponible') || text.includes('stock') || text.includes('hay')) {
      return 'availability_inquiry'
    }
    
    return 'unknown'
  }
}

export default SemanticContextManager