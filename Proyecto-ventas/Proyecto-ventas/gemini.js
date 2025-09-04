import { GoogleGenerativeAI } from '@google/generative-ai'

// Pool de API Keys para rotación automática
const API_KEYS = [
  'AIzaSyAlUIsKYBxfZ4RH3aimq7XBWQtlGcG1fjo', // API Key 1 (original)
  'AIzaSyCFR2kApUeCGSWOf_tkcLe1XH4qgKjDVJ0', // API Key 2
  'AIzaSyBEDtNY0MAWLsHcSn4rObEM_Cp7VdKwDjU', // API Key 3
  'AIzaSyD9zOtMS8Xiymc6AyusRUvhwJh3Xvarssc', // API Key 4
  'AIzaSyCv73IdpI7lkziE6jijFTgbaKOdeKS3Sm4', // API Key 5
  'AIzaSyAPFixQAWKi2M7qDjH1n2QuHH7BeAjyTQ8', // API Key 6
  'AIzaSyCwhRvWvFOfJRMk9qQM2U1fDZaa7_HiB_A', // API Key 7
  'AIzaSyCWQsPEq-D3nJZFdMgsTlxDOweTzPKOTwI', // API Key 8 (removido duplicado)
  'AIzaSyDQdZu9BKU0wthWB5MrLu6jlFqJBjobpPU', // API Key 9
  'AIzaSyDNmqQipY9twB5jLEWrMJHQkKRS0_5bhjw', // API Key 10
  'AIzaSyCpkO5REjtpZhXeMpvIhgh8oY_2X2ABIro', // API Key 11 (nueva)
  'AIzaSyARYabiYzJZ8DfDNJeq8wdjy1T_3UGFAXU', // API Key 12 (nueva)
  'AIzaSyBcYsacd3Ml2wlduHZRzkFzHLtgOcylOhQ', // API Key 13 (nueva)
  'AIzaSyB6vyb1cb7D6u9-ef-y4KZc_8Y82kaWC2M', // API Key 14 (nueva)
  'AIzaSyDKWAZ0FkDd0_5DmGhytiu-lg0mUOdHsXg'  // API Key 15 (nueva)
]

// 🎭 PERFILES DE NEGOCIO PREDEFINIDOS
const BUSINESS_PROFILES = {
  general: {
    name: "Representante de Ventas",
    emoji: "🏪",
    greeting_variations: [
      "¡Hola!",
      "¡Buenas!",
      "¡Por supuesto!",
      "¡Perfecto!",
      "¡Excelente pregunta!",
      "¡Claro que sí!",
      "¡Buena elección!",
      "¡Genial!",
      "¡Muy bien!",
      "¡Entendido!"
    ],
    tone: "profesional y amigable",
    vocabulary: ["producto", "artículo", "compra", "servicio"],
    style: "Mantén un tono profesional pero cercano",
    instructions: "Actúa como un representante de ventas profesional y cortés. Usa un lenguaje formal pero amigable. Siempre pregunta el nombre del cliente si no lo conoces.",
    identity_type: "representative" // No es dueño, es representante
  },
  cevicheria: {
    name: "Especialista en Ceviche",
    emoji: "🐟",
    greeting: "amigo/amiga",
    tone: "fresco y apetitoso",
    vocabulary: ["fresquito", "del día", "mariscos", "pescadito", "sabroso", "jugosito"],
    style: "Habla como un especialista en ceviche peruano auténtico, menciona la frescura de los productos del mar",
    instructions: "Eres un especialista en ceviche peruano apasionado. Enfatiza siempre la FRESCURA de tus productos del mar. Usa expresiones como 'fresquito del día', 'recién llegado del puerto'. Menciona que tus ceviches son preparados al momento. Siempre pregunta el nombre del cliente para personalizar el servicio.",
    identity_type: "specialist"
  },
  tecnologia: {
    name: "Especialista en Tecnología",
    emoji: "💻",
    greeting: "amigo/amiga",
    tone: "técnico pero accesible",
    vocabulary: ["especificaciones", "características", "rendimiento", "tecnología", "innovación"],
    style: "Sé técnico pero explica de manera sencilla, enfócate en beneficios",
    instructions: "Eres un especialista en tecnología que sabe explicar conceptos complejos de manera simple. Enfócate en los BENEFICIOS que la tecnología aporta al usuario, no solo en especificaciones técnicas. Usa comparaciones simples. Siempre pregunta el nombre del cliente para brindar asesoría personalizada.",
    identity_type: "specialist"
  },
  deportiva: {
    name: "Especialista Deportivo",
    emoji: "⚽",
    greeting: "campeón/campeona",
    tone: "motivacional y energético",
    vocabulary: ["entrenar", "rendimiento", "superarte", "meta", "logro", "campeón"],
    style: "Sé motivacional y energético, inspira al cliente a alcanzar sus metas",
    instructions: "Eres un especialista deportivo motivacional. INSPIRA al cliente a alcanzar sus metas deportivas. Usa frases motivacionales como 'Vamos campeón', 'Tu puedes lograrlo'. Relaciona cada producto con el logro de objetivos deportivos. Siempre pregunta el nombre del cliente para motivarlo personalmente.",
    identity_type: "specialist"
  },
  postres: {
    name: "Especialista en Postres",
    emoji: "🍰",
    greeting: "dulzura",
    tone: "dulce y tentador",
    vocabulary: ["antojito", "delicioso", "tentador", "dulce", "irresistible", "cremosito"],
    style: "Sé dulce y tentador, haz que los productos suenen irresistibles",
    instructions: "Eres un especialista en postres apasionado que ama endulzar la vida de las personas. Describe los postres de manera SENSORIAL: texturas cremosas, sabores intensos, aromas tentadores. Usa diminutivos cariñosos como 'tortita', 'dulcecito'. Haz que el cliente sienta antojo. Siempre pregunta el nombre del cliente para hacer recomendaciones personalizadas.",
    identity_type: "specialist"
  },
  restaurante: {
    name: "Chef Especialista",
    emoji: "🍽️",
    greeting: "querido cliente",
    tone: "elegante y gastronómico",
    vocabulary: ["platillo", "especialidad", "sabor", "experiencia culinaria", "exquisito"],
    style: "Sé elegante y describe los sabores de manera apetitosa",
    instructions: "Eres un chef especialista experimentado que ama compartir su pasión culinaria. Describe cada platillo como una EXPERIENCIA GASTRONÓMICA: aromas, texturas, combinaciones de sabores. Usa términos culinarios elegantes pero comprensibles. Recomienda maridajes y combinaciones. Siempre pregunta el nombre del cliente para ofrecer recomendaciones personalizadas según sus gustos.",
    identity_type: "specialist"
  },
  farmacia: {
    name: "Farmacéutico Profesional",
    emoji: "💊",
    greeting: "estimado/a",
    tone: "profesional y confiable",
    vocabulary: ["medicamento", "tratamiento", "salud", "bienestar", "cuidado"],
    style: "Mantén un tono profesional y confiable, enfócate en el bienestar",
    instructions: "Eres un farmacéutico profesional comprometido con la salud de las personas. Mantén siempre un tono PROFESIONAL y CONFIABLE. Enfócate en el bienestar del cliente. Nunca des consejos médicos, solo información sobre productos disponibles. Recomienda consultar al médico cuando sea necesario. Siempre pregunta el nombre del cliente para un servicio personalizado.",
    identity_type: "professional"
  },
  personalizado: {
    name: "Representante Personalizado",
    emoji: "✏️",
    greeting: "cliente",
    tone: "adaptable",
    vocabulary: ["producto", "servicio"],
    style: "Adapta tu estilo según las preferencias del usuario",
    instructions: "Adapta tu personalidad según las instrucciones personalizadas del usuario. Siempre pregunta el nombre del cliente sin importar el perfil personalizado configurado.",
    identity_type: "representative"
  }
}

// Modelos a utilizar (en orden de preferencia)
const PRIMARY_MODEL = 'gemini-1.5-flash'
const FALLBACK_MODEL = 'gemini-1.5-flash-8b'

// Gestor de API Keys
class ApiKeyManager {
  constructor() {
    this.apiKeys = API_KEYS
    this.currentIndex = 0
    this.keyStatus = new Map()
    this.keyStats = new Map()

    // Inicializar estado de cada API key
    this.apiKeys.forEach((key, index) => {
      this.keyStatus.set(key, {
        isActive: true,
        isAvailable: true,  // ✅ CRÍTICO: Marcar como disponible por defecto
        lastError: null,
        errorCount: 0,
        lastUsed: null,
        rateLimitUntil: null,
        requestCount: 0,
        successCount: 0
      })
    })

    console.log(`🔑 ApiKeyManager inicializado con ${this.apiKeys.length} API keys`)
  }

  // Obtener la siguiente API key disponible
  getNextApiKey() {
    const startIndex = this.currentIndex
    let attempts = 0

    while (attempts < this.apiKeys.length) {
      const currentKey = this.apiKeys[this.currentIndex]
      const status = this.keyStatus.get(currentKey)

      // Verificar si la API key está disponible
      if (this.isKeyAvailable(currentKey)) {
        console.log(`🔑 Usando API Key ${this.currentIndex + 1}/${this.apiKeys.length}`)
        status.lastUsed = new Date()
        status.requestCount++
        return currentKey
      }

      // Pasar a la siguiente API key
      this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length
      attempts++
    }

    // Si llegamos aquí, todas las API keys están bloqueadas
    console.error('🚨 Todas las API keys están bloqueadas o con rate limit')

    // Resetear rate limits si han pasado más de 1 hora
    this.resetExpiredRateLimits()

    // Devolver la primera API key como último recurso
    return this.apiKeys[0]
  }

  // Verificar si una API key está disponible
  isKeyAvailable(apiKey) {
    const status = this.keyStatus.get(apiKey)

    if (!status.isActive || !status.isAvailable) {
      return false
    }

    // Verificar rate limit
    if (status.rateLimitUntil && new Date() < status.rateLimitUntil) {
      return false
    }

    // Verificar si tiene demasiados errores recientes
    if (status.errorCount > 5) {
      return false
    }

    return true
  }

  // Marcar API key como bloqueada por rate limit
  markRateLimit(apiKey, durationMinutes = 60) {
    const status = this.keyStatus.get(apiKey)
    if (status) {
      status.rateLimitUntil = new Date(Date.now() + durationMinutes * 60 * 1000)
      console.log(`⏰ API Key marcada con rate limit hasta: ${status.rateLimitUntil.toLocaleTimeString()}`)
    }
  }

  // Marcar error en API key
  markError(apiKey, error) {
    const status = this.keyStatus.get(apiKey)
    if (status) {
      status.lastError = error.message
      status.errorCount++

      // Si es error de rate limit, marcar específicamente
      if (error.message.includes('429') || error.message.includes('quota')) {
        this.markRateLimit(apiKey)
      }

      // 🔧 NUEVO: Si es error 400 (API Key inválida), marcar como no disponible permanentemente
      else if (error.message.includes('400') || error.message.includes('API Key not found') || error.message.includes('API_KEY_INVALID')) {
        status.isAvailable = false
        console.log(`🚫 API Key marcada como no disponible (API Key inválida)`)
      }

      // Si es error 403 (API deshabilitada), marcar como no disponible temporalmente
      else if (error.message.includes('403') || error.message.includes('Forbidden') || error.message.includes('SERVICE_DISABLED')) {
        status.isAvailable = false
        console.log(`🚫 API Key marcada como no disponible (API deshabilitada)`)
      }

      console.log(`❌ Error en API Key: ${error.message}`)
    }
  }

  // Marcar éxito en API key
  markSuccess(apiKey) {
    const status = this.keyStatus.get(apiKey)
    if (status) {
      status.successCount++
      status.errorCount = Math.max(0, status.errorCount - 1) // Reducir contador de errores
      status.isAvailable = true // ✅ Restaurar disponibilidad en caso de éxito
    }
  }

  // Resetear rate limits expirados
  resetExpiredRateLimits() {
    const now = new Date()
    this.keyStatus.forEach((status, key) => {
      if (status.rateLimitUntil && now > status.rateLimitUntil) {
        status.rateLimitUntil = null
        status.errorCount = 0
        status.isAvailable = true // ✅ Restaurar disponibilidad cuando expira rate limit
        console.log(`✅ Rate limit expirado para API Key, reactivando`)
      }
    })
  }

  // 🔧 NUEVO: Contar APIs disponibles
  getAvailableKeysCount() {
    let count = 0
    this.apiKeys.forEach(key => {
      if (this.isKeyAvailable(key)) {
        count++
      }
    })
    return count
  }

  // 🔧 NUEVO: Resetear errores temporales (no rate limits ni APIs inválidas)
  resetTemporaryErrors() {
    let resetCount = 0
    this.keyStatus.forEach((status, key) => {
      // Solo resetear si no es rate limit activo ni API inválida permanente
      if (!status.isAvailable &&
          (!status.rateLimitUntil || new Date() > status.rateLimitUntil) &&
          (!status.lastError ||
           (!status.lastError.includes('400') &&
            !status.lastError.includes('API Key not found') &&
            !status.lastError.includes('API_KEY_INVALID')))) {
        status.isAvailable = true
        status.errorCount = Math.max(0, status.errorCount - 2) // Reducir errores
        resetCount++
        console.log(`🔄 API Key reactivada temporalmente`)
      }
    })
    console.log(`✅ ${resetCount} APIs reactivadas temporalmente`)
    return resetCount
  }

