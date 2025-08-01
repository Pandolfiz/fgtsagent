-- Migração para criar tabelas de segurança cibernética
-- Conformidade BACEN 4.658/2018 - Cibersegurança

-- Tabela de logs de segurança (tentativas de login, etc.)
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

-- Tabela de logs de acesso a dados
CREATE TABLE IF NOT EXISTS data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs de transações financeiras
CREATE TABLE IF NOT EXISTS transaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de alertas de segurança
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

-- Tabela de incidentes de segurança
CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  contained_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  impact_assessment TEXT,
  root_cause TEXT,
  lessons_learned TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de vulnerabilidades
CREATE TABLE IF NOT EXISTS security_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vulnerability_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  affected_system VARCHAR(100),
  cve_id VARCHAR(20),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'mitigated', 'resolved')),
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  remediation_notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de relatórios de segurança
CREATE TABLE IF NOT EXISTS security_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50) NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  summary JSONB,
  details JSONB,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
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

CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_detected_at ON security_incidents(detected_at);

CREATE INDEX IF NOT EXISTS idx_security_vulnerabilities_severity ON security_vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_security_vulnerabilities_status ON security_vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_security_vulnerabilities_discovered_at ON security_vulnerabilities(discovered_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_reports ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para logs
CREATE POLICY "Users can view their own security logs" ON security_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert security logs" ON security_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all security logs" ON security_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Políticas para acesso a dados
CREATE POLICY "Users can view their own data access logs" ON data_access_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert data access logs" ON data_access_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all data access logs" ON data_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Políticas para transações
CREATE POLICY "Users can view their own transaction logs" ON transaction_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transaction logs" ON transaction_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all transaction logs" ON transaction_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Políticas para alertas (apenas admins)
CREATE POLICY "Admins can manage security alerts" ON security_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Políticas para incidentes (apenas admins)
CREATE POLICY "Admins can manage security incidents" ON security_incidents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Políticas para vulnerabilidades (apenas admins)
CREATE POLICY "Admins can manage security vulnerabilities" ON security_vulnerabilities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Políticas para relatórios (apenas admins)
CREATE POLICY "Admins can manage security reports" ON security_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Função para limpar logs antigos automaticamente
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void AS $$
BEGIN
  -- Limpar logs de segurança com mais de 90 dias
  DELETE FROM security_logs 
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Limpar logs de acesso a dados com mais de 90 dias
  DELETE FROM data_access_logs 
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Limpar logs de transações com mais de 1 ano
  DELETE FROM transaction_logs 
  WHERE timestamp < NOW() - INTERVAL '1 year';
  
  -- Limpar alertas resolvidos com mais de 30 dias
  DELETE FROM security_alerts 
  WHERE status = 'resolved' AND resolved_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Função para gerar relatório de segurança
CREATE OR REPLACE FUNCTION generate_security_report(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSON AS $$
DECLARE
  report JSON;
BEGIN
  SELECT json_build_object(
    'period', json_build_object('start', p_start_date, 'end', p_end_date),
    'summary', json_build_object(
      'total_security_logs', (SELECT COUNT(*) FROM security_logs WHERE timestamp BETWEEN p_start_date AND p_end_date),
      'failed_logins', (SELECT COUNT(*) FROM security_logs WHERE timestamp BETWEEN p_start_date AND p_end_date AND success = false),
      'total_data_access', (SELECT COUNT(*) FROM data_access_logs WHERE timestamp BETWEEN p_start_date AND p_end_date),
      'total_transactions', (SELECT COUNT(*) FROM transaction_logs WHERE timestamp BETWEEN p_start_date AND p_end_date),
      'total_alerts', (SELECT COUNT(*) FROM security_alerts WHERE timestamp BETWEEN p_start_date AND p_end_date),
      'critical_alerts', (SELECT COUNT(*) FROM security_alerts WHERE timestamp BETWEEN p_start_date AND p_end_date AND severity = 'critical'),
      'total_incidents', (SELECT COUNT(*) FROM security_incidents WHERE detected_at BETWEEN p_start_date AND p_end_date),
      'open_vulnerabilities', (SELECT COUNT(*) FROM security_vulnerabilities WHERE status = 'open')
    ),
    'details', json_build_object(
      'recent_alerts', (SELECT json_agg(alerts.*) FROM security_alerts alerts WHERE timestamp BETWEEN p_start_date AND p_end_date ORDER BY timestamp DESC LIMIT 10),
      'recent_incidents', (SELECT json_agg(incidents.*) FROM security_incidents incidents WHERE detected_at BETWEEN p_start_date AND p_end_date ORDER BY detected_at DESC LIMIT 5),
      'top_ip_addresses', (SELECT json_agg(ip_stats.*) FROM (
        SELECT ip_address, COUNT(*) as attempts 
        FROM security_logs 
        WHERE timestamp BETWEEN p_start_date AND p_end_date 
        GROUP BY ip_address 
        ORDER BY attempts DESC 
        LIMIT 10
      ) ip_stats)
    )
  ) INTO report;
  
  RETURN report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON TABLE security_logs IS 'Logs de tentativas de login e atividades de segurança';
COMMENT ON TABLE data_access_logs IS 'Logs de acesso a dados sensíveis';
COMMENT ON TABLE transaction_logs IS 'Logs de transações financeiras';
COMMENT ON TABLE security_alerts IS 'Alertas de segurança gerados pelo sistema';
COMMENT ON TABLE security_incidents IS 'Incidentes de segurança registrados';
COMMENT ON TABLE security_vulnerabilities IS 'Vulnerabilidades de segurança identificadas';
COMMENT ON TABLE security_reports IS 'Relatórios de segurança gerados';

COMMENT ON FUNCTION cleanup_old_security_logs IS 'Função para limpar logs antigos automaticamente';
COMMENT ON FUNCTION generate_security_report IS 'Função para gerar relatório de segurança'; 