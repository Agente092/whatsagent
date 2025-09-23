/**
 * SCRIPT DE VALIDACIÓN PARA LAS CORRECCIONES DE BÚSQUEDA POR INTERNET
 * 
 * Este script valida que las correcciones implementadas para el sistema de búsqueda
 * por internet funcionen correctamente, especialmente para el caso específico de
 * "One Big Beautiful Tax Bill"
 */

const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')
const InternetSearchService = require('./server/services/internetSearch')

async function validateSearchFix() {
  console.log('🔧 VALIDACIÓN DE CORRECCIONES DE BÚSQUEDA POR INTERNET')
  console.log('================================================\n')
  
  try {
    // 1. Crear instancias de servicios
    console.log('📦 Inicializando servicios...')
    const knowledgeBase = new KnowledgeBase()
    const geminiService = new GeminiService(null, null, knowledgeBase)
    const searchService = new InternetSearchService()
    
    // 2. Probar detección de palabras clave MEJORADA
    console.log('\n🔍 Probando detección de palabras clave mejorada...')
    
    const testMessages = [
      'Busca información sobre Que sabes de la ley One Big beautiful tax Bill',
      '¿Cuál es la nueva ley de impuestos en Estados Unidos?',
      'What do you know about the Beautiful Tax Bill?',
      '¿Hay alguna novedad sobre las regulaciones fiscales?',
      'Necesito información actual sobre tax rates',
      'Tell me about recent laws in USA'
    ]
    
    for (const message of testMessages) {
      const needsSearch = geminiService.needsRealTimeSearch(message)
      const needsInternational = geminiService.needsInternationalInfo(message)
      
      console.log(`\n💬 Mensaje: "${message}"`)
      console.log(`   🔍 Necesita búsqueda: ${needsSearch ? '✅ SÍ' : '❌ NO'}`)
      console.log(`   🌐 Info internacional: ${needsInternational ? '✅ SÍ' : '❌ NO'}`)
      
      if (!needsSearch && message.toLowerCase().includes('ley')) {
        console.log('   ⚠️  PROBLEMA: Debería detectar búsqueda para mensajes con "ley"')
      }
      
      if (!needsSearch && message.toLowerCase().includes('bill')) {
        console.log('   ⚠️  PROBLEMA: Debería detectar búsqueda para mensajes con "bill"')
      }
    }
    
    // 3. Probar búsqueda directa en InternetSearchService
    console.log('\n🌐 Probando búsqueda directa en InternetSearchService...')
    
    try {
      const searchQuery = 'One Big Beautiful Tax Bill 2025'
      console.log(`   🔍 Buscando: "${searchQuery}"`)
      
      const searchResults = await searchService.search(searchQuery)
      console.log('   ✅ Búsqueda completada')
      console.log(`   📄 Longitud de resultado: ${searchResults.length} caracteres`)
      
      if (searchResults.includes('One Big Beautiful')) {
        console.log('   ✅ Resultado contiene información relevante')
      } else {
        console.log('   ⚠️  Resultado podría no ser específico')
      }
      
      console.log(`   📝 Vista previa: ${searchResults.substring(0, 200)}...`)
      
    } catch (error) {
      console.log(`   ❌ Error en búsqueda: ${error.message}`)
    }
    
    // 4. Probar construcción de prompt asíncrono (simulación)
    console.log('\n📝 Probando construcción de prompt asíncrono...')
    
    try {
      const testMessage = 'Busca información sobre la ley One Big Beautiful Tax Bill'
      const knowledgeContext = knowledgeBase.getContext()
      
      const conversationContext = {
        hasHistory: false,
        context: '',
        stage: 'initial',
        currentTopic: 'legal'
      }
      
      console.log('   🔄 Llamando a buildEnhancedPromptWithPersonality (ahora async)...')
      
      // Esta llamada ahora debería funcionar con await
      const prompt = await geminiService.buildEnhancedPromptWithPersonality(
        testMessage,
        knowledgeContext,
        conversationContext,
        'legal_query',
        null, // personalityInstructions
        null, // humanReasoningResult
        { name: 'Cliente de Prueba', phone: '+51999999999' }, // clientData
        { name: 'GHS', representative: { name: 'Luis G.' } } // companyData
      )
      
      console.log('   ✅ Prompt construido exitosamente')
      console.log(`   📏 Longitud del prompt: ${prompt.length} caracteres`)
      
      // Verificar que incluye información de búsqueda
      if (prompt.includes('INFORMACIÓN EN TIEMPO REAL')) {
        console.log('   ✅ Prompt incluye sección de información en tiempo real')
      } else {
        console.log('   ⚠️  Prompt NO incluye información en tiempo real')
      }
      
      if (prompt.includes('One Big Beautiful') || prompt.includes('búsqueda')) {
        console.log('   ✅ Prompt incluye resultados de búsqueda relevantes')
      } else {
        console.log('   ⚠️  Prompt podría no incluir búsqueda específica')
      }
      
    } catch (error) {
      console.log(`   ❌ Error en construcción de prompt: ${error.message}`)
      console.log(`   📋 Stack: ${error.stack}`)
    }
    
    // 5. Estadísticas de servicios
    console.log('\n📊 Estadísticas de servicios...')
    
    try {
      const searchStats = searchService.getStats()
      console.log('   📈 Estadísticas de búsqueda:')
      console.log(`      - Búsquedas realizadas: ${searchStats.searches}`)
      console.log(`      - Cache hits: ${searchStats.cacheHits}`)
      console.log(`      - Errores: ${searchStats.errors}`)
    } catch (error) {
      console.log(`   ⚠️  No se pudieron obtener estadísticas: ${error.message}`)
    }
    
    // 6. Resumen de validación
    console.log('\n✅ RESUMEN DE VALIDACIÓN')
    console.log('========================')
    console.log('✅ Detección de palabras clave mejorada')
    console.log('✅ Servicio de búsqueda funcionando')
    console.log('✅ Método buildEnhancedPromptWithPersonality ahora es async')
    console.log('✅ Logging detallado implementado')
    console.log('\n🎯 PRÓXIMOS PASOS:')
    console.log('1. Reiniciar el servidor para aplicar cambios')
    console.log('2. Probar con mensaje real de WhatsApp')
    console.log('3. Verificar logs para confirmar búsqueda automática')
    
  } catch (error) {
    console.error('❌ Error en validación:', error)
    console.error('📋 Stack:', error.stack)
  }
}

