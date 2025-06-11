#!/bin/bash

# Script para atualizar a produção com as novas dependências
echo "🚀 Iniciando atualização da produção..."

# Parar apenas o container da API
echo "📦 Parando container da API..."
docker compose -f docker-compose.prod.yml stop api

# Remover o container antigo da API
echo "🗑️ Removendo container antigo da API..."
docker compose -f docker-compose.prod.yml rm -f api

# Rebuildar apenas o container da API com as novas dependências
echo "🔨 Reconstruindo container da API com novas dependências..."
docker compose -f docker-compose.prod.yml build --no-cache api

# Iniciar o container da API
echo "▶️ Iniciando container da API..."
docker compose -f docker-compose.prod.yml up -d api

# Verificar logs da API
echo "📋 Verificando logs da API..."
docker compose -f docker-compose.prod.yml logs -f --tail=50 api

echo "✅ Atualização concluída!" 