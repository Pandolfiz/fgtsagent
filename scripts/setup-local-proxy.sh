#!/bin/bash

echo "🔧 Configurando proxy local para desenvolvimento..."

# Atualizar META_REDIRECT_URI para localhost sem porta
echo "📝 Atualizando META_REDIRECT_URI para localhost sem porta..."
sed -i 's|META_REDIRECT_URI=https://localhost:5173/|META_REDIRECT_URI=https://localhost/|g' src/.env

echo "✅ Configuração atualizada para localhost!"
echo ""
echo "📋 Configuração atualizada:"
echo "   - META_REDIRECT_URI: https://localhost/"
echo ""
echo "🔧 Próximos passos:"
echo "   1. Configurar proxy reverso no Nginx"
echo "   2. Mapear localhost:80 para localhost:5173"
echo "   3. Testar integração"
echo ""
echo "🔄 Execute: ./scripts/configure-nginx-proxy.sh"


