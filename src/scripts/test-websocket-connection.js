#!/usr/bin/env node

/**
 * Script para testar a conexão WebSocket com o backend
 */

const { io } = require('socket.io-client');
const config = require('../config');

async function testWebSocketConnection() {
  console.log('🧪 Testando conexão WebSocket com o backend...');
  
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
    
    // Testar autenticação
    console.log('👤 Testando autenticação...');
    socket.emit('authenticate', { userId: 'test-user-123' });
    
    // Aguardar um pouco e desconectar
    setTimeout(() => {
      console.log('🔌 Desconectando...');
      socket.disconnect();
      console.log('✅ Teste concluído com sucesso!');
      process.exit(0);
    }, 2000);
    
  } catch (error) {
    console.error('❌ Falha no teste WebSocket:', error.message);
    socket.disconnect();
    process.exit(1);
  }
}

// Executar teste
testWebSocketConnection().catch(error => {
  console.error('❌ Erro no teste:', error.message);
  process.exit(1);
});
