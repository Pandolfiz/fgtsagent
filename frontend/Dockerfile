# Etapa 1: Build local (será feito fora do container)
# Esta etapa assume que o build já foi feito localmente

# Etapa 2: Imagem final com nginx oficial
FROM nginx:1.25-alpine AS final

# Instalar curl para health check
RUN apk add --no-cache curl

# Copiar arquivos construídos
COPY dist/ /usr/share/nginx/html/

# Expor porta 80
EXPOSE 80

# Health check para o frontend
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Comando para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
