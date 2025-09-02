const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check simples
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Backend funcionando sem MessageReprocessor'
  });
});

// Rota de teste
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Backend funcionando!',
    timestamp: new Date().toISOString()
  });
});

async function startSimpleServer() {
  try {
    logger.info('=== INICIANDO SERVIDOR SIMPLIFICADO ===');
    
    // Configuração HTTPS
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, 'certs/key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'certs/cert.pem'))
    };

    const server = https.createServer(httpsOptions, app);
    
    // Verificar se a porta já está em uso
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Porta ${PORT} já está em uso. Tente usar uma porta diferente.`);
        process.exit(1);
      } else {
        logger.error(`Erro ao iniciar servidor: ${err.message}`);
        process.exit(1);
      }
    });
    
    server.listen(PORT, () => {
      logger.info(`✅ Servidor SIMPLIFICADO iniciado na porta ${PORT}`);
      logger.info(`🌐 Health check: https://localhost:${PORT}/health`);
      logger.info(`🧪 Teste: https://localhost:${PORT}/test`);
    });
    
  } catch (err) {
    logger.error(`❌ Erro fatal ao iniciar servidor: ${err.message}`);
    process.exit(1);
  }
}

// Cleanup
process.on('SIGINT', () => {
  logger.info('Recebido SIGINT. Encerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Recebido SIGTERM. Encerrando servidor...');
  process.exit(0);
});

// Iniciar servidor
startSimpleServer().catch(err => {
  logger.error(`❌ Erro ao iniciar servidor: ${err.message}`);
  process.exit(1);
});


