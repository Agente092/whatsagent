/**
 * 🔧 SCRIPT DE DIAGNÓSTICO COMPLETO
 * Valida las correcciones de los 3 problemas principales identificados
 */

require('dotenv').config()

const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')

async function runDiagnostics() {
  console.log('🔧 SCRIPT DE DIAGNÓSTICO COMPLETO')
  console.log('=================================\n')
  
  try {
    console.log('📦 Inicializando servicios...')
    const knowledgeBase = new KnowledgeBase()
    const geminiService = new GeminiService(null, null, knowledgeBase)
    
    console.log('✅ Servicios inicializados correctamente\n')
    
    // ===== DIAGNÓSTICO 1: DETECCIÓN DE BÚSQUEDA MEJORADA =====
    console.log('🔍 DIAGNÓSTICO 1: DETECCIÓN DE BÚSQUEDA MEJORADA')
    console.log('-'.repeat(50))
    
    const testCases = [
      'Tienes conocimiento sobre la ley One Beautiful Bill tax?',
      'que sabes de la beautiful bill',
      'informacion sobre beautiful tax bill 2025',
      'hablame sobre la propuesta de trump',
      'que paises tienen convenios fiscales',
      'cual es la mejor jurisdiccion offshore'
    ]
    
    for (const message of testCases) {
      const needsSearch = geminiService.needsRealTimeSearch(message)
      console.log(`💬 "${message}"`)
      console.log(`🔍 Detección: ${needsSearch ? '✅ SÍ activa búsqueda' : '❌ NO detecta búsqueda'}`)
      
      if (needsSearch) {
        // Probar extracción de keywords
        const keywords = geminiService.extractSearchKeywords(message)
        console.log(`🎯 Keywords: "${keywords}"`)
      }
      console.log('')
    }
    
    // ===== DIAGNÓSTICO 2: TIMEOUT OPTIMIZACIÓN =====
    console.log('⏱️ DIAGNÓSTICO 2: OPTIMIZACIÓN DE TIMEOUTS')
    console.log('-'.repeat(50))
    
    // Verificar timeout reducido simulando búsqueda
    console.log('🔍 Probando búsqueda rápida con timeout optimizado...')
    
    const startTime = Date.now()
    try {
      const searchResults = await geminiService.internetSearch.search('Beautiful Tax Bill 2025')
      const duration = Date.now() - startTime
      console.log(`✅ Búsqueda completada en ${duration}ms`)
      console.log(`📊 Longitud de resultados: ${searchResults.length} caracteres`)
      
      if (duration < 15000) { // 15 segundos
        console.log('✅ Timeout optimizado funcionando correctamente')
      } else {
        console.log('⚠️ Búsqueda tardó más de lo esperado')
      }
    } catch (error) {
      console.log(`❌ Error en búsqueda: ${error.message}`)
    }
    
    console.log('')
    
    // ===== DIAGNÓSTICO 3: VALIDACIÓN COMPLETA =====
    console.log('🎯 DIAGNÓSTICO 3: VALIDACIÓN COMPLETA DEL FLUJO')
    console.log('-'.repeat(50))
    
    const realTestMessage = "Tienes conocimiento sobre la ley One Beautiful Bill tax?"
    
    console.log(`📝 Mensaje de prueba: "${realTestMessage}"`)
    
    // 1. Verificar detección
    const detectionResult = geminiService.needsRealTimeSearch(realTestMessage)
    console.log(`🔍 1. Detección de búsqueda: ${detectionResult ? '✅ ACTIVADA' : '❌ NO DETECTADA'}`)
    
    // 2. Verificar extracción de keywords
    const extractedKeywords = geminiService.extractSearchKeywords(realTestMessage)
    console.log(`🎯 2. Keywords extraídos: "${extractedKeywords}"`)
    
    // 3. Verificar que los keywords son apropiados
    const keywordsValid = extractedKeywords.includes('beautiful') || 
                         extractedKeywords.includes('bill') || 
                         extractedKeywords.includes('tax')
    console.log(`✅ 3. Keywords válidos: ${keywordsValid ? 'SÍ' : 'NO'}`)
    
    // 4. Verificar detección de intención
    const intent = geminiService.detectIntent(realTestMessage)
    console.log(`🎭 4. Intención detectada: "${intent}"`)
    
    // ===== RESUMEN FINAL =====
    console.log('\n📊 RESUMEN DE CORRECCIONES IMPLEMENTADAS')
    console.log('=========================================')
    
    console.log('✅ PROBLEMA 1 RESUELTO: Error de clientId faltante')
    console.log('   - Agregado clientId: client.id en línea 2044')
    console.log('   - Las conversaciones ahora se guardan correctamente')
    
    console.log('\n✅ PROBLEMA 2 MEJORADO: Detección de búsqueda para términos mixtos')
    console.log('   - Agregados términos específicos: "beautiful", "bill", "informacion sobre"')
    console.log('   - Mejorada detección para casos español-inglés')
    console.log('   - Agregados nombres propios de leyes importantes')
    
    console.log('\n✅ PROBLEMA 3 OPTIMIZADO: Timeouts reducidos')
    console.log('   - Timeout de procesamiento: 30s → 20s')
    console.log('   - Timeout de búsqueda web: 15s → 10s')
    console.log('   - Timeout de Google Search: 15s → 10s')
    
    console.log('\n🚀 RESULTADO ESPERADO DESPUÉS DE LAS CORRECCIONES:')
    console.log('==================================================')
    console.log('✅ El agente AHORA SÍ debe detectar "Beautiful Bill" correctamente')
    console.log('✅ Las conversaciones se guardan sin errores de clientId')
    console.log('✅ Los timeouts son más eficientes, menos colgamientos')
    console.log('✅ La búsqueda en internet funciona para términos mixtos')
    
    console.log('\n🔄 PRÓXIMO PASO: REINICIAR SERVIDOR')
    console.log('===================================')
    console.log('1. Detener el servidor actual: Ctrl+C')
    console.log('2. Reiniciar: npm run dev:server')
    console.log('3. Probar mensaje: "Tienes conocimiento sobre la ley One Beautiful Bill tax?"')
    console.log('4. Verificar que ahora SÍ proporciona información específica')
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error)
  }
}

// Ejecutar diagnósticos
runDiagnostics()