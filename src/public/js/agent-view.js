/**
 * Scripts para visualização de detalhes do agente
 */

document.addEventListener('DOMContentLoaded', function() {
    // Obter ID do agente da URL
    const urlParts = window.location.pathname.split('/');
    const agentId = urlParts[urlParts.length - 1];
    
    // Verificar acesso ao agente (diagnóstico)
    checkAgentAccess(agentId);
    
    // Botões de ação
    const editAgentBtn = document.getElementById('editAgentBtn');
    const deleteAgentBtn = document.getElementById('deleteAgentBtn');
    const toggleAgentStatusBtn = document.getElementById('toggleAgentStatusBtn');
    const runDiagnosticBtn = document.getElementById('runDiagnosticBtn');
    
    // Configurar botão de edição para apontar para o caminho correto
    if (editAgentBtn) {
        // Remover a linha que configura o href pois agora está no HTML
        // editAgentBtn.href = `/agents/${agentId}/edit`;
        // console.log('Configurado botão de edição para:', editAgentBtn.href);
        
        // Adicionar handler para diagnóstico em caso de clique no botão
        editAgentBtn.addEventListener('click', function(e) {
            // Se o usuário pressionar Shift+Clique, executar diagnóstico antes de navegar
            if (e.shiftKey) {
                e.preventDefault();
                runDiagnostic(agentId).then(() => {
                    // Após diagnóstico, redirecionar
                    window.location.href = `/agents/${agentId}/edit`;
                });
            }
        });
    }
    
    // Configurar botão de deletar
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const deleteAgentName = document.getElementById('deleteAgentName');
    
    if (deleteAgentBtn) {
        deleteAgentBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Obter o nome do agente para mostrar no modal
            const agentName = document.getElementById('agentName').textContent;
            if (deleteAgentName) {
                deleteAgentName.textContent = agentName;
            }
            
            // Mostrar modal de confirmação
            const modal = new bootstrap.Modal(deleteConfirmModal);
            modal.show();
        });
    }
    
    // Configurar botão de confirmar exclusão
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async function() {
            try {
                // Desabilitar botão durante a requisição
                confirmDeleteBtn.disabled = true;
                confirmDeleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Excluindo...';
                
                // Enviar requisição para excluir o agente
                const response = await fetch(`/api/agents/${agentId}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.message || 'Erro ao excluir agente');
                }
                
                // Redirecionar para a página de listagem após a exclusão
                window.location.href = '/agents';
                
            } catch (error) {
                console.error('Erro ao excluir agente:', error);
                
                // Mostrar mensagem de erro
                alert(`Erro ao excluir agente: ${error.message}`);
                
                // Reativar botão
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.innerHTML = '<i class="fas fa-trash-alt me-2"></i>Excluir Permanentemente';
            }
        });
    }
    
    // Configurar botão de alternar status
    const toggleStatusText = document.getElementById('toggleStatusText');
    
    if (toggleAgentStatusBtn) {
        toggleAgentStatusBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            try {
                // Obter status atual
                const statusBadge = document.getElementById('agentStatus').querySelector('.badge');
                const isActive = statusBadge.classList.contains('bg-success');
                
                // Alterar texto do botão durante a requisição
                const originalText = toggleStatusText.textContent;
                toggleStatusText.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processando...';
                toggleAgentStatusBtn.classList.add('disabled');
                
                // Enviar requisição para alterar o status
                const response = await fetch(`/api/agents/${agentId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        is_active: !isActive
                    })
                });
                
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.message || 'Erro ao alterar status do agente');
                }
                
                // Atualizar interface com o novo status
                if (isActive) {
                    // Atualizar para inativo
                    statusBadge.textContent = 'Inativo';
                    statusBadge.classList.remove('bg-success');
                    statusBadge.classList.add('bg-secondary');
                    toggleStatusText.textContent = 'Ativar';
                } else {
                    // Atualizar para ativo
                    statusBadge.textContent = 'Ativo';
                    statusBadge.classList.remove('bg-secondary');
                    statusBadge.classList.add('bg-success');
                    toggleStatusText.textContent = 'Desativar';
                }
                
                // Mostrar mensagem de sucesso
                if (typeof toastr !== 'undefined') {
                    toastr.success('Status do agente atualizado com sucesso');
                } else {
                    alert('Status do agente atualizado com sucesso');
                }
                
            } catch (error) {
                console.error('Erro ao alterar status do agente:', error);
                
                // Mostrar mensagem de erro
                if (typeof toastr !== 'undefined') {
                    toastr.error(`Erro ao alterar status: ${error.message}`);
                } else {
                    alert(`Erro ao alterar status: ${error.message}`);
                }
                
                // Restaurar texto original
                toggleStatusText.textContent = originalText;
            } finally {
                toggleAgentStatusBtn.classList.remove('disabled');
            }
        });
    }

    // Configura botão de diagnóstico se existir
    if (runDiagnosticBtn) {
        runDiagnosticBtn.addEventListener('click', runDiagnostic);
    }
});

