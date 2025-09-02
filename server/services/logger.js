const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Crear directorio de logs si no existe
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuración de formatos
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, service, clientPhone, duration, requestId }) => {
    let logMessage = `${timestamp} [${level}]`;
    
    if (service) logMessage += ` [${service}]`;
    if (requestId) logMessage += ` [${requestId.slice(0, 8)}]`;
    if (clientPhone) logMessage += ` [${clientPhone}]`;
    
    logMessage += `: ${message}`;
    
    if (duration) logMessage += ` (${duration}ms)`;
    
    return logMessage;
  })
);

// Crear logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Logs de errores
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Logs combinados
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Logs de WhatsApp específicos
    new winston.transports.File({
      filename: path.join(logsDir, 'whatsapp.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      tailable: true,
      format: winston.format.combine(
        logFormat,
        winston.format((info) => {
          return info.service === 'whatsapp' ? info : false;
        })()
      )
    }),
    
    // Console para desarrollo
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
    })
  ]
});

// Clase Logger con métodos específicos
class Logger {
  constructor() {
    this.winston = logger;
  }

  // Log de información general
  info(message, meta = {}) {
    this.winston.info(message, {
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // Log de errores con stack trace
  error(message, error = null, meta = {}) {
    const errorMeta = {
      timestamp: new Date().toISOString(),
      ...meta
    };

    if (error) {
      errorMeta.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }

    this.winston.error(message, errorMeta);
  }

  // Log de advertencias
  warn(message, meta = {}) {
    this.winston.warn(message, {
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // Log de debug (solo en desarrollo)
  debug(message, meta = {}) {
    this.winston.debug(message, {
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // Log específico para WhatsApp
  whatsapp(level, message, clientPhone = null, meta = {}) {
    this.winston.log(level, message, {
      service: 'whatsapp',
      clientPhone,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // Log específico para API requests
  api(method, url, statusCode, duration, meta = {}) {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    
    this.winston.log(level, `${method} ${url} ${statusCode}`, {
      service: 'api',
      method,
      url,
      statusCode,
      duration,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // Log específico para IA (Gemini)
  ai(message, tokens = null, duration = null, meta = {}) {
    this.winston.info(message, {
      service: 'ai',
      tokens,
      duration,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // Log específico para base de datos
  database(operation, table, duration = null, meta = {}) {
    this.winston.info(`Database ${operation} on ${table}`, {
      service: 'database',
      operation,
      table,
      duration,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // Obtener logs recientes para dashboard
  async getRecentLogs(limit = 100, level = null) {
    return new Promise((resolve, reject) => {
      const options = {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24 horas
        until: new Date(),
        limit: limit,
        start: 0,
        order: 'desc',
        fields: ['timestamp', 'level', 'message', 'service', 'clientPhone', 'duration']
      };

      if (level) {
        options.level = level;
      }

      this.winston.query(options, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results.file || []);
        }
      });
    });
  }

  // Stream para Morgan (HTTP logging)
  get stream() {
    return {
      write: (message) => {
        this.winston.info(message.trim(), { service: 'http' });
      }
    };
  }
}

// Crear instancia singleton
const loggerInstance = new Logger();

// Log de inicio del sistema
loggerInstance.info('Logger initialized', {
  service: 'system',
  logLevel: process.env.LOG_LEVEL || 'info',
  environment: process.env.NODE_ENV || 'development'
});

module.exports = loggerInstance;