/**
 * 🔧 SISTEMA DE FORMATEO PROFESIONAL CORREGIDO
 * Solución a los problemas de formateo identificados:
 * 1. Eliminar emojis + texto hardcodeados (💰 Costo:, ⚠️ Riesgo:)
 * 2. Corregir asteriscos mal colocados (*Holding*-Operadora:*)
 * 3. Limpiar texto repetitivo de estructuras empresariales
 * 4. Mejorar legibilidad y organización visual
 */

class MessageFormatterCleaned {
  constructor() {
    this.maxMessageLength = 4000 // WhatsApp limit es ~4096 caracteres
    this.preferredLength = 3500 // Dejar buffer de seguridad
  }

  /**
   * 🎯 FORMATEAR RESPUESTA CON ESTILO LIMPIO Y PROFESIONAL
   */
  formatResponse(text, context = {}) {
    let formatted = this.cleanText(text)
    
    // Aplicar únicamente formateo limpio sin hardcode
    formatted = this.applyCleanFormatting(formatted)
    
    // Dividir en mensajes si es muy largo
    return this.splitIntoMessages(formatted)
  }

  /**
   * 🧹 LIMPIAR TEXTO BASE - VERSIÓN CORREGIDA
   */
  cleanText(text) {
    let cleaned = text.trim()
    
    // Remover menciones de IA
    cleaned = cleaned.replace(/como (ia|inteligencia artificial|ai|bot|asistente virtual)/gi, 'como asesor especializado')
    cleaned = cleaned.replace(/soy una? (ia|inteligencia artificial|ai|bot)/gi, 'soy un asesor empresarial')
    
    // 🔧 ARREGLAR PROBLEMAS DE FORMATEO IDENTIFICADOS
    
    // 1. ELIMINAR EMOJIS + TEXTO HARDCODEADOS PROBLEMÁTICOS
    cleaned = cleaned.replace(/💰\s*Costo:\s*/gi, '') // Eliminar "💰 Costo:"
    cleaned = cleaned.replace(/⚠️\s*Riesgo:\s*/gi, '') // Eliminar "⚠️ Riesgo:"
    cleaned = cleaned.replace(/✅\s*Ventaja:\s*/gi, '') // Eliminar "✅ Ventaja:"
    cleaned = cleaned.replace(/🎯\s*Recomendación:\s*/gi, '') // Eliminar "🎯 Recomendación:"
    
    // 2. ARREGLAR ASTERISCOS MAL COLOCADOS
    // Problema: *Holding*-Operadora:* -> Solución: *Holding-Operadora:*
    cleaned = cleaned.replace(/\*([A-Za-z]+)\*-([A-Za-z]+):\*/g, '*$1-$2:*')
    
    // 3. LIMPIAR TEXTO REPETITIVO DE ESTRUCTURAS EMPRESARIALES
    // Eliminar repeticiones como "🏢 *🏢 *S.A.C*"
    cleaned = cleaned.replace(/🏢\s*\*🏢\s*\*/g, '🏢 *')
    cleaned = cleaned.replace(/👤\s*\*👤\s*\*/g, '👤 *')
    
    // 4. CONVERTIR DOBLE ASTERISCO A SIMPLE PARA WHATSAPP
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '*$1*')
    
    // 5. LIMPIAR FORMATO INCONSISTENTE
    cleaned = cleaned.replace(/\*{3,}/g, '*') // Múltiples asteriscos a uno solo
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n') // Múltiples saltos de línea
    cleaned = cleaned.replace(/\s{3,}/g, ' ') // Múltiples espacios
    
    // 6. LIMPIAR REPETICIONES DE ESTRUCTURAS EMPRESARIALES
    cleaned = cleaned.replace(/\(🏢\s*\*S\.A\.\s*\(Sociedad Anónima\)\*\s*Cerrada\)\*\s*\(🏢\s*\*🏢\s*\*S\.A\.\s*\(Sociedad Anónima\)\*C\.\s*\(🏢\s*\*S\.A\.\s*\(Sociedad Anónima\)\*\s*Cerrada\)\*\)/g, '*S.A.C. (Sociedad Anónima Cerrada)*')
    
