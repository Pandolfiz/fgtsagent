#!/bin/bash

echo "🔧 CORRIGINDO PROBLEMA DE HEALTHCHECK..."

# 1. Parar containers
echo "1️⃣ Parando containers..."
docker compose down 2>/dev/null || true

# 2. Aplicar correções nos arquivos (se necessário no servidor)
echo "2️⃣ Aplicando correções..."

# Se você ainda não subiu as correções, faça manualmente:
if [ ! -f ".git" ]; then
    echo "⚠️  ATENÇÃO: Execute 'git pull' para baixar as correções primeiro!"
    echo "   Ou aplique as correções manualmente nos arquivos:"
    echo "   - src/app.js: corrigir rota catch-all"
    echo "   - docker-compose.yml: usar /api/health no healthcheck"
fi

# 3. Rebuild forçado
echo "3️⃣ Rebuild da API..."
docker compose build --no-cache api

# 4. Restart
echo "4️⃣ Reiniciando aplicação..."
docker compose up -d

# 5. Aguardar e testar
echo "5️⃣ Aguardando inicialização..."
sleep 30

echo ""
echo "🧪 TESTANDO HEALTHCHECK..."

# Testar rota correta
echo "🔹 Testando /api/health:"
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ /api/health - OK"
else
    echo "❌ /api/health - FALHOU"
fi

# Verificar containers
echo ""
echo "📊 STATUS DOS CONTAINERS:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Ver logs recentes da API
echo ""
echo "📝 LOGS RECENTES DA API:"
docker compose logs --tail=10 api

echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "1. Se ainda tiver erro, execute: docker compose logs api"
echo "2. Verifique se /api/health responde: curl http://localhost:3000/api/health"
echo "3. Para acompanhar logs: docker compose logs -f api" 