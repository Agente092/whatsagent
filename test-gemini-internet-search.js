/**
 * Script de prueba para la integración de búsqueda en internet con GeminiService
 * Este script prueba la detección de necesidad de búsqueda y la integración completa
 */

const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')

async function testGeminiInternetSearch() {
  console.log('🔍 Iniciando prueba de integración Gemini + Búsqueda en internet...')
  
  // Crear instancias de los servicios
  const knowledgeBase = new KnowledgeBase()
  const geminiService = new GeminiService(null, null, knowledgeBase)
  
  // Pruebas de detección de necesidad de búsqueda
  const testMessages = [
    '¿Cuál es el tipo de cambio del dólar hoy?',
    'Necesito información sobre leyes nuevas de empresas en Perú',
    '¿Qué estrategias de inversión hay en Miami para peruanos?',
    '¿Cuáles son las tasas de interés actuales en Perú?',
    'Quiero crear una empresa offshore, ¿qué opciones hay?',
    'Explícame sobre estructuras empresariales',
    '¿Cómo está la economía peruana en 2024?',
    'Necesito información sobre paraísos fiscales'
  ]
  
  console.log(`\n📋 Ejecutando ${testMessages.length} pruebas de detección...\n`)
  
  for (const message of testMessages) {
    console.log(`\n💬 Mensaje: "${message}"`)
    
    // Probar detección de búsqueda en tiempo real
    const needsSearch = geminiService.needsRealTimeSearch(message)
    console.log(`🔍 Necesita búsqueda en tiempo real: ${needsSearch ? 'SÍ' : 'NO'}`)
    
    // Probar detección de información internacional
    const needsInternational = geminiService.needsInternationalInfo(message)
    console.log(`🌐 Necesita información internacional: ${needsInternational ? 'SÍ' : 'NO'}`)
    
    // Si necesita búsqueda, mostrar qué palabras clave la activaron
    if (needsSearch || needsInternational) {
      const lowerMessage = message.toLowerCase()
      const realTimeKeywords = [
        'actual', 'reciente', 'hoy', 'ahora', 'último', 'nuevo',
        'noticia', 'evento', 'anuncio', 'publicación',
        'nueva ley', 'modificación', 'actualización legal', 'normativa nueva',
        'tasa', 'porcentaje', 'interés', 'inflación', 'tipo de cambio'
      ]
      
      const internationalKeywords = [
        'extranjero', 'internacional', 'europa', 'estados unidos', 'china', 'brasil',
        'miami', 'españa', 'mexico', 'colombia', 'argentina', 'chile',
        'panamá', 'costa rica', 'ecuador', 'uruguay', 'paraguay',
        'alemania', 'francia', 'italia', 'reino unido', 'japón',
        'australia', 'canadá', 'méxico'
      ]
      
      const foundRealTime = realTimeKeywords.filter(k => lowerMessage.includes(k))
      const foundInternational = internationalKeywords.filter(k => lowerMessage.includes(k))
      
      if (foundRealTime.length > 0) {
        console.log(`📌 Palabras clave de tiempo real: ${foundRealTime.join(', ')}`)
      }
      
      if (foundInternational.length > 0) {
        console.log(`🌍 Palabras clave internacionales: ${foundInternational.join(', ')}`)
      }
    }
  }
  
  // Prueba de construcción de prompt con búsqueda
  console.log('\n🔧 Probando construcción de prompt con búsqueda...')
  try {
    const testMessage = '¿Cuál es la tasa de interés actual en Perú?'
    const knowledgeContext = knowledgeBase.getContext()
    
    const conversationContext = {
      hasHistory: false,
      context: '',
      stage: 'initial',
      currentTopic: 'financial'
    }
    
    const prompt = geminiService.buildEnhancedPromptWithPersonality(
      testMessage,
      knowledgeContext,
      conversationContext,
      'business_query',
      null, // personalityInstructions
      null, // humanReasoningResult
      { name: 'Cliente de Prueba', phone: '+51999999999' }, // clientData
      { name: 'Empresa de Prueba', representative: { name: 'Asesor de Prueba' } } // companyData
    )
    
    console.log('✅ Prompt construido exitosamente')
    console.log(`📄 Longitud del prompt: ${prompt.length} caracteres`)
    
    // Verificar que se incluyó la sección de información en tiempo real
    if (prompt.includes('INFORMACIÓN EN TIEMPO REAL')) {
      console.log('✅ Sección de búsqueda en tiempo real incluida en el prompt')
    } else {
      console.log('⚠️ Sección de búsqueda en tiempo real NO encontrada en el prompt')
    }
    
  } catch (error) {
    console.error('❌ Error en prueba de construcción de prompt:', error.message)
  }
  
  console.log('\n✅ Prueba de integración Gemini + Búsqueda en internet completada')
}

// Ejecutar prueba
if (require.main === module) {
  testGeminiInternetSearch().catch(console.error)
}

module.exports = { testGeminiInternetSearch }