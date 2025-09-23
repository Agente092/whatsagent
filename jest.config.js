module.exports = {
  // Entorno de testing
  testEnvironment: 'node',
  
  // Archivos de setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup/testSetup.js'],
  
  // Patrones de archivos de test
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Archivos a incluir en coverage
  collectCoverageFrom: [
    'server/**/*.js',
    'app/**/*.{js,jsx,ts,tsx}',
    '!server/index.js', // Excluir archivo principal
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!jest.config.js'
  ],
  
  // Umbrales de coverage
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  
  // Directorio de reportes de coverage
  coverageDirectory: 'coverage',
  
  // Formatos de reporte de coverage
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Timeout para tests (30 segundos)
  testTimeout: 30000,
  
  // Variables de entorno para tests
  setupFiles: ['<rootDir>/tests/setup/env.js'],
  
  // Transformaciones
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  
  // Módulos a ignorar en transformación
  transformIgnorePatterns: [
    'node_modules/(?!(baileys)/)'
  ],
  
  // Limpiar mocks entre tests
  clearMocks: true,
  
  // Restaurar mocks entre tests
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Detectar archivos abiertos
  detectOpenHandles: true,
  
  // Forzar salida después de tests
  forceExit: true
};