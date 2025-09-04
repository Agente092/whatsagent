/**
 * 🗄️ SUPABASE DATABASE SERVICE
 *
 * Servicio de base de datos migrado de SQLite a Supabase
 * Mantiene compatibilidad total con APIs existentes
 * Mejora significativa en búsquedas y performance
 *
 * @author Agentes 413 - Sistema AromaFlow V10
 */

import dotenv from 'dotenv'
// 🔧 CARGAR VARIABLES DE ENTORNO
dotenv.config()

import { supabase, supabaseAdmin, initializeSupabase } from '../config/supabase.js'

class SupabaseDatabaseService {
  constructor() {
    this.client = supabase
    this.adminClient = supabaseAdmin
    this.initialized = false
  }

  /**
   * 🚀 Inicializar conexión Supabase
   */
  async initialize() {
    try {
      console.log('🗄️ Inicializando Supabase Database Service...')
      
      // Inicializar Supabase
      const success = await initializeSupabase()
      if (!success) {
        throw new Error('No se pudo inicializar Supabase')
      }

      // Verificar tablas principales
      await this.verifyTables()
      
      this.initialized = true
      console.log('✅ Supabase Database Service inicializado correctamente')
      
    } catch (error) {
      console.error('❌ Error inicializando Supabase Database Service:', error)
      throw error
    }
  }

  /**
   * 🔍 Verificar que las tablas existan
   */
  async verifyTables() {
    const tables = [
      'productos', 'pedidos', 'mensajes', 'configuracion',
      'estadisticas_ventas', 'clientes_recurrentes',
      'admin_codes', 'admin_sessions'
    ]

    for (const table of tables) {
      const { data, error } = await this.client
        .from(table)
        .select('*')
        .limit(1)

      if (error && error.code !== 'PGRST116') { // PGRST116 = tabla vacía
        console.warn(`⚠️ Tabla ${table} no encontrada o error:`, error.message)
      }
    }
  }

  /**
   * 📦 MÉTODOS PARA PRODUCTOS
   */

  // Obtener todos los productos (UNIFICADO - incluye filtros VIP)
  async getAllProducts(options = {}) {
    return this.executeWithRetry(async () => {
      const { 
        includeVip = true, 
        onlyVip = false, 
        onlyActive = true,
        applyVipRestrictions = false 
      } = options

      let query = this.client
        .from('productos')
        .select(`
          id, nombre, descripcion, precio, precio_vip, precio_original,
          stock, stock_vip, categoria, imagen_url, destacado, es_vip, activo,
          limite_por_cliente, fecha_inicio_vip, fecha_fin_vip,
          fecha_creacion, fecha_actualizacion
        `)

      if (onlyActive) {
        query = query.eq('activo', true)
      }

      if (onlyVip) {
        query = query.eq('es_vip', true)
      } else if (!includeVip) {
        query = query.eq('es_vip', false)
      }

      const { data, error } = await query
        .order('destacado', { ascending: false })
        .order('es_vip', { ascending: false }) // VIP primero
        .order('nombre')

      if (error) throw error

      let productos = data || []

      // 🎯 APLICAR RESTRICCIONES VIP si se solicita
      if (applyVipRestrictions && includeVip) {
        const productosVipActivos = productos.filter(p => 
          p.es_vip && 
          p.activo &&
          (!p.fecha_inicio_vip || new Date(p.fecha_inicio_vip) <= new Date()) &&
          (!p.fecha_fin_vip || new Date(p.fecha_fin_vip) >= new Date())
        )

        if (productosVipActivos.length > 0) {
          // Ocultar productos regulares que tienen versión VIP activa
          const productosOriginalesConVip = productosVipActivos
            .filter(vip => vip.producto_original_id)
            .map(vip => vip.producto_original_id)

          productos = productos.filter(producto => 
            producto.es_vip || !productosOriginalesConVip.includes(producto.id)
          )

          console.log(`🚫 Restricciones VIP aplicadas: ${productosOriginalesConVip.length} productos regulares ocultos`)
        }
      }

      console.log(`📦 Productos obtenidos (UNIFICADO): ${productos.length} productos`)
      return productos

    }, 'getAllProducts')
  }

