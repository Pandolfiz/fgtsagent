# Etapa 1: Dependências e build
FROM node:20-alpine AS build
WORKDIR /app

# Copiar arquivos de configuração primeiro (melhor uso de cache)
COPY package*.json ./
COPY vite.config.js postcss.config.cjs tailwind.config.cjs ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Construir aplicação
RUN npm run build

# Etapa 2: Imagem final com Nginx para servir o frontend
FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 