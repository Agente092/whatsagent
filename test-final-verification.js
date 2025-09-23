/**
 * PRUEBA RÁPIDA - VERIFICACIÓN FINAL DE INFORMACIÓN ACTUALIZADA
 * 
 * Este script verifica que la información sea 100% actualizada (2025) 
 * sin referencias a 2017
 */

const InternetSearchService = require('./server/services/internetSearch')

async function quickVerificationTest() {
  console.log('🔍 VERIFICACIÓN FINAL - ¿SE ELIMINÓ LA INFORMACIÓN DE 2017?')
  console.log('========================================================\n')
  
  const searchService = new InternetSearchService()
  
  // Probar el caso específico de One Big Beautiful Tax Bill
  console.log('🎯 Probando: "One Big Beautiful Tax Bill 2025"')
  const result = await searchService.search('One Big Beautiful Tax Bill 2025')
  
  console.log(`📏 Longitud: ${result.length} caracteres`)
  
  // Verificaciones específicas
  const mentions2025 = (result.match(/2025/g) || []).length
  const mentions2017 = (result.match(/2017/g) || []).length
  
  console.log(`📅 Menciones de "2025": ${mentions2025}`)
  console.log(`📅 Menciones de "2017": ${mentions2017}`)
  
  if (mentions2017 === 0) {
    console.log('✅ PERFECTO: No hay menciones de 2017 - Información 100% actualizada')
  } else {
    console.log('❌ PROBLEMA: Aún hay menciones de 2017 - Necesita corrección')
  }
  
  if (mentions2025 > 0) {
    console.log('✅ CORRECTO: Contiene información de 2025')
  } else {
    console.log('⚠️  ADVERTENCIA: No contiene información de 2025')
  }
  
  // Verificar contenido específico
  if (result.includes('julio de 2025')) {
    console.log('✅ CORRECTO: Menciona fecha de aprobación específica')
  }
  
  if (result.includes('firmada por el Presidente Trump')) {
    console.log('✅ CORRECTO: Incluye información de firma presidencial')
  }
  
  if (result.includes('vigente desde')) {
    console.log('✅ CORRECTO: Indica estado actual de la ley')
  }
  
  console.log('\n📋 Vista previa de los primeros 300 caracteres:')
  console.log('=' * 50)
  console.log(result.substring(0, 300) + '...')
  console.log('=' * 50)
  
  // Resultado final
  console.log('\n🎯 RESULTADO FINAL:')
  if (mentions2017 === 0 && mentions2025 > 0) {
    console.log('✅ ¡ÉXITO TOTAL! La búsqueda ahora proporciona información 100% actualizada')
    console.log('✅ El agente responderá con datos de 2025 en lugar de 2017')
  } else {
    console.log('⚠️  Aún necesita ajustes para eliminar completamente referencias antiguas')
  }
}

// Ejecutar verificación
if (require.main === module) {
  quickVerificationTest().catch(console.error)
}

module.exports = { quickVerificationTest }