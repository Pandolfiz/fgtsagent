#!/bin/bash

echo "🔧 Atualizando código para OAuth direto..."

# Criar backup do arquivo atual
cp frontend/src/components/whatsapp-credentials/WhatsappCredentialsPage.tsx frontend/src/components/whatsapp-credentials/WhatsappCredentialsPage.tsx.backup

echo "✅ Backup criado!"
echo ""
echo "🔄 Agora vou atualizar o código para usar OAuth direto..."
echo "📝 Removendo config_id e usando OAuth padrão..."


