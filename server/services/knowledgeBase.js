const fs = require('fs')
const path = require('path')

class KnowledgeBase {
  constructor() {
    this.knowledgeContent = ''
    this.isLoaded = false
    this.loadKnowledge()
  }

  loadKnowledge() {
    try {
      console.log('📚 Loading knowledge base...')
      
      // 🆕 PATHS TO THE COMPLETE FINANCIAL STRATEGIES KNOWLEDGE BASE (ALL 16 FILES INTEGRATED)
      const part1Path = path.join(process.cwd(), 'Base_Conocimientos_Estrategias_Financieras_COMPLETA_PARTE_1.md')
      const part2Path = path.join(process.cwd(), 'Base_Conocimientos_Estrategias_Financieras_COMPLETA_PARTE_2.md')
      const part3Path = path.join(process.cwd(), 'Base_Conocimientos_Estrategias_Financieras_COMPLETA_PARTE_3.md')
      const part4Path = path.join(process.cwd(), 'Base_Conocimientos_Estrategias_Financieras_COMPLETA_PARTE_4.md')
      
      let content = ''
      
      // Load Part 1 - CIA Financial Strategies
      if (fs.existsSync(part1Path)) {
        const part1Content = fs.readFileSync(part1Path, 'utf8')
        content += part1Content + '\n\n'
        console.log('✅ Loaded DHS-CIA comprehensive financial strategies knowledge base part 1')
      } else {
        console.warn('⚠️ Knowledge base part 1 not found')
      }
      
      // Load Part 2 - CIA Financial Strategies
      if (fs.existsSync(part2Path)) {
        const part2Content = fs.readFileSync(part2Path, 'utf8')
        content += part2Content + '\n\n'
        console.log('✅ Loaded DHS-CIA comprehensive financial strategies knowledge base part 2')
      } else {
        console.warn('⚠️ Knowledge base part 2 not found')
      }
      
      // Load Part 3 - CIA Financial Strategies
      if (fs.existsSync(part3Path)) {
        const part3Content = fs.readFileSync(part3Path, 'utf8')
        content += part3Content
        console.log('✅ Loaded DHS-CIA comprehensive financial strategies knowledge base part 3')
      } else {
        console.warn('⚠️ Knowledge base part 3 not found')
      }
      
      // Load Part 4 - CIA Financial Strategies
      if (fs.existsSync(part4Path)) {
        const part4Content = fs.readFileSync(part4Path, 'utf8')
        content += part4Content + '\n\n'
        console.log('✅ Loaded DHS-CIA comprehensive financial strategies knowledge base part 4')
      } else {
        console.warn('⚠️ Knowledge base part 4 not found')
      }
      
      if (content.trim()) {
        this.knowledgeContent = this.processContent(content)
        this.isLoaded = true
        console.log(`📖 DHS-CIA comprehensive financial strategies knowledge base loaded successfully (${this.knowledgeContent.length} characters)`)
      } else {
        console.error('❌ No knowledge content found')
        this.knowledgeContent = this.getFallbackContent()
      }
      
    } catch (error) {
      console.error('❌ Error loading knowledge base:', error)
      this.knowledgeContent = this.getFallbackContent()
    }
  }

