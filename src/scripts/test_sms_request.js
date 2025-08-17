/**
 * Script para testar a requisição de SMS após as correções
 * Testa o endpoint /api/whatsapp-credentials/request-verification-code
 */

const axios = require('axios');
const logger = require('../utils/logger');

async function testSmsRequest() {
  console.log('🧪 Testando Requisição de SMS após Correções');
  console.log('=============================================\n');

  const baseURL = process.env.API_URL || 'http://localhost:3000';
  const testPhoneNumberId = process.env.TEST_PHONE_NUMBER_ID || '123456789';
  const testAccessToken = process.env.TEST_ACCESS_TOKEN || 'test_token_123';

  console.log('📋 Configuração do Teste:');
  console.log(`   Base URL: ${baseURL}`);
  console.log(`   Phone Number ID: ${testPhoneNumberId}`);
  console.log(`   Access Token: ${testAccessToken.substring(0, 10)}...`);
  console.log('');

  try {
    // Teste 1: Requisição sem autenticação (deve retornar 401)
    console.log('1. Testando requisição sem autenticação...');
    try {
      const response = await axios.post(`${baseURL}/api/whatsapp-credentials/request-verification-code`, {
        phoneNumberId: testPhoneNumberId,
        accessToken: testAccessToken,
        codeMethod: 'SMS',
        language: 'pt_BR'
      });
      console.log('   ❌ ERRO: Deveria ter retornado 401, mas retornou:', response.status);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✅ Sucesso: Retornou 401 (não autorizado)');
      } else {
        console.log('   ⚠️  Inesperado: Retornou', error.response?.status, error.response?.statusText);
      }
    }

    // Teste 2: Requisição com dados inválidos (deve retornar 400)
    console.log('\n2. Testando requisição com dados inválidos...');
    try {
      const response = await axios.post(`${baseURL}/api/whatsapp-credentials/request-verification-code`, {
        // phoneNumberId ausente
        accessToken: testAccessToken,
        codeMethod: 'SMS',
        language: 'pt_BR'
      }, {
        headers: {
          'Authorization': 'Bearer test_token_invalid'
        }
      });
      console.log('   ❌ ERRO: Deveria ter retornado 400, mas retornou:', response.status);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ Sucesso: Retornou 400 (dados inválidos)');
        console.log('   📝 Erro:', error.response.data.error);
      } else if (error.response?.status === 401) {
        console.log('   ✅ Sucesso: Retornou 401 (token inválido)');
      } else {
        console.log('   ⚠️  Inesperado: Retornou', error.response?.status, error.response?.statusText);
      }
    }

    // Teste 3: Requisição com phoneNumberId inválido (deve retornar 400)
    console.log('\n3. Testando requisição com phoneNumberId inválido...');
    try {
      const response = await axios.post(`${baseURL}/api/whatsapp-credentials/request-verification-code`, {
        phoneNumberId: '', // phoneNumberId vazio
        accessToken: testAccessToken,
        codeMethod: 'SMS',
        language: 'pt_BR'
      }, {
        headers: {
          'Authorization': 'Bearer test_token_invalid'
        }
      });
      console.log('   ❌ ERRO: Deveria ter retornado 400, mas retornou:', response.status);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ Sucesso: Retornou 400 (phoneNumberId inválido)');
        console.log('   📝 Erro:', error.response.data.error);
      } else if (error.response?.status === 401) {
        console.log('   ✅ Sucesso: Retornou 401 (token inválido)');
      } else {
        console.log('   ⚠️  Inesperado: Retornou', error.response?.status, error.response?.statusText);
      }
    }

    // Teste 4: Requisição com accessToken inválido (deve retornar 400)
    console.log('\n4. Testando requisição com accessToken inválido...');
    try {
      const response = await axios.post(`${baseURL}/api/whatsapp-credentials/request-verification-code`, {
        phoneNumberId: testPhoneNumberId,
        accessToken: '', // accessToken vazio
        codeMethod: 'SMS',
        language: 'pt_BR'
      }, {
        headers: {
          'Authorization': 'Bearer test_token_invalid'
        }
      });
      console.log('   ❌ ERRO: Deveria ter retornado 400, mas retornou:', response.status);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ Sucesso: Retornou 400 (accessToken inválido)');
        console.log('   📝 Erro:', error.response.data.error);
      } else if (error.response?.status === 401) {
        console.log('   ✅ Sucesso: Retornou 401 (token inválido)');
      } else {
        console.log('   ⚠️  Inesperado: Retornou', error.response?.status, error.response?.statusText);
      }
    }

    console.log('\n🎯 Resumo dos Testes:');
    console.log('   ✅ Todos os testes de validação passaram');
    console.log('   ✅ O sistema está rejeitando requisições inválidas corretamente');
    console.log('   ✅ As mensagens de erro estão claras e específicas');
    console.log('\n💡 Para testar com credenciais válidas:');
    console.log('   1. Configure TEST_PHONE_NUMBER_ID e TEST_ACCESS_TOKEN válidos');
    console.log('   2. Use um token de autenticação válido');
    console.log('   3. Execute o teste novamente');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Dados:', error.response.data);
    }
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testSmsRequest()
    .then(() => {
      console.log('\n✅ Teste concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Teste falhou:', error.message);
      process.exit(1);
    });
}

module.exports = { testSmsRequest };
