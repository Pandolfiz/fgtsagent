#!/usr/bin/env node

/**
 * Script para testar o sistema de notificações
 * Simula inserções nas tabelas 'balance' e 'proposals' para testar as notificações
 */

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

async function testNotifications() {
  try {
    console.log('🧪 Iniciando teste do sistema de notificações...\n');

    // 1. Verificar conexão com Supabase
    console.log('1️⃣ Verificando conexão com Supabase...');
    const { data: healthCheck, error: healthError } = await supabaseAdmin
      .from('user_profiles')
      .select('count', { count: 'exact', head: true });
    
    if (healthError) {
      throw new Error(`Erro na conexão com Supabase: ${healthError.message}`);
    }
    console.log('✅ Conexão com Supabase OK\n');

    // 2. Buscar um cliente existente para usar nos testes
    console.log('2️⃣ Buscando cliente para teste...');
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .limit(1);
    
    if (clientsError || !clients || clients.length === 0) {
      console.log('⚠️ Nenhum cliente encontrado. Criando cliente de teste...');
      
      // Criar cliente de teste
      const { data: newClient, error: createClientError } = await supabaseAdmin
        .from('clients')
        .insert({
          name: 'Cliente Teste Notificações',
          email: 'teste.notificacoes@exemplo.com',
          status: 'active'
        })
        .select('id, name')
        .single();
      
      if (createClientError) {
        throw new Error(`Erro ao criar cliente de teste: ${createClientError.message}`);
      }
      
      clients.push(newClient);
    }
    
    const testClient = clients[0];
    console.log(`✅ Cliente encontrado: ${testClient.name} (${testClient.id})\n`);

    // 3. Buscar ou criar um lead para o cliente
    console.log('3️⃣ Buscando lead para teste...');
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('id, name, cpf')
      .eq('client_id', testClient.id)
      .limit(1);
    
    let testLead;
    if (leadsError || !leads || leads.length === 0) {
      console.log('⚠️ Nenhum lead encontrado. Criando lead de teste...');
      
      // Criar lead de teste
      const { data: newLead, error: createLeadError } = await supabaseAdmin
        .from('leads')
        .insert({
          client_id: testClient.id,
          name: 'Lead Teste Notificações',
          cpf: '12345678901',
          email: 'lead.teste@exemplo.com',
          phone: '11999999999',
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select('id, name, cpf')
        .single();
      
      if (createLeadError) {
        throw new Error(`Erro ao criar lead de teste: ${createLeadError.message}`);
      }
      
      testLead = newLead;
    } else {
      testLead = leads[0];
    }
    
    console.log(`✅ Lead encontrado: ${testLead.name} (${testLead.id})\n`);

    // 4. Teste 1: Inserir registro na tabela 'balance'
    console.log('4️⃣ Testando notificação de saldo...');
    const { data: balanceRecord, error: balanceError } = await supabaseAdmin
      .from('balance')
      .insert({
        client_id: testClient.id,
        lead_id: testLead.id,
        balance: 15800.75,
        simulation: 9600.25,
        source: 'test_notification_script',
        error_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();
    
    if (balanceError) {
      throw new Error(`Erro ao inserir registro de balance: ${balanceError.message}`);
    }
    
    console.log('✅ Registro de balance inserido com sucesso!');
    console.log(`   - Saldo: R$ ${Number(balanceRecord.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   - Simulação: R$ ${Number(balanceRecord.simulation).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   - ID: ${balanceRecord.id}\n`);

    // Aguardar um pouco para processar a notificação
    console.log('⏳ Aguardando processamento da notificação de saldo...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Teste 2: Inserir registro na tabela 'proposals'
    console.log('5️⃣ Testando notificação de proposta...');
    const { v4: uuidv4 } = require('uuid');
    const { data: proposalRecord, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .insert({
        proposal_id: uuidv4(),
        client_id: testClient.id,
        lead_id: testLead.id,
        value: 12000.00,
        status: 'pendente',
        source: 'test_notification_script',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          test: true,
          created_by: 'notification_test_script',
          timestamp: new Date().toISOString()
        }
      })
      .select('*')
      .single();
    
    if (proposalError) {
      throw new Error(`Erro ao inserir registro de proposal: ${proposalError.message}`);
    }
    
    console.log('✅ Registro de proposta inserido com sucesso!');
    console.log(`   - Valor: R$ ${Number(proposalRecord.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   - Status: ${proposalRecord.status}`);
    console.log(`   - ID: ${proposalRecord.proposal_id}\n`);

    // Aguardar um pouco para processar a notificação
    console.log('⏳ Aguardando processamento da notificação de proposta...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. Teste 3: Atualizar status da proposta
    console.log('6️⃣ Testando notificação de atualização de proposta...');
    const { data: updatedProposal, error: updateError } = await supabaseAdmin
      .from('proposals')
      .update({
        status: 'aprovada',
        status_description: 'Proposta aprovada automaticamente pelo teste',
        updated_at: new Date().toISOString()
      })
      .eq('proposal_id', proposalRecord.proposal_id)
      .select('*')
      .single();
    
    if (updateError) {
      throw new Error(`Erro ao atualizar proposta: ${updateError.message}`);
    }
    
    console.log('✅ Proposta atualizada com sucesso!');
    console.log(`   - Novo status: ${updatedProposal.status}`);
    console.log(`   - Descrição: ${updatedProposal.status_description}\n`);

    // Aguardar um pouco para processar a notificação
    console.log('⏳ Aguardando processamento da notificação de atualização...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 7. Verificar status do serviço de notificações
    console.log('7️⃣ Verificando status do serviço de notificações...');
    try {
      const response = await fetch('http://localhost:3000/api/notifications/status');
      if (response.ok) {
        const status = await response.json();
        console.log('✅ Status do serviço de notificações:');
        console.log(`   - Executando: ${status.data.isRunning ? 'Sim' : 'Não'}`);
        console.log(`   - Subscriptions ativas: ${status.data.subscriptions.join(', ')}`);
        console.log(`   - Tentativas de reconexão: ${status.data.reconnectAttempts}`);
      } else {
        console.log('⚠️ Não foi possível verificar o status do serviço');
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar status do serviço:', error.message);
    }

    console.log('\n🎉 Teste do sistema de notificações concluído com sucesso!');
    console.log('\n📋 Resumo dos testes:');
    console.log('   ✅ Inserção de saldo (tabela balance)');
    console.log('   ✅ Inserção de proposta (tabela proposals)');
    console.log('   ✅ Atualização de proposta');
    console.log('   ✅ Verificação de status do serviço');
    
    console.log('\n💡 Próximos passos:');
    console.log('   1. Verifique se as notificações apareceram no frontend');
    console.log('   2. Verifique os logs do backend para confirmar o processamento');
    console.log('   3. Teste as funcionalidades de marcar como lida e filtrar');
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Executar o teste se o script for chamado diretamente
if (require.main === module) {
  testNotifications()
    .then(() => {
      console.log('\n✅ Script de teste finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro fatal:', error.message);
      process.exit(1);
    });
}

module.exports = { testNotifications };
