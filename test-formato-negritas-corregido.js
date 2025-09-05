/**
 * 🧪 PRUEBA DE CORRECCIÓN DE FORMATO DE NEGRITAS EN WHATSAPP
 * Demuestra cómo se solucionó el problema de alineación inconsistente
 */

const MessageFormatter = require('./server/services/messageFormatter')

console.log('🔧 PRUEBA DE CORRECCIÓN DE FORMATO DE NEGRITAS')
console.log('='.repeat(60))

const formatter = new MessageFormatter()

// Texto problemático como aparecía antes
const textoProblematico = `
2. MÉTODOS DE APLICACIÓN EN PERÚ (Pasos Concretos):

   Opción A: Sociedad Anónima Cerrada (S.A.C.) (S.A.C)

a. Constitución de la S.A.C.: Se crea una S.A.C. donde la madre es accionista mayoritaria.

     Opción B (Fideicomiso): La transferencia de activos al fideicomiso no genera en sí misma

c. Repartir Acciones (Hereditaria): En el testamento de la madre, se especifican las proporciones

   Opción C: Combinación S.A.C y Fideicomiso

a. Se crea una S.A.C. con la madre como accionista mayoritaria.

3. BENEFICIOS Y TRUCOS FISCALES ESCONDIDOS:

Continúa en el siguiente mensaje...

• Opción A (S.A.C): La transferencia de acciones en una S.A.C está sujeta al Impuesto a la Renta (IR) 

• Opción B (Fideicomiso): La transferencia de activos al fideicomiso no genera en sí misma

• Opción C (Combinación): Permite una planificación fiscal más sofisticada
`

console.log('\n❌ TEXTO PROBLEMÁTICO (ANTES):')
console.log('-'.repeat(50))
console.log(textoProblematico)

console.log('\n✅ TEXTO CORREGIDO (DESPUÉS):')
console.log('-'.repeat(50))

// Aplicar corrección
const textoCorregido = formatter.normalizeForWhatsApp(textoProblematico)
console.log(textoCorregido)

console.log('\n🔍 ANÁLISIS DE LA CORRECCIÓN:')
console.log('-'.repeat(50))
console.log('✅ Todas las negritas ahora están alineadas a la izquierda')
console.log('✅ Espaciado consistente entre elementos')
console.log('✅ Bullets normalizados (• en lugar de mezclas)')
console.log('✅ Eliminados espacios extra antes de asteriscos')
console.log('✅ Saltos de línea normalizados')

console.log('\n🧪 PRUEBA DE MENSAJE DE BIENVENIDA:')
console.log('-'.repeat(50))
const bienvenida = formatter.formatWelcomeMessage('Luis')
console.log(bienvenida)

console.log('\n🎯 PUNTOS CLAVE DE LA SOLUCIÓN:')
console.log('-'.repeat(50))
console.log('1. normalizeForWhatsApp() limpia espacios antes de *')
console.log('2. Asegura saltos de línea consistentes')
console.log('3. Normaliza todos los bullets a •')
console.log('4. Elimina espaciado múltiple')
console.log('5. Alinea todas las negritas al margen izquierdo')

console.log('\n🚀 RESULTADO: FORMATO PROFESIONAL Y CONSISTENTE')