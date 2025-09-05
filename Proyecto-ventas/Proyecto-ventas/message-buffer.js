/**
 * 📦 MESSAGE BUFFER SERVICE CON REDIS
 * 
 * Sistema inteligente para consolidar mensajes múltiples del cliente
 * antes de generar una respuesta única y coherente.
 */

import { createClient } from 'redis'

class MessageBufferService {
  constructor(dbService = null) {
    this.client = null
    this.connected = false
    this.bufferTimers = new Map() // Timers locales como backup
    this.defaultBufferTime = 6000 // 🎯 RESTAURADO: 6 segundos por defecto para mejor consolidación
    this.maxBufferTime = 15000 // 🎯 RESTAURADO: 15 segundos máximo para mensajes múltiples
    this.adaptiveBufferTime = 8000 // 🎯 RESTAURADO: 8 segundos para buffer adaptativo
    this.consecutiveMessageCount = new Map() // Contador de mensajes consecutivos
    this.db = dbService // Para leer configuraciones
  }

  /**
   * 🔧 Configurar servicio de base de datos
   */
  setDatabaseService(dbService) {
    this.db = dbService
    console.log('🔧 MessageBuffer: Base de datos configurada')
  }

  /**
   * 🚀 Inicializar conexión Redis
   */
  async initialize() {
    try {
      console.log('🔄 Conectando a Redis...')
      
      this.client = createClient({
        socket: {
          host: 'redis-13843.c92.us-east-1-3.ec2.redns.redis-cloud.com',
          port: 13843
        },
        password: 'bLhYaBpGSX1h1m9UHXl119mGEs7aIZ6F',
        username: 'default'
      })

      this.client.on('error', (err) => {
        console.error('❌ Redis Error:', err)
        this.connected = false
      })

      this.client.on('connect', () => {
        console.log('🔗 Redis conectando...')
      })

      this.client.on('ready', () => {
        console.log('✅ Redis conectado y listo')
        this.connected = true
      })

      await this.client.connect()
      
      // Test de conexión
      await this.client.ping()
      console.log('🏓 Redis ping exitoso')
      
    } catch (error) {
      console.error('❌ Error inicializando Redis:', error)
      this.connected = false
    }
  }

  /**
   * 📝 Agregar mensaje al buffer
   */
  async addMessage(clientId, messageData, whatsappService) {
    try {
      const bufferKey = `message_buffer:${clientId}`
      const timerKey = `timer:${clientId}`
      
      // 🔧 VERIFICAR SI YA SE ESTÁ PROCESANDO UN BUFFER
      const bufferProcessingKey = `processing_buffer_${clientId}`
      if (global[bufferProcessingKey]) {
        console.log(`📦 Buffer ya en procesamiento para ${clientId}, ENCOLANDO mensaje: "${messageData.text}"`)
        
        // 🚨 CORRECCIÓN CRÍTICA: En lugar de rechazar, encolar el mensaje para procesamiento posterior
        if (!global[`pending_queue_${clientId}`]) {
          global[`pending_queue_${clientId}`] = []
        }
        
        global[`pending_queue_${clientId}`].push({
          messageData,
          timestamp: Date.now(),
          whatsappService
        })
        
        console.log(`📦 Mensaje encolado para procesamiento posterior (${global[`pending_queue_${clientId}`].length} en cola)`)
        
        // Configurar timer para procesar cola pendiente si el buffer principal no termina
        setTimeout(async () => {
          if (global[`pending_queue_${clientId}`] && global[`pending_queue_${clientId}`].length > 0) {
            console.log(`⏰ Procesando cola pendiente para ${clientId} (timeout de seguridad)`)
            await this.processPendingQueue(clientId)
          }
        }, 10000) // 10 segundos de timeout de seguridad
        
        return 'queued' // Indicar que se encoló
      }
      
      // Estructura del mensaje
      const messageEntry = {
        text: messageData.text,
        timestamp: Date.now(),
        messageId: messageData.messageId || Date.now(),
        state: messageData.state || 'unknown'
      }

      if (this.connected) {
        // Usar Redis si está disponible
        await this.addToRedisBuffer(bufferKey, messageEntry, clientId, whatsappService)
      } else {
        // Fallback a sistema local
        await this.addToLocalBuffer(clientId, messageEntry, whatsappService)
      }

      return true // Mensaje agregado exitosamente

    } catch (error) {
      console.error('❌ Error agregando mensaje al buffer:', error)
      // Fallback: procesar inmediatamente
      return false
    }
  }

