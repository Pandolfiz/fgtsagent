#!/bin/bash

# 🚀 MONITOR DE LOGS EM PRODUÇÃO
# Monitora logs do backend, webhooks e Stripe

echo "🚀 MONITOR DE LOGS EM PRODUÇÃO"
echo "================================"
echo ""

# ✅ CONFIGURAÇÃO
LOG_DIR="./logs"
BACKEND_LOG="$LOG_DIR/backend.log"
WEBHOOK_LOG="$LOG_DIR/webhook.log"
STRIPE_LOG="$LOG_DIR/stripe.log"

# ✅ CRIAR DIRETÓRIO DE LOGS SE NÃO EXISTIR
mkdir -p "$LOG_DIR"

# ✅ FUNÇÃO: Monitorar logs em tempo real
monitor_logs() {
    local log_file="$1"
    local description="$2"
    
    if [ -f "$log_file" ]; then
        echo "📋 $description: $log_file"
        echo "----------------------------------------"
        tail -f "$log_file" | while read line; do
            # ✅ FILTRAR: Logs importantes
            if echo "$line" | grep -q "ERROR\|WARN\|WEBHOOK\|STRIPE\|AUTH\|PAYMENT"; then
                echo "$(date '+%H:%M:%S') ⚠️ $line"
            fi
        done &
    else
        echo "⚠️ Arquivo de log não encontrado: $log_file"
    fi
}

# ✅ FUNÇÃO: Verificar status dos serviços
check_services() {
    echo "🔍 VERIFICANDO STATUS DOS SERVIÇOS..."
    echo ""
    
    # ✅ Backend
    if curl -s -f "https://fgtsagent.com.br/api/health" > /dev/null; then
        echo "✅ Backend: Funcionando"
    else
        echo "❌ Backend: Erro de conexão"
    fi
    
    # ✅ Frontend
    if curl -s -f "https://fgtsagent.com.br" > /dev/null; then
        echo "✅ Frontend: Funcionando"
    else
        echo "❌ Frontend: Erro de conexão"
    fi
    
    # ✅ Webhook Stripe
    if curl -s -f "https://fgtsagent.com.br/webhook/stripe" > /dev/null; then
        echo "✅ Webhook Stripe: Endpoint acessível"
    else
        echo "❌ Webhook Stripe: Endpoint não acessível"
    fi
    
    echo ""
}

# ✅ FUNÇÃO: Monitorar logs específicos
monitor_specific_logs() {
    echo "📊 MONITORANDO LOGS ESPECÍFICOS..."
    echo ""
    
    # ✅ Logs de autenticação
    if [ -f "$BACKEND_LOG" ]; then
        echo "🔐 LOGS DE AUTENTICAÇÃO:"
        grep -i "auth\|login\|signup" "$BACKEND_LOG" | tail -5
        echo ""
    fi
    
    # ✅ Logs de pagamento
    if [ -f "$BACKEND_LOG" ]; then
        echo "💳 LOGS DE PAGAMENTO:"
        grep -i "stripe\|payment\|webhook" "$BACKEND_LOG" | tail -5
        echo ""
    fi
    
    # ✅ Logs de erro
    if [ -f "$BACKEND_LOG" ]; then
        echo "❌ LOGS DE ERRO:"
        grep -i "error\|exception\|fail" "$BACKEND_LOG" | tail -5
        echo ""
    fi
}

# ✅ FUNÇÃO: Limpar logs antigos
cleanup_logs() {
    echo "🧹 LIMPANDO LOGS ANTIGOS..."
    
    # ✅ Manter apenas logs dos últimos 7 dias
    find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null
    
    # ✅ Comprimir logs antigos
    find "$LOG_DIR" -name "*.log" -mtime +1 -exec gzip {} \; 2>/dev/null
    
    echo "✅ Limpeza concluída"
    echo ""
}

# ✅ MENU PRINCIPAL
show_menu() {
    echo "📋 MENU DE MONITORAMENTO:"
    echo "1. Verificar status dos serviços"
    echo "2. Monitorar logs em tempo real"
    echo "3. Ver logs específicos"
    echo "4. Limpar logs antigos"
    echo "5. Sair"
    echo ""
    read -p "Escolha uma opção: " choice
    
    case $choice in
        1)
            check_services
            show_menu
            ;;
        2)
            echo "📊 MONITORANDO LOGS EM TEMPO REAL..."
            echo "Pressione Ctrl+C para parar"
            echo ""
            monitor_logs "$BACKEND_LOG" "Backend"
            monitor_logs "$WEBHOOK_LOG" "Webhook"
            wait
            ;;
        3)
            monitor_specific_logs
            show_menu
            ;;
        4)
            cleanup_logs
            show_menu
            ;;
        5)
            echo "👋 Saindo..."
            exit 0
            ;;
        *)
            echo "❌ Opção inválida"
            show_menu
            ;;
    esac
}

# ✅ EXECUTAR
echo "🚀 Iniciando monitor de logs..."
echo ""

# ✅ Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ ERRO: Execute este script no diretório raiz do projeto"
    exit 1
fi

# ✅ Mostrar menu
show_menu

