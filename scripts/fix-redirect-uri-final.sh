#!/bin/bash

echo "🔧 Corrigindo URL de redirecionamento final..."

# Atualizar META_REDIRECT_URI para URL específica
echo "📝 Atualizando META_REDIRECT_URI para URL específica..."
sed -i 's|META_REDIRECT_URI=https://localhost/|META_REDIRECT_URI=https://localhost:5173/whatsapp-credentials|g' src/.env

echo "✅ URL de redirecionamento atualizada!"
echo ""
echo "📋 Configuração atualizada:"
echo "   - META_REDIRECT_URI: https://localhost:5173/whatsapp-credentials"
echo ""
echo "🔧 Próximos passos:"
echo "   1. Configurar URL no Facebook Developers"
echo "   2. Reiniciar backend"
echo "   3. Testar integração"
echo ""
echo "🔄 Execute: ./scripts/restart-backend.sh"


