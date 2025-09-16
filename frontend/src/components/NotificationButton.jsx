import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { useNotificationContext } from '../contexts/NotificationContext';

const NotificationButton = () => {
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const notificationHook = useNotificationContext();

  const { unreadCount } = notificationHook;

  // Log para debug do contador
  useEffect(() => {
    console.log('🔔 NotificationButton - unreadCount atualizado:', unreadCount);
  }, [unreadCount]);

  return (
    <>
      <button
        onClick={() => setIsNotificationCenterOpen(true)}
        className={`relative p-2 text-cyan-100 hover:text-white hover:bg-white/10 border border-cyan-800/50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 ${
          unreadCount > 0 ? 'notification-glow' : ''
        }`}
        title="Notificações"
      >
        <Bell className="w-6 h-6" />
        
        {/* Badge de notificações não lidas com estilo futurista */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse shadow-lg shadow-red-500/50 border border-red-400/50">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Centro de notificações */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notificationHook={notificationHook}
      />
    </>
  );
};

export default NotificationButton;
