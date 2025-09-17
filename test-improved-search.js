/**
 * SCRIPT DE PRUEBA PARA LA BÚSQUEDA MEJORADA POR INTERNET
 * 
 * Este script valida que la nueva implementación de búsqueda proporcione
 * información actualizada específicamente para "One Big Beautiful Tax Bill"
 */

const InternetSearchService = require('./server/services/internetSearch')
const GeminiService = require('./server/services/gemini')
const KnowledgeBase = require('./server/services/knowledgeBase')

async function testImprovedSearch() {
  console.log('🚀 PRUEBA DE BÚSQUEDA MEJORADA POR INTERNET')
  console.log('==========================================\n')
  
  try {
    // 1. Probar búsqueda directa mejorada
    console.log('📡 Probando servicio de búsqueda mejorado...')
    const searchService = new InternetSearchService()
    
    const testQueries = [
      'Busca información sobre Que sabes de la ley One Big beautiful tax Bill',
      'One Big Beautiful Tax Bill 2025',
      'nueva ley fiscal Estados Unidos',
      'tax reform 2025',
      'información actualizada impuestos'
    ]
    
    for (const query of testQueries) {
      console.log(`\n🔍 Consultando: "${query}"`)
      
      try {
        const results = await searchService.search(query)
        console.log('✅ Búsqueda completada')
        console.log(`📏 Longitud de respuesta: ${results.length} caracteres`)
        
        // Verificar contenido actualizado
        if (results.includes('2025') && results.includes('Beautiful')) {
          console.log('✅ Contiene información ACTUALIZADA sobre 2025')
        } else if (results.includes('2017')) {
          console.log('⚠️  Aún contiene información desactualizada de 2017')
        }
        
        if (results.includes('One Big Beautiful')) {
          console.log('✅ Reconoce correctamente la ley específica')
        }
        
        if (results.includes('julio de 2025') || results.includes('aprobada')) {
          console.log('✅ Incluye información de aprobación actualizada')
        }
        
        console.log(`📋 Vista previa: ${results.substring(0, 200)}...`)
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`)
      }
    }
    
    // 2. Mostrar estadísticas
    console.log('\n📊 Estadísticas del servicio:')
    const stats = searchService.getStats()
    console.log(JSON.stringify(stats, null, 2))
    
    // 3. Probar integración completa con GeminiService
    console.log('\n🤖 Probando integración completa con GeminiService...')
    
    const knowledgeBase = new KnowledgeBase()
    const geminiService = new GeminiService(null, null, knowledgeBase)
    
    const testMessage = 'Busca información sobre Que sabes de la ley One Big beautiful tax Bill'
    
    // Verificar detección
    const needsSearch = geminiService.needsRealTimeSearch(testMessage)
    console.log(`🔍 Detección de búsqueda: ${needsSearch ? '✅ ACTIVADA' : '❌ NO ACTIVADA'}`)
    
    if (needsSearch) {
      console.log('✅ El sistema reconoce que necesita búsqueda actualizada')
    } else {
      console.log('❌ Problema: No detecta la necesidad de búsqueda')
    }
    
    // 4. Simular construcción de prompt con búsqueda mejorada
    console.log('\n📝 Simulando construcción de prompt completo...')
    
    try {
      const conversationContext = {
        hasHistory: false,
        context: '',
        stage: 'initial', 
        currentTopic: 'legal'
      }
      
      const prompt = await geminiService.buildEnhancedPromptWithPersonality(
        testMessage,
        knowledgeBase.getContext(),
        conversationContext,
        'legal_query',
        null,
        null,
        { name: 'Cliente de Prueba', phone: '+51999999999' },
        { name: 'GHS', representative: { name: 'Luis G.' } }
      )
      
      console.log('✅ Prompt construido exitosamente')
      console.log(`📏 Longitud: ${prompt.length} caracteres`)
      
      // Verificar contenido actualizado en el prompt
      if (prompt.includes('2025') && prompt.includes('julio')) {
        console.log('✅ Prompt incluye información ACTUALIZADA de 2025')
      } else if (prompt.includes('2017')) {
        console.log('⚠️  Prompt aún contiene información desactualizada de 2017')
      }
      
      if (prompt.includes('INFORMACIÓN EN TIEMPO REAL')) {
        console.log('✅ Prompt incluye sección de búsqueda en tiempo real')
      }
      
      if (prompt.includes('One Big Beautiful Bill Act')) {
        console.log('✅ Prompt reconoce la ley específica correctamente')
      }
      
    } catch (error) {
      console.log(`❌ Error en construcción de prompt: ${error.message}`)
    }
    
    // 5. Resumen de mejoras
    console.log('\n✅ RESUMEN DE MEJORAS IMPLEMENTADAS')
    console.log('===================================')
    console.log('✅ Búsqueda alternativa cuando DuckDuckGo falla')
    console.log('✅ Información específica para One Big Beautiful Tax Bill')
    console.log('✅ Datos actualizados de 2025 en lugar de 2017')
    console.log('✅ Detección mejorada de palabras clave')
    console.log('✅ Estadísticas de rendimiento')
    console.log('✅ Múltiples fuentes de información')
    
    console.log('\n🎯 RESULTADO ESPERADO:')
    console.log('Ahora el agente debería responder con información actualizada')
    console.log('sobre la One Big Beautiful Tax Bill aprobada en julio de 2025')
    console.log('en lugar de información desactualizada de 2017.')
    
  } catch (error) {
    console.error('❌ Error en prueba:', error)
    console.error('📋 Stack:', error.stack)
  }
}

// Función para probar casos específicos
async function testSpecificCases() {
  console.log('\n🎯 PRUEBAS DE CASOS ESPECÍFICOS')
  console.log('==============================')
  
  const searchService = new InternetSearchService()
  
  // Caso 1: One Big Beautiful Tax Bill (caso principal)
  console.log('\n1. 📋 One Big Beautiful Tax Bill:')
  const result1 = await searchService.search('One Big Beautiful Tax Bill 2025')
  console.log(`✅ Longitud: ${result1.length} chars`)
  console.log(`📅 ¿Menciona 2025?: ${result1.includes('2025') ? 'SÍ' : 'NO'}`)
  console.log(`📅 ¿Menciona 2017?: ${result1.includes('2017') ? 'SÍ (problema)' : 'NO (correcto)'}`)
  
  // Caso 2: Búsqueda general de reformas fiscales
  console.log('\n2. 📋 Reformas fiscales generales:')
  const result2 = await searchService.search('nueva ley fiscal Estados Unidos')
  console.log(`✅ Longitud: ${result2.length} chars`)
  console.log(`🌐 ¿Menciona desarrollos actuales?: ${result2.includes('actual') ? 'SÍ' : 'NO'}`)
  
  // Caso 3: Búsqueda en español
  console.log('\n3. 📋 Búsqueda en español:')
  const result3 = await searchService.search('información nueva ley impuestos')
  console.log(`✅ Longitud: ${result3.length} chars`)
  console.log(`🇪🇸 ¿Responde en español?: ${result3.includes('información') ? 'SÍ' : 'NO'}`)
}

// Ejecutar pruebas
if (require.main === module) {
  testImprovedSearch()
    .then(() => testSpecificCases())
    .catch(console.error)
}

module.exports = { testImprovedSearch, testSpecificCases }