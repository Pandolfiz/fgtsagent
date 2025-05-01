// Arquivo de inicialização do servidor
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { checkDatabaseSetup } = require('./utils/databaseChecker');
const http = require('http');
const PORT = config.port || 3000;

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
    logger.info(`Servidor iniciado na porta ${PORT} em modo ${config.nodeEnv}`);
    logger.info(`Supabase configurado: ${config.supabase.url ? 'Sim' : 'Não'}`);
    
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