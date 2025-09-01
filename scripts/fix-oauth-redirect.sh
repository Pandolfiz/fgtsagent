#!/bin/bash

echo "🔧 Corrigindo problema de redirecionamento OAuth..."

# Atualizar META_REDIRECT_URI para usar URL base
echo "📝 Atualizando META_REDIRECT_URI para URL base..."
sed -i 's|META_REDIRECT_URI=https://localhost:5173/api/whatsapp-credentials/facebook/auth|META_REDIRECT_URI=https://localhost:5173/|g' src/.env

echo "✅ URL de redirecionamento atualizada para URL base!"
echo ""
echo "📋 Configuração atualizada:"
echo "   - META_REDIRECT_URI: https://localhost:5173/"
echo ""
echo "🔧 Próximos passos:"
echo "   1. Configurar URL base no Facebook Developers"
echo "   2. Atualizar código para interceptar redirecionamento"
echo "   3. Reiniciar backend"
echo ""
echo "🔄 Execute: ./scripts/update-oauth-interceptor.sh"


