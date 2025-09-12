const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const SUPABASE_URL = 'https://uwcdaafcpezmzuveefrh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Y2RhYWZjcGV6bXp1dmVlZnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNzE0MjMsImV4cCI6MjA2MDg0NzQyM30.LuXtP_WSFTaDj41_zlIiEM0UXKXIRPiBNxCyrFPzAos';

// Cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkCredentials() {
  try {
    console.log('🔍 Verificando credenciais no Supabase...');
    console.log('=========================================');
    console.log('');

    // Buscar TODAS as credenciais
    const { data: allCredentials, error: allError } = await supabase
      .from('whatsapp_credentials')
      .select('*');

    if (allError) {
      console.error('❌ Erro ao buscar todas as credenciais:', allError.message);
      return;
    }

    console.log(`📊 Total de credenciais encontradas: ${allCredentials?.length || 0}`);
    console.log('');

    if (!allCredentials || allCredentials.length === 0) {
      console.log('❌ Nenhuma credencial encontrada na tabela');
      return;
    }

    // Mostrar todas as credenciais
    allCredentials.forEach((cred, index) => {
      console.log(`📝 Credencial ${index + 1}:`);
      console.log(`   - ID: ${cred.id}`);
      console.log(`   - Phone: ${cred.phone}`);
      console.log(`   - Connection Type: ${cred.connection_type}`);
      console.log(`   - Status: ${cred.status}`);
      console.log(`   - WPP Number ID: ${cred.wpp_number_id || 'N/A'}`);
      console.log(`   - WPP Access Token: ${cred.wpp_access_token ? `${cred.wpp_access_token.substring(0, 20)}...` : 'N/A'}`);
      console.log(`   - Has Metadata: ${cred.metadata ? 'Sim' : 'Não'}`);
      if (cred.metadata) {
        console.log(`   - Metadata Keys: ${Object.keys(cred.metadata).join(', ')}`);
      }
      console.log('');
    });

    // Filtrar credenciais do tipo 'ads'
    const adsCredentials = allCredentials.filter(cred => cred.connection_type === 'ads');
    console.log(`🎯 Credenciais do tipo 'ads': ${adsCredentials.length}`);
    
    if (adsCredentials.length > 0) {
      console.log('');
      adsCredentials.forEach((cred, index) => {
        console.log(`📱 Credencial Ads ${index + 1}:`);
        console.log(`   - ID: ${cred.id}`);
        console.log(`   - Phone: ${cred.phone}`);
        console.log(`   - Status: ${cred.status}`);
        console.log(`   - WPP Number ID: ${cred.wpp_number_id || 'N/A'}`);
        console.log(`   - WPP Access Token: ${cred.wpp_access_token ? `${cred.wpp_access_token.substring(0, 20)}...` : 'N/A'}`);
        console.log('');
      });
    }

    // Verificar se há tokens válidos
    const validTokens = allCredentials.filter(cred => 
      cred.wpp_access_token && 
      cred.wpp_access_token.trim() !== '' && 
      cred.wpp_access_token !== 'null'
    );

    console.log(`🔑 Credenciais com token válido: ${validTokens.length}`);
    if (validTokens.length > 0) {
      console.log('');
      validTokens.forEach((cred, index) => {
        console.log(`✅ Token Válido ${index + 1}:`);
        console.log(`   - ID: ${cred.id}`);
        console.log(`   - Phone: ${cred.phone}`);
        console.log(`   - Connection Type: ${cred.connection_type}`);
        console.log(`   - Token: ${cred.wpp_access_token.substring(0, 30)}...`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Erro ao verificar credenciais:', error.message);
  }
}

// Executar verificação
checkCredentials();










