/**
 * Script para testar a integração do Google OAuth2
 * Execute com: node src/utils/google-oauth-test.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const axios = require('axios');
const readline = require('readline');

// Criar interface de linha de comando
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Verificar variáveis de ambiente necessárias
function checkEnvironment() {
  console.log('🔍 Verificando variáveis de ambiente...');
  
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Variáveis de ambiente ausentes:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.log('\n📝 Adicione estas variáveis ao seu arquivo .env e tente novamente.');
    return false;
  }
  
  console.log('✅ Todas as variáveis de ambiente necessárias estão configuradas.');
  
  // Verificar a URI de redirecionamento
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!redirectUri.includes('localhost') && !redirectUri.startsWith('https://')) {
    console.warn('⚠️ AVISO: A URI de redirecionamento não usa https. Para produção, use HTTPS.');
  }
  
  return true;
}

// Testar a criação de cliente OAuth2
function testOAuth2Client() {
  console.log('\n🔍 Testando criação de cliente OAuth2...');
  
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    console.log('✅ Cliente OAuth2 criado com sucesso.');
    return oauth2Client;
  } catch (error) {
    console.error('❌ Erro ao criar cliente OAuth2:', error.message);
    return null;
  }
}

// Gerar URL de autorização
function generateAuthUrl(oauth2Client) {
  console.log('\n🔍 Gerando URL de autorização...');
  
  try {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
    
    // Criar objeto state para passar informações adicionais
    const state = JSON.stringify({
      provider: 'google',
      test: true,
      timestamp: new Date().toISOString()
    });
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: encodeURIComponent(state)
    });
    
    console.log('✅ URL de autorização gerada com sucesso.');
    console.log(`\n📝 URL para teste: ${authUrl}`);
    
    return authUrl;
  } catch (error) {
    console.error('❌ Erro ao gerar URL de autorização:', error.message);
    return null;
  }
}

// Testar a troca de código por token
async function testCodeExchange(oauth2Client, code) {
  console.log('\n🔍 Testando troca de código por token...');
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('✅ Código trocado por token com sucesso.');
    console.log('\n📝 Tokens recebidos:');
    console.log(JSON.stringify({
      access_token: tokens.access_token ? '***' + tokens.access_token.substr(-5) : undefined,
      refresh_token: tokens.refresh_token ? '***' + tokens.refresh_token.substr(-5) : undefined,
      expiry_date: tokens.expiry_date,
      id_token: tokens.id_token ? '***' + tokens.id_token.substr(-5) : undefined
    }, null, 2));
    
    return tokens;
  } catch (error) {
    console.error('❌ Erro ao trocar código por token:', error.message);
    return null;
  }
}

// Testar a obtenção de informações do usuário
async function testGetUserInfo(accessToken) {
  console.log('\n🔍 Testando obtenção de informações do usuário...');
  
  try {
    // Método 1: Usar googleapis
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });
    
    const { data } = await oauth2.userinfo.get();
    
    console.log('✅ Informações do usuário obtidas com sucesso via Google API.');
    console.log('\n📝 Informações do usuário:');
    console.log(JSON.stringify({
      email: data.email,
      name: data.name,
      picture: data.picture,
      id: data.id
    }, null, 2));
    
    return data;
  } catch (error) {
    console.log('⚠️ Erro ao obter informações via Google API, tentando método alternativo...');
    
    try {
      // Método 2: Fazer requisição direta ao endpoint
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      console.log('✅ Informações do usuário obtidas com sucesso via método alternativo.');
      console.log('\n📝 Informações do usuário:');
      console.log(JSON.stringify({
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture,
        sub: response.data.sub
      }, null, 2));
      
      return response.data;
    } catch (axiosError) {
      console.error('❌ Erro ao obter informações do usuário:', axiosError.message);
      return null;
    }
  }
}

// Função principal para conduzir o teste
async function runTest() {
  console.log('🚀 Iniciando teste de integração Google OAuth2...\n');
  
  // Verificar ambiente
  if (!checkEnvironment()) {
    process.exit(1);
  }
  
  // Criar cliente OAuth2
  const oauth2Client = testOAuth2Client();
  if (!oauth2Client) {
    process.exit(1);
  }
  
  // Gerar URL de autorização
  const authUrl = generateAuthUrl(oauth2Client);
  if (!authUrl) {
    process.exit(1);
  }
  
  // Solicitar o código de autorização ao usuário
  rl.question('\n⌨️ Acesse a URL acima no navegador e cole o código de autorização aqui: ', async (code) => {
    // Trocar código por token
    const tokens = await testCodeExchange(oauth2Client, code.trim());
    if (!tokens) {
      rl.close();
      process.exit(1);
    }
    
    // Obter informações do usuário
    await testGetUserInfo(tokens.access_token);
    
    console.log('\n🎉 Teste concluído com sucesso!');
    rl.close();
  });
}

// Executar o teste
runTest().catch(error => {
  console.error('❌ Erro inesperado:', error);
  rl.close();
  process.exit(1);
}); 