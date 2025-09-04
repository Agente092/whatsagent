/**
 * 🧠 RAG INTELLIGENT SYSTEM - MEMORIA Y BÚSQUEDA SEMÁNTICA
 * 
 * Implementa Retrieval-Augmented Generation con pgvector en Supabase
 * Combina "pensamiento" del LLM con "memoria" persistente en base de datos
 */

export class IntelligentRAGSystem {
  constructor(supabaseService) {
    this.supabase = supabaseService.client
    this.embeddingDimensions = 1536
    this.useOpenAI = false // Inicialmente usar embeddings locales
  }

  /**
   * 🧠 INICIALIZAR SISTEMA RAG
   */
  async initialize() {
    try {
      console.log('🧠 Inicializando sistema RAG inteligente...')
      
      // Verificar extensión pgvector
      await this.ensurePgVectorExtension()
      
      // Crear tablas de vectores si no existen
      await this.createVectorTables()
      
      console.log('✅ Sistema RAG inicializado correctamente')
      return true

    } catch (error) {
      console.error('❌ Error inicializando RAG:', error)
      return false
    }
  }

  /**
   * 📊 ASEGURAR EXTENSIÓN PGVECTOR
   */
  async ensurePgVectorExtension() {
    try {
      const { error } = await this.supabase.rpc('create_extension_if_not_exists', {
        extension_name: 'vector'
      })
      
      if (error) {
        console.warn('⚠️ No se pudo crear extensión vector automáticamente:', error.message)
        console.log('📝 Ejecuta manualmente en Supabase SQL Editor: CREATE EXTENSION IF NOT EXISTS vector;')
      }

    } catch (error) {
      console.warn('⚠️ Verificación de pgvector:', error.message)
    }
  }

  /**
   * 🗄️ CREAR TABLAS VECTORIALES
   */
  async createVectorTables() {
    try {
      // Tabla para embeddings de productos
      const productEmbeddingsSQL = `
        CREATE TABLE IF NOT EXISTS product_embeddings (
          id BIGSERIAL PRIMARY KEY,
          product_id INTEGER REFERENCES productos(id),
          content TEXT NOT NULL,
          embedding vector(${this.embeddingDimensions}),
          metadata JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS product_embeddings_embedding_idx 
        ON product_embeddings USING ivfflat (embedding vector_cosine_ops);
      `

      // Tabla para embeddings de conversaciones
      const conversationEmbeddingsSQL = `
        CREATE TABLE IF NOT EXISTS conversation_embeddings (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          message TEXT NOT NULL,
          embedding vector(${this.embeddingDimensions}),
          context JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS conversation_embeddings_embedding_idx 
        ON conversation_embeddings USING ivfflat (embedding vector_cosine_ops);
        
        CREATE INDEX IF NOT EXISTS conversation_embeddings_user_idx 
        ON conversation_embeddings (user_id, created_at);
      `

      await this.supabase.rpc('exec_sql', { sql: productEmbeddingsSQL })
      await this.supabase.rpc('exec_sql', { sql: conversationEmbeddingsSQL })

      console.log('✅ Tablas vectoriales creadas/verificadas')

    } catch (error) {
      console.error('❌ Error creando tablas vectoriales:', error)
    }
  }

