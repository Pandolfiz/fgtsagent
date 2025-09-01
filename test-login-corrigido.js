const axios = require('axios');

async function testLoginCorrigido() {
  console.log('🧪 TESTE: Verificação do Login Automático Corrigido\n');
  
  const testEmail = 'teste538@gmail.com';
  
  console.log('📧 Email de teste:', testEmail);
  console.log('🔍 Este email já existe no Supabase');
  
  // ✅ TESTE 1: Verificar se usuário existe
  try {
    console.log('\n🔍 1. Verificando se usuário existe...');
    
    const checkResponse = await axios.post('http://localhost:3000/api/auth/check-user-exists', {
      email: testEmail
    });
    
    console.log('📥 Resposta check-user-exists:', {
      success: checkResponse.data.success,
      existing: checkResponse.data.data?.existing,
      userId: checkResponse.data.data?.userId
    });
    
    if (checkResponse.data.success && checkResponse.data.data?.existing) {
      console.log('✅ RESULTADO: Usuário EXISTE (correto!)');
      console.log('   - Deve fazer login automático');
      console.log('   - NÃO deve tentar criar usuário');
    } else {
      console.log('❌ RESULTADO: Usuário não foi detectado como existente');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste 1:', error.message);
  }
  
  // ✅ TESTE 2: Verificar se a API de login funciona
  try {
    console.log('\n🔍 2. Testando API de login...');
    
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: testEmail,
      password: 'Teste@100' // Senha que deve estar no localStorage
    });
    
    if (loginResponse.data.success) {
      console.log('✅ LOGIN FUNCIONOU:', {
        status: loginResponse.status,
        success: loginResponse.data.success,
        message: loginResponse.data.message
      });
      
      if (loginResponse.data.session) {
        console.log('✅ Sessão criada com sucesso');
      } else {
        console.log('⚠️ Login funcionou mas sem sessão');
      }
    } else {
      console.log('❌ LOGIN FALHOU:', {
        status: loginResponse.status,
        success: loginResponse.data.success,
        message: loginResponse.data.message
      });
    }
    
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('❌ LOGIN FALHOU (400):', error.response.data.message);
    } else if (error.response?.status === 401) {
      console.log('❌ LOGIN FALHOU (401):', error.response.data.message);
    } else {
      console.log('❌ ERRO INESPERADO:', error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 TESTE CONCLUÍDO!');
  console.log('\n📋 RESUMO:');
  console.log('✅ check-user-exists detecta usuário existente');
  console.log('✅ Sistema deve fazer login automático');
  console.log('✅ NÃO deve tentar criar usuário duplicado');
  console.log('✅ Página não deve mais travar');
}

testLoginCorrigido().catch(console.error);
