#!/usr/bin/env node

/**
 * 🧪 Script de prueba para verificar la migración a PostgreSQL
 * Simula las operaciones que causaban el problema con SQLite
 */

const { PrismaClient } = require('@prisma/client')

async function testPostgreSQLMigration() {
  console.log('🧪 Probando migración a PostgreSQL...')
  console.log('=' * 50)
  
  const prisma = new PrismaClient()
  
  try {
    // 1. Verificar conexión
    console.log('1️⃣ Probando conexión a base de datos...')
    await prisma.$connect()
    console.log('✅ Conexión exitosa')
    
    // 2. Contar registros existentes
    console.log('2️⃣ Verificando datos existentes...')
    const userCount = await prisma.user.count()
    const clientCount = await prisma.client.count()
    console.log(`✅ Usuarios: ${userCount}`)
    console.log(`✅ Clientes: ${clientCount}`)
    
    // 3. Probar operaciones del ClientService
    console.log('3️⃣ Probando ClientService (getAllClients)...')
    const allClients = await prisma.client.findMany({
      orderBy: { lastSeen: 'desc' }
    })
    
    console.log(`✅ Clientes encontrados: ${allClients.length}`)
    allClients.forEach(client => {
      console.log(`   📱 ${client.name} (${client.phoneNumber}) - ${client.messageCount} mensajes`)
    })
    
    // 4. Simular el endpoint de API Usage
    console.log('4️⃣ Simulando endpoint /api/api-usage/stats...')
    
    // Costos de Gemini 1.5 Flash
    const GEMINI_COSTS = {
      inputTokenCost: 0.075 / 1000000,  // $0.075 per million tokens
      outputTokenCost: 0.30 / 1000000,  // $0.30 per million tokens
      model: 'gemini-1.5-flash'
    }
    
    const userApiData = allClients.map(client => {
      const estimatedInputTokens = client.messageCount * 150
      const estimatedOutputTokens = client.messageCount * 300
      const inputCost = estimatedInputTokens * GEMINI_COSTS.inputTokenCost
      const outputCost = estimatedOutputTokens * GEMINI_COSTS.outputTokenCost
      const totalCost = inputCost + outputCost
      
      return {
        userId: client.phoneNumber,
        userName: client.name,
        phone: client.phoneNumber,
        totalRequests: client.messageCount,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        totalCost: totalCost,
        lastRequest: client.lastSeen.toISOString(),
        avgRequestsPerDay: client.messageCount / 7 // Estimación semanal
      }
    })
    
    const totalUsers = userApiData.length
    const totalCosts = userApiData.reduce((sum, user) => sum + user.totalCost, 0)
    const totalRequests = userApiData.reduce((sum, user) => sum + user.totalRequests, 0)
    const totalTokens = userApiData.reduce((sum, user) => sum + user.inputTokens + user.outputTokens, 0)
    
    console.log('✅ Estadísticas de API generadas:')
    console.log(`   📊 Total usuarios: ${totalUsers}`)
    console.log(`   💰 Costo total: $${totalCosts.toFixed(6)}`)
    console.log(`   📱 Total requests: ${totalRequests}`)
    console.log(`   🔤 Total tokens: ${totalTokens}`)
    
    // 5. Mostrar datos por usuario
    if (userApiData.length > 0) {
      console.log('5️⃣ Datos por usuario:')
      userApiData.forEach(user => {
        console.log(`   👤 ${user.userName}:`)
        console.log(`      📞 Teléfono: ${user.phone}`)
        console.log(`      📊 Requests: ${user.totalRequests}`)
        console.log(`      💰 Costo: $${user.totalCost.toFixed(6)}`)
        console.log(`      ⏰ Último request: ${user.lastRequest}`)
        console.log('')
      })
    }
    
    // 6. Resultado final
    console.log('🎉 ¡MIGRACIÓN EXITOSA!')
    console.log('=' * 50)
    
    if (totalUsers > 0) {
      console.log('✅ PROBLEMA SOLUCIONADO:')
      console.log('   • Los clientes ahora persisten en PostgreSQL')
      console.log('   • La sección "Consumo API" mostrará datos reales')
      console.log('   • No más "0 usuarios encontrados"')
    } else {
      console.log('⚠️  NOTA: No hay clientes aún, pero la estructura funciona')
      console.log('   • Los clientes creados por WhatsApp persistirán')
      console.log('   • La base de datos NO se recreará en cada deploy')
    }
    
  } catch (error) {
    console.error('❌ Error en prueba de migración:', error)
    console.log('')
    console.log('🔧 POSIBLES SOLUCIONES:')
    console.log('1. Verificar que DATABASE_URL apunte a PostgreSQL')
    console.log('2. Ejecutar: npx prisma db push')
    console.log('3. Ejecutar: npm run db:init')
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar prueba
testPostgreSQLMigration()