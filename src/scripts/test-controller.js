// Teste para verificar se o controller está funcionando
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const WhatsappCredentialController = require('../controllers/whatsappCredentialController');

console.log('🔍 Testando controller do WhatsApp...\n');

// Verificar se as variáveis estão disponíveis
console.log('📱 Variáveis da Meta API:');
console.log(`   META_APP_ID: ${process.env.META_APP_ID || '❌ NÃO CONFIGURADO'}`);
console.log(`   META_APP_SECRET: ${process.env.META_APP_SECRET ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}`);
console.log(`   META_REDIRECT_URI: ${process.env.META_APP_SECRET || '❌ NÃO CONFIGURADO'}`);

// Testar se o controller pode ser acessado
try {
  console.log('\n🔧 Testando acesso ao controller...');
  const controller = WhatsappCredentialController;
  console.log('✅ Controller acessado com sucesso');
  
  // Testar se os métodos existem
  console.log('\n📋 Verificando métodos do controller:');
  console.log(`   processFacebookAuth: ${typeof controller.processFacebookAuth === 'function' ? '✅' : '❌'}`);
  console.log(`   exchangeCodeForToken: ${typeof controller.exchangeCodeForToken === 'function' ? '✅' : '❌'}`);
  console.log(`   getWhatsAppBusinessAccount: ${typeof controller.getWhatsAppBusinessAccount === 'function' ? '✅' : '❌'}`);
  
} catch (error) {
  console.error('❌ Erro ao acessar controller:', error.message);
}

console.log('\n🔍 Teste concluído!');
