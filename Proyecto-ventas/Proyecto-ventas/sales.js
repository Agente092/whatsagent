export class SalesService {
  constructor(database) {
    this.db = database
  }

  // REGISTRAR VENTA CUANDO SE COMPLETA UN PEDIDO
  async registrarVenta(pedido) {
    try {
      // Manejar tanto productos_json (string/object) como productos (array)
      let productos
      if (pedido.productos_json) {
        // Si viene productos_json, verificar si es string u objeto
        if (typeof pedido.productos_json === 'string') {
          productos = JSON.parse(pedido.productos_json)
        } else {
          // Ya es un objeto (desde Supabase)
          productos = pedido.productos_json
        }
      } else if (pedido.productos) {
        // Si viene productos como array (desde getOrderById), usarlo directamente
        productos = pedido.productos
      } else {
        throw new Error('No se encontraron productos en el pedido')
      }

      console.log('🔍 DEBUG registrarVenta - productos recibidos:', JSON.stringify(productos, null, 2))
      
      for (const item of productos) {
        // Registrar en estadísticas de ventas usando Supabase
        const statData = {
          producto_id: item.id,
          producto_nombre: item.nombre,
          categoria: item.categoria || 'Sin categoría',
          cantidad_vendida: item.cantidad,
          precio_unitario: item.precio,
          ingresos_totales: item.precio * item.cantidad,
          cliente_whatsapp: pedido.cliente_whatsapp,
          cliente_nombre: pedido.cliente_nombre,
          pedido_id: pedido.id,
          fecha_venta: new Date().toISOString()
        }

        await this.db.addSaleStatistic(statData)
      }

      // Actualizar estadísticas del cliente
      await this.actualizarClienteRecurrente(pedido)
      
      console.log(`📊 Venta registrada para pedido ${pedido.id}`)
    } catch (error) {
      console.error('Error registrando venta:', error)
      throw new Error('Error al registrar estadísticas de venta')
    }
  }

  // ACTUALIZAR ESTADÍSTICAS DE CLIENTE RECURRENTE
  async actualizarClienteRecurrente(pedido) {
    try {
      // Usar método de Supabase para actualizar cliente recurrente
      await this.db.updateRecurringCustomer(pedido)
    } catch (error) {
      console.error('Error actualizando cliente recurrente:', error)
    }
  }

  // OBTENER CATEGORÍA FAVORITA DEL CLIENTE
  async getCategoriaFavorita(clienteWhatsapp) {
    try {
      // Usar método de Supabase para obtener estadísticas de ventas
      const salesData = await this.db.getSalesStatistics()

      // Filtrar por cliente y agrupar por categoría
      const clientSales = salesData.filter(venta => venta.cliente_whatsapp === clienteWhatsapp)

      if (clientSales.length === 0) return 'Sin categoría'

      // Agrupar por categoría y sumar cantidades
      const categorias = {}
      clientSales.forEach(venta => {
        const categoria = venta.categoria || 'Sin categoría'
        categorias[categoria] = (categorias[categoria] || 0) + (venta.cantidad_vendida || 0)
      })

      // Encontrar la categoría con mayor cantidad
      const categoriaFavorita = Object.keys(categorias).reduce((a, b) =>
        categorias[a] > categorias[b] ? a : b
      )

      return categoriaFavorita
    } catch (error) {
      return 'Sin categoría'
    }
  }

  // OBTENER VENTAS POR CATEGORÍA
  async getVentasPorCategoria() {
    try {
      // Usar método de Supabase para obtener estadísticas de ventas
      const salesData = await this.db.getSalesStatistics()

      // Agrupar por categoría
      const ventasPorCategoria = {}

      salesData.forEach(venta => {
        if (!ventasPorCategoria[venta.categoria]) {
          ventasPorCategoria[venta.categoria] = {
            categoria: venta.categoria,
            total_productos_vendidos: 0,
            total_ingresos: 0,
            clientes_unicos: new Set(),
            total_transacciones: 0
          }
        }

        ventasPorCategoria[venta.categoria].total_productos_vendidos += venta.cantidad_vendida || 0
        ventasPorCategoria[venta.categoria].total_ingresos += venta.ingresos_totales || 0
        ventasPorCategoria[venta.categoria].clientes_unicos.add(venta.cliente_whatsapp)
        ventasPorCategoria[venta.categoria].total_transacciones += 1
      })

      // Convertir a array y calcular valores finales
      const ventas = Object.values(ventasPorCategoria).map(categoria => ({
        categoria: categoria.categoria,
        total_productos_vendidos: categoria.total_productos_vendidos,
        total_ingresos: categoria.total_ingresos,
        clientes_unicos: categoria.clientes_unicos.size,
        total_transacciones: categoria.total_transacciones
      }))

      // Ordenar por ingresos totales
      return ventas.sort((a, b) => b.total_ingresos - a.total_ingresos)
    } catch (error) {
      console.error('Error obteniendo ventas por categoría:', error)
      return []
    }
  }

  // OBTENER PRODUCTOS MÁS VENDIDOS POR CATEGORÍA
  async getProductosMasVendidos(categoria = null, limite = 10) {
    try {
      // Usar método de Supabase para obtener estadísticas de ventas
      const salesData = await this.db.getSalesStatistics()

      // Filtrar por categoría si se especifica
      const filteredData = categoria ?
        salesData.filter(venta => venta.categoria === categoria) :
        salesData

      // Agrupar por producto
      const productosMasVendidos = {}

      filteredData.forEach(venta => {
        const key = `${venta.producto_id}_${venta.producto_nombre}_${venta.categoria}`

        if (!productosMasVendidos[key]) {
          productosMasVendidos[key] = {
            producto_id: venta.producto_id,
            producto_nombre: venta.producto_nombre,
            categoria: venta.categoria,
            total_vendido: 0,
            total_ingresos: 0,
            veces_comprado: 0,
            precios: []
          }
        }

        productosMasVendidos[key].total_vendido += venta.cantidad_vendida || 0
        productosMasVendidos[key].total_ingresos += venta.ingresos_totales || 0
        productosMasVendidos[key].veces_comprado += 1
        productosMasVendidos[key].precios.push(venta.precio_unitario || 0)
      })

      // Convertir a array y calcular promedios
      const productos = Object.values(productosMasVendidos).map(producto => ({
        producto_id: producto.producto_id,
        producto_nombre: producto.producto_nombre,
        categoria: producto.categoria,
        total_vendido: producto.total_vendido,
        total_ingresos: producto.total_ingresos,
        veces_comprado: producto.veces_comprado,
        precio_promedio: producto.precios.length > 0 ?
          producto.precios.reduce((a, b) => a + b, 0) / producto.precios.length : 0
      }))

      // Ordenar por total vendido y total ingresos, luego limitar
      return productos
        .sort((a, b) => {
          if (b.total_vendido !== a.total_vendido) {
            return b.total_vendido - a.total_vendido
          }
          return b.total_ingresos - a.total_ingresos
        })
        .slice(0, limite)
    } catch (error) {
      console.error('Error obteniendo productos más vendidos:', error)
      return []
    }
  }

  // OBTENER CLIENTES RECURRENTES (RANKING)
  async getClientesRecurrentes(limite = 20) {
    try {
      // Usar método de Supabase para obtener clientes recurrentes
      const clientesData = await this.db.getRecurringCustomers()

      // Mapear y agregar nivel de cliente
      const clientes = clientesData.map(cliente => ({
        cliente_whatsapp: cliente.cliente_whatsapp,
        cliente_nombre: cliente.cliente_nombre,
        total_pedidos: cliente.total_pedidos,
        total_gastado: cliente.total_gastado,
        categoria_favorita: cliente.categoria_favorita,
        primera_compra: cliente.primera_compra,
        ultima_compra: cliente.ultima_compra,
        nivel_cliente: cliente.total_pedidos >= 10 ? 'VIP' :
                      cliente.total_pedidos >= 5 ? 'Frecuente' :
                      cliente.total_pedidos >= 2 ? 'Recurrente' : 'Nuevo'
      }))

      // Ordenar por total gastado y total pedidos, luego limitar
      const clientesOrdenados = clientes.sort((a, b) => {
        if (b.total_gastado !== a.total_gastado) {
          return b.total_gastado - a.total_gastado
        }
        return b.total_pedidos - a.total_pedidos
      })
      return clientesOrdenados.slice(0, limite)
    } catch (error) {
      console.error('Error obteniendo clientes recurrentes:', error)
      return []
    }
  }

  // OBTENER INFORMACIÓN DE UN CLIENTE ESPECÍFICO
  async getClienteInfo(clienteWhatsapp) {
    try {
      // Usar método de Supabase para obtener clientes recurrentes
      const clientesData = await this.db.getRecurringCustomers()

      // Buscar el cliente específico
      const cliente = clientesData.find(c => c.cliente_whatsapp === clienteWhatsapp)

      if (!cliente) return null

      // Mapear y agregar nivel de cliente
      return {
        cliente_whatsapp: cliente.cliente_whatsapp,
        cliente_nombre: cliente.cliente_nombre,
        total_pedidos: cliente.total_pedidos,
        total_gastado: cliente.total_gastado,
        categoria_favorita: cliente.categoria_favorita,
        primera_compra: cliente.primera_compra,
        ultima_compra: cliente.ultima_compra,
        nivel_cliente: cliente.total_pedidos >= 10 ? 'VIP' :
                      cliente.total_pedidos >= 5 ? 'Frecuente' :
                      cliente.total_pedidos >= 2 ? 'Recurrente' : 'Nuevo'
      }
    } catch (error) {
      console.error('Error obteniendo información del cliente:', error)
      return null
    }
  }

  // OBTENER ESTADÍSTICAS GENERALES
  async getEstadisticasGenerales() {
    try {
      // Usar método de Supabase en lugar de SQL directo
      const salesData = await this.db.getSalesStatistics()

      // Calcular estadísticas desde los datos obtenidos
      const uniqueClients = new Set(salesData.map(s => s.cliente_whatsapp)).size
      const totalSales = salesData.length
      const totalProducts = salesData.reduce((sum, s) => sum + (s.cantidad_vendida || 0), 0)
      const totalRevenue = salesData.reduce((sum, s) => sum + (s.ingresos_totales || 0), 0)
      const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0

      const stats = {
        total_clientes: uniqueClients,
        total_ventas: totalSales,
        productos_vendidos: totalProducts,
        ingresos_totales: totalRevenue,
        venta_promedio: averageSale
      }

      // Calcular ventas de hoy usando JavaScript
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const todaySales = salesData.filter(s => {
        const saleDate = new Date(s.fecha_venta).toISOString().split('T')[0]
        return saleDate === today
      })

      const ventasHoy = {
        ventas_hoy: todaySales.length,
        ingresos_hoy: todaySales.reduce((sum, s) => sum + (s.ingresos_totales || 0), 0)
      }

      return {
        ...stats,
        ...ventasHoy
      }
    } catch (error) {
      console.error('Error obteniendo estadísticas generales:', error)
      return {
        total_clientes: 0,
        total_ventas: 0,
        productos_vendidos: 0,
        ingresos_totales: 0,
        venta_promedio: 0,
        ventas_hoy: 0,
        ingresos_hoy: 0
      }
    }
  }

  // OBTENER VENTAS POR PERÍODO
  async getVentasPorPeriodo(dias = 30) {
    try {
      // Calcular fecha límite usando fecha local del sistema
      const ahora = new Date()
      const fechaLimite = new Date(ahora.getTime() - (dias * 24 * 60 * 60 * 1000))
      const fechaLimiteStr = fechaLimite.getFullYear() + '-' +
                            String(fechaLimite.getMonth() + 1).padStart(2, '0') + '-' +
                            String(fechaLimite.getDate()).padStart(2, '0')

      // Usar método de Supabase para obtener estadísticas de ventas
      const salesData = await this.db.getSalesStatistics()

      // Filtrar por fecha límite
      const filteredSales = salesData.filter(venta => {
        const ventaDate = new Date(venta.fecha_venta)
        return ventaDate >= fechaLimite
      })

      // Agrupar por fecha
      const ventasPorFecha = {}

      filteredSales.forEach(venta => {
        const fecha = new Date(venta.fecha_venta).toISOString().split('T')[0] // YYYY-MM-DD

        if (!ventasPorFecha[fecha]) {
          ventasPorFecha[fecha] = {
            fecha,
            total_ventas: 0,
            ingresos_dia: 0
          }
        }

        ventasPorFecha[fecha].total_ventas += 1
        ventasPorFecha[fecha].ingresos_dia += venta.ingresos_totales || 0
      })

      // Convertir a array y ordenar por fecha descendente
      const ventas = Object.values(ventasPorFecha)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      return ventas
    } catch (error) {
      console.error('Error obteniendo ventas por período:', error)
      return []
    }
  }

  // OBTENER HISTORIAL DE VENTAS CON FILTROS Y PAGINACIÓN
  async getHistorialVentas(filtros = {}, paginacion = { pagina: 1, limite: 20 }, ordenamiento = { campo: 'fecha_venta', direccion: 'DESC' }) {
    try {
      const { fechaInicio, fechaFin, cliente, producto, montoMin, montoMax } = filtros
      const { pagina, limite } = paginacion
      const { campo, direccion } = ordenamiento
      // Usar método de Supabase para obtener historial de ventas
      const filtrosSupabase = {
        pagina,
        limite,
        fechaInicio,
        fechaFin,
        clienteWhatsapp: cliente,
        productoNombre: producto,
        montoMin,
        montoMax,
        campo,
        direccion: direccion.toLowerCase()
      }

      const resultado = await this.db.getHistorialVentas(filtrosSupabase)
      const { ventas, total } = resultado

      return {
        ventas,
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite)
      }
    } catch (error) {
      console.error('Error obteniendo historial de ventas:', error)
      return {
        ventas: [],
        total: 0,
        pagina: 1,
        limite: 20,
        totalPaginas: 0
      }
    }
  }

  // EXPORTAR HISTORIAL DE VENTAS
  async exportHistorialVentas(filtros = {}, ordenamiento = { campo: 'fecha_venta', direccion: 'DESC' }) {
    try {
      const { fechaInicio, fechaFin, cliente, producto, montoMin, montoMax } = filtros
      const { campo, direccion } = ordenamiento

      // Usar método de Supabase para exportar historial de ventas
      const filtrosSupabase = {
        fechaInicio,
        fechaFin,
        clienteWhatsapp: cliente,
        productoNombre: producto,
        montoMin,
        montoMax,
        campo,
        direccion: direccion.toLowerCase()
      }

      const ventas = await this.db.exportHistorialVentas(filtrosSupabase)

      // 🔧 MEJORADO: Formatear datos para exportación con mejor estructura
      const exportData = {
        filename: `Historial_Ventas_${new Date().toISOString().split('T')[0]}.csv`,
        headers: [
          'Fecha',
          'Producto',
          'Categoria',
          'Cant',
          'Precio_Unit',
          'Total',
          'Cliente',
          'WhatsApp',
          'Pedido_ID',
          'Num_Operacion',
          'Fecha_Pago',
          'Direccion'
        ],
        data: ventas.map(venta => {
          // Formatear fecha de manera consistente
          const fechaVenta = new Date(venta.fecha_venta)
          const fechaFormateada = fechaVenta.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })

          // Formatear fecha de pago si existe
          let fechaPago = 'N/A'
          if (venta.yape_payment_date && venta.yape_payment_date !== 'N/A') {
            try {
              fechaPago = new Date(venta.yape_payment_date).toLocaleDateString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })
            } catch (e) {
              fechaPago = venta.yape_payment_date
            }
          }

          return [
            fechaFormateada,
            venta.producto_nombre || '',
            venta.categoria || '',
            venta.cantidad_vendida || 0,
            `S/ ${parseFloat(venta.precio_unitario || 0).toFixed(2)}`,
            `S/ ${parseFloat(venta.ingresos_totales || 0).toFixed(2)}`,
            venta.cliente_nombre || '',
            venta.cliente_whatsapp || '',
            venta.pedido_id || '',
            venta.yape_operation_number || 'N/A',
            fechaPago,
            venta.direccion_envio || 'N/A'
          ]
        })
      }

      return exportData
    } catch (error) {
      console.error('Error exportando historial de ventas:', error)
      throw new Error('Error al exportar historial de ventas')
    }
  }
}
