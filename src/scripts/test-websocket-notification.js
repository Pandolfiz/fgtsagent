#!/usr/bin/env node

/**
 * Script para testar o envio de notificações via WebSocket
 */

const { io } = require('socket.io-client');

async function testWebSocketNotification() {
  console.log('🧪 Testando envio de notificações via WebSocket...');
  
  const backendUrl = 'https://localhost:3000';
  console.log(`🔌 Conectando ao WebSocket: ${backendUrl}`);
  
  const socket = io(backendUrl, {
    transports: ['websocket', 'polling'],
    timeout: 10000,
    reconnection: false,
    secure: true,
    rejectUnauthorized: false
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
    
    // Configurar listener para notificações
    socket.on('notification', (notification) => {
      console.log('🔔 Notificação recebida:', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: notification.timestamp
      });
    });
    
    console.log('📡 Aguardando notificações...');
    console.log('💡 Agora execute um script de teste de notificação (ex: test-luiz-fiorim-notifications.js)');
    console.log('⏰ Este script ficará rodando por 60 segundos aguardando notificações...');
    
    // Aguardar notificações por 60 segundos
    setTimeout(() => {
      console.log('⏰ Tempo limite atingido. Desconectando...');
      socket.disconnect();
      console.log('✅ Teste concluído!');
      process.exit(0);
    }, 60000);
    
  } catch (error) {
    console.error('❌ Falha no teste WebSocket:', error.message);
    socket.disconnect();
    process.exit(1);
  }
}

// Executar teste
testWebSocketNotification().catch(error => {
  console.error('❌ Erro no teste:', error.message);
  process.exit(1);
});
