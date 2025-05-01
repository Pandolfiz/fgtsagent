-- Habilitar a extensão pgvector se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pgvector;

-- Criar tabela agent_knowledge para armazenar embeddings de forma segura e isolada
CREATE TABLE IF NOT EXISTS agent_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES client_agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536),  -- Dimensão para embeddings OpenAI (ajustar conforme necessário)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS agent_knowledge_agent_id_idx ON agent_knowledge(agent_id);
CREATE INDEX IF NOT EXISTS agent_knowledge_organization_id_idx ON agent_knowledge(organization_id);
CREATE INDEX IF NOT EXISTS agent_knowledge_updated_at_idx ON agent_knowledge(updated_at);

-- Criar índice de vetor para buscas por similaridade
CREATE INDEX IF NOT EXISTS agent_knowledge_embedding_idx ON agent_knowledge USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Habilitar Row Level Security (RLS)
ALTER TABLE agent_knowledge ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança baseadas em organização
-- Política para leitura: apenas membros da organização
CREATE POLICY "Usuários podem ver conhecimentos de agentes de suas organizações"
  ON agent_knowledge FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  ));

-- Política para escrita: apenas membros da organização
CREATE POLICY "Usuários podem adicionar conhecimentos em suas organizações"
  ON agent_knowledge FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  ));

-- Política para atualização: apenas membros da organização
CREATE POLICY "Usuários podem atualizar conhecimentos em suas organizações"
  ON agent_knowledge FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  ));

-- Política para exclusão: apenas membros da organização
CREATE POLICY "Usuários podem remover conhecimentos em suas organizações"
  ON agent_knowledge FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  ));

-- Função para buscar documentos similares a um embedding
CREATE OR REPLACE FUNCTION search_agent_knowledge(
  agent_id_param UUID,
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.content,
    k.metadata,
    1 - (k.embedding <-> query_embedding) AS similarity
  FROM
    agent_knowledge k
  WHERE
    k.agent_id = agent_id_param
    AND 1 - (k.embedding <-> query_embedding) > match_threshold
  ORDER BY
    k.embedding <-> query_embedding
  LIMIT
    match_count;
END;
$$; 