-- Script para configurar Supabase Real-time
-- Execute estes comandos no SQL Editor do Supabase Dashboard

-- 1. Verificar publicação atual
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- 2. Adicionar tabelas à publicação (se não estiverem incluídas)
ALTER PUBLICATION supabase_realtime ADD TABLE balance;
ALTER PUBLICATION supabase_realtime ADD TABLE proposals;

-- 3. Verificar se foram adicionadas
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('balance', 'proposals');

-- 4. Verificar se RLS está configurado corretamente
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('balance', 'proposals');
