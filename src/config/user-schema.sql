-- Schema para a tabela user_profiles no Supabase

-- Criação ou atualização da tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso
-- Permissão para usuários autenticados verem seus próprios perfis
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Permissão para usuários autenticados editarem seus próprios perfis
CREATE POLICY "Usuários podem editar seu próprio perfil"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Função para atualizar o timestamp de updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o timestamp automaticamente quando o registro for atualizado
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column(); 