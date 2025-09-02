/**
 * 🎭 ADAPTIVE PERSONALITY SYSTEM
 * Sistema que adapta dinámicamente la personalidad y estilo comunicativo 
 * del agente empresarial basado en el perfil del cliente y patrones de conversación exitosos.
 */

const logger = require('./logger')

class AdaptivePersonalitySystem {
  constructor(conversationMemory, configService = null) {
    this.memory = conversationMemory
    this.configService = configService
    this.initialized = false
    
    // Perfiles base de personalidad para consultoría empresarial
    this.personalityProfiles = new Map()
    this.clientPersonalities = new Map() // Personalidades adaptadas por cliente
    this.personalityEffectiveness = new Map() // Efectividad de personalidades por cliente
    
    this.initializePersonalityProfiles()
    
    logger.info('🎭 Adaptive Personality System inicializado para consultoría empresarial')
  }

  /**
   * 🌅 Generar saludo dinámico basado en hora y configuración
   */
  generateDynamicGreeting(personalityType = 'professional', clientName = null, companyName = null) {
    // ⚙️ USAR CONFIGURACIÓN DINÁMICA SI ESTÁ DISPONIBLE
    let configuredCompanyName = companyName
    let representativeName = ''
    let greetingStyle = 'dynamic'
    
    if (this.configService) {
      try {
        const companyInfo = this.configService.getCompanyInfo()
        const greetingConfig = this.configService.getGreetingConfig()
        
        configuredCompanyName = companyInfo.name !== 'Tu Empresa' ? companyInfo.name : companyName
        representativeName = companyInfo.representative.name
        greetingStyle = greetingConfig.style || 'dynamic'
      } catch (error) {
        logger.warn('⚠️ No se pudo cargar configuración, usando valores por defecto')
      }
    }
    
    const now = new Date()
    const hour = now.getHours()
    
    // Determinar saludo según la hora
    let timeGreeting
    if (hour >= 5 && hour < 12) {
      timeGreeting = ['¡Buenos días!', '¡Buen día!', '¡Excelente mañana!'][Math.floor(Math.random() * 3)]
    } else if (hour >= 12 && hour < 18) {
      timeGreeting = ['¡Buenas tardes!', '¡Qué tal la tarde!', '¡Excelente tarde!'][Math.floor(Math.random() * 3)]
    } else {
      timeGreeting = ['¡Buenas noches!', '¡Qué tal la noche!', '¡Excelente noche!'][Math.floor(Math.random() * 3)]
    }
    
    // Variaciones creativas de presentación
    const introVariations = [
      'Soy su asesor empresarial especializado',
      'Me presento como su consultor estratégico',
      'Estoy aquí como su especialista en soluciones empresariales',
      'Soy su experto en estrategias de negocio',
      'Me encuentro disponible como su asesor corporativo'
    ]
    
    const questionVariations = [
      '¿En qué aspecto estratégico puedo asistirle?',
      '¿Cómo puedo ayudarle a optimizar su situación empresarial?',
      '¿Qué desafío empresarial podemos analizar juntos?',
      '¿En qué área de su negocio puedo brindarle mi expertise?',
      '¿Qué estrategia empresarial le interesa desarrollar?'
    ]
    
    // Construir saludo personalizado
    let greeting = timeGreeting
    
    if (clientName) {
      greeting += ` ${clientName},`
    }
    
    if (representativeName) {
      greeting += ` mi nombre es ${representativeName} y s`
    } else {
      greeting += ` s`
    }
    
    greeting += `oy ${introVariations[Math.floor(Math.random() * introVariations.length)]}`
    
    if (configuredCompanyName && configuredCompanyName !== 'Tu empresa') {
      greeting += ` de ${configuredCompanyName}`
    }
    
    greeting += `. ${questionVariations[Math.floor(Math.random() * questionVariations.length)]}`
    
    return greeting
  }

