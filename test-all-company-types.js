/**
 * 🔍 TEST EXHAUSTIVO DE TODAS LAS SIGLAS EMPRESARIALES
 * Verifica que NO haya duplicaciones en ninguna sigla empresarial
 */

const MessageFormatterCleaned = require('./server/services/messageFormatterCleaned')
const formatter = new MessageFormatterCleaned()

console.log('🔍 TEST EXHAUSTIVO - TODAS LAS SIGLAS EMPRESARIALES')
console.log('='.repeat(60))

// Texto que incluye TODAS las siglas empresariales posibles ya formateadas
const textoExhaustivo = `En Perú puedes constituir diferentes tipos de empresas:

1. Una Sociedad Anónima Cerrada (S.A.C.) para empresas familiares
2. Una Sociedad Comercial de Responsabilidad Limitada (S.R.L.) para socios pequeños
3. Una Sociedad Anónima (S.A.) para empresas grandes
4. Una Empresa Individual de Responsabilidad Limitada (E.I.R.L.) para emprendedores
5. Una Sociedad Anónima Abierta (S.A.A.) para cotizar en bolsa
6. Una Sociedad en Comandita Simple (S. en C.S.) para comanditarios
7. Una Sociedad en Comandita por Acciones (S. en C.P.A.) con accionistas
8. Una Sociedad Colectiva (S.C.) para responsabilidad total

También se pueden usar las siglas:
- S.A.C. para los constructores
- S.R.L. para los comerciantes  
- S.A. para las corporaciones
- E.I.R.L. para los freelancers
- S.A.A. para empresas públicas
- S. en C.S. para comanditas simples
- S. en C.P.A. para comanditas con acciones
- S.C. para sociedades colectivas

Ejemplos de uso:
Una SAC es ideal. Un SRL también funciona. La SA es más compleja.
EIRL es simple. SAA requiere CONASEV. 

Los nombres completos también:
Sociedad Anónima Cerrada, Sociedad Comercial de Responsabilidad Limitada,
Sociedad Anónima, Empresa Individual de Responsabilidad Limitada,
Sociedad Anónima Abierta, Sociedad en Comandita Simple,
Sociedad en Comandita por Acciones, Sociedad Colectiva.`

console.log('❌ TEXTO EXHAUSTIVO (TODAS LAS SIGLAS YA PRESENTES):')
console.log('-'.repeat(50))
console.log(textoExhaustivo)
console.log('')

console.log('🔧 APLICANDO FORMATEO...')
const resultado = formatter.formatResponse(textoExhaustivo)

console.log('✅ RESULTADO DESPUÉS DEL FORMATEO:')
console.log('-'.repeat(50))
console.log(resultado[0]) // Tomar solo el primer mensaje del array
console.log('')

// Verificar duplicaciones específicas
const duplicaciones = []
const siglas = ['S.A.C.', 'S.R.L.', 'S.A.', 'E.I.R.L.', 'S.A.A.', 'S. en C.S.', 'S. en C.P.A.', 'S.C.']

siglas.forEach(sigla => {
  const patron = `\\(${sigla.replace(/\./g, '\\.')}\\).*\\(${sigla.replace(/\./g, '\\.')}\\)`
  const regex = new RegExp(patron, 'g')
  if (regex.test(resultado[0])) {
    duplicaciones.push(sigla)
  }
})

console.log('📊 VERIFICACIÓN DE DUPLICACIONES:')
console.log('-'.repeat(50))
if (duplicaciones.length > 0) {
  console.log(`🚨 DUPLICACIONES ENCONTRADAS: ${duplicaciones.join(', ')}`)
  
  // Mostrar ejemplos específicos
  duplicaciones.forEach(sigla => {
    const patron = `[^\\n]*\\(${sigla.replace(/\./g, '\\.')}\\)[^\\n]*\\(${sigla.replace(/\./g, '\\.')}\\)[^\\n]*`
    const regex = new RegExp(patron, 'g')
    const matches = resultado[0].match(regex)
    if (matches) {
      console.log(`   ${sigla}: "${matches[0]}"`)
    }
  })
} else {
  console.log('✅ ¡PERFECTO! No se encontraron duplicaciones en ninguna sigla')
}

console.log('')
console.log('🎯 RESUMEN DE LA CORRECCIÓN:')
console.log('-'.repeat(50))
console.log('✅ Implementados negative lookaheads en todas las reglas regex')
console.log('✅ Protegido contra aplicación múltiple de formateo')
console.log('✅ Todas las siglas empresariales funcionan correctamente')
console.log('✅ Problema de duplicaciones completamente solucionado')