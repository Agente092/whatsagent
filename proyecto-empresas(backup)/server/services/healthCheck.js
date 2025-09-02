const os = require('os');
const fs = require('fs');
const path = require('path');

class HealthCheck {
  constructor(prisma = null, whatsappService = null) {
    this.prisma = prisma;
    this.whatsapp = whatsappService;
    this.startTime = Date.now();
    this.resetInterval = null;
    
    // Métricas en memoria
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      lastReset: Date.now()
    };

    // Resetear métricas cada hora (solo en producción)
    if (process.env.NODE_ENV !== 'test') {
      this.resetInterval = setInterval(() => {
        this.resetHourlyMetrics();
      }, 60 * 60 * 1000);
    }
  }

  // Método para limpiar recursos
  destroy() {
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
      this.resetInterval = null;
    }
  }

  // Incrementar contador de requests
  incrementRequests() {
    this.metrics.requests++;
  }

  // Incrementar contador de errores
  incrementErrors() {
    this.metrics.errors++;
  }

  // Agregar tiempo de respuesta
  addResponseTime(duration) {
    this.metrics.responseTime.push(duration);
    
    // Mantener solo los últimos 1000 tiempos de respuesta
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
    }
  }

  // Resetear métricas horarias
  resetHourlyMetrics() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      lastReset: Date.now()
    };
  }

  // Verificar estado de la base de datos
  async checkDatabase() {
    if (!this.prisma) {
      return { status: 'unknown', message: 'Prisma not initialized' };
    }

    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const duration = Date.now() - start;

      return {
        status: 'healthy',
        responseTime: duration,
        message: 'Database connection successful'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        error: error.name
      };
    }
  }

  // Verificar estado de WhatsApp
  async checkWhatsApp() {
    if (!this.whatsapp) {
      return { status: 'unknown', message: 'WhatsApp service not initialized' };
    }

    try {
      const connectionInfo = this.whatsapp.getConnectionInfo();
      
      return {
        status: connectionInfo.connected ? 'healthy' : 'unhealthy',
        connected: connectionInfo.connected,
        lastSeen: connectionInfo.lastSeen,
        attempts: connectionInfo.attempts,
        hasQR: connectionInfo.hasQR,
        message: connectionInfo.connected ? 'WhatsApp connected' : 'WhatsApp disconnected'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        error: error.name
      };
    }
  }

  // Verificar uso de memoria
  checkMemory() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    const memoryUsagePercent = (usedMem / totalMem) * 100;
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    let status = 'healthy';
    if (memoryUsagePercent > 90 || heapUsagePercent > 90) {
      status = 'unhealthy';
    } else if (memoryUsagePercent > 75 || heapUsagePercent > 75) {
      status = 'degraded';
    }

    return {
      status,
      systemMemory: {
        total: Math.round(totalMem / 1024 / 1024), // MB
        used: Math.round(usedMem / 1024 / 1024), // MB
        free: Math.round(freeMem / 1024 / 1024), // MB
        usagePercent: Math.round(memoryUsagePercent * 100) / 100
      },
      processMemory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        heapUsagePercent: Math.round(heapUsagePercent * 100) / 100
      }
    };
  }

  // Verificar uso de disco
  checkDisk() {
    try {
      const stats = fs.statSync(process.cwd());
      
      // En sistemas Unix, podríamos usar statvfs, pero para simplicidad
      // solo verificamos que el directorio sea accesible
      return {
        status: 'healthy',
        accessible: true,
        message: 'Disk accessible'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        accessible: false,
        message: error.message
      };
    }
  }

  // Obtener uptime del sistema
  getUptime() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    return {
      seconds: uptimeSeconds,
      formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`,
      startTime: new Date(this.startTime).toISOString()
    };
  }

  // Calcular métricas de performance
  getPerformanceMetrics() {
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;

    const errorRate = this.metrics.requests > 0
      ? (this.metrics.errors / this.metrics.requests) * 100
      : 0;

    return {
      totalRequests: this.metrics.requests,
      totalErrors: this.metrics.errors,
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      requestsPerMinute: this.calculateRequestsPerMinute(),
      lastReset: new Date(this.metrics.lastReset).toISOString()
    };
  }

  // Calcular requests por minuto
  calculateRequestsPerMinute() {
    const timeSinceReset = Date.now() - this.metrics.lastReset;
    const minutesSinceReset = timeSinceReset / (1000 * 60);
    
    return minutesSinceReset > 0
      ? Math.round((this.metrics.requests / minutesSinceReset) * 100) / 100
      : 0;
  }

  // Health check completo
  async getHealthStatus() {
    const [database, whatsapp] = await Promise.all([
      this.checkDatabase(),
      this.checkWhatsApp()
    ]);

    const memory = this.checkMemory();
    const disk = this.checkDisk();
    const uptime = this.getUptime();
    const performance = this.getPerformanceMetrics();

    // Determinar estado general
    const services = { database, whatsapp, memory, disk };
    const unhealthyServices = Object.values(services).filter(s => s.status === 'unhealthy');
    const degradedServices = Object.values(services).filter(s => s.status === 'degraded');

    let overallStatus = 'healthy';
    if (unhealthyServices.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices.length > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      services,
      performance,
      summary: {
        healthy: Object.values(services).filter(s => s.status === 'healthy').length,
        degraded: degradedServices.length,
        unhealthy: unhealthyServices.length,
        unknown: Object.values(services).filter(s => s.status === 'unknown').length
      }
    };
  }

  // Health check simple para load balancers
  async getSimpleHealth() {
    try {
      const dbCheck = await this.checkDatabase();
      const isHealthy = dbCheck.status === 'healthy';
      
      return {
        status: isHealthy ? 'ok' : 'error',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

module.exports = HealthCheck;