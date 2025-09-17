# 🔍 CONFIGURACIÓN DE APIS DE BÚSQUEDA WEB GRATUITAS

## 📋 Resumen de Opciones Gratuitas

| API | Límite Gratuito | Costo Adicional | Calidad |
|-----|-----------------|-----------------|---------|
| **Google CSE** | 100/día | $5/1000 búsquedas | ⭐⭐⭐⭐⭐ |
| **Bing Search** | 1000/mes | $3/1000 búsquedas | ⭐⭐⭐⭐ |
| **DuckDuckGo** | Ilimitado | Gratis | ⭐⭐⭐ |

## 🚀 CONFIGURACIÓN PASO A PASO

### 1. Google Custom Search API (RECOMENDADO)

#### ✅ Ventajas:
- **100 búsquedas GRATIS por día** (3,000/mes)
- Resultados de máxima calidad
- Filtros avanzados disponibles

#### 📝 Pasos para configurar:

1. **Ir a Google Cloud Console:**
   ```
   https://console.cloud.google.com/
   ```

2. **Crear proyecto (si no tienes):**
   - Click "Nuevo Proyecto"
   - Nombre: "WhatsApp-Search-Bot"
   - Click "Crear"

3. **Habilitar Custom Search API:**
   ```
   https://console.cloud.google.com/apis/library/customsearch.googleapis.com
   ```
   - Click "HABILITAR"

4. **Crear API Key:**
   - Ir a "Credenciales" → "Crear credenciales" → "Clave de API"
   - Copiar la API Key generada

5. **Crear Search Engine:**
   ```
   https://programmablesearchengine.google.com/
   ```
   - Click "Comenzar"
   - Sitios para buscar: `www.google.com` (o `*` para toda la web)
   - Nombre: "WhatsApp Bot Search"
   - Click "Crear"
   - Copiar el **Search Engine ID**

#### 🔑 Variables de entorno:
```bash
GOOGLE_CSE_API_KEY=tu_api_key_aqui
GOOGLE_CSE_ID=tu_search_engine_id_aqui
```

### 2. Bing Search API (ALTERNATIVA)

#### ✅ Ventajas:
- **1,000 búsquedas GRATIS por mes**
- Fácil configuración
- Resultados de buena calidad

#### 📝 Pasos para configurar:

1. **Ir a Azure Portal:**
   ```
   https://portal.azure.com/
   ```

2. **Crear cuenta gratuita** (si no tienes)

3. **Crear recurso de Bing Search:**
   - Buscar "Bing Search v7"
   - Click "Crear"
   - Plan de precios: **F0 (GRATIS)**
   - Región: Cualquiera
   - Click "Revisar y crear"

4. **Obtener API Key:**
   - Ir al recurso creado
   - "Claves y punto de conexión"
   - Copiar "Clave 1"

#### 🔑 Variables de entorno:
```bash
BING_SEARCH_API_KEY=tu_bing_api_key_aqui
```

### 3. DuckDuckGo (FALLBACK GRATUITO)

#### ✅ Ventajas:
- **Completamente gratis**
- Sin límites de rate
- No requiere configuración

#### ⚠️ Limitaciones:
- Resultados menos completos
- API menos robusta

**Ya está configurado en el código, no requiere API keys.**

## 🛠️ CONFIGURACIÓN EN TU PROYECTO

### 1. Crear archivo `.env` (si no existe):
```bash
# APIs de Búsqueda Web (OPCIONAL - Usar las que tengas)
GOOGLE_CSE_API_KEY=tu_google_api_key_aqui
GOOGLE_CSE_ID=tu_google_search_engine_id_aqui
BING_SEARCH_API_KEY=tu_bing_api_key_aqui

# Gemini APIs (existentes)
GEMINI_API_KEY_1=tu_gemini_key_1
GEMINI_API_KEY_2=tu_gemini_key_2
# ... resto de tus APIs
```

### 2. El sistema funcionará con las APIs que configures:

**Orden de prioridad:**
1. **Google CSE** (si está configurado) - Mejor calidad
2. **Bing API** (si está configurado) - Buena alternativa
3. **DuckDuckGo** (siempre disponible) - Fallback gratuito

## 🎯 RECOMENDACIÓN INICIAL

**Para empezar gratis:**

1. **Solo DuckDuckGo** (ya configurado) → 0% costo
2. **Google CSE** → 100 búsquedas/día gratis
3. **Google CSE + Bing** → 100/día + 1000/mes gratis

## 📊 ESTIMACIÓN DE USO

Para un chatbot de WhatsApp:
- **Uso ligero:** 10-20 búsquedas/día → Google CSE gratis suficiente
- **Uso moderado:** 50-100 búsquedas/día → Google CSE + DuckDuckGo
- **Uso intensivo:** 100+ búsquedas/día → Google CSE + Bing + DuckDuckGo

## 🔄 MODO DE FUNCIONAMIENTO

El sistema usará **automáticamente** la mejor API disponible:

```
Mensaje de WhatsApp
     ↓
Detección de búsqueda
     ↓
1. Intenta Google CSE (si configurado)
     ↓ (si falla)
2. Intenta Bing API (si configurado)
     ↓ (si falla)
3. Usa DuckDuckGo (siempre disponible)
     ↓
Respuesta con información real
```

## 🎉 RESULTADO

Tu agente WhatsApp podrá buscar información REAL en internet sobre:
- Leyes actuales (como "One Big Beautiful Tax Bill")
- Noticias financieras
- Regulaciones internacionales
- Oportunidades de negocio
- ¡Y cualquier consulta que necesite información actualizada!

**¡Todo con información REAL extraída de internet, no hardcodeada!**