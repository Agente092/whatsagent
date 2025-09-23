#!/usr/bin/env node

/**
 * 🧪 Script de prueba para verificar la migración de ClientService a Prisma
 */

const ClientService = require('../server/services/clientService')

async function testMigration() {
  console.log('🧪 Probando migración de ClientService a Prisma...')
  
  try {
    const clientService = new ClientService()
    
    // Esperar un momento para la inicialización
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('1️⃣ Creando cliente de prueba...')
    const testClient = await clientService.getOrCreateClient('51998148917', 'Hola, soy Luis')
    console.log('✅ Cliente creado:', JSON.stringify(testClient, null, 2))
    
    console.log('2️⃣ Obteniendo todos los clientes...')
    const allClients = await clientService.getAllClients()
    console.log('✅ Total de clientes:', allClients.length)
    console.log('📋 Lista:', allClients.map(c => `${c.name} (${c.phoneNumber})`))
    
    console.log('3️⃣ Actualizando nombre del cliente...')
    await clientService.updateClientName('51998148917', 'Luis González')
    
    console.log('4️⃣ Promocionando a VIP...')
    const vipClient = await clientService.promoteToVIP('51998148917')
    console.log('✅ Cliente VIP:', vipClient ? vipClient.name : 'Error')
    
    console.log('5️⃣ Obteniendo estadísticas...')
    const stats = await clientService.getStats()
    console.log('✅ Estadísticas:', stats)
    
    console.log('🎉 ¡Migración exitosa! El sistema ahora usa Prisma.')
    
  } catch (error) {
    console.error('❌ Error en la migración:', error)
    process.exit(1)
  }
}

testMigration()