import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthCallback from './AuthCallback';

/**
 * Este componente é um wrapper específico para lidar com o callback OAuth2 
 * com barra no final (oauth2-credential/callback/)
 */
const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Log para depuração
    console.log("OAuthCallback: URL atual", {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash
    });
    
    // Se estivermos em /oauth2-credential/callback/ com barra no final,
    // redirecionamos para a versão sem barra para manter consistência
    if (location.pathname === '/oauth2-credential/callback/') {
      console.log("Redirecionando para versão sem barra final");
      navigate('/oauth2-credential/callback' + location.search + location.hash, { replace: true });
    }
  }, [location, navigate]);

  // Renderizamos o componente AuthCallback diretamente
  return <AuthCallback />;
};

export default OAuthCallback; 