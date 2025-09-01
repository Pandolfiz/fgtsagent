/**
 * profile-security.js - Funcionalidades para a página de segurança da conta
 */
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar elementos do Bootstrap
  initializeBootstrapComponents();

  // Configurar formulário de alteração de senha
  const changePasswordForm = document.getElementById('changePasswordForm');
  if (changePasswordForm) {
    setupPasswordFormHandling(changePasswordForm);
  }

  // Configurar botões de 2FA
  setupTwoFactorAuth();

  // Configurar botões de sessões
  setupSessionButtons();
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
 * Configura o manipulador de envio do formulário de senha
 * @param {HTMLFormElement} form - O elemento do formulário
 */
function setupPasswordFormHandling(form) {
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const passwordMatchError = document.getElementById('passwordMatchError');
  let isSubmitting = false; // Flag para controlar envio em andamento

  // Verificar se as senhas coincidem
  function checkPasswordMatch() {
    if (newPasswordInput.value !== confirmPasswordInput.value) {
      confirmPasswordInput.setCustomValidity('As senhas não coincidem');
      passwordMatchError.style.display = 'block';
    } else {
      confirmPasswordInput.setCustomValidity('');
      passwordMatchError.style.display = 'none';
    }
  }

  // Adicionar eventos para verificação em tempo real
  newPasswordInput.addEventListener('input', checkPasswordMatch);
  confirmPasswordInput.addEventListener('input', checkPasswordMatch);

  // Validar formulário antes de enviar
  form.addEventListener('submit', function(e) {
    // Sempre prevenir o comportamento padrão para evitar envio duplo
    e.preventDefault();

    // Se já estiver processando um envio, ignorar
    if (isSubmitting) {
      console.log('Já existe uma submissão em andamento...');
      return false;
    }

    // Verificar se as senhas coincidem
    if (newPasswordInput.value !== confirmPasswordInput.value) {
      passwordMatchError.style.display = 'block';
      return false;
    }

    // Verificar requisitos de senha
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(newPasswordInput.value)) {
      showAlert(false, 'A senha não atende aos requisitos de segurança. Ela deve conter pelo menos 8 caracteres, incluindo uma letra maiúscula, uma letra minúscula, um número e um caractere especial (@$!%*?&).');
      return false;
    }

    // Ativar flag de submissão
    isSubmitting = true;

    // Desativar o botão de envio para evitar cliques múltiplos
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    }

    // Enviar o formulário para o servidor
    fetch('/profile/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentPassword: document.getElementById('currentPassword').value,
        newPassword: newPasswordInput.value
      }),
      credentials: 'same-origin' // Incluir cookies e sessão na requisição
    })
    .then(response => {
      // Armazenar o status da resposta para verificar depois
      const responseStatus = response.status;
      return response.json().then(data => {
        // Adicionar o status HTTP aos dados para referência
        return { ...data, statusCode: responseStatus };
      });
    })
    .then(data => {
      // Verificar explicitamente erro de autenticação (401)
      if (data.statusCode === 401) {
        // Sessão expirada ou inválida - redirecionar para login com mensagem
        showAlert(false, data.message || 'Sua sessão expirou. Você será redirecionado para a página de login.');

        // Dar tempo para o usuário ler a mensagem e então redirecionar
        setTimeout(() => {
          window.location.href = '/auth/login?message=Sua sessão expirou. Por favor, faça login novamente.';
        }, 3000);
        return;
      }

      // Verificar o código de status para tratamento específico
      if (data.statusCode === 400 && data.message) {
        // Detectar os diferentes tipos de erro relacionados à senha
        if (data.message.includes('diferente da senha atual') ||
            data.message.includes('igual a uma senha utilizada') ||
            data.message.includes('different from the old')) {
          // Erro específico para senha igual à atual ou recentemente utilizada
          showAlert(false, data.message);

          // Limpar apenas o campo de nova senha e manter a senha atual
          newPasswordInput.value = '';
          confirmPasswordInput.value = '';
          newPasswordInput.focus();
        } else {
          // Exibir a mensagem retornada pelo servidor
          showAlert(data.success, data.message);

          // Limpar formulário se bem-sucedido
          if (data.success) {
            form.reset();
          }
        }
      } else {
        // Exibir a mensagem retornada pelo servidor
        showAlert(data.success, data.message);

        // Limpar formulário se bem-sucedido
        if (data.success) {
          form.reset();
        }
      }
    })
    .catch(error => {
      console.error('Erro ao alterar senha:', error);
      showAlert(false, 'Erro ao processar a solicitação. Tente novamente mais tarde.');
    })
    .finally(() => {
      // Reativar o botão e redefinir a flag
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Alterar Senha';
      }
    });
  });
}

