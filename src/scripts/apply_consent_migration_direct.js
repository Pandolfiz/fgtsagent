#!/usr/bin/env node

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para aplicar migração de consentimentos LGPD diretamente
 */
async function applyConsentMigrationDirect() {
  console.log('🔧 Aplicando migração de consentimentos LGPD (método direto)...\n');

  try {
    // Criar tabela consent_logs
    console.log('📋 Criando tabela consent_logs...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS consent_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        consent_type VARCHAR(50) NOT NULL,
        granted BOOLEAN NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ip_address INET,
        user_agent TEXT,
        consent_version VARCHAR(20),
        consent_text TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: tableError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: createTableSQL
    });

    if (tableError) {
      console.error('❌ Erro ao criar tabela:', tableError.message);
      throw new Error(`Falha ao criar tabela: ${tableError.message}`);
    }

    console.log('✅ Tabela consent_logs criada');

    // Criar índices
    console.log('📊 Criando índices...');
    const indexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON consent_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_consent_logs_timestamp ON consent_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_consent_logs_type ON consent_logs(consent_type);
    `;

    const { error: indexError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: indexesSQL
    });

    if (indexError) {
      console.error('❌ Erro ao criar índices:', indexError.message);
    } else {
      console.log('✅ Índices criados');
    }

    // Habilitar RLS
    console.log('🔐 Habilitando RLS...');
    const rlsSQL = `
      ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
    `;

    const { error: rlsError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: rlsSQL
    });

    if (rlsError) {
      console.error('❌ Erro ao habilitar RLS:', rlsError.message);
    } else {
      console.log('✅ RLS habilitado');
    }

    // Criar políticas
    console.log('📝 Criando políticas de segurança...');
    const policiesSQL = `
      DROP POLICY IF EXISTS "Users can view their own consent logs" ON consent_logs;
      CREATE POLICY "Users can view their own consent logs" ON consent_logs
        FOR SELECT USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "System can insert consent logs" ON consent_logs;
      CREATE POLICY "System can insert consent logs" ON consent_logs
        FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS "Admins can view all consent logs" ON consent_logs;
      CREATE POLICY "Admins can view all consent logs" ON consent_logs
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
          )
        );
    `;

    const { error: policyError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: policiesSQL
    });

    if (policyError) {
      console.error('❌ Erro ao criar políticas:', policyError.message);
    } else {
      console.log('✅ Políticas criadas');
    }

    // Criar função log_consent
    console.log('🔧 Criando função log_consent...');
    const logConsentSQL = `
      CREATE OR REPLACE FUNCTION log_consent(
        p_user_id UUID,
        p_consent_type VARCHAR(50),
        p_granted BOOLEAN,
        p_ip_address INET DEFAULT NULL,
        p_user_agent TEXT DEFAULT NULL,
        p_consent_version VARCHAR(20) DEFAULT '1.0',
        p_consent_text TEXT DEFAULT NULL
      ) RETURNS UUID AS $$
      DECLARE
        v_log_id UUID;
      BEGIN
        INSERT INTO consent_logs (
          user_id,
          consent_type,
          granted,
          ip_address,
          user_agent,
          consent_version,
          consent_text
        ) VALUES (
          p_user_id,
          p_consent_type,
          p_granted,
          p_ip_address,
          p_user_agent,
          p_consent_version,
          p_consent_text
        ) RETURNING id INTO v_log_id;
        
        RETURN v_log_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: func1Error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: logConsentSQL
    });

    if (func1Error) {
      console.error('❌ Erro ao criar função log_consent:', func1Error.message);
    } else {
      console.log('✅ Função log_consent criada');
    }

    // Criar função get_user_consent_history
    console.log('🔧 Criando função get_user_consent_history...');
    const historySQL = `
      CREATE OR REPLACE FUNCTION get_user_consent_history(p_user_id UUID)
      RETURNS TABLE (
        consent_type VARCHAR(50),
        granted BOOLEAN,
        timestamp TIMESTAMP WITH TIME ZONE,
        consent_version VARCHAR(20)
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          cl.consent_type,
          cl.granted,
          cl.timestamp,
          cl.consent_version
        FROM consent_logs cl
        WHERE cl.user_id = p_user_id
        ORDER BY cl.timestamp DESC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: func2Error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: historySQL
    });

    if (func2Error) {
      console.error('❌ Erro ao criar função get_user_consent_history:', func2Error.message);
    } else {
      console.log('✅ Função get_user_consent_history criada');
    }

    // Criar função get_current_consent
    console.log('🔧 Criando função get_current_consent...');
    const currentSQL = `
      CREATE OR REPLACE FUNCTION get_current_consent(p_user_id UUID, p_consent_type VARCHAR(50))
      RETURNS BOOLEAN AS $$
      DECLARE
        v_granted BOOLEAN;
      BEGIN
        SELECT granted INTO v_granted
        FROM consent_logs
        WHERE user_id = p_user_id 
          AND consent_type = p_consent_type
        ORDER BY timestamp DESC
        LIMIT 1;
        
        RETURN COALESCE(v_granted, FALSE);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: func3Error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: currentSQL
    });

    if (func3Error) {
      console.error('❌ Erro ao criar função get_current_consent:', func3Error.message);
    } else {
      console.log('✅ Função get_current_consent criada');
    }

    // Verificar se tudo foi criado
    console.log('\n🔍 Verificando criação...');
    const { data: tables, error: checkError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'consent_logs');

    if (checkError) {
      console.error('❌ Erro ao verificar tabela:', checkError.message);
    } else if (tables && tables.length > 0) {
      console.log('✅ Tabela consent_logs confirmada');
    } else {
      console.log('⚠️ Tabela não encontrada - verificar manualmente');
    }

    console.log('\n🎉 Migração de consentimentos LGPD concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Testar o banner de cookies no frontend');
    console.log('2. Verificar consentimentos no cadastro');
    console.log('3. Testar APIs de consentimento');
    console.log('4. Configurar monitoramento de compliance');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
    logger.error('Erro na migração de consentimentos:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applyConsentMigrationDirect().catch(console.error);
}

