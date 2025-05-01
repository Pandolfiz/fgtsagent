require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Verificar se as variáveis de ambiente estão configuradas
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('ERRO: Configure as variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env');
  process.exit(1);
}

// Inicializar cliente Supabase com chave de administrador
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function diagnoseAndFixAgentCreation() {
  console.log('===== DIAGNÓSTICO E CORREÇÃO DE CRIAÇÃO DE AGENTES =====');
  console.log('Este script irá diagnosticar e tentar corrigir problemas com a criação de agentes.');
  console.log('Passo 1: Verificar conexão com Supabase...');
  
  try {
    // Verificar conexão com Supabase
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao conectar com Supabase:', error.message);
      console.log('\nVerifique se suas variáveis de ambiente estão configuradas corretamente no arquivo .env:');
      console.log('- SUPABASE_URL');
      console.log('- SUPABASE_SERVICE_KEY');
      process.exit(1);
    }
    
    console.log('Conexão com Supabase estabelecida com sucesso!');
    
    // Passo 2: Verificar função exec_sql
    console.log('\nPasso 2: Verificando função exec_sql...');
    
    try {
      const { error: execSqlError } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
      
      if (execSqlError) {
        console.log('A função exec_sql não está funcionando ou não existe.');
        console.log('Vamos corrigi-la executando o script setup-exec-sql.js...');
        
        try {
          execSync('node src/setup-exec-sql.js', { stdio: 'inherit' });
          console.log('Script setup-exec-sql.js executado com sucesso!');
        } catch (execError) {
          console.error('Erro ao executar setup-exec-sql.js. Você precisará corrigir manualmente.');
          console.log('\nPara corrigir manualmente, execute o seguinte SQL no console do Supabase:');
          console.log(`
CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
          `);
        }
      } else {
        console.log('A função exec_sql existe e está funcionando corretamente!');
      }
    } catch (execSqlCheckError) {
      console.log('Erro ao verificar função exec_sql:', execSqlCheckError.message);
      console.log('Vamos tentar corrigir executando setup-exec-sql.js...');
      
      try {
        execSync('node src/setup-exec-sql.js', { stdio: 'inherit' });
      } catch (execError) {
        console.error('Erro ao executar setup-exec-sql.js.');
      }
    }
    
    // Passo 3: Verificar outras funções RPC
    console.log('\nPasso 3: Verificando outras funções RPC necessárias...');
    console.log('Executando script para aplicar funções RPC...');
    
    try {
      execSync('node src/apply-rpc-functions.js', { stdio: 'inherit' });
      console.log('Script apply-rpc-functions.js executado com sucesso!');
    } catch (rpcError) {
      console.error('Erro ao executar apply-rpc-functions.js. Verifique os logs para mais detalhes.');
    }
    
    // Passo 4: Verificar tabelas e permissões
    console.log('\nPasso 4: Verificando tabelas e permissões...');
    
    try {
      // Verificar tabela client_agents
      const { error: agentsError } = await supabase
        .from('client_agents')
        .select('id')
        .limit(1);
        
      if (agentsError) {
        console.log('Erro ao acessar tabela client_agents:', agentsError.message);
        console.log('Isso pode indicar um problema de permissões ou que a tabela não existe.');
        console.log('Certifique-se de que a tabela existe e que as políticas de RLS estão configuradas corretamente.');
      } else {
        console.log('Acesso à tabela client_agents está funcionando!');
      }
      
      // Verificar tabela agent_templates
      const { error: templatesError } = await supabase
        .from('agent_templates')
        .select('id')
        .limit(1);
        
      if (templatesError) {
        console.log('Erro ao acessar tabela agent_templates:', templatesError.message);
      } else {
        console.log('Acesso à tabela agent_templates está funcionando!');
      }
      
      // Verificar tabela organizations
      const { error: orgsError } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);
        
      if (orgsError) {
        console.log('Erro ao acessar tabela organizations:', orgsError.message);
      } else {
        console.log('Acesso à tabela organizations está funcionando!');
      }
    } catch (tableError) {
      console.error('Erro ao verificar tabelas:', tableError.message);
    }
    
    // Passo 5: Testar criação de agente
    console.log('\nPasso 5: Vamos tentar criar um agente agora...');
    console.log('Executando script create-agent.js modificado...');
    
    try {
      execSync('node src/create-agent.js', { stdio: 'inherit' });
      console.log('Script create-agent.js executado com sucesso!');
      console.log('A criação de agentes parece estar funcionando agora!');
    } catch (createError) {
      console.error('Ainda há problemas com a criação de agentes. Veja os logs para mais detalhes.');
      console.log('\nRecomendação final: Verifique se todas as migrações foram aplicadas corretamente.');
      console.log('Você pode precisar recriar o banco de dados e aplicar as migrações desde o início.');
    }
    
    console.log('\n===== DIAGNÓSTICO CONCLUÍDO =====');
    console.log('Se você ainda estiver enfrentando problemas, por favor revise os logs e');
    console.log('considere verificar manualmente as tabelas e funções no console do Supabase.');
    
  } catch (error) {
    console.error('Erro durante o diagnóstico:', error.message);
    process.exit(1);
  }
}

// Executar o script
diagnoseAndFixAgentCreation(); 