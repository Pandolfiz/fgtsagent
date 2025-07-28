-- Migração para adicionar campos da Meta API na tabela whatsapp_credentials
-- Executar apenas se os campos não existirem

-- Adicionar campo wpp_access_token se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'whatsapp_credentials' 
        AND column_name = 'wpp_access_token'
    ) THEN
        ALTER TABLE whatsapp_credentials 
        ADD COLUMN wpp_access_token TEXT;
        
        RAISE NOTICE 'Campo wpp_access_token adicionado à tabela whatsapp_credentials';
    ELSE
        RAISE NOTICE 'Campo wpp_access_token já existe na tabela whatsapp_credentials';
    END IF;
END $$;

-- Adicionar campo wpp_number_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'whatsapp_credentials' 
        AND column_name = 'wpp_number_id'
    ) THEN
        ALTER TABLE whatsapp_credentials 
        ADD COLUMN wpp_number_id TEXT;
        
        RAISE NOTICE 'Campo wpp_number_id adicionado à tabela whatsapp_credentials';
    ELSE
        RAISE NOTICE 'Campo wpp_number_id já existe na tabela whatsapp_credentials';
    END IF;
END $$;

-- Adicionar campo status se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'whatsapp_credentials' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE whatsapp_credentials 
        ADD COLUMN status TEXT DEFAULT 'aguardando_configuracao';
        
        RAISE NOTICE 'Campo status adicionado à tabela whatsapp_credentials';
    ELSE
        RAISE NOTICE 'Campo status já existe na tabela whatsapp_credentials';
    END IF;
END $$;

-- Verificar estrutura atual da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'whatsapp_credentials' 
ORDER BY ordinal_position; 