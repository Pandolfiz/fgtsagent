require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

// ID do contato para correção
const contactId = '5527997186150_5527996115344';

async function fixContactData() {
  console.log('=== CORREÇÃO DE DADOS DO CONTATO ===');
  
  try {
    // 1. Verificar se o contato existe
    console.log(`\nVerificando contato ${contactId}...`);
    
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('remote_jid', contactId)
      .single();
    
    if (contactError) {
      console.error(`Erro: Contato não encontrado - ${contactError.message}`);
      return;
    }
    
    console.log(`Contato encontrado: ${contact.remote_jid}`);
    console.log(`Lead ID atual: ${contact.lead_id || 'NULL'}`);
    
    // 2. Verificar se existe pelo menos um lead no sistema
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('id')
      .limit(10);
    
    if (leadsError || !leads || leads.length === 0) {
      console.error('Erro: Nenhum lead encontrado no sistema.');
      console.log('Criando um lead de teste...');
      
      // Criar um lead de teste
      const { data: newLead, error: createLeadError } = await supabaseAdmin
        .from('leads')
        .insert([{
          name: 'Cliente de Teste',
          cpf: '12345678909',
          phone: contactId.split('_')[1],
          email: 'teste@exemplo.com',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (createLeadError) {
        console.error(`Erro ao criar lead: ${createLeadError.message}`);
        return;
      }
      
      console.log(`Lead criado com sucesso. ID: ${newLead.id}`);
      
      // Atualizar o contato com o novo lead_id
      const leadId = newLead.id;
      const { error: updateContactError } = await supabaseAdmin
        .from('contacts')
        .update({ lead_id: leadId })
        .eq('remote_jid', contactId);
      
      if (updateContactError) {
        console.error(`Erro ao atualizar contato: ${updateContactError.message}`);
        return;
      }
      
      console.log(`Contato atualizado com o lead_id: ${leadId}`);
      
      // Usar o leadId para as próximas operações
      contact.lead_id = leadId;
    } 
    // Se o contato não tem lead_id, atribuir um dos leads existentes
    else if (!contact.lead_id) {
      const leadId = leads[0].id;
      console.log(`Associando contato ao lead_id: ${leadId}`);
      
      const { error: updateContactError } = await supabaseAdmin
        .from('contacts')
        .update({ lead_id: leadId })
        .eq('remote_jid', contactId);
      
      if (updateContactError) {
        console.error(`Erro ao atualizar contato: ${updateContactError.message}`);
        return;
      }
      
      console.log(`Contato atualizado com o lead_id: ${leadId}`);
      
      // Atualizar lead_id no objeto de contato
      contact.lead_id = leadId;
    }
    
    // 3. Verificar se existem registros de saldo para o lead
    if (contact.lead_id) {
      console.log(`\nVerificando registros de saldo para lead_id: ${contact.lead_id}`);
      
      const { data: balanceRecords, error: balanceError } = await supabaseAdmin
        .from('balance')
        .select('*')
        .eq('lead_id', contact.lead_id);
      
      if (balanceError) {
        console.error(`Erro ao buscar registros de saldo: ${balanceError.message}`);
      } else if (!balanceRecords || balanceRecords.length === 0) {
        console.log('Nenhum registro de saldo encontrado. Criando...');
        
        // Criar registro de saldo
        const { error: createBalanceError } = await supabaseAdmin
          .from('balance')
          .insert([{
            lead_id: contact.lead_id,
            balance: 12500.50,
            simulation: 8750.25,
            updated_at: new Date().toISOString()
          }]);
        
        if (createBalanceError) {
          console.error(`Erro ao criar registro de saldo: ${createBalanceError.message}`);
        } else {
          console.log('Registro de saldo criado com sucesso!');
        }
      } else {
        console.log(`Encontrados ${balanceRecords.length} registros de saldo.`);
        
        // Verificar se há valores válidos
        const lastBalanceRecord = balanceRecords[0];
        const hasValidBalance = lastBalanceRecord.balance !== null && lastBalanceRecord.balance !== undefined;
        const hasValidsimulation = lastBalanceRecord.simulation !== null && lastBalanceRecord.simulation !== undefined;
        
        if (!hasValidBalance || !hasValidsimulation) {
          console.log('Atualizando registro de saldo com valores válidos...');
          
          const { error: updateBalanceError } = await supabaseAdmin
            .from('balance')
            .update({
              balance: 15800.75,
              simulation: 9600.25,
              updated_at: new Date().toISOString()
            })
            .eq('id', lastBalanceRecord.id);
          
          if (updateBalanceError) {
            console.error(`Erro ao atualizar registro de saldo: ${updateBalanceError.message}`);
          } else {
            console.log('Registro de saldo atualizado com sucesso!');
          }
        } else {
          console.log('Os registros de saldo já possuem valores válidos.');
          console.log(`- Balance: ${lastBalanceRecord.balance}`);
          console.log(`- simulation: ${lastBalanceRecord.simulation}`);
        }
      }
      
      // 4. Criar proposta de teste se não existir
      console.log('\nVerificando propostas...');
      
      const { data: proposalRecords, error: proposalError } = await supabaseAdmin
        .from('proposals')
        .select('*')
        .eq('lead_id', contact.lead_id);
      
      if (proposalError) {
        console.error(`Erro ao buscar propostas: ${proposalError.message}`);
      } else if (!proposalRecords || proposalRecords.length === 0) {
        console.log('Nenhuma proposta encontrada. Criando proposta de teste...');
        
        // Criar proposta de teste
        const { error: createProposalError } = await supabaseAdmin
          .from('proposals')
          .insert([{
            lead_id: contact.lead_id,
            proposal_id: `PROP-${Math.floor(Math.random() * 10000)}`,
            status: 'em_analise',
            created_at: new Date().toISOString()
          }]);
        
        if (createProposalError) {
          console.error(`Erro ao criar proposta: ${createProposalError.message}`);
        } else {
          console.log('Proposta criada com sucesso!');
        }
      } else {
        console.log(`Encontradas ${proposalRecords.length} propostas.`);
      }
    }
    
    console.log('\n=== CORREÇÃO FINALIZADA ===');
    console.log('Agora teste a API com o endpoint: /api/contacts/' + contactId + '/data');
    
  } catch (error) {
    console.error('Erro fatal:', error);
  }
}

// Executar a correção
fixContactData()
  .then(() => {
    console.log('\nProcesso concluído.');
  })
  .catch(error => {
    console.error('Erro na execução:', error);
  }); 