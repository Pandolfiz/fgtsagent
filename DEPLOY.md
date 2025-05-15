# Guia de Deploy para FGTS Agent

Este documento contém instruções detalhadas para fazer o deploy do FGTS Agent em um servidor de produção com Docker e SSL.

## Requisitos do Servidor

- Ubuntu 22.04 LTS ou superior
- Docker 24.x ou superior
- Docker Compose v2.x ou superior
- 2GB RAM mínimo (4GB recomendado)
- 20GB de espaço em disco
- Portas 80 e 443 liberadas no firewall

## 1. Preparação do Servidor

### Atualizar o sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### Instalar Docker (se não estiver instalado)
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

### Instalar Docker Compose (se não estiver instalado)
```bash
sudo apt install docker-compose-plugin -y
```

## 2. Configuração de DNS

1. Configure seu domínio `fgtsagent.com.br` para apontar para o IP do seu servidor
2. Também configure o subdomínio `www.fgtsagent.com.br`
3. Aguarde a propagação do DNS (pode levar até 48 horas)

## 3. Preparação do Projeto

### Clonar ou transferir o projeto para o servidor
```bash
# Se estiver usando Git:
git clone seu-repositorio.git /path/to/app

# Alternativa: transferir via SCP
scp -r /caminho/local/projeto usuario@servidor:/path/to/app
```

### Configurar variáveis de ambiente
```bash
cd /path/to/app
cp src/.env.example src/.env
nano src/.env
```

Edite as variáveis conforme necessário.

## 4. Configuração SSL (Let's Encrypt)

### Prepare o ambiente para certificados
```bash
# Edite o script para adicionar seu email
nano init-letsencrypt.sh
chmod +x init-letsencrypt.sh
```

### Inicialize os certificados SSL
```bash
./init-letsencrypt.sh
```

## 5. Deploy da Aplicação

### Construir e iniciar os containers
```bash
# Remover qualquer build antiga (opcional)
docker-compose down --rmi all --volumes

# Construir e iniciar
docker-compose build
docker-compose up -d
```

### Verificar os logs
```bash
docker-compose logs -f
```

## 6. Verificação pós-deploy

### Testar o acesso
- Acesse `https://fgtsagent.com.br` no navegador
- Verifique se o certificado SSL está funcionando (cadeado verde)
- Teste as principais funcionalidades do sistema

### Verificar logs dos containers
```bash
# Logs do backend
docker-compose logs -f api

# Logs do frontend
docker-compose logs -f frontend

# Logs do nginx
docker-compose logs -f nginx
```

## 7. Backup e Manutenção

### Backup dos dados
```bash
# Backup dos volumes
docker run --rm -v fgts_redis-data:/source -v /backup:/backup alpine tar -czf /backup/redis-data-$(date +%Y%m%d).tar.gz -C /source .
```

### Atualização do aplicativo
```bash
# Baixar as atualizações
git pull  # Ou transfira novamente os arquivos

# Reconstruir e reiniciar
docker-compose down
docker-compose build
docker-compose up -d
```

## 8. Monitoramento

### Verificar status dos containers
```bash
docker-compose ps
```

### Monitorar uso de recursos
```bash
docker stats
```

## 9. Solução de Problemas

### Reiniciar um container específico
```bash
docker-compose restart nome-do-servico
```

### Verificar logs detalhados
```bash
docker-compose logs -f --tail=100 nome-do-servico
```

### Acessar um container
```bash
docker-compose exec nome-do-servico sh
```

---

## Notas de Segurança

1. **Regularmente atualize o sistema operacional e Docker:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Faça backup regular dos dados:**
   ```bash
   # Exemplo de backup automatizado
   echo "0 2 * * * root docker run --rm -v fgts_redis-data:/source -v /backup:/backup alpine tar -czf /backup/redis-\$(date +\%Y\%m\%d).tar.gz -C /source ." | sudo tee -a /etc/crontab
   ```

3. **Monitore os registros de segurança:**
   ```bash
   sudo grep "Failed password" /var/log/auth.log
   ```

4. **Configure um firewall:**
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

---

Para assistência adicional, consulte a documentação ou entre em contato com a equipe de desenvolvimento. 