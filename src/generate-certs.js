const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 Gerando certificados SSL...');

const certsDir = path.join(__dirname, 'certs');

// Criar diretório se não existir
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

try {
  // Gerar chave privada
  console.log('📝 Gerando chave privada...');
  execSync('openssl genrsa -out certs/key.pem 2048', { stdio: 'inherit' });
  
  // Gerar certificado auto-assinado
  console.log('📜 Gerando certificado...');
  execSync('openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 -subj "/C=BR/ST=SP/L=SaoPaulo/O=FgtsAgent/OU=Development/CN=localhost"', { stdio: 'inherit' });
  
  console.log('✅ Certificados SSL gerados com sucesso!');
  console.log('📁 Localização: src/certs/');
  console.log('🔑 key.pem - Chave privada');
  console.log('📜 cert.pem - Certificado público');
  
} catch (error) {
  console.error('❌ Erro ao gerar certificados:', error.message);
  process.exit(1);
}
