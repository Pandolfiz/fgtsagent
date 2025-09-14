/**
 * JavaScript principal do Sistema de Gerenciamento de Agentes IA
 */

// Objeto global para armazenar intervalos ativos
window.activeIntervals = {
    tokenRefresh: null,
    sessionCheck: null,
    tokenRefreshInterval: null
};

// Função para limpar todos os intervalos
function clearAllIntervals() {
    Object.keys(window.activeIntervals).forEach(key => {
        if (window.activeIntervals[key]) {
            clearInterval(window.activeIntervals[key]);
            window.activeIntervals[key] = null;
        }
    });
}

// Esperar o documento estar totalmente carregado
document.addEventListener('DOMContentLoaded', function() {
    initializeToastify();
    setupGlobalEventListeners();
    setupTokenRefresh();
    checkAuthStatus();

    // Inicializar tooltips do Bootstrap
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (tooltipTriggerList.length > 0) {
        [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }

    // Inicializar popovers do Bootstrap
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    if (popoverTriggerList.length > 0) {
        [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
    }

    // Função para exibir toasts de notificação
    window.showNotification = function(message, type = 'success') {
        // Verificar se a biblioteca Toastify está disponível
        if (typeof Toastify === 'undefined') {
            console.error('Toastify não está disponível. Fallback para alert.');
            alert(message);
            return;
        }

        const bgColor = type === 'success' ? '#1cc88a' :
                       type === 'error' ? '#e74a3b' :
                       type === 'warning' ? '#f6c23e' : '#4e73df';

        const icon = type === 'success' ? '<i class="fas fa-check-circle me-2"></i>' :
                    type === 'error' ? '<i class="fas fa-exclamation-circle me-2"></i>' :
                    type === 'warning' ? '<i class="fas fa-exclamation-triangle me-2"></i>' :
                    '<i class="fas fa-info-circle me-2"></i>';

        Toastify({
            text: icon + message,
            duration: 4000,
            close: true,
            gravity: 'top',
            position: 'right',
            backgroundColor: bgColor,
            stopOnFocus: true,
            className: 'toast-notification',
            escapeMarkup: false
        }).showToast();
    }

    // Verificar se há parâmetros de sucesso ou erro na URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('success')) {
        const message = urlParams.get('message') || 'Operação realizada com sucesso';
        showNotification(message, 'success');

        // Remover parâmetros da URL para evitar mostrar a mensagem novamente ao atualizar
        const url = new URL(window.location.href);
        url.searchParams.delete('success');
        url.searchParams.delete('message');
        window.history.replaceState({}, document.title, url.toString());
    } else if (urlParams.has('error')) {
        const message = urlParams.get('message') || 'Ocorreu um erro';
        showNotification(message, 'error');

        // Remover parâmetros da URL
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        url.searchParams.delete('message');
        window.history.replaceState({}, document.title, url.toString());
    }

    // Handler para cliques em botões de confirmação
    document.querySelectorAll('.btn-confirm').forEach(button => {
        button.addEventListener('click', function(e) {
            if (!confirm(this.dataset.confirmMessage || 'Tem certeza que deseja realizar esta ação?')) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    });

    // Handler para links de ação AJAX
    document.querySelectorAll('a.ajax-action').forEach(link => {
        link.addEventListener('click', async function(e) {
            e.preventDefault();

            const url = this.getAttribute('href');
            const method = this.dataset.method || 'GET';
            const confirmMessage = this.dataset.confirmMessage;

            // Confirmar ação se necessário
            if (confirmMessage && !confirm(confirmMessage)) {
                return;
            }

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    showNotification(data.message || 'Operação realizada com sucesso', 'success');

                    // Recarregar a página se necessário
                    if (this.dataset.reload === 'true') {
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }

                    // Redirecionar se necessário
                    if (this.dataset.redirect) {
                        setTimeout(() => {
                            window.location.href = this.dataset.redirect;
                        }, 1000);
                    }
                } else {
                    showNotification(data.message || 'Ocorreu um erro', 'error');
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                showNotification('Erro ao processar a requisição', 'error');
            }
        });
    });

    setActiveNavItem();
    handleLogout();

    // Configurar renovação automática de token
    setupTokenRefreshInterval();

    // Marcar links ativos no menu
    highlightActiveNavLink();

    // Tentar carregar dados do usuário a partir do localStorage
    loadUserDataFromLocalStorage();

    // Configurar interceptor global de erros para respostas da API
    setupApiErrorHandling();

    // Inicializar tooltips Bootstrap
    initializeBootstrapComponents();

    // Aplicar tema se definido
    applyUserTheme();

    // Verificar mensagem de redirecionamento na URL
    checkUrlForMessages();

    document.body.addEventListener('click', async function(e) {
        if (e.target.closest('.btn-delete-proposal')) {
            const btn = e.target.closest('.btn-delete-proposal');
            const proposalId = btn.getAttribute('data-id');
            if (!proposalId) return;
            if (!confirm('Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.')) return;
            // Log da requisição de exclusão que será enviada
            const deleteUrl = `/api/proposals/${proposalId}`;
            console.info('[FrontEnd] DELETE request:', deleteUrl, { method: 'DELETE' });
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Excluindo...';
            try {
                const res = await fetch(`/api/proposals/${proposalId}`, { method: 'DELETE' });
                const json = await res.json();
                if (json.success) {
                    btn.innerHTML = '<i class="fas fa-check"></i> Excluída';
                    btn.classList.remove('btn-outline-danger');
                    btn.classList.add('btn-success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-trash"></i>';
                    alert(json.message || 'Erro ao excluir proposta');
                }
            } catch (err) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-trash"></i>';
                alert('Erro ao excluir proposta: ' + err.message);
            }
        }
    });

    // Esconder navbar ao rolar para baixo e mostrar ao rolar para cima
    (function() {
        let lastScrollTop = 0;
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        let isHidden = false;

        window.addEventListener('scroll', function() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > lastScrollTop && scrollTop > 60) {
                // Rolando para baixo
                if (!isHidden) {
                    navbar.style.transform = 'translateY(-100%)';
                    navbar.style.transition = 'transform 0.3s';
                    isHidden = true;
                }
            } else {
                // Rolando para cima
                if (isHidden) {
                    navbar.style.transform = 'translateY(0)';
                    navbar.style.transition = 'transform 0.3s';
                    isHidden = false;
                }
            }
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
        });
    })();
});

