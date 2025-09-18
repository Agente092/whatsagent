class MessageFormatter {
  constructor() {
    this.maxMessageLength = 4000 // WhatsApp limit is ~4096 characters
    this.preferredLength = 3800 // 🎆 MÁS GENEROSO - dejar menos buffer
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

  // 🔧 DIVIDIR MENSAJE CORREGIDO - SIN FRAGMENTACIÓN PROBLEMÁTICA
  splitIntoMessages(text) {
    // 🚀 NUEVA ESTRATEGIA: Solo dividir si REALMENTE es necesario
    // WhatsApp permite hasta 4096 caracteres, usemos un límite más generoso
    const REAL_WHATSAPP_LIMIT = 4000
    
    if (text.length <= REAL_WHATSAPP_LIMIT) {
      return [text] // ✅ Enviar como mensaje único si cabe
    }

    // 📝 Solo dividir cuando realmente exceda el límite de WhatsApp
    const messages = []
    const paragraphs = text.split('\n\n')
    let currentMessage = ''
    let messageIndex = 1

    for (const paragraph of paragraphs) {
      const potentialMessage = currentMessage + (currentMessage ? '\n\n' : '') + paragraph
      
      // Solo dividir si excede el límite REAL de WhatsApp
      if (potentialMessage.length > REAL_WHATSAPP_LIMIT) {
        if (currentMessage.trim()) {
          messages.push(this.addMessageFooter(currentMessage.trim(), messageIndex, true))
          messageIndex++
          currentMessage = paragraph
        }
      } else {
        currentMessage = potentialMessage
      }
    }

    // Agregar el último mensaje
    if (currentMessage.trim()) {
      messages.push(this.addMessageFooter(currentMessage.trim(), messageIndex, false))
    }

    return messages.length > 0 ? messages : [text] // ✅ Fallback seguro
  }

  // Dividir por oraciones
  splitBySentences(text) {
    return text.match(/[^\.!?]+[\.!?]+/g) || [text]
  }

  // 🏷️ AGREGAR PIE DE MENSAJE SIMPLIFICADO
  addMessageFooter(message, index, hasMore) {
    if (hasMore) {
      return `${message}\n\n📄 *(Continuación ${index})*`
    } else if (index > 1) {
      return `${message}\n\n✅ *(Mensaje ${index}/${index} - Completo)*`
    } else {
      // 🚀 MENSAJE ÚNICO - NO AGREGAR FOOTER INNECESARIO
      return message
    }
  }

  /**
   * 🤔 AGREGAR PREGUNTAS PERSONALIZADAS AL FINAL DE LA RESPUESTA
   */
  addPersonalizedQuestions(responseText, questions) {
    // 🚫 NO AGREGAR PREGUNTAS SI YA HAY UNA PREGUNTA CLARA EN EL TEXTO
    const hasExistingQuestion = responseText.includes('?') || responseText.includes('¿');
    if (hasExistingQuestion) {
      return '';
    }
    
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
   * 🚨 NORMALIZAR TEXTO PARA WHATSAPP - CORRECCIÓN DEFINITIVA V2
   * Soluciona TODOS los problemas específicos reportados:
   * - Títulos sin numeración automática
   * - Subtítulos amontonados sin viñetas
   * - Numeración manual existente desalineada
   * - Listas con guiones mal alineadas
   * - Falta de saltos de línea y separación
   * - Problemas de alineación
   */
  normalizeForWhatsApp(text) {
    let normalized = text.trim()
    
    // 🛠️ PASO 1: Limpiar texto de entrada
    normalized = normalized.replace(/\r\n/g, '\n')
    normalized = normalized.replace(/\t/g, ' ')
    
    // 🎯 PASO 2: PROCESAR LÍNEA POR LÍNEA
    const lines = normalized.split('\n')
    const processedLines = []
    let titleCounter = 1
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]
      
      // 🧹 LIMPIAR ESPACIOS AL INICIO Y FINAL
      line = line.trim()
      
      if (line.length === 0) {
        // Línea vacía - preservar
        processedLines.push('')
        continue
      }
      
      // 🔢 DETECTAR NUMERACIÓN MANUAL EXISTENTE (1., 2., 3., etc.)
      const manualNumberMatch = line.match(/^(\d+)\.\s+(.+)$/)
      if (manualNumberMatch) {
        const number = manualNumberMatch[1]
        const content = manualNumberMatch[2].trim()
        
        // CORRECCIÓN CRÍTICA: Formato consistente para TODOS los títulos numerados
        if (content.endsWith(':')) {
          const cleanTitle = content.replace(':', '').trim()
          processedLines.push(`**${number}. ${cleanTitle}:**`)
        } else {
          // Agregar ":" si no lo tiene para mantener formato consistente
          processedLines.push(`**${number}. ${content}:**`)
        }
        processedLines.push('') // Salto después del título
        continue
      }
      
      // 🔹 DETECTAR LISTAS CON GUIONES (- item, - item)
      const dashListMatch = line.match(/^-\s*(.+)$/)
      if (dashListMatch) {
        const content = dashListMatch[1].trim()
        
        // Si termina en ":" es un subtítulo, sino es contenido
        if (content.endsWith(':')) {
          const cleanSubtitle = content.replace(':', '').trim()
          processedLines.push('')
          processedLines.push(`• **${cleanSubtitle}:**`)
          processedLines.push('')
        } else {
          processedLines.push(`• ${content}`)
        }
        continue
      }
      
      // 🎯 DETECTAR TÍTULOS PRINCIPALES (mayúsculas largas con ":")
      const isTitlePattern = /^[A-ZÁÉÍÓÚÄËÏÖÜ][A-ZÁÉÍÓÚÄËÏÖÜ\s]{10,}:\s*$/.test(line)
      if (isTitlePattern) {
        const cleanTitle = line.replace(':', '').trim()
        processedLines.push(`**${titleCounter}. ${cleanTitle}:**`)
        processedLines.push('')
        titleCounter++
        continue
      }
      
      // 🔹 DETECTAR SUBTÍTULOS SIMPLES (terminan en ":")
      if (line.endsWith(':') && line.length > 3 && line.length < 50) {
        const cleanSubtitle = line.replace(':', '').trim()
        if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
          processedLines.push('')
        }
        processedLines.push(`• **${cleanSubtitle}:**`)
        processedLines.push('')
        continue
      }
      
      // 📝 LÍNEA NORMAL - preservar tal como está
      processedLines.push(line)
    }
    
    // 🧹 PASO 3: LIMPIEZA FINAL
    let result = processedLines.join('\n')
    
    // Limpiar saltos de línea excesivos
    result = result.replace(/\n{3,}/g, '\n\n')
    
    // Asegurar alineación izquierda (eliminar espacios al inicio)
    result = result.replace(/^\s+/gm, '')
    
    return result.trim()
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
