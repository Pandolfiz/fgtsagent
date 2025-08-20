const axios = require('axios');
const logger = require('../config/logger');

/**
 * Script para testar o sistema de rate limiting de SMS
 */
async function testSmsRateLimiting() {
  const baseURL = 'http://localhost:3000';
  const testPhoneNumberId = '123456789';
  const testClientId = 'test-client-123';
  
  console.log('🧪 Testando Sistema de Rate Limiting de SMS');
  console.log('===========================================\n');

  try {
    // Simular requisições de SMS
    console.log('1. Testando primeira requisição...');
    const response1 = await axios.post(`${baseURL}/api/whatsapp-credentials/request-verification-code`, {
      phoneNumberId: testPhoneNumberId,
      accessToken: 'test-token',
      codeMethod: 'SMS',
      language: 'pt_BR'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': testClientId
      }
    });

    console.log('✅ Primeira requisição:', response1.data.success ? 'Sucesso' : 'Erro');
    console.log('   Resposta:', response1.data);

    // Aguardar 1 segundo
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Testar segunda requisição (deve ser bloqueada)
    console.log('\n2. Testando segunda requisição (deve ser bloqueada)...');
    try {
      const response2 = await axios.post(`${baseURL}/api/whatsapp-credentials/request-verification-code`, {
        phoneNumberId: testPhoneNumberId,
        accessToken: 'test-token',
        codeMethod: 'SMS',
        language: 'pt_BR'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': testClientId
        }
      });

      console.log('❌ Segunda requisição não foi bloqueada como esperado');
      console.log('   Resposta:', response2.data);
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.log('✅ Segunda requisição bloqueada corretamente (429)');
        console.log('   Erro:', error.response.data);
      } else {
        console.log('❌ Erro inesperado na segunda requisição:', error.message);
      }
    }

    // Testar verificação de status do rate limiting
    console.log('\n3. Verificando status do rate limiting...');
    try {
      const statusResponse = await axios.get(`${baseURL}/api/whatsapp-credentials/sms-rate-limit/${testPhoneNumberId}`, {
        headers: {
          'X-Client-ID': testClientId
        }
      });

      console.log('✅ Status do rate limiting obtido');
      console.log('   Dados:', statusResponse.data);
    } catch (error) {
      console.log('❌ Erro ao verificar status:', error.message);
    }

    // Simular múltiplas tentativas para testar bloqueio
    console.log('\n4. Simulando múltiplas tentativas...');
    for (let i = 1; i <= 5; i++) {
      try {
        console.log(`   Tentativa ${i}...`);
        const response = await axios.post(`${baseURL}/api/whatsapp-credentials/request-verification-code`, {
          phoneNumberId: testPhoneNumberId,
          accessToken: 'test-token',
          codeMethod: 'SMS',
          language: 'pt_BR'
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Client-ID': testClientId
          }
        });

        console.log(`   ✅ Tentativa ${i}: ${response.data.success ? 'Sucesso' : 'Erro'}`);
      } catch (error) {
        if (error.response && error.response.status === 429) {
          console.log(`   ✅ Tentativa ${i}: Bloqueada (429) - ${error.response.data.error}`);
        } else {
          console.log(`   ❌ Tentativa ${i}: Erro inesperado - ${error.message}`);
        }
      }

      // Aguardar 1 segundo entre tentativas
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎯 Teste concluído!');
    console.log('\n📋 Resumo:');
    console.log('- Rate limiting deve bloquear requisições muito próximas');
    console.log('- Múltiplas tentativas devem resultar em bloqueio temporário');
    console.log('- Status do rate limiting deve ser acessível');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Dados:', error.response.data);
    }
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testSmsRateLimiting()
    .then(() => {
      console.log('\n✅ Teste finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Teste falhou:', error);
      process.exit(1);
    });
}

module.exports = { testSmsRateLimiting }; 