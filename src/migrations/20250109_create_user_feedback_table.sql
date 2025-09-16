-- Migration: Criar tabela para feedback dos usuários
-- Data: 2025-01-09
-- Descrição: Tabela para armazenar solicitações de funcionalidades e reportes de bugs

CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('feature', 'bug')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'in_progress', 'completed', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_priority ON user_feedback(priority);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_user_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_feedback_updated_at
    BEFORE UPDATE ON user_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_user_feedback_updated_at();

-- Comentários na tabela e colunas
COMMENT ON TABLE user_feedback IS 'Tabela para armazenar feedback dos usuários (funcionalidades e bugs)';
COMMENT ON COLUMN user_feedback.id IS 'ID único do feedback';
COMMENT ON COLUMN user_feedback.user_id IS 'ID do usuário que enviou o feedback';
COMMENT ON COLUMN user_feedback.type IS 'Tipo do feedback: feature (funcionalidade) ou bug';
COMMENT ON COLUMN user_feedback.title IS 'Título do feedback (máximo 200 caracteres)';
COMMENT ON COLUMN user_feedback.description IS 'Descrição detalhada do feedback';
COMMENT ON COLUMN user_feedback.priority IS 'Prioridade: low, medium ou high';
COMMENT ON COLUMN user_feedback.status IS 'Status do feedback: pending, in_review, in_progress, completed, rejected';
COMMENT ON COLUMN user_feedback.admin_notes IS 'Notas internas da equipe de desenvolvimento';
COMMENT ON COLUMN user_feedback.created_at IS 'Data de criação do feedback';
COMMENT ON COLUMN user_feedback.updated_at IS 'Data da última atualização do feedback';
