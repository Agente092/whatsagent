// Setup global para todos los tests
const { PrismaClient } = require('@prisma/client');

// Mock de console para tests más limpios
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup de base de datos de test - SIMPLIFICADO
let prisma = null;

// No usar base de datos real en tests unitarios
// Solo mockear las funciones que necesitamos

// Hacer prisma disponible globalmente en tests
global.testPrisma = prisma;

// Helper para crear datos de test (sin base de datos)
global.createTestClient = (overrides = {}) => {
  return {
    id: 'test-client-id',
    name: 'Test Client',
    phone: '+51987654321',
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
};

global.createTestUser = (overrides = {}) => {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    password: 'hashedpassword',
    name: 'Test User',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
};

global.createTestConversation = (clientId, overrides = {}) => {
  return {
    id: 'test-conversation-id',
    clientId: clientId || 'test-client-id',
    phone: '+51987654321',
    message: 'Test message',
    response: 'Test response',
    timestamp: new Date(),
    ...overrides
  };
};

// Mock de JWT para tests
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
  verify: jest.fn((token, secret, callback) => {
    if (token === 'valid-token') {
      callback(null, { id: 'test-user', email: 'test@example.com' });
    } else {
      callback(new Error('Invalid token'));
    }
  })
}));

// Timeout extendido para tests de integración
jest.setTimeout(30000);