module.exports = { applyConsentMigrationDirect }; 

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para aplicar migração de consentimentos LGPD diretamente
 */
async function applyConsentMigrationDirect() {
  console.log('🔧 Aplicando migração de consentimentos LGPD (método direto)...\n');

  try {
    // Criar tabela consent_logs
    console.log('📋 Criando tabela consent_logs...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS consent_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        consent_type VARCHAR(50) NOT NULL,
        granted BOOLEAN NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ip_address INET,
        user_agent TEXT,
        consent_version VARCHAR(20),
        consent_text TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: tableError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: createTableSQL
    });

    if (tableError) {
      console.error('❌ Erro ao criar tabela:', tableError.message);
      throw new Error(`Falha ao criar tabela: ${tableError.message}`);
    }

    console.log('✅ Tabela consent_logs criada');

    // Criar índices
    console.log('📊 Criando índices...');
    const indexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON consent_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_consent_logs_timestamp ON consent_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_consent_logs_type ON consent_logs(consent_type);
    `;

    const { error: indexError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: indexesSQL
    });

    if (indexError) {
      console.error('❌ Erro ao criar índices:', indexError.message);
    } else {
      console.log('✅ Índices criados');
    }

    // Habilitar RLS
    console.log('🔐 Habilitando RLS...');
    const rlsSQL = `
      ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
    `;

    const { error: rlsError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: rlsSQL
    });

    if (rlsError) {
      console.error('❌ Erro ao habilitar RLS:', rlsError.message);
    } else {
      console.log('✅ RLS habilitado');
    }

    // Criar políticas
    console.log('📝 Criando políticas de segurança...');
    const policiesSQL = `
      DROP POLICY IF EXISTS "Users can view their own consent logs" ON consent_logs;
      CREATE POLICY "Users can view their own consent logs" ON consent_logs
        FOR SELECT USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "System can insert consent logs" ON consent_logs;
      CREATE POLICY "System can insert consent logs" ON consent_logs
        FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS "Admins can view all consent logs" ON consent_logs;
      CREATE POLICY "Admins can view all consent logs" ON consent_logs
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
          )
        );
    `;

    const { error: policyError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: policiesSQL
    });

    if (policyError) {
      console.error('❌ Erro ao criar políticas:', policyError.message);
    } else {
      console.log('✅ Políticas criadas');
    }

    // Criar função log_consent
    console.log('🔧 Criando função log_consent...');
    const logConsentSQL = `
      CREATE OR REPLACE FUNCTION log_consent(
        p_user_id UUID,
        p_consent_type VARCHAR(50),
        p_granted BOOLEAN,
        p_ip_address INET DEFAULT NULL,
        p_user_agent TEXT DEFAULT NULL,
        p_consent_version VARCHAR(20) DEFAULT '1.0',
        p_consent_text TEXT DEFAULT NULL
      ) RETURNS UUID AS $$
      DECLARE
        v_log_id UUID;
      BEGIN
        INSERT INTO consent_logs (
          user_id,
          consent_type,
          granted,
          ip_address,
          user_agent,
          consent_version,
          consent_text
        ) VALUES (
          p_user_id,
          p_consent_type,
          p_granted,
          p_ip_address,
          p_user_agent,
          p_consent_version,
          p_consent_text
        ) RETURNING id INTO v_log_id;
        
        RETURN v_log_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: func1Error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: logConsentSQL
    });

    if (func1Error) {
      console.error('❌ Erro ao criar função log_consent:', func1Error.message);
    } else {
      console.log('✅ Função log_consent criada');
    }

    // Criar função get_user_consent_history
    console.log('🔧 Criando função get_user_consent_history...');
    const historySQL = `
      CREATE OR REPLACE FUNCTION get_user_consent_history(p_user_id UUID)
      RETURNS TABLE (
        consent_type VARCHAR(50),
        granted BOOLEAN,
        timestamp TIMESTAMP WITH TIME ZONE,
        consent_version VARCHAR(20)
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          cl.consent_type,
          cl.granted,
          cl.timestamp,
          cl.consent_version
        FROM consent_logs cl
        WHERE cl.user_id = p_user_id
        ORDER BY cl.timestamp DESC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: func2Error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: historySQL
    });

    if (func2Error) {
      console.error('❌ Erro ao criar função get_user_consent_history:', func2Error.message);
    } else {
      console.log('✅ Função get_user_consent_history criada');
    }

    // Criar função get_current_consent
    console.log('🔧 Criando função get_current_consent...');
    const currentSQL = `
      CREATE OR REPLACE FUNCTION get_current_consent(p_user_id UUID, p_consent_type VARCHAR(50))
      RETURNS BOOLEAN AS $$
      DECLARE
        v_granted BOOLEAN;
      BEGIN
        SELECT granted INTO v_granted
        FROM consent_logs
        WHERE user_id = p_user_id 
          AND consent_type = p_consent_type
        ORDER BY timestamp DESC
        LIMIT 1;
        
        RETURN COALESCE(v_granted, FALSE);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: func3Error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: currentSQL
    });

    if (func3Error) {
      console.error('❌ Erro ao criar função get_current_consent:', func3Error.message);
    } else {
      console.log('✅ Função get_current_consent criada');
    }

    // Verificar se tudo foi criado
    console.log('\n🔍 Verificando criação...');
    const { data: tables, error: checkError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'consent_logs');

    if (checkError) {
      console.error('❌ Erro ao verificar tabela:', checkError.message);
    } else if (tables && tables.length > 0) {
      console.log('✅ Tabela consent_logs confirmada');
    } else {
      console.log('⚠️ Tabela não encontrada - verificar manualmente');
    }

    console.log('\n🎉 Migração de consentimentos LGPD concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Testar o banner de cookies no frontend');
    console.log('2. Verificar consentimentos no cadastro');
    console.log('3. Testar APIs de consentimento');
    console.log('4. Configurar monitoramento de compliance');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
    logger.error('Erro na migração de consentimentos:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applyConsentMigrationDirect().catch(console.error);
}

module.exports = { applyConsentMigrationDirect }; 