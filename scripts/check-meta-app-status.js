#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../src/.env') });
const axios = require('axios');

async function checkMetaAppStatus() {
  console.log('🔍 Verificando Status Completo do App Meta...\n');

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    console.log('❌ META_APP_ID ou META_APP_SECRET não configurados');
    return;
  }

  console.log(`📱 App ID: ${appId}`);
  console.log(`🔑 App Secret: ${appSecret ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}\n`);

  try {
    // 1. Verificar status básico do app
    console.log('🧪 Teste 1: Status Básico do App');
    const appResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}?fields=id,name,category,app_domains,website_url,app_type`, {
      timeout: 15000
    });
    console.log('✅ App encontrado:', appResponse.data.name);
    console.log('   Categoria:', appResponse.data.category);
    console.log('   Tipo:', appResponse.data.app_type);
    console.log('   Modo:', appResponse.data.app_mode);
    console.log('   Domínios:', appResponse.data.app_domains?.join(', ') || 'Nenhum');

    // 2. Verificar produtos
    console.log('\n🧪 Teste 2: Produtos do App');
    try {
      const productsResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}/products`, {
        timeout: 15000
      });
      
      if (productsResponse.data.data && productsResponse.data.data.length > 0) {
        console.log('✅ Produtos encontrados:');
        productsResponse.data.data.forEach(product => {
          console.log(`   - ${product.name} (${product.id}) - Status: ${product.status || 'N/A'}`);
        });
        
        // Verificar se WhatsApp está na lista
        const whatsappProduct = productsResponse.data.data.find(p => 
          p.name.toLowerCase().includes('whatsapp') || 
          p.product_type === 'whatsapp'
        );
        
        if (whatsappProduct) {
          console.log(`\n🎯 Produto WhatsApp encontrado: ${whatsappProduct.name}`);
          console.log(`   ID: ${whatsappProduct.id}`);
          console.log(`   Status: ${whatsappProduct.status || 'N/A'}`);
          
          // Verificar configuração do WhatsApp
          try {
            const whatsappConfigResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}/whatsapp_business_accounts`, {
              timeout: 15000
            });
            console.log('✅ Configurações WhatsApp acessíveis');
          } catch (whatsappError) {
            console.log('❌ Erro ao acessar configurações WhatsApp:', whatsappError.response?.data?.error?.message || whatsappError.message);
          }
        } else {
          console.log('❌ Produto WhatsApp NÃO encontrado na lista de produtos');
        }
      } else {
        console.log('❌ Nenhum produto encontrado');
      }
    } catch (productsError) {
      console.log('❌ Erro ao buscar produtos:', productsError.response?.data?.error?.message || productsError.message);
    }

    // 3. Verificar permissões
    console.log('\n🧪 Teste 3: Permissões do App');
    const permissions = ['whatsapp_business_management', 'whatsapp_business_messaging', 'business_management'];
    
    for (const permission of permissions) {
      try {
        const permResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}/permissions?permission=${permission}`, {
          timeout: 10000
        });
        
        if (permResponse.data.data && permResponse.data.data.length > 0) {
          const perm = permResponse.data.data[0];
          console.log(`✅ ${permission}: ${perm.status || 'N/A'}`);
        } else {
          console.log(`❌ ${permission}: Não encontrada`);
        }
      } catch (permError) {
        console.log(`❌ ${permission}: Erro - ${permError.response?.data?.error?.message || permError.message}`);
      }
    }

    // 4. Verificar configurações OAuth
    console.log('\n🧪 Teste 4: Configurações OAuth');
    try {
      const oauthResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}?fields=oauth_client_id,oauth_redirect_uris`, {
        timeout: 15000
      });
      
      if (oauthResponse.data.oauth_redirect_uris) {
        console.log('✅ URIs de redirecionamento OAuth:');
        oauthResponse.data.oauth_redirect_uris.forEach(uri => {
          console.log(`   - ${uri}`);
        });
        
        const expectedUri = 'http://localhost:3000/api/whatsapp-credentials/facebook/auth';
        const hasExpectedUri = oauthResponse.data.oauth_redirect_uris.includes(expectedUri);
        console.log(`\n🎯 URI esperado (${expectedUri}): ${hasExpectedUri ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO'}`);
      } else {
        console.log('❌ Nenhum URI de redirecionamento OAuth configurado');
      }
    } catch (oauthError) {
      console.log('❌ Erro ao verificar configurações OAuth:', oauthError.response?.data?.error?.message || oauthError.message);
    }

    // 5. Verificar status de revisão
    console.log('\n🧪 Teste 5: Status de Revisão');
    try {
      const reviewResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}?fields=app_review_status,app_review_info`, {
        timeout: 15000
      });
      
      console.log('✅ Status de revisão:', reviewResponse.data.app_review_status || 'N/A');
      if (reviewResponse.data.app_review_info) {
        console.log('   Informações:', JSON.stringify(reviewResponse.data.app_review_info, null, 2));
      }
    } catch (reviewError) {
      console.log('❌ Erro ao verificar status de revisão:', reviewError.response?.data?.error?.message || reviewError.message);
    }

  } catch (error) {
    console.log('❌ Erro geral:', error.response?.data?.error?.message || error.message);
  }

  console.log('\n📊 Resumo da Verificação:');
  console.log('💡 Se o produto WhatsApp não aparece, você precisa:');
  console.log('   1. Ir em developers.facebook.com');
  console.log('   2. Selecionar seu app "FgtsAgent"');
  console.log('   3. Clicar em "Produtos" na barra lateral');
  console.log('   4. Procurar por "WhatsApp" e clicar em "Configurar"');
  console.log('   5. NÃO apenas "Adicionar", mas "Configurar" completamente');
  console.log('   6. Aguardar a configuração ser processada');
}

checkMetaAppStatus().catch(console.error);
