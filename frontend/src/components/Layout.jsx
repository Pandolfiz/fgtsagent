import React from 'react';
import { useLocation } from 'react-router-dom';
import FeedbackButton from './FeedbackButton';

const Layout = ({ children }) => {
  const location = useLocation();
  
  // Páginas que NÃO devem mostrar o botão de feedback
  const excludedPages = [
    '/',
    '/login',
    '/signup',
    '/signup/success',
    '/auth/callback',
    '/auth/recovery',
    '/payment/return',
    '/payment/cancel',
    '/payment-success',
    '/terms-of-use',
    '/privacy-policy',
    '/terms',
    '/privacy',
    '/supabase-diagnostico',
    '/error'
  ];

  // Verificar se a página atual deve mostrar o botão de feedback
  const shouldShowFeedbackButton = !excludedPages.includes(location.pathname);

  return (
    <>
      {children}
      {/* Botão de feedback fixo - aparece apenas em páginas autenticadas */}
      {shouldShowFeedbackButton && <FeedbackButton />}
    </>
  );
};

export default Layout;