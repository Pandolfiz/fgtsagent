#!/bin/bash

echo "🧪 Testando conexão do Config ID..."
echo "==================================="

echo ""
echo "📋 Configurações atuais:"
echo "========================"
echo "App ID: $(grep "META_APP_ID=" src/.env | cut -d'=' -f2)"
echo "Config ID: $(grep "META_APP_CONFIG_ID=" src/.env | cut -d'=' -f2)"
echo "Redirect URI: $(grep "META_REDIRECT_URI=" src/.env | cut -d'=' -f2)"
echo ""

echo "🔍 Verificando se o Config ID está configurado:"
echo "==============================================="

# Verificar se o Config ID não está vazio
CONFIG_ID=$(grep "META_APP_CONFIG_ID=" src/.env | cut -d'=' -f2)
if [ -z "$CONFIG_ID" ] || [ "$CONFIG_ID" = "seu_META_APP_CONFIG_ID_aqui" ]; then
    echo "❌ Config ID não está configurado corretamente"
    echo "   Valor atual: $CONFIG_ID"
    echo "   Configure o Config ID no arquivo src/.env"
    exit 1
else
    echo "✅ Config ID configurado: $CONFIG_ID"
fi

echo ""
echo "🔧 Verificações necessárias no Facebook Developer Console:"
echo "========================================================="
echo "1. Acesse: https://developers.facebook.com/"
echo "2. Selecione seu app: $(grep "META_APP_ID=" src/.env | cut -d'=' -f2)"
echo "3. Vá para: Produtos > WhatsApp Business API"
echo "4. Clique em: Configurações > Cadastro incorporado"
echo "5. Verifique se o Config ID está listado: $CONFIG_ID"
echo "6. Verifique se o status está 'Ativo' ou 'Habilitado'"
echo ""

echo "📱 Para testar o fluxo:"
echo "======================"
echo "1. Acesse: https://localhost:5173"
echo "2. Vá para WhatsApp Credentials"
echo "3. Clique em 'Conectar com Facebook'"
echo "4. Observe no console do navegador:"
echo "   - Configurações Facebook sendo carregadas"
echo "   - Config ID sendo usado no login"
echo "   - Processo de Embedded Signup aparecendo"
echo ""

echo "🔍 Logs para verificar:"
echo "======================"
echo "1. No console do navegador, procure por:"
echo "   - '📋 Configurações Facebook:'"
echo "   - '📋 Config ID:'"
echo "   - '🚀 Iniciando login com Config ID...'"
echo "   - '📱 Resposta completa do Facebook:'"
echo ""
echo "2. No backend, procure por:"
echo "   - '[META-AUTH] Iniciando troca de código por token...'"
echo "   - '[META-AUTH] Tentativa 1: Sem redirect_uri (Config ID)'"
echo "   - '[META-AUTH] ✅ Token trocado com sucesso'"
echo ""

echo "🚨 Se o Config ID não estiver funcionando:"
echo "=========================================="
echo "1. Verificar se o Config ID está ativo no Facebook Developer Console"
echo "2. Verificar se há restrições de domínio no Config ID"
echo "3. Verificar se o usuário tem permissões para usar o Config ID"
echo "4. Verificar se o Facebook App está em modo de desenvolvimento"
echo "5. Adicionar usuário como testador no Facebook App"
echo ""

echo "💡 Dicas importantes:"
echo "===================="
echo "- O Config ID deve estar 'Ativo' no Facebook Developer Console"
echo "- O usuário deve ter permissões para criar/gerenciar contas WhatsApp Business"
echo "- O domínio localhost deve estar autorizado"
echo "- O processo de Embedded Signup deve aparecer durante o login"
echo ""

echo "🔗 Links úteis:"
echo "=============="
echo "Facebook Developer Console: https://developers.facebook.com/"
echo "WhatsApp Business API: https://developers.facebook.com/docs/whatsapp"
echo "Embedded Signup: https://developers.facebook.com/docs/whatsapp/embedded-signup"

