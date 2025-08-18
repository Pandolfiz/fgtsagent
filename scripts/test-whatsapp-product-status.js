#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const axios = require('axios');

async function testWhatsAppProductStatus() {
  console.log('🔍 Testando Status Completo do Produto WhatsApp...\n');

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  console.log('📋 Informações do App:');
  console.log(`   App ID: ${appId}`);
  console.log(`   App Secret: ${appSecret ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}`);

  // 1. Verificar status detalhado do produto WhatsApp
  console.log('\n🧪 Teste 1: Status Detalhado do Produto WhatsApp');
  try {
          const whatsappResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}/products?fields=id,name,status,product_type,created_time`, {
      timeout: 15000
    });
    
    if (whatsappResponse.data && whatsappResponse.data.data) {
      const whatsappProduct = whatsappResponse.data.data.find(p => 
        p.name === 'WhatsApp' || p.name === 'whatsapp' || p.name === 'WhatsApp Business'
      );
      
      if (whatsappProduct) {
        console.log('   ✅ Produto WhatsApp encontrado:');
        console.log(`      Nome: ${whatsappProduct.name}`);
        console.log(`      Status: ${whatsappProduct.status || 'N/A'}`);
        console.log(`      ID: ${whatsappProduct.id || 'N/A'}`);
        console.log(`      Tipo: ${whatsappProduct.product_type || 'N/A'}`);
        console.log(`      Criado em: ${whatsappProduct.created_time || 'N/A'}`);
        
        // Verificar se o produto está ativo
        if (whatsappProduct.status === 'active' || whatsappProduct.status === 'enabled') {
          console.log('      ✅ Produto está ativo');
        } else {
          console.log(`      ⚠️  Produto não está ativo (status: ${whatsappProduct.status})`);
        }
      } else {
        console.log('   ❌ Produto WhatsApp NÃO encontrado!');
        console.log('   📋 Produtos disponíveis:');
        whatsappResponse.data.data.forEach(product => {
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

  // 2. Verificar configurações específicas do WhatsApp
  console.log('\n🧪 Teste 2: Configurações do WhatsApp');
  try {
          const whatsappConfigResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}/whatsapp_business_accounts`, {
      timeout: 15000
    });
    
    if (whatsappConfigResponse.data && whatsappConfigResponse.data.data) {
      console.log('   ✅ Contas WhatsApp Business encontradas:');
      whatsappConfigResponse.data.data.forEach(account => {
        console.log(`      - ID: ${account.id}`);
        console.log(`      - Nome: ${account.name || 'N/A'}`);
        console.log(`      - Status: ${account.verification_status || 'N/A'}`);
      });
    } else {
      console.log('   ⚠️  Nenhuma conta WhatsApp Business configurada');
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao verificar configurações WhatsApp: ${error.message}`);
    if (error.response?.data?.error) {
      const metaError = error.response.data.error;
      console.log(`   📋 Detalhes do Erro:`);
      console.log(`      Código: ${metaError.code}`);
      console.log(`      Tipo: ${metaError.type}`);
      console.log(`      Mensagem: ${metaError.message}`);
      
      if (metaError.code === 100) {
        console.log('   💡 Erro 100: Produto WhatsApp não está completamente configurado');
      } else if (metaError.code === 190) {
        console.log('   💡 Erro 190: Token de acesso inválido ou expirado');
      }
    }
  }

  // 3. Verificar permissões específicas do WhatsApp
  console.log('\n🧪 Teste 3: Permissões WhatsApp Business');
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
      if (error.response?.data?.error) {
        const metaError = error.response.data.error;
        console.log(`      Código: ${metaError.code}`);
        console.log(`      Mensagem: ${metaError.message}`);
      }
    }
  }

  // 4. Testar endpoint OAuth com análise detalhada
  console.log('\n🧪 Teste 4: Endpoint OAuth com Análise Detalhada');
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
      
      // Análise específica do erro 191
      if (metaError.code === 191) {
        console.log('   💡 Erro 191: Redirect URI inválido');
        console.log('   🔍 Possíveis causas:');
        console.log('      1. Produto WhatsApp não está completamente configurado');
        console.log('      2. Permissões WhatsApp não foram concedidas');
        console.log('      3. App não passou pela revisão da Meta');
        console.log('      4. Configuração OAuth incompleta');
      }
    }
  }

  // 5. Verificar status de revisão do app
  console.log('\n🧪 Teste 5: Status de Revisão do App');
  try {
          const reviewResponse = await axios.get(`https://graph.facebook.com/v2.2/${appId}?fields=app_review_status,app_review_info,app_type,app_mode`, {
      timeout: 15000
    });
    
    console.log(`   📋 Status do App:`);
    console.log(`      Tipo: ${reviewResponse.data.app_type || 'N/A'}`);
    console.log(`      Modo: ${reviewResponse.data.app_mode || 'N/A'}`);
    console.log(`      Status de Revisão: ${reviewResponse.data.app_review_status || 'N/A'}`);
    
    if (reviewResponse.data.app_review_info) {
      console.log(`      Info de Revisão: ${JSON.stringify(reviewResponse.data.app_review_info, null, 2)}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao verificar status de revisão: ${error.message}`);
  }

  // 6. Resumo e ações específicas
  console.log('\n📊 Resumo da Investigação:');
  console.log('   💡 Baseado nos testes, o problema pode ser:');
  console.log('      1. Produto WhatsApp não está completamente configurado');
  console.log('      2. Permissões WhatsApp Business não concedidas');
  console.log('      3. App não passou pela revisão da Meta');
  console.log('      4. Configuração OAuth incompleta');
  
  console.log('\n🔧 Ações Específicas Recomendadas:');
  console.log('   1. Acesse developers.facebook.com');
  console.log('   2. Vá para seu app "FgtsAgent"');
  console.log('   3. Na aba "Produtos > WhatsApp":');
  console.log('      - Verifique se está "Configurado" ou "Ativo"');
  console.log('      - Se não estiver, clique em "Configurar"');
  console.log('   4. Na aba "Permissões e Recursos":');
  console.log('      - Solicite as permissões WhatsApp Business');
  console.log('      - Aguarde aprovação se necessário');
  console.log('   5. Na aba "WhatsApp > Configuração":');
  console.log('      - Configure o webhook se necessário');
  
  console.log('\n🚨 Se o problema persistir:');
  console.log('   - O app pode precisar passar por revisão da Meta');
  console.log('   - Pode ser necessário solicitar permissões avançadas');
  console.log('   - Considere usar ngrok para desenvolvimento');
}

testWhatsAppProductStatus().catch(console.error);
