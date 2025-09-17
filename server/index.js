const express = require('express')
const cors = require('cors')
const cron = require('node-cron')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { createServer } = require('http')
const { Server } = require('socket.io')
const morgan = require('morgan')
const { v4: uuidv4 } = require('uuid')
const http = require('http')
const https = require('https')
const { URL } = require('url')

// Import services
const WhatsAppService = require('./services/whatsapp')
const GeminiService = require('./services/gemini')
const KnowledgeBase = require('./services/knowledgeBase')
const ConversationMemory = require('./services/conversationMemory')
const MessageFormatterCleaned = require('./services/messageFormatterCleaned') // 🏢 CORREGIDO: Formateador de empresas
const HumanReasoningEngine = require('./services/humanReasoningEngine')
const AdaptivePersonalitySystem = require('./services/adaptivePersonalitySystem')
const logger = require('./services/logger')
const HealthCheck = require('./services/healthCheck')
const DatabaseMonitor = require('./services/databaseMonitor')
const ClientService = require('./services/clientService') // 👥 NUEVO: Servicio de clientes unificado

// Import routes
const apiStatsRoutes = require('./routes/apiStats')

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // 🔧 ALLOW ALL ORIGINS FOR SOCKET.IO CONNECTIONS IN PRODUCTION
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.NEXTAUTH_URL,
        'https://whatsagent.onrender.com',
        'https://fitpro-s1ct.onrender.com',
        'https://fitpro-backend.onrender.com',
        'https://grupohibrida.onrender.com',
        'https://grupohibrida-frontend.onrender.com'
      ].filter(Boolean)
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        console.warn(`Socket.IO CORS blocked: ${origin}`)
        callback(null, false)
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  // 🔧 PRODUCTION OPTIMIZATIONS
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,      // 60 seconds
  pingInterval: 25000,     // 25 seconds
  connectTimeout: 45000,   // 45 seconds
  allowEIO3: true,         // Compatibility
  maxHttpBufferSize: 1e6   // 1MB
})

const prisma = new PrismaClient()
const dbMonitor = new DatabaseMonitor(prisma)
const PORT = process.env.PORT || 3001

// 🧠 Initialize enhanced services with intelligent capabilities
const conversationMemory = new ConversationMemory()
const messageFormatter = new MessageFormatterCleaned() // 🏢 CORREGIDO: Usar formateador de empresas corregido
const knowledgeBase = new KnowledgeBase()
const clientService = new ClientService() // 👥 NUEVO: Servicio de clientes unificado

// 🎭 Initialize AI systems
const personalitySystem = new AdaptivePersonalitySystem(conversationMemory)
const geminiService = new GeminiService(conversationMemory, messageFormatter, knowledgeBase)
const humanReasoning = new HumanReasoningEngine(geminiService, conversationMemory)

// 📱 Initialize WhatsApp service with enhanced intelligence
const whatsappService = new WhatsAppService()
const WhatsAppMonitor = require('./services/whatsappMonitor')
const whatsappMonitor = new WhatsAppMonitor(whatsappService) // 🔧 NUEVO: Monitor avanzado

// Initialize health check
const healthCheck = new HealthCheck(prisma, whatsappService)

// Make geminiService available to routes
app.set('geminiService', geminiService)

// Middleware para request ID
app.use((req, res, next) => {
  req.id = uuidv4()
  req.startTime = Date.now()
  next()
})

// Middleware de logging HTTP
app.use(morgan('combined', { 
  stream: logger.stream,
  skip: (req, res) => req.url === '/health' || req.url === '/api/health'
}))

// Configuración de CORS para producción
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true)
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.NEXTAUTH_URL,
      'https://whatsagent.onrender.com',
      'https://fitpro-s1ct.onrender.com',
      'https://grupohibrida.onrender.com'
    ].filter(Boolean)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Para legacy browsers
}

// Middleware básico
app.use(cors(corsOptions))
app.use(express.json())

// Servir archivos estáticos
app.use('/public', express.static('server/public'))

// Middleware de métricas
app.use((req, res, next) => {
  healthCheck.incrementRequests()
  
  const originalSend = res.send
  res.send = function(data) {
    const duration = Date.now() - req.startTime
    healthCheck.addResponseTime(duration)
    
    if (res.statusCode >= 400) {
      healthCheck.incrementErrors()
    }
    
    logger.api(req.method, req.url, res.statusCode, duration, {
      requestId: req.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    })
    
    return originalSend.call(this, data)
  }
  
  next()
})

