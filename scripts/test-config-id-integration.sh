#!/bin/bash

echo "🔍 Testando integração com Config ID da Meta..."
echo "=============================================="

# Verificar se o Config ID está configurado
echo "📋 Verificando configurações do Config ID..."

# Ler Config ID do .env
if [ -f "src/.env" ]; then
    META_APP_CONFIG_ID=$(grep "META_APP_CONFIG_ID=" src/.env | cut -d'=' -f2)
    echo "✅ META_APP_CONFIG_ID encontrado: $META_APP_CONFIG_ID"
else
    echo "❌ Arquivo src/.env não encontrado"
    exit 1
fi

# Verificar se o Config ID do frontend está configurado
if [ -f "frontend/.env" ]; then
    VITE_APP_META_CONFIG_ID=$(grep "VITE_APP_META_CONFIG_ID=" frontend/.env | cut -d'=' -f2)
    echo "✅ VITE_APP_META_CONFIG_ID encontrado: $VITE_APP_META_CONFIG_ID"
else
    echo "❌ Arquivo frontend/.env não encontrado"
    exit 1
fi

# Verificar se os IDs são iguais
if [ "$META_APP_CONFIG_ID" = "$VITE_APP_META_CONFIG_ID" ]; then
    echo "✅ Config IDs são consistentes entre frontend e backend"
else
    echo "❌ Config IDs são diferentes!"
    echo "   Backend: $META_APP_CONFIG_ID"
    echo "   Frontend: $VITE_APP_META_CONFIG_ID"
fi

echo ""
echo "🔧 Configurações necessárias no Facebook Developer Console:"
echo "=========================================================="
echo "1. App ID: $(grep "META_APP_ID=" src/.env | cut -d'=' -f2)"
echo "2. Config ID: $META_APP_CONFIG_ID"
echo "3. App Domains: localhost"
echo "4. Valid OAuth Redirect URIs: https://localhost/"
echo "5. Produtos necessários:"
echo "   - WhatsApp Business API"
echo "   - Facebook Login"
echo "6. Configuração do Config ID:"
echo "   - Vá para WhatsApp > Getting Started"
echo "   - Configure o Embedded Signup"
echo "   - Use o Config ID: $META_APP_CONFIG_ID"
echo ""

echo "📱 Para testar:"
echo "1. Acesse: https://localhost/"
echo "2. Vá para WhatsApp Credentials"
echo "3. Clique em 'Conectar com Facebook'"
echo "4. Complete o processo de Embedded Signup"
echo "5. Observe os logs no console do navegador"
echo ""

echo "🔍 Para verificar logs em tempo real:"
echo "bash scripts/test-whatsapp-debug.sh"
echo ""

echo "📚 Documentação da Meta sobre Config ID:"
echo "https://developers.facebook.com/docs/whatsapp/embedded-signup"
echo ""

echo "🎯 Diferenças entre Config ID e OAuth tradicional:"
echo "- Config ID: Usado para Embedded Signup da Meta"
echo "- OAuth tradicional: Usado para login direto"
echo "- Config ID: Retorna código de autorização específico para WhatsApp"
echo "- Config ID: Processo mais integrado com a interface da Meta"

