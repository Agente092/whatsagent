/**
 * ⚙️ SERVICIO DE CONFIGURACIÓN DINÁMICA
 * Maneja la configuración personalizable del sistema y agente
 */

const fs = require('fs').promises
const path = require('path')

class ConfigService {
  constructor() {
    // 🔄 USAR LA MISMA UBICACIÓN QUE EL FRONTEND
    this.configFile = path.join(__dirname, '..', '..', 'data', 'system-config.json')
    this.config = this.getDefaultConfig()
    this.init()
  }

  getDefaultConfig() {
    return {
      company_name: 'Tu Empresa',
      company_description: 'Especialistas en estrategias empresariales',
      representative_name: '',
      representative_role: 'Asesor Empresarial',
      greeting_style: 'dynamic', // dynamic, professional, friendly, formal
      response_tone: 'professional', // professional, consultative, expert, innovative
      business_hours_start: '09:00',
      business_hours_end: '18:00',
      auto_responses: true,
      welcome_message: '',
      fallback_message: 'Disculpa, estoy experimentando dificultades técnicas. ¿Podrías reformular tu consulta?',
      api_rotation: true,
      max_apis_to_use: 15,
      client_recognition: true,
      personalized_greetings: true,
      save_conversation_history: true,
      response_delay_simulation: false,
      typing_indicator: true
    }
  }

  async init() {
    try {
      // Crear directorio data si no existe
      const dataDir = path.dirname(this.configFile)
      await fs.mkdir(dataDir, { recursive: true })

      // Cargar configuración existente o crear nueva
      try {
        await fs.access(this.configFile)
        await this.loadConfig()
      } catch {
        await this.saveConfig()
        console.log('✅ Archivo de configuración creado con valores por defecto')
      }

      console.log('✅ ConfigService initialized')
    } catch (error) {
      console.error('❌ Error initializing ConfigService:', error)
    }
  }

  async loadConfig() {
    try {
      const data = await fs.readFile(this.configFile, 'utf8')
      const savedConfig = JSON.parse(data)
      
      // Merge con configuración por defecto para mantener nuevas opciones
      this.config = { ...this.getDefaultConfig(), ...savedConfig }
      
      console.log('📋 Configuración cargada desde archivo compartido:', {
        company: this.config.company_name,
        representative: this.config.representative_name || 'Sin nombre',
        greeting_style: this.config.greeting_style,
        tone: this.config.response_tone
      })
      
      return this.config
    } catch (error) {
      console.error('Error loading config:', error)
      this.config = this.getDefaultConfig()
      return this.config
    }
  }

  async saveConfig(newConfig = null) {
    try {
      if (newConfig) {
        this.config = { ...this.config, ...newConfig }
      }
      
      await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2), 'utf8')
      console.log('✅ Configuración guardada')
      return this.config
    } catch (error) {
      console.error('Error saving config:', error)
      throw error
    }
  }

  // Getters para configuraciones específicas
  getCompanyInfo() {
    return {
      name: this.config.company_name,
      description: this.config.company_description,
      representative: {
        name: this.config.representative_name,
        role: this.config.representative_role
      }
    }
  }

  getGreetingConfig() {
    return {
      style: this.config.greeting_style,
      personalized: this.config.personalized_greetings,
      welcome_message: this.config.welcome_message
    }
  }

  getResponseConfig() {
    return {
      tone: this.config.response_tone,
      auto_responses: this.config.auto_responses,
      fallback_message: this.config.fallback_message,
      delay_simulation: this.config.response_delay_simulation,
      typing_indicator: this.config.typing_indicator
    }
  }

  getSystemConfig() {
    return {
      api_rotation: this.config.api_rotation,
      max_apis: this.config.max_apis_to_use,
      client_recognition: this.config.client_recognition,
      save_history: this.config.save_conversation_history
    }
  }

  getBusinessHours() {
    return {
      start: this.config.business_hours_start,
      end: this.config.business_hours_end
    }
  }

  // Setters para actualizaciones específicas
  async updateCompanyInfo(companyInfo) {
    const updates = {}
    if (companyInfo.name) updates.company_name = companyInfo.name
    if (companyInfo.description) updates.company_description = companyInfo.description
    if (companyInfo.representative?.name !== undefined) updates.representative_name = companyInfo.representative.name
    if (companyInfo.representative?.role) updates.representative_role = companyInfo.representative.role
    
    return await this.saveConfig(updates)
  }

  async updateGreetingConfig(greetingConfig) {
    const updates = {}
    if (greetingConfig.style) updates.greeting_style = greetingConfig.style
    if (greetingConfig.personalized !== undefined) updates.personalized_greetings = greetingConfig.personalized
    if (greetingConfig.welcome_message !== undefined) updates.welcome_message = greetingConfig.welcome_message
    
    return await this.saveConfig(updates)
  }

  async updateResponseConfig(responseConfig) {
    const updates = {}
    if (responseConfig.tone) updates.response_tone = responseConfig.tone
    if (responseConfig.auto_responses !== undefined) updates.auto_responses = responseConfig.auto_responses
    if (responseConfig.fallback_message !== undefined) updates.fallback_message = responseConfig.fallback_message
    if (responseConfig.delay_simulation !== undefined) updates.response_delay_simulation = responseConfig.delay_simulation
    if (responseConfig.typing_indicator !== undefined) updates.typing_indicator = responseConfig.typing_indicator
    
    return await this.saveConfig(updates)
  }

  // Método para verificar si está en horario de atención
  isWithinBusinessHours() {
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
    
    return currentTime >= this.config.business_hours_start && 
           currentTime <= this.config.business_hours_end
  }

  // Obtener toda la configuración
  getAll() {
    return { ...this.config }
  }

  // Actualizar configuración completa
  async updateAll(newConfig) {
    return await this.saveConfig(newConfig)
  }
}

module.exports = ConfigService