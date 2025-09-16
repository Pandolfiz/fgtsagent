const notificationService = require('../services/notificationService');

async function testNotificationService() {
  console.log('🧪 Testando serviço de notificações...');
  
  try {
    // Verificar status inicial
    console.log('📊 Status inicial:', notificationService.getStatus());
    
    // Iniciar serviço
    console.log('🚀 Iniciando serviço...');
    await notificationService.start();
    
    // Aguardar um pouco
    console.log('⏳ Aguardando 5 segundos...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verificar status após inicialização
    console.log('📊 Status após inicialização:', notificationService.getStatus());
    
    // Aguardar mais um pouco para ver se há logs
    console.log('⏳ Aguardando mais 5 segundos para logs...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('✅ Teste do serviço concluído');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    // Parar o serviço
    console.log('🛑 Parando serviço...');
    await notificationService.stop();
    console.log('✅ Serviço parado');
  }
}

testNotificationService();
