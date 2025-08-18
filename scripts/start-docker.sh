#!/bin/bash

echo "🚀 Iniciando aplicação Docker"
echo "============================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para verificar se Docker está rodando
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker não está rodando${NC}"
        echo "   Inicie o Docker Desktop ou execute: sudo systemctl start docker"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker está rodando${NC}"
}

# Função para verificar se arquivo .env existe
check_env() {
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  Arquivo .env não encontrado${NC}"
        if [ -f "src/env.example" ]; then
            echo -e "${BLUE}📋 Copiando env.example para .env${NC}"
            cp src/env.example .env
            echo -e "${GREEN}✅ Arquivo .env criado${NC}"
            echo -e "${YELLOW}⚠️  Configure as variáveis de ambiente em .env${NC}"
        else
            echo -e "${RED}❌ Arquivo env.example não encontrado${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Arquivo .env encontrado${NC}"
    fi
}

# Função para criar diretórios necessários
create_directories() {
    echo -e "${BLUE}📁 Criando diretórios necessários...${NC}"
    mkdir -p src/logs src/uploads data/certbot/conf data/certbot/www
    echo -e "${GREEN}✅ Diretórios criados${NC}"
}

# Função para parar containers existentes
stop_containers() {
    echo -e "${BLUE}🛑 Parando containers existentes...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ Containers parados${NC}"
}

# Função para fazer build das imagens
build_images() {
    echo -e "${BLUE}🔨 Fazendo build das imagens...${NC}"
    docker-compose build --no-cache
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Build concluído com sucesso${NC}"
    else
        echo -e "${RED}❌ Erro no build${NC}"
        exit 1
    fi
}

# Função para iniciar serviços
start_services() {
    echo -e "${BLUE}🚀 Iniciando serviços...${NC}"
    docker-compose up -d
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Serviços iniciados${NC}"
    else
        echo -e "${RED}❌ Erro ao iniciar serviços${NC}"
        exit 1
    fi
}

# Função para aguardar serviços ficarem prontos
wait_for_services() {
    echo -e "${BLUE}⏳ Aguardando serviços ficarem prontos...${NC}"
    sleep 10
    
    # Verificar API
    for i in {1..30}; do
        if curl -f http://localhost/api/health/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ API está pronta${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ API não ficou pronta em 30 segundos${NC}"
            return 1
        fi
        sleep 1
    done
    
    # Verificar Nginx
    for i in {1..10}; do
        if curl -f http://localhost/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Nginx está pronto${NC}"
            break
        fi
        if [ $i -eq 10 ]; then
            echo -e "${RED}❌ Nginx não ficou pronto em 10 segundos${NC}"
            return 1
        fi
        sleep 1
    done
}

# Função para mostrar status
show_status() {
    echo -e "${BLUE}📊 Status dos containers:${NC}"
    docker-compose ps
    
    echo ""
    echo -e "${BLUE}📋 Logs recentes:${NC}"
    docker-compose logs --tail=10
}

# Função para mostrar URLs
show_urls() {
    echo ""
    echo -e "${GREEN}🎉 Aplicação iniciada com sucesso!${NC}"
    echo ""
    echo -e "${BLUE}🌐 URLs de acesso:${NC}"
    echo -e "   Frontend: ${GREEN}http://localhost/${NC}"
    echo -e "   API: ${GREEN}http://localhost/api/${NC}"
    echo -e "   Health Check: ${GREEN}http://localhost/health${NC}"
    echo ""
    echo -e "${BLUE}📋 Comandos úteis:${NC}"
    echo -e "   Ver logs: ${YELLOW}docker-compose logs -f${NC}"
    echo -e "   Parar: ${YELLOW}docker-compose down${NC}"
    echo -e "   Reiniciar: ${YELLOW}docker-compose restart${NC}"
    echo -e "   Status: ${YELLOW}docker-compose ps${NC}"
}

# Executar verificações e inicialização
echo ""
check_docker
echo ""
check_env
echo ""
create_directories
echo ""
stop_containers
echo ""
build_images
echo ""
start_services
echo ""
wait_for_services
echo ""
show_status
echo ""
show_urls 