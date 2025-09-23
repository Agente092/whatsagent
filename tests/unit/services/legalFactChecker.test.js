const LegalFactChecker = require('../../../server/services/legalFactChecker')

// Mock knowledge base
const mockKnowledgeBase = {
  getContext: () => `
    La Ley N° 26887 - Ley General de Sociedades establece las normas para las empresas en Perú.
    El Código Civil artículo 1698 regula los contratos de compraventa.
    Decreto Ley N° 25593 sobre relaciones colectivas de trabajo.
    El artículo 234 del Código Tributario establece las sanciones por evasión fiscal.
    SUNAT es la entidad encargada de la administración tributaria.
    La UIF supervisa las operaciones sospechosas de lavado de dinero.
  `
}

describe('LegalFactChecker', () => {
  let factChecker

  beforeEach(() => {
    factChecker = new LegalFactChecker(mockKnowledgeBase)
  })

  describe('initialization', () => {
    test('should initialize with verified references from knowledge base', () => {
      const stats = factChecker.getFactCheckerStats()
      
      expect(stats.totalVerifiedReferences).toBeGreaterThan(0)
      expect(stats.referencesByType).toBeDefined()
    })
  })

  describe('verifyLegalReferences', () => {
    test('should verify valid legal references', async () => {
      const response = "Según la Ley N° 26887, las sociedades deben cumplir ciertos requisitos."
      const result = await factChecker.verifyLegalReferences(response)
      
      expect(result.isValid).toBe(true)
      expect(result.hasLegalReferences).toBe(true)
      expect(result.verifiedReferences.length).toBeGreaterThan(0)
      expect(result.invalidReferences.length).toBe(0)
    })

    test('should detect invalid legal references', async () => {
      const response = "La Ley N° 99999 establece normas inexistentes."
      const result = await factChecker.verifyLegalReferences(response)
      
      expect(result.isValid).toBe(false)
      expect(result.hasLegalReferences).toBe(true)
      expect(result.invalidReferences.length).toBeGreaterThan(0)
    })

    test('should handle responses without legal references', async () => {
      const response = "Esta es una respuesta general sobre negocios."
      const result = await factChecker.verifyLegalReferences(response)
      
      expect(result.isValid).toBe(true)
      expect(result.hasLegalReferences).toBe(false)
      expect(result.verifiedReferences.length).toBe(0)
      expect(result.invalidReferences.length).toBe(0)
    })

    test('should correct responses with invalid references', async () => {
      const response = "La Ley N° 99999 y la Ley N° 26887 establecen normas."
      const result = await factChecker.verifyLegalReferences(response)
      
      expect(result.correctedResponse).toContain('Ley N° 26887')
      expect(result.correctedResponse).not.toContain('Ley N° 99999')
      expect(result.correctedResponse).toContain('información legal específica disponible en consulta especializada')
    })
  })

  describe('detectLegalReferences', () => {
    test('should detect law references', () => {
      const text = "La Ley N° 26887 y el Decreto Ley N° 25593 son importantes."
      const references = factChecker.detectLegalReferences(text)
      
      expect(references.length).toBe(2)
      expect(references[0].type).toBe('laws')
      expect(references[1].type).toBe('decrees')
    })

    test('should detect article references', () => {
      const text = "El Código Civil artículo 1698 y el art. 234 del Código Tributario."
      const references = factChecker.detectLegalReferences(text)
      
      expect(references.length).toBe(2)
      expect(references.some(ref => ref.type === 'civilCode')).toBe(true)
      expect(references.some(ref => ref.type === 'articles')).toBe(true)
    })
  })

  describe('lookupLegalReference', () => {
    test('should find existing legal references', () => {
      const result = factChecker.lookupLegalReference('Ley N° 26887')
      
      expect(result.found).toBe(true)
      expect(result.reference).toContain('26887')
      expect(result.verified).toBe(true)
    })

    test('should not find non-existing references', () => {
      const result = factChecker.lookupLegalReference('Ley N° 99999')
      
      expect(result.found).toBe(false)
      expect(result.reason).toContain('No encontrado')
    })
  })

  describe('edge cases', () => {
    test('should handle empty responses', async () => {
      const result = await factChecker.verifyLegalReferences('')
      
      expect(result.isValid).toBe(true)
      expect(result.hasLegalReferences).toBe(false)
    })

    test('should handle responses with mixed valid and invalid references', async () => {
      const response = "La Ley N° 26887 es válida pero la Ley N° 99999 no existe."
      const result = await factChecker.verifyLegalReferences(response)
      
      expect(result.verifiedReferences.length).toBe(1)
      expect(result.invalidReferences.length).toBe(1)
      expect(result.isValid).toBe(false)
    })

    test('should handle malformed legal references', async () => {
      const response = "La Ley número veintiséis mil ochocientos ochenta y siete."
      const result = await factChecker.verifyLegalReferences(response)
      
      // Should not detect malformed references
      expect(result.hasLegalReferences).toBe(false)
    })
  })
})