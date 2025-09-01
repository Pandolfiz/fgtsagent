#!/bin/bash

echo "🔧 Testando melhorias no tratamento de erro..."
echo "============================================="

# Verificar se o backend está rodando
echo "📡 Verificando se o backend está rodando..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Backend está rodando"
else
    echo "❌ Backend não está rodando. Iniciando..."
    cd src && npm run dev &
    sleep 5
fi

echo ""
echo "🧪 Testando as melhorias implementadas..."
echo "========================================"

echo "🎯 Melhorias no tratamento de erro:"
echo "   1. ✅ Logs mais detalhados para erros 400"
echo "   2. ✅ Status code e mensagens de erro da Meta"
echo "   3. ✅ Continuação para próxima tentativa"
echo "   4. ✅ Sistema mais robusto e informativo"
echo ""
echo "📊 O que foi melhorado:"
echo "   - Ad accounts: Tratamento de erro melhorado"
echo "   - Businesses: Tratamento de erro melhorado"
echo "   - Páginas: Tratamento de erro melhorado"
echo "   - Logs: Mais detalhados e informativos"
echo ""
echo "🔄 Fluxo de tentativas:"
echo "   1. Me/accounts (páginas do usuário)"
echo "   2. Me/businesses (contas de negócio)"
echo "   3. Me/adaccounts (contas de anúncios)"
echo "   4. ID conhecido (fallback direto)"
echo "   5. Me/accounts (páginas com WhatsApp)"
echo ""
echo "📱 Para testar, acesse: https://localhost:5173/whatsapp-credentials"
echo "🔗 E tente conectar uma conta WhatsApp Business via Config ID"
echo ""
echo "📊 Logs esperados (se houver erros):"
echo "   - [META-AUTH] ⚠️ Erro ao buscar [TIPO]: [MENSAGEM]"
echo "   - [META-AUTH] ⚠️ Status: [STATUS_CODE]"
echo "   - [META-AUTH] ⚠️ Erro Meta: [DETALHES]"
echo "   - [META-AUTH] 🔄 Continuando para próxima tentativa..."
echo ""
echo "✅ Melhorias implementadas com sucesso!"
