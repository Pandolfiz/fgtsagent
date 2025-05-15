// Arquivo de inicialização do servidor
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { checkDatabaseSetup } = require('./utils/databaseChecker');
const http = require('http');
const PORT = config.port || 3000;
const express = require('express');
const path = require('path');

// Configuração para servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// IMPORTANTE: Todas as outras rotas que não forem de API servem o app React (para SPA funcionar)
// Esta rota deve estar APÓS as rotas da API e ANTES de iniciar o servidor
app.get('*', (req, res) => {
  console.log('Servindo App React para:', req.path);
  res.sendFile(path.resolve(__dirname, '../frontend/dist/index.html'));
});

// Iniciar servidor
async function startServer() {
  // Verificar configuração do banco de dados
  const isDatabaseConfigured = await checkDatabaseSetup()
    .catch(err => {
      logger.error(`Erro ao verificar banco de dados: ${err.message}`);
      return false;
    });
  
  // Criar servidor HTTP
  const server = http.createServer(app);
  
  server.listen(PORT, () => {    
    if (!isDatabaseConfigured) {
      logger.warn('ATENÇÃO: Banco de dados não está corretamente configurado. Algumas funcionalidades podem não funcionar.');
    }
  });
}

// Iniciar servidor com tratamento de erros
startServer().catch(err => {
  logger.error(`Erro ao iniciar servidor: ${err.message}`);
  process.exit(1);
});