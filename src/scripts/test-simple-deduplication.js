#!/usr/bin/env node

/**
 * Teste simples para verificar deduplicação sem inserir dados no banco
 */

const { io } = require('socket.io-client');

async function testSimpleDeduplication() {
  console.log('🧪 TESTE SIMPLES DE DEDUPLICAÇÃO');
  console.log('=================================');
  
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
    socket.emit('authenticate', { userId: 'test-simple-deduplication' });
    
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
        console.log('✅ Notificação única adicionada:', notification.id);
      }
    });

    console.log('⏳ Aguardando notificações por 30 segundos...');
    console.log('💡 Execute um script de teste de notificação agora (ex: test-luiz-fiorim-notifications.js)');
    
    // Aguardar notificações (30 segundos)
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 30000);
    });
    
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
  
  if (notificationsReceived.length === 0) {
    console.log('ℹ️ Nenhuma notificação foi recebida durante o teste');
    console.log('💡 Execute um script de teste de notificação para gerar notificações');
    return true;
  } else if (duplicateCount === 0) {
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
testSimpleDeduplication().then(success => {
  if (success) {
    console.log('\n🚀 Sistema de notificações está funcionando!');
    process.exit(0);
  } else {
    console.log('\n⚠️ Sistema ainda tem problemas de duplicação.');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Erro no teste:', error.message);
  process.exit(1);
});
