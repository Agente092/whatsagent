/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración para despliegue en Render - Server-side rendering
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  trailingSlash: true,
  swcMinify: true,
  
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