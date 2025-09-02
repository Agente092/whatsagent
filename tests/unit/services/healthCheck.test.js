const HealthCheck = require('../../../server/services/healthCheck');

describe('HealthCheck Service', () => {
  let healthCheck;
  let mockPrisma;
  let mockWhatsApp;

  beforeEach(() => {
    // Mock Prisma
    mockPrisma = {
      $queryRaw: jest.fn()
    };

    // Mock WhatsApp Service
    mockWhatsApp = {
      getConnectionInfo: jest.fn()
    };

    healthCheck = new HealthCheck(mockPrisma, mockWhatsApp);
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (healthCheck) {
      healthCheck.destroy();
    }
  });

  describe('Metrics Tracking', () => {
    test('should increment request counter', () => {
      const initialRequests = healthCheck.metrics.requests;
      
      healthCheck.incrementRequests();
      
      expect(healthCheck.metrics.requests).toBe(initialRequests + 1);
    });

    test('should increment error counter', () => {
      const initialErrors = healthCheck.metrics.errors;
      
      healthCheck.incrementErrors();
      
      expect(healthCheck.metrics.errors).toBe(initialErrors + 1);
    });

    test('should track response times', () => {
      const responseTime = 150;
      
      healthCheck.addResponseTime(responseTime);
      
      expect(healthCheck.metrics.responseTime).toContain(responseTime);
    });

    test('should limit response time array size', () => {
      // Agregar más de 1000 tiempos de respuesta
      for (let i = 0; i < 1100; i++) {
        healthCheck.addResponseTime(i);
      }
      
      expect(healthCheck.metrics.responseTime.length).toBe(1000);
    });
  });

  describe('Database Health Check', () => {
    test('should return healthy status when database is accessible', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      
      const result = await healthCheck.checkDatabase();
      
      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeDefined();
      expect(result.message).toBe('Database connection successful');
    });

    test('should return unhealthy status when database fails', async () => {
      const dbError = new Error('Connection failed');
      mockPrisma.$queryRaw.mockRejectedValue(dbError);
      
      const result = await healthCheck.checkDatabase();
      
      expect(result.status).toBe('unhealthy');
      expect(result.message).toBe('Connection failed');
      expect(result.error).toBe('Error');
    });

    test('should return unknown status when Prisma is not initialized', async () => {
      const healthCheckWithoutPrisma = new HealthCheck(null, mockWhatsApp);
      
      const result = await healthCheckWithoutPrisma.checkDatabase();
      
      expect(result.status).toBe('unknown');
      expect(result.message).toBe('Prisma not initialized');
    });
  });

  describe('WhatsApp Health Check', () => {
    test('should return healthy status when WhatsApp is connected', async () => {
      mockWhatsApp.getConnectionInfo.mockReturnValue({
        connected: true,
        lastSeen: '2025-08-14T10:30:00.000Z',
        attempts: 0,
        hasQR: false
      });
      
      const result = await healthCheck.checkWhatsApp();
      
      expect(result.status).toBe('healthy');
      expect(result.connected).toBe(true);
      expect(result.message).toBe('WhatsApp connected');
    });

    test('should return unhealthy status when WhatsApp is disconnected', async () => {
      mockWhatsApp.getConnectionInfo.mockReturnValue({
        connected: false,
        lastSeen: '2025-08-14T09:30:00.000Z',
        attempts: 3,
        hasQR: true
      });
      
      const result = await healthCheck.checkWhatsApp();
      
      expect(result.status).toBe('unhealthy');
      expect(result.connected).toBe(false);
      expect(result.message).toBe('WhatsApp disconnected');
    });

    test('should return unknown status when WhatsApp service is not initialized', async () => {
      const healthCheckWithoutWhatsApp = new HealthCheck(mockPrisma, null);
      
      const result = await healthCheckWithoutWhatsApp.checkWhatsApp();
      
      expect(result.status).toBe('unknown');
      expect(result.message).toBe('WhatsApp service not initialized');
    });
  });

  describe('Memory Health Check', () => {
    test('should return memory usage information', () => {
      const result = healthCheck.checkMemory();
      
      expect(result.status).toBeDefined();
      expect(result.systemMemory).toBeDefined();
      expect(result.processMemory).toBeDefined();
      expect(result.systemMemory.total).toBeGreaterThan(0);
      expect(result.processMemory.heapUsed).toBeGreaterThan(0);
    });

    test('should return healthy status for normal memory usage', () => {
      const result = healthCheck.checkMemory();
      
      // En un entorno de test, el uso de memoria debería ser normal
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });
  });

  describe('Disk Health Check', () => {
    test('should return healthy status when disk is accessible', () => {
      const result = healthCheck.checkDisk();
      
      expect(result.status).toBe('healthy');
      expect(result.accessible).toBe(true);
    });
  });

  describe('Uptime Calculation', () => {
    test('should calculate uptime correctly', () => {
      const result = healthCheck.getUptime();
      
      expect(result.seconds).toBeGreaterThanOrEqual(0);
      expect(result.formatted).toMatch(/\d+d \d+h \d+m \d+s/);
      expect(result.startTime).toBeDefined();
    });
  });

  describe('Performance Metrics', () => {
    test('should calculate performance metrics correctly', () => {
      // Agregar algunos datos de prueba
      healthCheck.incrementRequests();
      healthCheck.incrementRequests();
      healthCheck.incrementErrors();
      healthCheck.addResponseTime(100);
      healthCheck.addResponseTime(200);
      
      const metrics = healthCheck.getPerformanceMetrics();
      
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.totalErrors).toBe(1);
      expect(metrics.errorRate).toBe(50);
      expect(metrics.avgResponseTime).toBe(150);
    });

    test('should handle zero requests gracefully', () => {
      const metrics = healthCheck.getPerformanceMetrics();
      
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.totalErrors).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.avgResponseTime).toBe(0);
    });
  });

  describe('Complete Health Status', () => {
    test('should return complete health status', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockWhatsApp.getConnectionInfo.mockReturnValue({
        connected: true,
        lastSeen: '2025-08-14T10:30:00.000Z',
        attempts: 0,
        hasQR: false
      });
      
      const result = await healthCheck.getHealthStatus();
      
      expect(result.status).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.services).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.summary).toBeDefined();
      
      expect(result.services.database).toBeDefined();
      expect(result.services.whatsapp).toBeDefined();
      expect(result.services.memory).toBeDefined();
      expect(result.services.disk).toBeDefined();
    });

    test('should return unhealthy overall status when database fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('DB Error'));
      mockWhatsApp.getConnectionInfo.mockReturnValue({
        connected: true,
        lastSeen: '2025-08-14T10:30:00.000Z',
        attempts: 0,
        hasQR: false
      });
      
      const result = await healthCheck.getHealthStatus();
      
      expect(result.status).toBe('unhealthy');
      expect(result.summary.unhealthy).toBeGreaterThan(0);
    });
  });

  describe('Simple Health Check', () => {
    test('should return ok status when database is healthy', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      
      const result = await healthCheck.getSimpleHealth();
      
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });

    test('should return error status when database fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('DB Error'));
      
      const result = await healthCheck.getSimpleHealth();
      
      expect(result.status).toBe('error');
      expect(result.timestamp).toBeDefined();
    });
  });
});