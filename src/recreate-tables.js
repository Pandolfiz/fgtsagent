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

async function recreateTables() {
  try {
    console.log('=== RECRIANDO TABELAS DO SUPABASE ===');
    console.log('ATENÇÃO: Este script irá recriar a tabela client_agents. Todos os dados serão perdidos.');
    console.log('Pressione Ctrl+C para cancelar ou aguarde 5 segundos para continuar...');
    
    // Aguardar 5 segundos
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\nIniciando recriação de tabelas...');
    
    // 1. Recriar tabela client_agents
    console.log('Removendo tabela client_agents existente...');
    
    const dropTableSQL = `
      DROP TABLE IF EXISTS client_agents CASCADE;
    `;
    
    try {
      const { error: dropError } = await supabase.rpc('exec_sql', { 
        sql: dropTableSQL 
      });
      
      if (dropError) {
        console.error(`Erro ao remover tabela: ${dropError.message}`);
      } else {
        console.log('Tabela removida com sucesso!');
      }
    } catch (dropError) {
      console.error(`Erro ao remover tabela: ${dropError.message}`);
    }
    
    // 2. Criar nova tabela client_agents
    console.log('\nCriando nova tabela client_agents...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS client_agents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        template_id UUID,
        organization_id UUID NOT NULL,
        created_by UUID,
        is_active BOOLEAN DEFAULT true,
        configuration JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `;
    
    try {
      const { error: createError } = await supabase.rpc('exec_sql', { 
        sql: createTableSQL 
      });
      
      if (createError) {
        console.error(`Erro ao criar tabela: ${createError.message}`);
      } else {
        console.log('Tabela criada com sucesso!');
      }
    } catch (createError) {
      console.error(`Erro ao criar tabela: ${createError.message}`);
    }
    
    // 3. Adicionar Foreign Keys
    console.log('\nAdicionando Foreign Keys...');
    
    const addFKsSQL = `
      -- Adicionar foreign key para template_id
      ALTER TABLE client_agents 
      ADD CONSTRAINT client_agents_template_id_fkey 
      FOREIGN KEY (template_id) 
      REFERENCES agent_templates(id);
      
      -- Adicionar foreign key para organization_id
      ALTER TABLE client_agents 
      ADD CONSTRAINT client_agents_organization_id_fkey 
      FOREIGN KEY (organization_id) 
      REFERENCES organizations(id);
      
      -- Adicionar foreign key para created_by
      ALTER TABLE client_agents 
      ADD CONSTRAINT client_agents_created_by_fkey 
      FOREIGN KEY (created_by) 
      REFERENCES auth.users(id);
    `;
    
    try {
      const { error: fkError } = await supabase.rpc('exec_sql', { 
        sql: addFKsSQL 
      });
      
      if (fkError) {
        console.error(`Erro ao adicionar foreign keys: ${fkError.message}`);
        console.log('Continuando mesmo com erros de FK...');
      } else {
        console.log('Foreign Keys adicionadas com sucesso!');
      }
    } catch (fkError) {
      console.error(`Erro ao adicionar foreign keys: ${fkError.message}`);
      console.log('Continuando mesmo com erros de FK...');
    }
    
    // 4. Criar índices
    console.log('\nCriando índices...');
    
    const indicesSQL = `
      CREATE INDEX IF NOT EXISTS client_agents_organization_id_idx ON client_agents (organization_id);
      CREATE INDEX IF NOT EXISTS client_agents_template_id_idx ON client_agents (template_id);
      CREATE INDEX IF NOT EXISTS client_agents_created_by_idx ON client_agents (created_by);
    `;
    
    try {
      const { error: indexError } = await supabase.rpc('exec_sql', { 
        sql: indicesSQL 
      });
      
      if (indexError) {
        console.error(`Erro ao criar índices: ${indexError.message}`);
      } else {
        console.log('Índices criados com sucesso!');
      }
    } catch (indexError) {
      console.error(`Erro ao criar índices: ${indexError.message}`);
    }
    
    // 5. Configurar RLS
    console.log('\nConfigurando Row Level Security (RLS)...');
    
    const rlsSQL = `
      -- Desativar RLS para desenvolvimento
      ALTER TABLE client_agents DISABLE ROW LEVEL SECURITY;
      
      -- Quando estiver pronto para produção, use:
      -- ALTER TABLE client_agents ENABLE ROW LEVEL SECURITY;
      -- 
      -- CREATE POLICY "Acesso total para todos os usuários"
      -- ON client_agents
      -- USING (true)
      -- WITH CHECK (true);
    `;
    
    try {
      const { error: rlsError } = await supabase.rpc('exec_sql', { 
        sql: rlsSQL 
      });
      
      if (rlsError) {
        console.error(`Erro ao configurar RLS: ${rlsError.message}`);
      } else {
        console.log('RLS configurado com sucesso!');
      }
    } catch (rlsError) {
      console.error(`Erro ao configurar RLS: ${rlsError.message}`);
    }
    
    // 6. Verificar acesso à tabela
    console.log('\nVerificando acesso à tabela client_agents...');
    
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
        
        // Se a verificação for bem-sucedida, tentar inserir um registro de teste
        console.log('\nInserindo registro de teste...');
        
        try {
          const { data: insertData, error: insertError } = await supabase
            .from('client_agents')
            .insert({
              name: 'Agente de Teste',
              description: 'Criado pelo script de recriação de tabelas',
              organization_id: 'abe777e1-9fb8-4edf-9b1a-e41a980c9d8d', // Use um ID válido da sua organização
              created_by: 'c3fb573b-5bad-4069-967d-403cafcc3370' // Use um ID válido de usuário
            })
            .select('id')
            .single();
            
          if (insertError) {
            console.error(`Erro ao inserir registro de teste: ${insertError.message}`);
          } else {
            console.log(`Registro de teste inserido com sucesso! ID: ${insertData.id}`);
          }
        } catch (insertError) {
          console.error(`Erro ao inserir registro de teste: ${insertError.message}`);
        }
      }
    } catch (accessError) {
      console.error(`Erro ao verificar acesso: ${accessError.message}`);
    }
    
    console.log('\n=== RECRIAÇÃO DE TABELAS CONCLUÍDA ===');
    console.log('Agora você pode tentar executar o script de criação de agentes novamente.');
    console.log('Comando: node src/create-agent.js');
    
  } catch (error) {
    console.error(`ERRO GERAL: ${error.message}`);
    process.exit(1);
  }
}

// Executar a função
recreateTables(); 