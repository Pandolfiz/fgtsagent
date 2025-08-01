#!/usr/bin/env node

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para aplicar migração de segurança cibernética
 */
async function applySecurityMigration() {
  console.log('🔧 Aplicando migração de segurança cibernética...\n');

  try {
    // Criar tabela security_logs
    console.log('📋 Criando tabela security_logs...');
    const securityLogsSQL = `
      CREATE TABLE IF NOT EXISTS security_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        ip_address INET,
        user_agent TEXT,
        success BOOLEAN NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: securityLogsError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: securityLogsSQL
    });

    if (securityLogsError) {
      console.error('❌ Erro ao criar tabela security_logs:', securityLogsError.message);
    } else {
      console.log('✅ Tabela security_logs criada');
    }

    // Criar tabela data_access_logs
    console.log('📋 Criando tabela data_access_logs...');
    const dataAccessLogsSQL = `
      CREATE TABLE IF NOT EXISTS data_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        data_type VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: dataAccessError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: dataAccessLogsSQL
    });

    if (dataAccessError) {
      console.error('❌ Erro ao criar tabela data_access_logs:', dataAccessError.message);
    } else {
      console.log('✅ Tabela data_access_logs criada');
    }

    // Criar tabela transaction_logs
    console.log('📋 Criando tabela transaction_logs...');
    const transactionLogsSQL = `
      CREATE TABLE IF NOT EXISTS transaction_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL,
        amount DECIMAL(15,2),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: transactionError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: transactionLogsSQL
    });

    if (transactionError) {
      console.error('❌ Erro ao criar tabela transaction_logs:', transactionError.message);
    } else {
      console.log('✅ Tabela transaction_logs criada');
    }

    // Criar tabela security_alerts
    console.log('📋 Criando tabela security_alerts...');
    const securityAlertsSQL = `
      CREATE TABLE IF NOT EXISTS security_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        data JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
        assigned_to UUID REFERENCES auth.users(id),
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolution_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: alertsError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: securityAlertsSQL
    });

    if (alertsError) {
      console.error('❌ Erro ao criar tabela security_alerts:', alertsError.message);
    } else {
      console.log('✅ Tabela security_alerts criada');
    }

    // Criar índices
    console.log('📊 Criando índices...');
    const indexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON security_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_security_logs_ip_address ON security_logs(ip_address);
      CREATE INDEX IF NOT EXISTS idx_security_logs_success ON security_logs(success);
      
      CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON data_access_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_data_access_logs_timestamp ON data_access_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_data_access_logs_data_type ON data_access_logs(data_type);
      
      CREATE INDEX IF NOT EXISTS idx_transaction_logs_user_id ON transaction_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_transaction_logs_timestamp ON transaction_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_transaction_logs_type ON transaction_logs(transaction_type);
      
      CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
      CREATE INDEX IF NOT EXISTS idx_security_alerts_timestamp ON security_alerts(timestamp);
    `;

    const { error: indexesError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: indexesSQL
    });

    if (indexesError) {
      console.error('❌ Erro ao criar índices:', indexesError.message);
    } else {
      console.log('✅ Índices criados');
    }

    // Habilitar RLS
    console.log('🔐 Habilitando RLS...');
    const rlsSQL = `
      ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
    `;

    const { error: rlsError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: rlsSQL
    });

    if (rlsError) {
      console.error('❌ Erro ao habilitar RLS:', rlsError.message);
    } else {
      console.log('✅ RLS habilitado');
    }

    // Criar políticas de segurança
    console.log('📝 Criando políticas de segurança...');
    const policiesSQL = `
      DROP POLICY IF EXISTS "Users can view their own security logs" ON security_logs;
      CREATE POLICY "Users can view their own security logs" ON security_logs
        FOR SELECT USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "System can insert security logs" ON security_logs;
      CREATE POLICY "System can insert security logs" ON security_logs
        FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS "Admins can view all security logs" ON security_logs;
      CREATE POLICY "Admins can view all security logs" ON security_logs
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
          )
        );

      DROP POLICY IF EXISTS "Users can view their own data access logs" ON data_access_logs;
      CREATE POLICY "Users can view their own data access logs" ON data_access_logs
        FOR SELECT USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "System can insert data access logs" ON data_access_logs;
      CREATE POLICY "System can insert data access logs" ON data_access_logs
        FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS "Admins can view all data access logs" ON data_access_logs;
      CREATE POLICY "Admins can view all data access logs" ON data_access_logs
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
          )
        );

      DROP POLICY IF EXISTS "Users can view their own transaction logs" ON transaction_logs;
      CREATE POLICY "Users can view their own transaction logs" ON transaction_logs
        FOR SELECT USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "System can insert transaction logs" ON transaction_logs;
      CREATE POLICY "System can insert transaction logs" ON transaction_logs
        FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS "Admins can view all transaction logs" ON transaction_logs;
      CREATE POLICY "Admins can view all transaction logs" ON transaction_logs
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
          )
        );

      DROP POLICY IF EXISTS "Admins can manage security alerts" ON security_alerts;
      CREATE POLICY "Admins can manage security alerts" ON security_alerts
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
          )
        );
    `;

    const { error: policiesError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: policiesSQL
    });

    if (policiesError) {
      console.error('❌ Erro ao criar políticas:', policiesError.message);
    } else {
      console.log('✅ Políticas de segurança criadas');
    }

    // Verificar se tudo foi criado
    console.log('\n🔍 Verificando criação...');
    const tables = [
      'security_logs',
      'data_access_logs', 
      'transaction_logs',
      'security_alerts'
    ];

    for (const tableName of tables) {
      const { data: tableExists, error: checkError } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

      if (checkError) {
        console.error(`❌ Erro ao verificar tabela ${tableName}:`, checkError.message);
      } else if (tableExists && tableExists.length > 0) {
        console.log(`✅ Tabela ${tableName} confirmada`);
      } else {
        console.log(`⚠️ Tabela ${tableName} não encontrada`);
      }
    }

    console.log('\n🎉 Migração de segurança cibernética concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Testar monitoramento de segurança');
    console.log('2. Configurar alertas automáticos');
    console.log('3. Implementar relatórios de segurança');
    console.log('4. Treinar equipe em procedimentos de segurança');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
    logger.error('Erro na migração de segurança:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applySecurityMigration().catch(console.error);
}

module.exports = { applySecurityMigration }; 