  /**
   * 📦 Agregar a buffer Redis
   */
  async addToRedisBuffer(bufferKey, messageEntry, clientId, whatsappService) {
    try {
      // Obtener buffer actual
      const currentBuffer = await this.client.get(bufferKey)
      const messages = currentBuffer ? JSON.parse(currentBuffer) : []
      
      // Agregar nuevo mensaje
      messages.push(messageEntry)
      
      // Guardar buffer actualizado con TTL ampliado
      await this.client.setEx(bufferKey, 25, JSON.stringify(messages))
      
      console.log(`📦 Mensaje agregado al buffer Redis para ${clientId} (${messages.length} mensajes)`)

      // 🔄 SISTEMA DE RESETEO ADAPTATIVO
      // Contar mensajes consecutivos
      const consecutiveCount = this.consecutiveMessageCount.get(clientId) || 0
      this.consecutiveMessageCount.set(clientId, consecutiveCount + 1)
      
      // Cancelar timer anterior si existe (RESETEO CLAVE)
      const existingTimer = this.bufferTimers.get(clientId)
      if (existingTimer) {
        clearTimeout(existingTimer)
        console.log(`🔄 [RESETEO ADAPTATIVO] Timer anterior cancelado para ${clientId} (mensaje consecutivo #${consecutiveCount + 1})`)
      }

      // 👀 Mostrar indicador visual si es el primer mensaje del buffer
      if (messages.length === 1) {
        try {
          await whatsappService.sendTyping(clientId)
          console.log(`👀 Indicador "escribiendo..." enviado para ${clientId}`)
        } catch (error) {
          console.error('❌ Error enviando indicador visual:', error)
        }
      }

      // 🎯 CALCULAR TIEMPO DE BUFFER ADAPTATIVO
      // Más mensajes consecutivos = más tiempo de espera
      let adaptiveTime = this.getAdaptiveBufferTime(consecutiveCount + 1)
      
      console.log(`🎯 [BUFFER ADAPTATIVO] Esperando ${adaptiveTime}ms para ${clientId} (${consecutiveCount + 1} mensajes consecutivos)`)
      
      // Crear nuevo timer adaptativo
      const timer = setTimeout(async () => {
        console.log(`⏰ [TIMEOUT] Procesando buffer para ${clientId} después de ${adaptiveTime}ms de espera`)
        
        // Limpiar contador de mensajes consecutivos
        this.consecutiveMessageCount.delete(clientId)
        
        await this.processBuffer(clientId, whatsappService)
      }, adaptiveTime)

      this.bufferTimers.set(clientId, timer)
      
    } catch (error) {
      console.error('❌ Error en Redis buffer:', error)
      throw error
    }
  }

  /**
   * 💾 Agregar a buffer local (fallback)
   */
  async addToLocalBuffer(clientId, messageEntry, whatsappService) {
    try {
      // Implementación local simple como backup
      const bufferKey = `local_buffer_${clientId}`
      
      if (!global[bufferKey]) {
        global[bufferKey] = []
      }
      
      global[bufferKey].push(messageEntry)
      
      console.log(`📦 Mensaje agregado al buffer local para ${clientId}`)

      // 🔄 SISTEMA DE RESETEO ADAPTATIVO (MISMO SISTEMA QUE REDIS)
      const consecutiveCount = this.consecutiveMessageCount.get(clientId) || 0
      this.consecutiveMessageCount.set(clientId, consecutiveCount + 1)
      
      // Timer local con reseteo
      const existingTimer = this.bufferTimers.get(clientId)
      if (existingTimer) {
        clearTimeout(existingTimer)
        console.log(`🔄 [RESETEO ADAPTATIVO LOCAL] Timer cancelado para ${clientId} (mensaje #${consecutiveCount + 1})`)
      }

      // 👀 Mostrar indicador visual si es el primer mensaje del buffer
      if (global[bufferKey].length === 1) {
        try {
          await whatsappService.sendTyping(clientId)
          console.log(`👀 Indicador "escribiendo..." enviado para ${clientId} (local)`)
        } catch (error) {
          console.error('❌ Error enviando indicador visual:', error)
        }
      }

      // Usar tiempo adaptativo igual que Redis
      const adaptiveTime = this.getAdaptiveBufferTime(consecutiveCount + 1)
      console.log(`🎯 [BUFFER LOCAL ADAPTATIVO] Esperando ${adaptiveTime}ms para ${clientId} (${consecutiveCount + 1} mensajes consecutivos)`)
      
      const timer = setTimeout(async () => {
        console.log(`⏰ [TIMEOUT LOCAL] Procesando buffer local para ${clientId} después de ${adaptiveTime}ms de espera`)
        this.consecutiveMessageCount.delete(clientId)
        await this.processLocalBuffer(clientId, whatsappService)
      }, adaptiveTime)

      this.bufferTimers.set(clientId, timer)
      
    } catch (error) {
      console.error('❌ Error en buffer local:', error)
      throw error
    }
  }

