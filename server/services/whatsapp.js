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
    this.maxRetries = 5 // 🔧 REDUCIDO: Más conservador como Proyecto-ventas
    this.timeoutRetries = 3 // 🔧 NUEVO: Intentos específicos para timeouts
    this.reconnectionDelay = 3000 // 🔧 NUEVO: Delay base como Proyecto-ventas
    this.isReconnecting = false // 🔧 NUEVO: Flag para evitar reconexiones múltiples
    this.lastDisconnectReason = null // 🔧 NUEVO: Tracking de última razón de desconexión
  }

  async connect() {
    try {
      // 🔧 MEJORADO: Prevenir conexiones múltiples y gestionar reconexiones
      if (this.isConnected && this.sock) {
        console.log('⚠️ WhatsApp already connected, ignoring request')
        return
      }
      
      // 🔧 NUEVO: Prevenir múltiples procesos de reconexión simultáneos
      if (this.isReconnecting) {
        console.log('⚠️ Reconnection already in progress, ignoring request')
        console.log(`🔍 Debug: isReconnecting=${this.isReconnecting}, isConnected=${this.isConnected}, hasSocket=${!!this.sock}`)
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
        browser: ['WhatsApp Business Advisor', 'Chrome', '118.0.0'],
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
          // 🔧 NUEVO: Manejar código 405 y otros errores de autenticación COMO PROYECTO-VENTAS
          } else if (statusCode === DisconnectReason.badSession || statusCode === 405 || statusCode === DisconnectReason.connectionClosed) {
            console.log('🚨 Bad session/405 error detected - Force clearing session (Proyecto-ventas style)')
            this.isConnected = false
            this.connectionAttempts = 0
            this.isReconnecting = false // 🔧 CRÍTICO: Limpiar flag de reconexión
            this.lastDisconnectReason = statusCode
            this.emit('whatsapp-status', 'session-invalid')
            
            // Auto-limpiar sesión después de un momento (estilo Proyecto-ventas)
            setTimeout(async () => {
              try {
                console.log('🧩 Auto-clearing session due to auth error...')
                await this.clearSession()
                console.log('✅ Session cleared automatically due to auth error')
                this.emit('whatsapp-status', 'ready-to-connect')
              } catch (error) {
                console.error('Error clearing session automatically:', error)
                this.emit('whatsapp-status', 'error')
              }
            }, 2000)
          } else if (statusCode === DisconnectReason.connectionReplaced) {
            console.log('🚨 CONNECTION REPLACED - Multiple instances detected (Proyecto-ventas handling)')
            console.log('⚠️ Stopping auto-reconnections to prevent infinite loop')
            this.isConnected = false
            this.connectionAttempts = 0
            this.isReconnecting = false // 🔧 CRÍTICO: Evitar bucles
            this.lastDisconnectReason = statusCode
            this.emit('whatsapp-status', 'error')
            this.emit('system-error', {
              message: 'Conexión reemplazada por otra instancia. Verifica que no haya múltiples bots corriendo.'
            })
            this.emit('disconnected')
            return // Don't auto-reconnect
          } else if (statusCode === DisconnectReason.timedOut || statusCode === DisconnectReason.unavailableService) {
            console.log('⚠️ Connection timeout/unavailable - Implementing Proyecto-ventas smart reconnection')
            this.isConnected = false
            this.lastDisconnectReason = statusCode
            
            // 🔧 IMPLEMENTAR RECONEXIÓN INTELIGENTE PARA TIMEOUTS (ESTILO PROYECTO-VENTAS)
            this.handleReconnection(true) // true indica que es un timeout
            
          } else if (this.connectionAttempts < this.maxRetries) {
            console.log(`🔄 Connection lost (${statusCode}) - Implementing smart reconnection...`)
            this.lastDisconnectReason = statusCode
            this.handleReconnection(false) // false indica que NO es timeout
          } else {
            console.log('❌ Max reconnection attempts reached')
            this.connectionAttempts = 0
            this.isReconnecting = false
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
  
  // 🔧 NUEVO: Detener health monitoring
  stopHealthMonitoring() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval)
      this.healthInterval = null
      console.log('🛑 Health monitoring stopped')
    }
  }
  
  // 🔧 NUEVO: Método para manejar reconexiones con backoff exponencial (BASADO EN PROYECTO-VENTAS)
  handleReconnection(isTimeout = false) {
    if (this.isReconnecting) {
      console.log('🔄 Ya hay una reconexión en progreso, ignorando...')
      return
    }

    if (this.connectionAttempts >= this.maxRetries) {
      console.log('❌ Máximo número de intentos de reconexión alcanzado')
      this.isConnected = false
      this.isReconnecting = false
      this.emit('whatsapp-status', 'error')
      this.emit('system-error', {
        message: `Falló la reconexión después de ${this.maxRetries} intentos. Intenta conectar manualmente.`
      })
      return
    }

    this.isReconnecting = true
    this.connectionAttempts++

    // Para timeouts, usar delays más cortos (estilo Proyecto-ventas)
    let delay
    if (isTimeout) {
      // Para timeouts: 1s, 2s, 4s, 8s, 16s (más agresivo)
      delay = Math.min(1000 * Math.pow(2, this.connectionAttempts - 1), 16000)
    } else {
      // Para otros errores: 3s, 6s, 12s, 24s (normal)
      delay = this.reconnectionDelay * Math.pow(2, this.connectionAttempts - 1)
    }

    const reasonText = isTimeout ? '(Timeout)' : `(${this.lastDisconnectReason})`
    console.log(`🔄 Reconectando WhatsApp... ${reasonText} (Intento ${this.connectionAttempts}/${this.maxRetries}) - Esperando ${delay}ms`)
    this.emit('whatsapp-status', 'reconnecting')

    setTimeout(() => {
      if (this.isReconnecting) { // Verificar que aún estemos reconectando
        console.log(`🚀 Ejecutando intento de reconexión ${this.connectionAttempts}`)
        this.connect().catch(error => {
          console.error(`❌ Error en intento ${this.connectionAttempts}:`, error)
          // El error será manejado por el connection.update handler
        })
      }
    }, delay)
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
      socketState: this.sock ? (this.sock.ws ? this.sock.ws.readyState : 'no-ws') : 'no-socket',
      lastDisconnectReason: this.lastDisconnectReason
    }
  }
  
  // 🔧 NUEVO: Método de emergencia para resetear estado completamente
  async forceReset() {
    try {
      console.log('🆘 FORCE RESET: Resetting WhatsApp state completely')
      
      // Limpiar todos los flags y estados
      this.isConnected = false
      this.isReconnecting = false
      this.connectionAttempts = 0
      this.qrCode = null
      
      // Detener health monitoring de forma segura
      try {
        this.stopHealthMonitoring()
      } catch (error) {
        console.log('⚠️ Health monitoring already stopped or not active')
      }
      
      // Cerrar socket si existe
      if (this.sock) {
        try {
          this.sock.end()
        } catch (error) {
          console.log('⚠️ Error ending socket:', error.message)
        }
        this.sock = null
      }
      
      // Limpiar archivos de sesión
      const fs = require('fs')
      const authDir = './auth_info_baileys'
      if (fs.existsSync(authDir)) {
        const files = fs.readdirSync(authDir)
        files.forEach(file => {
          try {
            fs.unlinkSync(`${authDir}/${file}`)
            console.log(`🗑️ Force removed: ${file}`)
          } catch (error) {
            console.log(`⚠️ Could not force remove ${file}`)
          }
        })
      }
      
      console.log('✅ Force reset completed - Ready for fresh connection')
      this.emit('whatsapp-status', 'ready-to-connect')
      
      return true
    } catch (error) {
      console.error('❌ Force reset error:', error)
      return false
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
      console.log('🧹 Clearing WhatsApp session (Proyecto-ventas style)...')

      // 🔧 CRÍTICO: Limpiar flags antes de desconectar (estilo Proyecto-ventas)
      this.isReconnecting = false
      this.connectionAttempts = 0
      this.lastDisconnectReason = null
      
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

      // Recrear directorio limpio (Proyecto-ventas style)
      try {
        fs.rmSync(authDir, { recursive: true, force: true })
        fs.mkdirSync(authDir)
        console.log('✅ Auth directory recreated clean')
      } catch (error) {
        console.log('⚠️ Could not recreate auth directory')
      }

      // Notificar estado limpio
      this.emit('whatsapp-status', 'session-cleared')
      this.emit('session-cleared', {
        message: 'Sesión limpiada exitosamente. Puedes reconectar ahora.'
      })

      console.log('✅ Session cleared successfully (Proyecto-ventas style)')
      return true
    } catch (error) {
      console.error('❌ Error clearing session:', error)
      this.isReconnecting = false // 🔧 Asegurar que se limpia en caso de error
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
