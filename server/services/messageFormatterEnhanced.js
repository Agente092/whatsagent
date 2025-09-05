/**
 * 🎨 SISTEMA DE FORMATEO PROFESIONAL MEJORADO
 * Basado en el MessageFormatter del proyecto whatsapp-agent
 * Adaptado para el sistema empresarial con asesoría fiscal y tributaria
 */

class MessageFormatterEnhanced {
  constructor() {
    this.maxMessageLength = 4000 // WhatsApp limit es ~4096 caracteres
    this.preferredLength = 3500 // Dejar buffer de seguridad
  }

  /**
   * 🎯 FORMATEAR RESPUESTA CON ESTILO PROFESIONAL EMPRESARIAL
   */
  formatResponse(text, context = {}) {
    let formatted = this.cleanText(text)
    
    // Agregar emojis contextuales empresariales
    formatted = this.addBusinessEmojis(formatted, context)
    
    // Aplicar formato profesional empresarial
    formatted = this.applyBusinessFormatting(formatted)
    
    // Dividir en mensajes si es muy largo (con contexto)
    return this.splitIntoMessages(formatted, context)
  }

  /**
   * 🧹 LIMPIAR TEXTO BASE
   */
  cleanText(text) {
    let cleaned = text.trim()
    
    // Remover menciones de IA (manteniendo el contexto empresarial)
    cleaned = cleaned.replace(/como (ia|inteligencia artificial|ai|bot|asistente virtual)/gi, 'como asesor especializado')
    cleaned = cleaned.replace(/soy una? (ia|inteligencia artificial|ai|bot)/gi, 'soy un asesor empresarial')
    
    // 🎨 CONVERTIR FORMATO DE NEGRITAS PARA WHATSAPP
    // Cambiar doble asterisco (**texto**) por asterisco simple (*texto*) para WhatsApp
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '*$1*')
    
    // Limpiar formato inconsistente
    cleaned = cleaned.replace(/\*{3,}/g, '*') // Múltiples asteriscos a uno solo
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n') // Múltiples saltos de línea
    cleaned = cleaned.replace(/\s{3,}/g, ' ') // Múltiples espacios
    
