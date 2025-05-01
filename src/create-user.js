// Script para criar um novo usuário no Supabase
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

// Dados do usuário a ser criado
const userEmail = 'luizfiorimr@gmail.com'; // Use o seu email real
const userPassword = 'Teste@123';          // Senha para login
const userName = 'Luiz Fiorim';            // Seu nome completo

// Função para criar um usuário
async function createUser() {
  try {
    console.log(`\nCriando usuário: ${userEmail}`);
    
    // Criar usuário no Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        full_name: userName,
        first_name: userName.split(' ')[0] // Extrair o primeiro nome
      }
    });
    
    if (error) {
      if (error.message.includes('already been registered')) {
        console.log('\nUsuário já existe. Tentando login...');
        return await testLogin();
      }
      throw new Error(`Erro ao criar usuário: ${error.message}`);
    }
    
    console.log(`\nUsuário criado com sucesso!`);
    console.log(`ID: ${data.user.id}`);
    console.log(`Email: ${data.user.email}`);
    
    // Criar perfil do usuário
    try {
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: data.user.id,
          first_name: userName.split(' ')[0],
          last_name: userName.split(' ').slice(1).join(' '),
          full_name: userName
        });
      
      if (profileError) {
        console.warn(`\nAviso: Erro ao criar perfil: ${profileError.message}`);
      } else {
        console.log(`\nPerfil do usuário criado com sucesso!`);
      }
    } catch (profileErr) {
      console.warn(`\nAviso: Exceção ao criar perfil: ${profileErr}`);
    }
    
    return data.user;
  } catch (error) {
    console.error(`\nErro ao criar usuário: ${error.message}`);
    return null;
  }
}

// Testar login
async function testLogin() {
  try {
    console.log(`\nTestando login com: ${userEmail}`);
    
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: userEmail,
      password: userPassword
    });
    
    if (error) {
      throw new Error(`Erro ao fazer login: ${error.message}`);
    }
    
    console.log('\nLogin bem-sucedido!');
    console.log(`Token: ${data.session.access_token.substring(0, 20)}...`);
    console.log('\nDetalhes salvos:');
    console.log(`Email: ${userEmail}`);
    console.log(`Senha: ${userPassword}`);
    
    return data;
  } catch (error) {
    console.error(`\nErro no teste de login: ${error.message}`);
    return null;
  }
}

// Executar criação de usuário e teste de login
createUser()
  .then(user => {
    if (!user) {
      console.error('\nFalha ao criar usuário.');
      process.exit(1);
    }
    
    console.log('\nDados para login:');
    console.log(`Email: ${userEmail}`);
    console.log(`Senha: ${userPassword}`);
    console.log('\nTeste realizado com sucesso!');
    
    process.exit(0);
  })
  .catch(error => {
    console.error(`\nErro inesperado: ${error}`);
    process.exit(1);
  }); 