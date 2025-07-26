#!/bin/bash

echo "🧪 Testando Configuração Nginx em Produção"
echo "=========================================="

BASE_URL="http://localhost"
API_URL="$BASE_URL/api"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASSED=0
FAILED=0

# Função para testar endpoint
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo -n "🔍 Testando $description... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$status" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ OK ($status)${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FALHOU ($status, esperado $expected_status)${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Função para testar headers
test_headers() {
    local url=$1
    local header=$2
    local description=$3
    
    echo -n "🔍 Testando $description... "
    
    if curl -s -I "$url" 2>/dev/null | grep -q "$header"; then
        echo -e "${GREEN}✅ OK${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FALHOU${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Função para verificar se serviços estão rodando
check_services() {
    echo "🔍 Verificando se os serviços estão rodando..."
    
    if docker-compose ps | grep -q "Up"; then
        echo -e "${GREEN}✅ Docker Compose services estão rodando${NC}"
        return 0
    else
        echo -e "${RED}❌ Serviços não estão rodando. Execute: docker-compose up -d${NC}"
        return 1
    fi
}

echo ""
echo "📋 0. Verificando Pré-requisitos"
echo "--------------------------------"
check_services

echo ""
echo "📋 1. Testando Frontend (Arquivos Estáticos)"
echo "--------------------------------------------"
test_endpoint "$BASE_URL/" "Página principal"
test_endpoint "$BASE_URL/dashboard" "SPA Fallback"
test_endpoint "$BASE_URL/login" "Rota SPA"

echo ""
echo "📋 2. Testando Backend (APIs via Proxy)"
echo "---------------------------------------"
test_endpoint "$API_URL/health/health" "Health check da API"
test_endpoint "$BASE_URL/health" "Health check do Nginx"

echo ""
echo "📋 3. Testando Headers de Segurança"
echo "-----------------------------------"
test_headers "$BASE_URL/" "X-Frame-Options" "X-Frame-Options"
test_headers "$BASE_URL/" "X-Content-Type-Options" "X-Content-Type-Options"
test_headers "$BASE_URL/" "X-XSS-Protection" "X-XSS-Protection"

echo ""
echo "📋 4. Testando Proxy Configuration"
echo "----------------------------------"
echo -n "🔍 Testando se API é proxied corretamente... "
api_response=$(curl -s "$API_URL/health/health" 2>/dev/null)
if echo "$api_response" | grep -q "status.*healthy"; then
    echo -e "${GREEN}✅ OK - API responde via proxy${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FALHOU - API não responde via proxy${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "📊 Resumo dos Testes"
echo "==================="
echo -e "✅ Testes passaram: ${GREEN}$PASSED${NC}"
echo -e "❌ Testes falharam: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Todos os testes passaram! Nginx está configurado corretamente.${NC}"
    echo ""
    echo "✅ Frontend: Nginx serve arquivos estáticos"
    echo "✅ Backend: Nginx faz proxy para APIs"
    echo "✅ Segurança: Headers configurados"
    echo "✅ SPA: Fallback funcionando"
else
    echo ""
    echo -e "${RED}⚠️  Alguns testes falharam. Verifique a configuração.${NC}"
fi

echo ""
echo "🚀 Comandos úteis:"
echo "docker-compose logs -f nginx    # Ver logs do Nginx"
echo "docker-compose logs -f api      # Ver logs da API"
echo "docker-compose ps               # Status dos serviços" 