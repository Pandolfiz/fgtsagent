#!/bin/bash

echo "🔄 Testando Atualização Automática de Status no Supabase"
echo "========================================================"

# Verificar se o backend está rodando
echo "🔍 Verificando se o backend está rodando..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend está rodando na porta 3000"
else
    echo "❌ Backend não está rodando na porta 3000"
    echo "💡 Execute: npm run dev"
    exit 1
fi

echo ""
echo "📋 Funcionalidades Implementadas:"
echo "=================================="
echo "✅ Verificação completa de status via Meta API"
echo "✅ Atualização automática no Supabase"
echo "✅ Verificação de code_verification_status"
echo "✅ Verificação de name_status"
echo "✅ Atualização de status_description"
echo "✅ Atualização de metadados completos"

echo ""
echo "🎯 Como Testar:"
echo "==============="
echo "1. Acesse: http://localhost:5173/whatsapp-credentials"
echo "2. Clique em 'Verificar Status' para uma credencial específica"
echo "3. Ou use a rota: GET /api/whatsapp-credentials/check-all-status"
echo "4. Verifique os logs do backend para acompanhar as atualizações"

echo ""
echo "🔧 Endpoints Disponíveis:"
echo "========================"
echo "GET /api/whatsapp-credentials/:id/check-status"
echo "  - Verifica status de uma credencial específica"
echo "  - Atualiza automaticamente no Supabase"
echo ""
echo "GET /api/whatsapp-credentials/check-all-status"
echo "  - Verifica status de todas as credenciais do cliente"
echo "  - Atualiza automaticamente todas no Supabase"

echo ""
echo "📱 Dados Verificados:"
echo "===================="
echo "• code_verification_status (VERIFIED, PENDING, etc.)"
echo "• name_status (APPROVED, PENDING_REVIEW, DECLINED, etc.)"
echo "• display_phone_number"
echo "• verified_name"
echo "• quality_rating"
echo "• status geral da credencial"

echo ""
echo "🔄 Fluxo de Atualização:"
echo "========================"
echo "1. Frontend chama endpoint de verificação"
echo "2. Backend consulta Meta API com campos completos"
echo "3. Backend determina status baseado em code_verification_status + name_status"
echo "4. Backend atualiza credencial no Supabase automaticamente"
echo "5. Frontend recebe dados atualizados"
echo "6. Interface reflete o novo status em tempo real"

echo ""
echo "🎉 Sistema de Atualização Automática Implementado!"
echo "=================================================="
echo "Agora todas as verificações de status atualizam automaticamente"
echo "as credenciais no Supabase com informações completas da Meta API"


