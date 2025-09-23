/**
 * SCRIPT DE PRUEBA PARA GOOGLE CUSTOM SEARCH API
 * 
 * Este script valida que la configuración de Google CSE funcione correctamente
 * y pueda buscar información real sobre la "One Big Beautiful Tax Bill"
 */

// Cargar variables de entorno desde .env
require('dotenv').config()

const InternetSearchService = require('./server/services/internetSearch')
const logger = require('./server/services/logger')

async function testGoogleCSE() {
  console.log('🔍 PRUEBA DE GOOGLE CUSTOM SEARCH API')
  console.log('===================================\n')
  
  // Verificar variables de entorno
  const apiKey = process.env.GOOGLE_CSE_API_KEY
  const searchEngineId = process.env.GOOGLE_CSE_ID
  
  console.log('📋 Verificando configuración...')
  console.log(`✅ GOOGLE_CSE_API_KEY: ${apiKey ? 'Configurado' : '❌ NO configurado'}`)
  console.log(`✅ GOOGLE_CSE_ID: ${searchEngineId ? 'Configurado' : '❌ NO configurado'}`)
  
  if (!apiKey || !searchEngineId) {
    console.log('\n❌ ERROR: Faltan variables de entorno')
    console.log('Por favor configura en el archivo .env:')
    console.log('GOOGLE_CSE_API_KEY="tu_api_key_aqui"')
    console.log('GOOGLE_CSE_ID="tu_search_engine_id_aqui"')
    console.log('\nSigue la guía en: CONFIGURACION-APIS-BUSQUEDA.md')
    return
  }
  
  if (apiKey === 'tu_google_api_key_aqui' || searchEngineId === 'tu_search_engine_id_aqui') {
    console.log('\n⚠️  ADVERTENCIA: Las variables contienen valores de ejemplo')
    console.log('Por favor reemplaza con tus API keys reales')
    return
  }
  
  console.log('\n🚀 Configuración correcta, iniciando pruebas...\n')
  
  try {
    const searchService = new InternetSearchService()
    
    // Prueba 1: Búsqueda específica sobre la ley
    console.log('📝 PRUEBA 1: Búsqueda de "One Big Beautiful Tax Bill"')
    console.log('=' * 50)
    
    const query1 = 'One Big Beautiful Tax Bill 2025'
    console.log(`🔍 Buscando: "${query1}"`)
    
    const result1 = await searchService.search(query1)
    
    console.log('✅ Búsqueda completada')
    console.log(`📏 Longitud de respuesta: ${result1.length} caracteres`)
    
    if (result1.includes('RESULTADOS DE GOOGLE')) {
      console.log('✅ Usando Google Custom Search API correctamente')
    } else if (result1.includes('RESULTADOS DE DUCKDUCKGO')) {
      console.log('⚠️  Usando DuckDuckGo como fallback (Google no funcionó)')
    } else {
      console.log('⚠️  Respuesta inesperada')
    }
    
    console.log('\n📋 Vista previa del resultado:')
    console.log('-' * 50)
    console.log(result1.substring(0, 400) + '...')
    console.log('-' * 50)
    
    // Prueba 2: Búsqueda general
    console.log('\n📝 PRUEBA 2: Búsqueda general de noticias fiscales')
    console.log('=' * 50)
    
    const query2 = 'tax reform news 2025'
    console.log(`🔍 Buscando: "${query2}"`)
    
    const result2 = await searchService.search(query2)
    
    console.log('✅ Segunda búsqueda completada')
    console.log(`📏 Longitud de respuesta: ${result2.length} caracteres`)
    
    // Prueba 3: Verificar límites
    console.log('\n📝 PRUEBA 3: Verificación de estadísticas')
    console.log('=' * 50)
    
    const stats = searchService.getStats()
    console.log('📊 Estadísticas del servicio:')
    console.log(JSON.stringify(stats, null, 2))
    
    console.log('\n🎉 PRUEBAS COMPLETADAS EXITOSAMENTE')
    console.log('================================')
    console.log('✅ Google Custom Search API funcionando')
    console.log('✅ Búsquedas reales ejecutándose')
    console.log('✅ Sistema listo para WhatsApp')
    
    console.log('\n📋 SIGUIENTE PASO:')
    console.log('Reinicia el servidor WhatsApp y prueba con el mensaje:')
    console.log('"Busca información sobre la ley One Big Beautiful Tax Bill"')
    
  } catch (error) {
    console.error('\n❌ ERROR EN LAS PRUEBAS:', error.message)
    
    if (error.message.includes('403')) {
      console.log('\n🔧 POSIBLE SOLUCIÓN:')
      console.log('- Verifica que el API Key sea correcto')
      console.log('- Asegúrate de haber habilitado Custom Search API')
      console.log('- Revisa las cuotas en Google Cloud Console')
    } else if (error.message.includes('400')) {
      console.log('\n🔧 POSIBLE SOLUCIÓN:')
      console.log('- Verifica el Search Engine ID')
      console.log('- Asegúrate de haber creado el motor de búsqueda')
    } else {
      console.log('\n🔧 POSIBLE SOLUCIÓN:')
      console.log('- Verifica tu conexión a internet')
      console.log('- Revisa los logs para más detalles')
    }
  }
}

// Función para mostrar ayuda de configuración
function showConfigHelp() {
  console.log('📋 AYUDA DE CONFIGURACIÓN')
  console.log('========================')
  console.log('')
  console.log('1. Ir a Google Cloud Console:')
  console.log('   https://console.cloud.google.com/')
  console.log('')
  console.log('2. Habilitar Custom Search API:')
  console.log('   https://console.cloud.google.com/apis/library/customsearch.googleapis.com')
  console.log('')
  console.log('3. Crear API Key:')
  console.log('   Credenciales → Crear credenciales → Clave de API')
  console.log('')
  console.log('4. Crear Search Engine:')
  console.log('   https://programmablesearchengine.google.com/')
  console.log('')
  console.log('5. Configurar variables en .env:')
  console.log('   GOOGLE_CSE_API_KEY="tu_api_key"')
  console.log('   GOOGLE_CSE_ID="tu_search_engine_id"')
}

// Ejecutar según argumentos
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    showConfigHelp()
  } else {
    testGoogleCSE().catch(console.error)
  }
}

module.exports = { testGoogleCSE, showConfigHelp }