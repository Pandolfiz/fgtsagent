/**
 * Funcionalidades da página de chaves de API
 */
document.addEventListener('DOMContentLoaded', function() {
  // Elementos da interface
  const createApiKeyBtn = document.getElementById('createApiKeyBtn');
  const createApiKeyForm = document.getElementById('createApiKeyForm');
  const createApiKeyModal = document.getElementById('createApiKeyModal');
  const apiKeysList = document.getElementById('apiKeysList');
  const newKeyContainer = document.getElementById('newKeyContainer');
  const closeNewKeyBtn = document.getElementById('closeNewKeyBtn');
  const copyKeyBtn = document.getElementById('copyKeyBtn');
  const keysLoadingSpinner = document.getElementById('keysLoadingSpinner');
  const noKeysMessage = document.getElementById('noKeysMessage');
  const createKeySpinner = document.getElementById('createKeySpinner');
  const submitApiKeyBtn = document.getElementById('submitApiKeyBtn');
  const revokeKeyModal = document.getElementById('revokeKeyModal');
  const confirmRevokeBtn = document.getElementById('confirmRevokeBtn');
  const revokeKeySpinner = document.getElementById('revokeKeySpinner');
  const editKeyNameModal = document.getElementById('editKeyNameModal');
  const editKeyNameForm = document.getElementById('editKeyNameForm');
  const editKeyNameInput = document.getElementById('editKeyNameInput');
  const saveKeyNameBtn = document.getElementById('saveKeyNameBtn');
  const editKeyNameSpinner = document.getElementById('editKeyNameSpinner');
  
  // Variáveis para armazenar dados
  let selectedKeyId = null;
  let selectedKeyName = null;
  let selectedKeyPrefix = null;
  
  // Initialize Bootstrap modals
  const createModal = new bootstrap.Modal(createApiKeyModal);
  const revokeModal = new bootstrap.Modal(revokeKeyModal);
  const editModal = new bootstrap.Modal(editKeyNameModal);
  
  // Inicializar eventos
  initEvents();
  
  // Carregar dados
  loadApiKeys();
  
  /**
   * Inicializa eventos da página
   */
  function initEvents() {
    // Evento para abrir modal de criação
    if (createApiKeyBtn) {
      createApiKeyBtn.addEventListener('click', function() {
        createModal.show();
      });
    }
    
    // Evento para fechar mensagem de chave criada
    if (closeNewKeyBtn) {
      closeNewKeyBtn.addEventListener('click', function() {
        newKeyContainer.classList.add('d-none');
      });
    }
    
    // Evento para copiar valor da chave
    if (copyKeyBtn) {
      copyKeyBtn.addEventListener('click', function() {
        const keyValue = document.getElementById('newKeyValue');
        if (keyValue) {
          keyValue.select();
          document.execCommand('copy');
          
          // Alterar temporariamente o ícone para indicar sucesso
          const originalHtml = copyKeyBtn.innerHTML;
          copyKeyBtn.innerHTML = '<i class="fas fa-check"></i>';
          
          setTimeout(() => {
            copyKeyBtn.innerHTML = originalHtml;
          }, 1500);
        }
      });
    }
    
    // Evento para formulário de criação de chave
    if (createApiKeyForm) {
      createApiKeyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        createApiKey();
      });
    }
    
    // Evento para formulário de edição de nome da chave
    if (editKeyNameForm) {
      editKeyNameForm.addEventListener('submit', function(e) {
        e.preventDefault();
        updateKeyName();
      });
    }
    
    // Evento para confirmar revogação
    if (confirmRevokeBtn) {
      confirmRevokeBtn.addEventListener('click', function() {
        revokeApiKey();
      });
    }
  }
  
  /**
   * Carrega a lista de chaves de API do usuário
   */
  async function loadApiKeys() {
    try {
      // Mostrar indicador de carregamento
      if (keysLoadingSpinner) {
        keysLoadingSpinner.classList.remove('d-none');
      }
      
      // Fazer requisição à API
      const response = await fetch('/api/user/api-keys');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Erro ao carregar chaves de API');
      }
      
      // Esconder indicador de carregamento
      if (keysLoadingSpinner) {
        keysLoadingSpinner.classList.add('d-none');
      }
      
      // Renderizar chaves na tabela
      renderApiKeys(result.data || []);
      
    } catch (error) {
      console.error('Erro ao carregar chaves de API:', error);
      
      // Esconder indicador de carregamento
      if (keysLoadingSpinner) {
        keysLoadingSpinner.classList.add('d-none');
      }
      
      // Mostrar mensagem de erro
      showAlert('Erro ao carregar suas chaves de API. Tente novamente mais tarde.', 'danger');
    }
  }
  
  /**
   * Renderiza a lista de chaves de API na tabela
   */
  function renderApiKeys(keys) {
    if (!apiKeysList) return;
    
    // Limpar conteúdo atual
    apiKeysList.innerHTML = '';
    
    // Verificar se há chaves para exibir
    if (!keys || keys.length === 0) {
      if (noKeysMessage) {
        noKeysMessage.classList.remove('d-none');
      }
      return;
    }
    
    // Esconder mensagem de "nenhuma chave"
    if (noKeysMessage) {
      noKeysMessage.classList.add('d-none');
    }
    
    // Renderizar cada chave
    keys.forEach(key => {
      const row = document.createElement('tr');
      
      // Formatar datas
      const createdAt = new Date(key.createdAt).toLocaleString();
      const expiresAt = new Date(key.expiresAt).toLocaleString();
      
      // Determinar status
      const isExpired = new Date(key.expiresAt) < new Date();
      let statusBadge = '';
      
      if (!key.isActive) {
        statusBadge = '<span class="badge bg-danger">Revogada</span>';
      } else if (isExpired) {
        statusBadge = '<span class="badge bg-warning text-dark">Expirada</span>';
      } else {
        statusBadge = '<span class="badge bg-success">Ativa</span>';
      }
      
      // Último uso
      let lastUsed = 'Nunca utilizada';
      if (key.lastUsed) {
        lastUsed = new Date(key.lastUsed).toLocaleString();
      }
      
      // Montar HTML da linha
      row.innerHTML = `
        <td>
          <div class="d-flex align-items-center">
            <div class="me-2">
              <i class="fas fa-key text-primary"></i>
            </div>
            <div>
              <span class="fw-bolder">${escapeHtml(key.name)}</span>
            </div>
          </div>
        </td>
        <td><code class="small">${key.prefix}</code></td>
        <td><span class="text-muted">${createdAt}</span></td>
        <td><span class="text-muted">${expiresAt}</span></td>
        <td><span class="text-muted">${lastUsed}</span></td>
        <td>${statusBadge}</td>
        <td class="text-end">
          ${key.isActive && !isExpired ? `
            <button class="btn btn-sm btn-outline-secondary edit-key-btn" 
                    data-key-id="${key.id}" 
                    data-key-name="${escapeHtml(key.name)}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger revoke-key-btn" 
                    data-key-id="${key.id}" 
                    data-key-name="${escapeHtml(key.name)}"
                    data-key-prefix="${key.prefix}">
              <i class="fas fa-ban"></i>
            </button>
          ` : ''}
        </td>
      `;
      
      // Adicionar à tabela
      apiKeysList.appendChild(row);
    });
    
    // Adicionar eventos aos botões de ação
    document.querySelectorAll('.revoke-key-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const keyId = this.getAttribute('data-key-id');
        const keyName = this.getAttribute('data-key-name');
        const keyPrefix = this.getAttribute('data-key-prefix');
        
        // Armazenar informações da chave selecionada
        selectedKeyId = keyId;
        selectedKeyName = keyName;
        selectedKeyPrefix = keyPrefix;
        
        // Preencher informações no modal
        document.getElementById('revokeKeyName').textContent = keyName;
        document.getElementById('revokeKeyPrefix').textContent = keyPrefix;
        
        // Mostrar modal
        revokeModal.show();
      });
    });
    
    document.querySelectorAll('.edit-key-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const keyId = this.getAttribute('data-key-id');
        const keyName = this.getAttribute('data-key-name');
        
        // Armazenar informações da chave selecionada
        selectedKeyId = keyId;
        selectedKeyName = keyName;
        
        // Preencher campo do formulário
        editKeyNameInput.value = keyName;
        
        // Mostrar modal
        editModal.show();
      });
    });
  }
  
  /**
   * Cria uma nova chave de API
   */
  async function createApiKey() {
    try {
      // Obter dados do formulário
      const name = document.getElementById('apiKeyName').value.trim();
      const expiresInDays = document.getElementById('apiKeyExpiry').value;
      
      // Validações básicas
      if (!name) {
        showAlert('Nome da chave é obrigatório', 'warning');
        return;
      }
      
      // Mostrar indicador de carregamento
      createKeySpinner.classList.remove('d-none');
      submitApiKeyBtn.disabled = true;
      
      // Fazer requisição à API
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          expiresInDays: parseInt(expiresInDays, 10)
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Erro ao criar chave de API');
      }
      
      // Esconder modal
      createModal.hide();
      
      // Limpar formulário
      createApiKeyForm.reset();
      
      // Mostrar informações da nova chave
      showNewKeyInfo(result.data);
      
      // Recarregar lista de chaves
      loadApiKeys();
      
      // Mostrar mensagem de sucesso
      showAlert('Chave de API criada com sucesso!', 'success');
      
    } catch (error) {
      console.error('Erro ao criar chave de API:', error);
      showAlert(error.message || 'Erro ao criar chave de API. Tente novamente.', 'danger');
    } finally {
      // Esconder indicador de carregamento
      createKeySpinner.classList.add('d-none');
      submitApiKeyBtn.disabled = false;
    }
  }
  
  /**
   * Revoga (desativa) uma chave de API
   */
  async function revokeApiKey() {
    try {
      if (!selectedKeyId) {
        throw new Error('Nenhuma chave selecionada');
      }
      
      // Mostrar indicador de carregamento
      revokeKeySpinner.classList.remove('d-none');
      confirmRevokeBtn.disabled = true;
      
      // Fazer requisição à API
      const response = await fetch(`/api/user/api-keys/${selectedKeyId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Erro ao revogar chave de API');
      }
      
      // Esconder modal
      revokeModal.hide();
      
      // Recarregar lista de chaves
      loadApiKeys();
      
      // Mostrar mensagem de sucesso
      showAlert('Chave de API revogada com sucesso!', 'success');
      
    } catch (error) {
      console.error('Erro ao revogar chave de API:', error);
      showAlert(error.message || 'Erro ao revogar chave de API. Tente novamente.', 'danger');
    } finally {
      // Esconder indicador de carregamento
      revokeKeySpinner.classList.add('d-none');
      confirmRevokeBtn.disabled = false;
      
      // Limpar seleção
      selectedKeyId = null;
      selectedKeyName = null;
      selectedKeyPrefix = null;
    }
  }
  
  /**
   * Atualiza o nome de uma chave de API
   */
  async function updateKeyName() {
    try {
      if (!selectedKeyId) {
        throw new Error('Nenhuma chave selecionada');
      }
      
      const newName = editKeyNameInput.value.trim();
      
      if (!newName) {
        showAlert('Nome da chave é obrigatório', 'warning');
        return;
      }
      
      // Mostrar indicador de carregamento
      editKeyNameSpinner.classList.remove('d-none');
      saveKeyNameBtn.disabled = true;
      
      // Fazer requisição à API
      const response = await fetch(`/api/user/api-keys/${selectedKeyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newName
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Erro ao atualizar nome da chave');
      }
      
      // Esconder modal
      editModal.hide();
      
      // Recarregar lista de chaves
      loadApiKeys();
      
      // Mostrar mensagem de sucesso
      showAlert('Nome da chave atualizado com sucesso!', 'success');
      
    } catch (error) {
      console.error('Erro ao atualizar nome da chave:', error);
      showAlert(error.message || 'Erro ao atualizar nome da chave. Tente novamente.', 'danger');
    } finally {
      // Esconder indicador de carregamento
      editKeyNameSpinner.classList.add('d-none');
      saveKeyNameBtn.disabled = false;
      
      // Limpar seleção
      selectedKeyId = null;
      selectedKeyName = null;
    }
  }
  
  /**
   * Exibe as informações de uma nova chave criada
   */
  function showNewKeyInfo(keyData) {
    if (!newKeyContainer || !keyData) return;
    
    // Preencher informações
    document.getElementById('newKeyName').textContent = keyData.name;
    document.getElementById('newKeyValue').value = keyData.key;
    document.getElementById('newKeyExpiry').textContent = new Date(keyData.expiresAt).toLocaleString();
    
    // Mostrar container
    newKeyContainer.classList.remove('d-none');
    
    // Scroll para a mensagem
    newKeyContainer.scrollIntoView({ behavior: 'smooth' });
  }
  
  /**
   * Exibe uma mensagem de alerta na página
   */
  function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;
    
    // Criar elemento de alerta
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    
    // Adicionar ao container
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    // Auto-destruir após 5 segundos
    setTimeout(() => {
      if (alert.parentNode === alertContainer) {
        alert.classList.remove('show');
        setTimeout(() => {
          if (alert.parentNode === alertContainer) {
            alertContainer.removeChild(alert);
          }
        }, 250);
      }
    }, 5000);
  }
  
  /**
   * Escapa caracteres HTML para evitar XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}); 