import supabase from './supabaseClient';

export async function diagnoseSupabaseConnection() {
  const results = {
    supabaseConnection: false,
    realtimeConnection: false,
    authStatus: null,
    error: null
  };

  try {
    // Teste básico de consulta
    const { data, error } = await supabase.from('messages').select('id').limit(1);

    if (error) {
      results.error = `Erro na conexão ao Supabase: ${error.message}`;
      return results;
    }

    results.supabaseConnection = true;
    console.log('Conexão básica com Supabase OK:', data);

    // Verificar status da autenticação
    const { data: authData } = await supabase.auth.getSession();
    results.authStatus = authData?.session ? 'autenticado' : 'não autenticado';

    // Teste do Realtime
    const channel = supabase.channel('realtime-test')
      .on('presence', { event: 'sync' }, () => {
        console.log('Sync de presença recebido!');
        results.realtimeConnection = true;
      })
      .subscribe((status) => {
        console.log('Status da subscrição:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Conexão Realtime estabelecida com sucesso!');
          results.realtimeConnection = true;
        }
      });

    // Aguardar um pouco para o canal ser estabelecido
    await new Promise(resolve => setTimeout(resolve, 2000));

    return results;
  } catch (e) {
    results.error = `Erro durante o diagnóstico: ${e.message}`;
    console.error('Erro durante o diagnóstico:', e);
    return results;
  }
}

export default diagnoseSupabaseConnection;