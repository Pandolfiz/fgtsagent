/**
 * profile-settings.js - Funcionalidades para a página de configurações do perfil
 */
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar elementos do Bootstrap
  initializeBootstrapComponents();

  // Manipular formulário de configurações
  const form = document.getElementById('profileSettingsForm');
  if (form) {
    setupFormHandling(form);
  }

  // Manipular botão de restaurar padrões
  const resetBtn = document.getElementById('resetSettingsBtn');
  if (resetBtn) {
    setupResetButton(resetBtn);
  }

  // Aplicar tema se configurado
  applyThemeFromSettings();
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
 * Configurar o manipulador de envio do formulário
 * @param {HTMLFormElement} form - O elemento do formulário
 */
function setupFormHandling(form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    // Coletar os dados do formulário
    const formData = new FormData(form);
    const settings = {};

    for (const [key, value] of formData.entries()) {
      // Para checkboxes, armazenar como booleano
      if (key === 'showWelcomeMessage' || key === 'showStats' || key === 'compactView') {
        settings[key] = true;
      } else {
        settings[key] = value;
      }
    }

    // Adicionar checkboxes desmarcados como falso
    if (!formData.has('showWelcomeMessage')) settings['showWelcomeMessage'] = false;
    if (!formData.has('showStats')) settings['showStats'] = false;
    if (!formData.has('compactView')) settings['compactView'] = false;

    // Enviar os dados para o servidor
    fetch('/profile/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    })
    .then(response => response.json())
    .then(data => {
      showAlert(data.success, data.message);

      // Aplicar tema se alterado
      if (data.success && settings.theme && settings.theme !== 'system') {
        document.documentElement.setAttribute('data-bs-theme', settings.theme);
      }
    })
    .catch(error => {
      console.error('Erro ao salvar configurações:', error);
      showAlert(false, 'Erro ao salvar configurações. Tente novamente mais tarde.');
    });
  });
}

/**
 * Configura o botão de resetar configurações
 * @param {HTMLButtonElement} resetBtn - O botão de reset
 */
function setupResetButton(resetBtn) {
  resetBtn.addEventListener('click', function() {
    // Definir valores padrão
    document.getElementById('theme').value = 'system';
    document.getElementById('language').value = 'pt-BR';
    document.getElementById('timezone').value = 'America/Sao_Paulo';
    document.getElementById('dateFormat').value = 'DD/MM/YYYY';
    document.getElementById('showWelcomeMessage').checked = true;
    document.getElementById('showStats').checked = true;
    document.getElementById('compactView').checked = false;

    // Aviso de que as configurações foram restauradas, mas não salvas
    showAlert('info', 'Configurações restauradas para o padrão. Clique em "Salvar Configurações" para aplicar as mudanças.');
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

/**
 * Aplica o tema conforme as configurações
 */
function applyThemeFromSettings() {
  const themeSelect = document.getElementById('theme');
  if (themeSelect) {
    const currentTheme = themeSelect.value;
    if (currentTheme && currentTheme !== 'system') {
      document.documentElement.setAttribute('data-bs-theme', currentTheme);
    }
  }
}