/**
 * SCRIPT DE PRUEBA PARA LAS MEJORAS DE BÚSQUEDA
 * 
 * Este script valida que las mejoras implementadas funcionen correctamente
 * para extraer keywords optimizados y realizar búsquedas más efectivas
 */

// Cargar variables de entorno desde .env
require('dotenv').config()

const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')
const InternetSearchService = require('./server/services/internetSearch')

async function testSearchImprovements() {
  console.log('🔧 PRUEBA DE MEJORAS DE BÚSQUEDA')
  console.log('===============================\n')
  
  try {
    // 1. Crear instancias de servicios
    console.log('📦 Inicializando servicios...')
    const knowledgeBase = new KnowledgeBase()
    const geminiService = new GeminiService(null, null, knowledgeBase)
    const searchService = new InternetSearchService()
    
    // 2. Probar extracción de keywords mejorada
    console.log('\n🔍 Probando extracción de keywords optimizada...')
    
    const testMessages = [
      'hablame sobre la ley que salio este 2025 que se llama One Big beautiful tax Bill fue propuesta por donald trump',
      'que sabes de la nueva ley de impuestos de Estados Unidos 2025',
      'Beautiful Tax Bill información actualizada',
      'Trump tax reform 2025 news'
    ]
    
    for (const message of testMessages) {
      console.log(`\n💬 Mensaje original: "${message}"`)
      
      // Probar extracción de keywords
      const optimizedQuery = geminiService.extractSearchKeywords(message)
      console.log(`🎯 Keywords extraídos: "${optimizedQuery}"`)
      
      // Verificar que sea más corto y específico
      if (optimizedQuery.length < message.length) {
        console.log('✅ Query optimizado es más conciso')
      } else {
        console.log('⚠️  Query no se optimizó adecuadamente')
      }
      
      // Verificar que contenga términos relevantes
      if (optimizedQuery.toLowerCase().includes('beautiful') || 
          optimizedQuery.toLowerCase().includes('tax bill') ||
          optimizedQuery.toLowerCase().includes('2025')) {
        console.log('✅ Contiene términos relevantes')
      } else {
        console.log('⚠️  No contiene términos suficientemente relevantes')
      }
    }
    
    // 3. Probar búsqueda completa con keywords optimizados
    console.log('\n🌐 Probando búsqueda completa con keywords optimizados...')
    
    const testQuery = 'hablame sobre la ley que salio este 2025 que se llama One Big beautiful tax Bill fue propuesta por donald trump'
    console.log(`📝 Query de prueba: "${testQuery}"`)
    
    // Extraer keywords optimizados
    const optimizedKeywords = geminiService.extractSearchKeywords(testQuery)
    console.log(`🔍 Keywords optimizados: "${optimizedKeywords}"`)
    
    // Realizar búsqueda con keywords optimizados
    const searchResults = await searchService.search(optimizedKeywords)
    console.log(`✅ Búsqueda completada con keywords optimizados`)
    console.log(`📏 Longitud de respuesta: ${searchResults.length} caracteres`)
    
    // Verificar si contiene información relevante
    if (searchResults.includes('One Big Beautiful') || 
        searchResults.includes('Tax Bill') ||
        searchResults.includes('2025')) {
      console.log('✅ Resultados contienen información relevante específica')
    } else {
      console.log('⚠️  Resultados podrían no ser suficientemente específicos')
    }
    
    // Vista previa de resultados
    console.log('\n📋 Vista previa de resultados:')
    console.log('─'.repeat(60))
    console.log(searchResults.substring(0, 300) + '...')
    console.log('─'.repeat(60))
    
    // 4. Comparar con búsqueda sin optimización
    console.log('\n🆚 Comparando con búsqueda sin optimización...')
    
    const unoptimizedResults = await searchService.search(testQuery)
    console.log(`📏 Búsqueda sin optimizar: ${unoptimizedResults.length} caracteres`)
    console.log(`📏 Búsqueda optimizada: ${searchResults.length} caracteres`)
    
    // 5. Verificar detección de búsqueda
    console.log('\n🎯 Probando detección de necesidad de búsqueda...')
    
    const needsSearch = geminiService.needsRealTimeSearch(testQuery)
    console.log(`🔍 ¿Detecta necesidad de búsqueda?: ${needsSearch ? '✅ SÍ' : '❌ NO'}`)
    
    if (needsSearch) {
      console.log('✅ Detección funcionando correctamente')
    } else {
      console.log('❌ PROBLEMA: No detecta la necesidad de búsqueda')
    }
    
    // 6. Resumen de mejoras
    console.log('\n✅ RESUMEN DE MEJORAS IMPLEMENTADAS')
    console.log('====================================')
    console.log('✅ Extracción inteligente de keywords')
    console.log('✅ Queries optimizados para Google Custom Search')
    console.log('✅ Filtrado de palabras irrelevantes')
    console.log('✅ Detección mejorada de términos específicos')
    console.log('✅ Manejo de patrones de leyes y regulaciones')
    
    console.log('\n🎯 RESULTADO ESPERADO:')
    console.log('Ahora las búsquedas deberían ser más precisas y específicas,')
    console.log('retornando información más relevante sobre la consulta exacta')
    console.log('en lugar de resultados genéricos.')
    
    console.log('\n📋 PRÓXIMO PASO:')
    console.log('Prueba enviando el mensaje al WhatsApp Bot para verificar')
    console.log('que ahora use los keywords optimizados en lugar del mensaje completo.')
    
  } catch (error) {
    console.error('❌ Error en prueba de mejoras:', error)
    console.error('📋 Stack:', error.stack)
  }
}

// Ejecutar pruebas
if (require.main === module) {
  testSearchImprovements().catch(console.error)
}

module.exports = { testSearchImprovements }