const axios = require('axios');
const logger = require('../config/logger');

/**
 * Script para testar o sistema híbrido de Rate + Speed Limiting
 */
async function testSpeedLimiting() {
  const baseURL = 'http://localhost:3000';
  
  console.log('🧪 Testando Sistema Híbrido de Rate + Speed Limiting');
  console.log('==================================================\n');

  try {
    // Teste 1: Requisições normais (sem atraso)
    console.log('1. Testando requisições normais...');
    for (let i = 1; i <= 5; i++) {
      const startTime = Date.now();
      const response = await axios.get(`${baseURL}/api/status`);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`   Requisição ${i}: ${responseTime}ms - ${response.data.status}`);
      
      // Verificar headers de speed limiting
      const slowDownHeader = response.headers['x-slow-down'];
      const slowDownRemaining = response.headers['x-slow-down-remaining'];
      
      if (slowDownHeader) {
        console.log(`   ⚠️  Speed limiting ativo: ${slowDownHeader}ms de atraso`);
      }
      if (slowDownRemaining) {
        console.log(`   📊 Requisições restantes antes do atraso: ${slowDownRemaining}`);
      }
    }

    // Teste 2: Simular muitas requisições para ativar speed limiting
    console.log('\n2. Simulando muitas requisições para ativar speed limiting...');
    const requests = [];
    
    for (let i = 1; i <= 50; i++) {
      requests.push(
        axios.get(`${baseURL}/api/status`)
          .then(response => {
            const slowDownHeader = response.headers['x-slow-down'];
            return {
              request: i,
              slowDown: slowDownHeader,
              status: response.data.status
            };
          })
          .catch(error => {
            return {
              request: i,
              error: error.response?.status || error.message
            };
          })
      );
    }

    const results = await Promise.all(requests);
    
    // Analisar resultados
    let normalRequests = 0;
    let slowDownRequests = 0;
    let blockedRequests = 0;
    
    results.forEach(result => {
      if (result.error) {
        blockedRequests++;
        console.log(`   ❌ Requisição ${result.request}: Bloqueada (${result.error})`);
      } else if (result.slowDown) {
        slowDownRequests++;
        console.log(`   ⏳ Requisição ${result.request}: Speed limiting (${result.slowDown}ms)`);
      } else {
        normalRequests++;
      }
    });

    console.log(`\n📊 Resumo do Teste:`);
    console.log(`   Requisições normais: ${normalRequests}`);
    console.log(`   Requisições com speed limiting: ${slowDownRequests}`);
    console.log(`   Requisições bloqueadas: ${blockedRequests}`);

    // Teste 3: Verificar headers de rate limiting
    console.log('\n3. Verificando headers de rate limiting...');
    try {
      const response = await axios.get(`${baseURL}/api/status`);
      
      const rateLimitLimit = response.headers['x-ratelimit-limit'];
      const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
      const rateLimitReset = response.headers['x-ratelimit-reset'];
      
      console.log(`   Rate Limit Total: ${rateLimitLimit}`);
      console.log(`   Rate Limit Restante: ${rateLimitRemaining}`);
      if (rateLimitReset) {
        const resetDate = new Date(parseInt(rateLimitReset) * 1000);
        console.log(`   Rate Limit Reset: ${resetDate.toLocaleString()}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro ao verificar headers: ${error.message}`);
    }

    // Teste 4: Testar upload com speed limiting
    console.log('\n4. Testando upload com speed limiting...');
    try {
      // Simular upload (sem arquivo real)
      const uploadResponse = await axios.post(`${baseURL}/api/agent/upload-kb`, {
        agentName: 'test-agent'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });
      
      console.log(`   ✅ Upload testado: ${uploadResponse.status}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`   ⚠️  Upload testado: Autenticação necessária (esperado)`);
      } else {
        console.log(`   ❌ Erro no upload: ${error.response?.status || error.message}`);
      }
    }

    console.log('\n🎯 Teste concluído!');
    console.log('\n📋 Resumo da Estratégia Híbrida:');
    console.log('- Speed Limiting: Desaceleração gradual para melhor UX');
    console.log('- Rate Limiting: Proteção contra ataques massivos');
    console.log('- Headers informativos: Monitoramento em tempo real');
    console.log('- Configuração granular: Diferentes limites por categoria');

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
  testSpeedLimiting()
    .then(() => {
      console.log('\n✅ Teste finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Teste falhou:', error);
      process.exit(1);
    });
}

module.exports = { testSpeedLimiting }; 