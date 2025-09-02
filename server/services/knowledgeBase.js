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
      
      // 🆕 PATHS TO THE NEW CIA FINANCIAL STRATEGIES KNOWLEDGE BASE
      const part1Path = path.join(process.cwd(), 'Base_Conocimientos_Estrategias_Financieras_CIA_PARTE_1.md')
      const part2Path = path.join(process.cwd(), 'Base_Conocimientos_Estrategias_Financieras_CIA_PARTE_2.md')
      const part3Path = path.join(process.cwd(), 'Base_Conocimientos_Estrategias_Financieras_CIA_PARTE_3.md')
      
      let content = ''
      
      // Load Part 1 - CIA Financial Strategies
      if (fs.existsSync(part1Path)) {
        const part1Content = fs.readFileSync(part1Path, 'utf8')
        content += part1Content + '\n\n'
        console.log('✅ Loaded knowledge base part 1')
      } else {
        console.warn('⚠️ Knowledge base part 1 not found')
      }
      
      // Load Part 2 - CIA Financial Strategies
      if (fs.existsSync(part2Path)) {
        const part2Content = fs.readFileSync(part2Path, 'utf8')
        content += part2Content + '\n\n'
        console.log('✅ Loaded knowledge base part 2')
      } else {
        console.warn('⚠️ Knowledge base part 2 not found')
      }
      
      // Load Part 3 - CIA Financial Strategies
      if (fs.existsSync(part3Path)) {
        const part3Content = fs.readFileSync(part3Path, 'utf8')
        content += part3Content
        console.log('✅ Loaded knowledge base part 3')
      } else {
        console.warn('⚠️ Knowledge base part 3 not found')
      }
      
      if (content.trim()) {
        this.knowledgeContent = this.processContent(content)
        this.isLoaded = true
        console.log(`📖 Knowledge base loaded successfully (${this.knowledgeContent.length} characters)`)
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
# BASE DE CONOCIMIENTOS CIA - ESTRATEGIAS FINANCIERAS

## ESTRATEGIA DE APALANCAMIENTO DE DEUDA SIN INTERÉS

### Fundamentos Técnicos
- Uso de líneas de crédito sin interés inicial
- Transferencia de balances con 0% APR
- Monetización inmediata de capital obtenido
- Adaptación al contexto bancario peruano

### Aplicación en Perú
- Bancos que ofrecen períodos de gracia
- Uso de tarjetas de crédito empresariales
- Combinación con inversión inmobiliaria

## ESTRATEGIA DE APALANCAMIENTO DE CAPITAL CON VESTING

### Estructura del Vesting
- Cliff vesting vs. graded vesting
- Protección de capital invertido
- Alineamiento de incentivos a largo plazo
- Implementación en S.A.C. peruanas

### Casos Prácticos
- Startups tecnológicas
- Empresas inmobiliarias
- Proyectos de construcción

## ESTRATEGIA DE PERCEPCIÓN DE VALOR

### Técnicas Psicológicas
- Escasez artificial y exclusividad
- FOMO (Fear of Missing Out)
- Pricing psicológico
- Marketing de influencia

### Implementación
- Productos de lujo en Lima
- Servicios exclusivos
- Clubs de membersía

## ESTRATEGIA HOLDING-OPERADORA

### Protección de Activos
- Empresa Operadora: Actividades de riesgo
- Empresa Holding: Activos protegidos
- Transferencias entre empresas relacionadas
- Optimización fiscal legal

### Estructuras Complejas
- Holdings multinivel
- Fideicomisos complementarios
- Empresas offshore

## PERSUASIÓN PSICOLÓGICA Y CONTROL

### Técnicas de Influencia
- Narrativa emocional
- Construcción de envidia social
- Autoridad y credibilidad
- Compromiso y coherencia

### Aplicación Empresarial
- Ventas de alto valor
- Captación de inversores
- Liderazgo organizacional

## BLINDAJE PATRIMONIAL AVANZADO

### Estructuras de Protección
- Fideicomisos irrevocables
- Fundaciones familiares
- Seguros de vida como activos
- Propiedades en paraiso fiscales

### Técnicas Especializadas
- Empresa fantasma
- Cementerios como exenciones fiscales
- Fundaciones con fines aparentemente benéficos

## PARAÍSOS FISCALES Y MOVIMIENTO DE CAPITALES

### Jurisdicciones Preferenciales
- Panamá, Islas Caimán, Delaware
- Singapur, Suiza, Luxemburgo
- Estruturas de pricing transfer

### Métodos de Transferencia
- Precios de transferencia
- Royalties y licencias
- Préstamos entre partes relacionadas
- Facturas por servicios ficticios

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

## METODOLOGÍAS DE INVESTIGACIÓN CIA

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
      '🆕 Marco Regulatorio Peruano (SUNAT, UIF, SBS)'
    ]

    return `🆕 BASE DE CONOCIMIENTOS CIA - ESTRATEGIAS FINANCIERAS

Temas disponibles para investigación autorizada:

${topics.map(topic => `• ${topic}`).join('\n')}

🔍 ¿Sobre qué estrategia financiera específica necesitas información para tu investigación?`
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
