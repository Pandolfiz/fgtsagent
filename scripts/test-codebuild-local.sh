#!/bin/bash

echo "🧪 Testando builds localmente (simulação do CodeBuild)"
echo "====================================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para testar build da API
test_api_build() {
    echo -e "\n${BLUE}🔧 Testando build da API...${NC}"
    
    if [ -d "src" ]; then
        echo -e "${GREEN}✅ Diretório src encontrado${NC}"
        
        if [ -f "src/Dockerfile" ]; then
            echo -e "${GREEN}✅ Dockerfile encontrado${NC}"
            
            echo -e "${BLUE}📦 Fazendo build da imagem da API...${NC}"
            cd src
            docker build -t test-api-codebuild . > ../logs/api-build.log 2>&1
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Build da API bem-sucedido${NC}"
                cd ..
                return 0
            else
                echo -e "${RED}❌ Build da API falhou${NC}"
                echo -e "${YELLOW}📋 Logs do build:${NC}"
                cat logs/api-build.log
                cd ..
                return 1
            fi
        else
            echo -e "${RED}❌ Dockerfile não encontrado em src/${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Diretório src não encontrado${NC}"
        return 1
    fi
}

# Função para testar build do Frontend
test_frontend_build() {
    echo -e "\n${BLUE}🎨 Testando build do Frontend...${NC}"
    
    if [ -d "frontend" ]; then
        echo -e "${GREEN}✅ Diretório frontend encontrado${NC}"
        
        if [ -f "frontend/Dockerfile" ]; then
            echo -e "${GREEN}✅ Dockerfile encontrado${NC}"
            
            echo -e "${BLUE}📦 Fazendo build da imagem do Frontend...${NC}"
            cd frontend
            docker build -t test-frontend-codebuild . > ../logs/frontend-build.log 2>&1
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Build do Frontend bem-sucedido${NC}"
                cd ..
                return 0
            else
                echo -e "${RED}❌ Build do Frontend falhou${NC}"
                echo -e "${YELLOW}📋 Logs do build:${NC}"
                cat ../logs/frontend-build.log
                cd ..
                return 1
            fi
        else
            echo -e "${RED}❌ Dockerfile não encontrado em frontend/${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Diretório frontend não encontrado${NC}"
        return 1
    fi
}

# Função para limpar imagens de teste
cleanup_test_images() {
    echo -e "\n${BLUE}🧹 Limpando imagens de teste...${NC}"
    docker rmi test-api-codebuild test-frontend-codebuild 2>/dev/null || true
    echo -e "${GREEN}✅ Limpeza concluída${NC}"
}

# Criar diretório de logs
mkdir -p logs

# Executar testes
echo -e "\n${BLUE}🚀 Iniciando testes...${NC}"

api_success=false
frontend_success=false

if test_api_build; then
    api_success=true
fi

if test_frontend_build; then
    frontend_success=true
fi

# Limpar imagens de teste
cleanup_test_images

# Resumo dos resultados
echo -e "\n${BLUE}📊 Resumo dos Testes:${NC}"
echo "================================"

if [ "$api_success" = true ]; then
    echo -e "${GREEN}✅ API: Build bem-sucedido${NC}"
else
    echo -e "${RED}❌ API: Build falhou${NC}"
fi

if [ "$frontend_success" = true ]; then
    echo -e "${GREEN}✅ Frontend: Build bem-sucedido${NC}"
else
    echo -e "${RED}❌ Frontend: Build falhou${NC}"
fi

echo ""

if [ "$api_success" = true ] && [ "$frontend_success" = true ]; then
    echo -e "${GREEN}🎉 Todos os builds estão funcionando!${NC}"
    echo -e "${GREEN}✅ CodeBuild deve funcionar corretamente${NC}"
    exit 0
else
    echo -e "${RED}❌ Alguns builds falharam${NC}"
    echo -e "${YELLOW}⚠️  Corrija os problemas antes de fazer deploy${NC}"
    exit 1
fi
