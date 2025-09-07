/**
 * 🔍 INVESTIGACIÓN DE PROBLEMAS ESPECÍFICOS
 * Analizar los casos exactos que el usuario reporta
 */

const MessageFormatter = require('./server/services/messageFormatter')
const formatter = new MessageFormatter()

console.log('🔍 INVESTIGACIÓN DE PROBLEMAS ESPECÍFICOS')
console.log('='.repeat(60))
console.log('')

// Caso 1: Número 7 desalineado
const textoConNumeros = `1. Estrategia Principal: Constitución de una Sociedad Anónima Cerrada
2. Ventajas Específicas:
3. Métodos de Aplicación en Perú:
4. Beneficios y Trucos Fiscales Escondidos:
5. Combinaciones con Otras Estrategias:
6. Adaptación al Tipo de Empresario:
    7. Métodos Adicionales:
8. Casos Específicos Peruanos:`

console.log('🚨 CASO 1: NÚMERO 7 DESALINEADO')
console.log('❌ TEXTO ORIGINAL:')
console.log(textoConNumeros)
console.log('')

const resultado1 = formatter.normalizeForWhatsApp(textoConNumeros)
console.log('🔧 DESPUÉS DE normalizeForWhatsApp():')
console.log(resultado1)
console.log('')

// Caso 2: Lista con guiones
const textoConGuiones = `Flujos de Capital: Los beneficios generados por la LLC en Estados Unidos se pueden transferir a la empresa Holding en Perú de varias maneras:
- Dividendos: La LLC distribuye utilidades como dividendos a su accionista (la Holding peruana).
- Pagos por servicios: La LLC contrata a la empresa peruana para servicios de administración.
- Préstamos intercompañía: La empresa peruana podría realizar préstamos a la filial estadounidense.`

console.log('🚨 CASO 2: LISTA CON GUIONES')
console.log('❌ TEXTO ORIGINAL:')
console.log(textoConGuiones)
console.log('')

const resultado2 = formatter.normalizeForWhatsApp(textoConGuiones)
console.log('🔧 DESPUÉS DE normalizeForWhatsApp():')
console.log(resultado2)
console.log('')

console.log('🔍 ANÁLISIS LÍNEA POR LÍNEA - CASO 1:')
console.log('-'.repeat(40))
resultado1.split('\n').forEach((linea, index) => {
  const espaciosAntes = linea.length - linea.trimStart().length
  const marcador = espaciosAntes > 0 ? `[${espaciosAntes} espacios]` : '[alineado]'
  console.log(`${index + 1}: ${marcador} "${linea}"`)
})

console.log('')
console.log('🔍 ANÁLISIS LÍNEA POR LÍNEA - CASO 2:')
console.log('-'.repeat(40))
resultado2.split('\n').forEach((linea, index) => {
  const espaciosAntes = linea.length - linea.trimStart().length
  const marcador = espaciosAntes > 0 ? `[${espaciosAntes} espacios]` : '[alineado]'
  console.log(`${index + 1}: ${marcador} "${linea}"`)
})

console.log('')
console.log('💡 DIAGNÓSTICO:')
console.log('-'.repeat(40))
console.log('1. ¿Se detecta el número 7 con espacios?', textoConNumeros.includes('    7.'))
console.log('2. ¿Se detecta "- Dividendos" con espacios?', textoConGuiones.includes('- Dividendos'))
console.log('3. ¿Mi función elimina espacios al inicio?', !resultado1.includes('    ') && !resultado2.includes('    '))

console.log('')
console.log('🎯 PROBLEMAS IDENTIFICADOS:')
console.log('-'.repeat(40))
console.log('• Mi función NO detecta numeración manual existente')
console.log('• Mi función NO maneja listas con guiones correctamente')
console.log('• Los espacios antes de elementos no se eliminan consistentemente')