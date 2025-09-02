/**
 * 🧪 PRUEBA DEL SISTEMA DE FORMATEO MEJORADO
 * Demuestra las mejoras estéticas implementadas
 */

const MessageFormatterEnhanced = require('./server/services/messageFormatterEnhanced')

// Crear instancia del formateador
const formatter = new MessageFormatterEnhanced()

console.log('🎨 SISTEMA DE FORMATEO MEJORADO - DEMOSTRACIÓN')
console.log('='.repeat(60))
console.log('')

// 1. PRUEBA: Mensaje de bienvenida
console.log('📋 1. MENSAJE DE BIENVENIDA PROFESIONAL:')
console.log('-'.repeat(50))
const welcomeMessage = formatter.formatWelcomeMessage('Juan Carlos Pérez')
console.log(welcomeMessage)
console.log('')

// 2. PRUEBA: Formateo de respuesta fiscal
console.log('📊 2. RESPUESTA FISCAL PROFESIONAL:')
console.log('-'.repeat(50))
const fiscalText = `El IGV en Peru es del 18% y aplica a todas las operaciones gravadas. IMPORTANTE: Las empresas deben presentar declaraciones mensuales. RECOMENDACIÓN: Mantener un control detallado de comprobantes.

VENTAJA: El crédito fiscal puede compensarse. RIESGO: Las infracciones generan multas elevadas.

EN RESUMEN: Un buen manejo del IGV optimiza la carga tributaria de tu empresa.

EJEMPLO: Una empresa que vende S/ 100,000 mensualmente debe declarar S/ 18,000 de IGV.`

const fiscalFormatted = formatter.formatFiscalResponse(fiscalText, {
  currentTopic: 'fiscal',
  stage: 'exploring',
  queryType: 'legal_query'
})

console.log(Array.isArray(fiscalFormatted) ? fiscalFormatted[0] : fiscalFormatted)
console.log('')

// 3. PRUEBA: Formateo de respuesta empresarial
console.log('🏢 3. RESPUESTA EMPRESARIAL ESTRUCTURADA:')
console.log('-'.repeat(50))
const corporateText = `Para constituir una S.R.L en Peru necesitas:

1. Elaborar la minuta de constitución
2. Elevar a escritura pública ante notario
3. Inscribir en SUNARP
4. Obtener RUC en SUNAT

COSTO: Aproximadamente S/ 1,500 - S/ 2,500 en total.

NOTA: El capital mínimo es de S/ 1,000 soles.

IMPORTANTE: La S.R.L ofrece responsabilidad limitada a los socios.`

const corporateFormatted = formatter.formatCorporateResponse(corporateText, {
  currentTopic: 'empresa',
  stage: 'planning',
  queryType: 'corporate_query'
})

console.log(Array.isArray(corporateFormatted) ? corporateFormatted[0] : corporateFormatted)
console.log('')

// 4. PRUEBA: División de mensajes largos
console.log('📱 4. DIVISIÓN AUTOMÁTICA DE MENSAJES LARGOS:')
console.log('-'.repeat(50))
const longText = `La planificación fiscal empresarial en Perú requiere un enfoque estratégico y detallado. IMPORTANTE: Debe cumplir con toda la normativa vigente de SUNAT.

ESTRATEGIAS PRINCIPALES:

1. Optimización de la estructura societaria
2. Aprovechamiento de beneficios tributarios
3. Planificación de inversiones deducibles
4. Gestión eficiente del IGV
5. Manejo estratégico de gastos
6. Constitución de empresas holdings

BENEFICIOS TRIBUTARIOS DISPONIBLES:

• Ley MYPE: Régimen especial para micro y pequeñas empresas
• Depreciación acelerada: Para activos productivos
• Deducción por reinversión: En ciertos sectores
• Beneficios zonales: Selva, frontera, etc.

EJEMPLO PRÁCTICO: Una empresa de manufactura puede reducir su carga tributaria del 29.5% al 15% mediante la correcta aplicación de beneficios.

RECOMENDACIÓN: Trabajar con un asesor especializado para maximizar los ahorros fiscales.

CONCLUSIÓN: Una planificación adecuada puede generar ahorros significativos manteniendo el cumplimiento legal.`

const longFormatted = formatter.formatResponse(longText, {
  currentTopic: 'fiscal',
  stage: 'implementing',
  queryType: 'business_query'
})

if (Array.isArray(longFormatted)) {
  longFormatted.forEach((message, index) => {
    console.log(`📄 Mensaje ${index + 1}/${longFormatted.length}:`)
    console.log(message)
    console.log('\n' + '·'.repeat(40) + '\n')
  })
} else {
  console.log(longFormatted)
}

// 5. PRUEBA: Mensaje de error profesional
console.log('⚠️ 5. MENSAJE DE ERROR PROFESIONAL:')
console.log('-'.repeat(50))
const errorMessage = formatter.formatErrorMessage('Error técnico temporal')
console.log(errorMessage)
console.log('')

// 6. PRUEBA: Mensaje de seguimiento
console.log('🔄 6. MENSAJE DE SEGUIMIENTO:')
console.log('-'.repeat(50))
const followUpMessage = formatter.formatFollowUpMessage({
  currentTopic: 'holding',
  stage: 'planning',
  interests: ['Optimización fiscal', 'Protección patrimonial', 'Inversiones inmobiliarias']
})
console.log(followUpMessage)
console.log('')

console.log('✅ DEMOSTRACIÓN COMPLETADA')
console.log('='.repeat(60))
console.log('')
console.log('🎯 MEJORAS IMPLEMENTADAS:')
console.log('• ✨ Emojis contextuales empresariales')
console.log('• 📋 Separadores visuales elegantes')
console.log('• 🎨 Formateo profesional de listas y títulos')
console.log('• 📱 División automática para WhatsApp')
console.log('• 💼 Terminología empresarial especializada')
console.log('• 🔍 Detección automática de temas')
console.log('• 📊 Formateo específico por tipo de consulta')
console.log('')
console.log('🚀 Tu agente ahora responderá con un formato mucho más estético y profesional!')