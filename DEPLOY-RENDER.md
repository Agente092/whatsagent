# 🚀 Guía de Despliegue en Render.com

## WhatsApp Business Advisor - Despliegue en Producción

### 📋 **PRE-REQUISITOS**

Antes de desplegar, asegúrate de tener:

✅ **Cuenta de GitHub** con tu código subido  
✅ **Cuenta en Render.com** (gratuita o pagada)  
✅ **API Keys de Gemini AI** válidas (múltiples para rotación)  
✅ **Archivos de configuración** completados  

---

## 🔧 **PASOS DE CONFIGURACIÓN**

### 1. **Preparar el Repositorio en GitHub**

```bash
# Eliminar carpeta de backup si existe
rm -rf proyecto-empresas(backup)/  # En sistemas Unix
# En Windows: Eliminar manualmente la carpeta

# Verificar que el repositorio esté limpio
git status

# Agregar archivos
git add .

# Commit inicial
git commit -m "🚀 Initial commit - WhatsApp Business Advisor ready for production"

# Conectar con GitHub
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git

# Subir código
git push -u origin main
```

### 2. **Despliegue Automático con Blueprint**

Render soporta despliegue automático usando el archivo `render.yaml` incluido en el proyecto:

1. **Accede a Render Dashboard**
2. **Click en "New +"** → **"Web Service"**
3. **Conecta tu repositorio de GitHub**
4. **Render detectará automáticamente el archivo `render.yaml`**
5. **Confirma la configuración y haz deploy**

El blueprint creará automáticamente:
- **Backend Service**: `whatsapp-advisor-backend` en puerto 3001
- **Frontend Service**: `whatsapp-advisor-frontend` en puerto 3000

### 3. **Configurar Variables de Entorno**

En la sección **Environment** de cada servicio, configura las variables:

**Para el Backend (`whatsapp-advisor-backend`):**
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=file:./database.db
GEMINI_API_KEY_1=tu_api_key_1
GEMINI_API_KEY_2=tu_api_key_2
# ... hasta GEMINI_API_KEY_15
ADMIN_EMAIL=admin@advisor.com
ADMIN_PASSWORD=TuPasswordSeguro123!
NEXTAUTH_SECRET=[Render generará esto automáticamente o configúralo manualmente]
LOG_LEVEL=info
```

**Para el Frontend (`whatsapp-advisor-frontend`):**
```env
NEXTAUTH_URL=https://whatsapp-advisor-frontend.onrender.com
NEXT_PUBLIC_API_URL=https://whatsapp-advisor-backend.onrender.com
```

**⚠️ IMPORTANTE:**
- Reemplaza las API Keys de Gemini con tus claves válidas
- Cambia `ADMIN_PASSWORD` por una contraseña segura
- Asegúrate de que todas las 15 API Keys estén configuradas

---

## 🗄️ **INICIALIZACIÓN DE BASE DE DATOS**

Después del primer despliegue:

1. **Accede al Shell del Backend Service en Render**
2. **Ejecuta los siguientes comandos:**

```bash
# Inicializar base de datos
npm run db:init
```

---

## ⚙️ **CONFIGURACIONES ADICIONALES**

### **SSL/HTTPS** ✅
Render proporciona SSL automáticamente. Tus servicios serán accesibles en:
- **Frontend**: `https://whatsapp-advisor-frontend.onrender.com`
- **Backend**: `https://whatsapp-advisor-backend.onrender.com`

### **Custom Domain** (Opcional)
Si tienes un dominio propio:
1. Ve a **Settings** → **Custom Domains** de cada servicio
2. Agrega tu dominio
3. Configura los DNS según las instrucciones de Render

### **Scaling** (Plan Pagado)
Para mayor rendimiento:
- **Starter Plan**: $7/mes - Recursos básicos
- **Standard Plan**: $25/mes - Recursos mejorados

---

## 📱 **CONFIGURACIÓN DE WHATSAPP**

### **Conectar WhatsApp Bot:**

