const { requireAuth } = require('./src/middleware/unifiedAuthMiddleware');

console.log('Testando extração de cookies...');

// Simular uma requisição com cookies
const mockReq = {
  headers: {
    'user-agent': 'test-agent',
    'cookie': 'access_token=test-token-123; refresh_token=test-refresh-456'
  },
  url: '/api/auth/me',
  method: 'GET',
  ip: '127.0.0.1',
  originalUrl: '/api/auth/me',
  cookies: {
    access_token: 'test-token-123',
    refresh_token: 'test-refresh-456'
  }
};

const mockRes = {
  status: (code) => {
    console.log('Status:', code);
    return mockRes;
  },
  json: (data) => {
    console.log('Response:', data);
    return mockRes;
  }
};

const mockNext = () => {
  console.log('Next chamado - autenticação bem-sucedida');
};

console.log('Chamando requireAuth...');
requireAuth(mockReq, mockRes, mockNext).catch(error => {
  console.log('Erro no requireAuth:', error.message);
});
