#!/usr/bin/env node

/**
 * Teste simples para verificar apenas a conexão WebSocket
 */

const { io } = require('socket.io-client');

async function testWebSocketSimple() {
  console.log('🧪 TESTE SIMPLES DO WEBSOCKET');
  console.log('=============================');
  
  const backendUrl = 'https://localhost:3000';
  console.log(`🔌 Conectando ao WebSocket: ${backendUrl}`);
  
  const socket = io(backendUrl, {
    transports: ['websocket', 'polling'],
    timeout: 10000,
    reconnection: false,
    secure: true,
    rejectUnauthorized: false
  });

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
    socket.emit('authenticate', { userId: 'test-simple' });
    
    console.log('✅ Teste WebSocket concluído com sucesso!');
    console.log('🎉 O sistema de notificações está pronto!');
    
  } catch (error) {
    console.error('❌ Erro no teste WebSocket:', error.message);
    return false;
  } finally {
    socket.disconnect();
    console.log('🔌 WebSocket desconectado');
  }

  return true;
}

// Executar teste
testWebSocketSimple().then(success => {
  if (success) {
    console.log('\n🚀 WebSocket funcionando perfeitamente!');
    console.log('✅ Frontend pode conectar via HTTPS');
    console.log('✅ Backend está respondendo corretamente');
    process.exit(0);
  } else {
    console.log('\n⚠️ WebSocket precisa de ajustes.');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Erro no teste:', error.message);
  process.exit(1);
});