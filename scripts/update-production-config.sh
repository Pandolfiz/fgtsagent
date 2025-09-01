#!/bin/bash

echo "🚀 Atualizando configurações para produção..."

# Atualizar META_REDIRECT_URI no backend
echo "📝 Atualizando META_REDIRECT_URI para produção..."
sed -i 's|META_REDIRECT_URI=http://localhost:3000/api/whatsapp-credentials/facebook/auth|META_REDIRECT_URI=https://fgtsagent.com.br/api/whatsapp-credentials/facebook/auth|g' src/.env

# Atualizar VITE_API_URL no frontend
echo "📝 Atualizando VITE_API_URL para produção..."
sed -i 's|VITE_API_URL=http://localhost:3000|VITE_API_URL=https://fgtsagent.com.br|g' frontend/.env

echo "✅ Configurações atualizadas para produção!"
echo ""
echo "📋 Configurações atualizadas:"
echo "   - META_REDIRECT_URI: https://fgtsagent.com.br/api/whatsapp-credentials/facebook/auth"
echo "   - VITE_API_URL: https://fgtsagent.com.br"
echo ""
echo "🔗 URLs para revisão da Meta:"
echo "   - Política de Privacidade: https://fgtsagent.com.br/privacy"
echo "   - Termos de Serviço: https://fgtsagent.com.br/terms"
echo ""
echo "📱 Próximos passos:"
echo "   1. Fazer deploy para produção"
echo "   2. Configurar domínios no Facebook Developers"
echo "   3. Solicitar revisão da Meta"


