#!/bin/bash

echo "🔧 Configurando domínio de produção para Meta OAuth..."

# Atualizar META_REDIRECT_URI para domínio de produção
echo "📝 Atualizando META_REDIRECT_URI para domínio de produção..."
sed -i 's|META_REDIRECT_URI=https://localhost:5173/|META_REDIRECT_URI=https://fgtsagent.com.br/|g' src/.env

echo "✅ Configuração atualizada para domínio de produção!"
echo ""
echo "📋 Configuração atualizada:"
echo "   - META_REDIRECT_URI: https://fgtsagent.com.br/"
echo ""
echo "🔧 Próximos passos:"
echo "   1. Configurar URL de redirecionamento no Facebook Developers"
echo "   2. Testar em ambiente de produção"
echo "   3. Ou usar proxy reverso para desenvolvimento"
echo ""
echo "🔄 Execute: ./scripts/setup-production-test.sh"