  // Obtener estadísticas de todas las API keys
  getStats() {
    const stats = []
    this.apiKeys.forEach((key, index) => {
      const status = this.keyStatus.get(key)
      stats.push({
        index: index + 1,
        key: key.substring(0, 20) + '...',
        isActive: status.isActive,
        isAvailable: this.isKeyAvailable(key),
        requestCount: status.requestCount,
        successCount: status.successCount,
        errorCount: status.errorCount,
        lastUsed: status.lastUsed,
        rateLimitUntil: status.rateLimitUntil,
        lastError: status.lastError
      })
    })
    return stats
  }
}

export class GeminiService {
  constructor(databaseService = null) {
    // Inicializar el gestor de API keys
    this.apiKeyManager = new ApiKeyManager()
    this.genAI = null // Se inicializará dinámicamente
    this.db = databaseService // Referencia a la base de datos para obtener configuración

    // Configuración de generación optimizada
    this.generationConfig = {
      temperature: 0.7,
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 2048,
    }

    // Configuración de seguridad
    this.safetySettings = [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ]

    console.log('🤖 GeminiService inicializado con sistema multi-API key')
  }

  // Obtener instancia de GoogleGenerativeAI con API key actual
  getGeminiInstance() {
    const currentApiKey = this.apiKeyManager.getNextApiKey()
    return new GoogleGenerativeAI(currentApiKey)
  }

  // 🎭 MÉTODO PARA OBTENER PERFIL DE NEGOCIO
  getBusinessProfile(profileKey) {
    return BUSINESS_PROFILES[profileKey] || BUSINESS_PROFILES.general
  }

  // 🎭 MÉTODO PARA OBTENER TODOS LOS PERFILES DISPONIBLES
  getAllBusinessProfiles() {
    return BUSINESS_PROFILES
  }

  // 🧠 MÉTODO PARA CONSTRUIR CONTEXTO CONVERSACIONAL MEJORADO
  buildEnhancedConversationContext(recentHistory, customerName) {
    if (!recentHistory || recentHistory.length === 0) return ''

    // Extraer información clave de la conversación
    const conversationInsights = this.extractConversationInsights(recentHistory, customerName)

    // Construir contexto narrativo
    let contextText = '\n🧠 CONTEXTO CONVERSACIONAL INTELIGENTE:\n'

    // Información del cliente extraída
    if (conversationInsights.customerInfo.length > 0) {
      contextText += `\n📋 INFORMACIÓN DEL CLIENTE ${customerName.toUpperCase()}:\n`
      conversationInsights.customerInfo.forEach(info => {
        contextText += `- ${info}\n`
      })
    }

    // Productos mencionados previamente
    if (conversationInsights.mentionedProducts.length > 0) {
      contextText += `\n🛍️ PRODUCTOS MENCIONADOS ANTERIORMENTE:\n`
      conversationInsights.mentionedProducts.forEach(product => {
        contextText += `- ${product}\n`
      })
    }

    // Preferencias detectadas
    if (conversationInsights.preferences.length > 0) {
      contextText += `\n💡 PREFERENCIAS DETECTADAS:\n`
      conversationInsights.preferences.forEach(pref => {
        contextText += `- ${pref}\n`
      })
    }

    // Historial reciente para referencia
    contextText += `\n💬 ÚLTIMOS INTERCAMBIOS:\n`
    recentHistory.slice(-3).forEach((h, index) => {
      const role = h.role === 'user' ? customerName : 'Tú'
      contextText += `${index + 1}. ${role}: "${h.message}"\n`
    })

    contextText += `\n🎯 INSTRUCCIÓN CLAVE: Usa esta información para crear respuestas más naturales y contextuales. Haz referencia a información previa cuando sea relevante, como si realmente recordaras la conversación.\n`

    return contextText
  }

  // 🎲 MÉTODO PARA SELECCIONAR VARIACIÓN DE SALUDO ALEATORIA
  getRandomGreeting(businessProfile) {
    if (businessProfile.greeting_variations && businessProfile.greeting_variations.length > 0) {
      const randomIndex = Math.floor(Math.random() * businessProfile.greeting_variations.length)
      return businessProfile.greeting_variations[randomIndex]
    }
    // Fallback para perfiles antiguos
    return businessProfile.greeting || "¡Hola!"
  }

  // 🧠 MÉTODO PARA ANALIZAR SI YA TIENE SUFICIENTE INFORMACIÓN DEL CLIENTE
  analyzeCustomerInformationSufficiency(recentHistory, currentMessage) {
    if (!recentHistory || recentHistory.length === 0) return { hasSufficientInfo: false, requirements: [] }

    const customerRequirements = []
    const allMessages = recentHistory.map(h => h.message.toLowerCase()).join(' ') + ' ' + currentMessage.toLowerCase()

    // Detectar información específica del cliente
    const detectedInfo = {
      purpose: false,        // Para qué lo necesita
      location: false,       // Dónde va a usar
      specifications: false, // Características específicas
      preferences: false     // Preferencias del cliente
    }

    // Detectar propósito/uso - MEJORADO
    if (allMessages.includes('ducha') || allMessages.includes('baño') ||
        allMessages.includes('mampara') || allMessages.includes('ventana') ||
        allMessages.includes('puerta') || allMessages.includes('mesa') ||
        allMessages.includes('renovar') || allMessages.includes('cambiar') ||
        allMessages.includes('reemplazar') || allMessages.includes('instalar') ||
        allMessages.includes('necesito') || allMessages.includes('quiero') ||
        allMessages.includes('busco') || allMessages.includes('para')) {
      detectedInfo.purpose = true
      customerRequirements.push('Propósito/uso identificado')
    }

    // Detectar especificaciones técnicas - MEJORADO PARA PRIVACIDAD
    if (allMessages.includes('resistencia') || allMessages.includes('seguridad') ||
        allMessages.includes('transparencia') || allMessages.includes('templado') ||
        allMessages.includes('grosor') || allMessages.includes('medida') ||
        allMessages.includes('privacidad') || allMessages.includes('privado') ||
        allMessages.includes('opaco') || allMessages.includes('esmerilado') ||
        allMessages.includes('transparente') || allMessages.includes('claro') ||
        allMessages.includes('laminado') || allMessages.includes('decorativo') ||
        allMessages.includes('colores') || allMessages.includes('espesor') ||
        allMessages.includes('aislamiento') || allMessages.includes('térmico') ||
        allMessages.includes('acústico') || allMessages.includes('ruido')) {
      detectedInfo.specifications = true
      customerRequirements.push('Especificaciones técnicas mencionadas')
    }

    // Detectar preferencias del cliente - NUEVO
    if (allMessages.includes('económico') || allMessages.includes('barato') ||
        allMessages.includes('calidad') || allMessages.includes('mejor') ||
        allMessages.includes('recomendación') || allMessages.includes('recomiendas') ||
        allMessages.includes('sugieres') || allMessages.includes('aconsejable') ||
        allMessages.includes('recomendarías') || allMessages.includes('ideal')) {
      detectedInfo.preferences = true
      customerRequirements.push('Preferencias del cliente identificadas')
    }

    // Detectar ubicación/contexto
    if (allMessages.includes('jacuzzi') || allMessages.includes('jacuzzy') ||
        allMessages.includes('vapor') || allMessages.includes('agua') ||
        allMessages.includes('humedad') || allMessages.includes('exterior')) {
      detectedInfo.location = true
      customerRequirements.push('Contexto de uso identificado')
    }

    // Determinar si tiene suficiente información - LÓGICA MEJORADA
    const infoCount = Object.values(detectedInfo).filter(Boolean).length
    const hasSufficientInfo = infoCount >= 2 || // Al menos 2 tipos de información
                             (detectedInfo.purpose && detectedInfo.specifications) || // Propósito + especificaciones
                             (detectedInfo.location && detectedInfo.specifications) || // Ubicación + especificaciones
                             (detectedInfo.preferences && detectedInfo.specifications) // Preferencias + especificaciones

    return {
      hasSufficientInfo,
      requirements: customerRequirements,
      detectedInfo,
      infoCount
    }
  }

  // 🎯 MÉTODO PARA FILTRAR PRODUCTOS INTELIGENTEMENTE BASADO EN ESPECIFICACIONES
  filterProductsBySpecifications(inventory, recentHistory, currentMessage) {
    const allMessages = recentHistory.map(h => h.message.toLowerCase()).join(' ') + ' ' + currentMessage.toLowerCase()

    // 🔍 PASO 1: BÚSQUEDA EXACTA GENÉRICA POR COINCIDENCIAS DE PALABRAS
    const exactMatches = []

    // 🧠 ALGORITMO INTELIGENTE: Calcular rareza de palabras (TF-IDF simplificado)
    const commonWords = ['para', 'una', 'con', 'por', 'del', 'las', 'los', 'que', 'muy', 'más', 'son', 'está', 'tiene', 'hacer', 'desde', 'hasta', 'entre', 'sobre']
    const clientWords = allMessages.split(/\s+/)
      .filter(word => word.length > 3) // Palabras de más de 3 caracteres
      .map(word => word.toLowerCase())
      .filter(word => !commonWords.includes(word)) // Filtrar palabras comunes

    // 🎯 CALCULAR RAREZA DE PALABRAS EN EL INVENTARIO
    const wordFrequency = {}
    const totalProducts = inventory.length

    // Contar frecuencia de cada palabra en el inventario
    for (const product of inventory) {
      const productText = `${product.nombre} ${product.descripcion || ''}`.toLowerCase()
      const productWords = productText.split(/\s+/).filter(word => word.length > 3)

      for (const word of productWords) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1
      }
    }

    // 🧠 CALCULAR PESO DE RAREZA PARA CADA PALABRA DEL CLIENTE
    const getWordRarityWeight = (word) => {
      const frequency = wordFrequency[word] || 0
      const percentage = frequency / totalProducts

      // Palabras que aparecen en >70% de productos tienen peso bajo
      if (percentage > 0.7) return 10 // Peso muy bajo para palabras ultra-comunes
      if (percentage > 0.5) return 25 // Peso bajo para palabras comunes
      if (percentage > 0.3) return 50 // Peso medio para palabras moderadas
      if (percentage > 0.1) return 75 // Peso alto para palabras poco comunes
      return 100 // Peso máximo para palabras raras/específicas
    }

    for (const product of inventory) {
      // 🛡️ VALIDACIÓN CRÍTICA: Evitar error si product.nombre es undefined
      if (!product || !product.nombre) {
        console.log(`⚠️ Producto sin nombre detectado:`, product)
        continue
      }
      
      const productName = product.nombre.toLowerCase()
      const productDesc = (product.descripcion || '').toLowerCase()

      let exactMatchScore = 0
      let matchedWords = []
      let rarityDetails = [] // Para debug de rareza

      // Buscar coincidencias exactas de palabras del cliente en el producto
      for (const clientWord of clientWords) {
        const rarityWeight = getWordRarityWeight(clientWord)
        const frequency = wordFrequency[clientWord] || 0
        const percentage = ((frequency / totalProducts) * 100).toFixed(1)

        if (productName.includes(clientWord)) {
          exactMatchScore += rarityWeight * 2 // Doble peso para coincidencias en nombre
          matchedWords.push(clientWord)
          rarityDetails.push(`${clientWord}(${rarityWeight}pts, ${percentage}% freq)`)
        } else if (productDesc.includes(clientWord)) {
          exactMatchScore += rarityWeight // Peso normal para coincidencias en descripción
          matchedWords.push(clientWord)
          rarityDetails.push(`${clientWord}(${rarityWeight}pts, ${percentage}% freq)`)
        }
      }

      // Si hay coincidencias significativas, agregar a exactMatches
      if (exactMatchScore >= 25) { // Umbral mínimo para considerar coincidencia exacta
        exactMatches.push({
          ...product,
          relevanceScore: exactMatchScore,
          reasons: [
            `Coincidencias: ${matchedWords.join(', ')}`,
            `Rareza: ${rarityDetails.join(', ')}`
          ],
          matchedWords: matchedWords,
          rarityDetails: rarityDetails
        })
      }
    }

