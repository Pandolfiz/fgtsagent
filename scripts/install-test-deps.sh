#!/bin/bash

# Script para instalar dependências dos testes de sessão
echo "🔧 Instalando dependências para testes de persistência de sessão..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto"
    exit 1
fi

# Instalar dependências principais
echo "📦 Instalando dependências principais..."
npm install --save-dev puppeteer

# Verificar se a instalação foi bem-sucedida
if [ $? -eq 0 ]; then
    echo "✅ Puppeteer instalado com sucesso"
else
    echo "❌ Erro ao instalar Puppeteer"
    exit 1
fi

# Criar diretórios necessários
echo "📁 Criando diretórios de teste..."
mkdir -p test-screenshots
mkdir -p test-results

# Verificar se os diretórios foram criados
if [ -d "test-screenshots" ] && [ -d "test-results" ]; then
    echo "✅ Diretórios de teste criados"
else
    echo "❌ Erro ao criar diretórios de teste"
    exit 1
fi

# Tornar scripts executáveis
echo "🔐 Tornando scripts executáveis..."
chmod +x scripts/test-session-persistence.js

# Verificar se o arquivo de configuração existe
if [ -f "scripts/test-session-config.json" ]; then
    echo "✅ Arquivo de configuração encontrado"
else
    echo "❌ Arquivo de configuração não encontrado"
    exit 1
fi

# Verificar se o README existe
if [ -f "scripts/README_SESSION_TESTS.md" ]; then
    echo "✅ Documentação encontrada"
else
    echo "❌ Documentação não encontrada"
    exit 1
fi

echo ""
echo "🎉 Instalação concluída com sucesso!"
echo ""
echo "📋 Para executar os testes:"
echo "   1. Interface gráfica: Importe SessionTestPanel no seu projeto"
echo "   2. Console: window.testSessionPersistence()"
echo "   3. Script: node scripts/test-session-persistence.js"
echo ""
echo "📚 Documentação: scripts/README_SESSION_TESTS.md"
echo "⚙️  Configuração: scripts/test-session-config.json"
echo ""
echo "🚀 Pronto para testar a persistência de sessão!"

