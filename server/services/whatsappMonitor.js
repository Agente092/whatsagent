// 🔧 SERVICIO DE MONITOREO AVANZADO PARA WHATSAPP
// Creado para mejorar la robustez y estabilidad de la conexión

const logger = require('./logger')

class WhatsAppMonitor {
  constructor(whatsappService) {
    this.whatsappService = whatsappService
    this.metrics = {
      connections: 0,
      disconnections: 0,
      reconnections: 0,
      errors: 0,
      lastConnectionTime: null,
      lastDisconnectionTime: null,
      uptime: 0,
      healthChecks: 0,
      failedHealthChecks: 0
    }
    this.startTime = Date.now()
    this.isMonitoring = false
  }

  // 📊 Iniciar monitoreo avanzado
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ WhatsApp monitoring already running')
      return
    }

    this.isMonitoring = true
    console.log('🔍 Starting WhatsApp advanced monitoring...')

    // Escuchar eventos de WhatsApp
    this.setupEventListeners()

    // Logging periódico de métricas
    this.metricsInterval = setInterval(() => {
      this.logMetrics()
    }, 300000) // Cada 5 minutos

    console.log('✅ WhatsApp monitoring started')
  }

  // 🔧 Configurar listeners de eventos
  setupEventListeners() {
    this.whatsappService.on('connected', () => {
      this.metrics.connections++
      this.metrics.lastConnectionTime = new Date().toISOString()
      logger.whatsapp('info', 'WhatsApp connected', {
        totalConnections: this.metrics.connections,
        uptime: this.getUptime()
      })
    })

    this.whatsappService.on('disconnected', () => {
      this.metrics.disconnections++
      this.metrics.lastDisconnectionTime = new Date().toISOString()
      logger.whatsapp('warn', 'WhatsApp disconnected', {
        totalDisconnections: this.metrics.disconnections,
        uptime: this.getUptime()
      })
    })

    this.whatsappService.on('error', (error) => {
      this.metrics.errors++
      logger.whatsapp('error', 'WhatsApp error occurred', {
        error: error.message,
        totalErrors: this.metrics.errors,
        uptime: this.getUptime()
      })
    })
  }

  // 📈 Logging de métricas
  logMetrics() {
    const status = this.whatsappService.getStatus()
    const uptime = this.getUptime()

    const metricsData = {
      ...this.metrics,
      currentStatus: status,
      uptimeFormatted: this.formatUptime(uptime),
      uptime: uptime
    }

    logger.whatsapp('info', 'WhatsApp metrics report', metricsData)

    // Log crítico si hay muchas desconexiones
    if (this.metrics.disconnections > 5) {
      logger.whatsapp('error', 'High disconnection rate detected', {
        disconnections: this.metrics.disconnections,
        connections: this.metrics.connections,
        ratio: (this.metrics.disconnections / Math.max(this.metrics.connections, 1)).toFixed(2)
      })
    }
  }

  // ⏱️ Calcular uptime
  getUptime() {
    return Date.now() - this.startTime
  }

  // 🕐 Formatear uptime
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  // 📊 Obtener reporte de estado completo
  getHealthReport() {
    const status = this.whatsappService.getStatus()
    const uptime = this.getUptime()

    return {
      status: status.isConnected ? 'healthy' : 'unhealthy',
      connection: {
        isConnected: status.isConnected,
        lastSeen: status.lastSeen,
        attempts: status.connectionAttempts,
        isReconnecting: status.isReconnecting
      },
      metrics: {
        ...this.metrics,
        uptime: uptime,
        uptimeFormatted: this.formatUptime(uptime)
      },
      timestamp: new Date().toISOString()
    }
  }

  // 🛑 Detener monitoreo
  stopMonitoring() {
    if (!this.isMonitoring) {
      return
    }

    this.isMonitoring = false

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = null
    }

    console.log('🛑 WhatsApp monitoring stopped')
  }

  // 📱 Forzar health check manual
  async performHealthCheck() {
    this.metrics.healthChecks++
    
    try {
      const isHealthy = await this.whatsappService.healthCheck()
      
      if (!isHealthy) {
        this.metrics.failedHealthChecks++
        logger.whatsapp('warn', 'Manual health check failed', {
          totalHealthChecks: this.metrics.healthChecks,
          failedChecks: this.metrics.failedHealthChecks
        })
      } else {
        logger.whatsapp('info', 'Manual health check passed', {
          totalHealthChecks: this.metrics.healthChecks
        })
      }
      
      return isHealthy
    } catch (error) {
      this.metrics.failedHealthChecks++
      logger.whatsapp('error', 'Health check error', {
        error: error.message,
        totalHealthChecks: this.metrics.healthChecks,
        failedChecks: this.metrics.failedHealthChecks
      })
      return false
    }
  }
}

module.exports = WhatsAppMonitor