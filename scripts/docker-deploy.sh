#!/bin/bash

# Script para fazer build e deploy dos contêineres Docker
# Autor: Claude
# Data: maio/2025

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando deploy do SAAS FGTS...${NC}"

# Checando se docker-compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}docker-compose não encontrado. Por favor, instale Docker e docker-compose.${NC}"
    exit 1
fi

# Parando contêineres existentes
echo -e "${YELLOW}Parando contêineres existentes...${NC}"
docker-compose down

# Construindo imagens
echo -e "${YELLOW}Construindo imagens Docker...${NC}"
docker-compose build --no-cache

# Checando por erros no build
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro durante o build. Abortando.${NC}"
    exit 1
fi

# Iniciando serviços
echo -e "${YELLOW}Iniciando serviços...${NC}"
docker-compose up -d

# Verificando status
echo -e "${YELLOW}Verificando status dos contêineres...${NC}"
sleep 5
docker-compose ps

echo -e "${GREEN}Deploy concluído com sucesso!${NC}"
echo -e "${YELLOW}Acesse o aplicativo em: http://localhost${NC}"
echo -e "${YELLOW}Painéis de administração:${NC}"
echo -e "${YELLOW}- Redis Commander: http://localhost:8081${NC}"

# Exibindo logs (opcional)
echo -e "${YELLOW}Deseja visualizar logs? (s/n)${NC}"
read VER_LOGS

if [[ "$VER_LOGS" == "s" || "$VER_LOGS" == "S" ]]; then
    docker-compose logs -f
fi

exit 0 