  /**
   * 🎭 Inicializar perfiles de personalidad base
   */
  initializePersonalityProfiles() {
    // Perfil Consultor Profesional
    this.personalityProfiles.set('professional', {
      name: 'Consultor Profesional',
      description: 'Directo, eficiente, orientado a resultados empresariales',
      characteristics: {
        tone: 'formal',
        responseLength: 'concise',
        emojis: 'minimal',
        technicality: 'high',
        patience: 'medium',
        directness: 'high'
      },
      phraseTemplates: {
        greeting: this.generateDynamicGreeting('professional'),
        analysis_intro: 'Según mi análisis técnico, la situación presenta las siguientes consideraciones:',
        recommendation: 'Recomiendo implementar la siguiente estrategia:',
        closing: 'Quedo a su disposición para cualquier consulta adicional sobre este tema empresarial.'
      },
      specialization: ['fiscal', 'compliance', 'corporate_structure']
    })

    // Perfil Asesor Estratégico
    this.personalityProfiles.set('strategic', {
      name: 'Asesor Estratégico',
      description: 'Visionario, analítico, enfocado en estrategias a largo plazo',
      characteristics: {
        tone: 'consultative',
        responseLength: 'comprehensive',
        emojis: 'selective',
        technicality: 'very_high',
        patience: 'high',
        directness: 'medium'
      },
      phraseTemplates: {
        greeting: '🎯 Excelente momento para una consulta estratégica. Analicemos su situación desde una perspectiva integral.',
        analysis_intro: '📊 Mi evaluación estratégica identifica múltiples vectores de optimización:',
        recommendation: '🚀 La estrategia óptima contempla estos elementos interconectados:',
        closing: '💡 Esta planificación estratégica requiere seguimiento continuo. ¿Desea profundizar en algún aspecto específico?'
      },
      specialization: ['investment', 'offshore', 'optimization']
    })

    // Perfil Especialista Técnico
    this.personalityProfiles.set('technical', {
      name: 'Especialista Técnico',
      description: 'Experto en detalles técnicos, normativas específicas, implementación',
      characteristics: {
        tone: 'expert',
        responseLength: 'detailed',
        emojis: 'minimal',
        technicality: 'maximum',
        patience: 'very_high',
        directness: 'high'
      },
      phraseTemplates: {
        greeting: 'Como especialista en implementación técnica, procederemos con análisis detallado.',
        analysis_intro: 'El marco normativo aplicable establece específicamente:',
        recommendation: 'La implementación técnica requiere estos pasos críticos:',
        closing: 'La documentación técnica completa está disponible. ¿Requiere especificaciones adicionales?'
      },
      specialization: ['compliance', 'legal', 'implementation']
    })

    // Perfil Consultor Creativo
    this.personalityProfiles.set('innovative', {
      name: 'Consultor Innovador',
      description: 'Creativo, explorador de nuevas oportunidades, pensamiento lateral',
      characteristics: {
        tone: 'inspiring',
        responseLength: 'engaging',
        emojis: 'frequent',
        technicality: 'medium',
        patience: 'high',
        directness: 'medium'
      },
      phraseTemplates: {
        greeting: '💡 ¡Perfecto! Exploremos oportunidades innovadoras para optimizar su situación empresarial.',
        analysis_intro: '🔍 Identifizo patrones interesantes y oportunidades no convencionales:',
        recommendation: '🚀 Propongo esta estrategia innovadora que aprovecha tendencias emergentes:',
        closing: '🌟 Las posibilidades son amplias. ¿Le interesa explorar enfoques alternativos?'
      },
      specialization: ['criptomonedas', 'innovation', 'emerging_markets']
    })

    // Perfil Asesor Conservador
    this.personalityProfiles.set('conservative', {
      name: 'Asesor Conservador',
      description: 'Prudente, enfocado en seguridad y cumplimiento estricto',
      characteristics: {
        tone: 'cautious',
        responseLength: 'thorough',
        emojis: 'rare',
        technicality: 'high',
        patience: 'very_high',
        directness: 'medium'
      },
      phraseTemplates: {
        greeting: 'Procederemos con análisis exhaustivo priorizando la seguridad jurídica y el cumplimiento.',
        analysis_intro: '⚖️ Es fundamental considerar todos los riesgos potenciales:',
        recommendation: '🛡️ Recomiendo este enfoque conservador que minimiza exposición:',
        closing: 'La prudencia en la implementación es clave. ¿Desea revisar medidas adicionales de protección?'
      },
      specialization: ['risk_management', 'compliance', 'legal_protection']
    })
  }

