const axios = require('axios');

// Script simples para debug da Meta API
async function testMetaAPIDebug() {
  try {
    console.log('🧪 Debug da Meta API');
    console.log('=====================');
    
    // Dados de teste (substitua por dados válidos)
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

    // Teste: Buscar dados do número específico
    console.log('📋 Teste: Dados do número WhatsApp');
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
    console.log('✅ Teste concluído!');
    console.log('📝 Se name_status está presente, o problema está na atualização do Supabase');
    console.log('🔍 Se name_status está ausente, o problema está na resposta da Meta API');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Resposta:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Executar o teste
testMetaAPIDebug();








