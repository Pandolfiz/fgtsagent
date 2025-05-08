-- Criação da tabela de contatos
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER DEFAULT 0,
    online BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adiciona Políticas de Segurança para a tabela contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios contatos"
    ON public.contacts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios contatos"
    ON public.contacts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios contatos"
    ON public.contacts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios contatos"
    ON public.contacts FOR DELETE
    USING (auth.uid() = user_id);

-- Criação da tabela de mensagens
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para melhorar a performance de consultas
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver
    ON public.messages (sender_id, receiver_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
    ON public.messages (created_at);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id
    ON public.contacts (user_id);

CREATE INDEX IF NOT EXISTS idx_contacts_updated_at
    ON public.contacts (updated_at);

-- Adiciona Políticas de Segurança para a tabela messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver mensagens que enviaram ou receberam"
    ON public.messages FOR SELECT
    USING (
        auth.uid() = sender_id OR 
        EXISTS (
            SELECT 1 FROM public.contacts 
            WHERE id = receiver_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Usuários podem enviar mensagens"
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.contacts 
            WHERE id = receiver_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Usuários podem atualizar suas próprias mensagens"
    ON public.messages FOR UPDATE
    USING (auth.uid() = sender_id);

CREATE POLICY "Usuários podem deletar suas próprias mensagens"
    ON public.messages FOR DELETE
    USING (auth.uid() = sender_id);

-- Função para atualizar o timestamp de updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o timestamp de updated_at em contacts
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar o timestamp de updated_at em messages
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar a última mensagem no contato
CREATE OR REPLACE FUNCTION update_contact_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.contacts
    SET last_message = NEW.content,
        last_message_time = NEW.created_at,
        unread_count = CASE 
            WHEN user_id = NEW.sender_id THEN 0
            ELSE unread_count + 1
        END
    WHERE id = NEW.receiver_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar a última mensagem no contato
CREATE TRIGGER update_contact_last_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_contact_last_message(); 