/**
 * Inicializa a biblioteca Toastify para notificações
 */
function initializeToastify() {
    // Verifica se já está disponível no escopo global
    if (typeof Toastify === 'undefined') {
        // Se não estiver, carrega o script dinamicamente
        const toastifyScript = document.createElement('script');
        toastifyScript.src = 'https://cdn.jsdelivr.net/npm/toastify-js@1.11.2/src/toastify.min.js';
        document.head.appendChild(toastifyScript);

        const toastifyStyles = document.createElement('link');
        toastifyStyles.rel = 'stylesheet';
        toastifyStyles.href = 'https://cdn.jsdelivr.net/npm/toastify-js@1.11.2/src/toastify.min.css';
        document.head.appendChild(toastifyStyles);
    }
}

/**
 * Configura os listeners de eventos globais
 */
function setupGlobalEventListeners() {
    // Adicionar classe ativa para os links de navegação
    const currentPath = window.location.pathname;
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
            link.classList.add('active');
        }
    });

    // Comportamento do botão de logout
    document.querySelectorAll('a[href="/logout"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    });

    // Interceptar submissões de formulários para adicionar token
    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form.getAttribute('data-auth-form') !== 'true' && !form.querySelector('input[name="_csrf"]')) {
            // Adicionar token CSRF se necessário
            const token = getCSRFToken();
            if (token) {
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = '_csrf';
                csrfInput.value = token;
                form.appendChild(csrfInput);
            }
        }
    });

    // Adicionar o token de autenticação a todas as requisições AJAX
    if (window.jQuery) {
        $.ajaxSetup({
            beforeSend: function(xhr) {
                const token = getAuthToken();
                if (token) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                }

                const csrfToken = getCSRFToken();
                if (csrfToken) {
                    xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                }
            }
        });
    }
}

