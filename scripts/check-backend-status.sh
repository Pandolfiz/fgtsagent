#!/bin/bash

echo "🔍 Verificando Status do Backend..."
echo "=================================="

echo ""
echo "📋 Verificando se o backend está rodando na porta 3000..."
if netstat -ano | findstr :3000 > /dev/null; then
    echo "✅ Backend está rodando na porta 3000"
else
    echo "❌ Backend NÃO está rodando na porta 3000"
    echo ""
    echo "🚀 Iniciando backend..."
    cd src && npm run dev &
    sleep 3
fi

echo ""
echo "🔍 Verificando se o backend responde..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Backend responde corretamente"
else
    echo "❌ Backend não responde"
fi

echo ""
echo "📱 Para testar novamente:"
echo "1. Acesse: https://localhost:5173"
echo "2. Vá para WhatsApp Credentials"
echo "3. Clique em 'Conectar com Facebook'"
echo "4. Complete o processo de Embedded Signup"
echo "5. Observe os logs do backend"
echo ""
echo "🔍 Logs importantes para observar:"
echo "- '[META-AUTH] INICIANDO BUSCA DE DADOS WHATSAPP BUSINESS'"
echo "- '[META-AUTH] Testando X endpoints para encontrar WhatsApp Business...'"
echo "- '[META-AUTH] NENHUMA CONTA WHATSAPP BUSINESS ENCONTRADA'"

