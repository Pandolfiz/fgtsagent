// Script para redefinir a senha de um usuário no Supabase
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

// Dados do usuário a ser atualizado
const userEmail = 'luizfiorimr@gmail.com'; // Use o seu email real
const newPassword = 'Teste@123';         // Nova senha

// Função para localizar o usuário pelo email
async function findUserByEmail(email) {
  try {
    console.log(`\nBuscando usuário com email: ${email}`);
    
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      throw new Error(`Erro ao listar usuários: ${error.message}`);
    }
    
    const user = data.users.find(u => u.email === email);
    
    if (!user) {
      console.log(`\nUsuário com email ${email} não encontrado.`);
      return null;
    }
    
    console.log(`\nUsuário encontrado! ID: ${user.id}`);
    console.log(`Status de confirmação: ${user.email_confirmed_at ? 'Confirmado' : 'Não confirmado'}`);
    return user;
  } catch (error) {
    console.error(`\nErro ao buscar usuário: ${error.message}`);
    return null;
  }
}

// Função para atualizar a senha do usuário e confirmar o email
async function updateUserPassword(userId, newPassword) {
  try {
    console.log(`\nAtualizando senha e confirmando email para usuário com ID: ${userId}`);
    
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        password: newPassword,
        email_confirm: true
      }
    );
    
    if (error) {
      throw new Error(`Erro ao atualizar usuário: ${error.message}`);
    }
    
    console.log(`\nSenha atualizada e email confirmado com sucesso!`);
    return data.user;
  } catch (error) {
    console.error(`\nErro ao atualizar usuário: ${error.message}`);
    return null;
  }
}

// Testar login
async function testLogin(email, password) {
  try {
    console.log(`\nTestando login com: ${email}`);
    
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      throw new Error(`Erro ao fazer login: ${error.message}`);
    }
    
    console.log('\nLogin bem-sucedido!');
    console.log(`Token: ${data.session.access_token.substring(0, 20)}...`);
    
    return data;
  } catch (error) {
    console.error(`\nErro no teste de login: ${error.message}`);
    return null;
  }
}

// Executar o processo
async function main() {
  try {
    // Encontrar o usuário pelo email
    const user = await findUserByEmail(userEmail);
    
    if (!user) {
      console.error('\nUsuário não encontrado. Não foi possível redefinir a senha.');
      process.exit(1);
    }
    
    // Atualizar a senha do usuário e confirmar email
    const updatedUser = await updateUserPassword(user.id, newPassword);
    
    if (!updatedUser) {
      console.error('\nFalha ao atualizar a senha do usuário.');
      process.exit(1);
    }
    
    // Aguardar um momento para as alterações serem aplicadas
    console.log('\nAguardando 2 segundos para as alterações serem aplicadas...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Testar login com a nova senha
    const loginData = await testLogin(userEmail, newPassword);
    
    if (!loginData) {
      console.error('\nFalha ao testar login com a nova senha.');
      process.exit(1);
    }
    
    console.log('\n=== Detalhes para login ===');
    console.log(`Email: ${userEmail}`);
    console.log(`Senha: ${newPassword}`);
    console.log('==========================');
    
    process.exit(0);
  } catch (error) {
    console.error(`\nErro inesperado: ${error}`);
    process.exit(1);
  }
}

// Executar o script
main(); 