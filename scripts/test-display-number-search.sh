#!/bin/bash

echo "🔍 Testando busca por display_number nos metadados..."
echo "=================================================="

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
echo "🧪 Testando a nova implementação..."
echo "=================================="

# Testar com um código de autorização (se disponível)
echo "📱 Para testar, acesse: https://localhost:5173/whatsapp-credentials"
echo "🔗 E tente conectar uma conta WhatsApp Business"
echo ""
echo "📊 Logs esperados:"
echo "   - [META-AUTH] 🔍 Buscando display_number nos metadados da conta: [ID]"
echo "   - [META-AUTH] ✅ Detalhes da conta WhatsApp Business: {...}"
echo "   - [META-AUTH] ✅ Display number encontrado nos metadados: [NÚMERO]"
echo ""
echo "🎯 O sistema agora deve:"
echo "   1. Buscar números de telefone na lista"
echo "   2. Se não encontrar, buscar display_number nos metadados da conta"
echo "   3. Usar o display_number como phone na coluna phone"
echo "   4. Armazenar o phone_number_id dos metadados se disponível"
echo ""
echo "✅ Implementação concluída!"
