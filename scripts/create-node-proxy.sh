#!/bin/bash

echo "🔧 Criando proxy reverso com Node.js..."

# Criar diretório para o proxy
mkdir -p proxy

# Criar arquivo do proxy
cat > proxy/server.js << 'EOF'
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();

// Configurações SSL
const sslOptions = {
  cert: fs.readFileSync(path.join(__dirname, '../frontend/certs/cert.pem')),
  key: fs.readFileSync(path.join(__dirname, '../frontend/certs/key.pem'))
};

// Middleware para redirecionar HTTP para HTTPS
app.use((req, res, next) => {
  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// Proxy para frontend (Vite)
app.use('/', createProxyMiddleware({
  target: 'https://localhost:5173',
  changeOrigin: true,
  secure: false,
  ws: true, // Suporte a WebSocket
  logLevel: 'debug'
}));

// Proxy para API (backend)
app.use('/api', createProxyMiddleware({
  target: 'https://localhost:3000',
  changeOrigin: true,
  secure: false,
  logLevel: 'debug'
}));

// Criar servidor HTTPS
const server = https.createServer(sslOptions, app);

const PORT = 443;
server.listen(PORT, () => {
  console.log(`🚀 Proxy reverso rodando em https://localhost:${PORT}`);
  console.log(`📱 Frontend: https://localhost:${PORT} -> https://localhost:5173`);
  console.log(`🔧 API: https://localhost:${PORT}/api -> https://localhost:3000`);
});

// Tratamento de erros
server.on('error', (err) => {
  if (err.code === 'EACCES') {
    console.error('❌ Erro: Porta 443 requer privilégios de administrador');
    console.log('💡 Execute: sudo node proxy/server.js');
  } else {
    console.error('❌ Erro no servidor:', err);
  }
});
EOF

# Criar package.json para o proxy
cat > proxy/package.json << 'EOF'
{
  "name": "meta-oauth-proxy",
  "version": "1.0.0",
  "description": "Proxy reverso para Meta OAuth",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "http-proxy-middleware": "^2.0.6"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF

echo "✅ Proxy Node.js criado!"
echo ""
echo "📋 Arquivos criados:"
echo "   - proxy/server.js"
echo "   - proxy/package.json"
echo ""
echo "🔧 Próximos passos:"
echo "   1. Instalar dependências do proxy"
echo "   2. Iniciar o proxy"
echo "   3. Testar a integração"
echo ""
echo "🔄 Execute: ./scripts/install-and-start-proxy.sh"