  /**
   * 🎯 Analizar personalidad del cliente y adaptar respuesta
   */
  async analyzeClientPersonality(clientPhone, conversationHistory = [], currentContext = {}) {
    try {
      logger.info(`🎭 Analizando personalidad del cliente ${clientPhone}`)
      
      // Obtener datos de conversación existente
      const conversationData = this.memory ? this.memory.getConversationContext(clientPhone) : {}
      
      // Analizar patrones de comunicación del cliente
      const clientAnalysis = this.analyzeClientCommunicationPatterns(conversationHistory, conversationData)
      
      // Obtener historial de efectividad de personalidades
      const effectivenessHistory = this.personalityEffectiveness.get(clientPhone) || {}
      
      // Determinar personalidad base recomendada
      let recommendedPersonality = this.determineBasePersonality(clientAnalysis)
      
      // Ajustar basado en efectividad histórica
      if (Object.keys(effectivenessHistory).length > 0) {
        const mostSuccessful = this.findMostSuccessfulPersonality(effectivenessHistory)
        if (mostSuccessful && effectivenessHistory[mostSuccessful].success_rate > 0.7) {
          recommendedPersonality = mostSuccessful
        }
      }
      
      // Crear personalidad adaptada
      const adaptedPersonality = this.createAdaptedPersonality(
        recommendedPersonality, 
        clientAnalysis, 
        conversationData
      )
      
      // Guardar personalidad del cliente
      this.clientPersonalities.set(clientPhone, {
        basePersonality: recommendedPersonality,
        adaptedCharacteristics: adaptedPersonality,
        lastAnalysis: Date.now(),
        clientAnalysis: clientAnalysis
      })
      
      logger.info(`🎭 Personalidad adaptada: ${recommendedPersonality} para ${clientPhone}`)
      
      return adaptedPersonality
      
    } catch (error) {
      logger.error('❌ Error analizando personalidad del cliente:', error)
      return this.getDefaultPersonality()
    }
  }

  /**
   * 📊 Analizar patrones de comunicación del cliente
   */
  analyzeClientCommunicationPatterns(conversationHistory, conversationData) {
    const analysis = {
      messageComplexity: 'medium',
      technicalLevel: 'medium',
      urgencyLevel: 'medium',
      formalityPreference: 'formal',
      responseLength: 'medium',
      businessSophistication: 'intermediate',
      riskTolerance: 'medium',
      preferredTopics: []
    }
    
    if (conversationHistory.length === 0) return analysis
    
    // Analizar complejidad de mensajes
    const complexities = conversationHistory
      .filter(msg => msg.complexity)
      .map(msg => msg.complexity)
    
    if (complexities.length > 0) {
      const highComplexity = complexities.filter(c => c === 'high').length
      const total = complexities.length
      
      if (highComplexity / total > 0.6) analysis.messageComplexity = 'high'
      else if (highComplexity / total < 0.3) analysis.messageComplexity = 'low'
    }
    
    // Analizar nivel técnico basado en categorías empresariales
    const businessCategories = conversationHistory.flatMap(msg => msg.businessCategories || [])
    const advancedCategories = ['offshore', 'compliance', 'financial_crime', 'optimization']
    const hasAdvancedTopics = businessCategories.some(cat => advancedCategories.includes(cat))
    
    if (hasAdvancedTopics) {
      analysis.technicalLevel = 'high'
      analysis.businessSophistication = 'expert'
    }
    
    // Analizar urgencia basado en tono emocional
    const urgencyIndicators = conversationHistory
      .filter(msg => msg.emotionalTone && msg.emotionalTone.urgency > 0)
    
    if (urgencyIndicators.length / conversationHistory.length > 0.3) {
      analysis.urgencyLevel = 'high'
    }
    
    // Analizar preferencia de formalidad
    const informalIndicators = ['hola', 'gracias', 'perfecto', 'genial']
    const hasInformalLanguage = conversationHistory.some(msg => 
      informalIndicators.some(word => msg.userMessage?.toLowerCase().includes(word))
    )
    
    if (hasInformalLanguage) {
      analysis.formalityPreference = 'informal'
    }
    
    // Determinar temas preferidos
    analysis.preferredTopics = this.extractPreferredTopics(businessCategories)
    
    return analysis
  }

