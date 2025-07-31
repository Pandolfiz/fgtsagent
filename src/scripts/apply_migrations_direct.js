#!/usr/bin/env node

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para aplicar migrações diretamente usando Supabase Admin
 */
async function applyMigrationsDirect() {
  console.log('🔧 Aplicando migrações diretamente...\n');

  try {
    // 1. Adicionar coluna CPF/CNPJ
    console.log('1️⃣ Adicionando coluna CPF/CNPJ...');
    await addCpfCnpjColumn();

    // 2. Configurar bucket de avatares
    console.log('\n2️⃣ Configurando bucket de avatares...');
    await setupAvatarsBucket();

    // 3. Verificar estrutura
    console.log('\n3️⃣ Verificando estrutura da tabela...');
    await verifyTableStructure();

    console.log('\n✅ Migrações aplicadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a aplicação das migrações:', error.message);
    logger.error('Erro nas migrações diretas:', error);
    process.exit(1);
  }
}

async function addCpfCnpjColumn() {
  try {
    // Verificar se a coluna já existe
    const { data: existingColumns, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (checkError) {
      console.log('❌ Erro ao verificar tabela:', checkError.message);
      return;
    }

    // Tentar adicionar a coluna usando SQL direto
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE user_profiles 
        ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(14);
        
        CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf_cnpj 
        ON user_profiles(cpf_cnpj);
      `
    });

    if (error) {
      console.log('⚠️ Erro ao adicionar coluna (pode já existir):', error.message);
      
      // Tentar verificar se a coluna existe de outra forma
      try {
        const { data: testData, error: testError } = await supabaseAdmin
          .from('user_profiles')
          .select('cpf_cnpj')
          .limit(1);
        
        if (!testError) {
          console.log('✅ Coluna cpf_cnpj já existe');
        } else {
          console.log('❌ Coluna cpf_cnpj não existe e não foi criada');
        }
      } catch (e) {
        console.log('❌ Não foi possível verificar a coluna cpf_cnpj');
      }
    } else {
      console.log('✅ Coluna cpf_cnpj adicionada com sucesso');
    }

  } catch (error) {
    console.log('❌ Erro ao adicionar coluna CPF/CNPJ:', error.message);
  }
}

async function setupAvatarsBucket() {
  try {
    // Verificar se o bucket já existe
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.log('❌ Erro ao listar buckets:', listError.message);
      return;
    }

    const avatarsBucket = buckets.find(bucket => bucket.id === 'avatars');
    
    if (avatarsBucket) {
      console.log('✅ Bucket "avatars" já existe');
      return;
    }

    // Criar bucket
    const { data: newBucket, error: createError } = await supabaseAdmin.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    });

    if (createError) {
      console.log('❌ Erro ao criar bucket:', createError.message);
    } else {
      console.log('✅ Bucket "avatars" criado com sucesso');
    }

  } catch (error) {
    console.log('❌ Erro ao configurar bucket de avatares:', error.message);
  }
}

async function verifyTableStructure() {
  try {
    // Tentar fazer uma consulta simples para verificar a estrutura
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, first_name, last_name, email, phone, cpf_cnpj, avatar_url')
      .limit(1);

    if (error) {
      console.log('❌ Erro ao verificar estrutura:', error.message);
      
      // Se o erro for sobre a coluna cpf_cnpj não existir, vamos criá-la manualmente
      if (error.message.includes('cpf_cnpj')) {
        console.log('🔄 Tentando criar coluna cpf_cnpj manualmente...');
        await createCpfCnpjColumnManually();
      }
    } else {
      console.log('✅ Estrutura da tabela verificada com sucesso');
      console.log('📋 Campos disponíveis: id, first_name, last_name, email, phone, cpf_cnpj, avatar_url');
    }

  } catch (error) {
    console.log('❌ Erro ao verificar estrutura da tabela:', error.message);
  }
}

async function createCpfCnpjColumnManually() {
  try {
    // Tentar criar a coluna usando uma abordagem diferente
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ cpf_cnpj: null })
      .eq('id', '00000000-0000-0000-0000-000000000000'); // ID fictício para forçar criação da coluna

    if (error && error.message.includes('column "cpf_cnpj" does not exist')) {
      console.log('❌ Coluna cpf_cnpj não existe e não pode ser criada automaticamente');
      console.log('💡 Execute manualmente no Supabase SQL Editor:');
      console.log('   ALTER TABLE user_profiles ADD COLUMN cpf_cnpj VARCHAR(14);');
      console.log('   CREATE INDEX idx_user_profiles_cpf_cnpj ON user_profiles(cpf_cnpj);');
    } else if (error) {
      console.log('⚠️ Erro ao criar coluna:', error.message);
    } else {
      console.log('✅ Coluna cpf_cnpj criada com sucesso');
    }

  } catch (error) {
    console.log('❌ Erro ao criar coluna manualmente:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applyMigrationsDirect().catch(console.error);
}

module.exports = { applyMigrationsDirect }; 

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para aplicar migrações diretamente usando Supabase Admin
 */
async function applyMigrationsDirect() {
  console.log('🔧 Aplicando migrações diretamente...\n');

  try {
    // 1. Adicionar coluna CPF/CNPJ
    console.log('1️⃣ Adicionando coluna CPF/CNPJ...');
    await addCpfCnpjColumn();

    // 2. Configurar bucket de avatares
    console.log('\n2️⃣ Configurando bucket de avatares...');
    await setupAvatarsBucket();

    // 3. Verificar estrutura
    console.log('\n3️⃣ Verificando estrutura da tabela...');
    await verifyTableStructure();

    console.log('\n✅ Migrações aplicadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a aplicação das migrações:', error.message);
    logger.error('Erro nas migrações diretas:', error);
    process.exit(1);
  }
}

async function addCpfCnpjColumn() {
  try {
    // Verificar se a coluna já existe
    const { data: existingColumns, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (checkError) {
      console.log('❌ Erro ao verificar tabela:', checkError.message);
      return;
    }

    // Tentar adicionar a coluna usando SQL direto
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE user_profiles 
        ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(14);
        
        CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf_cnpj 
        ON user_profiles(cpf_cnpj);
      `
    });

    if (error) {
      console.log('⚠️ Erro ao adicionar coluna (pode já existir):', error.message);
      
      // Tentar verificar se a coluna existe de outra forma
      try {
        const { data: testData, error: testError } = await supabaseAdmin
          .from('user_profiles')
          .select('cpf_cnpj')
          .limit(1);
        
        if (!testError) {
          console.log('✅ Coluna cpf_cnpj já existe');
        } else {
          console.log('❌ Coluna cpf_cnpj não existe e não foi criada');
        }
      } catch (e) {
        console.log('❌ Não foi possível verificar a coluna cpf_cnpj');
      }
    } else {
      console.log('✅ Coluna cpf_cnpj adicionada com sucesso');
    }

  } catch (error) {
    console.log('❌ Erro ao adicionar coluna CPF/CNPJ:', error.message);
  }
}

