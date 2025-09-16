const { supabaseAdmin } = require('../config/supabase');

async function fixRealtimePublication() {
  console.log('🔧 Corrigindo publicação Real-time...');
  
  try {
    // Adicionar tabelas à publicação supabase_realtime
    console.log('1️⃣ Adicionando tabela balance à publicação...');
    const { error: balanceError } = await supabaseAdmin
      .rpc('exec_sql', { 
        sql: 'ALTER PUBLICATION supabase_realtime ADD TABLE balance;' 
      });
    
    if (balanceError) {
      console.log('⚠️ Erro ao adicionar balance (pode já estar incluída):', balanceError.message);
    } else {
      console.log('✅ Tabela balance adicionada à publicação');
    }
    
    console.log('2️⃣ Adicionando tabela proposals à publicação...');
    const { error: proposalsError } = await supabaseAdmin
      .rpc('exec_sql', { 
        sql: 'ALTER PUBLICATION supabase_realtime ADD TABLE proposals;' 
      });
    
    if (proposalsError) {
      console.log('⚠️ Erro ao adicionar proposals (pode já estar incluída):', proposalsError.message);
    } else {
      console.log('✅ Tabela proposals adicionada à publicação');
    }
    
    console.log('3️⃣ Verificando se as tabelas estão na publicação...');
    
    // Verificar usando uma query direta
    const { data: balanceData, error: balanceCheckError } = await supabaseAdmin
      .from('balance')
      .select('count')
      .limit(1);
    
    if (balanceCheckError) {
      console.log('❌ Erro ao verificar balance:', balanceCheckError);
    } else {
      console.log('✅ Tabela balance acessível');
    }
    
    const { data: proposalsData, error: proposalsCheckError } = await supabaseAdmin
      .from('proposals')
      .select('count')
      .limit(1);
    
    if (proposalsCheckError) {
      console.log('❌ Erro ao verificar proposals:', proposalsCheckError);
    } else {
      console.log('✅ Tabela proposals acessível');
    }
    
    console.log('\n🎯 Próximos passos:');
    console.log('1. Reinicie o servidor para aplicar as mudanças');
    console.log('2. Teste novamente as notificações');
    console.log('3. Verifique os logs do servidor');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixRealtimePublication();
