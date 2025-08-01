# Etapa 1: Build das dependências
FROM node:20-alpine AS dependencies

# Instalar dependências de sistema
RUN apk add --no-cache \
    dumb-init \
    tini \
    tzdata && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copiar package.json para cache otimizado
COPY package*.json ./

# Instalar dependências com cache otimizado
RUN npm ci --only=production --no-audit --prefer-offline && \
    npm cache clean --force

# Etapa 2: Imagem final de produção
FROM node:20-alpine AS production

# Instalar dependências de sistema
RUN apk add --no-cache \
    dumb-init \
    tini \
    tzdata \
    curl && \
    rm -rf /var/cache/apk/*

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Definir timezone
ENV TZ=America/Sao_Paulo

# Configurações otimizadas de produção
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=512 --enable-source-maps"

WORKDIR /app

# Copiar dependências da stage anterior
COPY --from=dependencies --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copiar código da aplicação
COPY --chown=nodeuser:nodejs . .

# Criar diretórios necessários com permissões
RUN mkdir -p logs uploads temp && \
    chown -R nodeuser:nodejs logs uploads temp && \
    chmod 755 logs uploads temp

# Expor porta
EXPOSE 3000

# Mudar para usuário não-root
USER nodeuser

# Health check otimizado
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Usar tini como init system para handling correto de sinais
ENTRYPOINT ["tini", "--"]

# Comando principal
CMD ["node", "server.js"]