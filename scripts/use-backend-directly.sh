#!/bin/bash

echo "🔧 Configurando uso direto do backend..."

# Atualizar META_REDIRECT_URI para usar o backend diretamente
echo "📝 Atualizando META_REDIRECT_URI para backend direto..."
sed -i 's|META_REDIRECT_URI=https://localhost:5173/api/whatsapp-credentials/facebook/auth|META_REDIRECT_URI=https://localhost:3000/api/whatsapp-credentials/facebook/auth|g' src/.env

echo "✅ Configuração atualizada para usar backend diretamente!"
echo ""
echo "📋 Configuração atualizada:"
echo "   - META_REDIRECT_URI: https://localhost:3000/api/whatsapp-credentials/facebook/auth"
echo ""
echo "🔧 Próximos passos:"
echo "   1. Configurar HTTPS no backend"
echo "   2. Adicionar URL no Facebook Developers"
echo "   3. Reiniciar backend"
echo ""
echo "🔄 Execute: ./scripts/setup-backend-https.sh"


