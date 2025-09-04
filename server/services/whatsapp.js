const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require('baileys')
const { Boom } = require('@hapi/boom')
const QRCode = require('qrcode')
const EventEmitter = require('events')

class WhatsAppService extends EventEmitter {
  constructor() {
    super()
    this.sock = null
    this.qrCode = null
    this.qr = null
    this.isConnected = false
    this.lastSeen = null
    this.connectionAttempts = 0
    this.maxRetries = 5 // 🔧 PROYECTO-VENTAS: Conservador
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectionDelay = 3000 // 🔧 PROYECTO-VENTAS: Delay base
    this.isReconnecting = false
    this.lastDisconnectReason = null
    this.healthInterval = null
  }

  // 🔧 MÉTODO DE RECONEXIÓN EXACTO DEL PROYECTO-VENTAS
  handleReconnection(isTimeout = false) {
    if (this.isReconnecting) {
      console.log('🔄 Ya hay una reconexión en progreso, ignorando...')
      return
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Máximo número de intentos de reconexión alcanzado')
      this.isConnected = false
      this.isReconnecting = false
      this.emit('whatsapp-status', 'error')
      this.emit('system-error', {
        message: `Falló la reconexión después de ${this.maxReconnectAttempts} intentos. Intenta conectar manualmente.`
      })
      return
    }

    this.isReconnecting = true
    this.reconnectAttempts++

    // Para timeouts, usar delays más cortos (PROYECTO-VENTAS STYLE)
    let delay
    if (isTimeout) {
      // Para timeouts: 1s, 2s, 4s, 8s, 16s (más agresivo)
      delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 16000)
    } else {
      // Para otros errores: 3s, 6s, 12s, 24s (normal)
      delay = this.reconnectionDelay * Math.pow(2, this.reconnectAttempts - 1)
    }

    const reasonText = isTimeout ? '(Timeout)' : `(${this.lastDisconnectReason})`
    console.log(`🔄 Reconectando WhatsApp... ${reasonText} (Intento ${this.reconnectAttempts}/${this.maxReconnectAttempts}) - Esperando ${delay}ms`)
    this.emit('whatsapp-status', 'reconnecting')

    setTimeout(() => {
      if (this.isReconnecting) { // Verificar que aún necesitamos reconectar
        this.connect()
      }
    }, delay)
  }

  async connect() {
    try {
      // 🔧 CRÍTICO: Si no estamos en proceso de reconexión automática, resetear contadores (PROYECTO-VENTAS STYLE)
      if (!this.isReconnecting) {
        this.reconnectAttempts = 0
        console.log('🔄 Iniciando conexión manual - Reseteando contadores de reconexión')
      }

      const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys')

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        // 🔧 CONFIGURACIONES EXACTAS DEL PROYECTO-VENTAS (CRITICAL!)
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

      // 🔧 MANEJAR EVENTOS DE CONEXIÓN EXACTO DEL PROYECTO-VENTAS
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
          this.qr = qr
          const qrImage = await QRCode.toDataURL(qr)
          this.qrCode = qrImage
          this.emit('qr-code', qrImage)
          this.emit('whatsapp-status', 'connecting')
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
            this.emit('whatsapp-status', 'error')
            this.emit('system-error', {
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
            this.emit('whatsapp-status', 'session-invalid')

            // Auto-limpiar sesión después de un momento
            setTimeout(async () => {
              try {
                await this.clearSession()
                this.emit('whatsapp-status', 'ready-to-connect')
              } catch (error) {
                console.error('Error en auto-limpieza:', error)
                this.emit('whatsapp-status', 'error')
              }
            }, 2000)

          } else if (statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.connectionReplaced) {
            // Implementar backoff exponencial para otras desconexiones
            this.handleReconnection()
          } else {
            console.log('❌ WhatsApp desconectado')
            this.isConnected = false
            this.isReconnecting = false
            this.emit('whatsapp-status', 'disconnected')
          }
        } else if (connection === 'open') {
          console.log('✅ WhatsApp conectado exitosamente')
          this.isConnected = true
          this.isReconnecting = false
          this.reconnectAttempts = 0 // Reset contador en conexión exitosa
          this.qr = null
          this.qrCode = null
          this.emit('whatsapp-ready')
          this.emit('whatsapp-status', 'connected')
        }
      })

      // Guardar credenciales cuando cambien
      this.sock.ev.on('creds.update', saveCreds)

      // Manejar mensajes entrantes
      this.sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0]
        if (!message.key.fromMe && message.message) {
          const from = message.key.remoteJid
          const body = this.extractMessageText(message)
          
          if (body && from) {
            // Clean phone number format
            const cleanPhone = from.replace('@s.whatsapp.net', '')
            
            console.log(`📨 Message from ${cleanPhone}: ${body}`)
            
            this.emit('message', {
              from: cleanPhone,
              body: body.trim(),
              timestamp: new Date()
            })
          }
        }
      })

    } catch (error) {
      console.error('Error conectando WhatsApp:', error)
      throw error
    }
  }

  extractMessageText(message) {
    if (message.message?.conversation) {
      return message.message.conversation
    }
    
    if (message.message?.extendedTextMessage?.text) {
      return message.message.extendedTextMessage.text
    }
    
    if (message.message?.imageMessage?.caption) {
      return message.message.imageMessage.caption
    }
    
    if (message.message?.videoMessage?.caption) {
      return message.message.videoMessage.caption
    }
    
    return null
  }

  async disconnect() {
    if (this.sock) {
      await this.sock.logout()
      this.sock = null
      this.isConnected = false
      this.emit('whatsapp-status', 'disconnected')
      console.log('📱 WhatsApp desconectado')
    }
  }

  // 🔧 CLEARASESSION EXACTO DEL PROYECTO-VENTAS
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
      this.qrCode = null
      this.isReconnecting = false
      this.reconnectAttempts = 0

      // Eliminar archivos de autenticación
      const fs = require('fs')
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
      this.emit('whatsapp-status', 'session-cleared')
      this.emit('session-cleared', {
        message: 'Sesión limpiada exitosamente. Puedes reconectar ahora.'
      })

      console.log('✅ Sesión WhatsApp limpiada exitosamente')
      return { success: true, message: 'Sesión limpiada exitosamente' }

    } catch (error) {
      console.error('❌ Error limpiando sesión:', error)
      this.emit('session-clear-error', { error: error.message })
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

  async sendMessage(to, text) {
    try {
      if (!this.sock || !this.isConnected) {
        throw new Error('WhatsApp not connected')
      }

      // Format phone number
      const formattedNumber = to.includes('@') ? to : `${to}@s.whatsapp.net`
      
      await this.sock.sendMessage(formattedNumber, { text })
      console.log(`📤 Message sent to ${to}: ${text.substring(0, 50)}...`)
      
      return true
    } catch (error) {
      console.error('❌ Send message error:', error)
      throw error
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      lastSeen: this.lastSeen || 'Nunca',
      qrCode: this.qrCode,
      connectionAttempts: this.connectionAttempts,
      isReconnecting: this.isReconnecting,
      lastDisconnectReason: this.lastDisconnectReason
    }
  }

  // Health check
  isHealthy() {
    return this.isConnected && this.sock
  }

  // Get connection info
  getConnectionInfo() {
    return {
      connected: this.isConnected,
      lastSeen: this.lastSeen,
      attempts: this.connectionAttempts,
      hasQR: !!this.qrCode,
      healthy: this.isHealthy()
    }
  }
}

module.exports = WhatsAppService