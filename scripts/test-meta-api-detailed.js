#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const axios = require('axios');

async function testMetaApiDetailed() {
  console.log('🔍 Teste detalhado da API da Meta...\n');

  // 1. Verificar configuração atual
  console.log('📋 Configuração Atual:');
  console.log(`   META_APP_ID: ${process.env.META_APP_ID}`);
  console.log(`   META_APP_SECRET: ${process.env.META_APP_SECRET ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}`);
  console.log(`   META_REDIRECT_URI: ${process.env.META_REDIRECT_URI}`);

  // 2. Testar endpoint básico da API
  console.log('\n🧪 Teste 1: Endpoint básico da API');
  try {
          const basicResponse = await axios.get('https://graph.facebook.com/v2.2/', {
      timeout: 10000
    });
    console.log('   ✅ API básica acessível');
    console.log(`   Status: ${basicResponse.status}`);
  } catch (error) {
    console.log(`   ❌ Erro na API básica: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }

  // 3. Testar endpoint de OAuth (sem credenciais reais)
  console.log('\n🧪 Teste 2: Endpoint OAuth (sem credenciais)');
  try {
          const oauthResponse = await axios.post('https://graph.facebook.com/v2.2/oauth/access_token', {
      client_id: '123456789', // ID fake para teste
      client_secret: 'fake_secret',
      redirect_uri: 'http://localhost:3000/test',
      code: 'fake_code'
    }, {
      timeout: 10000
    });
    console.log('   ✅ Endpoint OAuth acessível');
  } catch (error) {
    console.log(`   ℹ️  Endpoint OAuth retornou: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      
      // Analisar o erro específico
      if (error.response.data && error.response.data.error) {
        const metaError = error.response.data.error;
        console.log(`   Tipo de erro: ${metaError.type || 'N/A'}`);
        console.log(`   Código: ${metaError.code || 'N/A'}`);
        console.log(`   Subcódigo: ${metaError.error_subcode || 'N/A'}`);
        console.log(`   Mensagem: ${metaError.message || 'N/A'}`);
        
        // Interpretar o erro
        if (metaError.code === 100) {
          console.log('   💡 Erro 100: Parâmetros inválidos');
        } else if (metaError.code === 190) {
          console.log('   💡 Erro 190: Token inválido ou expirado');
        } else if (metaError.code === 191) {
          console.log('   💡 Erro 191: Redirect URI inválido');
        } else if (metaError.code === 192) {
          console.log('   💡 Erro 192: App ID inválido');
        }
      }
    }
  }

  // 4. Verificar se o app ID é válido
  console.log('\n🧪 Teste 3: Validação do App ID');
  try {
          const appResponse = await axios.get(`https://graph.facebook.com/v2.2/${process.env.META_APP_ID}`, {
      timeout: 10000
    });
    console.log('   ✅ App ID válido');
    console.log(`   Nome do App: ${appResponse.data.name || 'N/A'}`);
    console.log(`   Categoria: ${appResponse.data.category || 'N/A'}`);
  } catch (error) {
    console.log(`   ❌ App ID inválido ou não acessível: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      if (error.response.data && error.response.data.error) {
        console.log(`   Erro: ${error.response.data.error.message}`);
      }
    }
  }

  // 5. Verificar permissões do app
  console.log('\n🧪 Teste 4: Permissões do App');
  try {
          const permissionsResponse = await axios.get(`https://graph.facebook.com/v2.2/${process.env.META_APP_ID}/permissions`, {
      timeout: 10000
    });
    console.log('   ✅ Permissões acessíveis');
    if (permissionsResponse.data && permissionsResponse.data.data) {
      console.log('   Permissões encontradas:');
      permissionsResponse.data.data.forEach(perm => {
        console.log(`     - ${perm.permission}: ${perm.status}`);
      });
    }
  } catch (error) {
    console.log(`   ❌ Não foi possível verificar permissões: ${error.message}`);
  }

  // 6. Resumo e recomendações
  console.log('\n📊 Resumo do Diagnóstico:');
  console.log('   💡 Se o erro 400 persiste após corrigir o redirect URI:');
  console.log('      1. Verifique se o app da Meta foi atualizado com o novo URI');
  console.log('      2. Confirme se o app tem permissões para WhatsApp Business API');
  console.log('      3. Teste com um novo código de autorização (o atual pode ter expirado)');
  console.log('      4. Verifique se o app está em modo de desenvolvimento ou produção');
  
  console.log('\n🔧 Ações Recomendadas:');
  console.log('   1. Acesse developers.facebook.com');
  console.log('   2. Vá para seu app > Configurações > Básico');
  console.log('   3. Atualize o "URI de redirecionamento OAuth válido" para:');
  console.log(`      ${process.env.META_REDIRECT_URI}`);
  console.log('   4. Salve as alterações');
  console.log('   5. Teste a autenticação novamente');
}

testMetaApiDetailed().catch(console.error);
