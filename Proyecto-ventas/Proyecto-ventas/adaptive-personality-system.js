/**
 * 🎭 ADAPTIVE PERSONALITY SYSTEM - MIGRADO A SUPABASE
 * 
 * Sistema que adapta dinámicamente la personalidad y estilo comunicativo 
 * del agente basado en el perfil del cliente y patrones de conversación exitosos.
 * TODOS los datos de personalidades ahora usan Supabase en lugar de RAM.
 */

class AdaptivePersonalitySystem {
  constructor(databaseService) {
    this.db = databaseService // Recibe el servicio completo de base de datos
    this.initialized = false
    
    // Perfiles base de personalidad (estáticos)
    this.personalityProfiles = new Map()
    this.initializePersonalityProfiles()
  }

  /**
   * 🚀 Inicializar el sistema de personalidad adaptativa
   */
  async initialize() {
    console.log('🎭 Inicializando Adaptive Personality System (100% Supabase)...')
    
    // Verificar que el servicio de base de datos esté disponible
    if (!this.db) {
      throw new Error('Servicio de base de datos no proporcionado')
    }
    
    // Verificar que Supabase esté configurado (usando .client)
    if (!this.db.client) {
      throw new Error('Cliente Supabase no configurado en el servicio de base de datos')
    }
    
    this.initialized = true
    console.log('✅ Sistema de Personalidad Adaptativa inicializado con persistencia en Supabase')
  }

  /**
   * 🎭 Inicializar perfiles de personalidad base
   */
  initializePersonalityProfiles() {
    // Perfil Profesional y Directo
    this.personalityProfiles.set('professional', {
      name: 'Profesional',
      description: 'Directo, eficiente, orientado a resultados',
      characteristics: {
        tone: 'formal',
        responseLength: 'concise',
        emojis: 'minimal',
        technicality: 'high',
        patience: 'medium',
        enthusiasm: 'low'
      },
      phraseTemplates: {
        greeting: 'Buenos días/tardes. ¿En qué puedo asistirle?',
        product_intro: 'Le recomiendo este producto por las siguientes características:',
        closing: 'Quedo a su disposición para cualquier consulta adicional.'
      }
    })

    // Perfil Amigable y Cercano
    this.personalityProfiles.set('friendly', {
      name: 'Amigable',
      description: 'Cálido, empático, conversacional',
      characteristics: {
        tone: 'informal',
        responseLength: 'medium',
        emojis: 'frequent',
        technicality: 'medium',
        patience: 'high',
        enthusiasm: 'high'
      },
      phraseTemplates: {
        greeting: '¡Hola! 😊 ¿Cómo estás? ¿En qué te puedo ayudar hoy?',
        product_intro: '¡Tengo justo lo que necesitas! Mira este producto increíble 🌟',
        closing: '¡Espero haberte ayudado! Cualquier cosa, aquí estoy 😊'
      }
    })

    // Perfil Técnico y Detallado
    this.personalityProfiles.set('technical', {
      name: 'Técnico',
      description: 'Detallado, preciso, informativo',
      characteristics: {
        tone: 'neutral',
        responseLength: 'detailed',
        emojis: 'rare',
        technicality: 'very_high',
        patience: 'very_high',
        enthusiasm: 'medium'
      },
      phraseTemplates: {
        greeting: 'Saludos. Soy su asistente técnico especializado.',
        product_intro: 'Basándome en sus especificaciones, este producto presenta las siguientes características técnicas:',
        closing: 'Si requiere información técnica adicional, estaré disponible.'
      }
    })

    // Perfil Entusiasta y Vendedor
    this.personalityProfiles.set('enthusiastic', {
      name: 'Entusiasta',
      description: 'Energético, persuasivo, motivador',
      characteristics: {
        tone: 'enthusiastic',
        responseLength: 'medium',
        emojis: 'very_frequent',
        technicality: 'low',
        patience: 'medium',
        enthusiasm: 'very_high'
      },
      phraseTemplates: {
        greeting: '¡Hola! 🔥 ¡Qué emoción tenerte aquí! ¿Listo para encontrar algo increíble?',
        product_intro: '¡WOW! 🚀 Este producto va a cambiar tu vida. ¡Es ESPECTACULAR!',
        closing: '¡Ha sido genial ayudarte! ¡Nos vemos pronto! 🎉'
      }
    })

    // Perfil Empático y Consultivo
    this.personalityProfiles.set('consultative', {
      name: 'Consultivo',
      description: 'Empático, comprensivo, orientado a escuchar',
      characteristics: {
        tone: 'empathetic',
        responseLength: 'thoughtful',
        emojis: 'selective',
        technicality: 'adaptive',
        patience: 'very_high',
        enthusiasm: 'moderate'
      },
      phraseTemplates: {
        greeting: 'Hola, entiendo que estás buscando algo específico. Cuéntame más sobre lo que necesitas.',
        product_intro: 'Considerando lo que me has contado, creo que esto podría funcionar bien para ti.',
        closing: 'Espero haber respondido a tus dudas. Si necesitas pensar más, aquí estaré.'
      }
    })
  }