/**
 * Configura os botões relacionados à autenticação de dois fatores
 */
function setupTwoFactorAuth() {
  const enable2faBtn = document.getElementById('enable2faBtn');
  const disable2faBtn = document.getElementById('disable2faBtn');

  if (enable2faBtn) {
    enable2faBtn.addEventListener('click', function() {
      // Redirecionar para a página de ativação de 2FA
      window.location.href = '/profile/2fa/setup';
    });
  }

  if (disable2faBtn) {
    disable2faBtn.addEventListener('click', function() {
      if (confirm('Tem certeza que deseja desativar a autenticação de dois fatores? Isso pode reduzir a segurança da sua conta.')) {
        // Enviar solicitação para desativar 2FA
        fetch('/profile/2fa/disable', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            window.location.reload();
          } else {
            alert(data.message || 'Erro ao desativar 2FA. Tente novamente.');
          }
        })
        .catch(error => {
          console.error('Erro ao desativar 2FA:', error);
          alert('Erro ao desativar 2FA. Tente novamente mais tarde.');
        });
      }
    });
  }
}

/**
 * Configura os botões relacionados às sessões
 */
function setupSessionButtons() {
  const sessionLogoutBtns = document.querySelectorAll('.session-logout-btn');
  const logoutAllBtn = document.getElementById('logoutAllBtn');
  const viewAllActivitiesBtn = document.getElementById('viewAllActivitiesBtn');

  sessionLogoutBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const sessionId = this.getAttribute('data-session-id');

      if (confirm('Tem certeza que deseja encerrar esta sessão?')) {
        // Enviar solicitação para encerrar sessão específica
        fetch(`/profile/sessions/${sessionId}/logout`, {
          method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Remover linha da tabela
            this.closest('tr').remove();
            showAlert(true, 'Sessão encerrada com sucesso.');
          } else {
            showAlert(false, data.message || 'Erro ao encerrar sessão. Tente novamente.');
          }
        })
        .catch(error => {
          console.error('Erro ao encerrar sessão:', error);
          showAlert(false, 'Erro ao encerrar sessão. Tente novamente mais tarde.');
        });
      }
    });
  });

  if (logoutAllBtn) {
    logoutAllBtn.addEventListener('click', function() {
      if (confirm('Tem certeza que deseja encerrar todas as sessões? Você será desconectado e precisará fazer login novamente.')) {
        // Enviar solicitação para encerrar todas as sessões
        fetch('/profile/sessions/logout-all', {
          method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            window.location.href = '/auth/login?message=Todas as sessões foram encerradas. Por favor, faça login novamente.';
          } else {
            showAlert(false, data.message || 'Erro ao encerrar sessões. Tente novamente.');
          }
        })
        .catch(error => {
          console.error('Erro ao encerrar todas as sessões:', error);
          showAlert(false, 'Erro ao encerrar todas as sessões. Tente novamente mais tarde.');
        });
      }
    });
  }

  if (viewAllActivitiesBtn) {
    viewAllActivitiesBtn.addEventListener('click', function() {
      window.location.href = '/profile/activity-log';
    });
  }
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