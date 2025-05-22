import { useState, useEffect } from 'react';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Verificar status inicial
    setIsOffline(!navigator.onLine);

    // Adicionar event listeners para mudanças de status de conexão
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      // Remover event listeners quando o componente for desmontado
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Não renderizar nada se estiver online
  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-red-600 text-white p-3 rounded-lg shadow-lg flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Você está offline. Verifique sua conexão.</span>
    </div>
  );
} 