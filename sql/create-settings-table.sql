-- Criar tabela de configurações, se não existir
CREATE TABLE IF NOT EXISTS public.settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adicionar políticas de segurança RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Criar política para administradores
CREATE POLICY admin_settings_policy ON public.settings
  FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
  );

-- Inserir ou atualizar configurações do n8n
INSERT INTO public.settings (key, value)
VALUES
  ('n8n_api_url', 'http://localhost:5678/api/v1')
ON CONFLICT (key)
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

INSERT INTO public.settings (key, value)
VALUES
  ('n8n_api_key', 'SEU_API_KEY_AQUI')
ON CONFLICT (key)
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Adicionar gatilho para atualização do updated_at
CREATE OR REPLACE FUNCTION update_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settings_updated_at ON public.settings;
CREATE TRIGGER settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION update_settings_timestamp(); 