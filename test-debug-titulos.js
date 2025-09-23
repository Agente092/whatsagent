/**
 * 🔧 CORRECCIÓN ESPECÍFICA PARA NUMERACIÓN DE TÍTULOS
 * Prueba directa del patrón de títulos problemático
 */

const MessageFormatter = require('./server/services/messageFormatter')
const formatter = new MessageFormatter()

console.log('🎯 PRUEBA ESPECÍFICA - NUMERACIÓN DE TÍTULOS')
console.log('='.repeat(50))

// Probar solo los títulos problemáticos
const soloTitulos = `BENEFICIOS Y TRUCOS FISCALES ESCONDIDOS:

Texto de ejemplo aquí.

COMBINACIONES CON OTRAS ESTRATEGIAS:

Más texto de ejemplo.`

console.log('❌ TÍTULOS SIN NUMERAR:')
console.log(soloTitulos)
console.log('')

const titulosCorregidos = formatter.normalizeForWhatsApp(soloTitulos)

console.log('✅ TÍTULOS DESPUÉS DEL FORMATEO:')
console.log(titulosCorregidos)
console.log('')

// Verificar línea por línea
console.log('🔍 ANÁLISIS LÍNEA POR LÍNEA:')
titulosCorregidos.split('\n').forEach((linea, index) => {
  if (linea.trim()) {
    console.log(`${index + 1}: "${linea}"`)
  }
})

console.log('')
console.log('🔧 PATRÓN REGEX ACTUAL:')
console.log('/^([A-ZÁÉÍÓÚÄËÏÖÜ][A-ZÁÉÍÓÚÄËÏÖÜ\\s]{15,}):(?!\\*)\\s*$/gm')

console.log('')
console.log('🧪 PRUEBA MANUAL DEL PATRÓN:')
const testPattern = /^([A-ZÁÉÍÓÚÄËÏÖÜ][A-ZÁÉÍÓÚÄËÏÖÜ\s]{15,}):(?!\*)\s*$/gm
const matches = soloTitulos.match(testPattern)
console.log('Coincidencias encontradas:', matches)

if (matches) {
  matches.forEach((match, index) => {
    console.log(`Match ${index + 1}: "${match}"`)
  })
} else {
  console.log('❌ No se encontraron coincidencias con el patrón actual')
  console.log('🔧 Probando patrón alternativo...')
  
  const altPattern = /^[A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ\s]{10,}:$/gm
  const altMatches = soloTitulos.match(altPattern)
  console.log('Patrón alternativo:', altMatches)
}