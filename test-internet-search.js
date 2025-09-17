/**
 * Script de prueba para la funcionalidad de búsqueda en internet
 * Este script prueba la integración del servicio de búsqueda con el agente
 */

const InternetSearchService = require('./server/services/internetSearch')

async function testInternetSearch() {
  console.log('🔍 Iniciando prueba de búsqueda en internet...')
  
  // Crear instancia del servicio
  const searchService = new InternetSearchService()
  
  // Pruebas de búsqueda
  const testQueries = [
    'tipo de cambio dólar peru hoy',
    'ley general de sociedades peru 2024',
    'estrategias de inversión inmobiliaria miami',
    'paraísos fiscales para empresas peruanas',
    'tendencias de negocios tecnología 2024'
  ]
  
  console.log(`\n📋 Ejecutando ${testQueries.length} búsquedas de prueba...\n`)
  
  for (const query of testQueries) {
    try {
      console.log(`\n🔍 Buscando: "${query}"`)
      const startTime = Date.now()
      
      const results = await searchService.search(query)
      
      const duration = Date.now() - startTime
      console.log(`✅ Búsqueda completada en ${duration}ms`)
      
      // Mostrar un resumen de los resultados
      const resultPreview = results.substring(0, 200) + (results.length > 200 ? '...' : '')
      console.log(`📄 Resultados: ${resultPreview}`)
      
    } catch (error) {
      console.error(`❌ Error en búsqueda "${query}":`, error.message)
    }
  }
  
  // Prueba de cache
  console.log('\nキャッシング Probando cache...')
  try {
    const startTime = Date.now()
    const results1 = await searchService.search('tipo de cambio dólar peru hoy')
    const duration1 = Date.now() - startTime
    
    // Segunda búsqueda (debe usar cache)
    const startTime2 = Date.now()
    const results2 = await searchService.search('tipo de cambio dólar peru hoy')
    const duration2 = Date.now() - startTime2
    
    console.log(`⏱️  Primera búsqueda: ${duration1}ms`)
    console.log(`⏱️  Segunda búsqueda (cache): ${duration2}ms`)
    
    if (duration2 < duration1) {
      console.log('✅ Cache funcionando correctamente')
    } else {
      console.log('⚠️  Posible problema con el cache')
    }
  } catch (error) {
    console.error('❌ Error en prueba de cache:', error.message)
  }
  
  // Mostrar estadísticas
  console.log('\n📊 Estadísticas del servicio:')
  const stats = searchService.getStats()
  console.log(JSON.stringify(stats, null, 2))
  
  console.log('\n✅ Prueba de búsqueda en internet completada')
}

// Ejecutar prueba
if (require.main === module) {
  testInternetSearch().catch(console.error)
}

module.exports = { testInternetSearch }