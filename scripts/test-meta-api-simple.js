const axios = require('axios');

// Script simples para testar Meta API
async function testMetaAPISimple() {
  try {
    console.log('🧪 Teste simples da Meta API');
    console.log('============================');
    
    // Dados de teste (substitua por dados válidos)
    const phoneNumberId = '778533548672958';
    const accessToken = 'EAAN8AJvgblQBPaYXBN7a9NHi6u4KbPPrQ7lMMSheAwIahhpE9BZCibX7Si7H0XBemW0oEkAOyiIdgJf9tT3SkZC1nu4qp43WexUMgkBtqdOqt7Q3ytMnT8eO7TAecZCCz6Wn1GUKiY01JCQEjG8OI4M854x0et9ZB8f4eTlXAqrfPs08SIPtNQXRH6mYjsdyJJ9dfckusHvpjZC0TO3YhDW9m38SzZBcF21cfrZB2BC6JTc09sYYkzOPRvrraxMy2hTi9tryYiPQZDZD';
    
    console.log(`📱 Phone Number ID: ${phoneNumberId}`);
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
        console.log('');
        console.log('💡 Para obter um token válido:');
        console.log('1. Acesse o frontend: https://localhost:5173/whatsapp-credentials');
        console.log('2. Reconecte com a Meta para obter um novo token');
        console.log('3. Copie o novo token dos metadados da credencial');
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
    console.log('📊 Resposta completa:', JSON.stringify(phoneResponse.data, null, 2));
    
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

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Resposta:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Executar o teste
testMetaAPISimple();