// Socket.IO connection handling with enhanced stability
io.on('connection', (socket) => {
  console.log(`🔔 Client connected: ${socket.id} from ${socket.handshake.headers.origin || 'unknown'}`)
  
  // 🔧 CONNECTION TRACKING
  let clientHeartbeat = Date.now()
  
  // 🔄 HEARTBEAT MECHANISM
  const heartbeatInterval = setInterval(() => {
    socket.emit('ping', Date.now())
  }, 30000) // Every 30 seconds
  
  socket.on('pong', () => {
    clientHeartbeat = Date.now()
  })

  // Send current WhatsApp status to new client
  try {
    if (whatsappService.isConnected) {
      socket.emit('whatsapp-status', 'connected')
      console.log(`✅ Sent 'connected' status to ${socket.id}`)
    } else if (whatsappService.qrCode) {
      socket.emit('whatsapp-status', 'connecting')
      socket.emit('qr-code', whatsappService.qrCode)
      console.log(`📱 Sent QR code to ${socket.id}`)
    } else {
      socket.emit('whatsapp-status', 'disconnected')
      console.log(`❌ Sent 'disconnected' status to ${socket.id}`)
    }
  } catch (error) {
    console.error(`❌ Error sending initial status to ${socket.id}:`, error.message)
  }

  // WhatsApp connection events with error handling
  socket.on('connect-whatsapp', async () => {
    try {
      console.log(`🔔 WhatsApp connection requested from ${socket.id}`)
      if (whatsappService.isConnected) {
        socket.emit('whatsapp-status', 'connected')
        return
      }
      
      socket.emit('whatsapp-status', 'connecting')
      await whatsappService.connect()
    } catch (error) {
      console.error(`❌ Error connecting WhatsApp for ${socket.id}:`, error.message)
      socket.emit('whatsapp-error', error.message)
      socket.emit('whatsapp-status', 'error')
    }
  })

  socket.on('disconnect-whatsapp', async () => {
    try {
      console.log(`🚫 WhatsApp disconnection requested from ${socket.id}`)
      await whatsappService.disconnect()
    } catch (error) {
      console.error(`❌ Error disconnecting WhatsApp for ${socket.id}:`, error.message)
    }
  })

  socket.on('clear-whatsapp-session', async () => {
    try {
      console.log(`🧹 Manual session clear requested from ${socket.id}`)
      await whatsappService.clearSession()
      socket.emit('session-cleared', { message: 'Session cleared successfully' })
      
      // 🔧 NUEVO: Emitir estado listo para nueva conexión
      setTimeout(() => {
        socket.emit('whatsapp-status', 'ready-to-connect')
      }, 1000)
    } catch (error) {
      console.error(`❌ Error clearing session for ${socket.id}:`, error.message)
      socket.emit('whatsapp-status', 'error')
    }
  })
  
  // 🔧 NUEVO: Handler para force reset
  socket.on('force-reset-whatsapp', async () => {
    try {
      console.log(`🆘 Force reset WhatsApp requested from ${socket.id}`)
      const success = await whatsappService.forceNewQR() // 🔧 USAR forceNewQR para regenerar
      if (success) {
        socket.emit('whatsapp-status', 'ready-to-connect')
        socket.emit('session-cleared', { message: 'WhatsApp force reset completed' })
      } else {
        socket.emit('whatsapp-status', 'error')
      }
    } catch (error) {
      console.error(`❌ Error in force reset for ${socket.id}:`, error.message)
      socket.emit('whatsapp-status', 'error')
    }
  })

  // 🔧 NUEVO: Handler específico para regenerar QR
  socket.on('regenerate-qr', async () => {
    try {
      console.log(`🆕 Regenerate QR requested from ${socket.id}`)
      const success = await whatsappService.forceNewQR()
      if (success) {
        socket.emit('whatsapp-status', 'connecting')
        console.log(`✅ QR regeneration initiated for ${socket.id}`)
      } else {
        socket.emit('whatsapp-status', 'error')
      }
    } catch (error) {
      console.error(`❌ Error regenerating QR for ${socket.id}:`, error.message)
      socket.emit('whatsapp-status', 'error')
    }
  })

  // 🔧 ERROR HANDLING
  socket.on('error', (error) => {
    console.error(`❌ Socket error from ${socket.id}:`, error.message)
  })

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} - Reason: ${reason}`)
    
    // Clear heartbeat interval
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
    }
    
    // Log disconnection details
    const connectionDuration = Date.now() - clientHeartbeat
    console.log(`📊 Connection duration: ${Math.round(connectionDuration / 1000)}s`)
  })
})

// WhatsApp service events with enhanced logging
whatsappService.on('qr-code', (qrCode) => {
  logger.whatsapp('info', 'QR code generated for WhatsApp connection')
  console.log('📱 Broadcasting QR code to all clients')
  io.emit('qr-code', qrCode)
  io.emit('whatsapp-status', 'connecting')
})

whatsappService.on('connected', () => {
  logger.whatsapp('info', 'WhatsApp service connected successfully')
  console.log('✅ Broadcasting connected status to all clients')
  
  // 🔄 BROADCAST MÚLTIPLE PARA ASEGURAR RECEPCIÓN
  io.emit('whatsapp-status', 'connected')
  
  // 🔄 DELAY ADICIONAL PARA SINCRONIZACIÓN
  setTimeout(() => {
    io.emit('whatsapp-status', 'connected')
    console.log('✅ Estado conectado re-enviado para sincronización')
  }, 1000)
  
  // 🔄 LIMPIAR QR CODE CUANDO SE CONECTA
  setTimeout(() => {
    io.emit('qr-code', null) // Limpiar QR
    io.emit('whatsapp-status', 'connected')
    console.log('✅ QR limpiado y estado final confirmado')
  }, 2000)
})

whatsappService.on('disconnected', () => {
  logger.whatsapp('warn', 'WhatsApp service disconnected')
  console.log('❌ Broadcasting disconnected status to all clients')
  io.emit('whatsapp-status', 'disconnected')
})

// 🔧 NUEVO: Manejar estados de error
whatsappService.on('error', (error) => {
  logger.whatsapp('error', 'WhatsApp service error', { error: error.message })
  console.log(`❌ Broadcasting error status to all clients: ${error.message}`)
  io.emit('whatsapp-status', 'error')
  io.emit('whatsapp-error', error.message)
})

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Token de acceso requerido' })
  }

  jwt.verify(token, process.env.NEXTAUTH_SECRET || 'default-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' })
    }
    req.user = user
    next()
  })
}

// Routes

// 📊 CONNECTION MONITORING ENDPOINT
app.get('/api/monitoring/connections', async (req, res) => {
  try {
    const connectedClients = io.engine.clientsCount || 0
    const whatsappStatus = {
      isConnected: whatsappService.isConnected,
      hasQRCode: !!whatsappService.qrCode,
      status: whatsappService.isConnected ? 'connected' : 
              whatsappService.qrCode ? 'connecting' : 'disconnected'
    }
    
    const systemHealth = {
      socketIO: {
        connectedClients,
        serverRunning: true
      },
      whatsapp: whatsappStatus,
      database: {
        connected: true // Prisma siempre está conectado si el server funciona
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
    
    console.log('📊 Connection monitoring requested:', systemHealth)
    
    res.json({
      success: true,
      data: systemHealth
    })
  } catch (error) {
    console.error('❌ Error in connection monitoring:', error.message)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// 🔍 DEBUG ENDPOINT PARA DIAGNOSTICAR PROBLEMAS
app.get('/api/debug/info', async (req, res) => {
  try {
    const debugInfo = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        hasGeminiKeys: !!(process.env.GEMINI_API_KEY_1)
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      },
      connections: {
        socketIO: io.engine.clientsCount || 0,
        whatsappConnected: whatsappService.isConnected
      },
      clients: {
        total: await clientService.getStats().then(s => s.total).catch(() => 0)
      },
      timestamp: new Date().toISOString()
    }
    
    console.log('🔍 Debug info requested:', debugInfo)
    
    res.json({
      success: true,
      debug: debugInfo
    })
  } catch (error) {
    console.error('❌ Error in debug info:', error.message)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 📊 Database monitoring endpoint
app.get('/api/database/stats', async (req, res) => {
  try {
    const stats = dbMonitor.getStats()
    const healthCheck = await dbMonitor.checkConnectionHealth()
    
    res.json({
      success: true,
      data: {
        statistics: stats,
        health: healthCheck,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    logger.error('❌ Error getting database stats:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 🔧 Database monitoring reset endpoint
app.post('/api/database/reset-stats', async (req, res) => {
  try {
    dbMonitor.resetStats()
    res.json({
      success: true,
      message: 'Database monitor stats reset successfully'
    })
  } catch (error) {
    logger.error('❌ Error resetting database stats:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 🔍 Debug endpoint para probar operaciones de base de datos
app.get('/api/database/debug/:phone', async (req, res) => {
  try {
    const { phone } = req.params
    logger.info(`🔍 Testing database operations for phone: ${phone}`)
    
    // Probar operaciones una por una con logging detallado
    let results = {
      findClient: null,
      createConversation: null,
      errors: []
    }
    
    try {
      // Test 1: Buscar cliente - 🔄 MIGRADO a phoneNumber
      logger.info('🔍 Test 1: Finding client...')
      const phoneNumber = phone.replace(/\D/g, '') // Solo números
      const client = await dbMonitor.findUnique('client', {
        where: { phoneNumber: phoneNumber }
      })
      results.findClient = { success: true, found: !!client, clientId: client?.id }
      logger.info('✅ Test 1 passed')
      
      if (client) {
        // Test 2: Crear conversación de prueba
        logger.info('🔍 Test 2: Creating test conversation...')
        const testConversation = await dbMonitor.create('conversation', {
          data: {
            clientId: client.id,
            phone: phone,
            message: '[DEBUG TEST]',
            response: '[DEBUG TEST RESPONSE]',
            metadata: JSON.stringify({
              debug: true,
              timestamp: new Date().toISOString()
            })
          }
        })
        results.createConversation = { success: true, conversationId: testConversation.id }
        logger.info('✅ Test 2 passed')
        
        // Limpiar: eliminar conversación de prueba
        await prisma.conversation.delete({
          where: { id: testConversation.id }
        })
        logger.info('🗑️ Debug conversation cleaned up')
      }
      
    } catch (testError) {
      results.errors.push({
        operation: 'database_test',
        error: testError.message,
        code: testError.code,
        stack: testError.stack
      })
      logger.error('🔍 Database test failed:', testError)
    }
    
    res.json({
      success: true,
      data: {
        phone: phone,
        results: results,
        stats: dbMonitor.getStats(),
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    logger.error('❌ Error in database debug endpoint:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
})

// Legal fact checking endpoint
app.get('/api/legal/stats', authenticateToken, async (req, res) => {
  try {
    if (!geminiService.legalFactChecker) {
      return res.status(404).json({
        success: false,
        message: 'Legal fact checker not available'
      })
    }

    const stats = geminiService.legalFactChecker.getFactCheckerStats()
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      legalFactChecker: {
        ...stats,
        isActive: true
      }
    })

  } catch (error) {
    console.error('Error getting legal stats:', error)
    res.status(500).json({
      success: false,
      message: 'Error retrieving legal fact checker statistics',
      error: error.message
    })
  }
})

// Legal reference lookup endpoint
app.post('/api/legal/lookup', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.body
    
    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Reference parameter is required'
      })
    }

    if (!geminiService.legalFactChecker) {
      return res.status(404).json({
        success: false,
        message: 'Legal fact checker not available'
      })
    }

    const result = geminiService.legalFactChecker.lookupLegalReference(reference)
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      query: reference,
      result
    })

  } catch (error) {
    console.error('Error looking up legal reference:', error)
    res.status(500).json({
      success: false,
      message: 'Error looking up legal reference',
      error: error.message
    })
  }
})

// 🔍 ENDPOINT DE PRUEBA PARA BÚSQUEDA EN INTERNET
app.get('/api/search/test', async (req, res) => {
  try {
    const { query } = req.query
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required'
      })
    }

    // Crear instancia del servicio de búsqueda
    const InternetSearchService = require('./services/internetSearch')
    const searchService = new InternetSearchService()
    
    const results = await searchService.search(query)
    
    res.json({
      success: true,
      query: query,
      results: results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in internet search test:', error)
    res.status(500).json({
      success: false,
      message: 'Error performing internet search',
      error: error.message
    })
  }
})

// 🔍 ENDPOINT PARA BÚSQUEDA EN TIEMPO REAL DESDE WHATSAPP
app.post('/api/search/realtime', async (req, res) => {
  try {
    const { message, clientData } = req.body
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message parameter is required'
      })
    }

    // Crear instancia del servicio de búsqueda
    const InternetSearchService = require('./services/internetSearch')
    const searchService = new InternetSearchService()
    
    // Realizar búsqueda
    const results = await searchService.search(message)
    
    res.json({
      success: true,
      message: message,
      results: results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in real-time internet search:', error)
    res.status(500).json({
      success: false,
      message: 'Error performing real-time internet search',
      error: error.message
    })
  }
})

module.exports = app


// Semantic search stats endpoint
app.get('/api/search/stats', authenticateToken, async (req, res) => {
  try {
    if (!geminiService.semanticSearch) {
      return res.status(404).json({
        success: false,
        message: 'Semantic search not available'
      })
    }

    const stats = geminiService.semanticSearch.getStats()
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      semanticSearch: stats
    })

  } catch (error) {
    console.error('Error getting semantic search stats:', error)
    res.status(500).json({
      success: false,
      message: 'Error getting semantic search stats',
      error: error.message
    })
  }
})

// 🧠 Enhanced Intelligence System Stats
app.get('/api/intelligence/stats', authenticateToken, async (req, res) => {
  try {
    const stats = {
      timestamp: new Date().toISOString(),
      conversationMemory: {
        activeConversations: conversationMemory.conversations.size,
        semanticPatterns: conversationMemory.semanticPatterns?.size || 0,
        memoryStats: conversationMemory.getMemoryStats ? conversationMemory.getMemoryStats() : null
      },
      personalitySystem: {
        availablePersonalities: personalitySystem.getAvailablePersonalities().length,
        clientPersonalities: personalitySystem.clientPersonalities?.size || 0,
        usageStats: personalitySystem.getPersonalityUsageStats()
      },
      humanReasoning: {
        isActive: !!humanReasoning,
        cacheSize: humanReasoning?.reasoningCache?.size || 0,
        conversationPatterns: humanReasoning?.conversationPatterns?.size || 0
      },
      geminiService: {
        ...geminiService.getServiceStats(),
        intelligenceMode: 'enhanced'
      },
      processingStats: await getProcessingStats()
    }
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Error getting intelligence stats:', error)
    res.status(500).json({
      success: false,
      message: 'Error retrieving intelligence statistics',
      error: error.message
    })
  }
})

// 🎭 Personality System Management
app.get('/api/personality/profiles', authenticateToken, async (req, res) => {
  try {
    const profiles = personalitySystem.getAvailablePersonalities()
    res.json({
      success: true,
      data: profiles
    })
  } catch (error) {
    logger.error('Error getting personality profiles:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Helper function to get processing statistics
async function getProcessingStats() {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const conversations = await prisma.conversation.findMany({
      where: {
        createdAt: {
          gte: last24Hours
        }
      },
      select: {
        metadata: true,
        createdAt: true
      }
    })
    
    const stats = {
      total24h: conversations.length,
      byProcessingMode: {},
      byIntent: {},
      byPersonality: {},
      avgProcessingTime: 0
    }
    
    let totalProcessingTime = 0
    let processedCount = 0
    
    conversations.forEach(conv => {
      try {
        const metadata = conv.metadata ? JSON.parse(conv.metadata) : {}
        
        // Group by processing mode
        const mode = metadata.processingMode || 'unknown'
        stats.byProcessingMode[mode] = (stats.byProcessingMode[mode] || 0) + 1
        
        // Group by intent
        const intent = metadata.intent || 'unknown'
        stats.byIntent[intent] = (stats.byIntent[intent] || 0) + 1
        
        // Group by personality
        const personality = metadata.personality?.base || 'unknown'
        stats.byPersonality[personality] = (stats.byPersonality[personality] || 0) + 1
        
        // Calculate average processing time
        if (metadata.processingTime) {
          totalProcessingTime += metadata.processingTime
          processedCount++
        }
      } catch (parseError) {
        // Skip malformed metadata
      }
    })
    
    stats.avgProcessingTime = processedCount > 0 ? Math.round(totalProcessingTime / processedCount) : 0
    
    return stats
  } catch (error) {
    logger.error('Error getting processing stats:', error)
    return {
      total24h: 0,
      byProcessingMode: {},
      byIntent: {},
      byPersonality: {},
      avgProcessingTime: 0
    }
  }
}

// Health Check Routes (sin autenticación para load balancers)
app.get('/health', async (req, res) => {
  try {
    const health = await healthCheck.getSimpleHealth()
    res.status(health.status === 'ok' ? 200 : 503).json(health)
  } catch (error) {
    logger.error('Health check failed', error, { requestId: req.id })
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() })
  }
})

// 🔄 ENDPOINT ESPECÍFICO PARA KEEP-ALIVE (optimizado para ping interno)
app.get('/keep-alive', (req, res) => {
  try {
    const userAgent = req.get('User-Agent') || 'unknown'
    const isKeepAliveRequest = userAgent.includes('KeepAlive')
    
    if (isKeepAliveRequest) {
      // Log mínimo para keep-alive interno
      console.log('🔄 Keep-alive ping recibido')
    }
    
    res.json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      pid: process.pid,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      environment: process.env.NODE_ENV || 'development'
    })
  } catch (error) {
    logger.error('Keep-alive endpoint failed', error, { requestId: req.id })
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: 'Internal server error'
    })
  }
})

// 🔧 NUEVO: Health check detallado con monitoreo de WhatsApp
app.get('/health/whatsapp', authenticateToken, async (req, res) => {
  try {
    const healthReport = whatsappMonitor.getHealthReport()
    res.json({
      success: true,
      data: healthReport
    })
  } catch (error) {
    logger.error('WhatsApp health check failed', error, { requestId: req.id })
    res.status(500).json({ 
      success: false, 
      error: error.message, 
      timestamp: new Date().toISOString() 
    })
  }
})

// Root route for backend
app.get('/', (req, res) => {
  res.json({ 
    message: 'WhatsApp Business Advisor Backend API', 
    status: 'running',
    version: '1.0.0',
    documentation: '/api/health'
  });
})

app.get('/api/health', async (req, res) => {
  try {
    const health = await healthCheck.getHealthStatus()
    res.json(health)
  } catch (error) {
    logger.error('Detailed health check failed', error, { requestId: req.id })
    res.status(500).json({ error: 'Health check failed' })
  }
})

app.get('/api/metrics', async (req, res) => {
  try {
    const metrics = healthCheck.getPerformanceMetrics()
    res.json(metrics)
  } catch (error) {
    logger.error('Metrics retrieval failed', error, { requestId: req.id })
    res.status(500).json({ error: 'Metrics unavailable' })
  }
})

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // For demo purposes, use hardcoded admin credentials
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@advisor.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

    if (email === adminEmail && password === adminPassword) {
      const token = jwt.sign(
        { id: 'admin', email: adminEmail },
        process.env.NEXTAUTH_SECRET || 'default-secret',
        { expiresIn: '24h' }
      )

      res.json({ token, user: { email: adminEmail, name: 'Administrador' } })
    } else {
      res.status(401).json({ message: 'Credenciales inválidas' })
    }
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// Dashboard stats (temporal - sin autenticación para debugging)
app.get('/api/dashboard/stats-debug', async (req, res) => {
  try {
    const totalClients = await prisma.client.count()
    const activeClients = await prisma.client.count({
      where: {
        isActive: true,
        expiryDate: { gt: new Date() }
      }
    })
    const expiredClients = await prisma.client.count({
      where: {
        expiryDate: { lte: new Date() }
      }
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayMessages = await prisma.conversation.count({
      where: {
        timestamp: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    const totalMessages = await prisma.conversation.count()

    const expiringToday = await prisma.client.count({
      where: {
        expiryDate: {
          gte: today,
          lt: tomorrow
        },
        isActive: true
      }
    })

    res.json({
      totalClients,
      activeClients,
      expiredClients,
      todayMessages,
      totalMessages,
      expiringToday
    })
  } catch (error) {
    console.error('Stats error:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas' })
  }
})

// 🚫 ENDPOINT ESPECIAL: Eliminar clientes auto-creados (TEMPORAL)
app.delete('/api/cleanup/auto-clients', async (req, res) => {
  try {
    console.log('🧹 Limpiando clientes creados automáticamente...')
    
    // Buscar clientes con nombres como "Cliente-XXXX" que fueron auto-creados
    const autoClients = await prisma.client.findMany({
      where: {
        name: {
          startsWith: 'Cliente-'
        },
        isNameConfirmed: false
      }
    })
    
    console.log(`🔍 Encontrados ${autoClients.length} clientes auto-creados para eliminar`)
    
    const deleteResults = []
    for (const client of autoClients) {
      try {
        await prisma.client.delete({
          where: { id: client.id }
        })
        deleteResults.push({
          phoneNumber: client.phoneNumber,
          name: client.name,
          status: 'deleted'
        })
        console.log(`✅ Cliente eliminado: ${client.name} (${client.phoneNumber})`)
      } catch (deleteError) {
        deleteResults.push({
          phoneNumber: client.phoneNumber,
          name: client.name,
          status: 'error',
          error: deleteError.message
        })
        console.error(`❌ Error eliminando ${client.name}:`, deleteError.message)
      }
    }
    
    res.json({
      success: true,
      message: `Limpieza completada: ${deleteResults.filter(r => r.status === 'deleted').length} eliminados`,
      results: deleteResults
    })
    
  } catch (error) {
    console.error('Error en limpieza de clientes:', error)
    res.status(500).json({
      success: false,
      message: 'Error en limpieza: ' + error.message
    })
  }
})

// 📊 API USAGE STATS - NUEVO ENDPOINT PARA CONSUMO POR USUARIO
app.get('/api/api-usage/stats', async (req, res) => {
  try {
    console.log('📊 Generando estadísticas de uso de API por usuario...')
    
    // 🎯 COSTOS DE GEMINI 1.5 FLASH
    const GEMINI_COSTS = {
      inputTokenCost: 0.075 / 1000000,  // $0.075 per million tokens
      outputTokenCost: 0.30 / 1000000,  // $0.30 per million tokens
      model: 'gemini-1.5-flash'
    }
    
    // 👥 OBTENER CLIENTES ACTIVOS DESDE CLIENTSERVICE
    const activeClients = await clientService.getAllClients()
    
    // 📊 OBTENER ESTADÍSTICAS DE API DESDE GEMINISERVICE
    const apiStats = geminiService.getServiceStats()
    
    // 🔍 PROCESAR DATOS POR USUARIO
    const userApiData = activeClients.map(client => {
      // Simular datos de tokens basados en mensajes (en producción vendría de logs)
      const estimatedInputTokens = client.messageCount * 150  // ~150 tokens por mensaje input promedio
      const estimatedOutputTokens = client.messageCount * 300 // ~300 tokens por respuesta promedio
      
      const inputCost = estimatedInputTokens * GEMINI_COSTS.inputTokenCost
      const outputCost = estimatedOutputTokens * GEMINI_COSTS.outputTokenCost
      const totalCost = inputCost + outputCost
      
      // Calcular días desde primer contacto
      const daysSinceFirstSeen = Math.max(1, Math.floor((Date.now() - new Date(client.firstSeen).getTime()) / (1000 * 60 * 60 * 24)))
      const avgRequestsPerDay = client.messageCount / daysSinceFirstSeen
      
      return {
        userId: client.id,
        userName: client.name,
        phone: client.phoneNumber,
        totalRequests: client.messageCount,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        totalCost: totalCost,
        lastRequest: client.lastSeen,
        avgRequestsPerDay: avgRequestsPerDay
      }
    })
    
    // 📈 CALCULAR ESTADÍSTICAS GENERALES
    const totalUsers = userApiData.length
    const totalCosts = userApiData.reduce((sum, user) => sum + user.totalCost, 0)
    const totalRequests = userApiData.reduce((sum, user) => sum + user.totalRequests, 0)
    const totalTokens = userApiData.reduce((sum, user) => sum + user.inputTokens + user.outputTokens, 0)
    const avgCostPerUser = totalUsers > 0 ? totalCosts / totalUsers : 0
    
    // Estimación de costos de hoy (15% del total como ejemplo)
    const costToday = totalCosts * 0.15
    
    const result = {
      success: true,
      users: userApiData.sort((a, b) => b.totalCost - a.totalCost), // Ordenar por costo descendente
      stats: {
        totalUsers,
        totalCosts,
        totalRequests,
        totalTokens,
        avgCostPerUser,
        costToday
      },
      pricing: GEMINI_COSTS,
      generated: new Date().toISOString()
    }
    
    console.log(`✅ Estadísticas generadas para ${totalUsers} usuarios. Costo total: $${totalCosts.toFixed(6)}`)
    res.json(result)
    
  } catch (error) {
    console.error('❌ Error generando estadísticas de API:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al generar estadísticas de API: ' + error.message,
      users: [],
      stats: {
        totalUsers: 0,
        totalCosts: 0,
        totalRequests: 0,
        totalTokens: 0,
        avgCostPerUser: 0,
        costToday: 0
      }
    })
  }
})

// Dashboard stats (sin autenticación para debugging temporal)
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    console.log('📊 Generando estadísticas del dashboard...')
    
    // 👥 USAR ESTADÍSTICAS REALES DESDE CLIENTSERVICE
    const clientStats = await clientService.getStats()
    
    // 💬 CONTAR MENSAJES DESDE PRISMA (si existen)
    let todayMessages = 0
    let totalMessages = 0
    
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      todayMessages = await prisma.conversation.count({
        where: {
          timestamp: {
            gte: today,
            lt: tomorrow
          }
        }
      })

      totalMessages = await prisma.conversation.count()
    } catch (dbError) {
      console.log('⚠️ No se pudieron obtener mensajes de la BD:', dbError.message)
      // Usar estimaciones basadas en clientes
      totalMessages = clientStats.total * 5 // Estimación
      todayMessages = Math.floor(clientStats.active * 0.3) // Estimación
    }

    const stats = {
      totalClients: clientStats.total,
      activeClients: clientStats.active + clientStats.vip,
      expiredClients: clientStats.new, // Los nuevos necesitan seguimiento
      todayMessages,
      totalMessages,
      expiringToday: 0 // No hay sistema de expiración en clientService
    }
    
    console.log('📊 Dashboard stats generadas:', stats)
    res.json(stats)
  } catch (error) {
    console.error('Stats error:', error)
    // 🛡️ Devolver datos por defecto en caso de error
    res.json({
      totalClients: 0,
      activeClients: 0,
      expiredClients: 0,
      todayMessages: 0,
      totalMessages: 0,
      expiringToday: 0
    })
  }
})

// Client management
app.get('/api/clients-old', authenticateToken, async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(clients)
  } catch (error) {
    console.error('Get clients error:', error)
    res.status(500).json({ message: 'Error al obtener clientes' })
  }
})

app.post('/api/clients', async (req, res) => {
  try {
    console.log('📥 Request body received:', JSON.stringify(req.body, null, 2))
    
    const { name, phone, expiryDate } = req.body

    // 🔍 VALIDATE INPUT WITH DETAILED LOGGING
    if (!name) {
      console.error('❌ Validation error: name is missing')
      return res.status(400).json({ 
        message: 'El nombre es requerido',
        field: 'name' 
      })
    }
    
    if (!phone) {
      console.error('❌ Validation error: phone is missing')
      return res.status(400).json({ 
        message: 'El teléfono es requerido',
        field: 'phone' 
      })
    }
    
    if (!expiryDate) {
      console.error('❌ Validation error: expiryDate is missing')
      return res.status(400).json({ 
        message: 'La fecha de expiración es requerida',
        field: 'expiryDate' 
      })
    }

    // 🔄 MIGRADO: Usar el nuevo schema con phoneNumber
    const phoneNumber = phone.replace(/\D/g, '') // Solo números
    console.log(`📞 Phone number processed: ${phone} -> ${phoneNumber}`)
    
    // Check if phoneNumber already exists
    console.log('🔍 Checking for existing client...')
    const existingClient = await prisma.client.findUnique({
      where: { phoneNumber: phoneNumber }
    })

    if (existingClient) {
      console.log(`❌ Client already exists: ${existingClient.name} (${phoneNumber})`)
      return res.status(400).json({
        message: 'Ya existe un cliente con este número de teléfono',
        field: 'phone'
      })
    }

    console.log('✅ Creating new client...')
    
    // 🔄 CREAR CON NUEVO SCHEMA
    const client = await prisma.client.create({
      data: {
        name,
        phoneNumber: phoneNumber,  // ✅ NUEVO: phoneNumber requerido
        phone: phone,              // ✅ OPCIONAL: phone para compatibilidad
        expiryDate: new Date(expiryDate),
        isActive: true,
        isNameConfirmed: true,     // ✅ NUEVO
        firstSeen: new Date(),     // ✅ NUEVO
        lastSeen: new Date(),      // ✅ NUEVO
        messageCount: 0,           // ✅ NUEVO
        status: 'active',          // ✅ NUEVO
        topics: '[]',              // ✅ NUEVO
        preferences: '{}'          // ✅ NUEVO
      }
    })

    console.log('✅ Cliente creado exitosamente:', {
      id: client.id,
      name: client.name,
      phoneNumber: client.phoneNumber
    })
    
    res.status(201).json({
      success: true,
      client,
      message: 'Cliente creado exitosamente'
    })
  } catch (error) {
    console.error('❌ Create client error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      requestBody: req.body
    })
    
    // 🔍 ERROR ESPECÍFICO PARA PRISMA
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: 'Ya existe un cliente con este número de teléfono',
        field: 'phone'
      })
    }
    
    res.status(500).json({ 
      message: 'Error al crear cliente: ' + error.message,
      error: error.message
    })
  }
})

app.patch('/api/clients/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const client = await prisma.client.findUnique({
      where: { id }
    })

    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' })
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: { isActive: !client.isActive }
    })

    res.json(updatedClient)
  } catch (error) {
    console.error('Toggle client error:', error)
    res.status(500).json({ message: 'Error al cambiar estado del cliente' })
  }
})

// Bot status
app.get('/api/bot/status', authenticateToken, async (req, res) => {
  try {
    const status = whatsappService.getStatus()
    res.json(status)
  } catch (error) {
    console.error('Bot status error:', error)
    res.status(500).json({ message: 'Error al obtener estado del bot' })
  }
})

// 🔧 CONFIGURACIÓN DEL SISTEMA - SINCRONIZACIÓN BACKEND
app.get('/api/server/config', authenticateToken, async (req, res) => {
  try {
    const config = geminiService.configService.getAll()
    res.json(config)
  } catch (error) {
    console.error('Config get error:', error)
    res.status(500).json({ message: 'Error al obtener configuración del servidor' })
  }
})

app.post('/api/server/config', authenticateToken, async (req, res) => {
  try {
    const updatedConfig = await geminiService.configService.updateAll(req.body)
    console.log('✅ Configuración del servidor actualizada:', {
      company: updatedConfig.company_name,
      representative: updatedConfig.representative_name,
      greeting_style: updatedConfig.greeting_style
    })
    res.json({ success: true, config: updatedConfig })
  } catch (error) {
    console.error('Config update error:', error)
    res.status(500).json({ message: 'Error al actualizar configuración del servidor' })
  }
})

// 🔄 ENDPOINT DE RECARGA DE CONFIGURACIÓN (SIN AUTENTICACIÓN PARA COMUNICACIÓN INTERNA)
app.post('/api/server/config/reload', async (req, res) => {
  try {
    // Recargar configuración desde el archivo compartido
    await geminiService.configService.loadConfig()
    const config = geminiService.configService.getAll()
    
    console.log('🔄 Configuración recargada desde archivo compartido:', {
      company: config.company_name,
      representative: config.representative_name,
      greeting_style: config.greeting_style
    })
    
    res.json({ 
      success: true, 
      message: 'Configuración recargada exitosamente',
      config
    })
  } catch (error) {
    console.error('Config reload error:', error)
    res.status(500).json({ message: 'Error al recargar configuración' })
  }
})

app.post('/api/bot/restart', authenticateToken, async (req, res) => {
  try {
    await whatsappService.restart()
    res.json({ message: 'Bot reiniciado exitosamente' })
  } catch (error) {
    console.error('Bot restart error:', error)
    res.status(500).json({ message: 'Error al reiniciar bot' })
  }
})

// Notifications
app.get('/api/notifications/count', async (req, res) => {
  try {
    // Para el sistema de ChatBot, retornamos 0 notificaciones
    // ya que no usamos el sistema de suscripciones
    res.json({ count: 0 })
  } catch (error) {
    console.error('Notifications count error:', error)
    res.status(500).json({ message: 'Error al obtener notificaciones' })
  }
})

// 👥 CLIENTES - RUTAS DE GESTIÓN UNIFICADAS (USA CLIENTSERVICE REAL)
app.get('/api/clients', async (req, res) => {
  try {
    console.log('🔍 Obteniendo clientes desde clientService...')
    
    // 👥 USAR EL SISTEMA REAL DE WHATSAPP
    const realClients = await clientService.getAllClients()
    
    console.log(`✅ Encontrados ${realClients.length} clientes reales desde WhatsApp`)
    
    // 🔄 Transformar al formato del dashboard con nombres reales
    const transformedClients = realClients.map(client => ({
      id: client.id,
      name: client.name, // NOMBRE REAL
      phoneNumber: client.phoneNumber,
      phone: client.phoneNumber,
      isNameConfirmed: client.isNameConfirmed,
      firstSeen: client.firstSeen,
      lastSeen: client.lastSeen,
      messageCount: client.messageCount,
      status: client.status,
      topics: client.topics || ['WhatsApp'],
      preferences: client.preferences || {},
      // Campos adicionales para compatibilidad
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: client.status !== 'new',
      lastActivity: client.lastSeen
    }))
    
    console.log('📋 Clientes transformados:', transformedClients.map(c => `${c.name} (${c.phoneNumber})`).join(', '))
    
    res.json({ 
      success: true, 
      clients: transformedClients
    })
  } catch (error) {
    console.error('❌ Clients get error:', {
      message: error.message,
      stack: error.stack
    })
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener clientes: ' + error.message,
      clients: []
    })
  }
})

app.get('/api/clients/stats', async (req, res) => {
  try {
    console.log('📊 Generando estadísticas desde clientService...')
    
    // 👥 USAR ESTADÍSTICAS REALES DEL SISTEMA DE WHATSAPP
    const stats = await clientService.getStats()
    
    console.log('📊 Estadísticas generadas:', stats)
    
    res.json(stats)
  } catch (error) {
    console.error('Client stats error:', error)
    res.json({
      total: 0,
      new: 0,
      active: 0,
      vip: 0,
      withConfirmedNames: 0
    })
  }
})

app.post('/api/clients/promote', async (req, res) => {
  try {
    const { phone } = req.body
    
    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Número de teléfono requerido' 
      })
    }
    
    console.log(`👑 Promocionando cliente a VIP: ${phone}`)
    
    // 👥 USAR EL SISTEMA REAL DE WHATSAPP
    const client = await clientService.promoteToVIP(phone)
    
    if (client) {
      res.json({ 
        success: true, 
        message: 'Cliente promocionado a VIP exitosamente',
        client
      })
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      })
    }
  } catch (error) {
    console.error('Client promote error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al promocionar cliente: ' + error.message
    })
  }
})

app.post('/api/clients/update', async (req, res) => {
  try {
    const { phone, name } = req.body
    
    if (!phone || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Teléfono y nombre son requeridos' 
      })
    }
    
    console.log(`📝 Actualizando cliente: ${phone} -> ${name}`)
    
    // 👥 USAR EL SISTEMA REAL DE WHATSAPP
    const client = await clientService.updateClientName(phone, name)
    
    if (client) {
      res.json({ 
        success: true, 
        message: 'Cliente actualizado exitosamente',
        client
      })
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      })
    }
  } catch (error) {
    console.error('Client update error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar cliente: ' + error.message
    })
  }
})

// 🆕 NUEVA RUTA: Actualizar cliente por ID (UNIFICADO CON PRISMA)
app.put('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, phone } = req.body
    
    if (!name || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nombre y teléfono son requeridos' 
      })
    }
    
    // Buscar cliente por ID y actualizar
    const client = await prisma.client.findUnique({
      where: { id }
    })
    
    if (client) {
      // 🔄 MIGRADO: Verificar si el nuevo phoneNumber ya existe para otro cliente
      const newPhoneNumber = phone.replace(/\D/g, '')
      const existingClient = await prisma.client.findUnique({
        where: { phoneNumber: newPhoneNumber }
      })
      
      if (existingClient && existingClient.id !== id) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un cliente con este número de teléfono',
          field: 'phone'
        })
      }
      
      const updatedClient = await prisma.client.update({
        where: { id },
        data: { 
          name,
          phoneNumber: newPhoneNumber, // 🔄 MIGRADO: usar phoneNumber
          phone,                        // 🔄 Mantener para compatibilidad
          lastActivity: new Date()
        }
      })
      
      res.json({ 
        success: true, 
        message: 'Cliente actualizado exitosamente',
        client: updatedClient
      })
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      })
    }
  } catch (error) {
    console.error('Client update by ID error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar cliente' 
    })
  }
})

// 🆕 NUEVA RUTA: Eliminar cliente (UNIFICADO CON CLIENTSERVICE)
app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    console.log(`🗑️ Intentando eliminar cliente: ${id}`)
    
    // 🔄 USAR CLIENTSERVICE para eliminación
    const client = await clientService.findClientByPhone(id)
    
    if (client) {
      // Eliminar del sistema Prisma también si existe
      try {
        const prismaClient = await prisma.client.findUnique({
          where: { phoneNumber: id }
        })
        
        if (prismaClient) {
          await prisma.client.delete({
            where: { phoneNumber: id }
          })
          console.log(`✅ Cliente eliminado de Prisma: ${id}`)
        }
      } catch (prismaError) {
        console.log(`⚠️ No se pudo eliminar de Prisma (puede que no exista): ${prismaError.message}`)
      }
      
      // Eliminar del ClientService (archivo JSON)
      await clientService.deleteClient(id)
      
      console.log(`✅ Cliente eliminado exitosamente: ${client.name} (${id})`)
      
      res.json({ 
        success: true, 
        message: 'Cliente eliminado exitosamente'
      })
    } else {
      console.log(`❌ Cliente no encontrado: ${id}`)
      res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      })
    }
  } catch (error) {
    console.error('Client delete error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar cliente: ' + error.message
    })
  }
})

// 🆕 NUEVA RUTA: Toggle status de cliente (UNIFICADO CON PRISMA)
app.patch('/api/clients/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params
    
    const client = await prisma.client.findUnique({
      where: { id }
    })
    
    if (client) {
      const updatedClient = await prisma.client.update({
        where: { id },
        data: { 
          isActive: !client.isActive,
          lastActivity: new Date()
        }
      })
      
      res.json({ 
        success: true, 
        message: `Cliente ${updatedClient.isActive ? 'activado' : 'desactivado'} exitosamente`,
        client: updatedClient
      })
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      })
    }
  } catch (error) {
    console.error('Client toggle error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al cambiar estado del cliente' 
    })
  }
})

// WhatsApp service will be initialized on user request via Socket.IO

// Cron job to check expiring subscriptions (runs every hour)
cron.schedule('0 * * * *', async () => {
  console.log('Checking for expiring subscriptions...')
  
  try {
    // Check for subscriptions expiring in 24 hours
    const expiringClients = await prisma.client.findMany({
      where: {
        expiryDate: {
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
          gte: new Date()
        },
        reminderSent: false,
        isActive: true
      }
    })

    for (const client of expiringClients) {
      const message = `Hola ${client.name}, tu suscripción al servicio de asesoría empresarial vence mañana. Para renovar, contacta con tu asesor.`
      
      await whatsappService.sendMessage(client.phone, message)
      
      await prisma.client.update({
        where: { id: client.id },
        data: { reminderSent: true }
      })
    }

    // Check for expired subscriptions
    const expiredClients = await prisma.client.findMany({
      where: {
        expiryDate: { lte: new Date() },
        expiredNotificationSent: false,
        isActive: true
      }
    })

    for (const client of expiredClients) {
      const message = `Hola ${client.name}, tu suscripción al servicio de asesoría empresarial ha expirado. Para reactivar tu acceso, contacta con tu asesor.`
      
      await whatsappService.sendMessage(client.phone, message)
      
      await prisma.client.update({
        where: { id: client.id },
        data: { 
          expiredNotificationSent: true,
          isActive: false
        }
      })
    }

    console.log(`Processed ${expiringClients.length} expiring and ${expiredClients.length} expired subscriptions`)
    console.log(`💾 Memory stats: ${JSON.stringify(conversationMemory.getMemoryStats())}`)
  } catch (error) {
    console.error('Cron job error:', error)
  }
})

// 🧠 Handle incoming WhatsApp messages with intelligent processing
whatsappService.on('message', async (message) => {
  const startTime = Date.now()
  const processingTimeout = 30000 // 30 segundos timeout
  
  try {
    // Crear una promesa con timeout
    const processMessage = new Promise(async (resolve, reject) => {
      try {
        const { from, body } = message
        
        // 🔍 LOGGING MEJORADO: Identificar tipo de origen
        let messageType = 'UNKNOWN'
        if (from.includes('@g.us')) {
          messageType = 'GROUP'
        } else if (from.endsWith('@s.whatsapp.net')) {
          messageType = 'PRIVATE'
        } else if (from.includes('@broadcast')) {
          messageType = 'BROADCAST'
        }
        
        logger.whatsapp('info', `Mensaje recibido - Tipo: ${messageType}`, from, { 
          message: body.substring(0, 100),
          messageType: messageType,
          isGroup: messageType === 'GROUP'
        })

        // 🔥 PASO CRÍTICO: GUARDAR MENSAJE INMEDIATAMENTE PARA PRESERVAR CONTEXTO
        try {
          // 🔄 MIGRADO: Buscar por phoneNumber
          const phoneNumber = from.replace(/\D/g, '')
          const tempClient = await dbMonitor.findUnique('client', {
            where: { phoneNumber: phoneNumber }
          })
          
          if (tempClient) {
            // 🔒 GARANTIZAR PERSISTENCIA INMEDIATA - CRÍTICO PARA TIMEOUTS
            const conversationRecord = await dbMonitor.create('conversation', {
              data: {
                clientId: tempClient.id,
                phone: from,
                message: body,
                response: '[PROCESSING...]', // Placeholder
                metadata: JSON.stringify({
                  processingStarted: new Date().toISOString(),
                  status: 'processing',
                  preservedContext: true // MARCADOR IMPORTANTE
                })
              }
            })
            
            // Agregar a memoria conversacional inmediatamente
            const intent = geminiService.detectIntent(body)
            conversationMemory.addMessage(from, body, '[PROCESSING...]', intent, {
              timestamp: new Date(),
              processing: true,
              conversationId: conversationRecord.id
            })
            
            logger.info('💾 Contexto preservado inmediatamente con ID:', conversationRecord.id)
          }
        } catch (contextError) {
          logger.error('❌ Error preservando contexto:', {
            error: contextError.message,
            stack: contextError.stack,
            phone: from,
            message: body?.substring(0, 100)
          })
          // 🆘 FALLBACK: Intentar guardar solo en memoria
          try {
            const intent = geminiService.detectIntent(body)
            conversationMemory.addMessage(from, body, '[PROCESSING...]', intent, {
              timestamp: new Date(),
              processing: true,
              fallbackMode: true
            })
            logger.info('📝 Contexto guardado en memoria como fallback')
          } catch (memoryError) {
            logger.error('❌ Error crítico en preservación de contexto:', {
              error: memoryError.message,
              stack: memoryError.stack,
              phone: from
            })
          }
        }

        // 👥 PASO 1: VERIFICAR SI EL CLIENTE EXISTE (SIN CREAR AUTOMÁTICAMENTE)
        console.log(`👥 Verificando cliente existente: ${from}`)
        const existingClient = await clientService.findClientByPhone(from)
        
        if (!existingClient) {
          // ❌ CLIENTE NO EXISTE - ENVIAR MENSAJE DE ACCESO DENEGADO
          console.log(`❌ Cliente no registrado: ${from}`)
          const accessDeniedMessage = `¡Hola! 👋 

Para acceder a nuestro servicio de asesoría empresarial, necesitas ser registrado por un administrador.

📞 Contacta a tu asesor para obtener acceso al sistema.

¡Gracias por tu interés! 🙏`
          
          await whatsappService.sendMessage(from, accessDeniedMessage)
          
          logger.whatsapp('warn', 'Acceso denegado - Cliente no registrado', from, {
            message: body?.substring(0, 100),
            action: 'access_denied'
          })
          
          resolve()
          return // 🚫 SALIR SIN PROCESAR MÁS
        }
        
        // ✅ CLIENTE EXISTE - ACTUALIZAR ÚLTIMA ACTIVIDAD
        const client = await clientService.updateClientActivity(existingClient.phoneNumber)
        console.log(`✅ Cliente autorizado: ${client.name} (${client.status})`)

        // 🧠 PASO 1: APLICAR RAZONAMIENTO HUMANO INTELIGENTE
        logger.info('🧠 Aplicando razonamiento humano para análisis contextual...')
        const conversationHistory = conversationMemory.getConversationContext(from).messages || []
        
        let humanReasoningResult = null
        if (humanReasoning) {
          humanReasoningResult = await humanReasoning.reasonAboutMessage(from, body, conversationHistory)
          
          logger.info('🧠 Resultado del razonamiento humano:', {
            type: humanReasoningResult.type,
            confidence: humanReasoningResult.confidence,
            reasoning: humanReasoningResult.reasoning
          })
          
          // Si el razonamiento humano tiene alta confianza y respuesta directa
          if (humanReasoningResult.confidence > 0.8 && humanReasoningResult.suggestedResponse) {
            logger.info('🎯 Usando respuesta directa del razonamiento humano')
            
            // 🆘 VERIFICAR QUE NO SEA RESPUESTA HARDCODEADA
            if (humanReasoningResult.suggestedResponse === null || 
                humanReasoningResult.suggestedResponse.includes('Como consultor empresarial especializado, analicemos')) {
              logger.warn('⚠️ Respuesta hardcodeada detectada, usando IA en su lugar')
              // Continuar con el procesamiento normal de IA
            } else {
              await whatsappService.sendMessage(from, humanReasoningResult.suggestedResponse)
              
              // Registrar en base de datos y memoria
              await Promise.all([
                prisma.conversation.create({
                  data: {
                    clientId: client.id,
                    phone: from,
                    message: body,
                    response: humanReasoningResult.suggestedResponse,
                    metadata: JSON.stringify({
                      source: 'human_reasoning',
                      reasoning: humanReasoningResult,
                      processingTime: Date.now() - startTime
                    })
                  }
                }),
                conversationMemory.addMessage(from, body, humanReasoningResult.suggestedResponse, 'contextual_response', {
                  reasoning: humanReasoningResult,
                  source: 'human_reasoning'
                })
              ])
              
              logger.whatsapp('info', 'Mensaje procesado con razonamiento humano', from, {
                clientName: client.name,
                duration: Date.now() - startTime,
                processingMode: 'human_reasoning'
              })
              
              resolve()
              return
            }
          }
        }

        // 🎭 PASO 2: ADAPTAR PERSONALIDAD PARA EL CLIENTE
        logger.info('🎭 Adaptando personalidad para el cliente...')
        let personalityContext = null
        if (personalitySystem) {
          personalityContext = await personalitySystem.analyzeClientPersonality(
            from,
            conversationHistory,
            { 
              currentMessage: body, 
              reasoningResult: humanReasoningResult,
              clientProfile: {
                name: client.name,
                messageCount: client.messageCount,
                lastActivity: client.lastActivity
              }
            }
          )
          
          logger.info('🎭 Personalidad adaptada:', {
            personality: personalityContext.basePersonality,
            sophistication: personalityContext.clientAdaptations?.businessSophistication,
            urgency: personalityContext.clientAdaptations?.urgencyLevel
          })
        }

        // Detectar intención del mensaje
        const intent = geminiService.detectIntent(body)
        
        // 👋 DETECTAR SALUDOS Y GENERAR SALUDO ELEGANTE CON PRISMA
        if (intent === 'greeting') {
          logger.info('👋 Saludo detectado, generando saludo elegante personalizado')
          
          try {
            // 📊 OBTENER DATOS DE LA EMPRESA DESDE CONFIGSERVICE
            const companyConfig = geminiService.configService ? geminiService.configService.getCompanyInfo() : null
            const companyName = companyConfig?.name || 'GHS'
            const representativeName = companyConfig?.representative?.name || 'Luis G.'
            
            // 🕰️ GENERAR SALUDO BASADO EN HORA
            const hour = new Date().getHours()
            let timeGreeting
            if (hour >= 5 && hour < 12) {
              timeGreeting = '¡Buenos días'
            } else if (hour >= 12 && hour < 18) {
              timeGreeting = '¡Buenas tardes'
            } else {
              timeGreeting = '¡Buenas noches'
            }
            
            // 🎆 GENERAR SALUDO ELEGANTE PERSONALIZADO CON FORMATEO CORRECTO
            // Usar el formatter del backup para aplicar negritas correctamente y saludo según hora
            const elegantWelcome = geminiService.formatter.formatWelcomeMessage(client.name, [], timeGreeting)
            
            await whatsappService.sendMessage(from, elegantWelcome)
            
            // Registrar conversación usando clientService (mantener compatibilidad)
            try {
              // 📝 INTENTAR GUARDAR EN PRISMA SI ES POSIBLE
              await prisma.conversation.create({
                data: {
                  phone: from,
                  message: body,
                  response: elegantWelcome,
                  metadata: JSON.stringify({
                    intent: 'greeting',
                    processingMode: 'elegant_welcome',
                    companyUsed: companyName,
                    representativeUsed: representativeName,
                    processingTime: Date.now() - startTime,
                    clientName: client.name
                  })
                }
              })
            } catch (dbError) {
              console.log('⚠️ No se pudo guardar en BD, continuando...', dbError.message)
            }
            
            const duration = Date.now() - startTime
            logger.whatsapp('info', 'Saludo elegante enviado exitosamente', from, { 
              clientName: client.name,
              duration,
              mode: 'elegant_welcome',
              company: companyName,
              representative: representativeName,
              messageLength: elegantWelcome.length
            })
            
            resolve()
            return // 🚫 SALIR TEMPRANO - NO CONTINUAR CON IA
            
          } catch (welcomeError) {
            logger.error('⚠️ Error en saludo elegante:', welcomeError)
            
            // 🆘 FALLBACK SEGURO - SALUDO BÁSICO
            const fallbackMessage = `¡Hola ${client.name}! Soy tu asesor empresarial especializado. ¿En qué puedo ayudarte hoy?`
            await whatsappService.sendMessage(from, fallbackMessage)
            
            await prisma.conversation.create({
              data: {
                clientId: client.id,
                phone: from,
                message: body,
                response: fallbackMessage,
                metadata: JSON.stringify({
                  intent: 'greeting',
                  processingMode: 'fallback_welcome',
                  error: welcomeError.message,
                  processingTime: Date.now() - startTime
                })
              }
            })
            
            resolve()
            return // 🚫 SALIR TEMPRANO - NO CONTINUAR CON IA
          }
        }

        // 📚 PASO 3: OBTENER CONTEXTO INTELIGENTE DE CONOCIMIENTOS
        logger.info('📚 Obteniendo contexto de conocimientos...')
        let knowledgeContext = knowledgeBase.getContext()

        // Si es una consulta específica, buscar información relevante
        if (intent === 'business_query' || intent === 'legal_query' || intent === 'corporate_query' || intent === 'financial_crime_query') {
          const relevantInfo = knowledgeBase.searchTopic(body)
          if (relevantInfo) {
            knowledgeContext = relevantInfo
            logger.info('🔍 Contexto especializado obtenido para:', intent)
          }
        }

        // 🤖 PASO 4: GENERAR RESPUESTA CON IA MEJORADA
        logger.info('🤖 Generando respuesta con IA adaptativa...')
        
        // 📊 PREPARAR DATOS DEL CLIENTE Y EMPRESA PARA LA IA
        const companyConfig = geminiService.configService ? geminiService.configService.getCompanyInfo() : null
        const clientDataForAI = {
          name: client.name,
          phone: client.phone,
          isActive: client.isActive,
          messageCount: client.messageCount,
          lastActivity: client.lastActivity,
          expiryDate: client.expiryDate
        }
        
        const companyDataForAI = {
          name: companyConfig?.name || 'GHS',
          representative: {
            name: companyConfig?.representative?.name || 'Luis G.',
            role: companyConfig?.representative?.role || 'Asesor Empresarial Experto en Estrategias Financieras Avanzadas'
          },
          greeting_style: companyConfig?.greeting_style || 'professional',
          tone: companyConfig?.tone || 'professional'
        }
        
        const responses = await geminiService.getResponse(body, knowledgeContext, from, clientDataForAI, companyDataForAI)

        // 📱 PASO 5: ENVIAR RESPUESTA(S) CON FORMATO INTELIGENTE Y PROTECCIÓN
        try {
          if (Array.isArray(responses)) {
            for (let i = 0; i < responses.length; i++) {
              // 🔒 ENVIO PROTEGIDO CON VERIFICACIÓN DE CONEXIÓN
              if (!whatsappService.isConnected) {
                logger.warn('⚠️ WhatsApp desconectado antes del envío, reintentando...')
                await new Promise(resolve => setTimeout(resolve, 2000)) // Esperar 2s
                
                // Verificar nuevamente
                if (!whatsappService.isConnected) {
                  throw new Error('WhatsApp no disponible después de espera')
                }
              }
              
              await whatsappService.sendMessage(from, responses[i])

              // Pausa inteligente entre mensajes múltiples
              if (i < responses.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500))
              }
            }
          } else {
            // 🔒 ENVIO PROTEGIDO PARA MENSAJE ÚNCO
            if (!whatsappService.isConnected) {
              logger.warn('⚠️ WhatsApp desconectado antes del envío, reintentando...')
              await new Promise(resolve => setTimeout(resolve, 2000)) // Esperar 2s
              
              if (!whatsappService.isConnected) {
                throw new Error('WhatsApp no disponible después de espera')
              }
            }
            
            await whatsappService.sendMessage(from, responses)
          }
        } catch (sendError) {
          logger.error('❌ Error enviando mensaje:', sendError)
          
          // 💾 GUARDAR RESPUESTA AUNQUE NO SE PUEDA ENVIAR
          responseText = Array.isArray(responses) ? responses.join(' | ') : responses
          
          // Programar reintento de envío
          setTimeout(async () => {
            try {
              if (whatsappService.isConnected) {
                await whatsappService.sendMessage(from, '🔄 Reenvío de respuesta anterior:\n\n' + responseText)
                logger.info('✅ Respuesta reenviada exitosamente')
              }
            } catch (retryError) {
              logger.error('❌ Error en reintento de envío:', retryError)
            }
          }, 10000) // Reintentar en 10 segundos
          
          // Continuar con el guardado en BD
        }

        // 📊 PASO 6: REGISTRAR CONVERSACIÓN CON METADATOS ENRIQUECIDOS
        const responseText = Array.isArray(responses) ? responses.join(' | ') : responses
        const processingMetadata = {
          intent: intent,
          processingMode: 'intelligent_ai',
          humanReasoning: humanReasoningResult ? {
            type: humanReasoningResult.type,
            confidence: humanReasoningResult.confidence,
            applied: false
          } : null,
          personality: personalityContext ? {
            base: personalityContext.basePersonality,
            adaptations: personalityContext.clientAdaptations
          } : null,
          knowledgeSource: intent === 'business_query' ? 'specialized' : 'general',
          processingTime: Date.now() - startTime,
          clientSophistication: personalityContext?.clientAdaptations?.businessSophistication || 'unknown'
        }

        // 🔥 ACTUALIZAR REGISTRO EXISTENTE EN LUGAR DE CREAR NUEVO
        try {
          // Buscar el registro de procesamiento que creamos al inicio
          const existingRecord = await prisma.conversation.findFirst({
            where: {
              clientId: client.id,
              phone: from,
              message: body,
              response: '[PROCESSING...]'
            },
            orderBy: { createdAt: 'desc' }
          })
          
          if (existingRecord) {
            // 🔒 ACTUALIZACIÓN PROTEGIDA CONTRA TIMEOUTS
            await Promise.race([
              prisma.conversation.update({
                where: { id: existingRecord.id },
                data: {
                  response: responseText,
                  metadata: JSON.stringify({
                    ...processingMetadata,
                    processingCompleted: new Date().toISOString(),
                    status: 'completed',
                    contextPreserved: true
                  })
                }
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('DB update timeout')), 5000)
              )
            ]).catch(async (updateError) => {
              logger.warn('⚠️ Timeout en actualización, creando registro nuevo')
              // Fallback: crear nuevo registro
              await prisma.conversation.create({
                data: {
                  clientId: client.id,
                  phone: from,
                  message: body,
                  response: responseText,
                  metadata: JSON.stringify({
                    ...processingMetadata,
                    fallbackRecord: true,
                    originalId: existingRecord.id
                  })
                }
              })
            })
            
            logger.info('💾 Registro de conversación actualizado exitosamente')
          } else {
            // Fallback: crear nuevo registro
            await prisma.conversation.create({
              data: {
                clientId: client.id,
                phone: from,
                message: body,
                response: responseText,
                metadata: JSON.stringify(processingMetadata)
              }
            })
          }
        } catch (dbError) {
          logger.error('❌ Error actualizando base de datos:', {
            error: dbError.message,
            code: dbError.code,
            stack: dbError.stack,
            phone: from,
            clientId: client?.id,
            operation: 'update_conversation'
          })
          // 🆘 FALLBACK CRÍTICO: Asegurar que al menos se guarde
          try {
            await prisma.conversation.create({
              data: {
                clientId: client.id,
                phone: from,
                message: body,
                response: responseText,
                metadata: JSON.stringify({
                  ...processingMetadata,
                  emergencyFallback: true,
                  originalError: dbError.message
                })
              }
            })
            logger.info('🆘 Conversación guardada con fallback de emergencia')
          } catch (fallbackError) {
            logger.error('❌❌ ERROR CRÍTICO: No se pudo guardar conversación:', {
              error: fallbackError.message,
              code: fallbackError.code,
              stack: fallbackError.stack,
              phone: from,
              clientId: client?.id,
              operation: 'create_fallback_conversation'
            })
            
            // 🆘 ÚLTIMO RECURSO: Intentar al menos preservar en memoria
            try {
              conversationMemory.addMessage(from, body, responseText, intent, {
                ...processingMetadata,
                emergencyMemoryOnly: true,
                dbError: fallbackError.message,
                timestamp: new Date()
              })
              logger.info('🆘 Conversación preservada solo en memoria como último recurso')
            } catch (memoryEmergencyError) {
              logger.error('❌❌❌ FALLO TOTAL: No se pudo preservar ni en BD ni en memoria:', {
                error: memoryEmergencyError.message,
                stack: memoryEmergencyError.stack,
                phone: from,
                operation: 'emergency_memory_save'
              })
              // Enviar notificación de emergencia al cliente
              try {
                await whatsappService.sendMessage(from, 
                  '⚠️ Disculpa, hubo un problema técnico guardando nuestra conversación. Por favor, repite tu última consulta.'
                )
              } catch (notificationError) {
                logger.error('❌ No se pudo notificar al cliente del error:', notificationError)
              }
            }
          }
        }
        
        // 💾 ACTUALIZAR MEMORIA CONVERSACIONAL FINAL
        conversationMemory.addMessage(from, body, responseText, intent, {
          ...processingMetadata,
          finalUpdate: true,
          processing: false
        })

        // 📋 REGISTRAR ÉXITO DE PERSONALIDAD
        if (personalitySystem && personalityContext) {
          personalitySystem.recordPersonalitySuccess(
            from,
            personalityContext.basePersonality,
            true // TODO: Implementar métrica real de éxito
          )
        }

        const duration = Date.now() - startTime
        logger.whatsapp('info', 'Mensaje procesado con IA inteligente', from, { 
          clientName: client.name,
          duration,
          responseLength: responseText.length,
          processingMode: 'intelligent_ai',
          intent: intent,
          personality: personalityContext?.basePersonality || 'default'
        })
        
        resolve()
      } catch (error) {
        reject(error)
      }
    })

    // Crear timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Message processing timeout after ${processingTimeout}ms`))
      }, processingTimeout)
    })

    // Ejecutar con timeout
    await Promise.race([processMessage, timeoutPromise])

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Message handling error', error, { 
      service: 'whatsapp',
      clientPhone: message?.from,
      duration,
      isTimeout: error.message.includes('timeout')
    })
    
    // Si es timeout, enviar mensaje de estado al usuario
    if (error.message.includes('timeout') && message?.from) {
      try {
        await whatsappService.sendMessage(message.from, 
          '⚠️ Disculpa, estoy procesando tu consulta. Puede tomar unos momentos adicionales. Por favor espera...'
        )
      } catch (sendError) {
        logger.error('Error sending timeout message', sendError)
      }
    }
  }
})

