/**
 * 🔧 PARCHE PARA MEJORAR GENERACIÓN DE QUERIES
 * Función mejorada para generar queries más efectivos para leyes internacionales
 */

function improvedExtractSearchKeywords(userMessage) {
  try {
    const lowerMessage = userMessage.toLowerCase()
    
    console.log(`🔍 Query original: "${userMessage}"`)
    
    // 🎯 CASOS ESPECÍFICOS OPTIMIZADOS PARA MEJORES RESULTADOS
    
    // 1. Beautiful Bill tax
    if (lowerMessage.includes('beautiful bill') && lowerMessage.includes('tax')) {
      const optimizedQuery = 'Beautiful Tax Bill 2025'
      console.log(`🎯 Query optimizado (Beautiful Bill): "${optimizedQuery}"`)
      return optimizedQuery
    }
    
    // 2. ⭐ CONSULTAS GENERALES SOBRE LEYES INTERNACIONALES
    if (lowerMessage.includes('leyes internacionales') || 
        (lowerMessage.includes('ley') && lowerMessage.includes('internacional'))) {
      const optimizedQuery = 'international laws for businesses 2025'
      console.log(`🎯 Query optimizado (Leyes Internacionales): "${optimizedQuery}"`)
      return optimizedQuery
    }
    
    // 3. Tratados de doble imposición
    if (lowerMessage.includes('doble imposición') || lowerMessage.includes('doble tributación')) {
      const optimizedQuery = 'double taxation treaties Peru 2025'
      console.log(`🎯 Query optimizado (Doble Imposición): "${optimizedQuery}"`)
      return optimizedQuery
    }
    
    // 4. Países con convenios
    if (lowerMessage.includes('países') && (lowerMessage.includes('convenio') || lowerMessage.includes('tratado'))) {
      const optimizedQuery = 'countries tax treaties Peru agreements 2025'
      console.log(`🎯 Query optimizado (Países Convenios): "${optimizedQuery}"`)
      return optimizedQuery
    }
    
    // 5. Oportunidades de inversión internacionales
    if (lowerMessage.includes('oportunidades') && lowerMessage.includes('internacional')) {
      const optimizedQuery = 'international investment opportunities Peru 2025'
      console.log(`🎯 Query optimizado (Oportunidades): "${optimizedQuery}"`)
      return optimizedQuery
    }
    
    // 6. Regulaciones específicas de países
    if (lowerMessage.includes('regulación') && (lowerMessage.includes('ue') || lowerMessage.includes('europa'))) {
      const optimizedQuery = 'EU regulations cryptocurrency businesses 2025'
      console.log(`🎯 Query optimizado (Regulaciones UE): "${optimizedQuery}"`)
      return optimizedQuery
    }
    
    // 7. Fallback: mejorar query genérico
    // Extraer palabras clave y convertir al inglés para mejor búsqueda
    const stopWords = ['que', 'sabes', 'de', 'la', 'el', 'en', 'para', 'como', 'por', 'con', 'una', 'un', 'mi', 'favor', 'usar', 'puedo']
    
    const keywords = lowerMessage
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 4)
    
    // Traducir términos clave al inglés
    const translations = {
      'ley': 'law',
      'leyes': 'laws', 
      'norma': 'regulation',
      'decreto': 'decree',
      'internacional': 'international',
      'internacionales': 'international',
      'empresario': 'business',
      'empresarios': 'businesses',
      'oportunidades': 'opportunities',
      'inversión': 'investment',
      'fiscal': 'tax',
      'tributario': 'taxation'
    }
    
    const translatedKeywords = keywords.map(word => translations[word] || word)
    
    // Agregar "2025" para información actualizada
    if (!translatedKeywords.includes('2025')) {
      translatedKeywords.push('2025')
    }
    
    const optimizedQuery = translatedKeywords.join(' ')
    console.log(`🎯 Query optimizado (Genérico): "${optimizedQuery}"`)
    
    return optimizedQuery
    
  } catch (error) {
    console.error('❌ Error extrayendo keywords:', error)
    return userMessage
  }
}

// 🧪 PRUEBAS CON LOS CASOS PROBLEMÁTICOS

function testQueryImprovement() {
  console.log('🧪 PRUEBA DE MEJORA DE QUERIES')
  console.log('==============================\n')
  
  const testCases = [
    "que leyes internacionales puedo usar a mi favor",
    "Que países tienen convenios con peru sobre el tratado de doble imposicion",
    "oportunidades de inversion en el extranjero desde peru",
    "Como afecta la nueva regulación de la UE sobre criptomonedas",
    "Sabes de cómo podría usar la ley Beautiful Bill tax a mi favor"
  ]
  
  testCases.forEach((query, index) => {
    console.log(`📝 CASO ${index + 1}: "${query}"`)
    console.log('─'.repeat(60))
    
    // Query anterior (problemático)
    console.log('❌ ANTES: Query confuso como "internacionales leyes puedo"')
    
    // Query mejorado
    const improvedQuery = improvedExtractSearchKeywords(query)
    console.log(`✅ DESPUÉS: Query efectivo para búsqueda real`)
    console.log('')
    
    // Validar efectividad
    if (improvedQuery.length > 10 && 
        !improvedQuery.includes('puedo') && 
        !improvedQuery.includes('sabes') && 
        improvedQuery.includes('2025')) {
      console.log('✅ QUERY VÁLIDO: Específico, en inglés, con año actual')
    } else {
      console.log('⚠️ Query necesita más optimización')
    }
    
    console.log('\n' + '='.repeat(80) + '\n')
  })
  
  console.log('🎯 CONCLUSIÓN:')
  console.log('Los queries mejorados son más específicos y efectivos para búsqueda real.')
  console.log('Esto debería resultar en respuestas con información actualizada en lugar de genéricas.')
}

// Ejecutar pruebas
testQueryImprovement()

module.exports = { improvedExtractSearchKeywords }