class MessageFormatter {
  constructor() {
    this.maxMessageLength = 4000 // WhatsApp limit is ~4096 characters
    this.preferredLength = 3500 // Leave some buffer
  }

  // Formatear respuesta con estilo profesional
  formatResponse(text, context = {}) {
    let formatted = this.cleanText(text)
    
    // Agregar emojis contextuales
    formatted = this.addContextualEmojis(formatted, context)
    
    // Aplicar formato profesional
    formatted = this.applyProfessionalFormatting(formatted)
    
    // Dividir en mensajes si es muy largo
    return this.splitIntoMessages(formatted)
  }

  // Limpiar texto base
  cleanText(text) {
    let cleaned = text.trim()
    
    // Remover menciones de IA
    cleaned = cleaned.replace(/como (ia|inteligencia artificial|ai|bot|asistente virtual)/gi, 'como asesor')
    cleaned = cleaned.replace(/soy una? (ia|inteligencia artificial|ai|bot)/gi, 'soy un asesor')
    
    // Limpiar formato inconsistente
    cleaned = cleaned.replace(/\*{3,}/g, '**') // Múltiples asteriscos
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n') // Múltiples saltos de línea
    
    return cleaned
  }

  // Agregar emojis contextuales
  addContextualEmojis(text, context) {
    const { currentTopic, stage, interests } = context
    
    // Emojis por tema
    const topicEmojis = {
      'holding': '🏢',
      'fiscal': '📊',
      'inmobiliario': '🏠',
      'offshore': '🌍',
      'fideicomiso': '🛡️',
      'legal': '⚖️'
    }

    // Emojis por etapa
    const stageEmojis = {
      'initial': '👋',
      'exploring': '🔍',
      'planning': '📋',
      'implementing': '🚀'
    }

    let formatted = text

    // Agregar emoji de tema si corresponde
    if (currentTopic && topicEmojis[currentTopic]) {
      if (!formatted.includes(topicEmojis[currentTopic])) {
        formatted = `${topicEmojis[currentTopic]} ${formatted}`
      }
    }

    // Mejorar puntos clave con emojis
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '✨ **$1**')
    formatted = formatted.replace(/^(\d+\.)/gm, '📌 $1')
    formatted = formatted.replace(/^([A-Z]\.|•)/gm, '▫️ $1')
    
    return formatted
  }

  // Aplicar formato profesional
  applyProfessionalFormatting(text) {
    let formatted = text

    // Mejorar títulos y secciones
    formatted = formatted.replace(/^([A-ZÁÉÍÓÚ][^:\n]{10,50}):$/gm, '\n🎯 **$1:**\n')
    
    // Mejorar listas
    formatted = formatted.replace(/^- /gm, '▫️ ')
    formatted = formatted.replace(/^\* /gm, '✦ ')
    
    // Mejorar ejemplos
    formatted = formatted.replace(/ejemplo:/gi, '💡 **Ejemplo:**')
    formatted = formatted.replace(/importante:/gi, '⚠️ **Importante:**')
    formatted = formatted.replace(/nota:/gi, '📝 **Nota:**')
    
    // Mejorar conclusiones
    formatted = formatted.replace(/en resumen/gi, '📋 **En resumen**')
    formatted = formatted.replace(/conclusión/gi, '🎯 **Conclusión**')
    
    // Agregar separadores visuales
    formatted = formatted.replace(/\n\n([A-Z][^:\n]{20,})\n/g, '\n\n━━━━━━━━━━━━━━━━━━━━\n**$1**\n━━━━━━━━━━━━━━━━━━━━\n')
    
    return formatted
  }

  // Dividir mensaje en partes si es muy largo
  splitIntoMessages(text) {
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

  // Dividir por oraciones
  splitBySentences(text) {
    return text.match(/[^\.!?]+[\.!?]+/g) || [text]
  }

  // Agregar pie de mensaje
  addMessageFooter(message, index, hasMore) {
    if (hasMore) {
      return `${message}\n\n📄 *Continúa en el siguiente mensaje... (${index})*`
    } else if (index > 1) {
      return `${message}\n\n✅ *Mensaje completo (${index}/${index})*\n\n¿Te gustaría profundizar en algún punto específico? 🤔`
    } else {
      return `${message}\n\n¿Hay algo más en lo que pueda ayudarte? 😊`
    }
  }

  // Formatear mensaje de bienvenida
  formatWelcomeMessage(clientName, availableTopics) {
    return `👋 ¡Hola ${clientName}!

🎯 **Soy tu Asesor Empresarial Especializado**

Estoy aquí para ayudarte con estrategias inteligentes y soluciones empresariales de alto nivel.

━━━━━━━━━━━━━━━━━━━━
🏢 **MIS ESPECIALIDADES:**
━━━━━━━━━━━━━━━━━━━━

${availableTopics.map(topic => `✦ ${topic}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━

💡 **¿Cómo puedo ayudarte hoy?**

Puedes preguntarme sobre cualquier tema empresarial, fiscal o de inversiones. Estoy preparado para darte respuestas detalladas y estrategias específicas.

🚀 *¡Comencemos a optimizar tu negocio!*`
  }

  // Formatear mensaje de seguimiento
  formatFollowUpMessage(context) {
    const { currentTopic, stage, interests } = context
    
    let message = `🔄 **Continuando nuestra conversación...**\n\n`
    
    if (currentTopic) {
      message += `📌 Tema actual: **${currentTopic}**\n`
    }
    
    if (interests.length > 0) {
      message += `🎯 Tus intereses: ${interests.join(', ')}\n`
    }
    
    message += `\n¿En qué más puedo ayudarte? 😊`
    
    return message
  }

  // Formatear mensaje de error
  formatErrorMessage(error) {
    return `⚠️ **Disculpa las molestias**

Estoy experimentando dificultades técnicas temporales.

🔄 **Por favor:**
• Intenta reformular tu pregunta
• O contacta directamente con tu asesor

🤝 Estoy aquí para ayudarte en cuanto se resuelva.`
  }
}

module.exports = MessageFormatter
