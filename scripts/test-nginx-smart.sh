#!/bin/bash

echo "� Testando Configuração Nginx (HTTP/HTTPS)"
echo "============================================"

# Detectar se é configuração local ou produção
if curl -s http://localhost/health >/dev/null 2>&1; then
    BASE_URL="http://localhost"
    MODE="LOCAL"
    echo "� Modo: Desenvolvimento Local"
elif curl -s https://fgtsagent.com.br/health >/dev/null 2>&1; then
    BASE_URL="https://fgtsagent.com.br"
    MODE="PRODUCTION"
    echo "� Modo: Produção SSL"
else
    echo "❌ Nenhuma configuração detectada"
    echo "   Tentativas:"
    echo "   - http://localhost/health"
    echo "   - https://fgtsagent.com.br/health"
    exit 1
fi

API_URL="$BASE_URL/api"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Contadores
PASSED=0
FAILED=0

# Função para testar endpoint
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo -n "� Testando $description... "
    
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
    
    echo -n "� Testando $description... "
    
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

echo ""
echo "� 1. Testando Frontend (Arquivos Estáticos)"
echo "--------------------------------------------"
test_endpoint "$BASE_URL/" "Página principal"
test_endpoint "$BASE_URL/dashboard" "SPA Fallback"
test_endpoint "$BASE_URL/login" "Rota SPA"

echo ""
echo "� 2. Testando Backend (APIs via Proxy)"
echo "---------------------------------------"
test_endpoint "$API_URL/health/health" "Health check da API"
test_endpoint "$BASE_URL/health" "Health check do Nginx"

echo ""
echo "� 3. Testando Headers de Segurança"
echo "-----------------------------------"
test_headers "$BASE_URL/" "X-Frame-Options" "X-Frame-Options"
test_headers "$BASE_URL/" "X-Content-Type-Options" "X-Content-Type-Options"
test_headers "$BASE_URL/" "X-XSS-Protection" "X-XSS-Protection"

if [ "$MODE" = "PRODUCTION" ]; then
    echo ""
    echo "� 4. Testando Headers SSL (Produção)"
    echo "------------------------------------"
    test_headers "$BASE_URL/" "Strict-Transport-Security" "HSTS"
    
    echo ""
    echo "� 5. Testando Redirecionamento HTTP→HTTPS"
    echo "------------------------------------------"
    redirect_status=$(curl -s -o /dev/null -w "%{http_code}" "http://fgtsagent.com.br/" 2>/dev/null)
    if [ "$redirect_status" -eq "301" ]; then
        echo -e "� Testando redirecionamento HTTP→HTTPS... ${GREEN}✅ OK (301)${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "� Testando redirecionamento HTTP→HTTPS... ${RED}❌ FALHOU ($redirect_status)${NC}"
        FAILED=$((FAILED + 1))
    fi
fi

echo ""
echo "� Final. Testando Proxy Configuration"
echo "-------------------------------------"
echo -n "� Testando se API é proxied corretamente... "
api_response=$(curl -s "$API_URL/health/health" 2>/dev/null)
if echo "$api_response" | grep -q "status.*healthy"; then
    echo -e "${GREEN}✅ OK - API responde via proxy${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FALHOU - API não responde via proxy${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "� Resumo dos Testes"
echo "==================="
echo -e "✅ Testes passaram: ${GREEN}$PASSED${NC}"
echo -e "❌ Testes falharam: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}� Todos os testes passaram! Nginx está configurado corretamente.${NC}"
    echo ""
    echo "✅ Frontend: Nginx serve arquivos estáticos"
    echo "✅ Backend: Nginx faz proxy para APIs"
    echo "✅ Segurança: Headers configurados"
    echo "✅ SPA: Fallback funcionando"
    if [ "$MODE" = "PRODUCTION" ]; then
        echo "✅ SSL: HTTPS funcionando"
        echo "✅ Redirecionamento: HTTP→HTTPS"
    fi
else
    echo ""
    echo -e "${RED}⚠️  Alguns testes falharam. Verifique a configuração.${NC}"
fi

echo ""
echo "� URLs ativas:"
if [ "$MODE" = "LOCAL" ]; then
    echo "  - http://localhost/ (Frontend)"
    echo "  - http://localhost/api/health/health (API)"
    echo "  - http://localhost/health (Nginx)"
else
    echo "  - https://fgtsagent.com.br/ (Frontend)"
    echo "  - https://fgtsagent.com.br/api/health/health (API)"
    echo "  - https://fgtsagent.com.br/health (Nginx)"
fi

echo ""
echo "�️  Comandos úteis:"
echo "docker-compose logs -f nginx    # Ver logs do Nginx"
echo "docker-compose logs -f api      # Ver logs da API"
echo "docker-compose ps               # Status dos serviços"
