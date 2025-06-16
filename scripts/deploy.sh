#!/bin/bash

#================================================================
# Script de Deploy Unificado - FgtsAgent
# Versão: 2.0
# Descrição: Deploy inteligente com múltiplos ambientes
#================================================================

set -euo pipefail  # Fail on any error

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/deploy.log"
DATE=$(date +%Y%m%d_%H%M%S)

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de logging
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    log "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    log "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

log_step() {
    log "${BLUE}[STEP]${NC} $1"
}

# Função para exibir ajuda
show_help() {
    cat << EOF
🚀 Deploy Unificado - FgtsAgent

USO:
    $0 [AMBIENTE] [OPÇÕES]

AMBIENTES:
    dev         Deploy para desenvolvimento (com hot-reload)
    prod        Deploy para produção (somente essenciais)
    full        Deploy para produção completa (com backup, logs)

OPÇÕES:
    --no-cache      Rebuild sem cache
    --pull         Fazer git pull antes do deploy
    --logs         Mostrar logs após deploy
    --help         Mostrar esta ajuda

EXEMPLOS:
    $0 dev                    # Desenvolvimento
    $0 prod --pull           # Produção com git pull
    $0 full --no-cache       # Produção completa sem cache
EOF
}

# Função para verificar dependências
check_dependencies() {
    log_step "Verificando dependências..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker não encontrado. Instale Docker primeiro."
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose não encontrado. Instale Docker Compose primeiro."
        exit 1
    fi
    
    log_info "Dependências verificadas ✓"
}

# Função para fazer git pull
do_git_pull() {
    if [[ "${DO_PULL:-false}" == "true" ]]; then
        log_step "Fazendo git pull..."
        
        if git pull origin main; then
            log_info "Git pull concluído ✓"
        else
            log_warn "Falha no git pull (continuando...)"
        fi
    fi
}

# Função para determinar arquivos compose
get_compose_files() {
    local env="$1"
    
    case "$env" in
        "dev")
            echo "-f docker-compose.yml"
            ;;
        "prod")
            echo "-f docker-compose.yml"
            ;;
        "full")
            if [[ -f "$PROJECT_DIR/docker-compose.production.yml" ]]; then
                echo "-f docker-compose.yml -f docker-compose.production.yml"
            else
                log_warn "docker-compose.production.yml não encontrado, usando configuração simples"
                echo "-f docker-compose.yml"
            fi
            ;;
        *)
            log_error "Ambiente inválido: $env"
            show_help
            exit 1
            ;;
    esac
}

# Função para fazer deploy
do_deploy() {
    local env="$1"
    local compose_files="$2"
    
    log_step "Iniciando deploy para ambiente: $env"
    
    # Navegar para diretório do projeto
    cd "$PROJECT_DIR"
    
    # Parar containers
    log_info "Parando containers existentes..."
    docker compose $compose_files down || true
    
    # Limpar imagens se necessário
    if [[ "${NO_CACHE:-false}" == "true" ]]; then
        log_info "Limpando imagens antigas..."
        docker image prune -f || true
    fi
    
    # Build
    local build_args=""
    if [[ "${NO_CACHE:-false}" == "true" ]]; then
        build_args="--no-cache"
    fi
    
    log_info "Construindo containers..."
    docker compose $compose_files build $build_args
    
    # Start
    log_info "Iniciando containers..."
    docker compose $compose_files up -d
    
    # Aguardar healthchecks
    if [[ "$env" != "dev" ]]; then
        log_info "Aguardando healthchecks..."
        sleep 30
    else
        sleep 10
    fi
    
    # Verificar status
    log_info "Status dos containers:"
    docker compose $compose_files ps
    
    # Logs se solicitado
    if [[ "${SHOW_LOGS:-false}" == "true" ]]; then
        log_info "Mostrando logs..."
        docker compose $compose_files logs --tail=50
    fi
    
    log_info "Deploy concluído para ambiente: $env ✓"
    
    # URLs específicas por ambiente
    case "$env" in
        "dev")
            log_info "🌐 Aplicação disponível em:"
            log_info "   - Frontend: http://localhost:5173"
            log_info "   - API: http://localhost:3000"
            log_info "   - Nginx: http://localhost:8080"
            ;;
        "prod"|"full")
            log_info "🌐 Aplicação disponível em:"
            log_info "   - Site: https://fgtsagent.com.br"
            ;;
    esac
}

# Função principal
main() {
    log_info "=== Deploy FgtsAgent - $(date) ==="
    
    # Parse argumentos
    ENVIRONMENT=""
    NO_CACHE=false
    DO_PULL=false
    SHOW_LOGS=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            dev|prod|full)
                ENVIRONMENT="$1"
                shift
                ;;
            --no-cache)
                NO_CACHE=true
                shift
                ;;
            --pull)
                DO_PULL=true
                shift
                ;;
            --logs)
                SHOW_LOGS=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Opção desconhecida: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Verificar se ambiente foi especificado
    if [[ -z "$ENVIRONMENT" ]]; then
        log_error "Ambiente não especificado"
        show_help
        exit 1
    fi
    
    # Executar deploy
    check_dependencies
    do_git_pull
    
    local compose_files=$(get_compose_files "$ENVIRONMENT")
    do_deploy "$ENVIRONMENT" "$compose_files"
    
    log_info "=== Deploy concluído com sucesso! ==="
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 