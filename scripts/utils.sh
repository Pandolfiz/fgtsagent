#!/bin/bash

#================================================================
# Script de Utilities - FgtsAgent
# Versão: 1.0
# Descrição: Operações comuns de manutenção e debug
#================================================================

set -euo pipefail

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Função para exibir ajuda
show_help() {
    cat << EOF
🛠️ Utilities FgtsAgent

USO:
    $0 [COMANDO] [OPÇÕES]

COMANDOS:
    logs [serviço]      Mostrar logs (api, frontend, nginx, all)
    status              Status dos containers
    restart [serviço]   Reiniciar serviço específico
    shell [serviço]     Abrir shell no container
    db                  Operações do banco de dados
    clean               Limpeza de containers e imagens
    health              Verificar saúde dos serviços
    backup              Executar backup manual
    ssl                 Verificar certificados SSL

EXEMPLOS:
    $0 logs api                # Logs da API
    $0 restart nginx          # Reiniciar Nginx
    $0 shell api             # Shell no container da API
    $0 clean                 # Limpeza geral
EOF
}

# Função para logs
show_logs() {
    local service="${1:-all}"
    
    cd "$PROJECT_DIR"
    
    case "$service" in
        "all")
            echo -e "${BLUE}📋 Logs de todos os serviços:${NC}"
            docker compose logs -f --tail=100
            ;;
        "api"|"frontend"|"nginx"|"certbot")
            echo -e "${BLUE}📋 Logs do $service:${NC}"
            docker compose logs -f --tail=100 "$service"
            ;;
        *)
            echo -e "${RED}❌ Serviço inválido: $service${NC}"
            echo "Serviços disponíveis: api, frontend, nginx, certbot, all"
            exit 1
            ;;
    esac
}

# Função para status
show_status() {
    cd "$PROJECT_DIR"
    
    echo -e "${BLUE}📊 Status dos containers:${NC}"
    docker compose ps
    
    echo -e "\n${BLUE}💾 Uso de recursos:${NC}"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    
    echo -e "\n${BLUE}📈 Uso de disco:${NC}"
    df -h / | tail -1
}

# Função para reiniciar serviços
restart_service() {
    local service="${1:-}"
    
    if [[ -z "$service" ]]; then
        echo -e "${RED}❌ Especifique o serviço para reiniciar${NC}"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
    
    echo -e "${YELLOW}🔄 Reiniciando $service...${NC}"
    docker compose restart "$service"
    
    sleep 5
    echo -e "${GREEN}✅ $service reiniciado${NC}"
    docker compose ps "$service"
}

# Função para abrir shell
open_shell() {
    local service="${1:-api}"
    
    cd "$PROJECT_DIR"
    
    echo -e "${BLUE}🐚 Abrindo shell no $service...${NC}"
    
    case "$service" in
        "api")
            docker compose exec api /bin/bash
            ;;
        "frontend")
            docker compose exec frontend /bin/sh
            ;;
        "nginx")
            docker compose exec nginx /bin/sh
            ;;
        *)
            echo -e "${RED}❌ Shell não disponível para: $service${NC}"
            exit 1
            ;;
    esac
}

# Função para operações de BD
db_operations() {
    echo -e "${BLUE}🗄️ Operações do banco de dados (Supabase):${NC}"
    echo "1. Ver configuração"
    echo "2. Testar conexão"
    echo "3. Ver tabelas"
    echo -n "Escolha uma opção (1-3): "
    read -r choice
    
    cd "$PROJECT_DIR"
    
    case "$choice" in
        "1")
            echo -e "${BLUE}📋 Configuração do Supabase:${NC}"
            docker compose exec api node -e "
                require('dotenv').config();
                console.log('URL:', process.env.SUPABASE_URL);
                console.log('Anon Key:', process.env.SUPABASE_ANON_KEY ? '***configurada***' : 'não configurada');
                console.log('Service Key:', process.env.SUPABASE_SERVICE_KEY ? '***configurada***' : 'não configurada');
            "
            ;;
        "2")
            echo -e "${BLUE}🔗 Testando conexão...${NC}"
            docker compose exec api node -e "
                require('dotenv').config();
                const { createClient } = require('@supabase/supabase-js');
                const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
                client.from('users').select('count').then(r => console.log('✅ Conexão OK:', r.data || r.error));
            "
            ;;
        "3")
            echo -e "${BLUE}📋 Listando tabelas...${NC}"
            docker compose exec api node -e "
                require('dotenv').config();
                const { createClient } = require('@supabase/supabase-js');
                const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
                // Implementar listagem de tabelas
                console.log('📋 Verificar via Supabase Dashboard');
            "
            ;;
    esac
}

