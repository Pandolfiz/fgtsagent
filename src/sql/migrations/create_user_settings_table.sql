-- Criar tabela user_settings para armazenar configurações dos usuários
CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "settings" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE ("user_id")
);

-- Adicionar comentários
COMMENT ON TABLE user_settings IS 'Configurações personalizadas dos usuários';
COMMENT ON COLUMN user_settings.user_id IS 'ID do usuário (referência para auth.users)';
COMMENT ON COLUMN user_settings.settings IS 'Configurações em formato JSON';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON user_settings(updated_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
-- Política para usuários verem apenas suas próprias configurações
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

-- Política para usuários inserirem suas próprias configurações
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para usuários atualizarem suas próprias configurações
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Política para usuários deletarem suas próprias configurações
CREATE POLICY "Users can delete own settings" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();

-- Inserir configurações padrão para usuários existentes (opcional)
-- Isso pode ser executado manualmente se necessário
-- INSERT INTO user_settings (user_id, settings)
-- SELECT id, '{"language": "pt-BR", "timezone": "America/Sao_Paulo", "notifications": {"email": true, "push": true, "whatsapp": false}, "theme": "dark", "auto_sync": true, "sync_interval": 30}'::jsonb
-- FROM auth.users
-- WHERE id NOT IN (SELECT user_id FROM user_settings); 
CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "settings" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE ("user_id")
);

-- Adicionar comentários
COMMENT ON TABLE user_settings IS 'Configurações personalizadas dos usuários';
COMMENT ON COLUMN user_settings.user_id IS 'ID do usuário (referência para auth.users)';
COMMENT ON COLUMN user_settings.settings IS 'Configurações em formato JSON';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON user_settings(updated_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
-- Política para usuários verem apenas suas próprias configurações
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

-- Política para usuários inserirem suas próprias configurações
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para usuários atualizarem suas próprias configurações
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Política para usuários deletarem suas próprias configurações
CREATE POLICY "Users can delete own settings" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();

-- Inserir configurações padrão para usuários existentes (opcional)
-- Isso pode ser executado manualmente se necessário
-- INSERT INTO user_settings (user_id, settings)
-- SELECT id, '{"language": "pt-BR", "timezone": "America/Sao_Paulo", "notifications": {"email": true, "push": true, "whatsapp": false}, "theme": "dark", "auto_sync": true, "sync_interval": 30}'::jsonb
-- FROM auth.users
-- WHERE id NOT IN (SELECT user_id FROM user_settings); 