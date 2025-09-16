const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

async function testBackendRealtime() {
  console.log('🧪 Testando se backend está recebendo eventos Real-time...');
  
  try {
    // Inserir um registro de teste
    console.log('1️⃣ Inserindo registro de teste...');
    
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
    
    // Inserir balance
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .from('balance')
      .insert({
        client_id: '06987548-fc75-4434-b8f0-ca6370e3bf56',
        lead_id: leadData.id,
        balance: 999.99,
        simulation: 500.00,
        source: 'backend_realtime_test',
        error_reason: 'Teste de erro para verificar se backend processa',
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
    console.log('⏳ Aguardando 10 segundos para verificar se backend processa...');
    
    // Aguardar para ver se há logs
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('✅ Teste concluído');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testBackendRealtime();
