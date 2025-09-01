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
