import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const OAuthError: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('Erro na autenticação');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    // Tenta extrair informações de erro da URL
    const queryParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.substring(1));
    
    // Verifica erro nos parâmetros de query
    const queryError = queryParams.get('error');
    const queryErrorDescription = queryParams.get('error_description');
    
    // Verifica erro nos parâmetros de hash
    const hashError = hashParams.get('error');
    const hashErrorDescription = hashParams.get('error_description');
    
    // Define mensagem de erro com base nos parâmetros encontrados
    if (queryError || hashError) {
      setError(queryError || hashError || 'Erro na autenticação');
      setErrorDetails(queryErrorDescription || hashErrorDescription || null);
    } else {
      // Se não há erro específico, verifica se temos token mas estamos na página de erro
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        // Temos um token, mas estamos na página de erro - redireciona para callback
        navigate('/auth/callback' + location.hash);
        return;
      }
      
      setError('Falha no processo de autenticação');
      setErrorDetails('Não foi possível completar o processo de autenticação. Tente novamente.');
    }
  }, [location, navigate]);

  // Timer para voltar à tela de login após 5 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 text-white">
      <div className="max-w-md w-full p-8 bg-gray-800/80 backdrop-blur-md rounded-lg shadow-lg text-center border border-red-500/30">
        <div className="text-red-500 text-6xl mb-6">
          <i className="fas fa-exclamation-circle"></i>
        </div>
        
        <h1 className="text-3xl font-bold text-red-400 mb-2">Erro de Autenticação</h1>
        <h2 className="text-xl font-semibold mb-6 text-gray-300">{error}</h2>
        
        {errorDetails && (
          <div className="bg-gray-700/80 p-4 rounded mb-6 text-left">
            <p className="text-gray-300 text-sm mb-2">Detalhes:</p>
            <p className="text-yellow-400 text-sm break-all">
              {errorDetails}
            </p>
          </div>
        )}
        
        <p className="text-gray-400 mb-6">
          Você será redirecionado para a página de login em alguns segundos...
        </p>

        <div className="flex justify-center space-x-4">
          <Link
            to="/login"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Voltar para Login
          </Link>
          
          <Link
            to="/"
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
          >
            Página Inicial
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OAuthError; 