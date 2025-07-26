#!/bin/bash

echo "� Configurando SSL para fgtsagent.com.br"
echo "==========================================="

DOMAIN="fgtsagent.com.br"
EMAIL="fgtsagent@gmail.com"

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto (onde está o docker-compose.yml)"
    exit 1
fi

# 1. Verificar se domínio aponta para servidor
echo "1. Verificando DNS..."
echo "   Domínio: $DOMAIN"
echo "   Email: $EMAIL"
echo ""

# 2. Parar serviços
echo "2. Parando serviços..."
docker-compose down
echo ""

# 3. Criar diretórios
echo "3. Criando diretórios..."
mkdir -p data/certbot/conf
mkdir -p data/certbot/www
echo "✅ Diretórios criados"
echo ""

# 4. Gerar certificado dummy
echo "4. Gerando certificado temporário..."
mkdir -p data/certbot/conf/live/$DOMAIN
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout data/certbot/conf/live/$DOMAIN/privkey.pem \
    -out data/certbot/conf/live/$DOMAIN/fullchain.pem \
    -subj "/CN=$DOMAIN" 2>/dev/null
echo "✅ Certificado temporário criado"
echo ""

# 5. Iniciar Nginx
echo "5. Iniciando Nginx..."
docker-compose up -d nginx
if [ $? -ne 0 ]; then
    echo "❌ Erro ao iniciar Nginx"
    exit 1
fi
echo "✅ Nginx iniciado"

# Aguardar Nginx inicializar
echo "   Aguardando Nginx inicializar..."
sleep 5
echo ""

# 6. Testar ACME endpoint
echo "6. Testando endpoint ACME..."
echo "teste-acme" > data/certbot/www/test.txt
sleep 2

curl -f http://$DOMAIN/.well-known/acme-challenge/test.txt >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Endpoint ACME funcionando!"
    rm -f data/certbot/www/test.txt
else
    echo "❌ Endpoint ACME não funciona."
    echo ""
    echo "� Possíveis problemas:"
    echo "  - DNS não aponta para este servidor"
    echo "  - Firewall bloqueia porta 80"
    echo "  - Nginx não está respondendo"
    echo ""
    echo "�️  Para verificar:"
    echo "  - dig +short $DOMAIN"
    echo "  - curl -I http://$DOMAIN/.well-known/acme-challenge/"
    echo "  - docker-compose logs nginx"
    echo ""
    echo "⚠️  Continuando mesmo assim para demonstração..."
fi
echo ""

# 7. Remover certificado dummy
echo "7. Removendo certificado temporário..."
rm -rf data/certbot/conf/live/$DOMAIN
rm -rf data/certbot/conf/archive/$DOMAIN
rm -rf data/certbot/conf/renewal/$DOMAIN.conf
echo "✅ Certificado temporário removido"
echo ""

# 8. Gerar certificado real
echo "8. Gerando certificado SSL real..."
echo "   (Isso pode levar alguns minutos...)"

docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN \
    -d www.$DOMAIN

if [ $? -eq 0 ]; then
    echo "✅ Certificado SSL criado com sucesso!"
    
    # 9. Reiniciar Nginx com SSL
    echo ""
    echo "9. Reiniciando Nginx com SSL..."
    docker-compose restart nginx
    sleep 5
    
    # 10. Testar HTTPS
    echo ""
    echo "10. Testando HTTPS..."
    curl -f https://$DOMAIN/health >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "� SSL funcionando perfeitamente!"
        echo ""
        echo "� URLs disponíveis:"
        echo "  - https://$DOMAIN"
        echo "  - https://www.$DOMAIN"
        echo ""
        echo "� Certificado válido por 90 dias"
        echo "   Renovação automática configurada"
        echo ""
        echo "� Para testar:"
        echo "  curl -I https://$DOMAIN/"
        echo "  curl https://$DOMAIN/api/health/health"
    else
        echo "⚠️  HTTPS pode não estar respondendo ainda"
        echo "   Aguarde alguns segundos e teste:"
        echo "   curl -I https://$DOMAIN/"
    fi
else
    echo "❌ Falha ao gerar certificado SSL"
    echo ""
    echo "� Possíveis problemas:"
    echo "  - DNS não aponta para este servidor"
    echo "  - Firewall bloqueia porta 80"
    echo "  - Limite de tentativas do Let's Encrypt"
    echo "  - Domínio não está acessível publicamente"
    echo ""
    echo "�️  Para debug:"
    echo "  docker-compose logs nginx"
    echo "  docker-compose logs certbot"
    echo "  curl -I http://$DOMAIN/.well-known/acme-challenge/"
    echo ""
    echo "� Para desenvolvimento local, use:"
    echo "  cp nginx/conf.d/app.local.conf nginx/conf.d/app.conf"
    echo "  docker-compose restart nginx"
fi

echo ""
echo "� Script concluído!"
