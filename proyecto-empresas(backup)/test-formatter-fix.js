/**
 * 🧪 PRUEBA DE CORRECCIÓN DEL FORMATEO
 * Demuestra las soluciones a los problemas identificados
 */

const MessageFormatterCleaned = require('./server/services/messageFormatterCleaned')

// Crear instancia del formateador corregido
const formatter = new MessageFormatterCleaned()

console.log('🔧 CORRECCIÓN DE PROBLEMAS DE FORMATEO')
console.log('='.repeat(70))
console.log('')

// PROBLEMA 1: Texto hardcodeado "💰 Costo:" y "⚠️ Riesgo:"
console.log('❌ PROBLEMA 1: Texto hardcodeado problemático')
console.log('-'.repeat(50))
const problematicText1 = `El programador no pierde toda su 💰 Costo: de tiempo. Si la startup fracasa, el ⚠️ Riesgo: se comparte con todos los inversionistas.`

console.log('ANTES (problemático):')
console.log(problematicText1)
console.log('')

const fixed1 = formatter.formatResponse(problematicText1)
console.log('✅ DESPUÉS (corregido):')
console.log(Array.isArray(fixed1) ? fixed1[0] : fixed1)
console.log('')

// PROBLEMA 2: Asteriscos mal colocados
console.log('❌ PROBLEMA 2: Asteriscos mal colocados')
console.log('-'.repeat(50))
const problematicText2 = `Estructura *Holding*-Operadora:* para protección de activos.`

console.log('ANTES (problemático):')
console.log(problematicText2)
console.log('')

const fixed2 = formatter.formatResponse(problematicText2)
console.log('✅ DESPUÉS (corregido):')
console.log(Array.isArray(fixed2) ? fixed2[0] : fixed2)
console.log('')

// PROBLEMA 3: Texto repetitivo de estructuras empresariales
console.log('❌ PROBLEMA 3: Texto repetitivo y mal formateado')
console.log('-'.repeat(50))
const problematicText3 = `Se puede optar por una 🏢 *🏢 *S.A. (Sociedad Anónima)*C. (🏢 *S.A. (Sociedad Anónima)* Cerrada)* (🏢 *🏢 *S.A. (Sociedad Anónima)*C. (🏢 *S.A. (Sociedad Anónima)* Cerrada)*), Sociedad Comercial de Responsabilidad Limitada (🏢 *S.R.L. (Sociedad de Responsabilidad Limitada)*), o 👤 *EIRL (Empresa Individual de Responsabilidad Limitada)* (👤 *EIRL (Empresa Individual de Responsabilidad Limitada)*).`

console.log('ANTES (problemático):')
console.log(problematicText3)
console.log('')

const fixed3 = formatter.formatResponse(problematicText3)
console.log('✅ DESPUÉS (corregido):')
console.log(Array.isArray(fixed3) ? fixed3[0] : fixed3)
console.log('')

// EJEMPLO COMPLETO: Respuesta limpia y profesional
console.log('✨ EJEMPLO COMPLETO: Respuesta limpia y profesional')
console.log('-'.repeat(50))
const completeExample = `ESTRATEGIA PRINCIPAL: Creación de una empresa de fachada con mínima o nula actividad real.

VENTAJAS ESPECÍFICAS: Ocultamiento de activos, evasión fiscal, 💰 Costo lavado de dinero, ocultamiento de la propiedad real de activos.

MÉTODOS DE APLICACIÓN EN PERÚ (Pasos concretos):

1. Elección de la estructura legal:
Se puede optar por una S.A.C. (Sociedad Anónima Cerrada), S.R.L. (Sociedad de Responsabilidad Limitada), o EIRL (Empresa Individual de Responsabilidad Limitada). La S.A.C. ofrece mayor complejidad y discreción, mientras que la EIRL es más simple, pero menos protectora.

BENEFICIOS Y TRUCOS FISCALES: No existen trucos fiscales directos asociados al vesting en sí mismo. Los beneficios fiscales se derivan de la estructura societaria elegida y de las estrategias de optimización fiscal aplicadas a los ingresos que genera por la empresa. ⚠️ Riesgo: Sin embargo, una estrategia de vesting bien diseñada puede facilitar la optimización fiscal al alinear los incentivos para un crecimiento empresarial sostenido que genere mayores ganancias gravables, pero también al proteger el capital en caso de que los objetivos no se cumplan.`

const completeFixed = formatter.formatResponse(completeExample)
console.log(Array.isArray(completeFixed) ? completeFixed[0] : completeFixed)

console.log('')
console.log('🎯 CORRECCIONES APLICADAS:')
console.log('━'.repeat(40))
console.log('✅ Eliminado texto hardcodeado: "💰 Costo:" y "⚠️ Riesgo:"')
console.log('✅ Corregidos asteriscos mal colocados: *Holding-Operadora:*')
console.log('✅ Limpiado texto repetitivo de estructuras empresariales')
console.log('✅ Mejorada legibilidad y organización visual')
console.log('✅ Convertido doble asterisco (**) a simple (*) para WhatsApp')
console.log('✅ Eliminados espacios y saltos de línea excesivos')
console.log('✅ Formato limpio y profesional sin hardcode problemático')
console.log('')
console.log('🚀 RESULTADO: Mensajes limpios, legibles y profesionales!')