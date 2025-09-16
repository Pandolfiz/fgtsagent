#!/usr/bin/env node

/**
 * Script para testar se as duplicações de notificações foram corrigidas
 */

const { io } = require('socket.io-client');
const { supabaseAdmin } = require('../config/supabase');

async function testNotificationDeduplication() {
  console.log('🧪 TESTE DE DEDUPLICAÇÃO DE NOTIFICAÇÕES');
  console.log('==========================================');
  
  const backendUrl = 'https://localhost:3000';
  console.log(`🔌 Conectando ao WebSocket: ${backendUrl}`);
  
  const socket = io(backendUrl, {
    transports: ['websocket', 'polling'],
    timeout: 10000,
    reconnection: false,
    secure: true,
    rejectUnauthorized: false
  });

  let notificationsReceived = [];
  let duplicateCount = 0;

  const websocketPromise = new Promise((resolve, reject) => {
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
    await websocketPromise;
    
    // Autenticar no WebSocket
    console.log('👤 Autenticando no WebSocket...');
    socket.emit('authenticate', { userId: 'test-deduplication' });
    
    // Configurar listener para notificações
    socket.on('notification', (notification) => {
      console.log('🔔 Notificação recebida:', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        timestamp: notification.timestamp
      });

      // Verificar duplicação
      const existingNotification = notificationsReceived.find(n => n.id === notification.id);
      if (existingNotification) {
        duplicateCount++;
        console.log('⚠️ DUPLICATA DETECTADA:', notification.id);
      } else {
        notificationsReceived.push(notification);
      }
    });

    // Inserir uma notificação de teste
    console.log('💰 Inserindo notificação de teste...');
    
    // Buscar cliente existente
    const { data: testClient, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .limit(1)
      .single();

    if (clientError || !testClient) {
      throw new Error('Nenhum cliente encontrado para teste');
    }

    // Criar lead de teste
    const timestamp = Date.now();
    const { data: testLead, error: createLeadError } = await supabaseAdmin
      .from('leads')
      .insert({
        client_id: testClient.id,
        name: `Lead Teste Deduplicação ${timestamp}`,
        cpf: `1234567890${timestamp % 100}`,
        email: `teste.deduplicacao.${timestamp}@exemplo.com`,
        phone: '11999999999',
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select('id, name')
      .single();

    if (createLeadError) {
      throw new Error(`Erro ao criar lead: ${createLeadError.message}`);
    }

    // Inserir notificação de teste
    const { data: balanceRecord, error: balanceError } = await supabaseAdmin
      .from('balance')
      .insert({
        client_id: testClient.id,
        lead_id: testLead.id,
        balance: 25000.00,
        simulation: 22000.00,
        source: 'test_notification_deduplication',
        error_reason: null,
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
    console.log(`   - Saldo: R$ ${balanceRecord.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   - ID: ${balanceRecord.id}`);

    // Aguardar notificações (máximo 10 segundos)
    console.log('⏳ Aguardando notificações (máximo 10 segundos)...');
    
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 10000);
    });

    // Limpar dados de teste
    console.log('🧹 Limpando dados de teste...');
    await supabaseAdmin
      .from('balance')
      .delete()
      .eq('id', balanceRecord.id);
    
    await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', testLead.id);

    console.log('✅ Dados de teste limpos');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    return false;
  } finally {
    socket.disconnect();
    console.log('🔌 WebSocket desconectado');
  }

  // Resultado do teste
  console.log('\n🎯 RESULTADO DO TESTE DE DEDUPLICAÇÃO:');
  console.log('=====================================');
  console.log(`📊 Total de notificações recebidas: ${notificationsReceived.length}`);
  console.log(`⚠️ Total de duplicatas detectadas: ${duplicateCount}`);
  
  if (duplicateCount === 0) {
    console.log('🎉 SUCESSO! Nenhuma duplicação detectada!');
    console.log('✅ Sistema de deduplicação está funcionando corretamente');
    return true;
  } else {
    console.log('❌ FALHA! Duplicações ainda estão ocorrendo');
    console.log('⚠️ Sistema de deduplicação precisa de ajustes');
    return false;
  }
}

// Executar teste
testNotificationDeduplication().then(success => {
  if (success) {
    console.log('\n🚀 Sistema de notificações sem duplicações está funcionando!');
    process.exit(0);
  } else {
    console.log('\n⚠️ Sistema ainda tem problemas de duplicação.');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Erro no teste:', error.message);
  process.exit(1);
});
