/**
 * ⚡ PRUEBA RÁPIDA: Beautiful Bill
 * Script simple para probar si las correcciones funcionan
 */

require('dotenv').config()

const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')

async function quickTest() {
  console.log('⚡ PRUEBA RÁPIDA: Beautiful Bill')
  console.log('==============================\n')
  
  const knowledgeBase = new KnowledgeBase()
  const geminiService = new GeminiService(null, null, knowledgeBase)
  
  const message = "Tienes conocimiento sobre la ley One Beautiful Bill tax?"
  
  // 1. Verificar detección
  const detected = geminiService.needsRealTimeSearch(message)
  console.log(`🔍 Detección: ${detected ? '✅ ACTIVADA' : '❌ FALLÓ'}`)
  
  // 2. Verificar keywords
  const keywords = geminiService.extractSearchKeywords(message)
  console.log(`🎯 Keywords: "${keywords}"`)
  
  // 3. Test de búsqueda
  console.log('\n🌐 Probando búsqueda...')
  try {
    const results = await geminiService.internetSearch.search(keywords)
    console.log(`✅ Búsqueda exitosa: ${results.length} caracteres`)
    
    // Verificar contenido relevante
    const relevant = results.toLowerCase().includes('beautiful') || 
                    results.toLowerCase().includes('bill')
    console.log(`📊 Contenido relevante: ${relevant ? '✅ SÍ' : '❌ NO'}`)
    
  } catch (error) {
    console.log(`❌ Error búsqueda: ${error.message}`)
  }
  
  console.log('\n✅ CORRECCIONES APLICADAS:')
  console.log('- Instrucciones más enfáticas en prompt')
  console.log('- Alerta crítica al inicio para priorizar búsqueda')
  console.log('- Detección mejorada para términos mixtos')
  
  console.log('\n🔄 PRÓXIMO PASO: Reiniciar servidor y probar')
}

quickTest().catch(console.error)