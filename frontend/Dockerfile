# Etapa 1: Build local (será feito fora do container)
# Esta etapa assume que o build já foi feito localmente

# Etapa 2: Imagem final com Alpine + nginx
FROM alpine:3.19 AS final

# Instalar nginx e curl
RUN apk add --no-cache nginx curl

# Criar diretório para arquivos web
RUN mkdir -p /usr/share/nginx/html

# Copiar arquivos construídos
COPY dist/ /usr/share/nginx/html/

# Configurar nginx para rodar em foreground
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

# Expor porta 80
EXPOSE 80

# Health check para o frontend
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Comando para iniciar nginx
CMD ["nginx"]
