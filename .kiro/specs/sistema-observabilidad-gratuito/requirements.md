# Requirements Document - Sistema de Observabilidad Gratuito

## Introduction

Este proyecto implementará un sistema completo de observabilidad gratuito para el WhatsApp Business Advisor, incluyendo logging robusto, testing automatizado y monitoring básico sin costos adicionales.

## Requirements

### Requirement 1 - Sistema de Logging Robusto

**User Story:** Como administrador del sistema, quiero tener logs detallados de todas las operaciones, para poder diagnosticar problemas rápidamente y entender el comportamiento del sistema.

#### Acceptance Criteria

1. WHEN el sistema inicia THEN SHALL registrar el evento de inicio con timestamp y configuración
2. WHEN llega un mensaje de WhatsApp THEN SHALL registrar el mensaje, cliente, timestamp y procesamiento
3. WHEN ocurre un error THEN SHALL registrar el error completo con stack trace y contexto
4. WHEN se procesa con IA THEN SHALL registrar tiempo de respuesta y tokens utilizados
5. WHEN se envía una respuesta THEN SHALL registrar el mensaje enviado y estado de entrega
6. IF el sistema tiene alta carga THEN SHALL rotar logs automáticamente para evitar llenar disco
7. WHEN se consulta la API THEN SHALL registrar endpoint, método, IP y tiempo de respuesta

### Requirement 2 - Testing Automatizado Básico

**User Story:** Como desarrollador, quiero tener tests automatizados que validen las funciones críticas del sistema, para poder hacer cambios con confianza sin romper funcionalidad existente.

#### Acceptance Criteria

1. WHEN se ejecutan los tests THEN SHALL validar todas las rutas de API principales
2. WHEN se prueba la conexión a base de datos THEN SHALL verificar CRUD de clientes
3. WHEN se prueba el servicio de WhatsApp THEN SHALL validar formateo de mensajes
4. WHEN se prueba el servicio de IA THEN SHALL validar respuestas con mocks
5. WHEN se prueba autenticación THEN SHALL validar login y tokens JWT
6. IF algún test falla THEN SHALL mostrar error específico y ubicación
7. WHEN se ejecuta `npm test` THEN SHALL correr todos los tests en menos de 30 segundos

### Requirement 3 - Monitoring Básico Gratuito

**User Story:** Como administrador, quiero monitorear la salud básica del sistema en tiempo real, para detectar problemas antes de que afecten a los usuarios.

#### Acceptance Criteria

1. WHEN el sistema está funcionando THEN SHALL mostrar métricas básicas en endpoint /health
2. WHEN se consulta /metrics THEN SHALL mostrar uso de memoria, CPU y requests por minuto
3. WHEN hay errores frecuentes THEN SHALL incrementar contador de errores
4. WHEN el sistema está sobrecargado THEN SHALL mostrar warning en métricas
5. IF la base de datos no responde THEN SHALL marcar health check como unhealthy
6. WHEN WhatsApp está desconectado THEN SHALL reflejarse en health status
7. WHEN se consultan métricas THEN SHALL incluir uptime del sistema

### Requirement 4 - Dashboard de Observabilidad Simple

**User Story:** Como administrador, quiero una página simple que muestre el estado del sistema y logs recientes, para tener visibilidad completa sin herramientas externas.

#### Acceptance Criteria

1. WHEN accedo a /admin/logs THEN SHALL mostrar últimos 100 logs con filtros
2. WHEN accedo a /admin/health THEN SHALL mostrar estado de todos los servicios
3. WHEN hay errores críticos THEN SHALL destacarlos en rojo en el dashboard
4. WHEN el sistema funciona bien THEN SHALL mostrar indicadores verdes
5. IF hay problemas de performance THEN SHALL mostrar alertas amarillas
6. WHEN se actualiza la página THEN SHALL mostrar datos en tiempo real
7. WHEN filtro logs por nivel THEN SHALL mostrar solo logs del nivel seleccionado