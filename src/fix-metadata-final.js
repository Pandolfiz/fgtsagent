// Script final para corrigir metadados de usuário
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

// Função para corrigir o nome "Luizfiorimr" -> "Luiz"
async function fixSpecificUser() {
  try {
    console.log('\nBuscando usuário específico (luizfiorimr@gmail.com)...');
    
    // Buscar pelo email
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error(`Erro ao listar usuários: ${error.message}`);
      return false;
    }
    
    // Encontrar o usuário específico
    const targetUser = data.users.find(user => user.email === 'luizfiorimr@gmail.com');
    
    if (!targetUser) {
      console.error('Usuário específico não encontrado!');
      return false;
    }
    
    console.log(`Usuário encontrado! ID: ${targetUser.id}`);
    console.log(`Metadados atuais: ${JSON.stringify(targetUser.user_metadata || {})}`);
    
    // Forçar a correção do nome
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { 
        user_metadata: {
          ...targetUser.user_metadata, // Manter outros metadados
          first_name: 'Luiz',          // Forçar o primeiro nome
          full_name: 'Luiz Fiorim'     // Forçar o nome completo
        }
      }
    );
    
    if (updateError) {
      console.error(`Erro ao atualizar metadados: ${updateError.message}`);
      return false;
    }
    
    console.log('Metadados corrigidos com sucesso!');
    console.log('Novos valores: first_name=Luiz, full_name=Luiz Fiorim');
    
    return true;
  } catch (error) {
    console.error(`Erro inesperado: ${error.message}`);
    return false;
  }
}

// Executar a correção
console.log('Iniciando correção específica de metadados...');

fixSpecificUser()
  .then(result => {
    if (result) {
      console.log('\nCorreção concluída com sucesso!');
    } else {
      console.error('\nErro durante o processo de correção.');
    }
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error(`\nErro não tratado: ${error.message}`);
    process.exit(1);
  }); 