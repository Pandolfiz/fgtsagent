-- Script SQL para aplicar migrações de segurança manualmente no Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela security_logs
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

-- 2. Criar tabela data_access_logs
CREATE TABLE IF NOT EXISTS data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela transaction_logs
CREATE TABLE IF NOT EXISTS transaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar tabela security_alerts
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Criar tabela security_incidents
CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  description TEXT,
  affected_users INTEGER DEFAULT 0,
  data_breach BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Criar tabela security_vulnerabilities
CREATE TABLE IF NOT EXISTS security_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vulnerability_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  affected_component TEXT,
  cve_id TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'patched', 'closed')),
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  patched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Criar tabela security_reports
CREATE TABLE IF NOT EXISTS security_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  data JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON security_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip_address ON security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_logs_success ON security_logs(success);

CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON data_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_timestamp ON data_access_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_data_type ON data_access_logs(data_type);

CREATE INDEX IF NOT EXISTS idx_transaction_logs_user_id ON transaction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_timestamp ON transaction_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_transaction_type ON transaction_logs(transaction_type);

CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_timestamp ON security_alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);

CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_timestamp ON security_incidents(timestamp);

-- 9. Habilitar Row Level Security (RLS)
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_reports ENABLE ROW LEVEL SECURITY;

-- 10. Criar políticas de segurança
-- Usuários podem ver apenas seus próprios logs
CREATE POLICY "Users can view own security logs" ON security_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own data access logs" ON data_access_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transaction logs" ON transaction_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Apenas admins podem ver alertas de segurança
CREATE POLICY "Admins can view security alerts" ON security_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Apenas admins podem ver incidentes de segurança
CREATE POLICY "Admins can view security incidents" ON security_incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Apenas admins podem ver vulnerabilidades
CREATE POLICY "Admins can view security vulnerabilities" ON security_vulnerabilities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Apenas admins podem ver relatórios de segurança
CREATE POLICY "Admins can view security reports" ON security_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- 11. Função para limpeza automática de logs antigos
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void AS $$
BEGIN
  -- Limpar logs de segurança com mais de 90 dias
  DELETE FROM security_logs WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM data_access_logs WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM transaction_logs WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Limpar alertas resolvidos com mais de 30 dias
  DELETE FROM security_alerts WHERE resolved = true AND resolved_at < NOW() - INTERVAL '30 days';
  
  -- Limpar incidentes fechados com mais de 1 ano
  DELETE FROM security_incidents WHERE status = 'closed' AND resolved_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- 12. Função para gerar relatórios de segurança
CREATE OR REPLACE FUNCTION generate_security_report(start_date TIMESTAMP WITH TIME ZONE, end_date TIMESTAMP WITH TIME ZONE)
RETURNS JSON AS $$
DECLARE
  report JSON;
BEGIN
  SELECT json_build_object(
    'period', json_build_object('start', start_date, 'end', end_date),
    'login_attempts', (
      SELECT COUNT(*) FROM security_logs 
      WHERE timestamp BETWEEN start_date AND end_date
    ),
    'failed_logins', (
      SELECT COUNT(*) FROM security_logs 
      WHERE timestamp BETWEEN start_date AND end_date AND success = false
    ),
    'data_access_events', (
      SELECT COUNT(*) FROM data_access_logs 
      WHERE timestamp BETWEEN start_date AND end_date
    ),
    'financial_transactions', (
      SELECT COUNT(*) FROM transaction_logs 
      WHERE timestamp BETWEEN start_date AND end_date
    ),
    'security_alerts', (
      SELECT COUNT(*) FROM security_alerts 
      WHERE timestamp BETWEEN start_date AND end_date
    ),
    'critical_alerts', (
      SELECT COUNT(*) FROM security_alerts 
      WHERE timestamp BETWEEN start_date AND end_date AND severity = 'critical'
    )
  ) INTO report;
  
  RETURN report;
END;
$$ LANGUAGE plpgsql;

-- 13. Inserir relatório inicial
INSERT INTO security_reports (report_type, period_start, period_end, data)
VALUES (
  'initial_setup',
  NOW() - INTERVAL '1 day',
  NOW(),
  '{"message": "Sistema de segurança inicializado"}'
);

-- 14. Confirmar criação das tabelas
SELECT 'Tabelas de segurança criadas com sucesso!' as status; 