    return cleaned
  }

  /**
   * 🎨 APLICAR FORMATEO LIMPIO SIN HARDCODE
   */
  applyCleanFormatting(text) {
    let formatted = text

    // 🚨 APLICAR REGLAS ESTRICTAS DE FORMATO PARA WHATSAPP
    formatted = this.applyStrictWhatsAppFormatting(formatted)

    // ==================== SOLO TÍTULOS Y SECCIONES LIMPIAS ====================
    // Mejorar títulos principales sin agregar texto hardcodeado
    formatted = formatted.replace(/^([A-ZÁÉÍÓÚ][^:\n]{15,60}):$/gm, '\n*$1:*\n')
    
    // ==================== LISTAS LIMPIAS ====================
    formatted = formatted.replace(/^- /gm, '• ')
    formatted = formatted.replace(/^\* /gm, '• ')
    formatted = formatted.replace(/^\d+\. /gm, '• ')

    // ==================== ESTRUCTURAS EMPRESARIALES LIMPIAS Y CORRECTAS ====================
    // 🔧 CORRECIÓN CRÍTICA: Formateo correcto de tipos de empresas en Perú
    
    // Limpiar malformaciones existentes primero
    formatted = formatted.replace(/🏢\s*🏢\s*/g, '🏢 ') // Eliminar emojis duplicados
    formatted = formatted.replace(/\*S\.A\.\s*\(Sociedad Anónima\)\*C/g, 'Sociedad Anónima Cerrada (S.A.C.)') // Arreglar S.A.C. malformada específica
    formatted = formatted.replace(/\(S\.A\.\)\*?C/g, '(S.A.C.)') // Arreglar formato incorrecto (S.A.)C
    
    // Formateo correcto según la legislación peruana - ORDEN CRÍTICO: S.A.C. ANTES que S.A.
    // 🚨 CORRECCIÓN CRÍTICA: Evitar duplicaciones usando negative lookaheads
    formatted = formatted.replace(/\b(S\.A\.C\.|SAC)\b(?!.*\(S\.A\.C\.\))/gi, 'Sociedad Anónima Cerrada (S.A.C.)')
    formatted = formatted.replace(/\bSociedad Anónima Cerrada\b(?!.*\(S\.A\.C\.\))/gi, 'Sociedad Anónima Cerrada (S.A.C.)')
    
    formatted = formatted.replace(/\b(S\.A\.A\.|SAA)\b(?!.*\(S\.A\.A\.\))/gi, 'Sociedad Anónima Abierta (S.A.A.)')
    formatted = formatted.replace(/\bSociedad Anónima Abierta\b(?!.*\(S\.A\.A\.\))/gi, 'Sociedad Anónima Abierta (S.A.A.)')
    
    formatted = formatted.replace(/\b(S\.R\.L\.|SRL)\b(?!.*\(S\.R\.L\.\))/gi, 'Sociedad Comercial de Responsabilidad Limitada (S.R.L.)')
    formatted = formatted.replace(/\bSociedad Comercial de Responsabilidad Limitada\b(?!.*\(S\.R\.L\.\))/gi, 'Sociedad Comercial de Responsabilidad Limitada (S.R.L.)')
    
    formatted = formatted.replace(/\b(E\.I\.R\.L\.|EIRL)\b(?!.*\(E\.I\.R\.L\.\))/gi, 'Empresa Individual de Responsabilidad Limitada (E.I.R.L.)')
    formatted = formatted.replace(/\bEmpresa Individual de Responsabilidad Limitada\b(?!.*\(E\.I\.R\.L\.\))/gi, 'Empresa Individual de Responsabilidad Limitada (E.I.R.L.)')
    
    // IMPORTANTE: S.A. al final para no interferir con S.A.C. y S.A.A.
    formatted = formatted.replace(/\b(S\.A\.|SA)\b(?!\s*[AC]|\s*\(|\s*Cerrada|\s*Abierta|.*\(S\.A\.\))/gi, 'Sociedad Anónima (S.A.)')
    formatted = formatted.replace(/\bSociedad Anónima\b(?!\s*Cerrada|\s*Abierta|.*\(S\.A\.\))/gi, 'Sociedad Anónima (S.A.)')
    
    // Tipos adicionales de empresas en Perú - CON PROTECCIÓN ANTI-DUPLICACIÓN
    formatted = formatted.replace(/\b(S\. en C\.S\.)\b(?!.*\(S\. en C\.S\.\))/gi, 'Sociedad en Comandita Simple (S. en C.S.)')
    formatted = formatted.replace(/\bSociedad en Comandita Simple\b(?!.*\(S\. en C\.S\.\))/gi, 'Sociedad en Comandita Simple (S. en C.S.)')
    
    formatted = formatted.replace(/\b(S\. en C\.P\.A\.)\b(?!.*\(S\. en C\.P\.A\.\))/gi, 'Sociedad en Comandita por Acciones (S. en C.P.A.)')
    formatted = formatted.replace(/\bSociedad en Comandita por Acciones\b(?!.*\(S\. en C\.P\.A\.\))/gi, 'Sociedad en Comandita por Acciones (S. en C.P.A.)')
    
    formatted = formatted.replace(/\b(S\.C\.)\b(?!.*\(S\.C\.\))/gi, 'Sociedad Colectiva (S.C.)')
    formatted = formatted.replace(/\bSociedad Colectiva\b(?!.*\(S\.C\.\))/gi, 'Sociedad Colectiva (S.C.)')

    // ==================== ESPACIADO PROFESIONAL ====================
    // Asegurar espaciado adecuado después de títulos
    formatted = formatted.replace(/(\*[^*]+\*:)\n([^\n])/g, '$1\n\n$2')
    
    return formatted
  }

  /**
   * 📱 REGLAS ESTRICTAS DE FORMATO PARA WHATSAPP - VERSIÓN FINAL PERFECCIONADA
   * Solución definitiva al problema de texto amontonado
   */
  applyStrictWhatsAppFormatting(text) {
    let formatted = text.trim()
    
    console.log('🔧 Aplicando reglas estrictas de formato...')

    // 🚨 PASO 1: SEPARAR TÍTULOS PRINCIPALES DE GUIONES
    formatted = formatted.replace(/(• [^:]+:)\s*-\s*/g, '$1\n\n  - ')
    
    // 🚨 PASO 2: SEPARAR SUBTÍTULOS DE SU CONTENIDO
    formatted = formatted.replace(/(-\s*[^:]+:)\s*([A-ZÁÉÍÓÚ][^.]*\.)/g, '$1\n    $2')
    
    // 🚨 PASO 3: INDENTAR SUBTÍTULOS QUE EMPIEZAN CON GUIÓN
    formatted = formatted.replace(/^-\s*/gm, '  - ')
    
    // 🚨 PASO 4: SEPARAR ORACIONES LARGAS EN MÚLTIPLES SUBTÍTULOS
    formatted = formatted.replace(/\.\s*-\s*/g, '.\n\n  - ')
    
    // 🚨 PASO 5: ESPACIAR ENTRE SECCIONES PRINCIPALES
    formatted = formatted.replace(/\.\s*\n\s*(• [A-ZÁÉÍÓÚ])/g, '.\n\n$1')
    
    // 🚨 PASO 6: ASEGURAR CONTENIDO INDENTADO BAJO SUBTÍTULOS
    formatted = formatted.replace(/(  - [^:]+:)\n([A-ZÁÉÍÓÚ])/g, '$1\n    $2')
    
    // 🚨 PASO 7: ESPACIAR SUBTÍTULOS CONSECUTIVOS
    formatted = formatted.replace(/(\.)\n(  - [^:]+:)/g, '$1\n\n$2')
    
    // 🚨 PASO 8: CONVERTIR ESPACIOS MÚLTIPLES A SALTOS DE LÍNEA
    // Esto es crítico: cambiar los 4 espacios por saltos de línea + indentación
    formatted = formatted.replace(/    - /g, '\n\n  - ')
    formatted = formatted.replace(/    ([A-ZÁÉÍÓÚ])/g, '\n    $1')
    
    // 🚨 PASO 9: LIMPIAR INDENTACIONES INCORRECTAS SOLO DE TÍTULOS
    formatted = formatted.replace(/^\s+(•)/gm, '$1')
    
    // 🚨 PASO 10: NORMALIZAR ESPACIADO MÚLTIPLE FINAL
    formatted = formatted.replace(/\n{4,}/g, '\n\n\n')
    
    console.log('✅ Reglas aplicadas exitosamente')
    
    return formatted
  }

  /**
   * 📱 DIVIDIR MENSAJE EN PARTES SI ES MUY LARGO
   */
  splitIntoMessages(text) {
    if (text.length <= this.preferredLength) {
      return [text]
    }

    const messages = []
    const paragraphs = text.split('\n\n')
    let currentMessage = ''
    let messageIndex = 1

    for (const paragraph of paragraphs) {
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
   * 📄 AGREGAR PIE DE MENSAJE LIMPIO
   */
  addMessageFooter(message, index, hasMore) {
    if (hasMore) {
      return `${message}\n\n*Continúa en el siguiente mensaje... (${index})*`
    } else if (index > 1) {
      return `${message}\n\n*Consulta completa (${index}/${index})*\n\n¿Te gustaría profundizar en algún aspecto específico?`
    } else {
      return `${message}\n\n¿Hay algún otro tema en el que pueda ayudarte?`
    }
  }

  /**
   * 👋 FORMATEAR MENSAJE DE BIENVENIDA LIMPIO
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

    return `¡Hola ${clientName}!

*Soy tu Asesor Empresarial Especializado*

Estoy aquí para brindarte estrategias inteligentes y soluciones empresariales de alto nivel adaptadas a la realidad peruana.

*MIS ESPECIALIDADES:*

${availableSpecialties.map(specialty => `• ${specialty}`).join('\n')}

*¿Cómo puedo ayudarte hoy?*

Puedes consultarme sobre cualquier tema empresarial, fiscal, tributario o de inversiones. Estoy preparado para darte respuestas detalladas y estrategias específicas.

*¡Comencemos a optimizar tu estructura empresarial!*`
  }

  /**
   * 📊 FORMATEAR RESPUESTA FISCAL LIMPIA
   */
  formatFiscalResponse(text, fiscalContext = {}) {
    let formatted = text

    // Solo formatear términos fiscales importantes sin texto hardcodeado
    formatted = formatted.replace(/\b(IGV|Impuesto General a las Ventas)\b/gi, '*IGV (Impuesto General a las Ventas)*')
    formatted = formatted.replace(/\b(MYPE)\b/gi, '*MYPE (Micro y Pequeña Empresa)*')
    formatted = formatted.replace(/\b(RUC)\b/gi, '*RUC (Registro Único de Contribuyentes)*')

    return this.formatResponse(formatted, fiscalContext)
  }

  /**
   * 🏢 FORMATEAR RESPUESTA EMPRESARIAL LIMPIA
   */
  formatCorporateResponse(text, corporateContext = {}) {
    let formatted = text

    // Aplicar formateo limpio de estructuras empresariales
    return this.formatResponse(formatted, corporateContext)
  }

  /**
   * ⚠️ FORMATEAR MENSAJE DE ERROR LIMPIO
   */
  formatErrorMessage(error) {
    return `*Disculpa las molestias*

Estoy experimentando dificultades técnicas temporales en mi sistema de asesoría.

*Por favor:*
• Intenta reformular tu consulta empresarial
• O contacta directamente con nuestro equipo especializado

Estoy aquí para asesorarte en cuanto se resuelva el inconveniente técnico.

*Tu éxito empresarial es nuestra prioridad.*`
  }
}

module.exports = MessageFormatterCleaned