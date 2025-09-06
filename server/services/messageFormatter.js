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
    
    // 🤔 AGREGAR PREGUNTAS PERSONALIZADAS SI CORRESPONDE
    if (context.personalizedQuestions && context.personalizedQuestions.length > 0) {
      formatted += this.addPersonalizedQuestions(formatted, context.personalizedQuestions)
    }
    
    // 🔧 NORMALIZAR PARA WHATSAPP (SOLUCIÓN AL PROBLEMA DE ALINEACIÓN)
    formatted = this.normalizeForWhatsApp(formatted)
    
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

    // 🔧 CORREGIR INCONSISTENCIA DE NEGRITAS - LIMPIAR ESPACIOS ANTES DE PROCESAR
    // Primero limpiar espacios antes de asteriscos para uniformidad
    formatted = formatted.replace(/^\s+\*\*([^*]+)\*\*/gm, '**$1**')
    
    // 🔢 CORREGIR INCONSISTENCIA DE NÚMEROS - LISTAS NUMERADAS EN NEGRITAS
    // Limpiar espacios antes de números y ponerlos en negritas
    formatted = formatted.replace(/^\s*(\d+)\./gm, '**$1.**')
    
    // Mejorar puntos clave con emojis (ahora todos uniformes)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '• **$1**')
    formatted = formatted.replace(/^\*\*(\d+)\.\*\*/gm, '📌 **$1.**')
    formatted = formatted.replace(/^([A-Z]\.|•)/gm, '▫️ $1')
    
    return formatted
  }

  // Aplicar formato profesional
  applyProfessionalFormatting(text) {
    let formatted = text

    // 🔧 NORMALIZAR FORMATO PARA WHATSAPP
    // Limpiar espacios inconsistentes antes de negritas
    formatted = formatted.replace(/\s+\*(.*?)\*/g, '\n*$1*')
    
    // Asegurar salto de línea antes de títulos en negrita
    formatted = formatted.replace(/([^\n])\*(\w[^*]+)\*/g, '$1\n\n*$2*')
    
    // Normalizar bullets y listas para consistencia
    formatted = formatted.replace(/^\s*[•▫️✦]\s*/gm, '• ')
    formatted = formatted.replace(/^\s*-\s*/gm, '• ')
    
    // Mejorar títulos y secciones con formato consistente
    formatted = formatted.replace(/^([A-ZÁÉÍÓÚ][^:\n]{10,50}):$/gm, '\n*$1:*\n')
    
    // Asegurar espaciado correcto después de títulos en negrita
    formatted = formatted.replace(/\*(.*?)\*:\s*\n/g, '*$1:*\n\n')
    
    // Normalizar opciones (Opción A, B, C, etc.)
    formatted = formatted.replace(/^\s*(Opción\s+[A-Z][^:]*):?/gm, '\n*$1:*')
    
    // Mejorar ejemplos con formato consistente
    formatted = formatted.replace(/ejemplo:/gi, '\n💡 *Ejemplo:*\n')
    formatted = formatted.replace(/importante:/gi, '\n⚠️ *Importante:*\n')
    formatted = formatted.replace(/nota:/gi, '\n📝 *Nota:*\n')
    
    // Mejorar conclusiones
    formatted = formatted.replace(/en resumen/gi, '\n📋 *En resumen:*\n')
    formatted = formatted.replace(/conclusión/gi, '\n🎯 *Conclusión:*\n')
    
    // 🔧 LIMPIAR ESPACIOS MÚLTIPLES Y SALTOS DE LÍNEA EXCESIVOS
    formatted = formatted.replace(/\n{3,}/g, '\n\n')
    formatted = formatted.replace(/\s+\n/g, '\n')
    formatted = formatted.replace(/\n\s+/g, '\n')
    
    // Asegurar que las negritas estén alineadas correctamente
    formatted = formatted.replace(/^\s+\*/gm, '*')
    
    return formatted.trim()
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
      // 📝 NO AGREGAR PREGUNTA HARDCODEADA CUANDO ES RESPUESTA DIRECTA
      return message
    }
  }

  /**
   * 🤔 AGREGAR PREGUNTAS PERSONALIZADAS AL FINAL DE LA RESPUESTA
   */
  addPersonalizedQuestions(responseText, questions) {
    if (!questions || questions.length === 0) return ''
    
    // 🔄 LIMITAR A 3-4 PREGUNTAS PARA NO SATURAR
    const selectedQuestions = questions.slice(0, 4)
    
    let questionSection = '\n\n📄 *Para brindarle una asesoría más personalizada, necesito conocer:*\n\n'
    
    selectedQuestions.forEach((question, index) => {
      questionSection += `🔹 ${question}\n`
    })
    
    questionSection += '\n🎯 *Con esta información podré diseñar una estrategia integral específica para su situación.*'
    
    return questionSection
  }

  /**
   * 🔧 NORMALIZAR TEXTO PARA WHATSAPP (SOLUCIÓN FINAL)
   * Corrige la inconsistencia de negritas, números Y sub-opciones anidadas
   */
  normalizeForWhatsApp(text) {
    let normalized = text
    
    // 🛠️ PASO 1: Limpiar y normalizar espacios
    normalized = normalized.replace(/\r\n/g, '\n')
    normalized = normalized.replace(/\t/g, ' ')
    
    // 🛠️ PASO 2: CORREGIR INCONSISTENCIA DE NEGRITAS - CAUSA RAÍZ
    // Eliminar TODOS los espacios antes de asteriscos para uniformidad
    normalized = normalized.replace(/^\s+\*/gm, '*')
    normalized = normalized.replace(/\s+\*\*([^*\n]+)\*\*/g, '\n• **$1**')
    
    // 🔢 PASO 2.5: CORREGIR INCONSISTENCIA DE LISTAS NUMERADAS
    // Limpiar espacios antes de números y ponerlos en negritas para destacar
    normalized = normalized.replace(/^\s*(\d+)\./gm, '**$1.**')
    normalized = normalized.replace(/^\s*(\d+)\s*\./gm, '**$1.**')
    
    // 🔤 PASO 2.7: CORREGIR SUB-OPCIONES ANIDADAS (a.1, a.2, b.1, etc.)
    // Detectar y formatear sub-opciones dentro de opciones principales
    normalized = this.formatNestedOptions(normalized)
    
    // Asegurar que todas las negritas se conviertan a viñetas consistentes
    normalized = normalized.replace(/^\*\*([^*\n]+)\*\*:/gm, '• **$1:**')
    normalized = normalized.replace(/([^\n])\s*\*\*([^*]+)\*\*/g, '$1\n\n• **$2**')
    
    // 🛠️ PASO 3: Normalizar listas y bullets
    normalized = normalized.replace(/^\s*[•▫️✦●]\s*/gm, '• ')
    normalized = normalized.replace(/^\s*-\s+/gm, '• ')
    
    // 🛠️ PASO 4: Espaciado consistente
    normalized = normalized.replace(/\n{3,}/g, '\n\n')
    normalized = normalized.replace(/^\s+/gm, '')
    normalized = normalized.replace(/\s+$/gm, '')
    
    // 🛠️ PASO 5: Alineación final - TODOS al margen izquierdo
    normalized = normalized.replace(/\n\s+\*/g, '\n*')
    normalized = normalized.replace(/\n\s+•/g, '\n•')
    normalized = normalized.replace(/\n\s+\d/g, '\n**$1')
    
    return normalized.trim()
  }

  /**
   * 🔤 FORMATEAR SUB-OPCIONES ANIDADAS
   * Detecta sub-elementos dentro de opciones principales y los numera correctamente
   */
  formatNestedOptions(text) {
    let formatted = text
    
    // Detectar patrones como: "a) Título: - Sub1: texto - Sub2: texto"
    // Y convertirlos a: "a) Título:\na.1) Sub1: texto\na.2) Sub2: texto"
    
    // Buscar opciones principales (a), b), c), etc.)
    const optionPattern = /^([a-z])\)\s*([^:]+):\s*(.+?)(?=^[a-z]\)|$)/gms
    
    formatted = formatted.replace(optionPattern, (match, letter, title, content) => {
      // Limpiar el contenido y detectar sub-elementos
      let cleanContent = content.trim()
      
      // Detectar sub-elementos que empiezan con - o • seguidos de término en negritas o mayúsculas
      const subElements = []
      const subPattern = /[-•]\s*([A-Z][^:]+):\s*([^-•]+)/g
      let subMatch
      let subIndex = 1
      
      // Extraer todos los sub-elementos
      while ((subMatch = subPattern.exec(cleanContent)) !== null) {
        subElements.push({
          original: subMatch[0],
          term: subMatch[1].trim(),
          description: subMatch[2].trim(),
          formatted: `${letter}.${subIndex}) **${subMatch[1].trim()}:** ${subMatch[2].trim()}`
        })
        subIndex++
      }
      
      if (subElements.length > 0) {
        // Construir la opción reformateada
        let result = `**${letter})** **${title.trim()}:**\n\n`
        
        // Agregar cada sub-elemento
        subElements.forEach(sub => {
          result += `${sub.formatted}\n\n`
        })
        
        return result.trim()
      } else {
        // Si no hay sub-elementos, formato estándar
        return `**${letter})** **${title.trim()}:** ${cleanContent}`
      }
    })
    
    return formatted
  }

  // Formatear mensaje de bienvenida
  formatWelcomeMessage(clientName, availableTopics) {
    // 🆕 ESPECIALIDADES ACTUALIZADAS CON NUEVOS CONOCIMIENTOS
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
    
    const specialtiesToShow = availableTopics && availableTopics.length > 0 ? availableTopics : defaultSpecialties
    
    let welcomeMessage = `👋 ¡Hola ${clientName}!

*Soy tu Asesor Empresarial Especializado*

Estoy aquí para ayudarte con estrategias inteligentes y soluciones empresariales de alto nivel.

*MIS ESPECIALIDADES:*

${specialtiesToShow.map(topic => `✦ ${topic}`).join('\n')}

*¿Cómo puedo ayudarte hoy?*

Puedes preguntarme sobre cualquier tema empresarial, fiscal o de inversiones. Estoy preparado para darte respuestas detalladas y estrategias específicas.

🚀 *¡Comencemos a optimizar tu negocio!*`
    
    // 🔧 APLICAR NORMALIZACIÓN PARA WHATSAPP
    return this.normalizeForWhatsApp(welcomeMessage)
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
