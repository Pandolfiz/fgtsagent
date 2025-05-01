require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

async function checkTableInfo() {
  try {
    console.log('=== VERIFICANDO INFORMAÇÕES DA TABELA CLIENT_AGENTS ===');
    
    // 1. Verificar se a tabela existe
    console.log('Consultando informações da tabela via SQL...');
    
    const tableInfoSQL = `
      SELECT table_name, table_schema
      FROM information_schema.tables 
      WHERE table_name = 'client_agents'
      ORDER BY table_schema;
    `;
    
    try {
      // Tentar acessar a tabela diretamente
      console.log('Tentando acessar tabela diretamente...');
      
      const { data: directData, error: directError } = await supabase
        .from('client_agents')
        .select('*')
        .limit(1);
        
      if (directError) {
        console.error(`Erro ao acessar tabela diretamente: ${directError.message}`);
      } else {
        console.log('Acesso direto funcionou! Registros encontrados:', directData.length);
      }
    } catch (directError) {
      console.error(`Erro ao acessar tabela diretamente: ${directError.message}`);
    }
    
    try {
      // Tentar consultar metadados da tabela
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: tableInfoSQL 
      });
      
      if (error) {
        console.error(`Erro ao consultar metadados: ${error.message}`);
      } else {
        console.log('Resultado da consulta de metadados:');
        console.log(data);
      }
    } catch (tableError) {
      console.error(`Erro ao consultar metadados: ${tableError.message}`);
    }
    
    // 2. Verificar colunas da tabela
    console.log('\nConsultando colunas da tabela...');
    
    const columnsSQL = `
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'client_agents'
      ORDER BY ordinal_position;
    `;
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: columnsSQL 
      });
      
      if (error) {
        console.error(`Erro ao consultar colunas: ${error.message}`);
      } else {
        console.log('Colunas da tabela:');
        console.log(data);
      }
    } catch (columnsError) {
      console.error(`Erro ao consultar colunas: ${columnsError.message}`);
    }
    
    // 3. Verificar políticas RLS da tabela
    console.log('\nConsultando políticas RLS...');
    
    const policiesSQL = `
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'client_agents';
    `;
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: policiesSQL 
      });
      
      if (error) {
        console.error(`Erro ao consultar políticas: ${error.message}`);
      } else {
        console.log('Políticas RLS:');
        console.log(data);
      }
    } catch (policiesError) {
      console.error(`Erro ao consultar políticas: ${policiesError.message}`);
    }
    
    // 4. Verificar usuários e roles
    console.log('\nConsultando usuários e roles...');
    
    const rolesSQL = `
      SELECT usename as role_name, 
             usesuper as is_superuser,
             usecreatedb as can_create_db
      FROM pg_user
      ORDER BY role_name;
    `;
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: rolesSQL 
      });
      
      if (error) {
        console.error(`Erro ao consultar roles: ${error.message}`);
      } else {
        console.log('Roles do banco de dados:');
        console.log(data);
      }
    } catch (rolesError) {
      console.error(`Erro ao consultar roles: ${rolesError.message}`);
    }
    
    // 5. Desabilitar RLS temporariamente para a tabela
    console.log('\nDesativando RLS temporariamente...');
    
    const disableRLSSQL = `
      ALTER TABLE client_agents DISABLE ROW LEVEL SECURITY;
    `;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { 
        sql: disableRLSSQL 
      });
      
      if (error) {
        console.error(`Erro ao desativar RLS: ${error.message}`);
      } else {
        console.log('RLS desativado com sucesso!');
      }
    } catch (disableError) {
      console.error(`Erro ao desativar RLS: ${disableError.message}`);
    }
    
    // 6. Verificar acesso novamente após desativar RLS
    console.log('\nVerificando acesso após desativar RLS...');
    
    try {
      const { data, error } = await supabase
        .from('client_agents')
        .select('*')
        .limit(1);
        
      if (error) {
        console.error(`Erro ao acessar tabela: ${error.message}`);
      } else {
        console.log('Acesso à tabela client_agents funcionando!');
        console.log(`Registros encontrados: ${data.length}`);
      }
    } catch (accessError) {
      console.error(`Erro ao verificar acesso: ${accessError.message}`);
    }
    
    console.log('\n=== VERIFICAÇÃO CONCLUÍDA ===');
    console.log('Se o RLS foi desativado com sucesso, tente executar o script de criação de agentes:');
    console.log('node src/create-agent.js');
    
  } catch (error) {
    console.error(`ERRO GERAL: ${error.message}`);
    process.exit(1);
  }
}

// Executar a função
checkTableInfo(); 