  /**
   * 🧠 Analizar cliente y determinar personalidad óptima - MIGRADO A SUPABASE
   */
  async analyzeClientPersonality(clientId, conversationHistory, contextData) {
    try {
      // Obtener personalidad actual del cliente desde Supabase
      const clientPersonality = await this.getClientPersonality(clientId)
      
      // Analizar patrones del cliente
      const clientAnalysis = this.analyzeClientPatterns(conversationHistory, contextData)
      
      // Determinar personalidad base recomendada
      let recommendedPersonality = this.determineBasePersonality(clientAnalysis)
      
      // Ajustar basado en historial de éxito con este cliente
      if (clientPersonality && clientPersonality.effectiveness_metrics) {
        const mostSuccessful = this.findMostSuccessfulPersonality(clientPersonality.effectiveness_metrics)
        if (mostSuccessful) {
          recommendedPersonality = mostSuccessful
        }
      }

      // Crear personalidad adaptada
      const adaptedPersonality = this.createAdaptedPersonality(
        recommendedPersonality, 
        clientAnalysis, 
        clientPersonality
      )

      // Actualizar personalidad del cliente en Supabase
      await this.updateClientPersonality(clientId, {
        current_personality: recommendedPersonality,
        personality_weights: adaptedPersonality.weights,
        adaptation_history: [
          ...(clientPersonality?.adaptation_history || []).slice(-9), // Mantener últimas 10
          {
            timestamp: new Date().toISOString(),
            personality: recommendedPersonality,
            adaptations: adaptedPersonality.adaptations,
            context: clientAnalysis
          }
        ],
        effectiveness_metrics: adaptedPersonality.effectivenessUpdate || clientPersonality?.effectiveness_metrics || {}
      })

      return adaptedPersonality
    } catch (error) {
      console.error('Error analizando personalidad del cliente:', error)
      
      // Fallback a personalidad por defecto
      return this.createAdaptedPersonality('friendly', {
        communicationStyle: 'neutral',
        responseLength: 'medium',
        technicalLevel: 'medium'
      }, null)
    }
  }

  /**
   * 👤 Obtener personalidad del cliente desde Supabase
   */
  async getClientPersonality(clientId) {
    try {
      const { data, error } = await this.db.client
        .from('client_personalities')
        .select('*')
        .eq('client_id', clientId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error obteniendo personalidad del cliente:', error)
      }

      return data || null
    } catch (error) {
      console.error('Error en getClientPersonality:', error)
      return null
    }
  }

  /**
   * ✏️ Actualizar personalidad del cliente en Supabase
   */
  async updateClientPersonality(clientId, personalityData) {
    try {
      const { error } = await this.db.client
        .from('client_personalities')
        .upsert({
          client_id: clientId,
          current_personality: personalityData.current_personality,
          personality_weights: personalityData.personality_weights,
          adaptation_history: personalityData.adaptation_history,
          effectiveness_metrics: personalityData.effectiveness_metrics,
          last_adaptation: new Date().toISOString(),
          total_adaptations: (personalityData.adaptation_history?.length || 0),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'client_id'
        })

      if (error) {
        console.error('Error actualizando personalidad del cliente:', error)
      }
    } catch (error) {
      console.error('Error en updateClientPersonality:', error)
    }
  }

