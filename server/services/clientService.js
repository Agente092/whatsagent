/**
 * 📋 SERVICIO DE GESTIÓN DE CLIENTES - VERSIÓN PRISMA
 * Maneja el reconocimiento, almacenamiento y recuperación de información de clientes
 * 🔄 MIGRADO: Ahora usa Prisma en lugar de JSON para persistencia
 */

const { PrismaClient } = require('@prisma/client')

class ClientService {
  constructor() {
    this.prisma = new PrismaClient()
    this.init()
  }

  async init() {
    try {
      // 🔄 MIGRACIÓN: Intentar migrar datos del JSON si existe
      await this.migrateFromJsonIfNeeded()
      console.log('✅ ClientService initialized with Prisma')
    } catch (error) {
      console.error('❌ Error initializing ClientService:', error)
    }
  }

  /**
   * 🔄 MIGRACIÓN: Mover datos del JSON a Prisma si es necesario
   */
  async migrateFromJsonIfNeeded() {
    try {
      const fs = require('fs').promises
      const path = require('path')
      const clientsFile = path.join(__dirname, '..', 'data', 'clients.json')
      
      // Verificar si existe el archivo JSON
      try {
        await fs.access(clientsFile)
        console.log('📄 Archivo JSON encontrado, verificando migración...')
        
        const data = JSON.parse(await fs.readFile(clientsFile, 'utf8'))
        const jsonClients = Object.values(data.clients || {})
        
        if (jsonClients.length > 0) {
          console.log(`🔄 Migrando ${jsonClients.length} clientes del JSON a Prisma...`)
          
          for (const client of jsonClients) {
            // Verificar si el cliente ya existe en Prisma
            const existingClient = await this.prisma.client.findUnique({
              where: { phoneNumber: client.phoneNumber || client.id }
            })
            
            if (!existingClient) {
              await this.prisma.client.create({
                data: {
                  phoneNumber: client.phoneNumber || client.id,
                  name: client.name || `Cliente-${client.id.slice(-4)}`,
                  isNameConfirmed: client.isNameConfirmed || false,
                  firstSeen: new Date(client.firstSeen || Date.now()),
                  lastSeen: new Date(client.lastSeen || Date.now()),
                  messageCount: client.messageCount || 0,
                  status: client.status || 'new',
                  topics: JSON.stringify(client.topics || []),
                  preferences: JSON.stringify(client.preferences || {}),
                  vipSince: client.vipSince ? new Date(client.vipSince) : null
                }
              })
              console.log(`✅ Cliente migrado: ${client.name}`)
            }
          }
          
          // Hacer backup y eliminar archivo JSON
          const backupFile = clientsFile + '.migrated.' + Date.now()
          await fs.rename(clientsFile, backupFile)
          console.log(`📁 Backup creado: ${backupFile}`)
        }
      } catch (error) {
        // No existe archivo JSON, está bien
        console.log('📄 No hay archivo JSON para migrar')
      }
    } catch (error) {
      console.error('❌ Error en migración:', error)
    }
  }

  /**
   * 👤 Obtener o crear cliente
   */
  async getOrCreateClient(phoneNumber, messageText = '') {
    try {
      const clientId = phoneNumber.replace(/\D/g, '') // Solo números
      
      // Buscar cliente existente
      let client = await this.prisma.client.findUnique({
        where: { phoneNumber: clientId }
      })
      
      if (client) {
        // Cliente existente - actualizar última actividad
        client = await this.prisma.client.update({
          where: { phoneNumber: clientId },
          data: {
            lastSeen: new Date(),
            messageCount: { increment: 1 }
          }
        })
        
        return this.formatClientResponse(client)
      } else {
        // Cliente nuevo - intentar extraer nombre del primer mensaje
        const extractedName = this.extractNameFromMessage(messageText)
        
        const newClient = await this.prisma.client.create({
          data: {
            phoneNumber: clientId,
            name: extractedName || `Cliente-${clientId.slice(-4)}`,
            isNameConfirmed: !!extractedName,
            firstSeen: new Date(),
            lastSeen: new Date(),
            messageCount: 1,
            status: 'new',
            topics: '[]',
            preferences: '{}'
          }
        })
        
        console.log(`👤 Nuevo cliente creado: ${newClient.name} (${phoneNumber})`)
        return this.formatClientResponse(newClient)
      }
    } catch (error) {
      console.error('Error in getOrCreateClient:', error)
      throw error
    }
  }

  /**
   * 📝 Actualizar nombre del cliente
   */
  async updateClientName(phoneNumber, name) {
    try {
      const clientId = phoneNumber.replace(/\D/g, '')
      
      const client = await this.prisma.client.update({
        where: { phoneNumber: clientId },
        data: {
          name: name,
          isNameConfirmed: true,
          lastSeen: new Date()
        }
      })
      
      console.log(`✅ Nombre actualizado: ${name} para ${phoneNumber}`)
      return this.formatClientResponse(client)
    } catch (error) {
      console.error('Error updating client name:', error)
      return null
    }
  }

