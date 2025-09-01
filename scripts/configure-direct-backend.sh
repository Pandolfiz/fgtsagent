#!/bin/bash

echo "🔧 Configurando frontend para acessar backend diretamente..."

# Atualizar VITE_API_URL no frontend para usar HTTPS
echo "📝 Atualizando VITE_API_URL para HTTPS..."
sed -i 's|VITE_API_URL=http://localhost:3000|VITE_API_URL=https://localhost:3000|g' frontend/.env

echo "✅ Frontend configurado para acessar backend diretamente!"
echo ""
echo "📋 Configuração atualizada:"
echo "   - VITE_API_URL: https://localhost:3000"
echo ""
echo "🔄 Reinicie o frontend:"
echo "   cd frontend && npm run dev"


