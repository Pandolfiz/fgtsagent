// Utilitário para testar se o frontend está recebendo eventos do Supabase Real-time
import supabase from '../lib/supabaseClient';

export const testRealtimeConnection = () => {
  console.log('🧪 Testando conexão Real-time do frontend...');
  
  // Escutar eventos de balance
  const subscription = supabase
    .channel('test_balance_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'balance'
      },
      (payload) => {
        console.log('🎯 EVENTO RECEBIDO NO FRONTEND:', payload);
        console.log('🎯 Error Reason:', payload.new?.error_reason);
        console.log('🎯 Balance:', payload.new?.balance);
        console.log('🎯 Lead ID:', payload.new?.lead_id);
      }
    )
    .subscribe((status) => {
      console.log('📡 Status da subscription de teste:', status);
    });
    
  return subscription;
};

// Função para parar o teste
export const stopRealtimeTest = (subscription) => {
  if (subscription) {
    supabase.removeChannel(subscription);
    console.log('🛑 Teste Real-time parado');
  }
};
