const SemanticSearchService = require('../../../server/services/semanticSearch')

// Mock knowledge base
const mockKnowledgeBase = {
  getContext: () => `
    La Ley General de Sociedades establece las normas para la constitución de empresas en Perú.
    
    Las sociedades de responsabilidad limitada (S.R.L.) son una forma empresarial muy popular.
    
    Los holdings permiten la optimización fiscal y la protección patrimonial de los empresarios.
    
    El Código Civil peruano regula los contratos y las obligaciones civiles.
    
    SUNAT es la entidad encargada de la recaudación tributaria en el país.
    
    Los fideicomisos son instrumentos legales para la protección de activos.
    
    La planificación fiscal debe realizarse dentro del marco legal vigente.
    
    Las inversiones inmobiliarias pueden generar importantes beneficios fiscales.
  `
}

describe('SemanticSearchService', () => {
  let semanticSearch

  beforeEach(async () => {
    semanticSearch = new SemanticSearchService(mockKnowledgeBase)
    await semanticSearch.initialize()
  })

  describe('initialization', () => {
    test('should initialize successfully', () => {
      const stats = semanticSearch.getStats()
      
      expect(stats.isInitialized).toBe(true)
      expect(stats.totalDocuments).toBeGreaterThan(0)
      expect(stats.totalEmbeddings).toBeGreaterThan(0)
    })

    test('should process knowledge base into chunks', () => {
      const stats = semanticSearch.getStats()
      
      expect(stats.totalDocuments).toBeGreaterThan(5) // Al menos algunos chunks
      expect(stats.legalDocuments).toBeGreaterThan(0) // Algunos documentos legales
    })
  })

  describe('semantic search', () => {
    test('should find relevant content for business queries', async () => {
      const results = await semanticSearch.search('crear empresa')
      
      expect(results.results.length).toBeGreaterThan(0)
      expect(results.searchType).toBe('semantic')
      expect(results.processingTime).toBeGreaterThan(0)
      
      // Debería encontrar contenido sobre sociedades
      const hasRelevantContent = results.results.some(result => 
        result.content.toLowerCase().includes('sociedad') ||
        result.content.toLowerCase().includes('empresa')
      )
      expect(hasRelevantContent).toBe(true)
    })

    test('should find legal content for legal queries', async () => {
      const results = await semanticSearch.search('código civil contratos')
      
      expect(results.results.length).toBeGreaterThan(0)
      
      // Debería encontrar contenido sobre código civil
      const hasLegalContent = results.results.some(result => 
        result.content.toLowerCase().includes('código civil') ||
        result.content.toLowerCase().includes('contrato')
      )
      expect(hasLegalContent).toBe(true)
    })

    test('should prioritize legal content when legalOnly filter is used', async () => {
      const results = await semanticSearch.search('ley sociedades', {
        legalOnly: true
      })
      
      expect(results.results.length).toBeGreaterThan(0)
      
      // Todos los resultados deberían ser contenido legal
      const allLegal = results.results.every(result => 
        result.metadata.isLegal
      )
      expect(allLegal).toBe(true)
    })

    test('should handle semantic similarity correctly', async () => {
      // Buscar por sinónimos/conceptos relacionados
      const results1 = await semanticSearch.search('proteger patrimonio')
      const results2 = await semanticSearch.search('protección activos')
      
      expect(results1.results.length).toBeGreaterThan(0)
      expect(results2.results.length).toBeGreaterThan(0)
      
      // Ambas búsquedas deberían encontrar contenido sobre fideicomisos/holdings
      const hasPatrimonialContent1 = results1.results.some(result => 
        result.content.toLowerCase().includes('fideicomiso') ||
        result.content.toLowerCase().includes('holding') ||
        result.content.toLowerCase().includes('protección')
      )
      
      const hasPatrimonialContent2 = results2.results.some(result => 
        result.content.toLowerCase().includes('fideicomiso') ||
        result.content.toLowerCase().includes('holding') ||
        result.content.toLowerCase().includes('activos')
      )
      
      expect(hasPatrimonialContent1).toBe(true)
      expect(hasPatrimonialContent2).toBe(true)
    })

    test('should respect maxResults parameter', async () => {
      const results = await semanticSearch.search('empresa', {
        maxResults: 3
      })
      
      expect(results.results.length).toBeLessThanOrEqual(3)
    })

    test('should filter by references when requested', async () => {
      const results = await semanticSearch.search('ley', {
        withReferences: true
      })
      
      if (results.results.length > 0) {
        // Los resultados deberían tener referencias legales
        const hasReferences = results.results.every(result => 
          result.metadata.hasReferences
        )
        expect(hasReferences).toBe(true)
      }
    })
  })

  describe('text processing', () => {
    test('should tokenize text correctly', () => {
      const text = "La Ley General de Sociedades establece normas."
      const tokens = semanticSearch.tokenize(text)
      
      expect(tokens).toContain('ley')
      expect(tokens).toContain('general')
      expect(tokens).toContain('sociedades')
      expect(tokens).not.toContain('de') // Stop word
    })

    test('should detect legal content', () => {
      const legalText = "El Código Civil artículo 1698 establece..."
      const businessText = "Las ventas aumentaron este trimestre"
      
      expect(semanticSearch.isLegalContent(legalText)).toBe(true)
      expect(semanticSearch.isLegalContent(businessText)).toBe(false)
    })

    test('should detect legal references', () => {
      const textWithRef = "Según la Ley N° 26887..."
      const textWithoutRef = "Las empresas deben cumplir normas"
      
      expect(semanticSearch.hasLegalReferences(textWithRef)).toBe(true)
      expect(semanticSearch.hasLegalReferences(textWithoutRef)).toBe(false)
    })
  })

  describe('similarity calculation', () => {
    test('should calculate cosine similarity correctly', () => {
      const embedding1 = new Map([['empresa', 0.5], ['sociedad', 0.3]])
      const embedding2 = new Map([['empresa', 0.4], ['sociedad', 0.6]])
      
      const similarity = semanticSearch.cosineSimilarity(embedding1, embedding2)
      
      expect(similarity).toBeGreaterThan(0)
      expect(similarity).toBeLessThanOrEqual(1)
    })

    test('should return 0 similarity for completely different embeddings', () => {
      const embedding1 = new Map([['empresa', 0.5]])
      const embedding2 = new Map([['automóvil', 0.5]])
      
      const similarity = semanticSearch.cosineSimilarity(embedding1, embedding2)
      
      expect(similarity).toBe(0)
    })
  })

  describe('statistics', () => {
    test('should provide comprehensive stats', () => {
      const stats = semanticSearch.getStats()
      
      expect(stats).toHaveProperty('isInitialized')
      expect(stats).toHaveProperty('totalDocuments')
      expect(stats).toHaveProperty('totalEmbeddings')
      expect(stats).toHaveProperty('legalDocuments')
      expect(stats).toHaveProperty('documentsWithReferences')
      expect(stats).toHaveProperty('averageWordCount')
      
      expect(typeof stats.averageWordCount).toBe('number')
    })
  })

  describe('error handling', () => {
    test('should handle empty queries gracefully', async () => {
      const results = await semanticSearch.search('')
      
      expect(results.results).toBeDefined()
      expect(Array.isArray(results.results)).toBe(true)
    })

    test('should handle queries with no results', async () => {
      const results = await semanticSearch.search('xyzabc123nonexistent')
      
      expect(results.results).toBeDefined()
      expect(Array.isArray(results.results)).toBe(true)
      // Puede tener 0 resultados o resultados con score muy bajo
    })
  })
})