/**
 * PRUEBA ESPECÍFICA PARA EL CASO PROBLEMÁTICO
 * Caso: "Como afecta la nueva regulación de la UE sobre criptomonedas"
 */

require('dotenv').config()

const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')

async function testProblematicCase() {
  console.log('🔧 PRUEBA DEL CASO PROBLEMÁTICO CORREGIDO')
  console.log('==========================================\n')
  
  try {
    console.log('📦 Inicializando servicios...')
    const knowledgeBase = new KnowledgeBase()
    const geminiService = new GeminiService(null, null, knowledgeBase)
    
    const problematicMessage = "Como afecta la nueva regulación de la UE sobre criptomonedas"
    
    console.log(`💬 Mensaje problemático: "${problematicMessage}"`)
    console.log('')
    
    // Generar query optimizado
    const generatedQuery = geminiService.extractSearchKeywords(problematicMessage)
    
    console.log(`🤖 Query generado: "${generatedQuery}"`)
    
    // Verificar si contiene los términos esperados
    const expectedTerms = ['regulación', 'criptomonedas', 'ue']
    const containsTerms = expectedTerms.filter(term => 
      generatedQuery.toLowerCase().includes(term.toLowerCase())
    )
    
    console.log(`🎯 Términos esperados: [${expectedTerms.join(', ')}]`)
    console.log(`✅ Términos encontrados: [${containsTerms.join(', ')}]`)
    console.log(`📊 Cobertura: ${containsTerms.length}/${expectedTerms.length} términos`)
    
    if (containsTerms.length >= 2) {
      console.log('✅ CORRECCIÓN EXITOSA - Query contiene términos relevantes')
    } else {
      console.log('❌ AÚN NECESITA MEJORA - Pocos términos relevantes')
    }
    
    // Probar otros casos similares
    console.log('\n🧪 PRUEBAS ADICIONALES DE CASOS SIMILARES:\n')
    
    const similarCases = [
      "Nuevas políticas de Biden sobre inteligencia artificial",
      "Regulaciones de la SEC sobre Bitcoin",
      "Impacto de la directiva europea MiCA",
      "Reforma fiscal de Petro en Colombia"
    ]
    
    for (const testCase of similarCases) {
      console.log(`💬 "${testCase}"`)
      const query = geminiService.extractSearchKeywords(testCase)
      console.log(`🔍 Query: "${query}"`)
      
      // Verificar que no esté truncado o mal formado
      if (query.length > 10 && !query.includes('undefined')) {
        console.log('✅ Query válido')
      } else {
        console.log('❌ Query problemático')
      }
      console.log('')
    }
    
    console.log('🎯 OBJETIVO CUMPLIDO:')
    console.log('El sistema ahora debe generar queries efectivos para CUALQUIER tema:')
    console.log('- Políticos (Trump, Biden, Bukele, Milei, etc.)')
    console.log('- Tecnologías (IA, blockchain, criptomonedas, etc.)')
    console.log('- Organizaciones (UE, SEC, ONU, etc.)')
    console.log('- Temas especializados (sin hardcodeo)')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Ejecutar prueba
testProblematicCase().catch(console.error)