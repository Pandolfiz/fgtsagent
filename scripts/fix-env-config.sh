#!/bin/bash

echo "🔧 Corrigindo configuração de variáveis de ambiente..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script na raiz do projeto"
    exit 1
fi

# Backup do arquivo .env atual
if [ -f ".env" ]; then
    echo "📋 Fazendo backup do .env atual..."
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Criar novo arquivo .env com configurações corretas
echo "📝 Criando novo arquivo .env..."
cat > .env << 'EOF'
# ==============================================
# CONFIGURAÇÕES GLOBAIS DA APLICAÇÃO
# ==============================================
NODE_ENV=development
APP_NAME="FgtsAgent"
APP_VERSION="1.0.0"

# ==============================================
# PORTAS DOS SERVIÇOS
# ==============================================
BACKEND_PORT=3000          # Backend Node.js
FRONTEND_PORT=5173         # Frontend Vite (desenvolvimento)
NGINX_PORT=80              # Nginx (produção)

# ==============================================
# URLs DOS SERVIÇOS
# ==============================================
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
APP_URL=http://localhost:3000

# ==============================================
# CONFIGURAÇÕES DE SEGURANÇA
# ==============================================
SESSION_SECRET=dev-session-secret-key-32-chars-long
JWT_SECRET=dev-jwt-secret-key-32-chars-long

# ==============================================
# CONFIGURAÇÕES DO SUPABASE
# ==============================================
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima-do-supabase
SUPABASE_SERVICE_KEY=sua-chave-de-servico-do-supabase
SUPABASE_JWT_SECRET=sua-jwt-secret-do-supabase

# ==============================================
# CONFIGURAÇÕES OAUTH (OPCIONAL)
# ==============================================
OAUTH_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/google/callback
USE_SUPABASE_AUTH=true

# ==============================================
# CONFIGURAÇÕES DO WHATSAPP/EVOLUTION API
# ==============================================
WHATSAPP_ACCESS_TOKEN=seu-token-do-whatsapp
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-da-evolution-api

# ==============================================
# CONFIGURAÇÕES DO FACEBOOK/META API
# ==============================================
META_APP_ID=seu-facebook-app-id
META_APP_SECRET=seu-facebook-app-secret
META_REDIRECT_URI=http://localhost:3000/auth/facebook/callback

# ==============================================
# CONFIGURAÇÕES N8N (OPCIONAL)
# ==============================================
N8N_API_URL=http://localhost:5678

# ==============================================
# CONFIGURAÇÕES DE LOGS E MONITORAMENTO
# ==============================================
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true

# ==============================================
# CONFIGURAÇÕES DO STRIPE
# ==============================================
STRIPE_SECRET_KEY=sk_test_sua_chave_secreta_aqui
STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_publica_aqui
STRIPE_WEBHOOK_SECRET=whsec_sua_chave_de_webhook_aqui

# ==============================================
# CONFIGURAÇÕES DE EMAIL (SE USAR SMTP CUSTOMIZADO)
# ==============================================
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=seu-email@gmail.com
# SMTP_PASS=sua-senha-de-app

# ==============================================
# CONFIGURAÇÕES DE PRODUÇÃO (ALTERAR EM PRODUÇÃO)
# ==============================================
# NODE_ENV=production
# BACKEND_URL=https://api.fgtsagent.com.br
# FRONTEND_URL=https://fgtsagent.com.br
# APP_URL=https://fgtsagent.com.br
# META_REDIRECT_URI=https://fgtsagent.com.br/auth/facebook/callback
# OAUTH_SUPABASE_REDIRECT_URL=https://fgtsagent.com.br/auth/google/callback
EOF

# Remover arquivo .env do diretório src se existir
if [ -f "src/.env" ]; then
    echo "🗑️ Removendo .env duplicado do diretório src..."
    rm src/.env
fi

echo "✅ Configuração corrigida com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Edite o arquivo .env com suas configurações reais"
echo "2. Execute: npm run dev:all"
echo "3. O backend deve rodar na porta 3000"
echo "4. O frontend deve rodar na porta 5173"
echo ""
echo "🔍 Para verificar se está funcionando:"
echo "   Backend: http://localhost:3000/api/health"
echo "   Frontend: http://localhost:5173"