1. **Accede a tu aplicación:** `https://whatsapp-advisor-frontend.onrender.com`
2. **Inicia sesión** con las credenciales de admin
3. **Ve a la sección Bot**
4. **Click en "Conectar WhatsApp"**
5. **Escanea el código QR** con WhatsApp Web
6. **¡Listo!** El bot está conectado

### **⚠️ Limitaciones de WhatsApp en Render Free:**

- **Sesiones no persistentes**: En el plan gratuito, las sesiones de WhatsApp se pueden perder al reiniciar
- **Solución**: Usar plan pagado con almacenamiento persistente
- **Alternativa**: Reconectar manualmente cuando sea necesario

---

## 📊 **MONITOREO Y LOGS**

### **Ver Logs en Tiempo Real:**
1. En cada servicio, ve a **Logs**
2. Filtra por nivel: `Info`, `Warning`, `Error`

### **Health Check:**
- URL del Backend: `https://whatsapp-advisor-backend.onrender.com/health`
- Debe retornar: `{"status": "ok"}`

### **API Stats:**
- URL del Backend: `https://whatsapp-advisor-backend.onrender.com/api/pool/stats`

---

## 🔧 **SOLUCIÓN DE PROBLEMAS**

### **Error de Build:**
```bash
# Si falla el build, verificar:
npm install
npm run build
npx prisma generate
```

### **Error de Base de Datos:**
```bash
# Verificar conexión
npx prisma db push
npm run db:init
```

### **WhatsApp No Conecta:**
1. Verificar que el backend esté ejecutándose
2. Limpiar sesión y reconectar
3. Revisar logs para errores específicos

### **Límites de API Gemini:**
- **Plan Gratuito**: 15 requests/minuto por API key
- **Solución**: Implementar rotación de APIs o upgrade a plan Pro

---

## 🚀 **COMANDOS ÚTILES**

### **Deploy Manual:**
```bash
# Trigger nuevo deploy
git add .
git commit -m "🔄 Update: [descripción del cambio]"
git push origin main
```

### **Rollback:**
En Render Dashboard:
1. Ve a **Deploys** de cada servicio
2. Click en deploy anterior
3. **Redeploy**

---

## 🎯 **CHECKLIST FINAL**

Antes de considerar el despliegue completo:

- [ ] ✅ Web Services desplegados correctamente
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Health check responde correctamente
- [ ] ✅ Frontend accesible (login funciona)
- [ ] ✅ WhatsApp bot se puede conectar
- [ ] ✅ APIs de Gemini responden
- [ ] ✅ Logs sin errores críticos
- [ ] ✅ Panel de administración funcional

---

## 📞 **URLs IMPORTANTES**

Una vez desplegado:

- **Frontend Principal**: `https://whatsapp-advisor-frontend.onrender.com`
- **Backend API**: `https://whatsapp-advisor-backend.onrender.com`
- **Health Check**: `https://whatsapp-advisor-backend.onrender.com/health`
- **API Stats**: `https://whatsapp-advisor-backend.onrender.com/api/pool/stats`
- **Dashboard Admin**: `https://whatsapp-advisor-frontend.onrender.com/dashboard`

---

## 🎉 **¡DESPLIEGUE COMPLETADO!**

Tu sistema de asesoría empresarial por WhatsApp está ahora disponible 24/7 en la nube.

**Credenciales por defecto:**
- Email: `admin@advisor.com`
- Password: `[el que configuraste en ADMIN_PASSWORD]`

**⚠️ RECUERDA:**
- Cambiar credenciales por defecto
- Monitorear logs regularmente
- Mantener API Keys actualizadas
- Hacer backups de la base de datos

---

## 📈 **PRÓXIMOS PASOS**

1. **Configurar dominio personalizado**
2. **Implementar monitoreo avanzado**
3. **Configurar backups automáticos**
4. **Optimizar rendimiento**
5. **Agregar más funcionalidades**

¡Tu sistema está listo para brindar asesoría empresarial automatizada! 🚀