/**
 * 🎯 PRUEBA FINAL ESPECÍFICA - CASOS DE LAS IMÁGENES
 * Verificar corrección de problemas exactos reportados
 */

const MessageFormatter = require('./server/services/messageFormatter')
const formatter = new MessageFormatter()

console.log('🎯 PRUEBA ESPECÍFICA DE LOS CASOS DE LAS IMÁGENES')
console.log('='.repeat(60))
console.log('')

// Simular exactamente el problema del número 7 desalineado
const casoNumero7 = `6. Adaptación al Tipo de Empresario:
    7. Métodos Adicionales:
8. Casos Específicos Peruanos:`

console.log('🚨 CASO ESPECÍFICO: NÚMERO 7 DESALINEADO')
console.log('❌ PROBLEMA ORIGINAL:')
console.log(casoNumero7)
console.log('')

const resultado7 = formatter.normalizeForWhatsApp(casoNumero7)
console.log('✅ DESPUÉS DE LA CORRECCIÓN:')
console.log(resultado7)
console.log('')

// Simular exactamente el problema de "- Dividendos:" desalineado
const casoDividendos = `Flujos de Capital: Los beneficios se pueden transferir de varias maneras:
- Dividendos: La LLC distribuye utilidades como dividendos.
- Pagos por servicios: La LLC contrata a la empresa peruana.
- Préstamos intercompañía: La empresa peruana podría realizar préstamos.`

console.log('🚨 CASO ESPECÍFICO: - DIVIDENDOS DESALINEADO')
console.log('❌ PROBLEMA ORIGINAL:')
console.log(casoDividendos)
console.log('')

const resultadoDividendos = formatter.normalizeForWhatsApp(casoDividendos)
console.log('✅ DESPUÉS DE LA CORRECCIÓN:')
console.log(resultadoDividendos)
console.log('')

console.log('🔍 VERIFICACIONES ESPECÍFICAS:')
console.log('-'.repeat(50))

const verificaciones = [
  {
    nombre: 'Número 7 está alineado a la izquierda',
    condicion: resultado7.includes('**7. Métodos Adicionales:**') && !resultado7.includes('    7.'),
    detalle: 'Sin espacios antes del número 7'
  },
  {
    nombre: 'Numeración es consistente',
    condicion: resultado7.includes('**6.') && resultado7.includes('**7.') && resultado7.includes('**8.'),
    detalle: 'Todos los números tienen el mismo formato'
  },
  {
    nombre: 'Dividendos convertido a viñeta',
    condicion: resultadoDividendos.includes('• Dividendos:') && !resultadoDividendos.includes('- Dividendos:'),
    detalle: 'Guión convertido a viñeta'
  },
  {
    nombre: 'Todas las listas son consistentes',
    condicion: resultadoDividendos.includes('• Dividendos:') && 
               resultadoDividendos.includes('• Pagos por servicios:') && 
               resultadoDividendos.includes('• Préstamos intercompañía:'),
    detalle: 'Todas las listas usan el mismo formato de viñetas'
  },
  {
    nombre: 'Alineación perfecta en ambos casos',
    condicion: !resultado7.includes('   ') && !resultadoDividendos.includes('   '),
    detalle: 'Sin espacios extra en ninguna parte'
  }
]

verificaciones.forEach((v, index) => {
  const estado = v.condicion ? '✅ CORREGIDO' : '❌ AÚN FALLA'
  console.log(`${index + 1}. ${v.nombre}: ${estado}`)
  console.log(`   ${v.detalle}`)
  console.log('')
})

const todoCorregido = verificaciones.every(v => v.condicion)

console.log('📊 RESULTADO FINAL:')
console.log('-'.repeat(50))
if (todoCorregido) {
  console.log('🎉 ¡TODOS LOS PROBLEMAS ESTÁN CORREGIDOS!')
  console.log('')
  console.log('✅ Número 7 ahora está perfectamente alineado')
  console.log('✅ "- Dividendos:" ahora es "• Dividendos:" y está alineado')
  console.log('✅ Toda la numeración es consistente')
  console.log('✅ Todas las listas tienen formato uniforme')
  console.log('')
  console.log('🚀 Los usuarios ahora verán mensajes perfectamente formateados')
} else {
  console.log('❌ Algunos problemas persisten')
  console.log('🔧 Se requieren más ajustes')
}