    // Si hay coincidencias exactas, ordenar por relevancia y usar las mejores
    if (exactMatches.length > 0) {
      exactMatches.sort((a, b) => b.relevanceScore - a.relevanceScore)

      // 🔍 DEBUG: Mostrar detalles de coincidencias exactas
      console.log(`🎯 COINCIDENCIAS EXACTAS encontradas: ${exactMatches.length}`)
      exactMatches.slice(0, 3).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.nombre} (Score: ${product.relevanceScore})`)
        console.log(`     Rareza: ${product.rarityDetails?.join(', ') || 'N/A'}`)
      })

      return {
        filteredProducts: exactMatches.slice(0, 3),
        clientNeeds: { exactMatch: true },
        totalRelevant: exactMatches.length
      }
    }

    // 🔍 PASO 2: BÚSQUEDA POR SIMILITUD SEMÁNTICA (solo si no hay coincidencias exactas)
    // 🧠 USAR EL MISMO ALGORITMO DE RAREZA PARA SIMILITUD SEMÁNTICA
    const relevantProducts = []

    // Reutilizar las palabras del cliente ya filtradas y el cálculo de rareza
    const clientKeywords = clientWords // Ya filtradas anteriormente

    // Filtrar productos del inventario basándose en similitud semántica genérica
    for (const product of inventory) {
      // 🛡️ VALIDACIÓN CRÍTICA: Evitar error si product.nombre es undefined
      if (!product || !product.nombre) {
        console.log(`⚠️ Producto sin nombre detectado en similitud semántica:`, product)
        continue
      }
      
      const productName = product.nombre.toLowerCase()
      const productDesc = (product.descripcion || '').toLowerCase()
      const productText = productName + ' ' + productDesc

      let relevanceScore = 0
      let reasons = []
      let matchedKeywords = []

      // 🧠 CALCULAR SIMILITUD USANDO RAREZA DE PALABRAS
      let semanticDetails = []

      for (const keyword of clientKeywords) {
        if (productText.includes(keyword)) {
          const rarityWeight = getWordRarityWeight(keyword)
          const frequency = wordFrequency[keyword] || 0
          const percentage = ((frequency / totalProducts) * 100).toFixed(1)

          if (productName.includes(keyword)) {
            relevanceScore += rarityWeight * 1.5 // 1.5x peso para nombre
          } else {
            relevanceScore += rarityWeight // Peso normal para descripción
          }

          matchedKeywords.push(keyword)
          semanticDetails.push(`${keyword}(${rarityWeight}pts, ${percentage}% freq)`)
        }
      }

      // Si hay coincidencias, agregar razones con detalles de rareza
      if (relevanceScore > 0) {
        reasons.push(`Similitud: ${matchedKeywords.join(', ')}`)
        reasons.push(`Rareza: ${semanticDetails.join(', ')}`)
      }

      // Solo considerar productos con relevancia mínima significativa
      if (relevanceScore >= 25) { // Umbral más estricto para similitud semántica
        relevantProducts.push({
          ...product,
          relevanceScore,
          reasons,
          matchedKeywords,
          semanticDetails
        })
      }
    }

    // Ordenar por relevancia (mayor score primero)
    relevantProducts.sort((a, b) => b.relevanceScore - a.relevanceScore)

    // 🔍 DEBUG: Mostrar detalles de similitud semántica
    if (relevantProducts.length > 0) {
      console.log(`🧠 SIMILITUD SEMÁNTICA encontrada: ${relevantProducts.length} productos`)
      relevantProducts.slice(0, 3).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.nombre} (Score: ${product.relevanceScore})`)
        console.log(`     Semántica: ${product.semanticDetails?.join(', ') || 'N/A'}`)
      })
    }

    return {
      filteredProducts: relevantProducts.slice(0, 3), // Top 3 más relevantes
      clientNeeds: { semanticMatch: true },
      totalRelevant: relevantProducts.length
    }
  }

  // 🔍 MÉTODO PARA EXTRAER INSIGHTS DE LA CONVERSACIÓN
  extractConversationInsights(recentHistory, customerName) {
    const insights = {
      customerInfo: [],
      mentionedProducts: [],
      preferences: []
    }

    recentHistory.forEach(entry => {
      if (entry.role === 'user') {
        const message = entry.message.toLowerCase()

        // Detectar información personal compartida
        if (message.includes('mi perro') || message.includes('mi perrito')) {
          const petMatch = message.match(/mi perr[oa] se llama (\w+)|mi perr[oa] (\w+)/i)
          if (petMatch) {
            const petName = petMatch[1] || petMatch[2]
            insights.customerInfo.push(`Tiene un perro llamado ${petName}`)
          }
        }

        if (message.includes('vivo en') || message.includes('soy de')) {
          const locationMatch = message.match(/vivo en (\w+)|soy de (\w+)/i)
          if (locationMatch) {
            const location = locationMatch[1] || locationMatch[2]
            insights.customerInfo.push(`Vive en ${location}`)
          }
        }

        // Detectar preferencias
        if (message.includes('me gusta') || message.includes('prefiero')) {
          insights.preferences.push(`Expresó: "${entry.message}"`)
        }

        if (message.includes('privacidad')) {
          insights.preferences.push('Busca productos para privacidad')
        }

        // Detectar menciones de productos (configuración flexible por tipo de negocio)
        // if (message.includes('producto_específico') || message.includes('categoria_específica')) {
        //   insights.mentionedProducts.push('Interesado en productos específicos')
        // }
      }
    })

    return insights
  }

  // 🧠 FUNCIÓN NUEVA: Generar descripción inteligente del negocio basada en inventario real
  async generateIntelligentBusinessDescription(inventoryService = null) {
    try {
      // Si no hay servicio de inventario disponible, usar descripción genérica
      if (!inventoryService) {
        console.log('⚠️ No hay servicio de inventario disponible, usando descripción genérica')
        return "Somos una tienda especializada que ofrece productos de calidad."
      }

      // Obtener productos del inventario real
      let inventory = []
      if (typeof inventoryService.getAllProducts === 'function') {
        inventory = await inventoryService.getAllProducts()
      } else {
        console.log('⚠️ inventoryService.getAllProducts no es una función, usando descripción genérica')
        return "Somos una tienda especializada que ofrece productos de calidad."
      }
      
      if (!inventory || inventory.length === 0) {
        return "Somos una tienda especializada que ofrece productos de calidad."
      }

      // Analizar categorías presentes en el inventario
      const categorias = [...new Set(inventory.map(p => p.categoria).filter(Boolean))]
      const productos = inventory.map(p => p.nombre.toLowerCase())
      
      // Detectar tipo de negocio basado en productos reales
      const esElectronica = productos.some(p => 
        p.includes('iphone') || p.includes('celular') || p.includes('smartphone') || 
        p.includes('tablet') || p.includes('laptop') || p.includes('android')
      )
      
      const esRopa = productos.some(p => 
        p.includes('camisa') || p.includes('pantalón') || p.includes('vestido') || 
        p.includes('zapatos') || p.includes('blusa')
      )
      
      const esComida = productos.some(p => 
        p.includes('ceviche') || p.includes('pollo') || p.includes('arroz') || 
        p.includes('bebida') || p.includes('gaseosa')
      )

      // Generar descripción basada en productos reales
      let descripcion = "Somos una tienda especializada en "
      
      if (esElectronica) {
        // 📱 DESCRIPCIÓN PRECISA: Solo mencionar lo que realmente tenemos
        const tieneIphones = productos.some(p => p.includes('iphone'))
        const tieneSamsung = productos.some(p => p.includes('samsung'))
        const tieneTablets = productos.some(p => p.includes('tablet') || p.includes('ipad'))
        const tieneLaptops = productos.some(p => p.includes('laptop') || p.includes('macbook'))
        
        descripcion += "tecnología y dispositivos móviles. Ofrecemos "
        
        // 🎯 SOLO MENCIONAR LO QUE EXISTE
        if (tieneIphones && tieneSamsung) {
          descripcion += "smartphones iPhone y Samsung"
        } else if (tieneIphones) {
          descripcion += "smartphones iPhone de diferentes modelos"
        } else if (tieneSamsung) {
          descripcion += "smartphones Samsung"
        } else {
          descripcion += "smartphones"
        }
        
        // Agregar tablets y laptops solo si existen
        if (tieneTablets) descripcion += ", tablets"
        if (tieneLaptops) descripcion += ", laptops"
        
        descripcion += " de alta calidad."
        
      } else if (esRopa) {
        descripcion += "moda y vestimenta. Contamos con una amplia variedad de prendas y accesorios para todas las ocasiones."
      } else if (esComida) {
        descripcion += "gastronomía y productos alimenticios. Preparamos comidas frescas y ofrecemos una variedad de productos culinarios."
      } else {
        // Descripción genérica basada en categorías
        if (categorias.length > 0) {
          descripcion += `${categorias.join(', ').toLowerCase()}. Manejamos productos de calidad en estas categorías especializadas.`
        } else {
          descripcion += "productos de calidad seleccionados especialmente para nuestros clientes."
        }
      }
      
      console.log(`🧠 DESCRIPCIÓN GENERADA: ${descripcion}`)
      return descripcion
      
    } catch (error) {
      console.error('Error generando descripción inteligente:', error)
      return "Somos una tienda especializada que ofrece productos de calidad."
    }
  }

  // 🎆 MÉTODO PÚBLICO: Generar descripción inteligente con inventario externo
  async generateBusinessDescriptionWithInventory(inventoryService) {
    return await this.generateIntelligentBusinessDescription(inventoryService)
  }

  // 🎭 MÉTODO PARA GENERAR PROMPT PERSONALIZADO SEGÚN PERFIL
  async getPersonalizedPrompt(basePrompt, businessProfile = null, inventoryService = null) {
    if (!businessProfile) {
      const profileKey = await this.db.getConfig('business_profile') || 'general'
      console.log(`🎭 PERFIL CARGADO DESDE DB: ${profileKey}`)
      businessProfile = this.getBusinessProfile(profileKey)
    }

    // 🧠 GENERAR DESCRIPCIÓN INTELIGENTE DEL NEGOCIO BASADA EN INVENTARIO REAL
    let businessDescription = "Somos una tienda especializada que ofrece productos de calidad."
    if (inventoryService) {
      try {
        businessDescription = await this.generateIntelligentBusinessDescription(inventoryService)
      } catch (error) {
        console.log('⚠️ Error generando descripción inteligente, usando genérica:', error.message)
      }
    }

    // 🆕 OBTENER CONFIGURACIÓN DE IDENTIDAD DEL REPRESENTANTE
    const useRepresentativeIdentity = await this.db.getConfig('use_representative_identity') === 'true'
    const representativeName = await this.db.getConfig('representative_name') || ''
    const representativeRole = await this.db.getConfig('representative_role') || ''

    console.log(`🎭 APLICANDO PERFIL: ${businessProfile.name} ${businessProfile.emoji}`)
    console.log(`🎭 VOCABULARIO: ${businessProfile.vocabulary.join(', ')}`)
    console.log(`🎭 TONO: ${businessProfile.tone}`)
    console.log(`🏪 DESCRIPCIÓN INTELIGENTE: ${businessDescription}`)

    // Si es perfil personalizado, obtener instrucciones personalizadas
    let customInstructions = ''
    if (businessProfile.name === 'Personalizado') {
      const customProfile = await this.db.getConfig('custom_business_profile')
      console.log(`🎭 PERFIL PERSONALIZADO RAW: ${customProfile}`)
      if (customProfile) {
        try {
          const parsed = JSON.parse(customProfile)

          // 🎯 SOBRESCRIBIR DATOS DEL PERFIL CON LOS PERSONALIZADOS
          if (parsed.name) businessProfile.name = parsed.name
          if (parsed.emoji) businessProfile.emoji = parsed.emoji
          if (parsed.greeting) businessProfile.greeting = parsed.greeting
          if (parsed.tone) businessProfile.tone = parsed.tone
          if (parsed.vocabulary) {
            // Procesar vocabulario personalizado
            if (typeof parsed.vocabulary === 'string') {
              businessProfile.vocabulary = parsed.vocabulary.split(',').map(word => word.trim())
            } else if (Array.isArray(parsed.vocabulary)) {
              businessProfile.vocabulary = parsed.vocabulary
            }
          }

          customInstructions = parsed.instructions || businessProfile.instructions
          console.log(`🎭 PERFIL PERSONALIZADO APLICADO:`)
          console.log(`   - Nombre: ${businessProfile.name}`)
          console.log(`   - Emoji: ${businessProfile.emoji}`)
          console.log(`   - Saludo: ${businessProfile.greeting}`)
          console.log(`   - Tono: ${businessProfile.tone}`)
          console.log(`   - Vocabulario: ${businessProfile.vocabulary.join(', ')}`)
          console.log(`   - Instrucciones: ${customInstructions}`)
        } catch (error) {
          console.error('🚨 Error parseando perfil personalizado:', error)
          customInstructions = businessProfile.instructions
        }
      }
    }

    const personalizedPrompt = `${basePrompt}

🎭 ¡TRANSFORMACIÓN OBLIGATORIA DE PERSONALIDAD!
ERES AHORA UN ${businessProfile.name.toUpperCase()} ${businessProfile.emoji} AUTÉNTICO DE PERÚ

🏪 INFORMACIÓN CRÍTICA SOBRE TU NEGOCIO:
${businessDescription}
⚠️ PROHIBIDO: NO inventes productos o servicios que no están en esta descripción basada en tu inventario real.

📝 INSTRUCCIONES IMPERATIVAS - DEBES CUMPLIR AL 100%:

1️⃣ PERSONALIDAD OBLIGATORIA:
   - Eres un ${businessProfile.name} peruano PROFESIONAL y apasionado por tu trabajo
   - NUNCA digas que eres un "agente" o "asistente"
   - Habla como un ${businessProfile.identity_type === 'professional' ? 'PROFESIONAL' : businessProfile.identity_type === 'specialist' ? 'ESPECIALISTA' : 'REPRESENTANTE'} del negocio, con orgullo, pasión y FORMALIDAD
   - Mantén SIEMPRE un nivel de comunicación profesional y educado
   ${useRepresentativeIdentity && representativeName ?
     `- Te llamas ${representativeName}${representativeRole ? ` y eres ${representativeRole}` : ''}` :
     '- NO inventes nombres propios ni te presentes con identidades específicas'}
   - SOLO menciona productos y servicios que REALMENTE tienes en el inventario

2️⃣ VOCABULARIO ESPECÍFICO - USA ESTAS PALABRAS CON ELEGANCIA:
   ${businessProfile.vocabulary && businessProfile.vocabulary.length > 0 ? businessProfile.vocabulary.map(word => `"${word}"`).join(', ') : 'vocabulario profesional'}
   - Usa 1-2 de estas palabras de forma NATURAL y PROFESIONAL
   - Integra el vocabulario específico sin sonar vulgar o de mercado

3️⃣ TONO DE VOZ OBLIGATORIO:
   - ${businessProfile.tone} pero SIEMPRE PROFESIONAL
   - Mantén este tono en TODA la conversación
   - NUNCA uses lenguaje de vendedor de mercado o barrio

4️⃣ FORMA DE DIRIGIRTE AL CLIENTE:
   - VARÍA tus saludos usando estas opciones naturales: ${businessProfile.greeting_variations ? businessProfile.greeting_variations.join(', ') : this.getRandomGreeting(businessProfile)}
   - NUNCA uses siempre el mismo saludo repetitivo como "Estimado cliente, entiendo que..."
   - Sé cálido, profesional y educado
   - NUNCA uses jerga o lenguaje informal excesivo

5️⃣ COMPORTAMIENTO ESPECÍFICO:
   ${customInstructions || businessProfile.instructions}

6️⃣ REGLA CRÍTICA DEL NOMBRE:
   - SIEMPRE pregunta el nombre si no lo conoces
   - Es obligatorio para personalizar el servicio

🎯 EJEMPLO DE CÓMO DEBES RESPONDER PROFESIONALMENTE:
Si eres cevicheria: "Estimado ${businessProfile.greeting}, en Marina Mora nos especializamos en mariscos fresquitos del día. Nuestras categorías incluyen..."
Si eres tecnología: "Estimado ${businessProfile.greeting}, en nuestra tienda ofrecemos tecnología de última generación. Nuestras categorías incluyen..."

⚠️ PROHIBIDO ABSOLUTO:
- NO uses lenguaje vulgar o de mercado de barrio
- NO inventes productos que no existen en el inventario
- NO seas demasiado informal o corriente
- NO hagas mensajes excesivamente largos
- NUNCA menciones productos específicos sin verificar el inventario

🎯 REGLAS DE COMUNICACIÓN PROFESIONAL:
- Mantén mensajes BREVES y CONCISOS (máximo 3-4 líneas)
- Usa un lenguaje EDUCADO y PROFESIONAL
- Menciona solo categorías REALES del inventario
- Sé específico del negocio pero ELEGANTE

RECUERDA: Eres un ${businessProfile.name} peruano PROFESIONAL y EDUCADO, NO un vendedor de mercado.`

    return personalizedPrompt
  }

  // Función para obtener modelo con fallback y rotación de API keys
  async getModel(modelName = PRIMARY_MODEL, apiKey = null) {
    try {
      // Si no se proporciona API key, obtener una del pool
      if (!apiKey) {
        apiKey = this.apiKeyManager.getNextApiKey()
      }

      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: this.generationConfig,
        safetySettings: this.safetySettings
      })

      return { model, apiKey }
    } catch (error) {
      console.warn(`Error obteniendo modelo ${modelName} con API key:`, error.message)

      // Marcar error en la API key
      if (apiKey) {
        this.apiKeyManager.markError(apiKey, error)
      }

      // Intentar con modelo fallback si es el modelo primario
      if (modelName === PRIMARY_MODEL) {
        console.log('Intentando con modelo fallback...')
        return this.getModel(FALLBACK_MODEL, apiKey)
      }

      throw error
    }
  }

  // Función para ejecutar con reintentos, timeout y rotación de API keys
  async executeWithRetry(operation, maxRetries = null) {
    // 🔧 NUEVO: Si no se especifica maxRetries, usar el número total de API keys
    if (maxRetries === null) {
      maxRetries = this.apiKeyManager.apiKeys.length
    }

    let lastError = null
    let currentApiKey = null
    let availableKeysAtStart = this.apiKeyManager.getAvailableKeysCount()

    console.log(`🔄 Iniciando executeWithRetry con ${maxRetries} intentos máximos (${availableKeysAtStart} APIs disponibles)`)

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Intento ${attempt}/${maxRetries}`)

        // Obtener nueva API key y modelo en cada intento
        const { model, apiKey } = await this.getModel()
        currentApiKey = apiKey
        console.log(`🔑 Usando API Key ${this.apiKeyManager.currentIndex + 1}/${this.apiKeyManager.apiKeys.length}`)

        // Ejecutar con timeout de 30 segundos
        const result = await Promise.race([
          operation(model, apiKey),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout: La operación tardó demasiado')), 30000)
          )
        ])

        // Marcar éxito en la API key
        this.apiKeyManager.markSuccess(currentApiKey)

        return result
      } catch (error) {
        lastError = error
        console.warn(`❌ Error en intento ${attempt}:`, error.message)

        // Marcar error en la API key actual
        if (currentApiKey) {
          this.apiKeyManager.markError(currentApiKey, error)
        }

        // 🔧 MEJORADO: Si es error de rate limit, cuota, API inválida o deshabilitada, intentar con otra API key
        if (
          error.message.includes('429') ||
          error.message.includes('quota') ||
          error.message.includes('overloaded') ||
          error.message.includes('RESOURCE_EXHAUSTED') ||
          error.message.includes('400') ||
          error.message.includes('API Key not found') ||
          error.message.includes('API_KEY_INVALID') ||
          error.message.includes('403') ||
          error.message.includes('Forbidden') ||
          error.message.includes('SERVICE_DISABLED')
        ) {
          if (attempt < maxRetries) {
            if (error.message.includes('429') || error.message.includes('quota')) {
              console.log(`🔑 Rate limit detectado, rotando a siguiente API key...`)
            } else if (error.message.includes('400') || error.message.includes('API Key not found') || error.message.includes('API_KEY_INVALID')) {
              console.log(`🔑 API Key inválida detectada, rotando a siguiente API key...`)
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
              console.log(`🔑 API Key deshabilitada detectada, rotando a siguiente API key...`)
            } else {
              console.log(`🔑 Error de servicio detectado, rotando a siguiente API key...`)
            }
            // No hacer delay, rotar inmediatamente a la siguiente API key
            continue
          }
        }

        // Para errores de timeout, reintentar con delay
        if (error.message.includes('Timeout') || error.message.includes('500') || error.message.includes('503')) {
          if (attempt < maxRetries) {
            const delay = 1000 * Math.pow(2, attempt - 1)
            console.log(`⏰ Esperando ${delay}ms antes del siguiente intento...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }

        // Para otros errores, no reintentar
        break
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    console.error(`🚨 Todos los ${maxRetries} intentos fallaron:`, lastError)

    // 🔧 ÚLTIMO RECURSO: Intentar resetear APIs con errores temporales
    const availableKeysBeforeReset = this.apiKeyManager.getAvailableKeysCount()
    if (availableKeysBeforeReset === 0) {
      console.log('🔄 Intentando resetear APIs con errores temporales como último recurso...')
      this.apiKeyManager.resetTemporaryErrors()
      const availableKeysAfterReset = this.apiKeyManager.getAvailableKeysCount()

      if (availableKeysAfterReset > 0) {
        console.log(`✅ ${availableKeysAfterReset} APIs reactivadas, intentando una vez más...`)
        // Intentar una vez más con las APIs reactivadas
        try {
          const { model, apiKey } = await this.getModel()
          const result = await Promise.race([
            operation(model, apiKey),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout: La operación tardó demasiado')), 30000)
            )
          ])
          this.apiKeyManager.markSuccess(apiKey)
          return result
        } catch (finalError) {
          console.error('❌ Último intento también falló:', finalError)
        }
      }
    }

    // Mostrar estadísticas de API keys para debugging
    const availableKeys = this.apiKeyManager.getAvailableKeysCount()
    console.log(`📊 APIs disponibles: ${availableKeys}/${this.apiKeyManager.apiKeys.length}`)
    console.log('📊 Estado actual de API keys:', this.getApiKeyStats())

    throw new Error(
      'Actualmente estamos recibiendo muchas consultas simultáneas al mismo tiempo lo que causa una sobrecarga. ' +
      'Agradezco nos pueda esperar, en un momento recibirá nuestra respuesta. 😊'
    )
  }

  // Obtener estadísticas de API keys
  getApiKeyStats() {
    return this.apiKeyManager.getStats()
  }

  async generateSalesResponse(message, customerName, inventory, conversationState = 'initial', recentHistory = [], inventoryService = null, conversationData = {}) {
    console.log(`🎭 INICIANDO generateSalesResponse para: ${customerName}`)
    const operation = async (model, apiKey) => {
      const inventoryText = inventory.map(product =>
        `- ${product.nombre}: S/ ${product.precio} (Stock: ${product.stock}) - ${product.descripcion}`
      ).join('\n')

      // 🧠 CONTEXTO CONVERSACIONAL MEJORADO Y ANÁLISIS DE SUFICIENCIA
      const resolvedRecentHistory = await Promise.resolve(recentHistory)
      const historyContext = resolvedRecentHistory.length > 0
        ? this.buildEnhancedConversationContext(resolvedRecentHistory, customerName)
        : ''

      // 🎯 ANÁLISIS DE SUFICIENCIA DE INFORMACIÓN
      const infoAnalysis = this.analyzeCustomerInformationSufficiency(resolvedRecentHistory, message)
      let recommendationContext = ''
      let filteredInventoryText = inventoryText

      // 🧠 DETECCIÓN INTELIGENTE: Verificar si cliente pregunta específicamente por otros productos
      const hasMemoryProducts = inventory.some(product => 
        product.nombre && product.nombre.includes('VIP') && 
        inventory.length <= 3 // Inventario pequeño sugiere productos específicos ya filtrados
      )
      
      // 🎯 DETECCIÓN DE CONFLICTOS: Cliente pregunta por producto específico diferente al VIP en memoria
      const clientSpecificProduct = this.extractSpecificProductFromMessage(message)
      const vipProductInMemory = hasMemoryProducts ? inventory.find(p => p.nombre && p.nombre.includes('VIP')) : null
      const hasProductConflict = clientSpecificProduct && vipProductInMemory && 
        !this.isProductSimilar(clientSpecificProduct, vipProductInMemory.nombre)
      
      if (hasMemoryProducts && !hasProductConflict) {
        console.log(`🧠 PRODUCTOS DE MEMORIA DETECTADOS - Manteniendo contexto VIP (sin conflicto)`)
        recommendationContext = `
🏆 PRODUCTOS DE MEMORIA DE SESIÓN DETECTADOS:
- El cliente ya vió/mencionó estos productos específicos anteriormente
- INSTRUCCIÓN CRÍTICA: Responde específicamente sobre ESTOS productos mostrados
- NO busques otros productos, concéntrate en estos que ya tiene en contexto
- Si son productos VIP, enfátiza los beneficios y precios especiales`
      } else if (hasProductConflict) {
        console.log(`🎯 CONFLICTO DETECTADO: Cliente pregunta por "${clientSpecificProduct}" pero memoria tiene "${vipProductInMemory.nombre}" - APLICANDO BÚSQUEDA SEMÁNTICA`)
        
        // 🔥 SOLUCIÓN INTELIGENTE: Usar inventario SIN productos VIP para búsqueda semántica limpia
        console.log(`🔄 CAMBIANDO CONTEXTO: De inventario VIP (${inventory.length} productos) a inventario completo sin restricciones VIP`)
        
        // 📦 Obtener inventario completo desde el servicio sin restricciones VIP
        let fullInventoryForSearch = inventory
        if (inventoryService && typeof inventoryService.getAllProducts === 'function') {
          try {
            fullInventoryForSearch = await inventoryService.getAllProducts({
              respectSpecificRequest: true,
              requestContext: message,
              forceFullInventory: true  // Nueva opción para forzar inventario completo
            })
            console.log(`📦 INVENTARIO COMPLETO OBTENIDO: ${fullInventoryForSearch.length} productos para búsqueda semántica`)
          } catch (error) {
            console.log(`⚠️ No se pudo obtener inventario completo, usando inventario actual: ${error.message}`)
          }
        }
        
        // 🔍 BÚSQUEDA SEMÁNTICA FORZADA para respetar consulta específica
        const productFilter = this.filterProductsBySpecifications(fullInventoryForSearch, resolvedRecentHistory, message)
        
        if (productFilter.filteredProducts.length > 0) {
          // 🎯 USAR PRODUCTOS ENCONTRADOS (sin VIP) para la respuesta
          filteredInventoryText = productFilter.filteredProducts.map(product =>
            `- ${product.nombre}: S/ ${product.precio} (Stock: ${product.stock}) - ${product.descripcion} [SOLICITADO: ${product.reasons.join(', ')}]`
          ).join('\n')
          
          console.log(`✅ PRODUCTOS ENCONTRADOS EN INVENTARIO COMPLETO: ${productFilter.filteredProducts.length} productos que coinciden con "${clientSpecificProduct}"`)
          
          recommendationContext = `
🎯 CONSULTA ESPECÍFICA RESPETADA:
- Cliente preguntó específicamente por: ${clientSpecificProduct}
- PRODUCTOS ENCONTRADOS: ${productFilter.filteredProducts.length} productos que coinciden con su solicitud
- INSTRUCCIÓN CRÍTICA: RESPONDER SOBRE LOS PRODUCTOS SOLICITADOS, NO sobre productos VIP de memoria
- Mostrar los productos marcados como [SOLICITADO] que coinciden con "${clientSpecificProduct}"
- Explicar características, beneficios y precio de los productos encontrados
- Si no hay el producto exacto, ofrecer alternativas similares del inventario`
        } else {
          // 😔 No se encontraron productos específicos, informar al cliente
          console.log(`😔 NO SE ENCONTRARON PRODUCTOS: No hay "${clientSpecificProduct}" en inventario completo (${fullInventoryForSearch.length} productos revisados)`)
          
          recommendationContext = `
😔 PRODUCTO ESPECÍFICO NO DISPONIBLE:
- Cliente busca: ${clientSpecificProduct}
- RESULTADO: No disponible actualmente en nuestro inventario
- INSTRUCCIÓN CRÍTICA: Informar honestamente que "${clientSpecificProduct}" no está disponible
- OFRECER: Productos similares del inventario disponible
- SUGERIR: Notificar cuando llegue stock de "${clientSpecificProduct}"
- NO forzar productos VIP que no coinciden con la solicitud`
        }
      } else if (infoAnalysis.hasSufficientInfo) {
        // 🎯 FILTRAR PRODUCTOS INTELIGENTEMENTE (solo si no hay productos de memoria)
        const productFilter = this.filterProductsBySpecifications(inventory, resolvedRecentHistory, message)

        if (productFilter.filteredProducts.length > 0) {
          // Usar productos filtrados para la recomendación
          filteredInventoryText = productFilter.filteredProducts.map(product =>
            `- ${product.nombre}: S/ ${product.precio} (Stock: ${product.stock}) - ${product.descripcion} [RECOMENDADO: ${product.reasons.join(', ')}]`
          ).join('\n')

          recommendationContext = `
🎯 INFORMACIÓN SUFICIENTE DETECTADA:
- El cliente ya proporcionó: ${infoAnalysis.requirements.join(', ')}
- PRODUCTOS FILTRADOS: Se encontraron ${productFilter.filteredProducts.length} productos específicamente relevantes
- INSTRUCCIÓN CRÍTICA: RECOMIENDA ESPECÍFICAMENTE estos productos filtrados que aparecen como [RECOMENDADO].
- Usa frases como "Te recomiendo...", "Para tu caso específico...", "Basándome en lo que me comentas..."
- Explica POR QUÉ cada producto es ideal para su situación específica.
- NO hagas más preguntas, da recomendaciones directas.`
        } else {
          recommendationContext = `
🎯 INFORMACIÓN SUFICIENTE DETECTADA:
- El cliente ya proporcionó: ${infoAnalysis.requirements.join(', ')}
- INSTRUCCIÓN CRÍTICA: NO hagas más preguntas. RECOMIENDA productos específicos del inventario que cumplan con sus requisitos.
- Usa frases como "Te recomiendo...", "Para tu caso específico...", "Basándome en lo que me comentas..."
- Sé específico sobre qué productos del inventario son ideales para su situación.`
        }
      }

      // Obtener el nombre del negocio desde la configuración
      let businessName = 'nuestra tienda'
      if (this.db) {
        try {
          const configuredBusinessName = await this.db.getConfig('business_name')
          if (configuredBusinessName && configuredBusinessName.trim() !== '') {
            businessName = configuredBusinessName
          }
        } catch (error) {
          console.log('⚠️ No se pudo obtener business_name, usando valor por defecto')
        }
      }

      // 🎯 COORDINACIÓN JERÁRQUICA: Verificar memoria inventario activa ANTES de generar prompt
      let hierarchicalRestriction = ''
      let finalInventoryText = filteredInventoryText
      
      // 🔍 DETECTAR MEMORIA INVENTARIO ESPECÍFICA (patrones VIP, productos limitados)
      const hasSpecificMemoryProducts = inventory.length <= 5 && inventory.some(product => 
        product.nombre && (
          product.nombre.includes('VIP') || 
          product.nombre.includes('Especial') ||
          product.nombre.includes('Exclusivo')
        )
      )
      
      if (hasSpecificMemoryProducts) {
        console.log(`🎯 JERARQUÍA DETECTADA: ${inventory.length} productos específicos en memoria`)
        const specificProducts = inventory.map(p => p.nombre || p.name).filter(Boolean)
        
        // 🔥 CORRECCIÓN CRÍTICA: Respetar contexto actual del cliente VIP para coherencia
        let contextualPriorityProduct = specificProducts[0] // Fallback por defecto
        
        // 🧠 DETECTAR PRODUCTO EN CONTEXTO ACTUAL DEL CLIENTE
        if (conversationData && conversationData.displayed_products && conversationData.displayed_products.length > 0) {
          const lastDisplayedProduct = conversationData.displayed_products[conversationData.displayed_products.length - 1]
          if (lastDisplayedProduct && lastDisplayedProduct.name) {
            // Verificar si el producto mostrado está en la memoria específica
            const isInMemory = specificProducts.some(sp => sp.includes(lastDisplayedProduct.name) || lastDisplayedProduct.name.includes(sp))
            if (isInMemory) {
              contextualPriorityProduct = lastDisplayedProduct.name
              console.log(`🎯 SALES RESPONSE - CONTEXTO VIP RESPETADO: Usando producto actual del cliente: ${contextualPriorityProduct}`)
            }
          }
        }
        
        // 🧠 VERIFICAR TAMBIÉN EN selected_products o interested_products
        if (conversationData && conversationData.selected_products && conversationData.selected_products.length > 0) {
          const selectedProduct = conversationData.selected_products[0]
          if (selectedProduct && (selectedProduct.name || selectedProduct.nombre)) {
            const selectedProductName = selectedProduct.name || selectedProduct.nombre
            const isInMemory = specificProducts.some(sp => sp.includes(selectedProductName) || selectedProductName.includes(sp))
            if (isInMemory) {
              contextualPriorityProduct = selectedProductName
              console.log(`🎯 SALES RESPONSE - CONTEXTO VIP RESPETADO: Usando producto seleccionado del cliente: ${contextualPriorityProduct}`)
            }
          }
        }
        
        hierarchicalRestriction = `

🚨 RESTRICCIÓN JERÁRQUICA CRÍTICA DE MEMORIA CONTEXTUAL:
- ÚNICAMENTE puedes mencionar estos productos específicos: ${specificProducts.join(', ')}
- PRODUCTO ACTUAL EN CONTEXTO: ${contextualPriorityProduct}
- Si el cliente dice "ese celular" o "ese producto" se refiere ESPECÍFICAMENTE a: ${contextualPriorityProduct}
- NO menciones productos que no estén en esta lista específica
- Mantén coherencia absoluta con el contexto de memoria inventario activa
- Si el cliente pregunta por otros productos, explica que te enfocarás en los que ya están en contexto
- RESPETO AL CONTEXTO VIP: Si hay un producto en contexto actual, priorizarlo sobre otros de la memoria`
        
        // 🎯 ASEGURAR que el inventario final sea SOLO los productos específicos
        finalInventoryText = inventory.map(product =>
          `- ${product.nombre}: S/ ${product.precio} (Stock: ${product.stock}) - ${product.descripcion} [MEMORIA ACTIVA]`
        ).join('\n')
        
        console.log(`🔒 INVENTARIO RESTRINGIDO POR JERARQUÍA:`, specificProducts)
        console.log(`🎯 PRODUCTO CONTEXTUAL PRIORIZADO EN SALES: ${contextualPriorityProduct}`)
      }

      // 🎭 GENERAR PROMPT PERSONALIZADO SEGÚN PERFIL DE NEGOCIO
      const basePrompt = `
Eres un agente de ventas inteligente para ${businessName} en Perú. Tu trabajo es ayudar a los clientes de manera natural y profesional.

INFORMACIÓN DEL NEGOCIO:
- Nombre del negocio: ${businessName}
- Siempre menciona el nombre del negocio cuando sea apropiado en la conversación

🎯 INSTRUCCIONES PARA RESPUESTAS NATURALES:
- Solo aceptamos pagos por YAPE (no tarjetas de crédito)
- Sé PROFESIONAL y EDUCADO, pero NATURAL y CONVERSACIONAL
- Usa emojis apropiados para hacer la conversación más amigable
- NO crees pedidos automáticamente por respuestas vagas como "Si", "Ok", "Bien"
- NUNCA inventes productos que no están en el inventario
- Mantén respuestas BREVES y CONCISAS (máximo 3-4 líneas)

🧠 CLAVE PARA NATURALIDAD:
- EVITA frases repetitivas como "¡Hola estimado cliente!" al inicio
- VARÍA tus saludos y formas de dirigirte al cliente
- USA la información del contexto conversacional para crear continuidad
- HAZ referencia a información previa cuando sea relevante
- RESPONDE como si realmente recordaras la conversación anterior

INVENTARIO ACTUAL:
${finalInventoryText}

ESTADO ACTUAL DE CONVERSACIÓN: ${conversationState}
${historyContext}
${recommendationContext}${hierarchicalRestriction}

🔍 INSTRUCCIONES ESPECÍFICAS SEGÚN TIPO DE CONSULTA:

📚 SI EL CLIENTE BUSCA INFORMACIÓN (no quiere comprar aún):
- Responde informativamente sobre características, beneficios y utilidad
- Explica para qué sirve el producto y sus ventajas
- NO preguntes cantidad ni asumas que quiere comprar
- Mantén un tono educativo y profesional
- Al final, pregunta si necesita más información o si le interesa adquirirlo

🛒 SI EL CLIENTE QUIERE COMPRAR:
- Pregunta cantidad y confirma detalles
- Procede con el proceso de venta normal
- Muestra entusiasmo por la compra

📋 OTRAS SITUACIONES:
1. Si es la primera interacción (initial), saluda y muestra productos disponibles
2. Si el cliente muestra interés general, pregunta qué producto específico le interesa
3. SOLO procesa pedidos cuando el cliente confirme explícitamente con frases como "confirmo", "sí, quiero comprarlo", "procede con el pedido"
4. Para respuestas vagas como "si", "ok", "bien" - pide más especificación
5. Si no hay stock, ofrece alternativas similares
6. Mantén el contexto de la conversación anterior

📈 INSTRUCCIONES CRÍTICAS POR ESTADO:

🗺 SI EL ESTADO ES "specifying" (cliente especificando cantidad):
  - SOLO pregunta cantidad de forma simple y directa
  - NO menciones información sobre pagos, comprobantes o capturas
  - Ejemplo: "¿Cuántas unidades te gustaría?" o "¿Qué cantidad necesitas?"
  - Mantén el foco EXCLUSIVAMENTE en la cantidad

💳 SI EL ESTADO ES "payment" (cliente realizando pago):
  - AQUÍ SÍ puedes mencionar información sobre comprobantes
  - Solicita captura de pantalla del pago por Yape
  - Proporciona detalles de pago

📋 SI EL ESTADO ES "confirming" (confirmando pedido):
  - Muestra resumen del pedido con precios
  - Pregunta confirmación antes de proceder
  - NO menciones aún información de pago

CLIENTE: ${customerName || 'Cliente'}
MENSAJE ACTUAL: ${message}

🎭 INSTRUCCIONES ESPECÍFICAS PARA ESTA RESPUESTA:
1. ANALIZA el contexto conversacional arriba para entender qué información ya conoces del cliente
2. USA esa información para crear una respuesta que demuestre continuidad conversacional
3. EVITA saludos genéricos si ya están en medio de una conversación
4. SÉ ESPECÍFICO y relevante al mensaje actual del cliente
5. MANTÉN el tono profesional pero natural y conversacional
6. Si hay información previa del cliente, haz referencia a ella de manera natural

Responde de manera natural, útil y contextual:`

      // Aplicar personalización según perfil de negocio
      console.log(`🎭 LLAMANDO getPersonalizedPrompt...`)
      const prompt = await this.getPersonalizedPrompt(basePrompt, null, inventoryService)
      console.log(`🎭 PROMPT PERSONALIZADO GENERADO (primeros 200 chars): ${prompt.substring(0, 200)}...`)

      try {
        const result = await model.generateContent(prompt)
        const response = await result.response
        return response.text()
      } catch (error) {
        // Agregar información de API key al error para el sistema de reintentos
        error.apiKey = apiKey
        throw error
      }
    }

    try {
      return await this.executeWithRetry(operation)
    } catch (error) {
      console.error('Error generando respuesta con Gemini:', error)
      return 'Actualmente estamos recibiendo muchas consultas simultáneas al mismo tiempo lo que causa una sobrecarga. Agradezco nos pueda esperar, en un momento recibirá nuestra respuesta. 😊'
    }
  }

  // Nuevo método para detectar intención del cliente
  async detectCustomerIntent(message, inventory, conversationState = 'initial', conversationData = {}) {
    const operation = async (model, apiKey) => {
      // 🎯 COORDINACIÓN JERÁRQUICA: Aplicar restricción de memoria antes de procesar
      let hierarchicalInventory = inventory
      let hierarchicalContext = ''
      
      // 🔍 DETECTAR MEMORIA INVENTARIO ESPECÍFICA (mismo patrón que generateSalesResponse)
      const hasSpecificMemoryProducts = inventory.length <= 5 && inventory.some(product => 
        product.nombre && (
          product.nombre.includes('VIP') || 
          product.nombre.includes('Especial') ||
          product.nombre.includes('Exclusivo')
        )
      )
      
      if (hasSpecificMemoryProducts) {
        console.log(`🎯 DETECTAR INTENCIÓN - JERARQUÍA APLICADA: ${inventory.length} productos específicos en memoria`)
        const specificProducts = inventory.map(p => p.nombre || p.name).filter(Boolean)
        
        // 🔥 CORRECCIÓN CRÍTICA: Respetar contexto actual del cliente VIP
        let contextualPriorityProduct = specificProducts[0] // Fallback por defecto
        
        // 🧠 DETECTAR PRODUCTO EN CONTEXTO ACTUAL DEL CLIENTE
        if (conversationData.displayed_products && conversationData.displayed_products.length > 0) {
          const lastDisplayedProduct = conversationData.displayed_products[conversationData.displayed_products.length - 1]
          if (lastDisplayedProduct && lastDisplayedProduct.name) {
            // Verificar si el producto mostrado está en la memoria específica
            const isInMemory = specificProducts.some(sp => sp.includes(lastDisplayedProduct.name) || lastDisplayedProduct.name.includes(sp))
            if (isInMemory) {
              contextualPriorityProduct = lastDisplayedProduct.name
              console.log(`🎯 CONTEXTO VIP RESPETADO: Usando producto actual del cliente: ${contextualPriorityProduct}`)
            }
          }
        }
        
        // 🧠 VERIFICAR TAMBIÉN EN selected_products o interested_products
        if (conversationData.selected_products && conversationData.selected_products.length > 0) {
          const selectedProduct = conversationData.selected_products[0]
          if (selectedProduct && (selectedProduct.name || selectedProduct.nombre)) {
            const selectedProductName = selectedProduct.name || selectedProduct.nombre
            const isInMemory = specificProducts.some(sp => sp.includes(selectedProductName) || selectedProductName.includes(sp))
            if (isInMemory) {
              contextualPriorityProduct = selectedProductName
              console.log(`🎯 CONTEXTO VIP RESPETADO: Usando producto seleccionado del cliente: ${contextualPriorityProduct}`)
            }
          }
        }
        
        hierarchicalContext = `

🚨 MEMORIA INVENTARIO ACTIVA - RESTRICCIÓN JERÁRQUICA CONTEXTUAL:
- CONTEXTO DE MEMORIA: El cliente está interactuando con estos productos específicos: ${specificProducts.join(', ')}
- PRODUCTO ACTUAL EN CONTEXTO: ${contextualPriorityProduct}
- Si el mensaje es solo un número, se refiere a CANTIDAD para: ${contextualPriorityProduct}
- NO buscar productos por ID, usar SIEMPRE los productos de memoria activa
- Mantener coherencia absoluta con el contexto conversacional establecido

🎯 JERARQUÍA DE PRIORIDADES CONTEXTUAL CORREGIDA:
1. PRIORIDAD MÁXIMA: Producto específicamente mencionado por el cliente O en contexto actual (${contextualPriorityProduct})
2. PRIORIDAD ALTA: Otros productos de la memoria activa
3. PRIORIDAD MEDIA: Productos similares en la misma categoría
4. PRIORIDAD BAJA: Productos mostrados previamente (menor prioridad)
5. PRIORIDAD MÍNIMA: Inventario general (solo si no hay contexto)

🚨 RESPETO AL CONTEXTO VIP: Cuando el cliente VIP tiene un producto en contexto, NUNCA cambiar arbitrariamente a otro producto VIP`
        
        console.log(`🔒 INVENTARIO RESTRICTO PARA DETECCIÓN:`, specificProducts)
        console.log(`🎯 PRODUCTO CONTEXTUAL PRIORIZADO: ${contextualPriorityProduct}`)
      }
      
      const inventoryText = hierarchicalInventory.map(product =>
        `ID: ${product.id} - ${product.nombre}: S/ ${product.precio}`
      ).join('\n')

      // 🎯 ANÁLISIS DE SUFICIENCIA DE INFORMACIÓN PARA RECOMENDACIONES
      const recentHistory = conversationData.recentHistory || []
      const resolvedRecentHistory = await Promise.resolve(recentHistory)
      const infoAnalysis = this.analyzeCustomerInformationSufficiency(resolvedRecentHistory, message)
      let intelligentRecommendationContext = ''

      if (infoAnalysis.hasSufficientInfo) {
        intelligentRecommendationContext = `
🎯 INFORMACIÓN SUFICIENTE DETECTADA:
- El cliente ya proporcionó: ${infoAnalysis.requirements.join(', ')}
- INSTRUCCIÓN CRÍTICA: Si el cliente busca consejo/recomendación, usar suggested_response_type: "recommend_specific_products"
- El cliente tiene suficiente contexto para recibir recomendaciones específicas, NO preguntas genéricas.`
      }

      // Construir contexto de conversación
      let contextInfo = ''

      // Información sobre pedido completado recientemente
      if (conversationData.last_completed_order) {
        contextInfo += `
PEDIDO RECIÉN COMPLETADO:
- ID: ${conversationData.last_completed_order}
- Completado: ${conversationData.order_completed_at ? new Date(conversationData.order_completed_at).toLocaleString() : 'Recientemente'}
- NOTA: Este pedido YA ESTÁ COMPLETADO. Cualquier nueva solicitud es un PEDIDO NUEVO.`
      }

      if (conversationData.pending_order) {
        const { products, quantity } = conversationData.pending_order
        contextInfo += `
PEDIDO PENDIENTE:
- Productos: ${products.map(p => p.name).join(', ')}
- Cantidad: ${quantity}
- Estado: Esperando confirmación`
      } else if (conversationData.selected_products) {
        contextInfo += `
PRODUCTOS SELECCIONADOS ACTUALMENTE: ${conversationData.selected_products.map(p => p.name).join(', ')}
CANTIDAD ESPECIFICADA: ${conversationData.quantity || 'No especificada'}
IMPORTANTE: El cliente ya seleccionó estos productos. Si menciona cantidad sin especificar producto, se refiere a los productos seleccionados.

🔢 ESTADO ESPECIAL SPECIFYING: Si el estado actual es "specifying" significa que el cliente está en proceso de especificar cantidad para los productos seleccionados. Cualquier número que envíe debe interpretarse como CANTIDAD para estos productos.`
      } else if (conversationData.interested_products) {
        contextInfo += `
PRODUCTOS DE INTERÉS: ${conversationData.interested_products.map(p => p.name).join(', ')}
IMPORTANTE: Si el cliente menciona cantidad sin especificar producto, se refiere a estos productos de interés.`

        // Agregar información de cantidad si está disponible
        if (conversationData.quantity) {
          contextInfo += `
CANTIDAD ESPECIFICADA: ${conversationData.quantity}`
        }
      }

      // 🧠 CONTEXTO DE MEMORIA DE SESIÓN (CRÍTICO PARA REFERENCIAS CONTEXTUALES)
      if (conversationData.displayed_products && conversationData.displayed_products.length > 0) {
        contextInfo += `

🧠 PRODUCTOS MOSTRADOS RECIENTEMENTE (MEMORIA DE SESIÓN):
${conversationData.displayed_products.map(p => `- ${p.name} (${p.isVip ? 'VIP' : 'Normal'}) - S/ ${p.price}`).join('\n')}

⚠️ REFERENCIAS CONTEXTUALES CRÍTICAS:
Si el cliente usa palabras como "me interesa", "lo quiero", "ese", "esa", "eso", "ese equipo", "esa oferta", "quiero comprarlo", "me gusta" SIN especificar producto → SE REFIERE AL ÚLTIMO PRODUCTO MOSTRADO ARRIBA.
PRODUCTO DE REFERENCIA CONTEXTUAL: ${conversationData.displayed_products[conversationData.displayed_products.length - 1].name}`
      }

      // 🎯 CONTEXTO VIP ESPECÍFICO
      if (conversationData.vip_product_context === true) {
        contextInfo += `

👑 CONTEXTO VIP ACTIVO:
- Cliente VIP con productos especiales mostrados
- Referencias implícitas ("me interesa", "lo quiero") se refieren al producto VIP mostrado
- Priorizar interpretación de confirmaciones de compra VIP`
      }

      const prompt = `
Analiza este mensaje del cliente y determina su intención específica Y su estado emocional.

INVENTARIO DISPONIBLE:
${inventoryText}

ESTADO ACTUAL: ${conversationState}
${contextInfo}
${intelligentRecommendationContext}${hierarchicalContext}
MENSAJE DEL CLIENTE: ${message}

⚠️ VALIDACIÓN CRÍTICA: Si hay "PEDIDO RECIÉN COMPLETADO" en el contexto arriba Y el mensaje es de agradecimiento/conformidad, usar SIEMPRE "farewell", NO "process_order".

ANÁLISIS EMOCIONAL:
Detecta el estado emocional del cliente basado en el tono y palabras utilizadas:
- neutral: tono normal, sin emociones fuertes
- frustrated: molesto, enojado, irritado ("esto no funciona", "estoy molesto", "qué mal servicio", "no sirve")
- sad: triste, desanimado ("estoy triste", "tengo problemas", "me siento mal")
- confused: perdido, no entiende ("no entiendo", "estoy perdido", "no sé qué hacer", "ayuda")
- excited: emocionado, entusiasmado ("genial", "perfecto", "me encanta", "excelente")
- grateful: agradecido ("muchas gracias", "excelente servicio", "muy amable")
- seeking_advice: busca consejo ("qué me recomiendas", "cuál es mejor", "ayúdame a elegir")

Responde SOLO con un JSON en este formato:
{
  "intent": "greeting|browsing|interested|specifying|confirming|payment|unclear|emotional_support",
  "confidence": "high|medium|low",
  "products_mentioned": [{"id": 1, "name": "producto mencionado"}],
  "quantity_mentioned": 0,
  "is_explicit_confirmation": false,
  "requires_clarification": true/false,
  "suggested_response_type": "show_products|ask_specification|ask_quantity|ask_confirmation|process_order|farewell|emotional_response|recommend_specific_products|admin_command",
  "emotional_state": "neutral|frustrated|sad|confused|excited|grateful|seeking_advice",
  "emotional_confidence": "high|medium|low",
  "needs_emotional_response": true/false,
  "emotional_keywords": ["palabras", "que", "indican", "emoción"],
  "reasoning": "explicación breve de por qué se clasificó así incluyendo análisis emocional"
}

REGLAS IMPORTANTES:
- 🧠 PRIORIDAD MÁXIMA - MEMORIA DE SESIÓN: Si hay "PRODUCTOS MOSTRADOS RECIENTEMENTE" arriba Y el cliente usa referencias implícitas ("me interesa", "lo quiero", "ese", "esa", "eso", "ese equipo", "quiero comprarlo", "me gusta") → products_mentioned DEBE incluir el "PRODUCTO DE REFERENCIA CONTEXTUAL" especificado arriba, NO buscar en inventario
- 👑 PRIORIDAD MÁXIMA - CONTEXTO VIP: Si hay "CONTEXTO VIP ACTIVO" Y el mensaje es confirmación implícita → intent: "confirming", confidence: "high", usar productos de memoria de sesión
- 🏁 PRIORIDAD MÁXIMA - SALUDOS SIMPLES: "Hola", "Hi", "Buenos días", "Buenas tardes", "Buenas noches", "Hey" = intent: "greeting", suggested_response_type: "show_products" (SIEMPRE tiene prioridad absoluta)
- 🛒 PRIORIDAD MÁXIMA - INTENCIONES DE COMPRA EXPLÍCITAS: "Quiero comprar", "Voy a comprar", "Me interesa comprar", "Deseo adquirir", "Necesito comprar" + producto específico = intent: "specifying", suggested_response_type: "ask_quantity" (SIEMPRE tiene prioridad sobre "interested")
- 🔐 COMANDOS ADMINISTRATIVOS: Si el mensaje contiene comandos como "crear producto", "nuevo producto", "agregar producto", "actualizar stock", "cambiar precio", "modificar producto", "ventas hoy", "estadísticas", "reporte ventas", "inventario bajo", "productos agotados", "gestionar inventario" = suggested_response_type: "admin_command"
- 🎯 RECOMENDACIONES INTELIGENTES: Si hay "INFORMACIÓN SUFICIENTE DETECTADA" arriba Y el cliente busca consejo/recomendación ("qué me recomiendas", "recomendarías", "cuál es mejor", "ayúdame a elegir") = suggested_response_type: "recommend_specific_products"
- ⚠️ PREGUNTAS CONDICIONALES CRÍTICAS: "Si quiero comprarlo", "Si lo compro", "Si me interesa", "Si quisiera" = intent: "seeking_advice", is_explicit_confirmation: false, suggested_response_type: "ask_specification" (SON PREGUNTAS, NO CONFIRMACIONES)
- Si hay PEDIDO PENDIENTE y el mensaje es "Si", "Sí", "Si confirmo", "Confirmo", "Ok", "Acepto" = is_explicit_confirmation: true, suggested_response_type: "process_order"
- Sin pedido pendiente: "Si", "Ok", "Bien" solos = intent: "unclear", requires_clarification: true
- 🏁 PRIORIDAD MÁXIMA - SALUDOS SIMPLES: "Hola", "Hi", "Buenos días", "Buenas tardes", "Buenas noches", "Hey" = intent: "greeting", suggested_response_type: "show_products" (SIEMPRE tiene prioridad absoluta)
- 🔢 ULTRA PRIORIDAD - SOLO NÚMEROS: Si el mensaje es ÚNICAMENTE un número ("1", "2", "3", "10", etc.) SIN texto adicional = intent: "confirming", suggested_response_type: "ask_confirmation", is_explicit_confirmation: true, quantity_mentioned: [número], hasContextualReference: true, confidence: "high" (DETECTAR SIEMPRE como cantidad, NO como ID)
- 🔢 PRIORIDAD MÁXIMA - RESPUESTAS NUMÉRICAS EN CONTEXTO DE PRODUCTOS: Si el estado es "interested" O "specifying" O "browsing" Y el mensaje es solo un número (1, 2, 3, etc.) Y hay productos en el contexto (interested_products, selected_products o displayed_products) Y el último mensaje del agente contenía una pregunta sobre cantidad ("cuántas", "cantidad", "unidades") = intent: "confirming", suggested_response_type: "ask_confirmation", is_explicit_confirmation: true, quantity_mentioned: [el número mencionado], products_mentioned: [usar SIEMPRE los productos del contexto, NO buscar por ID]
- 🔢 REGLA ESPECIAL ESTADO SPECIFYING: Si el estado es "specifying" Y el mensaje es solo un número Y hay productos seleccionados (selected_products) = intent: "confirming", suggested_response_type: "ask_confirmation", is_explicit_confirmation: true, quantity_mentioned: [número], products_mentioned: [productos seleccionados del contexto]
- 🔢 REGLA CRÍTICA ESTADO BROWSING + CONTEXTO CANTIDAD: Si el estado es "browsing" Y el mensaje es solo un número (1-99) Y hay productos VIP o normales mostrados recientemente Y el historial contiene preguntas sobre cantidad ("¿cuántas unidades", "cantidad", "unidades") = intent: "confirming", suggested_response_type: "ask_confirmation", is_explicit_confirmation: true, quantity_mentioned: [número], products_mentioned: [usar productos mostrados recientemente]
- PEDIDO RECIÉN COMPLETADO: Si hay un pedido recién completado y el mensaje es agradecimiento ("gracias", "ok gracias", "perfecto", "excelente", "bien gracias", "está bien", "esta bien", "ok", "vale", "genial", "muy bien", "todo bien", "listo", "entendido", "de acuerdo", "correcto", "bueno", "bien", "👍", "👌", "✅") = intent: "confirming", suggested_response_type: "farewell", is_explicit_confirmation: false, requires_clarification: false
- CONTEXTO CRÍTICO: Si el estado es "browsing" Y hay un pedido recién completado Y el mensaje es de agradecimiento/conformidad = SIEMPRE usar "farewell", NO "process_order"
- REGLA ABSOLUTA: Si hay "PEDIDO RECIÉN COMPLETADO" en el contexto Y el mensaje no menciona productos específicos Y NO es una respuesta numérica en contexto de productos = NUNCA usar "process_order", usar "farewell" para agradecimientos
- ESTADO COMPLETED: Si el estado es "completed" y el mensaje es un saludo ("hola", "buenos días", "buenas tardes", etc.) = intent: "greeting", suggested_response_type: "show_products"
- Solo is_explicit_confirmation: true para confirmaciones explícitas o cuando hay contexto de pedido pendiente
- products_mentioned solo si se menciona un producto específico del inventario
- quantity_mentioned solo si se especifica un número claro
- Si hay productos seleccionados o de interés en el contexto, considéralos en el análisis
- Para preguntas como "Qué hay de X producto?" o "Información sobre X" = suggested_response_type: "ask_specification" (NO "show_products")
- "show_products" solo para saludos iniciales o cuando no se menciona producto específico
- ESTADO INTERESTED: Si hay productos de interés Y se especifica cantidad, usar suggested_response_type: "ask_quantity"
- ESTADO INTERESTED: Si se menciona producto específico del inventario, usar suggested_response_type: "ask_quantity"
- PEDIDOS COMPLETADOS: Si hay un pedido recién completado y el cliente menciona un producto diferente o nueva cantidad, es un PEDIDO NUEVO
- NUEVA CONVERSACIÓN: Después de un pedido completado, cualquier solicitud de producto es independiente del pedido anterior
- CONTEXTO SEPARADO: No confundir pedidos completados con pedidos pendientes - son conversaciones separadas
- PRODUCTOS SELECCIONADOS: Si hay productos seleccionados y el cliente solo menciona cantidad (ej: "Quiero 1", "1", "dos"), usar esos productos seleccionados en products_mentioned
- PRODUCTOS DE INTERÉS: Si hay productos de interés y el cliente solo menciona cantidad (ej: "Quiero 1", "1", "dos"), usar esos productos de interés en products_mentioned
- CONTEXTO DE CANTIDAD: Si el mensaje es solo cantidad ("Quiero 1", "1", "dos") Y hay productos en el contexto (seleccionados o de interés), usar confidence: "high" y suggested_response_type: "ask_confirmation"
- PRIORIDAD DE CONTEXTO: Productos seleccionados > Productos de interés > Pedidos completados (no usar para nuevas solicitudes)
- ⚠️ REGLA CRÍTICA - NO CONFUNDIR NÚMEROS CON IDs: Si el mensaje es solo un número (ej: "1", "2", "3") Y hay productos en el contexto (interested_products, selected_products o displayed_products), el número es CANTIDAD, NO un ID de producto. SIEMPRE usar los productos del contexto en products_mentioned, NUNCA buscar productos por ID que contenga ese número.
- 🤔 PREGUNTAS CONTEXTUALES SOBRE PRODUCTOS: Si hay productos en el contexto Y el mensaje contiene preguntas como "crees que", "pueda usar", "sirve para", "es bueno para", "funciona para", "mi abuelo", "mi abuela", "una persona mayor", "niños", "principiantes" = intent: "seeking_advice", hasContextualReference: true, isFunctionalityQuestion: true, suggested_response_type: "ask_specification", confidence: "high"
- 🔢 DETECCIÓN NUMÉRICA MEJORADA: Los mensajes que consistan únicamente en números del 1-99 ("1", "2", "10", "25", etc.) deben ser interpretados como cantidades cuando hay productos en el contexto. Usar confidence: "high" para estas respuestas.`

      try {
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        } else {
          return {
            intent: 'unclear',
            confidence: 'low',
            products_mentioned: [],
            quantity_mentioned: 0,
            is_explicit_confirmation: false,
            requires_clarification: true,
            suggested_response_type: 'ask_specification',
            emotional_state: 'neutral',
            emotional_confidence: 'low',
            needs_emotional_response: false,
            emotional_keywords: [],
            reasoning: 'No se pudo parsear la respuesta'
          }
        }
      } catch (error) {
        // Agregar información de API key al error
        error.apiKey = apiKey
        throw error
      }
    }

    try {
      return await this.executeWithRetry(operation)
    } catch (error) {
      console.error('Error detectando intención:', error)
      return {
        intent: 'unclear',
        confidence: 'low',
        products_mentioned: [],
        quantity_mentioned: 0,
        is_explicit_confirmation: false,
        requires_clarification: true,
        suggested_response_type: 'ask_specification',
        emotional_state: 'neutral',
        emotional_confidence: 'low',
        needs_emotional_response: false,
        emotional_keywords: [],
        reasoning: 'Error técnico'
      }
    }
  }

  async validateYapePayment(imageBase64, expectedAmount, customerName, accountHolder, yapeNumber = null) {
    const operation = async (model, apiKey) => {
      // Extraer últimos 3 dígitos del número configurado si está disponible
      const expectedLastDigits = yapeNumber ? yapeNumber.slice(-3) : null

      const prompt = `
Analiza esta captura de pantalla de un pago por Yape y extrae toda la información relevante.

INFORMACIÓN A VERIFICAR:
- Monto esperado: S/ ${expectedAmount}
- Cliente: ${customerName}
- Titular esperado: ${accountHolder}${expectedLastDigits ? `\n- Últimos 3 dígitos esperados del número: ${expectedLastDigits}` : ''}

INSTRUCCIONES IMPORTANTES:
1. Verifica que sea una captura de Yape real
2. Extrae el monto exacto mostrado
3. Extrae el nombre completo del titular de la cuenta tal como aparece en Yape
4. Extrae el número de operación (código único del pago)
5. Extrae la fecha y hora del pago
6. Extrae los últimos 3 dígitos del número de celular (aparece como *** *** XXX)
7. Confirma que el pago esté completado exitosamente
8. Busca señales de que sea una captura falsa o editada

VALIDACIÓN DE TITULAR - FORMATO YAPE:
⚠️ IMPORTANTE: Yape muestra nombres en formato limitado:
- Primer nombre completo + inicial del segundo nombre + primer apellido completo + inicial del segundo apellido
- Ejemplo: "Juan Carlos Rodriguez Martinez" se muestra como "Juan C. Rodriguez M."
- Para validar titular_correcto, considera que el nombre detectado puede estar en este formato abreviado
- Si el primer nombre Y primer apellido coinciden, considera el titular como CORRECTO

VALIDACIÓN DE ÚLTIMOS 3 DÍGITOS:
${expectedLastDigits ? `- Los últimos 3 dígitos detectados deben coincidir con: ${expectedLastDigits}` : '- Extrae los últimos 3 dígitos del número mostrado'}

VALIDACIÓN DE MONTO:
10. Compara el monto detectado con el esperado:
    - Si coincide exactamente: monto_correcto = true
    - Si es menor: es_pago_parcial = true, calcular diferencia_monto
    - Si es mayor: es_pago_excesivo = true, calcular diferencia_monto

Responde SOLO con un JSON en este formato:
{
  "valido": true/false,
  "monto_detectado": "S/ XX",
  "monto_esperado": "S/ XX",
  "monto_correcto": true/false,
  "es_pago_parcial": true/false,
  "es_pago_excesivo": true/false,
  "diferencia_monto": 0,
  "titular_detectado": "Nombre Completo",
  "titular_correcto": true/false,
  "numero_operacion": "12345678",
  "fecha_pago": "DD mmm. YYYY | HH:MM p. m.",
  "ultimos_digitos": "XXX",
  "ultimos_digitos_correctos": true/false,
  "pago_completado": true/false,
  "razon": "explicación detallada",
  "confianza": "alta/media/baja"
}

REGLAS IMPORTANTES:
- valido = true solo si la captura es auténtica Y el pago está completado
- monto_correcto = true solo si el monto detectado coincide exactamente con el esperado
- es_pago_parcial = true si el monto detectado es menor al esperado
- es_pago_excesivo = true si el monto detectado es mayor al esperado
- diferencia_monto = valor absoluto de la diferencia entre monto detectado y esperado`

      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }

      try {
        const result = await model.generateContent([prompt, imagePart])
        const response = await result.response
        const text = response.text()

        // Extraer JSON de la respuesta
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No se encontró JSON válido en la respuesta')
        }
      } catch (error) {
        // Agregar información de API key al error
        error.apiKey = apiKey
        throw error
      }
    }

    try {
      return await this.executeWithRetry(operation)
    } catch (error) {
      console.error('Error validando pago con Gemini Vision:', error)
      return {
        valido: false,
        monto_detectado: '0',
        razon: 'Error técnico al procesar la imagen: ' + error.message,
        confianza: 'baja'
      }
    }
  }

  async extractProductsFromMessage(message, inventory) {
    const operation = async () => {
      const inventoryText = inventory.map(product =>
        `ID: ${product.id} - ${product.nombre}: S/ ${product.precio}`
      ).join('\n')

      const prompt = `
Analiza este mensaje de un cliente y extrae los productos que quiere comprar.

INVENTARIO DISPONIBLE:
${inventoryText}

MENSAJE DEL CLIENTE: ${message}

Responde SOLO con un JSON en este formato:
{
  "productos": [
    {
      "id": 1,
      "nombre": "nombre del producto",
      "cantidad": 2,
      "precio_unitario": 25.50
    }
  ],
  "total": 51.00,
  "mensaje_confirmacion": "mensaje amigable confirmando el pedido"
}

Si no se pueden identificar productos específicos, devuelve un array vacío en productos.`

      try {
        const { model, apiKey } = await this.getModel()
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        // Marcar éxito en la API key
        this.apiKeyManager.markSuccess(apiKey)

        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        } else {
          return { productos: [], total: 0, mensaje_confirmacion: '' }
        }
      } catch (error) {
        // Agregar información de API key al error
        error.apiKey = error.apiKey || 'unknown'
        throw error
      }
    }

    try {
      return await this.executeWithRetry(operation)
    } catch (error) {
      console.error('Error extrayendo productos:', error)
      return { productos: [], total: 0, mensaje_confirmacion: '' }
    }
  }

  async generateOrderConfirmation(products, total, customerName, yapeNumber, accountHolder, orderId) {
    const operation = async (model, apiKey) => {
      const productsText = products.map(p =>
        `${p.cantidad}x ${p.nombre} - S/ ${p.precio_unitario} c/u`
      ).join('\n')

      // Obtener el nombre del negocio desde la configuración
      let businessName = 'nuestra tienda'
      if (this.db) {
        try {
          const configuredBusinessName = await this.db.getConfig('business_name')
          if (configuredBusinessName && configuredBusinessName.trim() !== '') {
            businessName = configuredBusinessName
          }
        } catch (error) {
          console.log('⚠️ No se pudo obtener business_name para confirmación, usando valor por defecto')
        }
      }

      // 🎭 GENERAR PROMPT PERSONALIZADO SEGÚN PERFIL DE NEGOCIO
      const basePrompt = `
Genera un mensaje de confirmación de pedido amigable y profesional con PASOS CLAROS Y NUMERADOS.

DATOS DEL PEDIDO:
- CLIENTE: ${customerName}
- NÚMERO DE PEDIDO: ${orderId}
- PRODUCTOS:
${productsText}
- TOTAL: S/ ${total}

INFORMACIÓN DE PAGO:
- Número Yape: ${yapeNumber}
- Titular de cuenta: ${accountHolder}

ESTRUCTURA REQUERIDA (FORMATO EXACTO):
1. SALUDO: "¡Hola ${customerName}!"
2. CONFIRMACIÓN: "Hemos recibido tu pedido #${orderId}. Tu compra incluye:"
3. LISTA DE PRODUCTOS con viñetas (•)
4. TOTAL destacado con emoji 💰
5. SECCIÓN "AHORA SIGUE ESTOS PASOS:" con título destacado
6. PASO 1 NUMERADO: � "1️⃣ ENVÍA TU DIRECCIÓN DE ENVÍO" (explicar formato)
7. PASO 2 NUMERADO: 💳 "2️⃣ REALIZA EL PAGO POR YAPE" (datos de pago)
8. PASO 3 NUMERADO: 📷 "3️⃣ ENVÍA LA CAPTURA DEL COMPROBANTE"
9. NOTA IMPORTANTE: Explicar que necesita AMBOS pasos para procesar
10. DESPEDIDA: "Atentamente, ${businessName}"

FORMATO VISUAL REQUERIDO:
- Usar emojis para cada paso (📍💳📷)
- Numerar claramente (1️⃣2️⃣3️⃣)
- Separar cada sección con líneas en blanco
- Destacar "AHORA SIGUE ESTOS PASOS:" como título
- Hacer que los pasos sean IMPOSIBLES de confundir

IMPORTANTE: El mensaje debe ser VISUALMENTE CLARO para que el cliente sepa exactamente qué hacer primero.

Genera un mensaje estructurado y fácil de seguir:`

      // Aplicar personalización según perfil de negocio
      const prompt = await this.getPersonalizedPrompt(basePrompt)

      try {
        const result = await model.generateContent(prompt)
        const response = await result.response
        return response.text()
      } catch (error) {
        // Agregar información de API key al error
        error.apiKey = apiKey
        throw error
      }
    }

    try {
      return await this.executeWithRetry(operation)
    } catch (error) {
      console.error('Error generando confirmación de pedido:', error)

      // Obtener nombre del negocio para el mensaje de fallback
      let businessName = 'nuestra tienda'
      if (this.db) {
        try {
          const configuredBusinessName = await this.db.getConfig('business_name')
          if (configuredBusinessName && configuredBusinessName.trim() !== '') {
            businessName = configuredBusinessName
          }
        } catch (error) {
          console.log('⚠️ No se pudo obtener business_name para fallback')
        }
      }

      return `¡Hola ${customerName}! 😊

🎉 *Hemos recibido tu pedido #${orderId}*

Tu compra incluye:
${products.map(p => `• ${p.cantidad}x ${p.nombre} - S/ ${p.precio_unitario} c/u`).join('\n')}

💰 *Total a pagar: S/ ${total}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ *AHORA SIGUE ESTOS PASOS:*

📍 *1️⃣ ENVÍA TU DIRECCIÓN DE ENVÍO*
Por favor, envía tu dirección completa como mensaje de texto.
Ejemplo: "Av. Los Olivos 123, Dpto 4B, San Isidro, Lima"

💳 *2️⃣ REALIZA EL PAGO POR YAPE*
• Número: +51 ${yapeNumber}
• Titular: ${accountHolder}
• Monto: S/ ${total}

📷 *3️⃣ ENVÍA LA CAPTURA DEL COMPROBANTE*
Toma una captura de pantalla de tu pago y envíala aquí.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ *IMPORTANTE:* Necesitamos AMBOS datos (dirección + comprobante) para procesar tu pedido correctamente.

¡Gracias por tu compra! 🙏

Atentamente,
${businessName}`
    }
  }

  // 🎭 NUEVO MÉTODO: Generar respuestas emocionales empáticas
  async generateEmotionalResponse(message, customerName, emotionalState, emotionalKeywords, conversationState = 'browsing') {
    console.log(`🎭 GENERANDO respuesta emocional para estado: ${emotionalState}`)

    const operation = async (model, apiKey) => {
      const basePrompt = `
Genera una respuesta empática y profesional para un cliente que está experimentando el siguiente estado emocional.

INFORMACIÓN DEL CLIENTE:
- Nombre: ${customerName}
- Mensaje original: "${message}"
- Estado emocional: ${emotionalState}
- Palabras clave emocionales: ${emotionalKeywords.join(', ')}
- Estado de conversación: ${conversationState}

INSTRUCCIONES ESPECÍFICAS SEGÚN ESTADO EMOCIONAL:

${emotionalState === 'frustrated' ? `
CLIENTE FRUSTRADO:
- Reconoce su frustración de manera empática
- Ofrece disculpas si es apropiado
- Muestra comprensión de su situación
- Ofrece ayuda específica para resolver el problema
- Mantén un tono calmado y profesional
Ejemplo: "Entiendo perfectamente tu frustración, ${customerName}. Lamento que hayas tenido esta experiencia. Estoy aquí para ayudarte a resolver esto de la mejor manera posible."
` : ''}

${emotionalState === 'sad' ? `
CLIENTE TRISTE:
- Muestra empatía genuina por su situación
- Ofrece palabras de aliento breves pero sinceras
- Evita ser demasiado efusivo o falso
- Ofrece tu apoyo de manera profesional
Ejemplo: "Lamento escuchar que estás pasando por un momento difícil, ${customerName}. Aunque no puedo resolver todos los problemas, estoy aquí para ayudarte en lo que esté a mi alcance."
` : ''}

${emotionalState === 'confused' ? `
CLIENTE CONFUNDIDO:
- Reconoce que la situación puede ser confusa
- Ofrece clarificación de manera simple y directa
- Asegúrale que es normal tener dudas
- Proporciona orientación paso a paso
Ejemplo: "No te preocupes, ${customerName}, es completamente normal tener dudas. Déjame ayudarte a aclarar todo paso a paso."
` : ''}

${emotionalState === 'excited' ? `
CLIENTE EMOCIONADO:
- Comparte su entusiasmo de manera profesional
- Valida su emoción positiva
- Canaliza su energía hacia la compra
- Mantén el momentum positivo
Ejemplo: "¡Me alegra mucho ver tu entusiasmo, ${customerName}! Es genial cuando nuestros clientes se emocionan con nuestros productos."
` : ''}

${emotionalState === 'grateful' ? `
CLIENTE AGRADECIDO:
- Acepta su agradecimiento con humildad
- Refuerza el compromiso con el buen servicio
- Mantén la puerta abierta para futuras interacciones
Ejemplo: "Muchas gracias por tus palabras, ${customerName}. Es un placer poder ayudarte. Siempre estamos aquí cuando nos necesites."
` : ''}

${emotionalState === 'seeking_advice' ? `
CLIENTE BUSCANDO CONSEJO:
- Reconoce que busca orientación
- Ofrece ayuda personalizada
- Haz preguntas para entender mejor sus necesidades
- Posiciónate como un asesor confiable
Ejemplo: "Por supuesto, ${customerName}, estaré encantado de ayudarte a elegir la mejor opción. Para darte la mejor recomendación, cuéntame un poco más sobre lo que necesitas."
` : ''}

REGLAS IMPORTANTES:
1. La respuesta debe ser BREVE (máximo 2-3 líneas)
2. Debe sonar NATURAL y HUMANA, no robótica
3. Debe ser PROFESIONAL pero CÁLIDA
4. SIEMPRE termina preguntando: "¿En qué más te puedo ayudar hoy?"
5. NO menciones productos específicos en esta respuesta
6. NO hagas la respuesta demasiado larga o dramática
7. Mantén el equilibrio entre empatía y profesionalismo

Genera una respuesta empática y luego pregunta cómo puedes ayudar:`

      // Aplicar personalización según perfil de negocio
      const prompt = await this.getPersonalizedPrompt(basePrompt)

      try {
        const result = await model.generateContent(prompt)
        const response = await result.response
        return response.text()
      } catch (error) {
        // Agregar información de API key al error
        error.apiKey = apiKey
        throw error
      }
    }

    try {
      return await this.executeWithRetry(operation)
    } catch (error) {
      console.error('Error generando respuesta emocional con Gemini:', error)
      // Fallback empático según el estado emocional
      const fallbackResponses = {
        frustrated: `Entiendo tu frustración, ${customerName}. Estoy aquí para ayudarte. ¿En qué más te puedo ayudar hoy?`,
        sad: `Lamento que estés pasando por un momento difícil, ${customerName}. ¿En qué más te puedo ayudar hoy?`,
        confused: `No te preocupes, ${customerName}, estoy aquí para aclarar tus dudas. ¿En qué más te puedo ayudar hoy?`,
        excited: `¡Me alegra tu entusiasmo, ${customerName}! ¿En qué más te puedo ayudar hoy?`,
        grateful: `Gracias por tus palabras, ${customerName}. ¿En qué más te puedo ayudar hoy?`,
        seeking_advice: `Por supuesto, ${customerName}, estaré encantado de ayudarte a elegir. ¿En qué más te puedo ayudar hoy?`
      }
      return fallbackResponses[emotionalState] || `Entiendo, ${customerName}. ¿En qué más te puedo ayudar hoy?`
    }
  }

  // 🎯 MÉTODO PARA EXTRAER PRODUCTO ESPECÍFICO MENCIONADO EN EL MENSAJE
  extractSpecificProductFromMessage(message) {
    const messageText = message.toLowerCase()
    
    const productPatterns = [
      { pattern: /iphone\s*15\s*(pro\s*max|pro|plus)?/i, extract: (match) => `iPhone 15${match[1] ? ' ' + match[1].trim() : ''}` },
      { pattern: /iphone\s*16\s*(pro\s*max|pro|plus)?/i, extract: (match) => `iPhone 16${match[1] ? ' ' + match[1].trim() : ''}` },
      { pattern: /iphone\s*14\s*(pro\s*max|pro|plus)?/i, extract: (match) => `iPhone 14${match[1] ? ' ' + match[1].trim() : ''}` },
      { pattern: /samsung\s*galaxy\s*s(\d+)/i, extract: (match) => `Samsung Galaxy S${match[1]}` },
      { pattern: /xiaomi\s*(redmi|poco|mi)\s*([\w\s]+)/i, extract: (match) => `Xiaomi ${match[1]} ${match[2]}`.trim() }
    ]
    
    for (const { pattern, extract } of productPatterns) {
      const match = messageText.match(pattern)
      if (match) {
        const extracted = extract(match)
        console.log(`🎯 PRODUCTO ESPECÍFICO DETECTADO: "${extracted}" en mensaje: "${message}"`)
        return extracted
      }
    }
    return null
  }
  
  // 🔍 MÉTODO PARA VERIFICAR SI DOS PRODUCTOS SON SIMILARES
  isProductSimilar(requestedProduct, inventoryProductName) {
    if (!requestedProduct || !inventoryProductName) return false
    
    const requested = requestedProduct.toLowerCase().trim()
    const inventory = inventoryProductName.toLowerCase().trim()
    
    if (inventory.includes(requested)) {
      console.log(`✅ PRODUCTOS SIMILARES: "${requested}" encontrado en "${inventory}"`)
      return true
    }
    
    const extractMainInfo = (name) => {
      const match = name.match(/(iphone|samsung|xiaomi|huawei|oppo|realme)\s*([\d\w]+)/i)
      return match ? `${match[1].toLowerCase()} ${match[2].toLowerCase()}` : name.toLowerCase()
    }
    
    const requestedMain = extractMainInfo(requested)
    const inventoryMain = extractMainInfo(inventory)
    const isSimilar = requestedMain === inventoryMain
    
    console.log(`🔍 COMPARACIÓN PRODUCTOS: "${requestedMain}" vs "${inventoryMain}" = ${isSimilar ? 'SIMILAR' : 'DIFERENTE'}`)
    return isSimilar
  }
}