  /**
   * 🔍 Extraer nombre de mensaje
   */
  extractNameFromMessage(messageText) {
    if (!messageText || messageText.length < 2) return null

    const text = messageText.trim()
    
    // 🚫 NO EXTRAER NOMBRES DE SALUDOS COMUNES
    const commonGreetings = ['hola', 'hi', 'hello', 'buenos días', 'buenas tardes', 'buenas noches', 'buen día']
    if (commonGreetings.includes(text.toLowerCase())) {
      console.log(`🚫 No extraer nombre de saludo común: "${text}"`)
      return null
    }
    
    // Patrones comunes de presentación
    const patterns = [
      /mi nombre es ([a-záéíóúñ]{2,20})/i,
      /me llamo ([a-záéíóúñ]{2,20})/i,
      /soy ([a-záéíóúñ]{2,20})/i,
      /^([a-záéíóúñ]{2,20})$/i // Solo nombre (pero NO saludos)
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        const name = match[1].toLowerCase()
        // Capitalizar primera letra
        const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1)
        console.log(`✅ Nombre extraído: "${capitalizedName}" de "${text}"`)
        return capitalizedName
      }
    }

    // Si el mensaje es corto y solo contiene letras, podría ser un nombre
    // PERO asegurarse de que NO sea un saludo común
    if (text.length >= 2 && text.length <= 20 && /^[a-záéíóúñ\s]+$/i.test(text) && 
        !commonGreetings.includes(text.toLowerCase())) {
      const capitalizedName = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
      console.log(`✅ Posible nombre detectado: "${capitalizedName}" de "${text}"`)
      return capitalizedName
    }

    console.log(`❌ No se pudo extraer nombre de: "${text}"`)
    return null
  }

  /**
   * 📈 Actualizar temas de interés del cliente
   */
  async updateClientTopics(phoneNumber, topics) {
    try {
      const clientId = phoneNumber.replace(/\D/g, '')
      
      const client = await this.prisma.client.findUnique({
        where: { phoneNumber: clientId }
      })
      
      if (client) {
        // Agregar nuevos temas sin duplicar
        const existingTopics = JSON.parse(client.topics || '[]')
        const newTopics = [...new Set([...existingTopics, ...topics])]
        
        await this.prisma.client.update({
          where: { phoneNumber: clientId },
          data: {
            topics: JSON.stringify(newTopics),
            lastSeen: new Date()
          }
        })
      }
    } catch (error) {
      console.error('Error updating client topics:', error)
    }
  }

  /**
   * 🏆 Promocionar cliente a VIP
   */
  async promoteToVIP(phoneNumber) {
    try {
      const clientId = phoneNumber.replace(/\D/g, '')
      
      const client = await this.prisma.client.update({
        where: { phoneNumber: clientId },
        data: {
          status: 'vip',
          vipSince: new Date(),
          lastSeen: new Date()
        }
      })
      
      console.log(`👑 Cliente promocionado a VIP: ${client.name}`)
      return this.formatClientResponse(client)
    } catch (error) {
      console.error('Error promoting to VIP:', error)
      return null
    }
  }

  /**
   * 📈 Obtener estadísticas de clientes
   */
  async getStats() {
    try {
      const [total, newCount, active, vip, withConfirmedNames] = await Promise.all([
        this.prisma.client.count(),
        this.prisma.client.count({ where: { status: 'new' } }),
        this.prisma.client.count({ where: { status: 'active' } }),
        this.prisma.client.count({ where: { status: 'vip' } }),
        this.prisma.client.count({ where: { isNameConfirmed: true } })
      ])
      
      return {
        total,
        new: newCount,
        active,
        vip,
        withConfirmedNames
      }
    } catch (error) {
      console.error('Error getting stats:', error)
      return { total: 0, new: 0, active: 0, vip: 0, withConfirmedNames: 0 }
    }
  }

  /**
   * 👥 Obtener todos los clientes
   */
  async getAllClients() {
    try {
      const clients = await this.prisma.client.findMany({
        orderBy: { lastSeen: 'desc' }
      })
      
      return clients.map(client => this.formatClientResponse(client))
    } catch (error) {
      console.error('Error getting all clients:', error)
      return []
    }
  }

  /**
   * 🔍 Buscar cliente por teléfono
   */
  async findClientByPhone(phoneNumber) {
    try {
      const clientId = phoneNumber.replace(/\D/g, '')
      
      const client = await this.prisma.client.findUnique({
        where: { phoneNumber: clientId }
      })
      
      return client ? this.formatClientResponse(client) : null
    } catch (error) {
      console.error('Error finding client by phone:', error)
      return null
    }
  }

  /**
   * 🔄 Formatear respuesta del cliente (Prisma → ClientService format)
   */
  formatClientResponse(prismaClient) {
    return {
      id: prismaClient.phoneNumber, // Usar phoneNumber como ID para compatibilidad
      phoneNumber: prismaClient.phoneNumber,
      name: prismaClient.name,
      isNameConfirmed: prismaClient.isNameConfirmed,
      firstSeen: prismaClient.firstSeen.toISOString(),
      lastSeen: prismaClient.lastSeen.toISOString(),
      messageCount: prismaClient.messageCount,
      status: prismaClient.status,
      topics: JSON.parse(prismaClient.topics || '[]'),
      preferences: JSON.parse(prismaClient.preferences || '{}'),
      vipSince: prismaClient.vipSince ? prismaClient.vipSince.toISOString() : null
    }
  }
}

module.exports = ClientService