  /**
   * ⚙️ Obtener tiempo de buffer configurado
   */
  async getBufferTime() {
    try {
      if (this.db) {
        // Leer configuraciones de tiempo de respuesta
        const delayEnabled = await this.db.getConfig('response_delay_enabled')

        if (delayEnabled === 'true') {
          const minDelay = parseInt(await this.db.getConfig('response_delay_min')) || 2
          const maxDelay = parseInt(await this.db.getConfig('response_delay_max')) || 4

          // Usar el tiempo máximo configurado como base para el buffer
          // Agregar 1-2 segundos adicionales para consolidación
          const bufferTime = (maxDelay * 1000) + 1500

          console.log(`⚙️ Tiempo de buffer calculado: ${bufferTime}ms (basado en delay máximo: ${maxDelay}s)`)
          return Math.min(bufferTime, this.maxBufferTime)
        }
      }

      // Usar tiempo por defecto si no hay configuración
      return this.defaultBufferTime
    } catch (error) {
      console.error('❌ Error obteniendo tiempo de buffer:', error)
      return this.defaultBufferTime
    }
  }

  /**
   * 🎯 Calcular tiempo de buffer adaptativo basado en mensajes consecutivos
   * 🎯 OPTIMIZADO: Tiempos más rápidos para mejor experiencia de usuario
   */
  getAdaptiveBufferTime(consecutiveCount) {
    // Tiempo base RESTAURADO para mejor consolidación
    let baseTime = this.adaptiveBufferTime // 8 segundos (restaurado)
    
    // Incrementar tiempo por cada mensaje consecutivo
    // 1er mensaje: 8 segundos
    // 2do mensaje: 10 segundos  
    // 3er mensaje: 12 segundos
    // 4to+ mensaje: 15 segundos máximo
    const adaptiveIncrement = Math.min(consecutiveCount - 1, 3) * 2000 // 🎯 RESTAURADO: 2s por mensaje
    const finalTime = Math.min(baseTime + adaptiveIncrement, this.maxBufferTime)
    
    console.log(`🎯 BUFFER CONSOLIDADO: ${consecutiveCount} mensajes → ${finalTime}ms (máx: ${this.maxBufferTime}ms)`)
    return finalTime
  }

  /**
   * 🔄 Procesar buffer Redis
   */
  async processBuffer(clientId, whatsappService) {
    try {
      const bufferKey = `message_buffer:${clientId}`
      
      if (this.connected) {
        const bufferData = await this.client.get(bufferKey)
        
        if (bufferData) {
          const messages = JSON.parse(bufferData)
          
          if (messages.length > 0) {
            console.log(`🧠 Procesando buffer para ${clientId} con ${messages.length} mensajes`)
            
            // Consolidar mensajes
            const consolidatedMessage = this.consolidateMessages(messages)
            
            // Limpiar buffer
            await this.client.del(bufferKey)
            
            // Procesar mensaje consolidado
            await this.processConsolidatedMessage(clientId, consolidatedMessage, whatsappService)
          }
        }
      }
      
      // Limpiar timer y contador de mensajes consecutivos
      this.bufferTimers.delete(clientId)
      this.consecutiveMessageCount.delete(clientId)
      
    } catch (error) {
      console.error('❌ Error procesando buffer:', error)
      this.bufferTimers.delete(clientId)
      this.consecutiveMessageCount.delete(clientId)
    }
  }

