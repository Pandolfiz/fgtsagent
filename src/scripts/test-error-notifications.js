const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para testar notificações de erro na consulta de saldo
 */
async function testErrorNotifications() {
  try {
    console.log('🧪 Testando notificações de erro...\n');

    // 1. Buscar um cliente para teste
    console.log('1️⃣ Buscando cliente para teste...');
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .limit(1);

    if (clientsError || !clients || clients.length === 0) {
      throw new Error('Nenhum cliente encontrado para teste');
    }

    const testClient = clients[0];
    console.log(`✅ Cliente encontrado: ${testClient.name} (${testClient.id})`);

    // 2. Buscar um lead para teste
    console.log('\n2️⃣ Buscando lead para teste...');
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('id, name, cpf')
      .eq('client_id', testClient.id)
      .limit(1);

    if (leadsError || !leads || leads.length === 0) {
      throw new Error('Nenhum lead encontrado para teste');
    }

    const testLead = leads[0];
    console.log(`✅ Lead encontrado: ${testLead.name} (${testLead.id})`);

    // 3. Testar notificação de erro
    console.log('\n3️⃣ Testando notificação de erro na consulta de saldo...');
    const { data: errorRecord, error: errorInsertError } = await supabaseAdmin
      .from('balance')
      .insert({
        client_id: testClient.id,
        lead_id: testLead.id,
        balance: null,
        simulation: null,
        error_reason: 'Instituição Fiduciária não possui autorização do Trabalhador para Operação Fiduciária.',
        source: 'test_error_notification_script',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (errorInsertError) {
      throw new Error(`Erro ao inserir registro de erro: ${errorInsertError.message}`);
    }

    console.log('✅ Registro de erro inserido com sucesso!');
    console.log(`   - Erro: ${errorRecord.error_reason}`);
    console.log(`   - Lead: ${testLead.name}`);
    console.log(`   - ID: ${errorRecord.id}`);

    console.log('\n⏳ Aguardando processamento da notificação de erro...');
    console.log('   (Verifique se a notificação apareceu no frontend)');

    // 4. Testar notificação de saldo zerado
    console.log('\n4️⃣ Testando notificação de saldo zerado...');
    const { data: zeroRecord, error: zeroInsertError } = await supabaseAdmin
      .from('balance')
      .insert({
        client_id: testClient.id,
        lead_id: testLead.id,
        balance: 0,
        simulation: 0,
        error_reason: null,
        source: 'test_zero_notification_script',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (zeroInsertError) {
      throw new Error(`Erro ao inserir registro de saldo zerado: ${zeroInsertError.message}`);
    }

    console.log('✅ Registro de saldo zerado inserido com sucesso!');
    console.log(`   - Saldo: R$ 0,00`);
    console.log(`   - Lead: ${testLead.name}`);
    console.log(`   - ID: ${zeroRecord.id}`);

    console.log('\n⏳ Aguardando processamento da notificação de saldo zerado...');

    // 5. Testar notificação de saldo com sucesso
    console.log('\n5️⃣ Testando notificação de saldo com sucesso...');
    const { data: successRecord, error: successInsertError } = await supabaseAdmin
      .from('balance')
      .insert({
        client_id: testClient.id,
        lead_id: testLead.id,
        balance: 25000.50,
        simulation: 15000.75,
        error_reason: null,
        source: 'test_success_notification_script',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (successInsertError) {
      throw new Error(`Erro ao inserir registro de sucesso: ${successInsertError.message}`);
    }

    console.log('✅ Registro de sucesso inserido com sucesso!');
    console.log(`   - Saldo: R$ ${Number(successRecord.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   - Simulação: R$ ${Number(successRecord.simulation).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   - Lead: ${testLead.name}`);
    console.log(`   - ID: ${successRecord.id}`);

    console.log('\n⏳ Aguardando processamento da notificação de sucesso...');

    console.log('\n🎉 Teste de notificações de erro concluído com sucesso!');

    console.log('\n📋 Resumo dos testes:');
    console.log('   ❌ Notificação de ERRO (sem autorização)');
    console.log('   ⚠️  Notificação de SALDO ZERADO');
    console.log('   ✅ Notificação de SUCESSO (com saldo)');

    console.log('\n💡 Próximos passos:');
    console.log('   1. Verifique se as 3 notificações apareceram no frontend');
    console.log('   2. Observe as cores diferentes: vermelho (erro), amarelo (zerado), verde (sucesso)');
    console.log('   3. Verifique se os ícones estão corretos');
    console.log('   4. Teste os filtros por tipo de notificação');

    console.log('\n✅ Script de teste de erro finalizado');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    process.exit(1);
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testErrorNotifications();
}

module.exports = testErrorNotifications;
