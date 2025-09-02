const logger = require('./logger')
const fs = require('fs').promises
const path = require('path')

class SemanticSearchService {
  constructor(knowledgeBase) {
    this.knowledgeBase = knowledgeBase
    this.documents = []
    this.embeddings = new Map()
    this.isInitialized = false
    
    // Configuración
    this.chunkSize = 500 // Tamaño de chunks en caracteres
    this.overlapSize = 50 // Solapamiento entre chunks
    this.maxResults = 10
    
    logger.info('🔍 SemanticSearchService initialized')
  }

  /**
   * Inicializar el servicio de búsqueda semántica
   */
  async initialize() {
    try {
      logger.info('🔍 Initializing semantic search...')
      
      // Procesar documentos de la base de conocimientos
      await this.processKnowledgeBase()
      
      // Generar embeddings semánticos simples
      await this.generateEmbeddings()
      
      this.isInitialized = true
      logger.info(`✅ Semantic search initialized with ${this.documents.length} document chunks`)
      
    } catch (error) {
      logger.error('Error initializing semantic search', error)
      throw error
    }
  }

  /**
   * Procesar la base de conocimientos en chunks
   */
  async processKnowledgeBase() {
    try {
      const context = this.knowledgeBase.getContext()
      if (!context) {
        throw new Error('Knowledge base context not available')
      }

      // Dividir en párrafos
      const paragraphs = context.split('\n\n').filter(p => p.trim().length > 50)
      
      // Crear chunks con metadata
      this.documents = []
      let documentId = 0
      
      paragraphs.forEach((paragraph, index) => {
        const chunks = this.createChunks(paragraph)
        
        chunks.forEach((chunk, chunkIndex) => {
          this.documents.push({
            id: `doc_${documentId}`,
            content: chunk,
            metadata: {
              paragraphIndex: index,
              chunkIndex,
              isLegal: this.isLegalContent(chunk),
              wordCount: chunk.split(' ').length,
              hasReferences: this.hasLegalReferences(chunk)
            }
          })
          documentId++
        })
      })
      
      logger.info(`📄 Processed ${paragraphs.length} paragraphs into ${this.documents.length} chunks`)
      
    } catch (error) {
      logger.error('Error processing knowledge base', error)
      throw error
    }
  }

  /**
   * Crear chunks de texto con solapamiento
   */
  createChunks(text) {
    const chunks = []
    const words = text.split(' ')
    
    if (words.length <= this.chunkSize / 5) { // Aproximadamente 5 caracteres por palabra
      return [text]
    }
    
    const wordsPerChunk = Math.floor(this.chunkSize / 5)
    const overlapWords = Math.floor(this.overlapSize / 5)
    
    for (let i = 0; i < words.length; i += wordsPerChunk - overlapWords) {
      const chunkWords = words.slice(i, i + wordsPerChunk)
      if (chunkWords.length > 10) { // Mínimo 10 palabras por chunk
        chunks.push(chunkWords.join(' '))
      }
    }
    
    return chunks
  }

  /**
   * Detectar si el contenido es legal
   */
  isLegalContent(text) {
    const legalKeywords = [
      'ley', 'código', 'artículo', 'decreto', 'sunat', 'sunarp',
      'tributario', 'civil', 'penal', 'jurisprudencia', 'norma'
    ]
    
    const lowerText = text.toLowerCase()
    return legalKeywords.some(keyword => lowerText.includes(keyword))
  }

  /**
   * Detectar referencias legales específicas
   */
  hasLegalReferences(text) {
    const referencePatterns = [
      /ley n°?\s*\d+/i,
      /decreto ley n°?\s*\d+/i,
      /código civil art/i,
      /artículo\s*\d+/i
    ]
    
    return referencePatterns.some(pattern => pattern.test(text))
  }

  /**
   * Generar embeddings semánticos simples usando TF-IDF mejorado
   */
  async generateEmbeddings() {
    try {
      logger.info('🧠 Generating semantic embeddings...')
      
      // Crear vocabulario
      const vocabulary = this.buildVocabulary()
      
      // Generar embeddings para cada documento
      this.documents.forEach(doc => {
        const embedding = this.generateDocumentEmbedding(doc.content, vocabulary)
        this.embeddings.set(doc.id, embedding)
      })
      
      logger.info(`🧠 Generated embeddings for ${this.embeddings.size} documents`)
      
    } catch (error) {
      logger.error('Error generating embeddings', error)
      throw error
    }
  }

