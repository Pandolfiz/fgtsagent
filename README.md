# 🚀 FGTS Agent - Plataforma Web

Sistema de gerenciamento e consulta de saldo FGTS para usuários.

## 📋 Sobre o Projeto

FGTS Agent é uma aplicação web que permite aos usuários consultar, monitorar e gerenciar informações relacionadas ao seu Fundo de Garantia do Tempo de Serviço (FGTS). A plataforma oferece uma interface intuitiva e responsiva, desenvolvida com React no frontend e uma API robusta no backend.

## 🛠️ Tecnologias Utilizadas

### Frontend
- React.js
- Vite
- Tailwind CSS
- ESLint

### Backend
- Node.js
- Express
- MongoDB
- Redis (para cache e sessões)

### Infraestrutura
- Docker e Docker Compose
- Nginx (proxy reverso e servidor web)
- Let's Encrypt (SSL/TLS)

## 🏗️ Arquitetura

A aplicação segue uma arquitetura de microserviços, com os seguintes componentes:

- **Frontend**: Aplicação React servida por Nginx
- **Backend API**: Serviço Node.js REST API
- **Banco de Dados**: MongoDB para armazenamento persistente
- **Cache**: Redis para armazenamento em cache e gerenciamento de sessões
- **Proxy Reverso**: Nginx para roteamento de requisições e SSL/TLS

## 🚦 Estrutura do Projeto

```
saas_fgts_project/
├── api/                  # Backend da aplicação
│   ├── src/              # Código fonte
│   ├── Dockerfile        # Configuração de build do container
│   └── package.json      # Dependências do Node.js
├── frontend/             # Frontend React
│   ├── src/              # Código fonte React
│   ├── dist/             # Build compilado
│   ├── Dockerfile        # Configuração do container
│   └── package.json      # Dependências do frontend
├── nginx/                # Configurações do Nginx
│   ├── conf.d/           # Arquivos de configuração
│   │   └── app.conf      # Configuração principal
│   └── frontend/         # Configuração específica para o frontend
│       └── default.conf  # Configuração para SPA React
├── data/                 # Volumes persistentes (certificados, etc)
│   └── certbot/          # Certificados SSL/TLS
├── scripts/              # Scripts utilitários
│   └── init-letsencrypt.sh  # Script de inicialização SSL
└── docker-compose.yml    # Configuração dos serviços Docker
```

## 🔧 Instalação e Configuração

### Pré-requisitos
- Docker (20.10+)
- Docker Compose (v2+)
- Git
- Domínio configurado para apontar para seu servidor (fgtsagent.com.br)

### Clone e Configuração Inicial

```bash
# Clonar o repositório
git clone https://github.com/seuusuario/saas_fgts_project.git
cd saas_fgts_project

# Configurar variáveis de ambiente (exemplo)
cp .env.example .env
nano .env  # Editar conforme necessário

# Inicializar certificados SSL
chmod +x scripts/init-letsencrypt.sh
./scripts/init-letsencrypt.sh

# Iniciar a aplicação
docker-compose up -d
```

### Configuração do Domínio

1. Certifique-se de que seu domínio (`fgtsagent.com.br`) aponta para o IP do seu servidor
2. Verifique se as portas 80 e 443 estão abertas no firewall
3. Os certificados SSL são obtidos automaticamente via Let's Encrypt

### Configuração do Nginx

O arquivo principal de configuração está em `nginx/conf.d/app.conf`. Para aplicativos React SPA (Single Page Application), uma configuração especial é necessária para lidar com o roteamento do lado do cliente:

```nginx
# Exemplo de configuração para React SPA
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
    
    # Cabeçalhos de segurança
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
}
```

## 🚀 Desenvolvimento

### Executando em Ambiente de Desenvolvimento

```bash
# Iniciar todos os serviços
docker-compose up -d

# Acompanhar logs
docker-compose logs -f

# Verificar status dos containers
docker-compose ps
```

### Acesso à Aplicação

- Frontend: https://fgtsagent.com.br
- API: https://fgtsagent.com.br/api

## 🔄 Processo de Atualização

### Atualização Manual

```bash
# Pare os serviços atuais
docker-compose down

# Puxe as últimas alterações
git pull origin main

# Reconstrua as imagens
docker-compose build --no-cache api frontend

# Inicie novamente
docker-compose up -d
```

### Atualização Automatizada

Para automatizar o processo de atualização, criamos um script:

