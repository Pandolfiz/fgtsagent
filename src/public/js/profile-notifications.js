/**
 * profile-notifications.js - Funcionalidades para a página de configurações de notificações
 */
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar elementos do Bootstrap
  initializeBootstrapComponents();
  
  // Toggle da seção "Não Perturbe"
  const enableDnd = document.getElementById('enableDnd');
  const dndTimeContainer = document.getElementById('dndTimeContainer');
  
  if (enableDnd && dndTimeContainer) {
    toggleDndTimeVisibility();
    enableDnd.addEventListener('change', toggleDndTimeVisibility);
  }
  
  // Manipular formulário de configurações de notificações
  const form = document.getElementById('notificationSettingsForm');
  if (form) {
    setupFormHandling(form);
  }
  
  // Manipular botão de restaurar padrões
  const resetBtn = document.getElementById('resetNotificationsBtn');
  if (resetBtn) {
    setupResetButton(resetBtn);
  }
  
  /**
   * Alterna a visibilidade da seção de horário de "Não Perturbe"
   */
  function toggleDndTimeVisibility() {
    if (enableDnd.checked) {
      dndTimeContainer.style.display = 'flex';
    } else {
      dndTimeContainer.style.display = 'none';
    }
  }
});

/**
 * Inicializa componentes do Bootstrap
 */
function initializeBootstrapComponents() {
  // Inicializar toasts se existirem
  const toastElList = [].slice.call(document.querySelectorAll('.toast'));
  toastElList.map(function(toastEl) {
    return new bootstrap.Toast(toastEl);
  });
  
  // Inicializar tooltips se existirem
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

/**
 * Configura o manipulador de envio do formulário
 * @param {HTMLFormElement} form - O elemento do formulário
 */
function setupFormHandling(form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Coletar os dados do formulário
    const formData = new FormData(form);
    
    // Criar objeto estruturado para as configurações de notificações
    const notificationSettings = {
      notifications: {
        email: formData.has('emailNotifications'),
        push: formData.has('pushNotifications'),
        sms: formData.has('smsNotifications'),
        
        security: {
          login: formData.has('loginNotification'),
          passwordChange: formData.has('passwordChangeNotification'),
          twoFactorChange: formData.has('profile2faChangeNotification')
        },
        
        agents: {
          creation: formData.has('agentCreationNotification'),
          update: formData.has('agentUpdateNotification')
        },
        
        organizations: {
          invites: formData.has('orgInviteNotification'),
          updates: formData.has('orgUpdateNotification')
        },
        
        messages: {
          newMessage: formData.has('newMessageNotification'),
          mentions: formData.has('mentionNotification')
        },
        
        marketing: {
          newsletter: formData.has('newsletterNotification'),
          productUpdates: formData.has('productUpdatesNotification'),
          promotions: formData.has('promotionsNotification')
        },
        
        emailFrequency: formData.get('emailFrequency'),
        
        doNotDisturb: {
          enabled: formData.has('enableDnd'),
          startTime: formData.get('dndStart'),
          endTime: formData.get('dndEnd')
        }
      }
    };
    
    // Enviar os dados para o servidor
    fetch('/profile/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationSettings)
    })
    .then(response => response.json())
    .then(data => {
      showAlert(data.success, data.message);
    })
    .catch(error => {
      console.error('Erro ao salvar configurações de notificações:', error);
      showAlert(false, 'Erro ao salvar configurações de notificações. Tente novamente mais tarde.');
    });
  });
}

/**
 * Configura o botão de resetar configurações de notificações
 * @param {HTMLButtonElement} resetBtn - O botão de reset
 */
function setupResetButton(resetBtn) {
  resetBtn.addEventListener('click', function() {
    // Restaurar checkboxes relacionados aos canais
    document.getElementById('emailNotifications').checked = true;
    document.getElementById('pushNotifications').checked = false;
    document.getElementById('smsNotifications').checked = false;
    
    // Restaurar checkboxes relacionados à segurança
    document.getElementById('loginNotification').checked = true;
    document.getElementById('passwordChangeNotification').checked = true;
    document.getElementById('profile2faChangeNotification').checked = true;
    
    // Restaurar checkboxes relacionados a agentes e organizações
    document.getElementById('agentCreationNotification').checked = true;
    document.getElementById('agentUpdateNotification').checked = true;
    document.getElementById('orgInviteNotification').checked = true;
    document.getElementById('orgUpdateNotification').checked = true;
    
    // Restaurar checkboxes relacionados a mensagens
    document.getElementById('newMessageNotification').checked = true;
    document.getElementById('mentionNotification').checked = true;
    
    // Restaurar checkboxes relacionados a marketing
    document.getElementById('newsletterNotification').checked = false;
    document.getElementById('productUpdatesNotification').checked = true;
    document.getElementById('promotionsNotification').checked = false;
    
    // Restaurar frequência de e-mail
    document.getElementById('emailFrequency').value = 'immediate';
    
    // Restaurar configurações de não perturbe
    document.getElementById('enableDnd').checked = false;
    document.getElementById('dndStart').value = '22:00';
    document.getElementById('dndEnd').value = '07:00';
    
    // Atualizar visibilidade da seção de horário
    const dndTimeContainer = document.getElementById('dndTimeContainer');
    dndTimeContainer.style.display = 'none';
    
    // Avisar que as configurações foram restauradas, mas não salvas
    showAlert('info', 'Configurações restauradas para o padrão. Clique em "Salvar Preferências" para aplicar as mudanças.');
  });
}

/**
 * Exibe um alerta na página
 * @param {boolean|string} type - O tipo de alerta (true = success, false = danger, ou string do tipo)
 * @param {string} message - A mensagem a ser exibida
 */
function showAlert(type, message) {
  let alertType;
  
  if (typeof type === 'boolean') {
    alertType = type ? 'success' : 'danger';
  } else {
    alertType = type;
  }
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${alertType} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
  `;
  
  // Remover alertas existentes
  const existingAlerts = document.querySelectorAll('.alert');
  existingAlerts.forEach(alert => alert.remove());
  
  // Inserir a mensagem no topo do formulário
  const alertContainer = document.querySelector('.card-body');
  alertContainer.insertBefore(alertDiv, alertContainer.firstChild);
  
  // Rolar para o topo do formulário se necessário
  window.scrollTo({ top: 0, behavior: 'smooth' });
} 