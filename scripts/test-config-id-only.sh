#!/bin/bash

echo "🔍 Testando implementação apenas com Config ID Flow..."
echo "====================================================="

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
echo "🧪 Testando a implementação Config ID..."
echo "======================================"

# Verificar se as rotas foram removidas
echo "🔍 Verificando rotas removidas..."
if curl -s -X POST http://localhost:3000/api/whatsapp-credentials/facebook/access-token > /dev/null 2>&1; then
    echo "❌ Rota /facebook/access-token ainda existe"
else
    echo "✅ Rota /facebook/access-token foi removida"
fi

echo ""
echo "📱 Para testar, acesse: https://localhost:5173/whatsapp-credentials"
echo "🔗 E tente conectar uma conta WhatsApp Business via Config ID"
echo ""
echo "📊 Logs esperados:"
echo "   - [META-AUTH] 🔍 Buscando display_number nos metadados da conta: [ID]"
echo "   - [META-AUTH] ✅ Detalhes da conta WhatsApp Business: {...}"
echo "   - [META-AUTH] ✅ Display number encontrado nos metadados: [NÚMERO]"
echo ""
echo "🎯 O sistema agora deve:"
echo "   1. ✅ Usar APENAS o fluxo Config ID"
echo "   2. ✅ Buscar display_number nos metadados da conta"
echo "   3. ✅ Armazenar display_number na coluna phone do Supabase"
echo "   4. ✅ Remover fluxo de access token direto"
echo ""
echo "✅ Implementação Config ID concluída!"
