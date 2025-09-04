/**
 * 📦 INVENTORY SERVICE PARA SUPABASE
 * 
 * Servicio de inventario migrado a Supabase
 * Mantiene compatibilidad total con APIs existentes
 * Mejora búsquedas con sistema avanzado
 * 
 * @author Agentes 413 - Sistema AromaFlow V10
 */

import supabaseDatabaseService from './supabase-database.js'
import advancedSearchService from './advanced-search.js'

export class SupabaseInventoryService {
  constructor() {
    this.db = supabaseDatabaseService
    this.search = advancedSearchService
  }

  /**
   * 📦 Obtener todos los productos (SIMPLIFICADO - tabla unificada)
   * @param {Object} options - Opciones de filtrado
   */
  async getAllProducts(options = {}) {
    try {
      const { 
        respectSpecificRequest = false, 
        requestContext = '', 
        forceFullInventory = false,
        includeVip = true,
        onlyVip = false,
        applyVipRestrictions = false
      } = options

      console.log(`📦 Obteniendo productos (UNIFICADO) - VIP: ${includeVip}, Solo VIP: ${onlyVip}, Restricciones: ${applyVipRestrictions}`)

      // 🌟 CONSULTA UNIFICADA simplificada
      const productos = await this.db.getAllProducts({
        includeVip,
        onlyVip,
        onlyActive: true,
        applyVipRestrictions: !forceFullInventory && applyVipRestrictions
      })

      // 📦 FORZAR INVENTARIO COMPLETO: Sin restricciones
      if (forceFullInventory) {
        console.log(`📦 INVENTARIO COMPLETO FORZADO: ${productos.length} productos (sin restricciones VIP)`)
        return productos
      }

      console.log(`📦 Productos obtenidos (TABLA UNIFICADA): ${productos.length} productos`)
      return productos

    } catch (error) {
      console.error('Error obteniendo productos unificados:', error)
      throw new Error('Error al obtener el inventario')
    }
  }

  /**
   * 🌟 Obtener inventario combinado (DEPRECADO - ahora todo es unificado)
   * @deprecated Usar getAllProducts() con includeVip=true
   */
  async getAllProductsWithVip() {
    console.warn('⚠️ getAllProductsWithVip() está DEPRECADO. Usar getAllProducts({ includeVip: true })')
    
    // Redirigir a método unificado
    return this.getAllProducts({ 
      includeVip: true,
      applyVipRestrictions: false // Sin restricciones para mantener comportamiento anterior
    })
  }

  /**
   * 🔍 Obtener producto por ID
   */
  async getProductById(id) {
    try {
      return await this.db.getProductById(id)
    } catch (error) {
      console.error('Error obteniendo producto por ID:', error)
      throw new Error('Error al obtener el producto')
    }
  }

  /**
   * 📂 Obtener productos por categoría
   */
  async getProductsByCategory(category) {
    try {
      return await this.search.searchByCategory(category)
    } catch (error) {
      console.error('Error obteniendo productos por categoría:', error)
      throw new Error('Error al obtener productos por categoría')
    }
  }

  /**
   * ➕ Crear nuevo producto (soporta VIP)
   */
  async addProduct(productData) {
    try {
      // Validaciones básicas
      if (!productData.nombre || !productData.precio) {
        throw new Error('Nombre y precio son requeridos')
      }

      if (productData.precio < 0) {
        throw new Error('El precio no puede ser negativo')
      }

      if (productData.stock < 0) {
        throw new Error('El stock no puede ser negativo')
      }

      // 🌟 SOPORTE PARA PRODUCTOS VIP
      const isVip = productData.es_vip || productData.esVip || false
      
      const newProductData = {
        nombre: productData.nombre.trim(),
        descripcion: productData.descripcion?.trim() || '',
        precio: parseFloat(productData.precio),
        stock: parseInt(productData.stock) || 0,
        categoria: productData.categoria?.trim() || 'General',
        imagen_url: productData.imagen_url?.trim() || productData.imagenUrl?.trim(),
        destacado: Boolean(productData.destacado),
        activo: true,
        // 🌟 CAMPOS VIP
        es_vip: isVip,
        precio_vip: isVip ? productData.precio_vip || productData.precio : null,
        precio_original: isVip ? productData.precio_original || productData.precio : null,
        stock_vip: isVip ? productData.stock_vip || productData.stock : null,
        limite_por_cliente: isVip ? productData.limite_por_cliente : null,
        fecha_inicio_vip: isVip ? productData.fecha_inicio_vip : null,
        fecha_fin_vip: isVip ? productData.fecha_fin_vip : null,
        producto_original_id: isVip ? productData.producto_original_id : null
      }

      const result = await this.db.addProduct(newProductData)
      
      if (isVip) {
        console.log(`🌟 Producto VIP creado: ${result.nombre} (ID: ${result.id})`)
      } else {
        console.log(`📦 Producto regular creado: ${result.nombre} (ID: ${result.id})`)
      }
      
      return result
    } catch (error) {
      console.error('Error creando producto:', error)
      throw new Error('Error al crear producto: ' + error.message)
    }
  }

