-- Esquema do banco de dados para o Supabase
-- Execute este script no SQL Editor do Supabase para criar as tabelas necessárias

-- Tabela de perfis de usuário (estende os usuários do Supabase Auth)
CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "first_name" TEXT,
  "last_name" TEXT,
  "avatar_url" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de organizações
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "slug" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "logo_url" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por slug
CREATE INDEX IF NOT EXISTS "organizations_slug_idx" ON "organizations" ("slug");

-- Tabela de membros de organização
CREATE TABLE IF NOT EXISTS "organization_members" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE ("organization_id", "user_id")
);

-- Índices para busca de membros
CREATE INDEX IF NOT EXISTS "organization_members_organization_id_idx" ON "organization_members" ("organization_id");
CREATE INDEX IF NOT EXISTS "organization_members_user_id_idx" ON "organization_members" ("user_id");

-- Políticas de segurança para tabelas (RLS)
-- Perfis de usuário: usuários podem ver e editar apenas seus próprios perfis
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar seus próprios perfis"
  ON "user_profiles" FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem editar seus próprios perfis"
  ON "user_profiles" FOR UPDATE
  USING (auth.uid() = id);

-- Organizações: visíveis para membros
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizações são visíveis para seus membros"
  ON "organizations" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = id AND user_id = auth.uid()
    )
  );

-- Membros: visíveis para membros da mesma organização
ALTER TABLE "organization_members" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros são visíveis para membros da mesma organização"
  ON "organization_members" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_id AND om.user_id = auth.uid()
    )
  );

-- Triggers para atualizar o campo updated_at
-- Função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para tabela user_profiles
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Trigger para tabela organizations
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Trigger para tabela organization_members
CREATE TRIGGER update_organization_members_updated_at
BEFORE UPDATE ON organization_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Insira alguns dados de exemplo (opcional)
INSERT INTO organizations (name, slug, description)
VALUES 
  ('Organização Demo', 'demo-org', 'Organização para demonstração')
ON CONFLICT DO NOTHING; 