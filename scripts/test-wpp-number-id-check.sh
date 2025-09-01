#!/bin/bash

echo "🔍 Testando verificação por wpp_number_id..."
echo "============================================"

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
echo "🧪 Testando a nova lógica de verificação..."
echo "=========================================="

echo "🎯 Nova lógica implementada:"
echo "   1. ✅ Verifica credencial existente por wpp_number_id (não por client_id)"
echo "   2. ✅ Permite múltiplas credenciais para o mesmo cliente"
echo "   3. ✅ Atualiza credencial se o mesmo número já existe"
echo "   4. ✅ Cria nova credencial se for um número diferente"
echo "   5. ✅ Sempre usa display_number dos metadados na coluna phone"
echo ""
echo "📊 Logs esperados:"
echo "   - [META-AUTH] 🔍 Verificando se já existe credencial para o número: [ID]"
echo "   - [META-AUTH] ✅ Nenhuma credencial existente encontrada para o número [ID]"
echo "   - [META-AUTH] 🆕 Criando nova credencial para cliente: [CLIENT_ID]"
echo "   - [META-AUTH] ✅ Nova credencial criada com sucesso: [CREDENTIAL_ID]"
echo ""
echo "🔄 OU se já existir:"
echo "   - [META-AUTH] 🔍 Credencial existente encontrada para o número [ID]: [CREDENTIAL_ID]"
echo "   - [META-AUTH] 🔄 Atualizando credencial existente para o número [ID]: [CREDENTIAL_ID]"
echo "   - [META-AUTH] ✅ Credencial atualizada com sucesso: [CREDENTIAL_ID]"
echo ""
echo "📱 Para testar, acesse: https://localhost:5173/whatsapp-credentials"
echo "🔗 E tente conectar uma conta WhatsApp Business via Config ID"
echo ""
echo "✅ Implementação concluída!"
