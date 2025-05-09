/**
 * Script para limpeza de credenciais duplicadas no banco de dados
 * Este script identifica e remove registros duplicados de credenciais do WhatsApp,
 * mantendo apenas o registro mais recente para cada usuário.
 */
require('dotenv').config();
const { supabase } = require('../src/lib/supabaseClient');

/**
 * Função principal para limpar credenciais duplicadas
 */
async function cleanupDuplicateCredentials() {
  console.log('Iniciando limpeza de credenciais duplicadas...');
  
  try {
    // 1. Obter todos os client_ids únicos que possuem credenciais
    const { data: clientIds, error: clientError } = await supabase
      .from('whatsapp_credentials')
      .select('client_id')
      .not('client_id', 'is', null);
    
    if (clientError) {
      console.error('Erro ao buscar client_ids:', clientError.message);
      process.exit(1);
    }
    
    // Criar array de IDs únicos
    const uniqueClientIds = [...new Set(clientIds.map(item => item.client_id))];
    console.log(`Encontrados ${uniqueClientIds.length} usuários com credenciais.`);
    
    // 2. Para cada cliente, verificar se há duplicatas
    for (const clientId of uniqueClientIds) {
      // Obter todos os registros para este cliente, ordenados do mais recente ao mais antigo
      const { data: credentials, error } = await supabase
        .from('whatsapp_credentials')
        .select('id, updated_at, created_at')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error(`Erro ao buscar credenciais para o cliente ${clientId}:`, error.message);
        continue;
      }
      
      if (credentials.length <= 1) {
        console.log(`Cliente ${clientId}: Nenhuma duplicata encontrada.`);
        continue;
      }
      
      console.log(`Cliente ${clientId}: Encontradas ${credentials.length} credenciais. Mantendo a mais recente.`);
      
      // O primeiro elemento é o mais recente (devido à ordenação)
      const latestCredential = credentials[0];
      const duplicateIds = credentials.slice(1).map(cred => cred.id);
      
      // Remover as credenciais duplicadas
      if (duplicateIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('whatsapp_credentials')
          .delete()
          .in('id', duplicateIds);
          
        if (deleteError) {
          console.error(`Erro ao excluir duplicatas para o cliente ${clientId}:`, deleteError.message);
        } else {
          console.log(`Cliente ${clientId}: Removidas ${duplicateIds.length} credenciais duplicadas.`);
        }
      }
    }
    
    console.log('Limpeza de credenciais concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante o processo de limpeza:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Executar a função principal
cleanupDuplicateCredentials(); 