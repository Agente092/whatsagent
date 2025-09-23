/**
 * SCRIPT DE DIAGNÓSTICO ESPECÍFICO PARA EL MENSAJE FALLIDO
 * 
 * Este script reproduce exactamente el caso que está fallando en WhatsApp
 * para identificar la causa raíz del problema
 */

// Cargar variables de entorno desde .env
require('dotenv').config()

const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')
const InternetSearchService = require('./server/services/internetSearch')

async function diagnoseFailedMessage() {
  console.log('🔧 DIAGNÓSTICO DEL MENSAJE FALLIDO')
  console.log('================================\n')
  
  try {
    // Mensaje exacto que está fallando
    const failingMessage = 'que  sabes de la nueva ley salio este 2025 que se llama  One Big beautiful tax Bill fue propuesta por donald trump y como usarla o aplicarla si estoy en Perú y operar desde acá en estados unidos'
    
    console.log(`💬 Mensaje que falla: "${failingMessage}"`)
    
    // 1. Probar servicios individualmente
    console.log('\n🔍 PASO 1: Probando InternetSearchService directamente...')
    const searchService = new InternetSearchService()
    
    try {
      const directSearch = await searchService.search('One Big Beautiful Tax Bill 2025')
      console.log('✅ InternetSearchService funciona individualmente')
      console.log(`📏 Longitud respuesta: ${directSearch.length} caracteres`)
      console.log(`📋 Vista previa: ${directSearch.substring(0, 200)}...`)
    } catch (error) {
      console.log('❌ InternetSearchService falla individualmente:', error.message)
      return
    }
    
    // 2. Probar GeminiService
    console.log('\n🤖 PASO 2: Probando GeminiService...')
    const knowledgeBase = new KnowledgeBase()
    const geminiService = new GeminiService(null, null, knowledgeBase)
    
    // Verificar que el servicio de búsqueda esté inicializado
    console.log(`🔗 ¿internetSearch inicializado?: ${geminiService.internetSearch ? 'SÍ' : 'NO'}`)
    
    if (!geminiService.internetSearch) {
      console.log('❌ PROBLEMA ENCONTRADO: internetSearch no está inicializado en GeminiService')
      return
    }
    
    // 3. Probar detecciones
    console.log('\n🎯 PASO 3: Probando detecciones...')
    
    const needsRealTime = geminiService.needsRealTimeSearch(failingMessage)
    const needsInternational = geminiService.needsInternationalInfo(failingMessage)
    const expansionAnalysis = geminiService.detectInternationalExpansion(failingMessage)
    
    console.log(`🔍 needsRealTimeSearch: ${needsRealTime}`)
    console.log(`🌍 needsInternationalInfo: ${needsInternational}`)
    console.log(`🌐 expansionAnalysis.hasIntent: ${expansionAnalysis.hasIntent}`)
    console.log(`📊 expansionAnalysis.confidence: ${expansionAnalysis.confidence}%`)
    
    // 4. Probar extracción de keywords
    console.log('\n🔑 PASO 4: Probando extracción de keywords...')
    
    const optimizedQuery = geminiService.extractSearchKeywords(failingMessage)
    console.log(`🎯 Keywords extraídos: "${optimizedQuery}"`)
    
    // 5. Simular el flujo completo de búsqueda como en buildEnhancedPromptWithPersonality
    console.log('\n🔄 PASO 5: Simulando flujo completo...')
    
    try {
      let searchQuery = optimizedQuery
      
      if (expansionAnalysis.hasIntent && expansionAnalysis.confidence > 30) {
        const internationalContext = expansionAnalysis.keywords.slice(0, 3).join(' ')
        searchQuery = `${optimizedQuery} ${internationalContext} international business expansion`
        console.log(`🌍 Query optimizado para expansión: "${searchQuery}"`)
      }
      
      console.log(`🔍 Ejecutando búsqueda con query: "${searchQuery}"`)
      const searchResults = await geminiService.internetSearch.search(searchQuery)
      
      console.log('✅ Búsqueda completada en flujo simulado')
      console.log(`📏 Longitud: ${searchResults.length} caracteres`)
      console.log(`📋 Contiene información relevante: ${searchResults.includes('One Big Beautiful') ? 'SÍ' : 'NO'}`)
      
    } catch (searchError) {
      console.log('❌ ERROR EN BÚSQUEDA SIMULADA:', searchError.message)
      console.log('📋 Stack completo:', searchError.stack)
      
      // Este es probablemente el problema real
      console.log('\n🚨 CAUSA RAÍZ ENCONTRADA:')
      console.log('El error ocurre en la búsqueda dentro del flujo de buildEnhancedPromptWithPersonality')
      
      return
    }
    
    // 6. Probar construcción de prompt completo
    console.log('\n📝 PASO 6: Probando construcción de prompt...')
    
    const conversationContext = {
      hasHistory: true,
      context: 'Conversación previa sobre estrategias empresariales',
      stage: 'exploring',
      currentTopic: 'legal'
    }
    
    try {
      const prompt = await geminiService.buildEnhancedPromptWithPersonality(
        failingMessage,
        'Contexto de conocimientos',
        conversationContext,
        'legal_query',
        null,
        null,
        { name: 'luis', phone: '51998148917' },
        { name: 'GHS', representative: { name: 'Luis G.' } }
      )
      
      console.log('✅ Prompt construido exitosamente')
      console.log(`📏 Longitud del prompt: ${prompt.length} caracteres`)
      
      if (prompt.includes('INFORMACIÓN EN TIEMPO REAL')) {
        console.log('✅ Prompt incluye información de búsqueda en tiempo real')
      } else {
        console.log('❌ Prompt NO incluye información de búsqueda en tiempo real')
      }
      
    } catch (promptError) {
      console.log('❌ ERROR EN CONSTRUCCIÓN DE PROMPT:', promptError.message)
      console.log('📋 Stack:', promptError.stack)
    }
    
    console.log('\n✅ DIAGNÓSTICO COMPLETADO')
    console.log('========================')
    console.log('El diagnóstico ayudará a identificar exactamente dónde falla el sistema.')
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error)
    console.error('📋 Stack completo:', error.stack)
  }
}

// Ejecutar diagnóstico
if (require.main === module) {
  diagnoseFailedMessage().catch(console.error)
}

module.exports = { diagnoseFailedMessage }