  /**
   * ✏️ Actualizar producto
   */
  async updateProduct(id, productData) {
    try {
      // Validar que el producto existe
      const existingProduct = await this.getProductById(id)
      if (!existingProduct) {
        throw new Error('Producto no encontrado')
      }

      // Validaciones
      if (productData.precio !== undefined && productData.precio < 0) {
        throw new Error('El precio no puede ser negativo')
      }

      if (productData.stock !== undefined && productData.stock < 0) {
        throw new Error('El stock no puede ser negativo')
      }

      // Preparar datos de actualización
      const updateData = {}
      
      if (productData.nombre !== undefined) {
        updateData.nombre = productData.nombre.trim()
      }
      if (productData.descripcion !== undefined) {
        updateData.descripcion = productData.descripcion?.trim() || null
      }
      if (productData.precio !== undefined) {
        updateData.precio = parseFloat(productData.precio)
      }
      if (productData.stock !== undefined) {
        updateData.stock = parseInt(productData.stock)
      }
      if (productData.categoria !== undefined) {
        updateData.categoria = productData.categoria?.trim() || null
      }
      if (productData.imagen_url !== undefined) {
        updateData.imagen_url = productData.imagen_url?.trim() || null
      }
      if (productData.destacado !== undefined) {
        updateData.destacado = Boolean(productData.destacado)
      }
      if (productData.activo !== undefined) {
        updateData.activo = Boolean(productData.activo)
      }

      return await this.db.updateProduct(id, updateData)
    } catch (error) {
      console.error('Error actualizando producto:', error)
      throw new Error('Error al actualizar producto: ' + error.message)
    }
  }

  /**
   * 🗑️ Eliminar producto (soft delete)
   */
  async deleteProduct(id) {
    try {
      // Validar que el producto existe
      const existingProduct = await this.getProductById(id)
      if (!existingProduct) {
        throw new Error('Producto no encontrado')
      }

      return await this.db.deleteProduct(id)
    } catch (error) {
      console.error('Error eliminando producto:', error)
      throw new Error('Error al eliminar producto: ' + error.message)
    }
  }

