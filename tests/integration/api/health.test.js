const request = require('supertest');
const express = require('express');
const HealthCheck = require('../../../server/services/healthCheck');

// Crear una app de test simplificada
const createTestApp = () => {
  const app = express();
  
  // Mock de servicios
  const mockPrisma = {
    $queryRaw: jest.fn()
  };
  
  const mockWhatsApp = {
    getConnectionInfo: jest.fn()
  };
  
  const healthCheck = new HealthCheck(mockPrisma, mockWhatsApp);
  
  // Rutas de health check
  app.get('/health', async (req, res) => {
    try {
      const health = await healthCheck.getSimpleHealth();
      res.status(health.status === 'ok' ? 200 : 503).json(health);
    } catch (error) {
      res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
    }
  });
  
  app.get('/api/health', async (req, res) => {
    try {
      const health = await healthCheck.getHealthStatus();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: 'Health check failed' });
    }
  });
  
  app.get('/api/metrics', async (req, res) => {
    try {
      const metrics = healthCheck.getPerformanceMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Metrics unavailable' });
    }
  });
  
  return { app, healthCheck, mockPrisma, mockWhatsApp };
};

describe('Health Check API Endpoints', () => {
  let app, healthCheck, mockPrisma, mockWhatsApp;
  
  beforeEach(() => {
    const testApp = createTestApp();
    app = testApp.app;
    healthCheck = testApp.healthCheck;
    mockPrisma = testApp.mockPrisma;
    mockWhatsApp = testApp.mockWhatsApp;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    test('should return 200 and ok status when system is healthy', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });

    test('should return 503 and error status when database fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database connection failed'));
      
      const response = await request(app)
        .get('/health')
        .expect(503);
      
      expect(response.body.status).toBe('error');
      expect(response.body.timestamp).toBeDefined();
    });

    test('should handle unexpected errors gracefully', async () => {
      mockPrisma.$queryRaw.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      const response = await request(app)
        .get('/health')
        .expect(503);
      
      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/health', () => {
    test('should return detailed health information', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockWhatsApp.getConnectionInfo.mockReturnValue({
        connected: true,
        lastSeen: '2025-08-14T10:30:00.000Z',
        attempts: 0,
        hasQR: false
      });
      
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body.status).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.services).toBeDefined();
      expect(response.body.performance).toBeDefined();
      expect(response.body.summary).toBeDefined();
      
      // Verificar estructura de servicios
      expect(response.body.services.database).toBeDefined();
      expect(response.body.services.whatsapp).toBeDefined();
      expect(response.body.services.memory).toBeDefined();
      expect(response.body.services.disk).toBeDefined();
      
      // Verificar estructura de resumen
      expect(response.body.summary.healthy).toBeDefined();
      expect(response.body.summary.degraded).toBeDefined();
      expect(response.body.summary.unhealthy).toBeDefined();
      expect(response.body.summary.unknown).toBeDefined();
    });

    test('should return unhealthy status when services fail', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));
      mockWhatsApp.getConnectionInfo.mockReturnValue({
        connected: false,
        lastSeen: '2025-08-14T09:30:00.000Z',
        attempts: 5,
        hasQR: true
      });
      
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.summary.unhealthy).toBeGreaterThan(0);
    });

    test('should handle health check errors', async () => {
      // Simular error en el health check
      jest.spyOn(healthCheck, 'getHealthStatus').mockRejectedValue(new Error('Health check error'));
      
      const response = await request(app)
        .get('/api/health')
        .expect(500);
      
      expect(response.body.error).toBe('Health check failed');
    });
  });

  describe('GET /api/metrics', () => {
    test('should return performance metrics', async () => {
      // Agregar algunos datos de prueba
      healthCheck.incrementRequests();
      healthCheck.incrementRequests();
      healthCheck.incrementErrors();
      healthCheck.addResponseTime(100);
      healthCheck.addResponseTime(200);
      
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);
      
      expect(response.body.totalRequests).toBeDefined();
      expect(response.body.totalErrors).toBeDefined();
      expect(response.body.errorRate).toBeDefined();
      expect(response.body.avgResponseTime).toBeDefined();
      expect(response.body.requestsPerMinute).toBeDefined();
      expect(response.body.lastReset).toBeDefined();
      
      expect(response.body.totalRequests).toBe(2);
      expect(response.body.totalErrors).toBe(1);
      expect(response.body.errorRate).toBe(50);
      expect(response.body.avgResponseTime).toBe(150);
    });

    test('should return zero metrics for new instance', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);
      
      expect(response.body.totalRequests).toBe(0);
      expect(response.body.totalErrors).toBe(0);
      expect(response.body.errorRate).toBe(0);
      expect(response.body.avgResponseTime).toBe(0);
    });

    test('should handle metrics errors', async () => {
      // Simular error en las métricas
      jest.spyOn(healthCheck, 'getPerformanceMetrics').mockImplementation(() => {
        throw new Error('Metrics error');
      });
      
      const response = await request(app)
        .get('/api/metrics')
        .expect(500);
      
      expect(response.body.error).toBe('Metrics unavailable');
    });
  });

  describe('Response Headers and Format', () => {
    test('should return JSON content type', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      
      const response = await request(app)
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);
      
      expect(response.body).toBeInstanceOf(Object);
    });

    test('should include timestamp in ISO format', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});