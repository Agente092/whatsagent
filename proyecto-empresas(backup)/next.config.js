/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración para despliegue en Render
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  images: {
    domains: ['localhost'],
    unoptimized: true // Para sitios estáticos
  },
  
  // Variables de entorno públicas
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  // Configuración para exportación estática (si es necesaria)
  trailingSlash: true,
  
  // Optimizaciones para producción
  swcMinify: true,
  
  // Configuración de rewrites para API
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3001/api/:path*',
        },
      ];
    }
    return [];
  },
}

module.exports = nextConfig
