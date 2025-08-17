// Teste para verificar variáveis de ambiente do frontend
console.log('🔍 Testando variáveis de ambiente do frontend...\n');

// Verificar se estamos no ambiente correto
console.log('🌐 Ambiente:', import.meta.env.MODE);
console.log('🔗 Base URL:', import.meta.env.BASE_URL);

// Verificar variáveis do Facebook SDK
console.log('\n📱 Variáveis do Facebook SDK:');
console.log(`   VITE_APP_META_APP_ID: ${import.meta.env.VITE_APP_META_APP_ID || '❌ NÃO CONFIGURADO'}`);
console.log(`   VITE_APP_META_CONFIG_ID: ${import.meta.env.VITE_APP_META_CONFIG_ID || '❌ NÃO CONFIGURADO'}`);

// Verificar outras variáveis importantes
console.log('\n🔑 Outras variáveis importantes:');
console.log(`   VITE_API_URL: ${import.meta.env.VITE_API_URL || '❌ NÃO CONFIGURADO'}`);
console.log(`   VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL || '❌ NÃO CONFIGURADO'}`);

console.log('\n🔍 Verificação concluída!');

