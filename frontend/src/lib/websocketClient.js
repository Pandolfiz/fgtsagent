import { io } from 'socket.io-client';

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 1; // Limitar tentativas de conexão
  }

  /**
   * Conectar ao servidor WebSocket
   */
  connect() {
    // Evitar múltiplas conexões
    if (this.socket && this.socket.connected) {
      console.log('✅ WebSocket já está conectado');
      return;
    }

    // Verificar se pode conectar globalmente
    if (!this.canConnect()) {
      console.log('⚠️ Máximo de conexões WebSocket atingido globalmente');
      return;
    }

    // Limitar tentativas de conexão
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.log('⚠️ Máximo de tentativas de conexão atingido');
      return;
    }

    this.connectionAttempts++;
    this.registerConnection();

    try {
      // URL do backend (mesmo domínio, porta 3000)
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://localhost:3000';
      
      console.log('🔌 Conectando ao WebSocket:', backendUrl);
      
      this.socket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
        autoConnect: true,
        secure: true,
        rejectUnauthorized: false, // Para certificados auto-assinados em desenvolvimento
        forceNew: true,
        upgrade: true
      });

      // Eventos de conexão
      this.socket.on('connect', () => {
        console.log('✅ Conectado ao WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connection', { status: 'connected' });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Desconectado do WebSocket:', reason);
        this.isConnected = false;
        this.emit('connection', { status: 'disconnected', reason });
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Erro de conexão WebSocket:', error);
        this.emit('connection', { status: 'error', error: error.message });
      });

      // Evento para receber notificações
      this.socket.on('notification', (notification) => {
        console.log('🔔 Notificação recebida via WebSocket:', notification);
        this.emit('notification', notification);
      });

      // Evento de reconexão
      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconectado ao WebSocket (tentativa ${attemptNumber})`);
        this.isConnected = true;
        this.emit('connection', { status: 'reconnected', attempt: attemptNumber });
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('❌ Erro na reconexão:', error);
        this.emit('connection', { status: 'reconnect_error', error: error.message });
      });

    } catch (error) {
      console.error('❌ Erro ao inicializar WebSocket:', error);
      this.emit('connection', { status: 'error', error: error.message });
    }
  }

  /**
   * Desconectar do servidor
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Desconectando WebSocket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.unregisterConnection();
    }
  }

  /**
   * Autenticar usuário no WebSocket
   */
  authenticate(userId) {
    if (this.socket && this.isConnected) {
      console.log(`👤 Autenticando usuário no WebSocket: ${userId}`);
      this.socket.emit('authenticate', { userId });
    } else {
      console.warn('⚠️ WebSocket não conectado para autenticação');
    }
  }

  /**
   * Adicionar listener para eventos
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remover listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emitir evento para listeners
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Erro no listener do evento ${event}:`, error);
        }
      });
    }
  }

  /**
   * Verificar se está conectado
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Instância singleton
const websocketClient = new WebSocketClient();

// Controle global de instâncias
let globalConnectionCount = 0;
const MAX_GLOBAL_CONNECTIONS = 1;

// Função para verificar se pode conectar
websocketClient.canConnect = () => {
  return globalConnectionCount < MAX_GLOBAL_CONNECTIONS;
};

// Função para registrar conexão
websocketClient.registerConnection = () => {
  globalConnectionCount++;
  console.log(`📊 Conexões WebSocket ativas: ${globalConnectionCount}`);
};

// Função para desregistrar conexão
websocketClient.unregisterConnection = () => {
  globalConnectionCount = Math.max(0, globalConnectionCount - 1);
  console.log(`📊 Conexões WebSocket ativas: ${globalConnectionCount}`);
};

export default websocketClient;
