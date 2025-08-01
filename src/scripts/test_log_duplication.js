const axios = require('axios');

/**
 * Script para testar duplicação de logs em diferentes endpoints
 */
async function testLogDuplication() {
  const baseURL = 'http://localhost:3000';
  
  console.log('🧪 Testando Duplicação de Logs em Diferentes Endpoints');
  console.log('=====================================================\n');

  const endpoints = [
    {
      name: 'Health Check',
      method: 'GET',
      url: '/api/health',
      data: null,
      headers: {}
    },
    {
      name: 'WhatsApp Credentials List',
      method: 'GET',
      url: '/api/whatsapp-credentials',
      data: null,
      headers: { 'X-Client-ID': 'test-client-123' }
    },
    {
      name: 'Leads List',
      method: 'GET',
      url: '/api/leads',
      data: null,
      headers: { 'X-Client-ID': 'test-client-123' }
    },
    {
      name: 'Request SMS (Rate Limited)',
      method: 'POST',
      url: '/api/whatsapp-credentials/request-verification-code',
      data: {
        phoneNumberId: '123456789',
        accessToken: 'test-token'
      },
      headers: { 
        'Content-Type': 'application/json',
        'X-Client-ID': 'test-client-123'
      }
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`\n📡 Testando: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.method} ${endpoint.url}`);
    
    try {
      const config = {
        method: endpoint.method,
        url: `${baseURL}${endpoint.url}`,
        headers: endpoint.headers,
        timeout: 5000
      };

      if (endpoint.data) {
        config.data = endpoint.data;
      }

      const response = await axios(config);
      
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   📊 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
      
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ Status: ${error.response.status}`);
        console.log(`   📊 Response: ${JSON.stringify(error.response.data).substring(0, 100)}...`);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Aguardar 1 segundo entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎯 Teste concluído!');
  console.log('\n📋 Verifique os logs do servidor para ver se há duplicação:');
  console.log('- Cada requisição deve gerar apenas 1 log de entrada');
  console.log('- Cada resposta deve gerar apenas 1 log de saída');
  console.log('- Se houver duplicação, você verá logs com o mesmo requestId');
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testLogDuplication()
    .then(() => {
      console.log('\n✅ Teste finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Teste falhou:', error);
      process.exit(1);
    });
}

module.exports = { testLogDuplication }; 