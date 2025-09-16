#!/usr/bin/env node

/**
 * Script final para testar o sistema completo de notificações
 * 1. Verifica se o backend está rodando
 * 2. Verifica se o frontend está rodando  
 * 3. Testa a conexão WebSocket
 * 4. Insere uma notificação de teste
 * 5. Verifica se a notificação é recebida
 */

const { io } = require('socket.io-client');
const { supabaseAdmin } = require('../config/supabase');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

// Função para fazer requisições HTTPS
function makeHttpsRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ ok: true, json: () => Promise.resolve(jsonData) });
        } catch (e) {
          resolve({ ok: true, text: () => Promise.resolve(data) });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Timeout')));
  });
}

async function testFinalNotificationSystem() {
  console.log('🧪 TESTE FINAL DO SISTEMA DE NOTIFICAÇÕES');
  console.log('==========================================');
  
  // 1. Verificar se o backend está rodando
  console.log('1️⃣ Verificando se o backend está rodando...');
  try {
    const backendResponse = await makeHttpsRequest('https://localhost:3000/api/health');
    const backendData = await backendResponse.json();
    console.log('✅ Backend está rodando:', backendData.message);
  } catch (error) {
    console.error('❌ Backend não está rodando:', error.message);
    return false;
  }

  // 2. Verificar se o frontend está rodando
  console.log('2️⃣ Verificando se o frontend está rodando...');
  try {
    const frontendResponse = await makeHttpsRequest('https://localhost:5173');
    if (frontendResponse.ok) {
      console.log('✅ Frontend está rodando em HTTPS');
    } else {
      console.error('❌ Frontend não está respondendo corretamente');
      return false;
    }
  } catch (error) {
    console.error('❌ Frontend não está rodando:', error.message);
    return false;
  }

  // 3. Testar conexão WebSocket
  console.log('3️⃣ Testando conexão WebSocket...');
  const backendUrl = 'https://localhost:3000';
  
  const socket = io(backendUrl, {
    transports: ['websocket', 'polling'],
    timeout: 10000,
    reconnection: false,
    secure: true,
    rejectUnauthorized: false
  });

  let websocketConnected = false;
  let notificationReceived = false;

  const websocketPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout na conexão WebSocket'));
    }, 10000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket conectado com sucesso!');
      console.log(`📡 Socket ID: ${socket.id}`);
      websocketConnected = true;
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
    socket.emit('authenticate', { userId: 'test-final-system' });
    
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

    // 4. Inserir notificação de teste
    console.log('4️⃣ Inserindo notificação de teste no banco...');
    
    // Criar cliente de teste com dados únicos
    console.log('👤 Criando cliente de teste...');
    const timestamp = Date.now();
    const { data: testClient, error: createClientError } = await supabaseAdmin
      .from('clients')
      .insert({
        name: `Cliente Teste WebSocket ${timestamp}`,
        email: `teste.websocket.${timestamp}@exemplo.com`,
        phone: '11999999999',
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select('id, name')
      .single();

    if (createClientError) {
      throw new Error(`Erro ao criar cliente: ${createClientError.message}`);
    }

    // Criar lead de teste com dados únicos
    console.log('👤 Criando lead de teste...');
    const leadTimestamp = Date.now();
    const { data: testLead, error: createLeadError } = await supabaseAdmin
      .from('leads')
      .insert({
        client_id: testClient.id,
        name: `Lead Teste WebSocket ${leadTimestamp}`,
        cpf: `1234567890${leadTimestamp % 100}`,
        email: `teste.websocket.${leadTimestamp}@exemplo.com`,
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
        balance: 50000.00,
        simulation: 45000.00,
        source: 'test_final_notification_system',
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

    // 5. Aguardar notificação via WebSocket
    console.log('5️⃣ Aguardando notificação via WebSocket...');
    
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (notificationReceived) {
          clearInterval(checkInterval);
          console.log('🎉 Notificação recebida via WebSocket com sucesso!');
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 8000);
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
    return false;
  } finally {
    socket.disconnect();
    console.log('🔌 WebSocket desconectado');
  }

  // Resultado final
  console.log('\n🎯 RESULTADO DO TESTE FINAL:');
  console.log('============================');
  
  if (websocketConnected && notificationReceived) {
    console.log('🎉 SUCESSO TOTAL!');
    console.log('✅ Backend rodando em HTTPS');
    console.log('✅ Frontend rodando em HTTPS');
    console.log('✅ WebSocket conectado com sucesso');
    console.log('✅ Notificações sendo enviadas e recebidas');
    console.log('✅ Sistema de notificações funcionando perfeitamente!');
    return true;
  } else {
    console.log('❌ FALHA NO TESTE!');
    console.log(`   - WebSocket conectado: ${websocketConnected ? '✅' : '❌'}`);
    console.log(`   - Notificação recebida: ${notificationReceived ? '✅' : '❌'}`);
    return false;
  }
}

// Executar teste final
testFinalNotificationSystem().then(success => {
  if (success) {
    console.log('\n🚀 Sistema de notificações está pronto para uso!');
    process.exit(0);
  } else {
    console.log('\n⚠️ Sistema de notificações precisa de ajustes.');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Erro no teste final:', error.message);
  process.exit(1);
});
