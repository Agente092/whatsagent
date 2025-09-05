/**
 * 🧠 REINFORCEMENT LEARNING ENGINE - MIGRADO A SUPABASE
 * 
 * Sistema de aprendizaje por refuerzo 100% persistente en Supabase.
 * TODOS los datos de Q-Learning ahora se almacenan en base de datos.
 * Optimiza las conversaciones del agente WhatsApp basado en el éxito de las interacciones.
 */

class ReinforcementLearningEngine {
  constructor(databaseService) {
    this.db = databaseService // Recibe el servicio completo de base de datos
    this.learningRate = 0.1 // Tasa de aprendizaje
    this.discountFactor = 0.9 // Factor de descuento
    this.explorationRate = 0.1 // Rate de exploración vs explotación
    this.initialized = false
  }

  /**
   * 🚀 Inicializar el motor de RL
   */
  async initialize() {
    console.log('🧠 Inicializando Reinforcement Learning Engine (100% Supabase)...')
    
    // Verificar que el servicio de base de datos esté disponible
    if (!this.db) {
      throw new Error('Servicio de base de datos no proporcionado')
    }
    
    // Verificar que Supabase esté configurado (usando .client)
    if (!this.db.client) {
      throw new Error('Cliente Supabase no configurado en el servicio de base de datos')
    }
    
    this.initialized = true
    console.log('✅ RL Engine inicializado con persistencia en Supabase')
  }