/**
 * Configura a atualização automática de token
 */
function setupTokenRefresh() {
    console.log('Configurando verificação automática de token...');
    const token = getAuthToken();
    if (!token) return;

    try {
        // Decodificar o token para verificar a expiração
        const tokenData = parseJWT(token);
        if (!tokenData) return;

        // Verificar se o token contém o campo 'temp' (token temporário)
        const isTemporary = tokenData.temp === true;

        // Verificar quando o token expira
        const expiryTime = tokenData.exp * 1000; // Converter para milissegundos
        const currentTime = Date.now();
        const timeRemaining = expiryTime - currentTime;

        console.log('Tempo restante no token (ms):', timeRemaining);

        // Se o token for temporário, agendar renovação mais agressiva
        if (isTemporary) {
            console.log('Token temporário detectado! Mostrando aviso...');
            showWarningToast('Você está usando um token temporário. Por favor, faça login novamente em breve para evitar perda de dados.');

            // Renovar a cada minuto para tokens temporários
            if (window.activeIntervals.tokenRefresh) {
                clearInterval(window.activeIntervals.tokenRefresh);
            }

            window.activeIntervals.tokenRefresh = setInterval(() => {
                refreshToken().catch(err => {
                    console.error('Falha ao renovar token temporário:', err);
                    clearInterval(window.activeIntervals.tokenRefresh);
                    window.activeIntervals.tokenRefresh = null;
                    if (!isPublicPath(window.location.pathname)) {
                        redirectToLogin('Sessão expirada. Por favor, faça login novamente.', true);
                    }
                });
            }, 60000); // 1 minuto

            return;
        }

        // Para tokens normais
        // Se o token já expirou, tentar uma renovação imediata
        if (timeRemaining <= 0) {
            console.log('Token expirado! Tentando renovar...');
            refreshToken().catch(() => {
                if (!isPublicPath(window.location.pathname)) {
                    redirectToLogin('Sessão expirada. Por favor, faça login novamente.', true);
                }
            });
            return;
        }

        // Renovar o token quando estiver próximo de expirar (5 minutos antes)
        const refreshTime = timeRemaining - (5 * 60 * 1000);
        if (refreshTime <= 0) {
            // Se estamos a menos de 5 minutos da expiração, renovar agora
            console.log('Token próximo de expirar! Renovando agora...');
            refreshToken().catch(() => {
                // Se a renovação falhar e não estivermos em uma rota pública, redirecionar para login
                if (!isPublicPath(window.location.pathname)) {
                    redirectToLogin('Sessão expirada. Por favor, faça login novamente.', true);
                }
            });
        } else {
            // Agendar renovação para 5 minutos antes da expiração
            console.log(`Agendando renovação do token para daqui a ${Math.floor(refreshTime / 60000)} minutos`);
            setTimeout(() => {
                refreshToken().catch(() => {
                    if (!isPublicPath(window.location.pathname)) {
                        redirectToLogin('Sessão expirada. Por favor, faça login novamente.', true);
                    }
                });
            }, refreshTime);
        }

        // Configurar checagem periódica de status da sessão (a cada 5 minutos)
        const checkSessionStatus = async () => {
            try {
                const response = await fetch('/api/auth/check-session', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getAuthToken()
                    }
                });

                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }

                const data = await response.json();

                if (!data.valid) {
                    console.log('Sessão inválida detectada na verificação periódica');
                    if (!isPublicPath(window.location.pathname)) {
                        redirectToLogin('Sessão expirada. Por favor, faça login novamente.', true);
                    }
                }
            } catch (error) {
                console.error('Erro na verificação periódica da sessão:', error);
                // Não redirecionar em caso de erro de rede, apenas erro de autenticação
                if (error.message.includes('401') && !isPublicPath(window.location.pathname)) {
                    redirectToLogin('Sessão expirada. Por favor, faça login novamente.', true);
                }
            }
        };

        // Primeira verificação após 5 minutos
        setTimeout(checkSessionStatus, 5 * 60 * 1000);

        // Verificações subsequentes a cada 5 minutos
        if (window.activeIntervals.sessionCheck) {
            clearInterval(window.activeIntervals.sessionCheck);
        }

        window.activeIntervals.sessionCheck = setInterval(checkSessionStatus, 5 * 60 * 1000);
    } catch (error) {
        console.error('Erro ao configurar renovação do token:', error);
    }
}