// DON'T auto-initialize WhatsApp - wait for user action
// whatsappService.initialize()

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown', { service: 'system' })
  
  server.close(() => {
    logger.info('HTTP server closed', { service: 'system' })
  })
  
  await prisma.$disconnect()
  logger.info('Database connections closed', { service: 'system' })
  
  logger.info('Graceful shutdown completed', { service: 'system' })
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, starting graceful shutdown', { service: 'system' })
  
  server.close(() => {
    logger.info('HTTP server closed', { service: 'system' })
  })
  
  await prisma.$disconnect()
  logger.info('Database connections closed', { service: 'system' })
  
  logger.info('Graceful shutdown completed', { service: 'system' })
  process.exit(0)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 =====================================')
  console.log('🚀     SERVIDOR INICIADO EXITOSAMENTE   ')
  console.log('🚀 =====================================')
  console.log(`🌐 Puerto: ${PORT}`)
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 CORS Origin: ${process.env.NODE_ENV === 'production' ? process.env.NEXTAUTH_URL : 'http://localhost:3000'}`)
  console.log(`📊 Socket.IO: ✅ Activo`)
  console.log(`📱 WhatsApp Bot: ✅ Listo (esperando conexión)`)
  console.log(`🤖 Gemini AI: ✅ ${process.env.GEMINI_API_KEY_1 ? 'Configurado' : '❌ Sin configurar'}`)
  console.log(`📊 Debug Endpoint: /api/debug/info`)
  console.log(`🔍 Monitoring: /api/monitoring/connections`)
  console.log('🚀 =====================================')
  
  logger.info(`Server started successfully`, { 
    service: 'system',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    cors_origin: process.env.NODE_ENV === 'production' 
      ? process.env.NEXTAUTH_URL 
      : 'http://localhost:3000',
    features: {
      socketIO: true,
      whatsapp: true,
      geminiAI: !!process.env.GEMINI_API_KEY_1,
      database: 'SQLite/Prisma',
      monitoring: true
    }
  })
  
  logger.info('Socket.IO ready for connections', { service: 'system' })
  logger.info('WhatsApp Bot ready (waiting for connection request)', { service: 'system' })
  
  // 🔧 NUEVO: Iniciar monitoreo avanzado de WhatsApp
  whatsappMonitor.startMonitoring()
  
  // Configuraciones de producción
  if (process.env.NODE_ENV === 'production') {
    console.log('🏭 MODO PRODUCCIÓN ACTIVADO')
    logger.info('Production mode enabled', {
      service: 'system',
      database: 'SQLite',
      features: ['Socket.IO', 'WhatsApp Bot', 'Gemini AI', 'Enhanced Monitoring']
    })
    
    // 🔄 KEEP-ALIVE SYSTEM: Evitar que Render suspenda el servicio
    startKeepAliveSystem()
  }
})

// 🔄 SISTEMA KEEP-ALIVE PARA RENDER
function startKeepAliveSystem() {
  // Determinar la URL del servicio basándose en las variables de entorno
  const serviceUrl = process.env.RENDER_EXTERNAL_URL || 
                    process.env.NEXTAUTH_URL || 
                    'https://fitpro-s1ct.onrender.com' // Basándome en tu configuración de render.yaml
  
  console.log('🔄 =========================================')
  console.log('🔄     SISTEMA KEEP-ALIVE INICIADO      ')
  console.log('🔄 =========================================')
  console.log(`🌐 URL del servicio: ${serviceUrl}`)
  console.log(`⏰ Intervalo: 14 minutos`)
  console.log(`🎯 Objetivo: Evitar suspensión por inactividad`)
  console.log('🔄 =========================================')
  
  logger.info('Keep-alive system started', {
    service: 'keep-alive',
    targetUrl: serviceUrl,
    intervalMinutes: 14,
    purpose: 'prevent_render_sleep'
  })

  // 🔄 SISTEMA KEEP-ALIVE PARA RENDER
  function startKeepAliveSystem() {
    // Determinar la URL del servicio basándose en las variables de entorno
    const serviceUrl = process.env.RENDER_EXTERNAL_URL || 
                      process.env.NEXTAUTH_URL || 
                      'https://fitpro-s1ct.onrender.com' // Basándome en tu configuración de render.yaml
    
    console.log('🔄 =========================================')
    console.log('🔄     SISTEMA KEEP-ALIVE INICIADO      ')
    console.log('🔄 =========================================')
    console.log(`🌐 URL del servicio: ${serviceUrl}`)
    console.log(`⏰ Intervalo: 14 minutos`)
    console.log(`🎯 Objetivo: Evitar suspensión por inactividad`)
    console.log('🔄 =========================================')
    
    logger.info('Keep-alive system started', {
      service: 'keep-alive',
      targetUrl: serviceUrl,
      intervalMinutes: 14,
      purpose: 'prevent_render_sleep'
    })

    // 🔧 Función HTTP nativa para hacer peticiones (sin dependencias externas)
    const makeRequest = (url, options = {}) => {
      return new Promise((resolve, reject) => {
        try {
          const parsedUrl = new URL(url)
          const isHttps = parsedUrl.protocol === 'https:'
          const client = isHttps ? https : http
        
          const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: {
              'User-Agent': options.userAgent || 'Internal-KeepAlive-System/1.0',
              'Accept': 'application/json',
              ...options.headers
            },
            timeout: options.timeout || 10000
          }
        
          const req = client.request(requestOptions, (res) => {
            let data = ''
            res.on('data', (chunk) => {
              data += chunk
            })
            res.on('end', () => {
              resolve({
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
                statusText: res.statusMessage,
                data: data
              })
            })
          })
        
          req.on('error', (error) => {
            reject(error)
          })
        
          req.on('timeout', () => {
            req.destroy()
            reject(new Error('Request timeout'))
          })
        
          req.end()
        } catch (error) {
          reject(error)
        }
      })
    }

    // Función para hacer ping al servicio
    const keepAlive = () => {
      setInterval(async () => {
        try {
          console.log('🔄 Ejecutando keep-alive ping...')
        
          const startTime = Date.now()
          const response = await makeRequest(`${serviceUrl}/keep-alive`, {
            method: 'GET',
            timeout: 10000,
            userAgent: 'Internal-KeepAlive-System/1.0'
          })
        
          const duration = Date.now() - startTime
        
          if (response.ok) {
            console.log(`✅ Keep-alive exitoso - Status: ${response.status} - Tiempo: ${duration}ms`)
            logger.info('Keep-alive ping successful', {
              service: 'keep-alive',
              status: response.status,
              responseTime: duration,
              timestamp: new Date().toISOString()
            })
          } else {
            console.warn(`⚠️ Keep-alive respuesta no OK - Status: ${response.status}`)
            logger.warn('Keep-alive ping returned non-OK status', {
              service: 'keep-alive',
              status: response.status,
              responseTime: duration
            })
          }
        } catch (error) {
          console.error('❌ Error en keep-alive ping:', error.message)
          logger.error('Keep-alive ping failed', {
            service: 'keep-alive',
            error: error.message,
            timestamp: new Date().toISOString()
          })
        
          // Si falla el ping al endpoint /keep-alive, intentar con la raíz
          try {
            const fallbackResponse = await makeRequest(serviceUrl, {
              method: 'GET',
              timeout: 10000,
              userAgent: 'Internal-KeepAlive-Fallback/1.0'
            })
            console.log(`🔄 Fallback ping exitoso - Status: ${fallbackResponse.status}`)
          } catch (fallbackError) {
            console.error('❌ Fallback ping también falló:', fallbackError.message)
          }
        }
      }, 14 * 60 * 1000) // 14 minutos en milisegundos
    }

    // Iniciar el sistema después de 30 segundos para dar tiempo al servidor
    setTimeout(() => {
      keepAlive()
      console.log('🔄 Keep-alive system activo - próximo ping en 14 minutos')
    }, 30000)

    // También hacer un ping inicial después de 2 minutos para verificar que funciona
    setTimeout(async () => {
      try {
        console.log('🔄 Ejecutando ping inicial de verificación...')
        const response = await makeRequest(`${serviceUrl}/keep-alive`, {
          method: 'GET',
          timeout: 10000,
          userAgent: 'Initial-KeepAlive-Test/1.0'
        })
        console.log(`✅ Ping inicial exitoso - Status: ${response.status}`)
        logger.info('Initial keep-alive test successful', {
          service: 'keep-alive',
          status: response.status,
          test: 'initial_verification'
        })
      } catch (error) {
        console.error('❌ Ping inicial falló:', error.message)
        logger.error('Initial keep-alive test failed', {
          service: 'keep-alive',
          error: error.message
        })
      }
    }, 2 * 60 * 1000) // 2 minutos
  }

  // 🔍 ENDPOINT DE PRUEBA PARA BÚSQUEDA EN INTERNET
  app.get('/api/search/test', async (req, res) => {
    try {
      const { query } = req.query
    
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Query parameter is required'
        })
      }

      // Crear instancia del servicio de búsqueda
      const InternetSearchService = require('./services/internetSearch')
      const searchService = new InternetSearchService()
    
      const results = await searchService.search(query)
    
      res.json({
        success: true,
        query: query,
        results: results,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error in internet search test:', error)
      res.status(500).json({
        success: false,
        message: 'Error performing internet search',
        error: error.message
      })
    }
  })

  // 🔍 ENDPOINT PARA BÚSQUEDA EN TIEMPO REAL DESDE WHATSAPP
  app.post('/api/search/realtime', async (req, res) => {
    try {
      const { message, clientData } = req.body
    
      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Message parameter is required'
        })
      }

      // Crear instancia del servicio de búsqueda
      const InternetSearchService = require('./services/internetSearch')
      const searchService = new InternetSearchService()
    
      // Realizar búsqueda
      const results = await searchService.search(message)
    
      res.json({
        success: true,
        message: message,
        results: results,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error in real-time internet search:', error)
      res.status(500).json({
        success: false,
        message: 'Error performing real-time internet search',
        error: error.message
      })
    }
  })
}

module.exports = app
