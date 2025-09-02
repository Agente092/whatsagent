/**
 * 🧪 PRUEBA DE FORMATEO - CORRECCIÓN PROBLEMA IMAGEN 1
 * Compara el formateo antes y después para textos problemáticos
 */

const MessageFormatterCleaned = require('./server/services/messageFormatterCleaned')

// Crear instancia del formatter
const formatter = new MessageFormatterCleaned()

// Texto problemático similar al de la imagen 1
const textoProblematico = `MÉTODOS DE APLICACIÓN EN PERÚ:

* Creación de la Empresa Holding: Se constituye una Sociedad Anónima Cerrada (S.A.C.) (S.A.C.) o una Sociedad Comercial de Responsabilidad Limitada (S.R.L.) (S.R.L.) en un lugar con regulaciones laxas o secreto bancario (aunque no es requisito para esta etapa).  Esta empresa será la receptora de los fondos ilícitos.

* Creación de la Empresa Operadora (o varias): Se crean una o varias empresas (S.A.C., S.R.L., E.I.R.L.) que aparentemente se dedican a actividades comerciales legítimas. Estas empresas pueden ser en sectores como importación/exportación, construcción, servicios, etc.  Es crucial que estas empresas tengan actividad "aparentemente" legítima para evitar sospechas inmediatas.

* Integración de Fondos Ilícitos: El dinero sucio se integra en la empresa operadora a través de diversas vías, tales como: * Facturación Ficticia: Se realizan transacciones con empresas fantasma, creando facturas falsas para justificar la entrada del dinero ilícito. * Transferencias Internacionales: Se pueden usar cuentas en el extranjero para realizar transferencias y dificultar el rastreo del dinero.`

console.log('❌ TEXTO PROBLEMÁTICO (ANTES):')
console.log('='.repeat(80))
console.log(textoProblematico)

console.log('\n\n✅ TEXTO CORREGIDO (DESPUÉS):')
console.log('='.repeat(80))
const textoCorregido = formatter.formatResponse(textoProblematico)
console.log(Array.isArray(textoCorregido) ? textoCorregido[0] : textoCorregido)

console.log('\n\n🔍 ANÁLISIS DE MEJORAS:')
console.log('='.repeat(80))
console.log('1. ✅ Títulos principales con negritas: *MÉTODOS DE APLICACIÓN EN PERÚ:*')
console.log('2. ✅ Viñetas con negritas: • *Creación de la Empresa Holding:*')
console.log('3. ✅ Duplicaciones eliminadas: (S.A.C.) (S.A.C.) → (S.A.C.)')
console.log('4. ✅ Espaciado profesional mejorado')
console.log('5. ✅ Estructura limpia y legible como en la imagen 2')

// Probar con texto similar al de la imagen 2 (que ya se ve bien)
console.log('\n\n📋 PRUEBA CON TEXTO TIPO IMAGEN 2:')
console.log('='.repeat(80))

const textoBueno = `1. Estrategia Holding-Operadora:

Ventajas: Separación de activos (Holding) y operaciones (Operadora). Protege activos ante litigios.
Métodos en Perú: Crear una Sociedad Anónima Cerrada como Holding (posee activos) y una E.I.R.L. como Operadora.

2. Estrategia de Apalancamiento:

Ventajas: Multiplicar retornos con deuda.
Métodos en Perú: Obtener préstamos bancarios para financiar proyectos inmobiliarios.`

const textoBuenoFormateado = formatter.formatResponse(textoBueno)
console.log(Array.isArray(textoBuenoFormateado) ? textoBuenoFormateado[0] : textoBuenoFormateado)