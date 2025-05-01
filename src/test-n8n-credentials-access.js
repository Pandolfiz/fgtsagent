/**
 * Script para testar o acesso às tabelas de credenciais e diagnosticar problemas de permissão
 */
require('dotenv').config();
const { supabase, supabaseAdmin } = require('./config/supabase');
const logger = require('./utils/logger');

async function testCredentialsAccess() {
  console.log('=== TESTE DE ACESSO ÀS TABELAS DE CREDENCIAIS ===');
  
  try {
    // Teste 1: Verificar se podemos ler a tabela credentials com cliente anônimo
    console.log('\n[TESTE 1] Leitura da tabela credentials com cliente anônimo');
    const { data: credentials, error: credentialsError } = await supabase
      .from('credentials')
      .select('count(*)')
      .limit(1);
      
    if (credentialsError) {
      console.error(`❌ ERRO: Não foi possível ler a tabela credentials com cliente anônimo: ${credentialsError.message}`);
    } else {
      console.log(`✅ SUCESSO: Tabela credentials acessível com cliente anônimo`);
    }
    
    // Teste 2: Verificar se podemos ler a tabela credentials com cliente admin
    console.log('\n[TESTE 2] Leitura da tabela credentials com cliente admin');
    const { data: credentialsAdmin, error: credentialsAdminError } = await supabaseAdmin
      .from('credentials')
      .select('count(*)')
      .limit(1);
      
    if (credentialsAdminError) {
      console.error(`❌ ERRO: Não foi possível ler a tabela credentials com cliente admin: ${credentialsAdminError.message}`);
    } else {
      console.log(`✅ SUCESSO: Tabela credentials acessível com cliente admin`);
    }
    
    // Teste 3: Verificar se podemos ler a tabela n8n_credentials com cliente anônimo
    console.log('\n[TESTE 3] Leitura da tabela n8n_credentials com cliente anônimo');
    const { data: n8nCredentials, error: n8nCredentialsError } = await supabase
      .from('n8n_credentials')
      .select('count(*)')
      .limit(1);
      
    if (n8nCredentialsError) {
      console.error(`❌ ERRO: Não foi possível ler a tabela n8n_credentials com cliente anônimo: ${n8nCredentialsError.message}`);
    } else {
      console.log(`✅ SUCESSO: Tabela n8n_credentials acessível com cliente anônimo`);
    }
    
    // Teste 4: Verificar se podemos ler a tabela n8n_credentials com cliente admin
    console.log('\n[TESTE 4] Leitura da tabela n8n_credentials com cliente admin');
    const { data: n8nCredentialsAdmin, error: n8nCredentialsAdminError } = await supabaseAdmin
      .from('n8n_credentials')
      .select('count(*)')
      .limit(1);
      
    if (n8nCredentialsAdminError) {
      console.error(`❌ ERRO: Não foi possível ler a tabela n8n_credentials com cliente admin: ${n8nCredentialsAdminError.message}`);
    } else {
      console.log(`✅ SUCESSO: Tabela n8n_credentials acessível com cliente admin`);
    }
    
    // Teste 5: Testar a função RPC save_credential_anonymous
    console.log('\n[TESTE 5] Função RPC save_credential_anonymous');
    try {
      const testCredential = {
        name: `test_credential_${Date.now()}`,
        type: 'test',
        organization_id: '00000000-0000-0000-0000-000000000000', // UUID de teste
        data: { test: true }
      };
      
      const { data: rpcData, error: rpcError } = await supabase.rpc('save_credential_anonymous', {
        p_name: testCredential.name,
        p_type: testCredential.type,
        p_organization_id: testCredential.organization_id,
        p_data: testCredential.data
      });
      
      if (rpcError) {
        console.error(`❌ ERRO: Função RPC save_credential_anonymous falhou: ${rpcError.message}`);
      } else {
        console.log(`✅ SUCESSO: Função RPC save_credential_anonymous funcionou`);
        
        // Limpar dados de teste
        try {
          await supabaseAdmin
            .from('credentials')
            .delete()
            .eq('id', rpcData.id);
            
          console.log(`   Limpeza: Dados de teste removidos com sucesso`);
        } catch (cleanupError) {
          console.warn(`   Aviso: Não foi possível limpar dados de teste: ${cleanupError.message}`);
        }
      }
    } catch (rpcTestError) {
      console.error(`❌ ERRO: Exceção ao testar RPC save_credential_anonymous: ${rpcTestError.message}`);
    }
    
    // Teste 6: Verificar se a função RPC save_n8n_credential existe
    console.log('\n[TESTE 6] Verificar função RPC save_n8n_credential');
    try {
      // Testar se a função existe chamando-a com parâmetros mínimos
      const testData = {
        p_name: `test_n8n_cred_${Date.now()}`,
        p_type: 'test',
        p_credential_type: 'test',
        p_node_type: 'test',
        p_n8n_credential_id: 'test',
        p_organization_id: '00000000-0000-0000-0000-000000000000' // UUID de teste
      };
      
      const { data, error } = await supabase.rpc('save_n8n_credential', testData);
      
      if (error) {
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          console.error(`❌ ERRO: Função RPC save_n8n_credential não existe: ${error.message}`);
        } else {
          console.error(`❌ ERRO: Função RPC save_n8n_credential falhou: ${error.message}`);
        }
      } else {
        console.log(`✅ SUCESSO: Função RPC save_n8n_credential existe e funcionou`);
        
        // Limpar dados de teste
        try {
          await supabaseAdmin
            .from('n8n_credentials')
            .delete()
            .eq('id', data.id);
            
          console.log(`   Limpeza: Dados de teste removidos com sucesso`);
        } catch (cleanupError) {
          console.warn(`   Aviso: Não foi possível limpar dados de teste: ${cleanupError.message}`);
        }
      }
    } catch (functionTestError) {
      console.error(`❌ ERRO: Exceção ao testar RPC save_n8n_credential: ${functionTestError.message}`);
    }
    
    // Teste 7: Verificar políticas RLS na tabela n8n_credentials
    console.log('\n[TESTE 7] Verificar políticas RLS na tabela n8n_credentials');
    try {
      const { data: policies, error: policiesError } = await supabaseAdmin.rpc('get_policies_for_table', {
        table_name: 'n8n_credentials'
      });
      
      if (policiesError) {
        console.error(`❌ ERRO: Não foi possível verificar políticas RLS: ${policiesError.message}`);
        console.log('   DICA: Certifique-se de que a função RPC get_policies_for_table existe no banco de dados');
        
        // Criar a função se ela não existir
        console.log('   Criando função get_policies_for_table...');
        const createFunctionQuery = `
          CREATE OR REPLACE FUNCTION public.get_policies_for_table(table_name text)
          RETURNS json
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            policies_json json;
          BEGIN
            SELECT json_agg(
              json_build_object(
                'policy_name', pol.polname,
                'table_name', tab.relname,
                'command', pol.cmd,
                'roles', COALESCE(pol.roles, array['public']),
                'with_check', COALESCE(pol.with_check, '')
              )
            ) INTO policies_json
            FROM pg_catalog.pg_policy pol
            JOIN pg_catalog.pg_class tab ON pol.polrelid = tab.oid
            JOIN pg_catalog.pg_namespace n ON tab.relnamespace = n.oid
            WHERE tab.relname = table_name
            AND n.nspname = 'public';
            
            IF policies_json IS NULL THEN
              RETURN '[]'::json;
            END IF;
            
            RETURN policies_json;
          END;
          $$;
        `;
        
        const { error: createError } = await supabaseAdmin.rpc('exec_sql', { sql: createFunctionQuery });
        
        if (createError) {
          console.error(`   ❌ Não foi possível criar a função: ${createError.message}`);
        } else {
          console.log('   ✅ Função get_policies_for_table criada com sucesso');
          
          // Tentar novamente
          const { data: policiesRetry, error: policiesRetryError } = await supabaseAdmin.rpc('get_policies_for_table', {
            table_name: 'n8n_credentials'
          });
          
          if (policiesRetryError) {
            console.error(`   ❌ Ainda não foi possível verificar políticas: ${policiesRetryError.message}`);
          } else {
            console.log(`   ✅ Encontradas ${policiesRetry.length} políticas RLS na tabela n8n_credentials`);
            console.log(JSON.stringify(policiesRetry, null, 2));
          }
        }
      } else {
        console.log(`✅ SUCESSO: Encontradas ${policies.length} políticas RLS na tabela n8n_credentials`);
        console.log(JSON.stringify(policies, null, 2));
      }
    } catch (policiesTestError) {
      console.error(`❌ ERRO: Exceção ao verificar políticas RLS: ${policiesTestError.message}`);
    }
    
    console.log('\n=== RESUMO DOS TESTES ===');
    console.log('As tabelas de credenciais estão configuradas corretamente se todos os testes acima passaram.');
    console.log('Se houver erros, siga estas etapas:');
    console.log('1. Execute o script src/config/fix-n8n-credentials-rls.sql no SQL Editor do Supabase');
    console.log('2. Execute o script src/config/rpcs.sql para criar as funções de banco de dados necessárias');
    console.log('3. Verifique se o cliente supabaseAdmin está configurado corretamente com a chave service_role');
    
  } catch (error) {
    console.error(`Erro geral durante o teste: ${error.message}`);
    console.error(error.stack);
  }
}

// Executar o teste de acesso
testCredentialsAccess(); 