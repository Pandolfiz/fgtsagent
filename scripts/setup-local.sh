#!/bin/bash

echo "��� Configurando para desenvolvimento local"
echo "=========================================="

# 1. Parar serviços
echo "1. Parando serviços..."
docker-compose down
echo ""

# 2. Usar configuração local
echo "2. Aplicando configuração local..."
if [ -f "nginx/conf.d/app.local.conf" ]; then
    cp nginx/conf.d/app.local.conf nginx/conf.d/app.conf
    echo "✅ Configuração local aplicada"
else
    echo "❌ Arquivo app.local.conf não encontrado"
    echo "   Criando configuração básica local..."
    
    cat > nginx/conf.d/app.conf << 'LOCALEOF'
# Configuração para desenvolvimento local (sem SSL)
server {
    listen 80;
    server_name localhost;

    # Health check para nginx
    location /health {
        access_log off;
        return 200 "nginx ok\n";
        add_header Content-Type text/plain;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # Servir arquivos estáticos do frontend
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # Headers de segurança
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header X-Frame-Options "SAMEORIGIN" always;
            add_header X-Content-Type-Options "nosniff" always;
            add_header X-XSS-Protection "1; mode=block" always;
        }
        
        location ~* \.(html|htm)$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header X-Frame-Options "SAMEORIGIN" always;
            add_header X-Content-Type-Options "nosniff" always;
            add_header X-XSS-Protection "1; mode=block" always;
        }
    }
    
    # Proxy para API do backend
    location /api/ {
        proxy_pass http://api:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    client_max_body_size 100M;
}
LOCALEOF
    echo "✅ Configuração local criada"
fi
echo ""

# 3. Iniciar serviços
echo "3. Iniciando serviços..."
docker-compose up -d
echo ""

# 4. Aguardar inicialização
echo "4. Aguardando serviços iniciarem..."
sleep 8
echo ""

# 5. Testar
echo "5. Testando configuração local..."
curl -f http://localhost/health >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Nginx funcionando"
else
    echo "❌ Nginx não está respondendo"
fi

curl -f http://localhost/api/health/health >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ API funcionando"
else
    echo "❌ API não está respondendo"
fi

curl -f http://localhost/ >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Frontend funcionando"
else
    echo "❌ Frontend não está respondendo"
fi

echo ""
echo "��� URLs de desenvolvimento:"
echo "  - http://localhost/ (Frontend)"
echo "  - http://localhost/api/health/health (API)"
echo "  - http://localhost/health (Nginx)"
echo ""
echo "��� Configuração local pronta!"
