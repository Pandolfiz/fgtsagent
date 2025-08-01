# Etapa 1: Build local (será feito fora do container)
# Esta etapa assume que o build já foi feito localmente

# Etapa 2: Imagem final com Alpine para copiar arquivos
FROM alpine:3.19 AS final

# Instalar rsync para cópia de arquivos
RUN apk add --no-cache rsync

# Copiar arquivos construídos (assumindo que dist/ já existe)
COPY dist/ /dist/

# Comando para copiar arquivos para o volume montado e manter container ativo
CMD ["sh", "-c", "rsync -av --delete /dist/ /usr/share/nginx/html/ && echo 'Frontend files copied successfully' && tail -f /dev/null"] 