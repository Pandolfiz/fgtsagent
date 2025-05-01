-- Migração para adicionar a coluna workflow_metadata na tabela client_agents
-- Data: 2025-04-11

-- Adicionar coluna workflow_metadata como JSONB (permite armazenar dados de subworkflows)
ALTER TABLE "client_agents" 
ADD COLUMN IF NOT EXISTS "workflow_metadata" JSONB DEFAULT NULL;

-- Adicionar o campo n8n_workflow_id se ainda não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='client_agents' AND column_name='n8n_workflow_id') THEN
        ALTER TABLE "client_agents" ADD COLUMN "n8n_workflow_id" TEXT;
    END IF;
END $$;

-- Criar índice para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS "client_agents_n8n_workflow_id_idx" 
ON "client_agents" ("n8n_workflow_id");

-- Atualizar o schema cache do Supabase
NOTIFY pgrst, 'reload schema'; 