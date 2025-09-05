/**
 * 🌟 VIP SERVICE - Sistema de Fidelización para Clientes VIP
 * 
 * Funcionalidades:
 * - Gestión de ofertas exclusivas VIP
 * - Creación y envío de campañas personalizadas
 * - Segmentación automática de clientes
 * - Analytics de campañas VIP
 * 
 * @author Agentes 413 - Sistema AromaFlow V10
 */

export class VipService {
  constructor(databaseService, whatsappService = null) {
    this.db = databaseService
    this.whatsapp = whatsappService
    this.isInitialized = false
  }

  // Establecer referencia de WhatsAppService después de la inicialización
  setWhatsAppService(whatsappService) {
    this.whatsapp = whatsappService
    this.isInitialized = true
    console.log('✅ VipService: WhatsApp Service conectado')
  }

  // ===== GESTIÓN DE PRODUCTOS VIP =====

  /**
   * 🎆 Obtener productos VIP activos y vigentes
   * @returns {Array} Lista de productos VIP disponibles
   */
  async getProductosVipActivos() {
    try {
      // 🌟 CONSULTA UNIFICADA: productos VIP desde tabla principal
      const { data: productos, error } = await this.db.client
        .from('productos')
        .select('*')
        .eq('activo', true)
        .eq('es_vip', true)
        .gt('stock', 0)
        .order('fecha_creacion', { ascending: false })

      if (error) {
        console.error('❌ Error obteniendo productos VIP desde tabla unificada:', error)
        return []
      }

      // Filtrar productos vigentes por fecha
      const ahora = new Date()
      const productosVigentes = productos.filter(producto => {
        // Verificar fecha de inicio
        if (producto.fecha_inicio_vip) {
          const fechaInicio = new Date(producto.fecha_inicio_vip)
          if (ahora < fechaInicio) {
            console.log(`🕒 Producto VIP ${producto.nombre} aún no ha iniciado (inicio: ${fechaInicio})`)
            return false
          }
        }

        // Verificar fecha de fin
        if (producto.fecha_fin_vip) {
          const fechaFin = new Date(producto.fecha_fin_vip)
          if (ahora > fechaFin) {
            console.log(`⏰ Producto VIP ${producto.nombre} ha expirado (fin: ${fechaFin})`)
            return false
          }
        }

        return true
      })

      console.log(`🌟 Productos VIP encontrados (TABLA UNIFICADA): ${productosVigentes.length} productos vigentes`)
      
      return productosVigentes

    } catch (error) {
      console.error('❌ Error en getProductosVipActivos:', error)
      return []
    }
  }
  
  // ===== GESTIÓN DE OFERTAS VIP =====

  async createOferta(ofertaData) {
    try {
      // Validar datos de entrada
      const validation = this.validateOfertaData(ofertaData)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // Crear oferta en base de datos
      const result = await this.db.createOfertaVip(ofertaData)
      
      if (result.success) {
        console.log(`✅ Oferta VIP creada: ${ofertaData.titulo} (ID: ${result.id})`)
        return { 
          success: true, 
          id: result.id, 
          message: 'Oferta VIP creada exitosamente' 
        }
      }

      return result
    } catch (error) {
      console.error('❌ Error en VipService.createOferta:', error)
      return { success: false, error: error.message }
    }
  }

  async getOfertas(activasOnly = false) {
    try {
      const ofertas = await this.db.getOfertasVip(activasOnly)
      
      // Enriquecer ofertas con información adicional
      const ofertasEnriquecidas = await Promise.all(
        ofertas.map(async (oferta) => {
          // Obtener información de productos incluidos
          if (oferta.productos_incluidos && oferta.productos_incluidos.length > 0) {
            const productos = await this.getProductosInfo(oferta.productos_incluidos)
            oferta.productos_info = productos
          }

          // Calcular estado de vigencia
          oferta.estado_vigencia = this.calculateOfertaStatus(oferta)
          
          return oferta
        })
      )

      return { success: true, ofertas: ofertasEnriquecidas }
    } catch (error) {
      console.error('❌ Error en VipService.getOfertas:', error)
      return { success: false, error: error.message }
    }
  }

