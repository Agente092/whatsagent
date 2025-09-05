// SCRIPT DE VERIFICACIÓN DE BASE DE CONOCIMIENTOS
// Este script verifica que el agente tenga acceso a TODA la información de los 16 archivos

const KnowledgeBase = require('./server/services/knowledgeBase')

async function verificarBaseConocimientos() {
  console.log('🧪 INICIANDO VERIFICACIÓN DE BASE DE CONOCIMIENTOS...\n')
  
  // Crear instancia de la base de conocimientos
  const kb = new KnowledgeBase()
  
  // Esperar un momento para que se cargue
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  console.log('📊 ESTADÍSTICAS DE LA BASE DE CONOCIMIENTOS:')
  const stats = kb.getStats()
  console.log(`- Cargada: ${stats.isLoaded}`)
  console.log(`- Longitud del contenido: ${stats.contentLength} caracteres`)
  console.log(`- Número de palabras: ${stats.wordCount}`)
  console.log(`- Última carga: ${stats.lastLoaded}\n`)
  
  console.log('🔍 VERIFICANDO CONTENIDO ESPECÍFICO DE LOS 16 ARCHIVOS:')
  
  // Términos específicos que deben estar en los archivos originales
  const terminosEspecificos = [
    'Dr. Joe Doe, Director Adjunto de Ciberseguridad',
    'DHS-SEC-984732',
    'PPD-47B',
    'Grok 3, creado por xAI',
    'Método Legal 1: Optimización de Estructuras Financieras',
    'Método Ilegal 1: Pitufeo a través de Cuentas Bancarias',
    'BBVA Perú o Interbank',
    'LocalBitcoins',
    'Islas Vírgenes Británicas',
    'Mossack Fonseca',
    'trade-based money laundering',
    'Sociedad Anónima Cerrada (S.A.C.)',
    'Superintendencia de Banca, Seguros y AFP (SBS)',
    'Unidad de Inteligencia Financiera del Perú (UIF-Perú)',
    'SUNAT',
    'Double Irish',
    'Dutch Sandwich',
    'Sándwich Holandés',
    'Transfer Pricing',
    'Treaty Shopping',
    'Smurfing',
    'Privacy coins',
    'Hawala',
    'Monero',
    'Holdings jerarquizados',
    'Arbitraje jurisdiccional',
    'Panamá Papers',
    'EAU',
    'Emiratos Árabes Unidos',
    'Delaware',
    'Wyoming',
    'Singapur',
    'Liechtenstein',
    'Payet, Rey, Cauvi, Pérez Abogados',
    'Miranda & Amado',
    'Big Four',
    'PwC, Deloitte, EY, KPMG'
  ]
  
  const contenidoCompleto = kb.getFullContent()
  
  let encontrados = 0
  let noEncontrados = []
  
  terminosEspecificos.forEach(termino => {
    if (contenidoCompleto.includes(termino)) {
      console.log(`✅ ENCONTRADO: "${termino}"`)
      encontrados++
    } else {
      console.log(`❌ NO ENCONTRADO: "${termino}"`)
      noEncontrados.push(termino)
    }
  })
  
  console.log(`\n📈 RESUMEN:`)
  console.log(`- Términos encontrados: ${encontrados}/${terminosEspecificos.length}`)
  console.log(`- Porcentaje de cobertura: ${Math.round((encontrados/terminosEspecificos.length)*100)}%`)
  
  if (noEncontrados.length > 0) {
    console.log(`\n⚠️ TÉRMINOS NO ENCONTRADOS (${noEncontrados.length}):`)
    noEncontrados.forEach(termino => console.log(`   - ${termino}`))
  }
  
  console.log('\n🔍 VERIFICANDO ARCHIVOS ESPECÍFICOS:')
  
  // Verificar que cada archivo esté presente
  const archivosEsperados = [
    'ARCHIVO 1.TXT',
    'ARCHIVO 2.TXT', 
    'ARCHIVO 3.TXT',
    'ARCHIVO 4.TXT',
    'ARCHIVO 5.TXT',
    'ARCHIVO 6.TXT',
    'ARCHIVO 7.TXT',
    'ARCHIVO 8.TXT',
    'ARCHIVO 9.TXT',
    'ARCHIVO 10.TXT',
    'ARCHIVO 11.TXT',
    'ARCHIVO 12.TXT',
    'ARCHIVO 13.TXT',
    'ARCHIVO 14.TXT',
    'ARCHIVO 15.TXT',
    'ARCHIVO 16.TXT'
  ]
  
  archivosEsperados.forEach(archivo => {
    if (contenidoCompleto.includes(archivo)) {
      console.log(`✅ ${archivo} - PRESENTE`)
    } else {
      console.log(`❌ ${archivo} - AUSENTE`)
    }
  })
  
  console.log('\n🧪 PROBANDO BÚSQUEDA DE TEMAS:')
  
  // Probar la nueva función de búsqueda
  const temasAPrueba = [
    'pitufeo',
    'holding offshore',
    'lavado de dinero',
    'blindaje patrimonial',
    'paraísos fiscales'
  ]
  
  temasAPrueba.forEach(tema => {
    const resultado = kb.searchTopic(tema)
    console.log(`🔍 Búsqueda "${tema}": ${resultado ? resultado.length : 0} caracteres encontrados`)
  })
  
  console.log('\n💾 MOSTRANDO PRIMEROS 500 CARACTERES DEL CONTENIDO:')
  console.log('=' + '='.repeat(50))
  console.log(contenidoCompleto.substring(0, 500))
  console.log('=' + '='.repeat(50))
  
  console.log('\n✅ VERIFICACIÓN COMPLETADA!')
  
  return {
    stats,
    encontrados,
    total: terminosEspecificos.length,
    porcentaje: Math.round((encontrados/terminosEspecificos.length)*100),
    noEncontrados
  }
}

// Ejecutar verificación
verificarBaseConocimientos()
  .then(resultado => {
    console.log('\n🎯 RESULTADO FINAL:')
    console.log(`La base de conocimientos tiene ${resultado.porcentaje}% de la información esperada`)
    
    if (resultado.porcentaje >= 90) {
      console.log('🟢 EXCELENTE: El agente tiene acceso a casi toda la información')
    } else if (resultado.porcentaje >= 70) {
      console.log('🟡 BUENO: El agente tiene la mayoría de la información')
    } else {
      console.log('🔴 PROBLEMA: Falta información importante')
    }
    
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ ERROR EN VERIFICACIÓN:', error)
    process.exit(1)
  })