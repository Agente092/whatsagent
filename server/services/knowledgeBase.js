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
      console.log('📚 Loading comprehensive knowledge base...')
      
      // 🆕 PATHS TO ALL KNOWLEDGE BASE FILES
      const knowledgeFiles = [
        // CIA Financial Strategies (Original)
        'Base_Conocimientos_Estrategias_Financieras_CIA_PARTE_1.md',
        'Base_Conocimientos_Estrategias_Financieras_CIA_PARTE_2.md',
        'Base_Conocimientos_Estrategias_Financieras_CIA_PARTE_3.md',
        // Advanced Strategies (New)
        'Base_Conocimientos_Estrategias_Avanzadas_PARTE_1.md',
        'Base_Conocimientos_Estrategias_Avanzadas_PARTE_2.md',
        'Base_Conocimientos_Estrategias_Avanzadas_PARTE_3.md',
        // Consolidated PDF Content
        'Contenido_Consolidado_PDFs.md',
        'Contenido_Consolidado_PDFs_PARTE_2.md',
        'Contenido_Consolidado_PDFs_PARTE_3.md'
      ]
      
      let content = ''
      let loadedFiles = 0
      
      // Load all knowledge files
      knowledgeFiles.forEach((fileName, index) => {
        const filePath = path.join(process.cwd(), fileName)
        
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8')
          content += fileContent + '\n\n'
          console.log(`✅ Loaded knowledge file ${index + 1}: ${fileName}`)
          loadedFiles++
        } else {
          console.warn(`⚠️ Knowledge file not found: ${fileName}`)
        }
      })
      
      if (content.trim()) {
        this.knowledgeContent = this.processContent(content)
        this.isLoaded = true
        console.log(`📖 Comprehensive knowledge base loaded successfully!`)
        console.log(`📊 Loaded ${loadedFiles} knowledge files (${this.knowledgeContent.length} characters)`)
        console.log(`🧪 Enhanced with advanced financial strategies and comprehensive content`)
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

  getContext() {
    if (!this.isLoaded) {
      this.loadKnowledge()
    }
    
    return this.knowledgeContent
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
# BASE DE CONOCIMIENTOS EXPANDIDA - ESTRATEGIAS FINANCIERAS Y EMPRESARIALES

## ESTRATEGIAS PRINCIPALES DE APALANCAMIENTO

### ESTRATEGIA DE APALANCAMIENTO DE DEUDA SIN INTERÉS

#### Fundamentos Técnicos
- Uso de líneas de crédito sin interés inicial
- Transferencia de balances con 0% APR
- Monetización inmediata de capital obtenido
- Adaptación al contexto bancario peruano

#### Aplicación en Perú
- Bancos que ofrecen períodos de gracia
- Uso de tarjetas de crédito empresariales
- Combinación con inversión inmobiliaria

### ESTRATEGIA DE APALANCAMIENTO DE CAPITAL CON VESTING

#### Estructura del Vesting
- Cliff vesting vs. graded vesting
- Protección de capital invertido
- Alineamiento de incentivos a largo plazo
- Implementación en S.A.C. peruanas

#### Casos Prácticos
- Startups tecnológicas
- Empresas inmobiliarias
- Proyectos de construcción

## ESTRATEGIAS AVANZADAS DE ESTRUCTURACIÓN

### ESTRATEGIA HOLDING-OPERADORA AVANZADA

#### Protección de Activos
- Empresa Operadora: Actividades de riesgo
- Empresa Holding: Activos protegidos
- Transferencias entre empresas relacionadas
- Optimización fiscal legal

#### Estructuras Complejas
- Holdings multinivel
- Fideicomisos complementarios
- Empresas offshore
- Arbitraje jurisdiccional

### BLINDAJE PATRIMONIAL INTEGRAL

#### Estructuras de Protección
- Fideicomisos irrevocables
- Fundaciones familiares
- Seguros de vida como activos
- Propiedades en paraísos fiscales

#### Técnicas Especializadas
- Separación patrimonial personal/empresarial
- Empresas fantasma (riesgos legales)
- Fundaciones con fines benéficos
- Estructuras offshore complejas

## ESTRATEGIAS INTERNACIONALES

### PARAÍSOS FISCALES Y MOVIMIENTO DE CAPITALES

#### Jurisdicciones Preferenciales
- Panamá, Islas Caimán, Delaware
- Singapur, Suiza, Luxemburgo
- Estructuras de pricing transfer

#### Métodos de Transferencia
- Precios de transferencia
- Royalties y licencias
- Préstamos entre partes relacionadas
- Facturas por servicios de consultoría

### EXPANSIÓN DESDE PERÚ

#### Estructura de Control
- Holdings en Perú como base
- Filiales internacionales
- LLCs en EE.UU. (Delaware, Wyoming)
- Sociedades anónimas en Panamá

#### Casos Específicos
- Empresario inmobiliario expandiendo a Miami
- Exportador agrícola optimizando fiscalmente
- Tecnológico protegiendo propiedad intelectual

## CASOS ESPECÍFICOS DE PERÚ

### Marco Regulatorio
- SUNAT y fiscalización
- UIF y prevención de lavado
- SUNARP y registros empresariales
- SBS y supervisión financiera

### Oportunidades Locales
- Zonas francas y ZOFRATACNA
- Régimen MYPE Tributario
- Beneficios por inversión en infraestructura
- Exoneraciones regionales

## ESTRATEGIAS DE PERCEPCIÓN Y PERSUASIÓN

### Técnicas Psicológicas
- Escasez artificial y exclusividad
- FOMO (Fear of Missing Out)
- Pricing psicológico
- Marketing de influencia

### Aplicación Empresarial
- Productos de lujo en Lima
- Servicios exclusivos
- Clubs de membersía
- Expansión de marca internacional

## FINTECH Y ALIANZAS BANCARIAS

### Optimización de Estructuras Financieras
- Empresas Fintech en Perú
- Alianzas con bancos tradicionales
- Servicios financieros digitales
- Micropréstamos y pagos P2P

### Regulación y Cumplimiento
- Superintendencia de Banca (SBS)
- Cumplimiento KYC y AML/CFT
- Oficiales de Cumplimiento
- Auditorías internas trimestrales

## INVESTIGACIÓN Y DETECCIÓN

### Señales de Alerta
- Estructuras empresariales complejas sin justificación
- Movimientos de dinero sin sustento económico
- Uso excesivo de sociedades offshore
- Patrones de facturación anómalos

### Técnicas de Rastreo
- Análisis de beneficiarios finales
- Seguimiento de flujos financieros
- Identificación de partes relacionadas
- Verificación de actividad económica real

### Organismos de Control
- GAFI (Grupo de Acción Financiera Internacional)
- OCDE y estándares BEPS
- UIF-Perú y cooperación internacional
- SUNAT y fiscalización avanzada

IMPORTANTE: Esta información es para propósitos de asesoría empresarial, educación e investigación. Todo uso debe cumplir con las leyes aplicables. Se incluyen tanto métodos legales como referencia a prácticas ilegales únicamente para fines educativos y de detección.
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
      // 🆕 CIA Financial Strategies (Original)
      '🆕 Estrategia de Apalancamiento de Deuda sin Interés',
      '🆕 Estrategia de Apalancamiento de Capital con Vesting',
      '🆕 Estrategia de Percepción de Valor y Psicología',
      '🆕 Estrategia Holding-Operadora Avanzada',
      '🆕 Persuasión Psicológica y Control Narrativo',
      '🆕 Blindaje Patrimonial y Estructuras de Protección',
      '🆕 Paraísos Fiscales y Movimiento de Capitales',
      '🆕 Casos Específicos de Aplicación en Perú',
      '🆕 Empresas Fantasma y Métodos de Trump',
      '🆕 Fundaciones y Estructuras No Lucrativas',
      '🆕 Técnicas de Facturación y Precios de Transferencia',
      '🆕 Metodologías de Investigación para Agentes CIA',
      '🆕 Señales de Alerta en Delitos Financieros',
      '🆕 Marco Regulatorio Peruano (SUNAT, UIF, SBS)',
      
      // 🤅 ADVANCED STRATEGIES (NEW)
      '🤅 Estructuras Fintech y Alianzas Bancarias Avanzadas',
      '🤅 Métodos de Elusión Fiscal Internacional',
      '🤅 Arsenal Estratégico de Métodos Financieros',
      '🤅 Técnicas de Pitufeo y Colocación Avanzada',
      '🤅 Comercio de Papel y Trade-Based Laundering',
      '🤅 Holdings Jerarquizados y Estructuras Complejas',
      '🤅 Lavado de Activos a través de Inmobiliarias',
      '🤅 Redes de Criptomonedas y Hawala Transnacional',
      '🤅 Método Double Irish y Estrategias Históricas',
      '🤅 Transfer Pricing y Precios de Transferencia',
      '🤅 Expansión Internacional desde Perú',
      '🤅 Arbitraje Jurisdiccional y Blindaje Global',
      '🤅 Sistemas de Persuasión y Control Psicológico',
      '🤅 Fideicomisos y Fundaciones Privadas Offshore',
      '🤅 Detección y Contramedidas de Organismos de Control',
      
      // 📊 COMPREHENSIVE CONTENT
      '📊 Estrategias Empresariales de Alto Impacto',
      '📊 Optimización Fiscal Multinacional',
      '📊 Protección Patrimonial Integral',
      '📊 Inteligencia Financiera y Contra-inteligencia'
    ]

    return `🆕 BASE DE CONOCIMIENTOS EXPANDIDA - ESTRATEGIAS FINANCIERAS Y EMPRESARIALES

🧠 CONOCIMIENTO INTEGRAL PARA ASESORÍA DE ÉLITE:

${topics.map(topic => `• ${topic}`).join('\n')}

🔍 ¿Sobre qué estrategia financiera específica necesitas información para tu consultoría empresarial?

🌐 Cobertura global: Perú, EE.UU., Panamá, Zona Euro, Asia-Pacífico
💼 Especializaciones: Fintech, Inmobiliario, Tecnología, Exportación, Alto Patrimonio`
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