  /**
   * 🔄 Procesar buffer local
   */
  async processLocalBuffer(clientId, whatsappService) {
    try {
      const bufferKey = `local_buffer_${clientId}`
      const messages = global[bufferKey] || []
      
      if (messages.length > 0) {
        console.log(`🧠 Procesando buffer local para ${clientId} con ${messages.length} mensajes`)
        
        // Consolidar mensajes
        const consolidatedMessage = this.consolidateMessages(messages)
        
        // Limpiar buffer
        delete global[bufferKey]
        
        // Procesar mensaje consolidado
        await this.processConsolidatedMessage(clientId, consolidatedMessage, whatsappService)
      }
      
      // Limpiar timer y contador de mensajes consecutivos
      this.bufferTimers.delete(clientId)
      this.consecutiveMessageCount.delete(clientId)
      
    } catch (error) {
      console.error('❌ Error procesando buffer local:', error)
      this.bufferTimers.delete(clientId)
      this.consecutiveMessageCount.delete(clientId)
    }
  }

  /**
   * 🧠 Consolidar múltiples mensajes en uno CON PRESERVACIÓN DE CONTEXTO
   */
  consolidateMessages(messages) {
    // Ordenar por timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp)
    
    // Unir textos con espacios
    const consolidatedText = messages
      .map(msg => msg.text.trim())
      .filter(text => text.length > 0)
      .join(' ')
    
    // Usar el estado del último mensaje
    const lastMessage = messages[messages.length - 1]
    
    // 🧠 PRESERVAR INFORMACIÓN CONTEXTUAL
    const contextInfo = {
      messageCount: messages.length,
      timeSpan: lastMessage.timestamp - messages[0].timestamp,
      containsTechnicalQuestions: messages.some(msg => this.isTechnicalQuestion(msg.text)),
      hasProductReferences: messages.some(msg => this.hasExplicitProductReference(msg.text))
    }
    
    return {
      text: consolidatedText,
      originalMessages: messages,
      messageCount: messages.length,
      state: lastMessage.state,
      firstTimestamp: messages[0].timestamp,
      lastTimestamp: lastMessage.timestamp,
      contextInfo: contextInfo // Información adicional para preservar contexto
    }
  }

  /**
   * 📤 Procesar mensaje consolidado CON PRESERVACIÓN DE CONTEXTO
   */
  async processConsolidatedMessage(clientId, consolidatedMessage, whatsappService) {
    try {
      console.log(`📤 Procesando mensaje consolidado: "${consolidatedMessage.text}"`)
      
      // 🧠 PRESERVAR CONTEXTO: Obtener contexto conversacional antes del procesamiento
      const conversationData = await whatsappService.getConversationData(clientId)
      
      // 🎯 CONTEXTO ENRIQUECIDO: Añadir información del contexto al mensaje consolidado
      let contextualMessage = consolidatedMessage.text
      
      // 🚨 PRIORIDAD 1: VERIFICAR SI HAY SOLICITUD ESPECÍFICA DE PRODUCTO
      const hasSpecificRequest = this.hasSpecificProductRequest(consolidatedMessage.text)
      
      if (hasSpecificRequest) {
        console.log(`🎯 [CONTEXT FIX] Solicitud específica detectada: "${consolidatedMessage.text}" - NO aplicando contexto previo`)
        // NO aplicar contexto previo, dejar que el sistema procese la solicitud específica limpiamente
      } else {
        // Solo aplicar contexto previo si NO hay solicitud específica
        console.log(`🧠 [CONTEXT] No hay solicitud específica, aplicando contexto previo si aplica`)
        
        // Si hay productos de interés o mostrados, añadir contexto implícito
        if (conversationData.interested_products && conversationData.interested_products.length > 0) {
          const lastInterestProduct = conversationData.interested_products[conversationData.interested_products.length - 1]
          console.log(`🧠 CONTEXTO PRESERVADO: Último producto de interés: ${lastInterestProduct.name}`)
          
          // Verificar si el mensaje consolidado hace referencia implícita al producto
          if (this.isImplicitProductReference(consolidatedMessage.text, lastInterestProduct)) {
            contextualMessage = `[CONTEXTO: Refiriéndose a ${lastInterestProduct.name}] ${consolidatedMessage.text}`
            console.log(`🎯 CONTEXTO AÑADIDO: ${contextualMessage}`)
          }
        }
        
        // Si hay productos mostrados recientemente, también preservar ese contexto
        if (conversationData.displayed_products && conversationData.displayed_products.length > 0) {
          const lastDisplayedProduct = conversationData.displayed_products[conversationData.displayed_products.length - 1]
          console.log(`🧠 CONTEXTO PRESERVADO: Último producto mostrado: ${lastDisplayedProduct.name}`)
          
          // Verificar si el mensaje hace referencia técnica sin contexto explícito
          if (this.isTechnicalQuestion(consolidatedMessage.text) && !this.hasExplicitProductReference(consolidatedMessage.text)) {
            contextualMessage = `[CONTEXTO: Pregunta sobre ${lastDisplayedProduct.name}] ${consolidatedMessage.text}`
            console.log(`🎯 CONTEXTO TÉCNICO AÑADIDO: ${contextualMessage}`)
          }
        }
      }

      // 🔧 CORREGIDO: Marcar que estamos procesando un buffer para evitar duplicados
      const bufferProcessingKey = `processing_buffer_${clientId}`
      global[bufferProcessingKey] = true
      
      try {
        // 🚫 NO llamar a handleIncomingMessage para evitar bucle infinito
        // En su lugar, llamar directamente al procesamiento sin buffer
        await whatsappService.processMessageDirectly(clientId, contextualMessage, 'consolidated')
      } finally {
        // 🔧 Limpiar flag de procesamiento
        delete global[bufferProcessingKey]
        
        // 📦 PROCESAR COLA PENDIENTE si existe
        await this.processPendingQueue(clientId)
      }

    } catch (error) {
      console.error('❌ Error procesando mensaje consolidado:', error)
      // Limpiar flag en caso de error
      delete global[`processing_buffer_${clientId}`]
    }
  }

