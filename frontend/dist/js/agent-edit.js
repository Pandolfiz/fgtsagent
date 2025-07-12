/**
 * Scripts para edição de agentes
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elementos da página
    const agentForm = document.getElementById('editAgentForm');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const saveBtn = document.getElementById('saveChangesBtn');
    const backBtn = document.getElementById('backToAgentBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const templateConfigFields = document.getElementById('templateConfigFields');
    const configLoadingIndicator = document.getElementById('configLoadingIndicator');
    const templateDescription = document.getElementById('templateDescription');
    
    // Obter o ID do agente da URL
    const urlParts = window.location.pathname.split('/');
    const agentId = urlParts[urlParts.length - 2];
    
    // Variáveis para armazenar dados
    let agentData = null;
    let templateData = null;
    
    // Inicializar página
    initialize();
    
    /**
     * Inicializa a página de edição
     */
    async function initialize() {
        try {
            console.log(`Inicializando página de edição para agente ID: ${agentId}`);
            
            // Configurar botões de navegação
            if (backBtn) {
                backBtn.href = `/agents/${agentId}`;
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    window.location.href = `/agents/${agentId}`;
                });
            }
            
            if (saveBtn) {
                saveBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (agentForm) {
                        agentForm.dispatchEvent(new Event('submit'));
                    }
                });
            }
            
            // Carregar dados do agente
            await loadAgentData();
            
            // Configurar eventos do formulário
            if (agentForm) {
                agentForm.addEventListener('submit', handleFormSubmit);
            }
            
            // Atualizar descrição visual
            updateAgentDescription();
            
        } catch (error) {
            console.error('Erro ao inicializar página:', error);
            showNotification('Erro ao carregar dados do agente', 'error');
        }
    }
    
    /**
     * Carrega os dados do agente
     */
    async function loadAgentData() {
        try {
            // Mostrar spinner de carregamento
            if (loadingSpinner) {
                loadingSpinner.classList.remove('d-none');
            }
            
            if (agentForm) {
                agentForm.classList.add('d-none');
            }
            
            console.log(`Carregando dados do agente ID: ${agentId}`);
            
            // Obter token de autenticação
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            
            // Função para enviar a requisição
            const fetchAgentData = async (tokenToUse) => {
                console.log('Enviando requisição para obter dados do agente...');
                const response = await fetch(`/api/agents/${agentId}`, {
                    headers: {
                        'Authorization': 'Bearer ' + tokenToUse
                    }
                });
                
                // Verificar o status da resposta
                if (response.status === 401 || response.status === 403) {
                    console.warn(`Recebido status ${response.status}, possível problema de autenticação`);
                    throw new Error('Erro de autenticação');
                }
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Erro HTTP ao carregar dados do agente: ${response.status} ${response.statusText}`, errorText);
                    throw new Error(`Erro ao carregar dados do agente: ${response.status} ${response.statusText}`);
                }
                
                return response;
            };
            
            // Primeira tentativa com o token atual
            let result;
            try {
                console.log('Tentando carregar dados com o token atual...');
                const response = await fetchAgentData(token);
                result = await response.json();
                
            } catch (firstError) {
                console.warn('Primeira tentativa falhou:', firstError);
                
                // Se a primeira tentativa falhou com erro de autenticação, tentar renovar o token
                if (firstError.message === 'Erro de autenticação') {
                    try {
                        console.log('Tentando renovar token...');
                        // Solicitar novo token
                        const refreshResponse = await fetch('/api/auth/refresh-token', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + token
                            }
                        });
                        
                        if (!refreshResponse.ok) {
                            console.error('Falha ao renovar token:', refreshResponse.status);
                            throw new Error('Falha ao renovar token de autenticação');
                        }
                        
                        const refreshData = await refreshResponse.json();
                        
                        if (refreshData.status === 'success' && refreshData.data?.token) {
                            const newToken = refreshData.data.token;
                            console.log('Token renovado com sucesso, atualizando armazenamento...');
                            
                            // Atualizar token no armazenamento
                            if (localStorage.getItem('authToken')) {
                                localStorage.setItem('authToken', newToken);
                            } else {
                                sessionStorage.setItem('authToken', newToken);
                            }
                            
                            // Tentar novamente com o novo token
                            console.log('Tentando novamente com o novo token...');
                            const secondResponse = await fetchAgentData(newToken);
                            result = await secondResponse.json();
                        } else {
                            throw new Error('Falha ao renovar token');
                        }
                        
                    } catch (refreshError) {
                        console.error('Erro na renovação de token:', refreshError);
                        
                        // Se falhou ao renovar, mostrar erro de sessão expirada
                        if (loadingSpinner) {
                            loadingSpinner.innerHTML = `
                                <div class="alert alert-danger">
                                    <i class="fas fa-exclamation-triangle me-2"></i>
                                    Sua sessão expirou. Por favor faça login novamente.
                                </div>
                                <div class="mt-3">
                                    <a href="/auth/login?redirect=${encodeURIComponent(window.location.pathname)}" class="btn btn-primary">
                                        <i class="fas fa-sign-in-alt me-2"></i>Fazer Login
                                    </a>
                                </div>
                            `;
                        }
                        
                        throw new Error('Sessão expirada. Por favor faça login novamente.');
                    }
                } else {
                    // Se não for erro de autenticação, manter o erro original
                    throw firstError;
                }
            }
            
            console.log('Resposta API agente:', result);
            
            if (!result.success || !result.data) {
                throw new Error(result.message || 'Dados do agente não encontrados');
            }
            
            // Armazenar dados do agente
            agentData = result.data;
            
            // Preencher formulário
            populateForm();
            
            // Carregar dados do template
            if (agentData.template_id) {
                await loadTemplateData(agentData.template_id);
            } else {
                console.warn('Template ID não encontrado, pulando carregamento de template');
            }
            
            // Esconder spinner e mostrar formulário
            if (loadingSpinner) {
                loadingSpinner.classList.add('d-none');
            }
            
            if (agentForm) {
                agentForm.classList.remove('d-none');
            }
            
        } catch (error) {
            console.error('Erro ao carregar dados do agente:', error);
            
            if (loadingSpinner) {
                loadingSpinner.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        ${error.message || 'Erro ao carregar dados do agente'}
                    </div>
                    <div class="mt-3">
                        <p class="text-muted mb-3">Possíveis causas do erro:</p>
                        <ul class="text-muted">
                            <li>O agente pode não existir ou foi removido</li>
                            <li>Você pode não ter permissão para acessar este agente</li>
                            <li>Sua sessão pode ter expirado</li>
                            <li>Pode haver um problema no servidor</li>
                        </ul>
                    </div>
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <button class="btn btn-primary w-100" onclick="window.location.href='/agents'">
                                <i class="fas fa-arrow-left me-2"></i>Voltar para Agentes
                            </button>
                        </div>
                    </div>
                `;
            }
            
            showNotification('Erro ao carregar dados do agente', 'error');
        }
    }
    
    /**
     * Preenche o formulário com os dados do agente
     */
    function populateForm() {
        if (!agentData || !agentForm) return;
        
        // Preencher campos básicos
        const idField = document.getElementById('agentId');
        const nameField = document.getElementById('agentName');
        const descriptionField = document.getElementById('agentDescription');
        const orgField = document.getElementById('agentOrganization');
        const activeField = document.getElementById('agentActive');
        const publicField = document.getElementById('agentPublic');
        const collectDataField = document.getElementById('agentCollectData');
        const templateField = document.getElementById('agentTemplate');
        
        if (idField) idField.value = agentData.id;
        if (nameField) nameField.value = agentData.name;
        if (descriptionField) descriptionField.value = agentData.description || '';
        
        // Preencher organização (desativado, apenas informativo)
        if (orgField) {
            const option = document.createElement('option');
            option.value = agentData.organization_id;
            option.textContent = agentData.organization?.name || 'Organização';
            orgField.innerHTML = '';
            orgField.appendChild(option);
        }
        
        // Preencher campo de template (desativado, apenas informativo)
        if (templateField) {
            templateField.value = agentData.template?.name || 'Template customizado';
        }
        
        // Preencher switches
        if (activeField) activeField.checked = agentData.is_active === true;
        if (publicField) publicField.checked = agentData.is_public === true;
        if (collectDataField) collectDataField.checked = agentData.collect_data === true;
    }
    
    /**
     * Carrega dados do template
     */
    async function loadTemplateData(templateId) {
        try {
            if (!templateId) {
                console.warn('ID do template não fornecido');
                return;
            }
            
            console.log(`Carregando dados do template ID: ${templateId}`);
            
            // Mostrar indicador de carregamento
            if (configLoadingIndicator) {
                configLoadingIndicator.classList.remove('d-none');
            }
            
            // Obter token de autenticação
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            
            // Função para enviar a requisição
            const fetchTemplateData = async (tokenToUse) => {
                console.log('Enviando requisição para obter dados do template...');
                const response = await fetch(`/api/agents/templates/${templateId}/subworkflows`, {
                    headers: {
                        'Authorization': 'Bearer ' + tokenToUse
                    }
                });
                
                // Verificar o status da resposta
                if (response.status === 401 || response.status === 403) {
                    console.warn(`Recebido status ${response.status}, possível problema de autenticação`);
                    throw new Error('Erro de autenticação');
                }
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Erro HTTP ao carregar dados do template: ${response.status} ${response.statusText}`, errorText);
                    throw new Error(`Erro ao carregar dados do template: ${response.status}`);
                }
                
                return response;
            };
            
            // Primeira tentativa com o token atual
            let result;
            try {
                console.log('Tentando carregar dados do template com o token atual...');
                const response = await fetchTemplateData(token);
                result = await response.json();
                
            } catch (firstError) {
                console.warn('Primeira tentativa de carregar template falhou:', firstError);
                
                // Se a primeira tentativa falhou com erro de autenticação, tentar renovar o token
                if (firstError.message === 'Erro de autenticação') {
                    try {
                        console.log('Tentando renovar token para carregamento de template...');
                        // Solicitar novo token
                        const refreshResponse = await fetch('/api/auth/refresh-token', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + token
                            }
                        });
                        
                        if (!refreshResponse.ok) {
                            console.error('Falha ao renovar token para template:', refreshResponse.status);
                            throw new Error('Falha ao renovar token de autenticação');
                        }
                        
                        const refreshData = await refreshResponse.json();
                        
                        if (refreshData.status === 'success' && refreshData.data?.token) {
                            const newToken = refreshData.data.token;
                            console.log('Token renovado com sucesso, atualizando armazenamento...');
                            
                            // Atualizar token no armazenamento
                            if (localStorage.getItem('authToken')) {
                                localStorage.setItem('authToken', newToken);
                            } else {
                                sessionStorage.setItem('authToken', newToken);
                            }
                            
                            // Tentar novamente com o novo token
                            console.log('Tentando novamente carregar template com o novo token...');
                            const secondResponse = await fetchTemplateData(newToken);
                            result = await secondResponse.json();
                        } else {
                            throw new Error('Falha ao renovar token');
                        }
                        
                    } catch (refreshError) {
                        console.error('Erro na renovação de token para template:', refreshError);
                        
                        // Para erros de token no template, apenas registrar e continuar
                        // Uma vez que podemos ter dados parciais do template
                        if (configLoadingIndicator) {
                            configLoadingIndicator.innerHTML = `
                                <div class="text-center">
                                    <i class="fas fa-exclamation-triangle text-warning"></i>
                                    <span class="ms-2 text-muted">Erro de autenticação ao carregar configurações</span>
                                </div>
                            `;
                        }
                        
                        throw new Error('Erro de autenticação ao carregar configurações do template');
                    }
                } else {
                    // Se não for erro de autenticação, manter o erro original
                    throw firstError;
                }
            }
            
            console.log('Resposta API template:', result);
            
            if (!result.success) {
                throw new Error(result.message || 'Dados do template não encontrados');
            }
            
            // Armazenar dados do template
            templateData = result.data;
            
            // Verificar se o template tem os dados esperados
            if (!templateData || !templateData.name) {
                console.warn('Template carregado não contém dados válidos:', templateData);
            }
            
            // Preencher descrição do template
            if (templateDescription) {
                templateDescription.textContent = templateData.description || 'Não há descrição disponível para este template.';
            }
            
            // Preencher título do template
            const templateTitle = document.getElementById('templateTitle');
            if (templateTitle) {
                templateTitle.textContent = templateData.name || 'Informações do Template';
            }
            
            // Esconder indicador de carregamento
            if (configLoadingIndicator) {
                configLoadingIndicator.classList.add('d-none');
            }
            
            // Renderizar campos de configuração do template
            renderTemplateConfigFields();
            
        } catch (error) {
            console.error('Erro ao carregar dados do template:', error);
            
            if (configLoadingIndicator) {
                configLoadingIndicator.innerHTML = `
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle text-warning"></i>
                        <span class="ms-2 text-muted">Não foi possível carregar as configurações do template: ${error.message}</span>
                    </div>
                `;
            }
            
            // Ainda assim, tente preencher os campos de configuração se houver dados parciais
            if (templateData && templateData.variables) {
                console.warn('Tentando renderizar com dados parciais do template');
                renderTemplateConfigFields();
            }
        }
    }
    
    /**
     * Renderiza os campos de configuração do template
     */
    function renderTemplateConfigFields() {
        try {
            if (!templateData || !templateConfigFields) {
                console.warn('Dados do template ou elemento de campos não encontrados.');
                return;
            }
            
            // Limpar campos existentes
            templateConfigFields.innerHTML = '';
            
            // Verificar se há parâmetros de configuração
            if (!templateData.variables || !Array.isArray(templateData.variables) || templateData.variables.length === 0) {
                templateConfigFields.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-info">
                            Este template não possui parâmetros configuráveis.
                        </div>
                    </div>
                `;
                return;
            }
            
            // Criar campos para cada variável do template
            templateData.variables.forEach(variable => {
                if (!variable || !variable.name) {
                    console.warn('Variável de template inválida encontrada, pulando...');
                    return; // Pula variáveis inválidas
                }
                
                // Criar coluna
                const col = document.createElement('div');
                col.className = 'col-md-6 mb-3';
                
                // Determinar o tipo de entrada com base no tipo da variável
                let inputHtml;
                const configValue = agentData && agentData.config ? agentData.config[variable.name] : undefined;
                const value = configValue !== undefined ? configValue : (variable.default || '');
                
                if (variable.type === 'boolean') {
                    // Campo de switch para booleanos
                    inputHtml = `
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" 
                                id="var_${variable.name}" 
                                name="config[${variable.name}]" 
                                ${value === true || value === 'true' ? 'checked' : ''}>
                            <label class="form-check-label" for="var_${variable.name}">
                                ${variable.label || variable.name}
                            </label>
                        </div>
                    `;
                } else if (variable.type === 'select' && Array.isArray(variable.options)) {
                    // Campo de seleção para opções predefinidas
                    let options = '';
                    variable.options.forEach(option => {
                        if (option && option.value !== undefined) {
                            options += `<option value="${option.value}" ${value === option.value ? 'selected' : ''}>${option.label || option.value}</option>`;
                        }
                    });
                    
                    inputHtml = `
                        <label for="var_${variable.name}" class="form-label">
                            ${variable.label || variable.name}
                        </label>
                        <select class="form-select" id="var_${variable.name}" name="config[${variable.name}]">
                            ${options}
                        </select>
                    `;
                } else if (variable.type === 'textarea') {
                    // Campo de texto multilinha
                    inputHtml = `
                        <label for="var_${variable.name}" class="form-label">
                            ${variable.label || variable.name}
                        </label>
                        <textarea class="form-control" id="var_${variable.name}" 
                            name="config[${variable.name}]" rows="3">${value}</textarea>
                    `;
                } else {
                    // Campo de texto padrão
                    inputHtml = `
                        <label for="var_${variable.name}" class="form-label">
                            ${variable.label || variable.name}
                        </label>
                        <input type="${variable.type === 'number' ? 'number' : 'text'}" 
                            class="form-control" id="var_${variable.name}" 
                            name="config[${variable.name}]" 
                            value="${value}">
                    `;
                }
                
                // Adicionar descrição se houver
                if (variable.description) {
                    inputHtml += `<div class="form-text">${variable.description}</div>`;
                }
                
                // Adicionar HTML ao elemento da coluna
                col.innerHTML = inputHtml;
                
                // Adicionar coluna ao contenedor
                templateConfigFields.appendChild(col);
            });
        } catch (error) {
            console.error('Erro ao renderizar campos do template:', error);
            if (templateConfigFields) {
                templateConfigFields.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Erro ao carregar os campos de configuração do template. Por favor, recarregue a página.
                        </div>
                    </div>
                `;
            }
        }
    }
    
    /**
     * Atualiza a descrição visual do agente
     */
    function updateAgentDescription() {
        try {
            const descElement = document.getElementById('agentDescription');
            
            if (!descElement || !agentData) return;
            
            // Verificar se o template existe antes de acessar suas propriedades
            const templateName = agentData.template && agentData.template.name ? agentData.template.name : 'Template customizado';
            
            // Atualizar descrição com nome do agente
            descElement.textContent = `${agentData.name || 'Agente'} - ${templateName}`;
        } catch (error) {
            console.error('Erro ao atualizar descrição do agente:', error);
            const descElement = document.getElementById('agentDescription');
            if (descElement) {
                descElement.textContent = 'Erro ao carregar informações do agente';
            }
        }
    }
    
    /**
     * Manipula o envio do formulário
     */
    async function handleFormSubmit(event) {
        try {
            event.preventDefault();
            
            // Desabilitar botão de envio
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Salvando...';
            }
            
            // Coletar dados do formulário
            const formData = new FormData(agentForm);
            const updates = {};
            
            // Extrair campos básicos
            updates.name = formData.get('name');
            updates.description = formData.get('description');
            updates.is_active = formData.get('is_active') === 'on';
            updates.is_public = formData.get('is_public') === 'on';
            updates.collect_data = formData.get('collect_data') === 'on';
            
            // Extrair configurações do template
            updates.config = {};
            
            if (templateData && templateData.variables) {
                templateData.variables.forEach(variable => {
                    const fieldName = `config[${variable.name}]`;
                    
                    if (variable.type === 'boolean') {
                        // Para checkboxes, verificar se está marcado
                        updates.config[variable.name] = formData.get(fieldName) === 'on';
                    } else {
                        // Para outros campos, obter o valor diretamente
                        updates.config[variable.name] = formData.get(fieldName);
                    }
                });
            }

            // Obter token de autenticação
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            
            // Função para enviar a requisição
            const sendUpdateRequest = async (tokenToUse) => {
                console.log('Enviando atualização do agente para o servidor...');
                const response = await fetch(`/api/agents/${agentId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + tokenToUse
                    },
                    body: JSON.stringify(updates)
                });
                
                // Verificar o status da resposta
                if (response.status === 401 || response.status === 403) {
                    console.warn(`Recebido status ${response.status}, possível problema de autenticação`);
                    throw new Error('Erro de autenticação');
                }

                return response;
            };
            
            // Primeira tentativa com o token atual
            try {
                console.log('Tentando com o token atual...');
                const response = await sendUpdateRequest(token);
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.message || 'Erro ao atualizar agente');
                }
                
                // Atualizar dados locais com os dados retornados
                agentData = result.data;
                
                // Redirecionar para a página de detalhes ou mostrar mensagem de sucesso
                showNotification('Agente atualizado com sucesso', 'success', function() {
                    window.location.href = `/agents/${agentId}`;
                });
                
            } catch (firstError) {
                console.warn('Primeira tentativa falhou:', firstError);
                
                // Se a primeira tentativa falhou com erro de autenticação, tentar renovar o token
                if (firstError.message === 'Erro de autenticação') {
                    try {
                        console.log('Tentando renovar token...');
                        // Solicitar novo token
                        const refreshResponse = await fetch('/api/auth/refresh-token', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + token
                            }
                        });
                        
                        if (!refreshResponse.ok) {
                            console.error('Falha ao renovar token:', refreshResponse.status);
                            throw new Error('Falha ao renovar token de autenticação');
                        }
                        
                        const refreshData = await refreshResponse.json();
                        
                        if (refreshData.status === 'success' && refreshData.data?.token) {
                            const newToken = refreshData.data.token;
                            console.log('Token renovado com sucesso, atualizando armazenamento...');
                            
                            // Atualizar token no armazenamento
                            if (localStorage.getItem('authToken')) {
                                localStorage.setItem('authToken', newToken);
                            } else {
                                sessionStorage.setItem('authToken', newToken);
                            }
                            
                            // Tentar novamente com o novo token
                            console.log('Tentando novamente com o novo token...');
                            const secondResponse = await sendUpdateRequest(newToken);
                            const secondResult = await secondResponse.json();
                            
                            if (!secondResult.success) {
                                throw new Error(secondResult.message || 'Erro ao atualizar agente');
                            }
                            
                            // Atualizar dados locais com os dados retornados
                            agentData = secondResult.data;
                            
                            // Redirecionar para a página de detalhes ou mostrar mensagem de sucesso
                            showNotification('Agente atualizado com sucesso', 'success', function() {
                                window.location.href = `/agents/${agentId}`;
                            });
                            
                            return; // Sair da função após sucesso
                        }
                        
                        throw new Error('Falha ao renovar token');
                        
                    } catch (refreshError) {
                        console.error('Erro na renovação de token:', refreshError);
                        
                        // Se falhou ao renovar, redirecionar para login
                        showNotification('Sua sessão expirou. Redirecionando para a página de login...', 'error', function() {
                            window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
                        });
                        
                        return; // Sair da função
                    }
                }
                
                // Se não for erro de autenticação ou falhou após a renovação, mostrar o erro original
                throw firstError;
            }
        } catch (error) {
            console.error('Erro ao salvar agente:', error);
            showNotification(error.message || 'Erro ao salvar alterações', 'error');
        } finally {
            // Reativar botão de envio
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Salvar Alterações';
            }
        }
    }
    
    /**
     * Exibe uma notificação ao usuário
     */
    function showNotification(message, type = 'info', callback) {
        // Verificar se o Toastr está disponível
        if (typeof toastr !== 'undefined') {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                positionClass: 'toast-top-right',
                timeOut: 5000
            };
            
            if (type === 'success') {
                toastr.success(message);
            } else if (type === 'error') {
                toastr.error(message);
            } else if (type === 'warning') {
                toastr.warning(message);
            } else {
                toastr.info(message);
            }
            
            if (callback && typeof callback === 'function') {
                setTimeout(callback, 1000);
            }
            
            return;
        }
        
        // Fallback para alert
        alert(message);
        
        if (callback && typeof callback === 'function') {
            callback();
        }
    }
}); 