#!/bin/bash

echo "🔧 Corrigindo redirect URI da Meta..."

# Fazer backup do .env atual
if [ -f "src/.env" ]; then
    echo "📋 Fazendo backup do .env atual..."
    cp src/.env src/.env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Atualizar META_REDIRECT_URI para usar HTTP
echo "🔧 Atualizando META_REDIRECT_URI para HTTP..."
sed -i 's|https://fgtsagent.com.br/api/whatsapp-credentials/facebook/auth|http://localhost:3000/api/whatsapp-credentials/facebook/auth|g' src/.env

# Verificar se foi atualizado
echo "✅ Verificação da atualização:"
grep "META_REDIRECT_URI" src/.env

echo ""
echo "💡 Próximos passos:"
echo "1. Configure o mesmo URI no app da Meta:"
echo "   http://localhost:3000/api/whatsapp-credentials/facebook/auth"
echo "2. Reinicie o servidor"
echo "3. Teste a autenticação novamente"
