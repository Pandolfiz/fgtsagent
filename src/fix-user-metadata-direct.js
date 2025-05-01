// Script simplificado para corrigir metadados de usuário
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
    
    // 2. Obter perfil do usuário
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError && !profileError.message.includes('No rows found')) {
      console.error(`Erro ao buscar perfil: ${profileError.message}`);
    }
    
    // 3. Determinar o nome correto
    let firstName = null;
    let fullName = null;
    
    // Exibir metadados atuais
    console.log(`Metadados atuais: ${JSON.stringify(user.user_metadata || {})}`);
    
    if (profileData) {
      console.log(`Dados do perfil: ${JSON.stringify(profileData)}`);
      
      firstName = profileData.first_name || '';
      fullName = profileData.full_name || '';
      
      if (!firstName && fullName) {
        firstName = fullName.split(' ')[0];
      }
      
      if (firstName && !fullName) {
        fullName = firstName;
      }
    }
    
    if (!firstName && user.user_metadata && user.user_metadata.first_name) {
      firstName = user.user_metadata.first_name;
    }
    
    if (!fullName && user.user_metadata && user.user_metadata.full_name) {
      fullName = user.user_metadata.full_name;
    }
    
    if (!firstName && fullName) {
      firstName = fullName.split(' ')[0];
    }
    
    // Se ainda não tiver nome, usar o email como fallback
    if (!firstName && user.email) {
      firstName = user.email.split('@')[0];
      fullName = firstName;
    }
    
    console.log(`Nomes determinados: firstName=${firstName}, fullName=${fullName}`);
    
    // 4. Atualizar metadados do usuário
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
    
    // 5. Verificar perfil
    if (!profileData) {
      console.log(`Criando perfil para o usuário...`);
      
      const { error: insertError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userId,
          first_name: firstName,
          last_name: '',
          full_name: fullName
        });
        
      if (insertError) {
        console.error(`Erro ao criar perfil: ${insertError.message}`);
        return false;
      }
      
      console.log(`Perfil criado com sucesso!`);
    } else {
      // Verificar se o perfil precisa de atualização
      let needsUpdate = false;
      const updateData = {};
      
      if (!profileData.first_name) {
        updateData.first_name = firstName;
        needsUpdate = true;
      }
      
      if (!profileData.full_name) {
        updateData.full_name = fullName;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        console.log(`Atualizando perfil existente...`);
        
        const { error: updateProfileError } = await supabaseAdmin
          .from('user_profiles')
          .update(updateData)
          .eq('id', userId);
          
        if (updateProfileError) {
          console.error(`Erro ao atualizar perfil: ${updateProfileError.message}`);
          return false;
        }
        
        console.log(`Perfil atualizado com sucesso!`);
      } else {
        console.log(`Perfil já está atualizado.`);
      }
    }
    
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