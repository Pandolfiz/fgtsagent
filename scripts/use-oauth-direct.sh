#!/bin/bash

echo "🔧 Configurando OAuth direto em vez do Embedded Signup..."

# Atualizar configuração para usar OAuth direto
echo "📝 Atualizando configuração do Facebook SDK..."

# Criar arquivo de configuração temporário
cat > frontend/src/config/facebook-oauth.ts << 'EOF'
// Configuração do Facebook SDK para OAuth direto
export const FACEBOOK_OAUTH_CONFIG = {
  // App ID do Facebook
  APP_ID: import.meta.env.VITE_APP_META_APP_ID || '980766987152980',

  // URL de redirecionamento
  REDIRECT_URI: 'https://localhost:3000/api/whatsapp-credentials/facebook/auth',

  // Escopo das permissões
  SCOPE: 'whatsapp_business_management,whatsapp_business_messaging,business_management',

  // Configurações do SDK
  SDK_CONFIG: {
    autoLogAppEvents: true,
    xfbml: true,
    cookie: true,
    status: true,
  },

  // Versão da API
  API_VERSION: 'v23.0'
};

export const isFacebookOAuthConfigured = () => {
  return FACEBOOK_OAUTH_CONFIG.APP_ID !== 'your_META_APP_ID_here';
};
EOF

echo "✅ Configuração OAuth direto criada!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Configurar URL no Facebook Developers"
echo "   2. Atualizar código para usar OAuth direto"
echo "   3. Testar integração"
echo ""
echo "🔄 Execute: ./scripts/update-oauth-code.sh"


