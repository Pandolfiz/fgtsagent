import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Navbar from '../components/Navbar'
import ContactPanel from '../components/ContactPanel'
import { FaSearch, FaEllipsisV, FaPaperclip, FaMicrophone, FaSmile, FaPhone, FaVideo, FaPlus, FaArrowLeft, FaSpinner, FaExclamationTriangle, FaWallet, FaCalculator, FaFileAlt, FaTimesCircle, FaCheckCircle, FaInfoCircle, FaIdCard, FaRegCopy, FaChevronDown, FaCheck, FaClock, FaUser } from 'react-icons/fa'
import { IoSend } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../utilities/apiFetch';
import { cachedFetch } from '../utils/authCache'
import { useClipboard } from '../hooks/useClipboard'

// ✅ SEGURANÇA: Logger condicional para produção
const secureLog = {
  info: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(message, data);
    }
  },
  error: (message, error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(message, error);
    }
  },
  warn: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(message, data);
    }
  }
};

// ✅ SEGURANÇA: Funções de sanitização e validação robustas
const SECURITY_CONFIG = {
  MAX_MESSAGE_LENGTH: 1000,
  MAX_SEARCH_LENGTH: 100,
  RATE_LIMIT_DELAY: 1000, // 1 segundo entre envios
  MAX_REQUESTS_PER_MINUTE: 60, // Máximo de requisições por minuto
  BACKOFF_MULTIPLIER: 2, // Multiplicador para backoff exponencial
  SESSION_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutos
  DANGEROUS_PATTERNS: /javascript:|data:|vbscript:|on\w+\s*=|expression\s*\(|eval\s*\(/gi
};

// ✅ SEGURANÇA: Sanitização robusta de conteúdo
const sanitizeContent = (content) => {
  if (typeof content !== 'string') return '';
  
  // Remover caracteres de controle perigosos
  let sanitized = content.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  
  // Remover padrões perigosos (mantendo URLs seguras)
  sanitized = sanitized.replace(SECURITY_CONFIG.DANGEROUS_PATTERNS, '');
  
  // Escapar HTML básico para segurança
  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  return sanitized.trim();
};

// ✅ SEGURANÇA: Validação rigorosa de entrada
const validateUserInput = (input, type = 'message') => {
  // ✅ VALIDAÇÃO: Verificar tipo de entrada
  if (typeof input !== 'string') {
    return { valid: false, error: 'Input deve ser uma string' };
  }
  
  // ✅ VALIDAÇÃO: Verificar se não é null ou undefined
  if (input === null || input === undefined) {
    return { valid: false, error: 'Input não pode ser nulo' };
  }
  
  const trimmed = input.trim();
  
  // ✅ VALIDAÇÃO: Verificar se não é apenas espaços
  if (!trimmed) {
    return { valid: false, error: 'Input não pode estar vazio' };
  }
  
  // ✅ VALIDAÇÃO: Verificar caracteres de controle
  if (/[\u0000-\u001F\u007F-\u009F]/.test(trimmed)) {
    return { valid: false, error: 'Input contém caracteres de controle inválidos' };
  }
  
  switch (type) {
    case 'message':
      if (trimmed.length > SECURITY_CONFIG.MAX_MESSAGE_LENGTH) {
        return { valid: false, error: `Mensagem muito longa (máximo ${SECURITY_CONFIG.MAX_MESSAGE_LENGTH} caracteres)` };
      }
      
      // ✅ VALIDAÇÃO: Verificar padrões perigosos
      if (SECURITY_CONFIG.DANGEROUS_PATTERNS.test(trimmed)) {
        return { valid: false, error: 'Conteúdo não permitido' };
      }
      
      // ✅ VALIDAÇÃO: URLs são permitidas nas mensagens
      // Removida restrição de URLs para permitir compartilhamento de links
      
      return { valid: true, value: sanitizeContent(trimmed) };
      
    case 'search':
      if (trimmed.length > SECURITY_CONFIG.MAX_SEARCH_LENGTH) {
        return { valid: false, error: 'Busca muito longa' };
      }
      
      // ✅ VALIDAÇÃO: Verificar padrões perigosos em busca
      if (SECURITY_CONFIG.DANGEROUS_PATTERNS.test(trimmed)) {
        return { valid: false, error: 'Termo de busca contém caracteres inválidos' };
      }
      
      return { valid: true, value: sanitizeContent(trimmed) };
      
    case 'phone':
      // ✅ VALIDAÇÃO: Formato de telefone
      const phoneRegex = /^[0-9]{10,15}$/;
      if (!phoneRegex.test(trimmed)) {
        return { valid: false, error: 'Formato de telefone inválido' };
      }
      
      return { valid: true, value: trimmed };
      
    default:
      return { valid: true, value: sanitizeContent(trimmed) };
  }
};

// ✅ SEGURANÇA: Obter token CSRF com validação
const getCSRFToken = () => {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  
  // ✅ VALIDAÇÃO: Verificar se o token tem formato válido
  if (token && typeof token === 'string' && token.length >= 32) {
    return token;
  }
  
  return '';
};

// ✅ SEGURANÇA: Validação de estado
const validateState = (state, type) => {
  if (!state || typeof state !== 'object') {
    return { valid: false, error: 'Estado inválido' };
  }
  
  switch (type) {
    case 'user':
      if (!state.id || typeof state.id !== 'string') {
        return { valid: false, error: 'ID de usuário inválido' };
      }
      return { valid: true };
      
    case 'contact':
      if (!state.remote_jid || typeof state.remote_jid !== 'string') {
        return { valid: false, error: 'ID de contato inválido' };
      }
      return { valid: true };
      
    case 'message':
      if (!state.content || typeof state.content !== 'string') {
        return { valid: false, error: 'Conteúdo de mensagem inválido' };
      }
      return { valid: true };
      
    default:
      return { valid: true };
  }
};

// ✅ SEGURANÇA: Sistema de rate limiting
const rateLimiter = {
  requests: [],
  isBlocked: false,
  blockUntil: 0,
  
  canMakeRequest() {
    const now = Date.now();
    
    // Se está bloqueado, verificar se já pode fazer requisições novamente
    if (this.isBlocked && now < this.blockUntil) {
      return false;
    }
    
    // Limpar requisições antigas (mais de 1 minuto)
    this.requests = this.requests.filter(time => now - time < 60000);
    
    // Verificar se excedeu o limite
    if (this.requests.length >= SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE) {
      this.isBlocked = true;
      this.blockUntil = now + 60000; // Bloquear por 1 minuto
      return false;
    }
    
    return true;
  },
  
  recordRequest() {
    if (this.canMakeRequest()) {
      this.requests.push(Date.now());
      return true;
    }
    return false;
  },
  
  getRemainingRequests() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < 60000);
    return Math.max(0, SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE - this.requests.length);
  }
};

// ✅ SEGURANÇA: Garantir que token CSRF esteja carregado
const ensureCSRFToken = async () => {
  let token = getCSRFToken();
  if (token) {
    return token;
  }
  
  // Se não há token, tentar carregar
  try {
    console.log('[CSRF] Token não encontrado, tentando carregar...');
    const response = await fetch('/api/auth/csrf-token', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.csrfToken) {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
          metaTag.setAttribute('content', data.csrfToken);
          console.log('[CSRF] Token carregado dinamicamente:', data.csrfToken.substring(0, 10) + '...');
          return data.csrfToken;
        }
      }
    }
      } catch (error) {
      console.error('[CSRF] Erro ao carregar token dinamicamente:', error);
      throw new Error('Não foi possível obter token CSRF válido');
    }
    
    // Se chegou aqui, não foi possível obter o token
    throw new Error('Token CSRF não disponível');
};