  /**
   * 📊 Analizar patrones de comunicación del cliente
   */
  analyzeClientPatterns(conversationHistory, contextData) {
    const analysis = {
      communicationStyle: 'neutral',
      responseLength: 'medium',
      technicalLevel: 'medium',
      urgencyLevel: 'medium',
      formalityPreference: 'neutral',
      emotionalTone: 'neutral',
      decisionMakingStyle: 'moderate'
    }

    if (!conversationHistory || conversationHistory.length === 0) {
      return analysis
    }

    // Analizar mensajes del usuario
    const userMessages = conversationHistory.filter(msg => msg.role === 'user')
    
    if (userMessages.length === 0) {
      return analysis
    }

    // Analizar longitud promedio de mensajes
    const avgLength = userMessages.reduce((sum, msg) => sum + msg.message.length, 0) / userMessages.length
    analysis.responseLength = avgLength > 100 ? 'long' : avgLength < 30 ? 'short' : 'medium'

    // Analizar nivel técnico (presencia de términos técnicos)
    const technicalTerms = ['gb', 'ram', 'procesador', 'especificaciones', 'características']
    const technicalCount = userMessages.reduce((count, msg) => {
      return count + technicalTerms.filter(term => msg.message.toLowerCase().includes(term)).length
    }, 0)
    
    analysis.technicalLevel = technicalCount > 3 ? 'high' : technicalCount > 1 ? 'medium' : 'low'

    // Analizar urgencia
    const urgentWords = ['urgente', 'rápido', 'ya', 'pronto', 'inmediato']
    const urgencyCount = userMessages.reduce((count, msg) => {
      return count + urgentWords.filter(word => msg.message.toLowerCase().includes(word)).length
    }, 0)
    
    analysis.urgencyLevel = urgencyCount > 0 ? 'high' : 'medium'

    // Analizar formalidad
    const formalWords = ['usted', 'señor', 'señora', 'por favor', 'cordialmente']
    const informalWords = ['hey', 'hola', 'qué tal', 'genial', 'súper']
    
    const formalCount = userMessages.reduce((count, msg) => {
      return count + formalWords.filter(word => msg.message.toLowerCase().includes(word)).length
    }, 0)
    
    const informalCount = userMessages.reduce((count, msg) => {
      return count + informalWords.filter(word => msg.message.toLowerCase().includes(word)).length
    }, 0)
    
    if (formalCount > informalCount) {
      analysis.formalityPreference = 'formal'
    } else if (informalCount > formalCount) {
      analysis.formalityPreference = 'informal'
    }

    return analysis
  }

