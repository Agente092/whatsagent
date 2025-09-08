#!/usr/bin/env node

/**
 * 🧹 Script para limpiar clientes falsos de grupos de WhatsApp
 * Identifica y elimina clientes que fueron creados por mensajes de grupos
 */

const { PrismaClient } = require('@prisma/client')

async function cleanupGroupClients() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🧹 Iniciando limpieza de clientes falsos de grupos...')
    
    // 1. Buscar todos los clientes
    const allClients = await prisma.client.findMany()
    console.log(`📊 Total de clientes encontrados: ${allClients.length}`)
    
    // 2. Identificar clientes sospechosos (probablemente de grupos)
    const suspiciousClients = []
    const legitClients = []
    
    for (const client of allClients) {
      const isSuspicious = (
        // Nombres genéricos como "Cliente-XXXX"
        client.name.startsWith('Cliente-') ||
        // Nombres muy cortos o casuales
        ['Jajaja', 'jaja', 'hola', 'ok', 'si', 'no'].includes(client.name.toLowerCase()) ||
        // Mensajes típicos de grupos
        client.name.toLowerCase().includes('bin') ||
        client.name.toLowerCase().includes('pass') ||
        client.name.toLowerCase().includes('te paso') ||
        // Números de teléfono muy largos (formato de grupos)
        client.phoneNumber.length > 15 ||
        // Clientes con solo 1 mensaje (mensajes casuales de grupos)
        client.messageCount <= 1
      )
      
      if (isSuspicious) {
        suspiciousClients.push(client)
      } else {
        legitClients.push(client)
      }
    }
    
    console.log(`🚫 Clientes sospechosos identificados: ${suspiciousClients.length}`)
    console.log(`✅ Clientes legítimos: ${legitClients.length}`)
    
    // 3. Mostrar clientes sospechosos
    if (suspiciousClients.length > 0) {
      console.log('\\n📋 Clientes sospechosos a eliminar:')
      suspiciousClients.forEach((client, index) => {
        console.log(`${index + 1}. ${client.name} (${client.phoneNumber}) - ${client.messageCount} msg(s)`)
      })
      
      // 4. Eliminar clientes sospechosos
      console.log('\\n🗑️ Eliminando clientes sospechosos...')
      
      for (const client of suspiciousClients) {
        try {
          await prisma.client.delete({
            where: { id: client.id }
          })
          console.log(`✅ Eliminado: ${client.name} (${client.phoneNumber})`)
        } catch (error) {
          console.log(`❌ Error eliminando ${client.name}: ${error.message}`)
        }
      }
    }
    
    // 5. Mostrar clientes legítimos restantes
    console.log('\\n✅ Clientes legítimos conservados:')
    legitClients.forEach((client, index) => {
      console.log(`${index + 1}. ${client.name} (${client.phoneNumber}) - ${client.messageCount} msg(s) - ${client.status}`)
    })
    
    console.log(`\\n🎉 Limpieza completada:`)
    console.log(`📊 Eliminados: ${suspiciousClients.length} clientes falsos`)
    console.log(`✅ Conservados: ${legitClients.length} clientes reales`)
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  cleanupGroupClients()
}

module.exports = { cleanupGroupClients }