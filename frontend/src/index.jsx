import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { setupRealtime } from './lib/supabaseClient';

// Componente wrapper para inicializar o Realtime
const AppWithRealtime = () => {
  useEffect(() => {
    // Configurar Realtime na inicialização
    setupRealtime()
      .then(success => {
        console.log('Inicialização do Realtime:', success ? 'sucesso' : 'falha');
      })
      .catch(error => {
        console.error('Erro ao inicializar Realtime:', error);
      });
  }, []);

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWithRealtime />
  </React.StrictMode>
);