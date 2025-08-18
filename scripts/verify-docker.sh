#!/bin/bash

echo "🔍 Verificando configuração Docker"
echo "=================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se comando existe
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅ $1 encontrado${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 não encontrado${NC}"
        return 1
    fi
}

# Função para verificar arquivo
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ $1 existe${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 não existe${NC}"
        return 1
    fi
}

# Função para verificar porta
check_port() {
    if netstat -an | grep ":$1 " | grep LISTEN > /dev/null; then
        echo -e "${YELLOW}⚠️  Porta $1 está em uso${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Porta $1 está livre${NC}"
        return 0
    fi
}

echo ""
echo "1. Verificando comandos necessários..."
check_command docker
check_command docker-compose

echo ""
echo "2. Verificando arquivos de configuração..."
check_file "docker-compose.yml"
check_file "src/Dockerfile"
check_file "frontend/Dockerfile"
check_file "nginx/conf.d/app.conf"
check_file "nginx/conf.d/app.local.conf"

echo ""
echo "3. Verificando arquivo .env..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env existe${NC}"
else
    echo -e "${YELLOW}⚠️  .env não existe - copiando de env.example${NC}"
    if [ -f "src/env.example" ]; then
        cp src/env.example .env
        echo -e "${GREEN}✅ .env criado${NC}"
    else
        echo -e "${RED}❌ src/env.example não encontrado${NC}"
    fi
fi

echo ""
echo "4. Verificando portas..."
check_port 80
check_port 443
check_port 3000

echo ""
echo "5. Verificando configuração do nginx..."
if grep -q "proxy_pass http://api:3000/api/" nginx/conf.d/app.conf; then
    echo -e "${GREEN}✅ proxy_pass correto em app.conf${NC}"
else
    echo -e "${RED}❌ proxy_pass incorreto em app.conf${NC}"
fi

if grep -q "proxy_pass http://api:3000/api/" nginx/conf.d/app.local.conf; then
    echo -e "${GREEN}✅ proxy_pass correto em app.local.conf${NC}"
else
    echo -e "${RED}❌ proxy_pass incorreto em app.local.conf${NC}"
fi

echo ""
echo "6. Verificando health checks..."
if grep -q "api/health/health" docker-compose.yml; then
    echo -e "${GREEN}✅ Health check correto no docker-compose.yml${NC}"
else
    echo -e "${RED}❌ Health check incorreto no docker-compose.yml${NC}"
fi

if grep -q "api/health/health" src/Dockerfile; then
    echo -e "${GREEN}✅ Health check correto no src/Dockerfile${NC}"
else
    echo -e "${RED}❌ Health check incorreto no src/Dockerfile${NC}"
fi

echo ""
echo "7. Verificando volumes..."
if [ -d "src/logs" ]; then
    echo -e "${GREEN}✅ Diretório src/logs existe${NC}"
else
    echo -e "${YELLOW}⚠️  Criando diretório src/logs${NC}"
    mkdir -p src/logs
fi

if [ -d "src/uploads" ]; then
    echo -e "${GREEN}✅ Diretório src/uploads existe${NC}"
else
    echo -e "${YELLOW}⚠️  Criando diretório src/uploads${NC}"
    mkdir -p src/uploads
fi

echo ""
echo "8. Verificando Docker daemon..."
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker daemon está rodando${NC}"
else
    echo -e "${RED}❌ Docker daemon não está rodando${NC}"
    echo "   Execute: sudo systemctl start docker (Linux)"
    echo "   Ou inicie o Docker Desktop (Windows/Mac)"
    exit 1
fi

echo ""
echo "🎯 Verificação concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Execute: docker-compose build"
echo "2. Execute: docker-compose up -d"
echo "3. Execute: docker-compose logs -f"
echo ""
echo "🌐 URLs de acesso:"
echo "- Frontend: http://localhost/"
echo "- API: http://localhost/api/"
echo "- Health: http://localhost/health" 