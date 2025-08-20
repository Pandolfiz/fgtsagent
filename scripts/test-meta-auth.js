#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../src/.env') });

const WhatsappCredentialController = require('../src/controllers/whatsappCredentialController');

async function testMetaAuth() {
  console.log('🔍 Testando autenticação da Meta...\n');

  // Verificar se o controller está funcionando
  console.log('📱 Verificando controller:');
  console.log(`   Controller: ${typeof WhatsappCredentialController === 'object' ? '✅' : '❌'}`);
  console.log(`   processFacebookAuth: ${typeof WhatsappCredentialController.processFacebookAuth === 'function' ? '✅' : '❌'}`);
  console.log(`   exchangeCodeForToken: ${typeof WhatsappCredentialController.exchangeCodeForToken === 'function' ? '✅' : '❌'}`);
  console.log(`   getWhatsAppBusinessAccount: ${typeof WhatsappCredentialController.getWhatsAppBusinessAccount === 'function' ? '✅' : '❌'}`);

  // Verificar variáveis de ambiente
  console.log('\n🔧 Verificando variáveis de ambiente:');
  console.log(`   META_APP_ID: ${process.env.META_APP_ID || '❌ NÃO CONFIGURADO'}`);
  console.log(`   META_APP_SECRET: ${process.env.META_APP_SECRET ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}`);
  console.log(`   META_REDIRECT_URI: ${process.env.META_REDIRECT_URI || '❌ NÃO CONFIGURADO'}`);

  // Testar método exchangeCodeForToken
  console.log('\n🧪 Testando método exchangeCodeForToken...');
  try {
    // Simular uma chamada (sem código real)
    const testResult = await WhatsappCredentialController.exchangeCodeForToken('test-code');
    console.log('✅ Método executado com sucesso');
    console.log(`   Resultado: ${JSON.stringify(testResult)}`);
  } catch (error) {
    console.log('❌ Erro ao executar método:', error.message);
  }

  // Testar método getWhatsAppBusinessAccount
  console.log('\n🧪 Testando método getWhatsAppBusinessAccount...');
  try {
    // Simular uma chamada (sem token real)
    const testResult = await WhatsappCredentialController.getWhatsAppBusinessAccount('test-token');
    console.log('✅ Método executado com sucesso');
    console.log(`   Resultado: ${JSON.stringify(testResult)}`);
  } catch (error) {
    console.log('❌ Erro ao executar método:', error.message);
  }

  console.log('\n✅ Teste concluído!');
  console.log('\n💡 Se todos os métodos estão funcionando, o problema pode estar em:');
  console.log('   1. Middleware de autenticação');
  console.log('   2. Contexto da requisição');
  console.log('   3. Configuração das rotas');
}

// Executar o teste
testMetaAuth().catch(console.error);
