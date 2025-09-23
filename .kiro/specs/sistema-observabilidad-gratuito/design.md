# Design Document - Sistema de Observabilidad Gratuito

## Overview

Diseñaremos un sistema de observabilidad completo utilizando únicamente herramientas gratuitas y open source, integrado directamente en la aplicación existente sin dependencias externas costosas.

## Architecture

### Logging Architecture
```
Aplicación → Winston Logger → Archivos de Log → Dashboard Web
                ↓
            Morgan Middleware → HTTP Logs
                ↓
            Rotación Automática → Archivos Históricos
```

### Testing Architecture
```
Jest Test Runner → Unit Tests → Integration Tests → Coverage Report
                      ↓              ↓                    ↓
                  Servicios      API Routes         HTML Report
```

### Monitoring Architecture
```
Express App → Health Middleware → Métricas en Memoria → API Endpoints
                    ↓                      ↓                  ↓
              System Metrics        Performance Data    Dashboard
```

## Components and Interfaces

### 1. Logger Service (Winston)
```javascript
// logger.js
class Logger {
  constructor() {
    this.winston = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log',
          maxsize: 5242880,
          maxFiles: 10
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  info(message, meta = {}) { /* ... */ }
  error(message, error = null, meta = {}) { /* ... */ }
  warn(message, meta = {}) { /* ... */ }
  debug(message, meta = {}) { /* ... */ }
}
```

### 2. Health Check Service
```javascript
// healthCheck.js
class HealthCheck {
  constructor(prisma, whatsappService) {
    this.prisma = prisma;
    this.whatsapp = whatsappService;
    this.startTime = Date.now();
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: []
    };
  }

  async checkDatabase() { /* ... */ }
  async checkWhatsApp() { /* ... */ }
  async checkMemory() { /* ... */ }
  getUptime() { /* ... */ }
  getMetrics() { /* ... */ }
}
```

### 3. Test Suite Structure
```
tests/
├── unit/
│   ├── services/
│   │   ├── whatsapp.test.js
│   │   ├── gemini.test.js
│   │   └── knowledgeBase.test.js
│   └── utils/
│       └── logger.test.js
├── integration/
│   ├── api/
│   │   ├── auth.test.js
│   │   ├── clients.test.js
│   │   └── dashboard.test.js
│   └── database/
│       └── prisma.test.js
└── setup/
    ├── testSetup.js
    └── mocks/
        ├── whatsapp.mock.js
        └── gemini.mock.js
```

### 4. Admin Dashboard Routes
```javascript
// routes/admin.js
router.get('/logs', authenticateAdmin, getLogsPage);
router.get('/api/logs', authenticateAdmin, getLogsAPI);
router.get('/health', getHealthPage);
router.get('/api/health', getHealthAPI);
router.get('/api/metrics', getMetricsAPI);
```

## Data Models

### Log Entry Model
```javascript
{
  timestamp: "2025-08-14T10:30:00.000Z",
  level: "info|warn|error|debug",
  message: "Descripción del evento",
  service: "whatsapp|gemini|api|database",
  clientPhone: "+51987654321", // opcional
  requestId: "uuid-v4",
  duration: 150, // ms, opcional
  error: {
    message: "Error description",
    stack: "Stack trace completo",
    code: "ERROR_CODE"
  },
  metadata: {
    // Datos adicionales específicos del contexto
  }
}
```

### Health Check Model
```javascript
{
  status: "healthy|degraded|unhealthy",
  timestamp: "2025-08-14T10:30:00.000Z",
  uptime: 86400, // segundos
  services: {
    database: { status: "healthy", responseTime: 5 },
    whatsapp: { status: "healthy", connected: true },
    memory: { status: "healthy", usage: 45.2 },
    disk: { status: "healthy", usage: 23.1 }
  },
  metrics: {
    totalRequests: 1250,
    errorRate: 0.02,
    avgResponseTime: 120,
    activeConnections: 15
  }
}
```

### Test Result Model
```javascript
{
  testSuite: "unit|integration",
  totalTests: 45,
  passed: 43,
  failed: 2,
  coverage: {
    lines: 85.5,
    functions: 90.2,
    branches: 78.3,
    statements: 86.1
  },
  duration: 2.5, // segundos
  failedTests: [
    {
      name: "should handle WhatsApp disconnection",
      error: "Expected true but received false",
      file: "tests/unit/services/whatsapp.test.js:45"
    }
  ]
}
```

## Error Handling

### Centralized Error Handler
```javascript
// middleware/errorHandler.js
const errorHandler = (error, req, res, next) => {
  logger.error('Unhandled error', error, {
    requestId: req.id,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Determinar tipo de error y respuesta apropiada
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details
    });
  }

  // Error genérico
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id
  });
};
```

### Graceful Shutdown
```javascript
// gracefulShutdown.js
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown');
  
  // Cerrar servidor HTTP
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Cerrar conexiones de base de datos
  await prisma.$disconnect();
  logger.info('Database connections closed');
  
  // Finalizar logs
  logger.info('Graceful shutdown completed');
  process.exit(0);
});
```

## Testing Strategy

### Unit Tests
- **Servicios individuales**: WhatsApp, Gemini, KnowledgeBase
- **Utilidades**: Logger, formatters, validators
- **Modelos**: Validaciones de datos
- **Cobertura objetivo**: 80%+

### Integration Tests
- **API endpoints**: Todas las rutas principales
- **Base de datos**: CRUD operations
- **Servicios externos**: Mocks de WhatsApp y Gemini
- **Autenticación**: JWT y middleware

### Test Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/testSetup.js'],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/index.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Implementation Plan

### Phase 1: Logging (1 hora)
1. Instalar Winston y Morgan
2. Crear logger service
3. Integrar en server/index.js
4. Agregar logs a servicios críticos

### Phase 2: Health Monitoring (1 hora)
1. Crear health check service
2. Implementar métricas básicas
3. Crear endpoints de health y metrics
4. Integrar middleware de métricas

### Phase 3: Testing (2 horas)
1. Configurar Jest
2. Crear mocks para servicios externos
3. Escribir unit tests básicos
4. Escribir integration tests para APIs

### Phase 4: Admin Dashboard (1 hora)
1. Crear rutas de administración
2. Página simple de logs
3. Página de health status
4. Integrar en sidebar existente

## Security Considerations

- **Admin routes**: Protegidas con autenticación
- **Log sanitization**: Remover información sensible
- **Rate limiting**: En endpoints de métricas
- **File permissions**: Logs solo accesibles por aplicación