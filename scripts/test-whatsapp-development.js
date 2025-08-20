#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../src/.env') });
const axios = require('axios');

async function testWhatsAppDevelopment() {
  console.log('🧪 Testando WhatsApp em Modo Desenvolvimento...\n');

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    console.log('❌ META_APP_ID ou META_APP_SECRET não configurados');
    return;
  }

  console.log(`📱 App ID: ${appId}`);
  console.log(`🔑 App Secret: ${appSecret ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}\n`);

  try {
    // 1. Verificar se conseguimos acessar o app
    console.log('🧪 Teste 1: Acesso Básico ao App');
    const appResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}?fields=id,name,category`, {
      timeout: 15000
    });
    console.log('✅ App acessível:', appResponse.data.name);
    console.log('   Categoria:', appResponse.data.category);

    // 2. Tentar acessar produtos (pode falhar em desenvolvimento)
    console.log('\n🧪 Teste 2: Tentativa de Acesso aos Produtos');
    try {
      const productsResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}/products`, {
        timeout: 15000
      });
      
      if (productsResponse.data.data && productsResponse.data.data.length > 0) {
        console.log('✅ Produtos encontrados:');
        productsResponse.data.data.forEach(product => {
          console.log(`   - ${product.name} (${product.id})`);
        });
      } else {
        console.log('ℹ️  Nenhum produto encontrado (normal em desenvolvimento)');
      }
    } catch (productsError) {
      console.log('ℹ️  Erro ao acessar produtos (esperado em desenvolvimento):', productsError.response?.data?.error?.message || productsError.message);
    }

    // 3. Testar se conseguimos pelo menos fazer uma chamada OAuth básica
    console.log('\n🧪 Teste 3: Teste de Endpoint OAuth Básico');
    try {
      const oauthTestResponse = await axios.post('https://graph.facebook.com/v2.2/oauth/access_token', {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: process.env.META_REDIRECT_URI,
        code: 'FAKE_CODE_FOR_DEVELOPMENT_TESTING'
      }, {
        timeout: 15000
      });
      console.log('✅ Endpoint OAuth acessível');
    } catch (oauthError) {
      const errorMessage = oauthError.response?.data?.error?.message || oauthError.message;
      if (errorMessage.includes('Invalid verification code format')) {
        console.log('✅ Endpoint OAuth acessível (erro esperado com código fake)');
      } else if (errorMessage.includes('redirect_uri')) {
        console.log('❌ Problema com redirect URI:', errorMessage);
      } else {
        console.log('ℹ️  Erro OAuth:', errorMessage);
      }
    }

    // 4. Verificar se conseguimos acessar configurações básicas
    console.log('\n🧪 Teste 4: Configurações Básicas do App');
    try {
      const configResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}?fields=id,name,category,app_domains`, {
        timeout: 15000
      });
      console.log('✅ Configurações básicas acessíveis');
      console.log('   Domínios:', configResponse.data.app_domains?.join(', ') || 'Nenhum configurado');
    } catch (configError) {
      console.log('ℹ️  Erro ao acessar configurações:', configError.response?.data?.error?.message || configError.message);
    }

  } catch (error) {
    console.log('❌ Erro geral:', error.response?.data?.error?.message || error.message);
  }

  console.log('\n📊 Resumo para Modo Desenvolvimento:');
  console.log('💡 Em modo desenvolvimento:');
  console.log('   ✅ App básico deve funcionar');
  console.log('   ✅ Endpoint OAuth deve ser acessível');
  console.log('   ❌ Produtos WhatsApp podem não funcionar');
  console.log('   ❌ Permissões avançadas não disponíveis');
  console.log('');
  console.log('🔧 Para resolver completamente:');
  console.log('   1. Submeter app para revisão da Meta');
  console.log('   2. Solicitar permissões WhatsApp Business');
  console.log('   3. Aguardar aprovação');
  console.log('   4. Ou usar alternativas para desenvolvimento');
}

testWhatsAppDevelopment().catch(console.error);
