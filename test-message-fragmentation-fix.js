/**
 * 🔧 PRUEBA ESPECÍFICA PARA CORRECCIÓN DE FRAGMENTACIÓN
 * Validar que los mensajes largos no se fragmenten incorrectamente
 */

const MessageFormatter = require('./server/services/messageFormatter')

function testMessageFragmentation() {
  console.log('🔧 PRUEBA DE CORRECCIÓN DE FRAGMENTACIÓN')
  console.log('========================================\n')
  
  const formatter = new MessageFormatter()
  
  // 📄 CREAR MENSAJE LARGO SIMULADO (como el que genera IA)
  const longMessage = `luis, entiendo perfectamente tu consulta sobre el Beautiful Tax Bill de 2025. Esta es una ley fiscal significativa propuesta por la administración Trump que efectivamente puede beneficiar a empresarios del sector construcción operando desde Perú. Te explico las mejores estrategias:

**1. APROVECHAMIENTO DESDE PERÚ:**

• **Estructura LLC en Estados Unidos:** Crear una LLC en Delaware o Florida que opere bajo el Beautiful Tax Bill
• **Métodos de Aplicación en Perú:** Emitir facturas desde tu empresa peruana hacia la LLC estadounidense por servicios de consultoría, diseño arquitectónico o gestión de proyectos
• **Beneficios Fiscales Específicos:** El Beautiful Tax Bill incluye reducciones del 15% en impuesto corporativo para empresas del sector construcción
• **Optimización Tributaria:** La LLC puede reinvertir las ganancias en proyectos inmobiliarios en USA, aprovechando las deducciones aceleradas

**2. ESTRATEGIAS OPERATIVAS PARA CONSTRUCCIÓN:**

• **Joint Ventures Internacionales:** Asociarte con desarrolladores estadounidenses bajo la nueva ley
• **Importación de Materiales:** Aprovechar aranceles reducidos en materiales de construcción bajo el Beautiful Tax Bill
• **Exportación de Servicios:** Tu expertise en construcción peruana puede ser valorado en el mercado estadounidense

**3. PLANIFICACIÓN FISCAL TRANSFRONTERIZA:**

• **Transfer Pricing Optimizado:** Establecer precios de transferencia entre tu empresa peruana y la LLC estadounidense
• **Tratado de Doble Tributación:** Perú-USA permite evitar la doble imposición
• **Repatriación Estratégica:** Planificar el retorno de utilidades de manera fiscal eficiente

¿Te interesa profundizar en alguna de estas estrategias específicamente?`

  console.log('📏 Longitud del mensaje:', longMessage.length, 'caracteres')
  
  // 🧪 PROBAR FRAGMENTACIÓN
  const fragmentedMessages = formatter.splitIntoMessages(longMessage)
  
  console.log('📊 RESULTADO DE FRAGMENTACIÓN:')
  console.log('============================')
  console.log('🔢 Número de fragmentos:', fragmentedMessages.length)
  
  if (fragmentedMessages.length === 1) {
    console.log('✅ PERFECTO: Mensaje se envía como UNO SOLO (sin fragmentación innecesaria)')
    console.log('📏 Longitud final:', fragmentedMessages[0].length, 'caracteres')
  } else {
    console.log('⚠️ Se fragmentó en', fragmentedMessages.length, 'partes:')
    fragmentedMessages.forEach((msg, index) => {
      console.log(`📄 Fragmento ${index + 1} (${msg.length} chars):`)
      console.log(msg.substring(0, 100) + '...\n')
    })
  }
  
  // 🎯 VALIDACIÓN CRÍTICA
  console.log('\n🎯 VALIDACIÓN:')
  if (fragmentedMessages.length === 1 && longMessage.length < 4000) {
    console.log('✅ CORRECCIÓN EXITOSA: El mensaje NO se fragmenta innecesariamente')
    console.log('✅ BENEFICIO: El usuario recibe la respuesta completa de una sola vez')
    console.log('✅ RESULTADO: No más mensajes cortados como "luis, entiendo perfectamente tu consulta sobre el ..."')
  } else if (longMessage.length >= 4000) {
    console.log('✅ FRAGMENTACIÓN JUSTIFICADA: Mensaje excede límite real de WhatsApp')
  } else {
    console.log('❌ PROBLEMA PERSISTE: Fragmentación innecesaria')
  }
  
  console.log('\n📋 PRÓXIMOS PASOS:')
  console.log('1. 🔄 Reiniciar servidor: npm run dev:server')
  console.log('2. 📱 Probar mensaje: "Sabes de cómo podría usar la ley Beautiful Bill tax a mi favor?"')
  console.log('3. ✅ Verificar que la respuesta llega COMPLETA en un solo mensaje')
}

// Ejecutar prueba
testMessageFragmentation()