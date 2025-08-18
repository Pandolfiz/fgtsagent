// Teste para verificar se o método processFacebookAuth está funcionando
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const WhatsappCredentialController = require('../controllers/whatsappCredentialController');

console.log('🔍 Testando método processFacebookAuth...\n');

// Verificar se o controller está sendo importado corretamente
console.log('📱 Controller importado:', typeof WhatsappCredentialController);
console.log('📱 Controller é objeto:', typeof WhatsappCredentialController === 'object');
console.log('📱 Controller tem processFacebookAuth:', typeof WhatsappCredentialController.processFacebookAuth === 'function');

// Verificar se o método existe
if (WhatsappCredentialController && typeof WhatsappCredentialController.processFacebookAuth === 'function') {
  console.log('✅ Método processFacebookAuth encontrado!');
  
  // Verificar se outros métodos também existem
  console.log('📋 Outros métodos:');
  console.log(`   exchangeCodeForToken: ${typeof WhatsappCredentialController.exchangeCodeForToken === 'function' ? '✅' : '❌'}`);
  console.log(`   getWhatsAppBusinessAccount: ${typeof WhatsappCredentialController.getWhatsAppBusinessAccount === 'function' ? '✅' : '❌'}`);
  
  // Testar se o método pode ser chamado (simulação)
  console.log('\n🔧 Testando chamada do método...');
  try {
    // Simular uma requisição
    const mockReq = {
      body: { code: 'test_code' },
      clientId: 'test_client_id'
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`📤 Resposta simulada (status ${code}):`, data);
          return mockRes;
        }
      }),
      json: (data) => {
        console.log('📤 Resposta simulada:', data);
        return mockRes;
      }
    };
    
    // Chamar o método
    console.log('🚀 Chamando processFacebookAuth...');
    WhatsappCredentialController.processFacebookAuth(mockReq, mockRes)
      .then(() => {
        console.log('✅ Método executado com sucesso!');
      })
      .catch((error) => {
        console.error('❌ Erro na execução:', error.message);
      });
    
  } catch (error) {
    console.error('❌ Erro ao executar método:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
} else {
  console.error('❌ Método processFacebookAuth não encontrado!');
  console.log('📋 Propriedades do controller:', Object.keys(WhatsappCredentialController));
}

console.log('\n🔍 Teste concluído!');
