import sqlite3 from 'sqlite3'
import { promisify } from 'util'

export class DatabaseService {
  constructor() {
    this.db = null
  }

  // Método para obtener fecha/hora actual del sistema local
  getCurrentTimestamp() {
    const now = new Date()

    // Usar la fecha/hora local del sistema directamente
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database('./sales_agent.db', (err) => {
        if (err) {
          console.error('Error abriendo base de datos:', err)
          reject(err)
        } else {
          console.log('✅ Base de datos SQLite conectada')
          this.createTables().then(resolve).catch(reject)
        }
      })
    })
  }

  async createTables() {
    const queries = [
      // Tabla de productos
      `CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        precio REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        categoria TEXT,
        imagen_url TEXT,
        destacado BOOLEAN DEFAULT 0,
        activo BOOLEAN DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de pedidos
      `CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_whatsapp TEXT NOT NULL,
        cliente_nombre TEXT,
        productos_json TEXT NOT NULL,
        total REAL NOT NULL,
        estado TEXT DEFAULT 'pendiente',
        captura_pago_url TEXT,
        notas TEXT,
        yape_operation_number TEXT,
        yape_payment_date TEXT,
        yape_last_digits TEXT,
        yape_detected_holder TEXT,
        direccion_envio TEXT,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de mensajes (para estadísticas)
      `CREATE TABLE IF NOT EXISTS mensajes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_whatsapp TEXT NOT NULL,
        mensaje TEXT,
        tipo TEXT DEFAULT 'recibido',
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de configuración
      `CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT,
        fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de estadísticas de ventas
      `CREATE TABLE IF NOT EXISTS estadisticas_ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id INTEGER NOT NULL,
        producto_nombre TEXT NOT NULL,
        categoria TEXT,
        cantidad_vendida INTEGER NOT NULL DEFAULT 0,
        precio_unitario REAL NOT NULL,
        ingresos_totales REAL NOT NULL,
        cliente_whatsapp TEXT NOT NULL,
        cliente_nombre TEXT,
        pedido_id INTEGER NOT NULL,
        fecha_venta DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (producto_id) REFERENCES productos(id),
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
      )`,

      // Tabla de clientes recurrentes
      `CREATE TABLE IF NOT EXISTS clientes_recurrentes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_whatsapp TEXT UNIQUE NOT NULL,
        cliente_nombre TEXT,
        total_pedidos INTEGER DEFAULT 0,
        total_gastado REAL DEFAULT 0,
        primera_compra DATETIME,
        ultima_compra DATETIME,
        categoria_favorita TEXT,
        fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // 🔐 Tabla de códigos de autorización administrativa
      `CREATE TABLE IF NOT EXISTS admin_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        descripcion TEXT,
        activo BOOLEAN DEFAULT 1,
        intentos_fallidos INTEGER DEFAULT 0,
        ultimo_uso DATETIME,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_expiracion DATETIME
      )`,

      // 🔐 Tabla de sesiones administrativas
      `CREATE TABLE IF NOT EXISTS admin_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_whatsapp TEXT NOT NULL,
        codigo_usado TEXT NOT NULL,
        operacion TEXT,
        datos_operacion TEXT,
        estado TEXT DEFAULT 'activa',
        fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_fin DATETIME,
        FOREIGN KEY (codigo_usado) REFERENCES admin_codes(codigo)
      )`,

      // 🌟 SISTEMA VIP - Ofertas exclusivas para clientes VIP
      `CREATE TABLE IF NOT EXISTS ofertas_vip (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        tipo_oferta TEXT DEFAULT 'descuento',
        valor_descuento REAL,
        producto_regalo_id INTEGER,
        producto_vip_id INTEGER,
        productos_incluidos TEXT,
        fecha_inicio DATETIME,
        fecha_fin DATETIME,
        activa BOOLEAN DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (producto_regalo_id) REFERENCES productos(id),
        FOREIGN KEY (producto_vip_id) REFERENCES productos_vip(id)
      )`,

      // 🌟 SISTEMA VIP - Campañas de mensajería VIP
      `CREATE TABLE IF NOT EXISTS campanas_vip (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        mensaje_template TEXT NOT NULL,
        tipo_campana TEXT DEFAULT 'oferta',
        oferta_vip_id INTEGER,
        productos_destacados TEXT,
        enviada BOOLEAN DEFAULT 0,
        fecha_envio DATETIME,
        total_enviados INTEGER DEFAULT 0,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (oferta_vip_id) REFERENCES ofertas_vip(id)
      )`,

      // 🌟 SISTEMA VIP - Historial de envíos VIP
      `CREATE TABLE IF NOT EXISTS envios_vip (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campana_id INTEGER NOT NULL,
        cliente_whatsapp TEXT NOT NULL,
        cliente_nombre TEXT,
        mensaje_enviado TEXT,
        estado TEXT DEFAULT 'enviado',
        error_detalle TEXT,
        fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campana_id) REFERENCES campanas_vip(id)
      )`,

      // 🌟 SISTEMA VIP - Contactos adicionales para envío masivo
      `CREATE TABLE IF NOT EXISTS contactos_adicionales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        whatsapp TEXT UNIQUE NOT NULL,
        etiquetas TEXT,
        activo BOOLEAN DEFAULT 1,
        fecha_agregado DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // 🌟 SISTEMA VIP - Productos exclusivos VIP (separados del inventario principal)
      `CREATE TABLE IF NOT EXISTS productos_vip (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_original_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        precio_original REAL NOT NULL,
        precio_vip REAL,
        categoria TEXT,
        imagen_url TEXT,
        limite_por_cliente INTEGER,
        stock_disponible INTEGER,
        fecha_inicio DATETIME,
        fecha_fin DATETIME,
        activo BOOLEAN DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (producto_original_id) REFERENCES productos(id)
      )`
    ]

    for (const query of queries) {
      await this.run(query)
    }

    // Insertar configuración inicial si no existe
    await this.insertInitialConfig()

    // 🔐 Insertar códigos administrativos iniciales
    await this.insertInitialAdminCodes()

    // Migración: Agregar columnas Yape si no existen
    await this.migrateYapeColumns()

    // Migración: Agregar campo destacado si no existe
    await this.migrateDestacadoColumn()

    // 🚚 Migración: Agregar campo de dirección de envío si no existe
    await this.migrateShippingAddress()

    // 🌟 Forzar creación de tablas VIP si no existen
    await this.forceCreateVipTables()

    // 🌟 Migrar columnas VIP adicionales
    await this.migrateVipColumns()

    // 🔧 Migrar ofertas VIP para incluir producto_vip_id
    await this.migrateOfertasVip()

    console.log('✅ Tablas de base de datos creadas/verificadas')
  }

  // Forzar creación de tablas VIP
  async forceCreateVipTables() {
    try {
      console.log('🔄 Verificando tablas VIP...')

      // Verificar si las columnas existen
      const checkColumns = [
        { table: 'ofertas_vip', column: 'tipo_oferta' },
        { table: 'ofertas_vip', column: 'producto_regalo_id' },
        { table: 'envios_vip', column: 'campana_id' },
        { table: 'envios_vip', column: 'error_detalle' },
        { table: 'productos_vip', column: 'producto_original_id' },
        { table: 'productos_vip', column: 'limite_por_cliente' },
        { table: 'productos_vip', column: 'stock_disponible' },
        { table: 'productos_vip', column: 'fecha_inicio' },
        { table: 'productos_vip', column: 'fecha_fin' },
        { table: 'productos_vip', column: 'producto_real_id' }
      ]

      for (const check of checkColumns) {
        try {
          await this.get(`SELECT ${check.column} FROM ${check.table} LIMIT 1`)
        } catch (error) {
          if (error.message.includes('no such table')) {
            console.log(`🔧 Creando tabla ${check.table}...`)

            // Crear tabla según el tipo
            if (check.table === 'ofertas_vip') {
              await this.run(`CREATE TABLE ofertas_vip (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL,
                descripcion TEXT NOT NULL,
                tipo_oferta TEXT DEFAULT 'descuento',
                valor_descuento REAL,
                producto_regalo_id INTEGER,
                productos_incluidos TEXT,
                fecha_inicio DATETIME,
                fecha_fin DATETIME,
                activa BOOLEAN DEFAULT 1,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (producto_regalo_id) REFERENCES productos(id)
              )`)
            } else if (check.table === 'envios_vip' && check.column === 'campana_id') {
              await this.run(`CREATE TABLE envios_vip (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campana_id INTEGER NOT NULL,
                cliente_whatsapp TEXT NOT NULL,
                cliente_nombre TEXT,
                mensaje_enviado TEXT,
                estado TEXT DEFAULT 'enviado',
                error_detalle TEXT,
                fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (campana_id) REFERENCES campanas_vip(id)
              )`)
            } else if (check.table === 'envios_vip' && check.column === 'error_detalle') {
              // Agregar columna error_detalle si no existe
              await this.run(`ALTER TABLE envios_vip ADD COLUMN error_detalle TEXT`)
            } else if (check.table === 'productos_vip') {
              await this.run(`CREATE TABLE productos_vip (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                producto_original_id INTEGER NOT NULL,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                precio_original REAL NOT NULL,
                precio_vip REAL,
                categoria TEXT,
                imagen_url TEXT,
                limite_por_cliente INTEGER,
                stock_disponible INTEGER,
                fecha_inicio DATETIME,
                fecha_fin DATETIME,
                producto_real_id INTEGER,
                activo BOOLEAN DEFAULT 1,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (producto_original_id) REFERENCES productos(id)
              )`)
            } else if (check.table === 'productos_vip' && check.column === 'limite_por_cliente') {
              // Agregar nuevos campos VIP si no existen
              await this.run(`ALTER TABLE productos_vip ADD COLUMN limite_por_cliente INTEGER`)
            } else if (check.table === 'productos_vip' && check.column === 'stock_disponible') {
              await this.run(`ALTER TABLE productos_vip ADD COLUMN stock_disponible INTEGER`)
            } else if (check.table === 'productos_vip' && check.column === 'fecha_inicio') {
              await this.run(`ALTER TABLE productos_vip ADD COLUMN fecha_inicio DATETIME`)
            } else if (check.table === 'productos_vip' && check.column === 'fecha_fin') {
              await this.run(`ALTER TABLE productos_vip ADD COLUMN fecha_fin DATETIME`)
            } else if (check.table === 'productos_vip' && check.column === 'producto_real_id') {
              await this.run(`ALTER TABLE productos_vip ADD COLUMN producto_real_id INTEGER`)
            }
          }
        }
      }

      // 🔧 VERIFICAR Y AGREGAR COLUMNAS FALTANTES (SIN RECREAR TABLAS)
      for (const check of checkColumns) {
        try {
          // Verificar si la tabla existe
          const tableExists = await this.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='${check.table}'`)

          if (tableExists) {
            // Verificar si la columna existe
            try {
              await this.get(`SELECT ${check.column} FROM ${check.table} LIMIT 1`)
            } catch (columnError) {
              if (columnError.message.includes('no such column')) {
                console.log(`🔧 Agregando columna faltante: ${check.table}.${check.column}`)

                // Agregar columna específica según la tabla y columna
                if (check.table === 'productos_vip' && check.column === 'producto_real_id') {
                  await this.run(`ALTER TABLE productos_vip ADD COLUMN producto_real_id INTEGER`)
                } else if (check.table === 'productos_vip' && check.column === 'limite_por_cliente') {
                  await this.run(`ALTER TABLE productos_vip ADD COLUMN limite_por_cliente INTEGER`)
                } else if (check.table === 'productos_vip' && check.column === 'stock_disponible') {
                  await this.run(`ALTER TABLE productos_vip ADD COLUMN stock_disponible INTEGER`)
                } else if (check.table === 'productos_vip' && check.column === 'fecha_inicio') {
                  await this.run(`ALTER TABLE productos_vip ADD COLUMN fecha_inicio DATETIME`)
                } else if (check.table === 'productos_vip' && check.column === 'fecha_fin') {
                  await this.run(`ALTER TABLE productos_vip ADD COLUMN fecha_fin DATETIME`)
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ Error verificando columna ${check.table}.${check.column}:`, error)
        }
      }

      console.log('✅ Tablas VIP verificadas/creadas')
    } catch (error) {
      console.error('❌ Error verificando tablas VIP:', error)
    }
  }

  async insertInitialConfig() {
    const configs = [
      ['gemini_api_key', 'AIzaSyAlUIsKYBxfZ4RH3aimq7XBWQtlGcG1fjo'],
      ['business_name', 'Mi Tienda'],
      ['business_phone', ''],
      ['business_profile', 'general'], // 🆕 PERFIL DE NEGOCIO
      ['custom_business_profile', ''], // 🆕 PERFIL PERSONALIZADO (JSON)

      // 🆕 CONFIGURACIÓN DE IDENTIDAD DEL REPRESENTANTE (OPCIONAL)
      ['representative_name', ''], // Nombre del representante (opcional)
      ['representative_role', ''], // Rol del representante (opcional)
      ['use_representative_identity', 'false'], // Si usar identidad específica
      ['yape_number', '987654321'],
      ['yape_account_holder', 'Nombre del Titular'],
      ['welcome_message', '¡Hola! 👋 Bienvenido a nuestra tienda. ¿En qué puedo ayudarte hoy?'],
      ['payment_instructions', 'Realiza tu pago por Yape al número 987654321 y envía la captura de pantalla.'],

      // INTERRUPTOR MAESTRO
      ['auto_responses_enabled', 'true'],

      // FILTROS DE MENSAJES
      ['filter_greetings_only_enabled', 'false'],
      ['filter_ignore_emojis_enabled', 'false'],

      // HORARIO DE ATENCIÓN
      ['schedule_enabled', 'false'],
      ['schedule_start_time', '09:00'],
      ['schedule_end_time', '17:00'],
      ['schedule_out_of_hours_message', 'Gracias por contactarnos. Nuestro horario de atención es de 9:00 AM a 5:00 PM. Te responderemos en cuanto estemos disponibles.'],

      // TIEMPO DE RESPUESTA
      ['response_delay_enabled', 'false'],
      ['response_delay_min', '2'],
      ['response_delay_max', '5'],
      ['response_typing_indicator_enabled', 'false'],

      // 🔐 CONFIGURACIÓN ADMINISTRATIVA
      ['admin_system_enabled', 'true'],
      ['admin_max_attempts', '3'],
      ['admin_session_timeout', '30'], // minutos
      ['admin_require_auth_for_stats', 'true'],
      ['admin_require_auth_for_inventory', 'true'],
      ['admin_log_operations', 'true'],

      // 🔐 CONTRASEÑA MAESTRA PARA GESTIÓN DE CÓDIGOS
      ['admin_master_password_hash', ''], // Hash de la contraseña maestra
      ['admin_master_password_set', 'false'], // Si ya se configuró la contraseña
      ['admin_codes_visible', 'false'], // Si los códigos son visibles sin contraseña

      // 📞 CONFIGURACIÓN DE ATENCIÓN ESPECIALIZADA
      ['specialist_phone', '987654321'], // Número del especialista (ejemplo - debe configurarse)
      ['specialist_name', 'Especialista en Ventas'] // Nombre del especialista
    ]

    for (const [clave, valor] of configs) {
      await this.run(
        'INSERT OR IGNORE INTO configuracion (clave, valor) VALUES (?, ?)',
        [clave, valor]
      )
    }
  }

  // 🔐 INSERTAR CÓDIGOS ADMINISTRATIVOS INICIALES
  async insertInitialAdminCodes() {
    try {
      // Verificar si ya existen códigos
      const existingCodes = await this.get('SELECT COUNT(*) as count FROM admin_codes')

      if (existingCodes.count === 0) {
        // Generar código administrativo inicial seguro
        const initialCode = this.generateSecureCode()

        await this.run(
          `INSERT INTO admin_codes (codigo, descripcion, activo)
           VALUES (?, ?, ?)`,
          [initialCode, 'Código administrativo principal', 1]
        )

        console.log(`🔐 Código administrativo inicial creado: ${initialCode}`)
        console.log('⚠️  IMPORTANTE: Guarda este código de forma segura')
      }
    } catch (error) {
      console.error('Error insertando códigos administrativos:', error)
    }
  }

  // 🔐 GENERAR CÓDIGO SEGURO
  generateSecureCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = 'ADMIN'
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Métodos de utilidad para promisificar sqlite3
  run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          reject(err)
        } else {
          resolve({ id: this.lastID, changes: this.changes })
        }
      })
    })
  }

  get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }

  all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err)
          } else {
            console.log('Base de datos cerrada')
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  }

  // Métodos específicos para configuración
  async getConfig(key) {
    const result = await this.get('SELECT valor FROM configuracion WHERE clave = ?', [key])
    return result ? result.valor : null
  }

  async setConfig(key, value) {
    await this.run(
      'INSERT OR REPLACE INTO configuracion (clave, valor, fecha_actualizacion) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [key, value]
    )
  }

  // Método para obtener todas las configuraciones
  async getAllConfig() {
    const rows = await this.all('SELECT clave, valor FROM configuracion')
    const config = {}
    rows.forEach(row => {
      config[row.clave] = row.valor
    })
    return config
  }

  // 🔐 MÉTODOS PARA GESTIÓN DE CÓDIGOS ADMINISTRATIVOS

  // Validar código administrativo
  async validateAdminCode(codigo) {
    try {
      const adminCode = await this.get(
        'SELECT * FROM admin_codes WHERE codigo = ? AND activo = 1',
        [codigo]
      )

      if (!adminCode) {
        return { valid: false, reason: 'Código no encontrado o inactivo' }
      }

      // Verificar si el código ha expirado
      if (adminCode.fecha_expiracion) {
        const now = new Date()
        const expiration = new Date(adminCode.fecha_expiracion)
        if (now > expiration) {
          return { valid: false, reason: 'Código expirado' }
        }
      }

      // Actualizar último uso
      await this.run(
        'UPDATE admin_codes SET ultimo_uso = CURRENT_TIMESTAMP WHERE codigo = ?',
        [codigo]
      )

      return {
        valid: true,
        code: adminCode,
        reason: 'Código válido'
      }

    } catch (error) {
      console.error('Error validando código administrativo:', error)
      return { valid: false, reason: 'Error interno' }
    }
  }

  // Registrar intento fallido
  async registerFailedAttempt(codigo) {
    try {
      await this.run(
        `UPDATE admin_codes
         SET intentos_fallidos = intentos_fallidos + 1
         WHERE codigo = ?`,
        [codigo]
      )
    } catch (error) {
      console.error('Error registrando intento fallido:', error)
    }
  }

  // Crear sesión administrativa
  async createAdminSession(clienteWhatsapp, codigoUsado, operacion = null) {
    try {
      const result = await this.run(
        `INSERT INTO admin_sessions (cliente_whatsapp, codigo_usado, operacion, estado)
         VALUES (?, ?, ?, 'activa')`,
        [clienteWhatsapp, codigoUsado, operacion]
      )

      return result.id
    } catch (error) {
      console.error('Error creando sesión administrativa:', error)
      return null
    }
  }

  // Obtener sesión administrativa activa
  async getActiveAdminSession(clienteWhatsapp) {
    try {
      return await this.get(
        `SELECT * FROM admin_sessions
         WHERE cliente_whatsapp = ? AND estado = 'activa'
         ORDER BY fecha_inicio DESC LIMIT 1`,
        [clienteWhatsapp]
      )
    } catch (error) {
      console.error('Error obteniendo sesión administrativa:', error)
      return null
    }
  }

  // Cerrar sesión administrativa
  async closeAdminSession(sessionId) {
    try {
      await this.run(
        `UPDATE admin_sessions
         SET estado = 'cerrada', fecha_fin = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [sessionId]
      )
    } catch (error) {
      console.error('Error cerrando sesión administrativa:', error)
    }
  }

  // Migración: Agregar campo destacado si no existe
  async migrateDestacadoColumn() {
    try {
      // Verificar si la columna destacado ya existe
      const tableInfo = await this.all("PRAGMA table_info(productos)")
      const existingColumns = tableInfo.map(col => col.name)

      if (!existingColumns.includes('destacado')) {
        console.log('🔧 Agregando columna destacado a tabla productos...')
        await this.run('ALTER TABLE productos ADD COLUMN destacado BOOLEAN DEFAULT 0')
        console.log('✅ Migración de columna destacado completada')
      }
    } catch (error) {
      console.error('❌ Error en migración de columna destacado:', error)
    }
  }

  // 🚚 Migración: Agregar campo de dirección de envío si no existe
  async migrateShippingAddress() {
    try {
      // Verificar si la columna direccion_envio ya existe
      const tableInfo = await this.all("PRAGMA table_info(pedidos)")
      const existingColumns = tableInfo.map(col => col.name)

      if (!existingColumns.includes('direccion_envio')) {
        console.log('🔧 Agregando columna direccion_envio a tabla pedidos...')
        await this.run('ALTER TABLE pedidos ADD COLUMN direccion_envio TEXT')
        console.log('✅ Migración de columna direccion_envio completada')
      }
    } catch (error) {
      console.error('❌ Error en migración de columna direccion_envio:', error)
    }
  }

  // Migración: Agregar columnas Yape si no existen
  async migrateYapeColumns() {
    try {
      // Verificar si las columnas ya existen
      const tableInfo = await this.all("PRAGMA table_info(pedidos)")
      const existingColumns = tableInfo.map(col => col.name)

      const yapeColumns = [
        'yape_operation_number',
        'yape_payment_date',
        'yape_last_digits',
        'yape_detected_holder'
      ]

      for (const column of yapeColumns) {
        if (!existingColumns.includes(column)) {
          console.log(`🔧 Agregando columna ${column} a tabla pedidos...`)
          await this.run(`ALTER TABLE pedidos ADD COLUMN ${column} TEXT`)
        }
      }

      console.log('✅ Migración de columnas Yape completada')
    } catch (error) {
      console.error('❌ Error en migración de columnas Yape:', error)
    }
  }

  // Migración: Agregar columnas VIP adicionales si no existen
  async migrateVipColumns() {
    try {
      // Verificar si la tabla productos_vip existe
      const tableExists = await this.get(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='productos_vip'
      `)

      if (!tableExists) {
        console.log('⚠️ Tabla productos_vip no existe, se creará en forceCreateVipTables')
        return
      }

      // Verificar si las columnas ya existen
      const tableInfo = await this.all("PRAGMA table_info(productos_vip)")
      const existingColumns = tableInfo.map(col => col.name)

      const vipColumns = [
        'limite_por_cliente',
        'stock_disponible',
        'fecha_inicio',
        'fecha_fin'
      ]

      for (const column of vipColumns) {
        if (!existingColumns.includes(column)) {
          console.log(`🔧 Agregando columna ${column} a tabla productos_vip...`)

          let columnType = 'INTEGER'
          if (column === 'fecha_inicio' || column === 'fecha_fin') {
            columnType = 'DATETIME'
          }

          await this.run(`ALTER TABLE productos_vip ADD COLUMN ${column} ${columnType}`)
        }
      }

      console.log('✅ Migración de columnas VIP completada')
    } catch (error) {
      console.error('❌ Error en migración de columnas VIP:', error)
    }
  }

  // Migración: Agregar columna producto_vip_id a ofertas_vip si no existe
  async migrateOfertasVip() {
    try {
      // Verificar si la tabla ofertas_vip existe
      const tableExists = await this.get(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='ofertas_vip'
      `)

      if (!tableExists) {
        console.log('⚠️ Tabla ofertas_vip no existe, se creará automáticamente')
        return
      }

      // Verificar si la columna producto_vip_id ya existe
      const columnExists = await this.get(`
        PRAGMA table_info(ofertas_vip)
      `).then(async () => {
        const columns = await this.all(`PRAGMA table_info(ofertas_vip)`)
        return columns.some(col => col.name === 'producto_vip_id')
      })

      if (!columnExists) {
        console.log('🔧 Agregando columna producto_vip_id a ofertas_vip...')
        await this.run(`ALTER TABLE ofertas_vip ADD COLUMN producto_vip_id INTEGER`)
        console.log('✅ Columna producto_vip_id agregada a ofertas_vip')
      }

      // Sincronizar ofertas existentes con productos VIP
      await this.syncOfertasWithProductosVip()

      console.log('✅ Migración de ofertas VIP completada')
    } catch (error) {
      console.error('❌ Error en migración de ofertas VIP:', error)
    }
  }

  // Sincronizar ofertas VIP existentes con productos VIP
  async syncOfertasWithProductosVip() {
    try {
      // Obtener ofertas que no tienen producto_vip_id pero sí tienen producto_regalo_id
      const ofertasSinVip = await this.all(`
        SELECT o.*, p.nombre as producto_nombre
        FROM ofertas_vip o
        LEFT JOIN productos p ON o.producto_regalo_id = p.id
        WHERE o.producto_vip_id IS NULL AND o.producto_regalo_id IS NOT NULL
      `)

      if (ofertasSinVip.length === 0) {
        console.log('✅ No hay ofertas VIP que requieran sincronización')
        return
      }

      console.log(`🔄 Sincronizando ${ofertasSinVip.length} ofertas VIP con productos VIP...`)

      // Obtener productos VIP disponibles
      const productosVip = await this.all(`
        SELECT * FROM productos_vip WHERE activo = 1
      `)

      for (const oferta of ofertasSinVip) {
        // Buscar un producto VIP que coincida por nombre o crear uno nuevo
        let productoVipCoincidente = productosVip.find(pv =>
          pv.nombre.toLowerCase().includes(oferta.producto_nombre?.toLowerCase()) ||
          oferta.producto_nombre?.toLowerCase().includes(pv.nombre.toLowerCase())
        )

        if (!productoVipCoincidente && productosVip.length > 0) {
          // Si no hay coincidencia exacta, usar el primer producto VIP disponible
          productoVipCoincidente = productosVip[0]
        }

        if (productoVipCoincidente) {
          // Actualizar la oferta para incluir el producto_vip_id
          await this.run(`
            UPDATE ofertas_vip
            SET producto_vip_id = ?, fecha_actualizacion = ?
            WHERE id = ?
          `, [productoVipCoincidente.id, this.getCurrentTimestamp(), oferta.id])

          console.log(`✅ Oferta "${oferta.titulo}" sincronizada con producto VIP "${productoVipCoincidente.nombre}"`)
        }
      }

      console.log('✅ Sincronización de ofertas VIP completada')
    } catch (error) {
      console.error('❌ Error sincronizando ofertas VIP:', error)
    }
  }

  // 🔍 NUEVO: Verificar si un número de operación ya existe
  async checkOperationNumberExists(numeroOperacion) {
    try {
      const result = await this.get(
        `SELECT id, cliente_whatsapp, yape_payment_date
         FROM pedidos
         WHERE yape_operation_number = ? AND yape_operation_number IS NOT NULL`,
        [numeroOperacion]
      )
      return result || null
    } catch (error) {
      console.error('Error verificando número de operación:', error)
      return null
    }
  }

  // 🚚 NUEVO: Método para actualizar dirección de envío
  async updateShippingAddress(pedidoId, direccionEnvio) {
    try {
      await this.run(
        `UPDATE pedidos SET
          direccion_envio = ?,
          fecha_actualizacion = ?
        WHERE id = ?`,
        [direccionEnvio, this.getCurrentTimestamp(), pedidoId]
      )
    } catch (error) {
      console.error('Error actualizando dirección de envío:', error)
      throw error
    }
  }

  // Método para actualizar información del comprobante Yape
  async updateYapePaymentInfo(pedidoId, paymentInfo) {
    await this.run(
      `UPDATE pedidos SET
        yape_operation_number = ?,
        yape_payment_date = ?,
        yape_last_digits = ?,
        yape_detected_holder = ?,
        fecha_actualizacion = ?
      WHERE id = ?`,
      [
        paymentInfo.numero_operacion,
        paymentInfo.fecha_pago,
        paymentInfo.ultimos_digitos,
        paymentInfo.titular_detectado,
        this.getCurrentTimestamp(),
        pedidoId
      ]
    )
  }

  // 🔐 MÉTODOS PARA CONTRASEÑA MAESTRA

  // Generar hash de contraseña usando crypto nativo de Node.js (ES Modules)
  async generatePasswordHash(password) {
    const crypto = await import('crypto')
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
    return `${salt}:${hash}`
  }

  // Verificar contraseña
  async verifyPassword(password, storedHash) {
    if (!storedHash) return false

    const crypto = await import('crypto')
    const [salt, hash] = storedHash.split(':')
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
    return hash === verifyHash
  }

  // Configurar contraseña maestra
  async setMasterPassword(password) {
    try {
      const hash = await this.generatePasswordHash(password)
      await this.setConfig('admin_master_password_hash', hash)
      await this.setConfig('admin_master_password_set', 'true')
      return { success: true }
    } catch (error) {
      console.error('Error configurando contraseña maestra:', error)
      return { success: false, error: error.message }
    }
  }

  // Verificar contraseña maestra
  async verifyMasterPassword(password) {
    try {
      const storedHash = await this.getConfig('admin_master_password_hash')
      const isSet = await this.getConfig('admin_master_password_set')

      if (isSet !== 'true' || !storedHash) {
        return { valid: false, reason: 'Contraseña maestra no configurada' }
      }

      const isValid = await this.verifyPassword(password, storedHash)
      return {
        valid: isValid,
        reason: isValid ? 'Contraseña correcta' : 'Contraseña incorrecta'
      }
    } catch (error) {
      console.error('Error verificando contraseña maestra:', error)
      return { valid: false, reason: 'Error interno' }
    }
  }

  // Verificar si la contraseña maestra está configurada
  async isMasterPasswordSet() {
    try {
      const isSet = await this.getConfig('admin_master_password_set')
      return isSet === 'true'
    } catch (error) {
      return false
    }
  }

  // Obtener todos los códigos administrativos (requiere autenticación)
  async getAllAdminCodes() {
    try {
      return await this.all(
        'SELECT id, codigo, descripcion, activo, intentos_fallidos, ultimo_uso, fecha_creacion FROM admin_codes ORDER BY fecha_creacion DESC'
      )
    } catch (error) {
      console.error('Error obteniendo códigos administrativos:', error)
      return []
    }
  }

  // Crear nuevo código administrativo
  async createAdminCode(descripcion = 'Código administrativo') {
    try {
      const newCode = this.generateSecureCode()
      const result = await this.run(
        'INSERT INTO admin_codes (codigo, descripcion, activo) VALUES (?, ?, 1)',
        [newCode, descripcion]
      )

      return {
        success: true,
        code: newCode,
        id: result.id
      }
    } catch (error) {
      console.error('Error creando código administrativo:', error)
      return { success: false, error: error.message }
    }
  }

  // Eliminar código administrativo
  async deleteAdminCode(codeId) {
    try {
      const result = await this.run(
        'DELETE FROM admin_codes WHERE id = ?',
        [codeId]
      )

      return {
        success: result.changes > 0,
        message: result.changes > 0 ? 'Código eliminado' : 'Código no encontrado'
      }
    } catch (error) {
      console.error('Error eliminando código administrativo:', error)
      return { success: false, error: error.message }
    }
  }

  // Activar/desactivar código administrativo
  async toggleAdminCode(codeId, active) {
    try {
      const result = await this.run(
        'UPDATE admin_codes SET activo = ? WHERE id = ?',
        [active ? 1 : 0, codeId]
      )

      return {
        success: result.changes > 0,
        message: result.changes > 0 ? `Código ${active ? 'activado' : 'desactivado'}` : 'Código no encontrado'
      }
    } catch (error) {
      console.error('Error actualizando código administrativo:', error)
      return { success: false, error: error.message }
    }
  }

  // 🌟 ===== MÉTODOS VIP SYSTEM =====

  // Crear nueva oferta VIP
  async createOfertaVip(ofertaData) {
    try {
      const {
        titulo,
        descripcion,
        tipo_oferta = 'descuento',
        valor_descuento,
        producto_regalo_id,
        producto_vip_id, // 🆕 ID del producto VIP al que se aplica la oferta
        productos_incluidos,
        fecha_inicio,
        fecha_fin
      } = ofertaData

      const result = await this.run(
        `INSERT INTO ofertas_vip (
          titulo, descripcion, tipo_oferta, valor_descuento,
          producto_regalo_id, producto_vip_id, productos_incluidos, fecha_inicio, fecha_fin,
          fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          titulo,
          descripcion,
          tipo_oferta,
          valor_descuento,
          producto_regalo_id,
          producto_vip_id, // Ahora guardamos ambos campos por separado
          JSON.stringify(productos_incluidos || []),
          fecha_inicio,
          fecha_fin,
          this.getCurrentTimestamp(),
          this.getCurrentTimestamp()
        ]
      )

      return { success: true, id: result.lastInsertRowid }
    } catch (error) {
      console.error('Error creando oferta VIP:', error)
      return { success: false, error: error.message }
    }
  }

  // Obtener todas las ofertas VIP
  async getOfertasVip(activas_only = false) {
    try {
      let query = `
        SELECT o.*,
               p.nombre as producto_regalo_nombre,
               pvr.nombre as producto_vip_real_nombre,
               pvr.descripcion as producto_vip_real_descripcion,
               pvr.precio as producto_vip_real_precio,
               pvr.stock as producto_vip_real_stock,
               pvr.categoria as producto_vip_real_categoria,
               pvr.imagen_url as producto_vip_real_imagen,
               pv.nombre as producto_vip_nombre,
               pv.descripcion as producto_vip_descripcion,
               pv.precio_original as producto_vip_precio_original,
               pv.precio_vip as producto_vip_precio_vip,
               pv.stock_disponible as producto_vip_stock,
               pv.limite_por_cliente as producto_vip_limite,
               pv.imagen_url as producto_vip_imagen,
               pv.fecha_inicio as producto_vip_fecha_inicio,
               pv.fecha_fin as producto_vip_fecha_fin
        FROM ofertas_vip o
        LEFT JOIN productos p ON o.producto_regalo_id = p.id AND p.activo = 1
        LEFT JOIN productos pvr ON o.producto_vip_id = pvr.id AND pvr.activo = 1 AND pvr.nombre LIKE '% - VIP'
        LEFT JOIN productos_vip pv ON o.producto_vip_id = pv.producto_real_id AND pv.activo = 1
      `

      if (activas_only) {
        query += ` WHERE o.activa = 1 AND (o.fecha_fin IS NULL OR o.fecha_fin > datetime('now', 'localtime'))`
      }

      query += ` ORDER BY o.fecha_creacion DESC`

      const ofertas = await this.all(query)

      // Parsear productos_incluidos JSON y enriquecer con información VIP
      return ofertas.map(oferta => {
        let producto_vip_info = null

        if (oferta.producto_vip_id) {
          // 🌟 PRIORIZAR PRODUCTO VIP REAL (tabla productos) sobre producto VIP antiguo (tabla productos_vip)
          if (oferta.producto_vip_real_nombre) {
            // Usar precio original de la tabla productos_vip (más confiable que extraer de descripción)
            const precioOriginal = oferta.producto_vip_precio_original || oferta.producto_vip_real_precio
            const limite = oferta.producto_vip_limite

            producto_vip_info = {
              id: oferta.producto_vip_id,
              nombre: oferta.producto_vip_real_nombre,
              descripcion: oferta.producto_vip_real_descripcion,
              precio_original: precioOriginal,
              precio_vip: oferta.producto_vip_real_precio,
              stock_disponible: oferta.producto_vip_real_stock,
              limite_por_cliente: limite,
              imagen_url: oferta.producto_vip_real_imagen,
              fecha_inicio: null,
              fecha_fin: null,
              descuento_porcentaje: precioOriginal && oferta.producto_vip_real_precio ?
                Math.round(((precioOriginal - oferta.producto_vip_real_precio) / precioOriginal) * 100) : 0,
              es_producto_vip_real: true
            }
          } else if (oferta.producto_vip_nombre) {
            // Fallback a producto VIP antiguo
            producto_vip_info = {
              id: oferta.producto_vip_id,
              nombre: oferta.producto_vip_nombre,
              descripcion: oferta.producto_vip_descripcion,
              precio_original: oferta.producto_vip_precio_original,
              precio_vip: oferta.producto_vip_precio_vip,
              stock_disponible: oferta.producto_vip_stock,
              limite_por_cliente: oferta.producto_vip_limite,
              imagen_url: oferta.producto_vip_imagen,
              fecha_inicio: oferta.producto_vip_fecha_inicio,
              fecha_fin: oferta.producto_vip_fecha_fin,
              descuento_porcentaje: oferta.producto_vip_precio_original && oferta.producto_vip_precio_vip ?
                Math.round(((oferta.producto_vip_precio_original - oferta.producto_vip_precio_vip) / oferta.producto_vip_precio_original) * 100) : 0,
              es_producto_vip_real: false
            }
          }
        }

        return {
          ...oferta,
          productos_incluidos: oferta.productos_incluidos ? JSON.parse(oferta.productos_incluidos) : [],
          producto_vip_info
        }
      })
    } catch (error) {
      console.error('Error obteniendo ofertas VIP:', error)
      return []
    }
  }

  // Obtener una oferta VIP específica por ID
  async getOfertaVip(id) {
    try {
      const query = `
        SELECT o.*,
               p.nombre as producto_regalo_nombre,
               pvr.nombre as producto_vip_real_nombre,
               pvr.descripcion as producto_vip_real_descripcion,
               pvr.precio as producto_vip_real_precio,
               pvr.stock as producto_vip_real_stock,
               pvr.categoria as producto_vip_real_categoria,
               pvr.imagen_url as producto_vip_real_imagen,
               pv.nombre as producto_vip_nombre,
               pv.descripcion as producto_vip_descripcion,
               pv.precio_original as producto_vip_precio_original,
               pv.precio_vip as producto_vip_precio_vip,
               pv.stock_disponible as producto_vip_stock,
               pv.limite_por_cliente as producto_vip_limite,
               pv.imagen_url as producto_vip_imagen,
               pv.fecha_inicio as producto_vip_fecha_inicio,
               pv.fecha_fin as producto_vip_fecha_fin
        FROM ofertas_vip o
        LEFT JOIN productos p ON o.producto_regalo_id = p.id AND p.activo = 1
        LEFT JOIN productos pvr ON o.producto_vip_id = pvr.id AND pvr.activo = 1 AND pvr.nombre LIKE '% - VIP'
        LEFT JOIN productos_vip pv ON o.producto_vip_id = pv.producto_real_id AND pv.activo = 1
        WHERE o.id = ?
      `

      const oferta = await this.get(query, [id])

      if (oferta) {
        // Parsear productos_incluidos JSON y enriquecer con información VIP
        let producto_vip_info = null

        if (oferta.producto_vip_id) {
          // 🌟 PRIORIZAR PRODUCTO VIP REAL (tabla productos) sobre producto VIP antiguo (tabla productos_vip)
          if (oferta.producto_vip_real_nombre) {
            console.log(`🌟 Usando producto VIP REAL para oferta ${oferta.id}`)

            // Usar precio original de la tabla productos_vip (más confiable que extraer de descripción)
            const precioOriginal = oferta.producto_vip_precio_original || oferta.producto_vip_real_precio
            const limite = oferta.producto_vip_limite

            producto_vip_info = {
              id: oferta.producto_vip_id,
              nombre: oferta.producto_vip_real_nombre,
              descripcion: oferta.producto_vip_real_descripcion,
              precio_original: precioOriginal,
              precio_vip: oferta.producto_vip_real_precio,
              stock_disponible: oferta.producto_vip_real_stock,
              limite_por_cliente: limite,
              imagen_url: oferta.producto_vip_real_imagen,
              fecha_inicio: null, // Los productos VIP reales no tienen fechas en la tabla
              fecha_fin: null,
              // Calcular descuento dinámicamente
              descuento_porcentaje: precioOriginal && oferta.producto_vip_real_precio ?
                Math.round(((precioOriginal - oferta.producto_vip_real_precio) / precioOriginal) * 100) : 0,
              es_producto_vip_real: true // Bandera para identificar que es un producto VIP real
            }
          } else if (oferta.producto_vip_nombre) {
            console.log(`🌟 Usando producto VIP ANTIGUO para oferta ${oferta.id}`)
            // Fallback a producto VIP antiguo (tabla productos_vip)
            producto_vip_info = {
              id: oferta.producto_vip_id,
              nombre: oferta.producto_vip_nombre,
              descripcion: oferta.producto_vip_descripcion,
              precio_original: oferta.producto_vip_precio_original,
              precio_vip: oferta.producto_vip_precio_vip,
              stock_disponible: oferta.producto_vip_stock,
              limite_por_cliente: oferta.producto_vip_limite,
              imagen_url: oferta.producto_vip_imagen,
              fecha_inicio: oferta.producto_vip_fecha_inicio,
              fecha_fin: oferta.producto_vip_fecha_fin,
              // Calcular descuento dinámicamente
              descuento_porcentaje: oferta.producto_vip_precio_original && oferta.producto_vip_precio_vip ?
                Math.round(((oferta.producto_vip_precio_original - oferta.producto_vip_precio_vip) / oferta.producto_vip_precio_original) * 100) : 0,
              es_producto_vip_real: false // Bandera para identificar que es un producto VIP antiguo
            }
          }
        }

        return {
          ...oferta,
          productos_incluidos: oferta.productos_incluidos ? JSON.parse(oferta.productos_incluidos) : [],
          producto_vip_info
        }
      }

      return null
    } catch (error) {
      console.error('Error obteniendo oferta VIP:', error)
      return null
    }
  }

  // Actualizar oferta VIP
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

      const result = await this.run(
        `UPDATE ofertas_vip SET
          titulo = ?, descripcion = ?, tipo_oferta = ?, valor_descuento = ?,
          producto_regalo_id = ?, producto_vip_id = ?, productos_incluidos = ?, fecha_inicio = ?, fecha_fin = ?,
          activa = ?, fecha_actualizacion = ?
        WHERE id = ?`,
        [
          titulo,
          descripcion,
          tipo_oferta,
          valor_descuento,
          producto_regalo_id,
          producto_vip_id,
          JSON.stringify(productos_incluidos || []),
          fecha_inicio,
          fecha_fin,
          activa,
          this.getCurrentTimestamp(),
          id
        ]
      )

      return {
        success: result.changes > 0,
        message: result.changes > 0 ? 'Oferta VIP actualizada' : 'Oferta VIP no encontrada'
      }
    } catch (error) {
      console.error('Error actualizando oferta VIP:', error)
      return { success: false, error: error.message }
    }
  }

  // Eliminar oferta VIP
  async deleteOfertaVip(id) {
    try {
      const result = await this.run('DELETE FROM ofertas_vip WHERE id = ?', [id])
      return {
        success: result.changes > 0,
        message: result.changes > 0 ? 'Oferta VIP eliminada' : 'Oferta VIP no encontrada'
      }
    } catch (error) {
      console.error('Error eliminando oferta VIP:', error)
      return { success: false, error: error.message }
    }
  }

  // Crear nueva campaña VIP
  async createCampanaVip(campanaData) {
    try {
      const {
        nombre,
        mensaje_template,
        tipo_campana = 'oferta',
        oferta_vip_id,
        productos_destacados
      } = campanaData

      const result = await this.run(
        `INSERT INTO campanas_vip (
          nombre, mensaje_template, tipo_campana, oferta_vip_id,
          productos_destacados, fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre,
          mensaje_template,
          tipo_campana,
          oferta_vip_id,
          JSON.stringify(productos_destacados || []),
          this.getCurrentTimestamp(),
          this.getCurrentTimestamp()
        ]
      )

      return { success: true, id: result.lastInsertRowid }
    } catch (error) {
      console.error('Error creando campaña VIP:', error)
      return { success: false, error: error.message }
    }
  }

  // Obtener todas las campañas VIP
  async getCampanasVip() {
    try {
      const campanas = await this.all(`
        SELECT c.*, o.titulo as oferta_titulo
        FROM campanas_vip c
        LEFT JOIN ofertas_vip o ON c.oferta_vip_id = o.id
        ORDER BY c.fecha_creacion DESC
      `)

      // Parsear productos_destacados JSON
      return campanas.map(campana => ({
        ...campana,
        productos_destacados: campana.productos_destacados ? JSON.parse(campana.productos_destacados) : []
      }))
    } catch (error) {
      console.error('Error obteniendo campañas VIP:', error)
      return []
    }
  }

  // Marcar campaña como enviada
  async markCampanaEnviada(campanaId, totalEnviados) {
    try {
      const result = await this.run(
        `UPDATE campanas_vip SET
          enviada = 1, fecha_envio = ?, total_enviados = ?, fecha_actualizacion = ?
        WHERE id = ?`,
        [this.getCurrentTimestamp(), totalEnviados, this.getCurrentTimestamp(), campanaId]
      )

      return {
        success: result.changes > 0,
        message: result.changes > 0 ? 'Campaña marcada como enviada' : 'Campaña no encontrada'
      }
    } catch (error) {
      console.error('Error marcando campaña como enviada:', error)
      return { success: false, error: error.message }
    }
  }

  // Actualizar campaña VIP
  async updateCampanaVip(id, campanaData) {
    try {
      const {
        nombre,
        mensaje_template,
        tipo_campana = 'oferta',
        oferta_vip_id = null,
        productos_destacados = null
      } = campanaData

      // Validar que la campaña existe
      const existingCampana = await this.get('SELECT * FROM campanas_vip WHERE id = ?', [id])
      if (!existingCampana) {
        return { success: false, message: 'Campaña no encontrada' }
      }

      // Validar que la campaña no haya sido enviada (solo se pueden editar borradores)
      if (existingCampana.estado === 'enviada' || existingCampana.enviada) {
        return { success: false, message: 'No se puede editar una campaña que ya fue enviada' }
      }

      // Preparar datos para actualización
      const updateData = {
        nombre: nombre || existingCampana.nombre,
        mensaje_template: mensaje_template || existingCampana.mensaje_template,
        tipo_campana: tipo_campana || existingCampana.tipo_campana,
        oferta_vip_id: oferta_vip_id,
        productos_destacados: productos_destacados ? JSON.stringify(productos_destacados) : existingCampana.productos_destacados,
        fecha_actualizacion: this.getLocalTimestamp()
      }

      // Actualizar campaña
      const result = await this.run(`
        UPDATE campanas_vip
        SET nombre = ?,
            mensaje_template = ?,
            tipo_campana = ?,
            oferta_vip_id = ?,
            productos_destacados = ?,
            fecha_actualizacion = ?
        WHERE id = ?
      `, [
        updateData.nombre,
        updateData.mensaje_template,
        updateData.tipo_campana,
        updateData.oferta_vip_id,
        updateData.productos_destacados,
        updateData.fecha_actualizacion,
        id
      ])

      if (result.changes > 0) {
        // Obtener la campaña actualizada
        const updatedCampana = await this.get('SELECT * FROM campanas_vip WHERE id = ?', [id])

        console.log(`✅ Campaña VIP actualizada: ID ${id} - ${updateData.nombre}`)

        return {
          success: true,
          message: 'Campaña VIP actualizada exitosamente',
          campana: updatedCampana
        }
      } else {
        return { success: false, message: 'No se pudo actualizar la campaña' }
      }
    } catch (error) {
      console.error('Error actualizando campaña VIP:', error)
      return { success: false, error: error.message }
    }
  }

  // Eliminar campaña VIP
  async deleteCampanaVip(id) {
    try {
      // Primero eliminar los envíos asociados
      await this.run('DELETE FROM envios_vip WHERE campana_id = ?', [id])

      // Luego eliminar la campaña
      const result = await this.run('DELETE FROM campanas_vip WHERE id = ?', [id])

      return {
        success: result.changes > 0,
        message: result.changes > 0 ? 'Campaña VIP eliminada exitosamente' : 'Campaña no encontrada'
      }
    } catch (error) {
      console.error('Error eliminando campaña VIP:', error)
      return { success: false, error: error.message }
    }
  }

  // Registrar envío VIP individual
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

      const result = await this.run(
        `INSERT INTO envios_vip (
          campana_id, cliente_whatsapp, cliente_nombre, mensaje_enviado, estado, error_detalle, fecha_envio
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [campana_id, cliente_whatsapp, cliente_nombre, mensaje_enviado, estado, error_detalle, this.getCurrentTimestamp()]
      )

      return { success: true, id: result.lastID }
    } catch (error) {
      console.error('Error registrando envío VIP:', error)
      return { success: false, error: error.message }
    }
  }

  // Obtener historial de envíos VIP
  async getEnviosVip(campanaId = null) {
    try {
      let query = `
        SELECT e.*, c.nombre as campana_nombre
        FROM envios_vip e
        JOIN campanas_vip c ON e.campana_id = c.id
      `
      let params = []

      if (campanaId) {
        query += ` WHERE e.campana_id = ?`
        params.push(campanaId)
      }

      query += ` ORDER BY e.fecha_envio DESC`

      return await this.all(query, params)
    } catch (error) {
      console.error('Error obteniendo envíos VIP:', error)
      return []
    }
  }

  // Obtener clientes VIP para envío
  async getClientesVip() {
    try {
      return await this.all(`
        SELECT
          cliente_whatsapp,
          cliente_nombre,
          total_pedidos,
          total_gastado,
          categoria_favorita,
          primera_compra,
          ultima_compra,
          CASE
            WHEN total_pedidos >= 10 THEN 'VIP'
            WHEN total_pedidos >= 5 THEN 'Frecuente'
            WHEN total_pedidos >= 2 THEN 'Recurrente'
            ELSE 'Nuevo'
          END as nivel_cliente
        FROM clientes_recurrentes
        WHERE total_pedidos >= 10
        ORDER BY total_gastado DESC, total_pedidos DESC
      `)
    } catch (error) {
      console.error('Error obteniendo clientes VIP:', error)
      return []
    }
  }

  // 🌟 ===== MÉTODOS PRODUCTOS VIP =====

  // 🌟 NUEVA FUNCIÓN: Crear producto VIP como producto real en tabla principal
  async createProductoVipReal(productoOriginalId, vipData = {}) {
    try {
      // Obtener producto original
      const productoOriginal = await this.get(
        'SELECT * FROM productos WHERE id = ? AND activo = 1',
        [productoOriginalId]
      )

      if (!productoOriginal) {
        return { success: false, message: 'Producto original no encontrado' }
      }

      // Verificar si ya existe un producto VIP para este producto (buscar por nombre)
      const existeVip = await this.get(
        'SELECT id FROM productos WHERE nombre LIKE ? AND activo = 1',
        [`${productoOriginal.nombre} - VIP%`]
      )

      if (existeVip) {
        return { success: false, message: 'Ya existe un producto VIP para este artículo' }
      }

      // Extraer datos VIP
      const {
        precioVip,
        limitePorCliente,
        stockDisponible,
        fechaInicio,
        fechaFin,
        imagenUrl
      } = vipData

      // 🌟 CREAR PRODUCTO VIP COMO PRODUCTO REAL EN TABLA PRINCIPAL
      const result = await this.run(`
        INSERT INTO productos (
          nombre, descripcion, precio, stock, categoria, imagen_url,
          destacado, activo, fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `${productoOriginal.nombre} - VIP`,
        `${productoOriginal.descripcion}\n\n*Nota: La venta de vidrios se hace por Planchas c/u - Exclusivo para clientes VIP`,
        precioVip || productoOriginal.precio,
        stockDisponible || productoOriginal.stock,
        `${productoOriginal.categoria} VIP`,
        imagenUrl || productoOriginal.imagen_url,
        1, // Destacado = true para productos VIP
        1, // Activo = true
        this.getCurrentTimestamp(),
        this.getCurrentTimestamp()
      ])

      // 🌟 CREAR REGISTRO DE METADATOS VIP (para información técnica)
      await this.run(`
        INSERT INTO productos_vip (
          producto_original_id, nombre, descripcion, precio_original,
          precio_vip, categoria, imagen_url, limite_por_cliente,
          stock_disponible, fecha_inicio, fecha_fin, fecha_creacion, fecha_actualizacion,
          producto_real_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        productoOriginalId,
        `${productoOriginal.nombre} - VIP`,
        `${productoOriginal.descripcion} - Exclusivo para clientes VIP`,
        productoOriginal.precio,
        precioVip || productoOriginal.precio,
        productoOriginal.categoria,
        imagenUrl || productoOriginal.imagen_url,
        limitePorCliente,
        stockDisponible || productoOriginal.stock,
        fechaInicio,
        fechaFin,
        new Date().toISOString(),
        new Date().toISOString(),
        result.id // Referencia al producto real creado
      ])

      console.log(`🌟 Producto VIP REAL creado con ID: ${result.id}`)

      return {
        success: true,
        message: 'Producto VIP creado exitosamente como producto real',
        productoVipId: result.id,
        productoOriginalId: productoOriginalId,
        precioOriginal: productoOriginal.precio,
        precioVip: precioVip || productoOriginal.precio
      }
    } catch (error) {
      console.error('Error creando producto VIP real:', error)
      return { success: false, message: 'Error interno del servidor' }
    }
  }

  // Crear producto VIP exclusivo desde inventario (FUNCIÓN ORIGINAL - MANTENER PARA COMPATIBILIDAD)
  async createProductoVip(productoOriginalId, vipData = {}) {
    try {
      // Obtener producto original
      const productoOriginal = await this.get(
        'SELECT * FROM productos WHERE id = ? AND activo = 1',
        [productoOriginalId]
      )

      if (!productoOriginal) {
        return { success: false, message: 'Producto original no encontrado' }
      }

      // Verificar si ya existe un producto VIP para este producto
      const existeVip = await this.get(
        'SELECT id FROM productos_vip WHERE producto_original_id = ? AND activo = 1',
        [productoOriginalId]
      )

      if (existeVip) {
        return { success: false, message: 'Ya existe un producto VIP para este artículo' }
      }

      // Extraer datos VIP
      const {
        precioVip,
        limitePorCliente,
        stockDisponible,
        fechaInicio,
        fechaFin,
        imagenUrl
      } = vipData

      // Crear producto VIP exclusivo
      const result = await this.run(`
        INSERT INTO productos_vip (
          producto_original_id, nombre, descripcion, precio_original,
          precio_vip, categoria, imagen_url, limite_por_cliente,
          stock_disponible, fecha_inicio, fecha_fin, fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        productoOriginalId,
        `${productoOriginal.nombre} - VIP`,
        `${productoOriginal.descripcion} - Exclusivo para clientes VIP`,
        productoOriginal.precio,
        precioVip || productoOriginal.precio,
        productoOriginal.categoria,
        imagenUrl || productoOriginal.imagen_url,
        limitePorCliente || null,
        stockDisponible || null,
        fechaInicio || null,
        fechaFin || null,
        this.getCurrentTimestamp(),
        this.getCurrentTimestamp()
      ])

      return {
        success: true,
        message: 'Producto VIP creado exitosamente',
        productoVipId: result.id
      }
    } catch (error) {
      console.error('Error creando producto VIP:', error)
      return { success: false, message: 'Error interno del servidor' }
    }
  }

  // Obtener todos los productos VIP (HÍBRIDO: productos reales + productos VIP antiguos)
  async getProductosVip(activos_only = true) {
    try {
      // 🌟 OBTENER PRODUCTOS VIP REALES CON METADATOS (JOIN con tabla productos_vip)
      let queryReal = `
        SELECT
          p.id,
          p.nombre,
          p.descripcion,
          p.precio as precio_vip,
          p.stock as stock_disponible,
          p.categoria,
          p.imagen_url,
          p.fecha_creacion,
          p.fecha_actualizacion,
          1 as activo,
          'REAL' as tipo_vip,
          pv.precio_original,
          pv.limite_por_cliente,
          pv.fecha_inicio,
          pv.fecha_fin
        FROM productos p
        LEFT JOIN productos_vip pv ON p.id = pv.producto_real_id
        WHERE p.nombre LIKE '% - VIP'
      `

      if (activos_only) {
        queryReal += ' AND p.activo = 1'
      }

      // 🌟 OBTENER PRODUCTOS VIP ANTIGUOS (tabla productos_vip)
      let queryAntiguo = `
        SELECT
          pv.id,
          pv.nombre,
          pv.descripcion,
          pv.precio_vip,
          pv.stock_disponible,
          pv.categoria,
          pv.imagen_url,
          pv.fecha_creacion,
          pv.fecha_actualizacion,
          pv.activo,
          'ANTIGUO' as tipo_vip
        FROM productos_vip pv
      `

      if (activos_only) {
        queryAntiguo += ' WHERE pv.activo = 1'
      }

      // Ejecutar ambas consultas
      const productosReales = await this.all(queryReal)
      const productosAntiguos = await this.all(queryAntiguo)

      // 🌟 COMBINAR Y ENRIQUECER PRODUCTOS VIP REALES (usando datos del JOIN)
      const productosRealesEnriquecidos = productosReales.map(p => {
        // Usar precio original de la tabla productos_vip (más confiable)
        const precioOriginal = p.precio_original || p.precio_vip
        const limite = p.limite_por_cliente

        return {
          ...p,
          precio_original: precioOriginal,
          limite_por_cliente: limite,
          fecha_inicio: p.fecha_inicio,
          fecha_fin: p.fecha_fin,
          // Calcular descuento dinámicamente
          descuento_porcentaje: precioOriginal && p.precio_vip && precioOriginal !== p.precio_vip ?
            Math.round(((precioOriginal - p.precio_vip) / precioOriginal) * 100) : 0
        }
      })

      // 🌟 COMBINAR AMBOS TIPOS Y ORDENAR POR FECHA
      const todosLosProductosVip = [
        ...productosRealesEnriquecidos,
        ...productosAntiguos
      ].sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion))

      console.log(`🌟 Productos VIP encontrados: ${productosRealesEnriquecidos.length} reales + ${productosAntiguos.length} antiguos = ${todosLosProductosVip.length} total`)

      return todosLosProductosVip
    } catch (error) {
      console.error('Error obteniendo productos VIP:', error)
      return []
    }
  }

  // Obtener producto VIP por ID
  async getProductoVipById(id) {
    try {
      return await this.get(`
        SELECT
          pv.*,
          p.nombre as nombre_original,
          p.stock as stock_original
        FROM productos_vip pv
        LEFT JOIN productos p ON pv.producto_original_id = p.id
        WHERE pv.id = ?
      `, [id])
    } catch (error) {
      console.error('Error obteniendo producto VIP:', error)
      return null
    }
  }

  // Actualizar producto VIP
  async updateProductoVip(id, productoData) {
    try {
      const { nombre, descripcion, precio_vip, activo } = productoData

      const result = await this.run(`
        UPDATE productos_vip SET
          nombre = ?, descripcion = ?, precio_vip = ?, activo = ?, fecha_actualizacion = ?
        WHERE id = ?
      `, [nombre, descripcion, precio_vip, activo, this.getCurrentTimestamp(), id])

      return {
        success: result.changes > 0,
        message: result.changes > 0 ? 'Producto VIP actualizado' : 'Producto VIP no encontrado'
      }
    } catch (error) {
      console.error('Error actualizando producto VIP:', error)
      return { success: false, message: 'Error interno del servidor' }
    }
  }

  // Eliminar producto VIP
  async deleteProductoVip(id) {
    try {
      const result = await this.run('DELETE FROM productos_vip WHERE id = ?', [id])
      return {
        success: result.changes > 0,
        message: result.changes > 0 ? 'Producto VIP eliminado' : 'Producto VIP no encontrado'
      }
    } catch (error) {
      console.error('Error eliminando producto VIP:', error)
      return { success: false, message: 'Error interno del servidor' }
    }
  }
}