  /**
   * Construir vocabulario con pesos semánticos
   */
  buildVocabulary() {
    const wordFreq = new Map()
    const docFreq = new Map()
    
    // Contar frecuencias
    this.documents.forEach(doc => {
      const words = this.tokenize(doc.content)
      const uniqueWords = new Set(words)
      
      words.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
      })
      
      uniqueWords.forEach(word => {
        docFreq.set(word, (docFreq.get(word) || 0) + 1)
      })
    })
    
    // Calcular TF-IDF weights
    const vocabulary = new Map()
    const totalDocs = this.documents.length
    
    for (const [word, df] of docFreq.entries()) {
      const idf = Math.log(totalDocs / df)
      vocabulary.set(word, {
        idf,
        frequency: wordFreq.get(word),
        isLegal: this.isLegalTerm(word)
      })
    }
    
    return vocabulary
  }

  /**
   * Tokenizar texto con limpieza
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word))
  }

  /**
   * Detectar términos legales importantes
   */
  isLegalTerm(word) {
    const legalTerms = [
      'ley', 'código', 'artículo', 'decreto', 'sunat', 'sunarp', 'uif',
      'tributario', 'civil', 'penal', 'comercial', 'societario',
      'holding', 'empresa', 'sociedad', 'patrimonio', 'fiscal'
    ]
    return legalTerms.includes(word)
  }

  /**
   * Lista de stop words en español
   */
  isStopWord(word) {
    const stopWords = [
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te',
      'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los',
      'las', 'una', 'como', 'pero', 'sus', 'han', 'más', 'este', 'esta', 'muy'
    ]
    return stopWords.includes(word)
  }

  /**
   * Generar embedding para un documento
   */
  generateDocumentEmbedding(text, vocabulary) {
    const words = this.tokenize(text)
    const wordCount = new Map()
    
    // Contar palabras en el documento
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1)
    })
    
    // Crear vector TF-IDF con boost semántico
    const embedding = new Map()
    
    for (const [word, count] of wordCount.entries()) {
      if (vocabulary.has(word)) {
        const vocabData = vocabulary.get(word)
        const tf = count / words.length
        const tfidf = tf * vocabData.idf
        
        // Boost para términos legales
        const boost = vocabData.isLegal ? 1.5 : 1.0
        
        embedding.set(word, tfidf * boost)
      }
    }
    
    return embedding
  }

  /**
   * Realizar búsqueda semántica
   */
  async search(query, options = {}) {
    if (!this.isInitialized) {
      await this.initialize()
    }
    
    const startTime = Date.now()
    
    try {
      // Generar embedding de la consulta
      const queryEmbedding = this.generateQueryEmbedding(query)
      
      // Calcular similitudes
      const similarities = this.calculateSimilarities(queryEmbedding, options)
      
      // Ordenar por relevancia
      const sortedResults = similarities
        .sort((a, b) => b.score - a.score)
        .slice(0, options.maxResults || this.maxResults)
      
      const processingTime = Date.now() - startTime
      
      logger.info(`🔍 Semantic search completed`, {
        query: query.substring(0, 50),
        results: sortedResults.length,
        processingTime
      })
      
      return {
        query,
        results: sortedResults,
        totalResults: similarities.length,
        processingTime,
        searchType: 'semantic'
      }
      
    } catch (error) {
      logger.error('Error in semantic search', error)
      throw error
    }
  }

  /**
   * Generar embedding para consulta
   */
  generateQueryEmbedding(query) {
    const vocabulary = this.buildVocabulary()
    return this.generateDocumentEmbedding(query, vocabulary)
  }

  /**
   * Calcular similitudes coseno
   */
  calculateSimilarities(queryEmbedding, options) {
    const similarities = []
    
    this.documents.forEach(doc => {
      const docEmbedding = this.embeddings.get(doc.id)
      if (!docEmbedding) return
      
      // Calcular similitud coseno
      const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding)
      
      // Aplicar filtros
      if (this.passesFilters(doc, options)) {
        similarities.push({
          document: doc,
          score: similarity,
          content: doc.content,
          metadata: doc.metadata
        })
      }
    })
    
    return similarities.filter(result => result.score > 0.1) // Umbral mínimo
  }

  /**
   * Calcular similitud coseno entre dos embeddings
   */
  cosineSimilarity(embedding1, embedding2) {
    const words = new Set([...embedding1.keys(), ...embedding2.keys()])
    
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0
    
    for (const word of words) {
      const val1 = embedding1.get(word) || 0
      const val2 = embedding2.get(word) || 0
      
      dotProduct += val1 * val2
      norm1 += val1 * val1
      norm2 += val2 * val2
    }
    
    if (norm1 === 0 || norm2 === 0) return 0
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  /**
   * Aplicar filtros a los resultados
   */
  passesFilters(doc, options) {
    if (options.legalOnly && !doc.metadata.isLegal) {
      return false
    }
    
    if (options.withReferences && !doc.metadata.hasReferences) {
      return false
    }
    
    if (options.minWordCount && doc.metadata.wordCount < options.minWordCount) {
      return false
    }
    
    return true
  }

  /**
   * Obtener estadísticas del servicio
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      totalDocuments: this.documents.length,
      totalEmbeddings: this.embeddings.size,
      legalDocuments: this.documents.filter(d => d.metadata.isLegal).length,
      documentsWithReferences: this.documents.filter(d => d.metadata.hasReferences).length,
      averageWordCount: this.documents.reduce((sum, d) => sum + d.metadata.wordCount, 0) / this.documents.length
    }
  }
}

module.exports = SemanticSearchService