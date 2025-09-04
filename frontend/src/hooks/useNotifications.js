import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para gerenciar notificações push
 */
const useNotifications = (options = {}) => {
  const {
    enabled = true,
    onPermissionGranted = () => {},
    onPermissionDenied = () => {},
    onNotificationClick = () => {},
    onNotificationClose = () => {}
  } = options;

  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const notificationRefs = useRef(new Map());

  // Verificar suporte a notificações
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  // Função para solicitar permissão
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('Notificações não são suportadas neste navegador');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        onPermissionGranted();
        return true;
      } else {
        onPermissionDenied();
        return false;
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão para notificações:', error);
      return false;
    }
  }, [isSupported, onPermissionGranted, onPermissionDenied]);

  // Função para criar notificação
  const createNotification = useCallback((options) => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Notificações não estão disponíveis');
      return null;
    }

    const {
      title,
      body,
      icon = '/favicon.ico',
      badge = '/favicon.ico',
      tag,
      data,
      requireInteraction = false,
      silent = false,
      vibrate = [200, 100, 200],
      actions = [],
      timestamp = Date.now()
    } = options;

    try {
      const notification = new Notification(title, {
        body,
        icon,
        badge,
        tag,
        data,
        requireInteraction,
        silent,
        vibrate,
        actions,
        timestamp
      });

      // Armazenar referência
      const notificationId = tag || `notification-${timestamp}`;
      notificationRefs.current.set(notificationId, notification);

      // Adicionar à lista de notificações
      setNotifications(prev => [...prev, {
        id: notificationId,
        title,
        body,
        timestamp,
        data
      }]);

      // Event listeners
      notification.onclick = (event) => {
        onNotificationClick(event, notification);
        notification.close();
      };

      notification.onclose = (event) => {
        onNotificationClose(event, notification);
        notificationRefs.current.delete(notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      };

      // Auto-close após 5 segundos se não for requireInteraction
      if (!requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      return null;
    }
  }, [isSupported, permission, onNotificationClick, onNotificationClose]);

  // Função para fechar notificação específica
  const closeNotification = useCallback((notificationId) => {
    const notification = notificationRefs.current.get(notificationId);
    if (notification) {
      notification.close();
    }
  }, []);

  // Função para fechar todas as notificações
  const closeAllNotifications = useCallback(() => {
    notificationRefs.current.forEach(notification => {
      notification.close();
    });
  }, []);

  // Função para notificar nova mensagem
  const notifyNewMessage = useCallback((message, contact) => {
    if (!enabled) return;

    const notification = createNotification({
      title: `Nova mensagem de ${contact.name || contact.remote_jid}`,
      body: message.text || 'Mensagem de mídia',
      icon: contact.avatar_url || '/default-avatar.png',
      tag: `message-${message.id}`,
      data: {
        type: 'message',
        messageId: message.id,
        contactId: contact.remote_jid,
        contactName: contact.name
      },
      requireInteraction: false,
      actions: [
        {
          action: 'reply',
          title: 'Responder',
          icon: '/reply-icon.png'
        },
        {
          action: 'view',
          title: 'Ver conversa',
          icon: '/view-icon.png'
        }
      ]
    });

    return notification;
  }, [enabled, createNotification]);

  // Função para notificar status de conexão
  const notifyConnectionStatus = useCallback((status) => {
    if (!enabled) return;

    const isOnline = status === 'online';
    const notification = createNotification({
      title: isOnline ? 'Conectado' : 'Desconectado',
      body: isOnline ? 'Você está online' : 'Verifique sua conexão',
      tag: 'connection-status',
      data: { type: 'connection', status },
      requireInteraction: false
    });

    return notification;
  }, [enabled, createNotification]);

  // Função para notificar erro
  const notifyError = useCallback((error, context = '') => {
    if (!enabled) return;

    const notification = createNotification({
      title: 'Erro',
      body: context ? `${context}: ${error.message}` : error.message,
      tag: `error-${Date.now()}`,
      data: { type: 'error', error: error.message, context },
      requireInteraction: true
    });

    return notification;
  }, [enabled, createNotification]);

  // Função para notificar sucesso
  const notifySuccess = useCallback((message, context = '') => {
    if (!enabled) return;

    const notification = createNotification({
      title: 'Sucesso',
      body: context ? `${context}: ${message}` : message,
      tag: `success-${Date.now()}`,
      data: { type: 'success', message, context },
      requireInteraction: false
    });

    return notification;
  }, [enabled, createNotification]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      closeAllNotifications();
    };
  }, [closeAllNotifications]);

  return {
    // Estado
    permission,
    isSupported,
    notifications,
    canNotify: isSupported && permission === 'granted',
    
    // Funções
    requestPermission,
    createNotification,
    closeNotification,
    closeAllNotifications,
    
    // Funções específicas
    notifyNewMessage,
    notifyConnectionStatus,
    notifyError,
    notifySuccess
  };
};

export default useNotifications;
