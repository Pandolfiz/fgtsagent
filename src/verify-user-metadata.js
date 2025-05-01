// Script para verificar os metadados do usuário
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Obter credenciais do ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Verificar se as credenciais existem
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: SUPABASE_URL e SUPABASE_SERVICE_KEY são necessários no arquivo .env');
  process.exit(1);
}

// Criar cliente Supabase com acesso administrativo
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Função para verificar metadados
async function verificarMetadados() {
  try {
    console.log('Listando usuários...');
    
    // Obter todos os usuários
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error(`Erro ao listar usuários: ${error.message}`);
      return false;
    }
    
    console.log(`\nUsuários encontrados: ${data.users.length}`);
    
    // Exibir metadados de cada usuário
    for (const user of data.users) {
      console.log('\n========================================');
      console.log(`Usuário: ${user.email} (${user.id})`);
      console.log(`Metadados: ${JSON.stringify(user.user_metadata || {}, null, 2)}`);
      console.log('========================================');
    }
    
    return true;
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    return false;
  }
}

// Executar verificação
console.log('Iniciando verificação de metadados...');

verificarMetadados()
  .then(resultado => {
    if (resultado) {
      console.log('\nVerificação concluída com sucesso!');
    } else {
      console.error('\nErro durante o processo de verificação.');
    }
    process.exit(resultado ? 0 : 1);
  })
  .catch(error => {
    console.error(`\nErro não tratado: ${error.message}`);
    process.exit(1);
  }); 