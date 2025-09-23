# =================================
# Dockerfile para WhatsApp Business Advisor
# Optimizado para Render.com
# =================================

FROM node:18-alpine

# Instalar dependencias del sistema necesarias para Baileys
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci --only=production

# Generar cliente de Prisma
RUN npx prisma generate

# Copiar código fuente
COPY . .

# Crear directorios necesarios
RUN mkdir -p logs auth_info_baileys data

# Construir la aplicación Next.js
RUN npm run build

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Dar permisos al usuario
RUN chown -R nextjs:nodejs /app
USER nextjs

# Exponer puertos
EXPOSE 3000 3001

# Comando de inicio
CMD [\"npm\", \"run\", \"start:production\"]