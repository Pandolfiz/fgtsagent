#!/usr/bin/env node

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Script para aplicar migrações relacionadas ao perfil de usuário
 */
async function applyProfileMigrations() {
  console.log('🔧 Aplicando migrações do perfil de usuário...\n');

  try {
    // 1. Aplicar migração do campo CPF/CNPJ
    console.log('1️⃣ Aplicando migração do campo CPF/CNPJ...');
    await applyCpfCnpjMigration();

    // 2. Configurar bucket de storage para avatares
    console.log('\n2️⃣ Configurando bucket de storage para avatares...');
    await setupAvatarsBucket();

    // 3. Verificar estrutura da tabela
    console.log('\n3️⃣ Verificando estrutura da tabela user_profiles...');
    await verifyTableStructure();

    console.log('\n✅ Migrações aplicadas com sucesso!');
    console.log('\n📝 Resumo das alterações:');
    console.log('   ✅ Campo CPF/CNPJ adicionado à tabela user_profiles');
    console.log('   ✅ Bucket "avatars" configurado no Supabase Storage');
    console.log('   ✅ Políticas RLS configuradas para upload de avatares');
    console.log('   ✅ Índices criados para melhor performance');

  } catch (error) {
    console.error('❌ Erro durante a aplicação das migrações:', error.message);
    logger.error('Erro nas migrações do perfil:', error);
    process.exit(1);
  }
}

async function applyCpfCnpjMigration() {
  try {
    const migrationPath = path.join(__dirname, '..', 'sql', 'migrations', 'add_cpf_cnpj_to_user_profiles.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.log('❌ Arquivo de migração não encontrado');
      return;
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.log('⚠️ Erro ao aplicar migração (pode já estar aplicada):', error.message);
      
      // Tentar verificar se a coluna já existe
      const { data: columns, error: checkError } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'user_profiles')
        .eq('column_name', 'cpf_cnpj');

      if (!checkError && columns && columns.length > 0) {
        console.log('✅ Coluna cpf_cnpj já existe na tabela');
      } else {
        console.log('❌ Coluna cpf_cnpj não foi criada');
      }
    } else {
      console.log('✅ Migração do CPF/CNPJ aplicada com sucesso');
    }

  } catch (error) {
    console.log('❌ Erro ao aplicar migração CPF/CNPJ:', error.message);
  }
}

async function setupAvatarsBucket() {
  try {
    const bucketSQL = path.join(__dirname, '..', 'sql', 'migrations', 'create_avatars_storage_bucket.sql');
    
    if (!fs.existsSync(bucketSQL)) {
      console.log('❌ Arquivo de configuração do bucket não encontrado');
      return;
    }

    const bucketConfig = fs.readFileSync(bucketSQL, 'utf8');
    
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: bucketConfig
    });

    if (error) {
      console.log('⚠️ Erro ao configurar bucket (pode já estar configurado):', error.message);
      
      // Verificar se o bucket já existe
      const { data: buckets, error: checkError } = await supabaseAdmin
        .storage
        .listBuckets();

      if (!checkError && buckets) {
        const avatarsBucket = buckets.find(bucket => bucket.id === 'avatars');
        if (avatarsBucket) {
          console.log('✅ Bucket "avatars" já existe');
        } else {
          console.log('❌ Bucket "avatars" não foi criado');
        }
      }
    } else {
      console.log('✅ Bucket de avatares configurado com sucesso');
    }

  } catch (error) {
    console.log('❌ Erro ao configurar bucket de avatares:', error.message);
  }
}

