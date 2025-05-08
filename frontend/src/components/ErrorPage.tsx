import React from 'react';
import { useLocation, Link } from 'react-router-dom';

interface ErrorPageProps {
  title?: string;
  message?: string;
  error?: any;
  statusCode?: number;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({ 
  title = 'Erro', 
  message = 'Ocorreu um erro inesperado', 
  error = null,
  statusCode = 500
}) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryMessage = queryParams.get('message');
  const queryTitle = queryParams.get('title');
  const queryStatusCode = queryParams.get('statusCode');
  
  // Prioriza props passadas para o componente, depois query params
  const displayTitle = title || queryTitle || 'Erro';
  const displayMessage = message || queryMessage || 'Ocorreu um erro inesperado';
  const displayStatusCode = statusCode || (queryStatusCode ? parseInt(queryStatusCode) : 500);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-2">{displayTitle}</h1>
          <div className="text-7xl font-bold text-gray-300 mb-6">{displayStatusCode}</div>
          <p className="text-gray-600 mb-6">{displayMessage}</p>
          
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mt-4 p-4 bg-gray-100 rounded overflow-auto text-left">
              <details>
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">Detalhes técnicos</summary>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                  {error.stack || JSON.stringify(error, null, 2)}
                </pre>
              </details>
            </div>
          )}
          
          <div className="mt-6">
            <Link 
              to="/" 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Voltar para página inicial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage; 