#!/bin/bash

# Script para configurar HTTPS com certificados auto-assinados
# Baseado na documentação oficial do Facebook: https://developers.facebook.com/docs/facebook-login/security

echo "🔐 Configurando HTTPS para desenvolvimento..."

# Criar diretório para certificados
mkdir -p certs

# Gerar certificado SSL auto-assinado
echo "📜 Gerando certificado SSL auto-assinado..."
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=BR/ST=ES/L=Vitória/O=FgtsAgent/CN=localhost"

# Verificar se o certificado foi gerado
if [ -f "certs/cert.pem" ] && [ -f "certs/key.pem" ]; then
    echo "✅ Certificados gerados com sucesso!"
    echo "📁 Certificados criados em: ./certs/"
    echo ""
    echo "🚀 Para iniciar o servidor HTTPS:"
    echo "   npm run dev:https"
    echo ""
    echo "🌐 Acesse: https://localhost:5173"
    echo "⚠️  Aceite o certificado auto-assinado no navegador"
else
    echo "❌ Erro ao gerar certificados"
    exit 1
fi 