  /**
   * 🎯 Determinar personalidad base según análisis
   */
  determineBasePersonality(clientAnalysis) {
    // Lógica de decisión basada en patrones empresariales
    if (clientAnalysis.technicalLevel === 'high' && clientAnalysis.businessSophistication === 'expert') {
      return 'technical'
    }
    
    if (clientAnalysis.urgencyLevel === 'high' && clientAnalysis.formalityPreference === 'formal') {
      return 'professional'
    }
    
    if (clientAnalysis.messageComplexity === 'high' && clientAnalysis.preferredTopics.includes('investment')) {
      return 'strategic'
    }
    
    if (clientAnalysis.preferredTopics.includes('criptomonedas') || 
        clientAnalysis.preferredTopics.includes('innovation')) {
      return 'innovative'
    }
    
    if (clientAnalysis.riskTolerance === 'low' || 
        clientAnalysis.preferredTopics.includes('compliance')) {
      return 'conservative'
    }
    
    // Por defecto, profesional para consultoría empresarial
    return 'professional'
  }

  /**
   * 🏆 Encontrar personalidad más exitosa
   */
  findMostSuccessfulPersonality(effectivenessMetrics) {
    if (!effectivenessMetrics || Object.keys(effectivenessMetrics).length === 0) {
      return null
    }

    let bestPersonality = null
    let bestScore = 0

    for (const [personality, metrics] of Object.entries(effectivenessMetrics)) {
      const score = metrics.success_rate || 0
      if (score > bestScore) {
        bestScore = score
        bestPersonality = personality
      }
    }

    return bestPersonality
  }

  /**
   * 🛠️ Crear personalidad adaptada
   */
  createAdaptedPersonality(basePersonality, clientAnalysis, conversationData) {
    const baseProfile = this.personalityProfiles.get(basePersonality) || this.personalityProfiles.get('professional')
    
    // Clonar características base
    const adaptedCharacteristics = JSON.parse(JSON.stringify(baseProfile.characteristics))
    
    // Adaptar basado en análisis del cliente
    if (clientAnalysis.urgencyLevel === 'high') {
      adaptedCharacteristics.responseLength = 'concise'
      adaptedCharacteristics.directness = 'high'
    }
    
    if (clientAnalysis.technicalLevel === 'high') {
      adaptedCharacteristics.technicality = 'maximum'
    }
    
    if (clientAnalysis.formalityPreference === 'informal') {
      adaptedCharacteristics.tone = 'friendly'
      adaptedCharacteristics.emojis = 'frequent'
    }
    
    return {
      basePersonality: basePersonality,
      name: baseProfile.name,
      adaptedCharacteristics: adaptedCharacteristics,
      phraseTemplates: baseProfile.phraseTemplates,
      specialization: baseProfile.specialization,
      clientAdaptations: {
        urgencyLevel: clientAnalysis.urgencyLevel,
        technicalLevel: clientAnalysis.technicalLevel,
        formalityPreference: clientAnalysis.formalityPreference,
        businessSophistication: clientAnalysis.businessSophistication
      }
    }
  }

  /**
   * 📝 Generar instrucciones de personalidad para Gemini
   */
  generatePersonalityInstructions(adaptedPersonality) {
    const characteristics = adaptedPersonality.adaptedCharacteristics
    const templates = adaptedPersonality.phraseTemplates
    
    let instructions = `PERSONALIDAD ADAPTADA: ${adaptedPersonality.name}

CARACTERÍSTICAS DE COMUNICACIÓN:
- Tono: ${characteristics.tone}
- Nivel técnico: ${characteristics.technicality}
- Longitud de respuesta: ${characteristics.responseLength}
- Uso de emojis: ${characteristics.emojis}
- Directness: ${characteristics.directness}
- Paciencia: ${characteristics.patience}

PLANTILLAS DE FRASES:
- Saludo: "${templates.greeting}"
- Introducción de análisis: "${templates.analysis_intro}"
- Recomendaciones: "${templates.recommendation}"
- Cierre: "${templates.closing}"

ESPECIALIZACIÓN:
${adaptedPersonality.specialization.join(', ')}

ADAPTACIONES ESPECÍFICAS:
- Nivel de urgencia del cliente: ${adaptedPersonality.clientAdaptations.urgencyLevel}
- Sofisticación empresarial: ${adaptedPersonality.clientAdaptations.businessSophistication}
- Preferencia de formalidad: ${adaptedPersonality.clientAdaptations.formalityPreference}

INSTRUCCIONES DE RESPUESTA:
1. Mantén el tono y estilo según las características definidas
2. Usa las plantillas de frases como guía
3. Adapta el nivel técnico según la sofisticación del cliente
4. Respeta las preferencias de formalidad identificadas
5. Enfócate en las áreas de especialización cuando sea relevante`

    return {
      personality: adaptedPersonality.basePersonality,
      instructions: instructions,
      tone: characteristics.tone,
      style: characteristics.responseLength,
      techLevel: characteristics.technicality,
      useEmojis: characteristics.emojis !== 'minimal'
    }
  }

