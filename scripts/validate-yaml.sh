#!/bin/bash

echo "🔍 Validando arquivos YAML do projeto"
echo "====================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para validar arquivo YAML
validate_yaml() {
    local file="$1"
    local filename=$(basename "$file")
    
    echo -e "\n${BLUE}🔍 Validando: $filename${NC}"
    
    if python -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
        echo -e "${GREEN}✅ $filename: YAML válido${NC}"
        return 0
    else
        echo -e "${RED}❌ $filename: YAML inválido${NC}"
        echo -e "${YELLOW}📋 Erro de validação:${NC}"
        python -c "import yaml; yaml.safe_load(open('$file'))" 2>&1 | head -5
        return 1
    fi
}

# Contadores
total_files=0
valid_files=0
invalid_files=0

# Validar buildspecs
echo -e "\n${BLUE}📋 Validando buildspecs:${NC}"
for file in buildspec-*.yml; do
    if [ -f "$file" ]; then
        total_files=$((total_files + 1))
        if validate_yaml "$file"; then
            valid_files=$((valid_files + 1))
        else
            invalid_files=$((invalid_files + 1))
        fi
    fi
done

# Validar outros arquivos YAML
echo -e "\n${BLUE}📋 Validando outros arquivos YAML:${NC}"
for file in $(find . -name "*.yml" -o -name "*.yaml" | grep -v buildspec | grep -v node_modules); do
    if [ -f "$file" ]; then
        total_files=$((total_files + 1))
        if validate_yaml "$file"; then
            valid_files=$((valid_files + 1))
        else
            invalid_files=$((invalid_files + 1))
        fi
    fi
done

# Resumo
echo -e "\n${BLUE}📊 Resumo da Validação:${NC}"
echo "================================"
echo -e "Total de arquivos: ${BLUE}$total_files${NC}"
echo -e "✅ Válidos: ${GREEN}$valid_files${NC}"
echo -e "❌ Inválidos: ${RED}$invalid_files${NC}"

if [ $invalid_files -eq 0 ]; then
    echo -e "\n${GREEN}🎉 Todos os arquivos YAML estão válidos!${NC}"
    echo -e "${GREEN}✅ CodeBuild deve funcionar corretamente${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Existem arquivos YAML inválidos${NC}"
    echo -e "${YELLOW}⚠️  Corrija os problemas antes de fazer deploy${NC}"
    exit 1
fi