  // Obtener producto por ID
  async getProductById(id) {
    try {
      const { data, error } = await this.client
        .from('productos')
        .select('*')
        .eq('id', id)
        .eq('activo', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      return data
    } catch (error) {
      console.error('Error obteniendo producto por ID:', error)
      throw new Error('Error al obtener producto')
    }
  }

  // Buscar productos (UNIFICADO - incluye VIP y regulares)
  async searchProducts(searchTerm, options = {}) {
    try {
      const { 
        includeVip = true, 
        onlyVip = false, 
        limit = 20, 
        soloActivos = true 
      } = options

      console.log(`🔍 Búsqueda unificada: "${searchTerm}" (VIP: ${includeVip}, Solo VIP: ${onlyVip})`)

      // 🌟 USAR FUNCIÓN DE BÚSQUEDA UNIFICADA si está disponible
      try {
        const { data, error } = await this.client
          .rpc('buscar_productos_unificados', {
            termino_busqueda: searchTerm,
            incluir_vip: includeVip,
            solo_activos: soloActivos,
            limite: limit
          })

        if (!error && data) {
          console.log(`✅ Búsqueda unificada completada: ${data?.length || 0} productos encontrados`)
          return data || []
        }
      } catch (funcError) {
        console.warn('⚠️ Función unificada no disponible, usando búsqueda fallback:', funcError.message)
      }
      
      // FALLBACK: Búsqueda directa en tabla productos
      let query = this.client
        .from('productos')
        .select(`
          id, nombre, descripcion, precio, precio_vip, precio_original, stock, stock_vip,
          categoria, imagen_url, es_vip, destacado, activo, limite_por_cliente,
          fecha_inicio_vip, fecha_fin_vip
        `)
        .or(`nombre.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%,categoria.ilike.%${searchTerm}%`)

      if (soloActivos) {
        query = query.eq('activo', true)
      }

      if (onlyVip) {
        query = query.eq('es_vip', true)
      } else if (!includeVip) {
        query = query.eq('es_vip', false)
      }

      const { data: fallbackData, error: fallbackError } = await query
        .order('destacado', { ascending: false })
        .order('es_vip', { ascending: false }) // VIP primero
        .order('nombre')
        .limit(limit)

      if (fallbackError) throw fallbackError

      console.log(`✅ Búsqueda fallback completada: ${fallbackData?.length || 0} productos encontrados`)
      return fallbackData || []

    } catch (error) {
      console.error('Error en búsqueda unificada:', error)
      throw new Error('Error al buscar productos')
    }
  }

  // Agregar producto
  async addProduct(productData) {
    try {
      const { data, error } = await this.adminClient
        .from('productos')
        .insert([productData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error agregando producto:', error)
      throw new Error('Error al agregar producto')
    }
  }

  // Actualizar producto
  async updateProduct(id, productData) {
    try {
      const { data, error } = await this.adminClient
        .from('productos')
        .update(productData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // 🔄 ACTUALIZAR BÚSQUEDA SEMÁNTICA
      if (this.semanticSearchService) {
        try {
          await this.semanticSearchService.updateProduct(data)
          console.log(`🔄 Búsqueda semántica actualizada para producto: ${data.nombre}`)
        } catch (semanticError) {
          console.error('⚠️ Error actualizando búsqueda semántica:', semanticError)
        }
      }

      return data
    } catch (error) {
      console.error('Error actualizando producto:', error)
      throw new Error('Error al actualizar producto')
    }
  }

  // Eliminar producto (soft delete)
  async deleteProduct(id) {
    try {
      const { data, error } = await this.adminClient
        .from('productos')
        .update({ activo: false })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error eliminando producto:', error)
      throw new Error('Error al eliminar producto')
    }
  }

  // Obtener productos destacados
  async getFeaturedProducts() {
    try {
      const { data, error } = await this.client
        .from('productos')
        .select('*')
        .eq('activo', true)
        .eq('destacado', true)
        .order('nombre')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error obteniendo productos destacados:', error)
      throw new Error('Error al obtener productos destacados')
    }
  }

  // Obtener categorías
  async getCategories() {
    try {
      const { data, error } = await this.client
        .from('productos')
        .select('categoria')
        .eq('activo', true)
        .not('categoria', 'is', null)

      if (error) throw error
      
      // Extraer categorías únicas
      const categories = [...new Set(data.map(item => item.categoria))]
        .filter(cat => cat && cat.trim())
        .sort()

      return categories
    } catch (error) {
      console.error('Error obteniendo categorías:', error)
      throw new Error('Error al obtener categorías')
    }
  }

  /**
   * 🛒 MÉTODOS PARA PEDIDOS
   */

  // Crear pedido
  async createOrder(orderData) {
    try {
      const { data, error } = await this.adminClient
        .from('pedidos')
        .insert([orderData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creando pedido:', error)
      throw new Error('Error al crear pedido')
    }
  }

  // Obtener pedido por ID
  async getOrderById(id) {
    try {
      const { data, error } = await this.client
        .from('pedidos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      return data
    } catch (error) {
      console.error('Error obteniendo pedido:', error)
      throw new Error('Error al obtener pedido')
    }
  }

  // Actualizar pedido
  async updateOrder(id, orderData) {
    try {
      const { data, error } = await this.adminClient
        .from('pedidos')
        .update(orderData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error actualizando pedido:', error)
      throw new Error('Error al actualizar pedido')
    }
  }

  // Obtener pedidos por cliente
  async getOrdersByClient(clientWhatsapp) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from('pedidos')
        .select('*')
        .eq('cliente_whatsapp', clientWhatsapp)
        .order('fecha_creacion', { ascending: false })

      if (error) throw error

      // Normalizar datos para compatibilidad con frontend
      const normalizedData = data?.map(order => ({
        ...order,
        productos: order.productos_json || [] // Frontend espera 'productos'
      })) || []

      return normalizedData
    }, 'getOrdersByCustomer')
  }

  // Obtener todos los pedidos
  async getAllOrders() {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from('pedidos')
        .select('*')
        .order('fecha_creacion', { ascending: false })

      if (error) throw error

      // Normalizar datos para compatibilidad con frontend
      const normalizedData = data?.map(order => ({
        ...order,
        productos: order.productos_json || [] // Frontend espera 'productos'
      })) || []

      return normalizedData
    }, 'getAllOrders')
  }

  /**
   * 📨 MÉTODOS PARA MENSAJES
   */

  // Guardar mensaje
  async saveMessage(messageData) {
    try {
      const { data, error } = await this.adminClient
        .from('mensajes')
        .insert([messageData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error guardando mensaje:', error)
      throw new Error('Error al guardar mensaje')
    }
  }

  // Obtener mensajes por cliente
  async getMessagesByClient(clientWhatsapp, limit = 50) {
    try {
      const { data, error } = await this.client
        .from('mensajes')
        .select('*')
        .eq('cliente_whatsapp', clientWhatsapp)
        .order('fecha', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error obteniendo mensajes:', error)
      throw new Error('Error al obtener mensajes')
    }
  }

  /**
   * ⚙️ MÉTODOS PARA CONFIGURACIÓN
   */

  // Obtener configuración
  async getConfig(key) {
    try {
      const { data, error } = await this.client
        .from('configuracion')
        .select('valor, tipo')
        .eq('clave', key)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      // Convertir valor según tipo
      if (data.tipo === 'number') return parseFloat(data.valor)
      if (data.tipo === 'boolean') return data.valor === 'true'
      if (data.tipo === 'json') return JSON.parse(data.valor)
      return data.valor
    } catch (error) {
      console.error('Error obteniendo configuración:', error)
      return null
    }
  }

  // Establecer configuración
  async setConfig(key, value, description = '', type = 'string') {
    try {
      let valorString = value
      if (type === 'json') valorString = JSON.stringify(value)
      if (type === 'boolean') valorString = value.toString()
      if (type === 'number') valorString = value.toString()

      const { data, error } = await this.adminClient
        .from('configuracion')
        .upsert([{
          clave: key,
          valor: valorString,
          descripcion: description,
          tipo: type
        }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error estableciendo configuración:', error)
      throw new Error('Error al establecer configuración')
    }
  }

  // Obtener toda la configuración
  async getAllConfig() {
    try {
      const { data, error } = await this.client
        .from('configuracion')
        .select('*')
        .order('clave', { ascending: true })

      if (error) throw error

      // Convertir a objeto clave-valor como espera el frontend
      const config = {}

      if (data && Array.isArray(data)) {
        data.forEach(item => {
        let valor = item.valor

        // Convertir valor según tipo
        if (item.tipo === 'number') valor = parseFloat(valor)
        else if (item.tipo === 'boolean') valor = valor === 'true'
        else if (item.tipo === 'json') {
          try {
            valor = JSON.parse(valor)
          } catch (e) {
            console.warn(`Error parsing JSON for ${item.clave}:`, e)
          }
        }

        config[item.clave] = valor
        })
      }

      return config
    } catch (error) {
      console.error('Error obteniendo toda la configuración:', error)
      return {}
    }
  }

  /**
   * 📊 MÉTODOS PARA ESTADÍSTICAS
   */

  // Agregar estadística de venta
  async addSaleStatistic(statData) {
    try {
      const { data, error } = await this.adminClient
        .from('estadisticas_ventas')
        .insert([statData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error agregando estadística:', error)
      throw new Error('Error al agregar estadística')
    }
  }

  // Obtener estadísticas de ventas
  async getSalesStatistics(startDate = null, endDate = null) {
    try {
      let query = this.client
        .from('estadisticas_ventas')
        .select('*')
        .order('fecha_venta', { ascending: false })

      if (startDate) {
        query = query.gte('fecha_venta', startDate)
      }
      if (endDate) {
        query = query.lte('fecha_venta', endDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error)
      throw new Error('Error al obtener estadísticas')
    }
  }

  // Obtener historial de ventas con paginación y filtros
  async getHistorialVentas(filtros = {}) {
    try {
      const {
        pagina = 1,
        limite = 20,
        fechaInicio,
        fechaFin,
        clienteWhatsapp,
        productoNombre,
        montoMin,
        montoMax,
        campo = 'fecha_venta',
        direccion = 'desc'
      } = filtros

      // Construir query base SIN JOIN para evitar problemas de relaciones
      let query = this.client
        .from('estadisticas_ventas')
        .select('*')

      // Aplicar filtros
      if (fechaInicio) {
        query = query.gte('fecha_venta', fechaInicio)
      }
      if (fechaFin) {
        query = query.lte('fecha_venta', fechaFin)
      }
      if (clienteWhatsapp) {
        query = query.ilike('cliente_whatsapp', `%${clienteWhatsapp}%`)
      }
      if (productoNombre) {
        query = query.ilike('producto_nombre', `%${productoNombre}%`)
      }
      if (montoMin) {
        query = query.gte('ingresos_totales', parseFloat(montoMin))
      }
      if (montoMax) {
        query = query.lte('ingresos_totales', parseFloat(montoMax))
      }

      // Contar total de registros
      const { count, error: countError } = await this.client
        .from('estadisticas_ventas')
        .select('*', { count: 'exact', head: true })

      if (countError) throw countError

      // Aplicar ordenamiento y paginación
      const ascending = direccion === 'asc'
      const offset = (pagina - 1) * limite

      query = query
        .order(campo, { ascending })
        .range(offset, offset + limite - 1)

      const { data, error } = await query

      if (error) throw error

      // Obtener datos de pedidos por separado para cada venta
      const ventasConPedidos = []
      if (data && data.length > 0) {
        for (const venta of data) {
          let pedidoData = null
          if (venta.pedido_id) {
            const { data: pedido } = await this.client
              .from('pedidos')
              .select('yape_operation_number, yape_payment_date, direccion_envio')
              .eq('id', venta.pedido_id)
              .single()

            pedidoData = pedido
          }

          ventasConPedidos.push({
            ...venta,
            pedidos: pedidoData
          })
        }
      }

      return {
        ventas: ventasConPedidos,
        total: count || 0,
        pagina,
        limite,
        totalPaginas: Math.ceil((count || 0) / limite)
      }
    } catch (error) {
      console.error('Error obteniendo historial de ventas:', error)
      throw new Error('Error al obtener historial de ventas')
    }
  }

  // Exportar historial de ventas completo
  async exportHistorialVentas(filtros = {}) {
    try {
      const {
        fechaInicio,
        fechaFin,
        clienteWhatsapp,
        productoNombre,
        montoMin,
        montoMax,
        campo = 'fecha_venta',
        direccion = 'desc'
      } = filtros

      // Construir query base con JOIN a pedidos
      let query = this.client
        .from('estadisticas_ventas')
        .select(`
          *,
          pedidos!inner(
            yape_operation_number,
            yape_payment_date,
            direccion_envio
          )
        `)

      // Aplicar filtros
      if (fechaInicio) {
        query = query.gte('fecha_venta', fechaInicio)
      }
      if (fechaFin) {
        query = query.lte('fecha_venta', fechaFin)
      }
      if (clienteWhatsapp) {
        query = query.ilike('cliente_whatsapp', `%${clienteWhatsapp}%`)
      }
      if (productoNombre) {
        query = query.ilike('producto_nombre', `%${productoNombre}%`)
      }
      if (montoMin) {
        query = query.gte('ingresos_totales', parseFloat(montoMin))
      }
      if (montoMax) {
        query = query.lte('ingresos_totales', parseFloat(montoMax))
      }

      // Aplicar ordenamiento (sin límite para exportación)
      const ascending = direccion === 'asc'
      query = query.order(campo, { ascending })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error exportando historial de ventas:', error)
      throw new Error('Error al exportar historial de ventas')
    }
  }

  /**
   * 👥 MÉTODOS PARA CLIENTES RECURRENTES
   */

  // Obtener cliente recurrente
  async getRecurrentClient(whatsapp) {
    try {
      const { data, error } = await this.client
        .from('clientes_recurrentes')
        .select('*')
        .eq('cliente_whatsapp', whatsapp)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      return data
    } catch (error) {
      console.error('Error obteniendo cliente recurrente:', error)
      return null
    }
  }

  // Obtener todos los clientes recurrentes
  async getAllRecurrentClients() {
    try {
      const { data, error } = await this.client
        .from('clientes_recurrentes')
        .select('*')
        .order('total_gastado', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error obteniendo clientes recurrentes:', error)
      throw new Error('Error al obtener clientes recurrentes')
    }
  }

  /**
   * 🔐 MÉTODOS PARA ADMINISTRACIÓN
   */

  // Verificar código admin
  async verifyAdminCode(code) {
    try {
      const { data, error } = await this.client
        .from('admin_codes')
        .select('*')
        .eq('codigo', code)
        .eq('activo', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      // Verificar expiración
      if (data.fecha_expiracion && new Date(data.fecha_expiracion) < new Date()) {
        return null
      }

      return data
    } catch (error) {
      console.error('Error verificando código admin:', error)
      return null
    }
  }

  // Crear sesión admin
  async createAdminSession(sessionData) {
    try {
      const { data, error } = await this.adminClient
        .from('admin_sessions')
        .insert([sessionData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creando sesión admin:', error)
      throw new Error('Error al crear sesión admin')
    }
  }

  /**
   * 🔄 MÉTODOS DE UTILIDAD
   */

  // Cerrar conexión (para compatibilidad)
  async close() {
    // Supabase maneja las conexiones automáticamente
    console.log('🔄 Cerrando conexión Supabase (automático)')
  }

  // Ejecutar query personalizado
  async query(sql, params = []) {
    try {
      // Para queries personalizados, usar RPC o funciones específicas
      console.warn('⚠️ Query personalizado no implementado en Supabase')
      throw new Error('Usar métodos específicos en lugar de queries SQL directos')
    } catch (error) {
      console.error('Error ejecutando query:', error)
      throw error
    }
  }

  // ===== MÉTODOS VIP PARA MIGRACIÓN COMPLETA =====

  /**
   * 🌟 Obtener ofertas VIP
   */
  async getOfertasVip(activasOnly = false) {
    try {
      let query = this.client
        .from('ofertas_vip')
        .select('*')

      if (activasOnly) {
        query = query
          .eq('activa', true)
          .or('fecha_fin.is.null,fecha_fin.gt.' + new Date().toISOString())
      }

      const { data, error } = await query.order('fecha_creacion', { ascending: false })

      if (error) throw error

      // Enriquecer con información de productos sin usar foreign keys
      const ofertasEnriquecidas = await Promise.all((data || []).map(async (oferta) => {
        const resultado = {
          ...oferta,
          productos_incluidos: oferta.productos_incluidos ? JSON.parse(oferta.productos_incluidos) : []
        }

        // Obtener información del producto regalo si existe
        if (oferta.producto_regalo_id) {
          try {
            const { data: productoRegalo } = await this.client
              .from('productos')
              .select('nombre')
              .eq('id', oferta.producto_regalo_id)
              .single()
            if (productoRegalo) {
              resultado.producto_regalo_nombre = productoRegalo.nombre
            }
          } catch (err) {
            console.warn('No se pudo cargar producto regalo:', err)
          }
        }

        // Obtener información del producto VIP si existe
        if (oferta.producto_vip_id) {
          try {
            // Buscar primero en productos principales (productos VIP reales)
            const { data: productoVipReal } = await this.client
              .from('productos')
              .select('*')
              .eq('id', oferta.producto_vip_id)
              .single()
            
            if (productoVipReal) {
              resultado.producto_vip_info = productoVipReal
            } else {
              // Buscar en tabla productos_vip (productos VIP antiguos)
              const { data: productoVipAntiguo } = await this.client
                .from('productos_vip')
                .select('*')
                .eq('id', oferta.producto_vip_id)
                .single()
              if (productoVipAntiguo) {
                resultado.producto_vip_info = productoVipAntiguo
              }
            }
          } catch (err) {
            console.warn('No se pudo cargar producto VIP:', err)
          }
        }

        return resultado
      }))

      return ofertasEnriquecidas
    } catch (error) {
      console.error('Error obteniendo ofertas VIP:', error)
      return []
    }
  }

  /**
   * 🌟 Obtener campañas VIP
   */
  async getCampanasVip() {
    try {
      const { data, error } = await this.client
        .from('campanas_vip')
        .select('*')
        .order('fecha_creacion', { ascending: false })

      if (error) throw error

      // Enriquecer con información de ofertas sin usar foreign keys
      const campanasEnriquecidas = await Promise.all((data || []).map(async (campana) => {
        const resultado = {
          ...campana,
          productos_destacados: campana.productos_destacados ? JSON.parse(campana.productos_destacados) : []
        }

        // Obtener información de la oferta VIP si existe
        if (campana.oferta_vip_id) {
          try {
            const { data: oferta } = await this.client
              .from('ofertas_vip')
              .select('titulo')
              .eq('id', campana.oferta_vip_id)
              .single()
            if (oferta) {
              resultado.oferta_titulo = oferta.titulo
            }
          } catch (err) {
            console.warn('No se pudo cargar oferta VIP:', err)
          }
        }

        return resultado
      }))

      return campanasEnriquecidas
    } catch (error) {
      console.error('Error obteniendo campañas VIP:', error)
      return []
    }
  }

  /**
   * 🌟 Obtener clientes VIP
   */
  async getClientesVip() {
    try {
      const { data, error } = await this.client
        .from('clientes_recurrentes')
        .select('*')
        .gte('total_pedidos', 10)
        .order('total_gastado', { ascending: false })

      if (error) throw error

      return (data || []).map(cliente => ({
        ...cliente,
        nivel_cliente: cliente.total_pedidos >= 10 ? 'VIP' :
                     cliente.total_pedidos >= 5 ? 'Frecuente' :
                     cliente.total_pedidos >= 2 ? 'Recurrente' : 'Nuevo'
      }))
    } catch (error) {
      console.error('Error obteniendo clientes VIP:', error)
      return []
    }
  }

  /**
   * 🌟 Obtener productos VIP
   */
  async getProductosVip(activosOnly = true) {
    try {
      let query = this.client
        .from('productos')
        .select(`
          id, nombre, descripcion, precio, stock, categoria, imagen_url,
          fecha_creacion, fecha_actualizacion, activo
        `)
        .like('nombre', '% - VIP')

      if (activosOnly) {
        query = query.eq('activo', true)
      }

      const { data, error } = await query.order('fecha_creacion', { ascending: false })

      if (error) throw error

      return (data || []).map(producto => ({
        ...producto,
        tipo_vip: 'REAL',
        precio_vip: producto.precio,
        stock_disponible: producto.stock
      }))
    } catch (error) {
      console.error('Error obteniendo productos VIP:', error)
      return []
    }
  }

  /**
   * 🌟 Obtener envíos VIP
   */
  async getEnviosVip(campanaId = null) {
    try {
      let query = this.client
        .from('envios_vip')
        .select('*')

      if (campanaId) {
        query = query.eq('campana_id', campanaId)
      }

      const { data, error } = await query.order('fecha_envio', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error obteniendo envíos VIP:', error)
      return []
    }
  }

  /**
   * 🔄 Actualizar cliente recurrente
   */
  async updateRecurringCustomer(pedido) {
    try {
      // Primero verificar si el cliente existe
      const { data: existingCustomer, error: selectError } = await this.client
        .from('clientes_recurrentes')
        .select('*')
        .eq('cliente_whatsapp', pedido.cliente_whatsapp)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError
      }

      // Obtener categoría favorita
      const categoriaFavorita = await this.getCategoriaFavorita(pedido.cliente_whatsapp)

      if (existingCustomer) {
        // Cliente existente - actualizar
        const { error: updateError } = await this.client
          .from('clientes_recurrentes')
          .update({
            cliente_nombre: pedido.cliente_nombre,
            total_pedidos: existingCustomer.total_pedidos + 1,
            total_gastado: existingCustomer.total_gastado + parseFloat(pedido.total),
            ultima_compra: new Date().toISOString(),
            categoria_favorita: categoriaFavorita,
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('cliente_whatsapp', pedido.cliente_whatsapp)

        if (updateError) throw updateError
      } else {
        // Cliente nuevo - crear
        const { error: insertError } = await this.client
          .from('clientes_recurrentes')
          .insert({
            cliente_whatsapp: pedido.cliente_whatsapp,
            cliente_nombre: pedido.cliente_nombre,
            total_pedidos: 1,
            total_gastado: parseFloat(pedido.total),
            primera_compra: new Date().toISOString(),
            ultima_compra: new Date().toISOString(),
            categoria_favorita: categoriaFavorita,
            fecha_actualizacion: new Date().toISOString()
          })

        if (insertError) throw insertError
      }
    } catch (error) {
      console.error('Error actualizando cliente recurrente:', error)
      throw error
    }
  }

  /**
   * 🔍 Obtener categoría favorita del cliente
   */
  async getCategoriaFavorita(clienteWhatsapp) {
    try {
      const salesData = await this.getSalesStatistics()

      // Filtrar ventas del cliente
      const clienteSales = salesData.filter(venta => venta.cliente_whatsapp === clienteWhatsapp)

      if (clienteSales.length === 0) return 'Sin categoría'

      // Agrupar por categoría y sumar cantidades
      const categorias = {}
      clienteSales.forEach(venta => {
        if (!categorias[venta.categoria]) {
          categorias[venta.categoria] = 0
        }
        categorias[venta.categoria] += venta.cantidad_vendida || 0
      })

      // Encontrar la categoría con más ventas
      let maxCategoria = 'Sin categoría'
      let maxCantidad = 0

      Object.entries(categorias).forEach(([categoria, cantidad]) => {
        if (cantidad > maxCantidad) {
          maxCantidad = cantidad
          maxCategoria = categoria
        }
      })

      return maxCategoria
    } catch (error) {
      console.error('Error obteniendo categoría favorita:', error)
      return 'Sin categoría'
    }
  }

  /**
   * 👥 Obtener clientes recurrentes
   */
  async getRecurringCustomers() {
    try {
      const { data, error } = await this.client
        .from('clientes_recurrentes')
        .select('*')
        .order('total_gastado', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error obteniendo clientes recurrentes:', error)
      return []
    }
  }

  /**
   * 🕒 Obtener timestamp actual en formato ISO
   * Método de compatibilidad para OrderService
   */
  getCurrentTimestamp() {
    return new Date().toISOString()
  }

  /**
   * 🚚 MÉTODOS PARA DIRECCIONES DE ENVÍO Y PAGOS YAPE
   */

  // Actualizar dirección de envío
  async updateShippingAddress(pedidoId, direccionEnvio) {
    try {
      const { data, error } = await this.adminClient
        .from('pedidos')
        .update({
          direccion_envio: direccionEnvio,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', pedidoId)
        .select()
        .single()

      if (error) throw error

      console.log(`✅ Dirección de envío actualizada para pedido ${pedidoId}`)
      return data
    } catch (error) {
      console.error('Error actualizando dirección de envío:', error)
      throw new Error('Error al actualizar dirección de envío')
    }
  }

  // Verificar si un número de operación ya existe
  async checkOperationNumberExists(numeroOperacion) {
    try {
      const { data, error } = await this.client
        .from('pedidos')
        .select('id, cliente_whatsapp, yape_payment_date')
        .eq('yape_operation_number', numeroOperacion)
        .not('yape_operation_number', 'is', null)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // No encontrado
        throw error
      }

      return data
    } catch (error) {
      console.error('Error verificando número de operación:', error)
      return null
    }
  }

  // Actualizar información del comprobante Yape
  async updateYapePaymentInfo(pedidoId, paymentInfo) {
    try {
      const { data, error } = await this.adminClient
        .from('pedidos')
        .update({
          yape_operation_number: paymentInfo.numero_operacion,
          yape_payment_date: paymentInfo.fecha_pago,
          yape_last_digits: paymentInfo.ultimos_digitos,
          yape_detected_holder: paymentInfo.titular_detectado,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', pedidoId)
        .select()
        .single()

      if (error) throw error

      console.log(`✅ Información de pago Yape actualizada para pedido ${pedidoId}`)
      return data
    } catch (error) {
      console.error('Error actualizando información de pago Yape:', error)
      throw new Error('Error al actualizar información de pago Yape')
    }
  }

  /**
   * 🔄 Ejecutar operación con reintentos
   */
  async executeWithRetry(operation, operationName, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        console.error(`❌ Error en ${operationName} (intento ${attempt}/${maxRetries}):`, {
          message: error.message,
          details: error.stack,
          hint: error.hint || '',
          code: error.code || ''
        })

        if (attempt === maxRetries) {
          throw new Error(`Error al ${operationName.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
        }

        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  /**
   * 🌟 ===== MÉTODOS PRODUCTOS VIP =====
   */

  // 🌟 CREAR PRODUCTO VIP (REDIRIGIR A MÉTODO UNIFICADO)
  async createProductoVipReal(productoOriginalId, vipData = {}) {
    console.warn('⚠️ createProductoVipReal() está DEPRECADO. Redirigiendo a createProductoVipUnificado()')
    
    // Redirigir al método unificado
    return this.createProductoVipUnificado(productoOriginalId, vipData)
  }

  /**
   * 🌟 Obtener productos VIP (ÚNICAMENTE DE TABLA productos_vip)
   */
  async getProductosVip(activosOnly = true) {
    try {
      console.log('🔍 Obteniendo productos VIP desde tabla unificada...')
      
      // 🌟 CONSULTA UNIFICADA: productos VIP desde tabla principal
      let query = this.client
        .from('productos')
        .select(`
          id,
          nombre,
          descripcion,
          precio,
          precio_vip,
          precio_original,
          stock,
          stock_vip,
          categoria,
          imagen_url,
          destacado,
          es_vip,
          limite_por_cliente,
          fecha_inicio_vip,
          fecha_fin_vip,
          producto_original_id,
          activo,
          fecha_creacion,
          fecha_actualizacion
        `)
        .eq('es_vip', true) // Solo productos VIP

      if (activosOnly) {
        query = query.eq('activo', true)
      }

      const { data, error } = await query.order('fecha_creacion', { ascending: false })

      if (error) throw error

      // 🎯 ENRIQUECER DATOS con cálculos de descuento
      const productosVipEnriquecidos = (data || []).map(producto => {
        // Calcular descuento dinámicamente
        const descuento_porcentaje = producto.precio_original && producto.precio_vip && 
          producto.precio_original !== producto.precio_vip ?
          Math.round(((producto.precio_original - producto.precio_vip) / producto.precio_original) * 100) : 0

        // Verificar vigencia por fechas
        const ahora = new Date()
        const vigente = (!producto.fecha_inicio_vip || new Date(producto.fecha_inicio_vip) <= ahora) &&
                      (!producto.fecha_fin_vip || new Date(producto.fecha_fin_vip) >= ahora)

        return {
          id: producto.id,
          nombre: producto.nombre,
          descripcion: producto.descripcion,
          precio_vip: producto.precio_vip || producto.precio,
          precio_original: producto.precio_original || producto.precio,
          stock_disponible: producto.stock_vip || producto.stock,
          categoria: producto.categoria,
          imagen_url: producto.imagen_url,
          limite_por_cliente: producto.limite_por_cliente,
          fecha_inicio: producto.fecha_inicio_vip,
          fecha_fin: producto.fecha_fin_vip,
          activo: producto.activo && vigente, // Activo Y vigente
          descuento_porcentaje,
          es_producto_vip_unificado: true, // Flag para identificar origen unificado
          fecha_creacion: producto.fecha_creacion,
          fecha_actualizacion: producto.fecha_actualizacion,
          // Compatibilidad con código existente
          tipo_vip: 'UNIFICADO',
          precio: producto.precio_vip || producto.precio,
          stock: producto.stock_vip || producto.stock
        }
      })

      // 🕒 FILTRAR POR VIGENCIA (solo productos con fechas válidas)
      const productosVigentes = productosVipEnriquecidos.filter(producto => producto.activo)

      console.log(`🌟 Productos VIP encontrados (TABLA UNIFICADA): ${productosVigentes.length} productos vigentes de ${data?.length || 0} total`)
      
      return productosVigentes

    } catch (error) {
      console.error('Error obteniendo productos VIP desde tabla unificada:', error)
      return []
    }
  }

  /**
   * 🌟 Crear oferta VIP
   */
  async createOfertaVip(ofertaData) {
    try {
      const {
        titulo,
        descripcion,
        tipo_oferta = 'descuento',
        valor_descuento,
        producto_regalo_id,
        producto_vip_id,
        productos_incluidos,
        fecha_inicio,
        fecha_fin,
        activa = true
      } = ofertaData

      const { data, error } = await this.adminClient
        .from('ofertas_vip')
        .insert({
          titulo,
          descripcion,
          tipo_oferta,
          valor_descuento: valor_descuento ? parseFloat(valor_descuento) : null,
          producto_regalo_id: producto_regalo_id || null,
          producto_vip_id: producto_vip_id || null,
          productos_incluidos: productos_incluidos ? JSON.stringify(productos_incluidos) : null,
          fecha_inicio: fecha_inicio || null,
          fecha_fin: fecha_fin || null,
          activa,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      console.log(`🌟 Oferta VIP creada: ${titulo} (ID: ${data.id})`)
      return { success: true, id: data.id }
    } catch (error) {
      console.error('Error creando oferta VIP:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 🌟 Crear campaña VIP
   */
  async createCampanaVip(campanaData) {
    try {
      const {
        nombre,
        mensaje_template,
        tipo_campana = 'oferta',
        oferta_vip_id,
        productos_destacados
      } = campanaData

      const { data, error } = await this.adminClient
        .from('campanas_vip')
        .insert({
          nombre,
          mensaje_template,
          tipo_campana,
          oferta_vip_id: oferta_vip_id || null,
          productos_destacados: productos_destacados ? JSON.stringify(productos_destacados) : null,
          enviada: false,
          total_enviados: 0,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      console.log(`🌟 Campaña VIP creada: ${nombre} (ID: ${data.id})`)
      return { success: true, id: data.id }
    } catch (error) {
      console.error('Error creando campaña VIP:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 🌟 Obtener oferta VIP por ID (CRÍTICO - MÉTODO CORREGIDO)
   */
  async getOfertaVip(id) {
    try {
      // 📝 PASO 1: Obtener la oferta base sin relaciones automáticas
      const { data: oferta, error: ofertaError } = await this.client
        .from('ofertas_vip')
        .select('*')
        .eq('id', id)
        .single()

      if (ofertaError && ofertaError.code !== 'PGRST116') {
        console.error('Error obteniendo oferta base:', ofertaError)
        return null
      }

      if (!oferta) {
        console.log(`⚠️ Oferta VIP ${id} no encontrada`)
        return null
      }

      console.log(`🔍 Procesando oferta VIP ID: ${id}`)

      // 📝 PASO 2: Obtener información del producto regalo (si existe)
      let producto_regalo_info = null
      if (oferta.producto_regalo_id) {
        const { data: productoRegalo, error: regaloError } = await this.client
          .from('productos')
          .select('*')
          .eq('id', oferta.producto_regalo_id)
          .eq('activo', true)
          .single()

        if (!regaloError && productoRegalo) {
          producto_regalo_info = {
            id: productoRegalo.id,
            nombre: productoRegalo.nombre,
            descripcion: productoRegalo.descripcion,
            precio: productoRegalo.precio,
            imagen_url: productoRegalo.imagen_url
          }
        }
      }

      // 🌟 PASO 3: Obtener información completa del producto VIP
      let producto_vip_info = null

      if (oferta.producto_vip_id) {
        try {
          // 🌟 OPCIÓN A: Buscar si es un producto VIP REAL (en tabla productos con "- VIP")
          const { data: productoVipReal, error: realError } = await this.client
            .from('productos')
            .select('*')
            .eq('id', oferta.producto_vip_id)
            .eq('activo', true)
            .ilike('nombre', '% - VIP')
            .single()

          if (!realError && productoVipReal) {
            console.log(`🌟 Usando producto VIP REAL para oferta ${oferta.id}`)

            // Buscar metadatos VIP adicionales
            const { data: metadata } = await this.client
              .from('productos_vip')
              .select('precio_original, limite_por_cliente, fecha_inicio, fecha_fin')
              .eq('producto_real_id', productoVipReal.id)
              .eq('activo', true)
              .single()

            const precioOriginal = metadata?.precio_original || (productoVipReal.precio * 1.2) // Estimación
            
            producto_vip_info = {
              id: productoVipReal.id,
              nombre: productoVipReal.nombre,
              descripcion: productoVipReal.descripcion,
              precio_original: precioOriginal,
              precio_vip: productoVipReal.precio,
              stock_disponible: productoVipReal.stock,
              limite_por_cliente: metadata?.limite_por_cliente,
              imagen_url: productoVipReal.imagen_url,
              fecha_inicio: metadata?.fecha_inicio,
              fecha_fin: metadata?.fecha_fin,
              // Calcular descuento dinámicamente
              descuento_porcentaje: precioOriginal && productoVipReal.precio && precioOriginal !== productoVipReal.precio ?
                Math.round(((precioOriginal - productoVipReal.precio) / precioOriginal) * 100) : 0,
              es_producto_vip_real: true
            }
          } else {
            // 🌟 OPCIÓN B: Fallback a producto VIP ANTIGUO (tabla productos_vip)
            const { data: productoVipAntiguo, error: antiguoError } = await this.client
              .from('productos_vip')
              .select('*')
              .eq('id', oferta.producto_vip_id)
              .eq('activo', true)
              .single()

            if (!antiguoError && productoVipAntiguo) {
              console.log(`🌟 Usando producto VIP ANTIGUO para oferta ${oferta.id}`)
              
              producto_vip_info = {
                id: productoVipAntiguo.id,
                nombre: productoVipAntiguo.nombre,
                descripcion: productoVipAntiguo.descripcion,
                precio_original: productoVipAntiguo.precio_original,
                precio_vip: productoVipAntiguo.precio_vip,
                stock_disponible: productoVipAntiguo.stock_disponible,
                limite_por_cliente: productoVipAntiguo.limite_por_cliente,
                imagen_url: productoVipAntiguo.imagen_url,
                fecha_inicio: productoVipAntiguo.fecha_inicio,
                fecha_fin: productoVipAntiguo.fecha_fin,
                // Calcular descuento dinámicamente
                descuento_porcentaje: productoVipAntiguo.precio_original && productoVipAntiguo.precio_vip ?
                  Math.round(((productoVipAntiguo.precio_original - productoVipAntiguo.precio_vip) / productoVipAntiguo.precio_original) * 100) : 0,
                es_producto_vip_real: false
              }
            } else {
              console.warn(`⚠️ No se encontró producto VIP con ID ${oferta.producto_vip_id}`)
            }
          }
        } catch (vipError) {
          console.error('Error obteniendo información del producto VIP:', vipError)
        }
      }

      // 🌟 PASO 4: Construir respuesta completa
      const ofertaCompleta = {
        ...oferta,
        productos_incluidos: oferta.productos_incluidos ? JSON.parse(oferta.productos_incluidos) : [],
        producto_vip_info,
        producto_regalo_info
      }

      console.log(`✅ Oferta VIP ${id} procesada exitosamente`)
      return ofertaCompleta

    } catch (error) {
      console.error('Error obteniendo oferta VIP:', error)
      return null
    }
  }

  /**
   * 🌟 Registrar envío VIP (CRÍTICO - MÉTODO FALTANTE)
   */
  async recordEnvioVip(envioData) {
    try {
      const {
        campana_id,
        cliente_whatsapp,
        cliente_nombre,
        mensaje_enviado,
        estado = 'enviado',
        error_detalle = null
      } = envioData

      const { data, error } = await this.adminClient
        .from('envios_vip')
        .insert({
          campana_id,
          cliente_whatsapp,
          cliente_nombre,
          mensaje_enviado,
          estado,
          error_detalle,
          fecha_envio: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return { success: true, id: data.id }
    } catch (error) {
      console.error('Error registrando envío VIP:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 🌟 Marcar campaña como enviada (CRÍTICO - MÉTODO FALTANTE)
   */
  async markCampanaEnviada(campanaId, totalEnviados) {
    try {
      const { data, error } = await this.adminClient
        .from('campanas_vip')
        .update({
          enviada: true,
          fecha_envio: new Date().toISOString(),
          total_enviados: totalEnviados,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', campanaId)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        message: 'Campaña marcada como enviada'
      }
    } catch (error) {
      console.error('Error marcando campaña como enviada:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 🌟 Obtener campañas VIP
   */
  async getCampanasVip() {
    try {
      const { data, error } = await this.client
        .from('campanas_vip')
        .select('*')
        .order('fecha_creacion', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error obteniendo campañas VIP:', error)
      return []
    }
  }

  /**
   * 🌟 Actualizar oferta VIP
   */
  async updateOfertaVip(id, ofertaData) {
    try {
      const {
        titulo,
        descripcion,
        tipo_oferta,
        valor_descuento,
        producto_regalo_id,
        producto_vip_id,
        productos_incluidos,
        fecha_inicio,
        fecha_fin,
        activa
      } = ofertaData

      const { data, error } = await this.adminClient
        .from('ofertas_vip')
        .update({
          titulo,
          descripcion,
          tipo_oferta,
          valor_descuento: valor_descuento ? parseFloat(valor_descuento) : null,
          producto_regalo_id: producto_regalo_id || null,
          producto_vip_id: producto_vip_id || null,
          productos_incluidos: productos_incluidos ? JSON.stringify(productos_incluidos) : null,
          fecha_inicio: fecha_inicio || null,
          fecha_fin: fecha_fin || null,
          activa,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        message: 'Oferta VIP actualizada'
      }
    } catch (error) {
      console.error('Error actualizando oferta VIP:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 🌟 Eliminar oferta VIP
   */
  async deleteOfertaVip(id) {
    try {
      const { data, error } = await this.adminClient
        .from('ofertas_vip')
        .delete()
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        message: 'Oferta VIP eliminada'
      }
    } catch (error) {
      console.error('Error eliminando oferta VIP:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 🎯 Obtener productos VIP activos y vigentes (método helper)
   */
  async getProductosVipActivos() {
    try {
      // Usar función SQL optimizada si está disponible
      try {
        const { data, error } = await this.client
          .rpc('get_productos_vip_activos')

        if (!error && data) {
          console.log(`🎯 Productos VIP activos (función optimizada): ${data?.length || 0} productos`)
          return data || []
        }
      } catch (funcError) {
        console.warn('⚠️ Función get_productos_vip_activos no disponible, usando método alternativo')
      }
      
      // Fallback: método manual
      return this.getProductosVip(true)

    } catch (error) {
      console.error('Error obteniendo productos VIP activos:', error)
      return []
    }
  }

  /**
   * 🌟 Crear producto VIP (UNIFICADO - en tabla productos)
   */
  async createProductoVipUnificado(productoOriginalId, vipData = {}) {
    try {
      console.log(`🌟 Creando producto VIP unificado para producto original ID: ${productoOriginalId}`)
      
      // Obtener producto original
      const { data: productoOriginal, error: getError } = await this.client
        .from('productos')
        .select('*')
        .eq('id', productoOriginalId)
        .eq('activo', true)
        .single()

      if (getError) {
        if (getError.code === 'PGRST116') {
          return { success: false, message: 'Producto original no encontrado' }
        }
        throw getError
      }

      // Verificar si ya existe un producto VIP para este producto
      const { data: existeVip, error: checkError } = await this.client
        .from('productos')
        .select('id')
        .eq('producto_original_id', productoOriginalId)
        .eq('es_vip', true)
        .eq('activo', true)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existeVip) {
        return { success: false, message: 'Ya existe un producto VIP para este artículo' }
      }

      // Extraer datos VIP
      const {
        precioVip,
        limitePorCliente,
        stockDisponible,
        fechaInicio,
        fechaFin
      } = vipData

      // 🌟 CREAR PRODUCTO VIP en tabla unificada
      const { data: newProductVip, error: insertError } = await this.client
        .from('productos')
        .insert({
          nombre: `${productoOriginal.nombre} - VIP`,
          descripcion: `${productoOriginal.descripcion}\n\n*Exclusivo para clientes VIP`,
          precio: precioVip || productoOriginal.precio, // Precio principal = precio VIP
          precio_vip: precioVip || productoOriginal.precio,
          precio_original: productoOriginal.precio,
          stock: stockDisponible || productoOriginal.stock,
          stock_vip: stockDisponible || productoOriginal.stock,
          categoria: `${productoOriginal.categoria} VIP`,
          imagen_url: productoOriginal.imagen_url,
          destacado: true, // Los productos VIP son destacados
          es_vip: true, // 🌟 CAMPO CLAVE
          limite_por_cliente: limitePorCliente || 1,
          fecha_inicio_vip: fechaInicio,
          fecha_fin_vip: fechaFin,
          producto_original_id: productoOriginalId,
          activo: true,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) throw insertError

      console.log(`🌟 Producto VIP creado en tabla unificada con ID: ${newProductVip.id}`)

      return {
        success: true,
        message: 'Producto VIP creado exitosamente en tabla unificada',
        productoVipId: newProductVip.id,
        productoOriginalId: productoOriginalId,
        precioOriginal: productoOriginal.precio,
        precioVip: precioVip || productoOriginal.precio,
        esUnificado: true
      }
    } catch (error) {
      console.error('Error creando producto VIP unificado:', error)
      return { success: false, message: 'Error interno del servidor' }
    }
  }
}

// Instancia singleton
const supabaseDatabaseService = new SupabaseDatabaseService()

export default supabaseDatabaseService
