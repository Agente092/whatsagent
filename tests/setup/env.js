// Variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.LOG_LEVEL = 'error'; // Solo errores en tests