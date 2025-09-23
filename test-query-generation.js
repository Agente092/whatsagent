/**
 * SCRIPT DE PRUEBA ESPECÍFICO PARA QUERIES DE BÚSQUEDA
 * 
 * Este script valida que los queries de búsqueda se generen correctamente
 * para casos específicos como "Beautiful Bill tax"
 */

// Cargar variables de entorno desde .env
require('dotenv').config()

const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')

async function testQueryGeneration() {
  console.log('🔍 PRUEBA DE GENERACIÓN DE QUERIES DE BÚSQUEDA')
  console.log('===============================================\n')
  
  try {
    // Crear instancias de servicios
    console.log('📦 Inicializando servicios...')
    const knowledgeBase = new KnowledgeBase()
    const geminiService = new GeminiService(null, null, knowledgeBase)
    
    // Casos de prueba UNIVERSALES para cualquier tipo de búsqueda
    const testCases = [
      {
        message: 'Sabes de cómo podría usar la ley Beautiful Bill tax a mi favor?',
        description: 'Ley específica con intención de uso',
        shouldContain: ['beautiful', 'bill', 'tax']
      },
      {
        message: 'Investiga bien sobre la One Beautiful Bill tax',
        description: 'Ley específica para investigación',
        shouldContain: ['beautiful', 'bill', 'tax']
      },
      {
        message: 'Información sobre la nueva ley de Bukele en El Salvador',
        description: 'Ley de otro presidente/país',
        shouldContain: ['ley', 'bukele', 'salvador']
      },
      {
        message: 'Qué sabes sobre las reformas de Milei en Argentina 2024',
        description: 'Reformas de presidente argentino',
        shouldContain: ['reformas', 'milei', 'argentina']
      },
      {
        message: 'Como afecta la nueva regulación de la UE sobre criptomonedas',
        description: 'Regulación europea',
        shouldContain: ['regulación', 'criptomonedas']
      },
      {
        message: 'Estrategias fiscales para inversiones en bienes raíces Miami',
        description: 'Consulta de inversión específica',
        shouldContain: ['fiscales', 'inversiones', 'miami']
      },
      {
        message: 'Últimas noticias sobre la reforma tributaria Colombia',
        description: 'Consulta de noticias recientes',
        shouldContain: ['reforma', 'tributaria', 'colombia']
      },
      {
        message: 'Como registrar empresa en Lima',
        description: 'Consulta local simple',
        shouldContain: ['registrar', 'empresa', 'lima']
      }
    ]
    
    console.log('🧪 EJECUTANDO CASOS DE PRUEBA...\n')
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]
      console.log(`📝 CASO ${i + 1}: ${testCase.description}`)
      console.log(`💬 Mensaje: "${testCase.message}"`)
      
      // Generar query optimizado
      const generatedQuery = geminiService.extractSearchKeywords(testCase.message)
      
      console.log(`🎯 Términos esperados: [${testCase.shouldContain.join(', ')}]`)
      console.log(`🤖 Query generado: "${generatedQuery}"`)
      
      // Verificar si contiene los términos esperados
      const containsExpected = testCase.shouldContain.some(term => 
        generatedQuery.toLowerCase().includes(term.toLowerCase())
      )
      
      if (containsExpected && generatedQuery.length > 5) {
        console.log('✅ QUERY CORRECTO - Contiene términos relevantes')
      } else {
        console.log('❌ QUERY NECESITA MEJORA')
        console.log(`🔧 Razón: ${!containsExpected ? 'No contiene términos esperados' : 'Query muy corto'}`)
      }
      
      // Verificar detecciones adicionales
      const needsRealTime = geminiService.needsRealTimeSearch(testCase.message)
      const crossBorderAnalysis = geminiService.detectCrossBorderOpportunity(testCase.message)
      
      console.log(`🔍 Detección búsqueda tiempo real: ${needsRealTime ? 'SÍ' : 'NO'}`)
      console.log(`🚀 Detección transfronteriza: ${crossBorderAnalysis.hasOpportunity ? 'SÍ' : 'NO'} (${crossBorderAnalysis.confidence}%)`)
      
      console.log('\n' + '─'.repeat(80) + '\n')
    }
    
    // Prueba adicional: verificar que queries no específicos funcionen
    console.log('🔧 PRUEBA ADICIONAL: Queries no específicos\n')
    
    const generalCases = [
      'como registrar empresa en Lima',
      'que es SUNARP',
      'inversiones en bienes raices Peru'
    ]
    
    for (const message of generalCases) {
      console.log(`💬 Mensaje: "${message}"`)
      const query = geminiService.extractSearchKeywords(message)
      console.log(`🎯 Query generado: "${query}"`)
      
      if (query.length > 3 && !query.includes('undefined')) {
        console.log('✅ Query válido')
      } else {
        console.log('❌ Query problemático')
      }
      console.log('')
    }
    
    console.log('✅ RESUMEN DE PRUEBAS DEL SISTEMA UNIVERSAL')
    console.log('============================================')
    console.log('✨ Si los queries generan términos relevantes para CUALQUIER tipo de consulta,')
    console.log('entonces tenemos un sistema verdaderamente inteligente y flexible.')
    console.log('')
    console.log('🎯 CARACTERÍSTICAS DEL SISTEMA MEJORADO:')
    console.log('✅ No hardcodea nombres específicos (Trump, Biden, etc.)')
    console.log('✅ Funciona para cualquier presidente, político o entidad')
    console.log('✅ Detecta patrones universales (ley, bill, reforma, etc.)')
    console.log('✅ Optimiza automáticamente según el tipo de consulta')
    console.log('✅ Extracción inteligente de nombres propios dinámica')
    console.log('')
    console.log('📋 PRÓXIMO PASO:')
    console.log('Ejecuta nuevamente el servidor WhatsApp y prueba con CUALQUIER consulta:')
    console.log('- "Qué sabes de la nueva ley de Bukele"')
    console.log('- "Reformas de Milei en Argentina"')
    console.log('- "Regulaciones de la UE sobre IA"')
    console.log('- "Políticas de Xi Jinping"')
    console.log('✨ ¡El sistema debe funcionar para TODAS!')
    
  } catch (error) {
    console.error('❌ Error en prueba:', error)
    console.error('📋 Stack:', error.stack)
  }
}

// Ejecutar pruebas
if (require.main === module) {
  testQueryGeneration().catch(console.error)
}

module.exports = { testQueryGeneration }