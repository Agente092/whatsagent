class MessageFormatter {
  constructor() {
    this.maxMessageLength = 4000 // WhatsApp limit is ~4096 characters
    this.preferredLength = 3800 // 🎆 MÁS GENEROSO - dejar menos buffer
  }

  // Formatear respuesta con estilo profesional
  formatResponse(text, context = {}) {
    let formatted = this.cleanText(text)
    
    // 🔧 APLICAR REGLAS ESTRICTAS DE FORMATEO PROFESIONAL
    formatted = this.applyStrictFormattingRules(formatted)
    
    // Agregar emojis contextuales con espaciado correcto
    formatted = this.addContextualEmojis(formatted, context)
    
    // Aplicar formato profesional
    formatted = this.applyProfessionalFormatting(formatted)
    
    // 🤔 AGREGAR PREGUNTAS PERSONALIZADAS SI CORRESPONDE
    if (context.personalizedQuestions && context.personalizedQuestions.length > 0) {
      formatted += this.addPersonalizedQuestions(formatted, context.personalizedQuestions)
    }
    
    // 🔧 NORMALIZAR PARA WHATSAPP (SOLUCIÓN DEFINITIVA AL PROBLEMA DE ALINEACIÓN)
    formatted = this.normalizeForWhatsApp(formatted)
    
    // 🔍 VALIDACIÓN FINAL - ASEGURAR CUMPLIMIENTO DE REGLAS ESTÉTICAS
    formatted = this.ensureAestheticCompliance(formatted)
    
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

  // Agregar emojis contextuales con espaciado correcto
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

    // 🔧 CORRECCIÓN CRÍTICA: ESPACIADO ADECUADO PARA EMOJIS
    // Agregar emoji de tema con espaciado correcto
    if (currentTopic && topicEmojis[currentTopic]) {
      const emoji = topicEmojis[currentTopic]
      if (!formatted.includes(emoji)) {
        formatted = `${emoji} ${formatted}`
      }
    }

    // 🔧 PROCESAR NEGRITAS SIN ALTERAR EL CONTENIDO ORIGINAL
    // Solo limpiar espacios problemáticos, no cambiar la estructura
    formatted = formatted.replace(/^\s+\*\*([^*]+)\*\*/gm, '**$1**')
    
    // 🔧 ASEGURAR ESPACIADO CORRECTO DESPUÉS DE EMOJIS Y NEGRITAS
    // Separar emojis que estén pegados al texto
    formatted = formatted.replace(/([🏢📊🏠🌍🛡️⚖️💰💱🔍📋🚀✅❌⚠️📝💡🎯📄🔹▫️✦•📌])([a-záéíóúüñA-ZÁÉÍÓÚÜÑ])/g, '$1 $2')
    
    // Separar texto que esté pegado después de emojis
    formatted = formatted.replace(/([a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9])([🏢📊🏠🌍🛡️⚖️💰💱🔍📋🚀✅❌⚠️📝💡🎯📄🔹▫️✦•📌])/g, '$1 $2')
    
    // 🔧 ESPACIADO CORRECTO PARA NEGRITAS SEGUIDAS DE TEXTO
    formatted = formatted.replace(/\*\*([^*]+)\*\*([a-záéíóúüñA-ZÁÉÍÓÚÜÑ])/g, '**$1** $2')
    
    return formatted
  }

  // Aplicar formato profesional
  applyProfessionalFormatting(text) {
    let formatted = text

    // 🔧 PRE-PROCESAMIENTO: CORREGIR PROBLEMAS BÁSICOS DE ESPACIADO
    // Separar emojis que están pegados al texto
    formatted = formatted.replace(/([a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9])([🏢📊🏠🌍🛡️⚖️💰💱🔍📋🚀✅❌⚠️📝💡🎯📄🔹▫️✦•])/g, '$1 $2')
    formatted = formatted.replace(/([🏢📊🏠🌍🛡️⚖️💰💱🔍📋🚀✅❌⚠️📝💡🎯📄🔹▫️✦•])([a-záéíóúüñA-ZÁÉÍÓÚÜÑ])/g, '$1 $2')
    
    // 🎯 NORMALIZAR TÍTULOS Y SUBTÍTULOS
    // Convertir títulos simples a formato con negritas
    formatted = formatted.replace(/^([A-ZÁÉÍÓÚ][^:\n]{8,60}):$/gm, '\n**$1:**\n')
    
    // 🔹 NORMALIZAR VIÑETAS Y LISTAS
    formatted = formatted.replace(/^\s*[•▫️✦-]\s*/gm, '• ')
    
    // 📝 MEJORAR PALABRAS CLAVE CON EMOJIS
    formatted = formatted.replace(/\b(ejemplo|ejemplos):/gi, '\n💡 **Ejemplo:**\n')
    formatted = formatted.replace(/\b(importante|crítico|clave):/gi, '\n⚠️ **Importante:**\n')
    formatted = formatted.replace(/\b(nota|observación):/gi, '\n📝 **Nota:**\n')
    formatted = formatted.replace(/\b(riesgo|riesgos):/gi, '\n🚨 **Riesgos:**\n')
    formatted = formatted.replace(/\b(beneficio|beneficios|ventaja|ventajas):/gi, '\n✅ **Beneficios:**\n')
    formatted = formatted.replace(/\b(conclusión|resumen):/gi, '\n🎯 **Conclusión:**\n')
    formatted = formatted.replace(/\b(recomendación|recomendaciones):/gi, '\n💡 **Recomendaciones:**\n')
    
    // 🔧 ESPACIADO CONSISTENTE PARA NEGRITAS
    // Asegurar espacio después de negritas cuando van seguidas de texto
    formatted = formatted.replace(/\*\*([^*]+)\*\*([a-záéíóúüñA-ZÁÉÍÓÚÜÑ])/g, '**$1** $2')
    
    // 🔧 LIMPIEZA FINAL
    formatted = formatted.replace(/\n{3,}/g, '\n\n')
    formatted = formatted.replace(/^\s+/gm, '')
    formatted = formatted.replace(/\s+$/gm, '')
    
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
   * 🔧 NORMALIZAR TEXTO PARA WHATSAPP - CORRECCIÓN DEFINITIVA V3
   * SOLUCIONA TODOS LOS PROBLEMAS CRÍTICOS REPORTADOS:
   * ✅ Emojis pegados al texto sin espacio
   * ✅ Texto amontonado sin saltos de línea
   * ✅ Viñetas inconsistentes y mal alineadas
   * ✅ Títulos y subtítulos sin separación visual
   * ✅ Secciones sin espaciado profesional
   * ✅ Formateo que no se ve estético
   */
  normalizeForWhatsApp(text) {
    let normalized = text.trim()
    
    // 🛠️ PASO 1: LIMPIEZA INICIAL PROFUNDA
    normalized = normalized.replace(/\r\n/g, '\n')
    normalized = normalized.replace(/\t/g, '  ')
    
    // 🔧 CORRECCIÓN CRÍTICA 1: SEPARAR EMOJIS PEGADOS AL TEXTO
    // Antes: "estructura💱" → Después: "estructura 💱"
    normalized = normalized.replace(/([a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9])([🏢📊🏠🌍🛡️⚖️💰💱🔍📋🚀✅❌⚠️📝💡🎯📄🔹▫️✦•])/g, '$1 $2')
    
    // 🔧 CORRECCIÓN CRÍTICA 2: SEPARAR TEXTO PEGADO DESPUÉS DE EMOJIS
    // Antes: "💱transferencia" → Después: "💱 transferencia"
    normalized = normalized.replace(/([🏢📊🏠🌍🛡️⚖️💰💱🔍📋🚀✅❌⚠️📝💡🎯📄🔹▫️✦•])([a-záéíóúüñA-ZÁÉÍÓÚÜÑ])/g, '$1 $2')
    
    // 🔧 CORRECCIÓN CRÍTICA 3: CORREGIR ESPACIADO EN NEGRITAS
    // Antes: "**texto**palabra" → Después: "**texto** palabra"
    normalized = normalized.replace(/\*\*([^*]+)\*\*([a-záéíóúüñA-ZÁÉÍÓÚÜÑ])/g, '**$1** $2')
    
    // 🎯 PASO 2: PROCESAR LÍNEA POR LÍNEA CON REGLAS ESTRICTAS
    const lines = normalized.split('\n')
    const processedLines = []
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim()
      
      // 📝 LÍNEA VACÍA - preservar con control
      if (line.length === 0) {
        // Solo agregar línea vacía si la anterior no era vacía
        if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
          processedLines.push('')
        }
        continue
      }
      
      // 🔢 TÍTULOS NUMERADOS (1., 2., 3., etc.)
      const numberedTitleMatch = line.match(/^(\d+)\.\s*(.+)$/)
      if (numberedTitleMatch) {
        const number = numberedTitleMatch[1]
        const title = numberedTitleMatch[2].trim().replace(':', '')
        
        // Asegurar separación antes del título
        if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
          processedLines.push('')
        }
        
        processedLines.push(`**${number}. ${title}:**`)
        processedLines.push('') // Separación después del título
        continue
      }
      
      // 🔹 VIÑETAS Y LISTAS (-, •, *, etc.)
      const bulletMatch = line.match(/^[-•*]\s*(.+)$/)
      if (bulletMatch) {
        const content = bulletMatch[1].trim()
        processedLines.push(`• ${content}`)
        continue
      }
      
      // 🎯 SUBTÍTULOS CON NEGRITAS (**texto:**)
      const boldSubtitleMatch = line.match(/^\*\*([^*]+):\*\*\s*(.*)$/)
      if (boldSubtitleMatch) {
        const subtitle = boldSubtitleMatch[1].trim()
        const content = boldSubtitleMatch[2].trim()
        
        // Separación antes del subtítulo
        if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
          processedLines.push('')
        }
        
        processedLines.push(`**${subtitle}:**`)
        
        if (content) {
          processedLines.push('')
          processedLines.push(content)
        }
        
        processedLines.push('') // Separación después
        continue
      }
      
      // 🏷️ TÍTULOS SIMPLES (terminan en ":")
      if (line.endsWith(':') && line.length > 3 && line.length < 80 && !line.includes('**')) {
        const title = line.replace(':', '').trim()
        
        // Separación antes del título
        if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
          processedLines.push('')
        }
        
        processedLines.push(`**${title}:**`)
        processedLines.push('') // Separación después
        continue
      }
      
      // 📝 LÍNEA NORMAL - preservar con espaciado mejorado
      processedLines.push(line)
    }
    
    // 🧹 PASO 3: LIMPIEZA FINAL Y APLICACIÓN DE REGLAS ESTÉTICAS
    let result = processedLines.join('\n')
    
    // 🔧 REGLA ESTÉTICA 1: Máximo 2 saltos de línea consecutivos
    result = result.replace(/\n{3,}/g, '\n\n')
    
    // 🔧 REGLA ESTÉTICA 2: Asegurar espacios después de emojis en cualquier contexto
    result = result.replace(/([🏢📊🏠🌍🛡️⚖️💰💱🔍📋🚀✅❌⚠️📝💡🎯📄🔹▫️✦•])([a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9])/g, '$1 $2')
    
    // 🔧 REGLA ESTÉTICA 3: Separación visual entre secciones principales
    result = result.replace(/(\*\*\d+\. [^*]+:\*\*)\n([^\n])/g, '$1\n\n$2')
    
    // 🔧 REGLA ESTÉTICA 4: Eliminar espacios al inicio de líneas
    result = result.replace(/^\s+/gm, '')
    
    // 🔧 REGLA ESTÉTICA 5: Espaciado consistente en viñetas
    result = result.replace(/^•([^ ])/gm, '• $1')
    
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

  /**
   * 🛡️ APLICAR REGLAS ESTRICTAS DE FORMATEO PROFESIONAL
   * REGLAS QUE EL AGENTE DEBE CUMPLIR OBLIGATORIAMENTE:
   */
  applyStrictFormattingRules(text) {
    let formatted = text
    
    // 🔴 REGLA 1: Emojis SIEMPRE separados del texto con un espacio
    formatted = formatted.replace(/([a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9])([🏢📊🏠🌍🛡️⚖️💰💱🔍📋🚀✅❌⚠️📝💡🎯📄🔹▫️✦•📌🚨🏆👋🔄😊🤝])/g, '$1 $2')
    formatted = formatted.replace(/([🏢📊🏠🌍🛡️⚖️💰💱🔍📋🚀✅❌⚠️📝💡🎯📄🔹▫️✦•📌🚨🏆👋🔄😊🤝])([a-záéíóúüñA-ZÁÉÍÓÚÜÑ])/g, '$1 $2')
    
    // 🔴 REGLA 2: Negritas SIEMPRE seguidas de espacio si hay texto después
    formatted = formatted.replace(/\*\*([^*]+)\*\*([a-záéíóúüñA-ZÁÉÍÓÚÜÑ])/g, '**$1** $2')
    
    // 🔴 REGLA 3: Títulos numerados SIEMPRE con formato: **N. Título:**
    formatted = formatted.replace(/^(\d+)\.\s*([^\n]+?)\s*:?\s*$/gm, '**$1. $2:**')
    
    // 🔴 REGLA 4: Viñetas SIEMPRE con • y espacio
    formatted = formatted.replace(/^\s*[-*+▪▫✦◦]\s*/gm, '• ')
    
    // 🔴 REGLA 5: Subtítulos SIEMPRE con formato: **Texto:**
    formatted = formatted.replace(/^([A-ZÁÉÍÓÚÜÑ][^:\n]{5,50})\s*:?\s*$/gm, '**$1:**')
    
    return formatted
  }

  /**
   * 🔍 VALIDACIÓN FINAL - CUMPLIMIENTO ESTÉTICO COMPLETO
   */
  ensureAestheticCompliance(text) {
    let compliant = text
    
    // ✅ ALINEACIÓN PERFECTA: Solo sub-elementos pueden tener indentación
    const lines = compliant.split('\n')
    const alignedLines = lines.map(line => {
      if (line.match(/^  - /)) return line // Mantener sub-elementos
      return line.replace(/^[ \t]+/, '') // Todo lo demás a la izquierda
    })
    compliant = alignedLines.join('\n')
    
    // ✅ SEPARACIÓN ENTRE SECCIONES
    compliant = compliant.replace(/(\*\*\d+\.[^:]+:\*\*)([^\n])/g, '$1\n\n$2')
    compliant = compliant.replace(/(\*\*[a-z]\)\*\*[^\n]+)([^\n])/g, '$1\n\n$2')
    
    // ✅ ESPACIADO EN LISTAS
    compliant = compliant.replace(/^•([^\s])/gm, '• $1')
    compliant = compliant.replace(/^  -([^\s])/gm, '  - $1')
    
    // ✅ ESPACIADO DESPUÉS DE NEGRITAS
    compliant = compliant.replace(/\*\*([^*]+)\*\*([a-záéíóúüñA-ZÁÉÍÓÚÜÑ])/g, '**$1** $2')
    
    // ✅ MÁXIMO 2 SALTOS DE LÍNEA
    compliant = compliant.replace(/\n{3,}/g, '\n\n')
    
    // ✅ ELIMINAR ESPACIOS AL FINAL
    compliant = compliant.replace(/[ \t]+$/gm, '')
    
    // ✅ ESPACIOS DESPUÉS DE EMOJIS
    compliant = compliant.replace(/([🏢📊🏠🌍🛡️⚖️💰💱🔍📋🚀✅❌⚠️📝💡🎯📄🔹▫️✦•📌🚨🏆👋🔄😊🤝🌟🎪💼💸📈🎉])([a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ])/g, '$1 $2')
    
    // ✅ CORRECCIÓN FINAL DE EMOJIS PEGADOS
    compliant = compliant.replace(/([a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9])([🏢📊🏠🌍🛡️⚖️💰💱🔍📋🚀✅❌⚠️📝💡🎯📄🔹▫️✦•📌🚨🏆👋🔄😊🤝🌟🎪💼💸📈🎉])/g, '$1 $2')
    
    return compliant.trim()
  }
}

module.exports = MessageFormatter
