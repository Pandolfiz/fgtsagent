# Etapa 1: Build
FROM node:20-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production --no-audit

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Etapa 2: Imagem final
FROM nginx:1.25-alpine

# Instalar curl para health check
RUN apk add --no-cache curl

# Remover configuração padrão do nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copiar configuração personalizada do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

# Expor porta 80
EXPOSE 80

# Health check para o frontend
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Comando para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
