/**
 * 📋 SERVICIO DE GESTIÓN DE CLIENTES
 * Maneja el reconocimiento, almacenamiento y recuperación de información de clientes
 */

const fs = require('fs').promises
const path = require('path')

class ClientService {
  constructor() {
    this.clientsFile = path.join(__dirname, '..', 'data', 'clients.json')
    this.conversationsFile = path.join(__dirname, '..', 'data', 'conversations.json')
    this.init()
  }

  async init() {
    try {
      // Crear directorio data si no existe
      const dataDir = path.dirname(this.clientsFile)
      await fs.mkdir(dataDir, { recursive: true })

      // Inicializar archivo de clientes si no existe
      try {
        await fs.access(this.clientsFile)
      } catch {
        await fs.writeFile(this.clientsFile, JSON.stringify({ clients: {} }), 'utf8')
      }

      // Inicializar archivo de conversaciones si no existe
      try {
        await fs.access(this.conversationsFile)
      } catch {
        await fs.writeFile(this.conversationsFile, JSON.stringify({ conversations: {} }), 'utf8')
      }

      console.log('✅ ClientService initialized')
    } catch (error) {
      console.error('❌ Error initializing ClientService:', error)
    }
  }

  async loadClients() {
    try {
      const data = await fs.readFile(this.clientsFile, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error loading clients:', error)
      return { clients: {} }
    }
  }

  async saveClients(data) {
    try {
      await fs.writeFile(this.clientsFile, JSON.stringify(data, null, 2), 'utf8')
    } catch (error) {
      console.error('Error saving clients:', error)
    }
  }

  /**
   * 👤 Obtener o crear cliente
   */
  async getOrCreateClient(phoneNumber, messageText = '') {
    const data = await this.loadClients()
    const clientId = phoneNumber.replace(/\D/g, '') // Solo números

    if (data.clients[clientId]) {
      // Cliente existente - actualizar última actividad
      data.clients[clientId].lastSeen = new Date().toISOString()
      data.clients[clientId].messageCount = (data.clients[clientId].messageCount || 0) + 1
      await this.saveClients(data)
      return data.clients[clientId]
    } else {
      // Cliente nuevo - intentar extraer nombre del primer mensaje
      const extractedName = this.extractNameFromMessage(messageText)
      
      const newClient = {
        id: clientId,
        phoneNumber: phoneNumber,
        name: extractedName || `Cliente-${clientId.slice(-4)}`,
        isNameConfirmed: !!extractedName,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        messageCount: 1,
        status: 'new', // new, active, vip
        topics: [],
        preferences: {}
      }

      data.clients[clientId] = newClient
      await this.saveClients(data)
      
      console.log(`👤 Nuevo cliente creado: ${newClient.name} (${phoneNumber})`)
      return newClient
    }
  }

  /**
   * 📝 Actualizar nombre del cliente
   */
  async updateClientName(phoneNumber, name) {
    const data = await this.loadClients()
    const clientId = phoneNumber.replace(/\D/g, '')

    if (data.clients[clientId]) {
      data.clients[clientId].name = name
      data.clients[clientId].isNameConfirmed = true
      data.clients[clientId].lastSeen = new Date().toISOString()
      await this.saveClients(data)
      
      console.log(`✅ Nombre actualizado: ${name} para ${phoneNumber}`)
      return data.clients[clientId]
    }
    
    return null
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
   * 📊 Actualizar temas de interés del cliente
   */
  async updateClientTopics(phoneNumber, topics) {
    const data = await this.loadClients()
    const clientId = phoneNumber.replace(/\D/g, '')

    if (data.clients[clientId]) {
      // Agregar nuevos temas sin duplicar
      const existingTopics = data.clients[clientId].topics || []
      const newTopics = [...new Set([...existingTopics, ...topics])]
      
      data.clients[clientId].topics = newTopics
      data.clients[clientId].lastSeen = new Date().toISOString()
      await this.saveClients(data)
    }
  }

  /**
   * 🏆 Promocionar cliente a VIP
   */
  async promoteToVIP(phoneNumber) {
    const data = await this.loadClients()
    const clientId = phoneNumber.replace(/\D/g, '')

    if (data.clients[clientId]) {
      data.clients[clientId].status = 'vip'
      data.clients[clientId].vipSince = new Date().toISOString()
      await this.saveClients(data)
      
      console.log(`👑 Cliente promocionado a VIP: ${data.clients[clientId].name}`)
      return data.clients[clientId]
    }
    
    return null
  }

  /**
   * 📈 Obtener estadísticas de clientes
   */
  async getStats() {
    const data = await this.loadClients()
    const clients = Object.values(data.clients)

    return {
      total: clients.length,
      new: clients.filter(c => c.status === 'new').length,
      active: clients.filter(c => c.status === 'active').length,
      vip: clients.filter(c => c.status === 'vip').length,
      withConfirmedNames: clients.filter(c => c.isNameConfirmed).length
    }
  }

  /**
   * 👥 Obtener todos los clientes
   */
  async getAllClients() {
    const data = await this.loadClients()
    return Object.values(data.clients).sort((a, b) => 
      new Date(b.lastSeen) - new Date(a.lastSeen)
    )
  }

  /**
   * 🔍 Buscar cliente por teléfono
   */
  async findClientByPhone(phoneNumber) {
    const data = await this.loadClients()
    const clientId = phoneNumber.replace(/\D/g, '')
    return data.clients[clientId] || null
  }
}

module.exports = ClientService