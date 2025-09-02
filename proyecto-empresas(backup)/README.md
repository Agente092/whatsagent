# WhatsApp Business Advisor 🚀

Sistema completo de asesoría empresarial a través de WhatsApp con panel de administración profesional.

## 🌟 Características

- **Panel de Administración Moderno**: UI profesional y responsive
- **Gestión de Clientes**: Agregar, editar y controlar suscripciones
- **WhatsApp Bot Inteligente**: Integración con Baileys
- **IA Especializada**: Gemini AI con base de conocimiento empresarial
- **Sistema de Límites**: Control automático de expiración de suscripciones
- **Notificaciones Automáticas**: Alertas de vencimiento por WhatsApp
- **Dashboard Analytics**: Métricas en tiempo real
- **Responsive Design**: Funciona en todos los dispositivos

## 🛠️ Tecnologías

### Frontend
- **Next.js 14** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **Shadcn/ui** - Componentes UI profesionales
- **Lucide React** - Iconos modernos

### Backend
- **Node.js** - Servidor backend
- **Express** - Framework web
- **Prisma** - ORM para base de datos
- **PostgreSQL** - Base de datos
- **Baileys** - WhatsApp Web API
- **Gemini AI** - Inteligencia artificial

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd whatsapp-business-advisor
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
```

Editar `.env` con tus configuraciones:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/whatsapp_advisor"

# Gemini AI
GEMINI_API_KEY="AIzaSyCwhRvWvFOfJRMk9qQM2U1fDZaa7_HiB_A"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Admin Credentials
ADMIN_EMAIL="admin@advisor.com"
ADMIN_PASSWORD="admin123"
```

### 4. Configurar base de datos
```bash
npx prisma generate
npx prisma db push
```

### 5. Iniciar el sistema

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
npm run dev:server
```

## 📱 Configuración de WhatsApp

1. Inicia el servidor backend
2. Escanea el código QR que aparece en la consola con WhatsApp Web
3. El bot se conectará automáticamente

## 🎯 Uso del Sistema

### Panel de Administración
1. Accede a `http://localhost:3000`
2. Inicia sesión con las credenciales de admin
3. Gestiona clientes desde el dashboard

### Agregar Clientes
1. Click en "Agregar Cliente"
2. Completa nombre, teléfono y fecha de expiración
3. El cliente recibirá acceso inmediato al bot

### Funcionalidades del Bot
- Respuestas inteligentes basadas en conocimiento empresarial
- Control automático de acceso por suscripción
- Notificaciones de vencimiento automáticas
- Historial de conversaciones

## 📊 Base de Conocimiento

El sistema incluye una base de conocimiento especializada en:

- **Estrategias Fiscales**: Optimización tributaria legal
- **Estructuras Empresariales**: Holdings, operadoras, offshore
- **Inversiones Inmobiliarias**: BRRRR, Rent to Rent
- **Protección Patrimonial**: Fideicomisos, blindaje de activos
- **Aspectos Legales**: Normativas peruanas, tipos de empresas

## 🔧 Configuración Avanzada

### Personalizar Mensajes del Bot
Edita `server/services/whatsapp.js` para modificar mensajes automáticos.

### Ajustar Límites de IA
Modifica `server/services/gemini.js` para cambiar límites de uso.

### Personalizar UI
Los estilos están en `app/globals.css` y componentes en `components/ui/`.

## 📈 Monitoreo

### Logs del Sistema
- Frontend: Consola del navegador
- Backend: Terminal del servidor
- WhatsApp: Logs en consola con emojis

### Métricas Disponibles
- Clientes totales/activos/expirados
- Mensajes por día/total
- Tasa de actividad
- Estado del bot en tiempo real

## 🛡️ Seguridad

- Autenticación JWT
- Validación de entrada
- Control de acceso por token
- Rate limiting en IA
- Sanitización de datos

## 🚨 Solución de Problemas

### Bot no se conecta
1. Verifica que WhatsApp Web esté disponible
2. Elimina la carpeta `auth_info_baileys`
3. Reinicia el servidor backend

### Error de base de datos
1. Verifica la conexión PostgreSQL
2. Ejecuta `npx prisma db push`
3. Revisa las variables de entorno

### Límites de Gemini AI
- El plan gratuito tiene límites por hora
- Considera upgrade a plan Pro si es necesario

## 📞 Soporte

Para soporte técnico o consultas:
- Revisa los logs en consola
- Verifica configuración de variables de entorno
- Asegúrate de que todos los servicios estén ejecutándose

## 🎉 ¡Listo para Usar!

Tu sistema de asesoría empresarial por WhatsApp está completamente configurado y listo para brindar un servicio profesional a tus clientes.

**Credenciales por defecto:**
- Email: `admin@advisor.com`
- Password: `admin123`

¡Disfruta de tu nuevo sistema de asesoría automatizada! 🚀
