const axios = require('axios');

// Script para testar a API de instâncias WhatsApp
async function testInstancesAPI() {
  try {
    console.log('🔍 Testando API de instâncias WhatsApp...');
    
    // Fazer requisição para a API
    const response = await axios.get('http://localhost:3001/api/whatsapp-credentials', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Substituir pelo token real
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Resposta da API:', {
      status: response.status,
      success: response.data.success,
      totalInstances: response.data.data?.length || 0,
      instances: response.data.data?.map(i => ({
        id: i.id,
        name: i.agent_name || i.instance_name,
        status: i.status,
        connection_type: i.connection_type
      })) || []
    });
    
    // Verificar instâncias ativas
    const activeInstances = response.data.data?.filter(instance => {
      const validStatuses = ['connected', 'open', 'pending', 'ready'];
      return validStatuses.includes(instance.status);
    }) || [];
    
    console.log('✅ Instâncias ativas:', activeInstances.length);
    activeInstances.forEach(instance => {
      console.log(`  - ${instance.agent_name || instance.instance_name} (${instance.status})`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao testar API:', error.response?.data || error.message);
  }
}

// Executar teste
testInstancesAPI(); 