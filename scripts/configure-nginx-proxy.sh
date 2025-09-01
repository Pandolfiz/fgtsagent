#!/bin/bash

echo "🔧 Configurando Nginx como proxy reverso para desenvolvimento..."

# Criar diretório nginx se não existir
mkdir -p nginx/dev

# Criar configuração do Nginx para desenvolvimento
cat > nginx/dev/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    # Configuração SSL para desenvolvimento
    ssl_certificate /c/Users/luizf/OneDrive/Área\ de\ Trabalho/CODE/SAAS/stable-src/frontend/certs/cert.pem;
    ssl_certificate_key /c/Users/luizf/OneDrive/Área\ de\ Trabalho/CODE/SAAS/stable-src/frontend/certs/key.pem;
    
    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    server {
        listen 80;
        server_name localhost;
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl;
        server_name localhost;
        
        # Proxy para frontend (Vite)
        location / {
            proxy_pass https://localhost:5173;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Configurações para WebSocket (Vite HMR)
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
        
        # Proxy para API (backend)
        location /api/ {
            proxy_pass https://localhost:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

echo "✅ Configuração do Nginx criada!"
echo ""
echo "📋 Arquivo criado: nginx/dev/nginx.conf"
echo ""
echo "🔧 Próximos passos:"
echo "   1. Instalar Nginx (se necessário)"
echo "   2. Iniciar Nginx com a configuração"
echo "   3. Testar a integração"
echo ""
echo "🔄 Execute: ./scripts/start-nginx-dev.sh"


