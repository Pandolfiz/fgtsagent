import { createClient } from '@supabase/supabase-js';

// Obter variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log detalhado para depuração
console.log('Configuração do Supabase (versão debug):', {
  url: supabaseUrl || 'AUSENTE',
  key: supabaseAnonKey ? 'PRESENTE' : 'AUSENTE',
  urlCompleta: supabaseUrl
});

// Verificar se as variáveis de ambiente estão presentes
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[ERRO CRÍTICO] Variáveis de ambiente do Supabase não estão definidas:');
  console.error('- VITE_SUPABASE_URL:', supabaseUrl ? 'OK' : 'AUSENTE');
  console.error('- VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'OK' : 'AUSENTE');
}

let supabase;

try {
  // Criar o cliente Supabase com configuração básica
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('Cliente Supabase criado com sucesso');
} catch (e) {
  console.error('Erro ao criar cliente Supabase:', e);
  // Criar um cliente vazio para evitar erros de null
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: {}, error: new Error('Cliente Supabase falhou ao inicializar') }),
      getUser: () => Promise.resolve({ data: {}, error: new Error('Cliente Supabase falhou ao inicializar') })
    },
    from: () => ({
      select: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase falhou ao inicializar') }),
      insert: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase falhou ao inicializar') })
    }),
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {}
    }),
    removeChannel: () => {}
  };
}

// Exportar o cliente
export default supabase;
