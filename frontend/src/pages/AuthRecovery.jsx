import { useState, useEffect } from 'react';
import { clearCompleteAuth } from '../utils/authUtils';

/**
 * Página de recuperação de autenticação
 * Limpa sessões corrompidas e redireciona para login
 */
export default function AuthRecovery() {
  const [status, setStatus] = useState('cleaning');
  const [message, setMessage] = useState('Limpando dados de autenticação...');

  useEffect(() => {
    const performRecovery = async () => {
      try {
        setStatus('cleaning');
        setMessage('Limpando dados de autenticação...');
        
        // ✅ LIMPAR: Autenticação completa
        const success = await clearCompleteAuth();
        
        if (success) {
          setStatus('success');
          setMessage('Dados de autenticação limpos com sucesso!');
          
          // ✅ AGUARDAR: 2 segundos antes de redirecionar
          setTimeout(() => {
            setMessage('Redirecionando para login...');
            window.location.href = '/login?message=Sessão limpa. Faça login novamente.';
          }, 2000);
        } else {
          setStatus('warning');
          setMessage('Limpeza parcial realizada. Clique no botão abaixo para continuar.');
        }
      } catch (error) {
        console.error('Erro na recuperação de autenticação:', error);
        setStatus('error');
        setMessage('Erro ao limpar autenticação. Tente limpar manualmente.');
      }
    };

    performRecovery();
  }, []);

  const handleManualClear = () => {
    // ✅ LIMPAR: LocalStorage e SessionStorage manualmente
    localStorage.clear();
    sessionStorage.clear();
    
    // ✅ REDIRECIONAR: Para login
    window.location.href = '/login?message=Dados limpos manualmente. Faça login novamente.';
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'cleaning':
        return '🔄';
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '🔄';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'cleaning':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* ✅ ÍCONE E TÍTULO */}
        <div className="mb-6">
          <div className={`text-6xl mb-4 ${getStatusColor()}`}>
            {getStatusIcon()}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Recuperação de Autenticação
          </h1>
          <p className={`text-lg ${getStatusColor()}`}>
            {message}
          </p>
        </div>

        {/* ✅ INDICADOR DE PROGRESSO */}
        {status === 'cleaning' && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
            </div>
          </div>
        )}

        {/* ✅ BOTÕES DE AÇÃO */}
        <div className="space-y-4">
          {status === 'warning' && (
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ir para Login
            </button>
          )}

          {status === 'error' && (
            <>
              <button
                onClick={handleManualClear}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Limpeza Manual
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Ir para Login
              </button>
            </>
          )}

          {/* ✅ LINK PARA HOME */}
          <div className="pt-4 border-t border-gray-200">
            <a
              href="/"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Voltar para a página inicial
            </a>
          </div>
        </div>

        {/* ✅ INFORMAÇÕES ADICIONAIS */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">O que está sendo feito:</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Limpando cookies de autenticação</li>
            <li>• Removendo dados do localStorage</li>
            <li>• Invalidando sessão no servidor</li>
            <li>• Removendo tokens expirados</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
