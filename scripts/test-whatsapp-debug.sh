#!/bin/bash

echo "🔍 Testando integração WhatsApp Business com debug completo..."
echo ""

echo "📋 Instruções:"
echo "   1. Abra o navegador em https://localhost/"
echo "   2. Vá para WhatsApp Credentials"
echo "   3. Clique em 'Conectar com Facebook'"
echo "   4. Complete o processo de autenticação"
echo "   5. Observe os logs abaixo"
echo ""

echo "🔄 Monitorando logs em tempo real..."
echo "   Pressione Ctrl+C para parar"
echo ""

# Monitorar logs em tempo real
tail -f logs/combined.log | grep --line-buffered "META-AUTH"


