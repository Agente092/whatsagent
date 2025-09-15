/**
 * 🎯 TEST ESPECÍFICO PARA CORREGIR PROBLEMA DE ALINEACIÓN
 * Reproduce exactamente el problema de la imagen enviada por el usuario
 */

const MessageFormatter = require('./server/services/messageFormatter')
const formatter = new MessageFormatter()

console.log('🔍 ANÁLISIS DEL PROBLEMA DE ALINEACIÓN DE TÍTULOS')
console.log('='.repeat(60))

// Simular el texto exacto que aparece en la imagen problemática
const textoProblematico = `1. ESTRATEGIA PRINCIPAL: Optimización de Flujos de Capital y Gestión de Riesgos Internacionales

2. VENTAJAS ESPECÍFICAS:

• Reducción de costos de transacción
• Mayor velocidad en transferencias  
• Mayor transparencia

3. MÉTODOS DE APLICACIÓN EN PERÚ (pasos concretos):

• Safepol (para activos digitales)
• Wise (para transferencias internacionales)

4. BENEFICIOS Y TRUCOS FISCALES ESCONDIDOS:

• Reducción de costos
• Transparencia legislativa

5. COMBINACIONES CON OTRAS ESTRATEGIAS:`

console.log('❌ TEXTO CON PROBLEMA DE ALINEACIÓN:')
console.log('-'.repeat(50))
console.log(textoProblematico)
console.log('')

// Mostrar línea por línea para detectar el problema
console.log('🔍 ANÁLISIS LÍNEA POR LÍNEA (ORIGINAL):')
const lines = textoProblematico.split('\n')
lines.forEach((line, index) => {
  if (line.trim()) {
    console.log(`${index + 1}: "${line}" (espacios al inicio: ${line.length - line.trimStart().length})`)
  }
})

console.log('')
console.log('🔧 APLICANDO NORMALIZACIÓN ACTUAL:')
console.log('-'.repeat(50))

const resultado = formatter.normalizeForWhatsApp(textoProblematico)
console.log(resultado)

console.log('')
console.log('🔍 ANÁLISIS LÍNEA POR LÍNEA (RESULTADO):')
const resultLines = resultado.split('\n')
resultLines.forEach((line, index) => {
  if (line.trim()) {
    console.log(`${index + 1}: "${line}" (espacios al inicio: ${line.length - line.trimStart().length})`)
  }
})

console.log('')
console.log('📊 VERIFICACIÓN DE PROBLEMAS:')
console.log('-'.repeat(50))

// Verificar si hay inconsistencias en la alineación
const titleLines = resultLines.filter(line => line.match(/^\*\*\d+\./))
titleLines.forEach((titleLine, index) => {
  const spacesAtStart = titleLine.length - titleLine.trimStart().length
  console.log(`Título ${index + 1}: ${spacesAtStart} espacios al inicio - "${titleLine}"`)
})