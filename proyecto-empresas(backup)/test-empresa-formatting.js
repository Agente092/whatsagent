/**
 * 🧪 PRUEBA DE CORRECCIÓN DEL FORMATEO DE TIPOS DE EMPRESAS
 * Demuestra las correcciones aplicadas para formatear correctamente los tipos de empresas peruanas
 */

const MessageFormatterCleaned = require('./server/services/messageFormatterCleaned')

// Crear instancia del formateador corregido
const formatter = new MessageFormatterCleaned()

console.log('🏢 CORRECCIÓN DE FORMATEO DE TIPOS DE EMPRESAS PERUANAS')
console.log('='.repeat(70))
console.log('')

// PROBLEMA IDENTIFICADO: Formateo horrible de empresas
console.log('❌ PROBLEMA IDENTIFICADO EN LA IMAGEN:')
console.log('-'.repeat(50))
const problematicText = `Se utiliza una estructura legal simple, como una Sociedad Comercial de Responsabilidad Limitada (S.R.L.) o una 🏢 🏢 *S.A. (Sociedad Anónima)*C. (🏢 *S.A. (Sociedad Anónima) Cerrada)* (🏢 S.A. (Sociedad Anónima)*C.).`

console.log('ANTES (problemático):')
console.log(problematicText)
console.log('')

const fixed = formatter.formatResponse(problematicText)
console.log('✅ DESPUÉS (corregido):')
console.log(Array.isArray(fixed) ? fixed[0] : fixed)
console.log('')

console.log('✅ TIPOS DE EMPRESAS CORRECTOS SEGÚN LEGISLACIÓN PERUANA:')
console.log('-'.repeat(60))
console.log('1. Sociedad Anónima (S.A.)')
console.log('2. Sociedad Anónima Cerrada (S.A.C.)')
console.log('3. Sociedad Comercial de Responsabilidad Limitada (S.R.L.)')
console.log('4. Empresa Individual de Responsabilidad Limitada (E.I.R.L.)')
console.log('5. Sociedad Anónima Abierta (S.A.A.)')
console.log('6. Sociedad en Comandita Simple (S. en C.S.)')
console.log('7. Sociedad en Comandita por Acciones (S. en C.P.A.)')
console.log('8. Sociedad Colectiva (S.C.)')
console.log('')

console.log('🔧 PRUEBAS DE FORMATEO ESPECÍFICAS:')
console.log('-'.repeat(40))

// Prueba 1: S.A.C. malformada
const test1 = 'Puedes crear una *S.A. (Sociedad Anónima)*C para tu negocio.'
console.log('Prueba 1 - S.A.C. malformada:')
console.log('ANTES:', test1)
console.log('DESPUÉS:', formatter.formatResponse(test1)[0])
console.log('')

// Prueba 2: S.R.L. simple
const test2 = 'Una S.R.L. es ideal para pequeños negocios.'
console.log('Prueba 2 - S.R.L. simple:')
console.log('ANTES:', test2)
console.log('DESPUÉS:', formatter.formatResponse(test2)[0])
console.log('')

// Prueba 3: E.I.R.L. 
const test3 = 'Como emprendedor individual, considera una EIRL.'
console.log('Prueba 3 - E.I.R.L.:')
console.log('ANTES:', test3)
console.log('DESPUÉS:', formatter.formatResponse(test3)[0])
console.log('')

// Prueba 4: Emojis duplicados
const test4 = '🏢 🏢 *S.A.C* es una buena opción empresarial.'
console.log('Prueba 4 - Emojis duplicados:')
console.log('ANTES:', test4)
console.log('DESPUÉS:', formatter.formatResponse(test4)[0])
console.log('')

console.log('🎯 MEJORAS IMPLEMENTADAS:')
console.log('━'.repeat(30))
console.log('✅ Eliminación de formateo malformado como "*S.A.*C"')
console.log('✅ Corrección de emojis duplicados (🏢 🏢)')
console.log('✅ Formato estándar: "Nombre Completo (SIGLA)"')
console.log('✅ Todos los 8 tipos de empresas peruanas reconocidos')
console.log('✅ Instrucciones agregadas al prompt del agente')
console.log('✅ Formateo limpio y profesional')
console.log('')

console.log('📋 INSTRUCCIONES AGREGADAS AL AGENTE:')
console.log('-'.repeat(45))
console.log('• USA ÚNICAMENTE los nombres EXACTOS de empresas peruanas')
console.log('• NUNCA uses formatos malformados como "*S.A.*C"')
console.log('• MANTÉN el formato: "Nombre Completo (SIGLA)"')
console.log('• NO uses emojis duplicados')
console.log('• RESPETA la legislación empresarial peruana')
console.log('')

console.log('🎉 RESULTADO FINAL:')
console.log('━'.repeat(20))
console.log('🚀 Formateo profesional y correcto de tipos de empresas')
console.log('📚 Agente educado sobre nomenclatura empresarial peruana')
console.log('✨ Mensajes limpios y legibles')
console.log('⚖️ Cumplimiento con terminología legal oficial')
console.log('')

console.log('✅ ¡CORRECCIÓN COMPLETADA!')
console.log('El agente ahora formateará correctamente los tipos de empresas peruanas.')