#!/bin/bash

# Script de backup para produção
# Executado diariamente via cron

set -e

# Configurações
BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="fgtsagent_backup_${DATE}.tar.gz"

echo "Iniciando backup: ${BACKUP_NAME}"

# Criar backup
cd /backup
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}" \
    logs/ \
    uploads/ \
    data/ \
    2>/dev/null || true

echo "Backup criado: ${BACKUP_NAME}"

# Limpar backups antigos
find "${BACKUP_DIR}" -name "fgtsagent_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup concluído com sucesso" 