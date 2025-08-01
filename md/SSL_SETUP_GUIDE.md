# 🔒 Guia Completo de Configuração SSL

## 📋 Visão Geral

Este guia explica como configurar SSL/TLS para o domínio `fgtsagent.com.br` usando Let's Encrypt e Certbot.

## 🎯 Pré-requisitos

### 1. **Domínio Configurado**
- ✅ `fgtsagent.com.br` deve apontar para o IP do servidor
- ✅ `www.fgtsagent.com.br` deve apontar para o IP do servidor
- ✅ Porta 80 deve estar aberta no firewall

### 2. **Servidor Acessível**
- ✅ Servidor deve estar acessível publicamente
- ✅ IP público configurado corretamente

## 🚀 Opções de Configuração

### **Opção 1: Com Docker (Recomendado)**

```bash
# 1. Iniciar Docker Desktop
# 2. Executar o script
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh
```

### **Opção 2: Sem Docker (Local)**

```bash
# 1. Instalar dependências
# Ubuntu/Debian:
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# CentOS/RHEL:
sudo yum install nginx certbot python3-certbot-nginx

# Windows:
# 1. Instalar Python: https://www.python.org/downloads/
# 2. pip install certbot

# 2. Executar o script
chmod +x scripts/setup-ssl-local.sh
./scripts/setup-ssl-local.sh
```

### **Opção 3: Manual**

```bash
# 1. Criar diretórios
mkdir -p data/certbot/conf
mkdir -p data/certbot/www

# 2. Configurar Nginx para ACME challenge
sudo tee /etc/nginx/sites-available/fgtsagent > /dev/null <<EOF
server {
    listen 80;
    server_name fgtsagent.com.br www.fgtsagent.com.br;

    location /.well-known/acme-challenge/ {
        root /caminho/para/projeto/data/certbot/www;
        try_files \$uri =404;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF

# 3. Habilitar site
sudo ln -sf /etc/nginx/sites-available/fgtsagent /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 4. Gerar certificado
sudo certbot certonly \
    --webroot \
    --webroot-path=/caminho/para/projeto/data/certbot/www \
    --email fgtsagent@gmail.com \
    --agree-tos \
    --no-eff-email \
    -d fgtsagent.com.br \
    -d www.fgtsagent.com.br
```

## 🔧 Configuração do Nginx

### **Configuração de Produção (SSL)**

```nginx
# Servidor HTTP - redireciona para HTTPS e permite ACME challenge
server {
    listen 80;
    server_name fgtsagent.com.br www.fgtsagent.com.br;

    # ACME Challenge para Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files $uri =404;
    }

    # Redirecionar todo o resto para HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Servidor HTTPS - configuração principal
server {
    listen 443 ssl http2;
    server_name fgtsagent.com.br www.fgtsagent.com.br;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/fgtsagent.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fgtsagent.com.br/privkey.pem;

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
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    
    # API
    location /api/ {
        proxy_pass http://api:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🧪 Testes

### **Testar DNS**
```bash
dig +short fgtsagent.com.br
dig +short www.fgtsagent.com.br
```

### **Testar HTTP (ACME Challenge)**
```bash
curl -I http://fgtsagent.com.br/.well-known/acme-challenge/
```

### **Testar HTTPS**
```bash
curl -I https://fgtsagent.com.br/
curl https://fgtsagent.com.br/health
```

### **Verificar Certificado**
```bash
openssl s_client -connect fgtsagent.com.br:443 -servername fgtsagent.com.br
```

## 🔄 Renovação Automática

### **Com Docker**
```bash
# Renovação automática já configurada no docker-compose.yml
docker-compose up -d certbot
```

### **Sem Docker**
```bash
# Adicionar ao crontab
sudo crontab -e

# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🚨 Troubleshooting

### **Problema: DNS não resolve**
```bash
# Verificar DNS
dig +short fgtsagent.com.br
nslookup fgtsagent.com.br

# Aguardar propagação (pode levar até 48h)
```

### **Problema: Porta 80 bloqueada**
```bash
# Verificar firewall
sudo ufw status
sudo iptables -L

# Abrir porta 80
sudo ufw allow 80
sudo ufw allow 443
```

### **Problema: Certbot falha**
```bash
# Verificar logs
sudo certbot certificates
sudo certbot renew --dry-run

# Limpar certificados antigos
sudo certbot delete --cert-name fgtsagent.com.br
```

### **Problema: Nginx não inicia**
```bash
# Verificar configuração
sudo nginx -t

# Verificar logs
sudo tail -f /var/log/nginx/error.log
```

## 📊 Verificação de Segurança

### **Teste SSL Labs**
1. Acesse: https://www.ssllabs.com/ssltest/
2. Digite: `fgtsagent.com.br`
3. Aguarde o resultado

### **Headers de Segurança**
```bash
curl -I https://fgtsagent.com.br/
```

### **Verificar HSTS**
```bash
curl -I https://fgtsagent.com.br/ | grep -i hsts
```

## 🎯 Resultado Esperado

Após a configuração bem-sucedida:

- ✅ `https://fgtsagent.com.br` - Funcionando
- ✅ `https://www.fgtsagent.com.br` - Funcionando
- ✅ Redirecionamento HTTP → HTTPS automático
- ✅ Certificado válido por 90 dias
- ✅ Renovação automática configurada
- ✅ Headers de segurança aplicados
- ✅ HSTS habilitado

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs**: `docker-compose logs nginx certbot`
2. **Teste manualmente**: Execute os comandos do script passo a passo
3. **Consulte a documentação**: https://certbot.eff.org/
4. **Verifique o DNS**: Aguarde propagação se necessário

---

**🔒 SSL configurado com sucesso!** 🎉 