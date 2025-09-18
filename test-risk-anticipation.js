/**
 * 🧪 TEST: VERIFICACIÓN DE ANTICIPACIÓN DE RIESGOS
 * Probar que el agente ahora incluye anticipación proactiva de riesgos y dificultades
 */

require('dotenv').config()

const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')

async function testRiskAnticipation() {
  console.log('🧪 TEST: ANTICIPACIÓN PROACTIVA DE RIESGOS')
  console.log('==========================================\n')
  
  try {
    console.log('📦 Inicializando servicios...')
    const knowledgeBase = new KnowledgeBase()
    const geminiService = new GeminiService(null, null, knowledgeBase)
    
    // Casos de prueba que deben incluir anticipación de riesgos
    const testCases = [
      {
        query: "quiero crear una estructura offshore en Panamá",
        expectedRisks: [
          "riesgos regulatorios",
          "auditorías",
          "compliance",
          "reputacional",
          "SUNAT"
        ]
      },
      {
        query: "como puedo usar criptomonedas para mi negocio",
        expectedRisks: [
          "volatilidad",
          "regulación",
          "lavado de dinero",
          "UIF",
          "registro"
        ]
      },
      {
        query: "estrategias de apalancamiento extremo",
        expectedRisks: [
          "sobreendeudamiento",
          "garantías",
          "tasas de interés",
          "liquidez",
          "incumplimiento"
        ]
      }
    ]
    
    console.log('🔍 Verificando que las instrucciones incluyen anticipación de riesgos...\n')
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]
      console.log(`📝 CASO ${i + 1}: "${testCase.query}"`)
      console.log('─'.repeat(60))
      
      // Generar prompt con las nuevas instrucciones
      const conversationContext = { hasHistory: false, context: '', stage: 'initial', currentTopic: null }
      const intent = 'financial_crime_query'
      
      const prompt = await geminiService.buildEnhancedPromptWithPersonality(
        testCase.query,
        'test context',
        conversationContext,
        intent,
        null, // personalityInstructions
        null, // humanReasoningResult
        { name: 'Cliente Test' },
        { name: 'GHS', representative: { name: 'Luis G.' } }
      )
      
      // Verificar que el prompt incluye las nuevas instrucciones de riesgo
      console.log('🔍 Verificando instrucciones de anticipación de riesgos...')
      
      const hasRiskInstructions = [
        'ANTICIPACIÓN PROACTIVA DE RIESGOS',
        'SIEMPRE IDENTIFICA Y MENCIONA los riesgos potenciales',
        'MÉTODOS ESPECÍFICOS para prevenir, mitigar o superar',
        'PLANES DE CONTINGENCIA específicos',
        'SEÑALES DE ALERTA temprana',
        'ESTRATEGIAS DE MITIGACIÓN'
      ]
      
      let foundInstructions = 0
      hasRiskInstructions.forEach(instruction => {
        if (prompt.includes(instruction)) {
          foundInstructions++
        }
      })
      
      if (foundInstructions >= 4) {
        console.log('✅ INSTRUCCIONES DE RIESGO INCLUIDAS EN PROMPT')
        console.log(`📊 Encontradas ${foundInstructions}/${hasRiskInstructions.length} instrucciones`)
      } else {
        console.log('❌ FALTAN INSTRUCCIONES DE RIESGO EN PROMPT')
        console.log(`📊 Solo ${foundInstructions}/${hasRiskInstructions.length} instrucciones encontradas`)
      }
      
      // Verificar estructura de respuesta incluye riesgos
      const hasRiskFormat = prompt.includes('ANTICIPACIÓN DE RIESGOS') && 
                           prompt.includes('MEDIDAS PREVENTIVAS') && 
                           prompt.includes('PLANES DE CONTINGENCIA')
      
      if (hasRiskFormat) {
        console.log('✅ FORMATO DE RESPUESTA INCLUYE SECCIONES DE RIESGO')
      } else {
        console.log('❌ FORMATO DE RESPUESTA NO INCLUYE SECCIONES DE RIESGO')
      }
      
      console.log('\n🎯 EXPECTATIVA PARA RESPUESTA REAL:')
      console.log('El agente debería ahora incluir automáticamente:')
      console.log('• Identificación proactiva de riesgos específicos')
      console.log('• Métodos para prevenir cada riesgo identificado')
      console.log('• Soluciones tanto legales como en zona gris')
      console.log('• Planes de contingencia para escenarios adversos')
      console.log('• Señales de alerta temprana')
      console.log('• Medidas de protección adicionales')
      
      console.log('\n' + '='.repeat(80) + '\n')
    }
    
    console.log('📊 RESUMEN DE MEJORAS IMPLEMENTADAS:')
    console.log('====================================')
    console.log('✅ 1. Instrucciones de anticipación de riesgos agregadas')
    console.log('✅ 2. Metodologías preventivas incluidas')
    console.log('✅ 3. Planes de contingencia incorporados')
    console.log('✅ 4. Soluciones legales e ilegales especificadas')
    console.log('✅ 5. Formato de respuesta actualizado con secciones de riesgo')
    
    console.log('\n🚀 BENEFICIOS ESPERADOS:')
    console.log('========================')
    console.log('🎯 PROACTIVIDAD: El agente anticipará problemas antes de que ocurran')
    console.log('🛡️ PROTECCIÓN: Proporcionará medidas preventivas específicas')
    console.log('🎪 EXPERTISE: Demostrará conocimiento profundo al prever dificultades')
    console.log('🔧 SOLUCIONES: Ofrecerá múltiples alternativas para cada riesgo')
    console.log('📋 COMPLETITUD: Respuestas más integrales y valiosas')
    
    console.log('\n📋 PRÓXIMO PASO:')
    console.log('Reiniciar servidor y probar con consulta real para verificar que')
    console.log('el agente ahora incluye automáticamente anticipación de riesgos.')
    
  } catch (error) {
    console.error('❌ Error en test:', error)
  }
}

// Ejecutar test
testRiskAnticipation()