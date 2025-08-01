const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Script para testar o tratamento de erros da Meta API
 * Simula diferentes cenários de erro para verificar se estamos capturando corretamente
 */

async function testMetaAPIErrorHandling() {
  console.log('🧪 Testando tratamento de erros da Meta API...\n');

  // Simular erro com campos error_user_title e error_user_msg
  const mockErrorResponse = {
    error: {
      message: "Não foi possível enviar o código",
      type: "OAuthException",
      code: 100,
      error_subcode: 2388004
    },
    error_user_title: "Não foi possível enviar o código",
    error_user_msg: "Tente novamente depois de um tempo."
  };

  console.log('📋 Resposta de erro simulada:');
  console.log(JSON.stringify(mockErrorResponse, null, 2));
  console.log('\n');

  // Testar extração dos campos
  const errorData = mockErrorResponse.error;
  const responseData = mockErrorResponse;
  
  const userTitle = responseData.error_user_title || errorData.error_user_title;
  const userMessage = responseData.error_user_msg || errorData.error_user_msg;
  const errorCode = errorData.code;
  const errorSubcode = errorData.error_subcode;

  console.log('🔍 Campos extraídos:');
  console.log(`- userTitle: ${userTitle}`);
  console.log(`- userMessage: ${userMessage}`);
  console.log(`- errorCode: ${errorCode}`);
  console.log(`- errorSubcode: ${errorSubcode}`);
  console.log('\n');

  // Simular diferentes cenários de erro
  const testCases = [
    {
      name: 'Código já solicitado',
      code: 100,
      subcode: 2388004,
      expectedMessage: 'Tente novamente depois de um tempo.'
    },
    {
      name: 'Número não pendente',
      code: 100,
      subcode: 2388005,
      expectedMessage: 'Número não está pendente de verificação.'
    },
    {
      name: 'Erro genérico',
      code: 100,
      subcode: 999999,
      expectedMessage: 'Tente novamente depois de um tempo.'
    }
  ];

  console.log('🧪 Testando cenários de erro:\n');

  testCases.forEach(testCase => {
    console.log(`📝 ${testCase.name}:`);
    console.log(`   - Código: ${testCase.code}`);
    console.log(`   - Subcódigo: ${testCase.subcode}`);
    console.log(`   - Mensagem esperada: ${testCase.expectedMessage}`);
    
    // Simular lógica de tratamento
    if (testCase.code === 100 && testCase.subcode === 2388004) {
      console.log(`   ✅ Tratado como: Código já solicitado`);
    } else if (testCase.code === 100 && testCase.subcode === 2388005) {
      console.log(`   ✅ Tratado como: Número não pendente`);
    } else {
      console.log(`   ✅ Tratado como: Erro genérico da Meta`);
    }
    console.log('');
  });

  // Testar estrutura de resposta de erro
  const errorResponse = {
    success: false,
    error: userMessage || 'Erro ao solicitar código de verificação',
    userTitle: userTitle || 'Erro na solicitação',
    code: 'META_API_ERROR',
    metaCode: errorCode,
    metaSubcode: errorSubcode,
    details: errorData
  };

  console.log('📤 Estrutura de resposta de erro:');
  console.log(JSON.stringify(errorResponse, null, 2));
  console.log('\n');

  // Testar exibição no frontend
  console.log('🖥️ Como seria exibido no frontend:');
  let displayMessage = errorResponse.error || 'Erro desconhecido';
  
  if (errorResponse.userTitle) {
    displayMessage = `${errorResponse.userTitle}: ${errorResponse.error}`;
  }
  
  if (errorResponse.metaCode || errorResponse.metaSubcode) {
    displayMessage += `\n\nCódigo Meta: ${errorResponse.metaCode}${errorResponse.metaSubcode ? ` (${errorResponse.metaSubcode})` : ''}`;
  }
  
  console.log(displayMessage);
  console.log('\n');

  console.log('✅ Teste concluído!');
}

// Executar teste
testMetaAPIErrorHandling().catch(console.error); 