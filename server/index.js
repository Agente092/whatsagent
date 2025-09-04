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

// Import routes
const apiStatsRoutes = require('./routes/apiStats')

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.NEXTAUTH_URL || "https://your-app.onrender.com"
      : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001

// 🧠 Initialize enhanced services with intelligent capabilities
const conversationMemory = new ConversationMemory()
const messageFormatter = new MessageFormatterCleaned() // 🏢 CORREGIDO: Usar formateador de empresas corregido
const knowledgeBase = new KnowledgeBase()

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`)

  // Send current WhatsApp status to new client
  if (whatsappService.isConnected) {
    socket.emit('whatsapp-status', 'connected')
  } else if (whatsappService.qrCode) {
    socket.emit('whatsapp-status', 'connecting')
    socket.emit('qr-code', whatsappService.qrCode)
  } else {
    socket.emit('whatsapp-status', 'disconnected')
  }

  // WhatsApp connection events
  socket.on('connect-whatsapp', async () => {
    try {
      if (whatsappService.isConnected) {
        socket.emit('whatsapp-status', 'connected')
        return
      }
      await whatsappService.connect()
    } catch (error) {
      console.error('Error connecting WhatsApp:', error)
      socket.emit('whatsapp-error', error.message)
    }
  })

  socket.on('disconnect-whatsapp', async () => {
    try {
      await whatsappService.disconnect()
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error)
    }
  })

  socket.on('clear-whatsapp-session', async () => {
    try {
      await whatsappService.clearSession()
      socket.emit('session-cleared', { message: 'Session cleared successfully' })
    } catch (error) {
      console.error('Error clearing session:', error)
    }
  })

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`)
  })
})

// WhatsApp service events
whatsappService.on('qr-code', (qrCode) => {
  logger.whatsapp('info', 'QR code generated for WhatsApp connection')
  io.emit('qr-code', qrCode)
  io.emit('whatsapp-status', 'connecting')
})

whatsappService.on('connected', () => {
  logger.whatsapp('info', 'WhatsApp service connected successfully')
  io.emit('whatsapp-status', 'connected')
})

