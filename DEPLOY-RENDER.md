# 🚀 Guía de Despliegue en Render.com

## WhatsApp Business Advisor - Despliegue en Producción

### 📋 **PRE-REQUISITOS**

Antes de desplegar, asegúrate de tener:

✅ **Cuenta de GitHub** con tu código subido  
✅ **Cuenta en Render.com** (gratuita o pagada)  
✅ **API Key de Gemini AI** válida  
✅ **Archivos de configuración** completados  

---

## 🔧 **PASOS DE CONFIGURACIÓN**

### 1. **Preparar el Repositorio en GitHub**

```bash
# Inicializar Git (si no está inicializado)
git init

# Agregar archivos
git add .

# Commit inicial
git commit -m "🚀 Initial commit - WhatsApp Business Advisor ready for production"

# Conectar con GitHub
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git

# Subir código
git push -u origin main
```

### 2. **Configurar Base de Datos en Render**

1. **Accede a Render Dashboard**
2. **Click en "New +"** → **"PostgreSQL"**
3. **Configura la base de datos:**
   - Name: `whatsapp-advisor-db`
   - Database: `whatsapp_advisor`
   - User: `advisor_user`
   - Plan: `Starter` (gratuito)

4. **Guarda la DATABASE_URL** que Render te proporcione

### 3. **Crear Web Service en Render**

1. **Click en "New +"** → **"Web Service"**
2. **Conecta tu repositorio de GitHub**
3. **Configura el servicio:**
   - Name: `whatsapp-business-advisor`
   - Root Directory: `.` (raíz)
   - Environment: `Node`
   - Region: `US East` (recomendado)
   - Branch: `main`
   - Build Command: `npm install && npm run build && npx prisma generate`
   - Start Command: `npm run start:production`

### 4. **Configurar Variables de Entorno**

En la sección **Environment** de tu Web Service, agrega:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=[URL proporcionada por Render PostgreSQL]
GEMINI_API_KEY=AIzaSyCwhRvWvFOfJRMk9qQM2U1fDZaa7_HiB_A
NEXTAUTH_SECRET=[Render generará esto automáticamente]
NEXTAUTH_URL=https://tu-app-name.onrender.com
ADMIN_EMAIL=admin@advisor.com
ADMIN_PASSWORD=TuPasswordSeguro123!
LOG_LEVEL=info
```

**⚠️ IMPORTANTE:**
- Reemplaza `tu-app-name` con el nombre real de tu app en Render
- Cambia `ADMIN_PASSWORD` por una contraseña segura
- Asegúrate de que `GEMINI_API_KEY` sea válida

### 5. **Configurar Health Check**

En **Advanced** → **Health Check Path**: `/health`

---

## 🗄️ **INICIALIZACIÓN DE BASE DE DATOS**

Después del primer despliegue:

1. **Accede a tu Web Service en Render**
2. **Ve a la pestaña "Shell"**
3. **Ejecuta los siguientes comandos:**

```bash
# Aplicar migraciones de Prisma
npx prisma db push

# Verificar conexión
npx prisma db seed
```

---

## ⚙️ **CONFIGURACIONES ADICIONALES**

### **SSL/HTTPS** ✅
Render proporciona SSL automáticamente. Tu app será accesible en:
- `https://tu-app-name.onrender.com`

### **Custom Domain** (Opcional)
Si tienes un dominio propio:
1. Ve a **Settings** → **Custom Domains**
2. Agrega tu dominio
3. Configura los DNS según las instrucciones de Render

### **Scaling** (Plan Pagado)
Para mayor rendimiento:
- **Starter Plan**: $7/mes - Recursos básicos
- **Standard Plan**: $25/mes - Recursos mejorados

---

## 📱 **CONFIGURACIÓN DE WHATSAPP**

### **Conectar WhatsApp Bot:**

1. **Accede a tu aplicación:** `https://tu-app-name.onrender.com`
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
1. En tu Web Service, ve a **Logs**
2. Filtra por nivel: `Info`, `Warning`, `Error`

### **Health Check:**
- URL: `https://tu-app-name.onrender.com/health`
- Debe retornar: `{"status": "ok"}`

### **API Stats:**
- URL: `https://tu-app-name.onrender.com/api/pool/stats`

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
npx prisma studio
```

### **WhatsApp No Conecta:**
1. Verificar que el servicio esté ejecutándose
2. Limpiar sesión y reconectar
3. Revisar logs para errores específicos

### **Límites de API Gemini:**
- **Plan Gratuito**: 15 requests/minuto
- **Solución**: Implementar rate limiting o upgrade a plan Pro

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
1. Ve a **Deploys**
2. Click en deploy anterior
3. **Redeploy**

---

## 🎯 **CHECKLIST FINAL**

Antes de considerar el despliegue completo:

- [ ] ✅ Web Service desplegado correctamente
- [ ] ✅ Base de datos PostgreSQL funcionando
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Health check responde correctamente
- [ ] ✅ Frontend accesible (login funciona)
- [ ] ✅ WhatsApp bot se puede conectar
- [ ] ✅ API de Gemini responde
- [ ] ✅ Logs sin errores críticos
- [ ] ✅ Panel de administración funcional

---

## 📞 **URLs IMPORTANTES**

Una vez desplegado:

- **Aplicación Principal**: `https://tu-app-name.onrender.com`
- **Health Check**: `https://tu-app-name.onrender.com/health`
- **API Stats**: `https://tu-app-name.onrender.com/api/pool/stats`
- **Dashboard Admin**: `https://tu-app-name.onrender.com/dashboard`

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