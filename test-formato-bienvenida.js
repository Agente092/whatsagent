/**
 * 🧪 PRUEBA DE FORMATEO DE BIENVENIDA
 * Compara el saludo actual vs el del backup para ver las diferencias
 */

const MessageFormatterCleaned = require('./server/services/messageFormatterCleaned')

// Crear instancia del formatter
const formatter = new MessageFormatterCleaned()

// Probar el saludo del backup
console.log('🎯 SALUDO CON FORMATEO DEL BACKUP:')
console.log('='.repeat(50))
const saludoConFormato = formatter.formatWelcomeMessage('Luis')
console.log(saludoConFormato)

console.log('\n\n❌ SALUDO ACTUAL (SIN FORMATO):')
console.log('='.repeat(50))
const timeGreeting = '¡Buenas noches'
const clientName = 'Luis'
const saludoActual = `${timeGreeting} ${clientName}!

Soy tu Asesor Empresarial Especializado

Estoy aquí para brindarte estrategias inteligentes y soluciones empresariales de alto nivel adaptadas a la realidad peruana.

MIS ESPECIALIDADES:

• Estrategias fiscales y tributarias
• Estructuras empresariales avanzadas  
• Inversiones inmobiliarias
• Planificación patrimonial
• Optimización de Holdings
• Fideicomisos y vehículos offshore

¿Cómo puedo ayudarte hoy?

Puedes consultarme sobre cualquier tema empresarial, fiscal, tributario o de inversiones. Estoy preparado para darte respuestas detalladas y estrategias específicas.

¡Comencemos a optimizar tu estructura empresarial!`

console.log(saludoActual)

console.log('\n\n🔍 ANÁLISIS DE DIFERENCIAS:')
console.log('='.repeat(50))
console.log('📌 El backup usa ASTERISCOS (*texto*) para negritas de WhatsApp')
console.log('📌 El saludo actual NO tiene asteriscos, por eso se ve horrible')
console.log('📌 WhatsApp interpreta *texto* como negritas')
console.log('📌 Sin asteriscos = texto plano sin formato')

console.log('\n\n✅ SOLUCIÓN APLICADA:')
console.log('='.repeat(50))
console.log('El server/index.js ahora usa:')
console.log('geminiService.formatter.formatWelcomeMessage(client.name)')
console.log('En lugar del saludo hardcodeado')