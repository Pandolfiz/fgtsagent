// Exemplo de rota de login modificada para garantir limpeza de sessão anterior
// Localizar o método de login existente e adicionar o código abaixo

// ... existing code ...

// Garantir que qualquer sessão anterior esteja completamente limpa
// Limpar todos os cookies relacionados à autenticação
res.clearCookie('authToken');
res.clearCookie('refreshToken');
res.clearCookie('supabase-auth-token');

// ... existing code ...

// Após a autenticação bem-sucedida, definir os novos cookies
res.cookie('authToken', session.access_token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: tokenExpiration * 1000
});

// ... existing code ... 