whatsappService.on('disconnected', () => {
  logger.whatsapp('warn', 'WhatsApp service disconnected')
  io.emit('whatsapp-status', 'disconnected')
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

// API Stats Routes
app.use('/api/pool', apiStatsRoutes)

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

// Semantic search endpoint
app.post('/api/search/semantic', authenticateToken, async (req, res) => {
  try {
    const { query, options = {} } = req.body
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required'
      })
    }

    if (!geminiService.semanticSearch) {
      return res.status(404).json({
        success: false,
        message: 'Semantic search not available'
      })
    }

    const results = await geminiService.semanticSearch.search(query, options)
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results
    })

  } catch (error) {
    console.error('Error in semantic search:', error)
    res.status(500).json({
      success: false,
      message: 'Error performing semantic search',
      error: error.message
    })
  }
})

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
      message: 'Error retrieving semantic search statistics',
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

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
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
    const { name, phone, expiryDate } = req.body

    // Validate input
    if (!name || !phone || !expiryDate) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' })
    }

    // Check if phone already exists
    const existingClient = await prisma.client.findUnique({
      where: { phone }
    })

    if (existingClient) {
      return res.status(400).json({
        message: 'Ya existe un cliente con este número de teléfono',
        field: 'phone'
      })
    }

    const client = await prisma.client.create({
      data: {
        name,
        phone,
        expiryDate: new Date(expiryDate),
        isActive: true
      }
    })

    res.status(201).json(client)
  } catch (error) {
    console.error('Create client error:', error)
    res.status(500).json({ message: 'Error al crear cliente' })
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

app.post('/api/clients/update', async (req, res) => {
  try {
    const { phone, name } = req.body
    
    if (!phone || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Teléfono y nombre son requeridos' 
      })
    }
    
    const client = await prisma.client.findUnique({
      where: { phone }
    })
    
    if (client) {
      const updatedClient = await prisma.client.update({
        where: { phone },
        data: { 
          name,
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
    console.error('Client update error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar cliente' 
    })
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

// 👥 CLIENTES - RUTAS DE GESTIÓN (UNIFICADO CON PRISMA)
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json({ 
      success: true, 
      clients 
    })
  } catch (error) {
    console.error('Clients get error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener clientes' 
    })
  }
})

app.get('/api/clients/stats', async (req, res) => {
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
    
    const stats = {
      total: totalClients,
      active: activeClients,
      expired: expiredClients,
      new: await prisma.client.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
          }
        }
      })
    }
    
    res.json(stats)
  } catch (error) {
    console.error('Client stats error:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas de clientes' })
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
    
    // Buscar cliente y promover a VIP (simulado con messageCount alto)
    const client = await prisma.client.findUnique({
      where: { phone }
    })
    
    if (client) {
      const updatedClient = await prisma.client.update({
        where: { phone },
        data: { 
          messageCount: Math.max(client.messageCount, 50), // Marcar como VIP
          lastActivity: new Date()
        }
      })
      
      res.json({ 
        success: true, 
        message: 'Cliente promocionado a VIP exitosamente',
        client: updatedClient
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
      message: 'Error al promocionar cliente' 
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
    
    const client = await prisma.client.findUnique({
      where: { phone }
    })
    
    if (client) {
      const updatedClient = await prisma.client.update({
        where: { phone },
        data: { 
          name,
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
    console.error('Client update error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar cliente' 
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
      // Verificar si el nuevo teléfono ya existe para otro cliente
      const existingClient = await prisma.client.findUnique({
        where: { phone }
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
          phone,
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

// 🆕 NUEVA RUTA: Eliminar cliente por ID (UNIFICADO CON PRISMA)
app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // Buscar y eliminar cliente
    const client = await prisma.client.findUnique({
      where: { id }
    })
    
    if (client) {
      await prisma.client.delete({
        where: { id }
      })
      
      res.json({ 
        success: true, 
        message: 'Cliente eliminado exitosamente' 
      })
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      })
    }
  } catch (error) {
    console.error('Client delete error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar cliente' 
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
        logger.whatsapp('info', 'Incoming message received', from, { message: body })

        // Check if client has access
        const client = await prisma.client.findUnique({
          where: { phone: from }
        })

        if (!client) {
          logger.whatsapp('warn', 'Message from unregistered client', from)
          await whatsappService.sendMessage(from,
            'No tienes acceso activo. Contacta con tu asesor para suscribirte al servicio de asesoría empresarial.'
          )
          resolve()
          return
        }

        if (!client.isActive || new Date(client.expiryDate) <= new Date()) {
          logger.whatsapp('warn', 'Message from expired client', from, { 
            clientName: client.name, 
            expiryDate: client.expiryDate 
          })
          await whatsappService.sendMessage(from,
            `Hola ${client.name}, tu suscripción ha expirado. Para reactivar tu acceso, contacta con tu asesor.`
          )
          resolve()
          return
        }

        // Update last activity
        await prisma.client.update({
          where: { id: client.id },
          data: {
            lastActivity: new Date(),
            messageCount: { increment: 1 }
          }
        })

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
            
            // Registrar conversación
            await prisma.conversation.create({
              data: {
                clientId: client.id,
                phone: from,
                message: body,
                response: elegantWelcome,
                metadata: JSON.stringify({
                  intent: 'greeting',
                  processingMode: 'elegant_welcome',
                  companyUsed: companyName,
                  representativeUsed: representativeName,
                  processingTime: Date.now() - startTime
                })
              }
            })
            
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

        // 📱 PASO 5: ENVIAR RESPUESTA(S) CON FORMATO INTELIGENTE
        if (Array.isArray(responses)) {
          for (let i = 0; i < responses.length; i++) {
            await whatsappService.sendMessage(from, responses[i])

            // Pausa inteligente entre mensajes múltiples
            if (i < responses.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1500))
            }
          }
        } else {
          await whatsappService.sendMessage(from, responses)
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

        await prisma.conversation.create({
          data: {
            clientId: client.id,
            phone: from,
            message: body,
            response: responseText,
            metadata: JSON.stringify(processingMetadata)
          }
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
  logger.info(`Server started successfully`, { 
    service: 'system',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    cors_origin: process.env.NODE_ENV === 'production' 
      ? process.env.NEXTAUTH_URL 
      : 'http://localhost:3000'
  })
  logger.info('Socket.IO ready for connections', { service: 'system' })
  logger.info('WhatsApp Bot ready (waiting for connection request)', { service: 'system' })
  
  // 🔧 NUEVO: Iniciar monitoreo avanzado de WhatsApp
  whatsappMonitor.startMonitoring()
  
  // Configuraciones de producción
  if (process.env.NODE_ENV === 'production') {
    logger.info('Production mode enabled', {
      service: 'system',
      database: 'PostgreSQL',
      features: ['Socket.IO', 'WhatsApp Bot', 'Gemini AI', 'Legal Checker']
    })
  }
})
