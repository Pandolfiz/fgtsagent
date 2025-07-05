// Arquivo de inicialização do servidor
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { checkDatabaseSetup } = require('./utils/databaseChecker');
const http = require('http');
const { applyAllMigrations } = require('./utils/applyMigrations');
const { validateJwtEnvironment } = require('./utils/jwtSecurity');

// Definir porta diferente para evitar conflitos
const PORT = process.env.PORT || config.port || 3003;
const express = require('express');
const path = require('path');

// REMOVIDO: Backend não deve servir arquivos estáticos
// Isso é responsabilidade do nginx
// app.use(express.static(path.join(__dirname, '../frontend/dist')));

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

// REMOVIDO: Backend não deve servir o frontend
// Isso é responsabilidade do nginx
// app.get('*', (req, res) => {
//   console.log('Servindo App React para:', req.path);
//   res.sendFile(path.resolve(__dirname, '../frontend/dist/index.html'));
// });

// Iniciar servidor
async function startServer() {
  try {
    // Validar JWT_SECRET na inicialização
    validateJwtEnvironment();
    
    // Validar configuração do Supabase
    const { supabase } = require('./config/supabase');
    const { validateSupabaseSetup } = require('./utils/supabaseValidator');
    
    if (supabase) {
      const validation = await validateSupabaseSetup(supabase);
      if (validation.success) {
        logger.info('Supabase configurado e conectado com sucesso');
      } else {
        logger.error(`Problemas na configuração do Supabase (${validation.stage})`);
        if (validation.errors.length > 0) {
          validation.errors.forEach(error => logger.error(`- ${error}`));
        }
      }
    } else {
      logger.error('Cliente Supabase não está disponível - verifique as configurações no arquivo .env');
    }
    
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

// Cleanup quando o servidor é encerrado
const { stopCacheCleanup } = require('./middleware/requestLogger');

process.on('SIGINT', () => {
  logger.info('Recebido SIGINT. Limpando recursos...');
  stopCacheCleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Recebido SIGTERM. Limpando recursos...');
  stopCacheCleanup();
  process.exit(0);
});

// Iniciar servidor com tratamento de erros
startServer().catch(err => {
  logger.error(`Erro ao iniciar servidor: ${err.message}`);
  process.exit(1);
});