  /**
   * 🎯 NUEVO: Detectar si un mensaje hace referencia implícita a un producto
   */
  isImplicitProductReference(messageText, product) {
    const message = messageText.toLowerCase()
    const productName = product.name.toLowerCase()
    
    // Detectar referencias técnicas que podrían estar relacionadas con el producto
    const technicalKeywords = ['graba', '4k', 'video', 'camara', 'cámara', 'bateria', 
      'batería', 'memoria', 'almacenamiento', 'dura', 'tiempo', 'viajes', 'resistencia',
      'agua', 'precio', 'cuesta', 'vale', 'barato', 'caro', 'especificaciones']
    
    const hasTechnicalKeyword = technicalKeywords.some(keyword => message.includes(keyword))
    
    // Si es una pregunta técnica y no hay referencia explícita a otro producto
    return hasTechnicalKeyword && !this.hasExplicitProductReference(messageText)
  }

  /**
   * 🎯 NUEVO: Detectar si un mensaje es una pregunta técnica
   */
  isTechnicalQuestion(messageText) {
    const message = messageText.toLowerCase()
    const technicalKeywords = ['graba', '4k', 'video', 'camara', 'cámara', 'bateria', 
      'batería', 'memoria', 'almacenamiento', 'dura', 'tiempo', 'viajes', 'resistencia',
      'agua', 'calidad', 'especificaciones', 'características']
    
    const questionWords = ['que', 'qué', 'como', 'cómo', 'cuanto', 'cuánto', 'puede', 'es']
    
    const hasTechnicalKeyword = technicalKeywords.some(keyword => message.includes(keyword))
    const hasQuestionWord = questionWords.some(word => message.includes(word))
    
    return hasTechnicalKeyword && hasQuestionWord
  }

  /**
   * 🎯 NUEVO: Detectar si un mensaje tiene referencia explícita a un producto
   */
  hasExplicitProductReference(messageText) {
    const message = messageText.toLowerCase()
    const productReferences = ['iphone 14', 'iphone 15', 'iphone 16', 'samsung', 'xiaomi', 'huawei']
    
    return productReferences.some(ref => message.includes(ref))
  }

