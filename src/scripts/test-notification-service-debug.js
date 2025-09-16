const notificationService = require('../services/notificationService');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

async function testNotificationServiceDebug() {
  console.log('🔍 Debugando serviço de notificações...');
  
  try {
    // 1. Verificar se o supabaseAdmin está funcionando
    console.log('1️⃣ Testando conexão com Supabase...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('balance')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erro na conexão Supabase:', testError);
      return;
    }
    console.log('✅ Conexão Supabase OK');
    
    // 2. Verificar status inicial do serviço
    console.log('2️⃣ Status inicial do serviço:', notificationService.getStatus());
    
    // 3. Iniciar serviço
    console.log('3️⃣ Iniciando serviço...');
    await notificationService.start();
    
    // 4. Verificar status após inicialização
    console.log('4️⃣ Status após inicialização:', notificationService.getStatus());
    
    // 5. Aguardar um pouco
    console.log('5️⃣ Aguardando 10 segundos para verificar se há logs...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 6. Testar inserção de dados
    console.log('6️⃣ Testando inserção de dados...');
    const { data: leadData, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('id, name')
      .eq('name', 'Pedro Nascimento')
      .single();
    
    if (leadError) {
      console.error('❌ Erro ao buscar lead:', leadError);
      return;
    }
    
    console.log('✅ Lead encontrado:', leadData);
    
    // Inserir um registro de teste
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .from('balance')
      .insert({
        client_id: '06987548-fc75-4434-b8f0-ca6370e3bf56',
        lead_id: leadData.id,
        balance: 999.99,
        simulation: 500.00,
        source: 'debug_test',
        error_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();
    
    if (balanceError) {
      console.error('❌ Erro ao inserir balance:', balanceError);
      return;
    }
    
    console.log('✅ Balance inserido:', balanceData);
    
    // 7. Aguardar mais um pouco para ver se o serviço processa
    console.log('7️⃣ Aguardando 15 segundos para verificar se o serviço processa o evento...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    console.log('✅ Teste concluído');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    // Parar o serviço
    console.log('🛑 Parando serviço...');
    await notificationService.stop();
    console.log('✅ Serviço parado');
  }
}

testNotificationServiceDebug();
