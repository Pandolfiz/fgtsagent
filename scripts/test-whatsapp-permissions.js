#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const axios = require('axios');

async function testWhatsAppPermissions() {
  console.log('🔍 Testando Permissões do WhatsApp Business...\n');

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  console.log('📋 Informações do App:');
  console.log(`   App ID: ${appId}`);
  console.log(`   App Secret: ${appSecret ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}`);

  // 1. Verificar se o produto WhatsApp está adicionado
  console.log('\n🧪 Teste 1: Produto WhatsApp Adicionado');
  try {
    const productsResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}/products`, {
      timeout: 15000
    });
    
    if (productsResponse.data && productsResponse.data.data) {
      const whatsappProduct = productsResponse.data.data.find(p => 
        p.name === 'WhatsApp' || p.name === 'whatsapp' || p.name === 'WhatsApp Business'
      );
      
      if (whatsappProduct) {
        console.log('   ✅ Produto WhatsApp encontrado:');
        console.log(`      Nome: ${whatsappProduct.name}`);
        console.log(`      Status: ${whatsappProduct.status || 'N/A'}`);
        console.log(`      ID: ${whatsappProduct.id || 'N/A'}`);
      } else {
        console.log('   ❌ Produto WhatsApp NÃO encontrado!');
        console.log('   📋 Produtos disponíveis:');
        productsResponse.data.data.forEach(product => {
          console.log(`      - ${product.name}: ${product.status || 'N/A'}`);
        });
      }
    } else {
      console.log('   ❌ Nenhum produto encontrado no app');
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao verificar produtos: ${error.message}`);
    if (error.response?.data?.error) {
      console.log(`   Erro Meta: ${error.response.data.error.message}`);
    }
  }

  // 2. Verificar permissões específicas do WhatsApp
  console.log('\n🧪 Teste 2: Permissões WhatsApp Business');
  const whatsappPermissions = [
    'whatsapp_business_management',
    'whatsapp_business_messaging',
    'business_management'
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

  // 3. Verificar configurações OAuth específicas
  console.log('\n🧪 Teste 3: Configurações OAuth');
  try {
    const oauthResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}?fields=oauth_client_id,oauth_redirect_uris,app_domains`, {
      timeout: 15000
    });
    
    console.log('   📋 Configurações OAuth:');
    console.log(`      Client ID: ${oauthResponse.data.oauth_client_id || 'N/A'}`);
    console.log(`      Domínios: ${oauthResponse.data.app_domains?.join(', ') || 'N/A'}`);
    
    if (oauthResponse.data.oauth_redirect_uris) {
      console.log('      URIs de redirecionamento:');
      oauthResponse.data.oauth_redirect_uris.forEach(uri => {
        console.log(`        - ${uri}`);
      });
    } else {
      console.log('      ❌ Nenhum URI de redirecionamento configurado');
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao verificar OAuth: ${error.message}`);
  }

  // 4. Testar endpoint OAuth com erro detalhado
  console.log('\n🧪 Teste 4: Endpoint OAuth com Erro Detalhado');
  try {
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
      console.log(`   📋 Detalhes do Erro:`);
      console.log(`      Código: ${metaError.code}`);
      console.log(`      Tipo: ${metaError.type}`);
      console.log(`      Mensagem: ${metaError.message}`);
      console.log(`      Subcódigo: ${metaError.error_subcode || 'N/A'}`);
      
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
      } else if (metaError.code === 100) {
        console.log('   💡 Erro 100: Parâmetro inválido');
        console.log('      - Verificar se todos os parâmetros estão corretos');
      }
    }
  }

  // 5. Resumo e ações específicas
  console.log('\n📊 Resumo da Investigação:');
  console.log('   💡 Baseado nos testes, o problema pode ser:');
  console.log('      1. Produto WhatsApp não adicionado ao app');
  console.log('      2. Permissões WhatsApp Business não concedidas');
  console.log('      3. App em modo de desenvolvimento sem configuração adequada');
  console.log('      4. Domínios não configurados corretamente');
  
  console.log('\n🔧 Ações Específicas Recomendadas:');
  console.log('   1. Acesse developers.facebook.com');
  console.log('   2. Vá para seu app "FgtsAgent"');
  console.log('   3. Na aba "Produtos":');
  console.log('      - Clique em "Adicionar Produto"');
  console.log('      - Procure por "WhatsApp" e adicione');
  console.log('   4. Na aba "Configurações > Básico":');
  console.log('      - Adicione "localhost" aos domínios do app');
  console.log('      - Configure o redirect URI OAuth');
  console.log('   5. Na aba "Permissões e Recursos":');
  console.log('      - Solicite as permissões WhatsApp Business');
  console.log('      - Aguarde aprovação se necessário');
  
  console.log('\n🚨 Se o problema persistir:');
  console.log('   - O app pode precisar passar por revisão da Meta');
  console.log('   - Pode ser necessário solicitar permissões avançadas');
  console.log('   - Considere usar ngrok para desenvolvimento');
}

testWhatsAppPermissions().catch(console.error);
