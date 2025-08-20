#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../src/.env') });

const axios = require('axios');

async function testMetaAuthRoute() {
  console.log('🔍 Testando rota de autenticação da Meta...\n');

  const baseURL = process.env.BACKEND_URL || 'http://localhost:3000';
  const testToken = 'test-token-123'; // Token de teste

  console.log(`🌐 Testando contra: ${baseURL}`);
  console.log(`🔑 Token de teste: ${testToken}`);

  // Teste 1: Sem clientId
  console.log('\n🧪 Teste 1: Sem clientId');
  try {
    const response = await axios.post(`${baseURL}/api/whatsapp-credentials/facebook/auth`, {
      code: 'test-code-123'
    }, {
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Resposta:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('❌ Status:', error.response.status);
      console.log('❌ Resposta:', error.response.data);
    } else {
      console.log('❌ Erro:', error.message);
    }
  }

  // Teste 2: Com clientId
  console.log('\n🧪 Teste 2: Com clientId');
  try {
    const response = await axios.post(`${baseURL}/api/whatsapp-credentials/facebook/auth`, {
      code: 'test-code-123',
      clientId: 'test-client-123'
    }, {
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Resposta:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('❌ Status:', error.response.status);
      console.log('❌ Resposta:', error.response.data);
    } else {
      console.log('❌ Erro:', error.message);
    }
  }

  // Teste 3: Com client_id (nome alternativo)
  console.log('\n🧪 Teste 3: Com client_id');
  try {
    const response = await axios.post(`${baseURL}/api/whatsapp-credentials/facebook/auth`, {
      code: 'test-code-123',
      client_id: 'test-client-123'
    }, {
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Resposta:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('❌ Status:', error.response.status);
      console.log('❌ Resposta:', error.response.data);
    } else {
      console.log('❌ Erro:', error.message);
    }
  }

  console.log('\n✅ Teste concluído!');
  console.log('\n💡 Verifique:');
  console.log('   1. Se o frontend está enviando clientId');
  console.log('   2. Se o nome do campo está correto');
  console.log('   3. Se o middleware não está limpando o campo');
}

// Executar o teste
testMetaAuthRoute().catch(console.error);
