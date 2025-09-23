/**
 * 🔍 SCRIPT DE PRUEBA: INTEGRACIÓN BÚSQUEDA + IA
 * Prueba específicamente el flujo completo desde búsqueda hasta respuesta final
 */

require('dotenv').config()

const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')
const InternetSearchService = require('./server/services/internetSearch')

async function testSearchIntegration() {
  console.log('🔍 PRUEBA DE INTEGRACIÓN: BÚSQUEDA + IA')
  console.log('=======================================\n')
  
  try {
    console.log('📦 Inicializando servicios...')
    const knowledgeBase = new KnowledgeBase()
    const geminiService = new GeminiService(null, null, knowledgeBase)
    const searchService = new InternetSearchService()
    
    // Simular el mensaje problemático EXACTO
    const testMessage = "Tienes conocimiento sobre la ley One Beautiful Bill tax?"
    
    console.log(`📝 Mensaje de prueba: "${testMessage}"\n`)
    
    // PASO 1: Verificar detección de búsqueda
    console.log('🔍 PASO 1: Verificando detección de búsqueda...')
    const needsSearch = geminiService.needsRealTimeSearch(testMessage)
    console.log(`   Resultado: ${needsSearch ? '✅ SÍ detecta búsqueda' : '❌ NO detecta búsqueda'}`)
    
    if (!needsSearch) {
      console.log('❌ PROBLEMA: La detección de búsqueda falló')
      return
    }
    
    // PASO 2: Extraer keywords
    console.log('\n🎯 PASO 2: Extrayendo keywords...')
    const keywords = geminiService.extractSearchKeywords(testMessage)
    console.log(`   Keywords: "${keywords}"`)
    
    // PASO 3: Realizar búsqueda directa
    console.log('\n🌐 PASO 3: Realizando búsqueda directa...')
    const searchResults = await searchService.search(keywords)
    console.log(`   Longitud de resultados: ${searchResults.length} caracteres`)
    console.log(`   Primeros 200 caracteres: "${searchResults.substring(0, 200)}..."`)
    
    // PASO 4: Crear prompt simulado con resultados
    console.log('\n🤖 PASO 4: Simulando prompt con resultados de búsqueda...')
    
    const mockRealTimeInfo = `\n\n🔍 INFORMACIÓN EN TIEMPO REAL:\n${searchResults}`
    
    // Verificar si el prompt contiene las instrucciones críticas
    const prompt = await geminiService.buildEnhancedPromptWithPersonality(
      testMessage,
      '',
      { hasHistory: false, context: '', stage: 'initial', currentTopic: '' },
      'legal_query',
      null,
      null,
      { name: 'luis', phone: '51998148917' },
      { name: 'GHS', representative: { name: 'Luis G.' } }
    )
    
    // Verificar que el prompt contiene las instrucciones de búsqueda
    const hasSearchInstructions = prompt.includes('INFORMACIÓN EN TIEMPO REAL') || 
                                 prompt.includes('ATENCIÓN: HAS RECIBIDO INFORMACIÓN')
    
    console.log(`   Prompt contiene instrucciones de búsqueda: ${hasSearchInstructions ? '✅ SÍ' : '❌ NO'}`)
    
    if (hasSearchInstructions) {
      console.log('   ✅ Las instrucciones de búsqueda están presentes en el prompt')
    } else {
      console.log('   ❌ PROBLEMA: Las instrucciones de búsqueda NO están en el prompt')
    }
    
    // PASO 5: Verificar contenido específico en resultados
    console.log('\n📊 PASO 5: Analizando contenido de resultados...')
    
    const hasSpecificInfo = searchResults.toLowerCase().includes('beautiful') ||
                           searchResults.toLowerCase().includes('bill') ||
                           searchResults.toLowerCase().includes('tax')
    
    console.log(`   Contiene información específica sobre la ley: ${hasSpecificInfo ? '✅ SÍ' : '❌ NO'}`)
    
    if (hasSpecificInfo) {
      console.log('   ✅ Los resultados SÍ contienen información relevante sobre Beautiful Bill')
    } else {
      console.log('   ⚠️ Los resultados pueden no ser lo suficientemente específicos')
    }
    
    // PASO 6: Análisis final
    console.log('\n🎯 ANÁLISIS FINAL DEL PROBLEMA')
    console.log('==============================')
    
    if (needsSearch && hasSearchInstructions && hasSpecificInfo) {
      console.log('✅ El sistema técnico funciona correctamente')
      console.log('❓ El problema puede estar en:')
      console.log('   1. La IA no está siguiendo las instrucciones del prompt')
      console.log('   2. La información de búsqueda no es lo suficientemente clara')
      console.log('   3. Conflicto entre conocimiento base y resultados de búsqueda')
      
      console.log('\n🔧 RECOMENDACIONES:')
      console.log('==================')
      console.log('1. Hacer las instrucciones de búsqueda MÁS ENFÁTICAS')
      console.log('2. Agregar ejemplos específicos en el prompt')
      console.log('3. Penalizar respuestas que ignoren resultados de búsqueda')
      
    } else {
      console.log('❌ Problema en el flujo técnico:')
      if (!needsSearch) console.log('   - Detección de búsqueda fallida')
      if (!hasSearchInstructions) console.log('   - Instrucciones de búsqueda faltantes')
      if (!hasSpecificInfo) console.log('   - Resultados de búsqueda no específicos')
    }
    
    console.log('\n🚀 PRÓXIMO PASO SUGERIDO:')
    console.log('========================')
    console.log('1. Probar con el servidor reiniciado')
    console.log('2. Verificar que la respuesta ahora use la información de búsqueda')
    console.log('3. Si sigue fallando, reforzar más las instrucciones del prompt')
    
  } catch (error) {
    console.error('❌ Error en prueba de integración:', error)
  }
}

// Ejecutar prueba
testSearchIntegration()