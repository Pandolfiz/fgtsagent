#!/bin/bash

echo "🔍 Testando configuração do Facebook App..."
echo "=========================================="

# Verificar se o app ID está configurado
echo "📋 Verificando configurações do app..."

# Ler app ID do .env
if [ -f "src/.env" ]; then
    META_APP_ID=$(grep "META_APP_ID=" src/.env | cut -d'=' -f2)
    echo "✅ META_APP_ID encontrado: $META_APP_ID"
else
    echo "❌ Arquivo src/.env não encontrado"
    exit 1
fi

# Verificar se o app ID do frontend está configurado
if [ -f "frontend/.env" ]; then
    VITE_APP_META_APP_ID=$(grep "VITE_APP_META_APP_ID=" frontend/.env | cut -d'=' -f2)
    echo "✅ VITE_APP_META_APP_ID encontrado: $VITE_APP_META_APP_ID"
else
    echo "❌ Arquivo frontend/.env não encontrado"
    exit 1
fi

# Verificar se os IDs são iguais
if [ "$META_APP_ID" = "$VITE_APP_META_APP_ID" ]; then
    echo "✅ App IDs são consistentes entre frontend e backend"
else
    echo "❌ App IDs são diferentes!"
    echo "   Backend: $META_APP_ID"
    echo "   Frontend: $VITE_APP_META_APP_ID"
fi

echo ""
echo "🔧 Configurações necessárias no Facebook Developer Console:"
echo "=========================================================="
echo "1. App ID: $META_APP_ID"
echo "2. App Domains: localhost"
echo "3. Valid OAuth Redirect URIs: https://localhost/"
echo "4. Permissões necessárias:"
echo "   - whatsapp_business_management"
echo "   - whatsapp_business_messaging" 
echo "5. Produtos necessários:"
echo "   - WhatsApp Business API"
echo "   - Facebook Login"
echo ""

echo "📱 Para testar:"
echo "1. Acesse: https://localhost/"
echo "2. Vá para WhatsApp Credentials"
echo "3. Clique em 'Conectar com Facebook'"
echo "4. Verifique se todas as permissões são solicitadas"
echo "5. Observe os logs no console do navegador"
echo ""

echo "🔍 Para verificar logs em tempo real:"
echo "bash scripts/test-whatsapp-debug.sh"

