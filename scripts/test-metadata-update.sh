#!/bin/bash

echo "🧪 Testando atualização de metadados do WhatsApp Business"
echo "=================================================="

echo ""
echo "📋 Passos para testar:"
echo "1. Acesse o frontend em: https://localhost:5173/whatsapp-credentials"
echo "2. Clique no botão 'Verificar Status' de uma credencial"
echo "3. Verifique os logs do backend para confirmar atualização"
echo "4. Verifique se os metadados foram atualizados no Supabase"
echo ""

echo "🔍 Campos que devem ser atualizados:"
echo "- name_status"
echo "- code_verification_status"
echo "- verified_name"
echo "- display_phone_number"
echo "- quality_rating"
echo "- new_name_status"
echo "- phone_number_id"
echo ""

echo "📊 Para verificar no Supabase:"
echo "SELECT id, phone, status, metadata->>'name_status' as name_status,"
echo "       metadata->>'code_verification_status' as code_verification_status,"
echo "       metadata->>'verified_name' as verified_name"
echo "FROM whatsapp_credentials"
echo "WHERE connection_type = 'ads';"
echo ""

echo "✅ Se tudo estiver funcionando, você deve ver:"
echo "- Logs detalhados no backend mostrando os dados sendo atualizados"
echo "- Metadados atualizados no Supabase com os valores mais recentes da Meta API"
echo "- name_status atualizado de 'AVAILABLE_WITHOUT_REVIEW' para o valor correto"
echo ""

echo "🚨 Se ainda houver problemas:"
echo "- Verifique os logs do backend para erros"
echo "- Confirme se a Meta API está retornando os campos corretos"
echo "- Verifique se há erros de permissão no Supabase"

