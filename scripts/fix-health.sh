#!/bin/bash

echo "🔧 CORRIGINDO PROBLEMAS DE HEALTHCHECK E NGINX..."
echo ""

# 1. Parar containers
echo "1️⃣ Parando containers..."
docker compose down 2>/dev/null || true

# 2. Rebuild dos serviços (sem cache para garantir que pegue as mudanças)
echo "2️⃣ Rebuild dos serviços..."
docker compose build --no-cache

# 3. Reiniciar aplicação
echo "3️⃣ Reiniciando aplicação..."
docker compose up -d

# 4. Aguardar um pouco
echo "4️⃣ Aguardando inicialização (5s)..."
sleep 5

# 5. Testar a nova rota
echo "5️⃣ Testando rota de health..."
echo "🔍 Testando: curl http://localhost:3000/api/health"
response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/health)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

echo "📊 Código HTTP: $http_code"
echo "📝 Resposta: $body"

if [ "$http_code" = "200" ]; then
    echo "✅ SUCESSO! Rota /api/health funcionando corretamente"
    echo ""
    echo "🎯 Verificando status de todos os containers..."
    sleep 10
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo "🌐 Testando nginx..."
    nginx_response=$(curl -s -w "\n%{http_code}" http://localhost/ 2>/dev/null || echo "erro")
    nginx_code=$(echo "$nginx_response" | tail -n1)
    if [ "$nginx_code" = "200" ] || [ "$nginx_code" = "301" ]; then
        echo "✅ Nginx funcionando (HTTP $nginx_code)"
    else
        echo "⚠️  Nginx precisa de verificação (HTTP $nginx_code)"
    fi
else
    echo "❌ ERRO: Rota ainda não funciona (HTTP $http_code)"
    echo "📋 Logs da API:"
    docker compose logs --tail=20 api
    echo ""
    echo "📋 Logs do Nginx:"
    docker compose logs --tail=10 nginx
fi

echo ""
echo "🏁 Correção concluída!"
echo "💡 Para monitorar: docker compose logs -f api" 