  /**
   * 🎯 Determinar personalidad base según análisis
   */
  determineBasePersonality(clientAnalysis) {
    // Lógica de decisión basada en patrones
    if (clientAnalysis.technicalLevel === 'high') {
      return 'technical'
    }
    
    if (clientAnalysis.formalityPreference === 'formal') {
      return 'professional'
    }
    
    if (clientAnalysis.urgencyLevel === 'high') {
      return 'enthusiastic'
    }
    
    if (clientAnalysis.responseLength === 'long') {
      return 'consultative'
    }
    
    // Por defecto, amigable
    return 'friendly'
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
  createAdaptedPersonality(basePersonality, clientAnalysis, clientHistory) {
    const baseProfile = this.personalityProfiles.get(basePersonality) || this.personalityProfiles.get('friendly')
    
    // Clonar perfil base
    const adaptedProfile = JSON.parse(JSON.stringify(baseProfile))
    
    // Aplicar adaptaciones basadas en análisis del cliente
    const adaptations = []

    // Adaptar nivel de emojis
    if (clientAnalysis.formalityPreference === 'formal') {
      adaptedProfile.characteristics.emojis = 'minimal'
      adaptations.push('emojis_reduced_for_formality')
    } else if (clientAnalysis.formalityPreference === 'informal') {
      adaptedProfile.characteristics.emojis = 'frequent'
      adaptations.push('emojis_increased_for_informality')
    }

    // Adaptar longitud de respuesta
    if (clientAnalysis.responseLength === 'short') {
      adaptedProfile.characteristics.responseLength = 'concise'
      adaptations.push('responses_made_concise')
    } else if (clientAnalysis.responseLength === 'long') {
      adaptedProfile.characteristics.responseLength = 'detailed'
      adaptations.push('responses_made_detailed')
    }

    // Adaptar nivel técnico
    if (clientAnalysis.technicalLevel === 'high') {
      adaptedProfile.characteristics.technicality = 'very_high'
      adaptations.push('technicality_increased')
    } else if (clientAnalysis.technicalLevel === 'low') {
      adaptedProfile.characteristics.technicality = 'low'
      adaptations.push('technicality_decreased')
    }

    // Calcular pesos de personalidad (mezcla)
    const weights = {}
    weights[basePersonality] = 0.7

    // Agregar personalidades secundarias basadas en análisis
    if (clientAnalysis.technicalLevel === 'high' && basePersonality !== 'technical') {
      weights['technical'] = 0.2
    }
    if (clientAnalysis.urgencyLevel === 'high' && basePersonality !== 'enthusiastic') {
      weights['enthusiastic'] = 0.1
    }

    return {
      basePersonality,
      profile: adaptedProfile,
      adaptations,
      weights,
      confidence: this.calculateConfidence(clientAnalysis, clientHistory),
      analysisUsed: clientAnalysis
    }
  }

  /**
   * 📊 Calcular confianza en la personalidad seleccionada
   */
  calculateConfidence(clientAnalysis, clientHistory) {
    let confidence = 0.5 // Base

    // Aumentar confianza si tenemos historial
    if (clientHistory && clientHistory.adaptation_history?.length > 0) {
      confidence += 0.2
    }

    // Aumentar confianza si los patrones son claros
    const patterns = Object.values(clientAnalysis)
    const strongPatterns = patterns.filter(p => p === 'high' || p === 'formal' || p === 'informal').length
    confidence += strongPatterns * 0.1

    return Math.min(1.0, confidence)
  }

  /**
   * 🎭 GENERAR INSTRUCCIONES DE PERSONALIDAD - FUNCIÓN CLAVE PARA RESPUESTAS NATURALES
   */
  generatePersonalityInstructions(adaptedPersonality) {
    if (!adaptedPersonality || !adaptedPersonality.profile) {
      return {
        tone: 'friendly',
        style: 'conversational',
        emojis: 'moderate',
        technicality: 'medium',
        templates: {
          greeting: '¡Hola! ¿En qué te puedo ayudar?',
          product_intro: 'Te recomiendo este producto:',
          closing: '¿Hay algo más en lo que pueda ayudarte?'
        }
      }
    }

    const profile = adaptedPersonality.profile
    const characteristics = profile.characteristics
    
    return {
      tone: characteristics.tone || 'friendly',
      style: characteristics.responseLength || 'medium',
      emojis: characteristics.emojis || 'moderate',
      technicality: characteristics.technicality || 'medium',
      patience: characteristics.patience || 'medium',
      enthusiasm: characteristics.enthusiasm || 'medium',
      templates: profile.phraseTemplates || {
        greeting: '¡Hola! ¿En qué te puedo ayudar?',
        product_intro: 'Te recomiendo este producto:',
        closing: '¿Hay algo más en lo que pueda ayudarte?'
      },
      adaptations: adaptedPersonality.adaptations || [],
      confidence: adaptedPersonality.confidence || 0.5,
      basePersonality: adaptedPersonality.basePersonality || 'friendly',
      weights: adaptedPersonality.weights || { friendly: 1.0 }
    }
  }

  /**
   * 🎯 Obtener recomendación de personalidad para cliente - MIGRADO A SUPABASE
   */
  async getPersonalityRecommendation(clientId, conversationContext = {}) {
    try {
      const clientPersonality = await this.getClientPersonality(clientId)
      
      if (!clientPersonality) {
        return {
          recommended: 'friendly',
          confidence: 0.3,
          reason: 'Cliente nuevo, usando personalidad por defecto'
        }
      }

      // Verificar si necesita adaptación
      const lastAdaptation = new Date(clientPersonality.last_adaptation || 0)
      const hoursSinceAdaptation = (Date.now() - lastAdaptation.getTime()) / (1000 * 60 * 60)

      if (hoursSinceAdaptation < 1) {
        // Usar personalidad actual si fue adaptada recientemente
        return {
          recommended: clientPersonality.current_personality,
          confidence: 0.9,
          reason: 'Personalidad adaptada recientemente'
        }
      }

      // Analizar efectividad reciente
      const effectiveness = await this.getPersonalityEffectiveness(clientId, clientPersonality.current_personality)
      
      if (effectiveness && effectiveness.effectiveness_score > 0.7) {
        return {
          recommended: clientPersonality.current_personality,
          confidence: effectiveness.effectiveness_score,
          reason: 'Personalidad actual funciona bien'
        }
      }

      // Necesita nueva adaptación
      return {
        recommended: clientPersonality.current_personality,
        confidence: 0.5,
        reason: 'Podría necesitar adaptación',
        suggestAdaptation: true
      }
    } catch (error) {
      console.error('Error obteniendo recomendación de personalidad:', error)
      return {
        recommended: 'friendly',
        confidence: 0.3,
        reason: 'Error obteniendo datos, usando por defecto'
      }
    }
  }

  /**
   * 📈 Obtener efectividad de personalidad para cliente
   */
  async getPersonalityEffectiveness(clientId, personalityType) {
    try {
      const { data, error } = await this.db.client
        .from('personality_effectiveness')
        .select('*')
        .eq('client_id', clientId)
        .eq('personality_type', personalityType)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error obteniendo efectividad:', error)
      }

      return data || null
    } catch (error) {
      console.error('Error en getPersonalityEffectiveness:', error)
      return null
    }
  }

