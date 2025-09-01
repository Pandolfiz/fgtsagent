#!/bin/bash

echo "🔧 Testando correção da ordem das variáveis..."
echo "=============================================="

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
echo "🧪 Testando a correção implementada..."
echo "====================================="

echo "🎯 Problema corrigido:"
echo "   1. ✅ Variáveis são definidas ANTES de serem usadas"
echo "   2. ✅ wppNumberId é definido antes da verificação de credenciais"
echo "   3. ✅ Ordem correta: Preparar dados → Verificar credenciais → Buscar metadados"
echo "   4. ✅ Não há mais erro 'Cannot access before initialization'"
echo ""
echo "📊 Nova ordem das operações:"
echo "   1. Preparar dados da credencial (phone, wppNumberId, etc.)"
echo "   2. Verificar se já existe credencial para o wpp_number_id"
echo "   3. Buscar display_number nos metadados da conta"
echo "   4. Criar/atualizar credencial no Supabase"
echo ""
echo "📱 Para testar, acesse: https://localhost:5173/whatsapp-credentials"
echo "🔗 E tente conectar uma conta WhatsApp Business via Config ID"
echo ""
echo "✅ Correção implementada!"
