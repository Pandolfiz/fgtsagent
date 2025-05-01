// Script para atualizar metadados a partir da função RPC get_user_profile
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

// Função para atualizar metadados a partir da função RPC
async function atualizarMetadados() {
  try {
    console.log('Iniciando atualização de metadados via RPC...');
    
    // Listar todos os usuários
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error(`Erro ao listar usuários: ${usersError.message}`);
      return false;
    }
    
    console.log(`Encontrados ${usersData.users.length} usuários para processar.`);
    
    // Processar cada usuário
    let sucesso = 0;
    let falhas = 0;
    
    for (const user of usersData.users) {
      try {
        console.log(`\nProcessando usuário: ${user.email} (${user.id})`);
        
        // Buscar perfil via RPC
        const { data: perfil, error: perfilError } = await supabaseAdmin
          .rpc('get_user_profile', { user_id_param: user.id });
          
        if (perfilError) {
          console.error(`Erro ao buscar perfil via RPC: ${perfilError.message}`);
          
          // Tentar com um fallback para o usuário "Luiz" específico
          if (user.email === 'luizfiorimr@gmail.com') {
            console.log('Aplicando correção manual para o usuário luizfiorimr@gmail.com');
            
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              user.id,
              {
                user_metadata: {
                  ...user.user_metadata,
                  first_name: 'Luiz',
                  full_name: 'Luiz Fiorim'
                }
              }
            );
            
            if (updateError) {
              console.error(`Erro ao atualizar metadados manualmente: ${updateError.message}`);
              falhas++;
            } else {
              console.log('Metadados atualizados manualmente com sucesso!');
              sucesso++;
            }
          } else {
            falhas++;
          }
          
          continue;
        }
        
        if (!perfil || !perfil.first_name) {
          console.log(`Usuário ${user.id} não tem perfil completo ou tem first_name vazio. Pulando...`);
          continue;
        }
        
        console.log(`Perfil encontrado: ${JSON.stringify(perfil)}`);
        console.log(`Metadados atuais: ${JSON.stringify(user.user_metadata || {})}`);
        
        // Atualizar metadados
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          {
            user_metadata: {
              ...user.user_metadata,
              first_name: perfil.first_name,
              full_name: perfil.full_name || 
                         (perfil.last_name ? `${perfil.first_name} ${perfil.last_name}` : perfil.first_name)
            }
          }
        );
        
        if (updateError) {
          console.error(`Erro ao atualizar metadados: ${updateError.message}`);
          falhas++;
        } else {
          console.log('Metadados atualizados com sucesso!');
          sucesso++;
        }
      } catch (error) {
        console.error(`Erro ao processar usuário ${user.id}: ${error.message}`);
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
console.log('Iniciando atualização de metadados a partir de RPC...');

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