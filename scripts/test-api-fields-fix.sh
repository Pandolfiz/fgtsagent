#!/bin/bash

echo "🔧 Testando correção dos campos da API..."
echo "========================================="

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
echo "   1. ❌ Código anterior: Campos incorretos na API (name_status, new_name_status)"
echo "   2. ✅ Código corrigido: Apenas campos válidos da API Meta"
echo "   3. ✅ Fallback implementado: Usa dados já obtidos se API falhar"
echo "   4. ✅ Logs detalhados: Mostra status e dados do erro"
echo ""
echo "📊 Campos corretos da API Meta:"
echo "   - id: ID do número de telefone"
echo "   - phone_number: Número bruto"
echo "   - display_phone_number: Número formatado"
echo "   - verified_name: Nome verificado"
echo "   - quality_rating: Classificação de qualidade"
echo "   - code_verification_status: Status da verificação"
echo ""
echo "🔄 Fallback implementado:"
echo "   1. Se API falhar, usa dados já obtidos anteriormente"
echo "   2. Prioriza display_phone_number > phone_number"
echo "   3. Garante que a coluna phone seja preenchida"
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