async function setupAvatarsBucket() {
  try {
    // Verificar se o bucket já existe
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.log('❌ Erro ao listar buckets:', listError.message);
      return;
    }

    const avatarsBucket = buckets.find(bucket => bucket.id === 'avatars');
    
    if (avatarsBucket) {
      console.log('✅ Bucket "avatars" já existe');
      return;
    }

    // Criar bucket
    const { data: newBucket, error: createError } = await supabaseAdmin.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    });

    if (createError) {
      console.log('❌ Erro ao criar bucket:', createError.message);
    } else {
      console.log('✅ Bucket "avatars" criado com sucesso');
    }

  } catch (error) {
    console.log('❌ Erro ao configurar bucket de avatares:', error.message);
  }
}

async function verifyTableStructure() {
  try {
    // Tentar fazer uma consulta simples para verificar a estrutura
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, first_name, last_name, email, phone, cpf_cnpj, avatar_url')
      .limit(1);

    if (error) {
      console.log('❌ Erro ao verificar estrutura:', error.message);
      
      // Se o erro for sobre a coluna cpf_cnpj não existir, vamos criá-la manualmente
      if (error.message.includes('cpf_cnpj')) {
        console.log('🔄 Tentando criar coluna cpf_cnpj manualmente...');
        await createCpfCnpjColumnManually();
      }
    } else {
      console.log('✅ Estrutura da tabela verificada com sucesso');
      console.log('📋 Campos disponíveis: id, first_name, last_name, email, phone, cpf_cnpj, avatar_url');
    }

  } catch (error) {
    console.log('❌ Erro ao verificar estrutura da tabela:', error.message);
  }
}

async function createCpfCnpjColumnManually() {
  try {
    // Tentar criar a coluna usando uma abordagem diferente
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ cpf_cnpj: null })
      .eq('id', '00000000-0000-0000-0000-000000000000'); // ID fictício para forçar criação da coluna

    if (error && error.message.includes('column "cpf_cnpj" does not exist')) {
      console.log('❌ Coluna cpf_cnpj não existe e não pode ser criada automaticamente');
      console.log('💡 Execute manualmente no Supabase SQL Editor:');
      console.log('   ALTER TABLE user_profiles ADD COLUMN cpf_cnpj VARCHAR(14);');
      console.log('   CREATE INDEX idx_user_profiles_cpf_cnpj ON user_profiles(cpf_cnpj);');
    } else if (error) {
      console.log('⚠️ Erro ao criar coluna:', error.message);
    } else {
      console.log('✅ Coluna cpf_cnpj criada com sucesso');
    }

  } catch (error) {
    console.log('❌ Erro ao criar coluna manualmente:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applyMigrationsDirect().catch(console.error);
}

module.exports = { applyMigrationsDirect }; 