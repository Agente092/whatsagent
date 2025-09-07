/**
 * 🚨 PRUEBA ESPECÍFICA DEL PROBLEMA REPORTADO
 * Analizar exactamente los casos que el usuario menciona que fallan
 */

const MessageFormatter = require('./server/services/messageFormatter')
const formatter = new MessageFormatter()

console.log('🚨 ANÁLISIS DEL PROBLEMA ESPECÍFICO')
console.log('='.repeat(60))
console.log('')

// Recrear EXACTAMENTE el texto problemático que el usuario reporta
const textoProblematicoEspecifico = `BENEFICIOS Y TRUCOS FISCALES ESCONDIDOS: 
Caso: 
Legitimación de Capital:
Préstamos intercompañía: 
Dividendos: 
Pago de Regalías:`

console.log('❌ TEXTO PROBLEMÁTICO (TAL COMO APARECE):')
console.log('"' + textoProblematicoEspecifico + '"')
console.log('')

// Aplicar la función normalizeForWhatsApp()
const resultado = formatter.normalizeForWhatsApp(textoProblematicoEspecifico)

console.log('🔧 RESULTADO DESPUÉS DE normalizeForWhatsApp():')
console.log('"' + resultado + '"')
console.log('')

console.log('🔍 ANÁLISIS LÍNEA POR LÍNEA:')
console.log('-'.repeat(40))
resultado.split('\n').forEach((linea, index) => {
  const espaciosAntes = linea.length - linea.trimStart().length
  console.log(`${index + 1}: [${espaciosAntes} espacios] "${linea}"`)
})

console.log('')
console.log('🧪 VERIFICACIONES ESPECÍFICAS:')
console.log('-'.repeat(40))

const verificaciones = [
  {
    nombre: 'Título principal numerado',
    actual: resultado.includes('**1. BENEFICIOS Y TRUCOS FISCALES ESCONDIDOS:**'),
    esperado: 'Debería ser: **1. BENEFICIOS Y TRUCOS FISCALES ESCONDIDOS:**'
  },
  {
    nombre: 'Subtítulos con viñetas',
    actual: resultado.includes('• **Caso:**'),
    esperado: 'Debería ser: • **Caso:**'
  },
  {
    nombre: 'Alineación izquierda',
    actual: !resultado.includes('   ') && !resultado.includes('  •'),
    esperado: 'Sin espacios extra al inicio'
  },
  {
    nombre: 'Separación entre elementos',
    actual: resultado.includes('\n\n'),
    esperado: 'Saltos de línea dobles para separación'
  }
]

verificaciones.forEach((v, index) => {
  const resultado = v.actual ? '✅ CORRECTO' : '❌ FALLA'
  console.log(`${index + 1}. ${v.nombre}: ${resultado}`)
  if (!v.actual) {
    console.log(`   ${v.esperado}`)
  }
})

console.log('')
console.log('🔧 PRUEBA DE PATRONES REGEX:')
console.log('-'.repeat(40))

// Probar el patrón principal para títulos
const patronTitulos = /^([A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ\s]{15,}):(?!\*)\s*$/gm
const matchesTitulos = textoProblematicoEspecifico.match(patronTitulos)
console.log('Patrón títulos detecta:', matchesTitulos)

// Probar el patrón para subtítulos
const patronSubtitulos = /^\s*([A-Z][a-záéíóú][^:]{8,40}):(?!\*)/gm
const matchesSubtitulos = textoProblematicoEspecifico.match(patronSubtitulos)
console.log('Patrón subtítulos detecta:', matchesSubtitulos)

console.log('')
console.log('💡 DIAGNÓSTICO:')
console.log('-'.repeat(40))
if (!matchesTitulos) {
  console.log('❌ El patrón de títulos NO detecta el título principal')
  console.log('   Posible causa: longitud mínima o caracteres especiales')
}
if (!matchesSubtitulos) {
  console.log('❌ El patrón de subtítulos NO detecta los elementos')
  console.log('   Posible causa: criterios muy restrictivos')
}

console.log('')
console.log('🎯 TEXTO QUE DEBERÍAMOS OBTENER:')
console.log('-'.repeat(40))
const textoEsperado = `**1. BENEFICIOS Y TRUCOS FISCALES ESCONDIDOS:**

• **Caso:**

• **Legitimación de Capital:**

• **Préstamos intercompañía:**

• **Dividendos:**

• **Pago de Regalías:**`

console.log(textoEsperado)