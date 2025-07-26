#!/bin/bash

echo "Ì∑™ Testando Configura√ß√£o Nginx (HTTP/HTTPS)"
echo "============================================"

# Detectar se √© configura√ß√£o local ou produ√ß√£o
if curl -s http://localhost/health >/dev/null 2>&1; then
    BASE_URL="http://localhost"
    MODE="LOCAL"
    echo "Ìø† Modo: Desenvolvimento Local"
elif curl -s https://fgtsagent.com.br/health >/dev/null 2>&1; then
    BASE_URL="https://fgtsagent.com.br"
    MODE="PRODUCTION"
    echo "Ì∫Ä Modo: Produ√ß√£o SSL"
else
    echo "‚ùå Nenhuma configura√ß√£o detectada"
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

# Fun√ß√£o para testar endpoint
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo -n "Ì¥ç Testando $description... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$status" -eq "$expected_status" ]; then
        echo -e "${GREEN}‚úÖ OK ($status)${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}‚ùå FALHOU ($status, esperado $expected_status)${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Fun√ß√£o para testar headers
test_headers() {
    local url=$1
    local header=$2
    local description=$3
    
    echo -n "Ì¥ç Testando $description... "
    
    if curl -s -I "$url" 2>/dev/null | grep -q "$header"; then
        echo -e "${GREEN}‚úÖ OK${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}‚ùå FALHOU${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo ""
echo "Ì≥ã 1. Testando Frontend (Arquivos Est√°ticos)"
echo "--------------------------------------------"
test_endpoint "$BASE_URL/" "P√°gina principal"
test_endpoint "$BASE_URL/dashboard" "SPA Fallback"
test_endpoint "$BASE_URL/login" "Rota SPA"

echo ""
echo "Ì≥ã 2. Testando Backend (APIs via Proxy)"
echo "---------------------------------------"
test_endpoint "$API_URL/health/health" "Health check da API"
test_endpoint "$BASE_URL/health" "Health check do Nginx"

echo ""
echo "Ì≥ã 3. Testando Headers de Seguran√ßa"
echo "-----------------------------------"
test_headers "$BASE_URL/" "X-Frame-Options" "X-Frame-Options"
test_headers "$BASE_URL/" "X-Content-Type-Options" "X-Content-Type-Options"
test_headers "$BASE_URL/" "X-XSS-Protection" "X-XSS-Protection"

if [ "$MODE" = "PRODUCTION" ]; then
    echo ""
    echo "Ì≥ã 4. Testando Headers SSL (Produ√ß√£o)"
    echo "------------------------------------"
    test_headers "$BASE_URL/" "Strict-Transport-Security" "HSTS"
    
    echo ""
    echo "Ì≥ã 5. Testando Redirecionamento HTTP‚ÜíHTTPS"
    echo "------------------------------------------"
    redirect_status=$(curl -s -o /dev/null -w "%{http_code}" "http://fgtsagent.com.br/" 2>/dev/null)
    if [ "$redirect_status" -eq "301" ]; then
        echo -e "Ì¥ç Testando redirecionamento HTTP‚ÜíHTTPS... ${GREEN}‚úÖ OK (301)${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "Ì¥ç Testando redirecionamento HTTP‚ÜíHTTPS... ${RED}‚ùå FALHOU ($redirect_status)${NC}"
        FAILED=$((FAILED + 1))
    fi
fi

echo ""
echo "Ì≥ã Final. Testando Proxy Configuration"
echo "-------------------------------------"
echo -n "Ì¥ç Testando se API √© proxied corretamente... "
api_response=$(curl -s "$API_URL/health/health" 2>/dev/null)
if echo "$api_response" | grep -q "status.*healthy"; then
    echo -e "${GREEN}‚úÖ OK - API responde via proxy${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}‚ùå FALHOU - API n√£o responde via proxy${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "Ì≥ä Resumo dos Testes"
echo "==================="
echo -e "‚úÖ Testes passaram: ${GREEN}$PASSED${NC}"
echo -e "‚ùå Testes falharam: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}Ìæâ Todos os testes passaram! Nginx est√° configurado corretamente.${NC}"
    echo ""
    echo "‚úÖ Frontend: Nginx serve arquivos est√°ticos"
    echo "‚úÖ Backend: Nginx faz proxy para APIs"
    echo "‚úÖ Seguran√ßa: Headers configurados"
    echo "‚úÖ SPA: Fallback funcionando"
    if [ "$MODE" = "PRODUCTION" ]; then
        echo "‚úÖ SSL: HTTPS funcionando"
        echo "‚úÖ Redirecionamento: HTTP‚ÜíHTTPS"
    fi
else
    echo ""
    echo -e "${RED}‚ö†Ô∏è  Alguns testes falharam. Verifique a configura√ß√£o.${NC}"
fi

echo ""
echo "Ì∫Ä URLs ativas:"
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
echo "Ìª†Ô∏è  Comandos √∫teis:"
echo "docker-compose logs -f nginx    # Ver logs do Nginx"
echo "docker-compose logs -f api      # Ver logs da API"
echo "docker-compose ps               # Status dos servi√ßos"