    return cleaned
  }

  /**
   * 💼 AGREGAR EMOJIS CONTEXTUALES EMPRESARIALES
   */
  addBusinessEmojis(text, context) {
    const { currentTopic, stage, interests, queryType } = context
    
    // Emojis por tema empresarial
    const topicEmojis = {
      'holding': '🏢',
      'fiscal': '📊',
      'inmobiliario': '🏠',
      'offshore': '🌍',
      'fideicomiso': '🛡️',
      'legal': '⚖️',
      'tributario': '📋',
      'inversion': '💰',
      'empresa': '💼',
      'patrimonial': '🎯',
      'financiero': '💳',
      'contable': '📈'
    }

    // Emojis por etapa de consulta
    const stageEmojis = {
      'initial': '👋',
      'exploring': '🔍',
      'planning': '📋',
      'implementing': '🚀',
      'reviewing': '📝'
    }

    let formatted = text

    // Agregar emoji de tema si corresponde
    if (currentTopic && topicEmojis[currentTopic]) {
      if (!formatted.includes(topicEmojis[currentTopic])) {
        formatted = `${topicEmojis[currentTopic]} ${formatted}`
      }
    }

    // Mejorar puntos clave con emojis empresariales (SIN asteriscos extra)
    formatted = formatted.replace(/^(\d+\.)/gm, '📌 $1')
    formatted = formatted.replace(/^([A-Z]\.|•)/gm, '▫️')
    
    return formatted
  }

  /**
   * 🎨 APLICAR FORMATO PROFESIONAL EMPRESARIAL
   */
  applyBusinessFormatting(text) {
    let formatted = text

    // ==================== TÍTULOS Y SECCIONES ====================
    // Mejorar títulos principales (usando asterisco simple para WhatsApp)
    formatted = formatted.replace(/^([A-ZÁÉÍÓÚ][^:\n]{15,60}):$/gm, '\n🎯 *$1:*\n')
    
    // Subtítulos con separadores
    formatted = formatted.replace(/^([A-ZÁÉÍÓÚ][^:\n]{10,40}):\s*$/gm, '\n📋 *$1:*\n')

    // ==================== LISTAS Y VIÑETAS ====================
    // Mejorar listas con viñetas profesionales
    formatted = formatted.replace(/^- /gm, '▫️ ')
    formatted = formatted.replace(/^\* /gm, '✦ ')
    formatted = formatted.replace(/^\d+\. /gm, '📌 ')

    // ==================== PALABRAS CLAVE EMPRESARIALES ====================
    // Términos importantes con formato especial (asterisco simple para WhatsApp)
    formatted = formatted.replace(/\b(IMPORTANTE|CRÍTICO|URGENTE)\b:?/gi, '⚠️ *$1:*')
    formatted = formatted.replace(/\b(EJEMPLO|POR EJEMPLO)\b:?/gi, '💡 *Ejemplo:*')
    formatted = formatted.replace(/\b(NOTA|ACLARACIÓN)\b:?/gi, '📝 *Nota:*')
    formatted = formatted.replace(/\b(RECOMENDACIÓN|RECOMIENDO)\b:?/gi, '🎯 *Recomendación:*')
    formatted = formatted.replace(/\b(VENTAJA|BENEFICIO)\b:?/gi, '✅ *Ventaja:*')
    formatted = formatted.replace(/\b(RIESGO|CUIDADO)\b:?/gi, '⚠️ *Riesgo:*')
    formatted = formatted.replace(/\b(COSTO|INVERSIÓN)\b:?/gi, '💰 *Costo:*')

    // ==================== TÉRMINOS LEGALES Y FISCALES ====================
    formatted = formatted.replace(/\b(LEY|ARTÍCULO|DECRETO)\b/gi, '⚖️ *$1*')
    formatted = formatted.replace(/\b(SUNAT|SUNARP|INDECOPI)\b/gi, '🏛️ *$1*')
    formatted = formatted.replace(/\b(IMPUESTO|TRIBUTO)\b/gi, '📊 *$1*')

    // ==================== CONCLUSIONES Y RESÚMENES ====================
    formatted = formatted.replace(/\b(EN RESUMEN|RESUMEN)\b:?/gi, '📋 *En resumen:*')
    formatted = formatted.replace(/\b(CONCLUSIÓN|PARA CONCLUIR)\b:?/gi, '🎯 *Conclusión:*')
    formatted = formatted.replace(/\b(PRÓXIMOS PASOS|SIGUIENTES PASOS)\b:?/gi, '🚀 *Próximos pasos:*')

    // ==================== PALABRAS CLAVE DE ESTRATEGIAS CIA ====================
    formatted = formatted.replace(/\b(APALANCAMIENTO|LEVERAGE)\b/gi, '💰 *$1*')
    formatted = formatted.replace(/\b(VESTING)\b/gi, '🔒 *$1*')
    formatted = formatted.replace(/\b(HOLDING)\b/gi, '🏢 *$1*')
    formatted = formatted.replace(/\b(OFFSHORE|PARAÍSO FISCAL)\b/gi, '🌍 *$1*')
    formatted = formatted.replace(/\b(BLANQUEO|LAVADO)\b/gi, '💵 *$1*')
    formatted = formatted.replace(/\b(EMPRESA FANTASMA)\b/gi, '👻 *$1*')
    formatted = formatted.replace(/\b(FUNDACIÓN)\b/gi, '🏦 *$1*')
    formatted = formatted.replace(/\b(TRUMP)\b/gi, '🎰 *$1*')

    // ==================== SEPARADORES VISUALES ELEGANTES ====================
    // Separadores para secciones importantes (solo para títulos largos) - con asterisco simple
    formatted = formatted.replace(/\n\n([A-ZÁÉÍÓÚ][^:\n]{25,})\n/g, '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n*$1*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    // ==================== ESPACIADO PROFESIONAL ====================
    // Asegurar espaciado adecuado después de títulos (asterisco simple)
    formatted = formatted.replace(/(\*[^*]+\*:)\n([^\n])/g, '$1\n\n$2')
    
    // Espaciado antes de secciones importantes
    formatted = formatted.replace(/\n(📋|🎯|⚠️|💡|🚀)\s*\*/g, '\n\n$1 *')

    return formatted
  }

  /**
   * 📱 DIVIDIR MENSAJE EN PARTES SI ES MUY LARGO
   */
  splitIntoMessages(text, context = {}) {
    // 🚨 CONTROL ESPECIAL: Si es financial_crime_query, mantener en un solo mensaje
    if (context.queryType === 'financial_crime_query') {
      // Truncar si es demasiado largo para evitar múltiples mensajes
      if (text.length > 3000) {
        const truncatedText = text.substring(0, 2800) + '\n\n📄 *Respuesta resumida para evitar múltiples mensajes. Para más detalles, consulta temas específicos.*'
        return [truncatedText]
      }
      return [text]
    }

    if (text.length <= this.preferredLength) {
      return [text]
    }

    const messages = []
    const paragraphs = text.split('\n\n')
    let currentMessage = ''
    let messageIndex = 1

    for (const paragraph of paragraphs) {
      // Si el párrafo solo es muy largo, dividirlo por oraciones
      if (paragraph.length > this.preferredLength) {
        const sentences = this.splitBySentences(paragraph)
        
        for (const sentence of sentences) {
          if ((currentMessage + sentence).length > this.preferredLength) {
            if (currentMessage.trim()) {
              messages.push(this.addMessageFooter(currentMessage.trim(), messageIndex, true))
              messageIndex++
              currentMessage = sentence + '\n\n'
            }
          } else {
            currentMessage += sentence + ' '
          }
        }
      } else {
        // Verificar si agregar este párrafo excede el límite
        if ((currentMessage + paragraph + '\n\n').length > this.preferredLength) {
          if (currentMessage.trim()) {
            messages.push(this.addMessageFooter(currentMessage.trim(), messageIndex, true))
            messageIndex++
            currentMessage = paragraph + '\n\n'
          }
        } else {
          currentMessage += paragraph + '\n\n'
        }
      }
    }

    // Agregar el último mensaje
    if (currentMessage.trim()) {
      messages.push(this.addMessageFooter(currentMessage.trim(), messageIndex, false))
    }

    return messages
  }

  /**
   * ✂️ DIVIDIR POR ORACIONES
   */
  splitBySentences(text) {
    return text.match(/[^\.!?]+[\.!?]+/g) || [text]
  }

  /**
   * 📊 FORMATEAR RESPUESTA FISCAL/DELITOS FINANCIEROS (CONTROL ESPECIAL)
   */
  formatFiscalResponse(text, context = {}) {
    let formatted = this.cleanText(text)
    
    // Agregar emojis contextuales empresariales
    formatted = this.addBusinessEmojis(formatted, context)
    
    // Aplicar formato profesional empresarial
    formatted = this.applyBusinessFormatting(formatted)
    
    // 🚨 CONTROL ESPECIAL: Para financial_crime_query, mantener SIEMPRE en un solo mensaje
    if (context.queryType === 'financial_crime_query') {
      if (formatted.length > 3000) {
        const truncatedText = formatted.substring(0, 2800) + '\n\n📄 *Consulta completa sobre estrategias financieras. Para más detalles sobre puntos específicos, pregúntame por separado.*'
        return [truncatedText]
      }
      return [formatted]
    }
    
    // Para other legal queries, usar división normal
    return this.splitIntoMessages(formatted, context)
  }

  /**
   * 🏢 FORMATEAR RESPUESTA CORPORATIVA
   */
  formatCorporateResponse(text, context = {}) {
    let formatted = this.cleanText(text)
    
    // Agregar emojis contextuales empresariales
    formatted = this.addBusinessEmojis(formatted, context)
    
    // Aplicar formato profesional empresarial
    formatted = this.applyBusinessFormatting(formatted)
    
    // Dividir en mensajes si es muy largo (con contexto)
    return this.splitIntoMessages(formatted, context)
  }

  /**
   * 📄 AGREGAR PIE DE MENSAJE PROFESIONAL
   */
  addMessageFooter(message, index, hasMore) {
    if (hasMore) {
      return `${message}\n\n📄 *Continúa en el siguiente mensaje... (${index})*`
    } else if (index > 1) {
      return `${message}\n\n✅ *Consulta completa (${index}/${index})*\n\n¿Te gustaría profundizar en algún aspecto específico? 🤔`
    } else {
      return `${message}\n\n¿Hay algún otro tema empresarial en el que pueda ayudarte? 😊`
    }
  }

  /**
   * 👋 FORMATEAR MENSAJE DE BIENVENIDA EMPRESARIAL
   */
  formatWelcomeMessage(clientName, specialties = []) {
    const defaultSpecialties = [
      'Estrategias financieras avanzadas y apalancamiento',
      'Estructuras offshore y blindaje patrimonial', 
      'Holdings internacionales y optimización fiscal',
      'Expansión empresarial desde Perú',
      'Fideicomisos y fundaciones privadas',
      'Compliance y estructuras regulatorias',
      'Métodos de elusión fiscal internacional',
      'Arbitraje jurisdiccional y paraísos fiscales',
      'Transfer pricing y precios de transferencia',
      'Planificación sucesoria multinacional'
    ]

    const availableSpecialties = specialties.length > 0 ? specialties : defaultSpecialties

    return `👋 ¡Hola ${clientName}!

🎯 *Soy tu Asesor Empresarial Especializado*

Estoy aquí para brindarte estrategias inteligentes y soluciones empresariales de alto nivel adaptadas a la realidad peruana.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 *MIS ESPECIALIDADES:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${availableSpecialties.map(specialty => `✦ ${specialty}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *¿Cómo puedo ayudarte hoy?*

Puedes consultarme sobre cualquier tema empresarial, fiscal, tributario o de inversiones. Estoy preparado para darte respuestas detalladas y estrategias específicas.

🚀 *¡Comencemos a optimizar tu estructura empresarial!*`
  }

  /**
   * 🔄 FORMATEAR MENSAJE DE SEGUIMIENTO
   */
  formatFollowUpMessage(context) {
    const { currentTopic, stage, interests } = context
    
    let message = `🔄 *Continuando nuestra asesoría empresarial...*\n\n`
    
    if (currentTopic) {
      message += `📌 Tema actual: *${currentTopic}*\n`
    }
    
    if (interests && interests.length > 0) {
      message += `🎯 Tus áreas de interés: ${interests.join(', ')}\n`
    }
    
    message += `\n¿En qué más puedo asesorarte? 😊`
    
    return message
  }

  /**
   * ⚠️ FORMATEAR MENSAJE DE ERROR PROFESIONAL
   */
  formatErrorMessage(error) {
    return `⚠️ *Disculpa las molestias*

Estoy experimentando dificultades técnicas temporales en mi sistema de asesoría.

🔄 *Por favor:*
• Intenta reformular tu consulta empresarial
• O contacta directamente con nuestro equipo especializado

🤝 Estoy aquí para asesorarte en cuanto se resuelva el inconveniente técnico.

💼 *Tu éxito empresarial es nuestra prioridad.*`
  }

  /**
   * 📊 FORMATEAR RESPUESTA ESPECÍFICA PARA TEMAS FISCALES
   */
  formatFiscalResponse(text, fiscalContext = {}) {
    let formatted = text

    // Formateo especial para términos fiscales (usando asterisco simple para WhatsApp)
    formatted = formatted.replace(/\b(IGV|Impuesto General a las Ventas)\b/gi, '📊 *IGV (Impuesto General a las Ventas)*')
    formatted = formatted.replace(/\b(Renta de Quinta Categoría)\b/gi, '💼 *Renta de Quinta Categoría*')
    formatted = formatted.replace(/\b(Renta de Tercera Categoría)\b/gi, '🏢 *Renta de Tercera Categoría*')
    formatted = formatted.replace(/\b(MYPE)\b/gi, '🏪 *MYPE (Micro y Pequeña Empresa)*')
    formatted = formatted.replace(/\b(RUC)\b/gi, '📋 *RUC (Registro Único de Contribuyentes)*')

    return this.formatResponse(formatted, fiscalContext)
  }

  /**
   * 🏢 FORMATEAR RESPUESTA ESPECÍFICA PARA ESTRUCTURAS EMPRESARIALES
   */
  formatCorporateResponse(text, corporateContext = {}) {
    let formatted = text

    // Formateo especial para estructuras empresariales (usando asterisco simple para WhatsApp)
    formatted = formatted.replace(/\b(S\.R\.L\.|SRL|Sociedad de Responsabilidad Limitada)\b/gi, '🏢 *S.R.L. (Sociedad de Responsabilidad Limitada)*')
    formatted = formatted.replace(/\b(S\.A\.C\.|SAC|Sociedad Anónima Cerrada)\b/gi, '🏢 *S.A.C. (Sociedad Anónima Cerrada)*')
    formatted = formatted.replace(/\b(S\.A\.|SA|Sociedad Anónima)\b/gi, '🏢 *S.A. (Sociedad Anónima)*')
    formatted = formatted.replace(/\b(EIRL|Empresa Individual de Responsabilidad Limitada)\b/gi, '👤 *EIRL (Empresa Individual de Responsabilidad Limitada)*')

    return this.formatResponse(formatted, corporateContext)
  }
}

module.exports = MessageFormatterEnhanced