  async updateOferta(id, ofertaData) {
    try {
      const validation = this.validateOfertaData(ofertaData)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      const result = await this.db.updateOfertaVip(id, ofertaData)
      
      if (result.success) {
        console.log(`✅ Oferta VIP actualizada: ID ${id}`)
      }

      return result
    } catch (error) {
      console.error('❌ Error en VipService.updateOferta:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteOferta(id) {
    try {
      const result = await this.db.deleteOfertaVip(id)
      
      if (result.success) {
        console.log(`✅ Oferta VIP eliminada: ID ${id}`)
      }

      return result
    } catch (error) {
      console.error('❌ Error en VipService.deleteOferta:', error)
      return { success: false, error: error.message }
    }
  }

  // ===== GESTIÓN DE CAMPAÑAS VIP =====

  async createCampana(campanaData) {
    try {
      // Validar datos de campaña
      const validation = this.validateCampanaData(campanaData)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // Crear campaña en base de datos
      const result = await this.db.createCampanaVip(campanaData)
      
      if (result.success) {
        console.log(`✅ Campaña VIP creada: ${campanaData.nombre} (ID: ${result.id})`)
        return {
          success: true,
          id: result.id,
          message: 'Campaña VIP creada exitosamente'
        }
      }

      return result
    } catch (error) {
      console.error('❌ Error en VipService.createCampana:', error)
      return { success: false, error: error.message }
    }
  }

  async getCampanas() {
    try {
      const campanas = await this.db.getCampanasVip()
      
      // Enriquecer campañas con estadísticas
      const campanasEnriquecidas = await Promise.all(
        campanas.map(async (campana) => {
          // Obtener estadísticas de envío
          const envios = await this.db.getEnviosVip(campana.id)
          campana.stats = {
            total_enviados: envios.length,
            enviados: envios.filter(e => e.estado === 'enviado').length,
            entregados: envios.filter(e => e.estado === 'entregado').length,
            leidos: envios.filter(e => e.estado === 'leido').length,
            errores: envios.filter(e => e.estado === 'error').length
          }
          
          return campana
        })
      )

      return { success: true, campanas: campanasEnriquecidas }
    } catch (error) {
      console.error('❌ Error en VipService.getCampanas:', error)
      return { success: false, error: error.message }
    }
  }

  async updateCampana(id, campanaData) {
    try {
      // Validar datos de entrada
      if (!campanaData.nombre || !campanaData.mensaje_template) {
        return {
          success: false,
          message: 'Nombre y mensaje de la campaña son requeridos'
        }
      }

      // Validar longitud del mensaje
      if (campanaData.mensaje_template.length > 4000) {
        return {
          success: false,
          message: 'El mensaje de la campaña es demasiado largo (máximo 4000 caracteres)'
        }
      }

      // Si se especifica una oferta VIP, validar que existe
      if (campanaData.oferta_vip_id) {
        const oferta = await this.db.getOfertaVip(campanaData.oferta_vip_id)
        if (!oferta) {
          return {
            success: false,
            message: 'La oferta VIP especificada no existe'
          }
        }
      }

      const result = await this.db.updateCampanaVip(id, campanaData)

      if (result.success) {
        console.log(`✅ Campaña VIP actualizada: ID ${id} - ${campanaData.nombre}`)
      }

      return result
    } catch (error) {
      console.error('❌ Error en VipService.updateCampana:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteCampana(id) {
    try {
      const result = await this.db.deleteCampanaVip(id)

      if (result.success) {
        console.log(`✅ Campaña VIP eliminada: ID ${id}`)
      }

      return result
    } catch (error) {
      console.error('❌ Error en VipService.deleteCampana:', error)
      return { success: false, error: error.message }
    }
  }

  // ===== ENVÍO DE CAMPAÑAS =====

  async enviarCampana(campanaId, opciones = {}) {
    try {
      if (!this.isInitialized) {
        return { success: false, error: 'WhatsApp Service no está conectado' }
      }

      // Verificar que WhatsApp esté realmente conectado
      console.log(`🔍 Verificando conexión WhatsApp: isInitialized=${this.isInitialized}, whatsapp=${!!this.whatsapp}, isConnected=${this.whatsapp?.isConnected}`)

      if (!this.whatsapp || !this.whatsapp.isConnected) {
        return { success: false, error: 'WhatsApp no está conectado. Por favor, conecta WhatsApp antes de enviar campañas.' }
      }

      // Obtener datos de la campaña
      const campanas = await this.db.getCampanasVip()
      const campana = campanas.find(c => c.id === campanaId)
      
      if (!campana) {
        return { success: false, error: 'Campaña no encontrada' }
      }

      if (campana.enviada) {
        return { success: false, error: 'Esta campaña ya fue enviada' }
      }

      // Obtener lista de destinatarios
      const destinatarios = await this.getDestinatarios(opciones)
      
      if (destinatarios.length === 0) {
        return { success: false, error: 'No hay destinatarios disponibles' }
      }

      console.log(`🚀 Iniciando envío de campaña: ${campana.nombre}`)
      console.log(`📊 Total destinatarios: ${destinatarios.length}`)

      // Enviar mensajes con rate limiting
      let enviados = 0
      let errores = 0

      for (const cliente of destinatarios) {
        try {
          // Personalizar mensaje
          const mensajePersonalizado = await this.personalizarMensaje(
            campana.mensaje_template,
            cliente,
            campana
          )

          // 🌟 ENVIAR MENSAJE CON IMAGEN DEL PRODUCTO VIP SI ESTÁ DISPONIBLE
          await this.enviarMensajeConImagenVip(cliente.cliente_whatsapp, mensajePersonalizado, campana)

          // 🌟 ESTABLECER CONTEXTO VIP CAMPAIGN
          this.whatsapp.setConversationState(cliente.cliente_whatsapp, 'vip_campaign_response', {
            campaign_id: campanaId,
            campaign_name: campana.nombre,
            offer_id: campana.oferta_vip_id,
            customer_name: cliente.cliente_nombre,
            customer_level: cliente.nivel_cliente,
            campaign_sent_at: new Date().toISOString(),
            awaiting_response: true
          })

          console.log(`🌟 Contexto VIP establecido para ${cliente.cliente_nombre}`)

          // Registrar envío exitoso
          await this.db.recordEnvioVip({
            campana_id: campanaId,
            cliente_whatsapp: cliente.cliente_whatsapp,
            cliente_nombre: cliente.cliente_nombre,
            mensaje_enviado: mensajePersonalizado,
            estado: 'enviado'
          })

          enviados++
          console.log(`✅ Enviado a ${cliente.cliente_nombre} (${cliente.cliente_whatsapp})`)

          // Rate limiting: esperar 2 segundos entre envíos
          await this.sleep(2000)

        } catch (error) {
          console.error(`❌ Error enviando a ${cliente.cliente_whatsapp}:`, error.message)

          // Determinar el tipo de error
          let estadoError = 'error'
          let mensajeError = error.message

          if (error.message.includes('WhatsApp no está conectado') ||
              error.message.includes('not connected') ||
              error.message.includes('disconnected')) {
            estadoError = 'error_conexion'
            mensajeError = 'WhatsApp desconectado'
          }

          // Registrar error con más detalle
          await this.db.recordEnvioVip({
            campana_id: campanaId,
            cliente_whatsapp: cliente.cliente_whatsapp,
            cliente_nombre: cliente.cliente_nombre,
            mensaje_enviado: campana.mensaje_template,
            estado: estadoError,
            error_detalle: mensajeError
          })

          errores++
        }
      }

      // Solo marcar campaña como enviada si al menos un mensaje se envió exitosamente
      if (enviados > 0) {
        await this.db.markCampanaEnviada(campanaId, enviados)
        console.log(`✅ Campaña marcada como enviada: ${enviados} mensajes exitosos`)
      } else {
        console.log(`⚠️ Campaña NO marcada como enviada: 0 mensajes exitosos`)
      }

      console.log(`🎯 Campaña completada: ${enviados} enviados, ${errores} errores`)

      // Determinar si la operación fue exitosa
      const operacionExitosa = enviados > 0
      const mensaje = operacionExitosa
        ? `Campaña enviada exitosamente a ${enviados} destinatarios`
        : `Error: No se pudo enviar la campaña. ${errores} errores encontrados`

      return {
        success: operacionExitosa,
        message: mensaje,
        stats: {
          total_destinatarios: destinatarios.length,
          enviados,
          errores,
          tasa_exito: destinatarios.length > 0 ? ((enviados / destinatarios.length) * 100).toFixed(1) : '0.0'
        }
      }

    } catch (error) {
      console.error('❌ Error en VipService.enviarCampana:', error)
      return { success: false, error: error.message }
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  validateOfertaData(data) {
    if (!data.titulo || data.titulo.trim() === '') {
      return { valid: false, error: 'El título es requerido' }
    }
    
    if (!data.descripcion || data.descripcion.trim() === '') {
      return { valid: false, error: 'La descripción es requerida' }
    }

    if (data.tipo_oferta === 'descuento' && (!data.valor_descuento || data.valor_descuento <= 0)) {
      return { valid: false, error: 'El valor del descuento debe ser mayor a 0' }
    }

    return { valid: true }
  }

  validateCampanaData(data) {
    if (!data.nombre || data.nombre.trim() === '') {
      return { valid: false, error: 'El nombre de la campaña es requerido' }
    }
    
    if (!data.mensaje_template || data.mensaje_template.trim() === '') {
      return { valid: false, error: 'El mensaje template es requerido' }
    }

    return { valid: true }
  }

  async getProductosInfo(productIds) {
    try {
      // Obtener información de productos desde Supabase
      const productos = []
      for (const id of productIds) {
        const producto = await this.db.getProductById(id)
        if (producto) {
          productos.push(producto)
        }
      }
      return productos
    } catch (error) {
      console.error('Error obteniendo información de productos:', error)
      return []
    }
  }

  calculateOfertaStatus(oferta) {
    const now = new Date()
    const fechaInicio = oferta.fecha_inicio ? new Date(oferta.fecha_inicio) : null
    const fechaFin = oferta.fecha_fin ? new Date(oferta.fecha_fin) : null

    if (!oferta.activa) return 'inactiva'
    if (fechaInicio && now < fechaInicio) return 'programada'
    if (fechaFin && now > fechaFin) return 'expirada'
    return 'activa'
  }

  async getDestinatarios(opciones) {
    try {
      // Por defecto, obtener clientes VIP
      const clientesVip = await this.db.getClientesVip()
      
      // TODO: Agregar lógica para contactos adicionales si se especifica
      
      return clientesVip
    } catch (error) {
      console.error('Error obteniendo destinatarios:', error)
      return []
    }
  }

  async personalizarMensaje(template, cliente, campana) {
    try {
      let mensaje = template

      // Reemplazar variables del cliente
      mensaje = mensaje.replace(/{nombre}/gi, cliente.cliente_nombre || 'Cliente')
      mensaje = mensaje.replace(/{nivel}/gi, cliente.nivel_cliente || 'VIP')

      // Si hay oferta asociada, agregar información COMPLETA del producto VIP
      if (campana.oferta_vip_id) {
        const oferta = await this.db.getOfertaVip(campana.oferta_vip_id)

        if (oferta && oferta.producto_vip_info) {
          const productoVip = oferta.producto_vip_info

          // 🌟 CREAR INFORMACIÓN COMPLETA DEL PRODUCTO VIP
          let infoProductoVip = `📦 *${productoVip.nombre}*\n`

          if (productoVip.descripcion) {
            infoProductoVip += `${productoVip.descripcion}\n\n`
          }

          // Precios y descuento
          if (productoVip.precio_original && productoVip.precio_vip) {
            const descuentoVip = Math.round(((productoVip.precio_original - productoVip.precio_vip) / productoVip.precio_original) * 100)
            infoProductoVip += `💰 *Precio Normal:* S/ ${productoVip.precio_original}\n`
            infoProductoVip += `🌟 *Precio VIP:* S/ ${productoVip.precio_vip}\n`
            infoProductoVip += `🎯 *Tu descuento VIP:* ${descuentoVip}%\n\n`
          }

          // 🌟 INFORMACIÓN EXCLUSIVA VIP - Stock disponible para la oferta
          if (productoVip.stock_disponible !== undefined && productoVip.stock_disponible !== null) {
            infoProductoVip += `📦 *Stock disponible para esta oferta:* ${productoVip.stock_disponible} unidades\n`
          }

          // 🌟 INFORMACIÓN EXCLUSIVA VIP - Límite por cliente
          if (productoVip.limite_por_cliente !== undefined && productoVip.limite_por_cliente !== null) {
            infoProductoVip += `👤 *Máximo por cliente:* ${productoVip.limite_por_cliente} unidades\n`
          }

          // Vigencia de la oferta
          if (productoVip.fecha_fin) {
            const fechaFin = new Date(productoVip.fecha_fin)
            const hoy = new Date()
            const diasRestantes = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24))

            if (diasRestantes > 0) {
              infoProductoVip += `⏰ *Oferta válida por:* ${diasRestantes} días más\n`
            }
          }

          // Reemplazar variables
          mensaje = mensaje.replace(/{oferta}/gi, infoProductoVip)
          mensaje = mensaje.replace(/{descuento}/gi, oferta.valor_descuento || '')
          mensaje = mensaje.replace(/{producto}/gi, productoVip.nombre)
          mensaje = mensaje.replace(/{precio_vip}/gi, productoVip.precio_vip || '')
          mensaje = mensaje.replace(/{precio_original}/gi, productoVip.precio_original || '')

        } else if (oferta) {
          // Fallback si no hay producto VIP asociado
          mensaje = mensaje.replace(/{oferta}/gi, oferta.titulo)
          mensaje = mensaje.replace(/{descuento}/gi, oferta.valor_descuento || '')
        }
      }

      // Agregar llamada a la acción si no está presente
      if (!mensaje.includes('Si me interesa') && !mensaje.includes('No me interesa')) {
        mensaje += '\n\n📝 *Responde:*\n• "Si me interesa" si quieres conocer más detalles\n• "No me interesa" si no es para ti en este momento'
      }

      return mensaje
    } catch (error) {
      console.error('Error personalizando mensaje:', error)
      return template
    }
  }

  /**
   * 🌟 Enviar mensaje de campaña VIP con imagen del producto si está disponible
   */
  async enviarMensajeConImagenVip(whatsappNumber, mensaje, campana) {
    try {
      // Si la campaña tiene una oferta VIP asociada, intentar enviar con imagen
      if (campana.oferta_vip_id) {
        const oferta = await this.db.getOfertaVip(campana.oferta_vip_id)

        if (oferta && oferta.producto_vip_info && oferta.producto_vip_info.imagen_url) {
          const imagenUrl = oferta.producto_vip_info.imagen_url.trim()

          if (imagenUrl !== '') {
            console.log(`📷 Enviando campaña VIP con imagen: ${imagenUrl}`)
            // Enviar imagen con el mensaje como caption
            await this.whatsapp.sendImageMessage(whatsappNumber, imagenUrl, mensaje)
            return
          }
        }
      }

      // Si no hay imagen disponible, enviar solo el mensaje de texto
      console.log(`📝 Enviando campaña VIP solo texto (sin imagen disponible)`)
      await this.whatsapp.sendMessage(whatsappNumber, mensaje)

    } catch (error) {
      console.error('❌ Error enviando mensaje VIP con imagen:', error)
      // Fallback: enviar solo texto si falla el envío con imagen
      try {
        await this.whatsapp.sendMessage(whatsappNumber, mensaje)
        console.log(`📝 Fallback: Mensaje VIP enviado solo como texto`)
      } catch (fallbackError) {
        console.error('❌ Error en fallback de mensaje VIP:', fallbackError)
        throw fallbackError
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ===== ANALYTICS VIP =====

  async getVipStats() {
    try {
      const clientesVip = await this.db.getClientesVip()
      const ofertas = await this.db.getOfertasVip()
      const campanas = await this.db.getCampanasVip()
      const envios = await this.db.getEnviosVip()

      return {
        success: true,
        stats: {
          total_clientes_vip: clientesVip.length,
          total_ofertas_activas: ofertas.filter(o => o.activa).length,
          total_campanas: campanas.length,
          campanas_enviadas: campanas.filter(c => c.enviada).length,
          total_envios: envios.length,
          tasa_entrega: envios.length > 0 ? 
            ((envios.filter(e => e.estado === 'enviado').length / envios.length) * 100).toFixed(1) : 0
        }
      }
    } catch (error) {
      console.error('❌ Error en VipService.getVipStats:', error)
      return { success: false, error: error.message }
    }
  }
}
