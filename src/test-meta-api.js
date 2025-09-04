const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase (hardcoded para teste)
const SUPABASE_URL = 'https://uwcdaafcpezmzuveefrh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Y2RhYWZjcGV6bXp1dmVlZnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNzE0MjMsImV4cCI6MjA2MDg0NzQyM30.LuXtP_WSFTaDj41_zlIiEM0UXKXIRPiBNxCyrFPzAos';

// Cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getValidAccessToken() {
  try {
    console.log('🔍 Buscando token válido no Supabase...');
    
    // Buscar credenciais com token válido
    const { data: credentials, error } = await supabase
      .from('whatsapp_credentials')
      .select('id, phone, wpp_access_token, wpp_number_id, connection_type')
      .eq('connection_type', 'ads')
      .not('wpp_access_token', 'is', null)
      .limit(1);

    if (error) {
      console.error('❌ Erro ao buscar credenciais:', error.message);
      return null;
    }

    if (!credentials || credentials.length === 0) {
      console.log('❌ Nenhuma credencial encontrada');
      return null;
    }

    const credential = credentials[0];
    console.log(`✅ Credencial encontrada: ${credential.phone}`);
    console.log(`📱 Phone Number ID: ${credential.wpp_number_id}`);
    console.log(`🔑 Access Token: ${credential.wpp_access_token.substring(0, 20)}...`);
    
    return {
      accessToken: credential.wpp_access_token,
      phoneNumberId: credential.wpp_number_id,
      credentialId: credential.id
    };

  } catch (error) {
    console.error('❌ Erro ao buscar token:', error.message);
    return null;
  }
}

async function testMetaAPIDirectly() {
  try {
    console.log('🧪 Testando Meta API com token do Supabase');
    console.log('==========================================');
    console.log('');

    // Buscar token válido do Supabase
    const tokenData = await getValidAccessToken();
    if (!tokenData) {
      console.log('💡 Para obter um token válido:');
      console.log('1. Acesse: https://localhost:5173/whatsapp-credentials');
      console.log('2. Reconecte com a Meta para obter um novo token');
      console.log('3. Verifique se o token foi salvo no Supabase');
      return;
    }

    const { accessToken, phoneNumberId, credentialId } = tokenData;
    console.log('');

    // Teste 1: Verificar se o token é válido
    console.log('📋 Teste 1: Verificar validade do token');
    console.log('----------------------------------------');
    
    try {
      const meResponse = await axios.get('https://graph.facebook.com/v23.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ Token válido!');
      console.log('📊 Dados do usuário:', JSON.stringify(meResponse.data, null, 2));
      
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ Token inválido ou expirado');
        console.log('📊 Erro:', error.response.data.error.message);
        console.log('');
        console.log('💡 O token no Supabase está expirado. Reconecte com a Meta.');
        return;
      } else {
        throw error;
      }
    }

    console.log('');

    // Teste 2: Buscar dados do número específico
    console.log('📋 Teste 2: Dados do número WhatsApp');
    console.log('-------------------------------------');
    
    const fields = 'id,verified_name,quality_rating,code_verification_status,display_phone_number,name_status,new_name_status,status';
    
    console.log(`🌐 Endpoint: https://graph.facebook.com/v23.0/${phoneNumberId}?fields=${fields}`);
    console.log(`🔑 Headers: Authorization: Bearer ${accessToken.substring(0, 20)}...`);
    console.log('');
    
    const phoneResponse = await axios.get(
      `https://graph.facebook.com/v23.0/${phoneNumberId}?fields=${fields}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ Dados do número obtidos!');
    console.log('📊 Resposta completa da Meta API:');
    console.log(JSON.stringify(phoneResponse.data, null, 2));
    
    // Análise dos campos
    const phoneData = phoneResponse.data;
    console.log('');
    console.log('🔍 Análise dos campos:');
    console.log(`  - ID: ${phoneData.id}`);
    console.log(`  - Status: ${phoneData.status}`);
    console.log(`  - Code Verification Status: ${phoneData.code_verification_status}`);
    console.log(`  - Name Status: ${phoneData.name_status}`);
    console.log(`  - Verified Name: ${phoneData.verified_name}`);
    console.log(`  - Display Phone Number: ${phoneData.display_phone_number}`);
    console.log(`  - Quality Rating: ${phoneData.quality_rating}`);
    console.log(`  - New Name Status: ${phoneData.new_name_status}`);
    
    // Verificar se name_status está presente
    if (phoneData.name_status) {
      console.log('');
      console.log('✅ name_status encontrado!');
      console.log(`📝 Valor: ${phoneData.name_status}`);
      
      // Interpretar o status
      switch (phoneData.name_status) {
        case 'APPROVED':
          console.log('🎉 Status: Nome aprovado pela Meta');
          break;
        case 'PENDING_REVIEW':
          console.log('⏳ Status: Nome aguardando aprovação da Meta');
          break;
        case 'DECLINED':
          console.log('❌ Status: Nome rejeitado pela Meta');
          break;
        case 'AVAILABLE_WITHOUT_REVIEW':
          console.log('✅ Status: Nome disponível sem necessidade de revisão');
          break;
        default:
          console.log(`❓ Status: ${phoneData.name_status} (desconhecido)`);
      }
    } else {
      console.log('');
      console.log('❌ name_status não encontrado na resposta');
      console.log('🔍 Campos disponíveis:', Object.keys(phoneData));
    }

    console.log('');
    console.log('✅ Teste concluído com sucesso!');
    console.log(`📝 Credencial ID: ${credentialId}`);
    console.log(`📱 Phone Number ID: ${phoneNumberId}`);

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Resposta:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Executar o teste
testMetaAPIDirectly();






