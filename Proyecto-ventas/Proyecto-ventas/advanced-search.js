/**
 * 🔍 SERVICIO DE BÚSQUEDA AVANZADA
 * 
 * Sistema inteligente de búsqueda para productos
 * Utiliza capacidades avanzadas de PostgreSQL en Supabase
 * Mejora significativa en detección de productos
 * 
 * @author Agentes 413 - Sistema AromaFlow V10
 */

import supabaseDatabaseService from './supabase-database.js'

class AdvancedSearchService {
  constructor() {
    this.db = supabaseDatabaseService
    // 🔥 CACHE ELIMINADO - Datos siempre frescos
  }

  /**
   * 🔍 Búsqueda inteligente principal
   * Combina múltiples técnicas de búsqueda
   */
  async searchProducts(searchTerm, options = {}) {
    try {
      const {
        limit = 20,
        includeInactive = false,
        categoryFilter = null,
        priceRange = null,
        sortBy = 'relevance'
      } = options

      // 🔥 CACHE ELIMINADO - Búsqueda directa siempre

      // Normalizar término de búsqueda
      const normalizedTerm = this.normalizeSearchTerm(searchTerm)

      // Realizar búsqueda inteligente (DATOS FRESCOS)
      let results = await this.performIntelligentSearch(normalizedTerm, {
        limit,
        includeInactive,
        categoryFilter,
        priceRange
      })

      // Aplicar ordenamiento
      results = this.applySorting(results, sortBy)

      console.log(`🔍 Búsqueda completada SIN CACHE: "${searchTerm}" → ${results.length} resultados`)
      return results

    } catch (error) {
      console.error('Error en búsqueda avanzada:', error)
      
      // Fallback a búsqueda simple
      return await this.fallbackSearch(searchTerm, options)
    }
  }

  /**
   * 🧠 Búsqueda inteligente con múltiples estrategias
   */
  async performIntelligentSearch(searchTerm, options) {
    const { limit, includeInactive, categoryFilter, priceRange } = options

    try {
      // Estrategia 1: Usar función PostgreSQL personalizada
      const { data, error } = await this.db.client
        .rpc('buscar_productos_inteligente', {
          termino_busqueda: searchTerm,
          limite: limit,
          solo_activos: !includeInactive
        })

      if (error) throw error

      let results = data || []

      // Aplicar filtros adicionales
      if (categoryFilter) {
        results = results.filter(product => 
          product.categoria && 
          product.categoria.toLowerCase().includes(categoryFilter.toLowerCase())
        )
      }

      if (priceRange) {
        results = results.filter(product => 
          product.precio >= priceRange.min && 
          product.precio <= priceRange.max
        )
      }

      return results

    } catch (error) {
      console.error('Error en búsqueda inteligente:', error)
      throw error
    }
  }

  /**
   * 🔄 Búsqueda de respaldo (fallback)
   */
  async fallbackSearch(searchTerm, options) {
    try {
      console.log('🔄 Usando búsqueda de respaldo para:', searchTerm)
      
      const { limit = 20, includeInactive = false } = options
      
      let query = this.db.client
        .from('productos')
        .select('*')

      if (!includeInactive) {
        query = query.eq('activo', true)
      }

      // Búsqueda simple con ILIKE
      query = query.or(
        `nombre.ilike.%${searchTerm}%,` +
        `descripcion.ilike.%${searchTerm}%,` +
        `categoria.ilike.%${searchTerm}%`
      )

      query = query
        .order('destacado', { ascending: false })
        .order('nombre')
        .limit(limit)

      const { data, error } = await query

      if (error) throw error
      return data || []

    } catch (error) {
      console.error('Error en búsqueda de respaldo:', error)
      return []
    }
  }

  /**
   * 🔤 Normalizar término de búsqueda
   */
  normalizeSearchTerm(term) {
    if (!term) return ''
    
    return term
      .toLowerCase()
      .trim()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
  }

  /**
   * 📊 Aplicar ordenamiento a resultados
   */
  applySorting(results, sortBy) {
    switch (sortBy) {
      case 'relevance':
        return results.sort((a, b) => (b.relevancia || 0) - (a.relevancia || 0))
      
      case 'name':
        return results.sort((a, b) => a.nombre.localeCompare(b.nombre))
      
      case 'price_asc':
        return results.sort((a, b) => a.precio - b.precio)
      
      case 'price_desc':
        return results.sort((a, b) => b.precio - a.precio)
      
      case 'featured':
        return results.sort((a, b) => {
          if (a.destacado && !b.destacado) return -1
          if (!a.destacado && b.destacado) return 1
          return (b.relevancia || 0) - (a.relevancia || 0)
        })
      
      default:
        return results
    }
  }

  /**
   * 🔥 MÉTODOS DE CACHE ELIMINADOS - Ya no son necesarios
   * Los datos siempre se obtienen frescos de Supabase
   */

  /**
   * 🔍 Búsqueda por categoría
   */
  async searchByCategory(category, options = {}) {
    try {
      const { limit = 20, includeInactive = false } = options

      let query = this.db.client
        .from('productos')
        .select('*')
        .ilike('categoria', `%${category}%`)

      if (!includeInactive) {
        query = query.eq('activo', true)
      }

      query = query
        .order('destacado', { ascending: false })
        .order('nombre')
        .limit(limit)

      const { data, error } = await query

      if (error) throw error
      return data || []

    } catch (error) {
      console.error('Error buscando por categoría:', error)
      return []
    }
  }

  /**
   * 🔍 Búsqueda por rango de precio
   */
  async searchByPriceRange(minPrice, maxPrice, options = {}) {
    try {
      const { limit = 20, includeInactive = false } = options

      let query = this.db.client
        .from('productos')
        .select('*')
        .gte('precio', minPrice)
        .lte('precio', maxPrice)

      if (!includeInactive) {
        query = query.eq('activo', true)
      }

      query = query
        .order('precio')
        .limit(limit)

      const { data, error } = await query

      if (error) throw error
      return data || []

    } catch (error) {
      console.error('Error buscando por precio:', error)
      return []
    }
  }

  /**
   * 🔍 Sugerencias de búsqueda
   */
  async getSearchSuggestions(partialTerm, limit = 5) {
    try {
      if (!partialTerm || partialTerm.length < 2) return []

      const { data, error } = await this.db.client
        .from('productos')
        .select('nombre, categoria')
        .eq('activo', true)
        .or(`nombre.ilike.%${partialTerm}%,categoria.ilike.%${partialTerm}%`)
        .limit(limit * 2) // Obtener más para filtrar

      if (error) throw error

      // Extraer sugerencias únicas
      const suggestions = new Set()
      
      data.forEach(product => {
        // Agregar nombre si coincide
        if (product.nombre.toLowerCase().includes(partialTerm.toLowerCase())) {
          suggestions.add(product.nombre)
        }
        
        // Agregar categoría si coincide
        if (product.categoria && 
            product.categoria.toLowerCase().includes(partialTerm.toLowerCase())) {
          suggestions.add(product.categoria)
        }
      })

      return Array.from(suggestions).slice(0, limit)

    } catch (error) {
      console.error('Error obteniendo sugerencias:', error)
      return []
    }
  }

  /**
   * 📊 Estadísticas de búsqueda
   */
  getSearchStats() {
    return {
      cacheSize: this.searchCache.size,
      cacheTimeout: this.cacheTimeout,
      lastCleared: this.lastCacheCleared || null
    }
  }
}

// Instancia singleton
const advancedSearchService = new AdvancedSearchService()

export default advancedSearchService
