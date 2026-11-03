FROM node:22-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorios de datos y uploads
RUN mkdir -p data uploads/avatars uploads/logos

EXPOSE 4000

ENV NODE_ENV=production

CMD ["npm", "start"]

