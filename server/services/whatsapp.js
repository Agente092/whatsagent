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
    this.maxRetries = 5
  }

  async connect() {
    try {
      // Prevent multiple connections (but allow reconnection after disconnect)
      if (this.isConnected && this.sock) {
        console.log('⚠️ WhatsApp already connected, ignoring request')
        return
      }

      // If we have a socket but not connected, clean it first
      if (this.sock && !this.isConnected) {
        console.log('🧹 Cleaning previous socket before reconnection')
        this.sock = null
      }

      console.log('🔄 Connecting to WhatsApp...')
      this.connectionAttempts = 0

      // Crear directorio si no existe
      const fs = require('fs')
      if (!fs.existsSync('./auth_info_baileys')) {
        fs.mkdirSync('./auth_info_baileys')
      }

      const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys')

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
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
            console.log('⚠️ Connection timeout/unavailable - Stopping reconnections')
            this.isConnected = false
            this.connectionAttempts = 0
            this.emit('disconnected')
            return // Don't auto-reconnect on timeout
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
          this.emit('connected')
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
      this.emit('error', error)
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

  getStatus() {
    return {
      isConnected: this.isConnected,
      lastSeen: this.lastSeen || 'Nunca',
      qrCode: this.qrCode,
      connectionAttempts: this.connectionAttempts
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
      if (this.sock) {
        await this.sock.logout()
        this.sock.end()
      }

      this.isConnected = false
      this.qrCode = null
      this.sock = null

      console.log('📱 WhatsApp disconnected')
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
