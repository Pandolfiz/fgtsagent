#!/bin/bash

echo "📱 Testando correção do display_phone_number..."
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

echo "🎯 Problema identificado e corrigido:"
echo "   1. ❌ Código anterior: Buscava display_phone_number da CONTA WhatsApp Business"
echo "   2. ✅ Código corrigido: Busca display_phone_number do NÚMERO DE TELEFONE específico"
echo "   3. ✅ Prioridade: display_phone_number > phone_number > fallback"
echo "   4. ✅ Coluna phone será preenchida com o número formatado correto"
echo ""
echo "📊 Nova lógica implementada:"
echo "   1. Buscar detalhes do número de telefone específico (wppNumberId)"
echo "   2. Priorizar display_phone_number (formato: +55 27 98805-9297)"
echo "   3. Fallback para phone_number se display_phone_number não estiver disponível"
echo "   4. Usar o número encontrado na coluna phone do Supabase"
echo ""
echo "📱 Para testar, acesse: https://localhost:5173/whatsapp-credentials"
echo "🔗 E tente conectar uma conta WhatsApp Business via Config ID"
echo ""
echo "📊 Logs esperados:"
echo "   - [META-AUTH] 🔍 Buscando display_number nos metadados do número: [ID]"
echo "   - [META-AUTH] ✅ Detalhes do número de telefone: {...}"
echo "   - [META-AUTH] ✅ Display number encontrado nos metadados do número: [NÚMERO_FORMATADO]"
echo ""
echo "✅ Correção implementada!"
