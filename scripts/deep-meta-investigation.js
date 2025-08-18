#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const axios = require('axios');

async function deepMetaInvestigation() {
  console.log('🔍 Investigação Profunda da Meta...\n');

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  console.log('📋 Informações do App:');
  console.log(`   App ID: ${appId}`);
  console.log(`   App Secret: ${appSecret ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}`);

  // 1. Verificar status básico do app
  console.log('\n🧪 Teste 1: Status Básico do App');
  try {
          const appResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}?fields=id,name,category,app_domains,website_url,privacy_policy_url,terms_of_service_url,user_support_email,user_support_url,app_type,app_mode`, {
      timeout: 15000
    });
    
    console.log('   ✅ App acessível');
    console.log(`   Nome: ${appResponse.data.name}`);
    console.log(`   Categoria: ${appResponse.data.category}`);
    console.log(`   Tipo: ${appResponse.data.app_type || 'N/A'}`);
    console.log(`   Modo: ${appResponse.data.app_mode || 'N/A'}`);
    console.log(`   Domínios: ${appResponse.data.app_domains?.join(', ') || 'N/A'}`);
    
  } catch (error) {
    console.log(`   ❌ Erro ao acessar app: ${error.message}`);
    if (error.response?.data?.error) {
      console.log(`   Erro Meta: ${error.response.data.error.message}`);
    }
  }

  // 2. Verificar produtos adicionados ao app
  console.log('\n🧪 Teste 2: Produtos do App');
  try {
          const productsResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}/products`, {
      timeout: 15000
    });
    
    if (productsResponse.data && productsResponse.data.data) {
      console.log('   ✅ Produtos encontrados:');
      productsResponse.data.data.forEach(product => {
        console.log(`     - ${product.name}: ${product.status || 'N/A'}`);
      });
    } else {
      console.log('   ⚠️  Nenhum produto encontrado');
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao verificar produtos: ${error.message}`);
  }

  // 3. Verificar permissões específicas do WhatsApp
  console.log('\n🧪 Teste 3: Permissões WhatsApp Business');
  const whatsappPermissions = [
    'whatsapp_business_management',
    'whatsapp_business_messaging',
    'business_management',
    'pages_manage_metadata',
    'pages_read_engagement'
  ];

  for (const permission of whatsappPermissions) {
    try {
      const permResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}/permissions?permission=${permission}`, {
        timeout: 10000
      });
      
      if (permResponse.data && permResponse.data.data && permResponse.data.data.length > 0) {
        const perm = permResponse.data.data[0];
        console.log(`   ✅ ${permission}: ${perm.status}`);
        if (perm.status === 'granted') {
          console.log(`      ✅ Permissão concedida`);
        } else if (perm.status === 'declined') {
          console.log(`      ❌ Permissão negada`);
        } else if (perm.status === 'pending') {
          console.log(`      ⏳ Permissão pendente`);
        }
      } else {
        console.log(`   ❌ ${permission}: Não encontrada`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${permission}: Erro - ${error.message}`);
    }
  }

  // 4. Verificar configurações OAuth
  console.log('\n🧪 Teste 4: Configurações OAuth');
  try {
          const oauthResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}?fields=oauth_client_id,oauth_client_secret,oauth_redirect_uri`, {
      timeout: 15000
    });
    
    if (oauthResponse.data.oauth_redirect_uris) {
      console.log('   ✅ URIs de redirecionamento configurados:');
      oauthResponse.data.oauth_redirect_uris.forEach(uri => {
        console.log(`     - ${uri}`);
      });
    } else {
      console.log('   ⚠️  Nenhum URI de redirecionamento configurado');
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao verificar OAuth: ${error.message}`);
  }

  // 5. Verificar status de revisão do app
  console.log('\n🧪 Teste 5: Status de Revisão');
  try {
          const reviewResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}?fields=app_review_status,app_review_info`, {
      timeout: 15000
    });
    
    console.log(`   Status de Revisão: ${reviewResponse.data.app_review_status || 'N/A'}`);
    if (reviewResponse.data.app_review_info) {
      console.log(`   Info de Revisão: ${JSON.stringify(reviewResponse.data.app_review_info, null, 2)}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao verificar status de revisão: ${error.message}`);
  }

  // 6. Testar endpoint OAuth com credenciais reais
  console.log('\n🧪 Teste 6: Endpoint OAuth com Credenciais Reais');
  try {
    // Usar um código fake mas com credenciais reais
          const oauthTestResponse = await axios.post('https://graph.facebook.com/v2.2/oauth/access_token', {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: process.env.META_REDIRECT_URI,
      code: 'FAKE_CODE_FOR_TESTING'
    }, {
      timeout: 15000
    });
    
    console.log('   ✅ Endpoint OAuth funcionando');
    
  } catch (error) {
    console.log(`   ℹ️  Endpoint OAuth retornou: ${error.message}`);
    if (error.response?.data?.error) {
      const metaError = error.response.data.error;
      console.log(`   Código de erro: ${metaError.code}`);
      console.log(`   Tipo: ${metaError.type}`);
      console.log(`   Mensagem: ${metaError.message}`);
      
      // Interpretar erros específicos
      if (metaError.code === 101) {
        console.log('   💡 Erro 101: Problema de validação da aplicação');
        console.log('      - App pode estar em modo de desenvolvimento');
        console.log('      - App pode não ter permissões necessárias');
        console.log('      - App pode estar aguardando revisão');
      } else if (metaError.code === 191) {
        console.log('   💡 Erro 191: Redirect URI inválido');
        console.log('      - URI não está configurado no app da Meta');
      } else if (metaError.code === 192) {
        console.log('   💡 Erro 192: App ID inválido');
      }
    }
  }

  // 7. Resumo e recomendações específicas
  console.log('\n📊 Resumo da Investigação:');
  console.log('   💡 Baseado nos testes, o problema pode ser:');
  console.log('      1. App em modo de desenvolvimento');
  console.log('      2. Permissões WhatsApp Business não concedidas');
  console.log('      3. App aguardando revisão da Meta');
  console.log('      4. Configuração OAuth incorreta');
  
  console.log('\n🔧 Ações Específicas Recomendadas:');
  console.log('   1. Acesse developers.facebook.com');
  console.log('   2. Vá para seu app "FgtsAgent"');
  console.log('   3. Verifique na aba "Configurações > Básico":');
  console.log('      - Modo do app (desenvolvimento/produção)');
  console.log('      - Status de revisão');
  console.log('   4. Vá para "Produtos > WhatsApp":');
  console.log('      - Confirme se o produto está adicionado');
  console.log('      - Verifique se as permissões estão concedidas');
  console.log('   5. Vá para "Configurações > Básico > OAuth":');
  console.log('      - Configure o redirect URI correto');
  console.log('      - Salve as alterações');
  
  console.log('\n🚨 Se o problema persistir:');
  console.log('   - O app pode precisar passar por revisão da Meta');
  console.log('   - Pode ser necessário solicitar permissões avançadas');
  console.log('   - Considere criar um novo app para testes');
}

deepMetaInvestigation().catch(console.error);
