const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require('baileys')
const { Boom } = require('@hapi/boom')
const QRCode = require('qrcode')
const EventEmitter = require('events')

class WhatsAppService extends EventEmitter {
  constructor() {
    super()
    this.sock = null
    this.qrCode = null
    this.isConnected = false
    this.lastSeen = null
    this.connectionAttempts = 0
    this.maxRetries = 8 // 🔧 AUMENTADO: Más intentos para mayor robustez
    this.timeoutRetries = 3 // 🔧 NUEVO: Intentos específicos para timeouts
    this.reconnectionDelay = 5000 // 🔧 NUEVO: Delay base configurable
    this.isReconnecting = false // 🔧 NUEVO: Flag para evitar reconexiones múltiples
  }

  async connect() {
    try {
      // 🔧 MEJORADO: Prevenir conexiones múltiples y gestionar reconexiones
      if (this.isConnected && this.sock) {
        console.log('⚠️ WhatsApp already connected, ignoring request')
        return
      }
      
      // 🔧 NUEVO: Prevenir múltiples procesos de reconexieon simultáneos
      if (this.isReconnecting) {
        console.log('⚠️ Reconnection already in progress, ignoring request')
        return
      }

      // If we have a socket but not connected, clean it first
      if (this.sock && !this.isConnected) {
        console.log('🧹 Cleaning previous socket before reconnection')
        this.sock = null
      }

      this.isReconnecting = true // 🔧 NUEVO: Marcar como reconectando
      console.log('🔄 Connecting to WhatsApp...')

      // Crear directorio si no existe
      const fs = require('fs')
      if (!fs.existsSync('./auth_info_baileys')) {
        fs.mkdirSync('./auth_info_baileys')
      }

      const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys')

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        // 🔧 MEJORADO: Configuración optimizada para Render
        defaultQueryTimeoutMs: 60000, // 60 segundos timeout
        connectTimeoutMs: 60000, // 60 segundos para conectar
        keepAliveIntervalMs: 30000, // Keep alive cada 30 segundos
        retryRequestDelayMs: 1000, // 1 segundo entre reintentos
        maxMsgRetryCount: 5, // Máximo 5 reintentos por mensaje
        // 🔧 NUEVO: Configuraciones específicas para producción
        browser: ['WhatsApp Business Advisor', 'Chrome', '118.0.0.0'],
        version: [2, 2412, 54],
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

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
          console.log('📱 QR Code generated')
          this.qrCode = await QRCode.toDataURL(qr)
          this.emit('qr-code', this.qrCode)
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode

          console.log('❌ Connection closed. Code:', statusCode, 'Reason:', DisconnectReason[statusCode] || 'Unknown')
          this.isConnected = false
          this.qrCode = null

          // Manejar código 515 (restartRequired) - Limpiar y reconectar
          if (statusCode === DisconnectReason.restartRequired) {
            console.log('🔄 Restart required by WhatsApp - Cleaning and reconnecting')
            this.isConnected = false
            this.sock = null // CRÍTICO: Limpiar socket para permitir reconexión
            this.connectionAttempts = 0
            this.emit('whatsapp-status', 'reconnecting')
            // Esperar antes de reconectar
            setTimeout(() => {
              console.log('🔄 Attempting reconnection after restart requirement')
              this.connect()
            }, 5000) // 5 segundos de espera
            return
          }

          // Manejar sesión cerrada (401/403)
          if (statusCode === DisconnectReason.loggedOut) {
            console.log('🚨 Session logged out - Auto-clearing...')
            this.connectionAttempts = 0
            this.emit('whatsapp-status', 'session-invalid')
            setTimeout(async () => {
              try {
                await this.clearSession()
                console.log('✅ Session cleared, ready for new connection')
                this.emit('whatsapp-status', 'ready-to-connect')
              } catch (error) {
                console.error('Error clearing session:', error)
                this.emit('whatsapp-status', 'error')
              }
            }, 2000)
          } else if (statusCode === DisconnectReason.connectionReplaced) {
            console.log('🚨 CONNECTION REPLACED - Multiple instances detected')
            console.log('⚠️ Stopping auto-reconnections to prevent infinite loop')
            this.isConnected = false
            this.connectionAttempts = 0
            this.emit('whatsapp-status', 'error')
            this.emit('disconnected')
            return // Don't auto-reconnect
          } else if (statusCode === DisconnectReason.timedOut || statusCode === DisconnectReason.unavailableService) {
            console.log('⚠️ Connection timeout/unavailable - Attempting smart reconnection')
            this.isConnected = false
            
            // 🔧 FIXED: Implementar reconexión inteligente para timeouts
            if (this.connectionAttempts < this.maxRetries) {
              this.connectionAttempts++
              // Delay más largo para timeouts (30 segundos)
              const timeoutDelay = 30000 + (this.connectionAttempts * 15000) // Escalado: 30s, 45s, 60s...
              console.log(`🔄 Timeout reconnection... Attempt ${this.connectionAttempts}/${this.maxRetries} - Waiting ${timeoutDelay/1000}s`)
              
              setTimeout(() => {
                console.log('🔄 Attempting reconnection after timeout...')
                this.connect()
              }, timeoutDelay)
            } else {
              console.log('❌ Max timeout reconnection attempts reached - Will retry in 5 minutes')
              this.connectionAttempts = 0
              
              // 🔧 NUEVO: Retry después de 5 minutos para casos extremos
              setTimeout(() => {
                console.log('🔄 Extended timeout retry - Attempting reconnection')
                this.connectionAttempts = 0
                this.connect()
              }, 300000) // 5 minutos
              
              this.emit('disconnected')
            }
          } else if (this.connectionAttempts < this.maxRetries) {
            this.connectionAttempts++
            const delay = 5000 // Fixed delay instead of exponential
            console.log(`🔄 Reconnecting... Attempt ${this.connectionAttempts}/${this.maxRetries} - Waiting ${delay}ms`)
            setTimeout(() => this.connect(), delay)
          } else {
            console.log('❌ Max reconnection attempts reached')
            this.connectionAttempts = 0
            this.emit('disconnected')
          }
        } else if (connection === 'open') {
          console.log('✅ WhatsApp connection established')
          this.isConnected = true
          this.lastSeen = new Date().toISOString()
          this.qrCode = null
          this.connectionAttempts = 0
          this.isReconnecting = false // 🔧 NUEVO: Limpiar flag de reconexión
          this.emit('connected')
          
          // 🔧 NUEVO: Iniciar monitoreo de salud
          this.startHealthMonitoring()
          
          // 🔧 NUEVO: Logging adicional para monitoreo
          console.log(`📊 Connection stats - Attempts: ${this.connectionAttempts}, Last seen: ${this.lastSeen}`)
        }
      })

      this.sock.ev.on('creds.update', saveCreds)

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
      console.error('❌ WhatsApp initialization error:', error)
      this.isReconnecting = false // 🔧 NUEVO: Limpiar flag en caso de error
      
      // 🔧 MEJORADO: Retry inteligente en caso de error de inicialización
      if (this.connectionAttempts < this.maxRetries) {
        this.connectionAttempts++
        const retryDelay = this.reconnectionDelay * this.connectionAttempts // Delay progresivo
        console.log(`🔄 Initialization failed, retrying in ${retryDelay/1000}s... (${this.connectionAttempts}/${this.maxRetries})`)
        
        setTimeout(() => {
          this.connect()
        }, retryDelay)
      } else {
        console.log('❌ Max initialization attempts reached')
        this.connectionAttempts = 0
        this.emit('error', error)
      }
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

  async sendWelcomeMessage(to, name) {
    const welcomeText = `¡Hola ${name}! 👋

Bienvenido a tu servicio de asesoría empresarial especializada. Soy tu asistente inteligente y estoy aquí para ayudarte con:

🏢 **Estrategias fiscales y tributarias**
💼 **Estructuras empresariales**
📊 **Optimización de inversiones**
⚖️ **Aspectos legales empresariales**
🎯 **Planificación patrimonial**

Puedes preguntarme cualquier cosa relacionada con estos temas. Estoy disponible 24/7 para brindarte asesoría especializada.

¿En qué puedo ayudarte hoy?`

    return this.sendMessage(to, welcomeText)
  }

  // 🔧 NUEVO: Método para verificar y mantener conexión activa
  async healthCheck() {
    try {
      if (!this.sock || !this.isConnected) {
        console.log('🟡 Health check failed - Not connected')
        return false
      }
      
      // Verificar si el socket está realmente activo
      const isSocketActive = this.sock.ws && this.sock.ws.readyState === 1
      if (!isSocketActive) {
        console.log('🟡 Health check failed - Socket not active')
        this.isConnected = false
        return false
      }
      
      console.log('🟢 Health check passed - Connection healthy')
      return true
    } catch (error) {
      console.error('❌ Health check error:', error)
      return false
    }
  }
  
  // 🔧 NUEVO: Inicializar health checks periódicos
  startHealthMonitoring() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval)
    }
    
    this.healthInterval = setInterval(async () => {
      const isHealthy = await this.healthCheck()
      if (!isHealthy && !this.isReconnecting) {
        console.log('🚨 Health check failed, attempting reconnection')
        this.connect()
      }
    }, 60000) // Health check cada minuto
  }
  
  // 🔧 MEJORADO: Status con información adicional de salud
  getStatus() {
    return {
      isConnected: this.isConnected,
      lastSeen: this.lastSeen || 'Nunca',
      qrCode: this.qrCode,
      connectionAttempts: this.connectionAttempts,
      isReconnecting: this.isReconnecting,
      hasHealthMonitoring: !!this.healthInterval,
      socketState: this.sock ? (this.sock.ws ? this.sock.ws.readyState : 'no-ws') : 'no-socket'
    }
  }
  
  // 🔧 NUEVO: Obtener información de conexión para health checks
  getConnectionInfo() {
    return {
      connected: this.isConnected,
      lastSeen: this.lastSeen,
      attempts: this.connectionAttempts,
      hasQR: !!this.qrCode
    }
  }

  async restart() {
    try {
      console.log('🔄 Restarting WhatsApp service...')
      
      if (this.sock) {
        this.sock.end()
      }
      
      this.isConnected = false
      this.qrCode = null
      this.connectionAttempts = 0
      
      // Wait a bit before reinitializing
      setTimeout(() => {
        this.initialize()
      }, 2000)
      
      return true
    } catch (error) {
      console.error('❌ Restart error:', error)
      throw error
    }
  }

  async disconnect() {
    try {
      console.log('🔌 Initiating WhatsApp disconnection...')
      
      // 🔧 NUEVO: Detener health monitoring
      this.stopHealthMonitoring()
      
      if (this.sock) {
        await this.sock.logout()
        this.sock.end()
      }

      this.isConnected = false
      this.qrCode = null
      this.sock = null
      this.isReconnecting = false // 🔧 NUEVO: Limpiar flag

      console.log('📱 WhatsApp disconnected successfully')
    } catch (error) {
      console.error('❌ Disconnect error:', error)
    }
  }

  async clearSession() {
    try {
      console.log('🧹 Clearing WhatsApp session...')

      // Disconnect if connected
      if (this.sock) {
        try {
          await this.sock.logout()
        } catch (error) {
          console.log('⚠️ Error during logout:', error.message)
        }
        this.sock.end()
        this.sock = null
      }

      this.isConnected = false
      this.qrCode = null
      this.connectionAttempts = 0

      // Remove auth files
      const fs = require('fs')
      const path = require('path')
      const authDir = './auth_info_baileys'

      if (fs.existsSync(authDir)) {
        const files = fs.readdirSync(authDir)
        for (const file of files) {
          const filePath = path.join(authDir, file)
          try {
            fs.unlinkSync(filePath)
            console.log(`🗑️ Removed: ${file}`)
          } catch (error) {
            console.log(`⚠️ Could not remove ${file}:`, error.message)
          }
        }
      }

      console.log('✅ Session cleared successfully')
      return true
    } catch (error) {
      console.error('❌ Error clearing session:', error)
      throw error
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
