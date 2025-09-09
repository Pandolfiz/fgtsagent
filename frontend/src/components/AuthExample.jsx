/**
 * ==============================================
 * COMPONENTE DE EXEMPLO - NOVO SISTEMA DE AUTENTICAÇÃO
 * ==============================================
 * 
 * Este componente demonstra como usar o novo
 * sistema de autenticação unificado.
 * 
 * @author Equipe de Desenvolvimento
 * @version 1.0.0
 * @since 2024-01-XX
 */

import React, { useState } from 'react';
import { useAuth, useUser, useAdmin, useAuthLoading } from '../hooks/useAuth';
import { logger } from '../utils/logger';

const AuthExample = () => {
  const { login, logout, refreshToken } = useAuth();
  const { user, isLoggedIn, userName, userEmail } = useUser();
  const { isAdmin } = useAdmin();
  const { loading, error, hasError } = useAuthLoading();

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    
    logger.info('Tentativa de login:', { email: loginData.email });
    
    const result = await login(loginData.email, loginData.password);
    
    if (result.success) {
      logger.info('Login bem-sucedido');
      setLoginData({ email: '', password: '' });
    } else {
      logger.error('Falha no login:', { error: result.error });
    }
  };

  const handleLogout = async () => {
    logger.info('Iniciando logout');
    
    const result = await logout();
    
    if (result.success) {
      logger.info('Logout bem-sucedido');
    } else {
      logger.error('Falha no logout:', { error: result.error });
    }
  };

  const handleRefreshToken = async () => {
    logger.info('Tentativa de refresh manual do token');
    
    const result = await refreshToken();
    
    if (result.success) {
      logger.info('Refresh bem-sucedido');
    } else {
      logger.error('Falha no refresh:', { error: result.error });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Exemplo de Autenticação
      </h2>

      {hasError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Erro: {error}
        </div>
      )}

      {!isLoggedIn ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Senha
            </label>
            <input
              type="password"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Entrar
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            <h3 className="font-semibold">Usuário Logado</h3>
            <p><strong>Nome:</strong> {userName}</p>
            <p><strong>Email:</strong> {userEmail}</p>
            <p><strong>ID:</strong> {user?.id}</p>
            {isAdmin && (
              <p className="text-blue-600 font-semibold">👑 Administrador</p>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleRefreshToken}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Refresh Token
            </button>

            <button
              onClick={handleLogout}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sair
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-100 rounded">
        <h4 className="font-semibold mb-2">Informações de Debug:</h4>
        <pre className="text-xs text-gray-600 overflow-auto">
          {JSON.stringify({
            isLoggedIn,
            hasUser: !!user,
            isAdmin,
            loading,
            hasError: !!error
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default AuthExample;
