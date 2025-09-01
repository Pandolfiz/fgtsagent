#!/bin/bash

echo "🔧 Instalando e iniciando proxy reverso..."

# Navegar para o diretório do proxy
cd proxy

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Verificar se a porta 443 está livre
echo "🔍 Verificando porta 443..."
if netstat -ano | grep ":443" > /dev/null; then
    echo "⚠️ Porta 443 está em uso. Tentando liberar..."
    # Tentar matar processo na porta 443
    netstat -ano | grep ":443" | awk '{print $5}' | xargs -I {} taskkill //PID {} //F 2>/dev/null || true
fi

# Iniciar o proxy
echo "🚀 Iniciando proxy reverso..."
echo "💡 Se der erro de permissão, execute como administrador"
npm start
