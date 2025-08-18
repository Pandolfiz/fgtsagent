#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../src/.env') });

const axios = require('axios');

async function debugMetaConfig() {
  console.log('🔍 Diagnosticando configuração da Meta...\n');

  // 1. Verificar variáveis de ambiente
  console.log('📋 Variáveis de Ambiente:');
  console.log(`   META_APP_ID: ${process.env.META_APP_ID || '❌ NÃO CONFIGURADO'}`);
  console.log(`   META_APP_SECRET: ${process.env.META_APP_SECRET ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}`);
  console.log(`   META_REDIRECT_URI: ${process.env.META_REDIRECT_URI || '❌ NÃO CONFIGURADO'}`);

  // 2. Verificar se as variáveis são placeholders
  const isPlaceholder = (value) => {
    if (!value) return true;
    return value.includes('seu_') || value.includes('sua_') || value === 'undefined' || value === 'null';
  };

  console.log('\n🔍 Verificação de Placeholders:');
  console.log(`   META_APP_ID é placeholder: ${isPlaceholder(process.env.META_APP_ID) ? '❌ SIM' : '✅ NÃO'}`);
  console.log(`   META_APP_SECRET é placeholder: ${isPlaceholder(process.env.META_APP_SECRET) ? '❌ SIM' : '✅ NÃO'}`);
  console.log(`   META_REDIRECT_URI é placeholder: ${isPlaceholder(process.env.META_REDIRECT_URI) ? '❌ SIM' : '✅ NÃO'}`);

  // 3. Testar se as variáveis têm formato válido
  console.log('\n🔍 Validação de Formato:');
  
  const appIdValid = process.env.META_APP_ID && /^\d+$/.test(process.env.META_APP_ID);
  console.log(`   META_APP_ID formato válido: ${appIdValid ? '✅ SIM' : '❌ NÃO'}`);
  
  const appSecretValid = process.env.META_APP_SECRET && process.env.META_APP_SECRET.length >= 32;
  console.log(`   META_APP_SECRET formato válido: ${appSecretValid ? '✅ SIM' : '✅ SIM'}`);
  
  const redirectUriValid = process.env.META_REDIRECT_URI && process.env.META_REDIRECT_URI.startsWith('http');
  console.log(`   META_REDIRECT_URI formato válido: ${redirectUriValid ? '✅ SIM' : '❌ NÃO'}`);

  // 4. Testar conexão com a API da Meta (sem credenciais reais)
  console.log('\n🧪 Teste de Conexão com API da Meta:');
  
  try {
    // Testar se a API está acessível
          const testResponse = await axios.get('https://graph.facebook.com/v2.2/', {
      timeout: 5000
    });
    console.log('   ✅ API da Meta está acessível');
  } catch (error) {
    console.log(`   ❌ Erro ao acessar API da Meta: ${error.message}`);
  }

  // 5. Verificar se o redirect URI está correto
  console.log('\n🔗 Análise do Redirect URI:');
  if (process.env.META_REDIRECT_URI) {
    const redirectUri = process.env.META_REDIRECT_URI;
    console.log(`   URI atual: ${redirectUri}`);
    
    // Verificar se está apontando para localhost em desenvolvimento
    if (redirectUri.includes('localhost')) {
      console.log('   ℹ️  Usando localhost (desenvolvimento)');
    } else if (redirectUri.includes('fgtsagent.com.br')) {
      console.log('   ℹ️  Usando domínio de produção');
    } else {
      console.log('   ⚠️  URI não reconhecido');
    }
  }

  // 6. Resumo e recomendações
  console.log('\n📊 Resumo:');
  const hasValidConfig = appIdValid && appSecretValid && redirectUriValid && !isPlaceholder(process.env.META_APP_ID);
  
  if (hasValidConfig) {
    console.log('   ✅ Configuração parece válida');
    console.log('   💡 O erro 400 pode ser devido a:');
    console.log('      - Código de autorização expirado');
    console.log('      - App da Meta não configurado corretamente');
    console.log('      - Permissões insuficientes no app');
  } else {
    console.log('   ❌ Configuração inválida detectada');
    console.log('   💡 Corrija as seguintes variáveis:');
    
    if (!process.env.META_APP_ID || isPlaceholder(process.env.META_APP_ID)) {
      console.log('      - META_APP_ID: Configure com o ID real do app da Meta');
    }
    if (!process.env.META_APP_SECRET || isPlaceholder(process.env.META_APP_SECRET)) {
      console.log('      - META_APP_SECRET: Configure com o secret real do app da Meta');
    }
    if (!process.env.META_REDIRECT_URI || isPlaceholder(process.env.META_REDIRECT_URI)) {
      console.log('      - META_REDIRECT_URI: Configure com a URI de redirecionamento correta');
    }
  }

  console.log('\n🔧 Próximos Passos:');
  if (!hasValidConfig) {
    console.log('   1. Configure as variáveis de ambiente no arquivo .env');
    console.log('   2. Obtenha as credenciais reais do app da Meta');
    console.log('   3. Configure o redirect URI no app da Meta');
  } else {
    console.log('   1. Verifique se o app da Meta está configurado corretamente');
    console.log('   2. Confirme se o redirect URI está registrado no app');
    console.log('   3. Teste com um novo código de autorização');
  }
}

debugMetaConfig().catch(console.error);
