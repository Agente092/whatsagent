# WhatsApp Business Advisor

Sistema automatizado de asesoría empresarial vía WhatsApp con inteligencia artificial.

## 🚀 Características

- Panel de administración profesional
- Bot de WhatsApp inteligente
- Integración con IA avanzada
- Base de conocimientos especializada
- Sistema de gestión de clientes
- Configuración personalizable

## 🏗️ Arquitectura del Sistema

### Frontend (Next.js)
- Interfaz de usuario moderna y responsive
- Dashboard de administración
- Configuración del sistema
- Gestión de clientes

### Backend (Node.js/Express)
- API REST para gestión de clientes
- Integración con WhatsApp Business
- Motor de IA con múltiples APIs
- Sistema de base de datos con Prisma

### Base de Datos
- SQLite para desarrollo local
- PostgreSQL para producción (opcional)

## 🛠️ Requisitos del Sistema

- Node.js 18+
- npm 9+
- Git

## 📦 Instalación Local

```bash
# Clonar el repositorio
git clone <tu-repositorio>

# Instalar dependencias
npm install

# Generar cliente Prisma
npx prisma generate

# Iniciar servidor de desarrollo
npm run dev

# Iniciar backend
npm run dev:server
```

## 🔧 Configuración

### Variables de Entorno
Crea un archivo `.env` basado en `.env.example`:

```env
# API Keys de Gemini (múltiples para rotación)
GEMINI_API_KEY_1=tu_api_key_1
GEMINI_API_KEY_2=tu_api_key_2
# ... hasta GEMINI_API_KEY_15

# Credenciales de administrador
ADMIN_EMAIL=admin@tuempresa.com
ADMIN_PASSWORD=tu_contraseña_segura

# Secreto para autenticación
NEXTAUTH_SECRET=tu_secreto_seguro

# Configuración de base de datos
DATABASE_URL=file:./dev.db
```

## 🚀 Despliegue en Render

### Preparación
1. Elimina la carpeta `proyecto-empresas(backup)/` si existe
2. Verifica que `tsconfig.json` excluya carpetas innecesarias
3. Confirma que `.gitignore` excluya archivos temporales

### Configuración de Render
El proyecto incluye un archivo `render.yaml` para despliegue automático:

- **Backend**: Servicio web en puerto 3001
- **Frontend**: Servicio web en puerto 3000

### Variables de Entorno en Render
Configura las siguientes variables en Render:

```env
# API Keys de Gemini (15 en total)
GEMINI_API_KEY_1=******
GEMINI_API_KEY_2=******
# ... hasta GEMINI_API_KEY_15

# Credenciales de administrador
ADMIN_EMAIL=admin@tuempresa.com
ADMIN_PASSWORD=******

# Secreto para autenticación
NEXTAUTH_SECRET=******

# Configuración de base de datos
DATABASE_URL=file:./database.db
```

## 🛠️ Solución de Problemas de Despliegue

Si encuentras problemas durante el despliegue, consulta:

- [Guía de Despliegue en Render](DEPLOY-RENDER.md)
- [Checklist de Despliegue](DEPLOYMENT-CHECKLIST.md)
- [Checklist de Despliegue en Render](DEPLOYMENT-CHECKLIST-RENDER.md)
- [Guía de Solución de Problemas](DEPLOYMENT-TROUBLESHOOTING.md)

## 🧪 Pruebas

```bash
# Pruebas unitarias
npm run test:unit

# Pruebas de integración
npm run test:integration

# Cobertura de código
npm run test:coverage
```

## 📊 Monitoreo

El sistema incluye:
- Health checks para monitoreo de servicios
- Métricas de rendimiento
- Logging detallado

## 🔒 Seguridad

- Autenticación JWT
- Protección CSRF
- Validación de entrada
- Rotación de API keys

## 🤝 Soporte

Para problemas de despliegue o configuración:
1. Verifica los logs de Render
2. Consulta la documentación de despliegue
3. Revisa el checklist de verificación

## 📄 Licencia

Este proyecto es propiedad intelectual y no debe ser distribuido sin autorización.