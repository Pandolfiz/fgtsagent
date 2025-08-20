/**
 * Manipulador de eventos para autenticação OAuth2
 * Este script fornece funções para iniciar o fluxo OAuth2 e lidar com os callbacks
 */

// Configuração global
const OAuth2Handler = {
  popupWindow: null,
  popupCheckInterval: null,
  callbackFunction: null,

  /**
   * Inicia o fluxo OAuth2 abrindo uma janela popup
   * @param {string} provider - O provedor OAuth2 (ex: 'microsoft')
   * @param {string} organizationId - ID da organização
   * @param {string} credentialName - Nome para a nova credencial
   * @param {string} scope - Escopo solicitado para a API (opcional)
   * @param {Function} callback - Função de callback a ser chamada após conclusão
   */
  startOAuth2Flow(provider, organizationId, credentialName, scope = '', callback = null) {
    // Salvar callback para uso posterior
    this.callbackFunction = callback;

    // Construir a URL para o popup (usando URL genérica sem ID da organização no caminho)
    const authUrl = `/api/credentials/oauth2/popup/${provider}`;
    const queryParams = new URLSearchParams();

    // Passar organizationId como parâmetro na query
    queryParams.append('organizationId', organizationId);
    if (scope) queryParams.append('scope', scope);
    if (credentialName) queryParams.append('credentialName', credentialName);

    const fullAuthUrl = `${authUrl}?${queryParams.toString()}`;

    // Configurações da janela popup
    const width = 600;
    const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    // Abrir o popup
    this.popupWindow = window.open(fullAuthUrl, 'oauth2Popup',
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,status=0,menubar=0`);

    // Verificar se o popup foi bloqueado
    if (!this.popupWindow || this.popupWindow.closed || typeof this.popupWindow.closed === 'undefined') {
      showNotification('A janela pop-up foi bloqueada. Por favor, permita pop-ups para este site e tente novamente.', 'error');
      return false;
    }

    // Iniciar verificação periódica do popup
    this.startPopupCheck();

    // Configurar listener para mensagens do popup
    this.setupMessageListener();

    return true;
  },

  /**
   * Verifica periodicamente se o popup foi fechado
   */
  startPopupCheck() {
    // Limpar qualquer intervalo existente
    if (this.popupCheckInterval) {
      clearInterval(this.popupCheckInterval);
    }

    // Configurar novo intervalo
    this.popupCheckInterval = setInterval(() => {
      if (!this.popupWindow || this.popupWindow.closed) {
        clearInterval(this.popupCheckInterval);
        this.handlePopupClosed();
      }
    }, 500);
  },

  /**
   * Configura um listener para mensagens do popup
   */
  setupMessageListener() {
    window.addEventListener('message', this.handlePostMessage.bind(this), false);
  },

  /**
   * Trata mensagens recebidas do popup
   * @param {MessageEvent} event - Evento de mensagem
   */
  handlePostMessage(event) {
    // Verificar se a mensagem é do tipo esperado
    if (event.data && (event.data.type === 'oauth2-callback' || event.data.type === 'oauth2Success')) {
      // Confirmar o recebimento da mensagem
      try {
        if (event.source && !event.source.closed) {
          event.source.postMessage({
            type: 'oauth2SuccessConfirmed',
            timestamp: Date.now()
          }, '*');
        }
      } catch (e) {
        console.warn('Não foi possível confirmar o recebimento para a origem:', e);
      }

      const { success, status, error, message, credentialId, provider, organizationId } = event.data;

      // Determinar se foi bem-sucedido baseado nos campos disponíveis
      const isSuccess = success || status === 'success';

      // Fechar o popup se ainda estiver aberto
      if (this.popupWindow && !this.popupWindow.closed) {
        this.popupWindow.close();
      }

      // Limpar o intervalo de verificação
      if (this.popupCheckInterval) {
        clearInterval(this.popupCheckInterval);
      }

      // Mostrar notificação apropriada
      if (isSuccess) {
        showNotification(message || `Credencial ${provider || ''} configurada com sucesso!`, 'success');

        // Recarregar a lista de credenciais se estiver na página da organização
        if (typeof refreshCredentials === 'function' && organizationId) {
          setTimeout(() => refreshCredentials(organizationId), 1000);
        }
      } else {
        showNotification(message || `Erro na autenticação: ${error}`, 'error');
      }

      // Chamar função de callback se existir
      if (typeof this.callbackFunction === 'function') {
        this.callbackFunction({
          success: isSuccess,
          error,
          message,
          credentialId,
          provider,
          organizationId
        });
      }
    }
  },

  /**
   * Manipula o fechamento do popup sem mensagem explícita
   */
  handlePopupClosed() {
    // Chamar callback com sucesso desconhecido
    if (typeof this.callbackFunction === 'function') {
      this.callbackFunction({
        success: false,
        error: 'popup_closed',
        message: 'A janela de autenticação foi fechada sem completar o processo.'
      });
    }
  }
};

// Função auxiliar para exibir notificações caso ainda não esteja definida
if (typeof showNotification !== 'function') {
  window.showNotification = function(message, type = 'info') {
    if (typeof Toastify === 'function') {
      Toastify({
        text: message,
        duration: 4000,
        close: true,
        gravity: 'top',
        position: 'right',
        backgroundColor: type === 'success' ? '#4caf50' :
                        type === 'error' ? '#f44336' :
                        type === 'warning' ? '#ff9800' : '#2196f3'
      }).showToast();
    } else {
      alert(message);
    }
  };
}