#!/bin/bash

echo "🔧 Corrigindo URL de redirecionamento para HTTPS..."

# Atualizar META_REDIRECT_URI no backend para usar a porta do frontend
echo "📝 Atualizando META_REDIRECT_URI para porta do frontend..."
sed -i 's|META_REDIRECT_URI=https://localhost:3000/api/whatsapp-credentials/facebook/auth|META_REDIRECT_URI=https://localhost:5173/api/whatsapp-credentials/facebook/auth|g' src/.env

echo "✅ URL de redirecionamento atualizada para porta do frontend!"
echo ""
echo "📋 Configuração atualizada:"
echo "   - META_REDIRECT_URI: https://localhost:5173/api/whatsapp-credentials/facebook/auth"
echo ""
echo "🔄 Reinicie o backend para aplicar as mudanças:"
echo "   cd src && npm run dev"
