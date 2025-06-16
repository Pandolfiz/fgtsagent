import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';

const NotFound: React.FC = () => {
  const location = useLocation();

  return (
    <>
      <LandingNavbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white pt-20">
      <div className="max-w-md w-full p-8 bg-gray-800 rounded-lg shadow-lg text-center">
        <h1 className="text-4xl font-bold text-red-400 mb-2">404</h1>
        <h2 className="text-2xl font-semibold mb-6">Página Não Encontrada</h2>
        
        <p className="text-gray-300 mb-4">
          Desculpe, não conseguimos encontrar a página que você está procurando.
        </p>
        
        <div className="bg-gray-700 p-3 rounded mb-6 text-left overflow-hidden">
          <p className="text-gray-400 text-sm">Caminho requisitado:</p>
          <code className="text-yellow-400 text-sm break-all">
            {location.pathname}
          </code>
        </div>

        <div className="flex justify-center space-x-4">
          <Link
            to="/"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Página Inicial
          </Link>
          
          <Link
            to="/login"
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
      </div>
    </>
  );
};

export default NotFound; 