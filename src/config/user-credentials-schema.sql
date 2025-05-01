-- Schema para tabelas relacionadas a Credenciais de Usuário
-- Esta tabela armazena chaves de API e outras credenciais de acesso

-- Extensão para gerar UUIDs (caso não esteja habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de chaves de API do usuário
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_value VARCHAR(100) NOT NULL UNIQUE,
    key_prefix VARCHAR(10) NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_value ON user_api_keys(key_value);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON user_api_keys(key_prefix);

-- Adicionar restrição de verificação para expiração
ALTER TABLE user_api_keys 
ADD CONSTRAINT check_expiry_date 
CHECK (expires_at > created_at);

-- RLS: Políticas de segurança para chaves de API
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver suas próprias chaves
CREATE POLICY "Usuários podem ver suas próprias chaves"
ON user_api_keys
FOR SELECT
USING (auth.uid() = user_id);

-- Política: Usuários só podem inserir suas próprias chaves
CREATE POLICY "Usuários podem criar suas próprias chaves"
ON user_api_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política: Usuários só podem atualizar suas próprias chaves
CREATE POLICY "Usuários podem atualizar suas próprias chaves"
ON user_api_keys
FOR UPDATE
USING (auth.uid() = user_id);

-- Política: Usuários só podem excluir suas próprias chaves
CREATE POLICY "Usuários podem excluir suas próprias chaves"
ON user_api_keys
FOR DELETE
USING (auth.uid() = user_id);

-- Tabela para registro de uso das chaves de API
CREATE TABLE IF NOT EXISTS api_key_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_id UUID NOT NULL REFERENCES user_api_keys(id) ON DELETE CASCADE,
    operation VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar índices para tabela de logs
CREATE INDEX IF NOT EXISTS idx_api_logs_key_id ON api_key_usage_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_key_usage_logs(created_at);

-- Habilitar RLS na tabela de logs
ALTER TABLE api_key_usage_logs ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver logs de suas próprias chaves
CREATE POLICY "Usuários podem ver logs de suas próprias chaves"
ON api_key_usage_logs
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM user_api_keys 
    WHERE user_api_keys.id = api_key_usage_logs.key_id 
    AND user_api_keys.user_id = auth.uid()
));

-- Procedimento armazenado para criar uma nova chave de API
CREATE OR REPLACE FUNCTION create_user_api_key(
    p_user_id UUID,
    p_name VARCHAR,
    p_expires_in_days INTEGER DEFAULT 365
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    key_value VARCHAR,
    key_prefix VARCHAR,
    expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_key_value VARCHAR;
    v_key_prefix VARCHAR;
    v_key_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Gerar uma chave aleatória
    v_key_value := encode(gen_random_bytes(32), 'base64');
    v_key_prefix := 'uk_' || encode(gen_random_bytes(3), 'hex');
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
    
    -- Inserir a nova chave
    INSERT INTO user_api_keys (
        user_id,
        name,
        key_value,
        key_prefix,
        expires_at
    ) VALUES (
        p_user_id,
        p_name,
        v_key_value,
        v_key_prefix,
        v_expires_at
    )
    RETURNING id, name, key_value, key_prefix, expires_at INTO v_key_id, p_name, v_key_value, v_key_prefix, v_expires_at;
    
    RETURN QUERY
    SELECT v_key_id, p_name, v_key_value, v_key_prefix, v_expires_at;
END;
$$;

-- Procedimento armazenado para revogar uma chave de API
CREATE OR REPLACE FUNCTION revoke_user_api_key(
    p_key_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Verificar se a chave pertence ao usuário atual
    SELECT user_id INTO v_user_id
    FROM user_api_keys
    WHERE id = p_key_id;
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF v_user_id <> auth.uid() THEN
        RETURN FALSE;
    END IF;
    
    -- Desativar a chave
    UPDATE user_api_keys
    SET is_active = FALSE, 
        updated_at = NOW()
    WHERE id = p_key_id;
    
    RETURN TRUE;
END;
$$; 