/**
 * 🚨 TEST ESPECÍFICO PARA DUPLICACIONES DE SIGLAS EMPRESARIALES
 * Reproduce exactamente el problema de "(S.A.C.) (S.A.C.)" y "(S.R.L.) (S.R.L.)"
 */

const MessageFormatter = require('./server/services/messageFormatter')
const MessageFormatterEnhanced = require('./server/services/messageFormatterEnhanced')
const MessageFormatterCleaned = require('./server/services/messageFormatterCleaned')

console.log('🔍 ANÁLISIS DE DUPLICACIONES DE SIGLAS EMPRESARIALES')
console.log('='.repeat(60))

// Simular texto que ya contiene las siglas (como vendría de la IA)
const textoConSiglas = `Se constituye una Sociedad Anónima Cerrada (S.A.C.) o una Sociedad Comercial de Responsabilidad Limitada (S.R.L.) como holding principal.

Las S.A.C. y S.R.L. son las más utilizadas para blindaje patrimonial en Perú.

También se puede usar una S.A. o E.I.R.L. según el caso.`

console.log('❌ TEXTO ORIGINAL (CON SIGLAS YA PRESENTES):')
console.log('-'.repeat(50))
console.log(textoConSiglas)
console.log('')

// Probar con cada formatter para ver cuál está causando la duplicación
const formatters = [
  { name: 'MessageFormatter', instance: new MessageFormatter() },
  { name: 'MessageFormatterEnhanced', instance: new MessageFormatterEnhanced() },
  { name: 'MessageFormatterCleaned', instance: new MessageFormatterCleaned() }
]

formatters.forEach(formatter => {
  console.log(`🔧 RESULTADO CON ${formatter.name}:`)
  console.log('-'.repeat(50))
  
  try {
    let resultado
    if (formatter.name === 'MessageFormatter') {
      resultado = formatter.instance.normalizeForWhatsApp(textoConSiglas)
    } else if (formatter.name === 'MessageFormatterEnhanced') {
      resultado = formatter.instance.formatCorporateResponse(textoConSiglas)
    } else {
      resultado = formatter.instance.formatResponse(textoConSiglas)
    }
    
    console.log(resultado)
    
    // Detectar duplicaciones
    const duplicacionesDetectadas = []
    if (resultado.includes('(S.A.C.) (S.A.C.)')) duplicacionesDetectadas.push('S.A.C.')
    if (resultado.includes('(S.R.L.) (S.R.L.)')) duplicacionesDetectadas.push('S.R.L.')
    if (resultado.includes('(S.A.) (S.A.)')) duplicacionesDetectadas.push('S.A.')
    if (resultado.includes('(E.I.R.L.) (E.I.R.L.)')) duplicacionesDetectadas.push('E.I.R.L.')
    
    if (duplicacionesDetectadas.length > 0) {
      console.log(`🚨 DUPLICACIONES DETECTADAS: ${duplicacionesDetectadas.join(', ')}`)
    } else {
      console.log('✅ Sin duplicaciones detectadas')
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`)
  }
  
  console.log('')
})

console.log('📊 ANÁLISIS DE REGLAS DE REEMPLAZO:')
console.log('-'.repeat(50))
console.log('🔍 Revisando si las reglas están aplicándose múltiples veces...')
console.log('🎯 El problema probablemente está en que las reglas regex detectan')
console.log('   text que ya fue procesado y lo vuelven a procesar.')
console.log('')
console.log('💡 SOLUCIÓN: Necesitamos reglas que eviten aplicarse a texto ya formateado')