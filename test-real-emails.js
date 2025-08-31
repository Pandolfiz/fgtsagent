const axios = require('axios');

async function testRealEmails() {
  // ✅ EMAILS REAIS encontrados no Supabase
  const realEmails = [
    'luizlafamilia013@gmail.com',      // ✅ DEVE retornar emailExists: true
    'fgtsagent@gmail.com',             // ✅ DEVE retornar emailExists: true  
    'lorenzonipedro@gmail.com',        // ✅ DEVE retornar emailExists: true
    'fgtsbot@gmail.com',               // ✅ DEVE retornar emailExists: true
    'luizfiorimr@gmail.com'            // ✅ DEVE retornar emailExists: true
  ];

  // ✅ EMAILS FALSOS para testar disponibilidade
  const fakeEmails = [
    'teste@exemplo.com',               // ✅ DEVE retornar emailExists: false
    'usuario@teste.com',               // ✅ DEVE retornar emailExists: false
    'admin@admin.com',                 // ✅ DEVE retornar emailExists: false
    'user123@gmail.com',               // ✅ DEVE retornar emailExists: false
    'novo@email.com'                   // ✅ DEVE retornar emailExists: false
  ];

  console.log('🧪 TESTANDO VALIDAÇÃO DE EMAIL COM DADOS REAIS DO SUPABASE\n');
  console.log('📧 Emails que DEVEM existir (emailExists: true):');
  realEmails.forEach(email => console.log(`   - ${email}`));
  console.log('\n📧 Emails que NÃO devem existir (emailExists: false):');
  fakeEmails.forEach(email => console.log(`   - ${email}`));
  console.log('\n' + '='.repeat(80) + '\n');

  // ✅ TESTE 1: Emails que DEVEM existir
  console.log('🔍 TESTE 1: Emails que DEVEM existir no Supabase\n');
  for (const email of realEmails) {
    try {
      console.log(`📧 Testando: ${email}`);
      
      const response = await axios.post('http://localhost:3000/api/auth/check-email', { 
        email: email 
      });
      
      const { success, emailExists, message, timestamp, debug } = response.data;
      
      if (success && emailExists) {
        console.log('✅ SUCESSO: Email encontrado corretamente');
        console.log(`   - emailExists: ${emailExists}`);
        console.log(`   - message: ${message}`);
        console.log(`   - debug: ${JSON.stringify(debug)}`);
      } else {
        console.log('❌ FALHA: Email deveria existir mas não foi encontrado');
        console.log(`   - emailExists: ${emailExists}`);
        console.log(`   - message: ${message}`);
      }
      
    } catch (error) {
      console.error('❌ ERRO:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
    
    console.log('---');
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // ✅ TESTE 2: Emails que NÃO devem existir
  console.log('🔍 TESTE 2: Emails que NÃO devem existir no Supabase\n');
  for (const email of fakeEmails) {
    try {
      console.log(`📧 Testando: ${email}`);
      
      const response = await axios.post('http://localhost:3000/api/auth/check-email', { 
        email: email 
      });
      
      const { success, emailExists, message, timestamp, debug } = response.data;
      
      if (success && !emailExists) {
        console.log('✅ SUCESSO: Email não encontrado corretamente');
        console.log(`   - emailExists: ${emailExists}`);
        console.log(`   - message: ${message}`);
        console.log(`   - debug: ${JSON.stringify(debug)}`);
      } else {
        console.log('❌ FALHA: Email não deveria existir mas foi encontrado');
        console.log(`   - emailExists: ${emailExists}`);
        console.log(`   - message: ${message}`);
      }
      
    } catch (error) {
      console.error('❌ ERRO:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
    
    console.log('---');
  }

  console.log('\n' + '='.repeat(80) + '\n');
  console.log('🏁 TESTE CONCLUÍDO!');
}

testRealEmails().catch(console.error);

