-- Script principal para resetar o banco de dados do Supabase
-- Este script irá executar todos os outros na ordem correta

\echo 'Iniciando reset do banco de dados...'

-- Etapa 1: Remover e recriar estrutura de tabelas
\echo 'Etapa 1: Recriando estrutura de tabelas...'
\i 01-schema.sql

-- Etapa 2: Aplicar políticas de segurança (RLS)
\echo 'Etapa 2: Configurando políticas de segurança...'
\i 02-policies.sql

-- Etapa 3: Criar funções RPC
\echo 'Etapa 3: Criando funções RPC...'
\i 03-functions.sql

-- Etapa 4: Inserir dados iniciais
\echo 'Etapa 4: Inserindo dados iniciais...'
\i 04-data.sql

\echo 'Reset do banco de dados concluído com sucesso!' 