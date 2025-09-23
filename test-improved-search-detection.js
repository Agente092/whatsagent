/**
 * 🧪 TEST: VERIFICACIÓN DE MEJORAS EN DETECCIÓN DE BÚSQUEDAS
 * Probar que el caso específico del usuario ahora funcione correctamente
 */

require('dotenv').config()

const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')

async function testImprovedSearchDetection() {
  console.log('🧪 TEST: MEJORAS EN DETECCIÓN DE BÚSQUEDAS')
  console.log('==========================================\n')
  
  try {
    console.log('📦 Inicializando servicios...')
    const knowledgeBase = new KnowledgeBase()
    const geminiService = new GeminiService(null, null, knowledgeBase)
    
    // 🎯 EL CASO ESPECÍFICO PROBLEMÁTICO DEL USUARIO
    const problematicQuery = "En qué países puedo crear una empresa fantasma y que me sea útil si vivo en Perú y como sacar provecho a eso"
    
    console.log('\n📝 CASO PROBLEMÁTICO DEL USUARIO:')
    console.log('================================')
    console.log(`💬 Consulta: "${problematicQuery}"`)
    
    // Test 1: Verificar detección de búsqueda en tiempo real
    const needsRealTimeSearch = geminiService.needsRealTimeSearch(problematicQuery)
    console.log(`\n🔍 ¿Detecta necesidad de búsqueda? ${needsRealTimeSearch ? '✅ SÍ' : '❌ NO'}`)
    
    // Test 2: Verificar detección de información internacional
    const needsInternationalInfo = geminiService.needsInternationalInfo(problematicQuery)
    console.log(`🌍 ¿Detecta información internacional? ${needsInternationalInfo ? '✅ SÍ' : '❌ NO'}`)
    
    // Test 3: Verificar generación de query optimizado
    const optimizedQuery = geminiService.extractSearchKeywords(problematicQuery)
    console.log(`🎯 Query optimizado generado: "${optimizedQuery}"`)
    
    // Test 4: Verificar que el query es efectivo
    const isGoodQuery = optimizedQuery.includes('countries') || 
                       optimizedQuery.includes('offshore') || 
                       optimizedQuery.includes('shell') ||
                       optimizedQuery.includes('jurisdiction')
    console.log(`📊 ¿Query es efectivo? ${isGoodQuery ? '✅ SÍ' : '❌ NO'}`)
    
    console.log('\n📋 CASOS ADICIONALES DE PRUEBA:')
    console.log('===============================')
    
    // Casos adicionales que deberían funcionar
    const additionalCases = [
      "Qué países tienen convenios con Perú sobre doble imposición",
      "Cuáles son los mejores países para crear una empresa offshore",
      "En qué jurisdicciones puedo proteger mis activos",
      "Qué países ofrecen mejores beneficios fiscales para empresarios peruanos",
      "Dónde puedo crear una holding internacional desde Perú"
    ]
    
    additionalCases.forEach((testCase, index) => {
      console.log(`\n${index + 1}. "${testCase}"`)
      
      const needsSearch = geminiService.needsRealTimeSearch(testCase)
      const needsIntl = geminiService.needsInternationalInfo(testCase)
      const query = geminiService.extractSearchKeywords(testCase)
      
      console.log(`   🔍 Búsqueda: ${needsSearch ? '✅' : '❌'} | 🌍 Internacional: ${needsIntl ? '✅' : '❌'}`)
      console.log(`   🎯 Query: "${query}"`)
    })
    
    console.log('\n🎯 RESULTADO ESPERADO DESPUÉS DE LAS MEJORAS:')
    console.log('============================================')
    console.log('✅ El agente DEBE detectar que necesita buscar información')
    console.log('✅ El agente DEBE generar un query efectivo en inglés')
    console.log('✅ El agente DEBE realizar búsqueda web real')
    console.log('✅ El agente DEBE proporcionar información ESPECÍFICA de países')
    console.log('✅ El agente DEBE generar preguntas de seguimiento pertinentes')
    
    console.log('\n📋 PRÓXIMO PASO:')
    console.log('================')
    console.log('1. 🔄 Reiniciar servidor: npm run dev:server')
    console.log('2. 📱 Probar mensaje EXACTO: "En qué países puedo crear una empresa fantasma y que me sea útil si vivo en Perú y como sacar provecho a eso"')
    console.log('3. ✅ Verificar que ahora proporcione información específica de países')
    console.log('4. ✅ Verificar que genere preguntas como "¿Con cuál de estos países te interesa que profundicemos?"')
    
  } catch (error) {
    console.error('❌ Error en test:', error)
  }
}

// Ejecutar test
testImprovedSearchDetection()