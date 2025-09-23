/**
 * 🚨 SOLUCIÓN DEFINITIVA - FUNCIÓN normalizeForWhatsApp CORREGIDA
 * Versión simplificada y efectiva
 */

const MessageFormatter = require('./server/services/messageFormatter')

// Crear una versión temporal mejorada de la función
class MessageFormatterFixed extends MessageFormatter {
  normalizeForWhatsApp(text) {
    let normalized = text.trim()
    
    // 🛠️ PASO 1: Limpiar texto de entrada
    normalized = normalized.replace(/\r\n/g, '\n')
    normalized = normalized.replace(/\t/g, ' ')
    
    // 🎯 PASO 2: NUMERAR TÍTULOS PRINCIPALES
    // Detectar líneas que son títulos (mayúsculas largas con ":")
    const lines = normalized.split('\n')
    const processedLines = []
    let titleCounter = 1
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Es un título si es mayúsculas de >10 caracteres y termina en ":"
      const isTitlePattern = /^[A-ZÁÉÍÓÚÄËÏÖÜ][A-ZÁÉÍÓÚÄËÏÖÜ\s]{10,}:\s*$/.test(line)
      
      if (isTitlePattern) {
        const cleanTitle = line.replace(':', '').trim()
        processedLines.push(`**${titleCounter}. ${cleanTitle}:**`)
        processedLines.push('') // Salto de línea después del título
        titleCounter++
      }
      // Es un subtítulo si termina en ":" y no es muy largo
      else if (line.endsWith(':') && line.length > 3 && line.length < 50) {
        const cleanSubtitle = line.replace(':', '').trim()
        processedLines.push('') // Salto antes del subtítulo
        processedLines.push(`• **${cleanSubtitle}:**`)
        processedLines.push('') // Salto después del subtítulo
      }
      // Línea normal
      else if (line.length > 0) {
        processedLines.push(line)
      }
    }
    
    // 🧹 PASO 3: LIMPIEZA FINAL
    let result = processedLines.join('\n')
    
    // Limpiar saltos de línea excesivos
    result = result.replace(/\n{3,}/g, '\n\n')
    
    // Asegurar alineación izquierda
    result = result.replace(/^\s+/gm, '')
    
    return result.trim()
  }
}

// Probar la versión corregida
const formatter = new MessageFormatterFixed()

console.log('🚀 PRUEBA CON FUNCIÓN CORREGIDA')
console.log('='.repeat(50))
console.log('')

const textoProblematicoEspecifico = `BENEFICIOS Y TRUCOS FISCALES ESCONDIDOS: 
Caso: 
Legitimación de Capital:
Préstamos intercompañía: 
Dividendos: 
Pago de Regalías:`

console.log('❌ TEXTO PROBLEMÁTICO ORIGINAL:')
console.log('"' + textoProblematicoEspecifico + '"')
console.log('')

const resultadoCorregido = formatter.normalizeForWhatsApp(textoProblematicoEspecifico)

console.log('✅ RESULTADO CON FUNCIÓN CORREGIDA:')
console.log('"' + resultadoCorregido + '"')
console.log('')

console.log('🔍 ANÁLISIS LÍNEA POR LÍNEA:')
console.log('-'.repeat(40))
resultadoCorregido.split('\n').forEach((linea, index) => {
  console.log(`${index + 1}: "${linea}"`)
})

console.log('')
console.log('✅ VERIFICACIONES:')
const verificaciones = [
  resultadoCorregido.includes('**1. BENEFICIOS Y TRUCOS FISCALES ESCONDIDOS:**'),
  resultadoCorregido.includes('• **Caso:**'),
  resultadoCorregido.includes('• **Legitimación de Capital:**'),
  resultadoCorregido.includes('• **Préstamos intercompañía:**'),
  resultadoCorregido.includes('• **Dividendos:**'),
  resultadoCorregido.includes('• **Pago de Regalías:**')
]

verificaciones.forEach((v, i) => {
  console.log(`${i + 1}. ${v ? '✅ CORRECTO' : '❌ FALLA'}`)
})

console.log('')
if (verificaciones.every(v => v)) {
  console.log('🎉 ¡TODAS LAS VERIFICACIONES PASARON!')
  console.log('📝 La función está lista para implementar.')
} else {
  console.log('❌ Algunas verificaciones fallaron.')
}