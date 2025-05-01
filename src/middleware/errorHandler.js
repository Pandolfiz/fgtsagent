// Middleware para tratamento de erros
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

// Middleware para tratar todos os erros da aplicação
function errorHandler(err, req, res, next) {
  logger.error(`${err.name}: ${err.message}`);
  
  // Se for um erro da aplicação
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }
  
  // Para erros do Supabase
  if (err.message && (
    err.message.includes('Email') || 
    err.message.includes('password') ||
    err.message.includes('Authentication') ||
    err.message.includes('token')
  )) {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  
  // Erro interno do servidor (não tratado)
  res.status(500).json({
    status: 'error',
    message: 'Erro interno no servidor',
    ...(process.env.NODE_ENV === 'development' && { 
      detail: err.message,
      stack: err.stack
    })
  });
}

// Middleware para tratar erros de 404 (rota não encontrada)
function notFoundHandler(req, res) {
  res.status(404).json({
    status: 'error',
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};