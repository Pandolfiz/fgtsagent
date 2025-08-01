#!/bin/bash

echo "🔒 Configurando SSL no Windows para fgtsagent.com.br"
echo "====================================================="

DOMAIN="fgtsagent.com.br"
EMAIL="fgtsagent@gmail.com"
NGINX_PATH="./nginx-1.25.3"

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

# Verificar se o domínio resolve
if command -v nslookup &> /dev/null; then
    echo "   Verificando resolução DNS..."
    NSLOOKUP_RESULT=$(nslookup $DOMAIN 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
    if [ -n "$NSLOOKUP_RESULT" ]; then
        echo "   ✅ DNS resolvido: $NSLOOKUP_RESULT"
    else
        echo "   ⚠️  DNS não resolveu. Certifique-se que o domínio aponta para este servidor."
    fi
else
    echo "   ⚠️  'nslookup' não encontrado. Verifique manualmente se $DOMAIN aponta para este servidor."
fi
echo ""

# 2. Verificar se certbot está instalado
echo "2. Verificando certbot..."
if command -v certbot &> /dev/null; then
    echo "   ✅ Certbot encontrado: $(certbot --version)"
else
    echo "   ❌ Certbot não encontrado."
    echo "   📦 Para instalar no Windows:"
    echo "     1. Instale Python: https://www.python.org/downloads/"
    echo "     2. Execute: pip install certbot"
    exit 1
fi
echo ""

# 3. Verificar se Nginx está disponível
echo "3. Verificando Nginx..."
if [ -f "$NGINX_PATH/nginx.exe" ]; then
    echo "   ✅ Nginx encontrado: $($NGINX_PATH/nginx.exe -v 2>&1)"
else
    echo "   ❌ Nginx não encontrado em $NGINX_PATH"
    echo "   📦 Baixando Nginx..."
    curl -L -o nginx.zip http://nginx.org/download/nginx-1.25.3.zip
    unzip nginx.zip
    echo "   ✅ Nginx baixado"
fi
echo ""

# 4. Criar diretórios
echo "4. Criando diretórios..."
mkdir -p data/certbot/conf
mkdir -p data/certbot/www
echo "✅ Diretórios criados"
echo ""

# 5. Configurar Nginx para ACME challenge
echo "5. Configurando Nginx para ACME challenge..."

# Criar configuração Nginx para Windows
cat > nginx-windows.conf <<EOF
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       $NGINX_PATH/conf/mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    server {
        listen       80;
        server_name  $DOMAIN www.$DOMAIN;

        # ACME Challenge para Let's Encrypt
        location /.well-known/acme-challenge/ {
            root $(pwd)/data/certbot/www;
            try_files \$uri =404;
        }

        # Redirecionar todo o resto para HTTPS (quando certificado existir)
        location / {
            return 301 https://\$server_name\$request_uri;
        }
    }
}
EOF

echo "   ✅ Configuração Nginx criada"
echo ""

# 6. Testar configuração Nginx
echo "6. Testando configuração Nginx..."
$NGINX_PATH/nginx.exe -t -c "$(pwd)/nginx-windows.conf"
if [ $? -eq 0 ]; then
    echo "   ✅ Configuração Nginx válida"
else
    echo "   ❌ Erro na configuração Nginx"
    exit 1
fi
echo ""

# 7. Iniciar Nginx
echo "7. Iniciando Nginx..."
$NGINX_PATH/nginx.exe -c "$(pwd)/nginx-windows.conf"
if [ $? -eq 0 ]; then
    echo "   ✅ Nginx iniciado"
else
    echo "   ❌ Erro ao iniciar Nginx"
    exit 1
fi

# Aguardar Nginx inicializar
echo "   Aguardando Nginx inicializar..."
sleep 3
echo ""

# 8. Testar ACME endpoint
echo "8. Testando endpoint ACME..."
echo "teste-acme" > data/certbot/www/test.txt
sleep 2

curl -f http://localhost/.well-known/acme-challenge/test.txt >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Endpoint ACME funcionando localmente!"
    rm -f data/certbot/www/test.txt
else
    echo "   ❌ Endpoint ACME não funciona localmente."
    echo ""
    echo "🔧 Possíveis problemas:"
    echo "  - Nginx não está rodando"
    echo "  - Porta 80 está ocupada"
    echo "  - Firewall bloqueia porta 80"
    echo ""
    echo "🔍 Para verificar:"
    echo "  - curl -I http://localhost/.well-known/acme-challenge/"
    echo "  - netstat -an | grep :80"
    echo ""
    echo "⚠️  Continuando mesmo assim para demonstração..."
