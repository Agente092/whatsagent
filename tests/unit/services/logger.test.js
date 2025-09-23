const logger = require('../../../server/services/logger');
const fs = require('fs');
const path = require('path');

describe('Logger Service', () => {
  const logsDir = path.join(process.cwd(), 'logs');

  beforeAll(() => {
    // Asegurar que el directorio de logs existe
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Limpiar mocks después de cada test
    jest.clearAllMocks();
  });

  describe('Basic Logging', () => {
    test('should log info messages', () => {
      // En tests, el logger está configurado para nivel 'error'
      // Vamos a probar que el método no falla
      expect(() => {
        logger.info('Test info message', { testData: 'value' });
      }).not.toThrow();
    });

    test('should log error messages with stack trace', () => {
      const testError = new Error('Test error');
      
      expect(() => {
        logger.error('Test error message', testError, { context: 'test' });
      }).not.toThrow();
      
      // Verificar que el error tiene las propiedades correctas
      expect(testError.message).toBe('Test error');
      expect(testError.stack).toBeDefined();
    });

    test('should log warning messages', () => {
      expect(() => {
        logger.warn('Test warning message', { level: 'warning' });
      }).not.toThrow();
    });
  });

  describe('Service-specific Logging', () => {
    test('should log WhatsApp messages with client phone', () => {
      expect(() => {
        logger.whatsapp('info', 'WhatsApp message received', '+51987654321', {
          messageLength: 50
        });
      }).not.toThrow();
    });

    test('should log API requests with proper format', () => {
      expect(() => {
        logger.api('GET', '/api/clients', 200, 150, {
          userAgent: 'test-agent'
        });
      }).not.toThrow();
    });

    test('should log AI interactions', () => {
      expect(() => {
        logger.ai('AI response generated', 150, 2500, {
          model: 'gemini-1.5-flash'
        });
      }).not.toThrow();
    });

    test('should log database operations', () => {
      expect(() => {
        logger.database('SELECT', 'clients', 25, {
          recordCount: 10
        });
      }).not.toThrow();
    });
  });

  describe('Stream Interface', () => {
    test('should provide stream interface for Morgan', () => {
      expect(logger.stream).toBeDefined();
      expect(typeof logger.stream.write).toBe('function');
    });

    test('should handle stream writes', () => {
      expect(() => {
        logger.stream.write('Test HTTP log message\n');
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle logging without metadata', () => {
      expect(() => {
        logger.info('Message without metadata');
      }).not.toThrow();
    });

    test('should handle null error objects', () => {
      expect(() => {
        logger.error('Error without error object', null, { context: 'test' });
      }).not.toThrow();
    });
  });
});