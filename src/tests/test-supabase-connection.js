const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './src/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('🔍 Testando conexão com Supabase...');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseKey ? 'configurada' : 'não configurada');
console.log('Service Key:', supabaseServiceKey ? 'configurada' : 'não configurada');

// Testar cliente anônimo
const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('\n📡 Testando cliente anônimo...');
    const { data, error } = await supabase.from('whatsapp_credentials').select('count').limit(1);
    
    if (error) {
      console.error('❌ Erro no cliente anônimo:', error.message);
    } else {
      console.log('✅ Cliente anônimo funcionando');
    }
    
    console.log('\n📡 Testando cliente admin...');
    const { data: adminData, error: adminError } = await supabaseAdmin.from('whatsapp_credentials').select('count').limit(1);
    
    if (adminError) {
      console.error('❌ Erro no cliente admin:', adminError.message);
    } else {
      console.log('✅ Cliente admin funcionando');
    }
    
    // Testar validação de token
    console.log('\n🔐 Testando validação de token...');
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Y2RhYWZjcGV6bXp1dmVlZnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNzE0MjMsImV4cCI6MjA2MDg0NzQyM30.LuXtP_WSFTaDj41_zlIiEM0UXKXIRPiBNxCCyrFPzAos';
    
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(testToken);
    
    if (userError) {
      console.error('❌ Erro na validação de token:', userError.message);
    } else {
      console.log('✅ Validação de token funcionando');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testConnection();
