const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para verificar o status do Supabase Real-time
 */
async function checkRealtimeStatus() {
  try {
    console.log('🔍 Verificando status do Supabase Real-time...\n');

    // 1. Verificar se o cliente admin está funcionando
    console.log('1️⃣ Testando conexão com Supabase...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('clients')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Erro na conexão:', testError.message);
      return;
    }
    console.log('✅ Conexão com Supabase OK');

    // 2. Verificar se as tabelas estão publicadas
    console.log('\n2️⃣ Verificando publicação das tabelas...');
    const { data: publicationData, error: pubError } = await supabaseAdmin
      .rpc('get_publication_tables', { pub_name: 'supabase_realtime' });

    if (pubError) {
      console.log('⚠️ Não foi possível verificar publicação via RPC, usando query direta...');
      
      // Query direta para verificar publicação
      const { data: directData, error: directError } = await supabaseAdmin
        .from('pg_publication_tables')
        .select('schemaname, tablename')
        .eq('pubname', 'supabase_realtime')
        .in('tablename', ['balance', 'proposals']);

      if (directError) {
        console.error('❌ Erro ao verificar publicação:', directError.message);
      } else {
        console.log('📋 Tabelas publicadas:');
        if (directData && directData.length > 0) {
          directData.forEach(table => {
            console.log(`   ✅ ${table.schemaname}.${table.tablename}`);
          });
        } else {
          console.log('   ❌ Nenhuma tabela encontrada!');
        }
      }
    } else {
      console.log('📋 Tabelas publicadas:', publicationData);
    }

    // 3. Verificar se há dados recentes nas tabelas
    console.log('\n3️⃣ Verificando dados recentes...');
    
    const { data: recentBalance, error: balanceError } = await supabaseAdmin
      .from('balance')
      .select('id, created_at, balance, error_reason')
      .order('created_at', { ascending: false })
      .limit(3);

    if (balanceError) {
      console.error('❌ Erro ao buscar dados de balance:', balanceError.message);
    } else {
      console.log('📊 Últimos registros de balance:');
      recentBalance.forEach(record => {
        const status = record.error_reason ? '❌ ERRO' : (record.balance > 0 ? '✅ SUCESSO' : '⚠️ ZERADO');
        console.log(`   ${status} - ${record.id.substring(0, 8)}... - ${record.created_at}`);
      });
    }

    const { data: recentProposals, error: proposalsError } = await supabaseAdmin
      .from('proposals')
      .select('id, created_at, value, status')
      .order('created_at', { ascending: false })
      .limit(3);

    if (proposalsError) {
      console.error('❌ Erro ao buscar dados de proposals:', proposalsError.message);
    } else {
      console.log('📋 Últimos registros de proposals:');
      recentProposals.forEach(record => {
        console.log(`   📄 ${record.status.toUpperCase()} - R$ ${Number(record.value || 0).toLocaleString('pt-BR')} - ${record.created_at}`);
      });
    }

    // 4. Testar uma inserção simples
    console.log('\n4️⃣ Testando inserção de dados...');
    const testClientId = '06987548-fc75-4434-b8f0-ca6370e3bf56'; // Luiz Fiorim
    const testLeadId = 'e1e7185c-dc0f-467a-9013-32fdf25020d7'; // Pedro Nascimento

    const { data: testInsert, error: insertError } = await supabaseAdmin
      .from('balance')
      .insert({
        client_id: testClientId,
        lead_id: testLeadId,
        balance: 9999.99,
        simulation: 5000.00,
        error_reason: null,
        source: 'realtime_status_test_' + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir teste:', insertError.message);
    } else {
      console.log('✅ Teste de inserção OK');
      console.log(`   - ID: ${testInsert.id}`);
      console.log(`   - Saldo: R$ ${Number(testInsert.balance).toLocaleString('pt-BR')}`);
      console.log(`   - Timestamp: ${testInsert.created_at}`);
    }

    console.log('\n🎯 DIAGNÓSTICO:');
    console.log('   Se você não está recebendo notificações, verifique:');
    console.log('   1. ✅ Backend está rodando');
    console.log('   2. ✅ Supabase Real-time está habilitado');
    console.log('   3. ✅ Tabelas estão publicadas');
    console.log('   4. ❓ Frontend está conectado ao Supabase Real-time');
    console.log('   5. ❓ Usuário está logado no frontend');
    console.log('   6. ❓ Browser permite notificações');

    console.log('\n✅ Verificação de status concluída');

  } catch (error) {
    console.error('❌ Erro durante verificação:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkRealtimeStatus();
}

module.exports = checkRealtimeStatus;