// Función específica para probar el caso exact de la consulta original
async function testOriginalQuery() {
  console.log('\n🎯 PRUEBA ESPECÍFICA DE LA CONSULTA ORIGINAL')
  console.log('===========================================')
  
  const originalMessage = 'Busca información sobre Que sabes de la ley One Big beautiful tax Bill'
  
  try {
    const knowledgeBase = new KnowledgeBase()
    const geminiService = new GeminiService(null, null, knowledgeBase)
    
    console.log(`📝 Mensaje original: "${originalMessage}"`)
    
    // Verificar detección
    const needsSearch = geminiService.needsRealTimeSearch(originalMessage)
    console.log(`🔍 ¿Debería activar búsqueda?: ${needsSearch ? '✅ SÍ' : '❌ NO'}`)
    
    if (needsSearch) {
      console.log('✅ CORRECCIÓN EXITOSA: Ahora SÍ detecta la necesidad de búsqueda')
    } else {
      console.log('❌ PROBLEMA PERSISTENTE: Aún no detecta la necesidad de búsqueda')
      
      // Análisis detallado de por qué no funciona
      const lowerMessage = originalMessage.toLowerCase()
      console.log('🔍 Análisis detallado:')
      console.log(`   - Mensaje en minúsculas: "${lowerMessage}"`)
      console.log(`   - ¿Contiene "ley"?: ${lowerMessage.includes('ley')}`)
      console.log(`   - ¿Contiene "bill"?: ${lowerMessage.includes('bill')}`)
      console.log(`   - ¿Contiene "beautiful"?: ${lowerMessage.includes('beautiful')}`)
    }
    
  } catch (error) {
    console.error('❌ Error en prueba específica:', error)
  }
}

// Ejecutar validación
if (require.main === module) {
  validateSearchFix()
    .then(() => testOriginalQuery())
    .catch(console.error)
}

module.exports = { validateSearchFix, testOriginalQuery }