1. Crie o arquivo `atualizar.sh` na raiz do projeto:

```bash
#!/bin/bash

echo "🤖 Iniciando atualização do FGTS Agent..."

# Registrar data e hora da atualização
echo "=========================" >> atualizacao.log
echo "Atualização iniciada em: $(date)" >> atualizacao.log

# Puxar alterações do repositório
git pull origin main

# Parar serviços
docker-compose down

# Reconstruir imagens
docker-compose build --no-cache api frontend

# Iniciar serviços
docker-compose up -d

# Verificar status
docker-compose ps >> atualizacao.log

# Verificar se há erros nos logs
echo "Verificando logs por erros..." >> atualizacao.log
docker-compose logs --tail=100 nginx >> atualizacao.log
docker-compose logs --tail=100 api >> atualizacao.log

echo "✅ Atualização concluída em: $(date)" >> atualizacao.log
echo "=========================" >> atualizacao.log
echo "Aplicação atualizada com sucesso!"
```

2. Torne o script executável:
```bash
chmod +x atualizar.sh
```

3. Para configurar atualizações automáticas diárias:
```bash
crontab -e
# Adicione a linha para executar às 4h da manhã:
0 4 * * * cd /caminho/para/saas_fgts_project && ./atualizar.sh >> atualizacao.log 2>&1
```

## 📋 Manutenção

### Logs e Monitoramento

```bash
# Ver logs de um serviço específico
docker-compose logs api
docker-compose logs frontend
docker-compose logs nginx

# Monitorar em tempo real
docker-compose logs -f

# Verificar status dos contêineres
docker-compose ps
```

### Validação das Configurações

```bash
# Verificar sintaxe da configuração do Nginx
docker-compose exec nginx nginx -t

# Verificar a versão e o status do Nginx
docker-compose exec nginx nginx -v
```

### Backup

É recomendado fazer backup regular dos dados e configurações:

```bash
# Backup do MongoDB (se aplicável)
docker exec -it saas_fgts_project_mongo_1 mongodump --out /backup

# Backup dos certificados SSL
cp -r data/certbot /backup/certbot

# Backup das configurações do Nginx
cp -r nginx/ /backup/nginx
```

### Renovação de Certificados SSL

A renovação dos certificados é automática pelo Certbot. No entanto, você pode forçar a renovação:

```bash
docker-compose run --rm certbot renew
```

## 🔒 Segurança

- Todas as comunicações são criptografadas via HTTPS
- As credenciais sensíveis devem ser armazenadas como variáveis de ambiente
- O acesso ao servidor deve ser limitado por SSH com chave pública/privada
- Recomenda-se usar um firewall para limitar o acesso apenas às portas 80 e 443

## ⚠️ Solução de Problemas Comuns

### Erros de Configuração do Nginx

Se você encontrar erros como `unknown directive` ou `syntax error`:

```bash
# Verifique a sintaxe da configuração
docker-compose exec nginx nginx -t

# Edite o arquivo de configuração com problema
nano nginx/conf.d/app.conf

# Reinicie apenas o serviço Nginx após editar
docker-compose restart nginx
```

### Erros no YAML do Docker Compose

Se você encontrar erros como `yaml.parser.ParserError`:

1. O YAML é extremamente sensível à indentação. Certifique-se de que todos os espaços e recuos estejam corretos.
2. Não use tabs, apenas espaços.
3. Verifique se todas as chaves têm valores correspondentes.

```bash
# Para validar seu arquivo docker-compose.yml sem executá-lo
docker-compose config
```

### Problemas com Certificados SSL

```bash
# Verifique os logs do Certbot
docker-compose logs certbot

# Certifique-se de que o domínio aponta para o IP correto
dig fgtsagent.com.br

# Renovar manualmente os certificados
docker-compose run --rm certbot certonly --webroot -w /var/www/certbot -d fgtsagent.com.br
```

### Problemas de Comunicação entre Serviços

Se os serviços não conseguirem se comunicar entre si:

1. Verifique se todos os serviços estão rodando: `docker-compose ps`
2. Verifique se a rede correta está sendo usada: `docker network ls`
3. Verifique a resolução DNS interna: `docker-compose exec api ping frontend`

## 🤝 Contribuição

Para contribuir com o projeto:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a licença MIT.

## 📞 Contato

Para mais informações, entre em contato pelo email: contato@fgtsagent.com.br 