  /**
   * 🎯 MEJORADO: Detectar si hay solicitud específica de producto (PRIORIDAD ALTA)
   */
  hasSpecificProductRequest(messageText) {
    const text = messageText.toLowerCase().trim()
    
    // 📝 PATRONES DE SOLICITUD ESPECÍFICA
    const specificPatterns = [
      // Patrones de búsqueda directa
      /busco\s+(un\s+)?(.+)/,
      /quiero\s+(un\s+|el\s+)?(.+)/,
      /necesito\s+(un\s+|el\s+)?(.+)/,
      /me\s+interesa\s+(un\s+|el\s+)?(.+)/,
      /tienes?\s+(un\s+|el\s+)?(.+)/,
      /hay\s+(un\s+|algún\s+)?(.+)/,
      
      // Productos específicos
      /iphone\s+\d+/,
      /samsung\s+galaxy/,
      /xiaomi\s+\w+/,
      /huawei\s+\w+/,
      /poco\s+\w+/,
      
      // Especificaciones técnicas
      /\d+\s*gb/,
      /pro\s+max/,
      /\d+\s*mp/,
      /\d+\s*pulgadas/
    ]
    
    const hasSpecificPattern = specificPatterns.some(pattern => pattern.test(text))
    
    if (hasSpecificPattern) {
      console.log(`🎯 [SPECIFIC REQUEST] Solicitud específica detectada: "${messageText}"`);
      return true
    }
    
    // 🚷 EXCLUSIONES: Mensajes que NO son solicitudes específicas
    const nonSpecificPatterns = [
      /^(hola|hi|hey|buenos?)\s*$/,
      /^(sí|si|no|ok|vale)\s*$/,
      /^(gracias|thank)\s*/,
      /^(cuánto\s+cuesta|precio)\s*$/,
      /^(tienes\s+stock|hay\s+stock)\s*$/,
      /^(sí\s+me\s+interesa|quiero\s+comprarlo)\s*$/
    ]
    
    const isNonSpecific = nonSpecificPatterns.some(pattern => pattern.test(text))
    
    if (isNonSpecific) {
      console.log(`🚷 [SPECIFIC REQUEST] Mensaje NO específico: "${messageText}"`);
      return false
    }
    
    // 🔍 VALIDACIÓN FINAL: Palabras clave de producto
    const productKeywords = [
      'iphone', 'samsung', 'xiaomi', 'huawei', 'poco', 'redmi',
      'galaxy', 'note', 'pro', 'max', 'plus', 'ultra',
      'celular', 'teléfono', 'smartphone', 'móvil'
    ]
    
    const hasProductKeyword = productKeywords.some(keyword => text.includes(keyword))
    
    if (hasProductKeyword) {
      console.log(`🔍 [SPECIFIC REQUEST] Palabra clave de producto detectada en: "${messageText}"`);
      return true
    }
    
    return false
  }

  /**
   * 🧠 Determinar si un mensaje debe ser bufferizado
   */
  shouldBuffer(clientId, messageText, currentState) {
    const trimmedMessage = messageText.trim()

    // Criterios para NO bufferizar (procesamiento inmediato)
    const noBufferCriteria = [
      // Estados críticos donde la respuesta debe ser inmediata
      currentState === 'confirming',
      currentState === 'specifying', // ⭐ CRÍTICO: No bufferizar cuando se especifica cantidad
      currentState === 'payment',
      currentState === 'awaiting_shipping',
      currentState === 'admin_auth',
      currentState === 'admin_menu',
      currentState === 'asking_name', // ⭐ CRÍTICO: No bufferizar nombres

      // Mensajes largos (probablemente completos)
      trimmedMessage.length > 120,

      // Confirmaciones explícitas
      /^(sí|si|no|confirmo|cancelar|ok|vale|perfecto|correcto|incorrecto)$/i.test(trimmedMessage),

      // Respuestas a preguntas específicas (números solos, colores, etc.)
      /^(1|2|3|4|5|6|7|8|9|10)$/i.test(trimmedMessage) && (currentState === 'interested' || currentState === 'specifying'),
      /^(negro|blanco|azul|rojo|verde|dorado|plateado|rosa|morado|titanio)$/i.test(trimmedMessage),

      // Información personal (teléfonos, direcciones)
      /\d{9,}/.test(trimmedMessage),
      /calle|avenida|jr\.|av\.|distrito|provincia/i.test(trimmedMessage),

      // URLs o enlaces
      /https?:\/\//.test(trimmedMessage),

      // Comandos administrativos
      /^(admin|help|ayuda|menu|salir)$/i.test(trimmedMessage),

      // Saludos iniciales (primera interacción)
      currentState === 'initial' && /^(hola|buenos|buenas|hi|hello)$/i.test(trimmedMessage),

      // Mensajes de una sola palabra muy específicos
      /^(gracias|thanks|bye|chau|adiós)$/i.test(trimmedMessage)
    ]

    // Criterios adicionales para SÍ bufferizar (mensajes que se benefician de consolidación)
    const shouldBufferCriteria = [
      // Mensajes cortos que podrían ser parte de una secuencia
      trimmedMessage.length < 50 && trimmedMessage.length > 2,

      // Estados donde es común enviar múltiples mensajes
      currentState === 'browsing' || currentState === 'inquiring',

      // Mensajes que parecen incompletos
      trimmedMessage.endsWith('...') || trimmedMessage.endsWith(','),

      // Preguntas que podrían tener seguimiento
      trimmedMessage.includes('?') && trimmedMessage.length < 80
    ]

    // Si hay criterios explícitos para NO bufferizar, no bufferizar
    if (noBufferCriteria.some(criteria => criteria)) {
      console.log(`🚫 No bufferizar: "${trimmedMessage}" (criterio de exclusión aplicado)`)
      return false
    }

    // Si hay criterios para SÍ bufferizar, bufferizar
    if (shouldBufferCriteria.some(criteria => criteria)) {
      console.log(`📦 Bufferizar: "${trimmedMessage}" (criterio de inclusión aplicado)`)
      return true
    }

    // Por defecto, no bufferizar si no hay criterios claros
    console.log(`⚖️ Procesamiento inmediato por defecto: "${trimmedMessage}"`)
    return false
  }

