#!/bin/bash

echo "🔧 Corrigindo redirect URI da Meta..."

# Fazer backup do .env atual
if [ -f ".env" ]; then
    echo "📋 Fazendo backup do .env atual..."
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Corrigir o redirect URI
echo "📝 Corrigindo META_REDIRECT_URI..."
sed -i 's|META_REDIRECT_URI=https://localhost:5173/auth/facebook/callback|META_REDIRECT_URI=http://localhost:3000/api/whatsapp-credentials/facebook/auth|g' .env

echo "✅ Redirect URI corrigido!"
echo ""
echo "🔍 Verificando correção:"
grep "META_REDIRECT_URI" .env

echo ""
echo "💡 Próximos passos:"
echo "1. Configure o mesmo URI no app da Meta:"
echo "   http://localhost:3000/api/whatsapp-credentials/facebook/auth"
echo "2. Reinicie o servidor"
echo "3. Teste a autenticação novamente"