/**
 * Verifica o status de autenticação do usuário
 */
function checkAuthStatus() {
    const token = getAuthToken();

    // Redirecionar para login se não estiver autenticado em páginas restritas
    if (!token && !isPublicPath(window.location.pathname)) {
        redirectToLogin();
        return;
    }

    // Verificar validade do token
    if (token) {
        const payload = parseJWT(token);
        if (payload && payload.exp) {
            const expiryTime = payload.exp * 1000;
            if (Date.now() >= expiryTime) {
                // Token expirado, tentar renovar ou fazer logout
                refreshToken().catch(() => {
                    logout();
                });
            } else {
                // Token válido, atualizar interface com dados do usuário
                updateUserInterface(payload);
            }
        }
    }
}

/**
 * Atualiza a interface com os dados do usuário logado
 */
function updateUserInterface(userData) {
    // Exibir nome do usuário se disponível
    const userDisplayName = document.querySelector('.user-display-name');
    if (userDisplayName && userData.name) {
        userDisplayName.textContent = userData.name;
    }

    // Exibir avatar se disponível
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar && userData.avatar_url) {
        userAvatar.src = userData.avatar_url;
    }

    // Atualizar elementos com permissões específicas
    document.querySelectorAll('[data-requires-role]').forEach(element => {
        const requiredRole = element.getAttribute('data-requires-role');
        if (userData.role && requiredRole) {
            if (userData.role === requiredRole || userData.role === 'admin') {
                element.style.display = 'block';
            } else {
                element.style.display = 'none';
            }
        }
    });
}

/**
 * Efetua logout do usuário
 */
function logout() {
    // Remover token do armazenamento
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');

    // Enviar requisição para o servidor
    fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }).finally(() => {
        // Redirecionar para a página de login
        window.location.href = '/auth/login';
    });
}

/**
 * Tenta renovar o token de autenticação
 */
