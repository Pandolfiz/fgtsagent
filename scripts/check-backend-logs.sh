#!/bin/bash

echo "🔍 Verificando Logs do Backend..."
echo "================================"

echo ""
echo "📋 Status do Backend:"
echo "===================="
if netstat -ano | findstr :3000 > /dev/null; then
    echo "✅ Backend está rodando na porta 3000"
else
    echo "❌ Backend NÃO está rodando na porta 3000"
    echo ""
    echo "🚀 Iniciando backend..."
    cd src && npm run dev &
    sleep 5
fi

echo ""
echo "🔍 Teste de Conexão:"
echo "==================="
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Backend responde corretamente"
else
    echo "❌ Backend não responde"
fi

echo ""
echo "📱 Para Testar Novamente:"
echo "========================"
echo "1. Acesse: https://localhost:5173"
echo "2. Vá para WhatsApp Credentials"
echo "3. Clique em 'Conectar com Facebook'"
echo "4. Complete o processo de Embedded Signup"
echo "5. Observe os logs do backend abaixo"
echo ""

echo "🔍 Logs Importantes para Observar:"
echo "================================="
echo "1. '[META-AUTH] Iniciando troca de código por token...'"
echo "2. '[META-AUTH] ✅ Token trocado com sucesso SEM redirect_uri'"
echo "3. '[META-AUTH] INICIANDO BUSCA DE DADOS WHATSAPP BUSINESS'"
echo "4. '[META-AUTH] Tentativa 1: Buscar WhatsApp Business do usuário diretamente'"
echo "5. '[META-AUTH] Tentativa 2: Buscar todas as contas do usuário'"
echo "6. '[META-AUTH] Tentativa 3: Buscar businesses'"
echo "7. '[META-AUTH] Tentativa 4: Buscar ad accounts'"
echo "8. '[META-AUTH] NENHUMA CONTA WHATSAPP BUSINESS ENCONTRADA'"
echo ""

echo "💡 Se o problema persistir:"
echo "========================="
echo "1. Verificar se o backend está rodando"
echo "2. Verificar se os logs aparecem"
echo "3. Verificar se há erros específicos"
echo "4. Verificar se o token está sendo trocado corretamente"
echo ""

echo "🔗 Links para Verificação:"
echo "========================="
echo "Facebook Developer Console: https://developers.facebook.com/"
echo "Meta Business Suite: https://business.facebook.com/wa/manage/accounts"
echo "WhatsApp Business API: https://developers.facebook.com/docs/whatsapp"
echo "Embedded Signup: https://developers.facebook.com/docs/whatsapp/embedded-signup"

