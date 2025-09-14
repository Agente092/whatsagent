# 🔄 Sistema Keep-Alive para Render

## ¿Qué es el Sistema Keep-Alive?

El sistema keep-alive implementado evita que Render suspenda automáticamente el servicio debido a inactividad en el plan gratuito. Render suspende servicios que no reciben tráfico durante más de 15 minutos.

## 📋 ¿Cómo Funciona?

### 1. **Auto-Ping Programado**
- **Intervalo**: Cada 14 minutos (menor que el límite de 15 minutos de Render)
- **Endpoint**: `/keep-alive` (optimizado específicamente para esta función)
- **Método**: Petición GET interna
- **Timeout**: 10 segundos máximo

### 2. **Funcionalidades Implementadas**

#### ✅ **Ping Regular**
```javascript
// Se ejecuta cada 14 minutos
setInterval(() => {
  fetch(`${serviceUrl}/keep-alive`)
}, 14 * 60 * 1000)
```

#### ✅ **Endpoint Optimizado**
```javascript
app.get('/keep-alive', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    memory: { /* estadísticas básicas */ }
  })
})
```

#### ✅ **Verificación Inicial**
- Ping de prueba después de 2 minutos del inicio
- Confirma que el sistema funciona correctamente

#### ✅ **Fallback System**
- Si falla el endpoint `/keep-alive`, intenta con la raíz `/`
- Doble protección contra fallos

#### ✅ **Logging Detallado**
- Registra todos los pings exitosos y fallidos
- Métricas de tiempo de respuesta
- Logs en producción con Winston

## 🛠️ Configuración Automática

### **Detección de URL del Servicio**
El sistema detecta automáticamente la URL basándose en:

1. **`RENDER_EXTERNAL_URL`** (si está configurada)
2. **`NEXTAUTH_URL`** (URL de producción de Render)
3. **Fallback**: `https://fitpro-s1ct.onrender.com` (basado en tu configuración)

### **Activación Automática**
- ✅ **Solo en producción**: `NODE_ENV=production`
- ✅ **Inicio diferido**: Espera 30 segundos después del server.listen()
- ✅ **Test inicial**: Verifica funcionamiento después de 2 minutos

## 📊 Monitoreo y Logs

### **Console Logs**
```bash
🔄 =========================================
🔄     SISTEMA KEEP-ALIVE INICIADO      
🔄 =========================================
🌐 URL del servicio: https://tu-servicio.onrender.com
⏰ Intervalo: 14 minutos
🎯 Objetivo: Evitar suspensión por inactividad
🔄 =========================================

🔄 Ejecutando keep-alive ping...
✅ Keep-alive exitoso - Status: 200 - Tiempo: 245ms
```

### **Winston Logs**
```json
{
  "service": "keep-alive",
  "status": 200,
  "responseTime": 245,
  "timestamp": "2025-09-14T10:30:00.000Z",
  "level": "info"
}
```

## ⚡ Beneficios del Sistema

### ✅ **Disponibilidad 24/7**
- Tu servicio nunca se "duerme" por inactividad
- Los clientes pueden enviar mensajes a cualquier hora

### ✅ **Tiempo de Respuesta Consistente**
- No hay delay de "despertar" el servicio
- Respuestas inmediatas del bot de WhatsApp

### ✅ **Experiencia de Usuario Mejorada**
- Los clientes no experimentan timeouts
- El dashboard siempre está disponible

### ✅ **Optimización de Recursos**
- Endpoint ligero `/keep-alive` en lugar de `/health` completo
- Logging mínimo para no saturar logs
- Fallback inteligente en caso de errores

## 🔍 Verificación Post-Despliegue

### **1. Verificar en Logs de Render**
Busca estos mensajes en los logs:
```
🔄 SISTEMA KEEP-ALIVE INICIADO
🔄 Keep-alive system activo - próximo ping en 14 minutos
✅ Keep-alive exitoso - Status: 200
```

### **2. Probar el Endpoint**
```bash
curl https://tu-servicio.onrender.com/keep-alive
```

**Respuesta esperada:**
```json
{
  "status": "alive",
  "timestamp": "2025-09-14T10:30:00.000Z",
  "uptime": 3600,
  "pid": 12345,
  "memory": {
    "used": 45,
    "total": 64
  },
  "environment": "production"
}
```

### **3. Monitoreo Continuo**
- El servicio debe mantenerse "Live" en el dashboard de Render
- No debe mostrar estados de "Sleeping" después de implementar

## ⚠️ Consideraciones Importantes

### **🚫 Limitaciones**
- **Solo funciona si el servicio está activo**: Si Render ya suspendió el servicio completamente, el keep-alive no puede revivirlo
- **No es un reemplazo del plan pagado**: Para aplicaciones críticas, considera el plan pagado de Render

### **🎯 Uso Recomendado**
- ✅ Perfecto para bots de WhatsApp que necesitan estar siempre disponibles
- ✅ Ideal para APIs que reciben tráfico esporádico
- ✅ Excelente para mantener dashboards administrativos activos

### **🔧 Personalización**
Si necesitas ajustar el sistema:

```javascript
// Cambiar intervalo (línea ~2290 en server/index.js)
}, 10 * 60 * 1000) // Cambiar a 10 minutos

// Cambiar URL del servicio
const serviceUrl = 'https://tu-url-personalizada.com'

// Cambiar endpoint de ping
const response = await fetch(`${serviceUrl}/tu-endpoint-personalizado`)
```

## 🚀 Estado de Implementación

- ✅ **Sistema implementado**: Keep-alive activo en producción
- ✅ **Endpoint optimizado**: `/keep-alive` con respuesta ligera
- ✅ **Logging configurado**: Monitoreo completo con Winston
- ✅ **Fallback implementado**: Doble protección contra fallos
- ✅ **Auto-detección de URL**: Configura automáticamente la URL del servicio

---

## 📞 Soporte

Si experimentas problemas con el keep-alive:

1. **Verifica los logs de Render** para mensajes de keep-alive
2. **Confirma que `NODE_ENV=production`** esté configurado
3. **Prueba el endpoint manualmente**: `https://tu-servicio.onrender.com/keep-alive`
4. **Verifica la variable de entorno** `NEXTAUTH_URL` o `RENDER_EXTERNAL_URL`

El sistema está diseñado para ser robusto y auto-repararse en caso de fallos temporales.