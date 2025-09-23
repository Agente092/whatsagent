/**
 * 🤖 SISTEMA DE PREGUNTAS DE SEGUIMIENTO INTELIGENTES
 * Genera preguntas específicas basadas en resultados de búsqueda para mejorar la atención personalizada
 */

class IntelligentFollowUpSystem {
  constructor() {
    // 🎯 Patrones de preguntas según el tipo de consulta
    this.questionPatterns = {
      // Tratados de doble imposición
      double_taxation_treaties: [
        "¿Con cuál de estos países te interesa que profundicemos la investigación?",
        "¿Tienes algún país específico en mente para tu estructura fiscal?",
        "¿Qué tipo de ingresos generas que podrían beneficiarse de estos tratados?",
        "¿Estás considerando establecer presencia comercial en alguno de estos países?"
      ],
      
      // Leyes internacionales
      international_laws: [
        "¿Te interesa implementar alguna de estas leyes específicamente?",
        "¿Qué sector empresarial te gustaría enfocar con estas regulaciones?",
        "¿Necesitas una estrategia de implementación paso a paso?",
        "¿Tienes algún marco temporal específico para aprovechar estas oportunidades?"
      ],
      
      // Oportunidades de inversión
      investment_opportunities: [
        "¿Cuál es tu presupuesto aproximado para esta inversión?",
        "¿Prefieres inversiones de corto o largo plazo?",
        "¿Tienes experiencia previa invirtiendo en el extranjero?",
        "¿Qué nivel de riesgo estás dispuesto a asumir?"
      ],
      
      // Información de países
      country_information: [
        "¿Te interesa algún país en particular de esta lista?",
        "¿Qué tipo de actividad empresarial planeas desarrollar?",
        "¿Necesitas información sobre requisitos específicos para alguno de estos países?",
        "¿Te gustaría una comparativa detallada entre algunos de estos países?"
      ],
      
      // Estrategias fiscales
      tax_strategies: [
        "¿Cuál es tu estructura empresarial actual?",
        "¿Qué monto de facturación anual manejas aproximadamente?",
        "¿Ya tienes alguna estructura offshore establecida?",
        "¿Te interesa optimización fiscal local o internacional?"
      ]
    }
  }

  /**
   * 🎯 ANALIZAR RESULTADOS DE BÚSQUEDA Y GENERAR PREGUNTAS ESPECÍFICAS
   */
  generateFollowUpQuestions(userMessage, searchResults, searchQuery) {
    const lowerMessage = userMessage.toLowerCase()
    const detectedCategory = this.detectQueryCategory(lowerMessage, searchResults)
    
    console.log(`🎯 Categoría detectada: ${detectedCategory}`)
    console.log(`🔍 Query de búsqueda: ${searchQuery}`)
    
    // Generar preguntas basadas en la categoría y resultados
    const baseQuestions = this.questionPatterns[detectedCategory] || this.questionPatterns.country_information
    
    // Personalizar preguntas según el contenido específico de los resultados
    const personalizedQuestions = this.personalizeQuestions(baseQuestions, searchResults, userMessage)
    
    return {
      category: detectedCategory,
      questions: personalizedQuestions.slice(0, 3), // Máximo 3 preguntas
      searchSummary: this.generateSearchSummary(searchResults)
    }
  }

  /**
   * 🔍 DETECTAR CATEGORÍA DE LA CONSULTA
   */
  detectQueryCategory(message, searchResults) {
    // Patrones para detectar el tipo de consulta
    if (message.includes('doble imposición') || message.includes('tratado') || message.includes('convenio fiscal')) {
      return 'double_taxation_treaties'
    }
    
    if (message.includes('ley') || message.includes('regulación') || message.includes('normativa')) {
      return 'international_laws'
    }
    
    if (message.includes('inversión') || message.includes('invertir') || message.includes('capital')) {
      return 'investment_opportunities'
    }
    
    if (message.includes('países que') || message.includes('qué países') || message.includes('cuáles países')) {
      return 'country_information'
    }
    
    if (message.includes('fiscal') || message.includes('impuesto') || message.includes('tributario')) {
      return 'tax_strategies'
    }
    
    // Categoría por defecto
    return 'country_information'
  }

