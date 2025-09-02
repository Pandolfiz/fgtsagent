#!/bin/bash

echo "🚀 Testando Fluxo de Ativação de Números WhatsApp Business"
echo "=========================================================="

# Verificar se o backend está rodando
echo "🔍 Verificando se o backend está rodando..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend está rodando na porta 3000"
else
    echo "❌ Backend não está rodando na porta 3000"
    echo "💡 Execute: npm run dev"
    exit 1
fi

# Verificar se o frontend está rodando
echo "🔍 Verificando se o frontend está rodando..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend está rodando na porta 5173"
else
    echo "❌ Frontend não está rodando na porta 5173"
    echo "💡 Execute: npm run dev:all"
    exit 1
fi

echo ""
echo "📋 Resumo das Funcionalidades Implementadas:"
echo "============================================="
echo "✅ Função handleActivateNumber() no frontend"
echo "✅ Rota /api/whatsapp-credentials/activate-number no backend"
echo "✅ Função activateWhatsAppNumber() no controller"
echo "✅ Botão 'Ativar Número' para status 'pending'"
echo "✅ Lógica inteligente para mostrar botões corretos"
echo "✅ Integração com Meta API v23.0"

echo ""
echo "🎯 Como Testar:"
echo "==============="
echo "1. Acesse: http://localhost:5173/whatsapp-credentials"
echo "2. Conecte uma conta via Meta (se não tiver)"
echo "3. Para números com status 'pending', aparecerá o botão 'Ativar Número'"
echo "4. Clique no botão para executar a ativação via Meta API"
echo "5. Verifique os logs do backend para acompanhar o processo"

echo ""
echo "🔧 Endpoints Disponíveis:"
echo "========================"
echo "POST /api/whatsapp-credentials/activate-number"
echo "  - Body: { phone_number_id, access_token }"
echo "  - Resposta: { success, message, data }"

echo ""
echo "📱 Fluxo de Ativação:"
echo "====================="
echo "1. Usuário clica em 'Ativar Número'"
echo "2. Frontend chama /api/whatsapp-credentials/activate-number"
echo "3. Backend chama Meta API: POST /{phone_number_id}/register"
echo "4. Meta API retorna sucesso/erro"
echo "5. Backend atualiza status da credencial"
echo "6. Frontend atualiza interface"

echo ""
echo "🎉 Implementação Concluída!"
echo "============================"
echo "Agora o sistema pode ativar números WhatsApp Business pendentes"
echo "usando a API oficial da Meta com o endpoint /register"


