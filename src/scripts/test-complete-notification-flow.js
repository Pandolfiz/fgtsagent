#!/usr/bin/env node

/**
 * Script completo para testar o fluxo de notificações:
 * 1. Conecta ao WebSocket
 * 2. Insere uma notificação no banco
 * 3. Verifica se a notificação é recebida via WebSocket
 */

const { io } = require('socket.io-client');
const { supabaseAdmin } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

async function testCompleteNotificationFlow() {
  console.log('🧪 Testando fluxo completo de notificações...');
  
  const backendUrl = 'https://localhost:3000';
  console.log(`🔌 Conectando ao WebSocket: ${backendUrl}`);
  
  const socket = io(backendUrl, {
    transports: ['websocket', 'polling'],
    timeout: 10000,
    reconnection: false,
    secure: true,
    rejectUnauthorized: false
  });

  let notificationReceived = false;
  let testLeadId = null;

  // Configurar listener para notificações
  socket.on('notification', (notification) => {
    console.log('🔔 Notificação recebida via WebSocket:', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      timestamp: notification.timestamp
    });
    notificationReceived = true;
  });

  // Promise para aguardar a conexão
  const connectionPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout na conexão WebSocket'));
    }, 10000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket conectado com sucesso!');
      console.log(`📡 Socket ID: ${socket.id}`);
      resolve(true);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      console.error('❌ Erro na conexão WebSocket:', error.message);
      reject(error);
    });
  });

  try {
    await connectionPromise;
    
    // Autenticar
    console.log('👤 Autenticando usuário...');
    socket.emit('authenticate', { userId: 'test-user-123' });
    
    // Aguardar um pouco para garantir que a autenticação foi processada
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Buscar ou criar cliente de teste
    console.log('👤 Buscando cliente de teste...');
    let { data: testClient, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .eq('name', 'Luiz Fiorim')
      .single();

    if (clientError || !testClient) {
      console.log('👤 Cliente não encontrado, criando...');
      const { data: newClient, error: createClientError } = await supabaseAdmin
        .from('clients')
        .insert({
          name: 'Luiz Fiorim',
          email: 'luiz.fiorim@exemplo.com',
          phone: '11999999999',
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select('id, name')
        .single();

      if (createClientError) {
        throw new Error(`Erro ao criar cliente: ${createClientError.message}`);
      }
      testClient = newClient;
    }

    console.log(`✅ Cliente encontrado: ${testClient.name} (ID: ${testClient.id})`);

    // Buscar ou criar lead de teste
    console.log('👤 Buscando lead de teste...');
    let { data: testLead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('id, name')
      .eq('name', 'Pedro Nascimento')
      .eq('client_id', testClient.id)
      .single();

    if (leadError || !testLead) {
      console.log('👤 Lead não encontrado, criando...');
      const { data: newLead, error: createLeadError } = await supabaseAdmin
        .from('leads')
        .insert({
          client_id: testClient.id,
          name: 'Pedro Nascimento',
          cpf: '12345678901',
          email: 'pedro.nascimento@exemplo.com',
          phone: '11999999999',
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select('id, name')
        .single();

      if (createLeadError) {
        throw new Error(`Erro ao criar lead: ${createLeadError.message}`);
      }
      testLead = newLead;
    }

    console.log(`✅ Lead encontrado: ${testLead.name} (ID: ${testLead.id})`);
    testLeadId = testLead.id;

    // Inserir notificação de teste no banco
    console.log('💰 Inserindo notificação de saldo com erro...');
    const { data: balanceRecord, error: balanceError } = await supabaseAdmin
      .from('balance')
      .insert({
        client_id: testClient.id,
        lead_id: testLead.id,
        balance: 0,
        simulation: 0,
        source: 'test_complete_notification_flow',
        error_reason: 'Instituição Fiduciária não possui autorização do Trabalhador para Operação Fiduciária.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (balanceError) {
      throw new Error(`Erro ao inserir balance: ${balanceError.message}`);
    }

    console.log('✅ Notificação inserida no banco com sucesso!');
    console.log(`   - Lead: ${testLead.name}`);
    console.log(`   - Erro: ${balanceRecord.error_reason}`);
    console.log(`   - ID: ${balanceRecord.id}`);

    // Aguardar notificação via WebSocket (máximo 10 segundos)
    console.log('⏳ Aguardando notificação via WebSocket...');
    const notificationTimeout = setTimeout(() => {
      if (!notificationReceived) {
        console.log('⚠️ Notificação não recebida via WebSocket após 10 segundos');
        console.log('🔍 Verificando se o serviço de notificações está ativo...');
      }
    }, 10000);

    // Aguardar notificação ou timeout
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (notificationReceived) {
          clearInterval(checkInterval);
          clearTimeout(notificationTimeout);
          console.log('🎉 Notificação recebida via WebSocket com sucesso!');
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        clearTimeout(notificationTimeout);
        resolve();
      }, 11000);
    });

    // Limpar dados de teste
    console.log('🧹 Limpando dados de teste...');
    await supabaseAdmin
      .from('balance')
      .delete()
      .eq('id', balanceRecord.id);

    console.log('✅ Dados de teste limpos');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    socket.disconnect();
    console.log('🔌 WebSocket desconectado');
  }

  // Resultado do teste
  if (notificationReceived) {
    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('✅ O fluxo completo de notificações está funcionando:');
    console.log('   1. WebSocket conectado ✅');
    console.log('   2. Dados inseridos no banco ✅');
    console.log('   3. Notificação recebida via WebSocket ✅');
    process.exit(0);
  } else {
    console.log('❌ TESTE FALHOU!');
    console.log('⚠️ A notificação não foi recebida via WebSocket');
    console.log('🔍 Possíveis problemas:');
    console.log('   - Serviço de notificações não está ativo');
    console.log('   - Real-time do Supabase não está funcionando');
    console.log('   - WebSocket não está enviando notificações');
    process.exit(1);
  }
}

// Executar teste
testCompleteNotificationFlow().catch(error => {
  console.error('❌ Erro no teste:', error.message);
  process.exit(1);
});
