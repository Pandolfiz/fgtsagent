CREATE TABLE IF NOT EXISTS "templates" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "configuration" JSONB DEFAULT '{}',
  "n8n_workflow_id" TEXT,
  "workflow_json" JSONB,
  "is_public" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE "templates" ENABLE ROW LEVEL SECURITY;

-- Política de leitura para templates (todos podem ver templates públicos)
CREATE POLICY "Templates públicos são visíveis para todos" 
ON "templates"
FOR SELECT
USING (
  is_public = true
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS "templates_category_idx" ON "templates" ("category");
CREATE INDEX IF NOT EXISTS "templates_is_public_idx" ON "templates" ("is_public");
CREATE INDEX IF NOT EXISTS "templates_n8n_workflow_id_idx" ON "templates" ("n8n_workflow_id");
