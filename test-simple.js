const axios = require('axios');

async function testSimple() {
  console.log('🧪 Teste Simples da API de Verificação de Email\n');
  
  // ✅ TESTE 1: Email que EXISTE
  try {
    console.log('📧 Testando email EXISTENTE: luizlafamilia013@gmail.com');
    
    const response1 = await axios.post('http://localhost:3000/api/auth/check-email', { 
      email: 'luizlafamilia013@gmail.com' 
    });
    
    console.log('✅ Resposta:', {
      success: response1.data.success,
      emailExists: response1.data.emailExists,
      message: response1.data.message,
      debug: response1.data.debug
    });
    
    if (response1.data.success && response1.data.emailExists) {
      console.log('🎉 SUCESSO: Email existente foi detectado corretamente!');
    } else {
      console.log('❌ FALHA: Email existente não foi detectado!');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste 1:', error.message);
  }
  
  console.log('\n' + '-'.repeat(50) + '\n');
  
  // ✅ TESTE 2: Email que NÃO EXISTE
  try {
    console.log('📧 Testando email INEXISTENTE: teste@exemplo.com');
    
    const response2 = await axios.post('http://localhost:3000/api/auth/check-email', { 
      email: 'teste@exemplo.com' 
    });
    
    console.log('✅ Resposta:', {
      success: response2.data.success,
      emailExists: response2.data.emailExists,
      message: response2.data.message,
      debug: response2.data.debug
    });
    
    if (response2.data.success && !response2.data.emailExists) {
      console.log('🎉 SUCESSO: Email inexistente foi detectado corretamente!');
    } else {
      console.log('❌ FALHA: Email inexistente não foi detectado corretamente!');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste 2:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 TESTE SIMPLES CONCLUÍDO!');
}

testSimple().catch(console.error);

