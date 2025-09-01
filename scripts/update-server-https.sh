#!/bin/bash

echo "🔧 Atualizando server.js para usar HTTPS..."

# Verificar se os certificados existem
if [ ! -f "src/certs/cert.pem" ] || [ ! -f "src/certs/key.pem" ]; then
    echo "❌ Certificados não encontrados. Execute primeiro: ./scripts/setup-backend-https.sh"
    exit 1
fi

# Criar backup do server.js
echo "📋 Criando backup do server.js..."
cp src/server.js src/server.js.backup

# Atualizar server.js para usar HTTPS
echo "📝 Atualizando server.js..."

# Substituir a criação do servidor HTTP por HTTPS
sed -i 's|const http = require('\''http'\'');|const http = require('\''http'\'');\nconst https = require('\''https'\'');\nconst fs = require('\''fs'\'');|g' src/server.js

# Substituir a criação do servidor
sed -i 's|const server = http.createServer(app);|// Configuração HTTPS\nconst httpsOptions = {\n  key: fs.readFileSync(path.join(__dirname, '\''certs/key.pem'\'')),\n  cert: fs.readFileSync(path.join(__dirname, '\''certs/cert.pem'\''))\n};\n\nconst server = https.createServer(httpsOptions, app);|g' src/server.js

echo "✅ Server.js atualizado para HTTPS!"
echo ""
echo "📋 Configuração atualizada:"
echo "   - Servidor HTTPS na porta 3000"
echo "   - Certificados SSL configurados"
echo ""
echo "🔄 Reinicie o backend:"
echo "   cd src && npm run dev"