  /**
   * 🎯 Registrar una acción tomada en un estado específico - MIGRADO A SUPABASE
   */
  async recordAction(clientId, conversationState, action, context = {}) {
    try {
      const stateKey = this.generateStateKey(conversationState, context)
      const actionKey = this.generateActionKey(action)
      
      // Buscar o crear entrada en Q-table
      const { data: existingData, error: selectError } = await this.db.client
        .from('q_learning_data')
        .select('*')
        .eq('client_id', clientId)
        .eq('state', stateKey)
        .eq('action', actionKey)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error consultando Q-table:', selectError)
      }

      if (existingData) {
        // Actualizar entrada existente
        const { error: updateError } = await this.db.client
          .from('q_learning_data')
          .update({
            exploration_count: (existingData.exploration_count || 0) + 1,
            timestamp: new Date().toISOString()
          })
          .eq('id', existingData.id)

        if (updateError) {
          console.error('Error actualizando acción:', updateError)
        }
      } else {
        // Crear nueva entrada
        const { error: insertError } = await this.db.client
          .from('q_learning_data')
          .insert({
            client_id: clientId,
            state: stateKey,
            action: actionKey,
            q_value: 0,
            exploration_count: 1,
            success_count: 0,
            learning_rate: this.learningRate
          })

        if (insertError) {
          console.error('Error insertando nueva acción:', insertError)
        }
      }

      console.log(`🎯 Acción registrada: ${actionKey} en estado ${stateKey} (Supabase)`)
      
      return {
        stateKey,
        actionKey,
        currentQValue: existingData?.q_value || 0
      }
    } catch (error) {
      console.error('Error en recordAction:', error)
      return null
    }
  }

  /**
   * 🏆 Registrar el resultado de una conversación para aprendizaje - MIGRADO A SUPABASE
   */
  async recordConversationOutcome(clientId, conversationId, outcome) {
    try {
      const outcomeData = {
        clientId,
        conversationId,
        success: outcome.success || false,
        conversationLength: outcome.conversationLength || 0,
        finalState: outcome.finalState || 'unknown',
        satisfactionLevel: outcome.satisfactionLevel || 0.5, // 0-1
        conversionToSale: outcome.conversionToSale || false,
        responseTime: outcome.responseTime || 0,
        timestamp: Date.now(),
        ...outcome
      }

      // Calcular recompensa
      const reward = this.calculateReward(outcomeData)

      // Guardar patrón de cliente
      await this.saveClientPattern(clientId, outcomeData, reward)

      // Actualizar Q-values para este cliente
      await this.updateQValues(clientId, reward, outcomeData.success)

      console.log(`🏆 Resultado registrado: Conversación ${conversationId} - Recompensa: ${reward} (Supabase)`)
      
      return reward
    } catch (error) {
      console.error('Error en recordConversationOutcome:', error)
      return 0
    }
  }

  /**
   * 📊 Guardar patrón de cliente en Supabase
   */
  async saveClientPattern(clientId, outcomeData, reward) {
    try {
      const patternData = {
        conversationLength: outcomeData.conversationLength,
        success: outcomeData.success,
        conversionToSale: outcomeData.conversionToSale,
        satisfactionLevel: outcomeData.satisfactionLevel,
        responseTime: outcomeData.responseTime,
        reward: reward
      }

      // Upsert patrón general
      await this.db.client
        .from('client_patterns')
        .upsert({
          client_id: clientId,
          pattern_type: 'conversation_outcome',
          pattern_data: patternData,
          confidence_score: outcomeData.satisfactionLevel,
          occurrence_count: 1
        }, {
          onConflict: 'client_id,pattern_type',
          ignoreDuplicates: false
        })

      // Guardar patrón de tiempo si es relevante
      const hourOfDay = new Date().getHours()
      await this.db.client
        .from('client_patterns')
        .upsert({
          client_id: clientId,
          pattern_type: 'time_preference',
          pattern_data: { 
            hour: hourOfDay, 
            success: outcomeData.success,
            responseTime: outcomeData.responseTime 
          },
          confidence_score: outcomeData.success ? 0.8 : 0.3,
          occurrence_count: 1
        }, {
          onConflict: 'client_id,pattern_type',
          ignoreDuplicates: false
        })

    } catch (error) {
      console.error('Error guardando patrón de cliente:', error)
    }
  }

  /**
   * 💰 Calcular recompensa basada en el resultado de la conversación
   */
  calculateReward(outcomeData) {
    let reward = 0
    
    // Recompensa base por éxito de conversación
    if (outcomeData.success) {
      reward += 10
    }
    
    // Recompensa por conversión a venta
    if (outcomeData.conversionToSale) {
      reward += 20
    }
    
    // Recompensa por satisfacción del cliente
    reward += outcomeData.satisfactionLevel * 5
    
    // Penalización por conversaciones muy largas (ineficiencia)
    if (outcomeData.conversationLength > 15) {
      reward -= 2
    }
    
    // Bonificación por conversaciones eficientes
    if (outcomeData.conversationLength <= 5 && outcomeData.success) {
      reward += 3
    }
    
    // Penalización por tiempo de respuesta muy lento
    if (outcomeData.responseTime > 5000) { // más de 5 segundos
      reward -= 1
    }
    
    // Bonificación por respuesta rápida
    if (outcomeData.responseTime <= 2000) { // menos de 2 segundos
      reward += 1
    }
    
    return Math.max(-10, Math.min(50, reward)) // Limitar recompensa entre -10 y 50
  }

  /**
   * 🔄 Actualizar valores Q basado en la recompensa recibida - MIGRADO A SUPABASE
   */
  async updateQValues(clientId, reward, wasSuccessful) {
    try {
      // Obtener todas las acciones recientes del cliente (últimas 24 horas)
      const { data: recentActions, error } = await this.db.client
        .from('q_learning_data')
        .select('*')
        .eq('client_id', clientId)
        .gte('timestamp', new Date(Date.now() - 24*60*60*1000).toISOString())

      if (error) {
        console.error('Error obteniendo acciones recientes:', error)
        return
      }

      if (!recentActions || recentActions.length === 0) {
        return
      }

      // Actualizar Q-values usando el algoritmo Q-Learning
      for (const actionData of recentActions) {
        const currentQ = actionData.q_value || 0
        const newQ = currentQ + this.learningRate * (reward - currentQ)
        
        let newSuccessCount = actionData.success_count || 0
        if (wasSuccessful) {
          newSuccessCount += 1
        }

        // Actualizar en Supabase
        await this.db.client
          .from('q_learning_data')
          .update({
            q_value: newQ,
            reward: reward,
            success_count: newSuccessCount,
            timestamp: new Date().toISOString()
          })
          .eq('id', actionData.id)
      }

      console.log(`🔄 Q-values actualizados para ${recentActions.length} acciones (recompensa: ${reward})`)
    } catch (error) {
      console.error('Error actualizando Q-values:', error)
    }
  }

  /**
   * 🎯 Recomendar la mejor acción para un estado dado - MIGRADO A SUPABASE
   */
  async recommendAction(clientId, conversationState, context = {}, possibleActions = []) {
    try {
      const stateKey = this.generateStateKey(conversationState, context)
      
      // Obtener acciones conocidas para este estado y cliente
      const { data: stateActions, error } = await this.db.client
        .from('q_learning_data')
        .select('*')
        .eq('client_id', clientId)
        .eq('state', stateKey)
        .order('q_value', { ascending: false })

      if (error) {
        console.error('Error obteniendo acciones del estado:', error)
        return this.randomAction(possibleActions)
      }

      if (!stateActions || stateActions.length === 0) {
        return this.randomAction(possibleActions)
      }

      // Estrategia epsilon-greedy
      if (Math.random() < this.explorationRate) {
        // Exploración: acción aleatoria
        console.log(`🎲 Exploración: acción aleatoria (${this.explorationRate * 100}% prob)`)
        return this.randomAction(possibleActions)
      }

      // Explotación: mejor acción conocida
      const bestAction = stateActions[0] // Ya ordenado por q_value descendente
      
      console.log(`🎯 Explotación: Mejor acción ${bestAction.action} (Q-value: ${bestAction.q_value})`)
      
      return {
        action: this.parseActionKey(bestAction.action),
        confidence: this.normalizeQValue(bestAction.q_value),
        qValue: bestAction.q_value,
        timesExecuted: bestAction.exploration_count,
        successRate: bestAction.success_count / (bestAction.exploration_count || 1)
      }
    } catch (error) {
      console.error('Error en recommendAction:', error)
      return this.randomAction(possibleActions)
    }
  }

  /**
   * 💬 Generar recomendaciones conversacionales - FUNCIÓN CLAVE PARA EL COORDINADOR
   */
  async generateConversationalRecommendations(clientId, conversationState, context = {}) {
    try {
      const recommendations = []

      // Obtener métricas del cliente
      const metrics = await this.getClientPerformanceMetrics(clientId)
      
      // Recomendar acción basada en RL
      const actionRecommendation = await this.recommendAction(
        clientId, 
        conversationState, 
        context, 
        ['ask_question', 'show_product', 'provide_info', 'close_conversation']
      )

      recommendations.push({
        type: 'rl_action',
        recommendation: actionRecommendation.action,
        confidence: actionRecommendation.confidence,
        source: 'reinforcement_learning',
        metadata: {
          qValue: actionRecommendation.qValue,
          timesExecuted: actionRecommendation.timesExecuted,
          successRate: actionRecommendation.successRate
        }
      })

      // Recomendaciones basadas en patrones históricos
      if (metrics.successRate > 0.7) {
        recommendations.push({
          type: 'conversation_style',
          recommendation: 'continue_current_approach',
          confidence: 0.8,
          source: 'historical_success',
          metadata: {
            successRate: metrics.successRate,
            totalConversations: metrics.totalConversations
          }
        })
      }

      // Recomendaciones de estado específicas
      if (conversationState === 'browsing') {
        recommendations.push({
          type: 'state_optimization',
          recommendation: 'show_featured_products',
          confidence: 0.6,
          source: 'state_analysis'
        })
      } else if (conversationState === 'interested') {
        recommendations.push({
          type: 'state_optimization',
          recommendation: 'provide_detailed_info',
          confidence: 0.7,
          source: 'state_analysis'
        })
      }

      return recommendations
    } catch (error) {
      console.error('Error generando recomendaciones conversacionales:', error)
      return [{
        type: 'fallback',
        recommendation: 'continue_conversation',
        confidence: 0.3,
        source: 'error_fallback'
      }]
    }
  }

  /**
   * 🎲 Seleccionar acción aleatoria
   */
  randomAction(possibleActions) {
    if (!possibleActions || possibleActions.length === 0) {
      return {
        action: 'continue_conversation',
        confidence: 0.1,
        qValue: 0,
        timesExecuted: 0,
        successRate: 0,
        isRandom: true
      }
    }

    const randomAction = possibleActions[Math.floor(Math.random() * possibleActions.length)]
    return {
      action: randomAction,
      confidence: 0.1,
      qValue: 0,
      timesExecuted: 0,
      successRate: 0,
      isRandom: true
    }
  }

  /**
   * 📊 Obtener métricas de rendimiento del cliente - MIGRADO A SUPABASE
   */
  async getClientPerformanceMetrics(clientId) {
    try {
      // Obtener patrones del cliente
      const { data: patterns, error: patternsError } = await this.db.client
        .from('client_patterns')
        .select('*')
        .eq('client_id', clientId)

      if (patternsError) {
        console.error('Error obteniendo patrones:', patternsError)
      }

      // Obtener datos de Q-learning
      const { data: qData, error: qError } = await this.db.client
        .from('q_learning_data')
        .select('*')
        .eq('client_id', clientId)

      if (qError) {
        console.error('Error obteniendo datos Q:', qError)
      }

      // Calcular métricas
      const totalExplorations = (qData || []).reduce((sum, item) => sum + (item.exploration_count || 0), 0)
      const totalSuccesses = (qData || []).reduce((sum, item) => sum + (item.success_count || 0), 0)
      const avgQValue = qData?.length > 0 
        ? (qData.reduce((sum, item) => sum + (item.q_value || 0), 0) / qData.length) 
        : 0

      return {
        clientId,
        totalConversations: totalExplorations,
        successfulConversations: totalSuccesses,
        successRate: totalExplorations > 0 ? totalSuccesses / totalExplorations : 0,
        averageQValue: avgQValue,
        knownStates: new Set(qData?.map(item => item.state) || []).size,
        knownActions: new Set(qData?.map(item => item.action) || []).size,
        patterns: patterns || [],
        lastActivity: qData?.length > 0 
          ? Math.max(...qData.map(item => new Date(item.timestamp).getTime())) 
          : null
      }
    } catch (error) {
      console.error('Error obteniendo métricas:', error)
      return {
        clientId,
        totalConversations: 0,
        successfulConversations: 0,
        successRate: 0,
        averageQValue: 0,
        knownStates: 0,
        knownActions: 0,
        patterns: [],
        lastActivity: null
      }
    }
  }

  /**
   * 📊 Obtener estadísticas del sistema RL para insights
   */
  getStatistics() {
    return {
      performance: {
        totalConversations: 0, // Se calculará dinámicamente
        learningRate: this.learningRate,
        explorationRate: this.explorationRate,
        discountFactor: this.discountFactor
      },
      status: this.initialized ? 'active' : 'inactive'
    }
  }

  /**
   * 🧠 Obtener insights de aprendizaje - MIGRADO A SUPABASE
   */
  async getLearningInsights(clientId = null, limitDays = 7) {
    try {
      const startDate = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000).toISOString()
      
      let query = this.db.client
        .from('q_learning_data')
        .select('*')
        .gte('timestamp', startDate)

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data: recentData, error } = await query
        .order('timestamp', { ascending: false })
        .limit(1000)

      if (error) {
        console.error('Error obteniendo insights:', error)
        return {}
      }

      // Análisis de datos
      const insights = {
        totalActions: recentData?.length || 0,
        uniqueClients: new Set(recentData?.map(item => item.client_id) || []).size,
        uniqueStates: new Set(recentData?.map(item => item.state) || []).size,
        avgQValue: recentData?.length > 0 
          ? recentData.reduce((sum, item) => sum + (item.q_value || 0), 0) / recentData.length 
          : 0,
        topStates: this.getTopItems(recentData || [], 'state', 5),
        topActions: this.getTopItems(recentData || [], 'action', 5),
        improvementTrend: this.calculateTrend(recentData || [])
      }

      return insights
    } catch (error) {
      console.error('Error en getLearningInsights:', error)
      return {}
    }
  }

  /**
   * 📈 Obtener elementos más frecuentes
   */
  getTopItems(data, field, limit = 5) {
    const counts = {}
    data.forEach(item => {
      const value = item[field]
      counts[value] = (counts[value] || 0) + 1
    })

    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([item, count]) => ({ item, count }))
  }

  /**
   * 📊 Calcular tendencia de mejora
   */
  calculateTrend(data, windowSize = 10) {
    if (data.length < windowSize * 2) return []

    const windows = []
    for (let i = 0; i <= data.length - windowSize; i += windowSize) {
      const window = data.slice(i, i + windowSize)
      const avgQValue = window.reduce((sum, item) => sum + (item.q_value || 0), 0) / window.length
      windows.push({
        period: i / windowSize,
        avgQValue,
        timestamp: window[window.length - 1].timestamp
      })
    }

    return windows
  }

  /**
   * 🔑 Generar clave de estado
   */
  generateStateKey(conversationState, context = {}) {
    const contextStr = Object.keys(context)
      .sort()
      .map(key => `${key}:${context[key]}`)
      .join('|')
    
    return contextStr ? `${conversationState}|${contextStr}` : conversationState
  }

  /**
   * 🎬 Generar clave de acción
   */
  generateActionKey(action) {
    if (typeof action === 'string') {
      return action
    }
    
    if (typeof action === 'object') {
      return `${action.type || 'unknown'}:${action.target || 'general'}`
    }
    
    return 'unknown_action'
  }

  /**
   * 🔓 Parsear clave de acción
   */
  parseActionKey(actionKey) {
    if (actionKey.includes(':')) {
      const [type, target] = actionKey.split(':')
      return { type, target }
    }
    
    return { type: actionKey, target: 'general' }
  }

  /**
   * 📏 Normalizar Q-value a rango 0-1
   */
  normalizeQValue(qValue) {
    // Normalizar Q-value típico (-10 a 50) a rango 0-1
    return Math.max(0, Math.min(1, (qValue + 10) / 60))
  }
}

export default ReinforcementLearningEngine