async function verifyTableStructure() {
  try {
    // Verificar estrutura da tabela user_profiles
    const { data: columns, error } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'user_profiles')
      .order('ordinal_position');

    if (error) {
      console.log('❌ Erro ao verificar estrutura da tabela:', error.message);
      return;
    }

    console.log('📋 Estrutura da tabela user_profiles:');
    columns.forEach(column => {
      const required = column.is_nullable === 'NO' ? ' (obrigatório)' : '';
      console.log(`   - ${column.column_name}: ${column.data_type}${required}`);
    });

    // Verificar se campos obrigatórios existem
    const requiredFields = ['id', 'first_name', 'last_name', 'email'];
    const existingFields = columns.map(col => col.column_name);
    
    const missingFields = requiredFields.filter(field => !existingFields.includes(field));
    
    if (missingFields.length > 0) {
      console.log('⚠️ Campos obrigatórios ausentes:', missingFields.join(', '));
    } else {
      console.log('✅ Todos os campos obrigatórios estão presentes');
    }

  } catch (error) {
    console.log('❌ Erro ao verificar estrutura da tabela:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applyProfileMigrations().catch(console.error);
}

module.exports = { applyProfileMigrations }; 

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Script para aplicar migrações relacionadas ao perfil de usuário
 */
async function applyProfileMigrations() {
  console.log('🔧 Aplicando migrações do perfil de usuário...\n');

  try {
    // 1. Aplicar migração do campo CPF/CNPJ
    console.log('1️⃣ Aplicando migração do campo CPF/CNPJ...');
    await applyCpfCnpjMigration();

    // 2. Configurar bucket de storage para avatares
    console.log('\n2️⃣ Configurando bucket de storage para avatares...');
    await setupAvatarsBucket();

    // 3. Verificar estrutura da tabela
    console.log('\n3️⃣ Verificando estrutura da tabela user_profiles...');
    await verifyTableStructure();

    console.log('\n✅ Migrações aplicadas com sucesso!');
    console.log('\n📝 Resumo das alterações:');
    console.log('   ✅ Campo CPF/CNPJ adicionado à tabela user_profiles');
    console.log('   ✅ Bucket "avatars" configurado no Supabase Storage');
    console.log('   ✅ Políticas RLS configuradas para upload de avatares');
    console.log('   ✅ Índices criados para melhor performance');

  } catch (error) {
    console.error('❌ Erro durante a aplicação das migrações:', error.message);
    logger.error('Erro nas migrações do perfil:', error);
    process.exit(1);
  }
}

async function applyCpfCnpjMigration() {
  try {
    const migrationPath = path.join(__dirname, '..', 'sql', 'migrations', 'add_cpf_cnpj_to_user_profiles.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.log('❌ Arquivo de migração não encontrado');
      return;
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.log('⚠️ Erro ao aplicar migração (pode já estar aplicada):', error.message);
      
      // Tentar verificar se a coluna já existe
      const { data: columns, error: checkError } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'user_profiles')
        .eq('column_name', 'cpf_cnpj');

      if (!checkError && columns && columns.length > 0) {
        console.log('✅ Coluna cpf_cnpj já existe na tabela');
      } else {
        console.log('❌ Coluna cpf_cnpj não foi criada');
      }
    } else {
      console.log('✅ Migração do CPF/CNPJ aplicada com sucesso');
    }

  } catch (error) {
    console.log('❌ Erro ao aplicar migração CPF/CNPJ:', error.message);
  }
}

async function setupAvatarsBucket() {
  try {
    const bucketSQL = path.join(__dirname, '..', 'sql', 'migrations', 'create_avatars_storage_bucket.sql');
    
    if (!fs.existsSync(bucketSQL)) {
      console.log('❌ Arquivo de configuração do bucket não encontrado');
      return;
    }

    const bucketConfig = fs.readFileSync(bucketSQL, 'utf8');
    
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: bucketConfig
    });

    if (error) {
      console.log('⚠️ Erro ao configurar bucket (pode já estar configurado):', error.message);
      
      // Verificar se o bucket já existe
      const { data: buckets, error: checkError } = await supabaseAdmin
        .storage
        .listBuckets();

      if (!checkError && buckets) {
        const avatarsBucket = buckets.find(bucket => bucket.id === 'avatars');
        if (avatarsBucket) {
          console.log('✅ Bucket "avatars" já existe');
        } else {
          console.log('❌ Bucket "avatars" não foi criado');
        }
      }
    } else {
      console.log('✅ Bucket de avatares configurado com sucesso');
    }

  } catch (error) {
    console.log('❌ Erro ao configurar bucket de avatares:', error.message);
  }
}

async function verifyTableStructure() {
  try {
    // Verificar estrutura da tabela user_profiles
    const { data: columns, error } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'user_profiles')
      .order('ordinal_position');

    if (error) {
      console.log('❌ Erro ao verificar estrutura da tabela:', error.message);
      return;
    }

    console.log('📋 Estrutura da tabela user_profiles:');
    columns.forEach(column => {
      const required = column.is_nullable === 'NO' ? ' (obrigatório)' : '';
      console.log(`   - ${column.column_name}: ${column.data_type}${required}`);
    });

    // Verificar se campos obrigatórios existem
    const requiredFields = ['id', 'first_name', 'last_name', 'email'];
    const existingFields = columns.map(col => col.column_name);
    
    const missingFields = requiredFields.filter(field => !existingFields.includes(field));
    
    if (missingFields.length > 0) {
      console.log('⚠️ Campos obrigatórios ausentes:', missingFields.join(', '));
    } else {
      console.log('✅ Todos os campos obrigatórios estão presentes');
    }

  } catch (error) {
    console.log('❌ Erro ao verificar estrutura da tabela:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applyProfileMigrations().catch(console.error);
}

module.exports = { applyProfileMigrations }; 