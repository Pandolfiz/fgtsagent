# ��� Configuração SSL para fgtsagent.com.br

## Scripts Disponíveis

### ��� Para Produção (SSL/HTTPS)
```bash
./scripts/setup-ssl.sh
```
- Configura SSL com Let's Encrypt
- Gera certificados automáticos
- Configura redirecionamento HTTP→HTTPS
- Testa funcionamento completo

### ��� Para Desenvolvimento (HTTP)
```bash
./scripts/setup-local.sh
```
- Volta para configuração local
- HTTP apenas (localhost)
- Ideal para desenvolvimento

### ��� Teste Inteligente
```bash
./scripts/test-nginx-smart.sh
```
- Detecta automaticamente HTTP ou HTTPS
- Testa todas as funcionalidades
- Relatório completo de status

## Configurações

### Arquivos Nginx
- `nginx/conf.d/app.conf` - Configuração ativa
- `nginx/conf.d/app.local.conf` - Backup local
- Script SSL sobrescreve automaticamente

### Variáveis Importantes
- **Domínio:** fgtsagent.com.br
- **Email:** fgtsagent@gmail.com
- **Portas:** 80 (HTTP) + 443 (HTTPS)

## Pré-requisitos para SSL

### 1. DNS Configurado
```bash
dig +short fgtsagent.com.br
dig +short www.fgtsagent.com.br
# Ambos devem retornar o IP do servidor
```

### 2. Firewall Aberto
```bash
sudo ufw allow 80
sudo ufw allow 443
```

### 3. Domínio Acessível
```bash
curl -I http://fgtsagent.com.br/.well-known/acme-challenge/
# Deve retornar 404 (não 403 ou timeout)
```

## Fluxo de Deploy

### Desenvolvimento → Produção
```bash
# 1. No servidor de produção
git pull origin main

# 2. Build do frontend
cd frontend && npm run build && cd ..

# 3. Configurar SSL
./scripts/setup-ssl.sh

# 4. Testar
./scripts/test-nginx-smart.sh
```

### Produção → Desenvolvimento
```bash
# 1. Voltar para local
./scripts/setup-local.sh

# 2. Testar
./scripts/test-nginx-smart.sh
```

## Troubleshooting

### SSL não funciona
```bash
# Verificar DNS
dig +short fgtsagent.com.br

# Verificar ACME endpoint  
curl -I http://fgtsagent.com.br/.well-known/acme-challenge/

# Ver logs
docker-compose logs nginx
docker-compose logs certbot
```

### Local não funciona
```bash
# Recriar configuração
./scripts/setup-local.sh

# Verificar containers
docker-compose ps

# Ver logs
docker-compose logs nginx
```

## Arquivos Removidos/Renomeados

- ❌ `scripts/init-letsencrypt.sh` → `scripts/init-letsencrypt.sh.old`
- ✅ `scripts/setup-ssl.sh` (novo, simplificado)
- ✅ `scripts/setup-local.sh` (novo)
- ✅ `scripts/test-nginx-smart.sh` (novo, inteligente)

## Renovação Automática

O Certbot está configurado no `docker-compose.yml` para renovar automaticamente a cada 12 horas. Não é necessária intervenção manual.

## URLs Finais

### Desenvolvimento
- http://localhost/ (Frontend)
- http://localhost/api/health/health (API)

### Produção
- https://fgtsagent.com.br/ (Frontend)
- https://www.fgtsagent.com.br/ (Frontend)
- https://fgtsagent.com.br/api/health/health (API)
