#!/bin/bash

echo "🧹 Limpando logs antigos..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script na raiz do projeto"
    exit 1
fi

# Limpar logs do backend
if [ -d "src/logs" ]; then
    echo "📁 Limpando logs do backend..."
    echo "" > src/logs/combined.log
    echo "" > src/logs/error.log
    echo "✅ Logs do backend limpos"
fi

# Limpar logs do Docker (se existirem)
if [ -d "logs" ]; then
    echo "🐳 Limpando logs do Docker..."
    find logs/ -name "*.log" -type f -exec truncate -s 0 {} \;
    echo "✅ Logs do Docker limpos"
fi

# Limpar logs do Nginx (se existirem)
if [ -d "nginx/logs" ]; then
    echo "🌐 Limpando logs do Nginx..."
    find nginx/logs/ -name "*.log" -type f -exec truncate -s 0 {} \;
    echo "✅ Logs do Nginx limpos"
fi

# Verificar tamanho dos logs
echo ""
echo "📊 Status dos logs:"
if [ -d "src/logs" ]; then
    echo "   Backend logs:"
    ls -lh src/logs/*.log 2>/dev/null || echo "     Nenhum log encontrado"
fi

if [ -d "logs" ]; then
    echo "   Docker logs:"
    ls -lh logs/*.log 2>/dev/null || echo "     Nenhum log encontrado"
fi

echo ""
echo "✅ Limpeza de logs concluída!"
echo ""
echo "💡 Para manter logs limpos automaticamente:"
echo "   1. Configure rotação de logs no sistema"
echo "   2. Use: ./scripts/clean-logs.sh periodicamente"
echo "   3. Configure LOG_LEVEL=warn para logs mínimos"
