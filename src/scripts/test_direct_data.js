require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');

// ID do contato para teste
const contactId = '5527997186150_5527996115344';

async function testDirectDataEndpoint() {
  console.log('=== TESTE DO ENDPOINT DE ACESSO DIRETO AOS DADOS ===');
  
  try {
    // Determinar a URL base
    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const apiUrl = `${baseUrl}/api/dev/direct-data?contactId=${contactId}`;
    
    console.log(`URL: ${apiUrl}`);
    
    try {
      const response = await axios.get(apiUrl);
      
      console.log(`\nResposta (status ${response.status}):`);
      console.log(JSON.stringify(response.data, null, 2));
      
      // Análise detalhada da resposta
      if (response.data) {
        console.log('\nANÁLISE DOS DADOS DIRETOS:');
        console.log('--------------------------------------');
        console.log(`Lead ID: ${response.data.lead_id}`);
        console.log(`Balance: ${response.data.balance} (${typeof response.data.balance})`);
        console.log(`Simulation: ${response.data.simulation} (${typeof response.data.simulation})`);
        console.log(`Proposal ID: ${response.data.proposal_id}`);
        console.log(`Proposal Status: ${response.data.proposal_status}`);
        
        // Tentar formatar como valores monetários
        console.log('\nFORMATAÇÃO DE VALORES:');
        
        if (response.data.balance !== null && response.data.balance !== undefined) {
          const formattedBalance = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(Number(response.data.balance));
          
          console.log(`Balance formatado: ${formattedBalance}`);
        }
        
        if (response.data.simulation !== null && response.data.simulation !== undefined) {
          const formattedSimulation = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(Number(response.data.simulation));
          
          console.log(`Simulation formatado: ${formattedSimulation}`);
        }
      }
    } catch (apiError) {
      console.error(`\nERRO na chamada do endpoint: ${apiError.message}`);
      
      if (apiError.response) {
        console.log(`Status: ${apiError.response.status}`);
        console.log('Dados:', apiError.response.data);
      }
    }
  } catch (error) {
    console.error('ERRO:', error);
  }
}

// Executar o teste
testDirectDataEndpoint()
  .then(() => {
    console.log('\n=== TESTE CONCLUÍDO ===');
  })
  .catch(error => {
    console.error('ERRO:', error);
  }); 