// ✅ SEGURANÇA: Verificar sessão
const checkSession = async () => {
  try {
    const response = await fetch('/api/auth/check-session', {
      credentials: 'include',
      headers: {
        'X-CSRF-Token': getCSRFToken()
      }
    });
    
    if (!response.ok) {
      window.location.href = '/login?error=session_expired&message=Sua sessão expirou. Por favor, faça login novamente.';
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return false;
  }
};

// Função auxiliar para gerar IDs de mensagem únicos
function generateMessageId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Função de debounce para evitar múltiplos cliques
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Função robusta para formatação de valores monetários
function formataMoeda(valor) {
  // Se o valor for null, undefined ou não numérico, retornar null
  if (valor === null || valor === undefined) {

    return null;
  }
  
  try {
    // Garantir que estamos trabalhando com um número
    let numero;
    
    // Verificar se já é um número
    if (typeof valor === 'number') {

      numero = valor;
    } else {
      // Tentar converter string para número
      // Remover qualquer formatação que possa existir
      const valorLimpo = String(valor).replace(/[^\d.,]/g, '')
        .replace(/\./g, '#')  // Substituir temporariamente pontos
        .replace(/,/g, '.')   // Substituir vírgulas por pontos
        .replace(/#/g, '');   // Remover pontos temporários
      
      numero = parseFloat(valorLimpo);

    }
    
    // Verificar se a conversão resultou em um número válido
    if (isNaN(numero)) {

      return null;
    }
    
    // Formatar o número como moeda brasileira
    const formatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(numero);
    

    return formatado;
  } catch (error) {
    console.error(`Erro ao formatar valor monetário: ${error.message}`);
    // Fallback simples
    try {
      return `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`;
    } catch (e) {
      console.error(`Erro no fallback de formatação: ${e.message}`);
      return null;
    }
  }
}

export default function Chat() {
  const [contacts, setContacts] = useState([])
  const [displayContacts, setDisplayContacts] = useState([]) // Estado para exibição ordenada
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [currentContact, setCurrentContact] = useState(null)
  // ✅ SISTEMA DE ESTADOS UNIFICADO E SEM CONFLITOS
  const [loadingState, setLoadingState] = useState({
    // Estados de carregamento específicos
    contacts: false,           // Carregamento de contatos
    messages: false,           // Carregamento de mensagens
    instances: false,          // Carregamento de instâncias
    moreContacts: false,       // Carregamento de mais contatos
    moreMessages: false,       // Carregamento de mais mensagens
    
    // Estados de sincronização
    syncing: false,            // Sincronização em andamento
    updating: false,           // Atualização em andamento
    
    // Estados de controle de scroll
    initialLoad: false,        // Carregamento inicial (para ancoragem)
    allowInfiniteScroll: false, // Permite scroll infinito
    
    // Estados de paginação
    contactsPage: 1,
    messagesPage: 1,
    hasMoreContacts: true,
    hasMoreMessages: true
  });

  // ✅ Função unificada para gerenciar estados
  const setLoading = (type, value) => {
    setLoadingState(prev => ({ ...prev, [type]: value }));
  };

  // ✅ Estados derivados para compatibilidade (não alterar diretamente)
  const isLoading = loadingState.contacts || loadingState.messages || loadingState.instances;
  const isSyncing = loadingState.syncing;
  const isUpdating = loadingState.updating;
  const isInitialLoad = loadingState.initialLoad;
  const isLoadingMoreContacts = loadingState.moreContacts;
  const isLoadingMoreMessages = loadingState.moreMessages;
  const allowInfiniteScroll = loadingState.allowInfiniteScroll;
  const contactsPage = loadingState.contactsPage;
  const messagesPage = loadingState.messagesPage;
  const hasMoreContacts = loadingState.hasMoreContacts;
  const hasMoreMessages = loadingState.hasMoreMessages;

  // ✅ Função para atualizar estado de paginação
  const setPagination = (type, value) => {
    setLoadingState(prev => ({ ...prev, [type]: value }));
  };

  const [isSendingMessage, setIsSendingMessage] = useState(false) // Controle de envio
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState(0) // Timestamp do último envio
  const [currentUser, setCurrentUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768)
  const [clipboardFeedback, setClipboardFeedback] = useState('') // Feedback do clipboard
  
  // ✅ Hook para operações de clipboard
  const { copyToClipboard, readFromClipboard, isClipboardSupported } = useClipboard()
  const [screenWidth, setScreenWidth] = useState(window.innerWidth)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [autoResponseContacts, setAutoResponseContacts] = useState({})

  const [lastSyncTime, setLastSyncTime] = useState(null)
  const messagesContainerRef = useRef(null);
  const lastMessageIdRef = useRef(null) // Referência para o último ID de mensagem
  const timeoutsRef = useRef([])
  const intervalsRef = useRef([])
  
  // ✅ SEGURANÇA: Função de cleanup seguro
  const cleanupResources = () => {
    // Limpar todos os timeouts
    timeoutsRef.current.forEach(timeoutId => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    });
    timeoutsRef.current = [];
    
    // Limpar todos os intervals
    intervalsRef.current.forEach(intervalId => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    });
    intervalsRef.current = [];
  };
  
  const navigate = useNavigate()
  const [agentMode, setAgentMode] = useState('full');
  
  // Estados para o painel lateral de contato
  const [isContactPanelOpen, setIsContactPanelOpen] = useState(false);
  const [selectedContactForPanel, setSelectedContactForPanel] = useState(null);
  
  // Estados para gerenciar instâncias
  const [instances, setInstances] = useState([])
  

  const [selectedInstanceId, setSelectedInstanceId] = useState('all') // 'all' para todas as instâncias
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const currentIntervalRef = useRef(30000); // ✅ Ref para polling adaptativo
  const lastMessageRef = useRef(null); // ✅ Ref para última mensagem (evitar loops)
  const scrollTimeoutRef = useRef(null); // ✅ Ref para debounce do scroll
  const contactsContainerRef = useRef(null); // ✅ Ref para container de contatos
  const contactsScrollTimeoutRef = useRef(null); // ✅ Ref para debounce do scroll de contatos
  const [contactInstances, setContactInstances] = useState({}) // Mapa de contato -> instância
  
  // Estados para UX melhorada
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [retryQueue, setRetryQueue] = useState([]) // ✅ Fila de operações para retry
  const [lastStatusUpdate, setLastStatusUpdate] = useState('1970-01-01T00:00:00Z') // ✅ Controla última atualização de status
  
  const CONTACTS_PER_PAGE = 15
  const MESSAGES_PER_PAGE = 20
  
  // Estilos para dispositivos móveis usando variáveis CSS personalizadas
  const mobileStyles = {
    mainContainer: {
      height: 'calc(100vh - 4rem)',
      maxHeight: 'calc(100vh - 4rem)',
      marginBottom: '0px',
      padding: '0rem',
      width: '100%'
    },
    messagesContainer: {
      height: 'auto',
      maxHeight: 'calc(100vh - 12rem)',
      padding: '0rem'
    },
    pageContainer: {
      padding: '0',
      margin: '0',
      height: '100vh',
      minHeight: '100vh',
      maxHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(to bottom right, rgb(4 47 46), rgb(12 74 110), rgb(23 37 84))',
      overflow: 'hidden',
      width: '100vw'
    },
    contentContainer: {
      padding: '0.5rem',
      paddingBottom: '0.5rem',
      margin: '0',
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      width: '100%'
    },
    messageInputContainer: {
      margin: '0',
      padding: '0rem',
      borderTop: '1px solid rgba(8, 145, 178, 0.2)'
    }
  };

  // Estado para controlar quando deve rolar a tela
  // Removido: variáveis de scroll complexo não necessárias

  // Estados para os dados do contato
  const [contactData, setContactData] = useState({
    saldo: null,
    simulado: null,
    erroConsulta: null,
    proposta: null,
    erroProposta: null,
    statusProposta: null,
    descricaoStatus: null,
    valorProposta: null,
    linkFormalizacao: null,
    chavePix: null
  });

  // [ADICIONAR estados locais para feedback de cópia]
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Log inicial para diagnóstico
  useEffect(() => {
    
  }, []);

  // ✅ SEGURANÇA: Listener para detectar mudanças na conectividade e verificar sessão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[NETWORK] ✅ Conexão restaurada - processando fila de retry');
      // Processar fila de retry quando voltar online
      if (retryQueue.length > 0) {
        processRetryQueue();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('[NETWORK] ❌ Conexão perdida - modo offline ativado');
    };
    
    // ✅ SEGURANÇA: Verificação periódica de sessão
    const sessionCheckInterval = setInterval(async () => {
      if (currentUser && !document.hidden) {
        const sessionValid = await checkSession();
        if (!sessionValid) {
          setError('Sessão expirada. Redirecionando...');
        }
      }
    }, SECURITY_CONFIG.SESSION_CHECK_INTERVAL);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(sessionCheckInterval);
    };
  }, [retryQueue, currentUser]);

  // ✅ Função para processar fila de retry
  const processRetryQueue = async () => {
    if (!isOnline || retryQueue.length === 0) return;
    
    console.log(`[RETRY] 🔄 Processando ${retryQueue.length} operações pendentes`);
    
    for (const operation of retryQueue) {
      try {
        await operation.execute();
        console.log(`[RETRY] ✅ Operação executada: ${operation.type}`);
      } catch (error) {
        console.error(`[RETRY] ❌ Falha na operação ${operation.type}:`, error);
      }
    }
    
    setRetryQueue([]);
  };

  // ✅ SEGURANÇA: Cleanup de timeouts e intervals quando o componente for desmontado
  useEffect(() => {
    return () => {
      // Usar função de cleanup robusta
      cleanupResources();
      
      // ✅ Cleanup adicional de refs específicos
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      
      if (contactsScrollTimeoutRef.current) {
        clearTimeout(contactsScrollTimeoutRef.current);
        contactsScrollTimeoutRef.current = null;
      }
    };
  }, []);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Funções utilitárias para gerenciar timeouts e intervals
  const createTimeout = (callback, delay) => {
    const timeoutId = setTimeout(callback, delay);
    timeoutsRef.current.push(timeoutId);
    return timeoutId;
  };

  const createInterval = (callback, delay) => {
    const intervalId = setInterval(callback, delay);
    intervalsRef.current.push(intervalId);
    return intervalId;
  };

  const clearTimeoutSafe = (timeoutId) => {
    clearTimeout(timeoutId);
    timeoutsRef.current = timeoutsRef.current.filter(id => id !== timeoutId);
  };

  const clearIntervalSafe = (intervalId) => {
    clearInterval(intervalId);
    intervalsRef.current = intervalsRef.current.filter(id => id !== intervalId);
  };

  // Detectar mudanças de tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setScreenWidth(width);
      setIsMobileView(width < 768);
      
      // Ajustar o viewport height em dispositivos móveis para lidar com barras de navegação
      if (width < 768) {
        // Subtrair altura do navbar e espaçamentos
        const adjustedHeight = height - 20; // 20px de espaçamento
        document.documentElement.style.setProperty('--vh', `${adjustedHeight * 0.01}px`);
        
        // Detectar iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          document.body.classList.add('ios-device');
        } else {
          document.body.classList.remove('ios-device');
        }
      }
    }

    // Executar imediatamente para definir o valor inicial
    handleResize();

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Adicionar estilos CSS para o iOS
  useEffect(() => {
    // Remover margens e paddings do corpo da página
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.documentElement.style.overflow = 'hidden';
    
    // Criar um estilo para dispositivos iOS - usando textContent para evitar XSS
    const style = document.createElement('style');
    style.textContent = `
      .ios-device .message-input-container {
        padding-bottom: env(safe-area-inset-bottom, 20px);
      }
      
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        height: 100% !important;
      }
      
      .message-input-container {
        margin-bottom: 0 !important;
        padding-bottom: 0 !important;
      }
      
      .container.mx-auto {
        margin-bottom: 0 !important;
        padding-bottom: 0 !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflow = '';
      document.documentElement.style.margin = '';
      document.documentElement.style.padding = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Adicionar estilos globais para customizar as barras de scroll
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Scrollbar geral */
      ::-webkit-scrollbar {
        width: 8px;
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #0891b2 40%, #0ea5e9 100%);
        border-radius: 8px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #06b6d4 40%, #38bdf8 100%);
      }
      /* Firefox */
      * {
        scrollbar-width: thin;
        scrollbar-color: #0891b2 #0000;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Função para testar a conexão com a API
  useEffect(() => {
    async function checkConnection() {
      try {
        console.log("Testando conexão com a API...");
        const response = await fetch('/api/contacts/count', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Erro ao verificar conectividade: ${response.status}`);
        }
        
        const data = await response.json();
        
        setConnectionStatus({
          connected: data.success,
          timestamp: new Date().toISOString(),
          count: data.count
        });
        
        // Teste de conexão concluído
      } catch (error) {
        console.error("Erro ao testar conexão:", error);
        setConnectionStatus({
          connected: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    checkConnection();
  }, []);

  // Função auxiliar para obter o usuário atual via API
  const fetchUserFromApi = async () => {
    try {
      console.log("Iniciando fetchUserFromApi...");
      const data = await cachedFetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (!data || !data.success) {
        if (data && data.status === 401) {
          // Redirecionar para a página de login se não estiver autenticado
          navigate('/login?error=auth_required&message=Você precisa estar autenticado para acessar o chat.');
          return null;
        }
        
        console.error(`Erro ao buscar usuário:`, data);
        throw new Error(`Erro ao buscar usuário: ${data?.message || 'Erro desconhecido'}`);
      }
  
      
      // Verificar e extrair o objeto user da resposta
      if (data.success && data.user) {

        return data.user; // Retornar o objeto user, não a resposta completa
      } else if (data.id) {
        // Se a API retornar o usuário diretamente sem wrapper

        return data;
      } else {
        console.error('Formato de resposta inesperado:', data);
        throw new Error('Formato de resposta inválido da API');
      }
    } catch (error) {
      console.error('Erro ao buscar usuário da API:', error);
      throw error;
    }
  }

  // Obter o usuário atual
  useEffect(() => {
    async function getCurrentUser() {
      try {
        setLoading('contacts', true);
        setError(null);
        
        // Tenta obter do backend via API
        const userData = await fetchUserFromApi();
        
        if (userData && userData.id) {
          // Usuário autenticado
          setCurrentUser(userData);
          
          // Após obter o usuário, atualiza o status da conexão para garantir
          try {
            const response = await fetch('/api/contacts/count', {
              credentials: 'include'
            });
            const data = await response.json();
            
            setConnectionStatus(prev => ({
              ...prev,
              connected: data.success,
              timestamp: new Date().toISOString(),
              withUser: true
            }));
          } catch (error) {
            console.error("Erro ao verificar contatos:", error);
          }
        } else if (userData === null) {
          // Usuário não autenticado - o redirecionamento já ocorreu em fetchUserFromApi
          return;
        } else {
          console.error("Dados de usuário recebidos, mas sem ID válido:", userData);
          throw new Error('Dados de usuário inválidos');
        }
      } catch (error) {
        console.error('Erro ao obter usuário:', error);
        setError(`Erro ao obter dados do usuário: ${error.message}. Por favor, tente novamente.`);
      } finally {
        setLoading('contacts', false);
      }
    }
    
    getCurrentUser();
  }, [navigate]);

  // Buscar o modo do agente ao montar o componente
  useEffect(() => {
    async function fetchAgentMode() {
      try {
        const res = await apiFetch('/api/agents/mode');
        if (!res) return;
        const json = await res.json();
        if (json.success && json.data?.mode) {
          setAgentMode(json.data.mode);
        }
      } catch (err) {
        console.error('Erro ao buscar modo do agente:', err);
      }
    }
    fetchAgentMode();
  }, []);

  // Carregar instâncias e contatos quando o componente montar
  useEffect(() => {
    if (!currentUser?.id) return;

    const loadInitialData = async () => {
      try {
        // Carregar instâncias primeiro
        console.log('[INIT] 🔄 Carregando instâncias...');
        setLoading('instances', true);
        
        const instancesResponse = await fetch('/api/whatsapp-credentials', {
          credentials: 'include'
        });
        
        if (instancesResponse.ok) {
          const instancesData = await instancesResponse.json();
          if (instancesData.success && instancesData.credentials) {
            const validInstances = instancesData.credentials.filter(cred => 
              cred.status === 'connected' || cred.status === 'open'
            );
            setInstances(validInstances);
            console.log(`[INIT] ✅ ${validInstances.length} instâncias carregadas`);
          }
        }
        
        setLoading('instances', false);
        
        // Carregar contatos
        console.log('[INIT] 🔄 Carregando contatos...');
        await fetchContacts(null, 1, true);
        
      } catch (error) {
        console.error('[INIT] ❌ Erro ao carregar dados iniciais:', error);
        setError('Erro ao carregar dados. Tente recarregar a página.');
        setLoading('instances', false);
      }
    };

    loadInitialData();
  }, [currentUser?.id]);

  // Ordenar contatos quando a lista mudar
  useEffect(() => {
    if (contacts.length === 0) {
      setDisplayContacts([]);
      return;
    }

    console.log('[SORT] 🔄 Ordenando contatos...');
    
    // Ordenar por última mensagem (mais recente primeiro)
    const sortedContacts = [...contacts].sort((a, b) => {
      // Usar last_message_time, updated_at ou created_at como fallback
      const timeA = new Date(a.last_message_time || a.updated_at || a.created_at || 0);
      const timeB = new Date(b.last_message_time || b.updated_at || b.created_at || 0);
      
      // Ordenar por data (mais recente primeiro)
      const timeDiff = timeB.getTime() - timeA.getTime();
      
      // Se as datas forem iguais, ordenar por nome
      if (timeDiff === 0) {
        const nameA = (a.name || a.push_name || '').toLowerCase();
        const nameB = (b.name || b.push_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      
      return timeDiff;
    });
    
    setDisplayContacts(sortedContacts);
    console.log(`[SORT] ✅ ${sortedContacts.length} contatos ordenados`);
  }, [contacts]);

  // ✅ SCROLL AUTOMÁTICO: Monitorar carregamento inicial de mensagens
  useEffect(() => {
    if (messages.length > 0 && loadingState.initialLoad && !loadingState.messages) {
      console.log('[SCROLL-AUTO] 📜 Scroll automático para o final após carregamento inicial');
      setTimeout(() => {
        scrollToPosition('bottom', { immediate: true, duringInitialLoad: true });
      }, 100); // Pequeno delay para garantir que o DOM foi atualizado
    }
  }, [messages.length, loadingState.initialLoad, loadingState.messages]);

  // ✅ CORREÇÃO: Atualizar isAtBottom quando mensagens mudam (otimizado)
  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current) {
      // ✅ OTIMIZAÇÃO: Usar requestAnimationFrame para melhor performance
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container;
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 5;
          setIsAtBottom(isNearBottom);
        }
      });
    }
  }, [messages.length]);

  // ✅ REMOVIDO: Funções duplicadas de sincronização
  // Backend agora coordena a sincronização automaticamente

  // Função para verificar se o agente AI está ativo
  const isAgentAiActive = (contact) => {
    if (!contact) return false;
    return contact.agent_state === 'ai';
  };

  // Função para obter o texto de exibição da instância selecionada
  const getSelectedInstanceText = () => {
    if (loadingState.instances) return 'Carregando...';
    if (selectedInstanceId === 'all') return 'Todas as instâncias';
    
    const selectedInstance = instances.find(instance => instance.id === selectedInstanceId);
    return selectedInstance?.agent_name || selectedInstance?.instance_name || `Instância ${selectedInstanceId}`;
  };

  // Função para selecionar uma instância
  const handleInstanceSelect = (instanceId) => {
    console.log(`[INSTANCE-SELECT] ��� Selecionando instância: ${instanceId}`);
    
    // ✅ LIMPAR CONTATO ATUAL quando instância muda
    if (currentContact) {
      console.log(`[INSTANCE-SELECT] ��� Limpando contato atual: ${currentContact.name || currentContact.push_name}`);
      setCurrentContact(null);
    }
    
    setSelectedInstanceId(instanceId);
    setDropdownOpen(false);
  };

  // Função para obter o nome da instância de um contato
  const getContactInstanceName = (contact) => {

    
    // Se já temos instance_id (quando filtrado por instância específica ou quando o contato tem instance_id)
    if (contact.instance_id) {
      const instance = instances.find(inst => inst.id === contact.instance_id);
      const result = instance?.agent_name || instance?.instance_name || null;

      return result;
    }
    
    // Se estamos vendo "todas as instâncias" e o contato não tem instance_id, usar o mapa de contatos
    if (selectedInstanceId === 'all') {
      const instanceId = contactInstances[contact.remote_jid];

      
      if (instanceId) {
        const instance = instances.find(inst => inst.id === instanceId);
        const instanceName = instance?.agent_name || instance?.instance_name || null;
        

        return instanceName;
      } else {

      }
    }
    

    return null;
  };

  // Função para formatar o nome do contato com instância (quando aplicável)
  const formatContactName = (contact) => {
    const baseName = contact.name || contact.push_name || 'Contato';
    
    // Se "Todas as instâncias" estiver selecionada, incluir nome da instância
    if (selectedInstanceId === 'all') {
      const instanceName = getContactInstanceName(contact);
      if (instanceName) {
        return { name: baseName, instanceName: instanceName };
      }
    }
    
    return { name: baseName, instanceName: null };
  };

  // Função para buscar instâncias dos contatos (SIMPLIFICADA - usar instance_id direto da tabela contacts)
  const fetchContactInstances = async (contacts) => {
    try {
      // ✅ Proteção contra execuções desnecessárias
      if (Object.keys(contactInstances).length > 0) {
        console.log('[CONTACT-INSTANCES] ⏸️ Instâncias já processadas, pulando...');
        return;
      }
      
      console.log('[CONTACT-INSTANCES] 🔍 Processando instâncias dos contatos...');
      
      const instanceMap = {};
      
      // Usar diretamente o instance_id da tabela contacts
      contacts.forEach((contact) => {
        if (contact.instance_id) {
          instanceMap[contact.remote_jid] = contact.instance_id;
          console.log(`[CONTACT-INSTANCES] Contato ${contact.name || contact.push_name} -> Instância ${contact.instance_id}`);
        }
      });

      console.log(`[CONTACT-INSTANCES] Mapa de instâncias criado:`, Object.keys(instanceMap).length, 'contatos com instância');
      
      // Verificar se há instâncias diferentes
      const uniqueInstances = [...new Set(Object.values(instanceMap))];
      
      if (uniqueInstances.length > 1) {
        console.log('[CONTACT-INSTANCES] Múltiplas instâncias detectadas, mudando para "todas as instâncias"');
        // Se ainda não estava em "all", mudar automaticamente
        if (selectedInstanceId !== 'all') {
          setSelectedInstanceId('all');
        }
      } else if (uniqueInstances.length === 1) {
        console.log('[CONTACT-INSTANCES] Uma única instância detectada');
      } else {
        console.log('[CONTACT-INSTANCES] Nenhuma instância detectada nos contatos');
      }
      
      setContactInstances(instanceMap);
      
    } catch (error) {
      console.warn('[CONTACT-INSTANCES] Erro ao processar instâncias dos contatos (não crítico):', error.message);
      setContactInstances({});
    }
  };

  // Função para buscar instâncias do usuário
  const fetchInstances = async () => {
    try {
      setLoading('instances', true);
      
      const response = await fetch('/api/whatsapp-credentials', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response?.ok) {
        if (response?.status === 401) {
          navigate('/login?error=session_expired&message=Sua sessão expirou. Por favor, faça login novamente.');
          return;
        }
        
        // Se não há credenciais (404) ou outro erro, não é crítico
        if (response?.status === 404) {
          console.log('[INSTANCES] Nenhuma credencial WhatsApp encontrada - usuário pode não ter configurado ainda');
          setInstances([]);
          return;
        }
        
        // Para outros erros, apenas logar sem quebrar a aplicação
        console.warn(`[INSTANCES] Aviso: ${response?.status || 'desconhecido'} ao buscar instâncias - continuando sem instâncias`);
        setInstances([]);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // ✅ Filtrar instâncias ativas (incluindo mais status válidos)
        const activeInstances = data.data.filter(instance => {
          // Considerar instâncias com status válidos para uso
          const validStatuses = ['connected', 'open', 'pending', 'ready'];
          const isActive = validStatuses.includes(instance.status);
          
          return isActive;
        });
        
        setInstances(activeInstances);
        
        if (activeInstances.length > 0) {
          console.log(`✅ ${activeInstances.length} instância(s) WhatsApp encontrada(s)`);
        } else {
          console.log('[INSTANCES] Nenhuma instância ativa encontrada');
          setInstances([]);
        }
      } else {
        console.log('[INSTANCES] Resposta da API sem dados de instâncias');
        setInstances([]);
      }
    } catch (error) {
      console.warn('[INSTANCES] Erro ao buscar instâncias (não crítico):', error.message);
      setInstances([]);
      // Não mostrar erro para não interferir na UX se não houver instâncias
    } finally {
      setLoading('instances', false);
    }
  };

  // ✅ REMOVIDO: Função de sincronização duplicada
  // Backend agora coordena a sincronização automaticamente

  // Função otimizada para buscar contatos com paginação
  const fetchContacts = async (instanceId = null, page = 1, reset = true) => {
    try {
      if (reset) {
          setLoading('contacts', true);
        setError(null);
          setPagination('contactsPage', 1);
          setPagination('hasMoreContacts', true);
      } else {
          setLoading('moreContacts', true);
      }
      
      const instanceFilter = instanceId && instanceId !== 'all' ? instanceId : null;
      console.log(`[CONTACTS] Buscando página ${page} (${CONTACTS_PER_PAGE} contatos)${instanceFilter ? ` - instância: ${instanceFilter}` : ' - todas'}`);
      
      // Construir URL da API com paginação e filtro de instância
      let apiUrl = `/api/contacts?page=${page}&limit=${CONTACTS_PER_PAGE}`;
      if (instanceFilter) {
        apiUrl += `&instance=${instanceFilter}`;
        const instanceName = instances.find(i => i.id === instanceFilter)?.agent_name || 'Desconhecida';
        console.log(`[CONTACTS] 🔍 Filtrando por instância: ${instanceName} (${instanceFilter})`);
      }
      
        const startTime = Date.now();
      const response = await fetch(apiUrl, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login?error=session_expired&message=Sua sessão expirou. Por favor, faça login novamente.');
            return;
          }
          
          // Se não há contatos (404) ou outro erro, não é crítico
          if (response.status === 404) {
            console.log('[CONTACTS] Nenhum contato encontrado - pode ser primeiro acesso');
            setContacts([]);
            setDisplayContacts([]);
            setPagination('hasMoreContacts', false);
            return;
          }
          
          const errorData = await response.json();
          if (response.status === 500 && instanceFilter) {
            console.error(`[CONTACTS] ❌ Erro 500 para instância ${instanceFilter}: ${errorData.message}`);
            throw new Error(`Erro ao filtrar por instância "${instanceFilter}": ${errorData.message}`);
          }
          throw new Error(errorData.message || `Erro ${response.status} ao buscar contatos`);
        }
        
        const data = await response.json();
        const duration = Date.now() - startTime;
        
              // Página carregada com sucesso
        
        if (!data.success) {
          throw new Error(data.message || 'Erro ao buscar contatos');
        }
        
        const contactsList = data.contacts || [];
        // ✅ Sanitizar contatos para corrigir dados inconsistentes
        const sanitizedContacts = contactsList.map(sanitizeContact).filter(Boolean);
        // ✅ Backend já coordena a sincronização automaticamente
        const hasMore = data.hasMore || sanitizedContacts.length === CONTACTS_PER_PAGE;
      
        if (sanitizedContacts.length > 0) {
          // Buscar última mensagem para exibição (não para ordenação)
        const contactsWithLastMessagePromises = sanitizedContacts.map(async (contact) => {
          try {
            const messagesResponse = await fetch(`/api/chat/messages/${contact.remote_jid}/last`, {
              credentials: 'include'
            });
            
            if (messagesResponse.ok) {
              const messageData = await messagesResponse.json();
              if (messageData.success && messageData.message) {
                return {
                  ...contact,
                  last_message_time: messageData.message.timestamp || messageData.message.created_at,
                  last_message: messageData.message.content
                };
              }
            }
          } catch (error) {
              // Silenciar erros individuais
          }
          
          // ✅ GARANTIR ESTRUTURA CONSISTENTE: Sempre retornar contato com campos padronizados
          return {
            ...contact,
            last_message: contact.last_message || '', // Garantir que sempre existe
            last_message_time: contact.last_message_time || contact.updated_at || contact.created_at || null
          };
        });
        
        const contactsWithLastMessages = await Promise.all(contactsWithLastMessagePromises);
        
          // Backend já ordena por update_at - manter ordem original
          const sortedContacts = contactsWithLastMessages;
          

        
        if (reset) {
          // Primeira carga - substituir lista
          setContacts(sortedContacts);
          
          // Buscar instâncias apenas da primeira página
          if (instances.length > 0) {
            console.log('[CONTACTS] 🔍 Buscando instâncias dos contatos carregados...');
            fetchContactInstances(sortedContacts);
          } else {
            console.log('[CONTACTS] ⏸️ Nenhuma instância disponível - primeiro acesso');
          }
          
          // ✅ PROTEÇÃO CRÍTICA: Não sobrescrever contato durante carregamento inicial
          if (!isMobileView && sortedContacts.length > 0 && !isInitialLoad && !currentContact) {
            const firstContact = sortedContacts[0];
            setCurrentContact(firstContact);
            console.log('[CONTACTS] ✅ Contato auto-selecionado:', firstContact.push_name || firstContact.name);
            
            // ✅ CORREÇÃO: Marcar como carregamento inicial para ativar ancoragem automática
            setLoading('initialLoad', true);
            
            // ✅ CORREÇÃO: Carregar mensagens do contato auto-selecionado
            if (firstContact?.remote_jid) {
              console.log('[CONTACTS] 📩 Carregando mensagens do contato auto-selecionado:', firstContact.remote_jid);
              fetchMessages(firstContact.remote_jid, 1, true);
            }
          } else if (isInitialLoad) {
            console.log('[CONTACTS] ⚠️ Bloqueada auto-seleção durante carregamento inicial');
          } else if (currentContact) {
            console.log('[CONTACTS] ⚠️ Bloqueada auto-seleção - contato já selecionado:', currentContact.push_name || currentContact.name);
          } else if (sortedContacts.length === 0) {
            console.log('[CONTACTS] ⏸️ Nenhum contato encontrado - primeiro acesso');
          }
        } else {
          // Carregamento adicional - anexar à lista existente (backend já ordena)
          setContacts(prevContacts => {
            const newContacts = [...prevContacts, ...sortedContacts];
            const uniqueContacts = newContacts.filter((contact, index, self) => 
              index === self.findIndex(c => c.remote_jid === contact.remote_jid)
            );
            return uniqueContacts; // Backend já ordena por update_at
          });
          
          // A ordenação será aplicada automaticamente pelo useEffect único
          
          // Buscar instâncias dos novos contatos
          if (instances.length > 0) {
            console.log('[CONTACTS] 🔍 Buscando instâncias dos novos contatos...');
            fetchContactInstances(sortedContacts);
          } else {
            console.log('[CONTACTS] ⏸️ Nenhuma instância disponível - primeiro acesso');
          }
        }
        
        setPagination('hasMoreContacts', hasMore);
        setPagination('contactsPage', page);
        
                } else {
        if (reset) {
          if (instanceFilter) {
            console.log(`[CONTACTS] ✅ Nenhum contato encontrado para a instância "${instanceFilter}"`);
            console.log(`[CONTACTS] 💡 Esta instância não possui conversas ativas ainda`);
          } else {
            console.log('[CONTACTS] Nenhum contato encontrado');
          }
          setContacts([]);
          setDisplayContacts([]);
        }
        setPagination('hasMoreContacts', false);
        }
      } catch (error) {
      console.error('[CONTACTS] Erro ao buscar contatos:', error);
        // ✅ Usar tratamento robusto de erro
        handleNetworkError(error, 'buscar contatos');
      } finally {
        setLoading('contacts', false);
        setLoading('moreContacts', false);
    }
  };

  // ✅ REMOVIDO: useEffect para buscar instâncias - será refeito

  // ✅ REMOVIDO: useEffect para recarregar contatos - será refeito

  // ✅ REMOVIDO: useEffect para buscar instâncias dos contatos - será refeito

  // ✅ Handler de scroll para contatos com debounce
  const handleContactsScrollImmediate = (e) => {
    const container = e.target;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    // ✅ Detectar quando está próximo do final (100px do bottom)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    if (isNearBottom && hasMoreContacts && !isLoadingMoreContacts && currentUser) {
      console.log('[CONTACTS] 🔄 Próximo ao final da lista - carregando mais contatos');
      loadMoreContacts();
    }
  };
  
  const handleContactsScrollDebounced = (e) => {
    // ✅ Ações pesadas com debounce se necessário
    // Por enquanto não há ações pesadas para contatos
  };
  
  const handleContactsScroll = (e) => {
    // ✅ Executar ações imediatas
    handleContactsScrollImmediate(e);
    
    // ✅ Debounce para ações pesadas (150ms)
    if (contactsScrollTimeoutRef.current) {
      clearTimeout(contactsScrollTimeoutRef.current);
    }
    
    contactsScrollTimeoutRef.current = setTimeout(() => {
      handleContactsScrollDebounced(e);
    }, 150);
  };

  // Função para carregar mais contatos (scroll infinito)
  const loadMoreContacts = () => {
    if (!isLoadingMoreContacts && hasMoreContacts && currentUser) {
      const nextPage = contactsPage + 1;
      console.log(`[CONTACTS] 📄 Carregando mais contatos - página ${nextPage}`);
      fetchContacts(selectedInstanceId === 'all' ? null : selectedInstanceId, nextPage, false);
    }
  };

  // Função para carregar mensagens antigas (scroll infinito)
  const loadMoreMessages = () => {
    console.log('[SCROLL-INFINITO] 🔄 Tentativa de carregar mais mensagens:', {
      isLoadingMoreMessages,
      hasMoreMessages,
      currentContact: currentContact?.remote_jid,
      messagesPage,
      allowInfiniteScroll
    });
    
    if (!isLoadingMoreMessages && hasMoreMessages && currentContact) {
      setLoading('moreMessages', true);
      const nextPage = messagesPage + 1;
      console.log(`[SCROLL-INFINITO] ✅ Carregando página ${nextPage} de mensagens antigas`);
      fetchMessages(currentContact.remote_jid, nextPage, false);
    } else {
      console.log('[SCROLL-INFINITO] ❌ Condições não atendidas para carregar mais mensagens');
    }
  };

  // ✅ Função UNIFICADA para scroll com opções flexíveis
  const scrollToPosition = (position = 'bottom', options = {}) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const { immediate = false, smooth = false, duringInitialLoad = false } = options;
    
    // ✅ CORREÇÃO: Permitir scroll manual sempre, só bloquear durante carregamento inicial se não for explícito
    if (!duringInitialLoad && isInitialLoad && !immediate) return;
    
    if (position === 'bottom') {
      const maxScroll = container.scrollHeight - container.clientHeight;
      
      if (immediate) {
        // ✅ Scroll instantâneo sem animação (comportamento original de scrollToBottom)
        container.scrollTop = maxScroll;
      } else if (smooth) {
        // ✅ Scroll suave (opção nova)
        container.scrollTo({ top: maxScroll, behavior: 'smooth' });
      } else {
        // ✅ Scroll padrão (comportamento original de forceScrollToEnd)
        container.scrollTop = maxScroll;
      }
      
      // ✅ Manter comportamentos originais
      setIsAtBottom(true);
      setUnreadCount(0);
    }
  };

  // ✅ Função para scroll INSTANTÂNEO para o final (mensagens recentes) - MANTIDA PARA COMPATIBILIDADE
  const scrollToBottom = () => {
    scrollToPosition('bottom', { immediate: true });
  };

  // ✅ Função com debounce para scroll - MANTIDA PARA COMPATIBILIDADE
  const debouncedScrollToEnd = debounce(() => {
    scrollToPosition('bottom', { immediate: true });
  }, 100);

  // ✅ Função para forçar ancoragem no final - MANTIDA PARA COMPATIBILIDADE
  const forceScrollToEnd = () => {
    scrollToPosition('bottom', { immediate: true });
    return () => scrollToPosition('bottom', { immediate: true });
  };

  // ✅ SEGURANÇA: Função utilitária para sanitizar mensagens do banco (corrige dados inconsistentes)
  const sanitizeMessage = (msg) => {
    if (!msg || typeof msg !== 'object') return null;
    
    // ✅ Corrigir role NULL ou inválido (Bug encontrado: 5 mensagens com role NULL)
    let role = msg.role;
    if (!role || !['ME', 'AI', 'USER'].includes(role)) {
      // Determinar role baseado em sender_id vs recipient_id
      role = msg.sender_id === currentUser?.id ? 'ME' : 'USER';
      console.warn(`[SANITIZE] Mensagem ${msg.id} tinha role inválido "${msg.role}", corrigido para "${role}"`);
    }
    
    // ✅ SEGURANÇA: Sanitizar conteúdo da mensagem
    const sanitizedContent = sanitizeContent(msg.content || '');
    
    // ✅ Garantir que propriedades essenciais existam
    return {
      ...msg,
      id: msg.id || `temp-${Date.now()}-${Math.random()}`,
      role: role,
      content: sanitizedContent,
      created_at: msg.created_at || msg.timestamp || new Date().toISOString(),
      is_read: msg.is_read ?? false,
      temp: msg.temp || false
    };
  };

  // ✅ Função utilitária para sanitizar contatos
  const sanitizeContact = (contact) => {
    if (!contact || typeof contact !== 'object') return null;
    
    return {
      ...contact,
      remote_jid: contact.remote_jid || contact.id || '',
      name: contact.name || contact.push_name || 'Contato',
      phone: contact.phone || (contact.remote_jid || '').split('@')[0] || '',
      instance_id: contact.instance_id || null,
      lead_id: contact.lead_id || null
    };
  };

  // ✅ SEGURANÇA: Função utilitária para validar entrada do usuário (usando a versão global)
  const validateUserInputLocal = (input, type = 'message') => {
    return validateUserInput(input, type);
  };

  // ✅ SEGURANÇA: Função para tratamento robusto de erros de rede
  const handleNetworkError = (error, context = 'operação') => {
    console.error(`[NETWORK ERROR] ${context}:`, error);
    
    // ✅ SEGURANÇA: Verificar se é erro de autenticação
    if (error.message?.includes('401') || error.message?.includes('403')) {
      setError('Sessão expirada. Redirecionando para login...');
      setTimeout(() => {
        window.location.href = '/login?error=session_expired';
      }, 2000);
      return;
    }
    
    // ✅ UX: Não mostrar erros para casos onde não há credenciais (primeiro acesso)
    if (error.message?.includes('404') && (context.includes('contatos') || context.includes('instâncias'))) {
      console.log(`[NETWORK] ${context} - 404 (primeiro acesso, não é erro)`);
      return; // Não mostrar erro para primeiro acesso
    }
    
    if (!navigator.onLine) {
      setError('Sem conexão com a internet. Verifique sua conexão.');
      return;
    }
    
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      setError('Erro de conexão com o servidor. Tente novamente.');
      return;
    }
    
    if (error.message?.includes('JSON')) {
      setError('Resposta inválida do servidor. Tente atualizar a página.');
      return;
    }
    
    // ✅ SEGURANÇA: Não expor detalhes internos do erro
    const userFriendlyMessage = error.message?.includes('security') || error.message?.includes('validation') 
      ? 'Dados inválidos ou não permitidos'
      : `Erro na ${context}. Tente novamente.`;
    
    setError(userFriendlyMessage);
  };

  // ✅ Detectar posição do scroll com debounce otimizado para performance
  
  const handleScrollImmediate = (e) => {
    const container = e.target;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    // ✅ Ações IMEDIATAS (não podem ter delay)
    // ✅ CORREÇÃO: Detecção mais precisa do final (tolerância de 5px)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 5;
    
    // ✅ OTIMIZAÇÃO: Só atualizar estado se mudou (evita re-renders desnecessários)
    if (isAtBottom !== isNearBottom) {
      setIsAtBottom(isNearBottom);
    }
    
    // Resetar contador imediatamente se no final
    if (isNearBottom && unreadCount > 0) {
      setUnreadCount(0);
    }
  };
  
  const handleScrollDebounced = (e) => {
    const container = e.target;
    const { scrollTop } = container;
    
    // ✅ CORREÇÃO: Log de debug para scroll infinito
    console.log('[SCROLL-DEBUG] 🎯 Scroll debounced:', {
      scrollTop,
      hasMoreMessages,
      isLoadingMoreMessages,
      allowInfiniteScroll,
      isInitialLoad,
      currentContactId: currentContact?.remote_jid
    });
    
    // ✅ Ações PESADAS com debounce (podem ter delay)
    // Carregar mensagens antigas só após parar de rolar
    // ✅ MÚLTIPLAS PROTEÇÕES: Evitar conflitos com ancoragem
    if (scrollTop < 100 && 
        hasMoreMessages && 
        !isLoadingMoreMessages && 
        allowInfiniteScroll && 
        !isInitialLoad &&
        currentContact?.remote_jid) {
      
      console.log('[SCROLL-DEBUG] ✅ Todas as condições atendidas - chamando loadMoreMessages');
      loadMoreMessages();
    } else {
      console.log('[SCROLL-DEBUG] ❌ Condições não atendidas para scroll infinito');
    }
  };
  
  const handleScroll = (e) => {
    // ✅ Executar ações imediatas
    handleScrollImmediate(e);
    
    // ✅ OTIMIZAÇÃO: Debounce mínimo apenas para scroll infinito (10ms)
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      handleScrollDebounced(e);
    }, 10);
  };

  // ✅ OTIMIZAÇÃO: Função memoizada para verificar separador de data
  const shouldShowDateSeparator = useCallback((currentMsg, previousMsg) => {
    if (!previousMsg) return true; // Primeira mensagem sempre mostra data
    
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const previousDate = new Date(previousMsg.created_at).toDateString();
    return currentDate !== previousDate;
  }, []);



  // Função para formatar data do separador
  const formatDateSeparator = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  // Função aprimorada para buscar mensagens com scroll infinito
  const fetchMessages = async (contactId, page = 1, reset = true) => {
    if (!contactId) return;
    
    console.log('[FETCH-MSGS] 📨 Carregando mensagens:', { contactId, page, reset });
    
    try {
      if (reset) {
        console.log('[FETCH-MSGS] 🔄 RESETANDO estado das mensagens');
        // ✅ Estados básicos para reset (sem duplicações)
        setMessages([]);
          setPagination('messagesPage', 1);
          setPagination('hasMoreMessages', true);
        setUnreadCount(0);
                 // ✅ CORREÇÃO: NÃO resetar lastStatusUpdate para preservar polling
         // setLastStatusUpdate('1970-01-01T00:00:00Z');
      } else {
        console.log('[FETCH-MSGS] ➕ Adicionando mensagens sem reset');
      }
      
      const response = await fetch(`/api/chat/messages/${contactId}?page=${page}&limit=${MESSAGES_PER_PAGE}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status} ao buscar mensagens`);
      }
      
      const data = await response.json();
      
      if (data.success && data.messages) {
        const newMessages = data.messages;
        const hasMore = data.hasMore || newMessages.length === MESSAGES_PER_PAGE;
        
        // Atualizar estado de paginação
        setPagination('hasMoreMessages', hasMore);
        setPagination('messagesPage', page);
        
        if (reset) {
          // Primeira carga - reverter para ordem cronológica (antigas → recentes)
          // para exibir como chat tradicional (mensagens recentes no final da tela)
          const chronologicalMessages = [...newMessages].reverse();
          // ✅ Sanitizar mensagens para corrigir dados inconsistentes do banco
          const sanitizedMessages = chronologicalMessages.map(sanitizeMessage).filter(Boolean);
          setMessages(sanitizedMessages);
          
          // ✅ Estados atualizados ANTES da ancoragem
          setIsAtBottom(true);
          
          // ✅ CRÍTICO: Garantir que loading de mensagens seja false ANTES da ancoragem
          setLoading('messages', false);
          
          // ✅ CORREÇÃO: Definir initialLoad para ativar ancoragem automática
          setLoading('initialLoad', true);
          
          // ✅ SCROLL AUTOMÁTICO: Ancorar no final após carregar mensagens iniciais
          setTimeout(() => {
            scrollToPosition('bottom', { immediate: true, duringInitialLoad: true });
            console.log('[FETCH-MSGS] 📜 Scroll automático para o final após carregamento inicial');
          }, 100);
          
        } else {
          // Carregamento adicional - inserir mensagens antigas no INÍCIO
          const container = messagesContainerRef.current;
          const oldScrollHeight = container?.scrollHeight || 0;
          
          setMessages(prevMessages => {
            // ✅ Sanitizar novas mensagens antes de combinar
            const sanitizedNewMessages = newMessages.map(sanitizeMessage).filter(Boolean);
            // newMessages vem em ordem reversa (mais recente primeiro) para inserir no topo
            const combinedMessages = [...sanitizedNewMessages, ...prevMessages];
            // Remover duplicatas baseado no ID
            const uniqueMessages = combinedMessages.filter((msg, index, self) => 
              index === self.findIndex(m => m.id === msg.id)
            );
            return uniqueMessages;
          });
          
          // ✅ Preservar posição do scroll após carregar mensagens antigas (com cleanup)
          const preserveScrollTimeoutId = setTimeout(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              // ✅ Usar função unificada para preservar posição
              container.scrollTop += (newScrollHeight - oldScrollHeight);
            }
          }, 50);
          timeoutsRef.current.push(preserveScrollTimeoutId); // ✅ Gerenciar cleanup
        }
        
              } else {
          if (reset) {
            setMessages([]);
            setPagination('hasMoreMessages', false);
            setIsAtBottom(true);
            setLoading('initialLoad', false); // ✅ Resetar estado (sem mensagens)
          }
        }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      // ✅ Usar tratamento robusto de erro
      handleNetworkError(error, 'buscar mensagens');
      // ✅ Resetar estado em caso de erro
      if (reset) {
        setLoading('initialLoad', false); // ✅ Resetar estado
        }
      } finally {
      setLoading('moreMessages', false);
    }
  };



  // ✅ REMOVIDO: useEffect para buscar contatos - será refeito

  // ✅ REMOVIDO: useEffect para sincronização - será refeito



  // Removido: useEffect de limpeza desnecessário que interferia com auto scroll

  // ✅ REMOVIDO: useEffect complexo para mensagens - será refeito
  // ✅ REMOVIDO: Código complexo de polling - será refeito
  // ✅ REMOVIDO: Todo o código complexo de polling - será refeito

  // ✅ REMOVIDO: useEffect de ancoragem - será refeito
      
  // ✅ REMOVIDO: Todo o código de ancoragem - será refeito









  // ✅ Função para sincronização MANUAL de contatos (botão) - UX OTIMIZADA
  const syncContactsManual = async () => {
    if (!currentUser?.id) return;
    
    try {
      // ✅ UX: Mostrar feedback visual mínimo apenas no botão
      setLoading('syncing', true);
      console.log('[SYNC-MANUAL] 🔄 Sincronização manual silenciosa iniciada...');
      
      // ✅ UX: Sincronização sempre executa em background sem interferir na interface
      await syncContactsInternal();
      
    } catch (error) {
      console.error('[SYNC-MANUAL] ❌ Erro na sincronização manual:', error);
      // ✅ UX: Apenas mostrar erro real, não bloquear interface
      setError('Erro na sincronização. Tente novamente.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading('syncing', false);
    }
  };

  // ✅ Função para sincronização AUTOMÁTICA de contatos (polling) - NÃO afeta histórico de mensagens
  const syncContacts = async () => {
    if (!currentUser?.id) return;
    
    try {
      console.log('[SYNC-AUTO] 🔄 Sincronização automática iniciada...');
      
      // ✅ CORREÇÃO: Permitir sincronização mesmo com contato selecionado
      if (currentContact && messages.length > 0) {
        console.log('[SYNC-AUTO] 🔄 Sincronização automática com contato selecionado - atualizando contatos em background');
      }
      
      // ✅ Usar função interna para sincronização
      await syncContactsInternal();
      
    } catch (error) {
      console.error('[SYNC-AUTO] ❌ Erro na sincronização automática:', error);
    }
  };

  // ✅ Função INTERNA para sincronização de contatos (UX OTIMIZADA)
  const syncContactsInternal = async () => {
    // ✅ UX: Sincronização silenciosa - não bloquear interface
    console.log('[SYNC-INTERNAL] 🔄 Sincronização silenciosa em background...');
    
    // ✅ UX: Buscar apenas atualizações incrementais
      const contactsResponse = await fetch(`/api/contacts?page=1&limit=${CONTACTS_PER_PAGE}`, {
        credentials: 'include'
      });
      
      if (!contactsResponse.ok) {
        throw new Error(`Erro ${contactsResponse.status} ao buscar contatos`);
      }
      
      const contactsData = await contactsResponse.json();
      
      if (!contactsData.success) {
        throw new Error(contactsData.message || 'Erro ao buscar contatos');
      }
      
      const contactsList = contactsData.contacts || [];
      
      if (contactsList.length > 0) {
        // Buscar última mensagem dos primeiros contatos para exibição (otimizado)
        const contactsWithLastMessagePromises = contactsList.slice(0, 5).map(async (contact) => {
          try {
            const messagesResponse = await fetch(`/api/chat/messages/${contact.remote_jid}/last`, {
              credentials: 'include'
            });
            
            if (messagesResponse.ok) {
              const messageData = await messagesResponse.json();
              if (messageData.success && messageData.message) {
                return {
                  ...contact,
                  last_message_time: messageData.message.timestamp || messageData.message.created_at,
                  last_message: messageData.message.content
                };
              }
            }
          } catch (error) {
            // Silenciar erros
          }
          
          // ✅ GARANTIR ESTRUTURA CONSISTENTE: Sempre retornar contato com campos padronizados
          return {
            ...contact,
            last_message: contact.last_message || '', // Garantir que sempre existe
            last_message_time: contact.last_message_time || contact.updated_at || contact.created_at || null
          };
        });
        
        const updatedContacts = await Promise.all(contactsWithLastMessagePromises);
        
        // Atualizar apenas os contatos que mudaram
        setContacts(prevContacts => {
          const newContacts = [...prevContacts];
          
          updatedContacts.forEach(updatedContact => {
            const existingIndex = newContacts.findIndex(c => c.remote_jid === updatedContact.remote_jid);
            if (existingIndex >= 0) {
              // Verificar se houve mudança real
              const existing = newContacts[existingIndex];
              if (existing.last_message_time !== updatedContact.last_message_time ||
                  existing.last_message !== updatedContact.last_message) {
                newContacts[existingIndex] = updatedContact;
              }
            } else {
              // Novo contato
              newContacts.unshift(updatedContact);
            }
          });
          
          // Backend já ordena por update_at (sincronizado)
          return newContacts;
        });
        
        // A ordenação será aplicada automaticamente pelo useEffect único
        
        // 🔧 CORREÇÃO: Buscar instâncias dos contatos atualizados
        if (instances.length > 0 && updatedContacts.length > 0) {
          console.log('[SYNC] 🔍 Buscando instâncias dos contatos atualizados...');
          fetchContactInstances(updatedContacts);
        } else if (instances.length === 0) {
          console.log('[SYNC] ⏸️ Nenhuma instância disponível - primeiro acesso');
        }
        
      // ✅ UX: Atualizar metadados do contato atual silenciosamente (sem reset)
        if (currentContact) {
          const updatedCurrentContact = contactsList.find(c => c.remote_jid === currentContact.remote_jid);
          if (updatedCurrentContact) {
          // ✅ UX: Atualizar apenas metadados, preservar estado da conversa
          setCurrentContact(prev => ({
            ...prev,
            ...updatedCurrentContact,
            // Preservar dados críticos para não quebrar a experiência
            last_message_time: prev.last_message_time || updatedCurrentContact.last_message_time,
            last_message: prev.last_message || updatedCurrentContact.last_message
          }));
          }
        }
      }
      
      setLastSyncTime(new Date());
    console.log('[SYNC-INTERNAL] ✅ Sincronização interna concluída');
  };

  // Função para sincronização completa das mensagens (equivalente ao refresh)
  const syncMessagesComplete = async () => {
    if (!currentContact?.remote_jid) return;
    
    console.log('[SYNC] 🔄 Iniciando sincronização completa das mensagens');
    
    try {
      // ✅ CORREÇÃO: Desabilitar polling temporariamente para evitar conflitos
      const wasPollingEnabled = !isInitialLoad;
      setLoading('initialLoad', true); // Desabilita polling
      
      // ✅ CORREÇÃO: Marcar que estamos sincronizando para evitar conflitos
      setLoading('syncing', true);
      
      // ✅ CORREÇÃO: Preservar estado das mensagens existentes
      const existingMessages = messages.length > 0 ? [...messages] : [];
      console.log('[SYNC] 💾 Preservando', existingMessages.length, 'mensagens existentes');
      
      // Resetar apenas paginação, não as mensagens
      setPagination('messagesPage', 1);
      setPagination('hasMoreMessages', true);
      setUnreadCount(0);
      // ✅ CORREÇÃO: NÃO resetar lastStatusUpdate para preservar polling
      // setLastStatusUpdate('1970-01-01T00:00:00Z');
      setLoading('messages', true);
      
      // ✅ CORREÇÃO: Recarregar mensagens SEM resetar histórico
      await fetchMessages(currentContact.remote_jid, 1, false);
      
      console.log('[SYNC] 📊 Estado após fetchMessages:', {
        messagesLength: messages.length,
        isLoading: isLoading,
        isInitialLoad: isInitialLoad
      });
      
      // ✅ CORREÇÃO: Forçar scroll após renderização das mensagens
      console.log('[SYNC] ⏳ Aguardando renderização das mensagens...');
      
      // Aguardar renderização completa do DOM com múltiplas tentativas
      const waitForRender = () => {
        const container = messagesContainerRef.current;
        if (container && container.scrollHeight > 0 && messages.length > 0) {
          console.log('[SYNC] ✅ Mensagens renderizadas, executando scroll...');
          
          // Forçar recálculo de layout
          container.offsetHeight;
          
          // ✅ Scroll para o final usando função unificada
          scrollToPosition('bottom', { immediate: true, duringInitialLoad: true });
          
          console.log('[SYNC] 📊 Scroll executado:', {
            scrollTop: container.scrollTop,
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight,
            messagesLength: messages.length,
            isAtEnd: Math.abs(container.scrollTop - (container.scrollHeight - container.clientHeight)) < 5
          });
          
          // Verificação adicional após um pequeno delay
          setTimeout(() => {
            const isAtEnd = Math.abs(container.scrollTop - (container.scrollHeight - container.clientHeight)) < 5;
            if (!isAtEnd) {
              // ✅ Usar função unificada para scroll forçado
              scrollToPosition('bottom', { immediate: true, duringInitialLoad: true });
              console.log('[SYNC] ✅ Scroll forçado para o final após verificação');
            } else {
              console.log('[SYNC] ✅ Scroll já está no final');
            }
          }, 50);
          
          // ✅ CORREÇÃO: Reabilitar polling após scroll (se estava habilitado antes)
          setTimeout(() => {
            if (wasPollingEnabled) {
          setLoading('initialLoad', false);
              console.log('[SYNC] ✅ Polling reabilitado após sincronização');
            }
          }, 100);
        } else {
          console.log('[SYNC] ⏳ Aguardando renderização...', {
            containerExists: !!container,
            scrollHeight: container?.scrollHeight || 0,
            messagesLength: messages.length
          });
          setTimeout(waitForRender, 100); // Tentar novamente em 100ms
        }
      };
      
      // Iniciar processo de espera
      setTimeout(waitForRender, 200);
      
      console.log('[SYNC] ✅ Sincronização completa concluída');
    } catch (error) {
      console.error('[SYNC] ❌ Erro na sincronização completa:', error);
      // ✅ CORREÇÃO: Reabilitar polling em caso de erro
              setLoading('initialLoad', false);
    } finally {
      setLoading('messages', false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Buscar usuário novamente
      const userData = await fetchUserFromApi();
      
      if (!userData || !userData.id) {
        throw new Error('Não foi possível obter dados do usuário');
      }
      
      setCurrentUser(userData);
      
      // Buscar contatos novamente
      const contactsResponse = await fetch('/api/contacts', {
        credentials: 'include'
      });
      
      if (!contactsResponse.ok) {
        throw new Error(`Erro ${contactsResponse.status} ao buscar contatos`);
      }
      
      const contactsData = await contactsResponse.json();
      
      if (!contactsData.success) {
        throw new Error(contactsData.message || 'Erro ao buscar contatos');
      }
      
      // Extrair a lista de contatos do objeto de resposta
      const contactsList = contactsData.contacts || [];
      
      if (contactsList.length > 0) {
        setContacts(contactsList);
        
        // ✅ PROTEÇÃO CRÍTICA: Não sobrescrever contato durante carregamento inicial
        if (!isMobileView && !currentContact && !isInitialLoad && contactsList.length > 0) {
          const firstContact = contactsList[0];
          setCurrentContact(firstContact);
          console.log('[REFRESH] ✅ Contato auto-selecionado:', firstContact.push_name || firstContact.name);
          
          // ✅ CORREÇÃO: Marcar como carregamento inicial para ativar ancoragem automática
          setLoading('initialLoad', true);
          
          // ✅ CORREÇÃO: Carregar mensagens do contato auto-selecionado
          if (firstContact?.remote_jid) {
            console.log('[REFRESH] 📩 Carregando mensagens do contato auto-selecionado:', firstContact.remote_jid);
            fetchMessages(firstContact.remote_jid, 1, true);
          }
        } else if (isInitialLoad) {
          console.log('[REFRESH] ⚠️ Bloqueada auto-seleção durante carregamento inicial');
        } else if (contactsList.length === 0) {
          console.log('[REFRESH] ⏸️ Nenhum contato encontrado - primeiro acesso');
        }
      }
      
      setConnectionStatus({
        connected: true,
        timestamp: new Date().toISOString(),
        refreshed: true
      });
      
      console.log('Dados recarregados com sucesso');
    } catch (error) {
      console.error('Erro ao recarregar dados:', error);
      setError(`Erro ao recarregar dados: ${error.message}. Por favor, tente novamente.`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ✅ SIMPLIFICADO: Função para alternar a resposta automática para um contato
  const toggleAutoResponse = async (contactId, e) => {
    e.stopPropagation(); // Evita que o clique ative a seleção do contato
    
    // Encontrar o contato na lista
    const contactIndex = contacts.findIndex(c => {
      const cId = c.id || c.remote_jid;
      return cId === contactId;
    });
    
    if (contactIndex === -1) {
      console.error(`Contato não encontrado com ID: ${contactId}`);
      return;
    }
    
    const contact = contacts[contactIndex];
    
    // Determinar o estado atual e o novo estado
    const currentState = contact.agent_state === 'ai';
    const newAgentState = currentState ? 'human' : 'ai';
    
    // ✅ SIMPLIFICADO: Atualizar apenas agent_state - backend coordena sincronização
    const newContacts = [...contacts];
    newContacts[contactIndex] = {
      ...contact,
      agent_state: newAgentState
    };
    setContacts(newContacts);
    
    // A ordenação será aplicada automaticamente pelo useEffect único
    
    // Se for o contato atual, atualize-o também
    if (currentContact && (currentContact.id === contactId || currentContact.remote_jid === contactId)) {
      const updatedCurrentContact = {
        ...currentContact,
        agent_state: newAgentState
      };
      setCurrentContact(updatedCurrentContact);
    }
    
    try {
      // Extrair o remote_jid correto para a chamada de API
      const remoteJid = contact.remote_jid || contactId;
      
      // ✅ SIMPLIFICADO: Enviar apenas agent_state - backend coordena sincronização
      const response = await fetch(`/api/contacts/${remoteJid}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          agent_state: newAgentState
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro na resposta da API (${response.status}):`, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `Erro ${response.status} ao atualizar estado do agente`);
        } catch (e) {
          throw new Error(`Erro ${response.status} ao atualizar estado do agente: ${errorText}`);
        }
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao atualizar estado do agente');
      }
      
      console.log(`Estado do agente atualizado com sucesso para: ${newAgentState}`);
      
    } catch (error) {
      console.error('Erro ao atualizar estado do agente na API:', error);
      
      // Em caso de erro na API, reverte a mudança local
      const revertedContacts = [...contacts];
      revertedContacts[contactIndex] = {
        ...contact,
        agent_state: currentState ? 'ai' : 'human'
      };
      setContacts(revertedContacts);
      
      // A ordenação será aplicada automaticamente pelo useEffect único
      
      // Se for o contato atual, reverta-o também
      if (currentContact && (currentContact.id === contactId || currentContact.remote_jid === contactId)) {
        setCurrentContact({
          ...currentContact,
          agent_state: currentState ? 'ai' : 'human'
        });
      }
      
      // Notificar o usuário sobre o erro
      setError(`Erro ao atualizar estado do agente: ${error.message}`);
    }
  };

  // ✅ SEGURANÇA: Função processadora de envio de mensagens - separada para poder aplicar debounce
  const processSendMessage = async (messageContent, messageId) => {
    // ✅ SEGURANÇA: Verificar sessão antes de enviar
    const sessionValid = await checkSession();
    if (!sessionValid) {
      setError('Sessão expirada. Redirecionando para login...');
      return;
    }
    
    // ✅ SEGURANÇA: Validação robusta de entrada
    const validation = validateUserInput(messageContent, 'message');
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    
    // ✅ SEGURANÇA: Validar estado do usuário e contato
    const userValidation = validateState(currentUser, 'user');
    const contactValidation = validateState(currentContact, 'contact');
    
    if (!userValidation.valid) {
      setError(`Erro de estado: ${userValidation.error}`);
      return;
    }
    
    if (!contactValidation.valid) {
      setError(`Erro de estado: ${contactValidation.error}`);
      return;
    }
    
    const sanitizedContent = validation.value;
    
    // ✅ SEGURANÇA: Verificar se é a mesma mensagem sendo enviada novamente em um curto período
    if (lastMessageIdRef.current === messageId) {
      console.log('Ignorando envio duplicado com mesmo ID:', messageId);
      return;
    }
    
    // ✅ SEGURANÇA: Rate limiting robusto
    if (!rateLimiter.canMakeRequest()) {
      const remaining = rateLimiter.getRemainingRequests();
      setError(`Muitas requisições. Aguarde um momento. (${remaining} restantes)`);
      return;
    }
    
    const now = Date.now();
    if (now - lastMessageTimestamp < SECURITY_CONFIG.RATE_LIMIT_DELAY) {
      console.log('Ignorando clique rápido:', now - lastMessageTimestamp, 'ms desde o último envio');
      setError('Aguarde um momento antes de enviar outra mensagem');
      return;
    }
    
    try {
      // ✅ SEGURANÇA: Registrar requisição no rate limiter
      if (!rateLimiter.recordRequest()) {
        setError('Limite de requisições excedido. Tente novamente em alguns segundos.');
        return;
      }
      
      setIsSendingMessage(true);
      // Atualizar timestamp e ID da última mensagem
      setLastMessageTimestamp(now);
      lastMessageIdRef.current = messageId;
      
      // ✅ Adicionar mensagem sanitizada temporariamente ao estado local para feedback imediato
      const tempMsg = {
        id: messageId,
        content: sanitizedContent, // ✅ Usar conteúdo sanitizado
        sender_id: currentUser.id,
        receiver_id: currentContact?.phone || currentContact?.remote_jid,
        created_at: new Date().toISOString(),
        is_read: false,
        from_me: true,
        role: 'ME',
        temp: true // Marcar como temporária
      };
      
      // Adicionar a mensagem temporária imediatamente ao estado
      setMessages(prev => [...prev, tempMsg]);
      
      // ✅ EXPERIÊNCIA DO USUÁRIO: Scroll automático imediato para mostrar a mensagem
      setTimeout(() => {
        scrollToPosition('bottom', { immediate: true });
        console.log('[SEND] ✅ Scroll automático após envio de mensagem');
      }, 50);
      
      const payload = {
        conversationId: currentContact.remote_jid,
        content: sanitizedContent, // ✅ Usar conteúdo sanitizado
        recipientId: currentContact.phone,
        role: 'ME',
        messageId: messageId // Enviar ID único para backend
      };
      
      secureLog.info('Enviando nova mensagem:', { conversationId: payload.conversationId, contentLength: payload.content.length });
      
      // ✅ SEGURANÇA: Garantir token CSRF válido antes de enviar
      const csrfToken = await ensureCSRFToken();
      if (!csrfToken) {
        setError('Erro de segurança: Token CSRF não disponível');
        return;
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      };
      
      // ✅ SEGURANÇA: Log apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log('[CSRF] Token incluído na requisição:', csrfToken.substring(0, 10) + '...');
      }
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      console.log('Status da resposta:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Remover a mensagem temporária em caso de erro
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        
        throw new Error(errorData.message || `Erro ${response.status} ao enviar mensagem`);
      }
      
      const data = await response.json();
      console.log('Resposta completa do envio de mensagem:', data);
      
      // Verificar se é sucesso total ou parcial (mensagem pendente)
      if (data.success) {
        // Sucesso total - mensagem enviada
        const newMsg = data.message;
        if (newMsg) {
          // Remover a mensagem temporária e substituir pela mensagem real
          setMessages(prev => {
            const withoutTemp = prev.filter(msg => msg.id !== messageId);
            
            // Adicionar a mensagem confirmada pela API
            const processedMsg = {
              ...newMsg,
              from_me: true,
              role: newMsg.role || 'ME'
            };
            
            return [...withoutTemp, processedMsg];
          });
          
          // ✅ EXPERIÊNCIA DO USUÁRIO: Scroll automático após confirmação
          setTimeout(() => {
            scrollToPosition('bottom', { immediate: true });
            console.log('[SEND] ✅ Scroll automático após confirmação da mensagem');
          }, 100);
        }
      } else {
        // Verificar se é status 202 (mensagem salva mas pendente)
        if (response.status === 202) {
          // Mensagem salva mas não enviada (Evolution API offline)
          const newMsg = data.message;
          if (newMsg) {
            // Remover a mensagem temporária e substituir pela mensagem pendente
            setMessages(prev => {
              const withoutTemp = prev.filter(msg => msg.id !== messageId);
              
              // Adicionar a mensagem pendente
              const processedMsg = {
                ...newMsg,
                from_me: true,
                role: newMsg.role || 'ME',
                status: 'pending'
              };
              
              return [...withoutTemp, processedMsg];
            });
            
            // ✅ EXPERIÊNCIA DO USUÁRIO: Scroll automático após mensagem pendente
            setTimeout(() => {
              scrollToPosition('bottom', { immediate: true });
              console.log('[SEND] ✅ Scroll automático após mensagem pendente');
            }, 100);
          }
          
          // Mostrar aviso sobre Evolution API offline
          if (data.warning) {
            setError(`⚠️ ${data.warning}. ${data.feedback}`);
            setTimeout(() => setError(null), 5000); // Limpar após 5 segundos
          }
        } else {
          // Erro real - remover mensagem temporária
          setMessages(prev => prev.filter(msg => msg.id !== messageId));
          throw new Error(data.message || 'Erro ao enviar mensagem');
        }
      }
      
      console.log(`Mensagem enviada com sucesso. Agent state: ${currentContact?.agent_state || 'indefinido'}`);
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setError('Erro ao enviar mensagem. Por favor, tente novamente.');
    } finally {
      // Garantir ao menos 500ms de "cooldown" entre envios
      const timeoutId = setTimeout(() => {
        setIsSendingMessage(false);
      }, 500);
      
      // Limpar timeout se o componente for desmontado
      return () => clearTimeout(timeoutId);
    }
  };
  
  // Aplicando debounce na função de processamento
  const debouncedSendMessage = useRef(
    debounce(processSendMessage, 300) // 300ms de debounce
  ).current;
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    console.log("handleSendMessage chamado");
    
    // Verificação simples e clara
    if (!newMessage.trim()) {
      console.log("Mensagem vazia, não enviando");
      return;
    }
    
    if (isSendingMessage) {
      console.log("Já existe uma mensagem sendo enviada");
      return;
    }
    
    // Gerar ID único para esta tentativa de envio
    const messageId = generateMessageId();
    const messageContent = newMessage;
    
    // Limpar o campo de mensagem imediatamente
    setNewMessage('');
    
    // Chamar a função diretamente, sem debounce
    processSendMessage(messageContent, messageId);
  };

  const handleCreateContact = async () => {
    if (!currentUser) {
      setError('Você precisa estar logado para criar contatos');
      return;
    }
    
    const name = prompt('Digite o nome do contato:');
    if (!name) return;
    
    const phone = prompt('Digite o número de telefone (com DDD, ex: 5527999999999):');
    if (!phone) return;
    
    try {
      const payload = {
        name,
        phone
      };
      
      console.log('Criando novo contato:', payload);
      
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status} ao criar contato`);
      }
      
      const data = await response.json();
      console.log('Resposta completa da criação de contato:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Erro ao criar contato');
      }
      
      // Extrair o contato da resposta da API
      const newContact = data.contact;
      
      if (!newContact) {
        console.warn('API retornou sucesso mas sem objeto de contato');
        // Criar um contato temporário com os dados fornecidos
        const tempContact = {
          id: `temp-${Date.now()}`,
        name: name,
        phone: phone,
          remote_jid: `${currentUser.id}_${phone}`,
        last_message: '',
          last_message_time: new Date().toISOString(),
        unread_count: 0,
          online: false
        };
        
        setContacts(prev => [tempContact, ...prev]);
        setCurrentContact(tempContact);
      } else {
        console.log('Contato criado com sucesso:', newContact);
        
        // Adicionar contato à lista e selecioná-lo
        setContacts(prev => [newContact, ...prev]);
        setCurrentContact(newContact);
      }
    } catch (error) {
      console.error('Erro ao criar contato:', error);
      setError('Erro ao criar contato. Por favor, tente novamente.');
    }
  };

  // Formatação de data
  // Função para formatar horário da última sincronização
  const formatLastSyncTime = (date) => {
    if (!date) return null;
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const messageDate = new Date(dateString);
      
      // Verificar se a data é válida
      if (isNaN(messageDate.getTime())) {
        console.error(`Data inválida: ${dateString}`);
        return '';
      }
      
      const now = new Date();
      const diffInHours = (now - messageDate) / (1000 * 60 * 60);
      
      // Timestamp inteligente baseado no tempo
      if (diffInHours < 1) {
        return messageDate.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else if (diffInHours < 24) {
        return messageDate.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else if (diffInHours < 168) { // 7 dias
        return messageDate.toLocaleDateString('pt-BR', { 
          weekday: 'short' 
        });
      } else {
        return messageDate.toLocaleDateString('pt-BR', { 
          day: '2-digit',
          month: '2-digit'
        });
      }
    } catch (error) {
      console.error(`Erro ao formatar data ${dateString}:`, error);
      return '';
    }
  };

  // ✅ UX: Função para selecionar contato com transição suave
  const handleSelectContact = (contact) => {
    console.log('[CONTACT] 📱 Selecionando contato:', contact.name || contact.push_name);
    console.log('[CONTACT] 🔍 Contato atual:', currentContact?.name || currentContact?.push_name);
    console.log('[CONTACT] 🔍 Remote JID atual:', currentContact?.remote_jid);
    console.log('[CONTACT] 🔍 Remote JID novo:', contact?.remote_jid);
    
    // ✅ UX: PROTEÇÃO - Se for o mesmo contato, não recarregar
    if (currentContact?.remote_jid === contact?.remote_jid) {
      console.log('[CONTACT] ⚠️ Mesmo contato já selecionado - mantendo histórico');
      return;
    }
    
    console.log('[CONTACT] ✅ Contato DIFERENTE detectado - carregando novo histórico');
    
    // ✅ UX: Transição imediata sem estados de carregamento visíveis
    setCurrentContact(contact);
    setLoading('allowInfiniteScroll', false);
    setLoading('initialLoad', true);
    
    // ✅ UX: Limpar timeouts para evitar conflitos
    timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutsRef.current = [];
    
    if (contact?.remote_jid) {
      // ✅ UX: Carregar mensagens do NOVO contato COM reset (contato diferente)
      fetchMessages(contact.remote_jid, 1, true); // ← reset=true para contato diferente
      
      // ✅ UX: Habilitar scroll infinito rapidamente para não interferir na experiência
      const enableSystemsTimeoutId = setTimeout(() => {
        setLoading('allowInfiniteScroll', true);
      }, 500); // Reduzido para 500ms para resposta mais rápida
      timeoutsRef.current.push(enableSystemsTimeoutId);
    } else {
      console.error('[CONTACT] ❌ Contato sem remote_jid!');
      setLoading('initialLoad', false);
    }
  };

  // Função para voltar para a lista de contatos (mobile)
  const handleBackToContacts = () => {
    setCurrentContact(null);
    // A ordenação será aplicada automaticamente pelo useEffect acima
  };

  // Funções para o painel lateral de contato
  const handleOpenContactPanel = (contact) => {
    setSelectedContactForPanel(contact);
    setIsContactPanelOpen(true);
  };

  const handleCloseContactPanel = () => {
    setIsContactPanelOpen(false);
    setSelectedContactForPanel(null);
  };

  const handleEditLead = (leadData) => {
    // Implementar modal de edição de lead
    console.log('Editar lead:', leadData);
    // TODO: Implementar modal de edição
  };

  const handleCreateProposal = (leadData) => {
    // Implementar modal de criação de proposta
    console.log('Criar proposta para lead:', leadData);
    // TODO: Implementar modal de criação de proposta
  };

  const handleViewProposalHistory = (leadData) => {
    // Implementar modal de histórico de propostas
    console.log('Ver histórico de propostas para lead:', leadData);
    // TODO: Implementar modal de histórico
  };

  const handleRepeatQuery = (leadData) => {
    // Implementar repetição de consulta
    console.log('Repetir consulta para lead:', leadData);
    // TODO: Implementar repetição de consulta
  };



  // ✅ Efeito para atualizar última mensagem - CORRIGIDO para evitar loops  
  // ✅ REMOVIDO: useEffect para atualizar última mensagem - será refeito
  
  // ✅ REMOVIDO: useEffect para detectar nova mensagem - será refeito
  
  // ✅ REMOVIDO: useEffect para ordenar contatos - será refeito

  // ✅ REMOVIDO: useEffect para buscar dados do contato - será refeito

  // ✅ REMOVIDO: Todo o código complexo de busca de dados - será refeito
  // ✅ REMOVIDO: Todo o código complexo de busca de dados - será refeito
  // ✅ REMOVIDO: Todo o código complexo de busca de dados - será refeito
  // ✅ REMOVIDO: Todo o código complexo de busca de dados - será refeito
  // ✅ REMOVIDO: Todo o código complexo de busca de dados - será refeito



  // Renderizar painel de dados do contato
  const renderContactDataPanel = () => {
    if (!currentContact) return null;
    
  
    
    // Valores formatados com nossa função robusta
    const saldoFormatado = formataMoeda(contactData.saldo);
    const simuladoFormatado = formataMoeda(contactData.simulado);
    const valorPropostaFormatado = formataMoeda(contactData.valorProposta);
    

    
    // Mapeamento de status para versões mais legíveis
    const getStatusLabel = (status) => {
      const statusMap = {
        'aprovada': 'Aprovada',
        'em_analise': 'Em Análise',
        'rejeitada': 'Rejeitada',
        'pendente': 'Pendente',
        'paid': 'Paga',
        'processing': 'Processando',
        'canceled': 'Cancelada',
        'failed': 'Falhou'
      };
      return statusMap[status] || status || 'Pendente';
    };
    
    // Mapeamento de status para classes de estilo
    const getStatusClass = (status) => {
      const classMap = {
        'aprovada': 'bg-emerald-600/50 text-emerald-200',
        'em_analise': 'bg-amber-600/50 text-amber-200',
        'rejeitada': 'bg-red-600/50 text-red-200',
        'pendente': 'bg-blue-600/50 text-blue-200',
        'paid': 'bg-emerald-600/50 text-emerald-200',
        'processing': 'bg-amber-600/50 text-amber-200',
        'canceled': 'bg-red-600/50 text-red-200',
        'failed': 'bg-red-600/50 text-red-200'
      };
      return classMap[status] || 'bg-blue-600/50 text-blue-200';
    };
    
    // Verificar se estamos em carregamento inicial
    const isLoading = contactData.saldo === null && contactData.simulado === null && !contactData.erroConsulta;
    

    
    return (
      <div className="min-w-0 flex-1 h-full flex flex-col border-l border-cyan-800/50 flex-shrink-0 overflow-y-auto bg-white/5 backdrop-blur-sm">
        <div className="p-3 border-b border-cyan-800/50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-cyan-100">Dados do Cliente</h3>
        </div>
        {/* Caixa de CPF */}
        <div className="p-3 pt-4 pb-0">
          <div className="bg-white/10 rounded-lg p-3 border border-cyan-800/50 flex items-center mb-2">
            <FaIdCard className="text-cyan-300 mr-2" />
            <div>
              <h4 className="text-sm font-semibold text-cyan-100">CPF</h4>
              <p className="text-base font-mono text-cyan-200 break-all">
                {contactData.cpf || currentContact.cpf || currentContact.lead_cpf || 'Não informado'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-3 space-y-4">
          {/* Seção de Saldo */}
          <div className="bg-white/10 rounded-lg p-3 border border-cyan-800/50">
            <div className="flex items-center mb-2">
              <FaWallet className="text-cyan-300 mr-2" />
              <h4 className="text-sm font-semibold text-cyan-100">Saldo FGTS</h4>
            </div>
            
            {/* ✅ UX: Mostrar placeholder enquanto carrega, sem spinner */}
            {contactData.saldo === null && !contactData.erroConsulta ? (
              <div className="py-2 text-cyan-300/60">
                <div className="h-4 bg-cyan-800/20 rounded animate-pulse"></div>
              </div>
            ) : saldoFormatado ? (
              <p className="text-lg font-bold text-white">
                {saldoFormatado}
              </p>
            ) : null}
          </div>
          
          {/* Seção de Simulação */}
          <div className="bg-white/10 rounded-lg p-3 border border-cyan-800/50">
            <div className="flex items-center mb-2">
              <FaCalculator className="text-cyan-300 mr-2" />
              <h4 className="text-sm font-semibold text-cyan-100">Simulação</h4>
            </div>
            
            {/* ✅ UX: Skeleton loading suave para simulação */}
            {contactData.simulado === null && !contactData.erroConsulta ? (
              <div className="py-2 text-cyan-300/60">
                <div className="h-4 bg-cyan-800/20 rounded animate-pulse"></div>
              </div>
            ) : simuladoFormatado ? (
              <p className="text-lg font-bold text-white">
                {simuladoFormatado}
              </p>
            ) : null}
        </div>
        
          {/* Seção de Proposta */}
          <div className="bg-white/10 rounded-lg p-3 border border-cyan-800/50">
            <div className="flex items-center mb-2">
              <FaFileAlt className="text-cyan-300 mr-2" />
              <h4 className="text-sm font-semibold text-cyan-100 flex items-center gap-2">
                Proposta
                {contactData.statusProposta && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ml-2 ${getStatusClass(contactData.statusProposta)}`}>
                    {getStatusLabel(contactData.statusProposta)}
                  </span>
                )}
              </h4>
            </div>
            {/* ✅ UX: Skeleton loading para proposta */}
            {contactData.proposta === null && !contactData.erroConsulta ? (
              <div className="py-2 text-cyan-300/60">
                <div className="h-4 bg-cyan-800/20 rounded animate-pulse mb-2"></div>
                <div className="h-3 bg-cyan-800/20 rounded animate-pulse w-2/3"></div>
              </div>
            ) : contactData.proposta ? (
              <>
                {/* Linha com ID e botão de copiar */}
                <div className="mb-2 flex items-center">
                  <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-1 rounded border border-gray-700/50 w-full">
                    <span className="text-xs text-gray-300">Id</span>
                    <span className="text-xs font-mono text-white break-all">
                      {contactData.proposta}
                    </span>
              <button 
                      onClick={() => {
                        navigator.clipboard.writeText(contactData.proposta);
                        setCopiedId(true);
                        // ✅ Timeout com cleanup gerenciado
                        const copiedIdTimeoutId = setTimeout(() => setCopiedId(false), 1500);
                        timeoutsRef.current.push(copiedIdTimeoutId);
                      }}
                      className="ml-1 text-cyan-200 hover:text-cyan-100 p-1"
                      title="Copiar Id da proposta"
                      aria-label="Copiar ID da proposta"
                    >
                      <FaRegCopy />
              </button>
                    {copiedId && <span className="text-xs text-emerald-300 ml-1">Copiado!</span>}
                  </div>
                </div>
                {/* Linha horizontal: Caixa PIX e Valor */}
                <div className="cards-proposta-responsive">
                  {/* Card PIX */}
                  {contactData.chavePix && (
                    <div className="bg-emerald-900/30 p-2 rounded-md border border-emerald-700/50 flex flex-col justify-between">
                      <div className="flex items-center mb-1">
                        <FaWallet className="text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-xs font-semibold text-emerald-200 mr-2">Chave PIX</span>
              <button 
                          onClick={() => {
                            navigator.clipboard.writeText(contactData.chavePix);
                            setCopiedPix(true);
                            // ✅ Timeout com cleanup gerenciado
                            const copiedPixTimeoutId = setTimeout(() => setCopiedPix(false), 1500);
                            timeoutsRef.current.push(copiedPixTimeoutId);
                          }}
                          className="ml-1 text-emerald-200 hover:text-emerald-100 p-1"
                          title="Copiar chave PIX"
                          aria-label="Copiar chave PIX"
                        >
                          <FaRegCopy />
              </button>
                        {copiedPix && <span className="text-xs text-emerald-300 ml-1">Copiado!</span>}
                      </div>
                      <span className="text-xs text-emerald-300 break-all font-mono">
                        {contactData.chavePix || 'Não informado'}
                      </span>
                    </div>
                  )}
                  {/* Card Valor */}
                  {valorPropostaFormatado && (
                    <div className="bg-blue-900/30 p-2 rounded-md border border-blue-700/50 flex flex-col justify-between" >
                      <span className="text-xs font-semibold text-blue-200 mb-1">Valor</span>
                      <span className="text-lg font-bold text-blue-300">{valorPropostaFormatado}</span>
                    </div>
                  )}
                </div>
                {/* Link de Formalização com botão de copiar */}
                {contactData.linkFormalizacao && (
                  <div className="mb-2 bg-blue-900/30 p-2 rounded-md border border-blue-700/50 flex items-center">
                    <FaFileAlt className="text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-200 mb-1">Link de Formalização</p>
                      <a
                        href={contactData.linkFormalizacao}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-300 underline hover:text-blue-200 break-all"
                      >
                        {contactData.linkFormalizacao}
                      </a>
            </div>
              <button 
                      onClick={() => {
                        navigator.clipboard.writeText(contactData.linkFormalizacao);
                        setCopiedLink(true);
                        // ✅ Timeout com cleanup gerenciado
                        const copiedLinkTimeoutId = setTimeout(() => setCopiedLink(false), 1500);
                        timeoutsRef.current.push(copiedLinkTimeoutId);
                      }}
                      className="ml-2 text-blue-200 hover:text-blue-100 p-1"
                      title="Copiar link de formalização"
                      aria-label="Copiar link de formalização"
                    >
                      <FaRegCopy />
              </button>
                    {copiedLink && <span className="text-xs text-emerald-300 ml-1">Copiado!</span>}
                  </div>
                )}
                {/* Descrição do Status */}
                {contactData.descricaoStatus && !/^Status da proposta:/i.test(contactData.descricaoStatus) && (
                  <div className="mt-2 bg-cyan-900/30 p-2 rounded-md border border-cyan-700/50">
                    <div className="flex items-start">
                      <FaInfoCircle className="text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-cyan-200">{contactData.descricaoStatus}</p>
            </div>
          </div>
        )}
                {/* Erro da Proposta */}
                {contactData.erroProposta && (
                  <div className="mt-2 bg-red-900/30 p-2 rounded-md border border-red-600/50">
                    <div className="flex items-start">
                      <FaTimesCircle className="text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-200">{contactData.erroProposta}</p>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  // Função para renderizar o cabeçalho do chat com responsividade melhorada
  const renderChatHeader = () => {
    if (!currentContact) return null;
    
    return (
      <div className="p-2 border-b border-cyan-800/50 bg-white/5 flex items-center">
        {isMobileView && (
          <button
            className="mr-2 text-cyan-300 hover:text-cyan-100 p-2"
            onClick={handleBackToContacts}
            aria-label="Voltar para lista de contatos"
          >
            <FaArrowLeft className="text-lg" />
          </button>
        )}
        
        <div className="flex items-center flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
              {(currentContact.name || currentContact.push_name || 'C').substring(0, 2).toUpperCase()}
            </div>
            {currentContact.online && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-emerald-950"></div>
            )}
          </div>
          
          <div className="ml-2 overflow-hidden">
            <h3 className="font-semibold text-cyan-100 truncate">{currentContact.name || currentContact.push_name || 'Contato'}</h3>
            <div className="flex items-center gap-2">
            <p className="text-xs text-cyan-300 truncate">
              {currentContact.phone || (currentContact.remote_jid || '').split('@')[0] || ''}
            </p>
              {instances.length > 1 && currentContact.instance_id && (
                <span className="text-xs text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded-full font-medium">
                  {getContactInstanceName(currentContact)}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3 ml-2">
          {isUpdating && (
            <div className="flex items-center gap-1 text-cyan-300 text-xs">
              <FaSpinner className="w-3 h-3 animate-spin" />
              <span>Atualizando...</span>
            </div>
          )}

          <button 
            className="text-cyan-300 hover:text-cyan-100 p-2" 
            aria-label="Ver dados do contato"
            onClick={() => handleOpenContactPanel(currentContact)}
          >
            <FaUser className={screenWidth < 360 ? "text-sm" : "text-lg"} />
          </button>
          <button className="text-cyan-300 hover:text-cyan-100 p-2" aria-label="Ligar">
            <FaPhone className={screenWidth < 360 ? "text-sm" : "text-lg"} />
          </button>
          <button className="text-cyan-300 hover:text-cyan-100 p-2" aria-label="Chamada de vídeo">
            <FaVideo className={screenWidth < 360 ? "text-sm" : "text-lg"} />
          </button>
          <button className="text-cyan-300 hover:text-cyan-100 p-2" aria-label="Mais opções">
            <FaEllipsisV className={screenWidth < 360 ? "text-sm" : "text-lg"} />
          </button>
        </div>
      </div>
    );
  };

  // Renderizar tela de erro
  if (error && !contacts.length) {
    return (
      <div className="min-h-screen flex flex-col" style={mobileStyles.pageContainer}>
        <Navbar />
        <div className="container mx-auto flex-1 flex flex-col" style={mobileStyles.contentContainer}>
          <div className="max-w-4xl mx-auto bg-red-900/30 border border-red-700 rounded-lg p-4 text-center">
            <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-2" />
            <p className="text-lg font-semibold text-red-200">{error}</p>
            <button 
              className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-white"
              onClick={handleRefresh}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen max-h-screen flex flex-col overflow-hidden w-full" style={mobileStyles.pageContainer}>
      <Navbar />
      <div className="container-fluid mx-auto flex-1 flex flex-col overflow-hidden w-full" style={mobileStyles.contentContainer}>
        {error ? (
          <div className="max-w-4xl mx-auto bg-red-900/30 border border-red-700 rounded-lg p-4 text-center">
            <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-2" />
            <p className="text-lg font-semibold text-red-200">{error}</p>
            <button 
              className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-white"
              onClick={handleRefresh}
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col overflow-hidden" style={{margin: 0, padding: 0}}>
            <div className="flex flex-col md:flex-row border border-cyan-800/50 rounded-lg shadow-2xl bg-white/5 backdrop-blur-sm overflow-hidden flex-1 w-full" style={mobileStyles.mainContainer}>
              {/* Lista de contatos - oculta no modo mobile quando um contato está selecionado */}
              {(!isMobileView || !currentContact) && (
                <div className="flex-shrink-0 flex-grow-0 min-w-0 w-full md:basis-1/4 md:max-w-[25%] border-r border-cyan-800/50 flex flex-col h-full p-0">
                  <div className="p-2 border-b border-cyan-800/50">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-cyan-100">Conversas</h2>
                        {isSyncing && (
                          <div className="flex items-center gap-1 text-cyan-300 text-xs">
                            <FaSpinner className="w-3 h-3 animate-spin" />
                            <span>Sincronizando...</span>
                          </div>
                        )}
                        {lastSyncTime && !isSyncing && (
                          <div className="text-cyan-300 text-xs">
                            Última: {formatLastSyncTime(lastSyncTime)}
                          </div>
                        )}
                        {connectionStatus && (
                          <div className={`flex items-center gap-1 text-xs ${
                            connectionStatus.connected ? 'text-emerald-300' : 'text-red-300'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              connectionStatus.connected ? 'bg-emerald-500' : 'bg-red-500'
                            }`}></div>
                            <span>{connectionStatus.connected ? 'Conectado' : 'Desconectado'}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => syncContactsManual()}
                          className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors"
                          title="Sincronizar contatos"
                        >
                          <FaSpinner className={`w-3 h-3 text-white ${isSyncing ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                          className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full p-2 hover:from-cyan-500 hover:to-blue-500 transition shadow-lg"
                          onClick={handleCreateContact}
                        >
                          <FaPlus />
                        </button>
                      </div>
                    </div>
                    
                    {/* Seletor de Instâncias Customizado */}
                    {(() => {
                      const shouldShow = instances.length > 0 || loadingState.instances;
                  
                      return shouldShow && (
                      <div className="mb-3 relative" ref={dropdownRef}>
                        <button
                          type="button"
                          onClick={() => !loadingState.instances && setDropdownOpen(!dropdownOpen)}
                          disabled={loadingState.instances}
                          className="w-full py-2 px-3 bg-white/10 text-cyan-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/60 border border-cyan-800/50 transition-colors duration-200 hover:bg-white/15 flex items-center justify-between cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="text-left">
                            {getSelectedInstanceText()}
                          </span>
                          <FaChevronDown 
                            className={`w-3 h-3 text-cyan-300 transition-transform duration-200 ${
                              dropdownOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {/* Dropdown Options */}
                        {dropdownOpen && !loadingState.instances && (
                          <div className="absolute z-50 w-full mt-1 bg-gradient-to-br from-emerald-950/95 via-cyan-950/95 to-blue-950/95 backdrop-blur-sm border border-cyan-800/50 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {/* Opção "Todas as instâncias" */}
                            <button
                              type="button"
                              onClick={() => handleInstanceSelect('all')}
                              className={`w-full px-3 py-2 text-left hover:bg-white/10 transition-colors duration-200 flex items-center justify-between ${
                                selectedInstanceId === 'all' ? 'bg-white/20 text-cyan-100' : 'text-cyan-200'
                              } first:rounded-t-lg border-b border-cyan-800/30 last:border-b-0`}
                            >
                              <span>Todas as instâncias</span>
                              {selectedInstanceId === 'all' && (
                                <FaCheck className="w-3 h-3 text-cyan-400" />
                              )}
                            </button>

                            {/* Instâncias individuais */}
                            {instances.map((instance) => (
                              <button
                                key={instance.id}
                                type="button"
                                onClick={() => handleInstanceSelect(instance.id)}
                                className={`w-full px-3 py-2 text-left hover:bg-white/10 transition-colors duration-200 flex items-center justify-between ${
                                  selectedInstanceId === instance.id ? 'bg-white/20 text-cyan-100' : 'text-cyan-200'
                                } border-b border-cyan-800/30 last:border-b-0 last:rounded-b-lg`}
                              >
                                <span>
                                  {instance.agent_name || instance.instance_name || `Instância ${instance.id}`}
                                </span>
                                {selectedInstanceId === instance.id && (
                                  <FaCheck className="w-3 h-3 text-cyan-400" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                    })()}
                    
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Pesquisar conversa"
                        className="w-full py-2 pl-10 pr-4 bg-white/10 text-cyan-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/60 border border-cyan-800/50 placeholder-cyan-300/70"
                        value={searchTerm}
                        onChange={(e) => {
                          // ✅ SEGURANÇA: Validar entrada de busca
                          const validation = validateUserInput(e.target.value, 'search');
                          if (validation.valid) {
                            setSearchTerm(validation.value);
                          }
                        }}
                        maxLength={SECURITY_CONFIG.MAX_SEARCH_LENGTH}
                      />
                      <FaSearch className="absolute left-3 top-3 text-cyan-300" />
                    </div>
                  </div>
                  <div 
                    ref={contactsContainerRef}
                    className="overflow-y-auto flex-1"
                    onScroll={handleContactsScroll}
                  >
                    {contacts.length === 0 ? (
                      <div className="p-6 text-center text-cyan-300">
                        {/* ✅ UX: Estado vazio mais atrativo */}
                        <div className="text-center">
                          <div className="w-12 h-12 bg-cyan-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <p className="text-base font-medium">Nenhuma conversa</p>
                          <p className="text-sm mt-1 text-cyan-400">Aguardando mensagens...</p>
                        </div>
                      </div>
                    ) : (
                      displayContacts
                        .filter(contact => 
                          contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          contact.phone?.includes(searchTerm)
                        )
                        .map(contact => (
                          <div
                            key={contact.id || contact.remote_jid}
                            className={`flex items-center p-2 cursor-pointer border-b border-cyan-800/30 hover:bg-white/5 transition-colors ${
                              currentContact?.id === contact.id || currentContact?.remote_jid === contact.remote_jid ? 'bg-white/10' : ''
                            }`}
                            onClick={() => handleSelectContact(contact)}
                          >
                            <div className="relative">
                              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                                {(contact.name || contact.push_name || 'C').substring(0, 2).toUpperCase()}
                              </div>
                              {contact.online && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-emerald-950"></div>
                              )}
                            </div>
                            <div className="ml-4 flex-1 min-w-0 overflow-hidden">
                              <div className="flex justify-between">
                                <div className="flex items-center gap-1">
                                  {(() => {
                                    const formattedName = formatContactName(contact);
                                    return (
                                      <>
                                        <h3 className="font-semibold text-cyan-100">{formattedName.name}</h3>
                                        {formattedName.instanceName && (
                                          <span className="text-xs text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded-full font-medium">
                                            {formattedName.instanceName}
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                                <span className="text-xs text-cyan-300 ml-1 shrink-0 whitespace-nowrap">
                                  {(() => {
                                    // Sempre mostrar timestamp - usar last_message_time ou fallback para updated_at/created_at
                                    const timestamp = contact.last_message_time || contact.updated_at || contact.created_at;
                                    return timestamp ? formatDate(timestamp) : '';
                                  })()}
                                </span>
                              </div>
                              <p className="text-sm text-cyan-300 truncate w-full">
                                {(() => {
                                  // Lógica consistente para exibir preview da mensagem
                                  if (contact.last_message && contact.last_message.trim()) {
                                    return contact.last_message;
                                  } else {
                                    // Para contatos sem mensagem, mostrar número de telefone
                                    const phoneNumber = contact.phone || (contact.remote_jid || '').split('@')[0];
                                    return phoneNumber || 'Nenhuma mensagem';
                                  }
                                })()}
                              </p>
                            </div>
                            
                            {/* Botão AI para ativar/desativar resposta automática do agente */}
                            <button 
                              key={`contact-${contact.id || contact.remote_jid}`}
                              onClick={(e) => toggleAutoResponse(contact.id || contact.remote_jid, e)}
                              className={`ml-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-all ${
                                isAgentAiActive(contact)
                                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                                  : 'bg-gray-600/50 text-gray-300'
                              }`}
                              title={isAgentAiActive(contact) ? "Desativar resposta automática" : "Ativar resposta automática"}
                              aria-label={isAgentAiActive(contact) ? "Desativar resposta automática" : "Ativar resposta automática"}
                              aria-pressed={isAgentAiActive(contact)}
                            >
                              AI
                            </button>
                            
                            {contact.unread_count > 0 && (
                              <div className="ml-2 bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                {contact.unread_count}
                              </div>
                            )}
                          </div>
                        ))
                    )}
                    
                    {/* ✅ Skeleton loading para contatos quando carregando mais */}
                    {isLoadingMoreContacts && (
                      <div className="p-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center p-2 mb-2 animate-pulse">
                            <div className="w-12 h-12 bg-cyan-700/30 rounded-full mr-3"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-cyan-700/30 rounded w-3/4 mb-2"></div>
                              <div className="h-3 bg-cyan-700/20 rounded w-1/2"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Botão para carregar mais contatos (agora apenas fallback manual) */}
                    {hasMoreContacts && !isLoading && !isLoadingMoreContacts && displayContacts.length > 0 && (
                      <div className="p-3 text-center">
                        <button
                          onClick={loadMoreContacts}
                          className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-cyan-100 rounded-lg transition-colors duration-200"
                        >
                          Carregar mais contatos
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Área de mensagens */}
              {currentContact ? (
                <>
                  <div className={`flex-shrink-0 flex-grow-0 min-w-0 w-full ${!isMobileView ? 'md:basis-2/4 md:max-w-[50%]' : ''} flex flex-col h-full p-0 relative`}>
                  {/* Cabeçalho do chat */}
                    {renderChatHeader()}
                  
                  {/* ✅ BOTÃO DE ANCORAGEM: Flutuante FIXO sobre a área de mensagens */}
                  {!isAtBottom && messages.length > 0 && (
                    <button
                      onClick={() => {
                        scrollToPosition('bottom', { immediate: true });
                        console.log('[ANCHOR-BTN] ✅ Usuário clicou para ir à mensagem mais recente');
                      }}
                      className="absolute bottom-20 right-4 z-50 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white p-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 group"
                      title="Ir para a mensagem mais recente"
                    >
                      <svg 
                        className="w-5 h-5 transform group-hover:translate-y-[-2px] transition-transform duration-200" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] h-5 flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  )}
                  
                  {/* Área de mensagens */}
                  
                    <div 
                      ref={messagesContainerRef}
                      className="flex-1 overflow-y-auto p-3 bg-gradient-to-br from-emerald-950/20 via-cyan-950/20 to-blue-950/20 relative"
                      style={{ 
                        height: '100%',
                        maxHeight: 'calc(100vh - 12rem)',
                        // ✅ Garantir altura mínima para justify-end funcionar
                        minHeight: '300px',
                        // ✅ Container sempre visível para ancoragem funcionar
                        // ✅ Forçar flex para funcionar
                        display: 'flex',
                        flexDirection: 'column',
                        // ✅ OTIMIZAÇÃO: Melhorar performance de scroll
                        willChange: 'scroll-position',
                        contain: 'layout style paint',
                        // ✅ OTIMIZAÇÃO: Acelerar scroll com GPU
                        transform: 'translateZ(0)',
                        backfaceVisibility: 'hidden',
                        perspective: '1000px'
                      }}
                      onScroll={handleScroll}
                    >
                    {/* Skeleton loading para mensagens antigas */}
                    {isLoadingMoreMessages && (
                      <div className="flex flex-col space-y-3 p-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="flex space-x-3">
                              <div className="h-8 w-8 bg-cyan-700/30 rounded-full"></div>
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-cyan-700/30 rounded w-3/4"></div>
                                <div className="h-3 bg-cyan-700/20 rounded w-1/2"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* ✅ UX: Remover spinner principal - sempre mostrar conteúdo */}
                    {(
                      <>
                        {isUpdating && (
                          <div className="absolute top-2 right-2 z-10 bg-cyan-800/60 p-1.5 rounded-full shadow-md">
                            <FaSpinner className="animate-spin text-xs text-cyan-100" />
                          </div>
                        )}
                        

                        
                        {messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-cyan-300">
                            {/* ✅ UX: Estado vazio elegante sem mencionar carregamento */}
                            <div className="text-center p-8">
                              <div className="w-16 h-16 bg-cyan-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                              </div>
                              <p className="text-lg font-medium">Inicie uma conversa</p>
                              <p className="text-sm mt-2 text-cyan-400">Suas mensagens aparecerão aqui</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* ✅ Spacer para empurrar mensagens para o final */}
                            <div className="flex-grow"></div>
                          <div className="flex flex-col w-full">
                            {messages.map((msg, index) => {
                              const previousMsg = index > 0 ? messages[index - 1] : null;
                              const showDateSeparator = shouldShowDateSeparator(msg, previousMsg);
                              
                              return (
                                <React.Fragment key={msg.id}>
                                  {/* Separador de data */}
                                  {showDateSeparator && (
                                    <div className="flex justify-center my-4">
                                      <div className="bg-cyan-900/30 backdrop-blur-sm text-cyan-100 px-3 py-1 rounded-full text-sm border border-cyan-800/50">
                                        {formatDateSeparator(msg.created_at)}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {(() => {
                              // RENDERIZAÇÃO: Forçar o uso EXCLUSIVO do campo 'role' 
                              // para determinar aparência e posição
                              
                              // Forçar um role válido se de alguma forma chegou à renderização sem um
                              if (!msg.role || !['ME', 'AI', 'USER'].includes(msg.role)) {
                                console.error(`ERRO CRÍTICO: Mensagem sem role válido chegou à renderização: ID=${msg.id}, conteúdo="${msg.content?.substring(0, 15) || ''}", role="${msg.role || 'undefined'}"`);
                                // Aplicar correção de emergência
                                msg.role = 'USER';
                              }
                              
                              // Definir valores de estilo baseado apenas no role
                              let justifyContent = 'flex-start'; // Padrão (USER = à esquerda)
                              let bgColorClass = 'bg-white/10 backdrop-blur-sm text-cyan-100 rounded-tl-lg rounded-tr-lg rounded-br-lg';
                              let borderClass = 'border-cyan-800/30';
                              let textColorClass = 'text-cyan-300/80';
                              
                              // Sobrescrever para ME ou AI
                              if (msg.role === 'ME') {
                                justifyContent = 'flex-end';
                                  bgColorClass = 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg';
                                borderClass = 'border-blue-700/50';
                                textColorClass = 'text-blue-100/80';
                              } 
                              else if (msg.role === 'AI') {
                                justifyContent = 'flex-end';
                                  bgColorClass = 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg';
                                borderClass = 'border-indigo-700/50';
                                textColorClass = 'text-indigo-100/80';
                              }
                              
                              // Log para depurar problemas de renderização
              
                              
                              return (
                                <div 
                                  key={msg.id}
                                  className="mb-3"
                                  style={{ 
                                    width: '100%', 
                                    display: 'flex', 
                                    justifyContent: justifyContent
                                  }}
                                >
                                  <div
                                      className={`max-w-[75%] shadow-lg ${bgColorClass} p-2 border ${borderClass} ${msg.temp ? 'opacity-70' : ''}`}
                                  >
                                    <p>{sanitizeContent(msg.content)}</p>
                                      <div className={`text-xs mt-1 text-right whitespace-nowrap ${textColorClass} flex items-center justify-end`}>
                                      {formatDate(msg.created_at)}
                                        {msg.temp ? (
                                          <span className="ml-1">
                                            <FaSpinner className="animate-spin text-xs ml-1" />
                                          </span>
                                        ) : msg.status === 'pending' ? (
                                          <span className="ml-1">
                                            <FaClock className="text-gray-400" />
                                          </span>
                                        ) : msg.status === 'sent' ? (
                                          <span className="ml-1">
                                            <FaCheck className="text-cyan-400" />
                                          </span>
                                        ) : msg.status === 'delivered' ? (
                                          <span className="ml-1">
                                            <FaCheck className="text-blue-400" />
                                          </span>
                                        ) : msg.status === 'read' ? (
                                          <span className="ml-1">
                                            <FaCheck className="text-green-400" />
                                          </span>
                                        ) : (msg.role === 'ME' || msg.role === 'AI') && (
                                        <span className="ml-1">
                                          {msg.is_read ? '✓✓' : '✓'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                                  })()}
                                </React.Fragment>
                              );
                            })}
                          </div>
                          </>
                        )}
                      </>
                    )}
                    

                                    </div>
                  
                  {/* Formulário de envio de mensagem */}
                    <div className="border-t border-cyan-800/50 bg-white/5 w-full message-input-container flex" style={mobileStyles.messageInputContainer}>
                    <form 
                        className="flex items-center w-full mx-1 my-1"
                      onSubmit={handleSendMessage}
                    >
                        {!isMobileView || screenWidth >= 360 ? (
                          <>
                      <button 
                        type="button"
                              className="text-cyan-300 hover:text-cyan-100 px-1"
                      >
                              <FaSmile className={`${screenWidth < 400 ? 'text-base' : 'text-lg'}`} />
                      </button>
                      <button 
                        type="button"
                              className="text-cyan-300 hover:text-cyan-100 px-1"
                      >
                              <FaPaperclip className={`${screenWidth < 400 ? 'text-base' : 'text-lg'}`} />
                      </button>
                          </>
                        ) : null}
                        <div className={`flex-1 mx-1 py-2 relative`}>
                          <input
                            type="text"
                            placeholder="Digite uma mensagem"
                            className="w-full py-2 px-3 bg-white/10 text-cyan-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/60 border border-cyan-800/50 placeholder-cyan-300/70"
                            value={newMessage}
                            onChange={(e) => {
                              // ✅ SEGURANÇA: Validar entrada de mensagem
                              const validation = validateUserInput(e.target.value, 'message');
                              if (validation.valid || e.target.value === '') {
                                setNewMessage(e.target.value);
                              }
                            }}
                            onPaste={(e) => {
                              // ✅ Permitir colar texto - incluindo URLs
                              e.preventDefault();
                              const pastedText = e.clipboardData.getData('text/plain');
                              console.log('Texto colado:', pastedText); // Debug
                              
                              if (pastedText && pastedText.length <= SECURITY_CONFIG.MAX_MESSAGE_LENGTH) {
                                // Apenas verificar comprimento e caracteres básicos
                                const cleanText = pastedText
                                  .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
                                  .trim();
                                
                                console.log('Texto limpo:', cleanText); // Debug
                                
                                if (cleanText && cleanText.length > 0) {
                                  setNewMessage(cleanText);
                                  console.log('Mensagem definida:', cleanText); // Debug
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              // ✅ Suporte a atalhos de teclado para copiar/colar
                              if (e.ctrlKey || e.metaKey) {
                                switch (e.key) {
                                  case 'c':
                                    // Ctrl+C - Copiar texto selecionado
                                    if (e.target.selectionStart !== e.target.selectionEnd) {
                                      const selectedText = newMessage.substring(e.target.selectionStart, e.target.selectionEnd);
                                      copyToClipboard(selectedText);
                                    }
                                    break;
                                  case 'v':
                                    // Ctrl+V - Colar texto (incluindo URLs)
                                    e.preventDefault();
                                    readFromClipboard().then(text => {
                                      if (text && text.length <= SECURITY_CONFIG.MAX_MESSAGE_LENGTH) {
                                        // Apenas verificar comprimento e caracteres básicos
                                        const cleanText = text
                                          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
                                          .trim();
                                        
                                        if (cleanText && cleanText.length > 0) {
                                          setNewMessage(cleanText);
                                        }
                                      }
                                    });
                                    break;
                                  case 'x':
                                    // Ctrl+X - Cortar texto selecionado
                                    if (e.target.selectionStart !== e.target.selectionEnd) {
                                      const selectedText = newMessage.substring(e.target.selectionStart, e.target.selectionEnd);
                                      copyToClipboard(selectedText);
                                      const newValue = newMessage.substring(0, e.target.selectionStart) + newMessage.substring(e.target.selectionEnd);
                                      setNewMessage(newValue);
                                    }
                                    break;
                                }
                              }
                            }}
                            maxLength={SECURITY_CONFIG.MAX_MESSAGE_LENGTH}
                            autoComplete="off"
                            spellCheck="false"
                            data-testid="message-input"
                            style={{ 
                              userSelect: 'text',
                              WebkitUserSelect: 'text',
                              MozUserSelect: 'text',
                              msUserSelect: 'text'
                            }}
                          />
                          
                          {/* ✅ Botões de clipboard para melhor UX */}
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                            {/* Botão de colar */}
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const text = await readFromClipboard();
                                  if (text && text.length <= SECURITY_CONFIG.MAX_MESSAGE_LENGTH) {
                                    const cleanText = text
                                      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                                      .trim();
                                    
                                    if (cleanText && cleanText.length > 0) {
                                      setNewMessage(cleanText);
                                      setClipboardFeedback('Colado!');
                                      setTimeout(() => setClipboardFeedback(''), 2000);
                                    }
                                  }
                                } catch (error) {
                                  setClipboardFeedback('Erro ao colar');
                                  setTimeout(() => setClipboardFeedback(''), 2000);
                                }
                              }}
                              className="p-1 text-cyan-300 hover:text-cyan-100 text-xs transition-colors"
                              title="Colar texto (Ctrl+V)"
                              aria-label="Colar texto"
                            >
                              <FaRegCopy className="w-3 h-3 rotate-180" />
                            </button>
                            
                            {/* Botão de copiar - apenas quando há texto */}
                            {newMessage && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const success = await copyToClipboard(newMessage);
                                  if (success) {
                                    setClipboardFeedback('Copiado!');
                                    setTimeout(() => setClipboardFeedback(''), 2000);
                                  } else {
                                    setClipboardFeedback('Erro ao copiar');
                                    setTimeout(() => setClipboardFeedback(''), 2000);
                                  }
                                }}
                                className="p-1 text-cyan-300 hover:text-cyan-100 text-xs transition-colors"
                                title="Copiar mensagem (Ctrl+C)"
                                aria-label="Copiar mensagem"
                              >
                                <FaRegCopy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      
                      {newMessage.trim() ? (
                        <button
                          type="submit"
                            className={`${screenWidth < 360 ? 'px-2 py-2' : 'p-2'} bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full hover:from-cyan-500 hover:to-blue-500 transition shadow-md flex-shrink-0 mx-1`}
                          aria-label="Enviar mensagem"
                          disabled={isSendingMessage}
                        >
                            <IoSend className={`${screenWidth < 400 ? 'text-base' : 'text-lg'}`} />
                        </button>
                      ) : (
                        <button
                          type="button"
                            className={`${screenWidth < 360 ? 'px-2 py-2' : 'p-2'} text-cyan-300 hover:text-cyan-100 flex-shrink-0 mx-1`}
                        >
                            <FaMicrophone className={`${screenWidth < 400 ? 'text-base' : 'text-lg'}`} />
                        </button>
                      )}
                    </form>
                  </div>
                </div>
                  
                  {/* Painel de dados do contato - apenas visível em desktop */}
                  {!isMobileView && (
                    <div className="flex-shrink-0 flex-grow-0 min-w-0 md:basis-1/4 md:max-w-[25%] h-full flex flex-col overflow-hidden">
                      <div className="flex-1 min-h-0 h-full overflow-y-auto">
                        {renderContactDataPanel()}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="hidden md:flex md:w-2/3 items-center justify-center w-full">
                  <div className="text-center">
                    <p className="text-xl mb-2 text-cyan-100">Selecione uma conversa para começar</p>
                    <p className="text-cyan-300">Ou inicie uma nova conversa clicando no botão +</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Painel lateral de dados do contato */}
      <ContactPanel
        contact={selectedContactForPanel}
        isOpen={isContactPanelOpen}
        onClose={handleCloseContactPanel}
        onEditLead={handleEditLead}
        onCreateProposal={handleCreateProposal}
        onViewProposalHistory={handleViewProposalHistory}
        onRepeatQuery={handleRepeatQuery}
      />
    </div>
  );
} 