#!/usr/bin/env node

/**
 * Script de inicialización para Render
 * Configura la base de datos y datos iniciales
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function initializeDatabase() {
  const prisma = new PrismaClient()

  try {
    console.log('🚀 Inicializando base de datos...')
    console.log('📍 DATABASE_URL:', process.env.DATABASE_URL)

    // Verificar conexión
    await prisma.$connect()
    console.log('✅ Conexión a base de datos establecida')

    // Verificar si las tablas existen
    console.log('🔍 Verificando estructura de base de datos...')
    try {
      const userCount = await prisma.user.count()
      console.log(`ℹ️ Usuarios existentes: ${userCount}`)
    } catch (error) {
      if (error.code === 'P2021') {
        console.log('⚠️ Tablas no encontradas. Ejecutando db push...')
        console.log('💡 Ejecuta: npx prisma db push --force-reset')
        console.log('💡 Luego vuelve a ejecutar: npm run db:init')
        return
      }
      throw error
    }

    // Crear usuario administrador si no existe
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@advisor.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10)
      
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Administrador',
          role: 'ADMIN'
        }
      })
      console.log(`✅ Usuario administrador creado: ${adminEmail}`)
    } else {
      console.log('ℹ️ Usuario administrador ya existe')
    }

    console.log('🎉 Base de datos inicializada correctamente')

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  initializeDatabase()
}

module.exports = { initializeDatabase }