  /**
   * 🔍 Buscar productos (UNIFICADO - incluye VIP automáticamente)
   */
  async searchProducts(searchTerm, options = {}) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return await this.getAllProducts(options)
      }

      const { 
        includeVip = true, 
        onlyVip = false,
        limit = 20
      } = options

      console.log(`🔍 Búsqueda unificada: "${searchTerm}" (incluir VIP: ${includeVip})`)

      // Usar búsqueda unificada de la base de datos
      const results = await this.db.searchProducts(searchTerm.trim(), {
        includeVip,
        onlyVip,
        limit,
        soloActivos: true
      })

      console.log(`✅ Búsqueda completada: ${results.length} productos encontrados`)
      return results

    } catch (error) {
      console.error('Error buscando productos unificados:', error)
      throw new Error('Error al buscar productos')
    }
  }

  /**
   * ⭐ Obtener productos destacados (incluye VIP)
   */
  async getFeaturedProducts() {
    try {
      const productos = await this.getAllProducts({ includeVip: true })
      
      // Filtrar productos destacados (priorizar VIP)
      const destacados = productos
        .filter(producto => 
          producto.destacado || 
          producto.es_vip || // Los VIP son destacados por defecto
          producto.nombre?.includes('⭐') ||
          producto.descripcion?.includes('⭐')
        )
        .sort((a, b) => {
          // Ordenar: VIP primero, luego destacados regulares
          if (a.es_vip && !b.es_vip) return -1
          if (!a.es_vip && b.es_vip) return 1
          if (a.destacado && !b.destacado) return -1
          if (!a.destacado && b.destacado) return 1
          return a.nombre.localeCompare(b.nombre)
        })
        .slice(0, 8) // Top 8 productos destacados

      console.log(`⭐ Productos destacados obtenidos: ${destacados.length} (${destacados.filter(p => p.es_vip).length} VIP)`)
      return destacados

    } catch (error) {
      console.error('Error obteniendo productos destacados:', error)
      throw new Error('Error al obtener productos destacados')
    }
  }

  /**
   * 📂 Obtener categorías
   */
  async getCategories() {
    try {
      return await this.db.getCategories()
    } catch (error) {
      console.error('Error obteniendo categorías:', error)
      throw new Error('Error al obtener categorías')
    }
  }

  /**
   * ⭐ Marcar/desmarcar producto como destacado
   */
  async toggleFeatured(id) {
    try {
      const product = await this.getProductById(id)
      if (!product) {
        throw new Error('Producto no encontrado')
      }

      return await this.updateProduct(id, {
        destacado: !product.destacado
      })
    } catch (error) {
      console.error('Error cambiando estado destacado:', error)
      throw new Error('Error al cambiar estado destacado')
    }
  }

  /**
   * 📊 Actualizar stock
   */
  async updateStock(id, newStock) {
    try {
      if (newStock < 0) {
        throw new Error('El stock no puede ser negativo')
      }

      return await this.updateProduct(id, {
        stock: parseInt(newStock)
      })
    } catch (error) {
      console.error('Error actualizando stock:', error)
      throw new Error('Error al actualizar stock')
    }
  }

  /**
   * 📊 Reducir stock (para ventas)
   */
  async reduceStock(id, quantity) {
    try {
      const product = await this.getProductById(id)
      if (!product) {
        throw new Error('Producto no encontrado')
      }

      const newStock = product.stock - quantity
      if (newStock < 0) {
        throw new Error('Stock insuficiente')
      }

      return await this.updateStock(id, newStock)
    } catch (error) {
      console.error('Error reduciendo stock:', error)
      throw new Error('Error al reducir stock')
    }
  }

  /**
   * 📊 Obtener productos con stock bajo
   */
  async getLowStockProducts(threshold = 5) {
    try {
      const { data, error } = await this.db.client
        .from('productos')
        .select('*')
        .eq('activo', true)
        .lte('stock', threshold)
        .order('stock')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error obteniendo productos con stock bajo:', error)
      throw new Error('Error al obtener productos con stock bajo')
    }
  }

  /**
   * 🔍 Búsqueda avanzada con filtros
   */
  async advancedSearch(searchTerm, filters = {}) {
    try {
      return await this.search.searchProducts(searchTerm, {
        limit: filters.limit || 20,
        categoryFilter: filters.category,
        priceRange: filters.priceRange,
        sortBy: filters.sortBy || 'relevance',
        includeInactive: filters.includeInactive || false
      })
    } catch (error) {
      console.error('Error en búsqueda avanzada:', error)
      throw new Error('Error en búsqueda avanzada')
    }
  }

  /**
   * 💡 Obtener sugerencias de búsqueda
   */
  async getSearchSuggestions(partialTerm) {
    try {
      return await this.search.getSearchSuggestions(partialTerm)
    } catch (error) {
      console.error('Error obteniendo sugerencias:', error)
      return []
    }
  }

  /**
   * 📊 Estadísticas del inventario
   */
  async getInventoryStats() {
    try {
      const { data, error } = await this.db.client
        .from('productos')
        .select('activo, destacado, stock, precio')
        .eq('activo', true)

      if (error) throw error

      const products = data || []
      
      return {
        totalProducts: products.length,
        featuredProducts: products.filter(p => p.destacado).length,
        totalValue: products.reduce((sum, p) => sum + (p.precio * p.stock), 0),
        lowStockProducts: products.filter(p => p.stock <= 5).length,
        outOfStockProducts: products.filter(p => p.stock === 0).length,
        averagePrice: products.length > 0 
          ? products.reduce((sum, p) => sum + p.precio, 0) / products.length 
          : 0
      }
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error)
      throw new Error('Error al obtener estadísticas del inventario')
    }
  }

  /**
   * 📊 Obtener conteo total de productos activos
   */
  async getProductCount() {
    try {
      const products = await this.db.getAllProducts()
      return products.filter(p => p.activo !== false).length
    } catch (error) {
      console.error('Error obteniendo conteo de productos:', error)
      throw new Error('Error al obtener el conteo de productos')
    }
  }

  /**
   * ⭐ Obtener productos destacados
   */
  async getDestacados(limit = 5) {
    try {
      const productos = await this.db.getAllProducts()

      // Filtrar productos destacados (con estrella)
      const destacados = productos.filter(producto =>
        producto.destacado === true ||
        producto.destacado === 'true' ||
        producto.nombre?.includes('⭐') ||
        producto.descripcion?.includes('⭐')
      )

      // Si no hay suficientes destacados, completar con productos populares
      if (destacados.length < limit) {
        const noDestacados = productos.filter(producto =>
          !destacados.some(d => d.id === producto.id)
        )

        // Ordenar por popularidad (stock bajo = más popular)
        noDestacados.sort((a, b) => {
          const stockA = parseInt(a.stock) || 0
          const stockB = parseInt(b.stock) || 0
          return stockA - stockB
        })

        destacados.push(...noDestacados.slice(0, limit - destacados.length))
      }

      return destacados.slice(0, limit)
    } catch (error) {
      console.error('Error obteniendo productos destacados:', error)
      return []
    }
  }

  // =====================================================
  // 🎆 MÉTODOS NUEVOS PARA TABLA UNIFICADA
  // =====================================================

  /**
   * 🌟 Obtener solo productos VIP activos y vigentes
   */
  async getProductosVipOnly() {
    try {
      console.log('🌟 Obteniendo SOLO productos VIP...')
      
      return this.getAllProducts({ 
        includeVip: true,
        onlyVip: true,
        applyVipRestrictions: false
      })
    } catch (error) {
      console.error('Error obteniendo solo productos VIP:', error)
      throw new Error('Error al obtener productos VIP')
    }
  }

  /**
   * 📦 Obtener solo productos regulares (sin VIP)
   */
  async getProductosRegularesOnly() {
    try {
      console.log('📦 Obteniendo SOLO productos regulares...')
      
      return this.getAllProducts({ 
        includeVip: false,
        onlyVip: false,
        applyVipRestrictions: false
      })
    } catch (error) {
      console.error('Error obteniendo solo productos regulares:', error)
      throw new Error('Error al obtener productos regulares')
    }
  }

  /**
   * 🌟 Buscar solo en productos VIP
   */
  async searchProductosVip(searchTerm) {
    try {
      console.log(`🌟 Búsqueda VIP específica: "${searchTerm}"`)
      
      return this.searchProducts(searchTerm, {
        includeVip: true,
        onlyVip: true,
        limit: 10
      })
    } catch (error) {
      console.error('Error buscando productos VIP:', error)
      throw new Error('Error al buscar productos VIP')
    }
  }

  /**
   * 🌟 Crear producto VIP desde producto existente
   */
  async createProductoVip(productoOriginalId, vipData) {
    try {
      console.log(`🌟 Creando producto VIP desde producto ${productoOriginalId}`)
      
      return await this.db.createProductoVipUnificado(productoOriginalId, vipData)
    } catch (error) {
      console.error('Error creando producto VIP:', error)
      throw new Error('Error al crear producto VIP: ' + error.message)
    }
  }

  /**
   * 💰 Obtener productos con descuentos (VIP con precio_original diferente)
   */
  async getProductosConDescuento() {
    try {
      const productos = await this.getAllProducts({ includeVip: true })
      
      const conDescuento = productos
        .filter(producto => 
          producto.es_vip && 
          producto.precio_original && 
          producto.precio_vip &&
          producto.precio_original > producto.precio_vip
        )
        .map(producto => ({
          ...producto,
          descuento_porcentaje: Math.round(
            ((producto.precio_original - producto.precio_vip) / producto.precio_original) * 100
          ),
          ahorro: producto.precio_original - producto.precio_vip
        }))
        .sort((a, b) => b.descuento_porcentaje - a.descuento_porcentaje) // Mayor descuento primero

      console.log(`💰 Productos con descuento: ${conDescuento.length}`)
      return conDescuento

    } catch (error) {
      console.error('Error obteniendo productos con descuento:', error)
      throw new Error('Error al obtener productos con descuento')
    }
  }
}

// Instancia singleton
const supabaseInventoryService = new SupabaseInventoryService()

export default supabaseInventoryService
