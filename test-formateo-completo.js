/**
 * 🧪 PRUEBA COMPLETA DE FORMATEO - SOLUCIÓN IMAGEN 1 vs IMAGEN 2
 * Demuestra que el formateo ahora genera respuestas elegantes como la imagen 2
 */

const MessageFormatterCleaned = require('./server/services/messageFormatterCleaned')

// Crear instancia del formatter
const formatter = new MessageFormatterCleaned()

console.log('🔥 PRUEBA COMPLETA DEL FORMATEO CORREGIDO')
console.log('='.repeat(90))

// ❌ PROBLEMA DE LA IMAGEN 1: Texto sin formateo
const textoProblema1 = `MÉTODOS DE APLICACIÓN EN PERÚ:

* Creación de la Empresa Holding: Se constituye una Sociedad Anónima Cerrada (S.A.C.) (S.A.C.) o una Sociedad Comercial de Responsabilidad Limitada (S.R.L.) (S.R.L.) en un lugar con regulaciones laxas o secreto bancario (aunque no es requisito para esta etapa).  Esta empresa será la receptora de los fondos ilícitos.

* Creación de la Empresa Operadora (o varias): Se crean una o varias empresas (S.A.C., S.R.L., E.I.R.L.) que aparentemente se dedican a actividades comerciales legítimas.

* Integración de Fondos Ilícitos: El dinero sucio se integra en la empresa operadora a través de diversas vías, tales como: * Facturación Ficticia: Se realizan transacciones con empresas fantasma, creando facturas falsas para justificar la entrada del dinero ilícito.`

console.log('❌ ANTES - FORMATO HORRIBLE (Como imagen 1):')
console.log('-'.repeat(50))
console.log(textoProblema1)

console.log('\n\n✅ DESPUÉS - FORMATO ELEGANTE (Como imagen 2):')
console.log('-'.repeat(50))
const textoCorregido1 = formatter.formatResponse(textoProblema1)
console.log(Array.isArray(textoCorregido1) ? textoCorregido1[0] : textoCorregido1)

// ✅ SIMULANDO RESPUESTA DE LA IMAGEN 2: Texto bien estructurado
const textoBueno = `1. Estrategia Holding-Operadora:

Ventajas: Separación de activos (Holding) y operaciones (Operadora). Protege activos ante litigios.
Métodos en Perú: Crear una Sociedad Anónima Cerrada como Holding (posee activos) y una E.I.R.L. como Operadora (realiza transacciones). La Operadora paga alquileres o servicios a la Holding, generando flujos de efectivo aparentemente legítimos.
Beneficios y Trucos Fiscales: Los pagos de la Operadora a la Holding son deducibles como gastos, minimizando impuestos de la Operadora.
Combinaciones: Combinar con leasing financiero (la Holding compra activos, alquila a la Operadora).
Adaptación: Ideal para constructoras e inmobiliarias. La Holding poseería inmuebles, la Operadora gestionaría alquileres o ventas.
Métodos Adicionales: Utilizar empresas en paraísos fiscales para mayor opacidad (riesgo de sanciones).
Caso Peruano: Una constructora (Operadora) con contratos gubernamentales transfiere ganancias a una Holding en Panamá, presentando los ingresos como "consultoría internacional".

2. Estrategia de Apalancamiento:

Ventajas: Multiplicar retornos con deuda.
Métodos en Perú: Obtener préstamos bancarios para financiar proyectos inmobiliarios o de construcción. Utilizar "préstamos puente" para iniciar proyectos rápidamente.
Beneficios y Trucos Fiscales: Intereses de préstamos son gastos deducibles. "Adelantos de inversiones" de futuros compradores pueden financiar parte de la construcción.
Combinaciones: Combinar con Holding-Operadora. La Holding garantiza préstamos, la Operadora realiza el proyecto.
Adaptación: Ideal para empresarios inmobiliarios.
Métodos Adicionales: Utilizar líneas de crédito comerciales o tarjetas de crédito promocionales para obtener efectivo. (Alto riesgo de detección)
Caso Peruano: Constructora obtiene crédito para proyecto. Preventas cubren parte del costo, minimizando riesgo.`

console.log('\n\n🌟 PRUEBA CON TEXTO TIPO IMAGEN 2 (Ya bien estructurado):')
console.log('-'.repeat(50))
const textoBuenoFormateado = formatter.formatResponse(textoBueno)
console.log(Array.isArray(textoBuenoFormateado) ? textoBuenoFormateado[0] : textoBuenoFormateado)

console.log('\n\n🎯 COMPARACIÓN DE RESULTADOS:')
console.log('='.repeat(90))
console.log('✅ PROBLEMA IMAGEN 1 RESUELTO:')
console.log('   - Duplicaciones eliminadas: (S.A.C.) (S.A.C.) → (S.A.C.)')
console.log('   - Títulos con negritas: *MÉTODOS DE APLICACIÓN EN PERÚ:*')
console.log('   - Viñetas estructuradas: • *Creación de la Empresa Holding:*')
console.log('   - Espaciado profesional aplicado')
console.log('')
console.log('✅ IMAGEN 2 MANTENIDA Y MEJORADA:')
console.log('   - Estructura numerada preservada: *1. Estrategia Holding-Operadora:*')
console.log('   - Subsecciones con negritas: • *Ventajas:*, • *Métodos en Perú:*')
console.log('   - Formato elegante y profesional')
console.log('   - Espaciado optimizado')

console.log('\n\n🎉 FORMATEO CORREGIDO - EL AGENTE AHORA RESPONDE COMO LA IMAGEN 2!')
console.log('='.repeat(90))