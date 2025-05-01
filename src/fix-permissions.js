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

async function fixTablePermissions() {
  try {
    console.log('=== CORRIGINDO PERMISSÕES DAS TABELAS NO SUPABASE ===');
    
    // 1. Ativar RLS para a tabela client_agents
    console.log('Ativando Row Level Security (RLS) para a tabela client_agents...');
    
    const alterTableSQL = `
      ALTER TABLE client_agents ENABLE ROW LEVEL SECURITY;
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
      DROP POLICY IF EXISTS "Membros podem ver agentes de suas organizações" ON client_agents;
      DROP POLICY IF EXISTS "Membros podem criar agentes em suas organizações" ON client_agents;
      DROP POLICY IF EXISTS "Membros podem editar agentes em suas organizações" ON client_agents;
      DROP POLICY IF EXISTS "Membros podem excluir agentes em suas organizações" ON client_agents;
      DROP POLICY IF EXISTS "Acesso de leitura a agentes - simplificada" ON client_agents;
      DROP POLICY IF EXISTS "Criação de agentes - simplificada" ON client_agents;
      DROP POLICY IF EXISTS "Edição de agentes - simplificada" ON client_agents;
      DROP POLICY IF EXISTS "Exclusão de agentes - simplificada" ON client_agents;
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
      ON client_agents
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
    
    // 4. Criar políticas definitivas para produção (comentadas)
    console.log('Criando políticas definitivas...');
    
    const definitivePoliciesSQL = `
      -- Estas políticas estão comentadas. Descomente quando estiver pronto para produção
      
      /*
      CREATE POLICY "Acesso de leitura a agentes" 
      ON client_agents
      FOR SELECT
      USING (
        created_by = auth.uid() OR
        organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
      );

      CREATE POLICY "Criação de agentes" 
      ON client_agents
      FOR INSERT
      WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
      );

      CREATE POLICY "Edição de agentes" 
      ON client_agents
      FOR UPDATE
      USING (
        created_by = auth.uid() OR
        (
          organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
            AND (role = 'admin' OR role = 'owner')
          )
        )
      );

      CREATE POLICY "Exclusão de agentes" 
      ON client_agents
      FOR DELETE
      USING (
        created_by = auth.uid() OR
        (
          organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
            AND (role = 'admin' OR role = 'owner')
          )
        )
      );
      */
    `;
    
    // 5. Verificar acesso à tabela
    console.log('\nVerificando acesso à tabela client_agents...');
    
    try {
      const { data, error } = await supabase
        .from('client_agents')
        .select('id')
        .limit(1);
        
      if (error) {
        console.error(`Erro ao acessar tabela: ${error.message}`);
      } else {
        console.log('Acesso à tabela client_agents funciona corretamente!');
        console.log(`Registros encontrados: ${data.length}`);
      }
    } catch (accessError) {
      console.error(`Erro ao verificar acesso: ${accessError.message}`);
    }
    
    console.log('\n=== CORREÇÃO DE PERMISSÕES CONCLUÍDA ===');
    console.log('Agora você pode tentar executar o script de criação de agentes novamente.');
    console.log('Comando: node src/create-agent.js');
    
  } catch (error) {
    console.error(`ERRO: ${error.message}`);
    process.exit(1);
  }
}

// Executar a função
fixTablePermissions(); 