  /**
   * ✅ Registrar éxito de interacción con personalidad específica - MIGRADO A SUPABASE
   */
  async recordPersonalitySuccess(clientId, personalityType, wasSuccessful) {
    try {
      const { data: existing, error: selectError } = await this.db.client
        .from('personality_effectiveness')
        .select('*')
        .eq('client_id', clientId)
        .eq('personality_type', personalityType)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error consultando efectividad:', selectError)
      }

      if (existing) {
        // Actualizar registro existente
        const newInteractionCount = (existing.interaction_count || 0) + 1
        const newSuccessCount = (existing.success_count || 0) + (wasSuccessful ? 1 : 0)
        const newEffectivenessScore = newSuccessCount / newInteractionCount

        await this.db.client
          .from('personality_effectiveness')
          .update({
            interaction_count: newInteractionCount,
            success_count: newSuccessCount,
            effectiveness_score: newEffectivenessScore,
            last_used: new Date().toISOString()
          })
          .eq('id', existing.id)
      } else {
        // Crear nuevo registro
        await this.db.client
          .from('personality_effectiveness')
          .insert({
            client_id: clientId,
            personality_type: personalityType,
            interaction_count: 1,
            success_count: wasSuccessful ? 1 : 0,
            effectiveness_score: wasSuccessful ? 1.0 : 0.0,
            last_used: new Date().toISOString()
          })
      }

      console.log(`📊 Éxito de personalidad registrado: ${personalityType} - ${wasSuccessful ? 'Exitoso' : 'Fallido'} (Supabase)`)
    } catch (error) {
      console.error('Error registrando éxito de personalidad:', error)
    }
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
        characteristics: profile.characteristics
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
   * 📊 Obtener estadísticas de uso de personalidades - MIGRADO A SUPABASE
   */
  async getPersonalityUsageStats(limitDays = 7) {
    try {
      const startDate = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await this.db.client
        .from('personality_effectiveness')
        .select('*')
        .gte('last_used', startDate)

      if (error) {
        console.error('Error obteniendo estadísticas:', error)
        return {}
      }

      // Agregar estadísticas
      const stats = {}
      data?.forEach(record => {
        const type = record.personality_type
        if (!stats[type]) {
          stats[type] = {
            totalInteractions: 0,
            totalSuccesses: 0,
            avgEffectiveness: 0,
            uniqueClients: new Set()
          }
        }

        stats[type].totalInteractions += record.interaction_count || 0
        stats[type].totalSuccesses += record.success_count || 0
        stats[type].uniqueClients.add(record.client_id)
      })

      // Calcular promedios
      Object.values(stats).forEach(stat => {
        stat.successRate = stat.totalInteractions > 0 ? stat.totalSuccesses / stat.totalInteractions : 0
        stat.uniqueClients = stat.uniqueClients.size
      })

      return stats
    } catch (error) {
      console.error('Error en getPersonalityUsageStats:', error)
      return {}
    }
  }
}

export default AdaptivePersonalitySystem