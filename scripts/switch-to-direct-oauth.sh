#!/bin/bash

echo "🔧 Alternando para OAuth direto..."

# Atualizar META_REDIRECT_URI para URL base
echo "📝 Atualizando META_REDIRECT_URI para URL base..."
sed -i 's|META_REDIRECT_URI=https://localhost:5173/whatsapp-credentials|META_REDIRECT_URI=https://localhost:5173/|g' src/.env

echo "✅ Configuração atualizada para OAuth direto!"
echo ""
echo "📋 Configuração atualizada:"
echo "   - META_REDIRECT_URI: https://localhost:5173/"
echo ""
echo "🔧 Próximos passos:"
echo "   1. Configurar URL base no Facebook Developers"
echo "   2. Atualizar código para usar OAuth direto"
echo "   3. Testar integração"
echo ""
echo "🔄 Execute: ./scripts/update-direct-oauth-code.sh"


