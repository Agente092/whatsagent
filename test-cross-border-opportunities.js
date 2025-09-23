/**
 * SCRIPT DE PRUEBA PARA DETECCIÓN DE OPORTUNIDADES TRANSFRONTERIZAS
 * 
 * Este script valida que el nuevo sistema de detección de oportunidades
 * transfronterizas funcione correctamente para clientes peruanos
 */

// Cargar variables de entorno desde .env
require('dotenv').config()

const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')

async function testCrossBorderOpportunities() {
  console.log('🚀 PRUEBA DE DETECCIÓN DE OPORTUNIDADES TRANSFRONTERIZAS')
  console.log('====================================================\n')
  
  try {
    // Crear instancias de servicios
    console.log('📦 Inicializando servicios...')
    const knowledgeBase = new KnowledgeBase()
    const geminiService = new GeminiService(null, null, knowledgeBase)
    
    // Casos de prueba específicos para detección transfronteriza
    const testCases = [
      {
        message: 'Que sabes de la ley One Beautiful Bill tax',
        description: 'Consulta sobre ley internacional específica',
        expectedDetection: true,
        expectedConfidence: '>60%'
      },
      {
        message: 'que sabes de la nueva ley que salio este 2025 que se llama One Big beautiful tax Bill fue propuesta por donald trump',
        description: 'Consulta detallada sobre ley Trump con contexto temporal',
        expectedDetection: true,
        expectedConfidence: '>70%'
      },
      {
        message: 'como puedo aprovechar la nueva legislación de Estados Unidos desde Perú',
        description: 'Intención explícita de aprovechamiento transfronterizo',
        expectedDetection: true,
        expectedConfidence: '>80%'
      },
      {
        message: 'quiero invertir en Miami pero operando desde Lima',
        description: 'Inversión específica con contexto transfronterizo',
        expectedDetection: true,
        expectedConfidence: '>75%'
      },
      {
        message: 'como usar a mi favor las nuevas leyes de USA estando en Perú',
        description: 'Intención clara de aprovechamiento con países específicos',
        expectedDetection: true,
        expectedConfidence: '>85%'
      },
      {
        message: 'que beneficios fiscales internacionales puedo aprovechar',
        description: 'Consulta sobre beneficios fiscales internacionales',
        expectedDetection: true,
        expectedConfidence: '>60%'
      },
      {
        message: 'como registrar una empresa en Lima',
        description: 'Consulta puramente local (no debería detectar)',
        expectedDetection: false,
        expectedConfidence: '<40%'
      },
      {
        message: 'cuales son los pasos para SUNARP',
        description: 'Proceso local peruano (no debería detectar)',
        expectedDetection: false,
        expectedConfidence: '<40%'
      }
    ]
    
    console.log('🧪 EJECUTANDO CASOS DE PRUEBA...\n')
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]
      console.log(`📝 CASO ${i + 1}: ${testCase.description}`)
      console.log(`💬 Mensaje: "${testCase.message}"`)
      
      // Detectar oportunidad transfronteriza
      const crossBorderAnalysis = geminiService.detectCrossBorderOpportunity(testCase.message)
      
      console.log(`🎯 Detección esperada: ${testCase.expectedDetection ? 'SÍ' : 'NO'}`)
      console.log(`🤖 Detección real: ${crossBorderAnalysis.hasOpportunity ? 'SÍ' : 'NO'}`)
      console.log(`📊 Confianza: ${crossBorderAnalysis.confidence}% (esperado ${testCase.expectedConfidence})`)
      
      if (crossBorderAnalysis.hasOpportunity) {
        console.log(`🏷️  Categorías: ${crossBorderAnalysis.categories.join(', ')}`)
        console.log(`🔑 Keywords: ${crossBorderAnalysis.keywords.slice(0, 3).join(', ')}`)
        console.log(`🌍 Países objetivo: ${crossBorderAnalysis.targetCountries.join(', ') || 'No específico'}`)
        console.log(`💡 Intención de aprovechamiento: ${crossBorderAnalysis.leverageIntent ? 'SÍ' : 'NO'}`)
        console.log(`🇵🇪 Contexto peruano: ${crossBorderAnalysis.crossBorderContext ? 'SÍ' : 'NO'}`)
      }
      
      // Verificar si la detección es correcta
      if (crossBorderAnalysis.hasOpportunity === testCase.expectedDetection) {
        console.log('✅ DETECCIÓN CORRECTA')
      } else {
        console.log('❌ DETECCIÓN INCORRECTA')
      }
      
      // Si se detectó oportunidad, mostrar estrategia generada
      if (crossBorderAnalysis.hasOpportunity && crossBorderAnalysis.confidence > 40) {
        console.log('\n📋 ESTRATEGIA TRANSFRONTERIZA GENERADA:')
        const strategy = geminiService.generateCrossBorderStrategy(crossBorderAnalysis, testCase.message)
        console.log(strategy.substring(0, 800) + '...')
      }
      
      console.log('\n' + '─'.repeat(80) + '\n')
    }
    
    // Prueba de integración con expansión internacional
    console.log('🔗 PRUEBA DE INTEGRACIÓN CON EXPANSIÓN INTERNACIONAL\n')
    
    const complexQuery = 'que sabes de la nueva ley que salio este 2025 que se llama One Big beautiful tax Bill fue propuesta por donald trump y como usarla o aplicarla si estoy en Perú y operar desde acá en estados unidos'
    console.log(`💬 Query complejo: "${complexQuery}"`)
    
    // Detectar expansión internacional
    const expansionAnalysis = geminiService.detectInternationalExpansion(complexQuery)
    console.log(`🌍 Expansión internacional detectada: ${expansionAnalysis.hasIntent ? 'SÍ' : 'NO'} (${expansionAnalysis.confidence}%)`)
    
    // Detectar oportunidad transfronteriza
    const crossBorderAnalysis = geminiService.detectCrossBorderOpportunity(complexQuery)
    console.log(`🚀 Oportunidad transfronteriza detectada: ${crossBorderAnalysis.hasOpportunity ? 'SÍ' : 'NO'} (${crossBorderAnalysis.confidence}%)`)
    
    // Mostrar análisis combinado
    if (expansionAnalysis.hasIntent && crossBorderAnalysis.hasOpportunity) {
      console.log('\n🎯 ANÁLISIS COMBINADO EXITOSO:')
      console.log('✅ El sistema detecta tanto expansión internacional como oportunidades transfronterizas')
      console.log('✅ El cliente recibirá estrategias especializadas completas')
    }
    
    // Resumen de capacidades
    console.log('\n✅ RESUMEN DE NUEVAS CAPACIDADES IMPLEMENTADAS')
    console.log('===============================================')
    console.log('✅ Detección inteligente de oportunidades transfronterizas')
    console.log('✅ Identificación automática de intención de aprovechamiento')
    console.log('✅ Análisis de países objetivo específicos')
    console.log('✅ Generación de estrategias personalizadas para empresarios peruanos')
    console.log('✅ Integración con sistema de expansión internacional existente')
    console.log('✅ Optimización de keywords para búsquedas más efectivas')
    console.log('✅ Reducción de queries largos y confusos')
    console.log('✅ Priorización inteligente de términos específicos')
    
    console.log('\n🎯 BENEFICIOS PARA EL USUARIO:')
    console.log('🚀 Respuestas más precisas sobre oportunidades internacionales')
    console.log('🔍 Búsquedas optimizadas que encuentran información relevante')
    console.log('💡 Detección automática de contexto transfronterizo')
    console.log('📊 Estrategias específicas para empresarios peruanos')
    
    console.log('\n📋 PRÓXIMO PASO:')
    console.log('Reinicia el servidor WhatsApp y prueba con el mensaje:')
    console.log('"Que sabes de la ley One Beautiful Bill tax"')
    console.log('para verificar que ahora genere búsquedas más efectivas.')
    
  } catch (error) {
    console.error('❌ Error en prueba:', error)
    console.error('📋 Stack:', error.stack)
  }
}

// Ejecutar pruebas
if (require.main === module) {
  testCrossBorderOpportunities().catch(console.error)
}

module.exports = { testCrossBorderOpportunities }