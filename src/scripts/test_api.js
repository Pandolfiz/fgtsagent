const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

async function testContactDataApi() {
  try {
    logger.info('Verificando dados do contato...');
    
    // Obter dados do contato diretamente do banco de dados para teste
    const contactId = '5527997186150_5527996115344';
    
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('remote_jid, lead_id')
      .eq('remote_jid', contactId)
      .single();
    
    if (contactError) {
      throw new Error(`Erro ao buscar contato: ${contactError.message}`);
    }
    
    logger.info(`Contato encontrado: ${JSON.stringify(contact)}`);
    
    if (!contact.lead_id) {
      throw new Error(`Contato não possui lead_id associado`);
    }
    
    logger.info(`Lead ID do contato: ${contact.lead_id}`);
    
    // Buscar dados do lead
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', contact.lead_id)
      .single();
    
    if (leadError) {
      throw new Error(`Erro ao buscar lead: ${leadError.message}`);
    }
    
    logger.info(`Lead encontrado: ${JSON.stringify(lead)}`);
    
    // Buscar dados de saldo
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .from('balance')
      .select('*')
      .eq('lead_id', contact.lead_id)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (balanceError) {
      throw new Error(`Erro ao buscar saldo: ${balanceError.message}`);
    }
    
    // Log detalhado dos tipos de dados
    if (balanceData && balanceData.length > 0) {
      const record = balanceData[0];
      logger.info('Análise detalhada do registro balance:');
      logger.info(`- balance: ${record.balance} (tipo: ${typeof record.balance})`);
      logger.info(`- simulation: ${record.simulation} (tipo: ${typeof record.simulation})`);
      
      // Tentar converter explicitamente para ver se há problemas
      try {
        const balanceNum = parseFloat(record.balance);
        const simulationNum = parseFloat(record.simulation);
        logger.info(`- balance convertido: ${balanceNum} (tipo: ${typeof balanceNum}, isNaN: ${isNaN(balanceNum)})`);
        logger.info(`- simulation convertido: ${simulationNum} (tipo: ${typeof simulationNum}, isNaN: ${isNaN(simulationNum)})`);
      } catch (e) {
        logger.error(`Erro ao converter: ${e.message}`);
      }
    }
    
    logger.info(`Dados de saldo: ${JSON.stringify(balanceData)}`);
    
    // Buscar dados de proposta
    const { data: proposalData, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('lead_id', contact.lead_id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (proposalError) {
      throw new Error(`Erro ao buscar proposta: ${proposalError.message}`);
    }
    
    logger.info(`Dados de proposta: ${JSON.stringify(proposalData)}`);
    
    // Construir o mesmo objeto de resposta que a API retornaria
    const saldo = balanceData && balanceData.length > 0 ? balanceData[0].balance : null;
    const simulado = balanceData && balanceData.length > 0 ? balanceData[0].simulation : null;
    
    let proposta = null;
    let status_proposta = null;
    let erro_proposta = null;
    let descricao_status = null;
    
    if (proposalData && proposalData.length > 0) {
      const proposalRecord = proposalData[0];
      proposta = proposalRecord.proposal_id;
      status_proposta = proposalRecord.status;
      
      switch (status_proposta) {
        case 'aprovada':
          descricao_status = 'Proposta aprovada. Aguardando liberação de valores.';
          break;
        case 'em_analise':
          descricao_status = 'Proposta em análise pelo banco. Aguarde a avaliação.';
          break;
        case 'rejeitada':
          descricao_status = 'Proposta rejeitada devido a restrições cadastrais.';
          erro_proposta = proposalRecord.rejection_reason || 'Proposta rejeitada pelo banco.';
          break;
        case 'pendente':
          descricao_status = 'Aguardando documentação adicional para seguir com a proposta.';
          break;
        default:
          descricao_status = `Status da proposta: ${status_proposta}`;
      }
    }
    
    const apiResponse = {
      success: true,
      saldo: saldo ? parseFloat(saldo).toFixed(2) : null,
      erro_consulta: null,
      simulado: simulado ? parseFloat(simulado).toFixed(2) : null,
      proposta,
      status_proposta,
      erro_proposta,
      descricao_status
    };
    
    logger.info(`Resposta simulada da API:`);
    logger.info(JSON.stringify(apiResponse, null, 2));
    
    return {
      success: true,
      data: apiResponse
    };
  } catch (error) {
    logger.error(`Erro ao testar API: ${error.message}`);
    logger.error(error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar o teste se este arquivo for chamado diretamente
if (require.main === module) {
  testContactDataApi()
    .then(result => {
      console.log('\nResultado do teste:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Erro fatal:', err);
      process.exit(1);
    });
}

module.exports = testContactDataApi; 