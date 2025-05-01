#!/usr/bin/env node

/**
 * Este script configura um webhook do Supabase para acionar a função Edge
 * quando uma nova credencial é criada.
 * 
 * Uso:
 *   node setup-webhook.js --url https://sua-url-supabase.com --key chave-de-serviço
 * 
 * Ou com variáveis de ambiente:
 *   SUPABASE_URL=https://sua-url.supabase.co SUPABASE_SERVICE_KEY=chave node setup-webhook.js
 */

// Imports
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuração
let SUPABASE_URL = process.env.SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Processar argumentos da linha de comando
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--url' && i + 1 < process.argv.length) {
    SUPABASE_URL = process.argv[++i];
  } else if (arg === '--key' && i + 1 < process.argv.length) {
    SUPABASE_SERVICE_KEY = process.argv[++i];
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Uso: node setup-webhook.js [opções]

Opções:
  --url URL             URL do Supabase (ex: https://seu-projeto.supabase.co)
  --key CHAVE           Chave de serviço do Supabase
  --help, -h            Mostra esta mensagem de ajuda

Também é possível configurar através de variáveis de ambiente:
  SUPABASE_URL          URL do Supabase
  SUPABASE_SERVICE_KEY  Chave de serviço do Supabase
    `);
    process.exit(0);
  }
}

// Funções auxiliares
function loadDotEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      console.log('Carregando variáveis do arquivo .env');
      require('dotenv').config();
      
      // Reatribuir após carregar o .env
      if (!SUPABASE_URL) SUPABASE_URL = process.env.SUPABASE_URL;
      if (!SUPABASE_SERVICE_KEY) SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
      
      return true;
    }
  } catch (error) {
    console.warn('Não foi possível carregar o arquivo .env:', error.message);
  }
  return false;
}

// Função principal
async function main() {
  console.log('\n=== Configuração de Webhook para Sincronização de Credenciais ===\n');
  
  try {
    // Tentar carregar variáveis de .env se não foram fornecidas
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      loadDotEnv();
    }
    
    // Verificar configurações
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error(
        'As variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórias.\n' +
        'Configure-as como variáveis de ambiente ou use os parâmetros --url e --key.'
      );
    }
    
    // Formatar URL se necessário
    if (!SUPABASE_URL.startsWith('http')) {
      SUPABASE_URL = `https://${SUPABASE_URL}`;
    }
    
    if (!SUPABASE_URL.endsWith('.co') && !SUPABASE_URL.includes('.supabase.')) {
      console.warn('Aviso: URL do Supabase parece inválida. Formato esperado: https://seu-projeto.supabase.co');
    }
    
    console.log(`Conectando ao Supabase: ${SUPABASE_URL}`);
    
    // Inicializar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Definir URL da função Edge
    const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/sync-credentials`;
    
    // Verificar se a tabela supabase_functions existe
    let hasWebhooksTable = false;
    try {
      const { error: tableError } = await supabase
        .from('supabase_functions')
        .select('id')
        .limit(1);
      
      hasWebhooksTable = !tableError;
    } catch (error) {
      console.warn('Não foi possível verificar a tabela de webhooks:', error.message);
    }
    
    if (!hasWebhooksTable) {
      console.log('\nA tabela supabase_functions não foi encontrada ou não está acessível.');
      console.log('Será necessário configurar o webhook manualmente através do Console do Supabase:');
      console.log('1. Acesse o console do Supabase');
      console.log('2. Vá para Database > Webhooks > Create new webhook');
      console.log('3. Configure o webhook com:');
      console.log(`   - Nome: sync_credentials_webhook`);
      console.log(`   - Tabela: credentials`);
      console.log(`   - Evento: INSERT`);
      console.log(`   - URL: ${EDGE_FUNCTION_URL}`);
      
      // Verificar se a função Edge existe
      try {
        console.log('\nVerificando se a função Edge está implantada...');
        const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-credentials`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          }
        });
        
        if (response.ok) {
          console.log('✅ Função Edge está implantada e acessível!');
        } else {
          console.log('⚠️ Função Edge não está respondendo corretamente. Status:', response.status);
          console.log('É necessário implantar a função Edge antes de configurar o webhook:');
          console.log('```');
          console.log('supabase functions deploy sync-credentials');
          console.log('```');
        }
      } catch (error) {
        console.error('⚠️ Não foi possível verificar a função Edge:', error.message);
        console.log('Verifique se a função está implantada corretamente.');
      }
      
      return;
    }
    
    // Verificar se o webhook já existe
    console.log('Verificando se o webhook já existe...');
    const { data: webhooks, error: webhooksError } = await supabase
      .from('supabase_functions')
      .select('*')
      .eq('name', 'sync_credentials_webhook');
    
    if (webhooksError) {
      throw new Error(`Erro ao verificar webhooks existentes: ${webhooksError.message}`);
    }
    
    let webhookId;
    
    if (webhooks && webhooks.length > 0) {
      console.log('Webhook já existe. Atualizando configuração...');
      webhookId = webhooks[0].id;
      
      // Atualizar o webhook existente
      const { error: updateError } = await supabase
        .from('supabase_functions')
        .update({
          function_url: EDGE_FUNCTION_URL,
          table_name: 'credentials',
          event_type: 'INSERT',
          updated_at: new Date().toISOString()
        })
        .eq('id', webhookId);
      
      if (updateError) {
        throw new Error(`Erro ao atualizar webhook: ${updateError.message}`);
      }
      
      console.log(`✅ Webhook atualizado com sucesso (ID: ${webhookId})`);
    } else {
      console.log('Criando novo webhook...');
      
      // Criar um novo webhook
      const { data: newWebhook, error: createError } = await supabase
        .from('supabase_functions')
        .insert({
          name: 'sync_credentials_webhook',
          function_url: EDGE_FUNCTION_URL,
          table_name: 'credentials',
          event_type: 'INSERT',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (createError) {
        throw new Error(`Erro ao criar webhook: ${createError.message}`);
      }
      
      webhookId = newWebhook[0].id;
      console.log(`✅ Webhook criado com sucesso (ID: ${webhookId})`);
    }
    
    console.log(`\nWebhook configurado para acionar a função Edge em:`);
    console.log(`${EDGE_FUNCTION_URL}\n`);
    
    // Testar a função Edge
    console.log('Testando a função Edge...');
    
    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Status HTTP: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Função Edge respondeu com sucesso!');
      
      if (result.message) {
        console.log(`Resposta: ${result.message}`);
      }
    } catch (testError) {
      console.error('⚠️ Erro ao testar função Edge:', testError.message);
      console.log('A função Edge pode não estar implantada ou acessível.');
      console.log('Para implantar a função, execute:');
      console.log('```');
      console.log('supabase functions deploy sync-credentials');
      console.log('```');
    }
    
    console.log('\n=== Configuração concluída! ===');
    console.log('\nPara testar o sistema completo:');
    console.log('1. Crie uma nova credencial no sistema');
    console.log('2. Verifique os logs da função Edge:');
    console.log('   supabase functions logs sync-credentials');
    console.log('3. Verifique a tabela n8n_credentials para confirmar que o registro foi criado:');
    console.log('   SELECT * FROM n8n_credentials ORDER BY created_at DESC LIMIT 5;');
    console.log('4. Acesse o n8n para verificar se a credencial foi criada com sucesso');
    
  } catch (error) {
    console.error('\n❌ Erro durante a configuração do webhook:', error.message);
    process.exit(1);
  }
}

// Executar o script
main().catch(error => {
  console.error('\n❌ Erro não tratado:', error);
  process.exit(1);
}); 