  /**
   * 🔄 GENERAR EMBEDDING DE TEXTO (Versión Simplificada)
   */
  async generateEmbedding(text) {
    try {
      if (this.useOpenAI && this.openai) {
        // Usar OpenAI si está disponible
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000)
        })
        return response.data[0].embedding
      } else {
        // Usar embedding simple basado en hash para empezar
        return this.generateSimpleEmbedding(text)
      }

    } catch (error) {
      console.error('❌ Error generando embedding:', error)
      // Fallback a embedding simple
      return this.generateSimpleEmbedding(text)
    }
  }

  /**
   * 🔢 GENERAR EMBEDDING SIMPLE (Fallback)
   */
  generateSimpleEmbedding(text) {
    // Crear un vector simple basado en características del texto
    const normalized = text.toLowerCase().replace(/[^\w\s]/g, '')
    const words = normalized.split(/\s+/).filter(w => w.length > 2)
    
    // Crear vector de 1536 dimensiones con valores entre -1 y 1
    const embedding = new Array(this.embeddingDimensions).fill(0)
    
    for (let i = 0; i < words.length && i < 100; i++) {
      const word = words[i]
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j)
        const index = (charCode + i * j) % this.embeddingDimensions
        embedding[index] += (charCode / 1000) - 0.5
      }
    }
    
    // Normalizar vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude
      }
    }
    
    return embedding
  }

  /**
   * 📦 INDEXAR PRODUCTO EN SISTEMA RAG
   */
  async indexProduct(product) {
    try {
      // Crear contenido enriquecido del producto
      const content = this.createProductContent(product)
      
      // Generar embedding
      const embedding = await this.generateEmbedding(content)
      if (!embedding) return false

      // Guardar en base de datos
      const { error } = await this.supabase
        .from('product_embeddings')
        .upsert({
          product_id: product.id,
          content,
          embedding,
          metadata: {
            name: product.nombre,
            category: product.categoria,
            price: product.precio,
            is_vip: product.es_vip || false,
            active: product.activo
          }
        })

      if (error) {
        console.error('❌ Error indexando producto:', error)
        return false
      }

      console.log(`📦 Producto indexado: ${product.nombre}`)
      return true

    } catch (error) {
      console.error('❌ Error en indexProduct:', error)
      return false
    }
  }

  /**
   * 📝 CREAR CONTENIDO ENRIQUECIDO DE PRODUCTO
   */
  createProductContent(product) {
    let content = `Producto: ${product.nombre}\n`
    
    if (product.descripcion) {
      content += `Descripción: ${product.descripcion}\n`
    }
    
    content += `Categoría: ${product.categoria || 'General'}\n`
    content += `Precio: S/ ${product.precio}\n`
    
    if (product.es_vip) {
      content += `Tipo: Producto VIP exclusivo\n`
      if (product.precio_vip) {
        content += `Precio VIP: S/ ${product.precio_vip}\n`
      }
      if (product.precio_original) {
        const descuento = Math.round(((product.precio_original - product.precio_vip) / product.precio_original) * 100)
        content += `Descuento VIP: ${descuento}%\n`
      }
    }
    
    if (product.stock > 0) {
      content += `Disponibilidad: En stock (${product.stock} unidades)\n`
    }

    // Agregar términos de búsqueda comunes
    const searchTerms = this.generateSearchTerms(product.nombre)
    content += `Términos de búsqueda: ${searchTerms.join(', ')}\n`

    return content
  }

  /**
   * 🔍 GENERAR TÉRMINOS DE BÚSQUEDA
   */
  generateSearchTerms(productName) {
    const terms = [productName.toLowerCase()]
    
    // Extraer términos clave
    const words = productName.toLowerCase().split(/\s+/)
    terms.push(...words.filter(word => word.length > 2))
    
    // Patrones específicos
    if (productName.toLowerCase().includes('iphone')) {
      const match = productName.match(/iphone\s*(\d+)/i)
      if (match) {
        terms.push(`iphone ${match[1]}`, `iphone${match[1]}`)
      }
    }

    return [...new Set(terms)]
  }

  /**
   * 🧠 BÚSQUEDA SEMÁNTICA INTELIGENTE MEJORADA (Versión Optimizada)
   */
  async semanticSearch(query, options = {}) {
    try {
      const {
        limit = 5,
        threshold = 0.7,
        includeVip = true,
        onlyVip = false
      } = options

      console.log(`🔍 Búsqueda semántica RAG mejorada: "${query}"`)

      // 🔍 ESTRATEGIA 1: Usar la función PostgreSQL optimizada si está disponible
      try {
        const { data, error } = await this.supabase
          .rpc('buscar_productos_inteligente', {
            termino_busqueda: query,
            limite: limit,
            solo_activos: true
          })

        if (!error && data && data.length > 0) {
          console.log(`✅ Búsqueda PostgreSQL: ${data.length} resultados encontrados`)
          return data.map(product => ({
            ...product,
            relevance: product.relevancia || this.calculateSimpleRelevance(query, product)
          }))
        }
      } catch (pgError) {
        console.warn('⚠️ Función PostgreSQL no disponible, usando búsqueda básica:', pgError.message)
      }

      // 🔍 ESTRATEGIA 2: Búsqueda básica mejorada
      const searchTerms = this.extractSearchTerms(query)
      let sqlQuery = this.supabase
        .from('productos')
        .select(`
          id, nombre, descripcion, precio, precio_vip, precio_original,
          stock, stock_vip, categoria, imagen_url, es_vip, activo
        `)
        .eq('activo', true)

      // 🔍 Aplicar filtros de búsqueda más inteligentes
      const searchConditions = []
      searchTerms.forEach(term => {
        searchConditions.push(`nombre.ilike.%${term}%`)
        searchConditions.push(`descripcion.ilike.%${term}%`)
        searchConditions.push(`categoria.ilike.%${term}%`)
      })
      
      if (searchConditions.length > 0) {
        sqlQuery = sqlQuery.or(searchConditions.join(','))
      } else {
        // Si no hay términos específicos, usar búsqueda general
        sqlQuery = sqlQuery.or(`nombre.ilike.%${query}%,descripcion.ilike.%${query}%`)
      }

      if (onlyVip) {
        sqlQuery = sqlQuery.eq('es_vip', true)
      } else if (!includeVip) {
        sqlQuery = sqlQuery.eq('es_vip', false)
      }

      const { data, error } = await sqlQuery
        .order('es_vip', { ascending: false }) // VIP primero
        .order('destacado', { ascending: false }) // Destacados primero
        .order('nombre')
        .limit(limit)

      if (error) {
        console.error('❌ Error en búsqueda semántica mejorada:', error)
        return []
      }

      // 📈 Calcular relevancia mejorada
      const results = (data || []).map(product => ({
        ...product,
        relevance: this.calculateEnhancedRelevance(query, product, searchTerms)
      })).sort((a, b) => b.relevance - a.relevance)

      console.log(`✅ Búsqueda RAG mejorada: ${results.length} resultados encontrados`)
      return results

    } catch (error) {
      console.error('❌ Error en semanticSearch mejorada:', error)
      return []
    }
  }

  /**
   * 💾 GUARDAR CONTEXTO CONVERSACIONAL
   */
  async saveConversationContext(userId, message, context = {}) {
    try {
      const embedding = await this.generateEmbedding(message)
      if (!embedding) return false

      const { error } = await this.supabase
        .from('conversation_embeddings')
        .insert({
          user_id: userId,
          message,
          embedding,
          context
        })

      if (error) {
        console.error('❌ Error guardando contexto:', error)
        return false
      }

      return true

    } catch (error) {
      console.error('❌ Error en saveConversationContext:', error)
      return false
    }
  }

  /**
   * 🔍 RECUPERAR CONTEXTO CONVERSACIONAL
   */
  async retrieveConversationContext(userId, currentMessage, limit = 3) {
    try {
      const queryEmbedding = await this.generateEmbedding(currentMessage)
      if (!queryEmbedding) return []

      const { data, error } = await this.supabase.rpc('get_similar_conversations', {
        user_id: userId,
        query_embedding: queryEmbedding,
        similarity_threshold: 0.8,
        result_limit: limit
      })

      if (error) {
        console.error('❌ Error recuperando contexto:', error)
        return []
      }

      return data || []

    } catch (error) {
      console.error('❌ Error en retrieveConversationContext:', error)
      return []
    }
  }

  /**
   * 🎯 GENERAR RESPUESTA AUMENTADA CON RAG MEJORADO
   */
  async generateAugmentedResponse(userMessage, userId, contextValidator, intelligentSearchService = null) {
    try {
      console.log('🧠 Generando respuesta aumentada con RAG mejorado...')

      // 1. 🔍 USAR BÚSQUEDA INTELIGENTE SI ESTÁ DISPONIBLE (PRIORIDAD)
      let relevantProducts = []
      
      if (intelligentSearchService && typeof intelligentSearchService.semanticSearch === 'function') {
        console.log('🔍 Usando búsqueda semántica inteligente (PRIORIDAD)')
        try {
          // Usar la búsqueda semántica avanzada que SÍ funciona
          const semanticResults = await intelligentSearchService.semanticSearch(userMessage, 5)
          relevantProducts = semanticResults.map(result => ({
            ...result.product,
            relevance: result.score,
            matchType: result.matchType,
            reasons: result.reasons
          }))
          console.log(`✅ Búsqueda inteligente: ${relevantProducts.length} productos encontrados`)
        } catch (searchError) {
          console.warn('⚠️ Error en búsqueda inteligente, usando RAG básico:', searchError.message)
          relevantProducts = await this.semanticSearch(userMessage, { limit: 3, threshold: 0.75 })
        }
      } else {
        console.log('🔍 Usando búsqueda RAG básica (fallback)')
        relevantProducts = await this.semanticSearch(userMessage, { limit: 3, threshold: 0.75 })
      }

      // 2. 💬 Recuperar contexto conversacional
      const conversationContext = await this.retrieveConversationContext(userId, userMessage)

      // 3. ✅ Validar coherencia con contexto actual
      const validation = contextValidator ? contextValidator.validateContext(
        userMessage,
        conversationContext[0],
        { products_mentioned: relevantProducts }
      ) : { isValid: true, confidence: 1, conflicts: [] }

      // 4. 📝 Construir prompt enriquecido
      const enrichedPrompt = this.buildEnrichedPrompt(
        userMessage,
        relevantProducts,
        conversationContext,
        validation
      )

      // 5. 💾 Guardar contexto actual
      await this.saveConversationContext(userId, userMessage, {
        relevant_products: relevantProducts.map(p => p.id),
        validation_status: validation.isValid,
        search_source: intelligentSearchService ? 'intelligent_semantic' : 'basic_rag'
      })

      console.log(`✅ RAG mejorado: ${relevantProducts.length} productos, validación: ${validation.isValid}`)

      return {
        enrichedPrompt,
        relevantProducts,
        validation,
        conversationContext,
        source: 'enhanced_rag'
      }

    } catch (error) {
      console.error('❌ Error generando respuesta aumentada:', error)
      return {
        relevantProducts: [],
        validation: { isValid: false, confidence: 0, conflicts: [] },
        conversationContext: [],
        error: error.message,
        source: 'rag_error'
      }
    }
  }

  /**
   * 📝 CONSTRUIR PROMPT ENRIQUECIDO
   */
  buildEnrichedPrompt(userMessage, products, conversationHistory, validation) {
    let prompt = `CONTEXTO DE CONVERSACIÓN:\n`
    
    // Historial relevante
    if (conversationHistory.length > 0) {
      prompt += `Conversación previa relevante:\n`
      conversationHistory.slice(-2).forEach(ctx => {
        prompt += `- Usuario: ${ctx.message}\n`
      })
      prompt += `\n`
    }

    // Productos relevantes encontrados
    if (products.length > 0) {
      prompt += `PRODUCTOS RELEVANTES ENCONTRADOS:\n`
      products.forEach((product, index) => {
        prompt += `${index + 1}. ${product.nombre}\n`
        if (product.descripcion) {
          prompt += `   Descripción: ${product.descripcion}\n`
        }
        prompt += `   Precio: S/ ${product.precio}\n`
        if (product.es_vip && product.precio_vip) {
          prompt += `   Precio VIP: S/ ${product.precio_vip}\n`
        }
        prompt += `   Stock: ${product.stock > 0 ? 'Disponible' : 'Agotado'}\n\n`
      })
    }

    // Estado de validación
    if (!validation.isValid) {
      prompt += `ATENCIÓN - CONFLICTO DETECTADO:\n`
      validation.conflicts.forEach(conflict => {
        prompt += `- ${conflict.details}\n`
      })
      prompt += `\n`
    }

    prompt += `MENSAJE ACTUAL DEL USUARIO: "${userMessage}"\n\n`
    prompt += `INSTRUCCIONES:\n`
    prompt += `- Responde basándote ÚNICAMENTE en los productos relevantes mostrados arriba\n`
    prompt += `- Si hay conflictos, aclara de qué producto específico estás hablando\n`
    prompt += `- Mantén coherencia con el contexto de la conversación\n`
    prompt += `- Si el usuario cambia de producto, reconoce el cambio explícitamente\n`

    return prompt
  }

  /**
   * 🔄 REINDEXAR TODOS LOS PRODUCTOS
   */
  async reindexAllProducts() {
    try {
      console.log('🔄 Reindexando todos los productos...')

      const { data: products, error } = await this.supabase
        .from('productos')
        .select('*')
        .eq('activo', true)

      if (error) {
        console.error('❌ Error obteniendo productos:', error)
        return false
      }

      let indexed = 0
      for (const product of products) {
        const success = await this.indexProduct(product)
        if (success) indexed++
      }

      console.log(`✅ Reindexación completada: ${indexed}/${products.length} productos`)
      return true

    } catch (error) {
      console.error('❌ Error en reindexación:', error)
      return false
    }
  }

  /**
   * 🔍 EXTRAER TÉRMINOS DE BÚSQUEDA
   */
  extractSearchTerms(query) {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .slice(0, 10)
  }

  /**
   * 📈 CALCULAR RELEVANCIA MEJORADA
   */
  calculateEnhancedRelevance(query, product, searchTerms = []) {
    const queryLower = query.toLowerCase()
    const productName = product.nombre.toLowerCase()
    const productDesc = (product.descripcion || '').toLowerCase()
    
    let relevance = 0
    
    // 🎯 Coincidencia exacta del nombre (mayor peso)
    if (productName.includes(queryLower)) {
      relevance += 0.9
    }
    
    // 🔍 Coincidencias de términos individuales en nombre
    searchTerms.forEach(term => {
      if (productName.includes(term.toLowerCase())) {
        relevance += 0.3
      }
    })
    
    // 📝 Coincidencia en descripción
    if (productDesc.includes(queryLower)) {
      relevance += 0.5
    }
    
    // 🔍 Coincidencias de términos individuales en descripción
    searchTerms.forEach(term => {
      if (productDesc.includes(term.toLowerCase())) {
        relevance += 0.2
      }
    })
    
    // 📊 Coincidencia en categoría
    if (product.categoria && product.categoria.toLowerCase().includes(queryLower)) {
      relevance += 0.4
    }
    
    // 👑 Boost para productos VIP
    if (product.es_vip) {
      relevance += 0.3
    }
    
    // ⭐ Boost para productos destacados
    if (product.destacado) {
      relevance += 0.2
    }
    
    // ❌ Penalizar si no hay stock
    if (product.stock <= 0) {
      relevance -= 0.4
    }
    
    return Math.max(0, Math.min(relevance, 2.0)) // Permitir valores mayores a 1 para mejores coincidencias
  }
}

export default IntelligentRAGSystem