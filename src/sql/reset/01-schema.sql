-- Script para recriar as tabelas principais do sistema
-- Primeiro removemos as tabelas existentes (se necessário)

-- Função auxiliar para executar SQL
CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Desativar RLS temporariamente para facilitar a exclusão
ALTER TABLE IF EXISTS "client_agents" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "agent_variables" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "agent_interactions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "agent_usage_logs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "agent_templates" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "organization_members" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "organizations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "user_profiles" DISABLE ROW LEVEL SECURITY;

-- Remover tabelas existentes em ordem (devido às dependências)
DROP TABLE IF EXISTS "agent_usage_logs";
DROP TABLE IF EXISTS "agent_interactions";
DROP TABLE IF EXISTS "agent_variables";
DROP TABLE IF EXISTS "client_agents";
DROP TABLE IF EXISTS "agent_templates";
DROP TABLE IF EXISTS "organization_members";
DROP TABLE IF EXISTS "organizations";
DROP TABLE IF EXISTS "user_profiles";

-- Remover funções existentes
DROP FUNCTION IF EXISTS get_user_agents(UUID, TEXT, UUID, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_user_agents_v2(UUID, TEXT, UUID, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_user_memberships(UUID);
DROP FUNCTION IF EXISTS get_dashboard_stats(UUID);

-- 1. Criar tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "first_name" TEXT,
  "last_name" TEXT,
  "avatar_url" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela de organizações
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "slug" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "logo_url" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela de membros de organização
CREATE TABLE IF NOT EXISTS "organization_members" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE ("organization_id", "user_id")
);

-- 4. Criar tabela de templates de agentes
CREATE TABLE IF NOT EXISTS "agent_templates" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "n8n_workflow_id" TEXT,
  "configuration" JSONB DEFAULT '{}'::jsonb,
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Criar tabela de agentes
CREATE TABLE IF NOT EXISTS "client_agents" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "template_id" UUID REFERENCES agent_templates(id),
  "organization_id" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "created_by" UUID REFERENCES auth.users(id),
  "is_active" BOOLEAN DEFAULT TRUE,
  "configuration" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Criar tabela de variáveis de agentes
CREATE TABLE IF NOT EXISTS "agent_variables" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "agent_id" UUID NOT NULL REFERENCES client_agents(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "is_sensitive" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE ("agent_id", "name")
);

-- 7. Criar tabela de interações de agentes
CREATE TABLE IF NOT EXISTS "agent_interactions" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "agent_id" UUID NOT NULL REFERENCES client_agents(id) ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "user_message" TEXT NOT NULL,
  "agent_response" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Criar tabela de logs de uso de agentes
CREATE TABLE IF NOT EXISTS "agent_usage_logs" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "agent_id" UUID NOT NULL REFERENCES client_agents(id) ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "tokens_used" INTEGER NOT NULL DEFAULT 0,
  "operation" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS "organizations_slug_idx" ON "organizations" ("slug");
CREATE INDEX IF NOT EXISTS "org_members_org_id_idx" ON "organization_members" ("organization_id");
CREATE INDEX IF NOT EXISTS "org_members_user_id_idx" ON "organization_members" ("user_id");
CREATE INDEX IF NOT EXISTS "client_agents_org_id_idx" ON "client_agents" ("organization_id");
CREATE INDEX IF NOT EXISTS "client_agents_template_id_idx" ON "client_agents" ("template_id");
CREATE INDEX IF NOT EXISTS "agent_variables_agent_id_idx" ON "agent_variables" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_interactions_agent_id_idx" ON "agent_interactions" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_interactions_user_id_idx" ON "agent_interactions" ("user_id");
CREATE INDEX IF NOT EXISTS "agent_usage_logs_agent_id_idx" ON "agent_usage_logs" ("agent_id");

-- Função para atualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
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
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para tabela organizations
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para tabela organization_members
CREATE TRIGGER update_organization_members_updated_at
BEFORE UPDATE ON organization_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para tabela agent_templates
CREATE TRIGGER update_agent_templates_updated_at
BEFORE UPDATE ON agent_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para tabela client_agents
CREATE TRIGGER update_client_agents_updated_at
BEFORE UPDATE ON client_agents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para tabela agent_variables
CREATE TRIGGER update_agent_variables_updated_at
BEFORE UPDATE ON agent_variables
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 