  /**
   * 🎨 PERSONALIZAR PREGUNTAS SEGÚN RESULTADOS ESPECÍFICOS
   */
  personalizeQuestions(baseQuestions, searchResults, userMessage) {
    const personalizedQuestions = []
    
    // Analizar resultados para encontrar países, números específicos, etc.
    const mentionedCountries = this.extractCountriesFromResults(searchResults)
    const mentionedNumbers = this.extractNumbersFromResults(searchResults)
    
    for (const question of baseQuestions) {
      let personalizedQuestion = question
      
      // Si hay países específicos mencionados, personalizar la pregunta
      if (mentionedCountries.length > 0 && question.includes('países')) {
        const countryList = mentionedCountries.slice(0, 3).join(', ')
        personalizedQuestion = `¿Te interesa profundizar en alguno de estos países específicamente: ${countryList}?`
      }
      
      // Si hay números específicos (tasas, porcentajes), mencionarlos
      if (mentionedNumbers.length > 0 && question.includes('beneficio')) {
        personalizedQuestion = `Considerando las tasas mencionadas (${mentionedNumbers.join(', ')}), ¿qué estructura te parece más atractiva?`
      }
      
      personalizedQuestions.push(personalizedQuestion)
    }
    
    return personalizedQuestions
  }

  /**
   * 🌍 EXTRAER PAÍSES MENCIONADOS EN LOS RESULTADOS
   */
  extractCountriesFromResults(searchResults) {
    const countries = []
    const countryPatterns = [
      'Estados Unidos', 'Canadá', 'México', 'Brasil', 'Argentina', 'Chile', 'Colombia',
      'España', 'Francia', 'Alemania', 'Italia', 'Reino Unido', 'Suiza', 'Luxemburgo',
      'Panamá', 'Costa Rica', 'Uruguay', 'Singapur', 'Hong Kong', 'Australia'
    ]
    
    if (typeof searchResults === 'string') {
      for (const country of countryPatterns) {
        if (searchResults.toLowerCase().includes(country.toLowerCase())) {
          countries.push(country)
        }
      }
    }
    
    return [...new Set(countries)] // Eliminar duplicados
  }

  /**
   * 📊 EXTRAER NÚMEROS Y PORCENTAJES DE LOS RESULTADOS
   */
  extractNumbersFromResults(searchResults) {
    const numbers = []
    
    if (typeof searchResults === 'string') {
      // Buscar porcentajes
      const percentageMatches = searchResults.match(/\d+(?:\.\d+)?%/g)
      if (percentageMatches) {
        numbers.push(...percentageMatches)
      }
      
      // Buscar tasas fiscales
      const taxRateMatches = searchResults.match(/tasa del? \d+(?:\.\d+)?%/gi)
      if (taxRateMatches) {
        numbers.push(...taxRateMatches)
      }
    }
    
    return [...new Set(numbers)]
  }

  /**
   * 📋 GENERAR RESUMEN DE RESULTADOS DE BÚSQUEDA
   */
  generateSearchSummary(searchResults) {
    if (typeof searchResults !== 'string' || searchResults.length < 100) {
      return 'Se encontró información relevante para tu consulta.'
    }
    
    // Extraer primeras 2-3 oraciones como resumen
    const sentences = searchResults.split('.').filter(s => s.trim().length > 20)
    const summary = sentences.slice(0, 2).join('. ') + '.'
    
    return summary.length > 300 ? summary.substring(0, 300) + '...' : summary
  }

  /**
   * 🚀 GENERAR RESPUESTA COMPLETA CON PREGUNTAS DE SEGUIMIENTO
   */
  generateCompleteResponse(userMessage, searchResults, searchQuery) {
    const followUp = this.generateFollowUpQuestions(userMessage, searchResults, searchQuery)
    
    let response = `Basándome en la información más actualizada encontrada:\n\n`
    
    // Agregar resumen de resultados
    response += `${followUp.searchSummary}\n\n`
    
    // Agregar preguntas de seguimiento
    response += `Para brindarte una asesoría más personalizada y específica, me gustaría conocer:\n\n`
    
    followUp.questions.forEach((question, index) => {
      response += `${index + 1}. ${question}\n`
    })
    
    response += `\n💡 Con esta información podré diseñar una estrategia integral específica para tu situación y objetivos.`
    
    return response
  }
}

module.exports = IntelligentFollowUpSystem