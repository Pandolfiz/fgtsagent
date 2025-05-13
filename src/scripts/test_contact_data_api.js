require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');
const { supabase, supabaseAdmin } = require('../config/supabase');

// ID do contato para teste
const contactId = '5527997186150_5527996115344';

async function testContactDataEndpoint() {
  console.log('=== TESTE DIRETO DO ENDPOINT DE DADOS DO CONTATO ===');
  
  try {
    // 1. Verificar se o contato existe no banco de dados
    console.log(`\nVerificando contato ${contactId} no banco de dados...`);
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('remote_jid, lead_id')
      .eq('remote_jid', contactId)
      .single();
    
    if (contactError) {
      console.error(`ERRO: Contato não encontrado - ${contactError.message}`);
      process.exit(1);
    }
    
    console.log(`Contato encontrado: ${JSON.stringify(contact)}`);
    console.log(`Lead ID: ${contact.lead_id || 'NULL'}`);
    
    // 2. Se não tem lead_id, tentar definir um
    if (!contact.lead_id) {
      console.log('\nContato sem lead_id. Tentando associar um lead_id...');
      
      // Buscar um lead existente para associar
      const { data: existingLead } = await supabaseAdmin
        .from('leads')
        .select('id')
        .limit(1)
        .single();
      
      if (existingLead) {
        console.log(`Associando lead_id ${existingLead.id} ao contato...`);
        
        // Atualizar o contato com o lead_id
        const { error: updateError } = await supabaseAdmin
          .from('contacts')
          .update({ lead_id: existingLead.id })
          .eq('remote_jid', contactId);
        
        if (updateError) {
          console.error(`ERRO ao atualizar contato: ${updateError.message}`);
        } else {
          console.log('Contato atualizado com sucesso!');
          contact.lead_id = existingLead.id;
        }
      } else {
        console.log('Nenhum lead encontrado para associar.');
      }
    }
    
    // 3. Verificar dados de saldo para o lead
    if (contact.lead_id) {
      console.log(`\nVerificando dados de saldo para lead_id ${contact.lead_id}...`);
      
      const { data: balanceData, error: balanceError } = await supabaseAdmin
        .from('balance')
        .select('*')
        .eq('lead_id', contact.lead_id)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (balanceError) {
        console.error(`ERRO ao buscar saldo: ${balanceError.message}`);
      } else if (balanceData && balanceData.length > 0) {
        console.log('Dados de saldo encontrados:');
        console.log(JSON.stringify(balanceData[0], null, 2));
        
        // Verificar tipos de dados
        const record = balanceData[0];
        console.log('\nVERIFICAÇÃO DE TIPOS:');
        console.log(`- balance: ${record.balance} (${typeof record.balance})`);
        console.log(`- simulation: ${record.simulation} (${typeof record.simulation})`);
        
        // Tentar inserir dados de teste se os valores forem nulos
        if (record.balance === null && record.simulation === null) {
          console.log('\nInserindo valores de teste para saldo e simulação...');
          
          const { error: updateBalanceError } = await supabaseAdmin
            .from('balance')
            .update({
              balance: 5000.75,
              simulation: 3500.50
            })
            .eq('id', record.id);
          
          if (updateBalanceError) {
            console.error(`ERRO ao atualizar saldo: ${updateBalanceError.message}`);
          } else {
            console.log('Saldo atualizado com valores de teste!');
          }
        }
      } else {
        console.log('Nenhum registro de saldo encontrado. Criando um novo...');
        
        // Criar um registro de saldo para teste
        const { error: insertError } = await supabaseAdmin
          .from('balance')
          .insert({
            lead_id: contact.lead_id,
            balance: 10000.50,
            simulation: 7500.25,
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`ERRO ao criar saldo: ${insertError.message}`);
        } else {
          console.log('Registro de saldo criado com sucesso!');
        }
      }
    }
    
    // 4. Testar a chamada direta ao endpoint da API
    console.log('\nChamando o endpoint da API diretamente...');
    
    // Obter um token de autenticação
    const { data: apiKeys } = await supabaseAdmin
      .from('api_keys')
      .select('token')
      .limit(1);
    
    const token = apiKeys && apiKeys.length > 0 ? apiKeys[0].token : null;
    
    if (!token) {
      console.log('Nenhum token de API encontrado. Tentando chamar a API sem autenticação...');
    }
    
    // Determinar a URL da API
    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const apiUrl = `${baseUrl}/api/contacts/${contactId}/data`;
    
    console.log(`URL da API: ${apiUrl}`);
    
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(apiUrl, { headers });
      
      console.log(`\nResposta da API (status ${response.status}):`);
      console.log(JSON.stringify(response.data, null, 2));
      
      // Analisar a resposta
      if (response.data) {
        console.log('\nANÁLISE DOS DADOS:');
        console.log(`- success: ${response.data.success}`);
        console.log(`- saldo: ${response.data.saldo} (${typeof response.data.saldo})`);
        console.log(`- simulado: ${response.data.simulado} (${typeof response.data.simulado})`);
        
        // Se os dados estiverem ausentes, sugerir soluções
        if (!response.data.saldo && !response.data.simulado) {
          console.log('\nPROBLEMA DETECTADO: Dados de saldo/simulação ausentes na resposta.');
          console.log('Possíveis soluções:');
          console.log('1. Verifique se o contato está associado a um lead_id válido');
          console.log('2. Verifique se existem registros na tabela balance para o lead_id');
          console.log('3. Verifique se os campos balance e simulation contêm valores válidos');
          console.log('4. Verifique se a conversão de tipos no backend está funcionando corretamente');
        }
      }
    } catch (apiError) {
      console.error(`\nERRO na chamada da API: ${apiError.message}`);
      
      if (apiError.response) {
        console.log(`Status: ${apiError.response.status}`);
        console.log('Dados:', apiError.response.data);
      }
      
      console.log('\nPossíveis problemas:');
      console.log('1. Servidor não está rodando');
      console.log('2. Problemas de autenticação');
      console.log('3. CORS não configurado corretamente');
      console.log('4. Erro interno no servidor ao processar a requisição');
    }
    
  } catch (error) {
    console.error('ERRO FATAL:', error);
  }
}

// Executar o teste
testContactDataEndpoint()
  .then(() => {
    console.log('\n=== TESTE CONCLUÍDO ===');
  })
  .catch(error => {
    console.error('ERRO na execução do teste:', error);
  }); 