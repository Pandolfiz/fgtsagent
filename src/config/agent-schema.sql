-- Schema para tabelas relacionadas a Agentes IA

-- Tabela principal de agentes
CREATE TABLE IF NOT EXISTS client_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    model VARCHAR(50) DEFAULT 'gpt-4',
    instructions TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para variáveis dos agentes
CREATE TABLE IF NOT EXISTS agent_variables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES client_agents(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    value TEXT NOT NULL,
    is_sensitive BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, name)
);

-- Tabela para histórico de interações
CREATE TABLE IF NOT EXISTS agent_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES client_agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    agent_response TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para logs de uso
CREATE TABLE IF NOT EXISTS agent_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES client_agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    operation VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Políticas de segurança para agentes
ALTER TABLE client_agents ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver seus próprios agentes
CREATE POLICY "Usuários podem ver seus próprios agentes"
ON client_agents
FOR SELECT USING (
    auth.uid() = user_id
);

-- Política: Usuários podem ver agentes de suas organizações
CREATE POLICY "Usuários podem ver agentes de suas organizações"
ON client_agents
FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
    )
);

-- Política: Usuários podem inserir seus próprios agentes
CREATE POLICY "Usuários podem inserir seus próprios agentes"
ON client_agents
FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

-- Política: Usuários podem atualizar seus próprios agentes
CREATE POLICY "Usuários podem atualizar seus próprios agentes"
ON client_agents
FOR UPDATE USING (
    auth.uid() = user_id
);

-- Política: Usuários podem excluir seus próprios agentes
CREATE POLICY "Usuários podem excluir seus próprios agentes"
ON client_agents
FOR DELETE USING (
    auth.uid() = user_id
);

-- RLS: Políticas de segurança para variáveis de agentes
ALTER TABLE agent_variables ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver variáveis de seus próprios agentes
CREATE POLICY "Usuários podem ver variáveis de seus próprios agentes"
ON agent_variables
FOR SELECT USING (
    agent_id IN (
        SELECT id FROM client_agents
        WHERE user_id = auth.uid()
    )
);

-- Política: Usuários podem inserir variáveis em seus próprios agentes
CREATE POLICY "Usuários podem inserir variáveis em seus próprios agentes"
ON agent_variables
FOR INSERT WITH CHECK (
    agent_id IN (
        SELECT id FROM client_agents
        WHERE user_id = auth.uid()
    )
);

-- Política: Usuários podem atualizar variáveis de seus próprios agentes
CREATE POLICY "Usuários podem atualizar variáveis de seus próprios agentes"
ON agent_variables
FOR UPDATE USING (
    agent_id IN (
        SELECT id FROM client_agents
        WHERE user_id = auth.uid()
    )
);

-- Política: Usuários podem excluir variáveis de seus próprios agentes
CREATE POLICY "Usuários podem excluir variáveis de seus próprios agentes"
ON agent_variables
FOR DELETE USING (
    agent_id IN (
        SELECT id FROM client_agents
        WHERE user_id = auth.uid()
    )
);

-- RLS: Políticas de segurança para interações com agentes
ALTER TABLE agent_interactions ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver interações com seus próprios agentes
CREATE POLICY "Usuários podem ver interações com seus próprios agentes"
ON agent_interactions
FOR SELECT USING (
    agent_id IN (
        SELECT id FROM client_agents
        WHERE user_id = auth.uid()
    )
);

-- Política: Usuários podem inserir interações com seus próprios agentes
CREATE POLICY "Usuários podem inserir interações com seus próprios agentes"
ON agent_interactions
FOR INSERT WITH CHECK (
    agent_id IN (
        SELECT id FROM client_agents
        WHERE user_id = auth.uid()
    ) AND auth.uid() = user_id
);

-- RLS: Políticas de segurança para logs de uso
ALTER TABLE agent_usage_logs ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver logs de uso de seus próprios agentes
CREATE POLICY "Usuários podem ver logs de uso de seus próprios agentes"
ON agent_usage_logs
FOR SELECT USING (
    agent_id IN (
        SELECT id FROM client_agents
        WHERE user_id = auth.uid()
    )
);

-- Função para atualizar o timestamp de atualização
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o timestamp em client_agents
CREATE TRIGGER update_client_agents_updated_at
BEFORE UPDATE ON client_agents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar o timestamp em agent_variables
CREATE TRIGGER update_agent_variables_updated_at
BEFORE UPDATE ON agent_variables
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 