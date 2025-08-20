document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, inicializando dashboard...');

    // Carregar dados do dashboard da API
    async function loadDashboardData() {
        try {
            // Usar os dados iniciais como fallback
            let dashboardStats = window.dashboardStats || {};
            console.log('Dados iniciais do dashboard:', dashboardStats);
            console.log('Agentes iniciais:', dashboardStats.recentAgents);

            // Tentar carregar dados atualizados da API
            try {
                console.log('Tentando carregar dados da API...');
                const response = await fetch('/api/dashboard/stats', {
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('Resposta completa da API:', result);

                    if (result.success) {
                        console.log('Dados do dashboard atualizados com sucesso da API');
                        console.log('Data da resposta:', result.data);
                        console.log('Agentes recentes na resposta:', result.data.recentAgents);
                        dashboardStats = result.data;
                    } else {
                        console.warn('API retornou erro:', result.message);
                    }
                } else {
                    console.warn('Falha ao carregar dados da API:', response.status);
                }
            } catch (apiError) {
                console.error('Erro ao carregar dados da API:', apiError);
            }

            // Exibir estatísticas para debug
            console.log('Estatísticas carregadas:', {
                totalAgents: dashboardStats.totalAgents,
                activeAgents: dashboardStats.activeAgents,
                totalOrgs: dashboardStats.totalOrganizations,
                recentAgentsCount: dashboardStats.recentAgents ? dashboardStats.recentAgents.length : 0
            });

            // Atualizar estatísticas
            document.getElementById('totalAgents').textContent = dashboardStats.totalAgents || 0;
            document.getElementById('activeAgents').textContent = dashboardStats.activeAgents || 0;
            document.getElementById('totalInteractions').textContent = dashboardStats.totalInteractions || 0;
            document.getElementById('totalOrgs').textContent = dashboardStats.totalOrganizations || 0;

            // Atualizar tabela de agentes recentes
            console.log('Atualizando tabela de agentes recentes com:', dashboardStats.recentAgents);
            updateRecentAgentsTable(dashboardStats.recentAgents || []);

            // Inicializar gráfico se o Chart.js estiver disponível
            if (window.Chart && dashboardStats.usageData) {
                initUsageChart(dashboardStats.usageData);
            }

            // Atualizar lista de atividades recentes
            updateRecentActivities(dashboardStats.recentActivities || []);

            console.log('Dashboard carregado com sucesso');
        } catch (error) {
            console.error('Erro ao processar dados do dashboard:', error);
        }
    }

    // Atualizar tabela de agentes recentes
    function updateRecentAgentsTable(agents) {
        const agentsTable = document.getElementById('recentAgentsTable');

        if (!agentsTable) {
            console.warn('Elemento #recentAgentsTable não encontrado');
            return;
        }

        console.log('Atualizando tabela com', agents.length, 'agentes');
        console.log('Dados dos agentes:', JSON.stringify(agents));

        if (agents && agents.length > 0) {
            // Log cada agente individualmente para facilitar a depuração
            agents.forEach((agent, index) => {
                console.log(`Agente ${index}:`, agent);

                // Verificar propriedades essenciais
                if (!agent.id || !agent.name) {
                    console.warn(`Agente ${index} com dados incompletos:`, agent);
                }
            });

            agentsTable.innerHTML = agents.map((agent, index) => {
                // Garantir que propriedades estejam definidas e com valores padrão se necessário
                const safeAgent = {
                    id: agent.id || `unknown-${index}`,
                    name: agent.name || 'Agente sem nome',
                    type: agent.type || 'Personalizado',
                    status: agent.status || 'inactive',
                    organization: agent.organization || '-',
                    lastActivity: agent.lastActivity || '-'
                };

                console.log(`Renderizando agente ${index}:`, safeAgent);

                return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="agent-icon me-3">
                                <i class="fas fa-robot text-primary"></i>
                            </div>
                            <div>
                                <div class="fw-semibold">${safeAgent.name}</div>
                                <small class="text-muted">${safeAgent.type}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${safeAgent.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                            ${safeAgent.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                    </td>
                    <td>${safeAgent.organization}</td>
                    <td>${safeAgent.lastActivity}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <a href="/agents/${safeAgent.id}" class="btn btn-outline-primary">
                                <i class="fas fa-eye"></i>
                            </a>
                            <a href="/agents/${safeAgent.id}/edit" class="btn btn-outline-secondary">
                                <i class="fas fa-edit"></i>
                            </a>
                        </div>
                    </td>
                </tr>
            `;
            }).join('');

            console.log('Tabela de agentes atualizada com sucesso');
        } else {
            console.log('Nenhum agente para exibir');
            agentsTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <div class="text-muted">
                            <i class="fas fa-info-circle me-2"></i>Nenhum agente disponível
                        </div>
                    </td>
                </tr>
            `;
        }

        console.log('Tabela de agentes atualizada');
    }

    // Inicializar gráfico de uso
    function initUsageChart(usageData) {
        const ctx = document.getElementById('usageChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: usageData.labels,
                datasets: [{
                    label: 'Interações',
                    data: usageData.values,
                    backgroundColor: 'rgba(78, 115, 223, 0.1)',
                    borderColor: 'rgba(78, 115, 223, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(78, 115, 223, 1)',
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Formatar data para exibição
    function formatDate(dateString) {
        if (!dateString) return '-';

        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Atualizar atividades recentes
    function updateRecentActivities(activities) {
        const activitiesList = document.getElementById('recentActivities');
        if (!activitiesList) return;

        if (activities && activities.length > 0) {
            activitiesList.innerHTML = activities.map(activity => `
                <div class="list-group-item border-0 py-3 px-0">
                    <div class="d-flex w-100 justify-content-between mb-1">
                        <h6 class="mb-0">${activity.title}</h6>
                        <small class="text-muted">${activity.time}</small>
                    </div>
                    <p class="mb-1 text-muted small">${activity.description}</p>
                </div>
            `).join('');
        } else {
            activitiesList.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-info-circle me-2"></i>Nenhuma atividade recente
                </div>
            `;
        }
    }

    // Inicializar o dashboard
    loadDashboardData();
});