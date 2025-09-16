import React, { useState } from 'react';
import { 
  Bell, 
  Check, 
  X, 
  Trash2, 
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  DollarSign,
  FileText
} from 'lucide-react';
import useRealtimeNotifications from '../hooks/useRealtimeNotifications';

const NotificationCenter = ({ isOpen, onClose, notificationHook }) => {
  // Usar o hook passado como prop ou criar um novo se não fornecido
  const hookData = notificationHook || useRealtimeNotifications({
    enabled: true,
    showBrowserNotifications: true,
    showToastNotifications: true
  });

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    isConnected,
    connectionStatus,
    simulateNotification
  } = hookData;

  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'balance', 'proposals'

  // Função para obter ícone baseado no tipo (estilo futurista)
  const getNotificationIcon = (type, data) => {
    // Verificar tipos específicos de balance
    if (type === 'balance_error') {
      return <AlertCircle className="w-5 h-5 text-red-400 drop-shadow-neon" />;
    }
    if (type === 'balance_success' || type === 'balance_zero') {
      return <DollarSign className="w-5 h-5 text-green-400 drop-shadow-neon" />;
    }
    
    // Verificar tipos específicos de proposal
    if (type === 'proposal_insert') {
      return <FileText className="w-5 h-5 text-blue-400 drop-shadow-neon" />;
    }
    if (type === 'proposal_update') {
      return <FileText className="w-5 h-5 text-cyan-400 drop-shadow-neon" />;
    }
    
    // Fallback para tipos genéricos
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400 drop-shadow-neon" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400 drop-shadow-neon" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400 drop-shadow-neon" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-cyan-400 drop-shadow-neon" />;
    }
  };

  // Função para obter cor baseada no tipo (estilo futurista)
  const getNotificationColor = (type) => {
    // Tipos específicos de balance
    if (type === 'balance_error') {
      return 'border-l-red-400 bg-gradient-to-r from-red-500/10 to-pink-500/10 hover:from-red-500/20 hover:to-pink-500/20';
    }
    if (type === 'balance_success') {
      return 'border-l-green-400 bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20';
    }
    if (type === 'balance_zero') {
      return 'border-l-yellow-400 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/20 hover:to-orange-500/20';
    }
    
    // Tipos específicos de proposal
    if (type === 'proposal_insert') {
      return 'border-l-blue-400 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20';
    }
    if (type === 'proposal_update') {
      return 'border-l-cyan-400 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20';
    }
    
    // Fallback para tipos genéricos
    switch (type) {
      case 'success':
        return 'border-l-green-400 bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20';
      case 'error':
        return 'border-l-red-400 bg-gradient-to-r from-red-500/10 to-pink-500/10 hover:from-red-500/20 hover:to-pink-500/20';
      case 'warning':
        return 'border-l-yellow-400 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/20 hover:to-orange-500/20';
      case 'info':
      default:
        return 'border-l-cyan-400 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20';
    }
  };

  // Filtrar notificações
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'balance') return notification.type?.includes('balance');
    if (filter === 'proposals') return notification.type?.includes('proposal');
    return true;
  });

  // Formatar timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Agora mesmo';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay futurista */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-cyan-950/80 to-blue-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Painel de notificações com estilo futurista */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-gradient-to-br from-emerald-950/95 via-cyan-950/95 to-blue-950/95 backdrop-blur-lg border-l border-cyan-400/30 shadow-2xl shadow-cyan-500/20 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header futurista */}
          <div className="flex items-center justify-between p-4 border-b border-cyan-400/20 bg-gradient-to-r from-cyan-950/50 to-blue-950/50">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-cyan-300 drop-shadow-neon" />
              <h2 className="text-lg font-semibold text-white drop-shadow-neon">
                Notificações
              </h2>
              {unreadCount > 0 && (
                <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center font-medium shadow-lg shadow-red-500/50 border border-red-400/50 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-cyan-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 border border-cyan-800/50 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status de conexão futurista */}
          <div className="px-4 py-2 border-b border-cyan-400/20 bg-gradient-to-r from-emerald-950/30 to-cyan-950/30">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                isConnected 
                  ? 'bg-green-400 shadow-lg shadow-green-400/50 animate-pulse' 
                  : 'bg-red-400 shadow-lg shadow-red-400/50 animate-pulse'
              }`} />
              <span className="text-cyan-200 font-medium">
                {isConnected ? 'Conectado em tempo real' : 'Desconectado'}
              </span>
            </div>
          </div>

          {/* Filtros futuristas */}
          <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-blue-950/30 to-emerald-950/30">
            <div className="flex gap-2 mb-3 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-full transition-all duration-200 border ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/50'
                    : 'bg-white/10 text-cyan-200 border-cyan-800/50 hover:border-cyan-400 hover:bg-white/20'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-sm rounded-full transition-all duration-200 border ${
                  filter === 'unread'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/50'
                    : 'bg-white/10 text-cyan-200 border-cyan-800/50 hover:border-cyan-400 hover:bg-white/20'
                }`}
              >
                Não lidas
              </button>
              <button
                onClick={() => setFilter('balance')}
                className={`px-3 py-1 text-sm rounded-full transition-all duration-200 border ${
                  filter === 'balance'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/50'
                    : 'bg-white/10 text-cyan-200 border-cyan-800/50 hover:border-cyan-400 hover:bg-white/20'
                }`}
              >
                Saldos
              </button>
              <button
                onClick={() => setFilter('proposals')}
                className={`px-3 py-1 text-sm rounded-full transition-all duration-200 border ${
                  filter === 'proposals'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/50'
                    : 'bg-white/10 text-cyan-200 border-cyan-800/50 hover:border-cyan-400 hover:bg-white/20'
                }`}
              >
                Propostas
              </button>
            </div>

            {/* Ações futuristas */}
            <div className="flex gap-2 flex-wrap">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-green-400 hover:text-white bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 hover:border-green-400 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20"
                >
                  <Check className="w-4 h-4" />
                  Marcar todas como lidas
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    clearAllNotifications();
                    console.log('🧹 Todas as notificações foram limpas. Contador deve ser 0.');
                  }}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-400 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar todas
                </button>
              )}
            </div>
          </div>

          {/* Lista de notificações */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-transparent to-emerald-950/20">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-cyan-300">
                <Bell className="w-12 h-12 mb-4 opacity-50 drop-shadow-neon" />
                <p className="text-lg font-medium drop-shadow-neon">Nenhuma notificação</p>
                <p className="text-sm text-cyan-200">Você receberá notificações quando houver novas atividades</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border-l-4 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/20 backdrop-blur-sm border border-white/10 hover:border-white/20 notification-slide-in ${
                      notification.read 
                        ? 'opacity-60' 
                        : 'opacity-100 notification-unread'
                    } ${getNotificationColor(notification.type)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type, notification.data)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium text-white drop-shadow-neon">
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1 ml-2">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 text-cyan-300 hover:text-white hover:bg-white/10 rounded transition-all duration-200 border border-cyan-800/50 hover:border-cyan-400"
                                title="Marcar como lida"
                              >
                                <EyeOff className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => removeNotification(notification.id)}
                              className="p-1 text-red-300 hover:text-white hover:bg-red-500/20 rounded transition-all duration-200 border border-red-800/50 hover:border-red-400"
                              title="Remover"
                            >
                              <X className="w-3 h-3" />
              </button>
            </div>
            
          </div>
                        
                        <p className="mt-1 text-sm text-cyan-200">
                          {notification.message}
                        </p>
                        
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-cyan-300">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          {notification.data?.type && (
                            <span className="text-xs px-2 py-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/30 rounded-full">
                              {notification.data.type === 'balance' ? 'Saldo' : 'Proposta'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
