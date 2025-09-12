const axios = require('axios');

// Configurações de teste
const TEST_CONFIG = {
  backendUrl: 'http://localhost:3000',
  endpoint: '/api/whatsapp-credentials/check-status',
  testData: {
    id: '1', // ID da credencial no Supabase
    wpp_number_id: '778533548672958',
    wpp_access_token: 'EAAN8AJvgblQBPaYXBN7a9NHi6u4KbPPrQ7lMMSheAwIahhpE9BZCibX7Si7H0XBemW0oEkAOyiIdgJf9tT3SkZC1nu4qp43WexUMgkBtqdOqt7Q3ytMnT8eO7TAecZCCz6Wn1GUKiY01JCQEjG8OI4M854x0et9ZB8f4eTlXAqrfPs08SIPtNQXRH6mYjsdyJJ9dfckusHvpjZC0TO3YhDW9m38SzZBcF21cfrZB2BC6JTc09sYYkzOPRvrraxMy2hTi9tryYiPQZDZD'
  }
};

async function waitForBackend() {
  console.log('⏳ Aguardando backend inicializar...');
  
  for (let i = 0; i < 30; i++) {
    try {
      const response = await axios.get(`${TEST_CONFIG.backendUrl}/health`, { timeout: 2000 });
      if (response.status === 200) {
        console.log('✅ Backend está rodando!');
        return true;
      }
    } catch (error) {
      // Ignorar erros durante a espera
    }
    
    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n❌ Backend não inicializou em 30 segundos');
  return false;
}

async function testBackendStatusCheck() {
  try {
    console.log('🧪 Testando verificação de status via backend');
    console.log('============================================');
    console.log(`🌐 Backend URL: ${TEST_CONFIG.backendUrl}`);
    console.log(`📱 Phone Number ID: ${TEST_CONFIG.testData.wpp_number_id}`);
    console.log(`🔑 Access Token: ${TEST_CONFIG.testData.wpp_access_token.substring(0, 20)}...`);
    console.log('');

    // Aguardar backend inicializar
    const backendReady = await waitForBackend();
    if (!backendReady) {
      console.log('❌ Não foi possível conectar ao backend');
      return;
    }

    console.log('');

    // Teste 1: Verificar se o endpoint está disponível
    console.log('📋 Teste 1: Verificar disponibilidade do endpoint');
    console.log('-----------------------------------------------');
    
    try {
      const healthResponse = await axios.get(`${TEST_CONFIG.backendUrl}/health`);
      console.log('✅ Endpoint de saúde:', healthResponse.status);
      console.log('📊 Resposta:', healthResponse.data);
    } catch (error) {
      console.log('❌ Endpoint de saúde não disponível:', error.message);
    }
    console.log('');

    // Teste 2: Tentar verificar status (pode falhar por autenticação)
    console.log('📋 Teste 2: Tentar verificar status');
    console.log('-----------------------------------');
    
    try {
      const statusResponse = await axios.post(
        `${TEST_CONFIG.backendUrl}${TEST_CONFIG.endpoint}`,
        { id: TEST_CONFIG.testData.id },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('✅ Status verificado com sucesso!');
      console.log('📊 Resposta:', JSON.stringify(statusResponse.data, null, 2));
      
      // Analisar os dados retornados
      if (statusResponse.data.success) {
        console.log('');
        console.log('🔍 Análise dos dados retornados:');
        console.log(`  - Status: ${statusResponse.data.data?.status}`);
        console.log(`  - Descrição: ${statusResponse.data.data?.status_description}`);
        console.log(`  - Code Verification Status: ${statusResponse.data.data?.code_verification_status}`);
        console.log(`  - Name Status: ${statusResponse.data.data?.name_status}`);
        
        if (statusResponse.data.data?.metadata) {
          console.log('  - Metadados disponíveis:', Object.keys(statusResponse.data.data.metadata));
        }
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ Erro na verificação de status: ${error.response.status}`);
        console.log('📊 Resposta de erro:', JSON.stringify(error.response.data, null, 2));
        
        if (error.response.status === 401) {
          console.log('🔐 Erro de autenticação - token pode estar expirado');
        } else if (error.response.status === 404) {
          console.log('🔍 Endpoint não encontrado');
        } else if (error.response.status === 500) {
          console.log('💥 Erro interno do servidor');
        }
      } else {
        console.log('❌ Erro de conexão:', error.message);
      }
    }

    console.log('');

    // Teste 3: Verificar logs do backend
    console.log('📋 Teste 3: Verificar logs do backend');
    console.log('-------------------------------------');
    console.log('📝 Verifique os logs do terminal onde o backend está rodando');
    console.log('🔍 Procure por logs relacionados a:');
    console.log('   - [WHATSAPP] Verificando status completo do número');
    console.log('   - [WHATSAPP] Dados completos do número');
    console.log('   - [WHATSAPP] Campos específicos');
    console.log('   - [STATUS] Dados de atualização para credencial');
    console.log('');

  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
  }
}

// Executar o teste
testBackendStatusCheck();








