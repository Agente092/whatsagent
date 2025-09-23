const logger = require('./logger')

class DatabaseMonitor {
  constructor(prisma) {
    this.prisma = prisma
    this.stats = {
      totalQueries: 0,
      successQueries: 0,
      failedQueries: 0,
      avgResponseTime: 0,
      lastError: null,
      consecutiveErrors: 0,
      connectionHealth: 'unknown'
    }
  }

  // 🔍 Monitorear operación de base de datos
  async monitorOperation(operation, tableName, operationFn) {
    const startTime = Date.now()
    const operationId = `${operation}_${tableName}_${Date.now()}`
    
    try {
      logger.database(`🔄 Starting ${operation} on ${tableName}`, tableName, null, {
        operationId: operationId,
        operation: operation
      })

      this.stats.totalQueries++
      
      const result = await operationFn()
      
      const duration = Date.now() - startTime
      this.stats.successQueries++
      this.stats.consecutiveErrors = 0
      this.updateAvgResponseTime(duration)
      
      logger.database(`✅ ${operation} on ${tableName} completed`, tableName, duration, {
        operationId: operationId,
        operation: operation,
        success: true,
        recordsAffected: Array.isArray(result) ? result.length : (result ? 1 : 0)
      })
      
      return result
      
    } catch (error) {
      const duration = Date.now() - startTime
      this.stats.failedQueries++
      this.stats.consecutiveErrors++
      this.stats.lastError = {
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
        operation: operation,
        table: tableName
      }
      
      logger.database(`❌ ${operation} on ${tableName} failed`, tableName, duration, {
        operationId: operationId,
        operation: operation,
        success: false,
        error: error.message,
        errorCode: error.code,
        consecutiveErrors: this.stats.consecutiveErrors,
        stack: error.stack
      })
      
      // Diagnosticar problema específico
      await this.diagnoseProblem(error, operation, tableName)
      
      throw error
    }
  }

  // 🔍 Diagnosticar problemas específicos de base de datos
  async diagnoseProblem(error, operation, tableName) {
    const diagnosis = {
      errorType: this.classifyError(error),
      possibleCauses: [],
      suggestions: []
    }

    // Clasificar tipo de error
    if (error.code === 'P1001') {
      diagnosis.possibleCauses.push('Database server unreachable')
      diagnosis.suggestions.push('Check database connection string')
      diagnosis.suggestions.push('Verify database server is running')
    } else if (error.code === 'P2002') {
      diagnosis.possibleCauses.push('Unique constraint violation')
      diagnosis.suggestions.push('Check for duplicate data')
    } else if (error.code === 'P2025') {
      diagnosis.possibleCauses.push('Record not found')
      diagnosis.suggestions.push('Verify record exists before update/delete')
    } else if (error.message.includes('timeout')) {
      diagnosis.possibleCauses.push('Database operation timeout')
      diagnosis.suggestions.push('Check database performance')
      diagnosis.suggestions.push('Consider connection pooling')
    } else if (error.message.includes('SQLITE_BUSY')) {
      diagnosis.possibleCauses.push('Database locked by another process')
      diagnosis.suggestions.push('Implement retry mechanism')
      diagnosis.suggestions.push('Check concurrent operations')
    }

    logger.error('🔍 Database problem diagnosis:', {
      operation: operation,
      table: tableName,
      errorCode: error.code,
      errorMessage: error.message,
      diagnosis: diagnosis,
      consecutiveErrors: this.stats.consecutiveErrors
    })

    // Verificar salud de conexión si hay muchos errores consecutivos
    if (this.stats.consecutiveErrors >= 3) {
      await this.checkConnectionHealth()
    }
  }

  // 🏥 Verificar salud de la conexión
  async checkConnectionHealth() {
    try {
      logger.info('🏥 Checking database connection health...')
      
      const start = Date.now()
      await this.prisma.$queryRaw`SELECT 1 as health_check`
      const duration = Date.now() - start
      
      this.stats.connectionHealth = 'healthy'
      
      logger.info('✅ Database connection is healthy', {
        healthCheck: true,
        responseTime: duration,
        consecutiveErrors: this.stats.consecutiveErrors
      })
      
      return {
        status: 'healthy',
        responseTime: duration,
        consecutiveErrors: this.stats.consecutiveErrors,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      this.stats.connectionHealth = 'unhealthy'
      
      logger.error('❌ Database connection is unhealthy', {
        healthCheck: false,
        error: error.message,
        consecutiveErrors: this.stats.consecutiveErrors,
        lastError: this.stats.lastError
      })
      
      return {
        status: 'unhealthy',
        error: error.message,
        consecutiveErrors: this.stats.consecutiveErrors,
        lastError: this.stats.lastError,
        timestamp: new Date().toISOString()
      }
    }
  }

  // 📊 Actualizar tiempo promedio de respuesta
  updateAvgResponseTime(duration) {
    if (this.stats.successQueries === 1) {
      this.stats.avgResponseTime = duration
    } else {
      this.stats.avgResponseTime = (this.stats.avgResponseTime + duration) / 2
    }
  }

  // 🏷️ Clasificar tipo de error
  classifyError(error) {
    if (error.code) {
      return `PRISMA_${error.code}`
    }
    if (error.message.includes('timeout')) {
      return 'TIMEOUT'
    }
    if (error.message.includes('SQLITE_BUSY')) {
      return 'DATABASE_LOCKED'
    }
    if (error.message.includes('connection')) {
      return 'CONNECTION_ERROR'
    }
    return 'UNKNOWN'
  }

  // 📈 Obtener estadísticas
  getStats() {
    const successRate = this.stats.totalQueries > 0 
      ? ((this.stats.successQueries / this.stats.totalQueries) * 100).toFixed(2)
      : 0

    return {
      ...this.stats,
      successRate: `${successRate}%`,
      timestamp: new Date().toISOString()
    }
  }

  // 🔄 Resetear estadísticas
  resetStats() {
    this.stats = {
      totalQueries: 0,
      successQueries: 0,
      failedQueries: 0,
      avgResponseTime: 0,
      lastError: null,
      consecutiveErrors: 0,
      connectionHealth: 'unknown'
    }
    
    logger.info('📊 Database monitor stats reset')
  }

  // 🎯 Wrapper para operaciones comunes
  async findUnique(model, args) {
    return this.monitorOperation('findUnique', model, async () => {
      return await this.prisma[model].findUnique(args)
    })
  }

  async create(model, args) {
    return this.monitorOperation('create', model, async () => {
      return await this.prisma[model].create(args)
    })
  }

  async update(model, args) {
    return this.monitorOperation('update', model, async () => {
      return await this.prisma[model].update(args)
    })
  }

  async findMany(model, args) {
    return this.monitorOperation('findMany', model, async () => {
      return await this.prisma[model].findMany(args)
    })
  }

  async delete(model, args) {
    return this.monitorOperation('delete', model, async () => {
      return await this.prisma[model].delete(args)
    })
  }
}

module.exports = DatabaseMonitor