async function refreshToken() {
    try {
        console.log('Tentando renovar token...');
        const response = await fetchWithRetry('/api/auth/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Importante para incluir cookies
        }, 2); // Tentar até 2 vezes

        // Se o servidor retornar um erro, mas a resposta é válida
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            console.error('Erro ao renovar token:', data.message || response.statusText);

            // Se for erro de autenticação, considerar o token inválido
            if (response.status === 401 || response.status === 403) {
                console.warn('Token inválido ou sessão expirada');

                // Limpar dados da sessão localmente
                clearUserSession();

                // Apenas redirecionar se não estiver em uma página pública
                if (!isPublicPath(window.location.pathname)) {
                    window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}&message=Sua sessão expirou. Faça login novamente.`;
                }

                return false;
            }

            // Para outros erros, apenas retornar falha
            return false;
        }

        const data = await response.json().catch(() => ({}));

        if (data.success) {
            console.log('Token renovado com sucesso');

            // Armazenar informações do usuário atualizadas se disponíveis
            if (data.user) {
                // Atualizar dados do usuário no localStorage
                const userData = {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.user_metadata?.full_name ||
                          data.user.user_metadata?.first_name ||
                          data.user.email?.split('@')[0] ||
                          'Usuário',
                    first_name: data.user.user_metadata?.first_name || '',
                    avatar: data.user.user_metadata?.avatar_url || '',
                    last_login: new Date().toISOString()
                };

                localStorage.setItem('userData', JSON.stringify(userData));

                // Atualizar nome do usuário na interface se existir
                updateUserDisplay(userData);
            }

            return true;
        } else {
            console.error('Erro ao renovar token:', data.message || 'Resposta do servidor sem sucesso');

            // Se o erro indicar problema de sessão
            if (data.message && (
                data.message.includes('sessão') ||
                data.message.includes('expirou') ||
                data.message.includes('token')
            )) {
                // Redirecionamento apenas se não estiver em uma página pública
                if (!isPublicPath(window.location.pathname)) {
                    window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}&message=Sua sessão expirou. Faça login novamente.`;
                }
            }

            return false;
        }
    } catch (error) {
        console.error('Erro ao tentar renovar token:', error);

        // Não redirecionar automaticamente em caso de erro de rede
        // pois pode ser apenas uma falha temporária de conexão
        return false;
    }
}

/**
 * Exibe um toast de aviso com cor amarela
 */
function showWarningToast(message) {
    if (typeof Toastify !== 'undefined') {
        Toastify({
            text: message,
            duration: 5000,
            close: true,
            gravity: "top",
            position: "center",
            backgroundColor: "#ffc107",
            stopOnFocus: true
        }).showToast();
    } else {
        console.warn(message);
    }
}

/**
 * Redireciona para a página de login
 * @param {string} message - Mensagem opcional a ser exibida na página de login
 * @param {boolean} sessionExpired - Indica se o redirecionamento foi causado por expiração de sessão
 */
function redirectToLogin(message, sessionExpired = false) {
    // Salvar a URL atual para redirecionamento após o login
    const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);

    // Construir URL de redirecionamento
    let redirectUrl = `/auth/login?redirect=${currentUrl}`;

    // Adicionar mensagem se fornecida
    if (message) {
        redirectUrl += `&message=${encodeURIComponent(message)}`;
    }
    // Adicionar mensagem padrão se a sessão expirou
    else if (sessionExpired) {
        redirectUrl += `&message=${encodeURIComponent('Sua sessão expirou devido a inatividade. Por favor, faça login novamente.')}`;
        redirectUrl += '&sessionExpired=true';
    }

    // Redirecionar para a página de login
    window.location.href = redirectUrl;
}

/**
 * Verifica se o caminho é público
 */
function isPublicPath(path) {
    const publicPaths = [
        '/auth/login',
        '/auth/signup',
        '/auth/reset-password',
        '/privacy',
        '/terms',
        '/',
        '/auth/callback',
        '/auth/confirm'
    ];
    return publicPaths.some(publicPath => path === publicPath || path.startsWith(publicPath));
}

/**
 * Obtém o token de autenticação
 */
function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

/**
 * Define o token de autenticação
 */
function setAuthToken(token, remember = true) {
    if (remember) {
        localStorage.setItem('authToken', token);
    } else {
        sessionStorage.setItem('authToken', token);
    }
}

/**
 * Obtém o token CSRF
 */
function getCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag ? metaTag.getAttribute('content') : null;
}

/**
 * Decodifica o token JWT e retorna o payload
 */
function parseJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Erro ao decodificar token JWT', e);
        return null;
    }
}

/**
 * Exibe um toast de sucesso
 */
function showSuccessToast(message) {
    if (typeof Toastify !== 'undefined') {
        Toastify({
            text: message,
            duration: 3000,
            close: true,
            gravity: "top",
            position: "center",
            backgroundColor: "#28a745",
        }).showToast();
    } else {
        alert(message);
    }
}

/**
 * Exibe um toast de erro
 */
