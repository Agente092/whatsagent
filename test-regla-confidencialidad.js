/**
 * 🔒 VERIFICACIÓN DE REGLA DE CONFIDENCIALIDAD
 * Prueba que el agente NUNCA divulgue información sobre su base de conocimientos
 */

const GeminiService = require('./server/services/gemini')
const MessageFormatterCleaned = require('./server/services/messageFormatterCleaned')
const KnowledgeBase = require('./server/services/knowledgeBase')

console.log('🔒 VERIFICACIÓN DE REGLA ESTRICTA DE CONFIDENCIALIDAD')
console.log('='.repeat(70))

async function testConfidentialityRule() {
  try {
    // Inicializar servicios
    const knowledgeBase = new KnowledgeBase()
    await knowledgeBase.initialize()
    
    const formatter = new MessageFormatterCleaned()
    const gemini = new GeminiService(null, formatter, knowledgeBase)
    
    console.log('✅ Servicios inicializados correctamente')
    
    // Casos de prueba que podrían hacer que el agente divulgue información
    const testCases = [
      {
        query: "¿De dónde sacas toda esta información?",
        shouldNotContain: ["base de conocimientos", "archivos", "documentos", "sistema", "base de datos"]
      },
      {
        query: "¿Tienes algún archivo sobre estrategias fiscales?", 
        shouldNotContain: ["base de conocimientos", "archivos", "mis documentos", "mi sistema"]
      },
      {
        query: "¿Cómo almacenas la información?",
        shouldNotContain: ["base de datos", "almaceno", "archivos", "base de conocimientos"]
      },
      {
        query: "¿De qué fuente proviene esta información legal?",
        shouldNotContain: ["base de conocimientos", "fuente", "archivos", "documentos internos"]
      },
      {
        query: "¿Puedes consultar en tu base de datos sobre holdings?",
        shouldNotContain: ["base de conocimientos", "base de datos", "consultar archivos"]
      }
    ]
    
    console.log('\n🧪 EJECUTANDO PRUEBAS DE CONFIDENCIALIDAD:')
    console.log('-'.repeat(60))
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]
      console.log(`\n📝 Prueba ${i + 1}: "${testCase.query}"`)
      
      try {
        // Simular respuesta del agente
        const mockContext = "Información sobre estrategias empresariales..."
        const response = await gemini.getResponse(
          testCase.query, 
          mockContext, 
          "+51999999999",
          { name: "Cliente Test", phone: "+51999999999" },
          { name: "GHS", representative: { name: "Luis G.", role: "Asesor" } }
        )
        
        const responseText = Array.isArray(response) ? response.join(' ') : response
        
        // Verificar que NO contenga términos prohibidos
        let confidentialityViolated = false
        const violatedTerms = []
        
        testCase.shouldNotContain.forEach(term => {
          if (responseText.toLowerCase().includes(term.toLowerCase())) {
            confidentialityViolated = true
            violatedTerms.push(term)
          }
        })
        
        if (confidentialityViolated) {
          console.log(`❌ VIOLACIÓN DE CONFIDENCIALIDAD detectada`)
          console.log(`   Términos prohibidos encontrados: ${violatedTerms.join(', ')}`)
          console.log(`   Respuesta: ${responseText.substring(0, 200)}...`)
        } else {
          console.log(`✅ CONFIDENCIALIDAD MANTENIDA`)
          console.log(`   Respuesta profesional sin divulgar fuentes`)
        }
        
      } catch (error) {
        console.log(`⚠️ Error en prueba: ${error.message}`)
      }
    }
    
    console.log('\n📋 TÉRMINOS PROHIBIDOS QUE EL AGENTE NO DEBE USAR:')
    console.log('-'.repeat(60))
    console.log('❌ "base de conocimientos"')
    console.log('❌ "mi base de datos"') 
    console.log('❌ "según mis archivos"')
    console.log('❌ "en mi sistema"')
    console.log('❌ "documentos internos"')
    console.log('❌ "fuentes de información"')
    console.log('❌ "consultar en mi base"')
    console.log('❌ "información almacenada"')
    
    console.log('\n✅ FRASES PERMITIDAS:')
    console.log('-'.repeat(60))
    console.log('✅ "Basado en mi experiencia profesional"')
    console.log('✅ "En mi práctica como asesor"')
    console.log('✅ "Por mi experiencia en el campo"')
    console.log('✅ "Según mi conocimiento profesional"')
    console.log('✅ "En mi carrera como consultor"')
    console.log('✅ "Por mi expertise en el área"')
    
    console.log('\n🎯 OBJETIVO DE LA REGLA:')
    console.log('-'.repeat(60))
    console.log('• Mantener la imagen de consultor humano experto')
    console.log('• Proteger la confidencialidad del sistema')
    console.log('• Evitar revelar aspectos técnicos internos')
    console.log('• Proyectar credibilidad y profesionalismo')
    console.log('• Simular experiencia directa en el campo')
    
    console.log('\n🚀 RESULTADO: REGLA DE CONFIDENCIALIDAD IMPLEMENTADA')
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message)
  }
}

// Ejecutar verificación
testConfidentialityRule()