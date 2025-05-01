require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Verificar variáveis de ambiente
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('ERRO: Configure as variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env');
  process.exit(1);
}

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addMissingColumn() {
  try {
    console.log('=== ADICIONANDO COLUNA FALTANTE À TABELA CLIENT_AGENTS ===');

    // Verificar se a coluna existe
    const { data: columns, error: columnsError } = await supabase
      .from('client_agents')
      .select('user_id')
      .limit(1);

    if (columnsError) {
      console.log('Coluna user_id não existe, tentando criar...');
      
      // Tentar criar a coluna via SQL
      const sql = `
        ALTER TABLE client_agents 
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
      `;
      
      const { error: sqlError } = await supabase.rpc('exec_sql', { sql });
      
      if (sqlError) {
        throw new Error(`Erro ao criar coluna: ${sqlError.message}`);
      }
      
      console.log('Coluna user_id criada com sucesso!');
    } else {
      console.log('Coluna user_id já existe na tabela.');
    }

    // Atualizar cache do schema
    const { error: refreshError } = await supabase.rpc('reload_schema_cache');
    
    if (refreshError) {
      console.warn(`Aviso: Não foi possível atualizar o cache do schema: ${refreshError.message}`);
    } else {
      console.log('Cache do schema atualizado com sucesso!');
    }

    console.log('\n=== OPERAÇÃO CONCLUÍDA ===');
    console.log('Tente criar os agentes novamente executando: node src/create-agent.js');

  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

addMissingColumn(); 