  /**
   * 🧹 Limpiar buffer manualmente
   */
  async clearBuffer(clientId) {
    try {
      if (this.connected) {
        await this.client.del(`message_buffer:${clientId}`)
      }
      
      delete global[`local_buffer_${clientId}`]
      
      const timer = this.bufferTimers.get(clientId)
      if (timer) {
        clearTimeout(timer)
        this.bufferTimers.delete(clientId)
      }
      
      console.log(`🧹 Buffer limpiado para ${clientId}`)
      
    } catch (error) {
      console.error('❌ Error limpiando buffer:', error)
    }
  }

  /**
   * 📊 Obtener estadísticas del buffer
   */
  async getBufferStats(clientId) {
    try {
      if (this.connected) {
        const bufferData = await this.client.get(`message_buffer:${clientId}`)
        if (bufferData) {
          const messages = JSON.parse(bufferData)
          return {
            messageCount: messages.length,
            oldestMessage: messages[0]?.timestamp,
            newestMessage: messages[messages.length - 1]?.timestamp,
            hasTimer: this.bufferTimers.has(clientId)
          }
        }
      }
      
      return { messageCount: 0, hasTimer: false }
      
    } catch (error) {
      console.error('❌ Error obteniendo stats del buffer:', error)
      return { messageCount: 0, hasTimer: false }
    }
  }

  /**
   * 📦 Procesar cola de mensajes pendientes
   * CORRECCIÓN: Evitar pérdida de mensajes durante procesamiento de buffer
   */
  async processPendingQueue(clientId) {
    try {
      const queueKey = `pending_queue_${clientId}`
      const pendingMessages = global[queueKey]
      
      if (!pendingMessages || pendingMessages.length === 0) {
        return // No hay mensajes pendientes
      }
      
      console.log(`📦 Procesando ${pendingMessages.length} mensajes pendientes para ${clientId}`)
      
      // Tomar el primer mensaje de la cola
      const { messageData, whatsappService } = pendingMessages.shift()
      
      // Si la cola está vacía, limpiarla
      if (pendingMessages.length === 0) {
        delete global[queueKey]
      }
      
      // Procesar el mensaje pendiente
      console.log(`📦 Procesando mensaje pendiente: "${messageData.text}"`)
      
      // Procesar directamente sin buffer (ya pasó por buffer)
      await whatsappService.processMessageDirectly(clientId, messageData.text, 'queued')
      
    } catch (error) {
      console.error('❌ Error procesando cola pendiente:', error)
      // Limpiar cola en caso de error para evitar bucles
      delete global[`pending_queue_${clientId}`]
    }
  }

  /**
   * 🔌 Cerrar conexión
   */
  async disconnect() {
    try {
      if (this.client && this.connected) {
        await this.client.disconnect()
        console.log('🔌 Redis desconectado')
      }
    } catch (error) {
      console.error('❌ Error desconectando Redis:', error)
    }
  }
}

// Instancia singleton
const messageBufferService = new MessageBufferService()

export default messageBufferService
