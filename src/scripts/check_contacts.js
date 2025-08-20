const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

async function checkContacts() {
  try {
    logger.info('Verificando contatos na conversa atual...');
    
    // Buscar contato específico mostrado na screenshot (número 5527996115344)
    const { data: specificContact, error: specificError } = await supabaseAdmin
      .from('contacts')
      .select('remote_jid, lead_id')
      .eq('remote_jid', '5527997186150_5527996115344')
      .single();
    
    if (specificError) {
      logger.error(`Erro ao buscar contato específico: ${specificError.message}`);
    } else if (specificContact) {
      logger.info(`Dados do contato específico: ${JSON.stringify(specificContact)}`);
      
      // Se o contato tem lead_id, verificar detalhes do lead
      if (specificContact.lead_id) {
        const { data: leadData, error: leadError } = await supabaseAdmin
          .from('leads')
          .select('*')
          .eq('id', specificContact.lead_id)
          .single();
        
        if (leadError) {
          logger.error(`Erro ao buscar lead ${specificContact.lead_id}: ${leadError.message}`);
        } else {
          logger.info(`Dados do lead: ${JSON.stringify(leadData)}`);
          
          // Verificar se o lead tem dados nas tabelas relacionadas
          // 1. Saldo
          const { data: balanceData, error: balanceError } = await supabaseAdmin
            .from('balance')
            .select('*')
            .eq('lead_id', specificContact.lead_id)
            .order('updated_at', { ascending: false })
            .limit(1);
          
          if (balanceError) {
            logger.error(`Erro ao buscar saldo para lead ${specificContact.lead_id}: ${balanceError.message}`);
          } else {
            logger.info(`Dados de saldo: ${JSON.stringify(balanceData)}`);
          }
          
          // 2. Simulação
          const { data: simData, error: simError } = await supabaseAdmin
            .from('simulations')
            .select('*')
            .eq('lead_id', specificContact.lead_id)
            .order('updated_at', { ascending: false })
            .limit(1);
          
          if (simError) {
            logger.error(`Erro ao buscar simulação para lead ${specificContact.lead_id}: ${simError.message}`);
          } else {
            logger.info(`Dados de simulação: ${JSON.stringify(simData)}`);
          }
          
          // 3. Proposta
          const { data: proposalData, error: proposalError } = await supabaseAdmin
            .from('proposals')
            .select('*')
            .eq('lead_id', specificContact.lead_id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (proposalError) {
            logger.error(`Erro ao buscar proposta para lead ${specificContact.lead_id}: ${proposalError.message}`);
          } else {
            logger.info(`Dados de proposta: ${JSON.stringify(proposalData)}`);
          }
        }
      } else {
        logger.warn(`Contato ${specificContact.remote_jid} não possui lead_id associado`);
      }
    } else {
      logger.warn('Contato específico não encontrado');
    }
    
    // Buscar todos os contatos recentes
    const { data: recentContacts, error: recentError } = await supabaseAdmin
      .from('contacts')
      .select('remote_jid, lead_id')
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (recentError) {
      logger.error(`Erro ao buscar contatos recentes: ${recentError.message}`);
    } else {
      logger.info(`Encontrados ${recentContacts.length} contatos recentes`);
      
      for (const contact of recentContacts) {
        logger.info(`Contato: ${contact.remote_jid}, Lead ID: ${contact.lead_id || 'NENHUM'}`);
      }
    }
    
    return { success: true };
  } catch (error) {
    logger.error(`Erro na verificação de contatos: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  checkContacts()
    .then(result => {
      console.log('Verificação concluída:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Erro fatal:', err);
      process.exit(1);
    });
}

module.exports = checkContacts; 