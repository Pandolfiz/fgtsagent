import { useState, useEffect, useCallback, useRef } from 'react';
import websocketClient from '../lib/websocketClient';
import useNotifications from './useNotifications';

/**
 * Hook para gerenciar notificações em tempo real via WebSocket
 * Recebe notificações processadas pelo backend
 */
const useRealtimeNotifications = (options = {}) => {
  const {
    enabled = true,
    showBrowserNotifications = true,
    showToastNotifications = true,
    onNewNotification = () => {},
    maxNotifications = 50
  } = options;

  // Carregar notificações do localStorage na inicialização
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('notifications');
      console.log('📱 Carregando notificações do localStorage:', saved ? JSON.parse(saved).length : 0, 'notificações');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Erro ao carregar notificações do localStorage:', error);
      return [];
    }
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const setupComplete = useRef(false);
  const listenersRegistered = useRef(false);
  const hookInstanceId = useRef(`hook-${Date.now()}-${Math.random()}`);

  // Hook para notificações do navegador
  const {
    createNotification,
    canNotify,
    requestPermission
  } = useNotifications({
    enabled: showBrowserNotifications
  });

  // Função para adicionar nova notificação com deduplicação
  const addNotification = useCallback((notification) => {
    if (!enabled) return;

    const newNotification = {
      ...notification,
      id: notification.id || `notification-${Date.now()}-${Math.random()}`,
      timestamp: notification.timestamp || new Date().toISOString(),
      read: false
    };

    setNotifications(prev => {
      // Verificar se a notificação já existe (deduplicação)
      const existingNotification = prev.find(n => n.id === newNotification.id);
      if (existingNotification) {
        console.log('⚠️ Notificação duplicada ignorada:', newNotification.id);
        return prev;
      }

      const updated = [newNotification, ...prev];
      // Manter apenas as últimas maxNotifications
      const limited = updated.slice(0, maxNotifications);
      
      // Salvar no localStorage
      try {
        localStorage.setItem('notifications', JSON.stringify(limited));
        console.log('💾 Notificações salvas no localStorage:', limited.length, 'notificações');
      } catch (error) {
        console.error('Erro ao salvar notificações no localStorage:', error);
      }
      
      return limited;
    });

    // Mostrar notificação do navegador se habilitada
    if (showBrowserNotifications && canNotify) {
      createNotification({
        title: newNotification.title,
        body: newNotification.message,
        icon: getNotificationIcon(newNotification.type),
        tag: newNotification.id,
        data: newNotification.data,
        requireInteraction: newNotification.type === 'error'
      });
    }

    // Callback personalizado
    onNewNotification(newNotification);

    // Log para debug
    console.log('🔔 Nova notificação:', newNotification);
  }, [enabled, showBrowserNotifications, canNotify, createNotification, maxNotifications, onNewNotification]);

  // Função para obter ícone baseado no tipo
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '/icons/success.svg';
      case 'error':
        return '/icons/error.svg';
      case 'warning':
        return '/icons/warning.svg';
      case 'info':
      default:
        return '/icons/info.svg';
    }
  };

  // Função para marcar notificação como lida
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => {
      const updated = prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      );
      
      // Salvar no localStorage
      try {
        localStorage.setItem('notifications', JSON.stringify(updated));
      } catch (error) {
        console.error('Erro ao salvar notificações no localStorage:', error);
      }
      
      return updated;
    });
  }, []);

  // Função para marcar todas como lidas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(notification => ({ ...notification, read: true }));
      
      // Salvar no localStorage
      try {
        localStorage.setItem('notifications', JSON.stringify(updated));
      } catch (error) {
        console.error('Erro ao salvar notificações no localStorage:', error);
      }
      
      return updated;
    });
  }, []);

  // Função para remover notificação
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const updated = prev.filter(notification => notification.id !== notificationId);
      
      // Salvar no localStorage
      try {
        localStorage.setItem('notifications', JSON.stringify(updated));
      } catch (error) {
        console.error('Erro ao salvar notificações no localStorage:', error);
      }
      
      return updated;
    });
  }, []);

  // Função para limpar todas as notificações
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    
    // Limpar do localStorage
    try {
      localStorage.removeItem('notifications');
    } catch (error) {
      console.error('Erro ao limpar notificações do localStorage:', error);
    }
  }, []);

  // Função para obter contagem de notificações não lidas
  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

      // Configurar WebSocket (apenas uma vez)
      useEffect(() => {
        if (!enabled || setupComplete.current || listenersRegistered.current) return;

        console.log(`🔄 Configurando WebSocket para notificações (instância: ${hookInstanceId.current})...`);

        // Conectar ao WebSocket
        websocketClient.connect();

        // Configurar listeners
        const handleConnection = (data) => {
          console.log('🔌 Status de conexão WebSocket:', data.status);
          setIsConnected(data.status === 'connected' || data.status === 'reconnected');
          
          switch (data.status) {
            case 'connected':
            case 'reconnected':
              setConnectionStatus('connected');
              break;
            case 'disconnected':
              setConnectionStatus('disconnected');
              break;
            case 'error':
            case 'reconnect_error':
              setConnectionStatus('error');
              break;
            default:
              setConnectionStatus('connecting');
          }
        };

        const handleNotification = (notification) => {
          console.log('🔔 Notificação recebida via WebSocket:', notification);
          addNotification(notification);
        };

        websocketClient.on('connection', handleConnection);
        websocketClient.on('notification', handleNotification);

        setupComplete.current = true;
        listenersRegistered.current = true;

        return () => {
          websocketClient.off('connection', handleConnection);
          websocketClient.off('notification', handleNotification);
          setIsConnected(false);
          setConnectionStatus('disconnected');
          setupComplete.current = false;
          listenersRegistered.current = false;
        };
      }, [enabled]);

  // Solicitar permissão para notificações do navegador
  useEffect(() => {
    if (showBrowserNotifications && !canNotify) {
      requestPermission();
    }
  }, [showBrowserNotifications, canNotify, requestPermission]);

      // Função para simular notificação (para testes)
      const simulateNotification = useCallback((type = 'info', title = 'Teste', message = 'Notificação de teste') => {
        const notification = {
          type,
          title,
          message,
          timestamp: new Date().toISOString(),
          data: { simulated: true }
        };
        addNotification(notification);
      }, [addNotification]);

      // Função para autenticar usuário no WebSocket
      const authenticateUser = useCallback((userId) => {
        websocketClient.authenticate(userId);
      }, []);

  return {
    // Estado
    notifications,
    isConnected,
    connectionStatus,
    unreadCount: getUnreadCount(),
    
    // Funções
    markAsRead,
    markAllAsRead,
        removeNotification,
        clearAllNotifications,
        simulateNotification,
        authenticateUser,
        
        // Configurações
        canNotify,
        requestPermission
  };
};

export default useRealtimeNotifications;
