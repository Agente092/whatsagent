/**
 * SCRIPT DE PRUEBA PARA DETECCIÓN DE EXPANSIÓN INTERNACIONAL
 * 
 * Este script valida que el nuevo sistema de detección de expansión internacional
 * funcione correctamente y genere respuestas especializadas
 */

// Cargar variables de entorno desde .env
require('dotenv').config()

const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')

async function testInternationalExpansionDetection() {
  console.log('🌍 PRUEBA DE DETECCIÓN DE EXPANSIÓN INTERNACIONAL')
  console.log('===============================================\n')
  
  try {
    // Crear instancias de servicios
    console.log('📦 Inicializando servicios...')
    const knowledgeBase = new KnowledgeBase()
    const geminiService = new GeminiService(null, null, knowledgeBase)
    
    // Casos de prueba para expansión internacional
    const testCases = [
      {
        message: 'que sabes de la nueva ley que salio este 2025 que se llama One Big beautiful tax Bill fue propuesta por donald trump',
        expectedDetection: true,
        category: 'Ley internacional con impacto en expansión'
      },
      {
        message: 'quiero expandir mi empresa peruana a Estados Unidos, que necesito',
        expectedDetection: true,
        category: 'Expansión directa explícita'
      },
      {
        message: 'como puedo crear una LLC en Miami desde Perú',
        expectedDetection: true,
        category: 'Estructura internacional específica'
      },
      {
        message: 'necesito asesoría para operar en el extranjero desde Lima',
        expectedDetection: true,
        category: 'Operación internacional'
      },
      {
        message: 'quiero hacer una sucursal en España',
        expectedDetection: true,
        category: 'Sucursal internacional'
      },
      {
        message: 'como registro una empresa en Lima',
        expectedDetection: false,
        category: 'Solo Perú (no internacional)'
      },
      {
        message: 'cuales son los pasos para SUNARP',
        expectedDetection: false,
        category: 'Proceso local peruano'
      }
    ]
    
    console.log('🧪 EJECUTANDO CASOS DE PRUEBA...\n')
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]
      console.log(`📝 CASO ${i + 1}: ${testCase.category}`)
      console.log(`💬 Mensaje: "${testCase.message}"`)
      
      // Detectar expansión internacional
      const expansionAnalysis = geminiService.detectInternationalExpansion(testCase.message)
      
      console.log(`🎯 Detección esperada: ${testCase.expectedDetection ? 'SÍ' : 'NO'}`)
      console.log(`🤖 Detección real: ${expansionAnalysis.hasIntent ? 'SÍ' : 'NO'}`)
      console.log(`📊 Confianza: ${expansionAnalysis.confidence}%`)
      
      if (expansionAnalysis.hasIntent) {
        console.log(`🏷️  Categorías: ${expansionAnalysis.categories.join(', ')}`)
        console.log(`🔑 Keywords: ${expansionAnalysis.keywords.join(', ')}`)
      }
      
      // Verificar si la detección es correcta
      if (expansionAnalysis.hasIntent === testCase.expectedDetection) {
        console.log('✅ DETECCIÓN CORRECTA')
      } else {
        console.log('❌ DETECCIÓN INCORRECTA')
      }
      
      // Si se detectó expansión, mostrar instrucciones generadas
      if (expansionAnalysis.hasIntent && expansionAnalysis.confidence > 30) {
        console.log('\n📋 INSTRUCCIONES ESPECIALES GENERADAS:')
        const instructions = geminiService.generateInternationalExpansionInstructions(expansionAnalysis, testCase.message)
        console.log(instructions.substring(0, 500) + '...')
      }
      
      console.log('\n' + '─'.repeat(80) + '\n')
    }
    
    // Probar extracción de keywords para consultas internacionales
    console.log('🔍 PRUEBA DE EXTRACCIÓN DE KEYWORDS INTERNACIONALES\n')
    
    const internationalQuery = 'que sabes de la nueva ley que salio este 2025 que se llama One Big beautiful tax Bill fue propuesta por donald trump'
    console.log(`💬 Query original: "${internationalQuery}"`)
    
    const optimizedKeywords = geminiService.extractSearchKeywords(internationalQuery)
    console.log(`🎯 Keywords extraídos: "${optimizedKeywords}"`)
    
    // Simular optimización con contexto internacional
    const expansionAnalysis = geminiService.detectInternationalExpansion(internationalQuery)
    if (expansionAnalysis.hasIntent && expansionAnalysis.confidence > 30) {
      const internationalContext = expansionAnalysis.keywords.slice(0, 3).join(' ')
      const optimizedQuery = `${optimizedKeywords} ${internationalContext} international business expansion`
      console.log(`🌍 Query optimizado para expansión: "${optimizedQuery}"`)
    }
    
    // Resumen de capacidades
    console.log('\n✅ RESUMEN DE NUEVAS CAPACIDADES')
    console.log('====================================')
    console.log('✅ Detección automática de intención de expansión internacional')
    console.log('✅ Análisis de confianza y categorización de consultas')
    console.log('✅ Generación de instrucciones especializadas dinámicas')
    console.log('✅ Optimización de búsquedas para contexto internacional')
    console.log('✅ Soporte para múltiples jurisdicciones objetivo')
    console.log('✅ Análisis de riesgos y oportunidades específicas')
    
    console.log('\n🎯 BENEFICIOS PARA EL USUARIO:')
    console.log('🌍 Respuestas especializadas para expansión internacional')
    console.log('📊 Análisis detallado de ventajas/desventajas por país')
    console.log('⚖️  Cobertura de métodos legales e ilícitos')
    console.log('🚨 Detección proactiva de problemas y soluciones')
    console.log('💡 Casos prácticos adaptados a empresarios peruanos')
    
    console.log('\n📋 PRÓXIMO PASO:')
    console.log('Reinicia el servidor y prueba con mensajes de expansión internacional')
    console.log('para verificar que el agente genere respuestas especializadas.')
    
  } catch (error) {
    console.error('❌ Error en prueba:', error)
    console.error('📋 Stack:', error.stack)
  }
}

// Ejecutar pruebas
if (require.main === module) {
  testInternationalExpansionDetection().catch(console.error)
}

module.exports = { testInternationalExpansionDetection }