# 🚀 CHECKLIST DE DESPLIEGUE EN RENDER

## ✅ Preparación del Proyecto

### 1. Verificación de Archivos
- [ ] Eliminar carpetas de backup (`proyecto-empresas(backup)/`)
- [ ] Verificar que no haya archivos temporales o de sistema
- [ ] Confirmar que el archivo `tsconfig.json` excluya carpetas innecesarias
- [ ] Verificar que el archivo `.gitignore` excluya carpetas de backup

### 2. Configuración de TypeScript
- [ ] Asegurarse de que `tsconfig.json` tenga la configuración correcta
- [ ] Verificar que no haya errores de tipo en el código
- [ ] Confirmar que el código maneje correctamente tipos `unknown`

### 3. Configuración de Render
- [ ] Verificar que `render.yaml` tenga las URLs correctas
- [ ] Confirmar que las variables de entorno estén configuradas
- [ ] Asegurarse de que los comandos de build y start sean correctos

## 🛠️ Correcciones Realizadas

### 1. Error de Tipo TypeScript
**Problema**: `Type error: 'syncError' is of type 'unknown'.`
**Solución**: 
```typescript
// Antes (incorrecto)
console.warn('⚠️ No se pudo notificar al backend:', syncError.message)

// Después (correcto)
const errorMessage = syncError instanceof Error ? syncError.message : String(syncError);
console.warn('⚠️ No se pudo notificar al backend:', errorMessage)
```

### 2. Exclusión de Carpetas de Backup
**Problema**: TypeScript intentaba compilar archivos en la carpeta de backup
**Solución**:
- Agregado `proyecto-empresas(backup)` a `tsconfig.json` en `exclude`
- Agregado `proyecto-empresas(backup)/` a `.gitignore`
- Modificado script de carga para excluir la carpeta de backup

### 3. Configuración de URLs en Render
**Problema**: Variable `NEXT_PUBLIC_API_URL` apuntaba a un servicio incorrecto
**Solución**: Cambiada a `https://whatsapp-advisor-backend.onrender.com`

## 🔧 Pasos para Desplegar

### 1. Preparar el Repositorio
```bash
# Limpiar archivos innecesarios
rm -rf proyecto-empresas(backup)/  # En sistemas Unix
# En Windows: Eliminar manualmente la carpeta

# Verificar archivos excluidos
git status --ignored
```

### 2. Verificar Configuración
```bash
# Verificar TypeScript
npx tsc --noEmit

# Verificar build de Next.js
npm run build
```

### 3. Subir Cambios
```bash
# Subir cambios al repositorio
node -r dotenv/config upload-complete-project.js
```

### 4. Desplegar en Render
1. Ir a https://dashboard.render.com
2. Conectar el repositorio de GitHub
3. Verificar que `render.yaml` se detecte correctamente
4. Iniciar el despliegue automático

## 📋 Verificación Post-Despliegue

### 1. Verificar Logs
- [ ] Revisar logs del backend en Render
- [ ] Revisar logs del frontend en Render
- [ ] Confirmar que no haya errores de compilación

### 2. Probar Funcionalidades
- [ ] Acceder al dashboard
- [ ] Probar configuración del sistema
- [ ] Verificar conexión con el backend
- [ ] Probar endpoints de API

### 3. Monitoreo
- [ ] Configurar alertas de error
- [ ] Verificar métricas de rendimiento
- [ ] Confirmar disponibilidad del servicio

## ⚠️ Problemas Comunes y Soluciones

### 1. Errores de Tipo TypeScript
**Síntoma**: `Type error: 'variable' is of type 'unknown'.`
**Solución**: Siempre verificar tipos antes de acceder a propiedades:
```typescript
// Correcto
if (error instanceof Error) {
  console.log(error.message);
}

// O usar type assertion seguro
const errorMessage = error instanceof Error ? error.message : String(error);
```

### 2. Problemas de Rutas en Render
**Síntoma**: Errores 404 o 500 en endpoints
**Solución**: Verificar que las URLs en `render.yaml` sean correctas y coincidan con los nombres de servicio.

### 3. Problemas de Variables de Entorno
**Síntoma**: Errores de conexión o funcionalidades incompletas
**Solución**: Verificar que todas las variables de entorno requeridas estén configuradas en Render.

## 📞 Soporte

Si encuentras problemas durante el despliegue:

1. **Errores de Compilación**: Verifica los logs de build en Render
2. **Errores de Ejecución**: Revisa los logs de runtime en Render
3. **Problemas de Conectividad**: Verifica las configuraciones de red y URLs

Para soporte adicional, consulta la [documentación de Render](https://render.com/docs).