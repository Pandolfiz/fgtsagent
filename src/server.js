// Arquivo de inicialização do servidor
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { checkDatabaseSetup } = require('./utils/databaseChecker');
const http = require('http');
const { applyAllMigrations } = require('./utils/applyMigrations');

// Definir porta diferente para evitar conflitos
const PORT = process.env.PORT || config.port || 3003;
const express = require('express');
const path = require('path');

// Configuração para servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Middleware para interceptar códigos de autenticação na raiz e redirecionar
app.use((req, res, next) => {
  if (req.path === '/' && req.query.code) {
    logger.info(`[Auth Interceptor] Código OAuth detectado na raiz, redirecionando para /auth/callback`);
    // Copiar todos os parâmetros de consulta
    const queryParams = new URLSearchParams(req.query);
    return res.redirect(`/auth/callback?${queryParams.toString()}`);
  }
  next();
});

// IMPORTANTE: Todas as outras rotas que não forem de API servem o app React (para SPA funcionar)
// Esta rota deve estar APÓS as rotas da API e ANTES de iniciar o servidor
app.get('*', (req, res) => {
  console.log('Servindo App React para:', req.path);
  res.sendFile(path.resolve(__dirname, '../frontend/dist/index.html'));
});

// Iniciar servidor
async function startServer() {
  try {
    // Verificar configuração do banco de dados
    const isDatabaseConfigured = await checkDatabaseSetup()
      .catch(err => {
        logger.error(`Erro ao verificar banco de dados: ${err.message}`);
        return false;
      });
    
    // Aplicar migrações de banco de dados
    try {
      await applyAllMigrations();
      logger.info('Migrações aplicadas com sucesso');
    } catch (migrationError) {
      logger.error(`Erro ao aplicar migrações: ${migrationError.message}`);
    }
    
    // Criar servidor HTTP
    const server = http.createServer(app);
    
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
      logger.info(`Servidor iniciado na porta ${PORT}`);
      
      if (!isDatabaseConfigured) {
        logger.warn('ATENÇÃO: Banco de dados não está corretamente configurado. Algumas funcionalidades podem não funcionar.');
      }
    });
  } catch (err) {
    logger.error(`Erro fatal ao iniciar servidor: ${err.message}`);
    process.exit(1);
  }
}

// Iniciar servidor com tratamento de erros
startServer().catch(err => {
  logger.error(`Erro ao iniciar servidor: ${err.message}`);
  process.exit(1);
});