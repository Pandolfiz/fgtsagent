-- Migração para criar tabela de log de consentimentos
-- Conformidade LGPD - Rastreamento de consentimentos

-- Criar tabela de log de consentimentos
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

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_timestamp ON consent_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_consent_logs_type ON consent_logs(consent_type);

-- Habilitar RLS (Row Level Security)
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios logs
CREATE POLICY "Users can view their own consent logs" ON consent_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Política para sistema inserir logs
CREATE POLICY "System can insert consent logs" ON consent_logs
  FOR INSERT WITH CHECK (true);

-- Política para administradores verem todos os logs
CREATE POLICY "Admins can view all consent logs" ON consent_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Função para registrar consentimento
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

-- Função para obter histórico de consentimentos de um usuário
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

-- Função para verificar consentimento atual
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

-- Comentários para documentação
COMMENT ON TABLE consent_logs IS 'Tabela para rastreamento de consentimentos LGPD';
COMMENT ON COLUMN consent_logs.consent_type IS 'Tipo de consentimento: terms, privacy, marketing, data_processing, age, cookies_essential, cookies_analytics, cookies_marketing, cookies_preferences';
COMMENT ON COLUMN consent_logs.granted IS 'Se o consentimento foi concedido (true) ou negado (false)';
COMMENT ON COLUMN consent_logs.consent_version IS 'Versão do documento de consentimento';
COMMENT ON COLUMN consent_logs.consent_text IS 'Texto do consentimento no momento da coleta';

COMMENT ON FUNCTION log_consent IS 'Função para registrar novo consentimento';
COMMENT ON FUNCTION get_user_consent_history IS 'Função para obter histórico de consentimentos de um usuário';
COMMENT ON FUNCTION get_current_consent IS 'Função para verificar consentimento atual de um usuário'; 
-- Conformidade LGPD - Rastreamento de consentimentos

-- Criar tabela de log de consentimentos
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

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_timestamp ON consent_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_consent_logs_type ON consent_logs(consent_type);

-- Habilitar RLS (Row Level Security)
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios logs
CREATE POLICY "Users can view their own consent logs" ON consent_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Política para sistema inserir logs
CREATE POLICY "System can insert consent logs" ON consent_logs
  FOR INSERT WITH CHECK (true);

-- Política para administradores verem todos os logs
CREATE POLICY "Admins can view all consent logs" ON consent_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Função para registrar consentimento
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

-- Função para obter histórico de consentimentos de um usuário
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

-- Função para verificar consentimento atual
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

-- Comentários para documentação
COMMENT ON TABLE consent_logs IS 'Tabela para rastreamento de consentimentos LGPD';
COMMENT ON COLUMN consent_logs.consent_type IS 'Tipo de consentimento: terms, privacy, marketing, data_processing, age, cookies_essential, cookies_analytics, cookies_marketing, cookies_preferences';
COMMENT ON COLUMN consent_logs.granted IS 'Se o consentimento foi concedido (true) ou negado (false)';
COMMENT ON COLUMN consent_logs.consent_version IS 'Versão do documento de consentimento';
COMMENT ON COLUMN consent_logs.consent_text IS 'Texto do consentimento no momento da coleta';

COMMENT ON FUNCTION log_consent IS 'Função para registrar novo consentimento';
COMMENT ON FUNCTION get_user_consent_history IS 'Função para obter histórico de consentimentos de um usuário';
COMMENT ON FUNCTION get_current_consent IS 'Função para verificar consentimento atual de um usuário'; 