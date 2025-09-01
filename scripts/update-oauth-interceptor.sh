#!/bin/bash

echo "🔧 Atualizando código para interceptar redirecionamento OAuth..."

# Atualizar META_REDIRECT_URI para URL base
echo "📝 Atualizando META_REDIRECT_URI para URL base..."
sed -i 's|META_REDIRECT_URI=https://localhost:5173/api/whatsapp-credentials/facebook/auth|META_REDIRECT_URI=https://localhost:5173/|g' src/.env

echo "✅ Configuração atualizada!"
echo ""
echo "🔄 Agora vou atualizar o código para interceptar o redirecionamento..."


