const axios = require('axios');

// Configurações de teste
const TEST_CONFIG = {
  phoneNumberId: '778533548672958', // ID do número de teste
  accessToken: 'EAAN8AJvgblQBPaYXBN7a9NHi6u4KbPPrQ7lMMSheAwIahhpE9BZCibX7Si7H0XBemW0oEkAOyiIdgJf9tT3SkZC1nu4qp43WexUMgkBtqdOqt7Q3ytMnT8eO7TAecZCCz6Wn1GUKiY01JCQEjG8OI4M854x0et9ZB8f4eTlXAqrfPs08SIPtNQXRH6mYjsdyJJ9dfckusHvpjZC0TO3YhDW9m38SzZBcF21cfrZB2BC6JTc09sYYkzOPRvrraxMy2hTi9tryYiPQZDZD',
  apiVersion: 'v23.0'
};

async function testMetaAPINameStatus() {
  try {
    console.log('🧪 Testando Meta API para name_status');
    console.log('=====================================');
    console.log(`📱 Phone Number ID: ${TEST_CONFIG.phoneNumberId}`);
    console.log(`🔑 Access Token: ${TEST_CONFIG.accessToken.substring(0, 20)}...`);
    console.log(`🌐 API Version: ${TEST_CONFIG.apiVersion}`);
    console.log('');

    // Teste 1: Buscar dados básicos do número
    console.log('📋 Teste 1: Dados básicos do número');
    console.log('-----------------------------------');
    
    const basicResponse = await axios.get(
      `https://graph.facebook.com/${TEST_CONFIG.apiVersion}/${TEST_CONFIG.phoneNumberId}`,
      {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ Resposta da Meta API:');
    console.log(JSON.stringify(basicResponse.data, null, 2));
    console.log('');

    // Teste 2: Buscar campos específicos incluindo name_status
    console.log('📋 Teste 2: Campos específicos (incluindo name_status)');
    console.log('---------------------------------------------------');
    
    const specificFields = 'id,verified_name,quality_rating,code_verification_status,display_phone_number,name_status,new_name_status,status';
    
    const specificResponse = await axios.get(
      `https://graph.facebook.com/${TEST_CONFIG.apiVersion}/${TEST_CONFIG.phoneNumberId}?fields=${specificFields}`,
      {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ Resposta com campos específicos:');
    console.log(JSON.stringify(specificResponse.data, null, 2));
    console.log('');

    // Teste 3: Verificar se name_status está presente
    console.log('📋 Teste 3: Análise do name_status');
    console.log('----------------------------------');
    
    const phoneData = specificResponse.data;
    
    console.log('🔍 Campos disponíveis:');
    Object.keys(phoneData).forEach(key => {
      console.log(`  - ${key}: ${phoneData[key]}`);
    });
    console.log('');

    if (phoneData.name_status) {
      console.log(`✅ name_status encontrado: ${phoneData.name_status}`);
      
      // Interpretar o status
      switch (phoneData.name_status) {
        case 'APPROVED':
          console.log('📝 Status: Nome aprovado pela Meta');
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
      console.log('❌ name_status não encontrado na resposta');
    }

    console.log('');

    // Teste 4: Comparar com dados anteriores
    console.log('📋 Teste 4: Comparação com dados anteriores');
    console.log('-------------------------------------------');
    
    const previousData = {
      name_status: "AVAILABLE_WITHOUT_REVIEW",
      code_verification_status: "VERIFIED",
      verified_name: "Pandolfiz",
      display_phone_number: "+55 27 98805-9297"
    };

    console.log('📊 Dados anteriores (do Supabase):');
    console.log(JSON.stringify(previousData, null, 2));
    console.log('');

    console.log('📊 Dados atuais (da Meta API):');
    console.log(JSON.stringify({
      name_status: phoneData.name_status,
      code_verification_status: phoneData.code_verification_status,
      verified_name: phoneData.verified_name,
      display_phone_number: phoneData.display_phone_number
    }, null, 2));
    console.log('');

    // Verificar mudanças
    const hasChanges = Object.keys(previousData).some(key => 
      previousData[key] !== phoneData[key]
    );

    if (hasChanges) {
      console.log('🔄 Mudanças detectadas:');
      Object.keys(previousData).forEach(key => {
        if (previousData[key] !== phoneData[key]) {
          console.log(`  - ${key}: "${previousData[key]}" → "${phoneData[key]}"`);
        }
      });
    } else {
      console.log('✅ Nenhuma mudança detectada nos dados principais');
    }

  } catch (error) {
    console.error('❌ Erro ao testar Meta API:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Resposta de erro:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Erro:', error.message);
    }
  }
}

// Executar o teste
testMetaAPINameStatus();

