# Etapa 1: Dependências e build
FROM node:20-alpine AS build

# Aceitar argumentos de build
ARG VITE_API_URL
ARG NODE_ENV=production

# Definir variáveis de ambiente para o build
ENV VITE_API_URL=$VITE_API_URL
ENV NODE_ENV=$NODE_ENV

WORKDIR /app

# Copiar arquivos de configuração primeiro (melhor uso de cache)
COPY package*.json ./

# Instalar TODAS as dependências (incluindo devDependencies)
# Remover --prefer-offline que pode causar problemas
RUN npm ci --include=dev --no-audit

# Copiar arquivos de configuração de build
COPY vite.config.js postcss.config.cjs tailwind.config.cjs ./

# Copiar código fonte
COPY . .

# Verificar se vite está disponível antes do build
RUN npx vite --version

# Construir aplicação
RUN npm run build

# Verificar se dist foi criado
RUN ls -la dist/ || (echo "❌ Build falhou - pasta dist não encontrada" && exit 1)

# Etapa 2: Imagem final com Alpine para copiar arquivos
FROM alpine:3.19 AS final

# Instalar rsync para cópia de arquivos
RUN apk add --no-cache rsync

# Copiar arquivos construídos
COPY --from=build /app/dist /dist

# Comando para copiar arquivos para o volume montado
CMD ["sh", "-c", "rsync -av --delete /dist/ /usr/share/nginx/html/ && tail -f /dev/null"] 