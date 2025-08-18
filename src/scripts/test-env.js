// Teste para verificar se as variáveis de ambiente estão sendo carregadas
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

console.log('🔍 Testando carregamento das variáveis de ambiente...\n');

// Verificar variáveis da Meta API
console.log('📱 Variáveis da Meta API:');
console.log(`   META_APP_ID: ${process.env.META_APP_ID || '❌ NÃO CONFIGURADO'}`);
console.log(`   META_APP_SECRET: ${process.env.META_APP_SECRET ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}`);
console.log(`   META_REDIRECT_URI: ${process.env.META_REDIRECT_URI || '❌ NÃO CONFIGURADO'}`);

// Verificar outras variáveis importantes
console.log('\n🔑 Outras variáveis importantes:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || '❌ NÃO CONFIGURADO'}`);
console.log(`   PORT: ${process.env.PORT || '❌ NÃO CONFIGURADO'}`);
console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL || '❌ NÃO CONFIGURADO'}`);

// Verificar se o arquivo .env foi encontrado
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  console.log('\n✅ Arquivo .env encontrado em:', envPath);
  
  // Ler e mostrar as primeiras linhas do arquivo (sem mostrar valores sensíveis)
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n').slice(0, 10); // Primeiras 10 linhas
  
  console.log('\n📋 Primeiras linhas do arquivo .env:');
  lines.forEach((line, index) => {
    if (line.trim() && !line.startsWith('#')) {
      const [key] = line.split('=');
      console.log(`   ${index + 1}: ${key}=***`);
    } else if (line.trim()) {
      console.log(`   ${index + 1}: ${line}`);
    }
  });
} else {
  console.log('\n❌ Arquivo .env NÃO encontrado em:', envPath);
}

console.log('\n🔍 Verificação concluída!');