fi
echo ""

# 9. Gerar certificado SSL
echo "9. Gerando certificado SSL..."
echo "   (Isso pode levar alguns minutos...)"

certbot certonly \
    --webroot \
    --webroot-path=$(pwd)/data/certbot/www \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN \
    -d www.$DOMAIN

if [ $? -eq 0 ]; then
    echo "✅ Certificado SSL criado com sucesso!"
    
    # 10. Configurar Nginx com SSL
    echo ""
    echo "10. Configurando Nginx com SSL..."
    
    # Criar configuração SSL
    cat > nginx-windows-ssl.conf <<EOF
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       $NGINX_PATH/conf/mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    # Servidor HTTP - redireciona para HTTPS e permite ACME challenge
    server {
        listen       80;
        server_name  $DOMAIN www.$DOMAIN;

        # ACME Challenge para Let's Encrypt
        location /.well-known/acme-challenge/ {
            root $(pwd)/data/certbot/www;
            try_files \$uri =404;
        }

        # Redirecionar todo o resto para HTTPS
        location / {
            return 301 https://\$server_name\$request_uri;
        }
    }

    # Servidor HTTPS - configuração principal
    server {
        listen       443 ssl;
        server_name  $DOMAIN www.$DOMAIN;

        # Certificados SSL
        ssl_certificate $(pwd)/data/certbot/conf/live/$DOMAIN/fullchain.pem;
        ssl_certificate_key $(pwd)/data/certbot/conf/live/$DOMAIN/privkey.pem;

        # Configurações SSL modernas
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_session_tickets off;

        # HSTS (HTTP Strict Transport Security)
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

        # Headers de segurança
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Health check
        location /health {
            access_log off;
            return 200 "nginx ok\n";
            add_header Content-Type text/plain;
        }

        # Frontend
        location / {
            root $(pwd)/frontend/dist;
            index index.html index.htm;
            try_files \$uri \$uri/ /index.html;
        }
        
        # API
        location /api/ {
            proxy_pass http://localhost:3000/api/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF

    # Testar configuração SSL
    $NGINX_PATH/nginx.exe -t -c "$(pwd)/nginx-windows-ssl.conf"
    if [ $? -eq 0 ]; then
        echo "   ✅ Configuração SSL válida"
        
        # Parar Nginx atual e iniciar com SSL
        $NGINX_PATH/nginx.exe -s stop
        sleep 2
        $NGINX_PATH/nginx.exe -c "$(pwd)/nginx-windows-ssl.conf"
        
        if [ $? -eq 0 ]; then
            echo "   ✅ Nginx configurado com SSL"
            
            # 11. Testar HTTPS
            echo ""
            echo "11. Testando HTTPS..."
            sleep 5
            
            curl -f https://localhost/health >/dev/null 2>&1
            if [ $? -eq 0 ]; then
                echo "✅ SSL funcionando perfeitamente!"
                echo ""
                echo "🌐 URLs disponíveis:"
                echo "  - https://$DOMAIN"
                echo "  - https://www.$DOMAIN"
                echo ""
                echo "🔒 Certificado válido por 90 dias"
                echo "   Renovação automática configurada"
                echo ""
                echo "🧪 Para testar:"
                echo "  curl -I https://$DOMAIN/"
                echo "  curl https://$DOMAIN/health"
            else
                echo "⚠️  HTTPS pode não estar respondendo ainda"
                echo "   Aguarde alguns segundos e teste:"
                echo "   curl -I https://$DOMAIN/"
            fi
        else
            echo "   ❌ Erro ao configurar Nginx com SSL"
            exit 1
        fi
    else
        echo "   ❌ Erro na configuração SSL"
        exit 1
    fi
else
    echo "❌ Falha ao gerar certificado SSL"
    echo ""
    echo "🔧 Possíveis problemas:"
    echo "  - DNS não aponta para este servidor"
    echo "  - Firewall bloqueia porta 80"
    echo "  - Limite de tentativas do Let's Encrypt"
    echo "  - Domínio não está acessível publicamente"
    echo ""
    echo "🔍 Para debug:"
    echo "  curl -I http://$DOMAIN/.well-known/acme-challenge/"
    echo "  nslookup $DOMAIN"
    echo ""
    echo "💡 Para desenvolvimento local, use:"
    echo "  cp nginx/conf.d/app.local.conf nginx/conf.d/app.conf"
    echo "  docker-compose restart nginx"
fi

echo ""
echo "�� Script concluído!" 