# Etapa 1: Build das dependências
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Etapa 2: Copiar código e rodar app
FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Criar diretórios necessários
RUN mkdir -p logs uploads

# Configurar variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Usuário não-root para segurança
USER node

EXPOSE 3000

# Healthcheck para monitoramento
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]