  /**
   * ✅ Registrar éxito de interacción con personalidad específica
   */
  recordPersonalitySuccess(clientPhone, personalityType, wasSuccessful) {
    if (!this.personalityEffectiveness.has(clientPhone)) {
      this.personalityEffectiveness.set(clientPhone, {})
    }
    
    const clientEffectiveness = this.personalityEffectiveness.get(clientPhone)
    
    if (!clientEffectiveness[personalityType]) {
      clientEffectiveness[personalityType] = {
        interaction_count: 0,
        success_count: 0,
        success_rate: 0,
        last_used: Date.now()
      }
    }
    
    const personalityMetrics = clientEffectiveness[personalityType]
    personalityMetrics.interaction_count++
    if (wasSuccessful) personalityMetrics.success_count++
    personalityMetrics.success_rate = personalityMetrics.success_count / personalityMetrics.interaction_count
    personalityMetrics.last_used = Date.now()
    
    logger.info(`📊 Éxito de personalidad registrado: ${personalityType} - ${wasSuccessful ? 'Exitoso' : 'Fallido'}`)
  }

  /**
   * 🎭 Obtener personalidad por defecto
   */
  getDefaultPersonality() {
    return this.createAdaptedPersonality('professional', {
      messageComplexity: 'medium',
      technicalLevel: 'medium',
      urgencyLevel: 'medium',
      formalityPreference: 'formal',
      responseLength: 'medium',
      businessSophistication: 'intermediate'
    }, {})
  }

  /**
   * 📊 Extraer temas preferidos
   */
  extractPreferredTopics(businessCategories) {
    const categoryCount = {}
    businessCategories.forEach(category => {
      categoryCount[category] = (categoryCount[category] || 0) + 1
    })
    
    return Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category)
  }

  /**
   * 📋 Obtener todas las personalidades disponibles
   */
  getAvailablePersonalities() {
    const personalities = []
    for (const [key, profile] of this.personalityProfiles.entries()) {
      personalities.push({
        id: key,
        name: profile.name,
        description: profile.description,
        characteristics: profile.characteristics,
        specialization: profile.specialization
      })
    }
    return personalities
  }

  /**
   * 🎭 Obtener perfil de personalidad específico
   */
  getPersonalityProfile(personalityId) {
    return this.personalityProfiles.get(personalityId) || null
  }

  /**
   * 📊 Obtener estadísticas de uso de personalidades
   */
  getPersonalityUsageStats() {
    const stats = {}
    
    for (const [clientPhone, effectiveness] of this.personalityEffectiveness.entries()) {
      for (const [personality, metrics] of Object.entries(effectiveness)) {
        if (!stats[personality]) {
          stats[personality] = {
            totalUses: 0,
            totalSuccesses: 0,
            averageSuccessRate: 0,
            clients: 0
          }
        }
        
        stats[personality].totalUses += metrics.interaction_count
        stats[personality].totalSuccesses += metrics.success_count
        stats[personality].clients++
      }
    }
    
    // Calcular promedios
    Object.values(stats).forEach(stat => {
      stat.averageSuccessRate = stat.totalUses > 0 ? stat.totalSuccesses / stat.totalUses : 0
    })
    
    return stats
  }
}

module.exports = AdaptivePersonalitySystem