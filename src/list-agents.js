require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Verificar variáveis de ambiente obrigatórias
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Erro: As variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY são necessárias.');
  process.exit(1);
}

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function listAgents() {
  try {
    // 1. Listar agentes via API Supabase
    console.log('Listando agentes:');
    const { data: agents, error } = await supabase
      .from('client_agents')
      .select('*')
      .order('created_at');

    if (error) {
      console.error('Erro ao consultar agentes:', error);
      return;
    }

    console.log(agents);
    console.log(`\nTotal de agentes: ${agents.length}`);

  } catch (error) {
    console.error('Erro não tratado:', error);
  }
}

// Executar função
listAgents()
  .then(() => console.log('Verificação de agentes concluída.'))
  .catch(err => console.error('Erro ao verificar agentes:', err)); 