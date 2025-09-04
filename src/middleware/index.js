module.exports = {
  requireAuth: require('./authMiddleware').requireAuth,
  clientContext: require('./clientContext'),
  // ... você pode adicionar outros middlewares aqui se desejar
}; 