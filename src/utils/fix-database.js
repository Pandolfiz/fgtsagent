/**
 * Script para verificar e corrigir a estrutura do banco de dados
 * Este script deve ser executado uma vez para garantir que as tabelas estejam corretas
 */
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

async function verifyAndFixDatabase() {
  try {
    console.log('Iniciando verificação e correção do banco de dados...');
    
    // 1. Verificar se a tabela user_profiles existe
    const { data: userProfilesTable, error: tableError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.log('Criando a tabela user_profiles...');
      
      // A tabela não existe ou está com problemas, vamos criar/recriar
      await supabaseAdmin.rpc('exec_sql', { 
        sql: `
          -- Drop table if exists
          DROP TABLE IF EXISTS public.user_profiles;
          
          -- Create the table
          CREATE TABLE public.user_profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            full_name TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Enable RLS
          ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
          
          -- Create policies
          CREATE POLICY "Users can view their own profile" 
            ON public.user_profiles FOR SELECT 
            USING (auth.uid() = id);
          
          CREATE POLICY "Users can update their own profile" 
            ON public.user_profiles FOR UPDATE 
            USING (auth.uid() = id);
          
          CREATE POLICY "Service role can insert" 
            ON public.user_profiles FOR INSERT 
            WITH CHECK (true);
        `
      });
      
      console.log('Tabela user_profiles criada com sucesso!');
    } else {
      console.log('Tabela user_profiles já existe!');
    }
    
    // 2. Verificar se a tabela organization_members está correta
    try {
      // Tentar corrigir as políticas da tabela organization_members
      await supabaseAdmin.rpc('exec_sql', { 
        sql: `
          -- Update policies for organization_members to avoid recursive policies
          DROP POLICY IF EXISTS "Members can view their organizations" ON public.organization_members;
          CREATE POLICY "Members can view their organizations" 
            ON public.organization_members FOR SELECT 
            USING (auth.uid() = user_id);
          
          DROP POLICY IF EXISTS "Members can update their own status" ON public.organization_members;
          CREATE POLICY "Members can update their own status" 
            ON public.organization_members FOR UPDATE 
            USING (auth.uid() = user_id);
        `
      });
      
      console.log('Políticas da tabela organization_members atualizadas!');
    } catch (policyError) {
      console.error('Erro ao atualizar políticas da tabela organization_members:', policyError.message);
    }
    
    console.log('Verificação e correção do banco de dados concluída!');
    return true;
  } catch (error) {
    console.error('Erro ao verificar/corrigir o banco de dados:', error.message);
    return false;
  }
}

// Se executado diretamente
if (require.main === module) {
  verifyAndFixDatabase()
    .then(success => {
      if (success) {
        console.log('Banco de dados verificado e corrigido com sucesso!');
      } else {
        console.error('Falha ao verificar/corrigir o banco de dados.');
      }
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Erro não tratado:', err);
      process.exit(1);
    });
} else {
  // Exportar a função para ser usada em outros módulos
  module.exports = verifyAndFixDatabase;
} 