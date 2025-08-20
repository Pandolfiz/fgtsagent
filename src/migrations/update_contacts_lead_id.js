const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script de migração para preencher a coluna lead_id na tabela contacts
 * com base no número de telefone extraído do remote_jid
 */
async function updateContactsLeadId() {
  try {
    logger.info('Iniciando migração para preencher lead_id na tabela contacts');
    
    // 1. Buscar todos os contatos que ainda não têm lead_id
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('remote_jid')
      .is('lead_id', null);
    
    if (contactsError) {
      throw new Error(`Erro ao buscar contatos: ${contactsError.message}`);
    }
    
    logger.info(`Encontrados ${contacts.length} contatos para atualizar`);
    
    // 2. Para cada contato, extrair o número de telefone e buscar o lead correspondente
    let updatedCount = 0;
    let notFoundCount = 0;
    const updatePromises = contacts.map(async (contact) => {
      try {
        // Extrair o número do telefone do remote_jid (formato: TELEFONE_OUTRAINFO)
        const contactPhone = contact.remote_jid.split('_')[0];
        logger.info(`Processando contato ${contact.remote_jid} com telefone ${contactPhone}`);
        
        // Buscar o lead correspondente pelo telefone
        const { data: lead, error: leadError } = await supabaseAdmin
          .from('leads')
          .select('id')
          .eq('phone', contactPhone)
          .single();
        
        if (leadError || !lead) {
          logger.warn(`Lead não encontrado para o contato ${contact.remote_jid} (telefone: ${contactPhone})`);
          notFoundCount++;
          return;
        }
        
        // Atualizar o contato com o lead_id encontrado
        const { error: updateError } = await supabaseAdmin
          .from('contacts')
          .update({ lead_id: lead.id })
          .eq('remote_jid', contact.remote_jid);
        
        if (updateError) {
          throw new Error(`Erro ao atualizar contato ${contact.remote_jid}: ${updateError.message}`);
        }
        
        logger.info(`Contato ${contact.remote_jid} atualizado com lead_id ${lead.id}`);
        updatedCount++;
      } catch (err) {
        logger.error(`Erro ao processar contato ${contact.remote_jid}: ${err.message}`);
      }
    });
    
    // Aguardar todas as atualizações
    await Promise.all(updatePromises);
    
    logger.info(`Migração concluída: ${updatedCount} contatos atualizados, ${notFoundCount} sem leads correspondentes`);
    
    return {
      success: true,
      updatedCount,
      notFoundCount,
      totalProcessed: contacts.length
    };
  } catch (err) {
    logger.error(`Erro na migração de lead_id: ${err.message}`);
    return {
      success: false,
      error: err.message
    };
  }
}

// Executar a migração se este script for chamado diretamente
if (require.main === module) {
  updateContactsLeadId()
    .then(result => {
      console.log('Resultado da migração:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Erro fatal na migração:', err);
      process.exit(1);
    });
}

module.exports = updateContactsLeadId; 