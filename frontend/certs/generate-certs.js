import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔐 Gerando certificados SSL para desenvolvimento...');

try {
  // Verificar se o OpenSSL está disponível
  execSync('openssl version', { stdio: 'pipe' });
  
  // Gerar certificado e chave
  const opensslCmd = `openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/C=BR/ST=SP/L=SaoPaulo/O=Development/CN=localhost"`;
  
  console.log('📝 Executando:', opensslCmd);
  execSync(opensslCmd, { stdio: 'inherit' });
  
  console.log('✅ Certificados SSL gerados com sucesso!');
  console.log('📁 Arquivos criados:');
  console.log('   - cert.pem (certificado)');
  console.log('   - key.pem (chave privada)');
  
} catch (error) {
  console.error('❌ Erro ao gerar certificados:', error.message);
  console.log('💡 Alternativa: Use mkcert ou gere manualmente');
  
  // Criar certificados de exemplo (não funcionais)
  const certContent = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/OvK8TqGMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkJSMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjQwODE5MjMwMDAwWhcNMjUwODE5MjMwMDAwWjBF
MQswCQYDVQQGEwJCUjETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEA... (certificado truncado para exemplo)
-----END CERTIFICATE-----`;
  
  const keyContent = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC6Arz68srpOoYw
DQYJKoZIhvcNAQELBQAwRTELMAkGA1UEBhMCQlIxEzARBgNVBAgMClNvbWUtU3Rh
dGUxITAfBgNVBAoMGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0yNDA4MTky
MzAwMDBaFw0yNTA4MTkyMzAwMDBaMEUxCzAJBgNVBAYTAkJSMRMwEQYDVQQIDApT
b21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwggEi
MA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC... (chave truncada para exemplo)
-----END PRIVATE KEY-----`;
  
  fs.writeFileSync('cert.pem', certContent);
  fs.writeFileSync('key.pem', keyContent);
  
  console.log('⚠️ Certificados de exemplo criados (não funcionais)');
  console.log('💡 Para funcionar, gere certificados válidos com OpenSSL ou mkcert');
}
