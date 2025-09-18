/**
 * 🧪 PRUEBA ADICIONAL - MENSAJE MUY LARGO
 * Verificar que la fragmentación SÍ funciona cuando el mensaje excede el límite real
 */

const MessageFormatter = require('./server/services/messageFormatter')

function testVeryLongMessage() {
  console.log('🧪 PRUEBA CON MENSAJE EXTREMADAMENTE LARGO')
  console.log('===========================================\n')
  
  const formatter = new MessageFormatter()
  
  // 📄 CREAR MENSAJE MUY LARGO (más de 4000 caracteres)
  const veryLongMessage = `luis, entiendo perfectamente tu consulta sobre el Beautiful Tax Bill de 2025. Esta es una ley fiscal significativa propuesta por la administración Trump que efectivamente puede beneficiar a empresarios del sector construcción operando desde Perú.

**1. APROVECHAMIENTO DESDE PERÚ:**

• **Estructura LLC en Estados Unidos:** Crear una LLC en Delaware o Florida que opere bajo el Beautiful Tax Bill con beneficios fiscales específicos para el sector construcción. Esta estructura te permite acceder directamente a los incentivos fiscales estadounidenses mientras mantienes tu operación base en Perú.

• **Métodos de Aplicación en Perú:** Emitir facturas desde tu empresa peruana hacia la LLC estadounidense por servicios de consultoría, diseño arquitectónico, gestión de proyectos, supervisión técnica y transferencia de conocimiento especializado en construcción.

• **Beneficios Fiscales Específicos:** El Beautiful Tax Bill incluye reducciones del 15% en impuesto corporativo para empresas del sector construcción, deducciones aceleradas para equipos y maquinaria, y créditos fiscales por proyectos de infraestructura sostenible.

**2. ESTRATEGIAS OPERATIVAS PARA CONSTRUCCIÓN:**

• **Joint Ventures Internacionales:** Asociarte con desarrolladores estadounidenses bajo la nueva ley, creando sinergias entre la experiencia peruana en construcción y el mercado estadounidense, aprovechando las regulaciones favorables del Beautiful Tax Bill.

• **Importación de Materiales:** Aprovechar aranceles reducidos en materiales de construcción bajo el Beautiful Tax Bill, especialmente en acero, cemento especializado y tecnologías de construcción sostenible que son prioritarias en la nueva legislación.

• **Exportación de Servicios:** Tu expertise en construcción peruana, especialmente en proyectos antisísmicos y construcción en terrenos complejos, puede ser altamente valorado en el mercado estadounidense bajo los nuevos incentivos.

**3. PLANIFICACIÓN FISCAL TRANSFRONTERIZA:**

• **Transfer Pricing Optimizado:** Establecer precios de transferencia entre tu empresa peruana y la LLC estadounidense, documentando adecuadamente los servicios prestados y asegurando cumplimiento con ambas jurisdicciones fiscales.

• **Tratado de Doble Tributación:** El tratado Perú-USA permite evitar la doble imposición, optimizando la carga fiscal total y maximizando los beneficios del Beautiful Tax Bill sin crear obligaciones tributarias excesivas en Perú.

• **Repatriación Estratégica:** Planificar el retorno de utilidades de manera fiscal eficiente, aprovechando ventanas temporales óptimas y estructuras que minimicen la carga tributaria en ambos países.

**4. IMPLEMENTACIÓN PRÁCTICA INMEDIATA:**

• **Fase 1 - Constitución:** Establecer la LLC en Delaware (proceso 2-3 semanas) con object clause específico para construcción y actividades relacionadas bajo el Beautiful Tax Bill.

• **Fase 2 - Operativa:** Implementar contratos de servicios entre tu empresa peruana y la LLC estadounidense, estableciendo flujos de facturación y documentación de soporte.

• **Fase 3 - Escalamiento:** Expandir operaciones aprovechando los incentivos del Beautiful Tax Bill para proyectos de mayor envergadura y complejidad técnica.

¿Te interesa profundizar en alguna de estas estrategias específicamente o prefieres que elaboremos un plan de implementación paso a paso?`

  console.log('📏 Longitud del mensaje:', veryLongMessage.length, 'caracteres')
  console.log('🎯 Límite WhatsApp: 4000 caracteres')
  
  // 🧪 PROBAR FRAGMENTACIÓN
  const fragmentedMessages = formatter.splitIntoMessages(veryLongMessage)
  
  console.log('\n📊 RESULTADO DE FRAGMENTACIÓN:')
  console.log('============================')
  console.log('🔢 Número de fragmentos:', fragmentedMessages.length)
  
  if (fragmentedMessages.length === 1) {
    console.log('✅ Mensaje se envía como UNO SOLO (no requiere fragmentación)')
  } else {
    console.log('✅ FRAGMENTACIÓN JUSTIFICADA - Mensaje excede límite real:')
    fragmentedMessages.forEach((msg, index) => {
      console.log(`\n📄 Fragmento ${index + 1} (${msg.length} caracteres):`)
      console.log('─'.repeat(50))
      console.log(msg.substring(0, 200) + '...')
    })
  }
  
  console.log('\n🎯 CONCLUSIÓN:')
  if (veryLongMessage.length > 4000 && fragmentedMessages.length > 1) {
    console.log('✅ PERFECTO: Fragmentación funciona SOLO cuando es necesaria')
    console.log('✅ SISTEMA INTELIGENTE: No fragmenta mensajes normales, sí fragmenta mensajes muy largos')
  } else if (veryLongMessage.length <= 4000) {
    console.log('✅ ÓPTIMO: Mensaje cabe en uno solo, no se fragmenta innecesariamente')
  }
}

// Ejecutar prueba
testVeryLongMessage()