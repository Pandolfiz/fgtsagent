const axios = require('axios');

/**
 * Script simples para testar o sistema de rate limiting de SMS
 * Testa apenas a lógica de rate limiting sem autenticação
 */
async function testSmsRateLimitingSimple() {
  console.log('🧪 Teste Simples do Sistema de Rate Limiting');
  console.log('============================================\n');

  // Testar o serviço diretamente
  const SmsRateLimitService = require('../services/smsRateLimitService');
  
  const testPhoneNumberId = '123456789';
  const testClientId = 'test-client-123';
  
  console.log('1. Testando primeira verificação...');
  const check1 = SmsRateLimitService.canRequestSms(testPhoneNumberId, testClientId);
  console.log('   Resultado:', check1.allowed ? '✅ Permitido' : '❌ Bloqueado');
  console.log('   Mensagem:', check1.message);
  
  console.log('\n2. Registrando primeira tentativa...');
  SmsRateLimitService.recordSmsRequest(testPhoneNumberId, testClientId, true);
  
  console.log('\n3. Testando segunda verificação (deve ser bloqueada)...');
  const check2 = SmsRateLimitService.canRequestSms(testPhoneNumberId, testClientId);
  console.log('   Resultado:', check2.allowed ? '✅ Permitido' : '❌ Bloqueado');
  console.log('   Mensagem:', check2.message);
  console.log('   Razão:', check2.reason);
  
  console.log('\n4. Verificando estatísticas...');
  const stats = SmsRateLimitService.getSmsStats(testPhoneNumberId, testClientId);
  console.log('   Tentativas:', stats.attempts);
  console.log('   Última requisição:', stats.lastRequest);
  console.log('   Bloqueado:', stats.isBlocked);
  console.log('   Máximo de tentativas:', stats.maxAttempts);
  
  console.log('\n5. Simulando múltiplas tentativas...');
  for (let i = 1; i <= 5; i++) {
    SmsRateLimitService.recordSmsRequest(testPhoneNumberId, testClientId, false);
    const check = SmsRateLimitService.canRequestSms(testPhoneNumberId, testClientId);
    console.log(`   Tentativa ${i}: ${check.allowed ? '✅ Permitido' : '❌ Bloqueado'} - ${check.reason}`);
  }
  
  console.log('\n6. Verificando estatísticas finais...');
  const finalStats = SmsRateLimitService.getSmsStats(testPhoneNumberId, testClientId);
  console.log('   Tentativas:', finalStats.attempts);
  console.log('   Bloqueado:', finalStats.isBlocked);
  console.log('   Bloqueado até:', finalStats.blockedUntil);
  
  console.log('\n🎯 Teste concluído!');
  console.log('\n📋 Resumo esperado:');
  console.log('- Primeira verificação: Permitida');
  console.log('- Segunda verificação: Bloqueada (TOO_SOON)');
  console.log('- Após 5 tentativas: Bloqueada (RATE_LIMIT_EXCEEDED)');
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testSmsRateLimitingSimple()
    .then(() => {
      console.log('\n✅ Teste finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Teste falhou:', error);
      process.exit(1);
    });
}

module.exports = { testSmsRateLimitingSimple }; 