# Função de limpeza
clean_system() {
    cd "$PROJECT_DIR"
    
    echo -e "${YELLOW}🧹 Iniciando limpeza...${NC}"
    
    # Parar containers
    echo "Parando containers..."
    docker compose down
    
    # Remover imagens não utilizadas
    echo "Removendo imagens não utilizadas..."
    docker image prune -f
    
    # Remover volumes não utilizados
    echo "Removendo volumes não utilizados..."
    docker volume prune -f
    
    # Limpar logs antigos
    echo "Limpando logs antigos..."
    find "$PROJECT_DIR/src/logs" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    echo -e "${GREEN}✅ Limpeza concluída${NC}"
}

# Função para verificar saúde
check_health() {
    cd "$PROJECT_DIR"
    
    echo -e "${BLUE}🏥 Verificando saúde dos serviços...${NC}"
    
    # Status dos containers
    echo -e "\n📦 Containers:"
    docker compose ps
    
    # Healthchecks
    echo -e "\n🔍 Healthchecks:"
    docker inspect $(docker compose ps -q) --format='{{.Name}}: {{.State.Health.Status}}' 2>/dev/null || echo "Healthchecks não configurados"
    
    # Teste de conectividade
    echo -e "\n🌐 Conectividade:"
    
    # API
    if curl -s http://localhost:3000/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ API (localhost:3000)${NC}"
    else
        echo -e "${RED}❌ API (localhost:3000)${NC}"
    fi
    
    # Frontend (se em dev)
    if curl -s http://localhost:5173 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend (localhost:5173)${NC}"
    else
        echo -e "${YELLOW}⚠️ Frontend dev não acessível${NC}"
    fi
    
    # Nginx
    if curl -s http://localhost:8080 >/dev/null 2>&1 || curl -s http://localhost >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Nginx${NC}"
    else
        echo -e "${RED}❌ Nginx${NC}"
    fi
}

# Função para backup manual
run_backup() {
    echo -e "${BLUE}💾 Executando backup manual...${NC}"
    
    cd "$PROJECT_DIR"
    
    if [[ -f "scripts/backup.sh" ]]; then
        ./scripts/backup.sh
    else
        echo -e "${RED}❌ Script de backup não encontrado${NC}"
        exit 1
    fi
}

# Função para verificar SSL
check_ssl() {
    echo -e "${BLUE}🔒 Verificando certificados SSL...${NC}"
    
    local domain="fgtsagent.com.br"
    local cert_path="./data/certbot/conf/live/$domain/fullchain.pem"
    
    if [[ -f "$cert_path" ]]; then
        echo -e "${GREEN}✅ Certificado encontrado${NC}"
        
        # Verificar validade
        local exp_date=$(openssl x509 -enddate -noout -in "$cert_path" | cut -d= -f2)
        echo "📅 Expira em: $exp_date"
        
        # Verificar online
        if command -v openssl &> /dev/null; then
            echo "🌐 Verificação online:"
            echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates
        fi
    else
        echo -e "${RED}❌ Certificado não encontrado${NC}"
        echo "Execute: scripts/init-letsencrypt.sh"
    fi
}

# Função principal
main() {
    if [[ $# -eq 0 ]]; then
        show_help
        exit 0
    fi
    
    local command="$1"
    shift
    
    case "$command" in
        "logs")
            show_logs "$@"
            ;;
        "status")
            show_status
            ;;
        "restart")
            restart_service "$@"
            ;;
        "shell")
            open_shell "$@"
            ;;
        "db")
            db_operations
            ;;
        "clean")
            clean_system
            ;;
        "health")
            check_health
            ;;
        "backup")
            run_backup
            ;;
        "ssl")
            check_ssl
            ;;
        "--help"|"help")
            show_help
            ;;
        *)
            echo -e "${RED}❌ Comando inválido: $command${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 