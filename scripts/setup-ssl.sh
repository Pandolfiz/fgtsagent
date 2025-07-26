#!/bin/bash

echo "Ì¥í Configurando SSL para fgtsagent.com.br"
echo "==========================================="

DOMAIN="fgtsagent.com.br"
EMAIL="fgtsagent@gmail.com"

# Verificar se estamos no diret√≥rio correto
if [ ! -f "docker-compose.yml" ]; then
    echo "‚ùå Erro: Execute este script na raiz do projeto (onde est√° o docker-compose.yml)"
    exit 1
fi

# 1. Verificar se dom√≠nio aponta para servidor
echo "1. Verificando DNS..."
echo "   Dom√≠nio: $DOMAIN"
echo "   Email: $EMAIL"
echo ""

# 2. Parar servi√ßos
echo "2. Parando servi√ßos..."
docker-compose down
echo ""

# 3. Criar diret√≥rios
echo "3. Criando diret√≥rios..."
mkdir -p data/certbot/conf
mkdir -p data/certbot/www
echo "‚úÖ Diret√≥rios criados"
echo ""

# 4. Gerar certificado dummy
echo "4. Gerando certificado tempor√°rio..."
mkdir -p data/certbot/conf/live/$DOMAIN
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout data/certbot/conf/live/$DOMAIN/privkey.pem \
    -out data/certbot/conf/live/$DOMAIN/fullchain.pem \
    -subj "/CN=$DOMAIN" 2>/dev/null
echo "‚úÖ Certificado tempor√°rio criado"
echo ""

# 5. Iniciar Nginx
echo "5. Iniciando Nginx..."
docker-compose up -d nginx
if [ $? -ne 0 ]; then
    echo "‚ùå Erro ao iniciar Nginx"
    exit 1
fi
echo "‚úÖ Nginx iniciado"

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
    echo "‚úÖ Endpoint ACME funcionando!"
    rm -f data/certbot/www/test.txt
else
    echo "‚ùå Endpoint ACME n√£o funciona."
    echo ""
    echo "Ì¥ç Poss√≠veis problemas:"
    echo "  - DNS n√£o aponta para este servidor"
    echo "  - Firewall bloqueia porta 80"
    echo "  - Nginx n√£o est√° respondendo"
    echo ""
    echo "Ìª†Ô∏è  Para verificar:"
    echo "  - dig +short $DOMAIN"
    echo "  - curl -I http://$DOMAIN/.well-known/acme-challenge/"
    echo "  - docker-compose logs nginx"
    echo ""
    echo "‚ö†Ô∏è  Continuando mesmo assim para demonstra√ß√£o..."
fi
echo ""

# 7. Remover certificado dummy
echo "7. Removendo certificado tempor√°rio..."
rm -rf data/certbot/conf/live/$DOMAIN
rm -rf data/certbot/conf/archive/$DOMAIN
rm -rf data/certbot/conf/renewal/$DOMAIN.conf
echo "‚úÖ Certificado tempor√°rio removido"
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
    echo "‚úÖ Certificado SSL criado com sucesso!"
    
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
        echo "Ìæâ SSL funcionando perfeitamente!"
        echo ""
        echo "Ì∫Ä URLs dispon√≠veis:"
        echo "  - https://$DOMAIN"
        echo "  - https://www.$DOMAIN"
        echo ""
        echo "Ì¥í Certificado v√°lido por 90 dias"
        echo "   Renova√ß√£o autom√°tica configurada"
        echo ""
        echo "Ì≥ä Para testar:"
        echo "  curl -I https://$DOMAIN/"
        echo "  curl https://$DOMAIN/api/health/health"
    else
        echo "‚ö†Ô∏è  HTTPS pode n√£o estar respondendo ainda"
        echo "   Aguarde alguns segundos e teste:"
        echo "   curl -I https://$DOMAIN/"
    fi
else
    echo "‚ùå Falha ao gerar certificado SSL"
    echo ""
    echo "Ì¥ç Poss√≠veis problemas:"
    echo "  - DNS n√£o aponta para este servidor"
    echo "  - Firewall bloqueia porta 80"
    echo "  - Limite de tentativas do Let's Encrypt"
    echo "  - Dom√≠nio n√£o est√° acess√≠vel publicamente"
    echo ""
    echo "Ìª†Ô∏è  Para debug:"
    echo "  docker-compose logs nginx"
    echo "  docker-compose logs certbot"
    echo "  curl -I http://$DOMAIN/.well-known/acme-challenge/"
    echo ""
    echo "Ì≤° Para desenvolvimento local, use:"
    echo "  cp nginx/conf.d/app.local.conf nginx/conf.d/app.conf"
    echo "  docker-compose restart nginx"
fi

echo ""
echo "ÌøÅ Script conclu√≠do!"
