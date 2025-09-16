import React, { createContext, useContext } from 'react';
import useRealtimeNotifications from '../hooks/useRealtimeNotifications';

const NotificationContext = createContext();

/**
 * Provider para o contexto de notificações
 * Centraliza o hook de notificações para ser usado em toda a aplicação
 */
export const NotificationProvider = ({ children }) => {
  const notificationHook = useRealtimeNotifications({
    enabled: true,
    showBrowserNotifications: true
  });

  return (
    <NotificationContext.Provider value={notificationHook}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook para usar o contexto de notificações
 */
export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext deve ser usado dentro de NotificationProvider');
  }
  return context;
};

export default NotificationContext;
