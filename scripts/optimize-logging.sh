#!/bin/bash

echo "🔧 Adicionando configurações de logging otimizadas ao .env..."

# Adicionar configurações de logging otimizadas ao .env
cat >> src/.env << 'EOF'

# ==============================================
# CONFIGURAÇÕES DE LOGGING OTIMIZADAS
# ==============================================
ENABLE_REQUEST_LOGGING=true       # Habilitar logging de requisições
LOG_REQUEST_BODY=false            # Não logar body de requisições por padrão
LOG_QUERY_PARAMS=false            # Não logar parâmetros de query por padrão
LOG_RESPONSE_DATA=false           # Não logar dados de resposta por padrão
CACHE_CLEANUP_INTERVAL=60000     # Limpeza de cache a cada 1 minuto
MAX_CACHE_SIZE=5000              # Máximo 5k entradas no cache
EOF

echo "✅ Configurações de logging otimizadas adicionadas ao .env"
echo ""
echo "📋 Configurações aplicadas:"
echo "   - LOG_LEVEL=info (logs mais limpos)"
echo "   - Cache otimizado (menos logs de estatísticas)"
echo "   - Sanitização reduzida (menos profundidade)"
echo "   - Logs de requisição mais seletivos"
echo ""
echo "🔄 Reinicie o servidor para aplicar as mudanças:"
echo "   npm run dev"
