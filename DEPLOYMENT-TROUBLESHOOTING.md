# 🛠️ Guía de Solución de Problemas de Despliegue

## 📋 Problema Actual: 404 en la Página Principal

**Error:** `GET https://whatsagent.onrender.com/ 404 (Not Found)`

## 🔍 Análisis del Problema

### 1. **Causas Posibles**

1. **Configuración Incorrecta de Render:**
   - El servicio frontend está configurado como `static` cuando debería ser `web`
   - El `startCommand` no es el correcto para una aplicación standalone
   - El puerto no está configurado correctamente

2. **Problemas con la Exportación Estática:**
   - La aplicación tiene rutas API dinámicas que no son compatibles con exportación estática
   - Falta `generateStaticParams()` en rutas dinámicas

3. **Problemas con la Redirección:**
   - La página principal redirige basándose en autenticación
   - Posible problema con localStorage en el entorno de producción

4. **Problemas con el Build Standalone:**
   - El build no se completa correctamente
   - Archivos faltantes en el directorio `.next/standalone`

### 2. **Diagnóstico Actual**

- ✅ Build de Next.js se completa exitosamente
- ✅ 16 páginas estáticas se generan correctamente
- ✅ El sitio se marca como "live" en Render
- ❌ Acceso a la raíz (`/`) devuelve 404

## 🛠️ Soluciones Implementadas

### 1. **Corrección de Configuración de Render**

**Cambio de `static` a `web`:**
```yaml
# Antes (incorrecto para esta aplicación)
- type: static

# Después (correcto)
- type: web
```

**Corrección del startCommand:**
```yaml
# Antes
startCommand: npm start

# Después (mantenido igual, ya que es correcto)
startCommand: npm start
```

**Agregado de configuración de puerto:**
```yaml
envVars:
  - key: PORT
    value: 3000
```

### 2. **Configuración de Next.js**

**Mantener `output: 'standalone'` para aplicaciones con rutas API dinámicas:**
```javascript
// next.config.js
output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
```

## 🧪 Pasos de Verificación

### 1. **Verificar Build Localmente**
```bash
# Limpiar builds anteriores
rm -rf .next out

# Construir para producción
npm run build

# Verificar que se cree el directorio standalone
ls -la .next/standalone/

# Probar ejecución local
npm start
```

### 2. **Verificar Estructura de Archivos en Render**
En el dashboard de Render:
1. Ir a "Deploy" → "Build logs"
2. Buscar líneas que muestren:
   - `Standalone build created in .next/standalone`
   - `Copying files...`

### 3. **Verificar Variables de Entorno**
En Render Dashboard:
1. Asegurarse de que `PORT=3000` esté configurado
2. Verificar que `NODE_ENV=production` esté configurado

## 🔧 Soluciones Alternativas

### 1. **Si el problema persiste con standalone:**

**Opción A: Usar servidor personalizado**
Crear `server.js` en la raíz:
```javascript
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url, true))
  })

  const port = process.env.PORT || 3000
  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port}`)
  })
})
```

Actualizar `package.json`:
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

**Opción B: Usar exportación estática (requiere cambios en la aplicación)**
1. Modificar todas las rutas API para incluir `generateStaticParams()`
2. Cambiar la lógica de autenticación para no depender de localStorage en redirecciones iniciales
3. Configurar como sitio estático en Render

## 📊 Monitoreo Post-Corrección

### 1. **Verificar Logs de Render**
```bash
# Logs esperados:
# > Ready on http://localhost:3000
# o
# > Ready on port 3000
```

### 2. **Probar Endpoints**
- `https://whatsagent.onrender.com/` - Página principal
- `https://whatsagent.onrender.com/login` - Página de login
- `https://whatsagent.onrender.com/api/settings` - API endpoint

### 3. **Verificar Redirecciones**
La página principal debería redirigir correctamente:
- Si hay token: `/dashboard`
- Si no hay token: `/login`

## ⚠️ Problemas Conocidos y Soluciones

### 1. **Redirección en Página Principal**
**Problema:** La página principal redirige basándose en localStorage, que no está disponible en el servidor.

**Solución:** Implementar redirección del lado del cliente:
```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Esta lógica solo se ejecuta en el cliente
    const token = localStorage.getItem('token')
    
    if (token) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, [router])

  // Mientras se resuelve la redirección, mostrar loading
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="loading-dots">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  )
}
```

### 2. **Problemas con Puerto en Render**
**Problema:** Render asigna dinámicamente el puerto a través de la variable de entorno `PORT`.

**Solución:** Asegurarse de que la aplicación use `process.env.PORT`:
```javascript
// En next.config.js o servidor personalizado
const port = process.env.PORT || 3000
```

## 📞 Soporte Adicional

Si el problema persiste:

1. **Verificar Build Logs en Render:**
   - Buscar errores durante la fase de build
   - Confirmar que el standalone build se complete

2. **Verificar Runtime Logs en Render:**
   - Buscar errores al iniciar la aplicación
   - Confirmar que el servidor escuche en el puerto correcto

3. **Contactar Soporte de Render:**
   - Proporcionar logs de build y runtime
   - Indicar que es una aplicación Next.js con `output: 'standalone'`

## 🎯 Checklist Final de Verificación

Antes de considerar resuelto el problema:

- [ ] ✅ Página principal responde (no 404)
- [ ] ✅ Redirección funciona correctamente
- [ ] ✅ Página de login es accesible
- [ ] ✅ Dashboard es accesible tras login
- [ ] ✅ API endpoints responden correctamente
- [ ] ✅ No hay errores de consola relacionados con rutas
- [ ] ✅ Aplicación funciona en múltiples navegadores

## 📈 Próximos Pasos

1. **Implementar monitoreo de salud del servicio**
2. **Configurar dominio personalizado**
3. **Optimizar rendimiento de carga**
4. **Implementar logging avanzado**
5. **Configurar backups automáticos**