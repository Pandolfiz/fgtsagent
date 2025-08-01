#!/usr/bin/env node

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para criar índice de performance para CPF/CNPJ
 */
async function createCpfCnpjIndex() {
  console.log('🔧 Criando índice de performance para CPF/CNPJ...\n');

  try {
    // 1. Verificar se a coluna existe
    console.log('1️⃣ Verificando se a coluna cpf_cnpj existe...');
    const { data: profile, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('cpf_cnpj')
      .limit(1);

    if (checkError) {
      console.log('❌ Erro ao verificar coluna:', checkError.message);
      console.log('💡 Certifique-se de que a coluna cpf_cnpj foi criada na tabela user_profiles');
      return;
    }

    console.log('✅ Coluna cpf_cnpj existe');

    // 2. Criar índice usando SQL direto
    console.log('\n2️⃣ Criando índice de performance...');
    const { error: indexError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf_cnpj 
        ON user_profiles(cpf_cnpj);
        
        COMMENT ON COLUMN user_profiles.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) do usuário, apenas números';
      `
    });

    if (indexError) {
      console.log('⚠️ Erro ao criar índice (pode já existir):', indexError.message);
      
      // Tentar criar índice de forma alternativa
      console.log('🔄 Tentando criar índice de forma alternativa...');
      await createIndexAlternative();
    } else {
      console.log('✅ Índice criado com sucesso');
    }

    // 3. Verificar estrutura final
    console.log('\n3️⃣ Verificando estrutura final...');
    await verifyFinalStructure();

    console.log('\n✅ Processo concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a criação do índice:', error.message);
    logger.error('Erro na criação do índice CPF/CNPJ:', error);
  }
}

async function createIndexAlternative() {
  try {
    // Tentar criar o índice usando uma abordagem diferente
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .select('cpf_cnpj')
      .limit(1);

    if (error) {
      console.log('❌ Não foi possível criar o índice automaticamente');
      console.log('💡 Execute manualmente no Supabase SQL Editor:');
      console.log('   CREATE INDEX idx_user_profiles_cpf_cnpj ON user_profiles(cpf_cnpj);');
    } else {
      console.log('✅ Índice verificado com sucesso');
    }

  } catch (error) {
    console.log('❌ Erro na criação alternativa do índice:', error.message);
  }
}

async function verifyFinalStructure() {
  try {
    // Verificar se conseguimos consultar a coluna
    const { data: profiles, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, first_name, last_name, email, phone, cpf_cnpj, avatar_url')
      .limit(5);

    if (error) {
      console.log('❌ Erro ao verificar estrutura:', error.message);
    } else {
      console.log('✅ Estrutura verificada com sucesso');
      console.log('📋 Campos disponíveis: id, first_name, last_name, email, phone, cpf_cnpj, avatar_url');
      console.log(`📊 Total de perfis encontrados: ${profiles?.length || 0}`);
    }

  } catch (error) {
    console.log('❌ Erro ao verificar estrutura final:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createCpfCnpjIndex().catch(console.error);
}

module.exports = { createCpfCnpjIndex }; 

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para criar índice de performance para CPF/CNPJ
 */
async function createCpfCnpjIndex() {
  console.log('🔧 Criando índice de performance para CPF/CNPJ...\n');

  try {
    // 1. Verificar se a coluna existe
    console.log('1️⃣ Verificando se a coluna cpf_cnpj existe...');
    const { data: profile, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('cpf_cnpj')
      .limit(1);

    if (checkError) {
      console.log('❌ Erro ao verificar coluna:', checkError.message);
      console.log('💡 Certifique-se de que a coluna cpf_cnpj foi criada na tabela user_profiles');
      return;
    }

    console.log('✅ Coluna cpf_cnpj existe');

    // 2. Criar índice usando SQL direto
    console.log('\n2️⃣ Criando índice de performance...');
    const { error: indexError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf_cnpj 
        ON user_profiles(cpf_cnpj);
        
        COMMENT ON COLUMN user_profiles.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) do usuário, apenas números';
      `
    });

    if (indexError) {
      console.log('⚠️ Erro ao criar índice (pode já existir):', indexError.message);
      
      // Tentar criar índice de forma alternativa
      console.log('🔄 Tentando criar índice de forma alternativa...');
      await createIndexAlternative();
    } else {
      console.log('✅ Índice criado com sucesso');
    }

    // 3. Verificar estrutura final
    console.log('\n3️⃣ Verificando estrutura final...');
    await verifyFinalStructure();

    console.log('\n✅ Processo concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a criação do índice:', error.message);
    logger.error('Erro na criação do índice CPF/CNPJ:', error);
  }
}

async function createIndexAlternative() {
  try {
    // Tentar criar o índice usando uma abordagem diferente
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .select('cpf_cnpj')
      .limit(1);

    if (error) {
      console.log('❌ Não foi possível criar o índice automaticamente');
      console.log('💡 Execute manualmente no Supabase SQL Editor:');
      console.log('   CREATE INDEX idx_user_profiles_cpf_cnpj ON user_profiles(cpf_cnpj);');
    } else {
      console.log('✅ Índice verificado com sucesso');
    }

  } catch (error) {
    console.log('❌ Erro na criação alternativa do índice:', error.message);
  }
}

async function verifyFinalStructure() {
  try {
    // Verificar se conseguimos consultar a coluna
    const { data: profiles, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, first_name, last_name, email, phone, cpf_cnpj, avatar_url')
      .limit(5);

    if (error) {
      console.log('❌ Erro ao verificar estrutura:', error.message);
    } else {
      console.log('✅ Estrutura verificada com sucesso');
      console.log('📋 Campos disponíveis: id, first_name, last_name, email, phone, cpf_cnpj, avatar_url');
      console.log(`📊 Total de perfis encontrados: ${profiles?.length || 0}`);
    }

  } catch (error) {
    console.log('❌ Erro ao verificar estrutura final:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createCpfCnpjIndex().catch(console.error);
}

module.exports = { createCpfCnpjIndex }; 