/**
 * Verifica o acesso do usuário ao agente
 * @param {string} agentId - ID do agente
 */
async function checkAgentAccess(agentId) {
    try {
        console.log('Verificando acesso ao agente:', agentId);
        
        // Verificação em background apenas para logs
        const response = await fetch(`/api/agents/${agentId}`);
        
        if (!response.ok) {
            console.error(`Erro ao verificar acesso ao agente: ${response.status} ${response.statusText}`);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        return false;
    }
}

/**
 * Executa diagnóstico completo e exibe resultados
 * @param {string} agentId - ID do agente
 */
async function runDiagnostic(agentId) {
    try {
        console.log('Executando diagnóstico completo...');
        
        // Criar/exibir área de diagnóstico
        let diagArea = document.getElementById('diagnosticArea');
        
        if (!diagArea) {
            diagArea = document.createElement('div');
            diagArea.id = 'diagnosticArea';
            diagArea.className = 'card border-warning my-4';
            diagArea.innerHTML = `
                <div class="card-header bg-warning text-white">
                    <h5 class="mb-0"><i class="fas fa-stethoscope me-2"></i>Diagnóstico de Sistema</h5>
                </div>
                <div class="card-body">
                    <p class="text-muted">Executando verificações...</p>
                    <div class="progress mb-3">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 100%"></div>
                    </div>
                    <div id="diagnosticResults"></div>
                </div>
            `;
            
            const container = document.querySelector('.container');
            if (container) {
                container.appendChild(diagArea);
            } else {
                document.body.appendChild(diagArea);
            }
        } else {
            // Resetar área de diagnóstico
            diagArea.querySelector('#diagnosticResults').innerHTML = '';
            diagArea.querySelector('.card-body > p').textContent = 'Executando verificações...';
            diagArea.querySelector('.progress').style.display = 'block';
        }
        
        const results = document.getElementById('diagnosticResults');
        
        // 1. Verificar conexão
        results.innerHTML += `<h6 class="mt-3">1. Verificando conexão com o servidor...</h6>`;
        const connResponse = await fetch('/api/diagnostics/connection');
        const connData = await connResponse.json();
        
        let connStatus = `
            <div class="alert ${connData.success ? 'alert-success' : 'alert-danger'}">
                <strong>Status de conexão:</strong> ${connData.success ? 'OK' : 'Falha'}
                <ul class="mb-0 mt-2">
                    <li>Supabase: ${connData.connectionStatus?.supabase ? '✅ Conectado' : '❌ Falha'}</li>
                    <li>Autenticação: ${connData.authStatus?.authenticated ? '✅ Autenticado' : '❌ Não autenticado'}</li>
                    <li>Organizações: ${connData.organizationStatus?.count || 0} encontradas</li>
                </ul>
            </div>
        `;
        results.innerHTML += connStatus;
        
        // 2. Verificar acesso ao agente
        results.innerHTML += `<h6 class="mt-3">2. Verificando acesso ao agente...</h6>`;
        const accessResponse = await fetch(`/api/diagnostics/agent-access/${agentId}`);
        const accessData = await accessResponse.json();
        
        let accessStatus = `
            <div class="alert ${accessData.access ? 'alert-success' : 'alert-danger'}">
                <strong>Status de acesso:</strong> ${accessData.message}
                <ul class="mb-0 mt-2">
                    <li>Agente ID: ${agentId}</li>
                    <li>Agente existe: ${accessData.exists ? '✅ Sim' : '❌ Não'}</li>
                    ${accessData.exists ? `<li>Organização do agente: ${accessData.diagnostic?.agentOrg || 'N/A'}</li>` : ''}
                    <li>Método usado: ${accessData.diagnostic?.method || 'N/A'}</li>
                </ul>
                ${accessData.exists && !accessData.access ? `
                <div class="mt-2">
                    <strong>Organizações do usuário:</strong>
                    <code>${JSON.stringify(accessData.diagnostic?.userOrgs || [])}</code>
                </div>
                ` : ''}
            </div>
        `;
        results.innerHTML += accessStatus;
        
        // Concluir diagnóstico
        diagArea.querySelector('.card-body > p').textContent = 'Diagnóstico concluído.';
        diagArea.querySelector('.progress').style.display = 'none';
        
        return accessData.access;
    } catch (error) {
        console.error('Erro durante o diagnóstico:', error);
        
        const results = document.getElementById('diagnosticResults');
        if (results) {
            results.innerHTML += `
                <div class="alert alert-danger">
                    <strong>Erro durante o diagnóstico:</strong> ${error.message}
                </div>
            `;
        }
        
        return false;
    }
} 