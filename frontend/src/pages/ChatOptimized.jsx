import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Navbar from '../components/Navbar'
import MessageInputOptimized from '../components/MessageInputOptimized'
import { FaSearch, FaEllipsisV, FaPhone, FaVideo, FaPlus, FaArrowLeft, FaSpinner, FaExclamationTriangle, FaWallet, FaCalculator, FaFileAlt, FaTimesCircle, FaCheckCircle, FaInfoCircle, FaIdCard, FaRegCopy, FaChevronDown, FaCheck, FaClock } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../utilities/apiFetch'
import { cachedFetch } from '../utils/authCache'
import { useClipboard } from '../hooks/useClipboard'
import { usePolling, useScrollToBottom, useLoadingStates } from '../hooks'

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

// ✅ SEGURANÇA: Configurações de segurança simplificadas
const SECURITY_CONFIG = {
  MAX_MESSAGE_LENGTH: 1000,
  MAX_SEARCH_LENGTH: 100,
  RATE_LIMIT_DELAY: 1000,
  MAX_REQUESTS_PER_MINUTE: 60,
  DANGEROUS_PATTERNS: /javascript:|data:|vbscript:|on\w+\s*=|expression\s*\(|eval\s*\(/gi
};

// ✅ SEGURANÇA: Sanitização simplificada
const sanitizeContent = (content) => {
  if (typeof content !== 'string') return '';
  
  let sanitized = content.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  sanitized = sanitized.replace(SECURITY_CONFIG.DANGEROUS_PATTERNS, '');
  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  return sanitized.trim();
};

// ✅ SEGURANÇA: Validação simplificada
const validateUserInput = (input, type = 'message') => {
  if (typeof input !== 'string' || !input.trim()) {
    return { valid: false, error: 'Input inválido' };
  }
  
  const trimmed = input.trim();
  
  switch (type) {
    case 'message':
      if (trimmed.length > SECURITY_CONFIG.MAX_MESSAGE_LENGTH) {
        return { valid: false, error: `Mensagem muito longa (máximo ${SECURITY_CONFIG.MAX_MESSAGE_LENGTH} caracteres)` };
      }
      if (SECURITY_CONFIG.DANGEROUS_PATTERNS.test(trimmed)) {
        return { valid: false, error: 'Conteúdo não permitido' };
      }
      return { valid: true, value: sanitizeContent(trimmed) };
      
    case 'search':
      if (trimmed.length > SECURITY_CONFIG.MAX_SEARCH_LENGTH) {
        return { valid: false, error: 'Busca muito longa' };
      }
      if (SECURITY_CONFIG.DANGEROUS_PATTERNS.test(trimmed)) {
        return { valid: false, error: 'Termo de busca contém caracteres inválidos' };
      }
      return { valid: true, value: sanitizeContent(trimmed) };
      
    default:
      return { valid: true, value: sanitizeContent(trimmed) };
  }
};

// ✅ UTILITÁRIOS: Funções auxiliares simplificadas
const generateMessageId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const formataMoeda = (valor) => {
  if (valor === null || valor === undefined) return null;
  
  try {
    let numero;
    if (typeof valor === 'number') {
      numero = valor;
    } else {
      const valorLimpo = String(valor).replace(/[^\d.,]/g, '')
        .replace(/\./g, '#')
        .replace(/,/g, '.')
        .replace(/#/g, '');
      numero = parseFloat(valorLimpo);
    }
    
    if (isNaN(numero)) return null;
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(numero);
  } catch (error) {
    console.error(`Erro ao formatar valor monetário: ${error.message}`);
    return null;
  }
};

// ✅ COMPONENTE PRINCIPAL OTIMIZADO
export default function ChatOptimized() {
  // ✅ ESTADOS PRINCIPAIS SIMPLIFICADOS
  const [contacts, setContacts] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [currentContact, setCurrentContact] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768)
  const [instances, setInstances] = useState([])
  const [selectedInstanceId, setSelectedInstanceId] = useState('all')
  const [contactInstances, setContactInstances] = useState({})
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState(0)
  const [clipboardFeedback, setClipboardFeedback] = useState('')
  const [error, setError] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [autoResponseContacts, setAutoResponseContacts] = useState({})
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [unreadCount, setUnreadCount] = useState(0)

  // ✅ HOOKS CUSTOMIZADOS
  const { copyToClipboard, readFromClipboard, isClipboardSupported } = useClipboard()
  const navigate = useNavigate()
  
  // ✅ HOOK DE LOADING STATES UNIFICADO
  const {
    isLoading,
    isSyncing,
    isUpdating,
    isInitialLoad,
    allowInfiniteScroll,
    isLoadingMore,
    isLoadingData,
    isLoadingUI,
    setLoading,
    setMultipleLoading,
    withLoading,
    withMultipleLoading,
    canExecute
  } = useLoadingStates({
    initial: false,
    syncing: false,
    updating: false,
    contacts: false,
    messages: false,
    instances: false,
    moreContacts: false,
    moreMessages: false,
    sending: false,
    searching: false,
    allowInfiniteScroll: false,
    isInitialLoad: false
  });

  // ✅ HOOK DE SCROLL OTIMIZADO
  const {
    containerRef: messagesContainerRef,
    isAtBottom,
    isScrolling,
    scrollToBottom,
    scrollToPosition,
    checkIfAtBottom,
    getScrollInfo
  } = useScrollToBottom([messages.length]);

  // ✅ REFS E CONSTANTES
  const timeoutsRef = useRef([])
  const intervalsRef = useRef([])
  const lastMessageIdRef = useRef(null)
  const currentIntervalRef = useRef(30000)
  const lastMessageRef = useRef(null)
  const contactsContainerRef = useRef(null)
  const dropdownRef = useRef(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const CONTACTS_PER_PAGE = 15
  const MESSAGES_PER_PAGE = 20

  // ✅ CONFIGURAÇÕES DE ESTILO MOBILE
  const mobileStyles = useMemo(() => ({
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
      width: '100%'
    }
  }), []);

  // ✅ FUNÇÃO DE CLEANUP SEGURO
  const cleanupResources = useCallback(() => {
    timeoutsRef.current.forEach(timeoutId => {
      if (timeoutId) clearTimeout(timeoutId);
    });
    timeoutsRef.current = [];
    
    intervalsRef.current.forEach(intervalId => {
      if (intervalId) clearInterval(intervalId);
    });
    intervalsRef.current = [];
  }, []);

  // ✅ HOOK DE POLLING OTIMIZADO
  const { isActive: isPollingActive, forcePoll } = usePolling(
    useCallback(async () => {
      if (!currentContact?.remote_jid || !canExecute(['sending'])) return;
      
      try {
        const response = await fetch(`/api/messages/${currentContact.remote_jid}?page=1&limit=${MESSAGES_PER_PAGE}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.messages) {
            setMessages(prevMessages => {
              const newMessages = data.messages.filter(newMsg => 
                !prevMessages.some(existing => existing.id === newMsg.id)
              );
              
              if (newMessages.length > 0) {
                const updatedMessages = [...prevMessages, ...newMessages];
                const sortedMessages = updatedMessages.sort((a, b) => {
                  const timeA = new Date(a.timestamp || a.created_at).getTime();
                  const timeB = new Date(b.timestamp || b.created_at).getTime();
                  return timeA - timeB;
                });
                
                if (isAtBottom) {
                  setTimeout(() => scrollToBottom({ immediate: true }), 100);
                } else {
                  setUnreadCount(prev => prev + newMessages.length);
                }
                
                return sortedMessages;
              }
              
              return prevMessages;
            });
          }
        }
      } catch (error) {
        console.error('[POLLING] Erro no polling:', error);
      }
    }, [currentContact?.remote_jid, canExecute, isAtBottom, scrollToBottom]),
    30000, // 30 segundos
    {
      enabled: !!currentContact?.remote_jid && !isInitialLoad,
      immediate: false,
      maxRetries: 3,
      backoffMultiplier: 1.5,
      maxInterval: 300000
    }
  );

  // ✅ EFEITO PARA DETECTAR MUDANÇAS DE TAMANHO DA TELA
  useEffect(() => {
    const handleResize = debounce(() => {
      setIsMobileView(window.innerWidth < 768);
    }, 250);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✅ EFEITO PARA CLEANUP
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  // ✅ FUNÇÃO PARA ENVIAR MENSAGEM OTIMIZADA
  const handleSendMessage = useCallback(async (messageContent) => {
    if (!messageContent.trim() || !currentContact?.remote_jid || isSendingMessage) return;
    
    const validation = validateUserInput(messageContent, 'message');
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    try {
      setIsSendingMessage(true);
      setError(null);
      
      const messageId = generateMessageId();
      const tempMessage = {
        id: messageId,
        content: validation.value,
        role: 'ME',
        status: 'pending',
        temp: true,
        created_at: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      // Adicionar mensagem temporária
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      
      // Scroll para o final
      setTimeout(() => scrollToBottom({ immediate: true }), 100);

      // Enviar para o servidor
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          remote_jid: currentContact.remote_jid,
          content: validation.value,
          message_id: messageId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Atualizar mensagem temporária com dados reais
          setMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, ...data.message, temp: false, status: 'sent' }
              : msg
          ));
        } else {
          throw new Error(data.error || 'Erro ao enviar mensagem');
        }
      } else {
        throw new Error('Erro na resposta do servidor');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setError('Erro ao enviar mensagem. Tente novamente.');
      
      // Remover mensagem temporária em caso de erro
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } finally {
      setIsSendingMessage(false);
    }
  }, [currentContact?.remote_jid, isSendingMessage, scrollToBottom]);

  // ✅ FUNÇÃO PARA BUSCAR CONTATOS OTIMIZADA
  const fetchContacts = useCallback(async (page = 1, append = false) => {
    if (!canExecute(['contacts'])) return;
    
    try {
      await withLoading('contacts', async () => {
        const response = await fetch(`/api/contacts?page=${page}&limit=${CONTACTS_PER_PAGE}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.contacts) {
            if (append) {
              setContacts(prev => [...prev, ...data.contacts]);
            } else {
              setContacts(data.contacts);
              
              // Auto-selecionar primeiro contato se não há contato selecionado
              if (!currentContact && data.contacts.length > 0) {
                setCurrentContact(data.contacts[0]);
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      setError('Erro ao carregar contatos');
    }
  }, [canExecute, withLoading, currentContact]);

  // ✅ FUNÇÃO PARA BUSCAR MENSAGENS OTIMIZADA
  const fetchMessages = useCallback(async (remoteJid, page = 1, append = false) => {
    if (!remoteJid || !canExecute(['messages'])) return;
    
    try {
      await withLoading('messages', async () => {
        const response = await fetch(`/api/messages/${remoteJid}?page=${page}&limit=${MESSAGES_PER_PAGE}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.messages) {
            if (append) {
              setMessages(prev => [...data.messages, ...prev]);
            } else {
              setMessages(data.messages);
              setLoading('isInitialLoad', true);
              
              // Scroll para o final após carregar mensagens
              setTimeout(() => {
                scrollToBottom({ immediate: true });
                setLoading('isInitialLoad', false);
                setLoading('allowInfiniteScroll', true);
              }, 100);
            }
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      setError('Erro ao carregar mensagens');
    }
  }, [canExecute, withLoading, setLoading, scrollToBottom]);

  // ✅ FUNÇÃO PARA SELECIONAR CONTATO
  const handleSelectContact = useCallback((contact) => {
    if (contact?.remote_jid === currentContact?.remote_jid) return;
    
    setCurrentContact(contact);
    setMessages([]);
    setUnreadCount(0);
    setLoading('allowInfiniteScroll', false);
    setLoading('isInitialLoad', true);
    
    // Buscar mensagens do contato selecionado
    fetchMessages(contact.remote_jid, 1, false);
  }, [currentContact?.remote_jid, fetchMessages, setLoading]);

  // ✅ FUNÇÃO PARA SINCRONIZAR CONTATOS
  const syncContacts = useCallback(async () => {
    if (!canExecute(['syncing'])) return;
    
    try {
      await withLoading('syncing', async () => {
        const response = await fetch('/api/contacts/sync', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Recarregar contatos após sincronização
            await fetchContacts(1, false);
            setLastSyncTime(new Date());
          }
        }
      });
    } catch (error) {
      console.error('Erro ao sincronizar contatos:', error);
      setError('Erro ao sincronizar contatos');
    }
  }, [canExecute, withLoading, fetchContacts]);

  // ✅ EFEITO PARA CARREGAR DADOS INICIAIS
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading('initial', true);
        
        // Carregar usuário atual
        const userResponse = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success) {
            setCurrentUser(userData.user);
          }
        }
        
        // Carregar contatos
        await fetchContacts(1, false);
        
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        setError('Erro ao carregar dados iniciais');
      } finally {
        setLoading('initial', false);
      }
    };
    
    loadInitialData();
  }, [fetchContacts, setLoading]);

  // ✅ FUNÇÃO PARA FORMATAR DATA
  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else {
        return date.toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit' 
        });
      }
    } catch (error) {
      return '';
    }
  }, []);

  // ✅ FUNÇÃO PARA RENDERIZAR MENSAGEM
  const renderMessage = useCallback((message) => {
    const isOwnMessage = message.role === 'ME';
    const isAIMessage = message.role === 'AI';
    
    let bgColorClass = 'bg-white/10 text-cyan-100 rounded-tl-lg rounded-tr-lg rounded-bl-lg';
    let borderClass = 'border-cyan-800/30';
    let textColorClass = 'text-cyan-300/80';
    
    if (isOwnMessage) {
      bgColorClass = 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg';
      borderClass = 'border-blue-700/50';
      textColorClass = 'text-blue-100/80';
    } else if (isAIMessage) {
      bgColorClass = 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg';
      borderClass = 'border-indigo-700/50';
      textColorClass = 'text-indigo-100/80';
    }
    
    return (
      <div 
        key={message.id}
        className="mb-3"
        style={{ 
          width: '100%', 
          display: 'flex', 
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start'
        }}
      >
        <div className={`max-w-[75%] shadow-lg ${bgColorClass} p-2 border ${borderClass} ${message.temp ? 'opacity-70' : ''}`}>
          <p>{sanitizeContent(message.content)}</p>
          <div className={`text-xs mt-1 text-right whitespace-nowrap ${textColorClass} flex items-center justify-end`}>
            {formatDate(message.created_at)}
            {message.temp ? (
              <span className="ml-1">
                <FaSpinner className="animate-spin text-xs ml-1" />
              </span>
            ) : message.status === 'pending' ? (
              <span className="ml-1">
                <FaClock className="text-gray-400" />
              </span>
            ) : message.status === 'sent' ? (
              <span className="ml-1">
                <FaCheck className="text-cyan-400" />
              </span>
            ) : message.status === 'delivered' ? (
              <span className="ml-1">
                <FaCheck className="text-blue-400" />
              </span>
            ) : message.status === 'read' ? (
              <span className="ml-1">
                <FaCheck className="text-green-400" />
              </span>
            ) : (message.role === 'ME' || message.role === 'AI') && (
              <span className="ml-1">
                {message.is_read ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }, [formatDate]);

  // ✅ RENDERIZAÇÃO PRINCIPAL
  return (
    <div style={mobileStyles.pageContainer}>
      <Navbar />
      
      <div style={mobileStyles.contentContainer}>
        {/* Barra de busca e controles */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-300 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar contatos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 text-cyan-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/60 border border-cyan-800/50 placeholder-cyan-300/70"
            />
          </div>
          
          <button
            onClick={syncContacts}
            disabled={isSyncing}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? <FaSpinner className="animate-spin" /> : 'Sincronizar'}
          </button>
        </div>

        {/* Área principal do chat */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Lista de contatos */}
          <div className="w-1/3 min-w-0 flex flex-col">
            <div className="flex-1 overflow-y-auto bg-white/5 rounded-lg border border-cyan-800/50">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <FaSpinner className="animate-spin text-cyan-300" />
                </div>
              ) : (
                <div className="p-2">
                  {contacts
                    .filter(contact => 
                      !searchTerm || 
                      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      contact.push_name?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(contact => (
                      <div
                        key={contact.id || contact.remote_jid}
                        onClick={() => handleSelectContact(contact)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 mb-2 ${
                          currentContact?.remote_jid === contact.remote_jid
                            ? 'bg-cyan-600/30 border border-cyan-500/50'
                            : 'bg-white/5 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {(contact.name || contact.push_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-cyan-100 truncate">
                              {contact.name || contact.push_name || 'Contato'}
                            </h4>
                            <p className="text-sm text-cyan-300/70 truncate">
                              {contact.last_message || 'Nenhuma mensagem'}
                            </p>
                          </div>
                          {contact.last_message_time && (
                            <span className="text-xs text-cyan-300/60">
                              {formatDate(contact.last_message_time)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Área de mensagens */}
          <div className="flex-1 min-w-0 flex flex-col">
            {currentContact ? (
              <>
                {/* Cabeçalho do chat */}
                <div className="bg-white/5 rounded-lg border border-cyan-800/50 p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {(currentContact.name || currentContact.push_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-cyan-100 text-lg">
                        {currentContact.name || currentContact.push_name || 'Contato'}
                      </h3>
                      <p className="text-sm text-cyan-300/70">
                        {currentContact.remote_jid}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-cyan-300 hover:text-cyan-100 hover:bg-white/10 rounded-full transition-colors">
                        <FaPhone className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-cyan-300 hover:text-cyan-100 hover:bg-white/10 rounded-full transition-colors">
                        <FaVideo className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-cyan-300 hover:text-cyan-100 hover:bg-white/10 rounded-full transition-colors">
                        <FaEllipsisV className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Área de mensagens */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto bg-white/5 rounded-lg border border-cyan-800/50 p-4 mb-4"
                  style={mobileStyles.messagesContainer}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <FaSpinner className="animate-spin text-cyan-300" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map(renderMessage)}
                    </div>
                  )}
                </div>

                {/* Input de mensagem otimizado */}
                <MessageInputOptimized
                  onSendMessage={handleSendMessage}
                  disabled={isSendingMessage}
                  placeholder="Digite sua mensagem..."
                  maxLength={SECURITY_CONFIG.MAX_MESSAGE_LENGTH}
                  showEmojiButton={!isMobileView}
                  showAttachmentButton={!isMobileView}
                  showVoiceButton={true}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xl mb-2 text-cyan-100">Selecione uma conversa para começar</p>
                  <p className="text-cyan-300">Ou sincronize seus contatos para ver as conversas disponíveis</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Indicador de erro */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
            <div className="flex items-center gap-2">
              <FaExclamationTriangle className="w-4 h-4" />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-2 text-white/80 hover:text-white"
              >
                <FaTimesCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Indicador de status de conexão */}
        {!isOnline && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white p-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <FaExclamationTriangle className="w-4 h-4" />
              <span>Sem conexão com a internet</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
