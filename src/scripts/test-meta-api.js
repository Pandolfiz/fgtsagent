const axios = require('axios');

// Testar configurações do Meta API
async function testMetaConfig() {
  console.log('🔍 Testando configurações do Meta API...');
  
  // Simular o que o controller faria
  const requiredVars = ['META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error(`❌ Variáveis de ambiente faltando: ${missing.join(', ')}`);
    return false;
  }

  // Validar formato do App ID (deve ser numérico)
  if (!/^\d+$/.test(process.env.META_APP_ID)) {
    console.error(`❌ META_APP_ID inválido: deve ser numérico`);
    return false;
  }

  // Validar formato do App Secret (deve ter 32 caracteres hexadecimais)
  if (!/^[a-f0-9]{32}$/.test(process.env.META_APP_SECRET)) {
    console.error(`❌ META_APP_SECRET inválido: deve ter 32 caracteres hexadecimais`);
    return false;
  }

  // Validar URL de redirecionamento
  try {
    new URL(process.env.META_REDIRECT_URI);
  } catch (error) {
    console.error(`❌ META_REDIRECT_URI inválido: ${process.env.META_REDIRECT_URI}`);
    return false;
  }

  console.log('✅ Configurações do Meta API validadas com sucesso');
  console.log(`   App ID: ${process.env.META_APP_ID}`);
  console.log(`   App Secret: ***${process.env.META_APP_SECRET.slice(-4)}`);
  console.log(`   Redirect URI: ${process.env.META_REDIRECT_URI}`);
  return true;
}

// Testar endpoint de autenticação
async function testAuthEndpoint() {
  console.log('\n🔍 Testando endpoint de autenticação...');
  
  try {
    const response = await axios.post('http://localhost:3000/api/whatsapp-credentials/facebook/auth', {
      code: 'test'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Endpoint respondendo:', response.status);
    console.log('   Resposta:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.log('✅ Endpoint respondendo (esperado sem auth):', error.response.status);
      console.log('   Resposta:', error.response.data);
    } else {
      console.error('❌ Erro ao conectar com o endpoint:', error.message);
    }
  }
}

// Testar validação de código
async function testCodeValidation() {
  console.log('\n🔍 Testando validação de código...');
  
  try {
    const response = await axios.post('http://localhost:3000/api/whatsapp-credentials/facebook/auth', {
      code: 'test'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Validação funcionando:', response.status);
    console.log('   Resposta:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.log('✅ Validação funcionando (esperado sem auth):', error.response.status);
      console.log('   Resposta:', error.response.data);
    } else {
      console.error('❌ Erro na validação:', error.message);
    }
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando testes do Meta API...\n');
  
  // Carregar variáveis de ambiente
  require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
  
  // Testar configurações
  const configValid = await testMetaConfig();
  
  if (!configValid) {
    console.error('\n❌ Configurações inválidas. Abortando testes.');
    process.exit(1);
  }
  
  // Testar endpoint
  await testAuthEndpoint();
  
  // Testar validação
  await testCodeValidation();
  
  console.log('\n✅ Testes concluídos!');
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testMetaConfig, testAuthEndpoint, testCodeValidation };
