const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para testar notificações específicas para o usuário Luiz Fiorim
 */
async function testLuizFiorimNotifications() {
  try {
    console.log('🧪 Testando notificações para Luiz Fiorim...\n');

    // Dados específicos do Luiz Fiorim
    const luizFiorimClientId = '06987548-fc75-4434-b8f0-ca6370e3bf56';
    const luizFiorimLeadId = 'e1e7185c-dc0f-467a-9013-32fdf25020d7';

    console.log('👤 Cliente: Luiz Fiorim');
    console.log('📋 Lead: Pedro Nascimento');
    console.log('');

    // 1. Testar notificação de ERRO
    console.log('1️⃣ Testando notificação de ERRO...');
    const { data: errorRecord, error: errorInsertError } = await supabaseAdmin
      .from('balance')
      .insert({
        client_id: luizFiorimClientId,
        lead_id: luizFiorimLeadId,
        balance: null,
        simulation: null,
        error_reason: 'Instituição Fiduciária não possui autorização do Trabalhador para Operação Fiduciária.',
        source: 'test_luiz_fiorim_error_' + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (errorInsertError) {
      throw new Error(`Erro ao inserir registro de erro: ${errorInsertError.message}`);
    }

    console.log('✅ ERRO inserido com sucesso!');
    console.log(`   - Erro: ${errorRecord.error_reason}`);
    console.log(`   - Lead: Pedro Nascimento`);
    console.log(`   - ID: ${errorRecord.id}`);
    console.log('');

    console.log('⏳ Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. Testar notificação de SALDO ZERADO
    console.log('2️⃣ Testando notificação de SALDO ZERADO...');
    const { data: zeroRecord, error: zeroInsertError } = await supabaseAdmin
      .from('balance')
      .insert({
        client_id: luizFiorimClientId,
        lead_id: luizFiorimLeadId,
        balance: 0,
        simulation: 0,
        error_reason: null,
        source: 'test_luiz_fiorim_zero_' + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (zeroInsertError) {
      throw new Error(`Erro ao inserir registro de saldo zerado: ${zeroInsertError.message}`);
    }

    console.log('✅ SALDO ZERADO inserido com sucesso!');
    console.log(`   - Saldo: R$ 0,00`);
    console.log(`   - Lead: Pedro Nascimento`);
    console.log(`   - ID: ${zeroRecord.id}`);
    console.log('');

    console.log('⏳ Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Testar notificação de SUCESSO
    console.log('3️⃣ Testando notificação de SUCESSO...');
    const { data: successRecord, error: successInsertError } = await supabaseAdmin
      .from('balance')
      .insert({
        client_id: luizFiorimClientId,
        lead_id: luizFiorimLeadId,
        balance: 35000.75,
        simulation: 28000.50,
        error_reason: null,
        source: 'test_luiz_fiorim_success_' + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (successInsertError) {
      throw new Error(`Erro ao inserir registro de sucesso: ${successInsertError.message}`);
    }

    console.log('✅ SUCESSO inserido com sucesso!');
    console.log(`   - Saldo: R$ ${Number(successRecord.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   - Simulação: R$ ${Number(successRecord.simulation).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   - Lead: Pedro Nascimento`);
    console.log(`   - ID: ${successRecord.id}`);
    console.log('');

    console.log('⏳ Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. Testar notificação de PROPOSTA
    console.log('4️⃣ Testando notificação de PROPOSTA...');
    const { v4: uuidv4 } = require('uuid');
    const { data: proposalRecord, error: proposalInsertError } = await supabaseAdmin
      .from('proposals')
      .insert({
        proposal_id: uuidv4(),
        client_id: luizFiorimClientId,
        lead_id: luizFiorimLeadId,
        value: 28000.00,
        status: 'pendente',
        source: 'test_luiz_fiorim_proposal_' + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          test: true,
          created_by: 'luiz_fiorim_test_script',
          timestamp: new Date().toISOString()
        }
      })
      .select('*')
      .single();

    if (proposalInsertError) {
      throw new Error(`Erro ao inserir registro de proposta: ${proposalInsertError.message}`);
    }

    console.log('✅ PROPOSTA inserida com sucesso!');
    console.log(`   - Valor: R$ ${Number(proposalRecord.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   - Status: ${proposalRecord.status}`);
    console.log(`   - Lead: Pedro Nascimento`);
    console.log(`   - ID: ${proposalRecord.id}`);
    console.log('');

    console.log('🎉 Teste de notificações para Luiz Fiorim concluído com sucesso!');

    console.log('\n📋 Resumo dos testes:');
    console.log('   ❌ Notificação de ERRO (sem autorização)');
    console.log('   ⚠️  Notificação de SALDO ZERADO (R$ 0,00)');
    console.log('   ✅ Notificação de SUCESSO (R$ 35.000,75)');
    console.log('   📋 Notificação de PROPOSTA (R$ 28.000,00)');

    console.log('\n💡 IMPORTANTE - Verifique agora:');
    console.log('   1. Abra o frontend do aplicativo');
    console.log('   2. Faça login como Luiz Fiorim');
    console.log('   3. Procure pelo sino de notificações no canto superior direito');
    console.log('   4. Clique no sino para ver as 4 notificações');
    console.log('   5. Observe as cores: vermelho (erro), amarelo (zerado), verde (sucesso), azul (proposta)');

    console.log('\n✅ Script de teste para Luiz Fiorim finalizado');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    process.exit(1);
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testLuizFiorimNotifications();
}

module.exports = testLuizFiorimNotifications;
