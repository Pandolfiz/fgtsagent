const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script de migração corrigido para preencher a coluna lead_id na tabela contacts
 * Analisa corretamente o formato do remote_jid para buscar o lead correspondente
 */
async function updateContactsLeadIdFixed() {
  try {
    logger.info('[CORREÇÃO] Iniciando migração corrigida para preencher lead_id na tabela contacts');
    
    // 1. Buscar todos os contatos
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('remote_jid, lead_id');
    
    if (contactsError) {
      throw new Error(`Erro ao buscar contatos: ${contactsError.message}`);
    }
    
    logger.info(`Encontrados ${contacts.length} contatos para analisar`);
    
    // 2. Mapear os contatos em grupos baseados na estrutura do remote_jid
    const contactGroups = {
      'normal': [], // Contatos com remote_jid no formato padrão XXXXXXXXXX_YYYYYYYYYY
      'mesmoNumero': [], // Contatos onde o número é igual nas duas partes
      'semSegundaParte': [], // Contatos onde não há segunda parte
      'outroFormato': [], // Contatos com outro formato
      'jaPreenchidos': [] // Contatos que já têm lead_id
    };
    
    contacts.forEach(contact => {
      // Se já tem lead_id, apenas contabilizar
      if (contact.lead_id) {
        contactGroups.jaPreenchidos.push(contact);
        return;
      }
      
      const parts = contact.remote_jid.split('_');
      
      if (parts.length !== 2) {
        contactGroups.outroFormato.push(contact);
      } else if (parts[0] === parts[1]) {
        contactGroups.mesmoNumero.push(contact);
      } else {
        contactGroups.normal.push(contact);
      }
    });
    
    logger.info(`Análise de contatos:
      - Formato padrão (XXXX_YYYY): ${contactGroups.normal.length}
      - Mesmo número (XXXX_XXXX): ${contactGroups.mesmoNumero.length}
      - Outro formato: ${contactGroups.outroFormato.length}
      - Já preenchidos: ${contactGroups.jaPreenchidos.length}
    `);
    
    // 3. Para os contatos normais, buscar leads usando ambas as partes do telefone
    let updatedCount = 0;
    let notFoundCount = 0;
    
    // Primeiro buscar todos os leads para fazer mapeamento local
    const { data: allLeads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('id, phone');
    
    if (leadsError) {
      throw new Error(`Erro ao buscar leads: ${leadsError.message}`);
    }
    
    // Criar um mapa de telefone -> lead_id para buscas mais rápidas
    const phoneToLeadMap = {};
    allLeads.forEach(lead => {
      phoneToLeadMap[lead.phone] = lead.id;
    });
    
    logger.info(`Mapeados ${Object.keys(phoneToLeadMap).length} leads por telefone`);
    
    // Processar contatos em formato normal (XXXX_YYYY)
    const updatePromises = contactGroups.normal.map(async (contact) => {
      try {
        const [firstPhone, secondPhone] = contact.remote_jid.split('_');
        
        // Tentar encontrar um lead usando a segunda parte do remote_jid (destinatário)
        let leadId = phoneToLeadMap[secondPhone];
        
        // Se não encontrou com a segunda parte, tentar com a primeira (remetente)
        if (!leadId) {
          leadId = phoneToLeadMap[firstPhone];
        }
        
        if (!leadId) {
          logger.warn(`Nenhum lead encontrado para o contato ${contact.remote_jid} (telefones: ${firstPhone}, ${secondPhone})`);
          notFoundCount++;
          return;
        }
        
        // Atualizar o contato com o lead_id encontrado
        const { error: updateError } = await supabaseAdmin
          .from('contacts')
          .update({ lead_id: leadId })
          .eq('remote_jid', contact.remote_jid);
        
        if (updateError) {
          throw new Error(`Erro ao atualizar contato ${contact.remote_jid}: ${updateError.message}`);
        }
        
        logger.info(`Contato ${contact.remote_jid} atualizado com lead_id ${leadId} (telefone encontrado: ${leadId === phoneToLeadMap[secondPhone] ? secondPhone : firstPhone})`);
        updatedCount++;
      } catch (err) {
        logger.error(`Erro ao processar contato ${contact.remote_jid}: ${err.message}`);
      }
    });
    
    // Processar contatos com mesmo número nas duas partes
    const sameNumberPromises = contactGroups.mesmoNumero.map(async (contact) => {
      try {
        const phone = contact.remote_jid.split('_')[0]; // Ambas as partes são iguais
        
        const leadId = phoneToLeadMap[phone];
        
        if (!leadId) {
          logger.warn(`Nenhum lead encontrado para o contato ${contact.remote_jid} (telefone: ${phone})`);
          notFoundCount++;
          return;
        }
        
        // Atualizar o contato com o lead_id encontrado
        const { error: updateError } = await supabaseAdmin
          .from('contacts')
          .update({ lead_id: leadId })
          .eq('remote_jid', contact.remote_jid);
        
        if (updateError) {
          throw new Error(`Erro ao atualizar contato ${contact.remote_jid}: ${updateError.message}`);
        }
        
        logger.info(`Contato ${contact.remote_jid} (mesmo número) atualizado com lead_id ${leadId}`);
        updatedCount++;
      } catch (err) {
        logger.error(`Erro ao processar contato com mesmo número ${contact.remote_jid}: ${err.message}`);
      }
    });
    
    // Aguardar todas as atualizações
    await Promise.all([...updatePromises, ...sameNumberPromises]);
    
    logger.info(`Migração corrigida concluída: 
      - ${updatedCount} contatos atualizados
      - ${notFoundCount} sem leads correspondentes
      - ${contactGroups.jaPreenchidos.length} já estavam preenchidos
    `);
    
    return {
      success: true,
      updatedCount,
      notFoundCount,
      alreadyFilled: contactGroups.jaPreenchidos.length,
      totalProcessed: contacts.length
    };
  } catch (err) {
    logger.error(`Erro na migração corrigida de lead_id: ${err.message}`);
    return {
      success: false,
      error: err.message
    };
  }
}

// Executar a migração se este script for chamado diretamente
if (require.main === module) {
  updateContactsLeadIdFixed()
    .then(result => {
      console.log('Resultado da migração corrigida:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Erro fatal na migração corrigida:', err);
      process.exit(1);
    });
}

module.exports = updateContactsLeadIdFixed; 