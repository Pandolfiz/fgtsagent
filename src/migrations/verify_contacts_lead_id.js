const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para verificar os lead_id atribuídos aos contatos
 */
async function verifyContactsLeadId() {
  try {
    logger.info('Iniciando verificação dos lead_id na tabela contacts');
    
    // Buscar todos os contatos com lead_id
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('remote_jid, lead_id');
    
    if (contactsError) {
      throw new Error(`Erro ao buscar contatos: ${contactsError.message}`);
    }
    
    logger.info(`Encontrados ${contacts.length} contatos para verificar`);
    
    // Mapear lead_ids únicos e contagem
    const leadIdCounts = {};
    const leadIds = new Set();
    
    contacts.forEach(contact => {
      if (contact.lead_id) {
        leadIds.add(contact.lead_id);
        leadIdCounts[contact.lead_id] = (leadIdCounts[contact.lead_id] || 0) + 1;
      }
    });
    
    logger.info(`Análise de lead_id:
      - Total de contatos: ${contacts.length}
      - Contatos com lead_id: ${contacts.filter(c => c.lead_id).length}
      - Lead IDs únicos: ${leadIds.size}
    `);
    
    // Mostrar a distribuição de lead_ids
    console.log("\nDistribuição de lead_ids:");
    Object.entries(leadIdCounts)
      .sort((a, b) => b[1] - a[1]) // Ordenar do mais frequente para o menos frequente
      .forEach(([leadId, count]) => {
        console.log(`- Lead ID: ${leadId} - ${count} contatos`);
      });
    
    // Buscar alguns exemplos de contatos para cada lead_id
    console.log("\nExemplos de contatos por lead_id:");
    for (const leadId of leadIds) {
      const examples = contacts
        .filter(c => c.lead_id === leadId)
        .slice(0, 3) // Mostrar até 3 exemplos
        .map(c => c.remote_jid);
      
      console.log(`- Lead ID: ${leadId}`);
      console.log(`  Exemplos: ${examples.join(', ')}`);
    }
    
    // Verificar os leads na tabela leads
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('id, phone')
      .in('id', Array.from(leadIds));
    
    if (leadsError) {
      throw new Error(`Erro ao buscar leads: ${leadsError.message}`);
    }
    
    console.log("\nInformações dos leads correspondentes:");
    leads.forEach(lead => {
      const count = leadIdCounts[lead.id] || 0;
      console.log(`- Lead ID: ${lead.id}`);
      console.log(`  Telefone: ${lead.phone}`);
      console.log(`  Contatos associados: ${count}`);
    });
    
    return {
      success: true,
      totalContacts: contacts.length,
      contactsWithLeadId: contacts.filter(c => c.lead_id).length,
      uniqueLeadIds: leadIds.size
    };
  } catch (err) {
    logger.error(`Erro na verificação de lead_id: ${err.message}`);
    return {
      success: false,
      error: err.message
    };
  }
}

// Executar a verificação se este script for chamado diretamente
if (require.main === module) {
  verifyContactsLeadId()
    .then(result => {
      console.log('\nResultado da verificação:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Erro fatal na verificação:', err);
      process.exit(1);
    });
}

module.exports = verifyContactsLeadId; 