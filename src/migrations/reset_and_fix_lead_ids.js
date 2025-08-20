const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para redefinir e corrigir os lead_id na tabela contacts
 */
async function resetAndFixLeadIds() {
  try {
    logger.info('Iniciando redefinição e correção de lead_id na tabela contacts');
    
    // 1. Primeiro, limpar todos os lead_id existentes
    logger.info('Etapa 1: Limpando todos os lead_id existentes...');
    
    const { error: resetError } = await supabaseAdmin
      .from('contacts')
      .update({ lead_id: null })
      .neq('remote_jid', '');
    
    if (resetError) {
      throw new Error(`Erro ao limpar lead_ids: ${resetError.message}`);
    }
    
    logger.info('Todos os lead_id foram redefinidos com sucesso');
    
    // 2. Buscar todos os contatos agora com lead_id nulo
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('remote_jid');
    
    if (contactsError) {
      throw new Error(`Erro ao buscar contatos: ${contactsError.message}`);
    }
    
    logger.info(`Encontrados ${contacts.length} contatos para processar`);
    
    // 3. Buscar todos os leads para fazer um mapa de telefone -> lead_id
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('id, phone');
    
    if (leadsError) {
      throw new Error(`Erro ao buscar leads: ${leadsError.message}`);
    }
    
    const phoneToLeadMap = {};
    leads.forEach(lead => {
      phoneToLeadMap[lead.phone] = lead.id;
    });
    
    logger.info(`Mapeados ${Object.keys(phoneToLeadMap).length} números de telefone para lead_id`);
    
    // 4. Processar cada contato
    let successCount = 0;
    let notFoundCount = 0;
    let errors = 0;
    
    // Agrupar contatos por destinatário (segunda parte do remote_jid)
    const contactsByDestination = {};
    
    contacts.forEach(contact => {
      const parts = contact.remote_jid.split('_');
      if (parts.length === 2) {
        const destinationPhone = parts[1];
        if (!contactsByDestination[destinationPhone]) {
          contactsByDestination[destinationPhone] = [];
        }
        contactsByDestination[destinationPhone].push(contact.remote_jid);
      }
    });
    
    logger.info(`Contatos agrupados por ${Object.keys(contactsByDestination).length} números de destino diferentes`);
    
    // Para cada número de destino, atualizar todos os contatos correspondentes
    for (const [destinationPhone, contactList] of Object.entries(contactsByDestination)) {
      const leadId = phoneToLeadMap[destinationPhone];
      
      if (leadId) {
        // Atualizar todos os contatos com este número de destino
        try {
          const { error: updateError } = await supabaseAdmin
            .from('contacts')
            .update({ lead_id: leadId })
            .in('remote_jid', contactList);
          
          if (updateError) {
            logger.error(`Erro ao atualizar contatos para ${destinationPhone}: ${updateError.message}`);
            errors += contactList.length;
          } else {
            logger.info(`Atualizados ${contactList.length} contatos para o número ${destinationPhone} com lead_id ${leadId}`);
            successCount += contactList.length;
          }
        } catch (err) {
          logger.error(`Exceção ao atualizar contatos para ${destinationPhone}: ${err.message}`);
          errors += contactList.length;
        }
      } else {
        logger.warn(`Nenhum lead encontrado para o número de destino ${destinationPhone} (${contactList.length} contatos afetados)`);
        notFoundCount += contactList.length;
      }
    }
    
    // Verificar contatos que não foram encontrados em leads
    const totalProcessed = successCount + notFoundCount + errors;
    
    logger.info(`Migração concluída:
      - ${successCount} contatos atualizados com sucesso
      - ${notFoundCount} contatos sem lead correspondente
      - ${errors} contatos com erro na atualização
      - ${totalProcessed} contatos processados no total
    `);
    
    return {
      success: true,
      updated: successCount,
      notFound: notFoundCount,
      errors: errors,
      totalProcessed: totalProcessed
    };
  } catch (err) {
    logger.error(`Erro na migração: ${err.message}`);
    return {
      success: false,
      error: err.message
    };
  }
}

// Executar a migração se este script for chamado diretamente
if (require.main === module) {
  resetAndFixLeadIds()
    .then(result => {
      console.log('\nResultado da migração:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Erro fatal na migração:', err);
      process.exit(1);
    });
}

module.exports = resetAndFixLeadIds; 