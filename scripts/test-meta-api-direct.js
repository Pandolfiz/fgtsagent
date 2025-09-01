const axios = require('axios');

// Script que simula exatamente o que nosso backend faz
async function testMetaAPIDirect() {
  try {
    console.log('🧪 Teste direto da Meta API (simulando nosso backend)');
    console.log('====================================================');
    
    // Dados de teste (substitua por dados válidos do seu Supabase)
    const phoneNumberId = '778533548672958';
    
    console.log(`📱 Phone Number ID: ${phoneNumberId}`);
    console.log('');
    
    console.log('💡 Para obter um token válido:');
    console.log('1. Acesse: https://localhost:5173/whatsapp-credentials');
    console.log('2. Reconecte com a Meta para obter um novo token');
    console.log('3. Copie o novo token dos metadados da credencial');
    console.log('4. Cole o token neste script');
    console.log('');
    
    // Token placeholder - substitua pelo token válido
    const accessToken = 'COLE_AQUI_O_TOKEN_VALIDO';
    
    if (accessToken === 'COLE_AQUI_O_TOKEN_VALIDO') {
      console.log('❌ Token não configurado');
      console.log('📝 Substitua a variável accessToken por um token válido');
      return;
    }
    
    console.log(`🔑 Access Token: ${accessToken.substring(0, 20)}...`);
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
        return;
      } else {
        throw error;
      }
    }

    console.log('');

    // Teste 2: Buscar dados do número específico (exatamente como nosso backend faz)
    console.log('📋 Teste 2: Dados do número WhatsApp (simulando nosso backend)');
    console.log('----------------------------------------------------------------');
    
    // Campos exatamente como solicitamos no nosso backend
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
    
    // Análise dos campos (exatamente como nosso backend processa)
    const phoneData = phoneResponse.data;
    console.log('');
    console.log('🔍 Análise dos campos (como nosso backend processa):');
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
      
      // Interpretar o status (como nosso backend faz)
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
    
    // Teste 3: Simular o que nosso backend enviaria para o Supabase
    console.log('📋 Teste 3: Simulando atualização no Supabase');
    console.log('-----------------------------------------------');
    
    // Simular os dados que nosso backend enviaria para atualização
    const simulatedUpdateData = {
      status: 'verified', // Status determinado pelo nosso backend
      status_description: 'Número verificado - Nome disponível sem revisão',
      metadata: {
        last_status_check: new Date().toISOString(),
        meta_api_status: 'verified',
        code_verification_status: phoneData.code_verification_status,
        name_status: phoneData.name_status,
        display_phone_number: phoneData.display_phone_number,
        verified_name: phoneData.verified_name,
        quality_rating: phoneData.quality_rating,
        phone_number_id: phoneData.id,
        new_name_status: phoneData.new_name_status
      }
    };
    
    console.log('📊 Dados que seriam enviados para o Supabase:');
    console.log(JSON.stringify(simulatedUpdateData, null, 2));
    
    console.log('');
    console.log('🔍 Campos específicos que devem ser atualizados:');
    console.log(`  - name_status: ${simulatedUpdateData.metadata.name_status}`);
    console.log(`  - code_verification_status: ${simulatedUpdateData.metadata.code_verification_status}`);
    console.log(`  - verified_name: ${simulatedUpdateData.metadata.verified_name}`);
    console.log(`  - display_phone_number: ${simulatedUpdateData.metadata.display_phone_number}`);
    
    console.log('');
    console.log('✅ Simulação concluída!');
    console.log('📝 Se todos os campos estão preenchidos, o problema está na atualização do Supabase');
    console.log('🔍 Se algum campo está undefined, o problema está na resposta da Meta API');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Resposta:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Executar o teste
testMetaAPIDirect();

