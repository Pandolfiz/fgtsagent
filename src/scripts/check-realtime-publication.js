const { supabaseAdmin } = require('../config/supabase');

async function checkRealtimePublication() {
  console.log('🔍 Verificando publicação Real-time...');
  
  try {
    // Verificar se as tabelas estão na publicação supabase_realtime
    const { data: publications, error } = await supabaseAdmin
      .rpc('get_publication_tables', { publication_name: 'supabase_realtime' });
    
    if (error) {
      console.log('❌ Erro ao verificar publicação:', error);
      
      // Tentar método alternativo
      console.log('🔄 Tentando método alternativo...');
      const { data: altData, error: altError } = await supabaseAdmin
        .from('pg_publication_tables')
        .select('*')
        .eq('pubname', 'supabase_realtime');
      
      if (altError) {
        console.log('❌ Erro no método alternativo:', altError);
        return;
      }
      
      console.log('📋 Tabelas na publicação supabase_realtime:');
      altData.forEach(table => {
        console.log(`  - ${table.schemaname}.${table.tablename}`);
      });
      
      // Verificar se balance e proposals estão incluídas
      const hasBalance = altData.some(t => t.tablename === 'balance');
      const hasProposals = altData.some(t => t.tablename === 'proposals');
      
      console.log(`\n📊 Status das tabelas:`);
      console.log(`  - balance: ${hasBalance ? '✅ Incluída' : '❌ Não incluída'}`);
      console.log(`  - proposals: ${hasProposals ? '✅ Incluída' : '❌ Não incluída'}`);
      
      if (!hasBalance || !hasProposals) {
        console.log('\n🔧 Comandos para corrigir:');
        if (!hasBalance) {
          console.log('ALTER PUBLICATION supabase_realtime ADD TABLE balance;');
        }
        if (!hasProposals) {
          console.log('ALTER PUBLICATION supabase_realtime ADD TABLE proposals;');
        }
      }
      
    } else {
      console.log('✅ Publicação verificada:', publications);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkRealtimePublication();
