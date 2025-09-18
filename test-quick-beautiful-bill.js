/**
 * PRUEBA RÁPIDA PARA BEAUTIFUL BILL TAX
 */

require('dotenv').config()

const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')

async function quickTestBeautifulBill() {
  console.log('🔧 PRUEBA RÁPIDA: Beautiful Bill Tax Query')
  console.log('==========================================\n')
  
  try {
    console.log('📦 Inicializando servicios...')
    const knowledgeBase = new KnowledgeBase()
    const geminiService = new GeminiService(null, null, knowledgeBase)
    
    const testMessage = "Sabes de cómo podría usar la ley Beautiful Bill tax a mi favor? Si soy un empresario del rubro de la construcción"
    
    console.log(`💬 Mensaje: "${testMessage}"`)
    console.log('')
    
    // Generar query optimizado
    const generatedQuery = geminiService.extractSearchKeywords(testMessage)
    
    console.log(`🤖 Query generado: "${generatedQuery}"`)
    
    // Verificar que sea efectivo
    if (generatedQuery.includes('Beautiful Tax Bill') || 
        (generatedQuery.includes('beautiful') && generatedQuery.includes('bill'))) {
      console.log('✅ QUERY CORRECTO - Contiene términos específicos sobre Beautiful Bill')
      
      // Verificar que NO tenga términos confusos
      if (!generatedQuery.includes('podr') && !generatedQuery.includes('rubro empresario')) {
        console.log('✅ QUERY LIMPIO - Sin términos truncados o confusos')
      } else {
        console.log('⚠️ Query contiene términos que podrían mejorarse')
      }
      
    } else {
      console.log('❌ QUERY PROBLEMÁTICO - No contiene términos específicos')
    }
    
    console.log('')
    console.log('🎯 ESPERADO PARA BÚSQUEDA EFECTIVA:')
    console.log('- Debe contener "Beautiful Tax Bill" o "Beautiful Bill Tax"')
    console.log('- Debe ser conciso y directo')
    console.log('- No debe mezclar español e inglés confusamente')
    console.log('- Debe encontrar información real en Google Custom Search')
    
    console.log('')
    console.log('📋 PRÓXIMO PASO:')
    console.log('Si el query es correcto, reinicia el servidor y prueba en WhatsApp.')
    console.log('El agente debería encontrar información real sobre Beautiful Tax Bill.')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Ejecutar prueba rápida
quickTestBeautifulBill().catch(console.error)