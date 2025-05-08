-- Criação da tabela de credenciais de parceiros
CREATE TABLE IF NOT EXISTS partner_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key TEXT,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('v8', 'caixa', 'governo', 'outro')),
  auth_type TEXT NOT NULL CHECK (auth_type IN ('apikey', 'oauth')),
  oauth_config JSONB DEFAULT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending', 'error')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS partner_credentials_user_id_idx ON partner_credentials(user_id);
CREATE INDEX IF NOT EXISTS partner_credentials_partner_type_idx ON partner_credentials(partner_type);
CREATE INDEX IF NOT EXISTS partner_credentials_status_idx ON partner_credentials(status);

-- Configuração RLS (Row Level Security) para limitar acesso por usuário
ALTER TABLE partner_credentials ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso aos dados
-- Política para selecionar apenas as próprias credenciais
CREATE POLICY select_own_credentials ON partner_credentials
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política para inserir apenas as próprias credenciais
CREATE POLICY insert_own_credentials ON partner_credentials
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política para atualizar apenas as próprias credenciais
CREATE POLICY update_own_credentials ON partner_credentials
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Política para excluir apenas as próprias credenciais
CREATE POLICY delete_own_credentials ON partner_credentials
    FOR DELETE
    USING (auth.uid() = user_id);

-- Função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_partner_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o campo updated_at
CREATE TRIGGER update_partner_credentials_updated_at
BEFORE UPDATE ON partner_credentials
FOR EACH ROW
EXECUTE FUNCTION update_partner_credentials_updated_at(); 