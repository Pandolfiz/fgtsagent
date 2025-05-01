// Script para atualizar metadados a partir dos perfis de usuário
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

// Função para atualizar metadados a partir dos perfis
async function atualizarMetadados() {
  try {
    console.log('Buscando perfis de usuário...');
    
    // Buscar todos os perfis
    const { data: perfis, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, first_name, last_name');
      
    if (error) {
      console.error(`Erro ao buscar perfis: ${error.message}`);
      return false;
    }
    
    console.log(`Encontrados ${perfis.length} perfis de usuário.`);
    
    // Processar cada perfil
    let sucesso = 0;
    let falhas = 0;
    
    for (const perfil of perfis) {
      try {
        // Obter dados do usuário
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(perfil.id);
        
        if (userError) {
          console.error(`Erro ao buscar usuário ${perfil.id}: ${userError.message}`);
          falhas++;
          continue;
        }
        
        const { user } = userData;
        
        // Verificar se o perfil tem os dados necessários
        if (!perfil.first_name) {
          console.log(`Usuário ${perfil.id} não tem first_name definido no perfil. Pulando...`);
          continue;
        }
        
        // Calcular o nome completo
        const firstName = perfil.first_name;
        const lastName = perfil.last_name || '';
        const fullName = lastName ? `${firstName} ${lastName}` : firstName;
        
        console.log(`\nAtualizando usuário ${perfil.id} (${user.email}):`);
        console.log(`Perfil: first_name=${firstName}, last_name=${lastName}`);
        console.log(`Metadados atuais: ${JSON.stringify(user.user_metadata || {})}`);
        
        // Atualizar metadados
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          perfil.id,
          {
            user_metadata: {
              ...user.user_metadata, // Manter outros metadados
              first_name: firstName,
              full_name: fullName
            }
          }
        );
        
        if (updateError) {
          console.error(`Erro ao atualizar metadados: ${updateError.message}`);
          falhas++;
        } else {
          console.log(`Metadados atualizados com sucesso!`);
          console.log(`Novos valores: first_name=${firstName}, full_name=${fullName}`);
          sucesso++;
        }
      } catch (error) {
        console.error(`Erro ao processar usuário ${perfil.id}: ${error.message}`);
        falhas++;
      }
    }
    
    console.log(`\nProcesso concluído: ${sucesso} usuários atualizados com sucesso, ${falhas} falhas.`);
    return sucesso > 0;
  } catch (error) {
    console.error(`Erro geral: ${error.message}`);
    return false;
  }
}

// Executar atualização
console.log('Iniciando atualização de metadados a partir dos perfis...');

atualizarMetadados()
  .then(resultado => {
    if (resultado) {
      console.log('\nAtualização concluída com sucesso!');
    } else {
      console.error('\nErro durante o processo de atualização.');
    }
    process.exit(resultado ? 0 : 1);
  })
  .catch(error => {
    console.error(`\nErro não tratado: ${error.message}`);
    process.exit(1);
  }); 