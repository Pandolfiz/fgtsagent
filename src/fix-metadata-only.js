// Script simplificado para corrigir apenas os metadados de usuário
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

// Função para corrigir metadados de um usuário específico
async function fixUserMetadata(userId) {
  try {
    console.log(`\nProcessando usuário ID: ${userId}`);
    
    // 1. Obter dados do usuário
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error(`Erro ao buscar usuário: ${userError.message}`);
      return false;
    }
    
    const { user } = userData;
    console.log(`Email do usuário: ${user.email}`);
    
    // Exibir metadados atuais
    console.log(`Metadados atuais: ${JSON.stringify(user.user_metadata || {})}`);
    
    // Extrair o nome correto
    let email = user.email || '';
    let firstName = '';
    let fullName = '';
    
    // Verificar os metadados atuais
    if (user.user_metadata) {
      if (user.user_metadata.full_name) {
        fullName = user.user_metadata.full_name;
      }
      
      if (user.user_metadata.first_name) {
        firstName = user.user_metadata.first_name;
      }
    }
    
    // Se temos o nome completo mas não o primeiro nome, extrair o primeiro nome
    if (fullName && !firstName) {
      firstName = fullName.split(' ')[0];
    }
    
    // Se temos o primeiro nome mas não o nome completo, usar o primeiro nome
    if (firstName && !fullName) {
      fullName = firstName;
    }
    
    // Se ainda não temos nenhum nome, usar o email como fallback
    if (!firstName && !fullName) {
      firstName = email.split('@')[0];
      fullName = firstName;
    }
    
    // Corrigir o caso de Luizfiorimr -> Luiz
    // Isso verifica se o primeiro nome parece ser um email sem @ ou domínio concatenado
    if (firstName && firstName.toLowerCase() !== firstName && !firstName.includes(' ')) {
      // Tenta extrair apenas o primeiro nome real
      const nameParts = firstName.match(/[A-Z][a-z]+/g);
      if (nameParts && nameParts.length > 0) {
        firstName = nameParts[0];
      }
    }
    
    console.log(`Nomes corrigidos: firstName=${firstName}, fullName=${fullName}`);
    
    // Atualizar metadados do usuário
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        user_metadata: {
          ...user.user_metadata, // Manter metadados existentes
          first_name: firstName,
          full_name: fullName
        }
      }
    );
    
    if (updateError) {
      console.error(`Erro ao atualizar metadados: ${updateError.message}`);
      return false;
    }
    
    console.log(`Metadados atualizados com sucesso!`);
    return true;
  } catch (error) {
    console.error(`Erro inesperado: ${error.message}`);
    return false;
  }
}

// Função para corrigir metadados de todos os usuários
async function fixAllUserMetadata() {
  try {
    console.log('\nListando usuários...');
    
    // Obter todos os usuários
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error(`Erro ao listar usuários: ${error.message}`);
      return false;
    }
    
    console.log(`Encontrados ${data.users.length} usuários para processar`);
    
    // Processar cada usuário
    let success = 0;
    let failed = 0;
    
    for (const user of data.users) {
      const result = await fixUserMetadata(user.id);
      
      if (result) {
        success++;
      } else {
        failed++;
      }
    }
    
    console.log(`\nProcessamento concluído: ${success} usuários atualizados com sucesso, ${failed} falhas`);
    return true;
  } catch (error) {
    console.error(`\nErro inesperado: ${error.message}`);
    return false;
  }
}

// Iniciar correção
console.log('Iniciando correção de metadados de usuário...');

fixAllUserMetadata()
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