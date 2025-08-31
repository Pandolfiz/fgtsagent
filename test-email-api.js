const axios = require('axios');

async function testEmailAPI() {
  const testEmails = [
    'teste@exemplo.com',
    'usuario@teste.com',
    'admin@admin.com',
    'user123@gmail.com'
  ];

  console.log('🧪 Testando API de verificação de email...\n');

  for (const email of testEmails) {
    try {
      console.log(`📧 Testando email: ${email}`);
      
      const response = await axios.post('http://localhost:3000/api/auth/check-email', { 
        email: email 
      });
      
      console.log('✅ Resposta:', {
        success: response.data.success,
        emailExists: response.data.emailExists,
        message: response.data.message,
        timestamp: response.data.timestamp
      });
      
    } catch (error) {
      console.error('❌ Erro:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
    
    console.log('---');
  }
}

testEmailAPI().catch(console.error);