  processContent(content) {
    // Clean up the content for better AI processing
    let processed = content
    
    // Remove excessive markdown formatting
    processed = processed.replace(/#{4,}/g, '###')
    
    // Clean up bullet points
    processed = processed.replace(/●/g, '-')
    processed = processed.replace(/○/g, '  -')
    processed = processed.replace(/■/g, '    -')
    
    // Remove excessive line breaks
    processed = processed.replace(/\n{3,}/g, '\n\n')
    
    // Remove special characters that might confuse the AI
    processed = processed.replace(/[🎖️🔧💾🧪🕵️‍♂️🛠️🤔]/g, '')
    
    return processed.trim()
  }

  // 🔍 NEW METHOD: Search for specific topics in the knowledge base
  searchTopic(query) {
    if (!this.isLoaded) {
      this.loadKnowledge()
    }
    
    const lowerQuery = query.toLowerCase()
    const content = this.knowledgeContent.toLowerCase()
    
    // Search for specific financial strategies mentioned in the 16 files
    const strategies = [
      'pitufeo', 'holding', 'offshore', 'lavado', 'elusión', 'blindaje',
      'estratificación', 'colocación', 'integración', 'paraísos fiscales',
      'empresas fantasma', 'fideicomisos', 'hawala', 'criptomonedas',
      'precios de transferencia', 'double irish', 'comercio de papel',
      'arbitraje jurisdiccional', 'testaferros', 'sociedades offshore'
    ]
    
    const foundStrategies = strategies.filter(strategy => 
      lowerQuery.includes(strategy) || content.includes(strategy)
    )
    
    if (foundStrategies.length > 0) {
      // Extract relevant sections
      const sections = this.knowledgeContent.split('##')
      const relevantSections = sections.filter(section => 
        foundStrategies.some(strategy => 
          section.toLowerCase().includes(strategy)
        )
      )
      
      return relevantSections.join('\n\n')
    }
    
    // If no specific strategies found, return general content
    return this.knowledgeContent.substring(0, 5000) // First 5k chars
  }

  // 🆕 NEW METHOD: Get full content for enhanced prompts
  getFullContent() {
    if (!this.isLoaded) {
      this.loadKnowledge()
    }
    
    return this.knowledgeContent
  }

  getFallbackContent() {
    return `
# BASE DE CONOCIMIENTOS DHS-CIA - ESTRATEGIAS FINANCIERAS AVANZADAS

## ANÁLISIS ESTRATÉGICO CLASIFICADO - AUDITORÍA NIVEL 5 PPD-47B

### ARSENAL DE MÉTODOS FINANCIEROS, BANCARIOS Y DE ELUSIÓN

#### ESTRATEGIAS FINANCIERAS Y BANCARIAS

##### Método Legal: Optimización de Estructuras Financieras a través de Fintech
- Uso de líneas de crédito sin interés inicial
- Transferencia de balances con 0% APR
- Monetización inmediata de capital obtenido
- Adaptación al contexto bancario peruano
- Creación de empresas Fintech en Perú bajo regulación SBS
- Alianzas estratégicas con bancos peruanos (BBVA, Interbank)

##### Método Ilegal: Pitufeo a través de Cuentas Bancarias Múltiples
- División de grandes sumas en depósitos pequeños (< S/ 10,000)
- Uso de identidades de terceros (testaferros)
- Redes de cuentas en diferentes bancos
- Conversión a criptomonedas (Bitcoin, Monero)

#### ESTRATEGIAS DE ELUSIÓN FISCAL

##### Holdings Jerarquizados
- Fundación de empresa holding en jurisdicción con baja tributación
- Creación de subsidiarias operativas en Perú
- Flujo de capital mediante "derechos de licencia" o "servicios de asesoría"
- Mitigación de riesgo de "sustancia económica"

##### Sistema de "Comercio de Papel" (Trade-Based Laundering)
- Constitución de empresa importadora en Perú y exportadora en extranjero
- Operación de sobrefacturación
- Flujo de dinero ilícito para pagar sobrevaloraciión
- Uso de bienes genéricos de difícil valoración

#### BLINDAJE PATRIMONIAL

##### Métodos Legales
- Separación de patrimonios personal y empresarial
- Constitución de sociedades (S.A.C., S.R.L., S.A.)
- Fideicomisos patrimoniales
- Seguros empresariales con cobertura patrimonial
- Estructuración corporativa compleja

##### Métodos Ilícitos
- Uso de empresas fantasma para ocultar activos
- Lavado de activos a través de operaciones inmobiliarias
- Evasión fiscal mediante paraísos fiscales
- Préstamos "gota a gota" y extorsión

#### LEGITIMACIÓN DE CAPITALES (LAVADO DE DINERO)

##### Fase 1: Colocación
- "Pitufeo" (Smurfing): División en transacciones pequeñas
- Adquisición de negocios de alta circulación de efectivo
- Falsificación de libros contables

##### Fase 2: Estratificación
- Inversión en mercado inmobiliario
- Creación de "empresas de papel"
- Uso de criptomonedas (especialmente Monero)

##### Fase 3: Integración
- Inversión en negocios legítimos
- Préstamos ficticios
- Estructuras corporativas complejas

### EXPANSIÓN INTERNACIONAL Y CONTROL GLOBAL DESDE PERÚ

#### Especialistas Clave
- Abogado de Derecho Societario Internacional
- Contador/Asesor Fiscal especializado en tributación internacional
- Firma de Agentes Registrados en el extranjero
- Asesor Financiero con contactos bancarios internacionales

#### Arbitraje Jurisdiccional
- Uso legal de diferencias entre leyes de distintos países
- Creación de "muralla" legal entre patrimonio personal y riesgos empresariales
- Constitución de entidad legal en jurisdicción extranjera favorable

#### Jurisdicciones Preferenciales
- Panamá: Confidencialidad y hub logístico
- Delaware: Prestigio y marco legal sólido
- Islas Vírgenes Británicas: Alta opacidad
- Singapur: Hub financiero y tecnológico
- Emiratos Árabes Unidos: Baja tributación

### CASOS ESPECÍFICOS DE PERÚ

#### Marco Regulatorio
- SUNAT: Superintendencia Nacional de Aduanas y Administración Tributaria
- UIF-Perú: Unidad de Inteligencia Financiera
- SBS: Superintendencia de Banca, Seguros y AFP
- SUNARP: Superintendencia Nacional de Registros Públicos

#### Métodos de Planificación Fiscal Legítima
- Deducción de gastos adicionales
- Aprovechamiento de regímenes tributarios (RER, RMT)
- Creación de sociedad holding
- Precios de transferencia
- Convenios para evitar doble imposición

#### Métodos de Alto Riesgo y Evasión Fiscal
- Facturación falsa o de "empresas fantasma"
- Omisión de ingresos
- Subvaluación de activos en paraísos fiscales
- Uso abusivo de fideicomisos

### SEÑALES DE ALERTA PARA INVESTIGACIONES

#### El Rastro del Dinero
- Transferencias bancarias a países con secretismo bancario
- Grandes transacciones a wallets de criptomonedas no registradas
- Patrones de depósitos frecuentes por debajo de umbrales

#### Las Personas Clave
- Búsqueda del Ultimate Beneficial Owner (UBO)
- Identificación de testaferros y directores nominales
- Rastreo de profesionales (abogados, contadores, asesores)

#### Riesgos y Contramedidas
- Reporte de Operaciones Sospechosas (ROS)
- Rastreo de activos por autoridades
- Delación y traición de intermediarios

### METODOLOGÍAS DE INVESTIGACIÓN CIA

#### Técnicas de Rastreo
- Análisis de beneficiarios finales
- Seguimiento de flujos financieros
- Identificación de partes relacionadas
- Verificación de actividad económica real

#### Puntos de Quiebre de Estructuras
- Transferencias de dinero injustificadas
- Prestanombres y testaferros
- Profesionales que diseñaron las estructuras
- Patrones de facturación anómalos

### ADVERTENCIA ÉTICA Y LEGAL

La inclusión de métodos ilegales se proporciona únicamente para cumplir con los requisitos de auditoría clasificada, con el propósito de evaluar vulnerabilidades y riesgos en sistemas financieros y empresariales. Cualquier implementación de métodos ilegales está sujeta a sanciones legales severas bajo las leyes peruanas, estadounidenses e internacionales.

IMPORTANTE: Esta información es para propósitos de investigación y educación de agentes autorizados. Todo uso debe cumplir con las leyes aplicables.
`
  }

  // Search for specific topics in the knowledge base
  searchTopic(query) {
    if (!this.isLoaded) {
      return null
    }

    const lowerQuery = query.toLowerCase()
    
    // Palabras clave para búsqueda legal específica
    const legalKeywords = [
      'ley', 'codigo', 'civil', 'penal', 'tributario', 'sunat', 'sunarp', 'uif', 'sbs',
      'empresa', 'fantasma', 'holding', 'lavado', 'dinero', 'evasion', 'fraude',
      'trump', 'cementerio', 'fundacion', 'deuda', 'brrrr', 'rent', 'airbnb'
    ]
    
    // Verificar si la consulta contiene términos legales
    const isLegalQuery = legalKeywords.some(keyword => lowerQuery.includes(keyword))
    
    if (isLegalQuery) {
      // Para consultas legales, buscar en todas las partes y ser más inclusivo
      const allSections = this.knowledgeContent.split('\n## ')
      const relevantSections = []
      
      // Buscar secciones que contengan información legal relevante
      allSections.forEach(section => {
        const sectionLower = section.toLowerCase()
        if (legalKeywords.some(keyword => 
          lowerQuery.includes(keyword) && sectionLower.includes(keyword)
        )) {
          relevantSections.push(section)
        }
      })
      
      if (relevantSections.length > 0) {
        return relevantSections.join('\n\n## ')
      }
    }
    
    // Búsqueda general
    const sections = this.knowledgeContent.split('\n## ')
    const relevantSections = sections.filter(section => 
      section.toLowerCase().includes(lowerQuery)
    )

    if (relevantSections.length > 0) {
      return relevantSections.join('\n\n## ')
    }

    return null
  }

  // Get summary of available topics
  getTopicsSummary() {
    const topics = [
      '🆕 Análisis Estratégico Clasificado DHS-CIA - Auditoría Nivel 5 PPD-47B',
      '🆕 Arsenal de Métodos Financieros, Bancarios y de Elusión',
      '🆕 Estrategias Financieras y Bancarias (Legales e Ilegales)',
      '🆕 Optimización de Estructuras Fintech y Alianzas Bancarias',
      '🆕 Pitufeo a través de Cuentas Bancarias Múltiples',
      '🆕 Elusión Fiscal y Holdings Jerarquizados',
      '🆕 Sistema de "Comercio de Papel" (Trade-Based Laundering)',
      '🆕 Blindaje Patrimonial: Métodos Legales e Ilícitos',
      '🆕 Separación de Patrimonios y Estructuración Corporativa',
      '🆕 Fideicomisos Patrimoniales y Seguros Empresariales',
      '🆕 Empresas Fantasma y Lavado de Activos Inmobiliarios',
      '🆕 Evasión Fiscal mediante Paraísos Fiscales',
      '🆕 Legitimación de Capitales: 3 Fases (Colocación, Estratificación, Integración)',
      '🆕 Análisis del Método "Double Irish" y su Estado Actual',
      '🆕 Métodos de Planificación Fiscal Legítima en Perú',
      '🆕 Métodos de Alto Riesgo y Evasión Fiscal',
      '🆕 Expansión Internacional y Control Global desde Perú',
      '🆕 Especialistas Clave para Operaciones Transnacionales',
      '🆕 Arbitraje Jurisdiccional y Estructuras Offshore',
      '🆕 Jurisdicciones Preferenciales (Panamá, Delaware, BVI, Singapur)',
      '🆕 Ejemplos Dinámicos de Aplicación en Perú',
      '🆕 Marco Regulatorio Peruano (SUNAT, UIF, SBS, SUNARP)',
      '🆕 Señales de Alerta para Investigaciones Financieras',
      '🆕 Técnicas de Rastreo y Metodologías de Investigación CIA',
      '🆕 Riesgos y Contramedidas en Operaciones Financieras',
      '🆕 Puntos de Quiebre de Estructuras Complejas'
    ]

    return `🆕 BASE DE CONOCIMIENTOS DHS-CIA - ESTRATEGIAS FINANCIERAS AVANZADAS

Temas disponibles para investigación autorizada:

${topics.map(topic => `• ${topic}`).join('\n')}

🔍 ¿Sobre qué estrategia financiera específica necesitas información para tu investigación?

⚠️ ADVERTENCIA: Esta información incluye métodos legales e ilegales para propósitos de investigación y evaluación de vulnerabilidades. El uso de métodos ilegales está sujeto a sanciones penales severas.`
  }

  // Reload knowledge base (useful for updates)
  reload() {
    this.isLoaded = false
    this.loadKnowledge()
    return this.isLoaded
  }

  // Get knowledge base stats
  getStats() {
    return {
      isLoaded: this.isLoaded,
      contentLength: this.knowledgeContent.length,
      wordCount: this.knowledgeContent.split(/\s+/).length,
      lastLoaded: new Date().toISOString()
    }
  }
}

module.exports = KnowledgeBase
