import { makeWASocket, DisconnectReason, useMultiFileAuthState, downloadContentFromMessage } from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import semanticSearchService from './semantic-search.js'
import messageBufferService from './message-buffer.js'
import productMemoryService from './product-memory.service.js'
import SemanticContextManager from './semantic-context-manager.js'
import ReinforcementLearningEngine from './reinforcement-learning-engine.js'
import AdaptivePersonalitySystem from './adaptive-personality-system.js'
import continuousLearningCoordinator from './continuous-learning-coordinator.js'
import SessionMemoryService from './session-memory.service.js' // 🧠 NUEVO: Servicio de memoria de sesión
import DualMemoryService from './dual-memory.service.js' // 🧠🔄 NUEVO: Sistema de memoria dual
import ClientInterestTracker from './ClientInterestTracker.js' // 🎯 NUEVO: Rastreador de productos de interés
import ContextSynchronizer from './context-synchronizer.js' // 🔄 NUEVO: Sincronizador de contexto unificado

export class WhatsAppService {
  constructor(io, geminiService, inventoryService, orderService, dbService, salesService = null, vipService = null) {
    this.io = io
    this.gemini = geminiService
    this.inventory = inventoryService
    this.orders = orderService
    this.db = dbService
    this.sales = salesService
    this.vip = vipService // ✅ AGREGADO: Servicio VIP
    this.googleDrive = null // Se establecerá después con setGoogleDriveService
    this.sock = null
    this.qr = null
    this.isConnected = false
    this.messageCount = 0
    // 📦 PEDIDOS PENDIENTES - MIGRADO A SUPABASE (sin Maps en RAM)
    // Ya no usamos Maps - todo se persiste en tabla orders

    // Control de reconexiones para evitar bucles infinitos
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000 // Delay inicial
    this.isReconnecting = false
    this.lastDisconnectReason = null

    // ✅ Sistema de estados de conversación migrado a Supabase
    // Ya no usamos Maps en RAM - todo se persiste en base de datos

    // Servicio de búsqueda semántica
    this.semanticSearch = semanticSearchService

    // Servicio de buffer de mensajes
    this.messageBuffer = messageBufferService

    // 🧠 Servicio de memoria de productos
    this.productMemory = productMemoryService

    // 🧠 NUEVO: Servicio de memoria de sesión temporal
    this.sessionMemory = new SessionMemoryService(this.db)

    // 🧠🔄 NUEVO: Sistema de memoria dual (VIP vs Inventario)
    this.dualMemory = new DualMemoryService(this.db)

    // 🎯 NUEVO: Rastreador de productos de interés
    this.interestTracker = new ClientInterestTracker()
    
    // 🔄 NUEVO: Sincronizador de contexto unificado
    this.contextSynchronizer = new ContextSynchronizer(this.db, this.sessionMemory, this.dualMemory)
    
    // 🚫 NUEVO: Control de flujo único para evitar respuestas duplicadas
    this.processingMessages = new Map() // clientId -> timestamp

    // 🧠 Gestor de contexto semántico con Supabase
    this.contextManager = new SemanticContextManager(this.db)

    // 🧠 Motor de aprendizaje por refuerzo con Supabase
    this.rlEngine = new ReinforcementLearningEngine(this.db)

    // 🎭 Sistema de personalidad adaptativa con Supabase
    this.personalitySystem = new AdaptivePersonalitySystem(this.db)

    // 🔄 Coordinador de aprendizaje continuo
    this.learningCoordinator = continuousLearningCoordinator

    // Estados posibles
    this.STATES = {
      INITIAL: 'initial',           // Primera interacción
      ASKING_NAME: 'asking_name',   // Solicitando nombre del cliente
      BROWSING: 'browsing',         // Viendo productos
      INQUIRING: 'inquiring',       // 🔍 NUEVO: Indagando/preguntando sin intención de compra inmediata
      INTERESTED: 'interested',     // Mostró interés en algo
      SPECIFYING: 'specifying',     // Especificando producto/cantidad
      CONFIRMING: 'confirming',     // Esperando confirmación final
      PAYMENT: 'payment',           // Esperando pago
      AWAITING_SHIPPING: 'awaiting_shipping', // 🚚 Esperando dirección de envío y/o comprobante
      COMPLETED: 'completed',       // Pedido completado, listo para despedida
      EMOTIONAL_SUPPORT: 'emotional_support', // 🎭 Estado temporal para apoyo emocional
      AWAITING_SPECIALIST: 'awaiting_specialist', // 📞 Esperando datos para atención especializada

      // 🌟 ESTADOS VIP CAMPAIGN (NUEVOS)
      VIP_CAMPAIGN_RESPONSE: 'vip_campaign_response',     // Esperando respuesta a campaña VIP
      VIP_OFFER_INTERESTED: 'vip_offer_interested',       // Cliente interesado en oferta VIP
      VIP_OFFER_DECLINED: 'vip_offer_declined',           // Cliente rechazó oferta VIP
      VIP_PURCHASE_INTENT: 'vip_purchase_intent',         // Cliente quiere comprar producto VIP específico

      // 🔐 ESTADOS ADMINISTRATIVOS (NUEVOS)
      ADMIN_AUTH: 'admin_auth',                 // Solicitando código de autorización
      ADMIN_MENU: 'admin_menu',                 // Menú administrativo principal
      ADMIN_ADD_PRODUCT: 'admin_add_product',   // Creando nuevo producto
      ADMIN_UPDATE_PRODUCT: 'admin_update_product', // Actualizando producto existente
      ADMIN_UPDATE_STOCK: 'admin_update_stock', // Actualizando stock
      ADMIN_QUERY_STATS: 'admin_query_stats',   // Consultando estadísticas
      ADMIN_LIST_PRODUCTS: 'admin_list_products' // Listando productos para gestión
    }

    // ✅ Sistema de control migrado a Supabase
    // - Estados emocionales: tabla emotional_timeouts
    // - Tracking de imágenes: tabla sent_content_tracking
    // - Descripciones de productos: tabla sent_content_tracking

    // Crear directorio para auth si no existe
    if (!fs.existsSync('./auth_info_baileys')) {
      fs.mkdirSync('./auth_info_baileys')
    }
  }

  // Método para establecer referencia de GoogleDriveService
  setGoogleDriveService(googleDriveService) {
    this.googleDrive = googleDriveService
  }

  /**
   * 🔍 Inicializar búsqueda semántica (SIN CACHE)
   */
  async initializeSemanticSearch() {
    try {
      // 🔥 PASAR REFERENCIA DEL SERVICIO, NO LOS DATOS
      await this.semanticSearch.initialize(this.inventory)
      console.log('🔍 Búsqueda semántica inicializada SIN CACHE - Datos siempre frescos')
      
      // 🧠 NUEVO: Inicializar Sistema de Memoria de Sesión
      await this.sessionMemory.initialize()
      
      // 🧠🔄 NUEVO: Inicializar Sistema de Memoria Dual
      await this.dualMemory.initialize()
      
      // 🧠 Inicializar Semantic Context Manager con Supabase
      await this.contextManager.initialize()
      
      // 🧠 Inicializar Reinforcement Learning Engine con Supabase
      await this.rlEngine.initialize()
      
      // 🎭 Inicializar Adaptive Personality System con Supabase
      await this.personalitySystem.initialize()
      
      // 🔄 Inicializar Continuous Learning Coordinator
      this.learningCoordinator.initialize(
        this.contextManager,
        this.rlEngine,
        this.personalitySystem
      )
      
      // 📊 Verificar tablas de aprendizaje
      await this.initializeLearningTables()
      
    } catch (error) {
      console.error('Error inicializando búsqueda semántica:', error)
    }
  }

  /**
   * 📊 Verificar e inicializar tablas de aprendizaje en Supabase
   */
  async initializeLearningTables() {
    try {
      console.log('📊 Verificando tablas de aprendizaje en Supabase...')
      
      // Verificar semantic_context
      const { data: semanticData, error: semanticError } = await this.db.client
        .from('semantic_context')
        .select('id')
        .limit(1)
      
      if (semanticError) {
        console.log('📋 Tabla semantic_context no encontrada o vacía')
      } else {
        console.log(`📊 semantic_context: ${semanticData?.length || 0} registros`)
      }
      
      // Verificar learning_sessions
      const { data: learningData, error: learningError } = await this.db.client
        .from('learning_sessions')
        .select('id')
        .limit(1)
      
      if (learningError) {
        console.log('📋 Tabla learning_sessions no encontrada o vacía')
      } else {
        console.log(`📊 learning_sessions: ${learningData?.length || 0} registros`)
      }
      
      // Verificar reinforcement_learning
      const { data: rlData, error: rlError } = await this.db.client
        .from('reinforcement_learning')
        .select('id')
        .limit(1)
      
      if (rlError) {
        console.log('📋 Tabla reinforcement_learning no encontrada o vacía')
      } else {
        console.log(`📊 reinforcement_learning: ${rlData?.length || 0} registros`)
      }
      
      console.log('✅ Verificación de tablas de aprendizaje completada')
      
    } catch (error) {
      console.error('Error inicializando búsqueda semántica:', error)
    }
  }

  // 💾 Métodos para manejar estados de conversación - MIGRADO A SUPABASE
  async getConversationState(clientId) {
    try {
      const { data, error } = await this.db.client
        .from('conversation_states')
        .select('current_state')
        .eq('client_id', clientId)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error obteniendo estado de conversación:', error)
      }
      
      return data?.current_state || this.STATES.INITIAL
    } catch (error) {
      console.error('Error en getConversationState:', error)
      return this.STATES.INITIAL
    }
  }

  async setConversationState(clientId, state, data = {}) {
    try {
      const { error } = await this.db.client
        .from('conversation_states')
        .upsert({
          client_id: clientId,
          current_state: state,
          state_data: data,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'client_id'
        })
      
      if (error) {
        console.error('Error guardando estado de conversación:', error)
      } else {
        console.log(`🔄 Estado de ${clientId}: ${state} (guardado en Supabase)`)
      }
    } catch (error) {
      console.error('Error en setConversationState:', error)
    }
  }

  async getConversationData(clientId) {
    try {
      const { data, error } = await this.db.client
        .from('conversation_states')
        .select('state_data')
        .eq('client_id', clientId)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error obteniendo datos de conversación:', error)
      }
      
      return data?.state_data || {}
    } catch (error) {
      console.error('Error en getConversationData:', error)
      return {}
    }
  }

  async clearConversationState(clientId) {
    try {
      // Limpiar estado de conversación
      await this.db.client
        .from('conversation_states')
        .delete()
        .eq('client_id', clientId)
      
      // Limpiar historial de conversación
      await this.db.client
        .from('conversation_history')
        .delete()
        .eq('client_id', clientId)
      
      // Limpiar tracking de contenido
      await this.db.client
        .from('sent_content_tracking')
        .delete()
        .eq('client_id', clientId)
      
      console.log(`🧹 Estado completo limpiado para ${clientId} (Supabase)`)
    } catch (error) {
      console.error('Error en clearConversationState:', error)
    }
  }

  // 💾 Métodos para manejar historial de conversación - MIGRADO A SUPABASE
  async addToHistory(clientId, role, message) {
    try {
      // Guardar en Supabase
      const { error } = await this.db.client
        .from('conversation_history')
        .insert({
          client_id: clientId,
          role: role,
          message: message,
          timestamp: new Date().toISOString()
        })
      
      if (error) {
        console.error('Error guardando historial:', error)
      }
      
      // Mantener solo los últimos 50 mensajes por cliente (automático con función SQL)
      
      // 🧠 GUARDAR MENSAJE EN MEMORIA DE SESIÓN
      if (role === 'assistant') {
        try {
          await this.sessionMemory.addMessageToSession(clientId, {
            role: 'assistant',
            content: message,
            type: 'response',
            conversation_state: await this.getConversationState(clientId),
            processing_source: 'response'
          })
        } catch (error) {
          console.error('❌ Error guardando mensaje del asistente en memoria de sesión:', error)
        }
      }
      
      // 🧠 INTEGRAR SEMANTIC CONTEXT MANAGER
      if (this.contextManager && this.contextManager.initialized) {
        try {
          await this.contextManager.addMessage(clientId, message, role)
        } catch (error) {
          console.error('Error agregando mensaje al context manager:', error)
        }
      }
    } catch (error) {
      console.error('Error en addToHistory:', error)
    }
  }

  async getRecentHistory(clientId, limit = 5) {
    try {
      const { data, error } = await this.db.client
        .from('conversation_history')
        .select('role, message, timestamp')
        .eq('client_id', clientId)
        .order('timestamp', { ascending: false })
        .limit(limit)
      
      if (error) {
        console.error('Error obteniendo historial reciente:', error)
        return []
      }
      
      // Devolver en orden cronológico (más antiguo primero)
      return (data || []).reverse()
    } catch (error) {
      console.error('Error en getRecentHistory:', error)
      return []
    }
  }

  // Verificar si es un mensaje duplicado reciente
  async isDuplicateMessage(clientId, message) {
    try {
      // 🔧 CORREGIDO: Ventana de tiempo más estricta (2 segundos en lugar de 5)
      const { data, error } = await this.db.client
        .from('conversation_history')
        .select('message, timestamp')
        .eq('client_id', clientId)
        .eq('role', 'user')
        .eq('message', message)
        .gte('timestamp', new Date(Date.now() - 2000).toISOString()) // 🔧 CAMBIADO: 2 segundos
        .limit(1)
      
      if (error) {
        console.error('Error verificando duplicado:', error)
        return false // 🔧 En caso de error, NO marcar como duplicado
      }
      
      const isDuplicate = data && data.length > 0
      
      if (isDuplicate) {
        console.log(`🔄 Mensaje duplicado confirmado: "${message}" (encontrado en últimos 2 segundos)`)
      }
      
      return isDuplicate
    } catch (error) {
      console.error('Error en isDuplicateMessage:', error)
      return false // 🔧 En caso de error, NO marcar como duplicado para evitar bloqueos
    }
  }

  // Método para obtener el nombre del negocio desde la configuración
  async getBusinessName() {
    try {
      const businessName = await this.db.getConfig('business_name')
      return businessName && businessName.trim() !== '' ? businessName : 'nuestra tienda'
    } catch (error) {
      console.log('⚠️ No se pudo obtener business_name, usando valor por defecto')
      return 'nuestra tienda'
    }
  }

  // Método para obtener el mensaje de bienvenida personalizado desde la configuración
  async getWelcomeMessage() {
    try {
      const welcomeMessage = await this.db.getConfig('welcome_message')
      if (welcomeMessage && welcomeMessage.trim() !== '') {
        return welcomeMessage
      }

      // Fallback: mensaje por defecto con nombre del negocio
      const businessName = await this.getBusinessName()
      return `¡Hola! 👋 Bienvenido/a a ${businessName}.

Para brindarte una atención más personalizada y hacer que tu experiencia sea especial, me encantaría conocerte mejor.

¿Podrías decirme tu nombre? 😊`
    } catch (error) {
      console.log('⚠️ No se pudo obtener welcome_message, usando valor por defecto')
      const businessName = await this.getBusinessName()
      return `¡Hola! 👋 Bienvenido/a a ${businessName}.

Para brindarte una atención más personalizada y hacer que tu experiencia sea especial, me encantaría conocerte mejor.

¿Podrías decirme tu nombre? 😊`
    }
  }

  /**
   * 🧠 FUNCIÓN MEJORADA: Manejar consultas sobre productos ya enviados CON CONTEXTO INTELIGENTE
   * Evita respuestas duplicadas y genera mensajes más contextuales
   */
  async handleAlreadySentProductInquiry(clientId, product, additionalContext = '') {
    try {
      const customerName = await this.getCustomerName(clientId)
      
      console.log(`🧠 Manejando consulta inteligente sobre ${product.nombre} para ${customerName}`)
      
      // 🚫 EVITAR RESPUESTAS DUPLICADAS: Verificar si ya se respondió recientemente
      const conversationData = this.getConversationData(clientId)
      const recentHistory = this.getRecentHistory(clientId)
      
      // Verificar si se respondió sobre el mismo producto en los últimos 2 mensajes
      const recentMessages = recentHistory.slice(-2)
      const alreadyAnsweredRecently = recentMessages.some(msg => 
        msg.role === 'assistant' && 
        msg.message.toLowerCase().includes(product.nombre.toLowerCase().substring(0, 10))
      )
      
      if (alreadyAnsweredRecently) {
        console.log(`🚫 EVITANDO RESPUESTA DUPLICADA: Ya se respondió sobre ${product.nombre} recientemente`)
        return // No enviar respuesta duplicada
      }
      
      // 🔍 DETECTAR EL TIPO DE CONSULTA para personalizar la respuesta
      const contextLower = additionalContext.toLowerCase()
      
      let prompt = ''
      
      if (contextLower.includes('iphone 15') || product.nombre.toLowerCase().includes('iphone 15')) {
        // Cliente sigue interesado en iPhone 15 específicamente después de recibir sugerencias
        prompt = `El cliente ${customerName} aún muestra interés en el ${product.nombre} después de recibir otras sugerencias. Su consulta adicional: "${additionalContext}". 

Genera UNA SOLA respuesta directa y útil que demuestre que entiendes su interés continuo en este modelo específico. Máximo 2 líneas. Algo como: "Veo que aún te interesa el iPhone 15, déjame resolver tus dudas sobre..." y luego responde su pregunta específica. NO mencionar otros productos.`
      } else {
        // Consulta general
        prompt = `El cliente ${customerName} pregunta sobre el ${product.nombre}. Su consulta: "${additionalContext}". 

Responde de forma NATURAL y CONVERSACIONAL en máximo 2 líneas. Mantén la conversación fluida y profesional.`
      }
      
      // Usar Gemini para generar respuesta contextual
      const response = await this.gemini.generateSalesResponse(
        prompt,
        customerName,
        [product],
        this.STATES.INTERESTED,
        [],
        this.inventory
      )
      
      // 📤 Enviar respuesta contextual
      await this.sendMessage(clientId, response)
      await this.addToHistory(clientId, 'assistant', response)
      
      console.log(`✅ Respuesta contextual enviada para ${product.nombre} a ${customerName}`)
      
    } catch (error) {
      console.error('Error manejando consulta de producto ya enviado:', error)
      
      // Fallback: respuesta muy breve y natural
      const customerName = await this.getCustomerName(clientId) || 'cliente'
      const fallbackResponse = `¿Qué te gustaría saber sobre este producto? 😊`
      
      await this.sendMessage(clientId, fallbackResponse)
      await this.addToHistory(clientId, 'assistant', fallbackResponse)
    }
  }

  // Método para manejar reconexiones con backoff exponencial
  handleReconnection(isTimeout = false) {
    if (this.isReconnecting) {
      console.log('🔄 Ya hay una reconexión en progreso, ignorando...')
      return
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Máximo número de intentos de reconexión alcanzado')
      this.isConnected = false
      this.isReconnecting = false
      this.io.emit('whatsapp-status', 'error')
      this.io.emit('system-error', {
        message: `Falló la reconexión después de ${this.maxReconnectAttempts} intentos. Intenta conectar manualmente.`
      })
      return
    }

    this.isReconnecting = true
    this.reconnectAttempts++

    // Para timeouts, usar delays más cortos
    let delay
    if (isTimeout) {
      // Para timeouts: 1s, 2s, 4s, 8s, 16s (más agresivo)
      delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 16000)
    } else {
      // Para otros errores: 3s, 6s, 12s, 24s, 48s (normal)
      delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    }

    const reasonText = isTimeout ? '(Timeout)' : ''
    console.log(`🔄 Reconectando WhatsApp... ${reasonText} (Intento ${this.reconnectAttempts}/${this.maxReconnectAttempts}) - Esperando ${delay}ms`)
    this.io.emit('whatsapp-status', 'reconnecting')

    setTimeout(() => {
      if (this.isReconnecting) { // Verificar que aún necesitamos reconectar
        this.connect()
      }
    }, delay)
  }

  async connect() {
    try {
      // Si no estamos en proceso de reconexión automática, resetear contadores
      if (!this.isReconnecting) {
        this.reconnectAttempts = 0
        console.log('🔄 Iniciando conexión manual - Reseteando contadores de reconexión')
      }

      const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys')

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        // Configuraciones optimizadas para conexión estable
        connectTimeoutMs: 60000, // 60 segundos para conectar (por defecto 20s)
        defaultQueryTimeoutMs: 60000, // 60 segundos para queries (por defecto 60s)
        keepAliveIntervalMs: 25000, // 25 segundos keep-alive (por defecto 30s)
        markOnlineOnConnect: true, // Marcar como online al conectar
        syncFullHistory: false, // No sincronizar historial completo
        // Configuraciones de reintentos
        retryRequestDelayMs: 500, // 500ms entre reintentos (por defecto 250ms)
        maxMsgRetryCount: 3, // Máximo 3 reintentos por mensaje (por defecto 5)
        logger: {
          level: 'silent',
          child: () => ({
            level: 'silent',
            trace: () => {},
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
            fatal: () => {}
          }),
          trace: () => {},
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
          fatal: () => {}
        }
      })

      // Manejar eventos de conexión
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
          this.qr = qr
          const qrImage = await QRCode.toDataURL(qr)
          this.io.emit('qr-code', qrImage)
          this.io.emit('whatsapp-status', 'connecting')
          console.log('📱 Código QR generado para WhatsApp')
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode
          this.lastDisconnectReason = statusCode

          console.log('📱 Conexión cerrada. Código:', statusCode, 'Razón:', DisconnectReason[statusCode] || 'Desconocida')

          // Manejar código 408 (timedOut) - timeout de conexión
          if (statusCode === DisconnectReason.timedOut) {
            console.log('⏰ TIMEOUT DETECTADO - Reconectando con delay reducido...')
            this.isConnected = false
            // Para timeouts, usar delay más corto y menos intentos antes de dar up
            this.handleReconnection(true) // true indica que es un timeout
            return
          }

          // Manejar código 440 (connectionReplaced) - múltiples instancias
          if (statusCode === DisconnectReason.connectionReplaced) {
            console.log('🚨 CONEXIÓN REEMPLAZADA - Posible múltiple instancia detectada')
            console.log('⚠️ Deteniendo reconexiones automáticas para evitar bucle infinito')
            this.isConnected = false
            this.isReconnecting = false
            this.reconnectAttempts = 0
            this.io.emit('whatsapp-status', 'error')
            this.io.emit('system-error', {
              message: 'Conexión reemplazada por otra instancia. Verifica que no haya múltiples bots corriendo.'
            })
            return // No reconectar automáticamente
          }

          if (statusCode === DisconnectReason.loggedOut) {
            // Sesión cerrada desde el teléfono - Auto-limpiar
            console.log('🚨 Sesión cerrada desde WhatsApp - Iniciando auto-limpieza...')
            this.isConnected = false
            this.isReconnecting = false
            this.reconnectAttempts = 0
            this.io.emit('whatsapp-status', 'session-invalid')

            // Auto-limpiar sesión después de un momento
            setTimeout(async () => {
              try {
                await this.clearSession()
                this.io.emit('whatsapp-status', 'ready-to-connect')
              } catch (error) {
                console.error('Error en auto-limpieza:', error)
                this.io.emit('whatsapp-status', 'error')
              }
            }, 2000)

          } else if (statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.connectionReplaced) {
            // Implementar backoff exponencial para otras desconexiones
            this.handleReconnection()
          } else {
            console.log('❌ WhatsApp desconectado')
            this.isConnected = false
            this.isReconnecting = false
            this.io.emit('whatsapp-status', 'disconnected')
          }
        } else if (connection === 'open') {
          console.log('✅ WhatsApp conectado exitosamente')
          this.isConnected = true
          this.isReconnecting = false
          this.reconnectAttempts = 0 // Reset contador en conexión exitosa
          this.qr = null
          this.io.emit('whatsapp-ready')
          this.io.emit('whatsapp-status', 'connected')
        }
      })

      // Guardar credenciales cuando cambien
      this.sock.ev.on('creds.update', saveCreds)

      // Manejar mensajes entrantes
      this.sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0]
        if (!message.key.fromMe && message.message) {
          await this.handleIncomingMessage(message)
        }
      })

    } catch (error) {
      console.error('Error conectando WhatsApp:', error)
      throw error
    }
  }

  async disconnect() {
    if (this.sock) {
      await this.sock.logout()
      this.sock = null
      this.isConnected = false
      this.io.emit('whatsapp-status', 'disconnected')
      console.log('📱 WhatsApp desconectado')
    }
  }

  async clearSession() {
    try {
      console.log('🧹 Iniciando limpieza de sesión WhatsApp...')

      // Desconectar si está conectado
      if (this.sock) {
        try {
          await this.sock.logout()
        } catch (error) {
          console.log('⚠️ Error al desconectar (esperado si sesión inválida):', error.message)
        }
        this.sock = null
      }

      // Limpiar estado
      this.isConnected = false
      this.qr = null
      // 💾 Pedidos pendientes ya están en Supabase - no hay que limpiar Maps

      // Eliminar archivos de autenticación
      if (fs.existsSync('./auth_info_baileys')) {
        console.log('🗑️ Eliminando archivos de autenticación...')
        fs.rmSync('./auth_info_baileys', { recursive: true, force: true })
        console.log('✅ Archivos de autenticación eliminados')
      }

      // Recrear directorio
      if (!fs.existsSync('./auth_info_baileys')) {
        fs.mkdirSync('./auth_info_baileys')
      }

      // Notificar al frontend
      this.io.emit('whatsapp-status', 'session-cleared')
      this.io.emit('session-cleared', {
        message: 'Sesión limpiada exitosamente. Puedes reconectar ahora.'
      })

      console.log('✅ Sesión WhatsApp limpiada exitosamente')
      return { success: true, message: 'Sesión limpiada exitosamente' }

    } catch (error) {
      console.error('❌ Error limpiando sesión:', error)
      this.io.emit('session-clear-error', { error: error.message })
      throw new Error('Error al limpiar sesión: ' + error.message)
    }
  }

  async forceReconnect() {
    try {
      console.log('🔄 Forzando reconexión WhatsApp...')

      // Limpiar sesión primero
      await this.clearSession()

      // Esperar un momento
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Reconectar
      await this.connect()

      console.log('✅ Reconexión forzada completada')
      return { success: true, message: 'Reconexión exitosa' }

    } catch (error) {
      console.error('❌ Error en reconexión forzada:', error)
      throw error
    }
  }

  /**
   * 📤 Procesar mensaje directamente sin buffer (para mensajes consolidados)
   */
  async processMessageDirectly(from, messageText, source = 'direct') {
    try {
      console.log(`📤 Procesando mensaje directo de ${from}: "${messageText}" (fuente: ${source})`)
      
      // 🚫 CONTROL DE FLUJO ÚNCO: Verificar si ya hay procesamiento en curso
      if (this.isProcessingMessage(from)) {
        console.log(`🚫 [FLOW CONTROL] Ya hay procesamiento en curso para ${from} - ignorando mensaje`);
        return;
      }
      
      // 🚫 Marcar inicio de procesamiento
      this.startProcessing(from);

      // 🔒 VERIFICAR COMANDOS DE VALIDACIÓN DE PAGO PRIMERO (antes de cualquier otra lógica)
      if (await this.isPaymentValidator(from)) {
        const validationResult = await this.processValidationCommand(from, messageText)
        if (validationResult) {
          return // Comando de validación procesado, no continuar con lógica normal
        }
      }

      // Obtener inventario actual
      // 🧠 DETECCIÓN INTELIGENTE: Si cliente pregunta específicamente por productos, no aplicar restricciones VIP
      const isSpecificProductRequest = /\b(iphone\s+15|iphone\s+14|iphone\s+16|samsung|xiaomi|huawei|oppo|realme)\b/i.test(messageText)
      const inventoryOptions = {
        respectSpecificRequest: isSpecificProductRequest,
        requestContext: isSpecificProductRequest ? messageText : ''
      }
      
      if (isSpecificProductRequest) {
        console.log(`🧠 SOLICITUD ESPECÍFICA DETECTADA: "${messageText}" - Deshabilitando restricciones VIP`)
      }
      
      const products = await this.inventory.getAllProducts(inventoryOptions)

      // INTERRUPTOR MAESTRO - Verificar si las respuestas automáticas están habilitadas
      const autoResponsesEnabled = await this.db.getConfig('auto_responses_enabled')
      if (autoResponsesEnabled !== 'true') {
        console.log('🔇 Auto respuestas deshabilitadas - mensaje ignorado')
        return
      }

      // Obtener estado actual de conversación
      const currentState = await this.getConversationState(from)
      const conversationData = await this.getConversationData(from)
      const recentHistory = this.getRecentHistory(from, 3)

      console.log(`🔍 Estado actual: ${currentState}`)

      // 🚚 VERIFICAR ESTADOS ESPECIALES PRIMERO (antes de detectar intenciones)
      // Manejar estado AWAITING_SHIPPING - esperando dirección de envío
      if (currentState === this.STATES.AWAITING_SHIPPING) {
        await this.handleShippingAndPayment(from, messageText, conversationData)
        return // Salir aquí para no procesar más lógica
      }

      // DETECTAR INTENCIÓN (para lógica inteligente de filtros)
      
      // 🧠🔄 CONSULTAR MEMORIA DUAL PARA CONTEXTO INTELIGENTE
      let dualContext = {}
      try {
        const appropriateContext = await this.dualMemory.determineAppropriateContext(from)
        dualContext = {
          contextType: appropriateContext.contextType,
          contextStatus: appropriateContext.contextStatus,
          shouldUseVip: appropriateContext.shouldUseVip,
          shouldUseInventory: appropriateContext.shouldUseInventory,
          lastShownProduct: appropriateContext.lastShownProduct,
          contextProducts: appropriateContext.products
        }
        console.log(`🧠🔄 MEMORIA DUAL: ${appropriateContext.contextType} (${appropriateContext.contextStatus}) - VIP: ${appropriateContext.shouldUseVip}, Inventario: ${appropriateContext.shouldUseInventory}`)
      } catch (error) {
        console.error('❌ Error consultando memoria dual:', error)
      }
      
      // 🧠 CONSULTAR MEMORIA DE SESIÓN PARA CONTEXTO ADICIONAL
      let sessionContext = {}
      try {
        const sessionMemory = await this.sessionMemory.getSessionMemory(from)
        if (sessionMemory) {
          sessionContext = {
            displayed_products: sessionMemory.displayed_products || [],
            vip_product_context: sessionMemory.vip_product_context || false,
            vip_products_shown: sessionMemory.vip_products_shown || [],
            conversation_context: sessionMemory.conversation_context || {},
            last_recommendation: sessionMemory.last_recommendation || {}
          }
          console.log(`🧠 Memoria de sesión recuperada: ${sessionContext.displayed_products.length} productos mostrados, VIP: ${sessionContext.vip_product_context}`)
        }
      } catch (error) {
        console.error('❌ Error consultando memoria de sesión:', error)
      }
      
      const intent = await this.gemini.detectCustomerIntent(messageText, products, currentState, {
        ...conversationData,
        ...sessionContext, // 🧠 Agregar contexto de memoria de sesión
        ...dualContext, // 🧠🔄 Agregar contexto de memoria dual
        recentHistory
      })
      console.log(`🎯 Intención detectada:`, intent)
      
      // 🧠 RAZONAMIENTO INTELIGENTE: Procesar mensaje con sistemas de aprendizaje continuo
      try {
        const conversationHistory = await this.getRecentHistory(from, 10) || []
        
        // Agregar mensaje actual al contexto semántico
        await this.contextManager.addMessage(from, messageText, 'user', {
          conversationState: currentState,
          intent: intent,
          timestamp: new Date().toISOString()
        })
        
        // Obtener contexto semántico completo
        const semanticContext = await this.contextManager.getConversationContext(from, true)
        
        // Analizar personalidad del cliente
        const adaptedPersonality = await this.personalitySystem.analyzeClientPersonality(
          from,
          conversationHistory,
          {
            conversationState: currentState,
            intent: intent,
            sessionContext: sessionContext,
            dualContext: dualContext
          }
        )
        
        // Generar recomendaciones de aprendizaje por refuerzo
        const rlRecommendations = await this.rlEngine.generateConversationalRecommendations(
          from,
          currentState,
          {
            customerType: semanticContext.hasContext ? 'returning' : 'new',
            messageComplexity: messageText.length > 50 ? 'complex' : 'simple',
            intent: intent
          }
        )
        
        console.log(`🧠 Razonamiento aplicado - Personalidad: ${adaptedPersonality.basePersonality}, Contexto: ${semanticContext.hasContext}`)        
        console.log(`🎯 Recomendaciones RL: ${rlRecommendations.length} sugerencias generadas`)
        
        // Almacenar datos de razonamiento para usar en processCustomerIntent
        conversationData.reasoning = {
          semanticContext,
          adaptedPersonality,
          rlRecommendations,
          personalityInstructions: this.personalitySystem.generatePersonalityInstructions(adaptedPersonality)
        }
        
      } catch (error) {
        console.error('❌ Error en sistema de razonamiento:', error)
        // Continuar sin razonamiento en caso de error
      }
      
      // 🔄 LÓGICA INTELIGENTE: Activar memoria inventario para solicitudes específicas
      await this.handleSpecificProductRequest(from, messageText, intent, products, dualContext)

      // APLICAR FILTROS DE MENSAJES (con lógica inteligente)
      const shouldProcessMessage = await this.shouldProcessMessageIntelligent(messageText, currentState, from, intent)
      if (!shouldProcessMessage) {
        console.log('🚫 Mensaje filtrado - no cumple criterios configurados')
        return
      }

      // Procesar según la intención y estado
      await this.processCustomerIntent(from, messageText, intent, products, currentState, conversationData, recentHistory)
      
      // 🚫 Marcar fin de procesamiento exitoso
      this.endProcessing(from);

    } catch (error) {
      // 🚫 Marcar fin de procesamiento en caso de error
      this.endProcessing(from);
      
      console.error('❌ Error procesando mensaje directo:', error)
      await this.sendMessage(
        from,
        'Disculpa, tuve un problema técnico. ¿Podrías intentar de nuevo? 🤖'
      )
    }
  }

  /**
   * 🔄 NUEVA FUNCIÓN: Manejar solicitudes específicas de productos
   * Activa memoria inventario cuando cliente pide producto diferente al VIP activo
   * MEJORADA: Maneja casos donde NO hay productos disponibles para la solicitud
   */
  /**
   * 🔄 NUEVA FUNCIÓN: Manejar solicitudes específicas de productos
   * Activa memoria inventario cuando cliente pide producto diferente al VIP activo
   * MEJORADA: Maneja casos donde NO hay productos disponibles para la solicitud
   */
  async handleSpecificProductRequest(from, messageText, intent, products, dualContext) {
    try {
      // 🔍 Detectar si el cliente pide un producto específico
      const specificProductKeywords = [
        'iphone 15', 'iphone 14', 'iphone 16', 'iphone 13',
        'samsung galaxy', 'xiaomi', 'huawei', 'oppo', 'realme',
        'quiero', 'comprar', 'me interesa', 'busco', 'necesito'
      ];
      
      const messageLC = messageText.toLowerCase();
      const hasSpecificRequest = specificProductKeywords.some(keyword => messageLC.includes(keyword));
      
      if (!hasSpecificRequest) {
        return; // No es solicitud específica
      }
      
      console.log(`🔍 SOLICITUD ESPECÍFICA DETECTADA: "${messageText}"`);
      
      // 🎯 EXTRAER PRODUCTO SOLICITADO con validación mejorada
      const requestedProduct = this.extractRequestedProduct(messageText);
      
      // 🚨 VALIDACIÓN ROBUSTA: Verificar si hay conflicto con contexto actual
      const hasContextConflict = await this.validateProductContextConflict(from, requestedProduct, dualContext);
      
      if (hasContextConflict) {
        console.log(`🚨 [VALIDATION] Conflicto de contexto detectado: Cliente pide "${requestedProduct}" pero contexto actual es diferente`);
        
        // Limpiar contexto conflictivo antes de procesar solicitud específica
        await this.clearConflictingContext(from, requestedProduct);
      }
      
      // 🎯 RASTREAR PRODUCTO DE INTERÉS DETECTADO (con validación)
      if (requestedProduct) {
        console.log(`🎯 [INTEREST TRACKER] Registrando interés en: "${requestedProduct}"`);
        
        // Añadir a productos de interés del cliente
        await this.interestTracker.addInterestedProduct(
          from, 
          requestedProduct, 
          {
            source: 'specific_request',
            original_message: messageText,
            detection_method: 'enhanced_keyword_extraction',
            confidence: this.calculateRequestConfidence(messageText, requestedProduct)
          },
          'search'
        );
      }
      
      if (requestedProduct) {
        console.log(`🔍 PRODUCTO ESPECÍFICO SOLICITADO: "${requestedProduct}"`);
        
        // 🔍 Buscar productos que coincidan con validación estricta
        const matchingProducts = this.findProductsWithStrictValidation(requestedProduct, products);
        
        if (matchingProducts.length > 0) {
          console.log(`📺 ACTUALIZANDO/ACTIVANDO MEMORIA INVENTARIO para "${requestedProduct}": ${matchingProducts.length} productos`);
          
          // 🚨 LIMPIAR MEMORIA VIP si hay conflicto
          if (dualContext.contextType === 'vip') {
            await this.dualMemory.markVipAsRejected(from, 'user_requested_different_product');
            console.log(`🚴 MEMORIA VIP MARCADA COMO RECHAZADA para ${from}`);
          }
          
          await this.dualMemory.activateInventoryMemory(from, matchingProducts.map(p => ({
            id: p.id,
            name: p.nombre,
            price: p.precio,
            description: p.descripcion,
            stock: p.stock,
            categoria: p.categoria,
            isVip: false,
            fromSpecificRequest: true,
            requestedBy: messageText,
            requestConfidence: this.calculateRequestConfidence(messageText, requestedProduct),
            timestamp: Date.now()
          })));
          
          console.log(`✅ MEMORIA INVENTARIO ACTIVADA/ACTUALIZADA: ${matchingProducts.length} productos para "${requestedProduct}"`);
        } else {
          // ❌ NO HAY PRODUCTOS DISPONIBLES PARA LA SOLICITUD ESPECÍFICA
          console.log(`❌ NO HAY PRODUCTOS DISPONIBLES para "${requestedProduct}" - Ofreciendo alternativas`);
          
          // 🔍 Buscar productos alternativos similares
          const alternativeProducts = this.findAlternativeProducts(requestedProduct, products);
          
          if (alternativeProducts.length > 0) {
            console.log(`🔄 PRODUCTOS ALTERNATIVOS encontrados: ${alternativeProducts.map(p => p.nombre).join(', ')}`);
            
            // 📺 ACTIVAR MEMORIA INVENTARIO con alternativas
            await this.dualMemory.activateInventoryMemory(from, alternativeProducts.map(p => ({
              id: p.id,
              name: p.nombre,
              price: p.precio,
              description: p.descripcion,
              stock: p.stock,
              categoria: p.categoria,
              isVip: false,
              fromSpecificRequest: true,
              requestedBy: messageText,
              isAlternative: true,
              originalRequest: requestedProduct,
              timestamp: Date.now()
            })));
            
            console.log(`✅ MEMORIA INVENTARIO ALTERNATIVA ACTIVADA: ${alternativeProducts.length} productos como alternativa a "${requestedProduct}"`);
          } else {
            console.log(`⚠️ NO HAY ALTERNATIVAS DISPONIBLES para "${requestedProduct}"`);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error en handleSpecificProductRequest:', error);
    }
  }

  /**
   * 🚨 MEJORADO: Validar si hay conflicto entre contexto actual y producto solicitado
   */
  async validateProductContextConflict(clientId, requestedProduct, dualContext) {
    try {
      if (!requestedProduct || !dualContext || !dualContext.lastShownProduct) {
        return false; // Sin suficiente información para detectar conflicto
      }
      
      const requestedProductLower = requestedProduct.toLowerCase().trim();
      const contextProductName = dualContext.lastShownProduct.name || dualContext.lastShownProduct.nombre || '';
      const contextProductLower = contextProductName.toLowerCase().trim();
      
      console.log(`🔍 [VALIDATION] Comparando: solicitado="${requestedProductLower}" vs contexto="${contextProductLower}"`);
      
      // 🎯 VALIDACIONES DE CONFLICTO REAL
      
      // 1️⃣ Si son exactamente iguales -> NO hay conflicto
      if (requestedProductLower === contextProductLower) {
        console.log(`✅ [VALIDATION] Productos idénticos - NO hay conflicto`);
        return false;
      }
      
      // 2️⃣ Si el solicitado está contenido en el contexto -> NO hay conflicto (es más específico)
      if (contextProductLower.includes(requestedProductLower)) {
        console.log(`✅ [VALIDATION] Producto solicitado incluido en contexto - NO hay conflicto`);
        return false;
      }
      
      // 3️⃣ Si el contexto está contenido en el solicitado -> NO hay conflicto (expansión válida)
      if (requestedProductLower.includes(contextProductLower)) {
        console.log(`✅ [VALIDATION] Contexto incluido en solicitud - NO hay conflicto`);
        return false;
      }
      
      // 4️⃣ CONFLICTO REAL: Diferentes modelos/marcas
      const conflictKeywords = [
        ['iphone 14', 'iphone 15'], ['iphone 15', 'iphone 14'],
        ['iphone 13', 'iphone 15'], ['iphone 15', 'iphone 13'],
        ['samsung', 'iphone'], ['iphone', 'samsung'],
        ['xiaomi', 'iphone'], ['iphone', 'xiaomi']
      ];
      
      for (const [keyword1, keyword2] of conflictKeywords) {
        if (contextProductLower.includes(keyword1) && requestedProductLower.includes(keyword2)) {
          console.log(`🚨 [CONFLICT] Conflicto detectado: "${keyword1}" vs "${keyword2}"`);
          return true;
        }
      }
      
      // 5️⃣ Conflicto por diferencia significativa en nombres
      const similarity = this.calculateSimilarity(requestedProductLower, contextProductLower);
      if (similarity < 0.3) { // Menos del 30% de similitud = conflicto probable
        console.log(`🚨 [CONFLICT] Productos muy diferentes: similitud ${(similarity*100).toFixed(1)}%`);
        return true;
      }
      
      console.log(`✅ [VALIDATION] No se detectó conflicto significativo`);
      return false;
      
    } catch (error) {
      console.error('❌ Error en validateProductContextConflict:', error);
      return false; // En caso de error, asumir no hay conflicto
    }
  }
  
  /**
   * 🎯 NUEVO: Calcular similitud entre dos strings
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  /**
   * 📝 NUEVO: Calcular distancia de Levenshtein
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitución
            matrix[i][j - 1] + 1,     // inserción
            matrix[i - 1][j] + 1      // eliminación
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * 🧹 MEJORADO: Limpiar contexto conflictivo de manera inteligente
   */
  async clearConflictingContext(clientId, requestedProduct) {
    try {
      console.log(`🧹 [CLEANUP] Limpiando contexto conflictivo para "${requestedProduct}"`);
      
      // 1️⃣ Obtener contexto actual para entender qué limpiar
      const currentContext = await this.dualMemory.determineAppropriateContext(clientId);
      
      console.log(`🔍 [CLEANUP] Contexto actual: ${currentContext.contextType} (${currentContext.contextStatus})`);
      
      // 2️⃣ Limpiar memoria VIP si hay conflicto con solicitud específica
      if (currentContext.contextType === 'vip') {
        await this.dualMemory.markVipAsRejected(clientId, 'context_conflict_cleanup');
        console.log(`🎯 [CLEANUP] Memoria VIP marcada como rechazada por conflicto`);
      }
      
      // 3️⃣ Limpiar memoria inventario si está activa y hay conflicto
      if (currentContext.contextType === 'inventory') {
        console.log(`📦 [CLEANUP] Limpiando memoria inventario conflictiva`);
        await this.dualMemory.clearInventoryMemory(clientId);
      }
      
      // 4️⃣ Registrar solicitud específica limpia
      await this.clientInterestTracker.addProductOfInterest(clientId, requestedProduct, {
        context_cleanup: true,
        previous_context: currentContext.contextType,
        cleanup_reason: 'product_conflict',
        original_message: `Solicitud de "${requestedProduct}" limpió contexto "${currentContext.lastShownProduct?.name || 'desconocido'}"`
      });
      
      console.log(`✅ [CLEANUP] Contexto conflictivo limpiado exitosamente para "${requestedProduct}"`);
      
    } catch (error) {
      console.error('❌ Error en clearConflictingContext:', error);
      // No lanzar error para no romper el flujo principal
    }
  }
  
  /**
   * 🎯 NUEVO: Calcular confianza de solicitud de producto
   */
  calculateRequestConfidence(messageText, requestedProduct) {
    const message = messageText.toLowerCase();
    const product = requestedProduct.toLowerCase();
    
    let confidence = 0.5; // Base
    
    // Palabras de intención fuerte
    const strongIntentWords = ['quiero', 'comprar', 'necesito', 'busco'];
    if (strongIntentWords.some(word => message.includes(word))) {
      confidence += 0.3;
    }
    
    // Especificidad del producto
    if (message.includes(product)) {
      confidence += 0.2;
    }
    
    // Contexto específico (modelo, capacidad, color)
    const specificDetails = ['pro', 'max', '256', '128', '512', 'gb', 'negro', 'blanco', 'titanio'];
    if (specificDetails.some(detail => message.includes(detail))) {
      confidence += 0.1;
    }
    
    return Math.min(1.0, confidence);
  }
  
  /**
   * 🔍 NUEVO: Buscar productos con validación estricta
   */
  findProductsWithStrictValidation(requestedProduct, products) {
    const request = requestedProduct.toLowerCase();
    
    // Prioridad 1: Coincidencia exacta
    const exactMatches = products.filter(p => {
      const productName = p.nombre.toLowerCase();
      return productName.includes(request);
    });
    
    if (exactMatches.length > 0) {
      console.log(`🎯 [STRICT] Coincidencias exactas: ${exactMatches.length}`);
      return exactMatches.slice(0, 3); // Máximo 3
    }
    
    // Prioridad 2: Coincidencia parcial inteligente
    const partialMatches = products.filter(p => {
      const productName = p.nombre.toLowerCase();
      const productWords = productName.split(' ');
      const requestWords = request.split(' ');
      
      // Al menos 2 palabras deben coincidir
      const matchingWords = requestWords.filter(rWord => 
        productWords.some(pWord => pWord.includes(rWord) || rWord.includes(pWord))
      );
      
      return matchingWords.length >= 2;
    });
    
    if (partialMatches.length > 0) {
      console.log(`🔎 [STRICT] Coincidencias parciales: ${partialMatches.length}`);
      return partialMatches.slice(0, 3);
    }
    
    console.log(`❌ [STRICT] No se encontraron coincidencias válidas para "${requestedProduct}"`);
    return [];
  }

  /**
   * 🔍 Buscar productos alternativos cuando no hay exactos disponibles
   */
  findAlternativeProducts(requestedProduct, products) {
    const alternatives = [];
    const requestedLC = requestedProduct.toLowerCase();
    
    // 📱 Lógica de alternativas por categoría
    if (requestedLC.includes('iphone 15')) {
      // Para iPhone 15: ofrecer iPhone 14 Pro o iPhone 16 si están disponibles
      const iphone14Pro = products.filter(p => 
        p.nombre.toLowerCase().includes('iphone 14') && 
        p.nombre.toLowerCase().includes('pro')
      );
      const iphone16 = products.filter(p => 
        p.nombre.toLowerCase().includes('iphone 16')
      );
      alternatives.push(...iphone14Pro, ...iphone16);
      
    } else if (requestedLC.includes('iphone 14')) {
      // Para iPhone 14: ofrecer iPhone 15 o iPhone 13
      const iphone15 = products.filter(p => 
        p.nombre.toLowerCase().includes('iphone 15')
      );
      const iphone13 = products.filter(p => 
        p.nombre.toLowerCase().includes('iphone 13')
      );
      alternatives.push(...iphone15, ...iphone13);
      
    } else if (requestedLC.includes('samsung')) {
      // Para Samsung: ofrecer otros smartphones de gama similar
      const otherPhones = products.filter(p => 
        p.categoria && (
          p.categoria.toLowerCase().includes('celulares') ||
          p.categoria.toLowerCase().includes('smartphone')
        ) && !p.nombre.toLowerCase().includes('samsung')
      );
      alternatives.push(...otherPhones);
      
    } else {
      // Para otras marcas: ofrecer productos de categoría similar
      const similarCategory = products.filter(p => 
        p.categoria && (
          p.categoria.toLowerCase().includes('celulares') ||
          p.categoria.toLowerCase().includes('smartphone') ||
          p.categoria.toLowerCase().includes('telefono')
        )
      );
      alternatives.push(...similarCategory);
    }
    
    // 🎯 Eliminar duplicados y limitiar a 3 productos
    const uniqueAlternatives = alternatives.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    ).slice(0, 3);
    
    return uniqueAlternatives;
  }

  /**
   * 🔍 Extraer el producto solicitado del mensaje del cliente
   */
  extractRequestedProduct(message) {
    const messageLC = message.toLowerCase()
    
    // 📱 Detectar modelos de iPhone
    if (messageLC.includes('iphone 15')) return 'iphone 15'
    if (messageLC.includes('iphone 14')) return 'iphone 14'
    if (messageLC.includes('iphone 16')) return 'iphone 16'
    if (messageLC.includes('iphone 13')) return 'iphone 13'
    
    // 📱 Detectar otras marcas
    if (messageLC.includes('samsung')) return 'samsung'
    if (messageLC.includes('xiaomi')) return 'xiaomi'
    if (messageLC.includes('huawei')) return 'huawei'
    if (messageLC.includes('oppo')) return 'oppo'
    if (messageLC.includes('realme')) return 'realme'
    
    return null
  }
  
  /**
   * 🔍 Buscar productos alternativos cuando no hay exactos disponibles
   */
  findAlternativeProducts(requestedProduct, products) {
    const alternatives = []
    const requestedLC = requestedProduct.toLowerCase()
    
    // 📱 Lógica de alternativas por categoría
    if (requestedLC.includes('iphone 15')) {
      // Para iPhone 15: ofrecer iPhone 14 Pro o iPhone 16 si están disponibles
      const iphone14Pro = products.filter(p => 
        p.nombre.toLowerCase().includes('iphone 14') && 
        p.nombre.toLowerCase().includes('pro')
      )
      const iphone16 = products.filter(p => 
        p.nombre.toLowerCase().includes('iphone 16')
      )
      alternatives.push(...iphone14Pro, ...iphone16)
      
    } else if (requestedLC.includes('iphone 14')) {
      // Para iPhone 14: ofrecer iPhone 15 o iPhone 13
      const iphone15 = products.filter(p => 
        p.nombre.toLowerCase().includes('iphone 15')
      )
      const iphone13 = products.filter(p => 
        p.nombre.toLowerCase().includes('iphone 13')
      )
      alternatives.push(...iphone15, ...iphone13)
      
    } else if (requestedLC.includes('samsung')) {
      // Para Samsung: ofrecer otros smartphones de gama similar
      const otherPhones = products.filter(p => 
        p.categoria && (
          p.categoria.toLowerCase().includes('celulares') ||
          p.categoria.toLowerCase().includes('smartphone')
        ) && !p.nombre.toLowerCase().includes('samsung')
      )
      alternatives.push(...otherPhones)
      
    } else {
      // Para otras marcas: ofrecer productos de categoría similar
      const similarCategory = products.filter(p => 
        p.categoria && (
          p.categoria.toLowerCase().includes('celulares') ||
          p.categoria.toLowerCase().includes('smartphone') ||
          p.categoria.toLowerCase().includes('telefono')
        )
      )
      alternatives.push(...similarCategory)
    }
    
    // 🎯 Eliminar duplicados y limitiar a 3 productos
    const uniqueAlternatives = alternatives.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    ).slice(0, 3)
    
    return uniqueAlternatives
  }
  
  /**
   * 🎯 Detectar si un mensaje hace referencia implícita a un producto
   * Usado por el ClientInterestTracker para identificar consultas relacionadas
   */
  isImplicitProductReference(messageText) {
    const message = messageText.toLowerCase();
    
    // Detectar referencias técnicas que podrían estar relacionadas con productos
    const technicalKeywords = [
      'graba', '4k', 'video', 'camara', 'cámara', 'bateria', 
      'batería', 'memoria', 'almacenamiento', 'dura', 'tiempo', 
      'viajes', 'resistencia', 'agua', 'precio', 'cuesta', 'vale', 
      'barato', 'caro', 'especificaciones', 'nadar', 'bajo el agua',
      'resistente', 'sumergible', 'puede', 'sirve', 'funciona'
    ];
    
    const hasTechnicalKeyword = technicalKeywords.some(keyword => message.includes(keyword));
    
    // Si es una pregunta técnica y no hay referencia explícita a otro producto
    return hasTechnicalKeyword && !this.hasExplicitProductReference(messageText);
  }
  
  /**
   * 🎯 Verificar si hay referencia explícita a productos específicos
   */
  hasExplicitProductReference(messageText) {
    const message = messageText.toLowerCase();
    const explicitProductRefs = [
      'iphone 15', 'iphone 14', 'iphone 16', 'samsung', 
      'xiaomi', 'huawei', 'oppo', 'realme'
    ];
    
    return explicitProductRefs.some(ref => message.includes(ref));
  }
  
  /**
   * 🚫 Verificar si ya hay procesamiento en curso para evitar duplicados
   */
  isProcessingMessage(clientId) {
    const processing = this.processingMessages.get(clientId);
    if (processing) {
      const timeDiff = Date.now() - processing;
      // Si han pasado más de 30 segundos, limpiar el lock
      if (timeDiff > 30000) {
        this.processingMessages.delete(clientId);
        return false;
      }
      return true;
    }
    return false;
  }
  
  /**
   * 🚫 Marcar inicio de procesamiento
   */
  startProcessing(clientId) {
    this.processingMessages.set(clientId, Date.now());
    console.log(`🚫 [FLOW CONTROL] Iniciando procesamiento para ${clientId}`);
  }
  
  /**
   * 🚫 Marcar fin de procesamiento
   */
  endProcessing(clientId) {
    this.processingMessages.delete(clientId);
    console.log(`✅ [FLOW CONTROL] Procesamiento completado para ${clientId}`);
  }

  async handleIncomingMessage(message) {
    try {
      const from = message.key.remoteJid
      const messageText = message.message?.conversation ||
                         message.message?.extendedTextMessage?.text || ''

      // 🔧 VERIFICAR SI YA SE ESTÁ PROCESANDO UN BUFFER PARA ESTE CLIENTE
      const bufferProcessingKey = `processing_buffer_${from}`
      if (global[bufferProcessingKey]) {
        // 🧠 EXCEPCIÓN: NO ignorar preguntas contextuales importantes
        const contextualQuestions = [
          'crees que', 'sirva', 'servirá', 'funcionará', 'funciona para',
          'es bueno para', 'recomiendas', 'recomendas', 'aconsejas',
          'para mi', 'para su', 'para tu', 'abuela', 'abuelo', 'papá', 'mamá',
          'esposa', 'esposo', 'hijo', 'hija', 'hermano', 'hermana'
        ]
        
        const isContextualQuestion = contextualQuestions.some(q => messageText.toLowerCase().includes(q))
        
        if (isContextualQuestion) {
          console.log(`🧠 PREGUNTA CONTEXTUAL PRIORITARIA detectada: "${messageText}" - PROCESANDO inmediatamente`)
          // No ignorar - procesar inmediatamente
        } else {
          console.log(`📦 Mensaje ignorado - buffer en procesamiento para ${from}: "${messageText}"`)
          return // Ignorar mensajes adicionales mientras se procesa un buffer
        }
      }

      // Verificar duplicados
      if (await this.isDuplicateMessage(from, messageText)) {
        console.log(`🔄 Mensaje duplicado ignorado de ${from}`)
        return
      }

      // Incrementar contador de mensajes
      this.messageCount++

      // Registrar mensaje en base de datos y historial
      await this.logMessage(from, messageText, 'recibido')
      this.addToHistory(from, 'user', messageText)

      // 🧠 GUARDAR MENSAJE EN MEMORIA DE SESIÓN
      try {
        await this.sessionMemory.addMessageToSession(from, {
          role: 'user',
          content: messageText,
          type: 'text',
          conversation_state: await this.getConversationState(from),
          processing_source: 'immediate'
        })
      } catch (error) {
        console.error('❌ Error guardando mensaje de usuario en memoria de sesión:', error)
      }

      console.log(`📨 Mensaje de ${from}: ${messageText}`)

      // Verificar si es una imagen (posible captura de pago)
      if (message.message?.imageMessage) {
        await this.handleImageMessage(message, from)
        return
      }

      // Obtener estado actual de conversación
      const currentState = await this.getConversationState(from)
      const conversationData = await this.getConversationData(from)
      const recentHistory = await this.getRecentHistory(from, 3)

      console.log(`🔍 Estado actual: ${currentState}`)

      // 📦 SISTEMA DE BUFFER INTELIGENTE
      const shouldBuffer = this.messageBuffer.shouldBuffer(from, messageText, currentState)

      if (shouldBuffer) {
        console.log(`📦 Evaluando mensaje para buffer: "${messageText}"`)

        // Crear datos del mensaje para buffer
        const messageData = {
          text: messageText,
          messageId: message.key.id,
          state: currentState
        }

        try {
          const bufferResult = await this.messageBuffer.addMessage(from, messageData, this)

          if (bufferResult === true) {
            console.log(`📦 Mensaje agregado al buffer, esperando consolidación...`)
            return // No procesar inmediatamente
          } else if (bufferResult === 'processing') {
            console.log(`🚫 Mensaje RECHAZADO - Buffer ya en procesamiento para ${from}`)
            return // 🚫 RECHAZAR COMPLETAMENTE para evitar procesamiento paralelo
          }
        } catch (error) {
          console.error('❌ Error en buffer, procesando inmediatamente:', error)
          // Continuar con procesamiento normal si falla el buffer
        }
      }

      // Si no se bufferiza, procesar directamente
      await this.processMessageDirectly(from, messageText, 'immediate')

    } catch (error) {
      console.error('Error manejando mensaje entrante:', error)
      await this.sendMessage(
        message.key.remoteJid,
        'Disculpa, tuve un problema técnico. ¿Podrías intentar de nuevo? 🤖'
      )
    }
  }

  /**
   * 🆕 NUEVA FUNCIÓN: Detectar si el cliente está iniciando una nueva sesión/exploración
   * Criterios inteligentes para detectar nuevas conversaciones
   */
  async isNewSessionDetected(from, messageText, currentState, conversationData) {
    try {
      // 🔍 CRITERIO 1: Estado COMPLETED (ya implementado)
      if (currentState === this.STATES.COMPLETED) {
        console.log(`🆕 NUEVA SESIÓN: Estado completed detectado para ${from}`)
        return { isNewSession: true, reason: 'completed_state', confidence: 'high' }
      }

      // 🔍 CRITERIO 2: Tiempo desde última interacción (> 2 horas = nueva sesión)
      const lastMessageTime = await this.getLastMessageTime(from)
      if (lastMessageTime) {
        const timeDifference = Date.now() - new Date(lastMessageTime).getTime()
        const hoursElapsed = timeDifference / (1000 * 60 * 60)
        
        if (hoursElapsed > 2) {
          console.log(`🆕 NUEVA SESIÓN: ${hoursElapsed.toFixed(1)} horas desde última interacción para ${from}`)
          return { isNewSession: true, reason: 'time_elapsed', confidence: 'high', hoursElapsed }
        }
      }

      // 🔍 CRITERIO 3: Saludo después de estar en estado no inicial
      const messageLC = messageText.toLowerCase().trim()
      const greetings = ['hola', 'hi', 'hello', 'buenas', 'buenos días', 'buenas tardes', 'buenas noches']
      const isGreeting = greetings.some(greeting => messageLC.includes(greeting))
      
      // 🚨 EXCLUIR ESTADOS CRÍTICOS: NO limpiar memoria en estados de compra activa
      const criticalStates = [
        this.STATES.CONFIRMING,     // Cliente confirmando pedido
        this.STATES.SPECIFYING,    // Cliente especificando cantidad
        this.STATES.PAYMENT,       // Procesando pago
        this.STATES.AWAITING_SPECIALIST // Esperando especialista
      ]
      
      // 🕐 AWAITING_SHIPPING: Permitir nueva sesión después de tiempo prolongado (2+ horas)
      let isInCriticalState = criticalStates.includes(currentState)
      
      // 📦 LÓGICA ESPECIAL PARA AWAITING_SHIPPING: Verificar tiempo transcurrido
      if (currentState === this.STATES.AWAITING_SHIPPING && lastMessageTime) {
        const timeDifference = Date.now() - new Date(lastMessageTime).getTime()
        const hoursElapsed = timeDifference / (1000 * 60 * 60)
        
        if (hoursElapsed > 2) {
          console.log(`📦 AWAITING_SHIPPING ABANDONADO: ${hoursElapsed.toFixed(1)} horas transcurridas - Permitiendo nueva sesión para ${from}`)
          isInCriticalState = false // Permitir nueva sesión
        } else {
          console.log(`📦 AWAITING_SHIPPING RECIENTE: Solo ${hoursElapsed.toFixed(1)} horas - Manteniendo estado crítico para ${from}`)
          isInCriticalState = true // Mantener como crítico
        }
      }
      
      if (isGreeting && 
          currentState !== this.STATES.INITIAL && 
          currentState !== this.STATES.ASKING_NAME &&
          !isInCriticalState) { // 🛡️ NO destruir memoria en estados críticos
        console.log(`🆕 NUEVA SESIÓN: Saludo detectado en estado no inicial (${currentState}) para ${from}`)
        return { isNewSession: true, reason: 'greeting_after_interaction', confidence: 'medium' }
      }
      
      // 🔍 CRITERIO ESPECIAL: Si está en estado crítico pero saluda, solo responder sin limpiar memoria
      if (isGreeting && isInCriticalState) {
        console.log(`👋 SALUDO EN ESTADO CRÍTICO: Manteniendo memoria en estado ${currentState} para ${from}`)
        return { isNewSession: false, reason: 'greeting_in_critical_state', shouldRespond: true }
      }

      // 🔍 CRITERIO 4: Cambio drástico de contexto (nueva búsqueda)
      const contextChangeKeywords = [
        'quiero ver', 'qué tienen', 'qué productos', 'qué modelos', 
        'qué teléfonos', 'qué iphone', 'muestra', 'mostrar', 'ver productos',
        'qué me recomiendas', 'qué me sugieres', 'empezar de nuevo'
      ]
      
      const isContextChange = contextChangeKeywords.some(keyword => messageLC.includes(keyword))
      if (isContextChange && (currentState === this.STATES.INQUIRING || currentState === this.STATES.BROWSING)) {
        console.log(`🆕 NUEVA SESIÓN: Cambio de contexto detectado en ${currentState} para ${from}`)
        return { isNewSession: true, reason: 'context_change', confidence: 'medium' }
      }

      // 🔍 CRITERIO 5: Estado INQUIRING con nueva pregunta general (MEJORADO)
      if (currentState === this.STATES.INQUIRING) {
        // ✅ EXCLUSIONES: No considerar nueva sesión si es expresión económica o emocional
        const economicExpressions = [
          'no tengo', 'soy pobre', 'no puedo', 'muy caro', 'barato', 'económico', 
          'sin dinero', 'limitado', 'presupuesto', 'descuento'
        ]
        
        const isEconomicExpression = economicExpressions.some(expr => messageLC.includes(expr))
        
        if (!isEconomicExpression) {
          const generalQuestions = [
            '¿qué', 'qué', '¿cuales', 'cuales', '¿cual', 'cual',
            '¿tienes', 'tienes', '¿hay', 'hay', '¿venden', 'venden'
          ]
          
          const isGeneralQuestion = generalQuestions.some(q => messageLC.includes(q))
          if (isGeneralQuestion) {
            console.log(`🆕 POSIBLE NUEVA SESIÓN: Pregunta general en estado inquiring para ${from}`)
            return { isNewSession: true, reason: 'general_question_in_inquiring', confidence: 'low' }
          }
        } else {
          console.log(`💰 NO nueva sesión: Expresión económica detectada en ${currentState} para ${from}`)
        }
      }

      console.log(`❌ No se detectó nueva sesión para ${from} (Estado: ${currentState})`)
      return { isNewSession: false, reason: 'no_criteria_met', confidence: 'low' }
      
    } catch (error) {
      console.error('Error detectando nueva sesión:', error)
      return { isNewSession: false, reason: 'error', confidence: 'low' }
    }
  }

  /**
   * 🔍 Obtener timestamp del último mensaje de un cliente
   */
  async getLastMessageTime(clientId) {
    try {
      const { data, error } = await this.db.client
        .from('conversation_history')
        .select('timestamp')
        .eq('client_id', clientId)
        .order('timestamp', { ascending: false })
        .limit(1)
      
      if (error) {
        console.error('Error obteniendo último mensaje:', error)
        return null
      }
      
      return data && data.length > 0 ? data[0].timestamp : null
    } catch (error) {
      console.error('Error en getLastMessageTime:', error)
      return null
    }
  }

  /**
   * 🆕 Procesar nueva sesión detectada
   */
  async processNewSession(from, messageText, intent, products, conversationData, detectionResult) {
    try {
      console.log(`🆕 PROCESANDO NUEVA SESIÓN para ${from}:`, detectionResult)
      
      const customerName = await this.getCustomerName(from)
      
      // 🧽 LIMPIAR HISTORIAL DE IMÁGENES para nueva sesión
      await this.clearImageHistory(from)
      console.log(`🧽 Historial de imágenes limpiado para nueva sesión de ${customerName}`)
      
      // 🧠 LIMPIAR MEMORIA DE SESIÓN para nueva sesión (sistema temporal)
      await this.sessionMemory.clearSessionMemory(from)
      console.log(`🧠 Memoria de sesión limpiada para nueva sesión de ${customerName}`)
      
      // 🧠🔄 LIMPIAR MEMORIA DUAL para nueva sesión (VIP + Inventario)
      await this.dualMemory.clearClientMemory(from)
      console.log(`🧠🔄 Memoria dual limpiada para nueva sesión de ${customerName}`)
      
      // 🔧 PRESERVAR CONTEXTO: Mantener información importante
      const preservedContext = {
        session_detection: detectionResult, // Guardar info de detección
        previous_state: await this.getConversationState(from) // Estado anterior
      }
      
      if (conversationData.customer_name) {
        preservedContext.customer_name = conversationData.customer_name
      }
      if (conversationData.cliente_nivel) {
        preservedContext.cliente_nivel = conversationData.cliente_nivel
      }
      if (conversationData.es_recurrente) {
        preservedContext.es_recurrente = conversationData.es_recurrente
      }
      if (conversationData.total_pedidos) {
        preservedContext.total_pedidos = conversationData.total_pedidos
      }
      
      // Convertir interés reciente en productos de interés actuales
      if (conversationData.recent_interest) {
        preservedContext.interested_products = conversationData.recent_interest
        console.log(`🔧 CONTEXTO RESTAURADO: Productos de interés previos disponibles`)
      }

      // 🎯 DETERMINAR ESTADO INICIAL SEGÚN TIPO DE MENSAJE
      if (intent.intent === 'greeting') {
        // Saludo formal - verificar si tenemos el nombre del cliente
        if (customerName) {
          await this.handleReturningCustomerGreeting(from, customerName, products)
          // 🎯 NO sobrescribir estado - handleReturningCustomerGreeting ya maneja el estado correctamente
          // await this.setConversationState(from, this.STATES.BROWSING, preservedContext) // ❌ COMENTADO: Esto sobrescribía el estado VIP
        } else {
          // 🆕 Cliente nuevo sin nombre - solicitar nombre antes de mostrar productos
          console.log(`🆕 Cliente nuevo detectado en saludo - solicitando nombre`)
          await this.askForCustomerName(from)
          // No establecer estado aquí, askForCustomerName ya lo hace
          return true // Indicar que se procesó como saludo
        }
      } else if (intent.intent === 'seeking_advice' || intent.suggested_response_type === 'recommend_specific_products') {
        // Consulta específica - procesarla directamente
        console.log(`🔍 NUEVA CONSULTA ESPECÍFICA en sesión nueva: "${messageText}"`)
        await this.setConversationState(from, this.STATES.BROWSING, preservedContext)
        // Continuar con el procesamiento normal de la consulta
        return false // No hacer return, continuar procesando
      } else {
        // Otros tipos - estado browsing general
        await this.setConversationState(from, this.STATES.BROWSING, preservedContext)
      }
      
      // Si fue saludo, terminar aquí. Si no, continuar procesando
      return intent.intent === 'greeting'
      
    } catch (error) {
      console.error('Error procesando nueva sesión:', error)
      return false
    }
  }
  async processCustomerIntent(from, messageText, intent, products, currentState, conversationData, recentHistory) {
    // 🎯 VERIFICAR PRODUCTOS DE INTERÉS ANTES DE PROCESAR
    let productContext = null;
    try {
      productContext = await this.interestTracker.getProductContext(from);
      if (productContext.hasActiveInterest) {
        console.log(`🎯 [INTEREST TRACKER] Cliente tiene ${productContext.totalInterested} productos de interés activos`);
        
        // Si el mensaje hace referencia a productos de interés, añadir contexto
        const isReference = productContext.interestedProducts.some(p => 
          messageText.toLowerCase().includes(p.name.toLowerCase().substring(0, 8)) ||
          messageText.toLowerCase().includes('iPhone') && p.name.toLowerCase().includes('iphone')
        );
        
        if (isReference || this.isImplicitProductReference(messageText)) {
          console.log(`🎯 [CONTEXT] Mensaje hace referencia a productos de interés - agregando contexto`);
          // Añadir productos de interés al contexto del intent
          if (!intent.products_mentioned) intent.products_mentioned = [];
          
          productContext.interestedProducts.forEach(interestedProduct => {
            intent.products_mentioned.push({
              id: interestedProduct.id,
              name: interestedProduct.name,
              source: 'interest_tracker'
            });
          });
        }
      }
    } catch (error) {
      console.error('❌ Error consultando productos de interés:', error);
    }
    
    // 🔐 MANEJAR ESTADOS ADMINISTRATIVOS PRIMERO
    if (this.isAdminState(currentState)) {
      await this.processAdminState(from, messageText, currentState, conversationData)
      return // Salir aquí para no procesar lógica de ventas
    }

    // 🌟 MANEJAR ESTADOS VIP CAMPAIGN PRIMERO
    if (this.isVipCampaignState(currentState)) {
      await this.processVipCampaignState(from, messageText, currentState, conversationData)
      return // Salir aquí para no procesar lógica de ventas normal
    }

    // Manejar estado ASKING_NAME primero
    if (currentState === this.STATES.ASKING_NAME) {
      const processedName = await this.processReceivedName(from, messageText)
      if (processedName) {
        // Nombre procesado exitosamente, continuar con flujo normal
        console.log(`✅ Nombre guardado: ${processedName} para ${from}`)
      }
      return // Salir aquí para no procesar más lógica
    }

    // 🔍 OBTENER NOMBRE DEL CLIENTE para estados que lo requieren
    const customerName = await this.getCustomerName(from)

    // 📞 Manejar estado AWAITING_SPECIALIST - esperando datos de contacto para especialista
    if (currentState === this.STATES.AWAITING_SPECIALIST) {
      await this.handleSpecialistContactData(from, messageText, conversationData, customerName)
      return // Salir aquí para no procesar más lógica
    }

    // 🎭 VERIFICAR TRANSICIÓN DE ESTADO EMOCIONAL
    const hadEmotionalTransition = await this.checkEmotionalStateTransition(from, intent, currentState)
    if (hadEmotionalTransition) {
      // Si hubo transición, actualizar el estado actual
      currentState = await this.getConversationState(from)
      console.log(`🎭 Estado actualizado después de transición emocional: ${currentState}`)
    }

    // 🆕 NUEVA DETECCIÓN INTELIGENTE DE SESIÓN
    const sessionDetection = await this.isNewSessionDetected(from, messageText, currentState, conversationData)
    
    // 👋 CASO ESPECIAL: Saludo en estado crítico - responder Y mostrar productos VIP sin limpiar memoria
    if (sessionDetection.shouldRespond && !sessionDetection.isNewSession) {
      console.log(`👋 Respondiendo saludo sin limpiar memoria en estado crítico: ${currentState}`)
      const customerName = await this.getCustomerName(from)
      
      // 🧽 LIMPIAR SOLO IMÁGENES (permitir reenvío) PERO MANTENER MEMORIA DE SESIÓN
      await this.clearImageHistory(from)
      console.log(`🧽 Historial de imágenes limpiado para permitir reenvío (memoria de sesión preservada)`)      
      
      // 🌟 EJECUTAR FLUJO VIP COMPLETO MANTENIENDO MEMORIA EXISTENTE
      console.log(`🌟 Ejecutando flujo VIP para cliente ${customerName} manteniendo memoria`)
      await this.handleReturningCustomerGreeting(from, customerName, products)
      
      // 🎯 ACTUALIZAR ESTADO SEGÚN RESULTADO DEL FLUJO VIP
      const clienteInfo = await this.getClienteRecurrenteInfo(from)
      if (clienteInfo && clienteInfo.nivel_cliente === 'VIP') {
        // Cliente VIP - establecer estado VIP apropiado
        this.setConversationState(from, this.STATES.BROWSING, {
          ...conversationData,
          customer_name: customerName,
          cliente_nivel: 'VIP',
          vip_greeting_shown: true,
          greeting_in_critical_state: true // Bandera para tracking
        })
        console.log(`🌟 Estado actualizado a BROWSING para cliente VIP ${customerName}`)
      } else {
        // Cliente regular - saludo simple
        await this.sendMessage(from, `¡Hola de nuevo ${customerName}! 🙋‍♂️ ¿Cómo puedo ayudarte?`)
        this.addToHistory(from, 'assistant', `¡Hola de nuevo ${customerName}! 🙋‍♂️ ¿Cómo puedo ayudarte?`)
      }
      
      return // Terminar aquí sin procesar más
    }
    
    if (sessionDetection.isNewSession) {
      const shouldContinueProcessing = await this.processNewSession(from, messageText, intent, products, conversationData, sessionDetection)
      
      // Si fue un saludo, terminar aquí. Si no, continuar procesando el mensaje
      if (shouldContinueProcessing) {
        return // Saludo procesado, no continuar
      }
      
      // Actualizar estado y datos después de procesar nueva sesión
      currentState = await this.getConversationState(from)
      conversationData = await this.getConversationData(from)
      console.log(`🔄 Estado actualizado después de nueva sesión: ${currentState}`)
    }

    // 🔄 MANEJO LEGACY: COMPLETED - mantener lógica original como fallback
    if (currentState === this.STATES.COMPLETED) {
      // 🆕 NUEVA SESIÓN DETECTADA: Cualquier mensaje después de completed es nueva sesión
      console.log(`🆕 NUEVA SESIÓN DETECTADA (LEGACY) para ${from} - Estado previo: completed`)
      
      const customerName = await this.getCustomerName(from)
      
      // 🧽 LIMPIAR HISTORIAL DE IMÁGENES para nueva sesión
      await this.clearImageHistory(from)
      console.log(`🧽 Historial de imágenes limpiado para nueva sesión de ${customerName}`)
      
      // 🧠 LIMPIAR MEMORIA DE SESIÓN para nueva sesión (sistema temporal)
      await this.sessionMemory.clearSessionMemory(from)
      console.log(`🧠 Memoria de sesión limpiada para nueva sesión de ${customerName}`)
      
      // 🧠🔄 LIMPIAR MEMORIA DUAL para nueva sesión (VIP + Inventario)
      await this.dualMemory.clearClientMemory(from)
      console.log(`🧠🔄 Memoria dual limpiada para nueva sesión de ${customerName}`)
      
      // 🔧 PRESERVAR CONTEXTO: Mantener información importante al reiniciar conversación
      const preservedContext = {}
      if (conversationData.customer_name) {
        preservedContext.customer_name = conversationData.customer_name
      }
      if (conversationData.cliente_nivel) {
        preservedContext.cliente_nivel = conversationData.cliente_nivel
      }
      if (conversationData.es_recurrente) {
        preservedContext.es_recurrente = conversationData.es_recurrente
      }
      if (conversationData.total_pedidos) {
        preservedContext.total_pedidos = conversationData.total_pedidos
      }
      
      // Convertir interés reciente en productos de interés actuales
      if (conversationData.recent_interest) {
        preservedContext.interested_products = conversationData.recent_interest
        console.log(`🔧 CONTEXTO RESTAURADO: Productos de interés previos disponibles`)
      }

      // 🎯 DETERMINAR ESTADO INICIAL SEGÚN TIPO DE MENSAJE
      if (intent.intent === 'greeting') {
        // Saludo formal - verificar si tenemos el nombre del cliente
        if (customerName) {
          await this.handleReturningCustomerGreeting(from, customerName, products)
          // 🎯 NO sobrescribir estado - handleReturningCustomerGreeting ya maneja el estado correctamente
          // await this.setConversationState(from, this.STATES.BROWSING, preservedContext) // ❌ COMENTADO: Esto sobrescribía el estado VIP
        } else {
          // 🆕 Cliente nuevo sin nombre - solicitar nombre antes de mostrar productos
          console.log(`🆕 Cliente nuevo detectado en caso LEGACY - solicitando nombre`)
          await this.askForCustomerName(from)
          return // Salir aquí, askForCustomerName maneja el flujo
        }
        // 🎯 NO sobrescribir estado para saludos - handleReturningCustomerGreeting ya maneja el estado
      } else if (intent.intent === 'seeking_advice' || intent.suggested_response_type === 'recommend_specific_products') {
        // Consulta específica - procesarla directamente
        console.log(`🔍 NUEVA CONSULTA ESPECÍFICA en sesión nueva: "${messageText}"`)
        await this.setConversationState(from, this.STATES.BROWSING, preservedContext)
        // Continuar con el procesamiento normal de la consulta
      } else {
        // Otros tipos - estado browsing general
        await this.setConversationState(from, this.STATES.BROWSING, preservedContext)
      }
      
      // Si no es saludo, continuar procesando el mensaje actual
      if (intent.intent !== 'greeting') {
        // No hacer return aquí para que continúe procesando la consulta
        console.log(`🔄 Continuando procesamiento de consulta en nueva sesión`)
      } else {
        return // Solo return si fue saludo
      }
    }

    // 🔐 MANEJAR ACTIVACIÓN DE MODO ADMINISTRATIVO
    if (this.isAdminModeActivation(messageText)) {
      await this.handleAdminModeActivation(from, messageText, customerName)
      return
    }

    // 🔐 MANEJAR DESACTIVACIÓN DE MODO ADMINISTRATIVO
    if (this.isAdminModeDeactivation(messageText) && this.isAdminState(currentState)) {
      await this.handleAdminModeDeactivation(from, customerName)
      return
    }

    // Si no tenemos nombre y no estamos en ASKING_NAME, solicitarlo
    if (!customerName && currentState === this.STATES.INITIAL) {
      await this.askForCustomerName(from)
      return // Salir aquí para esperar el nombre
    }

    // 🎭 MANEJAR ESTADO EMOTIONAL_SUPPORT
    if (currentState === this.STATES.EMOTIONAL_SUPPORT) {
      // Si sigue necesitando apoyo emocional, continuar con respuesta emocional
      if (intent.needs_emotional_response) {
        await this.handleEmotionalResponse(from, messageText, intent, customerName, currentState)
        return
      } else {
        // Si ya no necesita apoyo emocional, hacer transición automática
        await this.returnFromEmotionalState(from)
        currentState = await this.getConversationState(from) // Actualizar estado
        console.log(`🎭 Transición automática completada, nuevo estado: ${currentState}`)
        // Continuar con el procesamiento normal
      }
    }

    // 🌟 LÓGICA ESPECIAL VIP: Si cliente está en SPECIFYING con contexto VIP, usar productos VIP del contexto
    if (currentState === this.STATES.SPECIFYING &&
        conversationData.vip_product_context &&
        conversationData.selected_products &&
        intent.quantity_mentioned > 0) {

      console.log(`🌟 INTERCEPTANDO SPECIFYING VIP - Usando productos del contexto VIP`)
      console.log(`🌟 Productos VIP del contexto:`, conversationData.selected_products)
      console.log(`🌟 Cantidad detectada:`, intent.quantity_mentioned)

      // Usar productos VIP del contexto en lugar de los detectados por Gemini
      const vipProductsToConfirm = conversationData.selected_products
      const finalQuantity = intent.quantity_mentioned

      // Validar límites VIP antes de confirmar
      const selectedVipProduct = vipProductsToConfirm[0]
      if (selectedVipProduct && selectedVipProduct.limite_por_cliente) {
        if (finalQuantity > selectedVipProduct.limite_por_cliente) {
          await this.sendMessage(from,
            `⚠️ Lo siento ${customerName}, el límite máximo por cliente para este producto VIP es de ${selectedVipProduct.limite_por_cliente} unidades.\n\n` +
            `¿Te gustaría comprar ${selectedVipProduct.limite_por_cliente} unidades?`
          )
          return
        }
      }

      // Validar stock VIP disponible
      if (selectedVipProduct && selectedVipProduct.stock_disponible) {
        if (finalQuantity > selectedVipProduct.stock_disponible) {
          await this.sendMessage(from,
            `⚠️ Lo siento ${customerName}, solo tenemos ${selectedVipProduct.stock_disponible} unidades disponibles para esta oferta VIP.\n\n` +
            `¿Te gustaría comprar ${selectedVipProduct.stock_disponible} unidades?`
          )
          return
        }
      }

      // Proceder con confirmación VIP
      await this.handleAskConfirmation(from, intent, conversationData, customerName, vipProductsToConfirm)
      this.setConversationState(from, this.STATES.CONFIRMING, {
        ...conversationData,
        pending_order: {
          products: vipProductsToConfirm,
          quantity: finalQuantity
        },
        order_processed: false,
        vip_order_context: true // Marcar como pedido VIP
      })
      return
    }

    // 🎯 TRANSICIÓN MEJORADA: INTERESTED → SPECIFYING (solo cuando cliente da características específicas DE COMPRA)
    if (currentState === this.STATES.INTERESTED &&
        intent.intent === 'specifying' &&
        intent.products_mentioned.length > 0) {

      console.log(`🎯 TRANSICIÓN AUTOMÁTICA: INTERESTED → SPECIFYING para ${customerName}`)

      // Procesar especificación y pedir cantidad
      await this.handleAskQuantity(from, intent, conversationData, customerName, recentHistory)

      this.setConversationState(from, this.STATES.SPECIFYING, {
        ...conversationData,
        selected_products: intent.products_mentioned,
        quantity: intent.quantity_mentioned || 1
      })
      return
    }
    
    // 🚫 TRANSICIÓN RESTRICTIVA: INTERESTED → SPECIFYING (solo con intención EXPLÍCITA de compra)
    if (currentState === this.STATES.INTERESTED &&
        intent.products_mentioned.length > 0 &&
        intent.quantity_mentioned === 0 && // Sin cantidad específica aún
        intent.intent === 'specifying' && // DEBE ser intención de especificar para compra
        !messageText.toLowerCase().includes('información') && // NO debe ser consulta de información
        !messageText.toLowerCase().includes('más información') && // NO debe ser consulta de información
        !messageText.toLowerCase().includes('detalles') && // NO debe ser consulta de detalles
        !messageText.toLowerCase().includes('características') && // NO debe ser consulta de características
        !intent.is_explicit_confirmation) { // No es confirmación explícita

      console.log(`🎯 TRANSICIÓN CONTROLADA: INTERESTED → SPECIFYING para ${customerName} (intención de compra detectada)`)

      // Forzar que vaya a preguntar cantidad
      await this.handleAskQuantity(from, intent, conversationData, customerName, recentHistory)

      this.setConversationState(from, this.STATES.SPECIFYING, {
        ...conversationData,
        selected_products: intent.products_mentioned,
        quantity: 1 // Cantidad por defecto
      })
      return
    }

    // 🚫 LÓGICA ESPECIAL CORREGIDA: Solo avanzar a confirmación si cliente ya especificó cantidad explícitamente
    // ⚠️ CONDICIÓN CRÍTICA: El cliente debe estar en proceso de compra activa con cantidad específica
    if (currentState === this.STATES.INTERESTED &&
        intent.products_mentioned.length > 0 &&
        intent.quantity_mentioned > 0 && // 🔑 DEBE especificar cantidad explícitamente
        intent.intent === 'confirming' && // 🔑 DEBE ser confirmación explícita
        intent.is_explicit_confirmation && // 🔑 DEBE ser confirmación clara
        conversationData.displayed_products && // 🔑 DEBE haber visto productos
        conversationData.displayed_products.length > 0) { // 🔑 VALIDAR que hay productos mostrados

      console.log(`🎯 TRANSICIÓN DIRECTA JUSTIFICADA: INTERESTED → CONFIRMING para ${customerName} (cantidad explícita: ${intent.quantity_mentioned})`)

      const finalQuantity = intent.quantity_mentioned

      // 🎯 USAR PRODUCTOS ESPECÍFICOS MOSTRADOS, no todos los detectados por IA
      let productsToConfirm = []
      
      // 🔍 Si cliente especifica cantidad "1", debe referirse al producto específico mostrado
      if (finalQuantity === 1 && conversationData.displayed_products.length > 1) {
        // Cliente probablemente se refiere al último producto mostrado o mencionado
        console.log(`🎯 Cliente especifica cantidad 1, determinando producto específico...`)
        
        // Buscar producto más específico basado en el mensaje del cliente
        const messageTextLower = messageText.toLowerCase()
        let selectedProduct = null
        
        // Buscar producto específico mencionado
        for (const product of conversationData.displayed_products) {
          const productNameLower = product.name?.toLowerCase() || ''
          if (messageTextLower.includes('14') && productNameLower.includes('14')) {
            selectedProduct = product
            break
          } else if (messageTextLower.includes('15') && productNameLower.includes('15')) {
            selectedProduct = product
            break
          } else if (messageTextLower.includes('16') && productNameLower.includes('16')) {
            selectedProduct = product
            break
          }
        }
        
        // Si no se detectó producto específico, usar el primero (más conservador)
        if (!selectedProduct && conversationData.displayed_products.length > 0) {
          selectedProduct = conversationData.displayed_products[0]
        }
        
        if (selectedProduct) {
          productsToConfirm = [selectedProduct]
          console.log(`🎯 PRODUCTO ESPECÍFICO SELECCIONADO: ${selectedProduct.name} (ID: ${selectedProduct.id})`)
        }
      } else {
        // Para otras cantidades, usar productos del contexto
        productsToConfirm = conversationData.displayed_products
      }
      
      // Si no hay productos para confirmar, ir a SPECIFYING
      if (productsToConfirm.length === 0) {
        console.log(`⚠️ No hay productos para confirmar, dirigiendo a SPECIFYING`)
        // Ir a ask_quantity en lugar de confirmación
        await this.handleAskQuantity(from, intent, conversationData, customerName, recentHistory)
        this.setConversationState(from, this.STATES.SPECIFYING, {
          ...conversationData,
          selected_products: intent.products_mentioned,
          quantity: intent.quantity_mentioned || 1
        })
        return
      } else {
        // Avanzar a confirmación con productos específicos
        console.log(`🔍 DEBUG LÓGICA ESPECIAL CORREGIDA - Creando pending_order:`, {
          products: productsToConfirm,
          quantity: finalQuantity
        })
        await this.handleAskConfirmation(from, intent, conversationData, customerName, productsToConfirm)
        this.setConversationState(from, this.STATES.CONFIRMING, {
          ...conversationData,
          pending_order: {
            products: productsToConfirm,
            quantity: finalQuantity
          },
          order_processed: false  // Resetear para permitir nuevo pedido
        })
        return
      }
    }

    // 📞 MANEJO ESPECIAL: Detectar solicitud de especialista en estado CONFIRMING
    if (currentState === this.STATES.CONFIRMING &&
        (messageText.toLowerCase().includes('especialista') ||
         messageText.toLowerCase().includes('llamada') ||
         messageText.toLowerCase().includes('telefono') ||
         messageText.toLowerCase().includes('teléfono'))) {

      console.log(`📞 SOLICITUD DE ESPECIALISTA DETECTADA en estado CONFIRMING para ${customerName}`)
      await this.handleSpecialistRequest(from, conversationData, customerName)
      return
    }

    // 🤔 LÓGICA MEJORADA: Manejar preguntas condicionales como "Si quiero comprarlo"
    if (intent.intent === 'seeking_advice' &&
        (messageText.toLowerCase().includes('si quiero comprar') ||
         messageText.toLowerCase().includes('si lo compro') ||
         messageText.toLowerCase().includes('si me interesa') ||
         messageText.toLowerCase().includes('si quisiera')) &&
        (currentState === this.STATES.INTERESTED || currentState === this.STATES.BROWSING)) {

      console.log(`🤔 PREGUNTA CONDICIONAL DETECTADA: "${messageText}" - Convirtiendo en especificación de compra`)
      
      // 🔍 Buscar productos del contexto
      let productsToSpecify = []
      
      // Prioridad 1: Productos ya mencionados en el intent
      if (intent.products_mentioned && intent.products_mentioned.length > 0) {
        productsToSpecify = intent.products_mentioned
      }
      // Prioridad 2: Productos de interés del contexto
      else if (conversationData.interested_products && conversationData.interested_products.length > 0) {
        productsToSpecify = conversationData.interested_products.map(p => ({
          id: p.id,
          name: p.name
        }))
      }
      // Prioridad 3: Productos mostrados recientemente
      else if (conversationData.displayed_products && conversationData.displayed_products.length > 0) {
        // Usar el último producto mostrado
        const lastProduct = conversationData.displayed_products[conversationData.displayed_products.length - 1]
        productsToSpecify = [{
          id: lastProduct.id,
          name: lastProduct.name
        }]
      }
      
      if (productsToSpecify.length > 0) {
        console.log(`📝 PRODUCTOS PARA ESPECIFICAR: ${productsToSpecify.map(p => p.name).join(', ')}`)
        
        // Convertir pregunta condicional en especificación de producto
        const conditionalIntent = {
          intent: 'specifying',
          products_mentioned: productsToSpecify,
          quantity_mentioned: 0,
          suggested_response_type: 'ask_quantity'
        }
        
        // Procesar como si fuera una especificación de compra
        await this.handleAskQuantity(from, conditionalIntent, conversationData, customerName, recentHistory)
        
        this.setConversationState(from, this.STATES.SPECIFYING, {
          ...conversationData,
          selected_products: productsToSpecify,
          quantity: 1 // Cantidad por defecto
        })
        return
      } else {
        console.log(`⚠️ No se encontraron productos en el contexto para la pregunta condicional`)
        // Continuar con el flujo normal si no hay productos del contexto
      }
    }



    // 🎯 TRANSICIÓN ADICIONAL: INTERESTED → SPECIFYING (cuando cliente confirma interés específico)
    if (currentState === this.STATES.INTERESTED &&
        (intent.intent === 'interested' || intent.intent === 'confirming') &&
        conversationData.displayed_products &&
        conversationData.displayed_products.length > 0 &&
        (messageText.toLowerCase().includes('si') ||
         messageText.toLowerCase().includes('quiero') ||
         messageText.toLowerCase().includes('ese') ||
         messageText.toLowerCase().includes('esa') ||
         messageText.toLowerCase().includes('me interesa'))) {

      console.log(`🎯 TRANSICIÓN MANUAL: INTERESTED → SPECIFYING para ${customerName} (confirmación detectada)`)

      // 🔍 DETECTAR PRODUCTO ESPECÍFICO mencionado por el cliente
      let selectedProduct = null
      const messageTextLower = messageText.toLowerCase()

      // Buscar si el cliente menciona un modelo específico
      for (const product of conversationData.displayed_products) {
        const productNameLower = product.name.toLowerCase()

        // Verificar si el mensaje contiene referencias específicas al producto
        if (messageTextLower.includes('iphone 14') && productNameLower.includes('iphone 14')) {
          selectedProduct = product
          break
        } else if (messageTextLower.includes('iphone 15') && productNameLower.includes('iphone 15')) {
          selectedProduct = product
          break
        } else if (messageTextLower.includes('iphone 16') && productNameLower.includes('iphone 16')) {
          selectedProduct = product
          break
        }
      }

      // Si no se detectó producto específico, usar el último mostrado
      if (!selectedProduct) {
        selectedProduct = conversationData.displayed_products[conversationData.displayed_products.length - 1]
      }

      console.log(`🎯 PRODUCTO SELECCIONADO: ${selectedProduct.name} (ID: ${selectedProduct.id})`)

      const manualIntent = {
        intent: 'specifying',
        products_mentioned: [{
          id: selectedProduct.id,
          name: selectedProduct.name
        }],
        quantity_mentioned: 1
      }

      // Procesar especificación y pedir cantidad
      await this.handleAskQuantity(from, manualIntent, conversationData, customerName, recentHistory)

      this.setConversationState(from, this.STATES.SPECIFYING, {
        ...conversationData,
        selected_products: manualIntent.products_mentioned,
        quantity: manualIntent.quantity_mentioned
      })
      return
    }

    // 🚫 MANEJO ESPECIAL: Detectar cancelación en estado CONFIRMING
    if (currentState === this.STATES.CONFIRMING &&
        (messageText.toLowerCase().trim() === 'no' ||
         messageText.toLowerCase().includes('cancelar') ||
         messageText.toLowerCase().includes('no quiero'))) {

      console.log(`🚫 CANCELACIÓN DETECTADA en estado CONFIRMING para ${customerName}`)

      // Limpiar pending_order y volver a navegación
      await this.handleOrderCancellation(from, customerName)
      this.setConversationState(from, this.STATES.BROWSING, {
        ...conversationData,
        pending_order: null,
        order_processed: false
      })
      return
    }

    // 🔧 CORRECCIÓN: Si está en SPECIFYING y especifica cantidad, ir a confirmación
    if (currentState === this.STATES.SPECIFYING &&
        intent.quantity_mentioned > 0 &&
        conversationData.selected_products &&
        conversationData.selected_products.length > 0) {

      console.log(`🔧 CORRECCIÓN: SPECIFYING → ASK_CONFIRMATION para ${customerName} (cantidad especificada: ${intent.quantity_mentioned})`)

      // Forzar que vaya a ask_confirmation en lugar de process_order
      intent.suggested_response_type = 'ask_confirmation'
    }

    try {
      console.log(`🔍 DEBUG SWITCH: suggested_response_type="${intent.suggested_response_type}", currentState="${currentState}", is_explicit_confirmation=${intent.is_explicit_confirmation}`)
      
      // 🧠 NUEVO: CAPTURA AUTOMÁTICA DE PREGUNTAS PENDIENTES
      // Solo capturar preguntas si el cliente NO ha especificado un producto aún
      if (intent.intent === 'seeking_advice' && 
          intent.products_mentioned.length === 0 && 
          currentState !== this.STATES.SPECIFYING) {
        
        const extractedQuestions = this.extractQuestionsFromMessage(messageText);
        
        if (extractedQuestions.length > 0) {
          console.log(`🧠 Preguntas detectadas para guardar:`, extractedQuestions);
          
          // Guardar preguntas pendientes por 10 minutos
          await this.savePendingQuestions(from, extractedQuestions, null);
          
          console.log(`✅ Preguntas pendientes guardadas automáticamente para ${from}`);
        }
      }
      
      // 🎆 LÓGICA VIP ESPECIAL: Interceptar SPECIFYING con contexto VIP (CRÍTICO PARA PRECIOS)
    if (currentState === this.STATES.SPECIFYING &&
        conversationData.vip_product_context &&
        conversationData.selected_products &&
        intent.quantity_mentioned > 0) {

      console.log(`🎆 INTERCEPTANDO SPECIFYING VIP - Usando productos del contexto VIP`)
      console.log(`🎆 Productos VIP del contexto:`, conversationData.selected_products)
      console.log(`🎆 Cantidad detectada:`, intent.quantity_mentioned)

      // Usar productos VIP del contexto en lugar de los detectados por Gemini
      const vipProductsToConfirm = conversationData.selected_products
      const finalQuantity = intent.quantity_mentioned

      // Validar límites VIP antes de confirmar
      const selectedVipProduct = vipProductsToConfirm[0]
      if (selectedVipProduct && selectedVipProduct.limite_por_cliente) {
        if (finalQuantity > selectedVipProduct.limite_por_cliente) {
          await this.sendMessage(from,
            `⚠️ Lo siento ${customerName}, el límite máximo por cliente para este producto VIP es de ${selectedVipProduct.limite_por_cliente} unidades.\n\n` +
            `¿Te gustaría comprar ${selectedVipProduct.limite_por_cliente} unidades?`
          )
          return
        }
      }

      // Validar stock VIP disponible
      if (selectedVipProduct && selectedVipProduct.stock_disponible) {
        if (finalQuantity > selectedVipProduct.stock_disponible) {
          await this.sendMessage(from,
            `⚠️ Lo siento ${customerName}, solo tenemos ${selectedVipProduct.stock_disponible} unidades disponibles para esta oferta VIP.\n\n` +
            `¿Te gustaría comprar ${selectedVipProduct.stock_disponible} unidades?`
          )
          return
        }
      }

      // Proceder con confirmación VIP usando productos VIP
      await this.handleAskConfirmation(from, intent, conversationData, customerName, vipProductsToConfirm)
      this.setConversationState(from, this.STATES.CONFIRMING, {
        ...conversationData,
        pending_order: {
          products: vipProductsToConfirm, // 🎯 USAR PRODUCTOS VIP, NO NORMALES
          quantity: finalQuantity
        },
        order_processed: false,
        vip_order_context: true // 🌟 Marcar como pedido VIP
      })
      return
    }

    // 📝 Continuar con lógica normal si no es caso VIP especial
    
    // 🔧 CORRECCIÓN CRÍTICA: Procesar respuestas numéricas en estado SPECIFYING
    if (currentState === this.STATES.SPECIFYING) {
      const isNumericResponse = /^\d+$/.test(messageText.trim())
      
      if (isNumericResponse && conversationData.selected_products && conversationData.selected_products.length > 0) {
        console.log(`🔧 CORRECCIÓN: SPECIFYING → ASK_CONFIRMATION para ${customerName} (cantidad especificada: ${messageText})`)
        
        const quantity = parseInt(messageText.trim())
        const selectedProducts = conversationData.selected_products
        
        console.log(`🎯 PROCESANDO CANTIDAD ${quantity} para productos:`, selectedProducts.map(p => p.name || p.nombre))
        
        // Crear intent manual para procesar cantidad
        const quantityIntent = {
          intent: 'confirming',
          confidence: 'high',
          products_mentioned: selectedProducts,
          quantity_mentioned: quantity,
          is_explicit_confirmation: false,
          suggested_response_type: 'ask_confirmation'
        }
        
        // Proceder directamente a confirmación
        await this.handleAskConfirmation(from, quantityIntent, conversationData, customerName, selectedProducts)
        
        this.setConversationState(from, this.STATES.CONFIRMING, {
          ...conversationData,
          pending_order: {
            products: selectedProducts,
            quantity: quantity
          },
          order_processed: false
        })
        return
      }
    }
    
    // 🚑 CORRECCIÓN CRÍTICA: Corregir flujo de cantidad antes de procesar
    const correctedResponseType = this.correctFlowForQuantityAsk(intent, currentState, conversationData, messageText)
    if (correctedResponseType !== intent.suggested_response_type) {
      console.log(`🎯 FLUJO CORREGIDO: ${intent.suggested_response_type} → ${correctedResponseType} (intent: ${intent.intent}, state: ${currentState})`)
      intent.suggested_response_type = correctedResponseType
    } else {
      console.log(`🎯 FLUJO NORMAL: Usando suggested_response_type de Gemini`)
    }
    
    // 🎯 LÓGICA DE FLUJO DE ESTADOS INTELIGENTE
    const finalResponseType = this.determineCorrectFlowStep(intent, currentState, conversationData)
    console.log(`🎯 FLUJO FINAL: ${intent.suggested_response_type} → ${finalResponseType} (intent: ${intent.intent}, state: ${currentState})`)
    
    switch (finalResponseType) {
        case 'show_products':
          // 🔍 NUEVO: Si cliente está en INTERESTED y hace pregunta adicional, mantener contexto
          if (currentState === this.STATES.INTERESTED) {
            console.log(`🔍 CLIENTE EN INTERESTED hace pregunta adicional: "${messageText}"`)

            // Responder informativamente SIN cambiar de estado
            await this.handleInquiringResponse(from, messageText, customerName, products, recentHistory)

            // MANTENER estado INTERESTED y preservar contexto
            // NO cambiar a BROWSING para no perder el contexto de la conversación
            console.log(`🔍 MANTENIENDO estado INTERESTED para preservar contexto`)
            return
          }

          // Lógica original para otros estados
          // 🎯 JERARQUÍA CONTEXTUAL: Detectar si hay consulta específica
          const specificQuery = this.extractSpecificQuery(messageText)
          await this.handleShowProducts(from, customerName, products, recentHistory, specificQuery)
          this.setConversationState(from, this.STATES.BROWSING)
          break

        case 'recommend_specific_products':
          // 🔍 CORRECCIÓN NUEVA: Diferenciar entre buscar información vs interés de compra
          if (intent.intent === 'seeking_advice') {
            // Cliente busca información/consejo - usar handleAskSpecification que tiene la lógica correcta
            console.log(`🔍 Cliente busca información/consejo - llamando handleAskSpecification`)
            await this.handleAskSpecification(from, messageText, intent, products, customerName, recentHistory)
            this.setConversationState(from, this.STATES.INTERESTED)
            return // 🚫 CRÍTICO: Evitar ejecución doble de búsqueda
          } else {
            // Cliente muestra interés real de compra - usar lógica original
            console.log(`🎯 Cliente muestra interés real de compra - llamando handleRecommendSpecificProducts`)
            await this.handleRecommendSpecificProducts(from, messageText, customerName, products, recentHistory)
            this.setConversationState(from, this.STATES.INTERESTED)
          }
          break

        case 'admin_command':
          await this.handleAdminCommand(from, messageText, customerName)
          break

        case 'farewell':
          await this.handleFarewell(from, customerName)

          // 🔧 PRESERVAR CONTEXTO: Mantener información importante para futuras interacciones
          const contextToPreserve = {}
          if (conversationData.customer_name) {
            contextToPreserve.customer_name = conversationData.customer_name
          }
          if (conversationData.cliente_nivel) {
            contextToPreserve.cliente_nivel = conversationData.cliente_nivel
          }
          if (conversationData.es_recurrente) {
            contextToPreserve.es_recurrente = conversationData.es_recurrente
          }
          // Preservar productos de interés recientes para facilitar futuras compras
          if (conversationData.interested_products) {
            contextToPreserve.recent_interest = conversationData.interested_products
          }

          this.setConversationState(from, this.STATES.COMPLETED, contextToPreserve)
          break

        case 'ask_specification':
          // 🔧 CORRECCIÓN INTELIGENTE: Si hay productos de interés y se especifica cantidad, avanzar a confirmación
          if (intent.quantity_mentioned > 0 &&
              conversationData.interested_products &&
              conversationData.interested_products.length > 0 &&
              intent.products_mentioned.length === 0) {

            console.log(`🔧 CORRECCIÓN INTELIGENTE: Detectada cantidad con productos de interés previos`)
            console.log(`   - Cantidad: ${intent.quantity_mentioned}`)
            console.log(`   - Productos de interés: ${conversationData.interested_products.map(p => p.name).join(', ')}`)

            // Usar productos de interés como productos mencionados
            const correctedIntent = {
              ...intent,
              products_mentioned: conversationData.interested_products,
              confidence: 'high',
              suggested_response_type: 'ask_confirmation'
            }

            // Avanzar directamente a confirmación
            await this.handleAskConfirmation(from, correctedIntent, conversationData, customerName, conversationData.interested_products)
            this.setConversationState(from, this.STATES.CONFIRMING, {
              ...conversationData,
              pending_order: {
                products: conversationData.interested_products,
                quantity: intent.quantity_mentioned
              },
              order_processed: false
            })
            return
          }

          // 🎯 LÓGICA VIP PRIORITARIA: Interceptar referencias contextuales VIP
          const isVipClient = conversationData.cliente_nivel === 'VIP' || 
                             (conversationData.es_recurrente && conversationData.total_pedidos >= 3)
          
          if (isVipClient && conversationData.interested_products) {
            const hasVipProducts = conversationData.interested_products.some(p => p.isVip)
            const isContextualRef = /\b(ese|esa|este|esta|si\s+quiero|lo\s+quiero|comprarlo|quiero\s+comprarlo|el\s+|la\s+|oferta)\b/i.test(messageText)
            
            if (hasVipProducts && isContextualRef) {
              console.log(`🎯 VIP SWITCH: Interceptando referencia contextual VIP "${messageText}"`)
              
              const vipProducts = conversationData.interested_products.filter(p => p.isVip)
              const contextualIntent = {
                intent: 'specifying',
                confidence: 'high', 
                products_mentioned: vipProducts,
                quantity_mentioned: 0,
                suggested_response_type: 'ask_quantity'
              }
              
              await this.handleAskQuantity(from, contextualIntent, conversationData, customerName, recentHistory)
              
              this.setConversationState(from, this.STATES.SPECIFYING, {
                ...conversationData,
                selected_products: vipProducts,
                quantity: 1,
                vip_product_context: true
              })
              break
            }
          }
          
          // 📝 Flujo normal si no es VIP o no hay referencia contextual
          await this.handleAskSpecification(from, messageText, intent, products, customerName, recentHistory)

          // Mejorar gestión de contexto: preservar cantidad si se especifica
          const newStateData = {
            interested_products: intent.products_mentioned
          }

          // Si se detectó cantidad en este mensaje, guardarla
          if (intent.quantity_mentioned > 0) {
            newStateData.quantity = intent.quantity_mentioned
          }

          this.setConversationState(from, this.STATES.INTERESTED, newStateData)
          break

        case 'ask_quantity':
          await this.handleAskQuantity(from, intent, conversationData, customerName, recentHistory)

          // Mejorar transición: usar productos de interés si no hay productos mencionados específicamente
          const selectedProducts = intent.products_mentioned.length > 0
            ? intent.products_mentioned
            : conversationData.interested_products || []

          // Usar cantidad detectada o cantidad previa del contexto
          const finalQuantity = intent.quantity_mentioned || conversationData.quantity || 1

          // 🎯 CORRECCIÓN VIP: Preservar vip_product_context si hay productos VIP
          const hasVipProductsInSelection = selectedProducts.some(p => p.isVip)
          const newState = {
            ...conversationData,
            selected_products: selectedProducts,
            quantity: finalQuantity
          }
          
          // Preservar contexto VIP si hay productos VIP
          if (hasVipProductsInSelection || conversationData.vip_product_context) {
            newState.vip_product_context = true
            console.log(`🎯 PRESERVANDO vip_product_context para productos VIP en SPECIFYING`)
          }

          this.setConversationState(from, this.STATES.SPECIFYING, newState)
          break

        case 'ask_confirmation':
          const confirmQuantity = intent.quantity_mentioned || conversationData.quantity || 1

          // MEJORA: Usar productos del contexto si Gemini no detectó productos correctamente
          let productsToConfirm = intent.products_mentioned
          if (productsToConfirm.length === 0 && conversationData.selected_products) {
            productsToConfirm = conversationData.selected_products
            console.log(`🔧 CORRECCIÓN: Usando productos del contexto:`, productsToConfirm)
          }

          console.log(`🔍 DEBUG CASO NORMAL - Creando pending_order:`, {
            products: productsToConfirm,
            quantity: confirmQuantity
          })
          await this.handleAskConfirmation(from, intent, conversationData, customerName, productsToConfirm)
          this.setConversationState(from, this.STATES.CONFIRMING, {
            ...conversationData,
            pending_order: {
              products: productsToConfirm,
              quantity: confirmQuantity
            },
            order_processed: false  // Resetear para permitir nuevo pedido
          })
          break

        case 'process_order':
          if (intent.is_explicit_confirmation && currentState === this.STATES.CONFIRMING) {
            // 🚨 CRÍTICO: Usar cantidad actualizada de Gemini, no la cantidad obsoleta del pending_order
            const cantidadActualizada = intent.quantity_mentioned || conversationData.quantity || conversationData.pending_order?.quantity || 1
            console.log(`🔢 CANTIDAD CRÍTICA: Gemini detectó ${intent.quantity_mentioned}, usando ${cantidadActualizada}`)
            
            // 🎆 VALIDACIONES VIP CRÍTICAS antes de procesar
            if (conversationData.pending_order && conversationData.pending_order.products) {
              const productoVip = conversationData.pending_order.products[0]
              
              // 👤 VALIDAR LÍMITE POR CLIENTE VIP
              if (productoVip && productoVip.limite_por_cliente && cantidadActualizada > productoVip.limite_por_cliente) {
                console.log(`⚠️ LÍMITE EXCEDIDO: ${cantidadActualizada} > ${productoVip.limite_por_cliente}`)
                await this.sendMessage(from, 
                  `⚠️ Lo siento ${customerName}, el límite máximo por cliente para este producto VIP es de ${productoVip.limite_por_cliente} unidades.\n\n` +
                  `¿Te gustaría comprar ${productoVip.limite_por_cliente} unidades?`
                )
                return
              }
              
              // 📦 VALIDAR STOCK DISPONIBLE VIP
              if (productoVip && productoVip.stock_disponible && cantidadActualizada > productoVip.stock_disponible) {
                console.log(`⚠️ STOCK INSUFICIENTE: ${cantidadActualizada} > ${productoVip.stock_disponible}`)
                await this.sendMessage(from,
                  `⚠️ Lo siento ${customerName}, solo tenemos ${productoVip.stock_disponible} unidades disponibles para esta oferta VIP.\n\n` +
                  `¿Te gustaría comprar ${productoVip.stock_disponible} unidades?`
                )
                return
              }
            }
            
            // 🎆 ACTUALIZAR pending_order con cantidad correcta antes de procesar
            if (conversationData.pending_order) {
              conversationData.pending_order.quantity = cantidadActualizada
              console.log(`🔧 PENDING_ORDER ACTUALIZADO: quantity=${cantidadActualizada}`)
            }
            
            await this.handleProcessOrder(from, conversationData, customerName)
            this.setConversationState(from, this.STATES.AWAITING_SHIPPING)
          } else {
            // No es confirmación explícita, pedir clarificación
            await this.handleAskClarification(from, messageText, customerName, recentHistory)
          }
          break

        case 'emotional_response':
          // 🎭 NUEVO: Manejar respuestas emocionales
          await this.handleEmotionalResponse(from, messageText, intent, customerName, currentState)
          break

        case 'confirming':
          // 🎯 NUEVO: Manejar confirmaciones explícitas detectadas por Gemini
          console.log(`🎯 CONFIRMACIÓN DETECTADA por Gemini para ${customerName}:`, intent)
          
          // Verificar si hay productos en la confirmación
          if (intent.products_mentioned && intent.products_mentioned.length > 0) {
            // Productos específicos mencionados por Gemini - usar esos
            const quantity = intent.quantity_mentioned || 1
            
            await this.handleAskConfirmation(from, intent, conversationData, customerName, intent.products_mentioned)
            this.setConversationState(from, this.STATES.CONFIRMING, {
              ...conversationData,
              pending_order: {
                products: intent.products_mentioned,
                quantity: quantity
              },
              order_processed: false
            })
          } else {
            // No hay productos específicos - buscar en memoria de sesión
            try {
              const sessionMemory = await this.sessionMemory.getSessionMemory(from)
              if (sessionMemory && sessionMemory.displayed_products && sessionMemory.displayed_products.length > 0) {
                console.log(`🧠 Usando productos de memoria de sesión para confirmación:`, sessionMemory.displayed_products)
                
                const quantity = intent.quantity_mentioned || 1
                const lastProduct = sessionMemory.displayed_products[sessionMemory.displayed_products.length - 1]
                
                // Crear intent corregido con productos de memoria
                const correctedIntent = {
                  ...intent,
                  products_mentioned: [lastProduct]
                }
                
                await this.handleAskConfirmation(from, correctedIntent, conversationData, customerName, [lastProduct])
                this.setConversationState(from, this.STATES.CONFIRMING, {
                  ...conversationData,
                  pending_order: {
                    products: [lastProduct],
                    quantity: quantity
                  },
                  order_processed: false,
                  vip_order_context: lastProduct.isVip || false
                })
              } else {
                // Sin productos en memoria - pedir especificación
                console.log(`⚠️ No hay productos en memoria para confirmación - pidiendo especificación`)
                await this.handleAskSpecification(from, messageText, intent, products, customerName, recentHistory)
                this.setConversationState(from, this.STATES.INTERESTED)
              }
            } catch (error) {
              console.error('❌ Error consultando memoria de sesión para confirmación:', error)
              await this.handleAskSpecification(from, messageText, intent, products, customerName, recentHistory)
              this.setConversationState(from, this.STATES.INTERESTED)
            }
          }
          break

        default:
          // 🚨 NUEVO: MANEJAR RESPUESTAS NUMÉRICAS EN ESTADO BROWSING CON CONTEXTO
          if (currentState === this.STATES.BROWSING) {
            const isNumericResponse = /^\d+$/.test(messageText.trim())
            
            if (isNumericResponse) {
              console.log(`🔢 RESPUESTA NUMÉRICA EN BROWSING: "${messageText}" - Verificando contexto...`)
              
              // Buscar producto en contexto Enhanced
              const conversationData = await this.getConversationData(from)
              
              // Verificar si hay producto en contexto Enhanced
              if (conversationData.enhanced_last_product) {
                console.log(`🎯 CONTEXTO ENHANCED DETECTADO: ${conversationData.enhanced_last_product}`)
                
                const quantity = parseInt(messageText.trim())
                const productName = conversationData.enhanced_last_product
                
                // Buscar el producto específico en el inventario
                const product = products.find(p => p.nombre === productName)
                
                if (product) {
                  console.log(`🎯 PROCESANDO CANTIDAD ${quantity} para ${product.nombre}`)
                  
                  // Crear intent manual para procesar cantidad
                  const quantityIntent = {
                    intent: 'specifying',
                    products_mentioned: [{
                      id: product.id,
                      name: product.nombre
                    }],
                    quantity_mentioned: quantity,
                    confidence: 'high',
                    suggested_response_type: 'ask_confirmation'
                  }
                  
                  // Proceder a confirmación
                  await this.handleAskConfirmation(from, quantityIntent, conversationData, customerName, [{
                    id: product.id,
                    name: product.nombre,
                    price: product.precio
                  }])
                  
                  this.setConversationState(from, this.STATES.CONFIRMING, {
                    ...conversationData,
                    pending_order: {
                      products: [{
                        id: product.id,
                        name: product.nombre,
                        price: product.precio
                      }],
                      quantity: quantity
                    },
                    order_processed: false
                  })
                  
                  return
                } else {
                  console.log(`❌ No se encontró producto: ${productName}`)
                }
              }
              
              // Si no hay contexto Enhanced, continuar con lógica normal
              console.log(`⚠️ No hay contexto Enhanced válido para respuesta numérica"${messageText}"`)
            }
          }

          // 🔍 NUEVO: MANEJAR TRANSICIÓN DESDE INQUIRING A INTERESTED
          if (currentState === this.STATES.INQUIRING) {
            // Verificar si el cliente ahora muestra interés real de compra
            const showsPurchaseIntent = !this.isClientInquiring(messageText, recentHistory, currentState)

            if (showsPurchaseIntent) {
              console.log(`🔍→🎯 TRANSICIÓN: INQUIRING → INTERESTED para ${customerName}`)

              // Procesar como recomendación específica
              await this.handleRecommendSpecificProducts(from, messageText, customerName, products, recentHistory)
              this.setConversationState(from, this.STATES.INTERESTED)
              return
            } else {
              // Continúa indagando
              await this.handleInquiringResponse(from, messageText, customerName, products, recentHistory)
              return
            }
          }

          // 🎯 MANEJAR PREGUNTAS ADICIONALES EN ESTADO INTERESTED
          if (currentState === this.STATES.INTERESTED) {
            // Verificar si es una pregunta adicional sobre otros productos
            const isAdditionalInquiry = this.isClientInquiring(messageText, recentHistory, currentState)

            if (isAdditionalInquiry) {
              console.log(`🔍 PREGUNTA ADICIONAL en estado INTERESTED: "${messageText}"`)

              // Responder informativamente manteniendo el contexto
              await this.handleInquiringResponse(from, messageText, customerName, products, recentHistory)

              // MANTENER estado INTERESTED para preservar contexto
              console.log(`🔍 MANTENIENDO estado INTERESTED después de pregunta adicional`)
              return
            }

            // Verificar referencias contextuales
            const referencedProduct = await this.interpretContextualReference(messageText, conversationData, from)

            if (referencedProduct) {
              console.log(`🎯 REFERENCIA CONTEXTUAL detectada: ${referencedProduct.name}`)

              // Tratar como si hubiera mencionado el producto específicamente
              const contextualIntent = {
                intent: 'specifying',
                confidence: 'high',
                products_mentioned: [{
                  id: referencedProduct.id,
                  name: referencedProduct.name,
                  price: referencedProduct.price
                }],
                quantity_mentioned: 0,
                is_explicit_confirmation: false,
                requires_clarification: true,
                suggested_response_type: 'ask_quantity'
              }

              // Procesar como si fuera una especificación de producto
              await this.handleAskQuantity(from, contextualIntent, conversationData, customerName, recentHistory)

              this.setConversationState(from, this.STATES.SPECIFYING, {
                ...conversationData,
                selected_products: [{
                  id: referencedProduct.id,
                  name: referencedProduct.name,
                  price: referencedProduct.price
                }],
                quantity: 1 // Cantidad por defecto
              })
              return
            }
          }

          // 🔍 MANEJAR REFERENCIAS CONTEXTUALES EN ESTADO INQUIRING
          if (currentState === this.STATES.INQUIRING) {
            const referencedProduct = await this.interpretContextualReference(messageText, conversationData, from)

            if (referencedProduct) {
              console.log(`🔍 REFERENCIA CONTEXTUAL en indagación: ${referencedProduct.name}`)

              // Responder con información específica del producto referenciado
              const response = await this.gemini.generateSalesResponse(
                `Cliente se refiere específicamente a: ${referencedProduct.name}. Proporciona información detallada sobre este producto.`,
                customerName,
                [referencedProduct],
                this.STATES.INQUIRING,
                recentHistory,
                this.inventory,
                conversationData
              )

              await this.sendMessage(from, response)
              this.addToHistory(from, 'assistant', response)
              return
            }
          }

          // DETECTAR SOLICITUDES DE LISTA DE CATEGORÍAS
          if (await this.esSolicitudListaCategorias(messageText)) {
            await this.mostrarListaCategorias(from, customerName)
            this.setConversationState(from, this.STATES.BROWSING)
            return
          }

          // DETECTAR SOLICITUDES DE CATEGORÍAS ESPECÍFICAS
          const categoriaDetectada = await this.detectarSolicitudCategoria(messageText)
          if (categoriaDetectada) {
            await this.handleCategoryRequest(from, messageText, customerName, categoriaDetectada)
            this.setConversationState(from, this.STATES.BROWSING)
            return
          }

          // Respuesta general con contexto
          await this.handleGeneralResponse(from, messageText, customerName, products, currentState, recentHistory)
          break
      }
    } catch (error) {
      console.error('Error procesando intención:', error)
      await this.sendMessage(from, 'Disculpa, tuve un problema. ¿Podrías repetir tu mensaje? 🤖')
    }
  }

  // Métodos para manejar diferentes tipos de respuesta
  async handleShowProducts(from, customerName, products, recentHistory, specificQuery = null) {
    try {
      // 🔍 FILTRO VIP PARA CLIENTES CURIOSOS: Evitar que vean productos VIP
      const conversationData = await this.getConversationData(from)
      const isVipClient = conversationData.cliente_nivel === 'VIP' || 
                         (conversationData.es_recurrente && conversationData.total_pedidos >= 3)
      const isClienteCurioso = conversationData.cliente_tipo === 'curioso' || conversationData.es_curioso
      
      // 🚫 FILTRAR PRODUCTOS VIP si NO es cliente VIP
      let filteredProducts = products
      if (!isVipClient || isClienteCurioso) {
        filteredProducts = products.filter(product => {
          const productName = product.nombre || ''
          const isVipProduct = product.es_vip || 
                              productName.includes('VIP') || 
                              productName.includes('- VIP')
          
          if (isVipProduct) {
            console.log(`🚫 FILTRO VIP: Ocultando producto VIP "${productName}" para cliente curioso: ${customerName}`)
            return false
          }
          return true
        })
        
        console.log(`🔍 FILTRO VIP APLICADO: ${products.length} productos → ${filteredProducts.length} productos (${products.length - filteredProducts.length} VIP ocultos)`)
      }
      
      // 🎯 FILTRADO INTELIGENTE: Si hay consulta específica, filtrar antes de mostrar
      let productosAMostrar = []
      
      if (specificQuery) {
        console.log(`🔍 CONSULTA ESPECÍFICA DETECTADA: "${specificQuery}" - Aplicando filtrado inteligente`)
        
        // 🔍 FILTRADO ESPECÍFICO por consulta (usar productos ya filtrados por VIP)
        const filteredByQuery = this.filterProductsByQuery(filteredProducts, specificQuery)
        
        if (filteredByQuery.length > 0) {
          // Mostrar máximo 3 productos más relevantes
          productosAMostrar = filteredByQuery.slice(0, 3)
          console.log(`🎯 PRODUCTOS FILTRADOS: ${productosAMostrar.length} productos relevantes para "${specificQuery}"`)
          
          // 💬 RESPUESTA CONTEXTUAL INTELIGENTE
          const contextualMessage = await this.generateContextualProductResponse(specificQuery, productosAMostrar, customerName)
          await this.sendMessage(from, contextualMessage)
          this.addToHistory(from, 'assistant', contextualMessage)
          
          // 📱 MOSTRAR PRODUCTOS FILTRADOS
          for (const product of productosAMostrar) {
            await this.sendProductWithImage(from, product)
            // Pequeña pausa entre productos
            await new Promise(resolve => setTimeout(resolve, 1500))
          }
          
          // 🤔 PREGUNTAR POR PREFERENCIAS ESPECÍFICAS si hay más de 1 producto
          if (productosAMostrar.length > 1) {
            const preferenceMessage = `¿Tienes alguna preferencia específica entre estos modelos, ${customerName}? Por ejemplo: capacidad de almacenamiento, color, presupuesto, etc.`
            await this.sendMessage(from, preferenceMessage)
            this.addToHistory(from, 'assistant', preferenceMessage)
          }
          
          return
        } else {
          // No se encontraron productos específicos
          const noResultsMessage = `Lo siento ${customerName}, no tenemos productos que coincidan exactamente con "${specificQuery}". Te muestro algunos productos similares que podrían interesarte:`
          await this.sendMessage(from, noResultsMessage)
          this.addToHistory(from, 'assistant', noResultsMessage)
          
          // Continuar con flujo normal pero limitado (usar productos filtrados por VIP)
          productosAMostrar = filteredProducts.slice(0, 2)
        }
      }
      
      // 📦 OBTENER PRODUCTOS DESTACADOS CON FILTROS VIP APLICADOS
      let productosDestacados = await this.inventory.getDestacados()
      
      // 🚫 APLICAR FILTRO VIP a productos destacados si NO es cliente VIP
      if (!isVipClient || isClienteCurioso) {
        const originalCount = productosDestacados.length
        productosDestacados = productosDestacados.filter(product => {
          const productName = product.nombre || ''
          const isVipProduct = product.es_vip || 
                              productName.includes('VIP') || 
                              productName.includes('- VIP')
          
          if (isVipProduct) {
            console.log(`🚫 FILTRO VIP DESTACADOS: Ocultando producto VIP destacado "${productName}" para cliente curioso: ${customerName}`)
            return false
          }
          return true
        })
        
        console.log(`📦 FILTRO VIP DESTACADOS: ${originalCount} productos → ${productosDestacados.length} productos destacados (${originalCount - productosDestacados.length} VIP ocultos)`)
      }

      if (productosDestacados.length > 0) {
        // Generar saludo personalizado según historial del cliente
        const introMessage = await this.generatePersonalizedGreeting(from, customerName)
        await this.sendMessage(from, introMessage)
        this.addToHistory(from, 'assistant', introMessage)

        // Enviar cada producto destacado con su imagen (máximo 5)
        const productosAMostrar = productosDestacados.slice(0, 5)
        for (const product of productosAMostrar) {
          await this.sendProductWithImage(from, product)
          // Pequeña pausa entre productos para no saturar
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        // Sugerir categorías para más opciones
        await this.sugerirCategorias(from, customerName)
      } else {
        // Fallback: si no hay productos destacados, mostrar algunos productos normales
        const productosLimitados = products.slice(0, 3)
        const introMessage = `¡Hola ${customerName}! 😊 Aquí tienes algunos de nuestros productos disponibles:`
        await this.sendMessage(from, introMessage)
        this.addToHistory(from, 'assistant', introMessage)

        for (const product of productosLimitados) {
          await this.sendProductWithImage(from, product)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        await this.sugerirCategorias(from, customerName)
      }
    } catch (error) {
      console.error('Error mostrando productos:', error)
      // Fallback en caso de error
      const response = await this.gemini.generateSalesResponse(
        'Muestra productos disponibles',
        customerName,
        products,
        this.STATES.INITIAL,
        recentHistory,
        this.inventory,
        await this.getConversationData(from) || {}
      )
      await this.sendMessage(from, response)
      this.addToHistory(from, 'assistant', response)
    }
  }

  // 🔐 MÉTODOS ADMINISTRATIVOS

  // Verificar si un estado es administrativo
  isAdminState(state) {
    const adminStates = [
      this.STATES.ADMIN_AUTH,
      this.STATES.ADMIN_MENU,
      this.STATES.ADMIN_ADD_PRODUCT,
      this.STATES.ADMIN_UPDATE_PRODUCT,
      this.STATES.ADMIN_UPDATE_STOCK,
      this.STATES.ADMIN_QUERY_STATS,
      this.STATES.ADMIN_LIST_PRODUCTS
    ]
    return adminStates.includes(state)
  }

  // 🌟 Verificar si el estado actual es de campaña VIP
  isVipCampaignState(state) {
    const vipCampaignStates = [
      this.STATES.VIP_CAMPAIGN_RESPONSE,
      this.STATES.VIP_OFFER_INTERESTED,
      this.STATES.VIP_OFFER_DECLINED,
      this.STATES.VIP_PURCHASE_INTENT
    ]
    return vipCampaignStates.includes(state)
  }

  // Detectar frases de activación del modo administrativo
  isAdminModeActivation(messageText) {
    const text = messageText.toLowerCase().trim()
    const activationPhrases = [
      'modo admin',
      'modo administrador',
      'administrar',
      'panel admin',
      'acceso admin',
      'gestión admin',
      'admin mode',
      'administración'
    ]

    return activationPhrases.some(phrase => text.includes(phrase))
  }

  // Detectar frases de desactivación del modo administrativo
  isAdminModeDeactivation(messageText) {
    const text = messageText.toLowerCase().trim()
    const deactivationPhrases = [
      'salir admin',
      'modo ventas',
      'volver ventas',
      'salir administración',
      'modo cliente',
      'exit admin',
      'cerrar admin',
      'finalizar admin'
    ]

    return deactivationPhrases.some(phrase => text.includes(phrase))
  }

  // Detectar comandos administrativos directos
  isDirectAdminCommand(text) {
    const directCommands = [
      'crear producto',
      'nuevo producto',
      'agregar producto',
      'actualizar stock',
      'cambiar precio',
      'modificar producto',
      'actualizar producto',
      'estadísticas',
      'ventas hoy',
      'reporte ventas',
      'inventario bajo',
      'productos agotados',
      'listar productos',
      'ver productos',
      'salir admin',
      'salir del panel',
      'cerrar admin',
      'modo ventas',
      'volver ventas'
    ]

    return directCommands.some(command => text.includes(command))
  }

  // Procesar comandos administrativos directos
  async processDirectAdminCommand(from, text, conversationData) {
    try {
      console.log(`🔐 Procesando comando directo: ${text}`)

      if (text.includes('crear producto') || text.includes('nuevo producto') || text.includes('agregar producto')) {
        // Ir directamente a creación de producto
        await this.sendMessage(from,
          `📝 *Crear Nuevo Producto*\n\n` +
          `Vamos a crear un nuevo producto paso a paso.\n\n` +
          `Paso 1/6: Envía el *nombre* del producto:`
        )
        this.setConversationState(from, this.STATES.ADMIN_ADD_PRODUCT, {
          ...conversationData,
          admin_step: 'name',
          product_data: {}
        })

      } else if (text.includes('estadísticas') || text.includes('ventas hoy') || text.includes('reporte ventas')) {
        // Ir directamente a estadísticas
        await this.handleAdminQueryStats(from, 'menu', conversationData)

      } else if (text.includes('listar productos') || text.includes('ver productos')) {
        // Ir directamente a listado
        await this.handleAdminListProducts(from, 'all', conversationData)

      } else if (text.includes('actualizar stock')) {
        // Ir directamente a actualización de stock
        await this.sendMessage(from,
          `📦 *Actualizar Stock*\n\n` +
          `Envía el *ID* o *nombre* del producto para actualizar su stock:`
        )
        this.setConversationState(from, this.STATES.ADMIN_UPDATE_STOCK, {
          ...conversationData,
          admin_step: 'search'
        })

      } else if (text.includes('modificar producto') || text.includes('cambiar precio') || text.includes('actualizar producto')) {
        // Ir directamente a actualización de producto
        await this.sendMessage(from,
          `✏️ *Actualizar Producto*\n\n` +
          `Envía el *ID* o *nombre* del producto que deseas actualizar:`
        )
        this.setConversationState(from, this.STATES.ADMIN_UPDATE_PRODUCT, {
          ...conversationData,
          admin_step: 'search'
        })

      } else if (text.includes('salir admin') || text.includes('salir del panel') || text.includes('cerrar admin') ||
                 text.includes('modo ventas') || text.includes('volver ventas')) {
        // Salir del modo administrativo
        await this.handleAdminModeDeactivation(from, await this.getCustomerName(from))

      } else {
        // Comando no reconocido, mostrar menú
        await this.sendMessage(from,
          `❓ Comando no reconocido: "${text}"\n\n` +
          `Aquí tienes el menú de opciones:`
        )
        await this.showAdminMenu(from, await this.getCustomerName(from))
      }

    } catch (error) {
      console.error('Error procesando comando directo:', error)
      await this.sendMessage(from, '❌ Error procesando comando.')
      await this.showAdminMenu(from, await this.getCustomerName(from))
    }
  }

  // Manejar activación del modo administrativo
  async handleAdminModeActivation(from, messageText, customerName) {
    try {
      console.log(`🔐 Activación de modo administrativo solicitada por ${customerName}: ${messageText}`)

      // Verificar si el sistema administrativo está habilitado
      const adminEnabled = await this.db.getConfig('admin_system_enabled')
      if (adminEnabled !== 'true') {
        await this.sendMessage(from, '❌ El sistema administrativo está deshabilitado.')
        return
      }

      // Verificar si ya tiene una sesión administrativa activa
      const activeSession = await this.db.getActiveAdminSession(from)
      if (activeSession) {
        // Ya está autenticado, ir al menú
        await this.sendMessage(from,
          `🔐 *Modo Administrativo Activado*\n\n` +
          `Ya tienes una sesión activa.\n` +
          `Bienvenido de vuelta al panel administrativo.`
        )
        await this.showAdminMenu(from, customerName)
        this.setConversationState(from, this.STATES.ADMIN_MENU)
        return
      }

      // Solicitar código de autorización con mensaje personalizado
      await this.sendMessage(from,
        `🔐 *Activando Modo Administrativo*\n\n` +
        `Hola ${customerName || 'Administrador'}, para acceder al modo administrativo necesito verificar tu identidad.\n\n` +
        `Por favor, envía tu código de autorización:\n\n` +
        `⚠️ *Importante:* Solo personal autorizado puede acceder a estas funciones.`
      )

      this.setConversationState(from, this.STATES.ADMIN_AUTH, {
        admin_command: messageText,
        admin_attempts: 0,
        activation_mode: true
      })

    } catch (error) {
      console.error('Error activando modo administrativo:', error)
      await this.sendMessage(from, '❌ Error activando modo administrativo.')
    }
  }

  // Manejar desactivación del modo administrativo
  async handleAdminModeDeactivation(from, customerName) {
    try {
      console.log(`🔐 Desactivación de modo administrativo solicitada por ${customerName}`)

      // Cerrar sesión administrativa si existe
      const conversationData = this.getConversationData(from)
      if (conversationData && conversationData.admin_session_id) {
        await this.db.closeAdminSession(conversationData.admin_session_id)
      }

      // Volver al modo de ventas
      await this.sendMessage(from,
        `👋 *Modo Administrativo Desactivado*\n\n` +
        `Has salido del panel administrativo.\n` +
        `Volviendo al modo de ventas... 🛒\n\n` +
        `¡Hola ${customerName || 'cliente'}! ¿En qué puedo ayudarte hoy?`
      )

      this.setConversationState(from, this.STATES.BROWSING)

    } catch (error) {
      console.error('Error desactivando modo administrativo:', error)
      await this.sendMessage(from, '❌ Error desactivando modo administrativo.')
    }
  }

  // Manejar comando administrativo inicial
  async handleAdminCommand(from, messageText, customerName) {
    try {
      console.log(`🔐 Comando administrativo detectado de ${customerName}: ${messageText}`)

      // Verificar si el sistema administrativo está habilitado
      const adminEnabled = await this.db.getConfig('admin_system_enabled')
      if (adminEnabled !== 'true') {
        await this.sendMessage(from, '❌ El sistema administrativo está deshabilitado.')
        return
      }

      // Verificar si ya tiene una sesión administrativa activa
      const activeSession = await this.db.getActiveAdminSession(from)
      if (activeSession) {
        // Ya está autenticado, ir al menú
        await this.showAdminMenu(from, customerName)
        this.setConversationState(from, this.STATES.ADMIN_MENU)
        return
      }

      // Solicitar código de autorización
      await this.sendMessage(from,
        `🔐 *Acceso Administrativo*\n\n` +
        `Para acceder a las funciones administrativas, envía tu código de autorización:\n\n` +
        `⚠️ *Importante:* Solo personal autorizado puede acceder a estas funciones.`
      )

      this.setConversationState(from, this.STATES.ADMIN_AUTH, {
        admin_command: messageText,
        admin_attempts: 0
      })

    } catch (error) {
      console.error('Error manejando comando administrativo:', error)
      await this.sendMessage(from, '❌ Error procesando comando administrativo.')
    }
  }

  // Procesar estados administrativos
  async processAdminState(from, messageText, currentState, conversationData) {
    try {
      switch (currentState) {
        case this.STATES.ADMIN_AUTH:
          await this.handleAdminAuth(from, messageText, conversationData)
          break

        case this.STATES.ADMIN_MENU:
          await this.handleAdminMenuSelection(from, messageText, conversationData)
          break

        case this.STATES.ADMIN_ADD_PRODUCT:
          await this.handleAdminAddProduct(from, messageText, conversationData)
          break

        case this.STATES.ADMIN_UPDATE_PRODUCT:
          await this.handleAdminUpdateProduct(from, messageText, conversationData)
          break

        case this.STATES.ADMIN_UPDATE_STOCK:
          await this.handleAdminUpdateStock(from, messageText, conversationData)
          break

        case this.STATES.ADMIN_QUERY_STATS:
          await this.handleAdminQueryStats(from, messageText, conversationData)
          break

        case this.STATES.ADMIN_LIST_PRODUCTS:
          await this.handleAdminListProducts(from, messageText, conversationData)
          break

        default:
          console.log(`⚠️ Estado administrativo no manejado: ${currentState}`)
          await this.sendMessage(from, '❌ Estado administrativo no válido.')
          this.setConversationState(from, this.STATES.INITIAL)
      }
    } catch (error) {
      console.error('Error procesando estado administrativo:', error)
      await this.sendMessage(from, '❌ Error en operación administrativa.')
      this.setConversationState(from, this.STATES.INITIAL)
    }
  }

  // 🌟 ===== MÉTODOS VIP CAMPAIGN =====

  // Procesar estados de campaña VIP
  async processVipCampaignState(from, messageText, currentState, conversationData) {
    try {
      console.log(`🌟 Procesando estado VIP: ${currentState} para ${from}`)

      switch (currentState) {
        case this.STATES.VIP_CAMPAIGN_RESPONSE:
          await this.handleVipCampaignResponse(from, messageText, conversationData)
          break

        case this.STATES.VIP_OFFER_INTERESTED:
          await this.handleVipOfferInterested(from, messageText, conversationData)
          break

        case this.STATES.VIP_OFFER_DECLINED:
          await this.handleVipOfferDeclined(from, messageText, conversationData)
          break

        case this.STATES.VIP_PURCHASE_INTENT:
          await this.handleVipPurchaseIntent(from, messageText, conversationData)
          break

        default:
          console.log(`⚠️ Estado VIP no manejado: ${currentState}`)
          await this.sendMessage(from, '❌ Estado VIP no válido.')
          this.setConversationState(from, this.STATES.BROWSING)
      }
    } catch (error) {
      console.error('Error procesando estado VIP:', error)
      await this.sendMessage(from, '❌ Error procesando campaña VIP.')
      this.setConversationState(from, this.STATES.BROWSING)
    }
  }

  // 🌟 Manejar respuesta inicial a campaña VIP
  async handleVipCampaignResponse(from, messageText, conversationData) {
    const customerName = conversationData.customer_name || 'Cliente'
    const campaignName = conversationData.campaign_name || 'Campaña VIP'

    // Normalizar respuesta
    const response = messageText.toLowerCase().trim()

    console.log(`🌟 Respuesta VIP de ${customerName}: "${messageText}"`)

    // Detectar interés positivo
    if (response.includes('si me interesa') ||
        response.includes('sí me interesa') ||
        response.includes('me interesa') ||
        (response === 'si' || response === 'sí')) {

      console.log(`✅ Cliente ${customerName} mostró interés en ${campaignName}`)

      // Cambiar a estado interesado
      this.setConversationState(from, this.STATES.VIP_OFFER_INTERESTED, {
        ...conversationData,
        response_type: 'interested',
        response_time: new Date().toISOString()
      })

      // Mostrar detalles de la oferta
      await this.showVipOfferDetails(from, conversationData)

    } else if (response.includes('no me interesa') ||
               response.includes('no gracias') ||
               response.includes('no estoy interesado')) {

      console.log(`❌ Cliente ${customerName} rechazó ${campaignName}`)

      // Cambiar a estado rechazado
      this.setConversationState(from, this.STATES.VIP_OFFER_DECLINED, {
        ...conversationData,
        response_type: 'declined',
        response_time: new Date().toISOString()
      })

      // Enviar mensaje de despedida
      await this.handleVipOfferDeclined(from, messageText, conversationData)

    } else {
      // Respuesta ambigua, pedir clarificación
      await this.sendMessage(from,
        `Hola ${customerName} 😊\n\nPara poder ayudarte mejor con nuestra ${campaignName}, por favor responde:\n\n📝 *"Si me interesa"* - si quieres conocer más detalles\n📝 *"No me interesa"* - si no es para ti en este momento\n\n¡Gracias! 🌟`)
    }
  }

  // 🌟 Mostrar detalles de la oferta VIP
  async showVipOfferDetails(from, conversationData) {
    try {
      const customerName = conversationData.customer_name || 'Cliente'
      const offerId = conversationData.offer_id



      if (!offerId) {
        // Si no hay oferta específica, mostrar mensaje genérico
        await this.sendMessage(from,
          `¡Excelente ${customerName}! 🎉\n\nMe alegra saber que te interesa nuestra oferta VIP.\n\n¿Te gustaría que te muestre nuestros productos disponibles con descuentos especiales para clientes VIP como tú?\n\nResponde *"Sí, muéstrame"* para ver las opciones disponibles.`)
        return
      }

      // Obtener detalles de la oferta desde la base de datos
      const ofertas = await this.db.getOfertasVip()
      const oferta = ofertas.find(o => o.id === offerId)

      if (!oferta) {
        console.error(`❌ Oferta VIP no encontrada: ${offerId}`)
        console.log(`🔍 DEBUG: Intentando buscar oferta activa más reciente...`)

        // 🌟 FALLBACK INTELIGENTE: Buscar la oferta activa más reciente
        const ofertasActivas = ofertas.filter(o => o.activa && (!o.fecha_fin || new Date(o.fecha_fin) > new Date()))
        if (ofertasActivas.length > 0) {
          // Usar la oferta más reciente
          oferta = ofertasActivas[ofertasActivas.length - 1]
          console.log(`✅ DEBUG: Usando oferta fallback:`, { id: oferta.id, titulo: oferta.titulo })

          // Actualizar el conversationData con la oferta correcta
          conversationData.offer_id = oferta.id
          this.setConversationState(from, this.STATES.VIP_OFFER_INTERESTED, conversationData)
        } else {
          console.log(`⚠️ DEBUG: No hay ofertas activas disponibles`)
          await this.sendMessage(from,
            `¡Excelente ${customerName}! 🎉\n\nMe alegra saber que te interesa nuestra oferta VIP.\n\n¿Te gustaría que te muestre nuestros productos disponibles?\n\nResponde *"Sí, muéstrame"* para ver las opciones.`)
          return
        }
      }

      // 🌟 OBTENER INFORMACIÓN COMPLETA DEL PRODUCTO EN OFERTA
      let productoEnOferta = null
      if (oferta.producto_regalo_id) {
        // Obtener detalles completos del producto desde el inventario (solo productos activos)
        const productos = await this.inventory.getAllProducts()
        productoEnOferta = productos.find(p => p.id === oferta.producto_regalo_id)

        // Si el producto no existe o está inactivo, buscar un producto alternativo
        if (!productoEnOferta) {
          // 🌟 PRIORIZAR PRODUCTOS VIP COMO ALTERNATIVA
          const productosVip = await this.db.getProductosVip()
          const productosVipActivos = productosVip.filter(pv => pv.activo && pv.stock > 0)

          if (productosVipActivos.length > 0) {
            // Usar el primer producto VIP disponible
            const productoVipAlternativo = productosVipActivos[0]
            productoEnOferta = {
              id: productoVipAlternativo.id,
              nombre: productoVipAlternativo.nombre,
              descripcion: productoVipAlternativo.descripcion,
              precio: productoVipAlternativo.precio_vip || productoVipAlternativo.precio_original,
              precio_original: productoVipAlternativo.precio_original,
              precio_vip: productoVipAlternativo.precio_vip,
              descuento_porcentaje: productoVipAlternativo.precio_original && productoVipAlternativo.precio_vip ?
                Math.round(((productoVipAlternativo.precio_original - productoVipAlternativo.precio_vip) / productoVipAlternativo.precio_original) * 100) : 0,
              stock: productoVipAlternativo.stock_disponible || productoVipAlternativo.stock,
              es_producto_vip: true
            }
            console.log(`✅ Usando producto VIP alternativo para oferta: ${productoEnOferta.nombre}`)
          } else {
            // Fallback: buscar productos destacados regulares
            const productosDestacados = productos.filter(p => p.destacado && p.stock > 0)
            if (productosDestacados.length > 0) {
              productoEnOferta = productosDestacados[0]
              console.log(`✅ Usando producto destacado alternativo para oferta VIP: ${productoEnOferta.nombre}`)
            }
          }
        }
      }

      // Construir mensaje con detalles de la oferta
      let mensaje = `🌟 *¡Perfecto ${customerName}!* 🌟\n\n`
      mensaje += `📋 *${oferta.titulo}*\n\n`

      // 🛍️ MOSTRAR PRODUCTO ESPECÍFICO EN OFERTA
      if (productoEnOferta) {
        mensaje += `🛍️ *Producto en oferta:*\n`
        mensaje += `   • *${productoEnOferta.nombre}*\n`

        if (productoEnOferta.descripcion) {
          mensaje += `   • ${productoEnOferta.descripcion}\n`
        }

        // 🌟 MOSTRAR PRECIOS OPTIMIZADOS PARA PRODUCTOS VIP
        if (productoEnOferta.es_producto_vip) {
          mensaje += `   • 💰 Precio original: S/ ${productoEnOferta.precio_original}\n`
          mensaje += `   • 🌟 *Tu precio VIP: S/ ${productoEnOferta.precio_vip}*\n`
          mensaje += `   • 💸 Ahorras: S/ ${(productoEnOferta.precio_original - productoEnOferta.precio_vip).toFixed(2)} (${productoEnOferta.descuento_porcentaje}% descuento)\n`

          // Aplicar descuento adicional de la oferta si existe
          if (oferta.tipo_oferta === 'descuento' && oferta.valor_descuento) {
            const precioFinal = (productoEnOferta.precio_vip * (1 - oferta.valor_descuento / 100)).toFixed(2)
            mensaje += `   • 🎯 *Precio final con oferta especial: S/ ${precioFinal}* (${oferta.valor_descuento}% descuento adicional)\n`
            mensaje += `   • 💰 Ahorro total: S/ ${(productoEnOferta.precio_original - precioFinal).toFixed(2)}\n`
          }
        } else {
          // Producto regular con descuento VIP
          mensaje += `   • 💰 Precio regular: S/ ${productoEnOferta.precio}\n`

          if (oferta.tipo_oferta === 'descuento' && oferta.valor_descuento) {
            const precioConDescuento = (productoEnOferta.precio * (1 - oferta.valor_descuento / 100)).toFixed(2)
            mensaje += `   • 🌟 *Precio VIP: S/ ${precioConDescuento}* (${oferta.valor_descuento}% descuento)\n`
            mensaje += `   • 💸 Ahorras: S/ ${(productoEnOferta.precio - precioConDescuento).toFixed(2)}\n`
          }
        }

        if (productoEnOferta.stock > 0) {
          mensaje += `   • 📦 Stock disponible: ${productoEnOferta.stock} unidades\n`
        } else {
          mensaje += `   • ⚠️ Stock limitado - ¡Consulta disponibilidad!\n`
        }

        mensaje += `\n`
      } else {
        // Fallback: mostrar oferta genérica si no hay producto específico disponible
        mensaje += `🎁 *Oferta especial disponible*\n\n`
        mensaje += `Como cliente VIP, tienes acceso a descuentos exclusivos en nuestros productos destacados.\n\n`
      }

      if (oferta.descripcion) {
        mensaje += `📝 *Detalles de la oferta:*\n${oferta.descripcion}\n\n`
      }

      if (oferta.fecha_fin) {
        const fechaFin = new Date(oferta.fecha_fin).toLocaleDateString('es-PE')
        mensaje += `⏰ *Válido hasta: ${fechaFin}*\n\n`
      }

      mensaje += `¿Te gustaría proceder con esta oferta?\n\n`
      mensaje += `📝 Responde:\n`
      mensaje += `• *"Sí, quiero comprar"* - para proceder con la compra\n`
      mensaje += `• *"Más información"* - para conocer más detalles\n`
      mensaje += `• *"Llamar"* - para atención personalizada por teléfono\n`
      mensaje += `• *"No gracias"* - si cambias de opinión`

      await this.sendMessage(from, mensaje)

    } catch (error) {
      console.error('Error mostrando detalles de oferta VIP:', error)
      const customerName = conversationData.customer_name || 'Cliente'
      await this.sendMessage(from,
        `¡Excelente ${customerName}! 🎉\n\nMe alegra saber que te interesa nuestra oferta VIP.\n\n¿Te gustaría que te muestre nuestros productos disponibles?\n\nResponde *"Sí, muéstrame"* para ver las opciones.`)
    }
  }

  // 🌟 Manejar cliente interesado en oferta VIP
  async handleVipOfferInterested(from, messageText, conversationData) {
    const customerName = conversationData.customer_name || 'Cliente'
    const response = messageText.toLowerCase().trim()

    console.log(`🌟 Cliente VIP interesado responde: "${messageText}"`)

    if (response.includes('sí, quiero comprar') ||
        response.includes('si, quiero comprar') ||
        response.includes('quiero comprar') ||
        response.includes('comprar')) {

      console.log(`🛒 Cliente ${customerName} quiere proceder con compra VIP`)

      // 🌟 MANTENER CONTEXTO VIP ESPECÍFICO - No cambiar a BROWSING genérico
      this.setConversationState(from, this.STATES.VIP_PURCHASE_INTENT, {
        customer_name: customerName,
        cliente_nivel: conversationData.customer_level || 'VIP',
        vip_offer_context: true,
        offer_id: conversationData.offer_id,
        campaign_id: conversationData.campaign_id,
        specific_vip_product: true // Bandera para indicar producto específico
      })

      // 🌟 MOSTRAR PRODUCTO VIP ESPECÍFICO DE LA CAMPAÑA (no todos los productos)
      await this.showSpecificVipProduct(from, conversationData)

    } else if (response.includes('más información') ||
               response.includes('mas información') ||
               response.includes('detalles') ||
               response.includes('información')) {

      // Mostrar información adicional
      await this.showAdditionalVipInfo(from, conversationData)

    } else if (response.includes('llamar') ||
               response.includes('llamada') ||
               response.includes('teléfono') ||
               response.includes('telefono') ||
               response.includes('hablar') ||
               response.includes('atención personalizada')) {

      console.log(`📞 Cliente ${customerName} solicita atención personalizada`)

      // Transicionar a estado de espera de especialista
      this.setConversationState(from, this.STATES.AWAITING_SPECIALIST, {
        customer_name: customerName,
        cliente_nivel: conversationData.customer_level || 'VIP',
        vip_context: true,
        offer_id: conversationData.offer_id,
        campaign_id: conversationData.campaign_id,
        specialist_reason: 'Solicitud de atención personalizada para oferta VIP'
      })

      await this.sendMessage(from,
        `📞 *¡Perfecto ${customerName}!* 📞\n\nEntiendo que prefieres una atención más personalizada para esta oferta VIP.\n\n🎯 *Para coordinar tu llamada, necesito:*\n\n📱 Tu número de teléfono preferido\n⏰ El horario que te viene mejor\n\n*Ejemplo:* "Mi número es 987654321, prefiero que me llamen entre 2pm y 6pm"\n\n¡Un especialista se comunicará contigo pronto! 😊`)

    } else if (response.includes('no gracias') ||
               response.includes('no me interesa') ||
               response.includes('cambié de opinión')) {

      console.log(`❌ Cliente ${customerName} cambió de opinión sobre oferta VIP`)

      // Transicionar a estado rechazado
      this.setConversationState(from, this.STATES.VIP_OFFER_DECLINED, {
        ...conversationData,
        response_type: 'changed_mind',
        response_time: new Date().toISOString()
      })

      await this.handleVipOfferDeclined(from, messageText, conversationData)

    } else {
      // Respuesta no clara, pedir clarificación
      await this.sendMessage(from,
        `Hola ${customerName} 😊\n\nPara ayudarte mejor, por favor responde:\n\n📝 *"Sí, quiero comprar"* - para proceder con la compra\n📝 *"Más información"* - para conocer más detalles\n📝 *"No gracias"* - si cambias de opinión\n\n¡Estoy aquí para ayudarte! 🌟`)
    }
  }

  // 🌟 Manejar oferta VIP rechazada
  async handleVipOfferDeclined(from, messageText, conversationData) {
    const customerName = conversationData.customer_name || 'Cliente'

    console.log(`❌ Procesando rechazo de oferta VIP para ${customerName}`)

    // Mensaje de despedida cordial
    const despedida = `Entiendo perfectamente ${customerName} 😊\n\nNo hay problema, respetamos tu decisión. Nuestra oferta VIP estará disponible por si cambias de opinión.\n\n¡Que tengas un excelente día y gracias por tu tiempo! 🌟\n\nSiempre estaremos aquí cuando nos necesites. ¡Hasta pronto! 👋`

    await this.sendMessage(from, despedida)

    // Transicionar a estado completado para permitir nuevas conversaciones
    this.setConversationState(from, this.STATES.COMPLETED, {
      customer_name: customerName,
      cliente_nivel: conversationData.customer_level || 'VIP',
      vip_offer_declined: true,
      declined_at: new Date().toISOString()
    })
  }

  // 🌟 Mostrar productos VIP con descuentos
  async showVipProducts(from, conversationData) {
    try {
      const customerName = conversationData.customer_name || 'Cliente'
      const offerId = conversationData.offer_id

      // 🌟 PRIORIZAR PRODUCTOS VIP
      const productosVip = await this.db.getProductosVip()
      const productosVipActivos = productosVip.filter(pv => pv.activo && pv.stock > 0).slice(0, 5)

      let productosAMostrar = []

      if (productosVipActivos.length > 0) {
        // Usar productos VIP como primera opción
        productosAMostrar = productosVipActivos.map(pv => ({
          id: pv.id,
          nombre: pv.nombre,
          descripcion: pv.descripcion,
          precio: pv.precio_vip || pv.precio_original,
          precio_original: pv.precio_original,
          precio_vip: pv.precio_vip,
          descuento_porcentaje: pv.precio_original && pv.precio_vip ?
            Math.round(((pv.precio_original - pv.precio_vip) / pv.precio_original) * 100) : 0,
          stock: pv.stock_disponible || pv.stock,
          es_producto_vip: true
        }))
      } else {
        // Fallback: productos destacados regulares
        const products = await this.inventory.getAllProducts()
        const featuredProducts = products.filter(p => p.destacado && p.stock > 0).slice(0, 5)
        productosAMostrar = featuredProducts
      }

      if (productosAMostrar.length === 0) {
        await this.sendMessage(from,
          `¡Perfecto ${customerName}! 🌟\n\nEn este momento estamos actualizando nuestro catálogo VIP.\n\nPor favor escríbeme qué tipo de producto te interesa y te ayudo a encontrar las mejores opciones con tu descuento especial. 😊`)
        return
      }

      // 🌟 OBTENER INFORMACIÓN DE DESCUENTO VIP SI HAY OFERTA
      let descuentoVip = null
      if (offerId) {
        const ofertas = await this.db.getOfertasVip()
        const oferta = ofertas.find(o => o.id === offerId)
        if (oferta && oferta.tipo_oferta === 'descuento' && oferta.valor_descuento) {
          descuentoVip = oferta.valor_descuento
        }
      }

      let mensaje = `🌟 *¡Excelente ${customerName}!* 🌟\n\n`
      mensaje += `Aquí tienes nuestros productos destacados con tu descuento VIP:\n\n`

      productosAMostrar.forEach((product, index) => {
        mensaje += `${index + 1}. 🛍️ *${product.nombre}*\n`

        if (product.descripcion) {
          mensaje += `   📝 ${product.descripcion}\n`
        }

        // 🌟 MOSTRAR PRECIOS OPTIMIZADOS PARA PRODUCTOS VIP
        if (product.es_producto_vip) {
          mensaje += `   💰 Precio original: S/ ${product.precio_original}\n`
          mensaje += `   🌟 *Tu precio VIP: S/ ${product.precio_vip}* (${product.descuento_porcentaje}% descuento)\n`
          mensaje += `   💸 Ahorras: S/ ${(product.precio_original - product.precio_vip).toFixed(2)}\n`

          // Aplicar descuento adicional si hay oferta
          if (descuentoVip && descuentoVip !== product.descuento_porcentaje) {
            const precioFinal = (product.precio_vip * (1 - descuentoVip / 100)).toFixed(2)
            mensaje += `   🎯 *Precio final con oferta: S/ ${precioFinal}* (${descuentoVip}% descuento adicional)\n`
            mensaje += `   💰 Ahorro total: S/ ${(product.precio_original - precioFinal).toFixed(2)}\n`
          }
        } else {
          // Producto regular con descuento VIP
          mensaje += `   💰 Precio regular: S/ ${product.precio}\n`

          if (descuentoVip) {
            const precioConDescuento = (product.precio * (1 - descuentoVip / 100)).toFixed(2)
            mensaje += `   🌟 *Tu precio VIP: S/ ${precioConDescuento}* (${descuentoVip}% descuento)\n`
            mensaje += `   💸 Ahorras: S/ ${(product.precio - precioConDescuento).toFixed(2)}\n`
          } else {
            mensaje += `   🌟 *Precio VIP especial disponible*\n`
          }
        }

        mensaje += `   📦 Stock: ${product.stock} disponibles\n\n`
      })

      mensaje += `¿Cuál te interesa? Puedes decirme el nombre o número del producto. 😊`

      await this.sendMessage(from, mensaje)

    } catch (error) {
      console.error('Error mostrando productos VIP:', error)
      const customerName = conversationData.customer_name || 'Cliente'
      await this.sendMessage(from,
        `¡Perfecto ${customerName}! 🌟\n\nPor favor dime qué tipo de producto te interesa y te ayudo a encontrar las mejores opciones con tu descuento VIP especial. 😊`)
    }
  }

  // 🌟 Mostrar información adicional de oferta VIP
  async showAdditionalVipInfo(from, conversationData) {
    try {
      const customerName = conversationData.customer_name || 'Cliente'
      const offerId = conversationData.offer_id

      let mensaje = `📋 *Información Adicional - Oferta VIP* 📋\n\n`
      mensaje += `Hola ${customerName}, aquí tienes más detalles:\n\n`

      if (offerId) {
        // Obtener información detallada de la oferta
        const ofertas = await this.db.getOfertasVip()
        const oferta = ofertas.find(o => o.id === offerId)

        if (oferta) {
          mensaje += `🎯 *${oferta.titulo}*\n\n`

          // 🛍️ MOSTRAR PRODUCTO ESPECÍFICO EN OFERTA (INFORMACIÓN ADICIONAL)
          let productoEnOferta = null

          // Buscar primero en productos VIP si hay producto_vip_id
          if (oferta.producto_vip_id) {
            const productosVip = await this.db.getProductosVip()
            const productoVip = productosVip.find(pv => pv.id === oferta.producto_vip_id && pv.activo)

            if (productoVip) {
              productoEnOferta = {
                id: productoVip.id,
                nombre: productoVip.nombre,
                descripcion: productoVip.descripcion,
                precio: productoVip.precio_vip || productoVip.precio_original,
                precio_original: productoVip.precio_original,
                precio_vip: productoVip.precio_vip,
                descuento_porcentaje: productoVip.precio_original && productoVip.precio_vip ?
                  Math.round(((productoVip.precio_original - productoVip.precio_vip) / productoVip.precio_original) * 100) : 0,
                stock: productoVip.stock_disponible || productoVip.stock,
                es_producto_vip: true
              }
            }
          }

          // Fallback: buscar en productos regulares
          if (!productoEnOferta && oferta.producto_regalo_id) {
            const productos = await this.inventory.getAllProducts()
            productoEnOferta = productos.find(p => p.id === oferta.producto_regalo_id)

            if (productoEnOferta) {
              mensaje += `🛍️ *Producto incluido en la oferta:*\n`
              mensaje += `   • *${productoEnOferta.nombre}*\n`

              if (productoEnOferta.descripcion) {
                mensaje += `   • Descripción: ${productoEnOferta.descripcion}\n`
              }

              if (productoEnOferta.categoria) {
                mensaje += `   • Categoría: ${productoEnOferta.categoria}\n`
              }

              mensaje += `   • Precio regular: S/ ${productoEnOferta.precio}\n`

              if (oferta.tipo_oferta === 'descuento' && oferta.valor_descuento) {
                const precioConDescuento = (productoEnOferta.precio * (1 - oferta.valor_descuento / 100)).toFixed(2)
                mensaje += `   • 🌟 *Tu precio VIP: S/ ${precioConDescuento}* (Ahorras S/ ${(productoEnOferta.precio - precioConDescuento).toFixed(2)})\n`
              }

              mensaje += `\n`
            }
          }

          if (oferta.descripcion) {
            mensaje += `📝 *Detalles de la oferta:*\n${oferta.descripcion}\n\n`
          }

          if (oferta.tipo_oferta === 'descuento' && oferta.valor_descuento) {
            mensaje += `💰 *Descuento exclusivo:* ${oferta.valor_descuento}%\n\n`
          }

          if (oferta.fecha_fin) {
            const fechaFin = new Date(oferta.fecha_fin).toLocaleDateString('es-PE')
            mensaje += `⏰ *Válido hasta:* ${fechaFin}\n\n`
          }

          mensaje += `✨ *Beneficios VIP adicionales:*\n`
          mensaje += `• Descuento exclusivo para clientes VIP\n`
          mensaje += `• Productos de alta calidad\n`
          mensaje += `• Atención personalizada\n`
          mensaje += `• Envío prioritario\n`
          mensaje += `• Garantía extendida\n\n`
        }
      } else {
        mensaje += `✨ *Beneficios de ser Cliente VIP:*\n`
        mensaje += `• Descuentos exclusivos\n`
        mensaje += `• Acceso a ofertas especiales\n`
        mensaje += `• Productos de primera calidad\n`
        mensaje += `• Atención personalizada\n`
        mensaje += `• Envío prioritario\n\n`
      }

      mensaje += `¿Te gustaría proceder con la compra?\n\n`
      mensaje += `📝 Responde:\n`
      mensaje += `• *"Sí, quiero comprar"* - para ver productos disponibles\n`
      mensaje += `• *"Llamar"* - para atención personalizada por teléfono\n`
      mensaje += `• *"No gracias"* - si prefieres no continuar`

      await this.sendMessage(from, mensaje)

    } catch (error) {
      console.error('Error mostrando información adicional VIP:', error)
      const customerName = conversationData.customer_name || 'Cliente'
      await this.sendMessage(from,
        `Hola ${customerName} 😊\n\nNuestra oferta VIP incluye descuentos exclusivos y atención personalizada.\n\n¿Te gustaría proceder con la compra? Responde *"Sí, quiero comprar"* para continuar.`)
    }
  }

  // 🎯 INICIANDO recomendaciones específicas para: Pablo
  async handleRecommendSpecificProducts(from, messageText, customerName, products, recentHistory) {
    try {
      console.log(`🎯 INICIANDO recomendaciones específicas para: ${customerName}`)

      // 🤖 PRIORIDAD 1: Verificar contexto conversacional
      const contextProduct = this.getConversationalContextProduct(from, messageText)
      
      if (contextProduct) {
        console.log(`🎯 USANDO CONTEXTO CONVERSACIONAL: ${contextProduct.name}`)
        
        // Responder sobre el producto del contexto específicamente
        const response = await this.gemini.generateSalesResponse(
          `Cliente pregunta sobre características del ${contextProduct.name} que ya se le mostró previamente. Su pregunta: "${messageText}". Responde específicamente sobre este producto manteniendo el contexto de la conversación.`,
          customerName,
          [contextProduct], // Solo el producto del contexto
          this.STATES.INTERESTED,
          recentHistory,
          this.inventory
        )

        await this.sendMessage(from, response)
        this.addToHistory(from, 'assistant', response)
        
        // NO cambiar el contexto, mantener el producto actual
        console.log(`🎯 CONTEXTO PRESERVADO: Manteniendo ${contextProduct.name} como producto de interés`)
        return
      }

      // 🎯 PRIORIDAD 1.5: Verificar si es cliente VIP - SOLO si NO es búsqueda específica
      const conversationData = await this.getConversationData(from)
      const isVipClient = conversationData.cliente_nivel === 'VIP' || 
                         (conversationData.es_recurrente && conversationData.total_pedidos >= 3)
      
      // 🔍 VALIDAR PRIMERO: ¿Es una búsqueda específica de producto que NO es VIP?
      const messageLower = messageText.toLowerCase().trim()
      const isSpecificProductSearch = (
        messageLower.includes('iphone 15') || 
        messageLower.includes('iphone 16') ||
        messageLower.includes('samsung') ||
        messageLower.includes('xiaomi') ||
        messageLower.includes('huawei') ||
        /\b(modelo|versión|generación)\s+(15|16|13|12)\b/.test(messageLower)
      )
      
      console.log(`🔍 ANÁLISIS BÚSQUEDA: Cliente VIP: ${isVipClient}, Búsqueda específica: ${isSpecificProductSearch}, Mensaje: "${messageText}"`)
      
      // 🚨 CORRECCIÓN CRÍTICA: Solo priorizar VIP si NO es búsqueda específica de otro producto
      if (isVipClient && this.vip && !isSpecificProductSearch) {
        console.log(`👑 Cliente VIP detectado SIN búsqueda específica, buscando productos VIP vigentes...`)
        try {
          const productosVipActivos = await this.vip.getProductosVipActivos()
          
          if (productosVipActivos && productosVipActivos.length > 0) {
            console.log(`🎆 Productos VIP encontrados: ${productosVipActivos.length}, validando relevancia VIP`)
            
            // 🎯 LÓGICA VIP CORREGIDA: Solo productos VIP que realmente coinciden
            const vipRelevantes = productosVipActivos.filter(pv => {
              const nombreLower = pv.nombre.toLowerCase()
              
              console.log(`🔍 VIP FILTER: Comparando "${messageLower}" con "${nombreLower}"`)
              
              // 1. COINCIDENCIAS DIRECTAS EXACTAS (sin forzar)
              if (messageLower.includes('iphone 14') && nombreLower.includes('iphone 14')) {
                console.log(`✅ VIP Match Exacto: iPhone 14 encontrado en ${pv.nombre}`)
                return true
              }
              
              // 2. REFERENCIAS CONTEXTUALES SOLO SI HAY PRODUCTOS VIP EN MEMORIA
              if (conversationData.vip_products_shown && conversationData.vip_products_shown.length > 0) {
                const contextualRefs = ['ese', 'esa', 'este', 'esta']
                if (contextualRefs.some(ref => messageLower.includes(ref))) {
                  console.log(`✅ VIP Match Contextual: Referencia contextual para ${pv.nombre} (ya mostrado antes)`)
                  return true
                }
              }
              
              // 3. PALABRAS CLAVE ESPECÍFICAS DEL PRODUCTO VIP
              const productSpecificKeywords = [
                'vip', 'exclusivo', 'descuento', 'oferta especial', 'precio especial'
              ]
              
              if (productSpecificKeywords.some(keyword => messageLower.includes(keyword))) {
                console.log(`✅ VIP Match Keyword: Palabra clave VIP encontrada para ${pv.nombre}`)
                return true
              }
              
              console.log(`❌ VIP No-Match: "${messageLower}" no coincide específicamente con "${nombreLower}"`)
              return false
            })
            
            // 🎆 MANEJAR PRODUCTOS VIP ENCONTRADOS (solo si realmente son relevantes)
            if (vipRelevantes.length > 0) {
              console.log(`🎆 Productos VIP relevantes validados: ${vipRelevantes.length}`)
              
              // 🚫 VERIFICAR ENVÍOS DUPLICADOS RECIENTES
              const yaEnviados = conversationData.last_recommendation && 
                                conversationData.last_recommendation.isVip &&
                                conversationData.last_recommendation.products &&
                                (Date.now() - conversationData.last_recommendation.timestamp) < 60000 // 1 minuto
              
              if (yaEnviados) {
                // Si ya se envió recientemente, generar respuesta contextual VIP en lugar de reenviar
                console.log(`🔄 Producto VIP ya enviado recientemente, generando respuesta contextual VIP`)
                
                const productoVipContexto = vipRelevantes[0] // Usar el primer producto VIP relevante
                const response = await this.gemini.generateSalesResponse(
                  `Cliente VIP ${customerName} pregunta: "${messageText}" sobre el producto VIP ${productoVipContexto.nombre} (precio VIP: S/ ${productoVipContexto.precio_vip}, precio original: S/ ${productoVipContexto.precio_original}). Responde como agente VIP especializado, mencionando beneficios exclusivos y descuentos VIP.`,
                  customerName,
                  [productoVipContexto], // Pasar el producto VIP como contexto
                  this.STATES.INTERESTED,
                  recentHistory,
                  this.inventory
                )
                
                await this.sendMessage(from, response)
                this.addToHistory(from, 'assistant', response)
                
                // Mantener contexto VIP
                this.setConversationState(from, this.STATES.INTERESTED, {
                  ...conversationData,
                  interested_products: vipRelevantes.map(p => ({
                    id: p.id,
                    name: p.nombre,
                    price: p.precio_vip,
                    description: p.descripcion,
                    stock: p.stock_disponible,
                    isVip: true
                  })),
                  // 🎯 CORRECCIÓN: Agregar displayed_products para que interpretContextualReference funcione
                  displayed_products: vipRelevantes.map((p, index) => ({
                    id: p.id,
                    name: p.nombre,
                    price: p.precio_vip,
                    description: p.descripcion,
                    stock: p.stock_disponible,
                    isVip: true,
                    position: index + 1, // Para referencias como "el primero", "el segundo"
                    displayOrder: index,
                    timestamp: Date.now()
                  }))
                })
                
                return // Terminar aquí con respuesta VIP contextual
              } else {
                console.log(`🎆 Enviando productos VIP por primera vez`)
                
                // Enviar productos VIP directamente (primera vez)
                for (let i = 0; i < Math.min(vipRelevantes.length, 1); i++) {
                  const productoVip = vipRelevantes[i]
                  
                  const enviado = await this.enviarProductoVipCompleto(
                    from, 
                    productoVip, 
                    `🎆 Aquí tienes tu producto VIP, ${customerName}!`
                  )
                  
                  if (enviado) {
                    console.log(`🎆 Producto VIP enviado: ${productoVip.nombre}`)
                  }
                }
                
                // Actualizar contexto con productos VIP
                this.setConversationState(from, this.STATES.INTERESTED, {
                  ...conversationData,
                  interested_products: vipRelevantes.map(p => ({
                    id: p.id,
                    name: p.nombre,
                    price: p.precio_vip,
                    description: p.descripcion,
                    stock: p.stock_disponible,
                    isVip: true
                  })),
                  // 🎯 CORRECCIÓN: Agregar displayed_products para que interpretContextualReference funcione
                  displayed_products: vipRelevantes.map((p, index) => ({
                    id: p.id,
                    name: p.nombre,
                    price: p.precio_vip,
                    description: p.descripcion,
                    stock: p.stock_disponible,
                    isVip: true,
                    position: index + 1, // Para referencias como "el primero", "el segundo"
                    displayOrder: index,
                    timestamp: Date.now()
                  })),
                  last_recommendation: {
                    message: messageText,
                    products: vipRelevantes.map(p => p.nombre),
                    timestamp: Date.now(),
                    isVip: true
                  }
                })
                
                return // Terminar aquí si se enviaron productos VIP
              }
            } else {
              // 🎯 CORRECCIÓN: Si no hay productos VIP específicos, continuar con búsqueda normal
              console.log(`👑 Cliente VIP pero sin productos VIP específicos relevantes - procediendo con búsqueda normal`)
              // NO return aquí - continuar con búsqueda semántica normal
            }
          }
        } catch (vipError) {
          console.error('Error obteniendo productos VIP:', vipError)
          // Continuar con búsqueda regular si falla VIP
        }
      } else if (isVipClient && isSpecificProductSearch) {
        console.log(`👑 Cliente VIP realizando búsqueda específica: "${messageText}" - procediendo con búsqueda normal`)
        // Continuar con búsqueda semántica normal para productos específicos
      }

      // 🎯 PRIORIDAD 2: Si no hay contexto, usar búsqueda semántica
      console.log(`🎯 No hay contexto conversacional, usando búsqueda semántica`)

      // 🔍 USAR BÚSQUEDA SEMÁNTICA INTELIGENTE (SIN CACHE)
      const semanticResults = await this.semanticSearch.semanticSearch(messageText, 5)

      // Convertir resultados semánticos al formato esperado
      const productFilter = {
        filteredProducts: semanticResults.map(result => ({
          ...result.product,
          relevanceScore: result.score,
          reasons: result.reasons,
          matchType: result.matchType
        }))
      }

      if (productFilter.filteredProducts.length > 0) {
        console.log(`🎯 Productos filtrados encontrados: ${productFilter.filteredProducts.length}`)

        // 🔍 DEBUG: Mostrar todos los productos filtrados con sus puntuaciones
        console.log(`🔍 DEBUG - Productos filtrados:`) 
        productFilter.filteredProducts.forEach((product, index) => {
          console.log(`  ${index + 1}. ${product.nombre} (Score: ${product.relevanceScore}) - ${product.reasons?.join(', ')}`)
        })

        // 🎯 MEJORA: Detectar si es una recomendación específica de UN solo producto
        const isSpecificRecommendation = await this.detectSpecificRecommendation(messageText, recentHistory)
        let productsToRecommend = productFilter.filteredProducts

        if (isSpecificRecommendation) {
          // Si es recomendación específica, usar solo el producto más relevante
          productsToRecommend = [productFilter.filteredProducts[0]]
          console.log(`🎯 RECOMENDACIÓN ESPECÍFICA detectada - usando solo: ${productsToRecommend[0].nombre}`)
        }

        // Generar respuesta con productos específicamente recomendados
        const response = await this.gemini.generateSalesResponse(
          `Cliente busca recomendación específica: "${messageText}". RECOMIENDA ESPECÍFICAMENTE estos productos filtrados que son ideales para su situación.`,
          customerName,
          productsToRecommend, // Usar productos filtrados (1 o varios según el contexto)
          this.STATES.INTERESTED,
          recentHistory,
          this.inventory
        )

        await this.sendMessage(from, response)
        this.addToHistory(from, 'assistant', response)

        // 🔍 NUEVO: Determinar si es indagación o interés real
        const isInquiring = this.isClientInquiring(messageText, recentHistory, this.STATES.INTERESTED)

        if (isInquiring) {
          // Cliente solo está preguntando/indagando - NO enviar múltiples productos
          console.log(`🔍 Cliente está indagando - solo respuesta textual`)
        } else {
          // Cliente muestra interés real - puede mostrar productos específicos si es apropiado
          console.log(`🎯 Cliente muestra interés real de compra`)
        }

        // ✅ CORRECCIÓN: Solo respuesta textual, sin bucle de productos automáticos
        console.log(`✅ Respuesta de recomendación enviada (sin bucle de productos múltiples)`)

        // Guardar productos recomendados en el contexto CON DETALLES COMPLETOS
        this.setConversationState(from, this.STATES.INTERESTED, {
          ...this.getConversationData(from),
          interested_products: productsToRecommend.map(p => ({
            id: p.id,
            name: p.nombre,
            price: p.precio,
            description: p.descripcion,
            stock: p.stock
          })),
          last_recommendation: {
            message: messageText,
            products: productsToRecommend.map(p => p.nombre),
            timestamp: Date.now(),
            isSpecific: isSpecificRecommendation
          },
          // 🎯 NUEVO: Contexto de productos mostrados para referencias
          displayed_products: productsToRecommend.map((p, index) => ({
            id: p.id,
            name: p.nombre,
            price: p.precio,
            description: p.descripcion,
            stock: p.stock,
            position: index + 1, // Para referencias como "el primero", "el segundo"
            displayOrder: index,
            timestamp: Date.now()
          }))
        })

      } else {
        console.log(`🎯 No se encontraron productos específicos, usando recomendación general`)

        // Fallback: usar respuesta general con todos los productos
        const response = await this.gemini.generateSalesResponse(
          `Cliente busca recomendación: "${messageText}". Recomienda productos del inventario que mejor se adapten a su necesidad.`,
          customerName,
          products,
          this.STATES.INTERESTED,
          recentHistory,
          this.inventory,
          await this.getConversationData(from) || {}
        )

        await this.sendMessage(from, response)
        this.addToHistory(from, 'assistant', response)
      }

    } catch (error) {
      console.error('Error en recomendaciones específicas:', error)

      // Fallback en caso de error
      const response = await this.gemini.generateSalesResponse(
        `Cliente busca recomendación: "${messageText}". Ayúdalo a encontrar el producto ideal.`,
        customerName,
        products,
        this.STATES.INTERESTED,
        recentHistory,
        this.inventory,
        await this.getConversationData(from) || {}
      )
      await this.sendMessage(from, response)
      this.addToHistory(from, 'assistant', response)
    }
  }

  // 🎯 NUEVO MÉTODO: Detectar si es una recomendación específica de un solo producto
  async detectSpecificRecommendation(messageText, recentHistory) {
    const message = messageText.toLowerCase()
    
    // ✅ VALIDACIÓN: Asegurar que recentHistory es un array
    const validHistory = Array.isArray(recentHistory) ? recentHistory : []
    const recentMessages = validHistory.slice(-3).map(h => h.message ? h.message.toLowerCase() : '').join(' ')

    // Palabras clave que indican recomendación específica
    const specificKeywords = [
      'te recomiendo',
      'recomiendo',
      'ideal para',
      'perfecto para',
      'mejor opción',
      'específicamente',
      'en particular',
      'especialmente'
    ]

    // Palabras que indican uso específico (contexto de la conversación)
    const specificUseKeywords = [
      'para piscina',
      'para baño',
      'para cocina',
      'para ventana',
      'para puerta',
      'para seguridad',
      'para privacidad'
    ]

    // Verificar si hay indicadores de recomendación específica
    const hasSpecificRecommendation = specificKeywords.some(keyword =>
      message.includes(keyword) || recentMessages.includes(keyword)
    )

    const hasSpecificUse = specificUseKeywords.some(keyword =>
      message.includes(keyword) || recentMessages.includes(keyword)
    )

    return hasSpecificRecommendation || hasSpecificUse
  }

  // 🔍 NUEVA FUNCIÓN: Detectar preguntas técnicas sobre productos
  isTechnicalQuestion(messageText) {
    const message = messageText.toLowerCase().trim()
    
    // Palabras que indican preguntas técnicas
    const technicalQuestionKeywords = [
      'tiene', 'tienen', 'posee', 'poseen',
      'resiste', 'resisten', 'resistencia',
      'cuánto dura', 'cuanto dura', 'duracion',
      'batería', 'bateria', 'almacenamiento',
      'memoria', 'cámara', 'camara',
      'pantalla', 'procesador', 'chip',
      'garantía', 'garantia', 'warranty'
    ]
    
    // Signos de interrogación
    const hasQuestionMark = message.includes('?')
    
    // Verificar si contiene palabras técnicas de pregunta
    const hasTechnicalKeywords = technicalQuestionKeywords.some(keyword => message.includes(keyword))
    
    // Si tiene signo de interrogación y palabras técnicas, es pregunta técnica
    if (hasQuestionMark && hasTechnicalKeywords) {
      return true
    }
    
    // También considerar preguntas sin signo de interrogación si tienen palabras técnicas
    // y no son confirmaciones
    const confirmationWords = ['si', 'sí', 'ok', 'bien', 'perfecto', 'genial']
    const isConfirmation = confirmationWords.some(word => message.trim() === word)
    
    if (hasTechnicalKeywords && !isConfirmation) {
      return true
    }
    
    return false
  }

  // 🔍 NUEVA FUNCIÓN: Manejar preguntas técnicas sobre productos
  async handleTechnicalInquiry(from, messageText, product, customerName, recentHistory) {
    try {
      console.log(`🔍 MANEJANDO PREGUNTA TÉCNICA sobre ${product.nombre} para ${customerName}`)
      
      // Generar respuesta informativa sobre características técnicas
      const response = await this.gemini.generateSalesResponse(
        `Cliente pregunta técnica sobre: "${messageText}" referente al producto "${product.nombre}". Responde de manera informativa y técnica, proporcionando detalles específicos sobre las características mencionadas. NO presiones para vender, solo informa.`,
        customerName,
        [product],
        this.STATES.INTERESTED, // Mantener en estado INTERESTED
        recentHistory,
        this.inventory,
        await this.getConversationData(from) || {}
      )
      
      await this.sendMessage(from, response)
      this.addToHistory(from, 'assistant', response)
      
      console.log(`✅ Respuesta técnica enviada para ${product.nombre} a ${customerName}`)
      
    } catch (error) {
      console.error('Error manejando pregunta técnica:', error)
      
      // Fallback: respuesta genérica en caso de error
      const fallbackResponse = `¡Hola ${customerName}! Sobre el *${product.nombre}*, ¿qué información específica te gustaría conocer? Estoy aquí para ayudarte 😊`
      
      await this.sendMessage(from, fallbackResponse)
      this.addToHistory(from, 'assistant', fallbackResponse)
    }
  }

  // 🔍 NUEVO MÉTODO: Detectar si el cliente está indagando/preguntando vs mostrando interés real
  isClientInquiring(messageText, recentHistory, currentState) {
    const message = messageText.toLowerCase().trim()

    // 🎯 EXCLUSIONES PRIORITARIAS: Confirmaciones implícitas NO son indagación
    const implicitConfirmations = [
      'si', 'sí', 'esa', 'ese', 'eso', 'si a esa', 'me interesa', 'lo quiero'
    ]
    
    if (implicitConfirmations.includes(message)) {
      console.log(`🎯 CONFIRMACIÓN IMPLÍCITA detectada, NO es indagación: "${message}"`)
      return false // NO es indagación, es confirmación
    }

    // Palabras que indican indagación/pregunta
    const inquiringKeywords = [
      'tienes', 'tienen', 'hay', 'existe', 'existen',
      'manejas', 'manejan', 'vendes', 'venden',
      'qué', 'que', 'cuál', 'cual', 'cuáles', 'cuales',
      'cómo', 'como', 'dónde', 'donde',
      '?', // Signos de pregunta
    ]

    // Palabras que indican interés real de compra
    const purchaseIntentKeywords = [
      'quiero', 'necesito', 'busco', 'me interesa',
      'quisiera', 'me gustaría', 'voy a comprar',
      'para comprar', 'cotizar', 'precio de',
      'cuánto cuesta', 'cuanto cuesta'
    ]

    // Si el mensaje contiene palabras de intención de compra, NO es indagación
    const hasPurchaseIntent = purchaseIntentKeywords.some(keyword => message.includes(keyword))
    if (hasPurchaseIntent) {
      return false // No es indagación, es interés real
    }

    // Si el mensaje contiene palabras de indagación, ES indagación
    const hasInquiringWords = inquiringKeywords.some(keyword => message.includes(keyword))
    if (hasInquiringWords) {
      return true // Es indagación
    }

    // Analizar contexto: si ya está en estado INQUIRING y sigue preguntando
    if (currentState === this.STATES.INQUIRING) {
      return true // Continúa indagando
    }

    // Por defecto, ser conservador - si no hay señales claras, NO es indagación
    return false
  }

  // 🔍 NUEVO MÉTODO: Manejar respuestas cuando el cliente está indagando CON CONTEXTO INTELIGENTE
  async handleInquiringResponse(from, messageText, customerName, products, recentHistory) {
    try {
      const currentState = await this.getConversationState(from)
      const conversationData = await this.getConversationData(from)

      console.log(`🔍 MANEJANDO INDAGACIÓN para: ${customerName} (Estado: ${currentState})`)

      // 🤖 PRIORIDAD 1: Verificar contexto conversacional ANTES de búsqueda semántica
      const contextProduct = this.getConversationalContextProduct(from, messageText)
      
      if (contextProduct) {
        console.log(`🎯 CONTEXTO DETECTADO EN INDAGACIÓN: Respondiendo sobre ${contextProduct.name}`)
        
        // 🚫 PREVENIR RESPUESTA DUPLICADA: Verificar si ya se respondió recientemente
        const recentMessages = recentHistory.slice(-2)
        const alreadyAnsweredRecently = recentMessages.some(msg => 
          msg.role === 'assistant' && 
          msg.message.toLowerCase().includes(contextProduct.name.toLowerCase().substring(0, 10))
        )
        
        if (alreadyAnsweredRecently) {
          console.log(`🚫 EVITANDO RESPUESTA DUPLICADA: Ya se respondió sobre ${contextProduct.name} recientemente`)
          return // No enviar respuesta duplicada
        }
        
        // Responder específicamente sobre el producto del contexto
        const contextualPrompt = currentState === this.STATES.INTERESTED
          ? `Cliente YA ESTÁ INTERESADO en ${contextProduct.name} y ahora pregunta: "${messageText}". Responde específicamente sobre este producto manteniendo el contexto.`
          : `Cliente pregunta sobre ${contextProduct.name}: "${messageText}". RESPONDE DE MANERA INFORMATIVA sobre este producto específico.`

        const response = await this.gemini.generateSalesResponse(
          contextualPrompt,
          customerName,
          [contextProduct], // Solo el producto del contexto
          currentState,
          recentHistory
        )

        await this.sendMessage(from, response)
        this.addToHistory(from, 'assistant', response)
        
        // Mantener el contexto del producto sin cambiarlo
        console.log(`🎯 CONTEXTO PRESERVADO: Manteniendo ${contextProduct.name}`)
        return
      }

      // 🎯 PRIORIDAD 2: Si no hay contexto, usar búsqueda semántica
      console.log(`🔍 INDAGACIÓN: No hay contexto, usando búsqueda semántica`)

      // 🔍 USAR BÚSQUEDA SEMÁNTICA INTELIGENTE para indagación
      const semanticResults = await this.semanticSearch.semanticSearch(messageText, 3)

      // Convertir resultados semánticos al formato esperado
      const productFilter = {
        filteredProducts: semanticResults.map(result => ({
          ...result.product,
          relevanceScore: result.score,
          reasons: result.reasons,
          matchType: result.matchType
        }))
      }

      if (productFilter.filteredProducts.length > 0) {
        console.log(`🔍 Productos encontrados para indagación: ${productFilter.filteredProducts.length}`)

        // 🔍 DEBUG: Mostrar productos filtrados
        console.log(`🔍 DEBUG - Productos para indagación:`)
        productFilter.filteredProducts.forEach((product, index) => {
          console.log(`  ${index + 1}. ${product.nombre} (Score: ${product.relevanceScore})`)
        })

        // Generar respuesta informativa (no de venta agresiva)
        const contextualPrompt = currentState === this.STATES.INTERESTED
          ? `Cliente YA ESTÁ INTERESADO en otros productos, pero ahora pregunta sobre: "${messageText}". RESPONDE DE MANERA INFORMATIVA sobre estos productos adicionales. Menciona que también tienes disponibles estos productos si le interesan.`
          : `Cliente pregunta sobre: "${messageText}". RESPONDE DE MANERA INFORMATIVA, mostrando disponibilidad y características básicas. NO presiones para vender, solo informa.`

        const response = await this.gemini.generateSalesResponse(
          contextualPrompt,
          customerName,
          productFilter.filteredProducts,
          currentState, // Usar el estado actual
          recentHistory,
          this.inventory,
          conversationData
        )

        await this.sendMessage(from, response)
        this.addToHistory(from, 'assistant', response)

        // 🚫 NO ENVIAR PRODUCTOS AUTOMÁTICAMENTE - Solo respuesta textual para evitar saturación

        // Actualizar contexto según el estado actual
        if (currentState === this.STATES.INTERESTED) {
          // Si ya está interesado, agregar productos adicionales al contexto SIN cambiar estado
          this.setConversationState(from, this.STATES.INTERESTED, {
            ...conversationData,
            additional_inquired_products: productFilter.filteredProducts.map(p => ({
              id: p.id,
              name: p.nombre,
              price: p.precio,
              description: p.descripcion
            }))
            // NO agregar displayed_products para evitar conflictos
          })
        } else {
          // Si está en otro estado, usar lógica original
          this.setConversationState(from, this.STATES.INQUIRING, {
            ...conversationData,
            inquired_products: productFilter.filteredProducts.map(p => ({
              id: p.id,
              name: p.nombre,
              price: p.precio,
              description: p.descripcion
            }))
            // NO agregar displayed_products para evitar conflictos
          })
        }

      } else {
        // No se encontraron productos relevantes
        const response = await this.gemini.generateSalesResponse(
          `Cliente pregunta sobre: "${messageText}" pero no encontramos productos específicos. Responde de manera útil y sugiere alternativas.`,
          customerName,
          products,
          currentState, // Usar el estado actual
          recentHistory,
          this.inventory,
          conversationData
        )

        await this.sendMessage(from, response)
        this.addToHistory(from, 'assistant', response)
      }

    } catch (error) {
      console.error('Error manejando indagación:', error)
      await this.sendMessage(from, 'Disculpa, tuve un problema procesando tu consulta. ¿Podrías ser más específico? 🤔')
    }
  }

  // 🤖 SISTEMA DE CONTEXTO CONVERSACIONAL INTELIGENTE - MEJORADO
  // Prioriza el producto mostrado previamente sobre búsqueda semántica general
  getConversationalContextProduct(from, messageText) {
    try {
      const conversationData = this.getConversationData(from)
      const messageTextLower = messageText.toLowerCase()
      
      console.log(`🤖 VERIFICANDO CONTEXTO: "${messageText}"`)
      
      // 🎯 PRIORIDAD MÁXIMA: Referencias explícitas a modelos específicos
      const explicitReferences = {
        'iphone 15': ['iphone 15', '15', 'iphone15'],
        'iphone 14': ['iphone 14', '14', 'iphone14'], 
        'iphone 16': ['iphone 16', '16', 'iphone16']
      }
      
      for (const [model, keywords] of Object.entries(explicitReferences)) {
        if (keywords.some(keyword => messageTextLower.includes(keyword))) {
          // Buscar en productos mostrados o de interés
          let matchingProduct = null
          
          // Buscar en displayed_products primero
          if (conversationData.displayed_products) {
            matchingProduct = conversationData.displayed_products.find(p => 
              p.name && p.name.toLowerCase().includes(model.replace(' ', ' '))
            )
          }
          
          // Si no se encuentra, buscar en interested_products
          if (!matchingProduct && conversationData.interested_products) {
            matchingProduct = conversationData.interested_products.find(p => 
              p.name && p.name.toLowerCase().includes(model.replace(' ', ' '))
            )
          }
          
          if (matchingProduct) {
            console.log(`🎯 CONTEXTO EXPLÍCITO DETECTADO: ${matchingProduct.name} mencionado directamente`)
            return matchingProduct
          }
        }
      }
      
      // 🎯 PRIORIDAD 1: Productos mostrados recientemente (displayed_products)
      if (conversationData.displayed_products && conversationData.displayed_products.length > 0) {
        console.log(`🤖 CONTEXTO: Verificando productos mostrados recientemente: ${conversationData.displayed_products.length} productos`)
        
        // 🎯 DETECCION IMPLÍCITA: Si pregunta sobre características técnicas,
        // priorizar iPhone 15 si está en displayed_products
        const technicalKeywords = ['graba', '4k', 'video', 'camara', 'cámara', 'bateria', 
          'batería', 'memoria', 'almacenamiento', 'dura', 'tiempo', 'viajes', 'resistencia', 'agua']
        
        const hasTechnicalKeyword = technicalKeywords.some(keyword => messageTextLower.includes(keyword))
        
        if (hasTechnicalKeyword) {
          // Buscar iPhone 15 primero (PRIORIDAD ABSOLUTA)
          const iphone15 = conversationData.displayed_products.find(p => 
            p.name && p.name.toLowerCase().includes('iphone 15')
          )
          
          if (iphone15) {
            console.log(`🎯 CONTEXTO TÉCNICO: Pregunta sobre características, priorizando iPhone 15: ${iphone15.name}`)
            return iphone15
          }
          
          // Si no hay iPhone 15, usar el último mostrado
          const lastProduct = conversationData.displayed_products[conversationData.displayed_products.length - 1]
          if (lastProduct) {
            console.log(`🎯 CONTEXTO TÉCNICO: Pregunta sobre características, asumiendo interés en ${lastProduct.name}`)
            return lastProduct
          }
        }
      }
      
      // 🎯 PRIORIDAD 2: Productos de interés (interested_products)
      if (conversationData.interested_products && conversationData.interested_products.length > 0) {
        console.log(`🤖 CONTEXTO: Verificando productos de interés`)
        
        // Verificar si hay iPhone 15 en productos de interés
        const iphone15Interest = conversationData.interested_products.find(p => 
          p.name && p.name.toLowerCase().includes('iphone 15')
        )
        
        if (iphone15Interest) {
          const technicalKeywords = ['graba', '4k', 'video', 'precio', 'cuesta', 'vale', 'barato', 'caro']
          const hasTechnicalKeyword = technicalKeywords.some(keyword => messageTextLower.includes(keyword))
          
          if (hasTechnicalKeyword) {
            console.log(`🎯 CONTEXTO DETECTADO: Cliente se refiere al ${iphone15Interest.name} de interés`)
            return iphone15Interest
          }
        }
      }
      
      console.log(`🙅 NO HAY CONTEXTO CONVERSACIONAL claro para: "${messageText}"`)
      return null // No hay contexto conversacional claro
    } catch (error) {
      console.error('Error en getConversationalContextProduct:', error)
      return null
    }
  }

  // 🎯 MÉTODO COMPLETO: Interpretar referencias contextuales a productos mostrados
  async interpretContextualReference(messageText, conversationData, clientId = null) {
    const message = messageText.toLowerCase().trim()
    
    // 🚫 ANTI-FALLBACK CRÍTICO: Bloquear completamente si Enhanced ha marcado el contexto
    if (conversationData.enhanced_detection || 
        conversationData.enhanced_context_active || 
        conversationData.source === 'enhanced_specific_search' ||
        conversationData.context_preserved ||
        conversationData.enhanced_last_product) {
      console.log(`🚫 [ANTI-FALLBACK CRÍTICO] Enhanced context detectado - bloqueando fallback VIP completamente`)
      
      // Si Enhanced está activo, SOLO usar contexto Enhanced
      if (conversationData.enhanced_context_active && conversationData.displayed_products && conversationData.displayed_products.length > 0) {
        const enhancedProduct = conversationData.displayed_products[conversationData.displayed_products.length - 1]
        console.log(`✅ [ENHANCED ONLY] Usando producto Enhanced: ${enhancedProduct.name || enhancedProduct.nombre}`)
        
        return {
          id: enhancedProduct.id,
          name: enhancedProduct.name || enhancedProduct.nombre,
          nombre: enhancedProduct.name || enhancedProduct.nombre,
          precio: enhancedProduct.price || enhancedProduct.precio,
          descripcion: enhancedProduct.description || enhancedProduct.descripcion,
          es_vip: enhancedProduct.isVip || enhancedProduct.es_vip,
          source: 'enhanced_context_only'
        }
      }
      
      // Si hay enhanced_last_product pero no contexto activo
      if (conversationData.enhanced_last_product) {
        console.log(`🔄 [ENHANCED LAST] Usando enhanced_last_product: ${conversationData.enhanced_last_product}`)
        return {
          name: conversationData.enhanced_last_product,
          nombre: conversationData.enhanced_last_product,
          source: 'enhanced_last_product_only'
        }
      }
      
      // Si Enhanced está marcado pero no hay contexto, retornar null (no VIP fallback)
      console.log(`🚫 [NO FALLBACK] Enhanced marcado pero sin contexto válido - evitando VIP`)
      return null
    }
    
    // 🚀 MÁXIMA PRIORIDAD: Verificar ENHANCED CONTEXT activo
    if (conversationData.enhanced_context_active && conversationData.displayed_products && conversationData.displayed_products.length > 0) {
      console.log(`🎯 ENHANCED CONTEXT ACTIVO - Verificando ${conversationData.displayed_products.length} productos Enhanced`)
      
      // Usar SIEMPRE el contexto Enhanced cuando está activo
      const enhancedProduct = conversationData.displayed_products[conversationData.displayed_products.length - 1]
      console.log(`🎯 ENHANCED CONTEXT: "${message}" → ${enhancedProduct.name} (source: enhanced_system)`)
      
      // Validar que es una referencia contextual válida
      const contextualKeywords = [
        'si', 'sí', 'si quiero', 'sí quiero', 'quiero comprarlo', 'lo quiero', 'comprarlo',
        'me interesa', 'me gusta', 'esa', 'ese', 'eso', 'el', 'la', 'lo',
        'ese equipo', 'esa oferta', 'ese producto', 'ese celular', 'ese teléfono',
        'quiero comprar ese', 'me interesa comprar', 'comprar ese equipo',
        'graba', 'video', 'videos', 'grabación', 'cámara', 'camara', 'llevar', 'viajes',
        'batería', 'bateria', 'dura', 'duración', 'tiempo', 'usar', 'funciona',
        'precio', 'cuesta', 'cuanto', 'cuánto', 'vale', 'características',
        'perfecto', 'ok', 'vale', 'dale', 'acepto'
      ]
      
      if (contextualKeywords.some(keyword => message.includes(keyword))) {
        console.log(`✅ ENHANCED CONTEXT PRIORITARIO: Referencia válida detectada`)
        return {
          id: enhancedProduct.id,
          name: enhancedProduct.name,
          nombre: enhancedProduct.name, // Compatibilidad
          price: enhancedProduct.price,
          precio: enhancedProduct.price, // Compatibilidad
          description: enhancedProduct.description,
          descripcion: enhancedProduct.description, // Compatibilidad
          isVip: enhancedProduct.isVip || false,
          es_vip: enhancedProduct.isVip || false, // Compatibilidad
          source: 'enhanced_context_priority'
        }
      }
    }

    // 🌟 SEGUNDA PRIORIDAD: Verificar memoria de sesión SOLO si Enhanced no está activo
    if (clientId && !conversationData.enhanced_context_active) {
      try {
        const sessionMemory = await this.sessionMemory.getSessionMemory(clientId)
        if (sessionMemory && sessionMemory.displayed_products && sessionMemory.displayed_products.length > 0) {
          console.log(`🧠 Verificando memoria de sesión para ${clientId}: ${sessionMemory.displayed_products.length} productos mostrados (Enhanced no activo`)
          
          // Confirmaciones implícitas VIP
          const vipConfirmationKeywords = [
            'si', 'sí', 'si quiero', 'sí quiero', 'quiero comprarlo', 'lo quiero',
            'me interesa', 'me gusta', 'esa', 'ese', 'eso', 'ese equipo', 'esa oferta',
            'quiero comprar ese', 'me interesa comprar', 'comprar ese equipo',
            'perfecto', 'ok', 'vale', 'dale', 'acepto'
          ]
          
          if (vipConfirmationKeywords.some(keyword => message === keyword || message.includes(keyword))) {
            const lastProduct = sessionMemory.displayed_products[sessionMemory.displayed_products.length - 1]
            console.log(`🎯 CONFIRMACIÓN VIP (MEMORIA DE SESIÓN - Fallback): "${message}" → ${lastProduct.name}`)
            return {
              id: lastProduct.id,
              name: lastProduct.name,
              price: lastProduct.price,
              description: lastProduct.description,
              isVip: lastProduct.isVip || false,
              source: 'session_memory_fallback'
            }
          }
          
          // Preguntas técnicas sobre producto VIP en memoria
          const technicalKeywords = [
            'graba', 'video', 'videos', 'grabación', 'cámara', 'camara',
            'batería', 'bateria', 'dura', 'duración', 'tiempo',
            'precio', 'cuesta', 'cuanto', 'cuánto', 'vale',
            'características', 'especificaciones', 'detalles',
            'calidad', 'resolución', 'zoom', 'memoria', 'almacenamiento'
          ]
          
          const hasTechnicalQuestion = technicalKeywords.some(keyword => message.includes(keyword))
          if (hasTechnicalQuestion && sessionMemory.displayed_products.length === 1) {
            const product = sessionMemory.displayed_products[0]
            console.log(`🎯 PREGUNTA TÉCNICA VIP (MEMORIA - Fallback): "${message}" → ${product.name}`)
            return {
              id: product.id,
              name: product.name,
              price: product.price,
              description: product.description,
              isVip: product.isVip || false,
              source: 'session_memory_fallback'
            }
          }
        }
      } catch (error) {
        console.error('❌ Error consultando memoria de sesión para interpretación contextual:', error)
      }
    }

    // 🧠 SEGUNDA PRIORIDAD: Verificar memoria de producto
    if (clientId) {
      try {
        const productMemory = await this.productMemory.getCurrentProduct(clientId)
        if (productMemory && await this.productMemory.hasValidContext(clientId)) {
          console.log(`🧠 Verificando memoria de producto para ${clientId}: ${productMemory.product.name}`)
          
          // Verificar si el mensaje hace referencia al producto en memoria
          const memoryProduct = productMemory.product
          
          // Confirmaciones implícitas con memoria
          const confirmationKeywords = [
            'si', 'sí', 'si quiero', 'sí quiero', 'quiero comprarlo', 'lo quiero',
            'me interesa', 'me gusta', 'esa', 'ese', 'eso', 'perfecto', 'ok', 'vale', 'dale'
          ]
          
          if (confirmationKeywords.some(keyword => message === keyword || message.includes(keyword))) {
            console.log(`🎯 CONFIRMACIÓN IMPLÍCITA (MEMORIA): "${message}" → ${memoryProduct.name}`)
            
            // Actualizar memoria con confirmación
            await this.productMemory.addConversationAction(clientId, 'product_confirmed', {
              confirmationText: message,
              source: 'memory'
            })
            
            return memoryProduct
          }
          
          // Preguntas técnicas sobre producto en memoria
          const technicalKeywords = [
            'graba', 'video', 'videos', 'grabación', 'cámara', 'camara',
            'batería', 'bateria', 'dura', 'duración', 'tiempo',
            'precio', 'cuesta', 'cuanto', 'cuánto', 'vale',
            'características', 'especificaciones', 'detalles',
            'calidad', 'resolución', 'zoom', 'memoria', 'almacenamiento',
            'resistente', 'agua', 'colores', 'tamaño'
          ]
          
          const hasTechnicalQuestion = technicalKeywords.some(keyword => message.includes(keyword))
          if (hasTechnicalQuestion) {
            console.log(`🔧 PREGUNTA TÉCNICA (MEMORIA): "${message}" sobre ${memoryProduct.name}`)
            
            // Actualizar memoria con pregunta técnica
            await this.productMemory.addConversationAction(clientId, 'technical_question', {
              question: message,
              keywords: technicalKeywords.filter(k => message.includes(k)),
              source: 'memory'
            })
            
            return memoryProduct
          }
          
          // Pronombres genéricos que se refieren al producto en memoria
          const genericReferences = ['lo', 'la', 'el', 'eso', 'ese', 'esa']
          if (genericReferences.some(ref => message.includes(ref))) {
            console.log(`🎯 REFERENCIA GENÉRICA (MEMORIA): "${message}" → ${memoryProduct.name}`)
            return memoryProduct
          }
        }
      } catch (error) {
        console.error('❌ Error verificando memoria de producto:', error)
      }
    }
    
    // 📊 SISTEMA TRADICIONAL: Usar displayed_products/interested_products como fallback
    const displayedProducts = conversationData.displayed_products || []
    const interestedProducts = conversationData.interested_products || []

    // 🎯 PRIORIDAD: Usar displayed_products si están disponibles, sino usar interested_products
    const availableProducts = displayedProducts.length > 0 ? displayedProducts : interestedProducts

    if (availableProducts.length === 0) {
      console.log(`❌ No hay productos en contexto para interpretar: "${message}"`)
      return null
    }

    console.log(`🔍 Interpretando referencia contextual (fallback): "${message}" con ${availableProducts.length} productos disponibles`)

    // 🎯 CONFIRMACIONES IMPLÍCITAS DIRECTAS
    const confirmationKeywords = [
      'si', 'sí', 'si quiero', 'sí quiero', 'quiero comprarlo', 'lo quiero', 'comprarlo',
      'me interesa', 'me gusta', 'esa', 'ese', 'eso', 'el de arriba', 'oferta', 'la oferta',
      'el primero', 'la primera', 'quiero ese', 'quiero esa', 'está bien',
      'perfecto', 'ok', 'vale', 'dale', 'sí, ese', 'si ese'
    ]

    if (confirmationKeywords.some(keyword => message === keyword || message.includes(keyword))) {
      console.log(`🎯 CONFIRMACIÓN IMPLÍCITA (FALLBACK): "${message}"`)
      
      // Priorizar el último producto mostrado o el más relevante
      if (displayedProducts.length > 0) {
        const lastProduct = displayedProducts[displayedProducts.length - 1]
        console.log(`✅ Producto confirmado (fallback): ${lastProduct.name}`)
        return lastProduct
      } else if (interestedProducts.length > 0) {
        const firstProduct = interestedProducts[0]
        console.log(`✅ Producto de interés confirmado (fallback): ${firstProduct.name}`)
        return firstProduct
      }
    }

    // 🎯 PREGUNTAS TÉCNICAS SOBRE PRODUCTO EN CONTEXTO
    const technicalKeywords = [
      'graba', 'video', 'videos', 'grabación', 'cámara', 'camara',
      'batería', 'bateria', 'dura', 'duración', 'tiempo',
      'precio', 'cuesta', 'cuanto', 'cuánto', 'vale',
      'características', 'especificaciones', 'detalles',
      'calidad', 'resolución', 'zoom', 'memoria', 'almacenamiento',
      'resistente', 'agua', 'colores', 'tamaño'
    ]

    const hasTechnicalQuestion = technicalKeywords.some(keyword => message.includes(keyword))
    
    if (hasTechnicalQuestion) {
      console.log(`🔧 PREGUNTA TÉCNICA (FALLBACK) detectada con palabras: ${technicalKeywords.filter(k => message.includes(k)).join(', ')}`)
      
      if (availableProducts.length === 1) {
        console.log(`🎯 Pregunta técnica sobre único producto: ${availableProducts[0].name}`)
        return availableProducts[0]
      } else if (availableProducts.length > 1) {
        // Priorizar iPhone 15 si está presente (como en el contexto original)
        const iphone15 = availableProducts.find(p => 
          p.name && p.name.toLowerCase().includes('iphone 15')
        )
        if (iphone15) {
          console.log(`🎯 Pregunta técnica prioriza iPhone 15: ${iphone15.name}`)
          return iphone15
        }
        
        // Si no, usar el último mostrado
        const lastProduct = availableProducts[availableProducts.length - 1]
        console.log(`🎯 Pregunta técnica sobre último producto: ${lastProduct.name}`)
        return lastProduct
      }
    }

    // 🎯 REFERENCIAS DE POSICIÓN
    const positionReferences = {
      'primero': 0, 'primera': 0, '1': 0, 'uno': 0,
      'segundo': 1, 'segunda': 1, '2': 1, 'dos': 1,
      'tercero': 2, 'tercera': 2, '3': 2, 'tres': 2,
      'último': -1, 'ultima': -1, 'ultimo': -1
    }

    for (const [ref, index] of Object.entries(positionReferences)) {
      if (message.includes(ref)) {
        const targetIndex = index === -1 ? availableProducts.length - 1 : index
        if (availableProducts[targetIndex]) {
          console.log(`🎯 REFERENCIA DE POSICIÓN: "${ref}" → ${availableProducts[targetIndex].name}`)
          return availableProducts[targetIndex]
        }
      }
    }

    // 🎯 REFERENCIAS POR MARCA/MODELO ESPECÍFICO
    const explicitReferences = {
      'iphone 15': ['iphone 15', '15'],
      'iphone 14': ['iphone 14', '14'], 
      'iphone 16': ['iphone 16', '16'],
      'samsung': ['samsung', 'galaxy'],
      'xiaomi': ['xiaomi', 'redmi'],
      'huawei': ['huawei']
    }

    for (const [model, keywords] of Object.entries(explicitReferences)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        const matchingProduct = availableProducts.find(p => 
          p.name.toLowerCase().includes(model.replace('iphone ', 'iphone '))
        )
        if (matchingProduct) {
          console.log(`🎯 REFERENCIA POR MODELO: "${model}" → ${matchingProduct.name}`)
          return matchingProduct
        }
      }
    }

    // 🎯 PRONOMBRES Y REFERENCIAS GENÉRICAS
    const genericReferences = ['lo', 'la', 'el', 'eso', 'ese', 'esa']
    if (genericReferences.some(ref => message.includes(ref)) && availableProducts.length === 1) {
      console.log(`🎯 REFERENCIA GENÉRICA a único producto: ${availableProducts[0].name}`)
      return availableProducts[0]
    }

    console.log(`❌ No se pudo interpretar referencia contextual: "${message}"`)
    return null
  }

  // 🎆 NUEVO MÉTODO: Enviar producto VIP con información completa y verificación de vigencia
  async enviarProductoVipCompleto(from, productoVip, mensajeAdicional = '') {
    try {
      if (!productoVip) {
        console.error('Error: productoVip es null o undefined')
        return false
      }

      // 🕒 VERIFICAR VIGENCIA DE LA OFERTA VIP CON LOGS DETALLADOS
      if (productoVip.fecha_fin) {
        const fechaFin = new Date(productoVip.fecha_fin)
        const ahora = new Date()
        
        console.log(`🔍 VALIDACIÓN VIGENCIA DETALLADA: ${productoVip.nombre}`)
        console.log(`   📅 Fecha fin: ${fechaFin.toISOString()}`)
        console.log(`   ⏰ Ahora: ${ahora.toISOString()}`)
        console.log(`   🔢 Diferencia (ms): ${fechaFin - ahora}`)
        
        if (ahora > fechaFin) {
          console.log(`🚫 Producto VIP ${productoVip.nombre} expirado (fin: ${fechaFin})`)
          return false // Oferta expirada
        } else {
          console.log(`✅ Producto VIP ${productoVip.nombre} VIGENTE (fin: ${fechaFin})`)
        }
      }
      
      // 📦 VERIFICAR STOCK DISPONIBLE
      if (productoVip.stock_disponible !== undefined && productoVip.stock_disponible <= 0) {
        console.log(`🚫 Producto VIP ${productoVip.nombre} sin stock disponible`)
        return false // Sin stock
      }
      
      // 🗺️ VERIFICAR QUE ESTÉ ACTIVO
      if (productoVip.activo === false) {
        console.log(`🚫 Producto VIP ${productoVip.nombre} no activo`)
        return false // No activo
      }

      // 🎆 CONSTRUIR MENSAJE COMPLETO DEL PRODUCTO VIP CON DATOS CORRECTOS
      let mensaje = `🎆 👑 *OFERTA EXCLUSIVA VIP* 👑\n\n`
      mensaje += `🎆 *${productoVip.nombre}*\n\n`

      if (productoVip.descripcion) {
        mensaje += `📝 ${productoVip.descripcion}\n\n`
      }

      // 💰 PRECIOS Y DESCUENTO VIP CON CÁLCULOS CORRECTOS
      if (productoVip.precio_original && productoVip.precio_vip && productoVip.precio_original !== productoVip.precio_vip) {
        const descuentoVip = Math.round(((productoVip.precio_original - productoVip.precio_vip) / productoVip.precio_original) * 100)
        const ahorro = (productoVip.precio_original - productoVip.precio_vip).toFixed(2)
        
        mensaje += `💰 Precio Regular: ~~S/ ${productoVip.precio_original}~~\n`
        mensaje += `🎆 *Precio VIP: S/ ${productoVip.precio_vip}*\n`
        mensaje += `🎆 *Descuento: ${descuentoVip}% OFF*\n`
        mensaje += `💸 *Ahorras: S/ ${ahorro}*\n\n`
      } else {
        // Si no hay descuento, mostrar precio VIP
        const precio = productoVip.precio_vip || productoVip.precio_original || productoVip.precio || 0
        mensaje += `💰 *Precio VIP: S/ ${precio}*\n\n`
      }

      // 📦 STOCK EXCLUSIVO PARA LA OFERTA VIP
      if (productoVip.stock_disponible !== undefined && productoVip.stock_disponible !== null) {
        mensaje += `📦 Stock Exclusivo: ${productoVip.stock_disponible} unidades\n`
      }

      // 🔄 LÍMITE POR CLIENTE VIP
      if (productoVip.limite_por_cliente !== undefined && productoVip.limite_por_cliente !== null) {
        mensaje += `🔄 Límite por cliente: ${productoVip.limite_por_cliente} unidades\n`
      }

      // ⏰ TIEMPO RESTANTE DE LA OFERTA
      if (productoVip.fecha_fin) {
        const fechaFin = new Date(productoVip.fecha_fin)
        const ahora = new Date()
        const tiempoRestante = Math.ceil((fechaFin - ahora) / (1000 * 60 * 60)) // horas
        
        if (tiempoRestante > 24) {
          mensaje += `\n⏰ Oferta válida por: ${Math.ceil(tiempoRestante/24)} días más\n`
        } else if (tiempoRestante > 0) {
          mensaje += `\n⏰ ¡ÚLTIMAS ${tiempoRestante} HORAS!\n`
        }
      }

      // 🎆 EXCLUSIVIDAD VIP
      mensaje += `\n🎆 *Exclusivo para ti como cliente VIP*\n\n`

      // 🎆 MENSAJE ADICIONAL
      if (mensajeAdicional) {
        mensaje += `${mensajeAdicional}\n\n`
      }
      
      mensaje += `¿Te interesa esta oferta especial?`

      // 🖼️ ENVIAR CON IMAGEN SI ESTÁ DISPONIBLE
      if (productoVip.imagen_url) {
        await this.sendImageMessage(from, productoVip.imagen_url, mensaje)
      } else {
        await this.sendMessage(from, mensaje)
      }
      
      this.addToHistory(from, 'assistant', mensaje)
      
      const precioMostrar = productoVip.precio_vip || productoVip.precio_original || 'N/A'
      const descuentoInfo = productoVip.precio_original && productoVip.precio_vip ? 
        ` (${Math.round(((productoVip.precio_original - productoVip.precio_vip) / productoVip.precio_original) * 100)}% desc.)` : ''
      
      console.log(`🎆 Producto VIP enviado: ${productoVip.nombre} - Precio VIP: S/ ${precioMostrar}${descuentoInfo}`)
      
      // 🧠 GUARDAR EN MEMORIA DE SESIÓN PARA CONTEXTO CONVERSACIONAL
      try {
        await this.sessionMemory.updateDisplayedProducts(from, [{
          id: `vip_${productoVip.id}`,
          name: productoVip.nombre,
          price: productoVip.precio_vip || productoVip.precio_original,
          description: productoVip.descripcion,
          isVip: true,
          vip_id: productoVip.id,
          precio_vip: productoVip.precio_vip,
          precio_original: productoVip.precio_original,
          timestamp: Date.now()
        }])
        
        await this.sessionMemory.activateVipContext(from, {
          products: [productoVip],
          offer: {
            discount_percentage: productoVip.precio_original && productoVip.precio_vip ? 
              Math.round(((productoVip.precio_original - productoVip.precio_vip) / productoVip.precio_original) * 100) : 0,
            expires_at: productoVip.fecha_fin
          }
        })
        
        console.log(`🧠 Producto VIP guardado en memoria de sesión: ${productoVip.nombre}`)
      } catch (error) {
        console.error('❌ Error guardando producto VIP en memoria de sesión:', error)
      }
      
      // 🧠🔄 ACTIVAR MEMORIA DUAL VIP
      try {
        await this.dualMemory.activateVipMemory(from, [{
          id: `vip_${productoVip.id}`,
          name: productoVip.nombre,
          price: productoVip.precio_vip || productoVip.precio_original,
          description: productoVip.descripcion,
          isVip: true,
          vip_id: productoVip.id,
          precio_vip: productoVip.precio_vip,
          precio_original: productoVip.precio_original,
          categoria: productoVip.categoria,
          stock_disponible: productoVip.stock_disponible,
          limite_por_cliente: productoVip.limite_por_cliente,
          timestamp: Date.now()
        }])
        
        console.log(`🧠🔄 MEMORIA DUAL VIP ACTIVADA para ${from}: ${productoVip.nombre}`)
      } catch (error) {
        console.error('❌ Error activando memoria dual VIP:', error)
      }
      
      // 🔄 SINCRONIZACIÓN UNIFICADA DE CONTEXTO
      try {
        await this.contextSynchronizer.syncProductContext(from, {
          id: productoVip.id,
          name: productoVip.nombre,
          price: productoVip.precio_vip || productoVip.precio_original,
          description: productoVip.descripcion,
          stock: productoVip.stock_disponible,
          isVip: true
        }, 'vip_offer_sent')
        
        console.log(`🔄 Contexto sincronizado para producto VIP: ${productoVip.nombre}`)
      } catch (error) {
        console.error('❌ Error sincronizando contexto:', error)
      }
      
      return true // Éxito al enviar
      
    } catch (error) {
      console.error('Error enviando producto VIP completo:', error)
      // 🚫 ELIMINADO: Mensaje duplicado molesto que confunde al usuario
      // await this.sendMessage(from, `🎆 Tenemos una oferta VIP especial para ti. ¡Consulta por más detalles!`)
      return false
    }
  }

  // 🔐 MANEJAR AUTENTICACIÓN ADMINISTRATIVA
  async handleAdminAuth(from, messageText, conversationData) {
    try {
      const codigo = messageText.trim().toUpperCase()
      const maxAttempts = parseInt(await this.db.getConfig('admin_max_attempts')) || 3
      const currentAttempts = conversationData.admin_attempts || 0

      console.log(`🔐 Intento de autenticación: ${codigo} (intento ${currentAttempts + 1}/${maxAttempts})`)

      // Validar código
      const validation = await this.db.validateAdminCode(codigo)

      if (validation.valid) {
        // Código válido - crear sesión administrativa
        const sessionId = await this.db.createAdminSession(from, codigo, conversationData.admin_command)

        if (sessionId) {
          await this.sendMessage(from,
            `✅ *Acceso Autorizado*\n\n` +
            `Bienvenido al panel administrativo.\n` +
            `Sesión iniciada correctamente.`
          )

          // Mostrar menú administrativo
          await this.showAdminMenu(from, await this.getCustomerName(from))
          this.setConversationState(from, this.STATES.ADMIN_MENU, {
            admin_session_id: sessionId,
            admin_code: codigo
          })
        } else {
          await this.sendMessage(from, '❌ Error creando sesión administrativa.')
          this.setConversationState(from, this.STATES.INITIAL)
        }

      } else {
        // Código inválido
        const newAttempts = currentAttempts + 1

        if (newAttempts >= maxAttempts) {
          await this.sendMessage(from,
            `❌ *Acceso Denegado*\n\n` +
            `Has excedido el número máximo de intentos (${maxAttempts}).\n` +
            `Acceso bloqueado temporalmente.`
          )
          this.setConversationState(from, this.STATES.INITIAL)
        } else {
          await this.sendMessage(from,
            `❌ Código incorrecto.\n\n` +
            `Intentos restantes: ${maxAttempts - newAttempts}\n` +
            `Envía el código de autorización correcto:`
          )
          this.setConversationState(from, this.STATES.ADMIN_AUTH, {
            ...conversationData,
            admin_attempts: newAttempts
          })
        }

        // Registrar intento fallido
        await this.db.registerFailedAttempt(codigo)
      }

    } catch (error) {
      console.error('Error en autenticación administrativa:', error)
      await this.sendMessage(from, '❌ Error en el proceso de autenticación.')
      this.setConversationState(from, this.STATES.INITIAL)
    }
  }

  // 🔐 MOSTRAR MENÚ ADMINISTRATIVO
  async showAdminMenu(from, customerName) {
    const menuMessage =
      `🔐 *Panel Administrativo Activado*\n` +
      `Hola ${customerName || 'Administrador'}, estás en modo administrativo.\n\n` +
      `Selecciona una opción:\n\n` +
      `1️⃣ *Crear nuevo producto*\n` +
      `2️⃣ *Actualizar producto existente*\n` +
      `3️⃣ *Actualizar stock*\n` +
      `4️⃣ *Consultar estadísticas*\n` +
      `5️⃣ *Listar productos*\n` +
      `6️⃣ *Salir del panel*\n\n` +
      `💡 *Tip:* También puedes escribir comandos directos como:\n` +
      `• "crear producto"\n` +
      `• "estadísticas"\n` +
      `• "salir admin" (para volver al modo ventas)\n\n` +
      `Envía el número de la opción o escribe tu comando:`

    await this.sendMessage(from, menuMessage)
  }

  // 🔐 MANEJAR SELECCIÓN DEL MENÚ ADMINISTRATIVO
  async handleAdminMenuSelection(from, messageText, conversationData) {
    try {
      const option = messageText.trim()
      const lowerText = messageText.toLowerCase().trim()

      // 🔐 PROCESAR COMANDOS DIRECTOS EN MODO ADMIN
      if (this.isDirectAdminCommand(lowerText)) {
        await this.processDirectAdminCommand(from, lowerText, conversationData)
        return
      }

      // 🔐 PROCESAR OPCIONES NUMÉRICAS DEL MENÚ
      switch (option) {
        case '1':
          await this.sendMessage(from,
            `📝 *Crear Nuevo Producto*\n\n` +
            `Vamos a crear un nuevo producto paso a paso.\n\n` +
            `Paso 1/6: Envía el *nombre* del producto:`
          )
          this.setConversationState(from, this.STATES.ADMIN_ADD_PRODUCT, {
            ...conversationData,
            admin_step: 'name',
            product_data: {}
          })
          break

        case '2':
          await this.sendMessage(from,
            `✏️ *Actualizar Producto*\n\n` +
            `Envía el *ID* o *nombre* del producto que deseas actualizar:`
          )
          this.setConversationState(from, this.STATES.ADMIN_UPDATE_PRODUCT, {
            ...conversationData,
            admin_step: 'search'
          })
          break

        case '3':
          await this.sendMessage(from,
            `📦 *Actualizar Stock*\n\n` +
            `Envía el *ID* o *nombre* del producto para actualizar su stock:`
          )
          this.setConversationState(from, this.STATES.ADMIN_UPDATE_STOCK, {
            ...conversationData,
            admin_step: 'search'
          })
          break

        case '4':
          await this.handleAdminQueryStats(from, 'menu', conversationData)
          break

        case '5':
          await this.handleAdminListProducts(from, 'all', conversationData)
          break

        case '6':
          // Cerrar sesión administrativa
          if (conversationData.admin_session_id) {
            await this.db.closeAdminSession(conversationData.admin_session_id)
          }
          await this.sendMessage(from,
            `👋 *Sesión Cerrada*\n\n` +
            `Has salido del panel administrativo.\n` +
            `¡Hasta luego!`
          )
          this.setConversationState(from, this.STATES.INITIAL)
          break

        default:
          await this.sendMessage(from,
            `❌ Opción no válida.\n\n` +
            `Por favor, envía un número del 1 al 6:`
          )
          await this.showAdminMenu(from, await this.getCustomerName(from))
      }

    } catch (error) {
      console.error('Error en selección de menú administrativo:', error)
      await this.sendMessage(from, '❌ Error procesando selección.')
      await this.showAdminMenu(from, await this.getCustomerName(from))
    }
  }

  // 🔐 MANEJAR CREACIÓN DE PRODUCTO
  async handleAdminAddProduct(from, messageText, conversationData) {
    try {
      const step = conversationData.admin_step
      const productData = conversationData.product_data || {}

      switch (step) {
        case 'name':
          productData.nombre = messageText.trim()
          await this.sendMessage(from,
            `✅ Nombre: ${productData.nombre}\n\n` +
            `Paso 2/6: Envía la *descripción* del producto:`
          )
          this.setConversationState(from, this.STATES.ADMIN_ADD_PRODUCT, {
            ...conversationData,
            admin_step: 'description',
            product_data: productData
          })
          break

        case 'description':
          productData.descripcion = messageText.trim()
          await this.sendMessage(from,
            `✅ Descripción: ${productData.descripcion}\n\n` +
            `Paso 3/6: Envía el *precio* del producto (solo número):`
          )
          this.setConversationState(from, this.STATES.ADMIN_ADD_PRODUCT, {
            ...conversationData,
            admin_step: 'price',
            product_data: productData
          })
          break

        case 'price':
          const precio = parseFloat(messageText.trim())
          if (isNaN(precio) || precio <= 0) {
            await this.sendMessage(from,
              `❌ Precio inválido.\n\n` +
              `Envía un número válido mayor a 0:`
            )
            return
          }
          productData.precio = precio
          await this.sendMessage(from,
            `✅ Precio: S/ ${productData.precio}\n\n` +
            `Paso 4/6: Envía el *stock inicial* (solo número):`
          )
          this.setConversationState(from, this.STATES.ADMIN_ADD_PRODUCT, {
            ...conversationData,
            admin_step: 'stock',
            product_data: productData
          })
          break

        case 'stock':
          const stock = parseInt(messageText.trim())
          if (isNaN(stock) || stock < 0) {
            await this.sendMessage(from,
              `❌ Stock inválido.\n\n` +
              `Envía un número válido mayor o igual a 0:`
            )
            return
          }
          productData.stock = stock
          await this.sendMessage(from,
            `✅ Stock: ${productData.stock} unidades\n\n` +
            `Paso 5/6: Envía la *categoría* del producto:`
          )
          this.setConversationState(from, this.STATES.ADMIN_ADD_PRODUCT, {
            ...conversationData,
            admin_step: 'category',
            product_data: productData
          })
          break

        case 'category':
          productData.categoria = messageText.trim()
          await this.sendMessage(from,
            `✅ Categoría: ${productData.categoria}\n\n` +
            `Paso 6/6: Envía la *URL de imagen* del producto (o escribe "sin imagen"):`
          )
          this.setConversationState(from, this.STATES.ADMIN_ADD_PRODUCT, {
            ...conversationData,
            admin_step: 'image',
            product_data: productData
          })
          break

        case 'image':
          productData.imagen_url = messageText.trim().toLowerCase() === 'sin imagen' ? '' : messageText.trim()

          // Mostrar resumen y confirmar
          const resumen =
            `📋 *Resumen del Producto*\n\n` +
            `• *Nombre:* ${productData.nombre}\n` +
            `• *Descripción:* ${productData.descripcion}\n` +
            `• *Precio:* S/ ${productData.precio}\n` +
            `• *Stock:* ${productData.stock} unidades\n` +
            `• *Categoría:* ${productData.categoria}\n` +
            `• *Imagen:* ${productData.imagen_url || 'Sin imagen'}\n\n` +
            `¿Confirmas la creación del producto?\n` +
            `Responde *SI* para confirmar o *NO* para cancelar:`

          await this.sendMessage(from, resumen)
          this.setConversationState(from, this.STATES.ADMIN_ADD_PRODUCT, {
            ...conversationData,
            admin_step: 'confirm',
            product_data: productData
          })
          break

        case 'confirm':
          const response = messageText.trim().toLowerCase()
          if (response === 'si' || response === 'sí') {
            try {
              // Crear el producto
              const newProduct = await this.inventory.addProduct(productData)

              await this.sendMessage(from,
                `✅ *Producto Creado Exitosamente*\n\n` +
                `• *ID:* ${newProduct.id}\n` +
                `• *Nombre:* ${newProduct.nombre}\n` +
                `• *Precio:* S/ ${newProduct.precio}\n\n` +
                `El producto ha sido agregado al inventario.`
              )

              // Volver al menú administrativo
              await this.showAdminMenu(from, await this.getCustomerName(from))
              this.setConversationState(from, this.STATES.ADMIN_MENU, {
                admin_session_id: conversationData.admin_session_id,
                admin_code: conversationData.admin_code
              })

            } catch (error) {
              console.error('Error creando producto:', error)
              await this.sendMessage(from,
                `❌ Error creando el producto: ${error.message}\n\n` +
                `Intenta nuevamente.`
              )
              await this.showAdminMenu(from, await this.getCustomerName(from))
              this.setConversationState(from, this.STATES.ADMIN_MENU, {
                admin_session_id: conversationData.admin_session_id,
                admin_code: conversationData.admin_code
              })
            }
          } else {
            await this.sendMessage(from,
              `❌ Creación de producto cancelada.\n\n` +
              `Volviendo al menú principal...`
            )
            await this.showAdminMenu(from, await this.getCustomerName(from))
            this.setConversationState(from, this.STATES.ADMIN_MENU, {
              admin_session_id: conversationData.admin_session_id,
              admin_code: conversationData.admin_code
            })
          }
          break

        default:
          await this.sendMessage(from, '❌ Estado de creación no válido.')
          await this.showAdminMenu(from, await this.getCustomerName(from))
          this.setConversationState(from, this.STATES.ADMIN_MENU, {
            admin_session_id: conversationData.admin_session_id,
            admin_code: conversationData.admin_code
          })
      }

    } catch (error) {
      console.error('Error en creación de producto:', error)
      await this.sendMessage(from, '❌ Error en el proceso de creación.')
      await this.showAdminMenu(from, await this.getCustomerName(from))
      this.setConversationState(from, this.STATES.ADMIN_MENU, {
        admin_session_id: conversationData.admin_session_id,
        admin_code: conversationData.admin_code
      })
    }
  }

  // 🔐 MANEJAR CONSULTA DE ESTADÍSTICAS
  async handleAdminQueryStats(from, messageText, conversationData) {
    try {
      if (messageText === 'menu') {
        // Mostrar opciones de estadísticas
        const statsMenu =
          `📊 *Consultar Estadísticas*\n\n` +
          `Selecciona el tipo de consulta:\n\n` +
          `1️⃣ *Ventas de hoy*\n` +
          `2️⃣ *Estadísticas generales*\n` +
          `3️⃣ *Productos más vendidos*\n` +
          `4️⃣ *Inventario bajo stock*\n` +
          `5️⃣ *Volver al menú principal*\n\n` +
          `Envía el número de la opción:`

        await this.sendMessage(from, statsMenu)
        this.setConversationState(from, this.STATES.ADMIN_QUERY_STATS, {
          ...conversationData,
          admin_step: 'select'
        })
        return
      }

      // 🔄 MANEJAR RESPUESTA SI/NO DESPUÉS DE MOSTRAR ESTADÍSTICAS
      if (conversationData.admin_step === 'continue') {
        const response = messageText.trim().toLowerCase()

        if (response === 'si' || response === 'sí' || response === 's') {
          // Usuario quiere ver más estadísticas - mostrar menú nuevamente
          await this.handleAdminQueryStats(from, 'menu', conversationData)
          return
        } else if (response === 'no' || response === 'n') {
          // Usuario quiere volver al menú principal
          await this.showAdminMenu(from, await this.getCustomerName(from))
          this.setConversationState(from, this.STATES.ADMIN_MENU, {
            admin_session_id: conversationData.admin_session_id,
            admin_code: conversationData.admin_code
          })
          return
        } else {
          // Respuesta no válida para SI/NO
          await this.sendMessage(from,
            `❌ Respuesta no válida.\n\n` +
            `Responde *SI* para ver el menú de estadísticas o *NO* para volver al panel principal:`
          )
          return
        }
      }

      const option = messageText.trim()
      switch (option) {
        case '1':
          // Ventas de hoy
          const todayStats = await this.sales.getEstadisticasGenerales()
          const ventasHoyMsg =
            `📈 *Ventas de Hoy*\n\n` +
            `• *Ventas:* ${todayStats.ventas_hoy || 0}\n` +
            `• *Ingresos:* S/ ${todayStats.ingresos_hoy || 0}\n\n` +
            `Fecha: ${new Date().toLocaleDateString()}`

          await this.sendMessage(from, ventasHoyMsg)
          break

        case '2':
          // Estadísticas generales
          const generalStats = await this.sales.getEstadisticasGenerales()
          const generalMsg =
            `📊 *Estadísticas Generales*\n\n` +
            `• *Total Clientes:* ${generalStats.total_clientes || 0}\n` +
            `• *Total Ventas:* ${generalStats.total_ventas || 0}\n` +
            `• *Productos Vendidos:* ${generalStats.productos_vendidos || 0}\n` +
            `• *Ingresos Totales:* S/ ${generalStats.ingresos_totales || 0}\n` +
            `• *Venta Promedio:* S/ ${(generalStats.venta_promedio || 0).toFixed(2)}`

          await this.sendMessage(from, generalMsg)
          break

        case '3':
          // Productos más vendidos
          const topProducts = await this.sales.getProductosMasVendidos(null, 5)
          let topMsg = `🏆 *Top 5 Productos Más Vendidos*\n\n`

          if (topProducts.length > 0) {
            topProducts.forEach((product, index) => {
              topMsg += `${index + 1}️⃣ *${product.producto_nombre}*\n`
              topMsg += `   Vendidos: ${product.total_vendido}\n`
              topMsg += `   Ingresos: S/ ${product.total_ingresos}\n\n`
            })
          } else {
            topMsg += `No hay datos de ventas disponibles.`
          }

          await this.sendMessage(from, topMsg)
          break

        case '4':
          // Inventario bajo stock
          const allProducts = await this.inventory.getAllProducts()
          const lowStock = allProducts.filter(p => p.stock <= 5)

          let lowStockMsg = `⚠️ *Productos con Stock Bajo*\n\n`

          if (lowStock.length > 0) {
            lowStock.forEach(product => {
              lowStockMsg += `• *${product.nombre}*\n`
              lowStockMsg += `  Stock: ${product.stock} unidades\n`
              lowStockMsg += `  ID: ${product.id}\n\n`
            })
          } else {
            lowStockMsg += `✅ Todos los productos tienen stock suficiente.`
          }

          await this.sendMessage(from, lowStockMsg)
          break

        case '5':
          // Volver al menú principal
          await this.showAdminMenu(from, await this.getCustomerName(from))
          this.setConversationState(from, this.STATES.ADMIN_MENU, {
            admin_session_id: conversationData.admin_session_id,
            admin_code: conversationData.admin_code
          })
          return

        default:
          await this.sendMessage(from,
            `❌ Opción no válida.\n\n` +
            `Envía un número del 1 al 5:`
          )
          return
      }

      // Después de mostrar estadísticas, preguntar si quiere ver más
      await this.sendMessage(from,
        `¿Deseas consultar otras estadísticas?\n\n` +
        `Responde *SI* para ver el menú o *NO* para volver al panel principal:`
      )

      this.setConversationState(from, this.STATES.ADMIN_QUERY_STATS, {
        ...conversationData,
        admin_step: 'continue'
      })

    } catch (error) {
      console.error('Error consultando estadísticas:', error)
      await this.sendMessage(from, '❌ Error consultando estadísticas.')
      await this.showAdminMenu(from, await this.getCustomerName(from))
      this.setConversationState(from, this.STATES.ADMIN_MENU, {
        admin_session_id: conversationData.admin_session_id,
        admin_code: conversationData.admin_code
      })
    }
  }

  // 🔐 MANEJAR LISTADO DE PRODUCTOS
  async handleAdminListProducts(from, messageText, conversationData) {
    try {
      const products = await this.inventory.getAllProducts()

      if (products.length === 0) {
        await this.sendMessage(from,
          `📦 *Inventario Vacío*\n\n` +
          `No hay productos en el inventario.`
        )
      } else {
        let productList = `📦 *Lista de Productos* (${products.length} productos)\n\n`

        products.forEach((product, index) => {
          productList += `${index + 1}. *${product.nombre}*\n`
          productList += `   ID: ${product.id} | Stock: ${product.stock}\n`
          productList += `   Precio: S/ ${product.precio} | Cat: ${product.categoria}\n\n`

          // Limitar a 10 productos por mensaje para evitar mensajes muy largos
          if ((index + 1) % 10 === 0 && index < products.length - 1) {
            productList += `_Continúa..._`
          }
        })

        await this.sendMessage(from, productList)
      }

      // Volver al menú principal
      await this.sendMessage(from,
        `¿Deseas realizar otra operación?\n\n` +
        `Responde cualquier cosa para volver al menú principal:`
      )

      this.setConversationState(from, this.STATES.ADMIN_MENU, {
        admin_session_id: conversationData.admin_session_id,
        admin_code: conversationData.admin_code
      })

    } catch (error) {
      console.error('Error listando productos:', error)
      await this.sendMessage(from, '❌ Error obteniendo lista de productos.')
      await this.showAdminMenu(from, await this.getCustomerName(from))
      this.setConversationState(from, this.STATES.ADMIN_MENU, {
        admin_session_id: conversationData.admin_session_id,
        admin_code: conversationData.admin_code
      })
    }
  }

  // 🔐 MANEJAR ACTUALIZACIÓN DE PRODUCTO
  async handleAdminUpdateProduct(from, messageText, conversationData) {
    try {
      const step = conversationData.admin_step || 'search'
      const productData = conversationData.product_data || {}

      switch (step) {
        case 'search':
          // Buscar producto por ID o nombre
          const searchTerm = messageText.trim()

          if (searchTerm.toLowerCase() === 'cancelar') {
            await this.sendMessage(from, `❌ *Operación Cancelada*\n\nVolviendo al menú principal...`)
            await this.showAdminMenu(from, await this.getCustomerName(from))
            this.setConversationState(from, this.STATES.ADMIN_MENU, {
              admin_session_id: conversationData.admin_session_id,
              admin_code: conversationData.admin_code
            })
            return
          }

          // Buscar productos que coincidan
          const products = await this.inventory.searchProducts(searchTerm)

          if (products.length === 0) {
            await this.sendMessage(from,
              `❌ *Producto No Encontrado*\n\n` +
              `No se encontró ningún producto con: "${searchTerm}"\n\n` +
              `Intenta con:\n` +
              `• ID del producto (ej: 1, 2, 3)\n` +
              `• Nombre completo o parcial\n` +
              `• Escribe "cancelar" para volver al menú\n\n` +
              `Envía otro término de búsqueda:`
            )
            return
          }

          if (products.length === 1) {
            // Solo un producto encontrado, proceder directamente
            const product = products[0]
            await this.sendMessage(from,
              `✅ *Producto Encontrado*\n\n` +
              `📦 *${product.nombre}*\n` +
              `💰 Precio: S/ ${product.precio}\n` +
              `📊 Stock: ${product.stock} unidades\n` +
              `📝 Descripción: ${product.descripcion}\n` +
              `🏷️ Categoría: ${product.categoria}\n\n` +
              `¿Qué deseas actualizar?\n\n` +
              `1️⃣ Nombre\n` +
              `2️⃣ Precio\n` +
              `3️⃣ Descripción\n` +
              `4️⃣ Categoría\n` +
              `5️⃣ Imagen URL\n` +
              `6️⃣ Cancelar\n\n` +
              `Envía el número de la opción:`
            )

            this.setConversationState(from, this.STATES.ADMIN_UPDATE_PRODUCT, {
              ...conversationData,
              admin_step: 'select_field',
              product_data: { ...product }
            })
          } else {
            // Múltiples productos encontrados
            let productList = `🔍 *Productos Encontrados*\n\n`
            products.slice(0, 10).forEach((product, index) => {
              productList += `${index + 1}️⃣ *${product.nombre}* (ID: ${product.id})\n`
              productList += `   💰 S/ ${product.precio} | 📊 Stock: ${product.stock}\n\n`
            })

            productList += `Envía el *número* del producto que deseas actualizar:`

            await this.sendMessage(from, productList)

            this.setConversationState(from, this.STATES.ADMIN_UPDATE_PRODUCT, {
              ...conversationData,
              admin_step: 'select_product',
              product_data: { search_results: products }
            })
          }
          break

        case 'select_product':
          // Seleccionar producto de la lista
          const productIndex = parseInt(messageText.trim()) - 1
          const searchResults = productData.search_results || []

          if (isNaN(productIndex) || productIndex < 0 || productIndex >= searchResults.length) {
            await this.sendMessage(from,
              `❌ *Selección Inválida*\n\n` +
              `Por favor, envía un número del 1 al ${searchResults.length}:`
            )
            return
          }

          const selectedProduct = searchResults[productIndex]
          await this.sendMessage(from,
            `✅ *Producto Seleccionado*\n\n` +
            `📦 *${selectedProduct.nombre}*\n` +
            `💰 Precio: S/ ${selectedProduct.precio}\n` +
            `📊 Stock: ${selectedProduct.stock} unidades\n` +
            `📝 Descripción: ${selectedProduct.descripcion}\n` +
            `🏷️ Categoría: ${selectedProduct.categoria}\n\n` +
            `¿Qué deseas actualizar?\n\n` +
            `1️⃣ Nombre\n` +
            `2️⃣ Precio\n` +
            `3️⃣ Descripción\n` +
            `4️⃣ Categoría\n` +
            `5️⃣ Imagen URL\n` +
            `6️⃣ Cancelar\n\n` +
            `Envía el número de la opción:`
          )

          this.setConversationState(from, this.STATES.ADMIN_UPDATE_PRODUCT, {
            ...conversationData,
            admin_step: 'select_field',
            product_data: { ...selectedProduct }
          })
          break

        case 'select_field':
          // Seleccionar campo a actualizar
          const fieldOption = messageText.trim()

          switch (fieldOption) {
            case '1':
              await this.sendMessage(from,
                `✏️ *Actualizar Nombre*\n\n` +
                `Nombre actual: *${productData.nombre}*\n\n` +
                `Envía el nuevo nombre del producto:`
              )
              this.setConversationState(from, this.STATES.ADMIN_UPDATE_PRODUCT, {
                ...conversationData,
                admin_step: 'update_name'
              })
              break

            case '2':
              await this.sendMessage(from,
                `💰 *Actualizar Precio*\n\n` +
                `Precio actual: *S/ ${productData.precio}*\n\n` +
                `Envía el nuevo precio (solo el número, ej: 25.50):`
              )
              this.setConversationState(from, this.STATES.ADMIN_UPDATE_PRODUCT, {
                ...conversationData,
                admin_step: 'update_price'
              })
              break

            case '3':
              await this.sendMessage(from,
                `📝 *Actualizar Descripción*\n\n` +
                `Descripción actual: *${productData.descripcion}*\n\n` +
                `Envía la nueva descripción del producto:`
              )
              this.setConversationState(from, this.STATES.ADMIN_UPDATE_PRODUCT, {
                ...conversationData,
                admin_step: 'update_description'
              })
              break

            case '4':
              await this.sendMessage(from,
                `🏷️ *Actualizar Categoría*\n\n` +
                `Categoría actual: *${productData.categoria}*\n\n` +
                `Envía la nueva categoría del producto:`
              )
              this.setConversationState(from, this.STATES.ADMIN_UPDATE_PRODUCT, {
                ...conversationData,
                admin_step: 'update_category'
              })
              break

            case '5':
              await this.sendMessage(from,
                `🖼️ *Actualizar Imagen*\n\n` +
                `URL actual: *${productData.imagen_url || 'Sin imagen'}*\n\n` +
                `Envía la nueva URL de la imagen:`
              )
              this.setConversationState(from, this.STATES.ADMIN_UPDATE_PRODUCT, {
                ...conversationData,
                admin_step: 'update_image'
              })
              break

            case '6':
              await this.sendMessage(from, `❌ *Operación Cancelada*\n\nVolviendo al menú principal...`)
              await this.showAdminMenu(from, await this.getCustomerName(from))
              this.setConversationState(from, this.STATES.ADMIN_MENU, {
                admin_session_id: conversationData.admin_session_id,
                admin_code: conversationData.admin_code
              })
              break

            default:
              await this.sendMessage(from,
                `❌ *Opción Inválida*\n\n` +
                `Por favor, envía un número del 1 al 6:`
              )
          }
          break

        case 'update_name':
          // Actualizar nombre del producto
          const newName = messageText.trim()

          if (newName.length < 3) {
            await this.sendMessage(from,
              `❌ *Nombre Muy Corto*\n\n` +
              `El nombre debe tener al menos 3 caracteres.\n` +
              `Envía un nombre válido:`
            )
            return
          }

          try {
            await this.inventory.updateProduct(productData.id, { nombre: newName })
            await this.sendMessage(from,
              `✅ *Nombre Actualizado*\n\n` +
              `📦 Producto: *${newName}*\n` +
              `✏️ Nombre anterior: ${productData.nombre}\n` +
              `✏️ Nombre nuevo: *${newName}*\n\n` +
              `¡Actualización completada exitosamente!`
            )

            // Volver al menú
            await this.showAdminMenu(from, await this.getCustomerName(from))
            this.setConversationState(from, this.STATES.ADMIN_MENU, {
              admin_session_id: conversationData.admin_session_id,
              admin_code: conversationData.admin_code
            })
          } catch (error) {
            console.error('Error actualizando nombre:', error)
            await this.sendMessage(from, `❌ Error actualizando el nombre del producto.`)
          }
          break

        case 'update_price':
          // Actualizar precio del producto
          const newPrice = parseFloat(messageText.trim())

          if (isNaN(newPrice) || newPrice <= 0) {
            await this.sendMessage(from,
              `❌ *Precio Inválido*\n\n` +
              `El precio debe ser un número mayor a 0.\n` +
              `Ejemplo: 25.50\n\n` +
              `Envía un precio válido:`
            )
            return
          }

          try {
            await this.inventory.updateProduct(productData.id, { precio: newPrice })
            await this.sendMessage(from,
              `✅ *Precio Actualizado*\n\n` +
              `📦 Producto: *${productData.nombre}*\n` +
              `💰 Precio anterior: S/ ${productData.precio}\n` +
              `💰 Precio nuevo: *S/ ${newPrice}*\n\n` +
              `¡Actualización completada exitosamente!`
            )

            // Volver al menú
            await this.showAdminMenu(from, await this.getCustomerName(from))
            this.setConversationState(from, this.STATES.ADMIN_MENU, {
              admin_session_id: conversationData.admin_session_id,
              admin_code: conversationData.admin_code
            })
          } catch (error) {
            console.error('Error actualizando precio:', error)
            await this.sendMessage(from, `❌ Error actualizando el precio del producto.`)
          }
          break

        case 'update_description':
          // Actualizar descripción del producto
          const newDescription = messageText.trim()

          if (newDescription.length < 10) {
            await this.sendMessage(from,
              `❌ *Descripción Muy Corta*\n\n` +
              `La descripción debe tener al menos 10 caracteres.\n` +
              `Envía una descripción más detallada:`
            )
            return
          }

          try {
            await this.inventory.updateProduct(productData.id, { descripcion: newDescription })
            await this.sendMessage(from,
              `✅ *Descripción Actualizada*\n\n` +
              `📦 Producto: *${productData.nombre}*\n` +
              `📝 Descripción anterior: ${productData.descripcion}\n` +
              `📝 Descripción nueva: *${newDescription}*\n\n` +
              `¡Actualización completada exitosamente!`
            )

            // Volver al menú
            await this.showAdminMenu(from, await this.getCustomerName(from))
            this.setConversationState(from, this.STATES.ADMIN_MENU, {
              admin_session_id: conversationData.admin_session_id,
              admin_code: conversationData.admin_code
            })
          } catch (error) {
            console.error('Error actualizando descripción:', error)
            await this.sendMessage(from, `❌ Error actualizando la descripción del producto.`)
          }
          break

        case 'update_category':
          // Actualizar categoría del producto
          const newCategory = messageText.trim()

          if (newCategory.length < 3) {
            await this.sendMessage(from,
              `❌ *Categoría Muy Corta*\n\n` +
              `La categoría debe tener al menos 3 caracteres.\n` +
              `Envía una categoría válida:`
            )
            return
          }

          try {
            await this.inventory.updateProduct(productData.id, { categoria: newCategory })
            await this.sendMessage(from,
              `✅ *Categoría Actualizada*\n\n` +
              `📦 Producto: *${productData.nombre}*\n` +
              `🏷️ Categoría anterior: ${productData.categoria}\n` +
              `🏷️ Categoría nueva: *${newCategory}*\n\n` +
              `¡Actualización completada exitosamente!`
            )

            // Volver al menú
            await this.showAdminMenu(from, await this.getCustomerName(from))
            this.setConversationState(from, this.STATES.ADMIN_MENU, {
              admin_session_id: conversationData.admin_session_id,
              admin_code: conversationData.admin_code
            })
          } catch (error) {
            console.error('Error actualizando categoría:', error)
            await this.sendMessage(from, `❌ Error actualizando la categoría del producto.`)
          }
          break

        case 'update_image':
          // Actualizar imagen del producto
          const newImageUrl = messageText.trim()

          // Validar URL básica
          if (newImageUrl && !newImageUrl.match(/^https?:\/\/.+/)) {
            await this.sendMessage(from,
              `❌ *URL Inválida*\n\n` +
              `La URL debe comenzar con http:// o https://\n` +
              `Ejemplo: https://ejemplo.com/imagen.jpg\n\n` +
              `Envía una URL válida o "sin imagen" para quitar la imagen:`
            )
            return
          }

          try {
            const finalImageUrl = newImageUrl.toLowerCase() === 'sin imagen' ? null : newImageUrl
            await this.inventory.updateProduct(productData.id, { imagen_url: finalImageUrl })

            await this.sendMessage(from,
              `✅ *Imagen Actualizada*\n\n` +
              `📦 Producto: *${productData.nombre}*\n` +
              `🖼️ URL anterior: ${productData.imagen_url || 'Sin imagen'}\n` +
              `🖼️ URL nueva: *${finalImageUrl || 'Sin imagen'}*\n\n` +
              `¡Actualización completada exitosamente!`
            )

            // Volver al menú
            await this.showAdminMenu(from, await this.getCustomerName(from))
            this.setConversationState(from, this.STATES.ADMIN_MENU, {
              admin_session_id: conversationData.admin_session_id,
              admin_code: conversationData.admin_code
            })
          } catch (error) {
            console.error('Error actualizando imagen:', error)
            await this.sendMessage(from, `❌ Error actualizando la imagen del producto.`)
          }
          break

        default:
          await this.sendMessage(from, `❌ Estado no válido. Volviendo al menú principal...`)
          await this.showAdminMenu(from, await this.getCustomerName(from))
          this.setConversationState(from, this.STATES.ADMIN_MENU, {
            admin_session_id: conversationData.admin_session_id,
            admin_code: conversationData.admin_code
          })
      }

    } catch (error) {
      console.error('Error en handleAdminUpdateProduct:', error)
      await this.sendMessage(from, '❌ Error procesando actualización de producto.')
      await this.showAdminMenu(from, await this.getCustomerName(from))
      this.setConversationState(from, this.STATES.ADMIN_MENU, {
        admin_session_id: conversationData.admin_session_id,
        admin_code: conversationData.admin_code
      })
    }
  }

  // 🔐 MANEJAR ACTUALIZACIÓN DE STOCK
  async handleAdminUpdateStock(from, messageText, conversationData) {
    try {
      const step = conversationData.admin_step || 'search'
      const productData = conversationData.product_data || {}

      switch (step) {
        case 'search':
          // Buscar producto por ID o nombre
          const searchTerm = messageText.trim()

          if (searchTerm.toLowerCase() === 'cancelar') {
            await this.sendMessage(from, `❌ *Operación Cancelada*\n\nVolviendo al menú principal...`)
            await this.showAdminMenu(from, await this.getCustomerName(from))
            this.setConversationState(from, this.STATES.ADMIN_MENU, {
              admin_session_id: conversationData.admin_session_id,
              admin_code: conversationData.admin_code
            })
            return
          }

          // Buscar productos que coincidan
          const products = await this.inventory.searchProducts(searchTerm)

          if (products.length === 0) {
            await this.sendMessage(from,
              `❌ *Producto No Encontrado*\n\n` +
              `No se encontró ningún producto con: "${searchTerm}"\n\n` +
              `Intenta con:\n` +
              `• ID del producto (ej: 1, 2, 3)\n` +
              `• Nombre completo o parcial\n` +
              `• Escribe "cancelar" para volver al menú\n\n` +
              `Envía otro término de búsqueda:`
            )
            return
          }

          if (products.length === 1) {
            // Solo un producto encontrado, proceder directamente
            const product = products[0]
            await this.sendMessage(from,
              `✅ *Producto Encontrado*\n\n` +
              `📦 *${product.nombre}*\n` +
              `📊 Stock actual: *${product.stock} unidades*\n` +
              `💰 Precio: S/ ${product.precio}\n` +
              `🏷️ Categoría: ${product.categoria}\n\n` +
              `¿Qué tipo de actualización deseas hacer?\n\n` +
              `1️⃣ Establecer stock exacto\n` +
              `2️⃣ Agregar stock (suma)\n` +
              `3️⃣ Reducir stock (resta)\n` +
              `4️⃣ Cancelar\n\n` +
              `Envía el número de la opción:`
            )

            this.setConversationState(from, this.STATES.ADMIN_UPDATE_STOCK, {
              ...conversationData,
              admin_step: 'select_operation',
              product_data: { ...product }
            })
          } else {
            // Múltiples productos encontrados
            let productList = `🔍 *Productos Encontrados*\n\n`
            products.slice(0, 10).forEach((product, index) => {
              productList += `${index + 1}️⃣ *${product.nombre}* (ID: ${product.id})\n`
              productList += `   📊 Stock: ${product.stock} | 💰 S/ ${product.precio}\n\n`
            })

            productList += `Envía el *número* del producto para actualizar su stock:`

            await this.sendMessage(from, productList)

            this.setConversationState(from, this.STATES.ADMIN_UPDATE_STOCK, {
              ...conversationData,
              admin_step: 'select_product',
              product_data: { search_results: products }
            })
          }
          break

        case 'select_product':
          // Seleccionar producto de la lista
          const productIndex = parseInt(messageText.trim()) - 1
          const searchResults = productData.search_results || []

          if (isNaN(productIndex) || productIndex < 0 || productIndex >= searchResults.length) {
            await this.sendMessage(from,
              `❌ *Selección Inválida*\n\n` +
              `Por favor, envía un número del 1 al ${searchResults.length}:`
            )
            return
          }

          const selectedProduct = searchResults[productIndex]
          await this.sendMessage(from,
            `✅ *Producto Seleccionado*\n\n` +
            `📦 *${selectedProduct.nombre}*\n` +
            `📊 Stock actual: *${selectedProduct.stock} unidades*\n` +
            `💰 Precio: S/ ${selectedProduct.precio}\n` +
            `🏷️ Categoría: ${selectedProduct.categoria}\n\n` +
            `¿Qué tipo de actualización deseas hacer?\n\n` +
            `1️⃣ Establecer stock exacto\n` +
            `2️⃣ Agregar stock (suma)\n` +
            `3️⃣ Reducir stock (resta)\n` +
            `4️⃣ Cancelar\n\n` +
            `Envía el número de la opción:`
          )

          this.setConversationState(from, this.STATES.ADMIN_UPDATE_STOCK, {
            ...conversationData,
            admin_step: 'select_operation',
            product_data: { ...selectedProduct }
          })
          break

        case 'select_operation':
          // Seleccionar tipo de operación
          const operation = messageText.trim()

          switch (operation) {
            case '1':
              await this.sendMessage(from,
                `📊 *Establecer Stock Exacto*\n\n` +
                `📦 Producto: *${productData.name}*\n` +
                `📊 Stock actual: ${productData.stock} unidades\n\n` +
                `Envía la cantidad exacta de stock que deseas establecer:`
              )
              this.setConversationState(from, this.STATES.ADMIN_UPDATE_STOCK, {
                ...conversationData,
                admin_step: 'set_exact',
                operation_type: 'set'
              })
              break

            case '2':
              await this.sendMessage(from,
                `➕ *Agregar Stock*\n\n` +
                `📦 Producto: *${productData.name}*\n` +
                `📊 Stock actual: ${productData.stock} unidades\n\n` +
                `Envía la cantidad que deseas AGREGAR al stock actual:`
              )
              this.setConversationState(from, this.STATES.ADMIN_UPDATE_STOCK, {
                ...conversationData,
                admin_step: 'add_stock',
                operation_type: 'add'
              })
              break

            case '3':
              await this.sendMessage(from,
                `➖ *Reducir Stock*\n\n` +
                `📦 Producto: *${productData.name}*\n` +
                `📊 Stock actual: ${productData.stock} unidades\n\n` +
                `Envía la cantidad que deseas REDUCIR del stock actual:`
              )
              this.setConversationState(from, this.STATES.ADMIN_UPDATE_STOCK, {
                ...conversationData,
                admin_step: 'reduce_stock',
                operation_type: 'reduce'
              })
              break

            case '4':
              await this.sendMessage(from, `❌ *Operación Cancelada*\n\nVolviendo al menú principal...`)
              await this.showAdminMenu(from, await this.getCustomerName(from))
              this.setConversationState(from, this.STATES.ADMIN_MENU, {
                admin_session_id: conversationData.admin_session_id,
                admin_code: conversationData.admin_code
              })
              break

            default:
              await this.sendMessage(from,
                `❌ *Opción Inválida*\n\n` +
                `Por favor, envía un número del 1 al 4:`
              )
          }
          break

        case 'set_exact':
          // Establecer stock exacto
          const exactStock = parseInt(messageText.trim())

          if (isNaN(exactStock) || exactStock < 0) {
            await this.sendMessage(from,
              `❌ *Cantidad Inválida*\n\n` +
              `El stock debe ser un número entero mayor o igual a 0.\n` +
              `Ejemplo: 50\n\n` +
              `Envía una cantidad válida:`
            )
            return
          }

          try {
            await this.inventory.updateProduct(productData.id, { stock: exactStock })
            await this.sendMessage(from,
              `✅ *Stock Actualizado*\n\n` +
              `📦 Producto: *${productData.nombre}*\n` +
              `📊 Stock anterior: ${productData.stock} unidades\n` +
              `📊 Stock nuevo: *${exactStock} unidades*\n\n` +
              `¡Actualización completada exitosamente!`
            )

            // Volver al menú
            await this.showAdminMenu(from, await this.getCustomerName(from))
            this.setConversationState(from, this.STATES.ADMIN_MENU, {
              admin_session_id: conversationData.admin_session_id,
              admin_code: conversationData.admin_code
            })
          } catch (error) {
            console.error('Error actualizando stock:', error)
            await this.sendMessage(from, `❌ Error actualizando el stock del producto.`)
          }
          break

        case 'add_stock':
          // Agregar stock
          const addAmount = parseInt(messageText.trim())

          if (isNaN(addAmount) || addAmount <= 0) {
            await this.sendMessage(from,
              `❌ *Cantidad Inválida*\n\n` +
              `La cantidad a agregar debe ser un número entero mayor a 0.\n` +
              `Ejemplo: 25\n\n` +
              `Envía una cantidad válida:`
            )
            return
          }

          try {
            const newStock = productData.stock + addAmount
            await this.inventory.updateProduct(productData.id, { stock: newStock })
            await this.sendMessage(from,
              `✅ *Stock Agregado*\n\n` +
              `📦 Producto: *${productData.name}*\n` +
              `📊 Stock anterior: ${productData.stock} unidades\n` +
              `➕ Cantidad agregada: ${addAmount} unidades\n` +
              `📊 Stock nuevo: *${newStock} unidades*\n\n` +
              `¡Actualización completada exitosamente!`
            )

            // Volver al menú
            await this.showAdminMenu(from, await this.getCustomerName(from))
            this.setConversationState(from, this.STATES.ADMIN_MENU, {
              admin_session_id: conversationData.admin_session_id,
              admin_code: conversationData.admin_code
            })
          } catch (error) {
            console.error('Error agregando stock:', error)
            await this.sendMessage(from, `❌ Error agregando stock al producto.`)
          }
          break

        case 'reduce_stock':
          // Reducir stock
          const reduceAmount = parseInt(messageText.trim())

          if (isNaN(reduceAmount) || reduceAmount <= 0) {
            await this.sendMessage(from,
              `❌ *Cantidad Inválida*\n\n` +
              `La cantidad a reducir debe ser un número entero mayor a 0.\n` +
              `Ejemplo: 10\n\n` +
              `Envía una cantidad válida:`
            )
            return
          }

          if (reduceAmount > productData.stock) {
            await this.sendMessage(from,
              `❌ *Cantidad Excesiva*\n\n` +
              `No puedes reducir ${reduceAmount} unidades.\n` +
              `Stock actual: ${productData.stock} unidades\n` +
              `Máximo a reducir: ${productData.stock} unidades\n\n` +
              `Envía una cantidad válida:`
            )
            return
          }

          try {
            const newStock = productData.stock - reduceAmount
            await this.inventory.updateProduct(productData.id, { stock: newStock })
            await this.sendMessage(from,
              `✅ *Stock Reducido*\n\n` +
              `📦 Producto: *${productData.name}*\n` +
              `📊 Stock anterior: ${productData.stock} unidades\n` +
              `➖ Cantidad reducida: ${reduceAmount} unidades\n` +
              `📊 Stock nuevo: *${newStock} unidades*\n\n` +
              `¡Actualización completada exitosamente!`
            )

            // Volver al menú
            await this.showAdminMenu(from, await this.getCustomerName(from))
            this.setConversationState(from, this.STATES.ADMIN_MENU, {
              admin_session_id: conversationData.admin_session_id,
              admin_code: conversationData.admin_code
            })
          } catch (error) {
            console.error('Error reduciendo stock:', error)
            await this.sendMessage(from, `❌ Error reduciendo stock del producto.`)
          }
          break

        default:
          await this.sendMessage(from, `❌ Estado no válido. Volviendo al menú principal...`)
          await this.showAdminMenu(from, await this.getCustomerName(from))
          this.setConversationState(from, this.STATES.ADMIN_MENU, {
            admin_session_id: conversationData.admin_session_id,
            admin_code: conversationData.admin_code
          })
      }

    } catch (error) {
      console.error('Error en handleAdminUpdateStock:', error)
      await this.sendMessage(from, '❌ Error procesando actualización de stock.')
      await this.showAdminMenu(from, await this.getCustomerName(from))
      this.setConversationState(from, this.STATES.ADMIN_MENU, {
        admin_session_id: conversationData.admin_session_id,
        admin_code: conversationData.admin_code
      })
    }
  }

  // Sugerir categorías para explorar más productos
  async sugerirCategorias(from, customerName) {
    try {
      const categorias = await this.inventory.getCategories()

      if (categorias.length > 0) {
        const categoriasTexto = categorias.join(', ')
        
        // 🧠 SUGERENCIAS DINÁMICAS: Usar las primeras 2 categorías reales como ejemplos
        const ejemplosCateg = categorias.slice(0, 2)
        const ejemplosTexto = ejemplosCateg.length >= 2 
          ? `"muéstrame ${ejemplosCateg[0].toLowerCase()}" o "¿qué tienes en ${ejemplosCateg[1].toLowerCase()}?"`
          : ejemplosCateg.length === 1
          ? `"muéstrame ${ejemplosCateg[0].toLowerCase()}"`
          : '"muéstrame [categoría]"'
        
        const sugerenciaMessage = `¿Te interesa algún producto diferente? 🤔

Entre nuestras categorías tenemos: ${categoriasTexto}.

Solo dime algo como ${ejemplosTexto} y te mostraré los productos más populares de esa categoría. 😊`

        await this.sendMessage(from, sugerenciaMessage)
        this.addToHistory(from, 'assistant', sugerenciaMessage)
      } else {
        const closingMessage = `¿Te interesa alguno de estos productos? ¡Dime cuál te llama la atención! 🛍️`
        await this.sendMessage(from, closingMessage)
        this.addToHistory(from, 'assistant', closingMessage)
      }
    } catch (error) {
      console.error('Error sugiriendo categorías:', error)
      const closingMessage = `¿Te interesa alguno de estos productos? ¡Dime cuál te llama la atención! 🛍️`
      await this.sendMessage(from, closingMessage)
      this.addToHistory(from, 'assistant', closingMessage)
    }
  }

  // Manejar solicitudes de categorías específicas
  async handleCategoryRequest(from, messageText, customerName, categoria) {
    try {
      console.log(`🏷️ Cliente solicita categoría: ${categoria}`)

      // Obtener productos de la categoría
      const productosCategoria = await this.inventory.getProductsByCategory(categoria)

      if (productosCategoria.length === 0) {
        const noProductsMessage = `Lo siento, actualmente no tenemos productos disponibles en la categoría "${categoria}". 😔

¿Te gustaría ver nuestros productos destacados o explorar otra categoría?`

        await this.sendMessage(from, noProductsMessage)
        this.addToHistory(from, 'assistant', noProductsMessage)
        return
      }

      // Obtener productos más vendidos de esta categoría (si hay datos de ventas)
      let productosMostrar = productosCategoria

      if (this.sales) {
        try {
          const productosMasVendidos = await this.sales.getProductosMasVendidos(categoria, 5)

          if (productosMasVendidos.length > 0) {
            // Filtrar productos que existen en inventario y ordenar por ventas
            const productosConVentas = []

            for (const vendido of productosMasVendidos) {
              const producto = productosCategoria.find(p => p.id === vendido.producto_id)
              if (producto) {
                productosConVentas.push({
                  ...producto,
                  total_vendido: vendido.total_vendido,
                  total_ingresos: vendido.total_ingresos
                })
              }
            }

            // Agregar productos restantes que no están en el ranking
            const productosRestantes = productosCategoria.filter(p =>
              !productosConVentas.find(pv => pv.id === p.id)
            )

            productosMostrar = [...productosConVentas, ...productosRestantes].slice(0, 5)
          }
        } catch (error) {
          console.error('Error obteniendo productos más vendidos:', error)
          // Usar productos normales si falla
          productosMostrar = productosCategoria.slice(0, 5)
        }
      } else {
        productosMostrar = productosCategoria.slice(0, 5)
      }

      // Enviar mensaje introductorio
      const introMessage = `🏷️ Aquí tienes nuestros productos de ${categoria}${this.sales ? ' (ordenados por popularidad)' : ''}:`
      await this.sendMessage(from, introMessage)
      this.addToHistory(from, 'assistant', introMessage)

      // Enviar productos con imágenes
      for (const product of productosMostrar) {
        let descripcionExtra = ''
        if (product.total_vendido) {
          descripcionExtra = `\n🔥 ¡${product.total_vendido} vendidos! Muy popular`
        }

        await this.sendProductWithImage(from, product, descripcionExtra)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Mensaje de cierre
      const closingMessage = `¿Te interesa alguno de estos productos de ${categoria}? ¡Dime cuál te llama la atención! 😊

También puedes preguntarme por otra categoría si quieres explorar más opciones. 🛍️`

      await this.sendMessage(from, closingMessage)
      this.addToHistory(from, 'assistant', closingMessage)

    } catch (error) {
      console.error('Error manejando solicitud de categoría:', error)

      const errorMessage = `Disculpa, tuve un problema buscando productos de ${categoria}. ¿Podrías intentar de nuevo o preguntarme por otra categoría? 😊`
      await this.sendMessage(from, errorMessage)
      this.addToHistory(from, 'assistant', errorMessage)
    }
  }

  async handleAskSpecification(from, messageText, intent, products, customerName, recentHistory) {
    let response;

    // 👑 PRIORIDAD MÁXIMA: VERIFICAR SI ES CLIENTE VIP Y MANEJAR CONTEXTO VIP
    const conversationData = await this.getConversationData(from)
    const isVipClient = conversationData.cliente_nivel === 'VIP' || 
                       (conversationData.es_recurrente && conversationData.total_pedidos >= 3)
    
    if (isVipClient) {
      console.log(`👑 handleAskSpecification: Cliente VIP detectado - ${customerName}`)
      
      // Verificar si hay productos VIP en el contexto de interés
      const hasVipProductsInContext = conversationData.interested_products && 
                                     conversationData.interested_products.some(p => p.isVip)
      
      if (hasVipProductsInContext) {
        console.log(`🎆 Cliente VIP con productos VIP en contexto - manteniendo contexto VIP`)
        
        // 🎯 CORRECIÓN CRÍTICA: Usar productos VIP del contexto para ask_quantity directo
        const productosVipContexto = conversationData.interested_products.filter(p => p.isVip)
        
        // 🔍 VERIFICAR SI ES REFERENCIA CONTEXTUAL ("ese", "si quiero", "comprarlo", "oferta", etc.)
        const isContextualReference = /\b(ese|esa|este|esta|si\s+quiero|lo\s+quiero|comprarlo|quiero\s+comprarlo|el\s+|la\s+|oferta)\b/i.test(messageText)
        
        if (isContextualReference) {
          console.log(`🎯 REFERENCIA CONTEXTUAL VIP DETECTADA: "${messageText}" → ${productosVipContexto[0].name}`)
          
          // 🎯 AVANZAR DIRECTAMENTE A ASK_QUANTITY (como en el backup)
          const contextualIntent = {
            intent: 'specifying',
            confidence: 'high',
            products_mentioned: productosVipContexto,
            quantity_mentioned: 0,
            is_explicit_confirmation: false,
            requires_clarification: true,
            suggested_response_type: 'ask_quantity'
          }
          
          console.log(`🎯 AVANZANDO A ASK_QUANTITY con producto VIP: ${productosVipContexto[0].name}`)
          
          // Llamar directamente a handleAskQuantity con productos VIP
          await this.handleAskQuantity(from, contextualIntent, conversationData, customerName, recentHistory)
          
          // Configurar estado SPECIFYING con productos VIP
          this.setConversationState(from, this.STATES.SPECIFYING, {
            ...conversationData,
            selected_products: productosVipContexto,
            quantity: 1,
            vip_product_context: true // 🌟 Marcar contexto VIP
          })
          
          return // 🎯 TERMINAR AQUÍ - NO generar respuesta adicional
        }
        
        // Si no es referencia contextual, generar respuesta VIP informativa
        response = await this.gemini.generateSalesResponse(
          `Cliente VIP ${customerName} pregunta: "${messageText}" sobre productos VIP ${productosVipContexto.map(p => p.name).join(', ')}. Responde como agente VIP especializado, mencionando beneficios exclusivos VIP.`,
          customerName,
          productosVipContexto, // Usar productos VIP del contexto
          this.STATES.INTERESTED,
          recentHistory,
          this.inventory
        )
        
        await this.sendMessage(from, response)
        this.addToHistory(from, 'assistant', response)
        return // Terminar aquí para mantener contexto VIP
      }
      
      // Si no hay productos VIP en contexto, verificar si el mensaje se refiere a productos VIP
      if (this.vip) {
        try {
          const productosVipActivos = await this.vip.getProductosVipActivos()
          
          if (productosVipActivos && productosVipActivos.length > 0) {
            const messageLower = messageText.toLowerCase().trim()
            
            // Usar la misma lógica de filtrado mejorada
            const vipRelevantes = productosVipActivos.filter(pv => {
              const nombreLower = pv.nombre.toLowerCase()
              
              // Buscar coincidencias flexibles
              if (messageLower.includes('iphone 15') && nombreLower.includes('iphone 15')) return true
              if (messageLower.includes('iphone 16') && nombreLower.includes('iphone 16')) return true  
              if (messageLower.includes('iphone 14') && nombreLower.includes('iphone 14')) return true
              
              // Referencias contextuales
              const contextualRefs = ['ese', 'esa', 'este', 'esta', 'el ', ' el', 'oferta']
              if (contextualRefs.some(ref => messageLower.includes(ref))) return true
              
              return false
            })
            
            if (vipRelevantes.length > 0) {
              console.log(`🎆 handleAskSpecification: Productos VIP relevantes encontrados para cliente VIP`)
              
              const productoVip = vipRelevantes[0]
              
              // 🧠 USAR RAZONAMIENTO CONTEXTUAL si está disponible
              let contextualPrompt = `Cliente VIP ${customerName} pregunta: "${messageText}" sobre producto VIP ${productoVip.nombre} (precio VIP: S/ ${productoVip.precio_vip}). Responde como agente VIP especializado.`
              
              if (conversationData.reasoning && conversationData.reasoning.personalityInstructions) {
                const { personalityInstructions, semanticContext, adaptedPersonality } = conversationData.reasoning
                console.log(`🧠 APLICANDO RAZONAMIENTO CONTEXTUAL VIP para ${customerName}`)
                
                contextualPrompt = `🧠 CONTEXTO INTELIGENTE VIP:
- Cliente: ${customerName} (Personalidad: ${adaptedPersonality.basePersonality || 'default'})
- Tono recomendado: ${personalityInstructions.tone || 'friendly'}
- Estilo: ${personalityInstructions.style || 'conversational'}
- Contexto semántico: ${semanticContext.hasContext ? 'Cliente con historial' : 'Cliente nuevo'}

PREGUNTA ESPECÍFICA: "${messageText}"
PRODUCTO VIP: ${productoVip.nombre} (precio VIP: S/ ${productoVip.precio_vip})

INSTRUCCIONES DE RESPUESTA:
- Responde de manera ${personalityInstructions.tone || 'friendly'} y ${personalityInstructions.style || 'conversational'}
- Proporciona información específica y útil sobre el producto VIP
- Mantén el contexto de la conversación previa
- Demuestra comprensión de la pregunta específica del cliente
- NO uses respuestas genéricas como "Producto de alta calidad con excelentes características"
- Elabora una respuesta natural y contextual que responda directamente a la pregunta`
              }
              
              response = await this.gemini.generateSalesResponse(
                contextualPrompt,
                customerName,
                [productoVip],
                this.STATES.INTERESTED,
                recentHistory,
                this.inventory
              )
              
              await this.sendMessage(from, response)
              this.addToHistory(from, 'assistant', response)
              
              // Actualizar contexto con producto VIP
              this.setConversationState(from, this.STATES.INTERESTED, {
                ...conversationData,
                interested_products: vipRelevantes.map(p => ({
                  id: p.id,
                  name: p.nombre,
                  price: p.precio_vip,
                  description: p.descripcion,
                  stock: p.stock_disponible,
                  isVip: true
                })),
                // 🎯 CORRECCIÓN: Agregar displayed_products para que interpretContextualReference funcione
                displayed_products: vipRelevantes.map((p, index) => ({
                  id: p.id,
                  name: p.nombre,
                  price: p.precio_vip,
                  description: p.descripcion,
                  stock: p.stock_disponible,
                  isVip: true,
                  position: index + 1, // Para referencias como "el primero", "el segundo"
                  displayOrder: index,
                  timestamp: Date.now()
                }))
              })
              
              return // Terminar aquí con contexto VIP
            }
          }
        } catch (vipError) {
          console.error('Error verificando productos VIP en handleAskSpecification:', vipError)
        }
      }
    }
    
    // 🛒 DETECCIÓN DE PURCHASE_INTENT UNIVERSAL: Enhanced context + Memoria inventario
    const messageLC = messageText.toLowerCase()
    const purchaseKeywords = ['quiero comprarlo', 'lo quiero', 'me lo llevo', 'lo compro', 'quiero comprar']
    const isPurchaseIntent = purchaseKeywords.some(keyword => messageLC.includes(keyword))
    
    // 🧠 VERIFICAR ENHANCED CONTEXT PRIMERO para purchase_intent
    if (isPurchaseIntent) {
      console.log(`🛒 PURCHASE_INTENT detectado: "${messageText}"`);
      
      // 🔍 Verificar Enhanced context activo
      try {
        const enhancedContext = await this.db.getConversationData(from);
        if (enhancedContext && enhancedContext.enhanced_context_active && enhancedContext.enhanced_last_product) {
          console.log(`🧠 PURCHASE_INTENT con Enhanced context: ${enhancedContext.enhanced_last_product}`);
          
          // 🎯 Crear producto desde Enhanced context
          const enhancedProduct = {
            id: enhancedContext.enhanced_last_product.replace(/\s+/g, '_').toLowerCase(),
            name: enhancedContext.enhanced_last_product,
            price: enhancedContext.enhanced_product_price || 'consultar'
          };
          
          const purchaseIntent = {
            intent: 'interested',
            confidence: 'high',
            products_mentioned: [enhancedProduct],
            quantity_mentioned: 0,
            suggested_response_type: 'ask_quantity'
          };
          
          console.log(`🛒 ENHANCED PURCHASE: Delegando a ASK_QUANTITY para ${enhancedProduct.name}`);
          await this.handleAskQuantity(from, purchaseIntent, conversationData, customerName, recentHistory);
          
          this.setConversationState(from, this.STATES.SPECIFYING, {
            ...conversationData,
            selected_products: [enhancedProduct],
            quantity: 1,
            enhanced_purchase_context: true,
            purchase_intent_detected: true
          });
          
          return // 🛒 Purchase intent procesado con Enhanced context
        }
      } catch (enhancedError) {
        console.warn('⚠️ Error verificando Enhanced context para purchase_intent:', enhancedError.message);
      }
    }
    
    // 📦 SEGUNDA PRIORIDAD: VERIFICAR MEMORIA INVENTARIO ACTIVA
    const dualContext = await this.dualMemory.determineAppropriateContext(from)
    
    if (dualContext.contextType === 'inventory' && dualContext.contextStatus === 'active' && dualContext.inventoryPriority) {
      console.log(`📦 handleAskSpecification: Memoria inventario activa detectada - ${customerName}`)
      console.log(`📦 Productos en memoria inventario:`, dualContext.products.map(p => p.name).join(', '))
      
      // 🎯 Usar productos de la memoria inventario con prioridad
      const inventoryProducts = dualContext.products
      
      if (inventoryProducts.length > 0) {
        console.log(`📦 USANDO MEMORIA INVENTARIO: ${inventoryProducts.length} productos disponibles`)
        
        // 🛒 DETECCIÓN DE PURCHASE_INTENT: Verificar si el cliente quiere comprar producto de memoria
        const messageLC = messageText.toLowerCase()
        const purchaseKeywords = ['quiero comprarlo', 'lo quiero', 'me lo llevo', 'lo compro', 'quiero comprar']
        const isPurchaseIntent = purchaseKeywords.some(keyword => messageLC.includes(keyword))
        
        if (isPurchaseIntent && inventoryProducts.length === 1) {
          console.log(`🛒 PURCHASE_INTENT detectado con producto en memoria: ${inventoryProducts[0].name || inventoryProducts[0].nombre}`)
          
          const inventoryProduct = inventoryProducts[0]
          const productDisplayName = inventoryProduct.name || inventoryProduct.nombre || 'Producto'
          
          // ✅ TRANSICIÓN DIRECTA A ASK_QUANTITY
          const purchaseIntent = {
            intent: 'interested',
            confidence: 'high',
            products_mentioned: [inventoryProduct],
            quantity_mentioned: 0,
            suggested_response_type: 'ask_quantity'
          }
          
          console.log(`🛒 DELEGANDO A ASK_QUANTITY para: ${productDisplayName}`)
          await this.handleAskQuantity(from, purchaseIntent, conversationData, customerName, recentHistory)
          
          this.setConversationState(from, this.STATES.SPECIFYING, {
            ...conversationData,
            selected_products: [inventoryProduct],
            quantity: 1,
            inventory_product_context: true,
            purchase_intent_detected: true
          })
          
          return // Terminar aquí - flujo de compra iniciado
        }
        
        // 🔍 Detectar si cliente se refiere específicamente a uno de los productos
        // Reusar messageLC ya declarado arriba
        let selectedInventoryProduct = null
        
        // Buscar referencias específicas a productos de la memoria
        for (const memoryProduct of inventoryProducts) {
          // 🛡️ VALIDACIÓN DEFENSIVA: Verificar que el producto tenga propiedades válidas
          if (!memoryProduct || (!memoryProduct.name && !memoryProduct.nombre)) {
            console.warn(`⚠️ Producto en memoria sin nombre válido:`, memoryProduct)
            continue
          }
          
          // 🔧 COMPATIBILIDAD: Usar 'name' o 'nombre' según disponibilidad
          const productName = (memoryProduct.name || memoryProduct.nombre || '').toLowerCase()
          
          if (!productName) {
            console.warn(`⚠️ Producto en memoria con nombre vacío:`, memoryProduct)
            continue
          }
          
          if (messageLC.includes('iphone 15') && productName.includes('iphone 15')) {
            selectedInventoryProduct = memoryProduct
            break
          } else if (messageLC.includes('iphone 14') && productName.includes('iphone 14')) {
            selectedInventoryProduct = memoryProduct
            break
          } else if (messageLC.includes('iphone 16') && productName.includes('iphone 16')) {
            selectedInventoryProduct = memoryProduct
            break
          }
        }
        
        // 🎯 Si hay producto específico, hacer transición directa a quantity
        if (selectedInventoryProduct) {
          const productDisplayName = selectedInventoryProduct.name || selectedInventoryProduct.nombre || 'Producto'
          console.log(`🎯 PRODUCTO ESPECÍFICO DE MEMORIA: ${productDisplayName}`)
          
          const inventoryIntent = {
            intent: 'specifying',
            confidence: 'high',
            products_mentioned: [selectedInventoryProduct],
            quantity_mentioned: 0,
            suggested_response_type: 'ask_quantity'
          }
          
          await this.handleAskQuantity(from, inventoryIntent, conversationData, customerName, recentHistory)
          
          this.setConversationState(from, this.STATES.SPECIFYING, {
            ...conversationData,
            selected_products: [selectedInventoryProduct],
            quantity: 1,
            inventory_product_context: true // 📦 Marcar contexto inventario
          })
          
          return // Terminar aquí
        }
        
        // 💬 Si no hay producto específico, generar respuesta sobre productos de memoria
        
        // 🧠 USAR RAZONAMIENTO CONTEXTUAL si está disponible
        let contextualPrompt = `Cliente ${customerName} pregunta: "${messageText}" sobre productos de inventario: ${inventoryProducts.map(p => (p.name || p.nombre || 'Producto')).join(', ')}. Responde informativamente sobre estos productos específicos que el cliente solicitó.`
        
        if (conversationData.reasoning && conversationData.reasoning.personalityInstructions) {
          const { personalityInstructions, semanticContext, adaptedPersonality } = conversationData.reasoning
          console.log(`🧠 APLICANDO RAZONAMIENTO CONTEXTUAL INVENTARIO para ${customerName}`)
          
          contextualPrompt = `🧠 CONTEXTO INTELIGENTE INVENTARIO:
- Cliente: ${customerName} (Personalidad: ${adaptedPersonality.basePersonality || 'default'})
- Tono recomendado: ${personalityInstructions.tone || 'friendly'}
- Estilo: ${personalityInstructions.style || 'conversational'}
- Contexto semántico: ${semanticContext.hasContext ? 'Cliente con historial' : 'Cliente nuevo'}

PREGUNTA ESPECÍFICA: "${messageText}"
PRODUCTOS ESPECÍFICOS EN MEMORIA ACTIVA: ${inventoryProducts.map(p => (p.name || p.nombre || 'Producto')).join(', ')}

🎯 RESTRICCIÓN CRÍTICA:
- DEBES responder ÚNICAMENTE sobre estos productos específicos: ${inventoryProducts.map(p => (p.name || p.nombre || 'Producto')).join(', ')}
- NO menciones otros productos que no estén en esta lista
- El cliente se refiere específicamente a estos productos cuando dice "ese celular" o términos similares
- Mantén el foco exclusivamente en los productos de la memoria inventario activa

INSTRUCCIONES DE RESPUESTA:
- Responde de manera ${personalityInstructions.tone || 'friendly'} y ${personalityInstructions.style || 'conversational'}
- Proporciona información específica y detallada sobre ÚNICAMENTE estos productos específicos
- Razona sobre qué producto podría ser mejor según la pregunta del cliente
- Demuestra comprensión de la consulta específica
- NO uses respuestas genéricas como "Producto de alta calidad"
- Elabora una respuesta natural que ayude al cliente a tomar una decisión informada`
        }
        
        // 🎯 FORZAR CONTEXTO ESPECÍFICO: Solo pasar productos de memoria inventario
        console.log(`🎯 FORZANDO CONTEXTO ESPECÍFICO: Solo productos de memoria inventario`)
        console.log(`📦 Productos en memoria:`, inventoryProducts.map(p => (p.name || p.nombre)).join(', '))
        
        // 🔧 COORDINACIÓN JERÁRQUICA: Crear prompt que FUERZA el contexto de memoria
        const memorySpecificPrompt = `${contextualPrompt}

🚨 RESTRICCIÓN JERÁRQUICA CRÍTICA:
- ÚNICAMENTE puedes mencionar estos productos: ${inventoryProducts.map(p => (p.name || p.nombre)).join(', ')}
- Si el cliente dice "ese celular" se refiere ESPECÍFICAMENTE a: ${inventoryProducts[0].name || inventoryProducts[0].nombre}
- NO menciones iPhone 16, iPhone 14 u otros productos NO listados arriba
- Mantén coherencia absoluta con el contexto de memoria inventario activa`
        
        response = await this.gemini.generateSalesResponse(
          memorySpecificPrompt,
          customerName,
          inventoryProducts, // ✅ SOLO productos de memoria inventario
          this.STATES.INTERESTED,
          recentHistory,
          inventoryProducts // 🎯 REEMPLAZAR inventory completo con solo productos de memoria
        )
        
        await this.sendMessage(from, response)
        this.addToHistory(from, 'assistant', response)
        
        // Actualizar contexto con productos de memoria inventario
        this.setConversationState(from, this.STATES.INTERESTED, {
          ...conversationData,
          interested_products: inventoryProducts.map(p => ({
            id: p.id,
            name: p.name || p.nombre || 'Producto',
            price: p.price || p.precio || 0,
            description: p.description || p.descripcion || '',
            stock: p.stock || 0,
            isVip: false,
            fromInventoryMemory: true
          })),
          displayed_products: inventoryProducts.map((p, index) => ({
            id: p.id,
            name: p.name || p.nombre || 'Producto',
            price: p.price || p.precio || 0,
            description: p.description || p.descripcion || '',
            stock: p.stock || 0,
            isVip: false,
            position: index + 1,
            displayOrder: index,
            timestamp: Date.now(),
            fromInventoryMemory: true
          }))
        })
        
        return // Terminar aquí con memoria inventario
      }
    }
    
    // 📝 FLUJO NORMAL PARA CLIENTES NO-VIP O CUANDO NO HAY PRODUCTOS VIP RELEVANTES
    console.log(`📝 handleAskSpecification: Procesando flujo normal para ${customerName}`)

    if (intent.products_mentioned.length > 0) {
      // Cliente mencionó productos específicos
      const mentionedProducts = intent.products_mentioned

      // 🔍 NUEVA LÓGICA: Diferenciar entre buscar información vs querer comprar
      if (intent.intent === 'seeking_advice') {
        // Cliente busca información/consejo sobre el producto
        if (mentionedProducts.length === 1) {
          const productId = mentionedProducts[0].id
          const product = products.find(p => p.id === productId)

          if (product) {
            // 🧠 VERIFICAR SI HAY PREGUNTAS PENDIENTES que responder
            const pendingQuestions = await this.getPendingQuestions(from);
            
            if (pendingQuestions && pendingQuestions.questions.length > 0) {
              console.log(`🧠 Respondiendo preguntas pendientes para ${product.nombre}`);
              
              // Enviar imagen del producto
              await this.sendProductWithImage(from, product, '', true);
              
              // Generar respuesta que incluya las preguntas pendientes
              const questionsText = pendingQuestions.questions.map(q => q.extracted).join(', ');
              response = await this.gemini.generateSalesResponse(
                `Cliente especificó ${product.nombre} y tiene estas preguntas pendientes: ${questionsText}. RESPONDE TODAS las preguntas sobre: duración de la batería, uso para viajes, capacidad de grabación, etc. Da información completa y detallada sobre ${product.nombre}.`,
                customerName,
                [product],
                this.STATES.INTERESTED,
                recentHistory,
                this.inventory
              );
              
              // Limpiar preguntas pendientes ya que fueron respondidas
              await this.clearPendingQuestions(from);
              
            } else {
              // Sin preguntas pendientes, respuesta normal
              await this.sendProductWithImage(from, product, '', true);
              
              // Generar respuesta informativa (no de venta)
              response = await this.gemini.generateSalesResponse(
                `Cliente pregunta sobre ${product.nombre}: "${messageText}". Responde informativamente sobre características, beneficios y utilidad del producto. NO preguntes cantidad ni asumas que quiere comprar.`,
                customerName,
                products,
                this.STATES.INTERESTED,
                recentHistory,
                this.inventory
              );
            }
          } else {
            // Fallback si no se encuentra el producto
            response = await this.gemini.generateSalesResponse(
              `Cliente busca información sobre: ${mentionedProducts.map(p => p.name).join(', ')}. Mensaje: "${messageText}". Responde informativamente.`,
              customerName,
              products,
              this.STATES.INTERESTED,
              recentHistory,
              this.inventory
            )
          }
        } else {
          // Múltiples productos mencionados para información
          response = await this.gemini.generateSalesResponse(
            `Cliente busca información sobre múltiples productos: ${mentionedProducts.map(p => p.name).join(', ')}. Mensaje: "${messageText}". Responde informativamente.`,
            customerName,
            products,
            this.STATES.INTERESTED,
            recentHistory,
            this.inventory
          )
        }

        await this.sendMessage(from, response)

      } else {
        // Cliente quiere especificar para comprar (lógica original)
        if (mentionedProducts.length === 1) {
          // Un solo producto mencionado - mostrar con imagen y preguntar cantidad
          const productId = mentionedProducts[0].id
          const product = products.find(p => p.id === productId)

          if (product) {
            const askQuantityText = `¡Excelente elección! 😊 ¿Cuántas unidades de ${product.nombre} te gustaría?`
            await this.sendProductWithImage(from, product, askQuantityText)
            response = askQuantityText // Para el historial
          } else {
            // Fallback si no se encuentra el producto
            response = await this.gemini.generateSalesResponse(
              `Cliente interesado en: ${mentionedProducts.map(p => p.name).join(', ')}. Pregunta cantidad.`,
              customerName,
              products,
              this.STATES.INTERESTED,
              recentHistory,
              this.inventory
            )
            await this.sendMessage(from, response)
          }
        } else {
          // 📱 MÚLTIPLES PRODUCTOS MENCIONADOS - MOSTRAR INDIVIDUALMENTE COMO EN EL BACKUP
          console.log(`📱 Múltiples productos detectados: ${mentionedProducts.length} productos`)
          
          // 🔍 BUSCAR PRODUCTOS REALES EN INVENTARIO
          const realProducts = []
          for (const mentionedProduct of mentionedProducts) {
            const product = products.find(p => p.id === mentionedProduct.id)
            if (product) {
              realProducts.push(product)
            }
          }
          
          console.log(`🔍 Productos reales encontrados: ${realProducts.length}`)
          
          if (realProducts.length > 0) {
            // 🎯 MOSTRAR RESPUESTA INTRODUCTORIA
            const introResponse = `📱 ¡Excelente! Tenemos varios modelos disponibles. Te muestro las opciones:`
            await this.sendMessage(from, introResponse)
            this.addToHistory(from, 'assistant', introResponse)
            
            // 📱 MOSTRAR CADA PRODUCTO INDIVIDUALMENTE CON IMÁGENES
            for (let i = 0; i < realProducts.length; i++) {
              const product = realProducts[i]
              
              // Delay entre productos para mejor experiencia
              if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000))
                await this.sendTyping(from)
              }
              
              // Enviar producto con imagen y detalles
              const productMessage = `${i + 1}️⃣ *${product.nombre}*\n💰 Precio: S/ ${product.precio}\n📦 Stock: ${product.stock} disponibles${product.descripcion ? '\n📝 ' + product.descripcion : ''}`
              await this.sendProductWithImage(from, product, productMessage)
            }
            
            // 🎯 PREGUNTA FINAL
            await new Promise(resolve => setTimeout(resolve, 1000))
            const finalQuestion = `🙋‍♂️ ¿Cuál de estos modelos te interesa más? Puedes decirme el número o el nombre del modelo.`
            await this.sendMessage(from, finalQuestion)
            
            // 💾 GUARDAR PRODUCTOS MOSTRADOS EN EL CONTEXTO
            const conversationData = await this.getConversationData(from)
            this.setConversationState(from, this.STATES.INTERESTED, {
              ...conversationData,
              interested_products: realProducts.map(p => ({
                id: p.id,
                name: p.nombre,
                price: p.precio,
                description: p.descripcion,
                stock: p.stock
              })),
              displayed_products: realProducts.map((p, index) => ({
                id: p.id,
                name: p.nombre,
                price: p.precio,
                description: p.descripcion,
                stock: p.stock,
                position: index + 1,
                displayOrder: index,
                timestamp: Date.now()
              }))
            })
            
            response = finalQuestion // Para el historial
            
          } else {
            // Fallback si no se encuentran productos reales
            response = await this.gemini.generateSalesResponse(
              `Cliente interesado en: ${mentionedProducts.map(p => p.name).join(', ')}. No se encontraron productos en inventario.`,
              customerName,
              products,
              this.STATES.INTERESTED,
              recentHistory,
              this.inventory
            )
            await this.sendMessage(from, response)
          }
        }
      }
    } else {
      // 🚫 IMPORTANTE: NO hacer búsqueda semántica automática para saludos o mensajes simples
      // Solo hacer búsqueda si el mensaje indica interés real en productos
      const messageLC = messageText.toLowerCase().trim()
      const isSimpleGreeting = ['hola', 'hi', 'hello', 'buenas', 'buenos días', 'buenas tardes', 'buenas noches'].some(greeting => messageLC === greeting)
      
      if (isSimpleGreeting) {
        // Para saludos simples, solo responder amablemente
        response = await this.gemini.generateSalesResponse(
          `Cliente saluda: "${messageText}". Responde de manera amigable y pregunta en qué puedes ayudarlo.`,
          customerName,
          products,
          this.STATES.BROWSING,
          recentHistory,
          this.inventory
        )
        await this.sendMessage(from, response)
        this.addToHistory(from, 'assistant', response)
        return
      }
      
      // 🚫 CRÍTICO: NO hacer búsqueda semántica para preguntas sobre productos en contexto
      const conversationData = await this.getConversationData(from)
      const hasProductsInContext = conversationData.displayed_products && conversationData.displayed_products.length > 0
      
      // Si hay productos en contexto, NO buscar más productos - solo responder preguntas
      if (hasProductsInContext) {
        console.log(`🧠 Cliente pregunta sobre producto en contexto - NO buscar productos adicionales`)
        
        // Responder informativamente sin buscar productos adicionales
        response = await this.gemini.generateSalesResponse(
          `Cliente hace preguntas: "${messageText}" sobre productos ya mostrados. Responder informativamente sin mostrar productos adicionales.`,
          customerName,
          products,
          this.STATES.INTERESTED,
          recentHistory,
          this.inventory
        )
        await this.sendMessage(from, response)
        this.addToHistory(from, 'assistant', response)
        return
      }
      
      // Si NO hay productos en contexto Y hay intención de búsqueda, entonces sí buscar
      const hasProductIntent = messageLC.includes('producto') || messageLC.includes('celular') || messageLC.includes('telefono') || 
                              messageLC.includes('teléfono') || messageLC.includes('iphone') || messageLC.includes('samsung') || 
                              messageLC.includes('busco') || messageLC.includes('quiero ver') || messageLC.includes('necesito')
      
      if (hasProductIntent) {
        // 🎯 LÓGICA PARA BÚSQUEDA SEMÁNTICA CUANDO HAY INTERÉS REAL EN PRODUCTOS
        try {
          const searchResults = await this.semanticSearch.semanticSearch(messageText, 5)
          
          if (searchResults.length > 0) {
            const filteredProducts = searchResults.map(result => result.product)
            
            // Guardar productos mostrados en el contexto
            this.setConversationState(from, this.STATES.INTERESTED, {
              ...conversationData,
              displayed_products: filteredProducts.map((product, index) => ({
                id: product.id,
                name: product.nombre,
                price: product.precio,
                description: product.descripcion,
                position: index + 1,
                timestamp: Date.now()
              }))
            })

            // Mostrar productos encontrados
            await this.showFilteredProducts(from, filteredProducts, customerName, messageText)
          } else {
            // No se encontraron productos, usar respuesta tradicional
            response = await this.gemini.generateSalesResponse(
              `Cliente busca: "${messageText}". No se encontraron productos específicos.`,
              customerName,
              products,
              this.STATES.BROWSING,
              recentHistory,
              this.inventory,
              await this.getConversationData(from) || {}
            )
            await this.sendMessage(from, response)
            this.addToHistory(from, 'assistant', response)
          }
        } catch (error) {
          console.error('Error buscando productos:', error)
          
          // Fallback en caso de error
          response = await this.gemini.generateSalesResponse(
            `Cliente busca: "${messageText}". Ayúdalo a encontrar lo que necesita.`,
            customerName,
            products,
            this.STATES.BROWSING,
            recentHistory,
            this.inventory,
            await this.getConversationData(from) || {}
          )
          await this.sendMessage(from, response)
          this.addToHistory(from, 'assistant', response)
        }
      } else {
        // Para otros mensajes que no son productos, respuesta genérica
        response = await this.gemini.generateSalesResponse(
          `Cliente dijo "${messageText}" pero no especificó producto. Pide que sea más específico.`,
          customerName,
          products,
          this.STATES.BROWSING,
          recentHistory,
          this.inventory,
          await this.getConversationData(from) || {}
        )
        await this.sendMessage(from, response)
        this.addToHistory(from, 'assistant', response)
      }
    }
    
    // Solo agregar al historial si se generó una respuesta directa
    if (response) {
      this.addToHistory(from, 'assistant', response)
    }
  }

  async handleAskQuantity(from, intent, conversationData, customerName, recentHistory) {
    // 🎆 VERIFICAR SI SON PRODUCTOS VIP
    const hasVipProducts = intent.products_mentioned && intent.products_mentioned.some(p => p.isVip)
    
    let products
    if (hasVipProducts) {
      console.log(`🎆 handleAskQuantity: Usando productos VIP para respuesta`)
      products = intent.products_mentioned // Usar productos VIP directamente
      
      // 🎆 MENSAJE ESPECIALIZADO PARA PRODUCTOS VIP CON INFORMACIÓN COMPLETA
      const vipProduct = products[0] // Asumir que es un solo producto VIP
      let vipMessage = `¡Genial que te interese el ${vipProduct.name}! 🎆\n\n`
      
      // 💰 Información de precios VIP
      if (vipProduct.precio_original && vipProduct.precio_vip) {
        const descuento = Math.round(((vipProduct.precio_original - vipProduct.precio_vip) / vipProduct.precio_original) * 100)
        vipMessage += `💰 *Precio normal:* S/ ${vipProduct.precio_original}\n`
        vipMessage += `🌟 *Tu precio VIP:* S/ ${vipProduct.precio_vip} (${descuento}% descuento)\n\n`
      }
      
      // 📦 Información de stock VIP
      if (vipProduct.stock_disponible !== undefined && vipProduct.stock_disponible !== null) {
        vipMessage += `📦 *Stock disponible para esta oferta:* ${vipProduct.stock_disponible} unidades\n`
      }
      
      // 👤 Límites por cliente VIP
      if (vipProduct.limite_por_cliente !== undefined && vipProduct.limite_por_cliente !== null) {
        vipMessage += `👤 *Máximo por cliente VIP:* ${vipProduct.limite_por_cliente} unidades\n`
      }
      
      // ⏰ Vigencia de la oferta
      if (vipProduct.fecha_fin) {
        const fechaFin = new Date(vipProduct.fecha_fin)
        const hoy = new Date()
        const diasRestantes = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24))
        
        if (diasRestantes > 0) {
          vipMessage += `⏰ *Oferta válida por:* ${diasRestantes} días más\n`
        }
      }
      
      vipMessage += `\n🛍️ *¿Cuántas unidades quieres?*\n`
      vipMessage += `Responde con la cantidad que deseas (ejemplo: "2 unidades" o simplemente "2")`
      
      await this.sendMessage(from, vipMessage)
      this.addToHistory(from, 'assistant', vipMessage)
    } else {
      products = await this.inventory.getAllProducts() // Usar inventario normal
      
      const response = await this.gemini.generateSalesResponse(
        `Cliente especificó productos: ${intent.products_mentioned.map(p => p.name).join(', ')}. Pregunta cantidad específica.`,
        customerName,
        products,
        this.STATES.SPECIFYING,
        recentHistory,
        this.inventory,
        conversationData
      )
      await this.sendMessage(from, response)
      this.addToHistory(from, 'assistant', response)
    }
  }

  async handleAskConfirmation(from, intent, conversationData, customerName, overrideProducts = null) {
    const selectedProducts = overrideProducts || intent.products_mentioned
    const quantity = intent.quantity_mentioned || conversationData.quantity || 1

    if (selectedProducts.length > 0) {
      let productDetails = []

      // 🎆 DETECCIÓN MEJORADA: Verificar memoria de sesión para productos VIP primero
      let hasVipProducts = false
      
      try {
        const sessionMemory = await this.sessionMemory.getSessionMemory(from)
        if (sessionMemory && sessionMemory.displayed_products && sessionMemory.displayed_products.length > 0) {
          const vipProductsInMemory = sessionMemory.displayed_products.filter(p => p.isVip)
          
          if (vipProductsInMemory.length > 0) {
            console.log(`🎆 CONFIRMACIÓN VIP - Usando productos de memoria:`, vipProductsInMemory.map(p => p.name))
            hasVipProducts = true
            
            productDetails = vipProductsInMemory.map(vipProduct => ({
              id: vipProduct.vip_id || vipProduct.id,
              nombre: vipProduct.name,
              precio: vipProduct.price,
              precio_original: vipProduct.precio_original,
              precio_vip: vipProduct.precio_vip || vipProduct.price,
              categoria: 'VIP',
              cantidad: quantity,
              es_producto_vip: true
            }))
          }
        }
      } catch (error) {
        console.error('❌ Error consultando memoria de sesión:', error)
      }
      
      if (!hasVipProducts) {
        hasVipProducts = selectedProducts.some(sp => sp.es_producto_vip)
      }

      if (hasVipProducts) {
        console.log(`🎆 CONFIRMACIÓN VIP - Usando precios VIP directamente`)
        // Para productos VIP, usar la información directamente del contexto (solo si no se llenó desde memoria)
        if (productDetails.length === 0) {
          productDetails = selectedProducts.map(sp => ({
            id: sp.id,
            nombre: sp.name,
            precio: sp.price,
            precio_original: sp.precio_original,
            precio_vip: sp.precio_vip,
            categoria: sp.categoria || 'VIP',
            cantidad: quantity,
            es_producto_vip: true
          }))
        }
      } else {
        console.log(`📦 CONFIRMACIÓN NORMAL - Buscando en inventario`)
        // Para productos normales, buscar en inventario como antes
        const products = await this.inventory.getAllProducts()
        productDetails = selectedProducts.map(sp => {
          const product = products.find(p => p.id === sp.id || p.nombre.toLowerCase().includes(sp.name.toLowerCase()))
          return product ? {
            id: product.id,
            nombre: product.nombre,
            precio: product.precio,
            categoria: product.categoria,
            cantidad: quantity,
            es_producto_vip: false
          } : null
        }).filter(Boolean)
      }

      if (productDetails.length > 0) {
        const total = productDetails.reduce((sum, p) => sum + (p.precio * p.cantidad), 0)

        // 🌟 MENSAJE DIFERENCIADO PARA PRODUCTOS VIP
        let confirmationMessage = `¿Confirmas tu pedido? 📋\n\n`

        if (hasVipProducts) {
          // Mensaje especial para productos VIP con descuentos
          confirmationMessage += productDetails.map(p => {
            let productLine = `📦 ${p.cantidad}x ${p.nombre}`

            if (p.precio_original && p.precio_vip && p.precio_original !== p.precio_vip) {
              const descuento = Math.round(((p.precio_original - p.precio_vip) / p.precio_original) * 100)
              productLine += `\n   💰 Precio normal: S/ ${p.precio_original} c/u`
              productLine += `\n   🌟 Tu precio VIP: S/ ${p.precio_vip} c/u (${descuento}% descuento)`
              productLine += `\n   💸 Ahorras: S/ ${((p.precio_original - p.precio_vip) * p.cantidad).toFixed(2)}`
            } else {
              productLine += ` - S/ ${p.precio} c/u`
            }

            return productLine
          }).join('\n\n')
        } else {
          // Mensaje normal para productos regulares
          confirmationMessage += productDetails.map(p => `📦 ${p.cantidad}x ${p.nombre} - S/ ${p.precio} c/u`).join('\n')
        }

        confirmationMessage += `\n\n💵 Total: S/ ${total.toFixed(2)}\n\n`
        confirmationMessage += `Responde:\n`
        confirmationMessage += `• "SÍ CONFIRMO" para procesar tu pedido\n`
        confirmationMessage += `• "NO" para cancelar\n`
        confirmationMessage += `• "ESPECIALISTA" para atención personalizada telefónica 📞`

        await this.sendMessage(from, confirmationMessage)
        this.addToHistory(from, 'assistant', confirmationMessage)
        
        console.log(`✅ Confirmación enviada exitosamente para ${customerName}`)
      } else {
        console.error('❌ No se encontraron productos válidos para confirmar:', selectedProducts)
        await this.sendMessage(from, '😔 Lo siento, no pude encontrar los productos para confirmar. ¿Puedes especificar qué producto te interesa?')
      }
    } else {
      console.error('❌ No hay productos seleccionados para confirmar')
      await this.sendMessage(from, '😔 No hay productos seleccionados. ¿Qué producto te interesa comprar?')
    }
  }

  async handleProcessOrder(from, conversationData, customerName) {
    try {
      console.log(`🔍 DEBUG handleProcessOrder - conversationData:`, JSON.stringify(conversationData, null, 2))
      const pendingOrder = conversationData.pending_order
      console.log(`🔍 DEBUG pendingOrder:`, JSON.stringify(pendingOrder, null, 2))

      if (pendingOrder && pendingOrder.products && pendingOrder.products.length > 0) {
        // Verificar si ya se procesó este pedido (prevenir duplicados)
        if (conversationData.order_processed) {
          await this.sendMessage(from, 'Tu pedido ya fue procesado anteriormente. ¿En qué más puedo ayudarte? 😊')
          return
        }

        // 🌟 CRÍTICO: Detectar y manejar productos VIP correctamente
        let orderProducts = []
        
        // 🎆 DETECTAR SI HAY CONTEXTO VIP (productos VIP seleccionados) - MEJORADO
        let isVipOrder = conversationData.vip_order_context === true || 
                        pendingOrder.products.some(p => p.es_producto_vip || p.precio_vip !== undefined)
        
        // 🎆 VERIFICACIÓN ADICIONAL: Consultar memoria de sesión para productos VIP
        if (!isVipOrder) {
          try {
            const sessionMemory = await this.sessionMemory.getSessionMemory(from)
            if (sessionMemory && sessionMemory.displayed_products) {
              const hasVipInMemory = sessionMemory.displayed_products.some(p => p.isVip)
              if (hasVipInMemory) {
                isVipOrder = true
                console.log(`🎆 ORDEN VIP DETECTADA desde memoria de sesión`)
              }
            }
          } catch (error) {
            console.error('❌ Error verificando memoria de sesión para VIP:', error)
          }
        }
        
        if (isVipOrder) {
          // 🎆 PEDIDO VIP: Usar productos VIP del contexto con precios VIP correctos
          console.log(` YYS PROCESANDO PEDIDO VIP - Usando productos del contexto VIP`)
          console.log(` YYS Productos a procesar:`, pendingOrder.products)
          
          // 🎆 OBTENER INFORMACIÓN COMPLETA DE MEMORIA DE SESIÓN SI ES NECESARIO
          let productosVipCompletos = pendingOrder.products
          
          try {
            const sessionMemory = await this.sessionMemory.getSessionMemory(from)
            if (sessionMemory && sessionMemory.displayed_products) {
              const vipProductsInMemory = sessionMemory.displayed_products.filter(p => p.isVip)
              
              if (vipProductsInMemory.length > 0) {
                console.log(` YYS USANDO PRODUCTOS VIP COMPLETOS DE MEMORIA:`, vipProductsInMemory.map(p => p.name))
                productosVipCompletos = vipProductsInMemory.map(vipProduct => ({
                  id: vipProduct.vip_id || vipProduct.id,
                  name: vipProduct.name,
                  precio_original: vipProduct.precio_original,
                  precio_vip: vipProduct.precio_vip || vipProduct.price,
                  stock_disponible: vipProduct.stock_disponible,
                  limite_por_cliente: vipProduct.limite_por_cliente,
                  es_producto_vip: true
                }))
              }
            }
          } catch (error) {
            console.error('❌ Error obteniendo productos VIP de memoria:', error)
          }
          
          orderProducts = productosVipCompletos.map(sp => {
            // Para productos VIP, usar directamente la información del contexto
            if (sp.es_producto_vip || sp.precio_vip !== undefined) {
              const precioFinal = sp.precio_vip || sp.price || sp.precio
              console.log(` YYS Producto VIP: ${sp.name || sp.nombre} - Precio VIP: S/ ${precioFinal}`)
              return {
                id: sp.id,
                nombre: sp.name || sp.nombre,
                precio: precioFinal, // 🎯 USAR PRECIO VIP CORRECTO
                categoria: sp.categoria || 'VIP',
                cantidad: pendingOrder.quantity || 1,
                es_producto_vip: true
              }
            } else {
              // Producto normal, usar precio regular
              return {
                id: sp.id,
                nombre: sp.name || sp.nombre,
                precio: sp.price || sp.precio,
                categoria: sp.categoria || 'General',
                cantidad: pendingOrder.quantity || 1
              }
            }
          }).filter(Boolean)
        } else {
          // 🏪 PEDIDO NORMAL: Buscar productos en inventario normal
          console.log(`🏪 PROCESANDO PEDIDO NORMAL - Buscando en inventario`)
          
          const products = await this.inventory.getAllProducts()
          orderProducts = pendingOrder.products.map(sp => {
            const product = products.find(p => p.id === sp.id || p.nombre.toLowerCase().includes(sp.name.toLowerCase()))
            return product ? {
              id: product.id,
              nombre: product.nombre,
              precio: product.precio,
              categoria: product.categoria,
              cantidad: pendingOrder.quantity || 1
            } : null
          }).filter(Boolean)
        }

        if (orderProducts.length > 0) {
          const total = orderProducts.reduce((sum, p) => sum + (p.precio * p.cantidad), 0)

          const orderData = {
            cliente_whatsapp: from,
            cliente_nombre: customerName,
            productos: orderProducts,
            total: total,
            notas: `Pedido confirmado explícitamente por WhatsApp`
          }

          const newOrder = await this.orders.createOrder(orderData)
          console.log(`✅ Pedido creado: ${newOrder.id} para ${from}`)

          // Marcar como procesado para evitar duplicados
          this.setConversationState(from, this.STATES.PAYMENT, {
            ...conversationData,
            order_processed: true,
            order_id: newOrder.id
          })

          // 💾 Guardar info para proceso de imagen en Supabase (tabla orders)
          // Ya no usamos Maps - la info está en la tabla orders con el order.id

          // Obtener configuración de pago
          const config = await this.db.getAllConfig()

          // Generar mensaje de confirmación con datos de pago
          const confirmationMessage = await this.gemini.generateOrderConfirmation(
            orderProducts,
            total,
            customerName,
            config.yape_number,
            config.yape_account_holder,
            newOrder.id
          )

          await this.sendMessage(from, confirmationMessage)
          this.addToHistory(from, 'assistant', confirmationMessage)

          // NO limpiar estado aquí - mantener para el proceso de pago
        } else {
          console.log(`⚠️ DEBUG: No se encontraron productos válidos en pending_order`)
          await this.sendMessage(from, 'Hubo un problema con tu pedido. ¿Podrías especificar nuevamente qué producto deseas? 🤖')
        }
      } else {
        console.log(`⚠️ DEBUG: No hay pending_order válido. conversationData:`, JSON.stringify(conversationData, null, 2))
        await this.sendMessage(from, 'No encontré un pedido pendiente. ¿Qué producto te interesa? 🤖')
      }
    } catch (error) {
      console.error('Error procesando pedido:', error)
      await this.sendMessage(from, 'Hubo un problema procesando tu pedido. Por favor, intenta nuevamente. 🤖')
      // No limpiar estado en caso de error para permitir reintento
    }
  }

  async handleAskClarification(from, messageText, customerName, recentHistory) {
    const products = await this.inventory.getAllProducts()
    const response = await this.gemini.generateSalesResponse(
      `Cliente dijo "${messageText}" pero no es una confirmación clara. Pide confirmación explícita.`,
      customerName,
      products,
      this.STATES.CONFIRMING,
      recentHistory,
      this.inventory
    )
    await this.sendMessage(from, response)
    this.addToHistory(from, 'assistant', response)
  }

  // 🚫 NUEVO MÉTODO: Manejar cancelación de pedido
  async handleOrderCancellation(from, customerName) {
    try {
      console.log(`🚫 Procesando cancelación de pedido para: ${customerName}`)

      // 🧠🔄 VERIFICAR SI HAY CONTEXTO VIP ACTIVO
      const activeMemory = await this.dualMemory.getActiveMemory(from)
      
      if (activeMemory.type === 'vip' && activeMemory.status === 'active') {
        console.log(`🚫 CANCELACIÓN VIP DETECTADA - Iniciando intercambio a inventario`)
        
        // 🚫 MARCAR VIP COMO RECHAZADO
        await this.dualMemory.markVipAsRejected(from)
        
        // 📺 BUSCAR PRODUCTOS SIMILARES EN INVENTARIO NORMAL
        const vipProduct = activeMemory.memory.last_shown_product
        if (vipProduct && vipProduct.name) {
          const products = await this.inventory.getAllProducts({
            respectSpecificRequest: true,
            requestContext: `productos similares a ${vipProduct.name.replace(' - VIP', '')}`
          })
          
          // 🔍 FILTRAR PRODUCTOS SIMILARES
          const similarProducts = products.filter(p => {
            const vipBaseName = vipProduct.name.replace(' - VIP', '').toLowerCase()
            const productName = p.nombre.toLowerCase()
            
            // Búsqueda por modelo de iPhone
            if (vipBaseName.includes('iphone 14') && productName.includes('iphone 14')) return true
            if (vipBaseName.includes('iphone 15') && productName.includes('iphone 15')) return true
            if (vipBaseName.includes('iphone 16') && productName.includes('iphone 16')) return true
            
            // Búsqueda por marca
            if (vipBaseName.includes('samsung') && productName.includes('samsung')) return true
            if (vipBaseName.includes('xiaomi') && productName.includes('xiaomi')) return true
            
            return false
          }).slice(0, 3) // Máximo 3 productos alternativos
          
          if (similarProducts.length > 0) {
            console.log(`📺 ACTIVANDO MEMORIA INVENTARIO con ${similarProducts.length} productos similares`)
            
            // 📺 ACTIVAR MEMORIA DE INVENTARIO
            await this.dualMemory.activateInventoryMemory(from, similarProducts.map(p => ({
              id: p.id,
              name: p.nombre,
              price: p.precio,
              description: p.descripcion,
              stock: p.stock,
              categoria: p.categoria,
              isVip: false,
              fromVipRejection: true,
              timestamp: Date.now()
            })))
            
            // 📧 MENSAJE DE INTERCAMBIO INTELIGENTE
            const switchMessage = `Entiendo ${customerName} 😊 No hay problema con cancelar.\n\n` +
              `📱 Ya que te interesaba ese tipo de producto, aquí tienes algunas opciones del inventario regular que podrían gustarte:`
            
            await this.sendMessage(from, switchMessage)
            this.addToHistory(from, 'assistant', switchMessage)
            
            // 📦 ENVIAR PRODUCTOS DEL INVENTARIO
            for (let i = 0; i < Math.min(similarProducts.length, 2); i++) {
              if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 1500))
                await this.sendTyping(from)
              }
              
              await this.sendProductWithImage(from, similarProducts[i])
              
              // 📝 AGREGAR A MEMORIA INVENTARIO
              await this.dualMemory.addProductToMemory(from, 'inventory', {
                id: similarProducts[i].id,
                name: similarProducts[i].nombre,
                price: similarProducts[i].precio,
                description: similarProducts[i].descripcion
              })
            }
            
            const finalQuestion = `¿Alguna de estas opciones te llama la atención? 👀✨`
            await this.sendMessage(from, finalQuestion)
            this.addToHistory(from, 'assistant', finalQuestion)
            
            console.log(`✅ INTERCAMBIO VIP → INVENTARIO COMPLETADO para ${customerName}`)
            return // Terminar aquí con intercambio exitoso
          }
        }
      }
      
      // 💬 RESPUESTA NORMAL SI NO HAY VIP O NO HAY PRODUCTOS SIMILARES
      const response = await this.gemini.generateSalesResponse(
        `SITUACIÓN: El cliente ${customerName} acaba de cancelar su pedido diciendo "No".

        INSTRUCCIONES ESPECÍFICAS:
        - Responde de manera comprensiva y amigable
        - Reconoce que entiende que quiere cancelar el pedido
        - Ofrece ayuda para encontrar otros productos que puedan interesarle
        - Pregunta si hay algo más en lo que puedas ayudar
        - Mantén un tono positivo y servicial
        - NO insistas en el producto cancelado

        EJEMPLO DE RESPUESTA ESPERADA:
        "Entiendo ${customerName} que quieres cancelar el pedido. No hay problema 😊

        Quizás te pueda interesar otro tipo de producto. Si es así, házmelo saber... ¡estaré encantada de atenderte! 🌟

        ¿Hay algo más en lo que te pueda ayudar hoy?"`,
        customerName,
        await this.inventory.getAllProducts(),
        this.STATES.BROWSING,
        await this.getRecentHistory(from)
      )

      await this.sendMessage(from, response)
      this.addToHistory(from, 'assistant', response)

    } catch (error) {
      console.error('Error manejando cancelación:', error)

      // Mensaje de fallback mejorado
      await this.sendMessage(from,
        `Entiendo ${customerName} que quieres cancelar el pedido. No hay problema 😊\n\n` +
        `Quizás te pueda interesar otro tipo de producto. Si es así, házmelo saber... ¡estaré encantada de atenderte! 🌟\n\n` +
        `¿Hay algo más en lo que te pueda ayudar hoy?`
      )
      this.addToHistory(from, 'assistant', 'Pedido cancelado - mensaje de fallback')
    }
  }

  async handleFarewell(from, customerName) {
    // Obtener el nombre del negocio desde la configuración
    const businessName = await this.getBusinessName()

    const farewellMessage = `¡Eres bienvenido siempre en ${businessName}! 🏪✨ Las veces que quieras comprar algo estaré dispuesta a atenderte de inmediato. ¡Vuelve pronto ${customerName}, que tengas un bonito día! 😊🌟`

    await this.sendMessage(from, farewellMessage)
    this.addToHistory(from, 'assistant', farewellMessage)
  }

  async handleReturningCustomerGreeting(from, customerName, products) {
    try {
      // 🧹 LIMPIAR TRACKING DE CONTENIDO PARA NUEVA SESIÓN
      // Esto permite reenviar imágenes VIP y productos sin restricciones
      await this.clearAllContentTracking(from, 'returning_customer_greeting')
      console.log(`🧹 Tracking limpiado para sesión de cliente recurrente: ${customerName}`)
      
      // 👑 OBTENER INFORMACIÓN COMPLETA DEL CLIENTE VIP
      const clienteInfo = await this.getClienteRecurrenteInfo(from)
      
      if (clienteInfo) {
        // Cliente con historial - usar saludo personalizado VIP
        const saludoPersonalizado = await this.generarSaludoPersonalizado(clienteInfo)
        await this.sendMessage(from, saludoPersonalizado)
        this.addToHistory(from, 'assistant', saludoPersonalizado)
        
        // 🎆 PRODUCTOS ESPECÍFICOS PARA CATEGORÍA FAVORITA DE CLIENTES VIP
        if (clienteInfo.nivel_cliente === 'VIP' && clienteInfo.categoria_favorita && clienteInfo.categoria_favorita !== 'Sin categoría') {
          await new Promise(resolve => setTimeout(resolve, 2000))
          await this.sendTyping(from)
          
          // 🎆 PRIORIDAD 1: Verificar productos VIP activos PRIMERO con validación de vigencia
          try {
            const productosVipActivos = await this.vip.getProductosVipActivos()
            
            // Filtrar productos VIP vigentes de la categoría favorita
            const productosVipCategoria = productosVipActivos.filter(pv => {
              // Verificar vigencia con logs detallados
              if (pv.fecha_fin) {
                const fechaFin = new Date(pv.fecha_fin)
                const ahora = new Date()
                
                console.log(`🔍 PRIMERA VALIDACIÓN: ${pv.nombre}`)
                console.log(`   📅 Fecha fin: ${fechaFin.toISOString()}`)
                console.log(`   ⏰ Ahora: ${ahora.toISOString()}`)
                console.log(`   🔢 Diferencia (ms): ${fechaFin - ahora}`)
                
                if (ahora > fechaFin) {
                  console.log(`🚫 Producto VIP ${pv.nombre} expirado (fin: ${fechaFin})`)
                  return false // Expirado
                } else {
                  console.log(`✅ Producto VIP ${pv.nombre} VIGENTE en primera validación`)
                }
              }
              
              // Verificar stock
              if (pv.stock_disponible !== undefined && pv.stock_disponible <= 0) {
                console.log(`🚫 Producto VIP ${pv.nombre} sin stock disponible`)
                return false
              }
              
              // Verificar que esté activo
              if (pv.activo === false) {
                console.log(`🚫 Producto VIP ${pv.nombre} no activo`)
                return false
              }
              
              // Verificar categoría
              const coincideCategoria = pv.categoria && pv.categoria.toLowerCase().includes(clienteInfo.categoria_favorita.toLowerCase())
              
              if (coincideCategoria) {
                console.log(`🎆 Producto VIP vigente encontrado: ${pv.nombre} (categoría: ${pv.categoria})`)
              }
              
              return coincideCategoria
            })
            
            if (productosVipCategoria.length > 0) {
              const categoriaMessage = `🎆 Como eres nuestro cliente VIP y veo que te fascina ${clienteInfo.categoria_favorita}, aquí tienes ofertas EXCLUSIVAS vigentes de esa categoría:`
              await this.sendMessage(from, categoriaMessage)
              this.addToHistory(from, 'assistant', categoriaMessage)
              
              // Mostrar productos VIP con información completa y verificación de vigencia
              let productosEnviados = 0
              for (let i = 0; i < Math.min(productosVipCategoria.length, 2) && productosEnviados < 2; i++) {
                if (productosEnviados > 0) {
                  await new Promise(resolve => setTimeout(resolve, 1500))
                  await this.sendTyping(from)
                }
                
                const productoVip = productosVipCategoria[i]
                console.log(`🎆 Intentando enviar producto VIP: ${productoVip.nombre}`)
                
                const enviado = await this.enviarProductoVipCompleto(from, productoVip, 'Exclusivo para ti como cliente VIP')
                
                if (enviado) {
                  productosEnviados++
                  console.log(`🎆 Producto VIP enviado exitosamente: ${productoVip.nombre}`)
                  
                  // 🔄 SINCRONIZAR CONTEXTO - CRÍTICO PARA EVITAR CONFUSIÓN
                  try {
                    const syncResult = await this.contextSynchronizer.syncProductContext(from, {
                      id: productoVip.id,
                      name: productoVip.nombre,
                      price: productoVip.precio_vip || productoVip.precio,
                      description: productoVip.descripcion,
                      stock: productoVip.stock,
                      isVip: true
                    }, 'vip_displayed')
                    
                    if (syncResult.success) {
                      console.log(`🔄 Contexto VIP sincronizado: ${productoVip.nombre}`)
                    } else {
                      console.warn(`⚠️ Error sincronizando contexto VIP: ${syncResult.error}`)
                    }
                  } catch (syncError) {
                    console.error(`❌ Error crítico sincronizando contexto VIP:`, syncError)
                  }
                } else {
                  console.log(`🚫 Producto VIP no enviado (no vigente): ${productoVip.nombre}`)
                }
              }
              
              if (productosEnviados > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000))
                const preguntaFinal = `¿Alguna de estas ofertas EXCLUSIVAS te llama la atención? 👑`
                await this.sendMessage(from, preguntaFinal)
                this.addToHistory(from, 'assistant', preguntaFinal)
                return // Terminar aquí si se mostraron productos VIP vigentes
              } else {
                console.log(`🚫 No se enviaron productos VIP (todos expirados o sin stock)`)
                // 🛡️ FALLBACK: Si no hay productos VIP vigentes, mostrar productos regulares
                const productosRegularesFavoritos = await this.inventory.getProductsByCategory(clienteInfo.categoria_favorita)
                
                if (productosRegularesFavoritos.length > 0) {
                  const categoriaMessage = `Como eres nuestro cliente VIP, aquí tienes lo más exclusivo de ${clienteInfo.categoria_favorita}:`
                  await this.sendMessage(from, categoriaMessage)
                  this.addToHistory(from, 'assistant', categoriaMessage)
                  
                  // Mostrar hasta 2 productos de la categoría favorita
                  const topProductos = productosRegularesFavoritos.slice(0, 2)
                  for (let i = 0; i < topProductos.length; i++) {
                    if (i > 0) {
                      await new Promise(resolve => setTimeout(resolve, 1500))
                      await this.sendTyping(from)
                    }
                    
                    const product = topProductos[i]
                    const productMessage = `👑 VIP *${product.nombre}* - S/ ${product.precio}\n📱 ${product.categoria}\n📦 Stock: ${product.stock} disponibles\n🎆 Exclusivo para ti como cliente VIP`
                    await this.sendProductWithImage(from, product, productMessage)
                  }
                  
                  await new Promise(resolve => setTimeout(resolve, 1000))
                  const preguntaFinal = `¿Alguno de estos exclusivos te llama la atención? 👑`
                  await this.sendMessage(from, preguntaFinal)
                  this.addToHistory(from, 'assistant', preguntaFinal)
                  return
                }
              }
            } else {
              console.log(`🚫 No hay productos VIP vigentes para la categoría: ${clienteInfo.categoria_favorita}`)
              // Fallback manejado arriba
            }
          } catch (error) {
            console.error('Error obteniendo productos VIP vigentes:', error)
          }
          
          // 🔁 RETURN AQUÍ PARA EVITAR PRODUCTOS ADICIONALES DESPUÉS DEL VIP
          return // Terminar flujo VIP, no mostrar productos adicionales
        }
        
        // Para clientes frecuentes/recurrentes con categoría favorita
        if (clienteInfo.categoria_favorita && clienteInfo.categoria_favorita !== 'Sin categoría') {
          await new Promise(resolve => setTimeout(resolve, 2000))
          await this.sendTyping(from)
          
          const productosFavoritos = await this.inventory.getProductsByCategory(clienteInfo.categoria_favorita)
          
          if (productosFavoritos.length > 0) {
            const categoriaMessage = `Como veo que te gusta mucho ${clienteInfo.categoria_favorita}, aquí tienes lo más nuevo de esa categoría:`
            await this.sendMessage(from, categoriaMessage)
            this.addToHistory(from, 'assistant', categoriaMessage)
            
            // Mostrar hasta 2 productos de la categoría favorita
            const topProductos = productosFavoritos.slice(0, 2)
            for (let i = 0; i < topProductos.length; i++) {
              if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 1500))
                await this.sendTyping(from)
              }
              
              const product = topProductos[i]
              const productMessage = `🎯 *${product.nombre}* - S/ ${product.precio}\n📱 ${product.categoria}\n📦 Stock: ${product.stock} disponibles`
              await this.sendProductWithImage(from, product, productMessage)
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000))
            const preguntaFinal = `¿Alguno de estos te llama la atención o prefieres ver otras categorías? 😊`
            await this.sendMessage(from, preguntaFinal)
            this.addToHistory(from, 'assistant', preguntaFinal)
            return
          }
        }
      }
      
      // 📻 FALLBACK: Saludo estándar para cliente recurrente
      const businessName = await this.getBusinessName()
      const greetingMessage = `¡Hola de nuevo ${customerName}! 😊 ¡Qué bueno verte de nuevo en ${businessName}! 🌟\n\nVeo que ya tienes experiencia comprando con nosotros. ¿En qué puedo ayudarte hoy?`

      await this.sendMessage(from, greetingMessage)
      this.addToHistory(from, 'assistant', greetingMessage)

      // Mostrar productos destacados después de un breve delay
      const productosDestacados = await this.inventory.getDestacados()
      if (productosDestacados.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await this.sendTyping(from)

        const productMessage = `Aquí tienes nuestros productos más populares:\n\n${productosDestacados.map(p =>
          `${p.destacado ? '⭐ ' : ''}*${p.nombre}* - S/ ${p.precio}\n📱 ${p.categoria}`
        ).join('\n\n')}\n\n¿Te interesa alguno de estos o prefieres que te muestre algo específico? 🛍️`

        await this.sendMessage(from, productMessage)
        this.addToHistory(from, 'assistant', productMessage)
      }
      
    } catch (error) {
      console.error('Error en saludo de cliente recurrente:', error)
      
      // Fallback básico
      const businessName = await this.getBusinessName()
      const fallbackMessage = `¡Hola ${customerName}! 😊 Bienvenido de vuelta a ${businessName}. ¿En qué puedo ayudarte hoy?`
      await this.sendMessage(from, fallbackMessage)
      this.addToHistory(from, 'assistant', fallbackMessage)
    }
  }

  // 👑 OBTENER INFORMACIÓN COMPLETA DE CLIENTE RECURRENTE
  async getClienteRecurrenteInfo(phoneNumber) {
    try {
      if (!this.sales) return null
      return await this.sales.getClienteInfo(phoneNumber)
    } catch (error) {
      console.error('Error obteniendo info de cliente recurrente:', error)
      return null
    }
  }

  // 🎭 GENERAR SALUDO PERSONALIZADO PARA CLIENTE VIP CON CATEGORÍA FAVORITA
  async generarSaludoPersonalizado(clienteInfo) {
    const { cliente_nombre, nivel_cliente, total_pedidos, categoria_favorita } = clienteInfo
    const businessName = await this.getBusinessName()

    let emoji = '😊'
    let nivelTexto = ''
    let categoriaTexto = ''

    // 🎯 PERSONALIZACIÓN POR NIVEL VIP
    switch (nivel_cliente) {
      case 'VIP':
        emoji = '👑'
        nivelTexto = `¡Nuestro cliente VIP de ${businessName}!`
        break
      case 'Frecuente':
        emoji = '⭐'
        nivelTexto = `¡Uno de nuestros clientes frecuentes de ${businessName}!`
        break
      case 'Recurrente':
        emoji = '🎉'
        nivelTexto = `¡Qué gusto verte de nuevo en ${businessName}!`
        break
      default:
        emoji = '😊'
        nivelTexto = `¡Bienvenido de vuelta a ${businessName}!`
    }

    // 🎯 PERSONALIZACIÓN POR CATEGORÍA FAVORITA
    if (categoria_favorita && categoria_favorita !== 'Sin categoría') {
      if (nivel_cliente === 'VIP') {
        categoriaTexto = ` Veo que te encantan los productos de ${categoria_favorita}, así que tengo algunas sorpresas especiales para ti.`
      } else {
        categoriaTexto = ` y que te gusta mucho la categoría de ${categoria_favorita}`
      }
    }

    return `${emoji} ¡Hola ${cliente_nombre}! ${nivelTexto}

Es un placer tenerte aquí nuevamente. Veo que ya tienes ${total_pedidos} ${total_pedidos === 1 ? 'pedido' : 'pedidos'} con nosotros${categoriaTexto}.

¿En qué puedo ayudarte hoy? 🛍️`
  }

  async handleGeneralResponse(from, messageText, customerName, products, currentState, recentHistory) {
    const response = await this.gemini.generateSalesResponse(
      messageText,
      customerName,
      products,
      currentState,
      recentHistory,
      this.inventory,
      await this.getConversationData(from) || {}
    )
    await this.sendMessage(from, response)
    this.addToHistory(from, 'assistant', response)
  }

  async handleImageMessage(message, from) {
    try {
      // Obtener estado actual y datos de conversación
      const currentState = await this.getConversationState(from)
      const conversationData = await this.getConversationData(from)

      // 🚚 Verificar si está en estado AWAITING_SHIPPING
      if (currentState === this.STATES.AWAITING_SHIPPING) {
        // Verificar si ya tiene dirección de envío
        if (!conversationData.shipping_address || conversationData.shipping_address.trim() === '') {
          await this.sendMessage(from,
            `📍 Antes de procesar tu pago, necesito tu dirección de envío.\n\n` +
            `Por favor, envía tu dirección completa como mensaje de texto.\n\n` +
            `Ejemplo: "Av. Los Olivos 123, Dpto 4B, San Isidro, Lima - Frente al parque"`
          )
          return
        }
        // Si tiene dirección, cambiar a estado PAYMENT para procesar la imagen
        this.setConversationState(from, this.STATES.PAYMENT, conversationData)
      }

      // 💾 Verificar si hay un pedido pendiente desde Supabase (tabla orders)
      const pendingOrder = await this.getPendingOrderFromSupabase(from)
      if (!pendingOrder) {
        await this.sendMessage(from,
          'He recibido tu imagen, pero no tienes pedidos pendientes de pago. ¿En qué puedo ayudarte? 😊')
        return
      }

      // Descargar imagen
      console.log('📷 Descargando imagen de captura de pago...')
      const buffer = await this.downloadMediaMessage(message.message.imageMessage)
      const base64Image = buffer.toString('base64')

      console.log('🔍 Enviando imagen a Gemini Vision para validación...')

      // Obtener configuración del titular de cuenta Yape
      const config = await this.orders.db.getAllConfig()
      const accountHolder = config.yape_account_holder || 'Titular no configurado'
      const yapeNumber = config.yape_number || null

      // Validar pago con Gemini Vision
      const validation = await this.gemini.validateYapePayment(
        base64Image,
        pendingOrder.total,
        pendingOrder.customerName,
        accountHolder,
        yapeNumber
      )

      console.log('✅ Validación de Gemini completada:', validation)

      // 🔍 VALIDACIÓN CRÍTICA: Verificar número de operación duplicado
      if (validation.valido && validation.numero_operacion) {
        const existingOperation = await this.orders.db.checkOperationNumberExists(validation.numero_operacion)
        if (existingOperation) {
          console.log(`🚨 NÚMERO DE OPERACIÓN DUPLICADO: ${validation.numero_operacion}`)
          await this.sendMessage(from,
            `❌ *Número de operación duplicado*\n\n` +
            `El número de operación *${validation.numero_operacion}* ya fue utilizado anteriormente.\n\n` +
            `Por favor, envía un comprobante de pago diferente con un número de operación único. 🔄`
          )
          return
        }
      }

      // Post-procesamiento: Validación adicional con lógica mejorada
      const enhancedValidation = await this.enhancePaymentValidation(validation, accountHolder, yapeNumber)
      console.log('🔍 Validación mejorada:', enhancedValidation)

      if (enhancedValidation.valido && (enhancedValidation.confianza === 'alta' || enhancedValidation.confianza === 'media')) {
        if (enhancedValidation.monto_correcto) {
          // Pago exacto - procesar pedido completo
          await this.processValidPayment(from, pendingOrder, enhancedValidation)
        } else if (enhancedValidation.es_pago_parcial) {
          // Pago parcial - solicitar monto restante
          await this.processPartialPayment(from, pendingOrder, enhancedValidation)
        } else if (enhancedValidation.es_pago_excesivo) {
          // Pago excesivo - notificar diferencia
          await this.processExcessivePayment(from, pendingOrder, enhancedValidation)
        } else {
          // Monto incorrecto por otra razón
          await this.sendMessage(from,
            `❌ El monto no coincide. ${enhancedValidation.razon}\n\nPor favor, verifica el monto y envía una nueva captura. 😊`)
        }
      } else {
        // Pago inválido
        await this.sendMessage(from,
          `❌ No pude validar tu pago. ${enhancedValidation.razon}\n\nPor favor, envía una captura clara del pago por Yape. Si necesitas ayuda, escríbeme "ayuda". 😊`)
      }

    } catch (error) {
      console.error('Error procesando imagen:', error)

      // Determinar el tipo de error y enviar mensaje apropiado
      let errorMessage = 'Hubo un problema procesando tu imagen. ¿Podrías enviarla de nuevo? 📷'

      if (error.message.includes('Timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = '⏰ La descarga de tu imagen tardó demasiado. Por favor, verifica tu conexión a internet e intenta enviar la imagen nuevamente. 📷'
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
        errorMessage = '🌐 Hay problemas de conexión temporales. Por favor, espera unos momentos e intenta enviar la imagen nuevamente. 📷'
      } else if (error.message.includes('WhatsApp no está conectado')) {
        errorMessage = '📱 Hay un problema con la conexión de WhatsApp. Por favor, espera un momento mientras se restablece la conexión e intenta nuevamente. 📷'
      } else if (error.message.includes('después de') && error.message.includes('intentos')) {
        errorMessage = '❌ No pude descargar tu imagen después de varios intentos. Por favor, verifica que la imagen sea clara y tu conexión sea estable, luego intenta enviarla nuevamente. 📷'
      }

      await this.sendMessage(from, errorMessage)
    }
  }

  async processPartialPayment(from, pendingOrder, validation) {
    try {
      // Obtener datos de pago acumulado del estado de conversación
      const conversationData = this.getConversationData(from)
      const paymentData = conversationData.payment_data || {
        total_esperado: pendingOrder.total,
        total_recibido: 0,
        pagos_recibidos: []
      }

      // Extraer monto numérico del string "S/ XX"
      const montoRecibido = parseFloat(validation.monto_detectado.replace('S/', '').trim())

      // DEBUG: Logs para diagnosticar el problema
      console.log('🔍 DEBUG processPartialPayment - Datos iniciales:')
      console.log('  - validation.monto_detectado:', validation.monto_detectado)
      console.log('  - montoRecibido parseado:', montoRecibido)
      console.log('  - pendingOrder.total:', pendingOrder.total)
      console.log('  - paymentData antes:', JSON.stringify(paymentData, null, 2))

      // Agregar este pago al historial
      paymentData.pagos_recibidos.push({
        monto: montoRecibido,
        fecha: validation.fecha_pago,
        operacion: validation.numero_operacion,
        ultimos_digitos: validation.ultimos_digitos
      })

      // Actualizar total recibido
      paymentData.total_recibido += montoRecibido
      paymentData.faltante = paymentData.total_esperado - paymentData.total_recibido

      // DEBUG: Logs después de los cálculos
      console.log('🔍 DEBUG processPartialPayment - Después de cálculos:')
      console.log('  - paymentData.total_esperado:', paymentData.total_esperado)
      console.log('  - paymentData.total_recibido:', paymentData.total_recibido)
      console.log('  - paymentData.faltante:', paymentData.faltante)
      console.log('  - Condición (faltante <= 0):', paymentData.faltante <= 0)

      // Actualizar estado de conversación con datos de pago
      this.setConversationState(from, this.STATES.PAYMENT, {
        ...conversationData,
        payment_data: paymentData
      })

      if (paymentData.faltante <= 0) {
        // Pago completado con este pago parcial
        await this.processValidPayment(from, pendingOrder, validation)
      } else {
        // Aún falta dinero - solicitar el resto
        const mensaje = `¡Gracias! Recibí tu pago de ${validation.monto_detectado} para tu pedido de ${pendingOrder.productos.map(p => p.nombre).join(', ')}.

💰 **Total del pedido**: S/ ${paymentData.total_esperado}
✅ **Total recibido**: S/ ${paymentData.total_recibido}
⏳ **Falta**: S/ ${paymentData.faltante}

Por favor envía el pago del monto restante (S/ ${paymentData.faltante}) para completar tu pedido. 😊

📱 Número Yape: ${await this.getYapeNumber()}
👤 Titular: ${await this.getYapeAccountHolder()}`

        await this.sendMessage(from, mensaje)
        this.addToHistory(from, 'assistant', mensaje)
      }

    } catch (error) {
      console.error('Error procesando pago parcial:', error)
      await this.sendMessage(from, 'Hubo un problema procesando tu pago parcial. ¿Podrías intentar de nuevo? 😊')
    }
  }

  async processExcessivePayment(from, pendingOrder, validation) {
    try {
      const diferencia = validation.diferencia_monto
      const mensaje = `¡Gracias por tu pago de ${validation.monto_detectado}!

💰 **Total del pedido**: S/ ${pendingOrder.total}
✅ **Recibido**: ${validation.monto_detectado}
💸 **Diferencia**: S/ ${diferencia} de más

Tu pedido está confirmado. La diferencia de S/ ${diferencia} será considerada como propina o puedes solicitar la devolución. 😊`

      await this.sendMessage(from, mensaje)
      this.addToHistory(from, 'assistant', mensaje)

      // Procesar como pago válido
      await this.processValidPayment(from, pendingOrder, validation)

    } catch (error) {
      console.error('Error procesando pago excesivo:', error)
      await this.sendMessage(from, 'Hubo un problema procesando tu pago. ¿Podrías intentar de nuevo? 😊')
    }
  }

  async getYapeNumber() {
    try {
      const config = await this.db.getAllConfig()
      return config.yape_number || 'No configurado'
    } catch (error) {
      return 'No disponible'
    }
  }

  async getYapeAccountHolder() {
    try {
      const config = await this.db.getAllConfig()
      return config.yape_account_holder || 'No configurado'
    } catch (error) {
      return 'No disponible'
    }
  }

  // Función para validar nombres considerando el formato limitado de Yape
  validateYapeName(detectedName, configuredName) {
    if (!detectedName || !configuredName) {
      return { isValid: false, reason: 'Nombre detectado o configurado faltante' }
    }

    // Normalizar nombres (quitar acentos, convertir a minúsculas)
    const normalize = (str) => str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z\s]/g, '')
      .trim()

    const detectedNormalized = normalize(detectedName)
    const configuredNormalized = normalize(configuredName)

    // Si son exactamente iguales, es válido
    if (detectedNormalized === configuredNormalized) {
      return { isValid: true, reason: 'Nombres coinciden exactamente' }
    }

      // Dividir nombres en partes
    const detectedParts = detectedNormalized.split(/\s+/).filter(part => part.length > 0)
    const configuredParts = configuredNormalized.split(/\s+/).filter(part => part.length > 0)

    if (detectedParts.length < 1 || configuredParts.length < 1) {
      return { isValid: false, reason: 'Formato de nombre insuficiente para validación' }
    }

    // Caso especial: solo un nombre detectado (ej: "Ana")
    if (detectedParts.length === 1) {
      const detectedFirstName = detectedParts[0]
      const configuredFirstName = configuredParts[0]

      if (detectedFirstName === configuredFirstName) {
        return {
          isValid: true,
          reason: `Primer nombre "${configuredFirstName}" coincide (formato Yape simplificado)`
        }
      } else {
        return {
          isValid: false,
          reason: `Primer nombre no coincide. Detectado: "${detectedFirstName}", Esperado: "${configuredFirstName}"`
        }
      }
    }

    if (configuredParts.length < 2) {
      return { isValid: false, reason: 'Nombre configurado debe tener al menos nombre y apellido' }
    }

    // Extraer componentes del nombre configurado
    const [primerNombre, segundoNombre, primerApellido, segundoApellido] = configuredParts

    // Extraer componentes del nombre detectado (formato Yape)
    const detectedFirstName = detectedParts[0]
    let detectedFirstSurname = null
    let detectedSecondNameInitial = null
    let detectedSecondSurnameInitial = null

    // Buscar iniciales y apellidos en el nombre detectado
    for (let i = 1; i < detectedParts.length; i++) {
      const part = detectedParts[i]

      if (part.length === 1) {
        // Es una inicial
        if (!detectedSecondNameInitial && segundoNombre && part === segundoNombre.charAt(0)) {
          detectedSecondNameInitial = part
        } else if (!detectedSecondSurnameInitial && segundoApellido && part === segundoApellido.charAt(0)) {
          detectedSecondSurnameInitial = part
        }
      } else {
        // Es un nombre/apellido completo - tomar el primer apellido completo encontrado
        if (!detectedFirstSurname) {
          detectedFirstSurname = part
        }
      }
    }

    // Validar componentes críticos (primer nombre y primer apellido)
    const firstNameMatches = detectedFirstName === primerNombre
    const firstSurnameMatches = detectedFirstSurname === primerApellido

    if (firstNameMatches && firstSurnameMatches) {
      return {
        isValid: true,
        reason: `Primer nombre "${primerNombre}" y primer apellido "${primerApellido}" coinciden (formato Yape)`
      }
    }

    // Si solo coincide el primer nombre pero hay apellidos detectados que no coinciden, es inválido
    if (firstNameMatches && detectedFirstSurname && !firstSurnameMatches) {
      return {
        isValid: false,
        reason: `Primer nombre coincide pero apellido no. Detectado: "${detectedFirstSurname}", Esperado: "${primerApellido}"`
      }
    }

    // Si solo coincide el primer nombre y no hay apellido visible, es parcialmente válido
    if (firstNameMatches && !detectedFirstSurname) {
      return {
        isValid: true,
        reason: `Primer nombre "${primerNombre}" coincide, apellido no visible en formato Yape`
      }
    }

    return {
      isValid: false,
      reason: `Primer nombre o apellido no coinciden. Detectado: "${detectedName}", Configurado: "${configuredName}"`
    }
  }

  // Función para mejorar la validación de pagos con lógica adicional
  async enhancePaymentValidation(geminiValidation, configuredAccountHolder, configuredYapeNumber) {
    try {
      // Crear copia de la validación original
      const enhanced = { ...geminiValidation }

      // Validar nombre con lógica mejorada
      if (geminiValidation.titular_detectado && configuredAccountHolder) {
        const nameValidation = this.validateYapeName(
          geminiValidation.titular_detectado,
          configuredAccountHolder
        )

        // Actualizar titular_correcto basado en nuestra lógica mejorada
        enhanced.titular_correcto = nameValidation.isValid

        // Agregar información adicional a la razón
        if (nameValidation.isValid && !geminiValidation.titular_correcto) {
          enhanced.razon = `${geminiValidation.razon} | ✅ Validación mejorada de nombre: ${nameValidation.reason}`
        } else if (!nameValidation.isValid && geminiValidation.titular_correcto) {
          enhanced.razon = `${geminiValidation.razon} | ⚠️ Validación mejorada de nombre: ${nameValidation.reason}`
        }
      }

      // Validar últimos 3 dígitos con lógica mejorada
      if (configuredYapeNumber && geminiValidation.ultimos_digitos) {
        const expectedLastDigits = configuredYapeNumber.slice(-3)
        const detectedLastDigits = geminiValidation.ultimos_digitos

        const digitsMatch = expectedLastDigits === detectedLastDigits
        enhanced.ultimos_digitos_correctos = digitsMatch

        // Agregar información sobre los dígitos a la razón
        if (!digitsMatch) {
          const digitInfo = `⚠️ Últimos 3 dígitos no coinciden: esperado "${expectedLastDigits}", detectado "${detectedLastDigits}"`
          enhanced.razon = enhanced.razon ? `${enhanced.razon} | ${digitInfo}` : digitInfo

          // Si los dígitos no coinciden, marcar como inválido
          enhanced.valido = false
          enhanced.confianza = 'baja'
        } else {
          const digitInfo = `✅ Últimos 3 dígitos coinciden: ${expectedLastDigits}`
          enhanced.razon = enhanced.razon ? `${enhanced.razon} | ${digitInfo}` : digitInfo
        }
      }

      // Validación final: debe tener nombre correcto Y dígitos correctos para ser completamente válido
      if (enhanced.valido) {
        const nameOk = enhanced.titular_correcto
        const digitsOk = enhanced.ultimos_digitos_correctos !== false // true o undefined (si no se validó)

        if (!nameOk || !digitsOk) {
          enhanced.valido = false
          enhanced.confianza = 'baja'

          const issues = []
          if (!nameOk) issues.push('titular no coincide')
          if (!digitsOk) issues.push('últimos 3 dígitos no coinciden')

          enhanced.razon = `${enhanced.razon} | ❌ Validación fallida: ${issues.join(', ')}`
        }
      }

      return enhanced

    } catch (error) {
      console.error('Error en validación mejorada:', error)
      // En caso de error, devolver la validación original
      return geminiValidation
    }
  }

  async createPendingOrder(from, orderData, customerName) {
    try {
      // Validar stock
      const stockErrors = await this.orders.validateOrderStock(orderData.productos, this.inventory)

      if (stockErrors.length > 0) {
        await this.sendMessage(from,
          `❌ Lo siento, hay problemas con el stock:\n\n${stockErrors.join('\n')}\n\n¿Te gustaría modificar tu pedido? 😊`)
        return
      }

      // Crear pedido en base de datos
      const order = await this.orders.createOrder({
        cliente_whatsapp: from,
        cliente_nombre: customerName,
        productos: orderData.productos,
        total: orderData.total,
        notas: 'Pedido creado desde WhatsApp'
      })

      // 💾 Ya no guardamos en Maps - la info está en tabla orders de Supabase

      // Obtener configuración de pago
      const config = await this.orders.db.getAllConfig()
      const yapeNumber = config.yape_number || '987654321'
      const accountHolder = config.yape_account_holder || 'Titular no configurado'

      // Generar mensaje de confirmación
      const confirmationMessage = await this.gemini.generateOrderConfirmation(
        orderData.productos,
        orderData.total,
        customerName,
        yapeNumber,
        accountHolder
      )

      await this.sendMessage(from, confirmationMessage)

      // Notificar al dashboard
      this.io.emit('orders-updated')

    } catch (error) {
      console.error('Error creando pedido pendiente:', error)
      await this.sendMessage(from,
        'Hubo un problema procesando tu pedido. ¿Podrías intentar de nuevo? 😊')
    }
  }

  async processValidPayment(from, pendingOrder, validation) {
    try {
      // Guardar información del comprobante Yape
      await this.orders.db.updateYapePaymentInfo(pendingOrder.orderId, {
        numero_operacion: validation.numero_operacion,
        fecha_pago: validation.fecha_pago,
        ultimos_digitos: validation.ultimos_digitos,
        titular_detectado: validation.titular_detectado
      })

      // 🔍 VERIFICAR SI LA VALIDACIÓN MANUAL ESTÁ HABILITADA
      const config = await this.orders.db.getAllConfig()
      const paymentValidationEnabled = config.payment_validation_enabled === 'true'
      const validatorPhone = config.payment_validator_phone
      const validatorName = config.payment_validator_name

      if (paymentValidationEnabled && validatorPhone && validatorPhone.trim() !== '') {
        // 🎯 VALIDACIÓN MANUAL HABILITADA - Cambiar a "pendiente_validacion"
        console.log('🔒 Validación manual habilitada - enviando a pendiente_validacion')
        
        // Actualizar estado a pendiente_validacion (NO procesar pago aún)
        const updatedOrder = await this.orders.updateOrderStatus(
          pendingOrder.orderId, 
          'pendiente_validacion', 
          'Comprobante recibido, esperando validación manual'
        )

        // Enviar notificación al cliente
        await this.sendMessage(from,
          `✅ ¡Hemos recibido tu comprobante de pago!\n\n` +
          `📋 Tu pedido #${updatedOrder.id} está siendo procesado.\n` +
          `💳 Operación: ${validation.numero_operacion}\n` +
          `📅 Fecha: ${validation.fecha_pago}\n\n` +
          `🔍 Estamos validando tu pago y te notificaremos el resultado pronto.\n` +
          `¡Gracias por tu compra! 😊`
        )

        // 📱 ENVIAR NOTIFICACIÓN AL VALIDADOR
        await this.sendPaymentValidationNotification(
          validatorPhone, 
          validatorName, 
          pendingOrder, 
          validation, 
          updatedOrder
        )

      } else {
        // 🚀 VALIDACIÓN AUTOMÁTICA (comportamiento original) - Cambiar directamente a "pagado"
        console.log('🔓 Validación automática - procesando pago directamente')
        
        const updatedOrder = await this.orders.processOrderPayment(
          pendingOrder.orderId,
          this.inventory,
          this.googleDrive
        )

        // Enviar confirmación tradicional
        await this.sendMessage(from,
          `✅ ¡Pago confirmado!\n\nTu pedido #${updatedOrder.id} ha sido procesado exitosamente.\n💰 Monto: ${validation.monto_detectado}\n🔢 Operación: ${validation.numero_operacion}\n📅 Fecha: ${validation.fecha_pago}\n\nTe notificaremos cuando esté listo para envío. ¡Gracias por tu compra! 🎉`)
      }

      // 💾 Ya no necesitamos eliminar de Maps - info manejada por Supabase
      this.setConversationState(from, this.STATES.BROWSING, {
        last_completed_order: pendingOrder.orderId,
        order_completed_at: new Date().toISOString()
      })

      // Notificar al dashboard
      this.io.emit('orders-updated')
      this.io.emit('inventory-updated')

    } catch (error) {
      console.error('Error procesando pago válido:', error)
      await this.sendMessage(from,
        'Tu pago es válido, pero hubo un problema procesando el pedido. Nos pondremos en contacto contigo pronto. 😊')
    }
  }

  // 📱 NUEVO MÉTODO: Enviar notificación de validación al validador configurado
  async sendPaymentValidationNotification(validatorPhone, validatorName, pendingOrder, validation, order) {
    try {
      console.log(`📱 Enviando notificación de validación a ${validatorName} (${validatorPhone})`)
      
      // Formatear número de teléfono para WhatsApp (asegurar formato con @s.whatsapp.net)
      let formattedPhone = validatorPhone.replace(/\D/g, '') // Quitar caracteres no numéricos
      if (!formattedPhone.startsWith('51') && formattedPhone.length === 9) {
        formattedPhone = '51' + formattedPhone // Agregar código de país Perú
      }
      const validatorJid = formattedPhone + '@s.whatsapp.net'
      
      // Crear mensaje detallado para el validador
      const customerPhone = pendingOrder.customerName ? 
        `${pendingOrder.customerName} (${order.cliente_whatsapp.replace('@s.whatsapp.net', '')})` : 
        order.cliente_whatsapp.replace('@s.whatsapp.net', '')
      
      const productos = pendingOrder.productos.map(p => `• ${p.cantidad}x ${p.nombre} - S/ ${p.precio}`).join('\n')
      
      const validationMessage = `🔒 **VALIDACIÓN DE PAGO REQUERIDA** 🔒\n\n` +
        `📋 **Pedido #${order.id}**\n` +
        `👤 **Cliente:** ${customerPhone}\n\n` +
        `🛍️ **Productos:**\n${productos}\n\n` +
        `💰 **Total:** S/ ${order.total.toFixed(2)}\n\n` +
        `📱 **DATOS DEL COMPROBANTE YAPE:**\n` +
        `🔢 Operación: ${validation.numero_operacion}\n` +
        `📅 Fecha: ${validation.fecha_pago}\n` +
        `💳 Monto: ${validation.monto_detectado}\n` +
        `👤 Titular: ${validation.titular_detectado || 'No detectado'}\n\n` +
        `ℹ️ **INSTRUCCIONES:**\n` +
        `Responde con uno de estos mensajes exactos:\n\n` +
        `✅ **"VALIDAR ${order.id}"** - Para aprobar el pago\n` +
        `❌ **"ANULAR ${order.id}"** - Para rechazar el pago\n\n` +
        `⚠️ Verifica que el monto y los datos coincidan antes de validar.`
      
      // Enviar mensaje al validador
      await this.sock.sendMessage(validatorJid, { text: validationMessage })
      
      console.log(`✅ Notificación de validación enviada exitosamente a ${validatorName}`)
      
      // Registrar en historial (opcional)
      await this.logMessage(validatorJid, validationMessage, 'enviado')
      
    } catch (error) {
      console.error('❌ Error enviando notificación de validación:', error)
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  // 🔍 VERIFICAR SI EL REMITENTE ES EL VALIDADOR CONFIGURADO
  async isPaymentValidator(from) {
    try {
      // ✅ Verificación de seguridad: Solo si orders está inicializado
      if (!this.orders || !this.orders.db) {
        console.log('⚠️ No se puede verificar validador de pagos: orders no inicializado (normal en tests)');
        return false;
      }
      
      const config = await this.orders.db.getAllConfig()
      const validatorPhone = config.payment_validator_phone
      
      if (!validatorPhone || validatorPhone.trim() === '') {
        return false
      }
      
      // Normalizar números para comparación
      let configuredNumber = validatorPhone.replace(/\D/g, '')
      if (!configuredNumber.startsWith('51') && configuredNumber.length === 9) {
        configuredNumber = '51' + configuredNumber
      }
      
      const fromNumber = from.replace('@s.whatsapp.net', '').replace(/\D/g, '')
      
      const isValidator = configuredNumber === fromNumber
      if (isValidator) {
        console.log(`🔒 Mensaje del validador de pagos detectado: ${from}`)
      }
      
      return isValidator
      
    } catch (error) {
      console.error('❌ Error verificando validador de pagos:', error)
      return false
    }
  }

  // 🎩 PROCESAR COMANDOS DE VALIDACIÓN DE PAGO
  async processValidationCommand(from, messageText) {
    try {
      const trimmedMessage = messageText.trim().toUpperCase()
      
      // Detectar comandos VALIDAR o ANULAR con número de pedido
      const validateMatch = trimmedMessage.match(/^VALIDAR\s+(\d+)$/)
      const rejectMatch = trimmedMessage.match(/^ANULAR\s+(\d+)$/)
      
      if (validateMatch) {
        const orderId = parseInt(validateMatch[1])
        await this.processPaymentValidation(from, orderId, true)
        return true
      }
      
      if (rejectMatch) {
        const orderId = parseInt(rejectMatch[1])
        await this.processPaymentValidation(from, orderId, false)
        return true
      }
      
      // Si el mensaje no coincide con comandos de validación, permitir procesamiento normal
      return false
      
    } catch (error) {
      console.error('❌ Error procesando comando de validación:', error)
      await this.sendMessage(from, 
        '❌ Hubo un error procesando tu comando. Por favor, inténtalo nuevamente.'
      )
      return true // Marcar como procesado para evitar procesamiento adicional
    }
  }

  // 📝 PROCESAR VALIDACIÓN O RECHAZO DE PAGO
  async processPaymentValidation(validatorJid, orderId, isApproved) {
    try {
      console.log(`🔄 Procesando validación de pago - Pedido: ${orderId}, Aprobado: ${isApproved}`)
      
      // Obtener el pedido
      const order = await this.orders.getOrderById(orderId)
      if (!order) {
        await this.sendMessage(validatorJid, `❌ No se encontró el pedido #${orderId}.`)
        return
      }
      
      // Verificar que el pedido esté en estado pendiente_validacion
      if (order.estado !== 'pendiente_validacion') {
        await this.sendMessage(validatorJid, 
          `⚠️ El pedido #${orderId} no está esperando validación. Estado actual: ${order.estado}`
        )
        return
      }
      
      if (isApproved) {
        // ✅ VALIDAR PAGO - Cambiar a "pagado" y procesar
        console.log(`✅ Validando pago para pedido ${orderId}`)
        
        // Procesar pago completo (reducir stock, etc.)
        const updatedOrder = await this.orders.processOrderPayment(
          orderId,
          this.inventory,
          this.googleDrive
        )
        
        // Notificar al validador
        await this.sendMessage(validatorJid, 
          `✅ **PAGO VALIDADO EXITOSAMENTE**\n\n` +
          `📋 Pedido #${orderId}\n` +
          `👤 Cliente: ${order.cliente_nombre}\n` +
          `💰 Total: S/ ${order.total.toFixed(2)}\n\n` +
          `El pedido ahora está marcado como "Pagado" y el stock ha sido actualizado.`
        )
        
        // Notificar al cliente
        await this.notifyCustomerPaymentResult(order.cliente_whatsapp, orderId, true)
        
      } else {
        // ❌ ANULAR PAGO - Cambiar a "cancelado"
        console.log(`❌ Anulando pago para pedido ${orderId}`)
        
        // Cambiar estado a cancelado
        const updatedOrder = await this.orders.updateOrderStatus(
          orderId, 
          'cancelado', 
          'Pago anulado por validador'
        )
        
        // Notificar al validador
        await this.sendMessage(validatorJid, 
          `❌ **PAGO ANULADO**\n\n` +
          `📋 Pedido #${orderId}\n` +
          `👤 Cliente: ${order.cliente_nombre}\n` +
          `💰 Total: S/ ${order.total.toFixed(2)}\n\n` +
          `El pedido ha sido marcado como "Cancelado".`
        )
        
        // Notificar al cliente
        await this.notifyCustomerPaymentResult(order.cliente_whatsapp, orderId, false)
      }
      
      // Notificar dashboard
      this.io.emit('orders-updated')
      if (isApproved) {
        this.io.emit('inventory-updated')
      }
      
    } catch (error) {
      console.error(`❌ Error procesando validación de pago:`, error)
      await this.sendMessage(validatorJid, 
        `❌ Hubo un error procesando la validación del pedido #${orderId}. Por favor, inténtalo nuevamente.`
      )
    }
  }

  // 📩 NOTIFICAR AL CLIENTE EL RESULTADO DE LA VALIDACIÓN
  async notifyCustomerPaymentResult(customerJid, orderId, isApproved) {
    try {
      console.log(`📩 Notificando resultado de validación al cliente - Pedido: ${orderId}, Aprobado: ${isApproved}`)
      
      if (isApproved) {
        // ✅ PAGO APROBADO
        const approvalMessage = `✅ ¡EXCELENTES NOTICIAS! 🎉\n\n` +
          `Tu pago para el pedido #${orderId} ha sido **VALIDADO EXITOSAMENTE**.\n\n` +
          `🚀 Tu pedido ya está siendo procesado\n` +
          `💰 Estado: **PAGADO**\n` +
          `📦 Te notificaremos cuando esté listo para envío\n\n` +
          `¡Gracias por tu compra y por tu paciencia! 😊🙏`
        
        await this.sendMessage(customerJid, approvalMessage)
        
      } else {
        // ❌ PAGO RECHAZADO
        const rejectionMessage = `⚠️ **IMPORTANTE - PROBLEMA CON TU PAGO** ⚠️\n\n` +
          `Lamentablemente, tu pago para el pedido #${orderId} **NO PUDO SER VALIDADO**.\n\n` +
          `🔍 **Posibles causas:**\n` +
          `• El comprobante no es claro\n` +
          `• Los datos no coinciden con nuestros registros\n` +
          `• El monto es incorrecto\n` +
          `• El pago fue a una cuenta incorrecta\n\n` +
          `📋 **Tu pedido #${orderId} ha sido CANCELADO**\n\n` +
          `🔄 **¿Qué puedes hacer?**\n` +
          `• Verificar que el pago se haya realizado correctamente\n` +
          `• Enviar un nuevo comprobante más claro\n` +
          `• Contactarnos si crees que hay un error\n\n` +
          `😊 Si deseas realizar el pedido nuevamente, con gusto te ayudamos.\n\n` +
          `¡Disculpa las molestias!`
        
        await this.sendMessage(customerJid, rejectionMessage)
      }
      
    } catch (error) {
      console.error(`❌ Error notificando resultado al cliente:`, error)
      // Enviar mensaje genérico en caso de error
      try {
        const fallbackMessage = isApproved ? 
          `✅ Tu pago del pedido #${orderId} ha sido validado exitosamente. ¡Gracias!` :
          `⚠️ Tu pago del pedido #${orderId} no pudo ser validado. Por favor contáctanos.`
        
        await this.sendMessage(customerJid, fallbackMessage)
      } catch (fallbackError) {
        console.error(`❌ Error enviando mensaje de fallback:`, fallbackError)
      }
    }
  }

  async sendMessage(to, text) {
    if (!this.isConnected || !this.sock) {
      throw new Error('WhatsApp no está conectado')
    }

    try {
      // Aplicar configuraciones de tiempo de respuesta
      await this.applyResponseTiming(to)

      await this.sock.sendMessage(to, { text })
      console.log(`📤 Mensaje enviado a ${to}`)
    } catch (error) {
      console.error('Error enviando mensaje:', error)
      throw error
    }
  }

  async sendImageMessage(to, imageUrl, caption = '') {
    if (!this.isConnected || !this.sock) {
      throw new Error('WhatsApp no está conectado')
    }

    try {
      // 🛡️ CONTROL DE SPAM DE IMÁGENES - Verificar si ya se envió esta imagen
      if (await this.hasImageBeenSent(to, imageUrl)) {
        console.log(`🚫 Imagen ya enviada anteriormente a ${to}, enviando solo caption...`)
        if (caption) {
          await this.sendMessage(to, caption)
        }
        return
      }

      // Aplicar configuraciones de tiempo de respuesta
      await this.applyResponseTiming(to)

      // Enviar imagen desde URL
      await this.sock.sendMessage(to, {
        image: { url: imageUrl },
        caption: caption
      })
      
      // 🛡️ MARCAR IMAGEN COMO ENVIADA
      await this.markImageAsSent(to, imageUrl)
      
      console.log(`📷 Imagen enviada a ${to} desde URL: ${imageUrl}`)
    } catch (error) {
      console.error('Error enviando imagen:', error)
      // Si falla el envío de imagen, enviar solo el texto
      await this.sendMessage(to, caption || 'No pude enviar la imagen, pero aquí tienes la información del producto.')
    }
  }

  async sendProductWithImage(to, product, additionalText = '', skipResponseIfAlreadySent = false) {
    if (!this.isConnected || !this.sock) {
      throw new Error('WhatsApp no está conectado')
    }

    try {
      // 🧠 GUARDAR PRODUCTO EN MEMORIA CONVERSACIONAL
      const currentState = await this.getConversationState(to)
      const conversationData = await this.getConversationData(to)
      
      await this.productMemory.setCurrentProduct(to, product, {
        state: currentState,
        lastAction: 'product_shown',
        lastQuestion: additionalText || null,
        clientType: conversationData.cliente_nivel || 'normal',
        conversationFlow: [{
          action: 'product_display',
          productId: product.id,
          productName: product.nombre,
          timestamp: Date.now()
        }]
      })
      
      console.log(`🧠 Producto ${product.nombre} guardado en memoria para ${to}`)
      
      // 🛡️ CONTROL DE SPAM - Verificar si ya se envió descripción de este producto
      if (await this.hasProductDescriptionBeenSent(to, product.id)) {
        console.log(`🔄 Producto ${product.nombre} ya mostrado previamente a ${to}`)        
        console.log(`🔄 ${product.nombre} - S/ ${product.precio} (📍 ya enviado anteriormente)`)
        
        // 🧠 ACTUALIZAR MEMORIA: Registrar nueva consulta sobre producto conocido
        await this.productMemory.addConversationAction(to, 'repeated_inquiry', {
          question: additionalText || 'consulta general',
          previouslyShown: true
        })
        
        // 🚫 NUEVA OPCIÓN: Si skipResponseIfAlreadySent es true, no generar respuesta automática
        if (skipResponseIfAlreadySent) {
          console.log(`🚫 Saltando respuesta automática (controlada externamente)`)
          return
        }
        
        // 🧠 RESPUESTA INTELIGENTE: En lugar de evitar respuesta, generar respuesta informativa
        console.log(`🧠 Generando respuesta informativa para consulta sobre producto conocido`)
        
        // Generar respuesta contextual usando Gemini para información adicional
        const customerName = await this.getCustomerName(to) || 'cliente'
        const informativeResponse = await this.gemini.generateSalesResponse(
          `El cliente ${customerName} está pidiendo más información sobre el ${product.nombre} que ya se le mostró anteriormente. ${additionalText ? `Su consulta específica: "${additionalText}"` : 'Quiere saber más detalles.'} Proporciona información útil adicional como características técnicas, beneficios, comparaciones o responde su pregunta específica. Sé informativo y útil.`,
          customerName,
          [product],
          this.STATES.INTERESTED,
          this.getRecentHistory(to, 3),
          this.inventory,
          await this.getConversationData(to) || {}
        )
        
        await this.sendMessage(to, informativeResponse)
        this.addToHistory(to, 'assistant', informativeResponse)
        console.log(`✅ Respuesta informativa enviada sobre ${product.nombre}`)
        return // Ya se respondió, no duplicar información básica
      }
      
      const productInfo = `🛍️ *${product.nombre}*\n\n` +
                         `💰 Precio: S/ ${product.precio}\n` +
                         `📦 Stock: ${product.stock} unidades\n` +
                         (product.descripcion ? `📝 ${product.descripcion}\n` : '') +
                         (product.categoria ? `🏷️ Categoría: ${product.categoria}\n` : '') +
                         (additionalText ? `\n${additionalText}` : '')

      // Si tiene imagen, enviarla con la información
      if (product.imagen_url && product.imagen_url.trim() !== '') {
        await this.sendImageMessage(to, product.imagen_url, productInfo)
      } else {
        // Si no tiene imagen, enviar solo el texto
        await this.sendMessage(to, productInfo)
      }
      
      // 🛡️ MARCAR PRODUCTO COMO ENVIADO
      await this.markProductDescriptionAsSent(to, product.id)
      
      // 🧠 ACTUALIZAR MEMORIA: Registrar envío exitoso
      await this.productMemory.addConversationAction(to, 'product_sent', {
        productId: product.id,
        productName: product.nombre,
        hasImage: !!(product.imagen_url && product.imagen_url.trim()),
        additionalText: additionalText || null
      })
      
    } catch (error) {
      console.error('Error enviando producto con imagen:', error)
      
      // 🧠 REGISTRAR ERROR EN MEMORIA
      await this.productMemory.addConversationAction(to, 'product_send_error', {
        productId: product.id,
        error: error.message
      })
      
      // Fallback: enviar solo información de texto
      const fallbackText = `🛍️ *${product.nombre}*\n\n` +
                          `💰 Precio: S/ ${product.precio}\n` +
                          `📦 Stock: ${product.stock} unidades`
      await this.sendMessage(to, fallbackText)
    }
  }

  // 🛡️ SISTEMA DE CONTROL DE SPAM DE IMÁGENES
  
  /**
   * Verificar si una imagen ya fue enviada a un cliente - MIGRADO A SUPABASE
   */
  async hasImageBeenSent(clientId, imageUrl) {
    try {
      const { data, error } = await this.db.client
        .from('sent_content_tracking')
        .select('id')
        .eq('client_id', clientId)
        .eq('content_identifier', imageUrl)
        .eq('content_type', 'image')
        .limit(1)
      
      if (error) {
        console.error('Error verificando imagen enviada:', error)
        return false
      }
      
      return data && data.length > 0
    } catch (error) {
      console.error('Error en hasImageBeenSent:', error)
      return false
    }
  }
  
  /**
   * 🧹 NUEVO: Limpiar tracking de imágenes VIP entre sesiones
   */
  async clearVipImageTracking(clientId) {
    try {
      console.log(`🧹 Limpiando tracking de imágenes VIP para ${clientId}`)
      
      const { error } = await this.db.client
        .from('sent_content_tracking')
        .delete()
        .eq('client_id', clientId)
        .eq('content_type', 'image')
        .like('content_identifier', '%vip%')
      
      if (error) {
        console.error('❌ Error limpiando tracking VIP:', error)
      } else {
        console.log(`✅ Tracking de imágenes VIP limpiado para ${clientId}`)
      }
    } catch (error) {
      console.error('Error en clearVipImageTracking:', error)
    }
  }
  
  /**
   * 🧹 NUEVO: Limpiar todo el tracking de contenido para nueva sesión
   */
  async clearAllContentTracking(clientId, reason = 'new_session') {
    try {
      console.log(`🧹 Limpiando tracking de contenido completo para ${clientId} (razón: ${reason})`)
      
      const { error } = await this.db.client
        .from('sent_content_tracking')
        .delete()
        .eq('client_id', clientId)
      
      if (error) {
        console.error('❌ Error limpiando tracking completo:', error)
      } else {
        console.log(`✅ Tracking de contenido completo limpiado para ${clientId}`)
        
        // 🛡️ PRESERVAR CONTEXTO ENHANCED ACTIVO durante saludos
        if (this.contextSynchronizer && reason !== 'returning_customer_greeting') {
          await this.contextSynchronizer.clearObsoleteContext(clientId, reason)
        } else if (reason === 'returning_customer_greeting') {
          console.log(`🛡️ PRESERVANDO contexto Enhanced activo para cliente recurrente: ${clientId}`)
          // Solo limpiar tracking de imágenes, preservar contexto Enhanced
        }
      }
    } catch (error) {
      console.error('Error en clearAllContentTracking:', error)
    }
  }
  
  /**
   * Marcar una imagen como enviada a un cliente - MIGRADO A SUPABASE
   */
  async markImageAsSent(clientId, imageUrl) {
    try {
      const { error } = await this.db.client
        .from('sent_content_tracking')
        .insert({
          client_id: clientId,
          content_identifier: imageUrl,
          content_type: 'image',
          sent_at: new Date().toISOString()
        })
      
      if (error && error.code !== '23505') { // 23505 = unique violation (ya existe)
        console.error('Error marcando imagen como enviada:', error)
      }
      
      // La limpieza automática se maneja con funciones SQL
    } catch (error) {
      console.error('Error en markImageAsSent:', error)
    }
  }
  
  /**
   * Verificar si la descripción de un producto ya fue enviada - MIGRADO A SUPABASE
   */
  async hasProductDescriptionBeenSent(clientId, productId) {
    try {
      const { data, error } = await this.db.client
        .from('sent_content_tracking')
        .select('id')
        .eq('client_id', clientId)
        .eq('content_identifier', productId.toString())
        .eq('content_type', 'product_description')
        .limit(1)
      
      if (error) {
        console.error('Error verificando descripción enviada:', error)
        return false
      }
      
      return data && data.length > 0
    } catch (error) {
      console.error('Error en hasProductDescriptionBeenSent:', error)
      return false
    }
  }
  
  /**
   * Marcar descripción de producto como enviada - MIGRADO A SUPABASE
   */
  async markProductDescriptionAsSent(clientId, productId) {
    try {
      const { error } = await this.db.client
        .from('sent_content_tracking')
        .insert({
          client_id: clientId,
          content_identifier: productId.toString(),
          content_type: 'product_description',
          sent_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error en markProductDescriptionAsSent:', error)
    }
  }
  
  /**
   * Limpiar historial de imágenes para un cliente - MIGRADO A SUPABASE
   */
  async clearImageHistory(clientId) {
    try {
      const { error } = await this.db.client
        .from('sent_content_tracking')
        .delete()
        .eq('client_id', clientId)
      
      if (error) {
        console.error('Error limpiando historial de imágenes:', error)
      } else {
        console.log(`🧹 Historial de imágenes limpiado para ${clientId} (Supabase)`)
      }
    } catch (error) {
      console.error('Error en clearImageHistory:', error)
    }
  }

  async sendTyping(to) {
    const { error } = await this.db.supabase
      .from('typing')
      .insert({ to, created_at: new Date() })
      .select()

    if (error) {
      console.error('Error sending typing:', error)
    } else {
      console.log(`печатает ${to}`)
    }
  }
  
  /**
   * 🧽 Limpiar historial de imágenes para un cliente (cuando se resetea conversación)
   */
  async clearImageHistory(clientId) {
    try {
      // 🧽 LIMPIAR EN SUPABASE
      await this.db.client
        .from('sent_content_tracking')
        .delete()
        .eq('client_id', clientId)
      
      console.log(`🧽 Historial de imágenes limpiado para ${clientId} (Supabase)`)
    } catch (error) {
      console.error('Error limpiando historial de imágenes:', error)
    }
  }

  async sendTyping(to) {
    if (!this.isConnected || !this.sock) {
      console.warn('WhatsApp no está conectado, omitiendo indicador de escritura')
      return
    }

    try {
      const typingEnabled = await this.db.getConfig('response_typing_indicator_enabled')

      if (typingEnabled === 'true') {
        await this.sock.sendPresenceUpdate('composing', to)
        console.log(`✍️ Mostrando "escribiendo..." a ${to}`)
      }
    } catch (error) {
      console.error('Error enviando indicador de escritura:', error)
      // Continuar sin indicador si hay error
    }
  }

  async applyResponseTiming(to) {
    try {
      const delayEnabled = await this.db.getConfig('response_delay_enabled')
      const typingEnabled = await this.db.getConfig('response_typing_indicator_enabled')

      if (delayEnabled === 'true') {
        const minDelay = parseInt(await this.db.getConfig('response_delay_min') || '2')
        const maxDelay = parseInt(await this.db.getConfig('response_delay_max') || '5')

        // Calcular retraso aleatorio entre min y max
        const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay

        console.log(`⏱️ Aplicando retraso de ${delay} segundos`)

        // Mostrar indicador de escritura si está habilitado
        if (typingEnabled === 'true') {
          await this.sock.sendPresenceUpdate('composing', to)
          console.log(`✍️ Mostrando "escribiendo..." a ${to}`)
        }

        // Esperar el tiempo configurado
        await new Promise(resolve => setTimeout(resolve, delay * 1000))

        // Detener indicador de escritura
        if (typingEnabled === 'true') {
          await this.sock.sendPresenceUpdate('paused', to)
        }
      }
    } catch (error) {
      console.error('Error aplicando timing de respuesta:', error)
      // Continuar sin retraso si hay error
    }
  }

  async downloadMediaMessage(message, maxRetries = 3) {
    if (!this.sock) {
      throw new Error('WhatsApp no está conectado')
    }

    let lastError = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📷 Descargando imagen... (Intento ${attempt}/${maxRetries})`)

        // Usar la API correcta de Baileys para descargar media
        const stream = await downloadContentFromMessage(message, 'image')

        // Convertir stream a buffer con timeout
        const chunks = []
        const timeout = 30000 // 30 segundos timeout

        const downloadPromise = (async () => {
          for await (const chunk of stream) {
            chunks.push(chunk)
          }
          return Buffer.concat(chunks)
        })()

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout descargando imagen')), timeout)
        })

        const buffer = await Promise.race([downloadPromise, timeoutPromise])

        console.log('✅ Imagen descargada exitosamente, tamaño:', buffer.length, 'bytes')
        return buffer

      } catch (error) {
        lastError = error
        console.error(`❌ Error en intento ${attempt}/${maxRetries}:`, error.message)

        // Si es el último intento, no esperar
        if (attempt === maxRetries) {
          break
        }

        // Esperar antes del siguiente intento (backoff exponencial)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Max 10 segundos
        console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    console.error('❌ Falló la descarga después de todos los intentos:', lastError)
    throw new Error(`Error descargando imagen después de ${maxRetries} intentos: ${lastError.message}`)
  }

  // 🧠 NUEVO: Sistema para mantener preguntas pendientes
  async savePendingQuestions(phoneNumber, questions, productContext = null) {
    try {
      console.log(`🧠 Guardando preguntas pendientes para ${phoneNumber}:`, questions);
      
      const conversationData = await this.getConversationData(phoneNumber);
      const updatedData = {
        ...conversationData,
        pending_questions: questions,
        product_context_for_questions: productContext,
        questions_timestamp: new Date().toISOString()
      };
      
      await this.setConversationState(phoneNumber, await this.getConversationState(phoneNumber), updatedData);
      
      console.log(`✅ Preguntas pendientes guardadas para ${phoneNumber}`);
    } catch (error) {
      console.error('Error guardando preguntas pendientes:', error);
    }
  }

  // 🧠 NUEVO: Obtener preguntas pendientes
  async getPendingQuestions(phoneNumber) {
    try {
      const conversationData = await this.getConversationData(phoneNumber);
      
      // Verificar si hay preguntas pendientes y si no son muy antiguas (últimas 10 minutos)
      if (conversationData.pending_questions && conversationData.questions_timestamp) {
        const questionTime = new Date(conversationData.questions_timestamp);
        const now = new Date();
        const diffMinutes = (now - questionTime) / (1000 * 60);
        
        if (diffMinutes <= 10) {
          console.log(`🧠 Preguntas pendientes encontradas:`, conversationData.pending_questions);
          return {
            questions: conversationData.pending_questions,
            productContext: conversationData.product_context_for_questions || null,
            timestamp: conversationData.questions_timestamp
          };
        } else {
          console.log(`⏰ Preguntas pendientes expiradas (${Math.round(diffMinutes)} min)`);
          // Limpiar preguntas expiradas
          await this.clearPendingQuestions(phoneNumber);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo preguntas pendientes:', error);
      return null;
    }
  }

  // 🧠 NUEVO: Limpiar preguntas pendientes
  async clearPendingQuestions(phoneNumber) {
    try {
      const conversationData = await this.getConversationData(phoneNumber);
      const updatedData = { ...conversationData };
      
      delete updatedData.pending_questions;
      delete updatedData.product_context_for_questions;
      delete updatedData.questions_timestamp;
      
      await this.setConversationState(phoneNumber, await this.getConversationState(phoneNumber), updatedData);
      
      console.log(`🧹 Preguntas pendientes limpiadas para ${phoneNumber}`);
    } catch (error) {
      console.error('Error limpiando preguntas pendientes:', error);
    }
  }

  // 🧠 NUEVO: Extraer preguntas del mensaje del cliente
  extractQuestionsFromMessage(messageText) {
    const questions = [];
    const text = messageText.toLowerCase();
    
    // Patrones para detectar preguntas comunes
    const questionPatterns = [
      { pattern: /cuánto.*dura.*batería/i, question: 'duración de la batería', type: 'battery' },
      { pattern: /batería.*dura/i, question: 'duración de la batería', type: 'battery' },
      { pattern: /puedo.*llevar.*viaje/i, question: 'uso para viajes', type: 'travel' },
      { pattern: /sirve.*viaje/i, question: 'adecuado para viajes', type: 'travel' },
      { pattern: /puedo.*grabar/i, question: 'capacidad de grabación', type: 'recording' },
      { pattern: /grabar.*mucho/i, question: 'capacidad de grabación extensa', type: 'recording' },
      { pattern: /cuánto.*espacio/i, question: 'almacenamiento disponible', type: 'storage' },
      { pattern: /qué.*características/i, question: 'características del producto', type: 'features' },
      { pattern: /cómo.*funciona/i, question: 'funcionamiento del producto', type: 'functionality' },
      { pattern: /cuánto.*pesa/i, question: 'peso del producto', type: 'weight' },
      { pattern: /qué.*tamaño/i, question: 'tamaño del producto', type: 'size' }
    ];
    
    for (const {pattern, question, type} of questionPatterns) {
      if (pattern.test(text)) {
        questions.push({
          original: messageText,
          extracted: question,
          type: type,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return questions;
  }

  // 🆕 NUEVO: Guardar cliente curioso en Supabase para reconocimiento futuro
  async saveClienteCurioso(phoneNumber, customerName) {
    try {
      console.log(`💾 Guardando cliente curioso: ${customerName} (${phoneNumber})`);
      
      // ✅ CORRECCIÓN: Verificar que this.db está disponible
      if (!this.db || !this.db.client) {
        console.error('❌ Base de datos no disponible para clientes curiosos');
        return null;
      }
      
      // Verificar si ya existe en la tabla clientes_curiosos
      const { data: existingClient, error: checkError } = await this.db.client
        .from('clientes_curiosos')
        .select('*')
        .eq('telefono', phoneNumber)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error verificando cliente curioso existente:', checkError);
        return null;
      }
      
      if (existingClient) {
        // Actualizar información existente
        const { data: updatedClient, error: updateError } = await this.db.client
          .from('clientes_curiosos')
          .update({
            nombre: customerName,
            ultima_interaccion: new Date(),
            veces_consultado: (existingClient.veces_consultado || 0) + 1
          })
          .eq('telefono', phoneNumber)
          .select()
          .single();
          
        if (updateError) {
          console.error('Error actualizando cliente curioso:', updateError);
          return null;
        }
        
        console.log(`✅ Cliente curioso actualizado: ${customerName}`);
        return updatedClient;
      } else {
        // Crear nuevo registro
        const { data: newClient, error: createError } = await this.db.client
          .from('clientes_curiosos')
          .insert({
            telefono: phoneNumber,
            nombre: customerName,
            primera_interaccion: new Date(),
            ultima_interaccion: new Date(),
            veces_consultado: 1
          })
          .select()
          .single();
          
        if (createError) {
          console.error('Error creando cliente curioso:', createError);
          return null;
        }
        
        console.log(`✅ Nuevo cliente curioso guardado: ${customerName}`);
        return newClient;
      }
    } catch (error) {
      console.error('Error guardando cliente curioso:', error);
      return null;
    }
  }

  // 🔍 NUEVO: Buscar cliente curioso en Supabase
  async getClienteCurioso(phoneNumber) {
    try {
      // ✅ CORRECCIÓN: Verificar que this.db está disponible
      if (!this.db || !this.db.client) {
        console.error('❌ Base de datos no disponible para búsqueda de clientes curiosos');
        return null;
      }
      
      const { data: client, error } = await this.db.client
        .from('clientes_curiosos')
        .select('*')
        .eq('telefono', phoneNumber)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error buscando cliente curioso:', error);
        return null;
      }
      
      if (client) {
        console.log(`🔍 Cliente curioso encontrado: ${client.nombre} (${client.veces_consultado} consultas)`);
        return {
          cliente_nombre: client.nombre,
          veces_consultado: client.veces_consultado,
          primera_interaccion: client.primera_interaccion,
          ultima_interaccion: client.ultima_interaccion,
          tipo: 'curioso'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error buscando cliente curioso:', error);
      return null;
    }
  }

  async getCustomerName(phoneNumber) {
    try {
      // 1. 🔍 BUSCAR EN ESTADO DE CONVERSACIÓN ACTUAL
      const conversationData = await this.getConversationData(phoneNumber)
      if (conversationData && conversationData.customer_name) {
        console.log(`📝 Cliente encontrado en conversación: ${conversationData.customer_name}`)
        return conversationData.customer_name
      }
      
      // 2. 🔍 BÚSQUEDA EN CLIENTES CURIOSOS
      const clienteCurioso = await this.getClienteCurioso(phoneNumber)
      if (clienteCurioso && clienteCurioso.cliente_nombre) {
        console.log(`🔍 Cliente curioso encontrado: ${clienteCurioso.cliente_nombre} (${clienteCurioso.veces_consultado} consultas)`);
        
        // Actualizar estado de conversación con información de cliente curioso
        await this.setConversationState(phoneNumber, this.STATES.BROWSING, {
          customer_name: clienteCurioso.cliente_nombre,
          cliente_tipo: 'curioso',
          veces_consultado: clienteCurioso.veces_consultado,
          es_curioso: true
        });
        return clienteCurioso.cliente_nombre;
      }
      
      // 3. 👑 BÚSQUEDA EN SUPABASE PARA CLIENTES VIP/RECURRENTES
      const clienteInfo = await this.getClienteRecurrenteInfo(phoneNumber)
      if (clienteInfo && clienteInfo.cliente_nombre) {
        console.log(`👑 Cliente VIP/Recurrente encontrado: ${clienteInfo.cliente_nombre} (Nivel: ${clienteInfo.nivel_cliente})`)
        
        // Actualizar estado de conversación con información VIP
        await this.setConversationState(phoneNumber, this.STATES.BROWSING, {
          customer_name: clienteInfo.cliente_nombre,
          cliente_nivel: clienteInfo.nivel_cliente,
          es_recurrente: true,
          total_pedidos: clienteInfo.total_pedidos
        })
        return clienteInfo.cliente_nombre
      }
      
      // 4. 📊 BÚSQUEDA EN PEDIDOS PARA CLIENTES NORMALES
      const clienteNormal = await this.getClienteNormalInfo(phoneNumber)
      if (clienteNormal && clienteNormal.cliente_nombre) {
        console.log(`📊 Cliente normal encontrado: ${clienteNormal.cliente_nombre} (${clienteNormal.total_pedidos} pedidos)`)
        
        // Actualizar estado de conversación con información de cliente normal
        await this.setConversationState(phoneNumber, this.STATES.BROWSING, {
          customer_name: clienteNormal.cliente_nombre,
          cliente_nivel: 'Normal',
          es_recurrente: clienteNormal.total_pedidos > 1,
          total_pedidos: clienteNormal.total_pedidos
        })
        return clienteNormal.cliente_nombre
      }
      
      // 5. 📞 INTENTAR OBTENER NOMBRE DEL CONTACTO DE WHATSAPP
      try {
        const contact = await this.sock?.onWhatsApp(phoneNumber)
        const contactName = contact?.[0]?.notify

        // Si el nombre del contacto es diferente al número, usarlo
        if (contactName && contactName !== phoneNumber.replace('@s.whatsapp.net', '')) {
          console.log(`📞 Nombre de contacto WhatsApp: ${contactName}`)
          return contactName
        }
      } catch (error) {
        console.error('Error obteniendo contacto de WhatsApp:', error)
      }
      
      // 5. 🆕 CLIENTE COMPLETAMENTE NUEVO
      console.log(`🆕 Cliente nuevo detectado: ${phoneNumber}`)
      return null
      
    } catch (error) {
      console.error('Error obteniendo nombre del cliente:', error)
      return null
    }
  }
  
  // 🆕 NUEVO MÉTODO: Obtener información de cliente normal (no VIP aún)
  async getClienteNormalInfo(phoneNumber) {
    try {
      // Buscar en tabla de pedidos por cliente que no sea VIP aún
      const { data, error } = await this.db.client
        .from('pedidos')
        .select('cliente_nombre, cliente_whatsapp')
        .eq('cliente_whatsapp', phoneNumber)
        .not('cliente_nombre', 'is', null)
        .order('fecha_creacion', { ascending: false })
        .limit(1)
      
      if (error) {
        console.error('Error buscando cliente normal:', error)
        return null
      }
      
      if (data && data.length > 0) {
        // Contar total de pedidos para determinar nivel
        const { count } = await this.db.client
          .from('pedidos')
          .select('*', { count: 'exact', head: true })
          .eq('cliente_whatsapp', phoneNumber)
        
        return {
          cliente_nombre: data[0].cliente_nombre,
          telefono: phoneNumber,
          total_pedidos: count || 0,
          nivel_cliente: count >= 10 ? 'Potencial VIP' : 'Normal'
        }
      }
      
      return null
    } catch (error) {
      console.error('Error en getClienteNormalInfo:', error)
      return null
    }
  }

  // Método para solicitar nombre al cliente (con reconocimiento de clientes recurrentes)
  async askForCustomerName(phoneNumber) {
    // Verificar si es un cliente recurrente
    const clienteInfo = await this.getClienteRecurrenteInfo(phoneNumber)

    if (clienteInfo) {
      // 👑 Cliente recurrente/VIP - saludo personalizado y mostrar productos directamente
      console.log(`👑 Cliente VIP/Recurrente detectado: ${clienteInfo.cliente_nombre} (${clienteInfo.nivel_cliente})`) 
      
      const saludoPersonalizado = await this.generarSaludoPersonalizado(clienteInfo)
      await this.sendMessage(phoneNumber, saludoPersonalizado)
      this.addToHistory(phoneNumber, 'assistant', saludoPersonalizado)

      // Establecer estado con información del cliente
      await this.setConversationState(phoneNumber, this.STATES.BROWSING, {
        customer_name: clienteInfo.cliente_nombre,
        cliente_nivel: clienteInfo.nivel_cliente,
        es_recurrente: true,
        total_pedidos: clienteInfo.total_pedidos
      })
      
      // 🎆 MOSTRAR PRODUCTOS DESTACADOS automáticamente para clientes VIP
      try {
        const productosDestacados = await this.inventory.getDestacados()
        if (productosDestacados && productosDestacados.length > 0) {
          // Pequeña pausa antes de mostrar productos
          await new Promise(resolve => setTimeout(resolve, 2000))
          await this.sendTyping(phoneNumber)
          
          // Mostrar productos destacados (máximo 5)
          const productosAMostrar = productosDestacados.slice(0, 5)
          for (const product of productosAMostrar) {
            await this.sendProductWithImage(phoneNumber, product)
            // Pequeña pausa entre productos
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          
          // Sugerir categorías para más opciones
          await this.sugerirCategorias(phoneNumber, clienteInfo.cliente_nombre)
        }
      } catch (error) {
        console.error('Error mostrando productos a cliente VIP:', error)
      }
      
    } else {
      // Cliente nuevo - usar mensaje de bienvenida personalizado
      const welcomeMessage = await this.getWelcomeMessage()

      await this.sendMessage(phoneNumber, welcomeMessage)
      await this.setConversationState(phoneNumber, this.STATES.ASKING_NAME)
    }
  }

  // Obtener información de cliente recurrente
  async getClienteRecurrenteInfo(phoneNumber) {
    if (!this.sales) return null

    try {
      return await this.sales.getClienteInfo(phoneNumber)
    } catch (error) {
      console.error('Error obteniendo info de cliente recurrente:', error)
      return null
    }
  }

  // Generar saludo personalizado para cliente recurrente
  async generarSaludoPersonalizado(clienteInfo) {
    const { cliente_nombre, nivel_cliente, total_pedidos, categoria_favorita } = clienteInfo
    const businessName = await this.getBusinessName()

    let emoji = '😊'
    let nivelTexto = ''

    switch (nivel_cliente) {
      case 'VIP':
        emoji = '👑'
        nivelTexto = `¡Nuestro cliente VIP de ${businessName}!`
        break
      case 'Frecuente':
        emoji = '⭐'
        nivelTexto = `¡Uno de nuestros clientes frecuentes de ${businessName}!`
        break
      case 'Recurrente':
        emoji = '🎉'
        nivelTexto = `¡Qué gusto verte de nuevo en ${businessName}!`
        break
      default:
        emoji = '😊'
        nivelTexto = `¡Bienvenido de vuelta a ${businessName}!`
    }

    return `${emoji} ¡Hola ${cliente_nombre}! ${nivelTexto}

Es un placer tenerte aquí nuevamente. Veo que ya tienes ${total_pedidos} ${total_pedidos === 1 ? 'pedido' : 'pedidos'} con nosotros${categoria_favorita ? ` y que te gusta mucho la categoría de ${categoria_favorita}` : ''}.

¿En qué puedo ayudarte hoy? 🛍️`
  }

  // Sugerir categorías para explorar más productos
  async sugerirCategorias(from, customerName) {
    try {
      const categorias = await this.inventory.getCategories()

      if (categorias.length > 0) {
        const categoriasTexto = categorias.join(', ')
        const sugerenciaMessage = `¿Te interesa algún producto diferente? 🤔

Entre nuestras categorías tenemos: ${categoriasTexto}.

Solo dime algo como "muéstrame deportes" o "qué tienes en electrónica" y te mostraré los productos más populares de esa categoría. 😊`

        await this.sendMessage(from, sugerenciaMessage)
        this.addToHistory(from, 'assistant', sugerenciaMessage)
      } else {
        const closingMessage = `¿Te interesa alguno de estos productos? ¡Dime cuál te llama la atención! 🛍️`
        await this.sendMessage(from, closingMessage)
        this.addToHistory(from, 'assistant', closingMessage)
      }
    } catch (error) {
      console.error('Error sugiriendo categorías:', error)
      const closingMessage = `¿Te interesa alguno de estos productos? ¡Dime cuál te llama la atención! 🛍️`
      await this.sendMessage(from, closingMessage)
      this.addToHistory(from, 'assistant', closingMessage)
    }
  }

  // 🤖 FUNCIÓN NUEVA: Extraer nombre inteligentemente
  extractNameIntelligently(messageText) {
    const text = messageText.trim()
    
    // Patrones para detectar nombres inteligentemente
    const namePatterns = [
      // "Mi nombre es Elizabeth", "mi nombre es Juan"
      /(?:mi\s+nombre\s+es)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)/i,
      // "Me llamo Elizabeth", "me llamo Juan"
      /(?:me\s+llamo)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)/i,
      // "Hola me llamo Elizabeth", "hola mi nombre es Juan"
      /(?:hola,?\s+)(?:mi\s+nombre\s+es|me\s+llamo)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)/i,
      // "Soy Elizabeth", "soy Juan"
      /(?:soy)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)/i
    ]
    
    // Intentar cada patrón
    for (const pattern of namePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        // Limpiar y extraer solo el primer nombre
        const extractedName = match[1].trim().split(' ')[0]
        const cleanName = extractedName.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '')
        
        console.log(`🔥 NOMBRE DETECTADO: "${cleanName}" desde "${text}" usando patrón inteligente`)
        return cleanName
      }
    }
    
    // Fallback: si no coincide con patrones, usar la primera palabra limpia
    const firstWord = text.split(' ')[0].replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '')
    console.log(`🔍 FALLBACK: Usando primera palabra "${firstWord}" desde "${text}"`)
    return firstWord
  }

  // Método para procesar el nombre recibido
  async processReceivedName(phoneNumber, messageText) {
    // 🔥 SOLUCIÓN: Detección inteligente de nombres
    const name = this.extractNameIntelligently(messageText)

    if (name && name.length > 1) {
      // 💾 GUARDAR CLIENTE CURIOSO EN SUPABASE para reconocimiento futuro
      await this.saveClienteCurioso(phoneNumber, name);
      
      // Guardar nombre en conversationData
      await this.setConversationState(phoneNumber, this.STATES.BROWSING, {
        customer_name: name,
        cliente_tipo: 'curioso',
        es_curioso: true
      })

      // 🎭 Mensaje de confirmación personalizado usando perfil + categorías
      console.log(`🎭 GENERANDO confirmación personalizada para: ${name}`)

      // Obtener categorías reales del inventario
      const categorias = await this.inventory.getCategories()
      const categoriasTexto = categorias.length > 0 ? categorias.join(', ') : 'productos variados'

      const confirmMessage = await this.gemini.generateSalesResponse(
        `Confirma que recibiste el nombre ${name} del cliente. Dale una bienvenida BREVE y PROFESIONAL mencionando que tienes los mejores productos. Luego menciona las categorías disponibles: ${categoriasTexto}. Pregunta qué le interesa. Máximo 3-4 líneas.`,
        name,
        [], // No necesitamos inventario completo para confirmación
        'asking_name',
        [],
        this.inventory,
        await this.getConversationData(phoneNumber) || {}
      )

      await this.sendMessage(phoneNumber, confirmMessage)
      this.addToHistory(phoneNumber, 'assistant', confirmMessage)
      return name
    } else {
      // Si el nombre no es válido, pedir de nuevo
      const retryMessage = `Disculpa, no pude entender tu nombre correctamente.

¿Podrías decirme solo tu nombre, por favor? Por ejemplo: "María" o "Juan" 😊`

      await this.sendMessage(phoneNumber, retryMessage)
      return null
    }
  }

  async logMessage(phoneNumber, message, type) {
    // Aquí podrías guardar en base de datos para estadísticas
    // Por ahora solo incrementamos el contador
    if (type === 'recibido') {
      this.messageCount++
    }
  }

  getTodayMessagesCount() {
    return this.messageCount
  }

  getConnectionStatus() {
    return this.isConnected ? 'connected' : 'disconnected'
  }

  // Validaciones dinámicas sin hardcodeo
  validateProductMention(message, inventory) {
    const messageLower = message.toLowerCase()
    const mentionedProducts = []

    for (const product of inventory) {
      const productNameLower = product.nombre.toLowerCase()
      const categoryLower = product.categoria?.toLowerCase() || ''

      // Buscar por nombre completo o parcial
      if (messageLower.includes(productNameLower) ||
          productNameLower.includes(messageLower.trim())) {
        mentionedProducts.push({
          id: product.id,
          name: product.nombre,
          price: product.precio,
          confidence: 'high'
        })
      }
      // Buscar por categoría
      else if (categoryLower && messageLower.includes(categoryLower)) {
        mentionedProducts.push({
          id: product.id,
          name: product.nombre,
          price: product.precio,
          confidence: 'medium'
        })
      }
    }

    return mentionedProducts
  }

  validateQuantityMention(message) {
    // Buscar números en el mensaje
    const numberMatches = message.match(/\d+/g)
    if (numberMatches) {
      const quantity = parseInt(numberMatches[0])
      return quantity > 0 && quantity <= 100 ? quantity : 0
    }

    // Buscar palabras que indican cantidad
    const quantityWords = {
      'un': 1, 'una': 1, 'uno': 1,
      'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
      'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10
    }

    const messageLower = message.toLowerCase()
    for (const [word, num] of Object.entries(quantityWords)) {
      if (messageLower.includes(word)) {
        return num
      }
    }

    return 0
  }

  validateExplicitConfirmation(message) {
    const confirmationPhrases = [
      'sí confirmo', 'si confirmo', 'confirmo el pedido', 'confirmo',
      'sí, confirmo', 'si, confirmo', 'acepto el pedido', 'acepto',
      'procede con el pedido', 'procede', 'está bien, confirmo',
      'ok, confirmo', 'dale, confirmo', 'sí, está bien'
    ]

    const messageLower = message.toLowerCase().trim()

    return confirmationPhrases.some(phrase =>
      messageLower === phrase ||
      messageLower.includes(phrase)
    )
  }

  validatePurchaseIntent(message) {
    const purchaseKeywords = [
      'quiero comprar', 'quiero', 'me llevo', 'compro',
      'necesito', 'busco', 'me interesa comprar',
      'quisiera comprar', 'voy a comprar', 'puedo comprar'
    ]

    const messageLower = message.toLowerCase()

    return purchaseKeywords.some(keyword =>
      messageLower.includes(keyword)
    )
  }

  isVagueResponse(message) {
    const vagueResponses = [
      'si', 'sí', 'ok', 'okay', 'bien', 'bueno', 'dale',
      'ya', 'aja', 'ajá', 'mmm', 'uhm', 'claro', 'perfecto'
    ]

    const messageLower = message.toLowerCase().trim()

    return vagueResponses.includes(messageLower) || messageLower.length < 3
  }

  // MÉTODO PARA GENERAR SALUDO PERSONALIZADO SEGÚN HISTORIAL DEL CLIENTE
  async generatePersonalizedGreeting(from, customerName) {
    try {
      const businessName = await this.getBusinessName()

      // Obtener información del cliente desde estadísticas
      let clienteInfo = null
      if (this.sales) {
        try {
          clienteInfo = await this.sales.getClienteInfo(from)
        } catch (error) {
          console.error('Error obteniendo información del cliente:', error)
          clienteInfo = null
        }
      }

      if (!clienteInfo || clienteInfo.total_pedidos === 0) {
        // Cliente nuevo - usar perfil personalizado
        console.log(`🎭 GENERANDO saludo personalizado para cliente nuevo: ${customerName}`)
        const personalizedGreeting = await this.gemini.generateSalesResponse(
          `Saluda al cliente nuevo ${customerName} y muestra productos destacados`,
          customerName,
          [], // No necesitamos inventario completo para el saludo
          'initial',
          [],
          this.inventory, // ✅ CORREGIDO: Pasar servicio de inventario para descripción inteligente
          await this.getConversationData(from) || {}
        )
        return personalizedGreeting
      }

      // Cliente recurrente - generar saludo según ranking
      let saludo = `¡Hola de nuevo ${customerName}! 😊`
      let emoji = ''
      let mensaje = ''

      if (clienteInfo.total_compras >= 10) {
        // Cliente VIP (10+ compras)
        emoji = '👑'
        mensaje = `${emoji} ¡Nuestro cliente VIP de ${businessName} está de vuelta! Gracias por tu fidelidad. Te muestro nuestros productos más cotizados:`
      } else if (clienteInfo.total_compras >= 5) {
        // Cliente Frecuente (5-9 compras)
        emoji = '⭐'
        mensaje = `${emoji} ¡Qué gusto verte de nuevo en ${businessName}, cliente estrella! Te muestro nuestros productos más cotizados:`
      } else if (clienteInfo.total_compras >= 2) {
        // Cliente Recurrente (2-4 compras)
        emoji = '🤝'
        mensaje = `${emoji} ¡Bienvenido de vuelta a ${businessName}! Me alegra que regreses. Te muestro nuestros productos más cotizados:`
      } else {
        // Cliente con 1 compra
        emoji = '😊'
        mensaje = `${emoji} ¡Qué bueno verte de nuevo en ${businessName}! Te muestro nuestros productos más cotizados:`
      }

      return `${saludo} ${mensaje}`

    } catch (error) {
      console.error('Error generando saludo personalizado:', error)
      const businessName = await this.getBusinessName()
      return `¡Hola ${customerName}! 😊 Bienvenido a ${businessName}. Te muestro nuestros productos más cotizados:`
    }
  }

  // MÉTODOS PARA FILTROS DE MENSAJES Y CONFIGURACIONES
  async shouldProcessMessage(messageText, currentState, from) {
    try {
      // Verificar horario de atención
      const withinBusinessHours = await this.isWithinBusinessHours(from)
      if (!withinBusinessHours) {
        return false
      }

      // Aplicar filtros de mensajes
      const passesFilters = await this.passesMessageFilters(messageText, currentState, from)
      return passesFilters

    } catch (error) {
      console.error('Error validando mensaje:', error)
      return true // En caso de error, procesar el mensaje
    }
  }

  // NUEVO MÉTODO: Filtros inteligentes que consideran la intención detectada
  async shouldProcessMessageIntelligent(messageText, currentState, from, intent) {
    try {
      // Verificar horario de atención
      const withinBusinessHours = await this.isWithinBusinessHours(from)
      if (!withinBusinessHours) {
        return false
      }

      // 🔐 EXCEPCIÓN ESPECIAL: Activación de modo administrativo
      if (this.isAdminModeActivation(messageText)) {
        console.log('✅ Mensaje procesado por activación de modo administrativo')
        return true
      }

      // 🔐 EXCEPCIÓN ESPECIAL: Usuario ya en modo administrativo
      if (this.isAdminState(currentState)) {
        console.log('✅ Mensaje procesado por estar en modo administrativo')
        return true
      }

      // 🔐 EXCEPCIÓN ESPECIAL: Comandos administrativos detectados por Gemini
      if (intent && intent.suggested_response_type === 'admin_command') {
        console.log('✅ Mensaje procesado por comando administrativo detectado')
        return true
      }

      // Si Gemini detectó una intención válida con alta confianza, procesar siempre
      if (intent && intent.confidence === 'high' &&
          ['browsing', 'purchase_intent', 'asking_question', 'greeting', 'inquiring', 'interested'].includes(intent.intent)) {
        console.log('✅ Mensaje procesado por intención válida detectada:', intent.intent)
        return true
      }

      // Si hay productos mencionados, procesar siempre
      if (intent && intent.products_mentioned && intent.products_mentioned.length > 0) {
        console.log('✅ Mensaje procesado por productos mencionados')
        return true
      }

      // Para el resto, aplicar filtros normales
      const passesFilters = await this.passesMessageFilters(messageText, currentState, from)
      return passesFilters

    } catch (error) {
      console.error('Error validando mensaje inteligente:', error)
      return true // En caso de error, procesar el mensaje
    }
  }

  async isWithinBusinessHours(from) {
    try {
      const scheduleEnabled = await this.db.getConfig('schedule_enabled')
      if (scheduleEnabled !== 'true') {
        return true // Si no está habilitado, siempre está dentro del horario
      }

      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

      const startTime = await this.db.getConfig('schedule_start_time') || '09:00'
      const endTime = await this.db.getConfig('schedule_end_time') || '17:00'

      if (currentTime >= startTime && currentTime <= endTime) {
        return true
      } else {
        // Enviar mensaje automático fuera de horario
        const outOfHoursMessage = await this.db.getConfig('schedule_out_of_hours_message') ||
          'Gracias por contactarnos. Te responderemos en nuestro horario de atención.'

        // Solo enviar si no hemos enviado este mensaje recientemente
        const lastMessage = await this.getLastMessage(from)
        if (!lastMessage || lastMessage !== outOfHoursMessage) {
          await this.sendMessage(from, outOfHoursMessage)
          await this.addToHistory(from, 'assistant', outOfHoursMessage)
        }

        return false
      }
    } catch (error) {
      console.error('Error verificando horario:', error)
      return true
    }
  }

  async passesMessageFilters(messageText, currentState, from) {
    try {
      // Si estamos en un estado específico de conversación (no inicial), no aplicar filtros estrictos
      if (currentState !== this.STATES.INITIAL) {
        // Para conversaciones ya establecidas, solo filtrar contenido realmente problemático
        const filterEmojisEnabled = await this.db.getConfig('filter_ignore_emojis_enabled')

        if (filterEmojisEnabled === 'true') {
          // 🧠 VERIFICAR SI ES RESPUESTA A PREGUNTA ESPECÍFICA DEL AGENTE
          const isRespondingToQuestion = this.isRespondingToAgentQuestion(from, messageText)

          if (!isRespondingToQuestion && this.isOnlyEmojisOrStickers(messageText)) {
            console.log('🚫 Mensaje filtrado: solo contiene emojis/stickers')
            return false
          }

          if (isRespondingToQuestion) {
            console.log('✅ Mensaje permitido: respuesta a pregunta específica del agente')
          }
        }

        return true // Permitir todos los demás mensajes en conversaciones establecidas
      }

      // Solo para conversaciones nuevas (INITIAL), aplicar filtros estrictos
      const filterGreetingsEnabled = await this.db.getConfig('filter_greetings_only_enabled')
      const filterEmojisEnabled = await this.db.getConfig('filter_ignore_emojis_enabled')

      // Filtro: Solo responder a saludos/preguntas (SOLO para conversaciones nuevas)
      if (filterGreetingsEnabled === 'true') {
        if (!this.isGreetingOrQuestion(messageText)) {
          console.log('🚫 Mensaje filtrado: no es saludo ni pregunta (conversación nueva)')
          return false
        }
      }

      // Filtro: Ignorar mensajes con solo emojis/stickers
      if (filterEmojisEnabled === 'true') {
        // 🧠 VERIFICAR SI ES RESPUESTA A PREGUNTA ESPECÍFICA DEL AGENTE
        const isRespondingToQuestion = await this.isRespondingToAgentQuestion(from, messageText)

        if (!isRespondingToQuestion && this.isOnlyEmojisOrStickers(messageText)) {
          console.log('🚫 Mensaje filtrado: solo contiene emojis/stickers')
          return false
        }

        if (isRespondingToQuestion) {
          console.log('✅ Mensaje permitido: respuesta a pregunta específica del agente')
        }
      }

      return true
    } catch (error) {
      console.error('Error aplicando filtros:', error)
      return true
    }
  }

  isGreetingOrQuestion(message) {
    const greetings = [
      'hola', 'hello', 'hi', 'buenas', 'buenos días', 'buenas tardes', 'buenas noches',
      'saludos', 'que tal', 'qué tal', 'como estas', 'cómo estás'
    ]

    const questionWords = [
      '?', 'que', 'qué', 'como', 'cómo', 'cuando', 'cuándo', 'donde', 'dónde',
      'por que', 'por qué', 'para que', 'para qué', 'cuanto', 'cuánto',
      'cual', 'cuál', 'quiero', 'necesito', 'busco', 'me interesa'
    ]

    // Palabras que indican solicitud/pregunta (aunque no tengan ?)
    const requestWords = [
      'podrías', 'podrias', 'puedes', 'puedas', 'mostrar', 'mostrarme', 'muestra', 'muestrame',
      'enseñar', 'enseñarme', 'enseña', 'enseñame', 'ver', 'mirar', 'revisar', 'conocer',
      'saber', 'información', 'informacion', 'detalles', 'precio', 'precios',
      'disponible', 'disponibles', 'stock', 'tienes', 'tienen', 'hay',
      'venden', 'vendes', 'ofrecen', 'ofreces', 'manejan', 'manejas',
      'dame', 'dime', 'enviame', 'envíame', 'comprar', 'compro', 'adquirir',
      'conseguir', 'obtener', 'solicitar', 'pedir', 'solicito', 'pido'
    ]

    const messageLower = message.toLowerCase()

    // Verificar saludos
    if (greetings.some(greeting => messageLower.includes(greeting))) {
      return true
    }

    // Verificar palabras de pregunta tradicionales
    if (questionWords.some(question => messageLower.includes(question))) {
      return true
    }

    // Verificar palabras de solicitud/petición (NUEVA LÓGICA)
    if (requestWords.some(request => messageLower.includes(request))) {
      return true
    }

    // Verificar patrones de pregunta sin ? (NUEVA LÓGICA)
    const questionPatterns = [
      /^(me|nos)\s+(puedes|podrias|podrías)/,  // "me puedes", "nos podrías"
      /^(puedes|podrias|podrías)/,             // "puedes mostrar"
      /\b(mostrar|enseñar|ver)\b/,             // contiene "mostrar", "enseñar", "ver"
      /\b(precio|precios|costo|costos)\b/,     // pregunta por precios
      /\b(disponible|disponibles|stock)\b/,    // pregunta por disponibilidad
      /\b(tienes|tienen|hay)\b/                // pregunta por existencia
    ]

    return questionPatterns.some(pattern => pattern.test(messageLower))
  }

  /**
   * 🧠 Detectar si el cliente está respondiendo a una pregunta específica del agente
   */
  async isRespondingToAgentQuestion(from, message) {
    const lastMessage = await this.getLastMessage(from)
    const currentState = await this.getConversationState(from)
    const userMessage = message.trim()

    // 🎯 CONTEXTO CRÍTICO: Si está en estado INTERESTED y responde con número
    if (currentState === this.STATES.INTERESTED) {
      const isNumericResponse = /^\d+$/.test(userMessage)
      if (isNumericResponse) {
        // Verificar si hay productos de interés en el contexto
        const conversationData = this.getConversationData(from)
        const hasInterestedProducts = conversationData?.interested_products?.length > 0

        if (hasInterestedProducts) {
          console.log(`🧠 Respuesta numérica en estado INTERESTED con productos en contexto: "${userMessage}" - PERMITIR`)
          return true
        }

        console.log(`🧠 Respuesta numérica en estado INTERESTED: "${userMessage}" - PERMITIR`)
        return true
      }
    }

    // 🎯 CONTEXTO CRÍTICO: Si está en estado SPECIFYING (especificando cantidad)
    if (currentState === this.STATES.SPECIFYING) {
      const isNumericResponse = /^\d+$/.test(userMessage)
      if (isNumericResponse) {
        console.log(`🧠 Respuesta numérica en estado SPECIFYING: "${userMessage}" - PERMITIR`)
        return true
      }
    }

    if (!lastMessage) return false

    const messageLower = lastMessage.toLowerCase()

    // Detectar preguntas sobre cantidad
    const quantityQuestions = [
      /cuántas?\s+unidades?/i,
      /cuántos?\s+quieres?/i,
      /qué\s+cantidad/i,
      /cuántos?\s+te\s+gustaría/i,
      /cuántas?\s+necesitas?/i,
      /excelente\s+elección.*cuántas/i,
      /responde\s+con\s+la\s+cantidad/i
    ]

    // Detectar respuestas numéricas a preguntas de cantidad
    if (quantityQuestions.some(pattern => pattern.test(messageLower))) {
      const isNumericResponse = /^\d+$/.test(userMessage)
      if (isNumericResponse) {
        console.log(`🧠 Respuesta numérica detectada a pregunta de cantidad: "${userMessage}"`)
        return true
      }
    }

    // Detectar otras preguntas específicas del agente
    const specificQuestions = [
      /cuál\s+prefieres?/i,
      /qué\s+color/i,
      /qué\s+modelo/i,
      /cuál\s+te\s+interesa/i,
      /confirmas?\s+tu\s+pedido/i,
      /está\s+correcto/i
    ]

    if (specificQuestions.some(pattern => pattern.test(messageLower))) {
      // Si es una respuesta corta a una pregunta específica, probablemente es válida
      if (userMessage.length <= 10 && userMessage.length > 0) {
        console.log(`🧠 Respuesta corta detectada a pregunta específica: "${userMessage}"`)
        return true
      }
    }

    return false
  }

  isOnlyEmojisOrStickers(message) {
    // Regex para detectar solo emojis, espacios y caracteres especiales
    const emojiRegex = /^[\s\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]*$/u

    // También considerar mensajes muy cortos sin letras
    const hasLetters = /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(message)

    return emojiRegex.test(message) || (!hasLetters && message.trim().length < 3)
  }

  async getLastMessage(from) {
    try {
      // 🔧 MIGRADO A SUPABASE: Obtener último mensaje del asistente
      const { data, error } = await this.db.client
        .from('conversation_history')
        .select('message')
        .eq('client_id', from)
        .eq('role', 'assistant')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error obteniendo último mensaje:', error)
        return null
      }
      
      return data?.message || null
    } catch (error) {
      console.error('Error en getLastMessage:', error)
      return null
    }
  }

  /**
   * 💾 OBTENER PEDIDO PENDIENTE DESDE SUPABASE (reemplaza Maps)
   */
  async getPendingOrderFromSupabase(clientId) {
    try {
      // Buscar el último pedido pendiente de pago para este cliente
      const { data, error } = await this.db.client
        .from('orders')
        .select('*')
        .eq('cliente_whatsapp', clientId)
        .eq('status', 'pendiente_pago')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error obteniendo pedido pendiente:', error)
        return null
      }

      if (!data) {
        return null
      }

      // Convertir al formato esperado por el sistema
      return {
        orderId: data.id,
        total: data.total,
        customerName: data.customer_name,
        productos: data.products || []
      }

    } catch (error) {
      console.error('Error en getPendingOrderFromSupabase:', error)
      return null
    }
  }

  // Detectar solicitudes de categorías específicas
  async detectarSolicitudCategoria(messageText) {
    try {
      const messageLower = messageText.toLowerCase()

      // Obtener categorías disponibles
      const categorias = await this.inventory.getCategories()

      // Patrones de solicitud de categoría
      const patronesSolicitud = [
        /(?:muestra|enseña|ver|mira|busco|quiero|necesito|tienes|hay)\s*(?:algo\s*(?:de|en))?\s*([a-záéíóúñ]+)/i,
        /(?:que|qué)\s*(?:tienes|hay|vendes|manejas)\s*(?:de|en)?\s*([a-záéíóúñ]+)/i,
        /([a-záéíóúñ]+)\s*(?:por favor|porfavor)?$/i,
        /(?:categoria|categoría)\s*(?:de)?\s*([a-záéíóúñ]+)/i
      ]

      // Buscar coincidencias con patrones
      for (const patron of patronesSolicitud) {
        const match = messageLower.match(patron)
        if (match && match[1]) {
          const palabraClave = match[1].trim()

          // Buscar coincidencia con categorías existentes
          for (const categoria of categorias) {
            const categoriaLower = categoria.toLowerCase()

            // Coincidencia exacta
            if (categoriaLower === palabraClave) {
              return categoria
            }

            // Coincidencia parcial más estricta
            // Solo si la palabra clave tiene al menos 4 caracteres y coincide significativamente
            if (palabraClave.length >= 4) {
              // La categoría contiene la palabra clave completa
              if (categoriaLower.includes(palabraClave)) {
                return categoria
              }
              // La palabra clave contiene la categoría completa (ej: "electronica" contiene "electro")
              if (palabraClave.includes(categoriaLower) && categoriaLower.length >= 4) {
                return categoria
              }
            }

            // Coincidencias específicas para categorías comunes
            if (this.esCategoriaRelacionada(palabraClave, categoriaLower)) {
              return categoria
            }
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error detectando solicitud de categoría:', error)
      return null
    }
  }

  // Verificar si una palabra clave está relacionada con una categoría
  esCategoriaRelacionada(palabraClave, categoria) {
    const relaciones = {
      'ropa': ['moda', 'vestimenta', 'clothing'],
      'zapatos': ['calzado', 'zapatillas', 'deportes'],
      'zapatillas': ['deportes', 'calzado', 'zapatos'],
      'tecnologia': ['electronica', 'electrónica', 'tech'],
      'electronica': ['tecnologia', 'tecnología', 'tech'],
      'casa': ['hogar', 'decoracion', 'decoración'],
      'hogar': ['casa', 'decoracion', 'decoración'],
      'decoracion': ['hogar', 'casa', 'deco'],
      'deporte': ['deportes', 'fitness', 'gym'],
      'deportes': ['deporte', 'fitness', 'gym'],
      'lujo': ['premium', 'exclusivo', 'luxury'],
      'premium': ['lujo', 'exclusivo', 'luxury']
    }

    // Verificar relaciones bidireccionales
    if (relaciones[palabraClave]) {
      return relaciones[palabraClave].includes(categoria)
    }

    // Verificar relaciones inversas
    for (const [key, values] of Object.entries(relaciones)) {
      if (values.includes(palabraClave) && key === categoria) {
        return true
      }
    }

    return false
  }

  // Detectar si el cliente solicita la lista de categorías
  async esSolicitudListaCategorias(messageText) {
    const messageLower = messageText.toLowerCase()

    // Patrones que indican solicitud de lista de categorías
    const patronesListaCategorias = [
      /(?:que|qué)\s*(?:otras?)?\s*categorías?\s*(?:tienes|hay|manejas|vendes)/i,
      /(?:cuales|cuáles)\s*(?:son\s*las\s*)?categorías?\s*(?:tienes|hay|manejas|vendes)/i,
      /(?:muestra|enseña|dime)\s*(?:todas\s*las\s*)?categorías?\s*(?:que\s*tienes|disponibles)/i,
      /(?:lista|listado)\s*(?:de\s*)?categorías?/i,
      /(?:todas\s*las\s*)?categorías?\s*(?:disponibles|que\s*tienes)/i,
      /(?:opciones|alternativas)\s*(?:de\s*categorías?|disponibles)/i
    ]

    return patronesListaCategorias.some(patron => patron.test(messageLower))
  }

  // Mostrar lista completa de categorías
  async mostrarListaCategorias(from, customerName) {
    try {
      console.log(`📋 Mostrando lista de categorías a ${from}`)

      // Obtener todas las categorías disponibles
      const categorias = await this.inventory.getCategories()

      if (!categorias || categorias.length === 0) {
        await this.sendMessage(from, `${customerName}, disculpa pero no tengo categorías disponibles en este momento. 😅`)
        return
      }

      // Crear mensaje con todas las categorías
      let mensaje = `¡Perfecto ${customerName}! 😊\n\n`
      mensaje += `🏪 **Estas son todas nuestras categorías disponibles:**\n\n`

      categorias.forEach((categoria, index) => {
        mensaje += `${index + 1}. 🏷️ **${categoria}**\n`
      })

      mensaje += `\n💡 **¿Cómo funciona?**\n`
      mensaje += `Solo dime el nombre de la categoría que te interesa y te mostraré todos los productos disponibles.\n\n`
      
      // 🔥 SOLUCIÓN: Usar categorías dinámicas del inventario real
      if (categorias.length >= 2) {
        mensaje += `Por ejemplo: *"Muéstrame ${categorias[0]}"* o *"Qué tienes en ${categorias[1]}"*\n\n`
      } else if (categorias.length === 1) {
        mensaje += `Por ejemplo: *"Muéstrame ${categorias[0]}"*\n\n`
      } else {
        mensaje += `Solo escribe el nombre de la categoría que te interesa.\n\n`
      }
      
      mensaje += `¿Cuál categoría te llama la atención? 🛍️`

      await this.sendMessage(from, mensaje)

    } catch (error) {
      console.error('Error mostrando lista de categorías:', error)
      await this.sendMessage(from, `${customerName}, disculpa pero hubo un error al cargar las categorías. Por favor intenta de nuevo. 😅`)
    }
  }

  // 🎭 NUEVO MÉTODO: Manejar respuestas emocionales
  async handleEmotionalResponse(from, messageText, intent, customerName, currentState) {
    try {
      console.log(`🎭 MANEJANDO respuesta emocional para ${customerName}: ${intent.emotional_state}`)

      // Verificar si necesita respuesta emocional
      if (!intent.needs_emotional_response) {
        console.log('🎭 No necesita respuesta emocional, usando respuesta general')
        await this.handleGeneralResponse(from, messageText, customerName, [], currentState, [])
        return
      }

      // Generar respuesta emocional empática
      const emotionalResponse = await this.gemini.generateEmotionalResponse(
        messageText,
        customerName,
        intent.emotional_state,
        intent.emotional_keywords || [],
        currentState
      )

      // Enviar respuesta emocional
      await this.sendMessage(from, emotionalResponse)
      this.addToHistory(from, 'assistant', emotionalResponse)

      // 🎯 ESTABLECER ESTADO TEMPORAL EMOTIONAL_SUPPORT
      this.setConversationState(from, this.STATES.EMOTIONAL_SUPPORT, {
        emotional_state: intent.emotional_state,
        emotional_start_time: Date.now(),
        previous_state: currentState,
        emotional_interaction_count: 1
      })

      // ⏰ CONFIGURAR TIMEOUT AUTOMÁTICO (2 minutos)
      this.setEmotionalTimeout(from)

      console.log(`🎭 Cliente ${customerName} en estado emocional: ${intent.emotional_state}`)

    } catch (error) {
      console.error('Error manejando respuesta emocional:', error)
      // Fallback a respuesta general si falla
      await this.handleGeneralResponse(from, messageText, customerName, [], currentState, [])
    }
  }

  // 🎭 Configurar timeout automático para estado emocional
  setEmotionalTimeout(from) {
    // Limpiar timeout existente si existe
    if (this.emotionalTimeouts.has(from)) {
      clearTimeout(this.emotionalTimeouts.get(from))
    }

    // Configurar nuevo timeout de 2 minutos
    const timeout = setTimeout(() => {
      console.log(`⏰ Timeout emocional para ${from} - regresando a BROWSING`)
      this.returnFromEmotionalState(from)
    }, 2 * 60 * 1000) // 2 minutos

    this.emotionalTimeouts.set(from, timeout)
  }

  // 🎭 Regresar del estado emocional a ventas
  async returnFromEmotionalState(from) {
    try {
      const conversationData = this.getConversationData(from)
      const previousState = conversationData.previous_state || this.STATES.BROWSING

      // Limpiar timeout
      if (this.emotionalTimeouts.has(from)) {
        clearTimeout(this.emotionalTimeouts.get(from))
        this.emotionalTimeouts.delete(from)
      }

      // Regresar al estado anterior (generalmente BROWSING)
      this.setConversationState(from, previousState, {
        ...conversationData,
        emotional_state: null,
        emotional_start_time: null,
        previous_state: null,
        emotional_interaction_count: null
      })

      console.log(`🎭 Cliente ${from} regresó de estado emocional a ${previousState}`)

    } catch (error) {
      console.error('Error regresando de estado emocional:', error)
      // Fallback seguro
      this.setConversationState(from, this.STATES.BROWSING)
    }
  }

  // 🎭 Verificar si el cliente está en estado emocional y manejar transición
  async checkEmotionalStateTransition(from, intent, currentState) {
    if (currentState === this.STATES.EMOTIONAL_SUPPORT) {
      const conversationData = this.getConversationData(from)
      const interactionCount = conversationData.emotional_interaction_count || 0

      // Si ya tuvo 2 interacciones emocionales O la nueva intención no es emocional
      if (interactionCount >= 2 || !intent.needs_emotional_response) {
        console.log(`🎭 Transición automática: ${interactionCount >= 2 ? 'máximo alcanzado' : 'intención no emocional'}`)
        await this.returnFromEmotionalState(from)
        return true // Indica que hubo transición
      } else {
        // Incrementar contador de interacciones emocionales
        this.setConversationState(from, this.STATES.EMOTIONAL_SUPPORT, {
          ...conversationData,
          emotional_interaction_count: interactionCount + 1
        })
        return false // Continúa en estado emocional
      }
    }
    return false // No está en estado emocional
  }

  // 🚚 Manejar dirección de envío y comprobante de pago
  async handleShippingAndPayment(from, messageText, conversationData) {
    try {
      const customerName = await this.getCustomerName(from)

      // Verificar si ya tiene dirección guardada
      const hasShippingAddress = conversationData.shipping_address && conversationData.shipping_address.trim() !== ''

      // Si no tiene dirección, guardar este mensaje como dirección
      if (!hasShippingAddress) {
        // Validar que el mensaje parece una dirección (más de 10 caracteres)
        if (messageText.trim().length < 10) {
          await this.sendMessage(from,
            `📍 Por favor, proporciona tu dirección completa de envío.\n\n` +
            `Incluye: calle, número, distrito, ciudad y cualquier referencia importante.\n\n` +
            `Ejemplo: "Av. Los Olivos 123, Dpto 4B, San Isidro, Lima - Frente al parque"`
          )
          return
        }

        // Guardar dirección en conversación
        this.setConversationState(from, this.STATES.AWAITING_SHIPPING, {
          ...conversationData,
          shipping_address: messageText.trim()
        })

        // Actualizar dirección en base de datos si ya hay un pedido
        if (conversationData.order_id) {
          await this.orders.db.updateShippingAddress(conversationData.order_id, messageText.trim())
        }

        await this.sendMessage(from,
          `✅ *Dirección de envío recibida:*\n${messageText.trim()}\n\n` +
          `📷 Ahora envía la captura de pantalla de tu pago por Yape para completar tu pedido. 💳`
        )
        return
      }

      // Si ya tiene dirección, verificar si quiere cambiarla
      const messageTextLower = messageText.toLowerCase()

      // Verificar si el cliente quiere cambiar la dirección
      if (messageTextLower.includes('cambiar dirección') || messageTextLower.includes('cambiar direccion')) {
        // Extraer la nueva dirección después de "cambiar dirección"
        const newAddress = messageText.replace(/cambiar direcci[óo]n/i, '').trim()

        if (newAddress.length >= 10) {
          // Actualizar con la nueva dirección
          this.setConversationState(from, this.STATES.AWAITING_SHIPPING, {
            ...conversationData,
            shipping_address: newAddress
          })

          if (conversationData.order_id) {
            await this.orders.db.updateShippingAddress(conversationData.order_id, newAddress)
          }

          await this.sendMessage(from,
            `✅ *Dirección actualizada:*\n${newAddress}\n\n` +
            `📷 Ahora envía la captura de pantalla de tu pago por Yape para completar tu pedido. 💳`
          )
          return
        } else {
          await this.sendMessage(from,
            `📍 Por favor, proporciona la nueva dirección completa después de "cambiar dirección".\n\n` +
            `Ejemplo: "cambiar dirección Av. Los Olivos 123, San Isidro, Lima"`
          )
          return
        }
      }

      // Si el mensaje parece una nueva dirección (más de 10 caracteres y contiene números/calles)
      if (messageText.trim().length >= 10 &&
          (messageText.match(/\d+/) || messageText.toLowerCase().includes('av') ||
           messageText.toLowerCase().includes('calle') || messageText.toLowerCase().includes('jr') ||
           messageText.toLowerCase().includes('urbanización') || messageText.toLowerCase().includes('urbanizacion'))) {

        // Preguntar si quiere actualizar la dirección
        await this.sendMessage(from,
          `📍 *Dirección actual:* ${conversationData.shipping_address}\n\n` +
          `🔄 *Nueva dirección detectada:* ${messageText.trim()}\n\n` +
          `¿Quieres actualizar tu dirección de envío?\n\n` +
          `Responde:\n` +
          `• "Sí" para usar la nueva dirección\n` +
          `• "No" para mantener la actual`
        )

        // Guardar la nueva dirección propuesta temporalmente
        this.setConversationState(from, this.STATES.AWAITING_SHIPPING, {
          ...conversationData,
          proposed_address: messageText.trim()
        })
        return
      }

      // Si el cliente responde "sí" o "no" a la pregunta de cambio de dirección
      if (conversationData.proposed_address &&
          (messageTextLower === 'sí' || messageTextLower === 'si' || messageTextLower === 'yes')) {

        // Actualizar con la dirección propuesta
        this.setConversationState(from, this.STATES.AWAITING_SHIPPING, {
          ...conversationData,
          shipping_address: conversationData.proposed_address,
          proposed_address: undefined // Limpiar la propuesta
        })

        if (conversationData.order_id) {
          await this.orders.db.updateShippingAddress(conversationData.order_id, conversationData.proposed_address)
        }

        await this.sendMessage(from,
          `✅ *Dirección actualizada:*\n${conversationData.proposed_address}\n\n` +
          `📷 Ahora envía la captura de pantalla de tu pago por Yape para completar tu pedido. 💳`
        )
        return
      }

      if (conversationData.proposed_address &&
          (messageTextLower === 'no' || messageTextLower === 'nope')) {

        // Mantener la dirección actual
        this.setConversationState(from, this.STATES.AWAITING_SHIPPING, {
          ...conversationData,
          proposed_address: undefined // Limpiar la propuesta
        })

        await this.sendMessage(from,
          `✅ *Dirección confirmada:*\n${conversationData.shipping_address}\n\n` +
          `📷 Ahora envía la captura de pantalla de tu pago por Yape para completar tu pedido. 💳`
        )
        return
      }

      // Si ya tiene dirección y no es una actualización, recordar el proceso
      await this.sendMessage(from,
        `📍 *Dirección registrada:* ${conversationData.shipping_address}\n\n` +
        `📷 Por favor, envía la captura de pantalla de tu pago por Yape para procesar tu pedido. 💳\n\n` +
        `Si necesitas cambiar la dirección, escribe "cambiar dirección" seguido de la nueva dirección.`
      )

    } catch (error) {
      console.error('Error manejando dirección de envío:', error)
      await this.sendMessage(from, 'Hubo un problema procesando tu información. ¿Podrías intentar de nuevo? 😊')
    }
  }

  // 📞 NUEVA FUNCIONALIDAD: Manejo de solicitud de especialista
  async handleSpecialistRequest(from, conversationData, customerName) {
    try {
      console.log(`📞 Iniciando proceso de atención especializada para ${customerName}`)

      // Crear pedido en estado pendiente con nota de especialista
      const pendingOrder = conversationData.pending_order
      if (pendingOrder && pendingOrder.products && pendingOrder.products.length > 0) {

        // Buscar productos en inventario para obtener detalles completos
        const products = await this.inventory.getAllProducts()
        const productDetails = pendingOrder.products.map(sp => {
          const product = products.find(p => p.id === sp.id || p.nombre.toLowerCase().includes(sp.name.toLowerCase()))
          return product ? {
            id: product.id,
            nombre: product.nombre,
            precio: product.precio,
            cantidad: pendingOrder.quantity || 1
          } : null
        }).filter(Boolean)

        if (productDetails.length > 0) {
          const total = productDetails.reduce((sum, p) => sum + (p.precio * p.cantidad), 0)

          // Crear pedido con estado pendiente y nota especialista
          const orderData = {
            cliente_whatsapp: from,
            cliente_nombre: customerName,
            productos: productDetails,
            total: total,
            estado: 'pendiente',
            notas: `🎯 ATENCIÓN ESPECIALIZADA SOLICITADA - Cliente requiere contacto telefónico personalizado`
          }

          const newOrder = await this.orders.createOrder(orderData)
          console.log(`📋 Pedido especialista creado: ${newOrder.id} para ${customerName}`)

          // Marcar como procesado para evitar duplicados
          this.setConversationState(from, this.STATES.AWAITING_SPECIALIST, {
            ...conversationData,
            order_processed: true,
            specialist_order_id: newOrder.id
          })

          // Solicitar datos de contacto al cliente
          const contactMessage = `📞 *Atención Personalizada Activada*

¡Perfecto ${customerName}! Hemos registrado tu interés en:

${productDetails.map(p => `📦 ${p.cantidad}x ${p.nombre} - S/ ${p.precio} c/u`).join('\n')}

💵 Total: S/ ${total.toFixed(2)}

Para brindarte una atención más personalizada, necesitamos:

📱 *Tu número de contacto*
🕐 *Horario preferido para llamarte*
💬 *Mensaje adicional* (opcional - cualquier detalle importante)

Por favor, envía esta información en un solo mensaje.
Ejemplo: "999888777 - Disponible de 9am a 6pm - Necesito instalación urgente"`

          await this.sendMessage(from, contactMessage)
          this.addToHistory(from, 'assistant', contactMessage)

        } else {
          await this.sendMessage(from, 'Hubo un problema con los productos. ¿Podrías especificar nuevamente qué necesitas? 🤖')
        }
      } else {
        await this.sendMessage(from, 'No encontré un pedido pendiente. ¿Qué producto te interesa? 🤖')
      }

    } catch (error) {
      console.error('Error en handleSpecialistRequest:', error)
      await this.sendMessage(from, 'Hubo un problema procesando tu solicitud. Por favor, intenta nuevamente. 🤖')
    }
  }

  // 📞 Manejo de datos de contacto para especialista
  async handleSpecialistContactData(from, messageText, conversationData, customerName) {
    try {
      console.log(`📞 Procesando datos de contacto de especialista para ${customerName}`)

      // Obtener configuración del especialista
      const specialistPhone = await this.db.getConfig('specialist_phone')
      const specialistName = await this.db.getConfig('specialist_name') || 'Especialista'

      console.log(`🔍 DEBUG - Número especialista configurado: "${specialistPhone}"`)

      if (!specialistPhone || specialistPhone.trim() === '') {
        console.error('❌ No hay número de especialista configurado')
        await this.sendMessage(from, 'Lo siento, el servicio de atención especializada no está disponible en este momento. ¿Deseas proceder con tu pedido normalmente? 😊')
        return
      }

      // 🔧 FORMATEAR NÚMERO DEL ESPECIALISTA CORRECTAMENTE
      const formattedSpecialistPhone = this.formatPhoneNumber(specialistPhone)
      console.log(`🔧 Número especialista formateado: "${formattedSpecialistPhone}"`)

      if (!formattedSpecialistPhone) {
        console.error('❌ Número de especialista inválido:', specialistPhone)
        await this.sendMessage(from, 'Lo siento, hay un problema con la configuración del especialista. Por favor, contacta al administrador. 😊')
        return
      }

      // Obtener detalles del pedido
      const orderId = conversationData.specialist_order_id
      const pendingOrder = conversationData.pending_order

      if (pendingOrder && pendingOrder.products) {
        const products = await this.inventory.getAllProducts()
        const productDetails = pendingOrder.products.map(sp => {
          const product = products.find(p => p.id === sp.id || p.nombre.toLowerCase().includes(sp.name.toLowerCase()))
          return product ? {
            nombre: product.nombre,
            precio: product.precio,
            cantidad: pendingOrder.quantity || 1
          } : null
        }).filter(Boolean)

        const total = productDetails.reduce((sum, p) => sum + (p.precio * p.cantidad), 0)

        // Procesar datos de contacto del cliente de forma inteligente
        const contactInfo = messageText.trim()

        // Función para extraer número de teléfono
        const extractPhoneNumber = (text) => {
          const phoneRegex = /(\d{9,11})/
          const match = text.match(phoneRegex)
          return match ? match[1] : 'No especificado'
        }

        // Función para extraer horario/disponibilidad
        const extractAvailability = (text) => {
          const availabilityPatterns = [
            /disponible\s+de\s+([^y]+)/i,
            /horario[:\s]+([^y]+)/i,
            /de\s+(\d+[:\s]*[ap]?m?\s*a\s*\d+[:\s]*[ap]?m?)/i
          ]

          for (const pattern of availabilityPatterns) {
            const match = text.match(pattern)
            if (match) {
              return match[1].trim()
            }
          }
          return 'No especificado'
        }

        // Función para extraer mensaje adicional
        const extractAdditionalMessage = (text) => {
          const additionalPatterns = [
            /y\s+(.+)/i,
            /requiero\s+(.+)/i,
            /necesito\s+(.+)/i,
            /urgente\s*(.*)$/i
          ]

          for (const pattern of additionalPatterns) {
            const match = text.match(pattern)
            if (match && match[1].trim()) {
              return match[1].trim()
            }
          }
          return 'Ningún mensaje adicional'
        }

        // Procesar con separadores tradicionales primero
        let phoneNumber, availability, additionalMessage

        if (contactInfo.includes(' - ')) {
          // Formato tradicional con separadores
          const contactParts = contactInfo.split(' - ')
          phoneNumber = contactParts[0] || 'No especificado'
          availability = contactParts[1] || 'No especificado'
          additionalMessage = contactParts[2] || 'Ningún mensaje adicional'
        } else {
          // Procesamiento inteligente sin separadores
          phoneNumber = extractPhoneNumber(contactInfo)
          availability = extractAvailability(contactInfo)
          additionalMessage = extractAdditionalMessage(contactInfo)
        }

        // Mensaje para el especialista
        const specialistMessage = `🎯 *NUEVA SOLICITUD DE ATENCIÓN ESPECIALIZADA*

👤 *Cliente:* ${customerName}
📱 *WhatsApp:* ${from}
📋 *Pedido ID:* ${orderId}

*PRODUCTOS SOLICITADOS:*
${productDetails.map(p => `📦 ${p.cantidad}x ${p.nombre} - S/ ${p.precio} c/u`).join('\n')}

💵 *Total:* S/ ${total.toFixed(2)}

📞 *DATOS DE CONTACTO DEL CLIENTE:*
📱 Teléfono: ${phoneNumber}
🕐 Disponibilidad: ${availability}
💬 Mensaje adicional: ${additionalMessage}

⏰ *Fecha solicitud:* ${new Date().toLocaleString('es-PE')}

Por favor, contacta al cliente en la brevedad posible para brindar atención personalizada.`

        // Enviar mensaje al especialista
        const specialistWhatsAppId = formattedSpecialistPhone + '@s.whatsapp.net'
        console.log(`📤 Enviando mensaje al especialista: ${specialistWhatsAppId}`)

        await this.sendMessage(specialistWhatsAppId, specialistMessage)
        console.log(`✅ Datos enviados exitosamente al especialista ${specialistName} (${formattedSpecialistPhone})`)

        // Confirmar al cliente
        const clientConfirmation = `✅ *Información Derivada Exitosamente*

Gracias ${customerName}, tus datos de contacto han sido enviados a nuestro agente ${specialistName}.

📞 Te contactaremos en la brevedad posible en el horario que indicaste para brindarte una atención personalizada sobre tu pedido.

📋 *Número de pedido:* ${orderId}

¡Gracias por elegirnos! 😊`

        await this.sendMessage(from, clientConfirmation)
        this.addToHistory(from, 'assistant', clientConfirmation)

        // Finalizar conversación
        this.setConversationState(from, this.STATES.COMPLETED, {
          ...conversationData,
          specialist_contacted: true,
          completion_reason: 'specialist_request'
        })

      } else {
        await this.sendMessage(from, 'Hubo un problema con los datos del pedido. ¿Podrías intentar nuevamente? 😊')
      }

    } catch (error) {
      console.error('Error procesando datos de contacto especialista:', error)
      await this.sendMessage(from, 'Hubo un problema procesando tu información. Por favor, intenta nuevamente. 🤖')
    }
  }

  // 🔧 MÉTODO PARA FORMATEAR NÚMEROS DE TELÉFONO
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return null
    }

    // Limpiar el número: remover espacios, guiones, paréntesis
    let cleanNumber = phoneNumber.replace(/[\s\-\(\)\+]/g, '')

    // Si el número ya tiene código de país (51), mantenerlo
    if (cleanNumber.startsWith('51') && cleanNumber.length === 11) {
      return cleanNumber
    }

    // Si el número tiene 9 dígitos (número peruano sin código de país), agregar 51
    if (cleanNumber.length === 9 && cleanNumber.startsWith('9')) {
      return '51' + cleanNumber
    }

    // Si el número tiene 8 dígitos (número fijo peruano), agregar 51
    if (cleanNumber.length === 8) {
      return '51' + cleanNumber
    }

    // Si no coincide con ningún formato conocido, retornar null
    console.error(`❌ Formato de número no reconocido: ${phoneNumber} (limpio: ${cleanNumber})`)
    return null
  }

  // 🌟 NUEVA FUNCIÓN: Mostrar producto VIP específico de la campaña
  async showSpecificVipProduct(from, conversationData) {
    try {
      const customerName = conversationData.customer_name || 'Cliente'
      const offerId = conversationData.offer_id

      console.log(`🌟 Mostrando producto VIP específico para ${customerName}, oferta ID: ${offerId}`)

      if (!offerId) {
        console.log(`⚠️ No hay oferta ID en conversationData`)
        await this.sendMessage(from, `¡Perfecto ${customerName}! 🌟\n\nPor favor dime qué producto específico te interesa y te ayudo con los detalles de compra.`)
        return
      }

      // Obtener información específica de la oferta VIP
      const oferta = await this.db.getOfertaVip(offerId)

      if (!oferta || !oferta.producto_vip_info) {
        console.log(`⚠️ No se encontró oferta o producto VIP para ID: ${offerId}`)
        await this.sendMessage(from, `¡Perfecto ${customerName}! 🌟\n\nPor favor dime qué producto específico te interesa y te ayudo con los detalles de compra.`)
        return
      }

      const productoVip = oferta.producto_vip_info

      // 🌟 CREAR MENSAJE DETALLADO DEL PRODUCTO VIP ESPECÍFICO
      let mensaje = `🌟 *¡Excelente ${customerName}!* 🌟\n\n`
      mensaje += `Aquí tienes todos los detalles de tu producto VIP exclusivo:\n\n`

      mensaje += `📦 *${productoVip.nombre}*\n\n`

      if (productoVip.descripcion) {
        mensaje += `📝 ${productoVip.descripcion}\n\n`
      }

      // Precios y descuento
      if (productoVip.precio_original && productoVip.precio_vip) {
        const descuentoVip = Math.round(((productoVip.precio_original - productoVip.precio_vip) / productoVip.precio_original) * 100)
        mensaje += `💰 *Precio Normal:* S/ ${productoVip.precio_original}\n`
        mensaje += `🌟 *Tu Precio VIP:* S/ ${productoVip.precio_vip}\n`
        mensaje += `🎯 *Tu descuento VIP:* ${descuentoVip}%\n`
        mensaje += `💸 *Ahorras:* S/ ${(productoVip.precio_original - productoVip.precio_vip).toFixed(2)}\n\n`
      }

      // 🌟 INFORMACIÓN EXCLUSIVA VIP
      if (productoVip.stock_disponible !== undefined && productoVip.stock_disponible !== null) {
        mensaje += `📦 *Stock disponible para esta oferta:* ${productoVip.stock_disponible} unidades\n`
      }

      if (productoVip.limite_por_cliente !== undefined && productoVip.limite_por_cliente !== null) {
        mensaje += `👤 *Máximo por cliente:* ${productoVip.limite_por_cliente} unidades\n`
      }

      // Vigencia de la oferta
      if (productoVip.fecha_fin) {
        const fechaFin = new Date(productoVip.fecha_fin)
        const hoy = new Date()
        const diasRestantes = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24))

        if (diasRestantes > 0) {
          mensaje += `⏰ *Oferta válida por:* ${diasRestantes} días más\n`
        }
      }

      mensaje += `\n🛒 *¿Cuántas unidades quieres?*\n`
      mensaje += `Responde con la cantidad que deseas (ejemplo: "2 unidades" o simplemente "2")`

      await this.sendMessage(from, mensaje)

      // 🌟 ESTABLECER CONTEXTO ESPECÍFICO PARA COMPRA VIP
      this.setConversationState(from, this.STATES.SPECIFYING, {
        ...conversationData,
        selected_products: [{
          id: productoVip.id,
          name: productoVip.nombre,
          price: productoVip.precio_vip || productoVip.precio_original,
          precio_original: productoVip.precio_original,
          precio_vip: productoVip.precio_vip,
          stock_disponible: productoVip.stock_disponible,
          limite_por_cliente: productoVip.limite_por_cliente,
          es_producto_vip: true
        }],
        vip_product_context: true,
        offer_id: offerId
      })

    } catch (error) {
      console.error('Error mostrando producto VIP específico:', error)
      const customerName = conversationData.customer_name || 'Cliente'
      await this.sendMessage(from, `¡Perfecto ${customerName}! 🌟\n\nPor favor dime qué producto específico te interesa y te ayudo con los detalles de compra.`)
    }
  }

  // 🔍 FUNCIÓN FALTANTE: Mostrar productos filtrados por búsqueda semántica
  async showFilteredProducts(from, filteredProducts, customerName, searchQuery) {
    try {
      // ✅ LOG INTERNO: No exponer al cliente
      console.log(`🔍 [INTERNO] Mostrando ${filteredProducts.length} productos filtrados para ${customerName}`);
      
      if (filteredProducts.length === 0) {
        const response = await this.gemini.generateSalesResponse(
          `Cliente busca: "${searchQuery}". No se encontraron productos específicos. Ayúdalo ofreciendo alternativas.`,
          customerName,
          [],
          this.STATES.BROWSING,
          []
        );
        await this.sendMessage(from, response);
        this.addToHistory(from, 'assistant', response);
        return;
      }

      // 🎯 LÓGICA OPTIMIZADA: Si hay 1 producto, enviarlo directamente
      if (filteredProducts.length === 1) {
        const product = filteredProducts[0];
        await this.sendProductWithImage(from, product, '');
        
        // Generar respuesta informativa sobre el producto
        const response = await this.gemini.generateSalesResponse(
          `Cliente busca: "${searchQuery}". Mostrar información sobre ${product.nombre}. Responder informativamente.`,
          customerName,
          [product],
          this.STATES.INTERESTED,
          []
        );
        await this.sendMessage(from, response);
        this.addToHistory(from, 'assistant', response);
        return;
      }

      // 🎯 MÚLTIPLES PRODUCTOS: Mostrar mensaje introductorio
      const introResponse = `🔍 ¡Encontré ${filteredProducts.length} productos que coinciden con tu búsqueda! Te muestro las opciones:`;
      await this.sendMessage(from, introResponse);
      this.addToHistory(from, 'assistant', introResponse);
      
      // 📱 MOSTRAR CADA PRODUCTO INDIVIDUALMENTE CON IMÁGENES
      for (let i = 0; i < filteredProducts.length; i++) {
        const product = filteredProducts[i];
        
        // Delay entre productos para mejor experiencia
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          await this.sendTyping(from);
        }
        
        // Enviar producto con imagen y detalles
        const productMessage = `${i + 1}️⃣ *${product.nombre}*\n💰 Precio: S/ ${product.precio}\n📦 Stock: ${product.stock} disponibles${product.descripcion ? '\n📝 ' + product.descripcion : ''}`;
        await this.sendProductWithImage(from, product, productMessage);
      }
      
      // 🎯 PREGUNTA FINAL
      await new Promise(resolve => setTimeout(resolve, 1000));
      const finalQuestion = `🙋‍♂️ ¿Cuál de estos productos te interesa más? Puedes decirme el número o el nombre del modelo.`;
      await this.sendMessage(from, finalQuestion);
      this.addToHistory(from, 'assistant', finalQuestion);
      
    } catch (error) {
      console.error('Error mostrando productos filtrados:', error);
      
      // Fallback en caso de error
      const response = await this.gemini.generateSalesResponse(
        `Cliente busca: "${searchQuery}". Error mostrando productos. Ayúdalo de manera alternativa.`,
        customerName,
        filteredProducts,
        this.STATES.BROWSING,
        []
      );
      await this.sendMessage(from, response);
      this.addToHistory(from, 'assistant', response);
    }
  }

  // 🌟 NUEVA FUNCIÓN: Manejar intención de compra VIP específica
  async handleVipPurchaseIntent(from, messageText, conversationData) {
    try {
      const customerName = conversationData.customer_name || 'Cliente'

      console.log(`🌟 Manejando intención de compra VIP para ${customerName}: "${messageText}"`)

      // Detectar cantidad en el mensaje
      const quantityMatch = messageText.match(/(\d+)/)
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1

      // Validar límite por cliente si está definido
      const selectedProduct = conversationData.selected_products?.[0]
      if (selectedProduct && selectedProduct.limite_por_cliente) {
        if (quantity > selectedProduct.limite_por_cliente) {
          await this.sendMessage(from,
            `⚠️ Lo siento ${customerName}, el límite máximo por cliente para este producto VIP es de ${selectedProduct.limite_por_cliente} unidades.\n\n` +
            `¿Te gustaría comprar ${selectedProduct.limite_por_cliente} unidades?`
          )
          return
        }
      }

      // Validar stock disponible
      if (selectedProduct && selectedProduct.stock_disponible) {
        if (quantity > selectedProduct.stock_disponible) {
          await this.sendMessage(from,
            `⚠️ Lo siento ${customerName}, solo tenemos ${selectedProduct.stock_disponible} unidades disponibles para esta oferta VIP.\n\n` +
            `¿Te gustaría comprar ${selectedProduct.stock_disponible} unidades?`
          )
          return
        }
      }

      // Proceder con la confirmación
      await this.handleAskConfirmation(from, {
        products_mentioned: conversationData.selected_products,
        quantity_mentioned: quantity
      }, conversationData, customerName, conversationData.selected_products)

      this.setConversationState(from, this.STATES.CONFIRMING, {
        ...conversationData,
        pending_order: {
          products: conversationData.selected_products,
          quantity: quantity
        },
        order_processed: false
      })

    } catch (error) {
      console.error('Error manejando intención de compra VIP:', error)
      const customerName = conversationData.customer_name || 'Cliente'
      await this.sendMessage(from, `Hubo un problema procesando tu solicitud ${customerName}. ¿Podrías intentar de nuevo? 😊`)
    }
  }
  
  /**
   * 🚑 CORRECCIÓN CRÍTICA: Corregir flujo de cantidad antes de procesar
   * Evita que clientes VIP salten el paso de especificar cantidad
   */
  correctFlowForQuantityAsk(intent, currentState, conversationData, messageText) {
    const { suggested_response_type, intent: detectedIntent, is_explicit_confirmation, quantity_mentioned } = intent
    
    // 🔍 REGISTRO DETALLADO DEL FLUJO
    console.log(`🚑 ANALIZANDO CORRECCIÓN DE FLUJO: {`)
    console.log(`  suggested: '${suggested_response_type}',`)
    console.log(`  intent: '${detectedIntent}',`)
    console.log(`  state: '${currentState}',`)
    console.log(`  explicit: ${is_explicit_confirmation},`)
    console.log(`  quantity: ${quantity_mentioned},`)
    console.log(`  message: "${messageText}"`)
    console.log(`}`)
    
    // 🚑 REGLA #1: Cliente en INTERESTED dice "Quiero comprarlo" → Debe ir a ask_quantity
    if (currentState === this.STATES.INTERESTED && 
        detectedIntent === 'confirming' &&
        suggested_response_type === 'ask_confirmation' &&
        !quantity_mentioned &&
        /\b(quiero\s+comprar|comprarlo|lo\s+quiero|me\s+lo\s+llevo)\b/i.test(messageText)) {
      console.log(`🚑 CORRECCIÓN: INTERESTED + "quiero comprarlo" → ask_quantity (evitar salto)`)
      return 'ask_quantity'
    }
    
    // 🚑 REGLA #2: Cliente en BROWSING confirma compra sin cantidad → ask_quantity
    if (currentState === this.STATES.BROWSING && 
        detectedIntent === 'confirming' &&
        suggested_response_type === 'ask_confirmation' &&
        !quantity_mentioned) {
      console.log(`🚑 CORRECCIÓN: BROWSING + confirming sin cantidad → ask_quantity`)
      return 'ask_quantity'
    }
    
    // 🚑 REGLA #3: Si Gemini detecta productos VIP específicos, respetar su decisión
    if (intent.products_mentioned && intent.products_mentioned.length > 0) {
      const hasVipProducts = intent.products_mentioned.some(p => 
        p.isVip || (p.name && p.name.includes('VIP'))
      )
      
      if (hasVipProducts && suggested_response_type === 'ask_confirmation') {
        console.log(`🎆 EXCEPCIÓN VIP: Gemini detectó productos VIP - manteniendo ${suggested_response_type}`)
        return suggested_response_type
      }
    }
    
    // 🚑 REGLA DEFAULT: Mantener suggested_response_type original
    return suggested_response_type
  }
  
  /**
   * 🎯 SISTEMA DE FLUJO DE ESTADOS INTELIGENTE
   * Determina el siguiente paso correcto basado en el contexto y estado actual
   * CORRECCIÓN: Evitar saltar el estado specifying
   */
  determineCorrectFlowStep(intent, currentState, conversationData) {
    const { suggested_response_type, intent: detectedIntent, is_explicit_confirmation, quantity_mentioned } = intent
    
    console.log(`🎯 ANALIZANDO FLUJO:`, {
      suggested: suggested_response_type,
      intent: detectedIntent, 
      state: currentState,
      explicit: is_explicit_confirmation,
      quantity: quantity_mentioned
    })

    // 🚨 CORRECCIÓN CRÍTICA #1: Si cliente está en BROWSING y dice "quiero comprarlo"
    // → PERO SOLO si NO hay productos VIP detectados por Gemini
    if (currentState === this.STATES.BROWSING && 
        detectedIntent === 'confirming' &&
        (!intent.products_mentioned || intent.products_mentioned.length === 0)) {
      console.log(`🚨 CORRECCIÓN FLUJO: BROWSING + confirming sin productos específicos → ask_quantity`)
      return 'ask_quantity' // Forzar ir a preguntar cantidad
    }
    
    // 🎆 EXCEPCIÓN VIP: Si Gemini detectó productos VIP, respetar su suggested_response_type
    if (currentState === this.STATES.BROWSING && 
        detectedIntent === 'confirming' &&
        intent.products_mentioned && intent.products_mentioned.length > 0) {
      console.log(`🎆 FLUJO VIP: Gemini detectó productos VIP - usando suggested_response_type: ${suggested_response_type}`)
      return suggested_response_type // Usar detección inteligente de Gemini
    }

    // 🚨 CORRECCIÓN CRÍTICA #2: Si cliente está en INTERESTED y confirma sin cantidad
    // → SIEMPRE debe preguntar cantidad primero
    if (currentState === this.STATES.INTERESTED && 
        detectedIntent === 'confirming' && 
        !quantity_mentioned) {
      console.log(`🚨 CORRECCIÓN FLUJO: INTERESTED + confirming sin cantidad → ask_quantity`)
      return 'ask_quantity' // Forzar ir a preguntar cantidad
    }

    // ✅ Solo permitir confirmación directa si ya hay cantidad especificada
    if (suggested_response_type === 'ask_confirmation' &&
        currentState === this.STATES.SPECIFYING &&
        quantity_mentioned > 0) {
      console.log(`✅ FLUJO CORRECTO: SPECIFYING con cantidad → ask_confirmation`)
      return 'ask_confirmation'
    }

    // 🚨 CORRECCIÓN CRÍTICA #3: Si cliente está en CONFIRMING y confirma explícitamente
    // → Procesar pedido (process_order)
    if (currentState === this.STATES.CONFIRMING && 
        detectedIntent === 'confirming' && 
        is_explicit_confirmation) {
      console.log(`🎯 FLUJO CORREGIDO: Cliente en CONFIRMING confirma → Procesar pedido`)
      return 'process_order'
    }

    // 🚨 REGLA ESPECIAL VIP: Solo si NO hay salto de estado
    const isVipContext = conversationData?.cliente_nivel === 'VIP' || 
                        conversationData?.vip_product_context
    
    if (isVipContext && detectedIntent === 'confirming' && 
        suggested_response_type !== 'farewell' &&
        currentState !== this.STATES.BROWSING) { // NO aplicar para BROWSING
      console.log(`🎯 FLUJO VIP: Manteniendo case 'confirming' para contexto VIP (NO en BROWSING)`)
      return 'confirming'
    }
    
    // 🚨 REGLA CRÍTICA: Si Gemini detecta 'farewell', respetarlo SIEMPRE
    if (suggested_response_type === 'farewell') {
      console.log(`🎯 FLUJO DESPEDIDA: Respetando 'farewell' de Gemini (cliente cancelando)`) 
      return 'farewell'
    }

    // 🎯 Para cualquier otro caso, usar el tipo sugerido por Gemini
    console.log(`🎯 FLUJO NORMAL: Usando suggested_response_type de Gemini`)
    return suggested_response_type
  }

  /**
   * 🎯 COORDINACIÓN JERÁRQUICA - WRAPPER INTELIGENTE PARA GEMINI
   * Aplica jerarquía de memoria antes de llamar a generateSalesResponse
   */
  async generateSalesResponseWithHierarchy(prompt, customerName, suggestedProducts, state, history, fallbackInventory = null) {
    try {
      // 🔍 VERIFICAR SI HAY MEMORIA INVENTARIO ACTIVA
      const userPhone = this.extractPhoneNumber(customerName) || customerName
      const dualContext = await this.dualMemory.determineAppropriateContext(userPhone)
      
      if (dualContext.contextType === 'inventory' && dualContext.contextStatus === 'active' && dualContext.products?.length > 0) {
        console.log(`🎯 JERÁRQUIA DE MEMORIA: Usando ${dualContext.products.length} productos de memoria inventario`)
        console.log(`📦 Productos en memoria:`, dualContext.products.map(p => p.name).join(', '))
        
        // 🔧 CREAR PROMPT CON RESTRICCIÓN JERÁRQUICA
        const hierarchicalPrompt = `${prompt}\n\n🚨 RESTRICCIÓN JERÁRQUICA CRÍTICA:\n- ÚNICAMENTE puedes mencionar estos productos de memoria: ${dualContext.products.map(p => p.name).join(', ')}\n- Si el cliente dice "ese celular" se refiere a: ${dualContext.products[0]?.name}\n- NO menciones otros productos fuera de la memoria inventario activa\n- Mantén absoluta coherencia con el contexto conversacional`
        
        return await this.gemini.generateSalesResponse(
          hierarchicalPrompt,
          customerName,
          dualContext.products,
          state,
          history,
          dualContext.products // Usar productos de memoria como inventario
        )
      }
      
      // 📊 NO HAY MEMORIA ACTIVA: Usar flujo normal
      console.log(`📊 JERÁRQUIA DE MEMORIA: Sin memoria activa, usando inventario normal`)
      return await this.gemini.generateSalesResponse(
        prompt,
        customerName,
        suggestedProducts,
        state,
        history,
        fallbackInventory || await this.inventory.getAllProducts()
      )
    } catch (error) {
      console.error('❌ Error en jerarquía de memoria:', error)
      // Fallback al método original
      return await this.gemini.generateSalesResponse(
        prompt,
        customerName,
        suggestedProducts,
        state,
        history,
        fallbackInventory || await this.inventory.getAllProducts()
      )
    }
  }

  /**
   * 🔍 FILTRADO INTELIGENTE: Filtrar productos por consulta específica
   */
  filterProductsByQuery(products, query) {
    const queryLower = query.toLowerCase()
    
    // 📱 PATRONES DE CONSULTA ESPECÍFICA
    const patterns = {
      iphone: /\b(iphone|apple)\b/i,
      samsung: /\b(samsung|galaxy)\b/i,
      celular: /\b(celular|telefono|smartphone|movil)\b/i,
      tablet: /\b(tablet|ipad)\b/i,
      laptop: /\b(laptop|computadora|pc)\b/i,
      auricular: /\b(auricular|audifono|headphone)\b/i
    }
    
    // 🎯 FILTRAR POR PATRONES
    const filtered = products.filter(product => {
      const productName = product.nombre.toLowerCase()
      const productCategory = (product.categoria || '').toLowerCase()
      const productDescription = (product.descripcion || '').toLowerCase()
      
      // Buscar coincidencias en nombre, categoría y descripción
      const searchText = `${productName} ${productCategory} ${productDescription}`
      
      // Verificar patrones específicos
      for (const [key, pattern] of Object.entries(patterns)) {
        if (pattern.test(queryLower) && pattern.test(searchText)) {
          return true
        }
      }
      
      // Búsqueda por palabras clave
      const keywords = queryLower.split(' ').filter(word => word.length > 2)
      return keywords.some(keyword => searchText.includes(keyword))
    })
    
    // 📈 ORDENAR POR RELEVANCIA
    return filtered.sort((a, b) => {
      const aName = a.nombre.toLowerCase()
      const bName = b.nombre.toLowerCase()
      
      // Priorizar coincidencias exactas en el nombre
      if (aName.includes(queryLower) && !bName.includes(queryLower)) return -1
      if (!aName.includes(queryLower) && bName.includes(queryLower)) return 1
      
      // Priorizar productos destacados
      if (a.destacado && !b.destacado) return -1
      if (!a.destacado && b.destacado) return 1
      
      return 0
    })
  }
  
  /**
   * 💬 GENERAR RESPUESTA CONTEXTUAL INTELIGENTE
   */
  async generateContextualProductResponse(query, products, customerName) {
    if (products.length === 1) {
      return `¡Perfecto ${customerName}! 📱 Tenemos exactamente lo que buscas. Te muestro nuestro ${products[0].nombre}:`
    } else {
      return `¡Excelente ${customerName}! 📱 Tenemos ${products.length} opciones de ${query} que podrían interesarte:`
    }
  }

  /**
   * 🔍 EXTRAER CONSULTA ESPECÍFICA del mensaje del cliente
   */
  extractSpecificQuery(messageText) {
    const text = messageText.toLowerCase()
    
    // 📱 PATRONES DE CONSULTA ESPECÍFICA
    const queryPatterns = [
      { pattern: /\b(vendes|tienes|tienen)\s+(iphone|apple)/i, extract: 'iphone' },
      { pattern: /\b(vendes|tienes|tienen)\s+(samsung|galaxy)/i, extract: 'samsung' },
      { pattern: /\b(vendes|tienes|tienen)\s+(celular|telefono|smartphone)/i, extract: 'celular' },
      { pattern: /\b(vendes|tienes|tienen)\s+(tablet|ipad)/i, extract: 'tablet' },
      { pattern: /\b(vendes|tienes|tienen)\s+(laptop|computadora)/i, extract: 'laptop' },
      { pattern: /\b(busco|quiero|necesito)\s+(iphone|apple)/i, extract: 'iphone' },
      { pattern: /\b(busco|quiero|necesito)\s+(samsung|galaxy)/i, extract: 'samsung' },
      { pattern: /\b(busco|quiero|necesito)\s+(celular|telefono|smartphone)/i, extract: 'celular' },
      { pattern: /\biphone\b/i, extract: 'iphone' },
      { pattern: /\bsamsung\b/i, extract: 'samsung' },
      { pattern: /\bgalaxy\b/i, extract: 'samsung' }
    ]
    
    // 🔍 BUSCAR PATRONES EN EL MENSAJE
    for (const { pattern, extract } of queryPatterns) {
      if (pattern.test(text)) {
        console.log(`🎯 CONSULTA ESPECÍFICA DETECTADA: "${messageText}" → ${extract}`)
        return extract
      }
    }
    
    // 🔍 SIN CONSULTA ESPECÍFICA
    return null
  }

}
export default WhatsAppService
