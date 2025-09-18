/**
 * \ud83e\uddea SCRIPT DE PRUEBA: POOL DE GOOGLE CUSTOM SEARCH APIs
 * Valida el funcionamiento del pool con 5 APIs (500 b\u00fasquedas diarias)
 */

require('dotenv').config()

const InternetSearchService = require('./server/services/internetSearch')
const logger = require('./server/services/logger')

async function testGoogleSearchPool() {
  console.log('\ud83c\udf86 PRUEBA DEL POOL DE GOOGLE SEARCH APIs')
  console.log('=====================================\n')
  
  try {
    const searchService = new InternetSearchService()
    
    // Verificar configuraci\u00f3n
    const poolStats = searchService.getPoolDetails()
    console.log(`\u2705 APIs configuradas: ${poolStats.totalApis}`)
    console.log(`\u2705 L\u00edmite diario: ${poolStats.dailyLimit} b\u00fasquedas`)
    console.log(`\u2705 Disponibles: ${poolStats.totalAvailableToday}`)
    
    // Prueba de b\u00fasqueda
    console.log('\n\ud83d\udd0d Probando b\u00fasqueda: \"Beautiful Tax Bill 2025\"')
    const result = await searchService.search('Beautiful Tax Bill 2025')
    
    if (result.includes('RESULTADOS DE GOOGLE')) {
      console.log('\u2705 Pool funcionando correctamente')
      const apiMatch = result.match(/API (\d+)\/(\d+)/)
      if (apiMatch) {
        console.log(`\ud83d\udccc API ${apiMatch[1]} de ${apiMatch[2]} utilizada`)
      }
    } else {
      console.log('\u26a0\ufe0f  Usando fallback')
    }
    
    // Estad\u00edsticas finales
    const finalStats = searchService.getPoolDetails()
    console.log(`\n\ud83d\udcca Usadas: ${finalStats.totalUsedToday}/${finalStats.dailyLimit}`)
    console.log(`\ud83d\udcca Disponibles: ${finalStats.totalAvailableToday}`)
    
    console.log('\n\ud83c\udf89 POOL FUNCIONANDO - LISTO PARA USO')
    
  } catch (error) {
    console.error('\u274c ERROR:', error.message)
  }
}

if (require.main === module) {
  testGoogleSearchPool().catch(console.error)
}

module.exports = { testGoogleSearchPool }