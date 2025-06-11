#!/bin/bash

#================================================================
# Script de Backup Automatizado - FgtsAgent
# Versão: 1.0
# Descrição: Realiza backup dos dados críticos da aplicação
#================================================================

set -euo pipefail  # Fail on any error

# Configurações
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
LOG_FILE="$BACKUP_DIR/backup.log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Função para verificar espaço em disco
check_disk_space() {
    local required_space=1048576  # 1GB em KB
    local available_space=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    
    if [[ $available_space -lt $required_space ]]; then
        log_error "Espaço insuficiente em disco. Necessário: 1GB, Disponível: $((available_space/1024))MB"
        exit 1
    fi
    
    log_info "Espaço em disco verificado: $((available_space/1024/1024))GB disponível"
}

# Função para criar backup
create_backup() {
    local backup_name="fgtsagent_backup_${DATE}.tar.gz"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    log_info "Iniciando backup: $backup_name"
    
    # Criar arquivo de backup
    tar -czf "$backup_path" \
        --exclude='*.log' \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='temp' \
        -C /backup \
        logs uploads data
    
    if [[ $? -eq 0 ]]; then
        local size=$(du -h "$backup_path" | cut -f1)
        log_info "Backup criado com sucesso: $backup_name ($size)"
        
        # Calcular checksum
        local checksum=$(sha256sum "$backup_path" | cut -d' ' -f1)
        echo "$checksum  $backup_name" > "$backup_path.sha256"
        log_info "Checksum SHA256: $checksum"
        
        return 0
    else
        log_error "Falha ao criar backup"
        return 1
    fi
}

# Função para limpar backups antigos
cleanup_old_backups() {
    log_info "Limpando backups com mais de $RETENTION_DAYS dias"
    
    local count=0
    while IFS= read -r -d '' file; do
        rm -f "$file" "${file}.sha256"
        count=$((count + 1))
        log_info "Removido: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "fgtsagent_backup_*.tar.gz" -mtime +$RETENTION_DAYS -print0)
    
    if [[ $count -eq 0 ]]; then
        log_info "Nenhum backup antigo encontrado para remoção"
    else
        log_info "Removidos $count backups antigos"
    fi
}

# Função para verificar integridade dos backups
verify_backups() {
    log_info "Verificando integridade dos backups"
    
    local verified=0
    local failed=0
    
    for checksum_file in "$BACKUP_DIR"/*.sha256; do
        if [[ -f "$checksum_file" ]]; then
            if sha256sum -c "$checksum_file" >/dev/null 2>&1; then
                verified=$((verified + 1))
            else
                failed=$((failed + 1))
                log_warn "Falha na verificação: $(basename "$checksum_file")"
            fi
        fi
    done
    
    log_info "Verificação concluída: $verified OK, $failed com falha"
}

# Função para enviar notificação (webhook)
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${WEBHOOK_URL:-}" ]]; then
        curl -s -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"service\": \"FgtsAgent Backup\",
                \"status\": \"$status\",
                \"message\": \"$message\",
                \"timestamp\": \"$(date -Iseconds)\",
                \"server\": \"$(hostname)\"
            }" || log_warn "Falha ao enviar notificação"
    fi
}

# Função principal
main() {
    log_info "=== Iniciando processo de backup ==="
    
    # Criar diretório de backup se não existir
    mkdir -p "$BACKUP_DIR"
    
    # Verificar espaço em disco
    check_disk_space
    
    # Criar backup
    if create_backup; then
        # Limpar backups antigos
        cleanup_old_backups
        
        # Verificar integridade
        verify_backups
        
        log_info "=== Backup concluído com sucesso ==="
        send_notification "success" "Backup realizado com sucesso em $(date)"
    else
        log_error "=== Backup falhou ==="
        send_notification "error" "Falha no backup em $(date)"
        exit 1
    fi
}

# Executar função principal
main "$@" 