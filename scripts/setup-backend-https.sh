#!/bin/bash

echo "🔧 Configurando HTTPS no backend..."

# Criar diretório para certificados do backend
echo "📁 Criando diretório para certificados..."
mkdir -p src/certs

# Copiar certificados do frontend para o backend
echo "📋 Copiando certificados SSL..."
cp frontend/certs/cert.pem src/certs/
cp frontend/certs/key.pem src/certs/

echo "✅ Certificados copiados para src/certs/"
echo ""
echo "📋 Próximos passos:"
echo "   1. Configurar HTTPS no server.js"
echo "   2. Reiniciar backend"
echo "   3. Adicionar URL no Facebook Developers"
echo ""
echo "🔄 Execute: ./scripts/update-server-https.sh"