function showErrorToast(message) {
    if (typeof Toastify !== 'undefined') {
        Toastify({
            text: message,
            duration: 3000,
            close: true,
            gravity: "top",
            position: "center",
            backgroundColor: "#dc3545",
        }).showToast();
    } else {
        alert(message);
    }
}

// Função para marcar a página atual no navbar
function setActiveNavItem() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}

// Função para gerenciar o logout
function handleLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    window.location.href = '/';
                } else {
                    throw new Error('Falha ao fazer logout');
                }
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
                showNotification('Erro ao fazer logout. Tente novamente.', 'error');
            }
        });
    }
}

// Verificar token periodicamente para evitar expiração
function setupTokenRefreshInterval() {
  console.log('Iniciando verificação periódica de token...');

  // Verificar imediatamente na inicialização
  setTimeout(async () => {
    console.log('Verificação inicial do token...');
    try {
      const result = await refreshToken();
      console.log('Resultado da verificação inicial:', result ? 'Sucesso' : 'Falha');
    } catch (err) {
      console.error('Erro na verificação inicial do token:', err);
    }
  }, 2000); // Aguardar 2 segundos para garantir que a página carregou completamente

  // Verificar a cada 5 minutos (300000ms)
  const REFRESH_INTERVAL = 300000; // 5 minutos

  // Iniciar o intervalo
  if (window.activeIntervals.tokenRefreshInterval) {
    clearInterval(window.activeIntervals.tokenRefreshInterval);
  }

  window.activeIntervals.tokenRefreshInterval = setInterval(async () => {
    console.log('Verificação periódica do token...');
    try {
      const result = await refreshToken();
      console.log('Resultado da verificação periódica:', result ? 'Sucesso' : 'Falha');

      // Se não for possível renovar o token e estivermos em uma página protegida
      if (!result && !isPublicPath(window.location.pathname)) {
        // Verificar se ainda há um token
        const token = getAuthToken();
        if (!token) {
          console.warn('Token não encontrado após tentativa de renovação, redirecionando...');
          clearInterval(window.activeIntervals.tokenRefreshInterval);
          window.activeIntervals.tokenRefreshInterval = null;
          window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}&message=Sua sessão expirou. Faça login novamente.`;
        }
      }
    } catch (err) {
      console.error('Erro na verificação periódica do token:', err);
    }
  }, REFRESH_INTERVAL);

  // Adicionar verificação quando a aba volta a ficar ativa
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      console.log('Página voltou a ficar visível, verificando token...');
      try {
        const result = await refreshToken();
        console.log('Resultado da verificação por visibilidade:', result ? 'Sucesso' : 'Falha');
      } catch (err) {
        console.error('Erro na verificação por visibilidade:', err);
      }
    }
  });

  // Verificar também antes de enviar qualquer requisição fetch
  const originalFetch = window.fetch;
  window.fetch = async function(url, options = {}) {
    // Ignorar verificação para requisições de refresh-token para evitar loop infinito
    if (url.includes('/refresh-token')) {
      return originalFetch(url, options);
    }

    // Ignorar verificação para rotas públicas
    if (typeof url === 'string' && isPublicUrl(url)) {
      return originalFetch(url, options);
    }

    // Verificar e tentar renovar o token antes de fazer a requisição
    try {
      await refreshToken();
    } catch (err) {
      // Apenas registrar erro mas continuar com a requisição
      console.warn('Erro ao verificar token antes de fetch:', err);
    }

    // Fazer a requisição original
    return originalFetch(url, options);
  };
}

/**
 * Verifica se uma URL é pública (não requer autenticação)
 */
function isPublicUrl(url) {
  try {
    // Se for uma URL relativa, converter para URL completa
    if (url.startsWith('/')) {
      url = window.location.origin + url;
    }

    const urlObj = new URL(url);
    const path = urlObj.pathname;

    return isPublicPath(path);
  } catch (e) {
    // Em caso de erro ao analisar a URL, assumir que não é pública
    return false;
  }
}

/**
 * Inicializar componentes Bootstrap interativos
 */
function initializeBootstrapComponents() {
  // Inicializar todos os tooltips
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

  // Inicializar todos os popovers
  const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
  const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
}

/**
 * Carregar dados do usuário do localStorage
 */
function loadUserDataFromLocalStorage() {
  try {
    const userData = localStorage.getItem('userData');

    if (userData) {
      const user = JSON.parse(userData);

      // Atualizar nome de exibição se existir
      const userDisplayName = document.querySelector('.user-display-name');
      if (userDisplayName && user.name) {
        userDisplayName.textContent = user.name;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar dados do usuário:', error);
  }
}

/**
 * Configurar interceptação de erros de API
 */
function setupApiErrorHandling() {
  // Código para lidar com erros de API globalmente
  // Se necessário, pode ser implementado aqui
}

/**
 * Aplicar tema de acordo com preferências do usuário
 */
function applyUserTheme() {
  try {
    const userData = localStorage.getItem('userData');

    if (userData) {
      const user = JSON.parse(userData);

      if (user.theme === 'dark') {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    }
  } catch (error) {
    console.error('Erro ao aplicar tema:', error);
  }
}

/**
 * Verificar e exibir mensagens na URL
 */
function checkUrlForMessages() {
  // Verificar parâmetros de URL para mensagens de sucesso/erro
  const urlParams = new URLSearchParams(window.location.search);
  const message = urlParams.get('message');
  const success = urlParams.get('success');

  if (message) {
    // Remover os parâmetros da URL sem recarregar a página
    const newUrl = window.location.pathname +
                   (urlParams.toString().replace(/message=[^&]*(&|$)/g, '')
                                        .replace(/signup/success=[^&]*(&|$)/g, '')
                                        .replace(/^&/, '?')
                                        .replace(/(\?|&)$/, ''));

    window.history.replaceState({}, document.title, newUrl);

    // Exibir a mensagem como toast
    showToast(message, success === 'true');
  }
}

/**
 * Marcar link ativo no menu de navegação
 */
function highlightActiveNavLink() {
  const currentPath = window.location.pathname;

  document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
    const href = link.getAttribute('href');

    // Verificar se o link corresponde ao caminho atual
    if (href === currentPath ||
        (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Limpa os dados de sessão local do usuário
 */
function clearUserSession() {
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('authToken');
  localStorage.removeItem('userData');
}

/**
 * Atualiza elementos da interface com dados do usuário
 */
function updateUserDisplay(userData) {
  if (!userData) return;

  // Atualizar nome de exibição se existir
  const userDisplayElements = document.querySelectorAll('.user-display-name');
  userDisplayElements.forEach(element => {
    if (userData.name) {
      element.textContent = userData.name;
    }
  });

  // Atualizar avatar se existir
  const userAvatarElements = document.querySelectorAll('.user-avatar');
  userAvatarElements.forEach(element => {
    if (userData.avatar) {
      element.src = userData.avatar;
    }
  });
}

/**
 * Faz uma requisição com retrys
 */
async function fetchWithRetry(url, options = {}, retries = 1) {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (retries <= 0) throw error;

    // Esperar um segundo antes de tentar novamente
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`Tentando novamente... (${retries} tentativas restantes)`);
    return fetchWithRetry(url, options, retries - 1);
  }
}

// Cleanup ao sair da página
window.addEventListener('beforeunload', () => {
    console.log('Página sendo fechada...');
    clearAllIntervals();
});

// Cleanup adicional para visibilidade da página
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        console.log('Página perdeu o foco - limpando intervalos desnecessários');
        // Manter apenas o intervalo de verificação de sessão para não perder a autenticação
        if (window.activeIntervals.tokenRefresh) {
            clearInterval(window.activeIntervals.tokenRefresh);
            window.activeIntervals.tokenRefresh = null;
        }
    }
});