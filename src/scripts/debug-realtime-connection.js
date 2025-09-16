const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Carregar variáveis de ambiente
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function debugRealtimeConnection() {
  console.log('🔍 Debugando conexão Real-time...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não encontradas');
    return;
  }
  
  console.log('✅ Variáveis de ambiente carregadas');
  console.log('🔗 URL:', supabaseUrl);
  console.log('🔑 Service Key:', supabaseServiceKey.substring(0, 20) + '...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Testar conexão básica
    console.log('🧪 Testando conexão básica...');
    const { data, error } = await supabase.from('balance').select('count').limit(1);
    
    if (error) {
      console.error('❌ Erro na conexão básica:', error);
      return;
    }
    
    console.log('✅ Conexão básica funcionando');
    
    // Testar Real-time
    console.log('🧪 Testando Real-time...');
    
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'balance'
      }, (payload) => {
        console.log('📡 Evento Real-time recebido:', payload);
      })
      .subscribe((status) => {
        console.log('📡 Status da subscrição:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time conectado com sucesso!');
          
          // Aguardar 10 segundos e depois parar
          setTimeout(() => {
            console.log('🛑 Parando teste...');
            supabase.removeChannel(channel);
            process.exit(0);
          }, 10000);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro no canal Real-time');
          process.exit(1);
        }
      });
      
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugRealtimeConnection();
