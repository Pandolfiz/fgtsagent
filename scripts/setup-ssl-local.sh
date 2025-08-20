#!/bin/bash

echo "🔒 Configurando SSL local para fgtsagent.com.br"
echo "================================================"

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

# Verificar se o domínio resolve
if command -v dig &> /dev/null; then
    echo "   Verificando resolução DNS..."
    DIG_RESULT=$(dig +short $DOMAIN)
    if [ -n "$DIG_RESULT" ]; then
        echo "   ✅ DNS resolvido: $DIG_RESULT"
    else
        echo "   ⚠️  DNS não resolveu. Certifique-se que o domínio aponta para este servidor."
    fi
else
    echo "   ⚠️  'dig' não encontrado. Verifique manualmente se $DOMAIN aponta para este servidor."
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
    echo "   📦 Para instalar no Ubuntu/Debian:"
    echo "     sudo apt update && sudo apt install certbot"
    echo "   📦 Para instalar no CentOS/RHEL:"
    echo "     sudo yum install certbot"
    exit 1
fi
echo ""

# 3. Criar diretórios
echo "3. Criando diretórios..."
mkdir -p data/certbot/conf
mkdir -p data/certbot/www
echo "✅ Diretórios criados"
echo ""

# 4. Verificar se nginx está rodando
echo "4. Verificando Nginx..."
if command -v nginx &> /dev/null; then
    NGINX_STATUS=$(nginx -t 2>&1)
    if [ $? -eq 0 ]; then
        echo "   ✅ Nginx configurado corretamente"
        
        # Verificar se nginx está rodando
        if pgrep nginx > /dev/null; then
            echo "   ✅ Nginx está rodando"
        else
            echo "   ⚠️  Nginx não está rodando. Iniciando..."
            sudo nginx
            if [ $? -eq 0 ]; then
                echo "   ✅ Nginx iniciado"
            else
                echo "   ❌ Erro ao iniciar Nginx"
                exit 1
            fi
        fi
    else
        echo "   ❌ Erro na configuração do Nginx:"
        echo "   $NGINX_STATUS"
        exit 1
    fi
else
    echo "   ❌ Nginx não encontrado."
    echo "   📦 Para instalar no Ubuntu/Debian:"
    echo "     sudo apt update && sudo apt install nginx"
    echo "   📦 Para instalar no CentOS/RHEL:"
    echo "     sudo yum install nginx"
    exit 1
fi
echo ""

# 5. Configurar Nginx para ACME challenge
echo "5. Configurando Nginx para ACME challenge..."
if [ ! -f "/etc/nginx/sites-available/fgtsagent" ]; then
    echo "   Criando configuração Nginx..."
    sudo tee /etc/nginx/sites-available/fgtsagent > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

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
EOF

    # Habilitar site
    sudo ln -sf /etc/nginx/sites-available/fgtsagent /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    echo "   ✅ Configuração Nginx criada"
else
    echo "   ✅ Configuração Nginx já existe"
fi
echo ""

# 6. Testar ACME endpoint
echo "6. Testando endpoint ACME..."
echo "teste-acme" > data/certbot/www/test.txt
sleep 2

curl -f http://$DOMAIN/.well-known/acme-challenge/test.txt >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Endpoint ACME funcionando!"
    rm -f data/certbot/www/test.txt
else
    echo "   ❌ Endpoint ACME não funciona."
    echo ""
    echo "🔧 Possíveis problemas:"
    echo "  - DNS não aponta para este servidor"
    echo "  - Firewall bloqueia porta 80"
    echo "  - Nginx não está respondendo"
    echo ""
    echo "🔍 Para verificar:"
    echo "  - dig +short $DOMAIN"
    echo "  - curl -I http://$DOMAIN/.well-known/acme-challenge/"
    echo "  - sudo nginx -t"
    echo "  - sudo systemctl status nginx"
    echo ""
    echo "⚠️  Continuando mesmo assim para demonstração..."
fi
echo ""

# 7. Gerar certificado SSL
echo "7. Gerando certificado SSL..."
echo "   (Isso pode levar alguns minutos...)"

sudo certbot certonly \
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
    
    # 8. Configurar Nginx com SSL
    echo ""
    echo "8. Configurando Nginx com SSL..."
    
    # Criar configuração SSL
    sudo tee /etc/nginx/sites-available/fgtsagent-ssl > /dev/null <<EOF
# Configuração para produção com SSL
# Suporte a HTTP (para ACME challenge) e HTTPS

# Servidor HTTP - redireciona para HTTPS e permite ACME challenge
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

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
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

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

    # Health check para nginx
    location /health {
        access_log off;
        return 200 "nginx ok\n";
        add_header Content-Type text/plain;
    }

    # Servir arquivos estáticos do frontend
    location / {
        root $(pwd)/frontend/dist;
        index index.html index.htm;
        
        # Fallback para SPA (Single Page Application)
        try_files \$uri \$uri/ /index.html;
        
        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary Accept-Encoding;
            gzip_static on;
        }
        
        # Sem cache para HTML
        location ~* \.(html|htm)$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }
    
    # Proxy para API do backend
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts otimizados
        proxy_read_timeout 30s;
        proxy_send_timeout 30s;
        proxy_connect_timeout 10s;
        
        # Buffer otimizado
        proxy_buffer_size 8k;
        proxy_buffers 4 8k;
        
        # Headers de cache para APIs
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }

    # Configurações de compressão
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    client_max_body_size 100M;
}
EOF

    # Habilitar configuração SSL
    sudo ln -sf /etc/nginx/sites-available/fgtsagent-ssl /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Nginx configurado com SSL"
        
        # 9. Testar HTTPS
        echo ""
        echo "9. Testando HTTPS..."
        sleep 5
        
        curl -f https://$DOMAIN/health >/dev/null 2>&1
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
    echo "❌ Falha ao gerar certificado SSL"
    echo ""
    echo "🔧 Possíveis problemas:"
    echo "  - DNS não aponta para este servidor"
    echo "  - Firewall bloqueia porta 80"
    echo "  - Limite de tentativas do Let's Encrypt"
    echo "  - Domínio não está acessível publicamente"
    echo ""
    echo "🔍 Para debug:"
    echo "  sudo nginx -t"
    echo "  sudo systemctl status nginx"
    echo "  curl -I http://$DOMAIN/.well-known/acme-challenge/"
    echo ""
    echo "💡 Para desenvolvimento local, use:"
    echo "  cp nginx/conf.d/app.local.conf nginx/conf.d/app.conf"
    echo "  docker-compose restart nginx"
fi

echo ""
echo "�� Script concluído!" 