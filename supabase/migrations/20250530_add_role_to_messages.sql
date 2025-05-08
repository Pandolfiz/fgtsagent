-- Migração para adicionar a coluna 'role' na tabela messages
-- Data: 2025-05-30

-- Adicionar coluna 'role' como TEXT com valores permitidos 'ME', 'AI', 'USER'
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS "role" TEXT;

-- Criar um comentário na coluna explicando o propósito
COMMENT ON COLUMN public.messages.role IS 'Define o papel da mensagem: ME (usuário), AI (assistente), USER (cliente)';

-- Adicionar constraint para garantir que o valor seja um dos três permitidos
ALTER TABLE public.messages
ADD CONSTRAINT chk_message_role 
CHECK (role IS NULL OR role IN ('ME', 'AI', 'USER'));

-- Criar índice para melhorar consultas com filtro por role
CREATE INDEX IF NOT EXISTS idx_messages_role
ON public.messages (role);

-- Atualizar o schema cache do Supabase
NOTIFY pgrst, 'reload schema'; 