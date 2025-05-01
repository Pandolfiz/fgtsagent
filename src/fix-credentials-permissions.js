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

async function fixCredentialsPermissions() {
  try {
    console.log('=== CORRIGINDO PERMISSÕES DA TABELA N8N_CREDENTIALS NO SUPABASE ===');
    
    // 1. Ativar RLS para a tabela n8n_credentials
    console.log('Ativando Row Level Security (RLS) para a tabela n8n_credentials...');
    
    const alterTableSQL = `
      ALTER TABLE n8n_credentials ENABLE ROW LEVEL SECURITY;
    `;
    
    try {
      const { error: alterError } = await supabase.rpc('exec_sql', { sql: alterTableSQL });
      
      if (alterError) {
        console.error(`Erro ao ativar RLS: ${alterError.message}`);
      } else {
        console.log('RLS ativado com sucesso!');
      }
    } catch (alterError) {
      console.error(`Erro ao ativar RLS: ${alterError.message}`);
    }
    
    // 2. Remover políticas existentes
    console.log('Removendo políticas existentes...');
    
    const dropPoliciesSQL = `
      DROP POLICY IF EXISTS "Usuários podem ver credenciais n8n de suas organizações" ON n8n_credentials;
      DROP POLICY IF EXISTS "Usuários podem criar credenciais n8n em suas organizações" ON n8n_credentials;
      DROP POLICY IF EXISTS "API Key pode acessar todas as credenciais n8n" ON n8n_credentials;
      DROP POLICY IF EXISTS "Acesso temporário total" ON n8n_credentials;
    `;
    
    try {
      const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropPoliciesSQL });
      
      if (dropError) {
        console.error(`Erro ao remover políticas: ${dropError.message}`);
      } else {
        console.log('Políticas removidas com sucesso!');
      }
    } catch (dropError) {
      console.error(`Erro ao remover políticas: ${dropError.message}`);
    }
    
    // 3. Criar nova política temporária para acesso total (para desenvolvimento)
    console.log('Criando política temporária para acesso total...');
    
    const tempFullAccessSQL = `
      CREATE POLICY "Acesso temporário total" 
      ON n8n_credentials
      USING (true)
      WITH CHECK (true);
    `;
    
    try {
      const { error: tempError } = await supabase.rpc('exec_sql', { sql: tempFullAccessSQL });
      
      if (tempError) {
        console.error(`Erro ao criar política temporária: ${tempError.message}`);
      } else {
        console.log('Política temporária criada com sucesso!');
      }
    } catch (tempError) {
      console.error(`Erro ao criar política temporária: ${tempError.message}`);
    }
    
    // 4. Criar também políticas específicas para API service_role
    console.log('Criando política para API service_role...');
    
    const serviceRolePolicySQL = `
      CREATE POLICY "API Key pode acessar todas as credenciais n8n" 
      ON n8n_credentials
      USING (
        (current_setting('request.jwt.claims', true)::jsonb)->>'role' = 'service_role'
      );
    `;
    
    try {
      const { error: roleError } = await supabase.rpc('exec_sql', { sql: serviceRolePolicySQL });
      
      if (roleError) {
        console.error(`Erro ao criar política para service_role: ${roleError.message}`);
      } else {
        console.log('Política para service_role criada com sucesso!');
      }
    } catch (roleError) {
      console.error(`Erro ao criar política para service_role: ${roleError.message}`);
    }
    
    // 5. Verificar acesso à tabela
    console.log('\nVerificando acesso à tabela n8n_credentials...');
    
    try {
      const { data, error } = await supabase
        .from('n8n_credentials')
        .select('id')
        .limit(1);
        
      if (error) {
        console.error(`Erro ao acessar tabela: ${error.message}`);
      } else {
        console.log('Acesso à tabela n8n_credentials funciona corretamente!');
        console.log(`Registros encontrados: ${data.length}`);
      }
    } catch (accessError) {
      console.error(`Erro ao verificar acesso: ${accessError.message}`);
    }
    
    console.log('\n=== CORREÇÃO DE PERMISSÕES CONCLUÍDA ===');
    console.log('As permissões da tabela n8n_credentials foram atualizadas.');
    
  } catch (error) {
    console.error(`ERRO: ${error.message}`);
    process.exit(1);
  }
}

// Executar a função
fixCredentialsPermissions(); 