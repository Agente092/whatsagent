# AromaFlow Knowledge Base - Vuelo 413
**Proyecto**: Sistema AromaFlow V10
**Mantenido por**: Todos los agentes especializados
**Última Actualización**: 2025-07-11

## Arquitectura del Sistema

### Stack Tecnológico Base
**Frontend Preferido**:
- React con Vite (proyectos modernos)
- Next.js (aplicaciones full-stack)
- HTML5 + CSS3 + JavaScript (proyectos simples)

**Backend Preferido**:
- Node.js + Express (APIs rápidas)
- Python + FastAPI (análisis de datos)
- Supabase (base de datos + auth)

**Herramientas de Desarrollo**:
- Git para control de versiones
- VS Code como editor principal
- Chrome DevTools para debugging

### Patrones de Arquitectura Exitosos

#### Patrón MVC Simplificado
```
/src
  /components (Vista)
  /services (Controlador)
  /utils (Modelo/Utilidades)
  /styles (CSS/Estilos)
```

#### Patrón de Componentes Reutilizables
- Componentes atómicos (botones, inputs)
- Componentes moleculares (formularios, cards)
- Componentes organizacionales (layouts, páginas)

### Mejores Prácticas Identificadas

#### Desarrollo Frontend
- Mobile-first responsive design
- Semantic HTML para accesibilidad
- CSS Grid + Flexbox para layouts
- Lazy loading para optimización
- Progressive Web App (PWA) cuando sea posible

#### Desarrollo Backend
- RESTful API design
- Validación de datos en servidor
- Manejo de errores consistente
- Logging para debugging
- Rate limiting para seguridad

#### Base de Datos
- Normalización para integridad
- Índices para performance
- Backups automáticos
- Row Level Security (RLS) con Supabase

### Tecnologías por Contexto

#### Proyectos Simples (< 2 horas)
- HTML + CSS + Vanilla JavaScript
- Single file applications
- CDN para librerías externas

#### Proyectos Medianos (2-8 horas)
- React + Vite
- CSS Modules o Styled Components
- Axios para HTTP requests
- Local Storage para persistencia

#### Proyectos Complejos (> 8 horas)
- Next.js full-stack
- TypeScript para type safety
- Supabase para backend
- Vercel para deployment

### Patrones de UI/UX Exitosos

#### Diseño Visual
- Paletas de colores limitadas (3-5 colores)
- Tipografía consistente (máximo 2 fuentes)
- Espaciado sistemático (8px, 16px, 24px, 32px)
- Iconografía coherente (Lucide, Heroicons)

#### Experiencia de Usuario
- Navegación intuitiva (máximo 3 clics)
- Feedback visual inmediato
- Estados de carga claros
- Mensajes de error útiles
- Accesibilidad WCAG AA

### Integraciones Comunes

#### APIs Externas
- OpenAI para IA
- Stripe para pagos
- SendGrid para emails
- Cloudinary para imágenes

#### Servicios de Terceros
- Vercel/Netlify para hosting
- GitHub para repositorios
- Supabase para backend
- Figma para diseño

### Decisiones Técnicas Documentadas

#### Frameworks Frontend
**React elegido por**:
- Ecosistema maduro
- Componentes reutilizables
- Comunidad activa
- Fácil testing

#### Base de Datos
**Supabase elegido por**:
- Setup rápido
- Auth integrado
- Real-time subscriptions
- PostgreSQL robusto

### Errores Comunes Evitados
- No usar jQuery en proyectos nuevos
- Evitar CSS inline en producción
- No hardcodear URLs de API
- Siempre validar inputs del usuario
- No exponer claves secretas en frontend

### Recursos de Referencia
- MDN Web Docs para estándares web
- React Documentation oficial
- Supabase Documentation
- Can I Use para compatibilidad
- A11y Project para accesibilidad

### Evolución del Sistema
**V10 Mejoras**:
- Flujos adaptativos (EXPRESS/COMPLETO/CRÍTICO)
- Memory-bank consolidado (3 archivos vs 13)
- Testing integrado durante desarrollo
- Paralelización con Michael + Alex
- Ares como auditor supremo con poder de veto

### Próximas Mejoras Planificadas
- Integración con GitHub Actions para CI/CD
- Templates automatizados por tipo de proyecto
- Métricas de performance automáticas
- Sistema de aprendizaje de patrones exitosos
