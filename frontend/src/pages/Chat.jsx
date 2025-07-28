import React, { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { FaSearch, FaEllipsisV, FaPaperclip, FaMicrophone, FaSmile, FaPhone, FaVideo, FaPlus, FaArrowLeft, FaSpinner, FaExclamationTriangle, FaWallet, FaCalculator, FaFileAlt, FaTimesCircle, FaCheckCircle, FaInfoCircle, FaIdCard, FaRegCopy } from 'react-icons/fa'
import { IoSend } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../utilities/apiFetch';
import { cachedFetch } from '../utils/authCache'

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
    console.log("formataMoeda: valor nulo ou indefinido");
    return null;
  }
  
  try {
    // Garantir que estamos trabalhando com um número
    let numero;
    
    // Verificar se já é um número
    if (typeof valor === 'number') {
      console.log(`formataMoeda: valor já é número: ${valor}`);
      numero = valor;
    } else {
      // Tentar converter string para número
      // Remover qualquer formatação que possa existir
      const valorLimpo = String(valor).replace(/[^\d.,]/g, '')
        .replace(/\./g, '#')  // Substituir temporariamente pontos
        .replace(/,/g, '.')   // Substituir vírgulas por pontos
        .replace(/#/g, '');   // Remover pontos temporários
      
      numero = parseFloat(valorLimpo);
      console.log(`formataMoeda: convertido string "${valor}" para número: ${numero}`);
    }
    
    // Verificar se a conversão resultou em um número válido
    if (isNaN(numero)) {
      console.warn(`formataMoeda: não foi possível converter "${valor}" para número`);
      return null;
    }
    
    // Formatar o número como moeda brasileira
    const formatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(numero);
    
    console.log(`formataMoeda: valor formatado com sucesso: ${numero} -> ${formatado}`);
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
  const [isLoading, setIsLoading] = useState(false) // Inicializar como false
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false) // Controle de envio
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState(0) // Timestamp do último envio
  const [currentUser, setCurrentUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768)
  const [screenWidth, setScreenWidth] = useState(window.innerWidth)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [autoResponseContacts, setAutoResponseContacts] = useState({})
  const [forceUpdate, setForceUpdate] = useState(0)
  const messagesEndRef = useRef(null)
  const lastMessageIdRef = useRef(null) // Referência para o último ID de mensagem
  const timeoutsRef = useRef([])
  const intervalsRef = useRef([])
  const navigate = useNavigate()
  const [agentMode, setAgentMode] = useState('full');
  
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
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const [prevMessagesLength, setPrevMessagesLength] = useState(0);

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
    console.log('Componente Chat inicializado');
    console.log('Estado inicial de contactData:', contactData);
  }, []);

  // Cleanup de timeouts e intervals quando o componente for desmontado
  useEffect(() => {
    return () => {
      // Limpar todos os timeouts
      timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutsRef.current = [];
      
      // Limpar todos os intervals
      intervalsRef.current.forEach(intervalId => clearInterval(intervalId));
      intervalsRef.current = [];
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
        
        console.log(`Resultado do teste de conexão: ${data.success ? 'Sucesso' : 'Falha'}`);
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
      console.log('Resposta completa da API /api/auth/me:', data);
      
      // Verificar e extrair o objeto user da resposta
      if (data.success && data.user) {
        console.log('Usuário obtido via API:', data.user);
        return data.user; // Retornar o objeto user, não a resposta completa
      } else if (data.id) {
        // Se a API retornar o usuário diretamente sem wrapper
        console.log('Usuário obtido diretamente da API:', data);
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
        setIsLoading(true);
        setError(null);
        
        // Tenta obter do backend via API
        const userData = await fetchUserFromApi();
        
        if (userData && userData.id) {
          console.log(`Usuário autenticado com ID: ${userData.id}`);
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
        setIsLoading(false);
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

  // Função para determinar se o botão AI deve estar ligado para cada contato
  const isAgentAiActive = (contact) => {
    if (!contact) return false;
    return contact.agent_state === 'ai';
  };

  // Busca a lista de contatos do usuário quando o usuário é carregado
  useEffect(() => {
    if (!currentUser?.id) {
      console.log("Usuário não disponível para buscar contatos");
      return;
    }
    
    async function fetchContacts() {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`Buscando contatos para usuário: ${currentUser.id}`);
        
        // Buscar contatos via API
        const startTime = Date.now();
        const response = await fetch('/api/contacts', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login?error=session_expired&message=Sua sessão expirou. Por favor, faça login novamente.');
            return;
          }
          
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro ${response.status} ao buscar contatos`);
        }
        
        const data = await response.json();
        const duration = Date.now() - startTime;
        
        console.log(`Consulta de contatos finalizada em ${duration}ms`);
        console.log('Resposta completa da API de contatos:', data);
        
        if (!data.success) {
          throw new Error(data.message || 'Erro ao buscar contatos');
        }
        
        // Extrair a lista de contatos do objeto de resposta
        const contactsList = data.contacts || [];
        console.log(`Contatos encontrados: ${contactsList.length}`, contactsList);
        
        // Log para debug - verificar se agent_state e last_message_time estão vindo corretamente
        contactsList.forEach(contact => {
          console.log(`Contato ${contact.name || contact.push_name || 'Desconhecido'}: 
            - agent_state = ${contact.agent_state || 'não definido'}
            - last_message_time = ${contact.last_message_time || 'não definido'}`);
        });
        
        // Buscar a última mensagem para TODOS os contatos, independente de terem last_message_time
        const contactsWithLastMessagePromises = contactsList.map(async (contact) => {
          try {
            console.log(`Buscando última mensagem para contato: ${contact.remote_jid}`);
            const messagesResponse = await fetch(`/api/chat/messages/${contact.remote_jid}/last`, {
              credentials: 'include'
            });
            
            if (messagesResponse.ok) {
              const messageData = await messagesResponse.json();
              if (messageData.success && messageData.message) {
                console.log(`Última mensagem para ${contact.name || contact.push_name || 'Desconhecido'}: ${JSON.stringify(messageData.message)}`);
                return {
                  ...contact,
                  last_message_time: messageData.message.timestamp || messageData.message.created_at,
                  last_message: messageData.message.content
                };
              } else {
                console.log(`Sem mensagens para ${contact.name || contact.push_name || 'Desconhecido'}`);
              }
            } else {
              console.error(`Erro na resposta da API para ${contact.remote_jid}: ${messagesResponse.status}`);
            }
          } catch (error) {
            console.error(`Erro ao buscar última mensagem para ${contact.remote_jid}:`, error);
          }
          return contact;
        });
        
        // Aguardar todas as promessas
        const contactsWithLastMessages = await Promise.all(contactsWithLastMessagePromises);
        
        // Verificar e usar os valores recebidos da API
        if (contactsWithLastMessages.length > 0) {
          console.log('Usando contatos com last_message_time atualizado:');
          contactsWithLastMessages.forEach(contact => {
            console.log(`- ${contact.name || contact.push_name || 'Desconhecido'}: last_message_time = ${contact.last_message_time || 'não definido'}`);
          });
          
          setContacts(contactsWithLastMessages);
          
          // Agora também atualizamos o estado de exibição
          const sortedContacts = [...contactsWithLastMessages].sort((a, b) => {
            // Se não tiver hora da última mensagem, coloca no final
            if (!a.last_message_time) return 1;
            if (!b.last_message_time) return -1;
            
            // Ordem decrescente (mais recente primeiro)
            return new Date(b.last_message_time) - new Date(a.last_message_time);
          });
          setDisplayContacts(sortedContacts);
          
          // Se não estiver no modo mobile, seleciona automaticamente o primeiro contato
          if (!isMobileView) {
            setCurrentContact(sortedContacts[0]);
          }
        } else {
          console.log('Nenhum contato encontrado para este usuário');
          setDisplayContacts([]);
        }
      } catch (error) {
        console.error('Erro ao buscar contatos:', error);
        setError(`Erro ao buscar contatos: ${error.message}. Por favor, tente novamente.`);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchContacts();
  }, [currentUser, isMobileView, navigate]);

  // Função para visualizar detalhes do banco de dados (debug)
  const debugDatabase = async () => {
    if (!currentUser?.id) return;
    
    setIsRefreshing(true);
    
    try {
      console.log("==== DIAGNÓSTICO DA API ====");
      
      // Testar contagem de contatos
      const countResponse = await fetch('/api/contacts/count', {
        credentials: 'include'
      });
      const countData = await countResponse.json();
      console.log("Contagem de contatos:", countData);
      
      // Testar API de usuário
      const userResponse = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      const userData = await userResponse.json();
      console.log("Dados do usuário:", userData);
      
      // Testar API de contatos
      const contactsResponse = await fetch('/api/contacts', {
        credentials: 'include'
      });
      const contactsData = await contactsResponse.json();
      console.log("Contatos do usuário:", contactsData);
      
      setConnectionStatus({
        connected: true,
        diagnosticsRun: true,
        timestamp: new Date().toISOString(),
        totalContacts: countData.count,
        userContacts: contactsData.contacts?.length || 0
      });
    } catch (error) {
      console.error("Erro ao executar diagnóstico:", error);
      setConnectionStatus({
        connected: false,
        diagnosticsRun: true,
        timestamp: new Date().toISOString(),
        error: error.message
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Limpar mensagens ao trocar de contato
  useEffect(() => {
    if (currentContact) {
      // Ao trocar de contato, limpar as mensagens sem marcar como carregando
      // O carregamento será controlado pela função fetchMessages
      setMessages([]);
    }
  }, [currentContact]);

  // Busca as mensagens para o contato selecionado
  useEffect(() => {
    if (!currentContact || !currentUser?.id) return;
    
    let isMounted = true;
    
    async function fetchMessages(silent = false) {
      try {
        if (!silent && isMounted) {
          setIsUpdating(true);
        }
        
        console.log(`Buscando mensagens para conversa: ${currentContact.remote_jid}`);
        
        // Buscar mensagens da conversa atual via API
        const response = await fetch(`/api/messages/${currentContact.remote_jid}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login?error=session_expired&message=Sua sessão expirou. Por favor, faça login novamente.');
            return;
          }
          
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro ${response.status} ao buscar mensagens`);
        }
        
        const data = await response.json();
        console.log('Resposta completa da API de mensagens:', data);
        
        if (!data.success) {
          throw new Error(data.message || 'Erro ao buscar mensagens');
        }
        
        // Extrair a lista de mensagens do objeto de resposta
        const messagesList = data.messages || [];
        console.log(`Mensagens encontradas: ${messagesList.length}`, messagesList);
        
        if (isMounted) {
          // Processar mensagens para identificar corretamente remetente e destinatário
          const processedMessages = messagesList.map(msg => {
            // **** FORÇA BRUTA: Garante que TODA mensagem tenha um role válido ****
            // Definir role se não existir ou for inválido
            if (!msg.role || !['ME', 'AI', 'USER'].includes(msg.role)) {
              // Log para informar que estamos forçando um role
              console.warn(`Forçando um role para mensagem sem role válido: ID=${msg.id}, conteúdo="${msg.content?.substring(0, 15) || ''}", role antigo="${msg.role || 'undefined'}"`);
              
              // Usar valor padrão USER ao invés de verificar sender_id
              msg.role = 'USER';
            }
            
            // **** DEPURAÇÃO: Logando detalhes de cada mensagem ****
            console.log(`[DEBUG] Mensagem #${msg.id}:
              - content: ${msg.content?.substring(0, 30)}...
              - role: ${msg.role}
              - sender_id: ${msg.sender_id || 'N/A'}
              - from_me (original): ${msg.from_me}
              - from_me (baseado no role): ${msg.role === 'ME' || msg.role === 'AI'}
              - currentUser.id: ${currentUser?.id}
            `);
            
            // **** MÉTODO DIRETO: Define from_me APENAS baseado no role ****
            return {
              ...msg,
              // Tanto 'ME' quanto 'AI' são mensagens enviadas pelo sistema/agente
              from_me: msg.role === 'ME' || msg.role === 'AI',
              // Garantir que qualquer role inexistente se torne 'USER'
              role: msg.role || 'USER' 
            };
          });
          
          // Ordenar por data se necessário
          const sortedMessages = processedMessages.sort((a, b) => {
            return new Date(a.created_at || a.timestamp) - new Date(b.created_at || b.timestamp);
          });
          
          setMessages(sortedMessages);
          // Desativar o estado de carregamento após obter as mensagens
          setIsLoading(false);
          
          // *** DEPURAÇÃO: Apresentar um resumo de todas as mensagens para verificar o role/posição ***
          console.log("Resumo das mensagens processadas:");
          sortedMessages.forEach((m, index) => {
            const isToDireita = m.role === 'ME' || m.role === 'AI';
            console.log(`#${index+1}: role="${m.role}", alinhamento="${isToDireita ? 'direita' : 'esquerda'}", conteúdo="${m.content?.substring(0, 25)}..."`);
          });
          
          // Log de diagnóstico detalhado
          console.log("Mensagens processadas:", sortedMessages.map(m => ({
            id: m.id,
            content: m.content?.substring(0, 15) + "...",
            role: m.role,
            from_me: m.from_me,
            sender_id: m.sender_id
          })));
        }
      } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        if (isMounted) {
          if (!silent) {
            setError('Erro ao buscar mensagens. Por favor, tente novamente.');
          }
          // Mesmo em caso de erro, desativa o estado de carregamento
          setIsLoading(false);
        }
      } finally {
        if (isMounted) {
          setIsUpdating(false);
        }
      }
    }
    
    // Primeiro carregamento
    fetchMessages(false);
    
    // Implementação temporária: Polling a cada 10 segundos (silencioso)
    const intervalId = setInterval(() => {
      fetchMessages(true);
    }, 10000);
      
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [currentContact, currentUser, navigate]);

  // Identifica quando novas mensagens são enviadas pelo usuário atual
  useEffect(() => {
    // Se o número de mensagens aumentou e a última mensagem é do usuário atual
    if (messages.length > prevMessagesLength && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Verifica se é uma mensagem enviada pelo usuário (ME ou AI)
      if (lastMessage.role === 'ME' || lastMessage.role === 'AI') {
        setShouldScrollToBottom(true);
      }
    } else {
      setShouldScrollToBottom(false);
    }
    
    // Atualiza o contador de mensagens anterior
    setPrevMessagesLength(messages.length);
  }, [messages, prevMessagesLength]);

  // Rola automaticamente para a última mensagem apenas quando necessário
  useEffect(() => {
    if (shouldScrollToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setShouldScrollToBottom(false);
    }
  }, [shouldScrollToBottom]);

  // Função para recarregar dados
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
        
        // Também atualizar o estado de exibição
        const sortedContacts = [...contactsList].sort((a, b) => {
          if (!a.last_message_time) return 1;
          if (!b.last_message_time) return -1;
          return new Date(b.last_message_time) - new Date(a.last_message_time);
        });
        setDisplayContacts(sortedContacts);
        
        if (!isMobileView && !currentContact && contactsList.length > 0) {
          setCurrentContact(sortedContacts[0]);
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

  // Função para alternar a resposta automática para um contato
  const toggleAutoResponse = async (contactId, e) => {
    e.stopPropagation(); // Evita que o clique ative a seleção do contato
    
    // Log para depuração
    console.log(`Alterando estado do agente para contato ID: ${contactId}`);
    
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
    console.log("Contato encontrado:", contact);
    
    // Determinar o estado atual e o novo estado (considerar estado padrão se não existir)
    const currentState = contact.agent_state === 'ai';
    const newAgentState = currentState ? 'human' : 'ai';
    
    console.log(`Estado atual: ${contact.agent_state || 'undefined'}, Novo estado: ${newAgentState}`);
    
    // Atualiza localmente primeiro (para feedback imediato)
    const newContacts = [...contacts];
    newContacts[contactIndex] = {
      ...contact,
      agent_state: newAgentState
    };
    setContacts(newContacts);
    
    // Atualizar também o estado de exibição para manter sincronizado
    setDisplayContacts(prev => {
      const displayIndex = prev.findIndex(c => {
        const cId = c.id || c.remote_jid;
        return cId === contactId;
      });
      
      if (displayIndex === -1) return prev;
      
      const newDisplay = [...prev];
      newDisplay[displayIndex] = {
        ...prev[displayIndex],
        agent_state: newAgentState
      };
      
      return newDisplay;
    });
    
    // Se for o contato atual, atualize-o também
    if (currentContact && (currentContact.id === contactId || currentContact.remote_jid === contactId)) {
      const updatedCurrentContact = {
        ...currentContact,
        agent_state: newAgentState
      };
      setCurrentContact(updatedCurrentContact);
    }
    
    // Forçar re-renderização
    setForceUpdate(prev => prev + 1);
    
    try {
      // Extrair o remote_jid correto para a chamada de API
      const remoteJid = contact.remote_jid || contactId;
      
      // Chamar a API para persistir a alteração
      console.log(`Enviando requisição para API: POST /api/contacts/${remoteJid}/state`);
      console.log(`Payload: { agent_state: "${newAgentState}" }`);
      
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
      console.log('Resposta da API:', data);
      
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
      
      // Reverter também no estado de exibição
      setDisplayContacts(prev => {
        const displayIndex = prev.findIndex(c => {
          const cId = c.id || c.remote_jid;
          return cId === contactId;
        });
        
        if (displayIndex === -1) return prev;
        
        const newDisplay = [...prev];
        newDisplay[displayIndex] = {
          ...prev[displayIndex],
          agent_state: currentState ? 'ai' : 'human'
        };
        
        return newDisplay;
      });
      
      // Se for o contato atual, reverta-o também
      if (currentContact && (currentContact.id === contactId || currentContact.remote_jid === contactId)) {
        setCurrentContact({
          ...currentContact,
          agent_state: currentState ? 'ai' : 'human'
        });
      }
      
      // Forçar re-renderização novamente após reverter
      setForceUpdate(prev => prev + 1);
      
      // Notificar o usuário sobre o erro
      setError(`Erro ao atualizar estado do agente: ${error.message}`);
    }
  };

  // Função processadora de envio de mensagens - separada para poder aplicar debounce
  const processSendMessage = async (messageContent, messageId) => {
    if (!messageContent.trim() || !currentContact || !currentUser) return;
    
    // Verificar se é a mesma mensagem sendo enviada novamente em um curto período
    if (lastMessageIdRef.current === messageId) {
      console.log('Ignorando envio duplicado com mesmo ID:', messageId);
      return;
    }
    
    // Verificar se passou tempo suficiente desde o último envio (500ms mínimo)
    const now = Date.now();
    if (now - lastMessageTimestamp < 500) {
      console.log('Ignorando clique rápido:', now - lastMessageTimestamp, 'ms desde o último envio');
      return;
    }
    
    try {
      setIsSendingMessage(true);
      // Atualizar timestamp e ID da última mensagem
      setLastMessageTimestamp(now);
      lastMessageIdRef.current = messageId;
      
      // Adicionar a mensagem temporariamente ao estado local para feedback imediato
      const tempMsg = {
        id: messageId,
        content: messageContent,
        sender_id: currentUser.id,
        receiver_id: currentContact.phone || currentContact.remote_jid,
        created_at: new Date().toISOString(),
        is_read: false,
        from_me: true,
        role: 'ME',
        temp: true // Marcar como temporária
      };
      
      // Adicionar a mensagem temporária imediatamente ao estado
      setMessages(prev => [...prev, tempMsg]);
      
      // Indica que deve rolar para o final após enviar
      setShouldScrollToBottom(true);
      
      const payload = {
        conversationId: currentContact.remote_jid,
        content: messageContent,
        recipientId: currentContact.phone,
        role: 'ME',
        messageId: messageId // Enviar ID único para backend
      };
      
      console.log('Enviando nova mensagem:', payload);
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
      
      if (!data.success) {
        // Remover a mensagem temporária em caso de erro
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        
        throw new Error(data.message || 'Erro ao enviar mensagem');
      }
      
      // Extrair a mensagem da resposta da API
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
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Apenas hora para mensagens de hoje
      if (messageDate >= today) {
        return messageDate.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } 
      // "Ontem" para mensagens de ontem
      else if (messageDate >= yesterday) {
        return `Ontem ${messageDate.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
      } 
      // "dd/mm" para mensagens de dias anteriores
      else {
        const formattedDate = messageDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        });
        const formattedTime = messageDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        return `${formattedDate} ${formattedTime}`;
      }
    } catch (error) {
      console.error(`Erro ao formatar data ${dateString}:`, error);
      return '';
    }
  };

  // Função para selecionar contato
  const handleSelectContact = (contact) => {
    setCurrentContact(contact);
    
    // Não atualizar a lista de exibição ao selecionar um contato
    // Isso evita alterações visuais inesperadas durante a interação
  };

  // Função para voltar para a lista de contatos (mobile)
  const handleBackToContacts = () => {
    setCurrentContact(null);
    
    // Ao voltar para a lista, reordenar os contatos para mostrar as atualizações
    const sortedContacts = [...contacts].sort((a, b) => {
      if (!a.last_message_time) return 1;
      if (!b.last_message_time) return -1;
      return new Date(b.last_message_time) - new Date(a.last_message_time);
    });
    
    setDisplayContacts(sortedContacts);
    console.log('Reordenando contatos ao voltar para a lista');
  };

  // Adicionar função para enviar mensagem de diagnóstico
  const sendTestMessage = async (role) => {
    if (!currentContact || !currentUser) return;
    
    try {
      const messageText = `[TESTE] Mensagem enviada automaticamente com role='${role}' (${new Date().toLocaleTimeString()})`;
      
      const payload = {
        conversationId: currentContact.remote_jid,
        content: messageText,
        recipientId: currentContact.phone,
        role: role  // Especificar o role de teste
      };
      
      console.log(`Enviando mensagem de teste com role=${role}:`, payload);
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      console.log('Status da resposta (teste):', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status} ao enviar mensagem de teste`);
      }
      
      const data = await response.json();
      console.log('Resposta completa da mensagem de teste:', data);
      
      // Atualizar a lista de mensagens com a nova mensagem
      if (data.success && data.message) {
        const processedMsg = {
          ...data.message,
          from_me: role === 'ME' || role === 'AI',
          role: role
        };
        setMessages(prev => [...prev, processedMsg]);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem de teste:', error);
      setError(`Erro ao enviar mensagem de teste: ${error.message}`);
    }
  };

  // Adicionar função para enviar mensagem com teste de role e sender_id específicos
  const sendTestMessageWithDetails = async () => {
    if (!currentContact || !currentUser) return;
    
    try {
      // Criar três mensagens de teste, uma para cada role
      const testMessages = [
        {
          role: 'ME',
          content: `[TESTE ME] Mensagem do usuário (${new Date().toLocaleTimeString()})`,
          sender_id: currentUser.id
        },
        {
          role: 'AI',
          content: `[TESTE AI] Mensagem do assistente (${new Date().toLocaleTimeString()})`,
          sender_id: currentUser.id
        },
        {
          role: 'USER',
          content: `[TESTE USER] Mensagem do cliente (${new Date().toLocaleTimeString()})`,
          sender_id: currentContact.remote_jid
        }
      ];
      
      // Processar cada mensagem de teste
      for (const testMsg of testMessages) {
        const payload = {
          conversationId: currentContact.remote_jid,
          content: testMsg.content,
          recipientId: currentContact.phone,
          role: testMsg.role,
          sender_id: testMsg.sender_id // Adicionar sender_id explicitamente para teste
        };
        
        console.log(`Enviando mensagem de teste: ${JSON.stringify(payload)}`);
        
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro ${response.status} ao enviar mensagem de teste`);
        }
        
        const data = await response.json();
        console.log(`Resposta da API para mensagem ${testMsg.role}:`, data);
      }
      
      // Atualizar a interface para mostrar as novas mensagens
      const updatedResponse = await fetch(`/api/messages/${currentContact.remote_jid}`, {
        credentials: 'include'
      });
      
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        if (updatedData.success) {
          // Processar as mensagens atualizadas
          const updatedMessages = updatedData.messages || [];
          
          // Usar o mesmo processamento das mensagens
          const processed = updatedMessages.map(msg => {
            if (msg.role && ['ME', 'AI', 'USER'].includes(msg.role)) {
              return {
                ...msg,
                from_me: msg.role === 'ME' || msg.role === 'AI'
              };
            }
            
            // Lógica de fallback simplificada para testes
            return {
              ...msg,
              from_me: msg.sender_id === currentUser.id,
              role: msg.role || (msg.sender_id === currentUser.id ? 'ME' : 'USER')
            };
          });
          
          setMessages(processed);
        }
      }
    } catch (error) {
      console.error('Erro no teste de mensagens detalhado:', error);
      setError(`Erro no teste: ${error.message}`);
    }
  };

  // Adicionar função para teste específico da prioridade de role vs sender_id
  const testRoleVsSenderId = async () => {
    if (!currentContact || !currentUser) return;
    
    try {
      // Criar mensagens de teste com combinações específicas para testar prioridade
      const testMessages = [
        {
          // 1. Mensagem com role 'ME' mas sender_id do cliente (deve aparecer à direita devido ao role)
          role: 'ME',
          content: `[TESTE] Role=ME mas sender_id do cliente (${new Date().toLocaleTimeString()})`,
          sender_id: currentContact.remote_jid
        },
        {
          // 2. Mensagem com role 'USER' mas sender_id do usuário (deve aparecer à esquerda devido ao role)
          role: 'USER',
          content: `[TESTE] Role=USER mas sender_id do usuário (${new Date().toLocaleTimeString()})`,
          sender_id: currentUser.id
        },
        {
          // 3. Mensagem com role 'AI' mas sender_id do cliente (deve aparecer à direita devido ao role)
          role: 'AI',
          content: `[TESTE] Role=AI mas sender_id do cliente (${new Date().toLocaleTimeString()})`,
          sender_id: currentContact.remote_jid
        }
      ];
      
      // Processar cada mensagem de teste
      const localMessageCopy = [...messages];
      
      for (const testMsg of testMessages) {
        const payload = {
          conversationId: currentContact.remote_jid,
          content: testMsg.content,
          recipientId: currentContact.phone,
          role: testMsg.role,
          sender_id: testMsg.sender_id
        };
        
        console.log(`Enviando teste role vs sender_id: ${JSON.stringify(payload)}`);
        
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Erro no teste ${testMsg.role}:`, errorData);
          continue;
        }
        
        const data = await response.json();
        
        if (data.success && data.message) {
          // Adicionar a mensagem processada à cópia local para exibição imediata
          const processedMsg = {
            ...data.message,
            from_me: testMsg.role === 'ME' || testMsg.role === 'AI',
            role: testMsg.role
          };
          
          localMessageCopy.push(processedMsg);
          console.log(`Mensagem de teste ${testMsg.role} processada:`, processedMsg);
        }
      }
      
      // Atualizar as mensagens com a cópia local
      setMessages(localMessageCopy);
      
    } catch (error) {
      console.error('Erro no teste role vs sender_id:', error);
      setError(`Erro no teste: ${error.message}`);
    }
  };

  // Efeito para atualizar a hora da última mensagem no contato correspondente
  useEffect(() => {
    // Só executar se houver mensagens
    if (!messages.length || !currentContact) return;
    
    // Obter a última mensagem
    const lastMessage = messages[messages.length - 1];
    
    // Atualizar a hora da última mensagem e o texto para o contato atual
    setContacts(prevContacts => {
      const updatedContacts = prevContacts.map(contact => {
        if ((contact.id || contact.remote_jid) === (currentContact.id || currentContact.remote_jid)) {
          return {
            ...contact,
            last_message: lastMessage.content,
            last_message_time: lastMessage.created_at || new Date().toISOString()
          };
        }
        return contact;
      });
      
      return updatedContacts;
    });
  }, [messages, currentContact]);
  
  // Efeito para manter o displayContacts atualizado quando contacts mudar
  // mas não durante a interação com um contato específico
  useEffect(() => {
    // Não reordenar imediatamente se um contato estiver selecionado
    // Isso evita mudanças confusas na UI
    if (!currentContact) {
      const sortedContacts = [...contacts].sort((a, b) => {
        if (!a.last_message_time) return 1;
        if (!b.last_message_time) return -1;
        return new Date(b.last_message_time) - new Date(a.last_message_time);
      });
      
      setDisplayContacts(sortedContacts);
      console.log('Atualizando ordem de exibição dos contatos (sem contato selecionado)');
    }
  }, [contacts, currentContact]);

  // Buscar dados do contato quando um contato é selecionado
  useEffect(() => {
    if (!currentContact || !currentUser?.id) return;
    
    async function fetchContactData() {
      try {
        console.log(`Buscando dados detalhados para contato: ${currentContact.remote_jid}`, {
          contact: currentContact,
          hasLeadId: Boolean(currentContact.lead_id)
        });
        
        // Não limpar dados anteriores durante o carregamento
        // Em vez disso, definimos apenas uma flag de carregamento
        // que vai ser usada para mostrar o spinner
        setIsLoading(true);
        
        // Função para buscar dados diretamente se a API normal falhar
        const fetchDirectData = async () => {
          console.log('Tentando obter dados diretos do banco...');
          try {
            const directResponse = await fetch(`/api/dev/direct-data?contactId=${currentContact.remote_jid}`, {
              credentials: 'include'
            });
            
            if (!directResponse.ok) {
              throw new Error(`Erro ao acessar dados diretos: ${directResponse.status}`);
            }
            
            const directData = await directResponse.json();
            console.log('Dados obtidos diretamente:', directData);
            
            // Verificar todos os dados relacionados à proposta
            console.log('Dados brutos da proposta recebidos:');
            console.log('- proposal_id:', directData.proposal_id);
            console.log('- proposal_status:', directData.proposal_status);
            console.log('- proposal_amount:', directData.proposal_amount);
            console.log('- formalization_link:', directData.formalization_link);
            console.log('- pix_key:', directData.pix_key);
            // Verificar também campos alternativos
            console.log('- valor_proposta:', directData.valor_proposta);
            console.log('- link_formalizacao:', directData.link_formalizacao);
            console.log('- chave_pix:', directData.chave_pix);
            
            if (directData.success) {
              // Converter explicitamente para número
              let saldo = null;
              let simulado = null;
              let valorProposta = null;
              
              if (directData.balance !== null && directData.balance !== undefined) {
                saldo = Number(directData.balance);
                console.log(`Saldo direto recebido: ${directData.balance} -> convertido para ${saldo}`);
              }
              
              if (directData.simulation !== null && directData.simulation !== undefined) {
                simulado = Number(directData.simulation);
                console.log(`Simulado direto recebido: ${directData.simulation} -> convertido para ${simulado}`);
              }
              
              // Processar valor da proposta - verificando todos os possíveis campos
              const valorPropostaRaw = directData.proposal_amount || directData.valor_proposta;
              if (valorPropostaRaw !== null && valorPropostaRaw !== undefined) {
                valorProposta = Number(valorPropostaRaw);
                console.log(`Valor da proposta recebido: ${valorPropostaRaw} -> convertido para ${valorProposta}`);
              }
              
              // Verificar vários campos possíveis para link e pix
              const linkFormalizacao = directData.formalization_link || directData.link_formalizacao;
              const chavePix = directData.pix_key || directData.chave_pix;
              
              return {
                success: true,
                saldo,
                simulado,
                proposta: directData.proposal_id,
                erroProposta: null,
                statusProposta: directData.proposal_status,
                descricaoStatus: directData.proposal_status && `Status da proposta: ${directData.proposal_status}`,
                valorProposta: valorProposta,
                linkFormalizacao: linkFormalizacao || null,
                chavePix: chavePix || null
              };
            }
            return null;
          } catch (error) {
            console.error('Erro ao buscar dados diretos:', error);
            return null;
          }
        };
        
        // Função específica para buscar detalhes da proposta do Supabase
        const fetchProposalData = async (proposalId) => {
          if (!proposalId) return null;
          
          try {
            console.log(`Buscando dados da proposta ${proposalId} no Supabase...`);
            const response = await fetch(`/api/proposals/${proposalId}`, {
              credentials: 'include'
            });
            
            if (!response.ok) {
              throw new Error(`Erro ao buscar dados da proposta: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Dados da proposta obtidos do Supabase:', data);
            
            if (data.success && data.proposal) {
              return {
                valorProposta: data.proposal.amount || data.proposal.valor || null,
                linkFormalizacao: data.proposal.formalization_link || data.proposal.link_formalizacao || null,
                chavePix: data.proposal.pix_key || data.proposal.chave_pix || null,
                statusDetalhado: data.proposal.status_detail || data.proposal.status_detalhado || null
              };
            }
            return null;
          } catch (error) {
            console.error('Erro ao buscar dados da proposta do Supabase:', error);
            return null;
          }
        };
        
        // Usar o endpoint da API para obter dados reais do cliente
        const response = await fetch(`/api/contacts/${currentContact.remote_jid}/data`, {
          credentials: 'include'
        });
        
        console.log(`Resposta da API para dados do contato ${currentContact.remote_jid}:`, {
          status: response.status,
          ok: response.ok
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Dados completos da resposta da API:', data);
          
          // Verificar todos os dados da proposta
          console.log('Dados da proposta na API normal:');
          console.log('- proposta:', data.proposta);
          console.log('- status_proposta:', data.status_proposta);
          console.log('- valor_proposta:', data.valor_proposta);
          console.log('- link_formalizacao:', data.link_formalizacao);
          console.log('- chave_pix:', data.chave_pix);
          
          if (data.success) {
            console.log('Dados do contato obtidos com sucesso:', data);
            
            // Melhorar a conversão e validação dos dados numéricos
            let saldo = null;
            let simulado = null;
            let valorProposta = null;
            
            // Verificar se saldo existe e convertê-lo para número se for string
            if (data.saldo !== null && data.saldo !== undefined) {
              if (typeof data.saldo === 'string') {
                // Tentar converter para número se for string
                try {
                  saldo = parseFloat(data.saldo);
                  console.log(`Convertido saldo de string para número: ${saldo}`);
                } catch (e) {
                  console.error(`Erro ao converter saldo: ${e.message}`);
                  saldo = null;
                }
              } else {
                // Se já for número, usar diretamente
                saldo = data.saldo;
              }
              
              // Verificar validade após conversão
              if (isNaN(saldo)) {
                console.warn(`Saldo convertido não é um número válido: ${saldo}`);
                saldo = null;
              }
            }
            
            // Mesmo tratamento para valor simulado
            if (data.simulado !== null && data.simulado !== undefined) {
              if (typeof data.simulado === 'string') {
                try {
                  simulado = parseFloat(data.simulado);
                  console.log(`Convertido simulado de string para número: ${simulado}`);
                } catch (e) {
                  console.error(`Erro ao converter simulado: ${e.message}`);
                  simulado = null;
                }
              } else {
                simulado = data.simulado;
              }
              
              if (isNaN(simulado)) {
                console.warn(`Simulado convertido não é um número válido: ${simulado}`);
                simulado = null;
              }
            }
            
            // Processar valor da proposta da mesma forma
            if (data.valor_proposta !== null && data.valor_proposta !== undefined) {
              if (typeof data.valor_proposta === 'string') {
                try {
                  valorProposta = parseFloat(data.valor_proposta);
                  console.log(`Convertido valor da proposta de string para número: ${valorProposta}`);
                } catch (e) {
                  console.error(`Erro ao converter valor da proposta: ${e.message}`);
                  valorProposta = null;
                }
              } else {
                valorProposta = data.valor_proposta;
              }
              
              if (isNaN(valorProposta)) {
                console.warn(`Valor da proposta convertido não é um número válido: ${valorProposta}`);
                valorProposta = null;
              }
            }
            
            // Extrair os dados do contato da resposta e verificar cada campo
            // Mapear nomes das propriedades da API para o formato esperado pelo componente com validação apropriada
            let novosDados = {
              saldo: saldo, // Valor já convertido e validado
              simulado: simulado, // Valor já convertido e validado
              erroConsulta: data.erro_consulta,
              proposta: data.proposta,
              erroProposta: data.erro_proposta,
              statusProposta: data.status_proposta,
              descricaoStatus: data.descricao_status,
              valorProposta: valorProposta,
              linkFormalizacao: data.link_formalizacao || null,
              chavePix: data.chave_pix || null
            };
            
            // Verificar se temos um ID de proposta para buscar dados adicionais no Supabase
            if (data.proposta) {
              try {
                const proposalData = await fetchProposalData(data.proposta);
                if (proposalData) {
                  console.log('Dados adicionais da proposta obtidos do Supabase:', proposalData);
                  
                  // Combinar os dados da API com os dados do Supabase
                  novosDados = {
                    ...novosDados,
                    // Preferir valores do Supabase, mas manter valores da API como fallback
                    valorProposta: proposalData.valorProposta !== null ? proposalData.valorProposta : novosDados.valorProposta,
                    linkFormalizacao: proposalData.linkFormalizacao || novosDados.linkFormalizacao,
                    chavePix: proposalData.chavePix || novosDados.chavePix,
                    // Adicionar detalhes extras do status se disponíveis
                    descricaoStatus: proposalData.statusDetalhado || novosDados.descricaoStatus
                  };
                  
                  console.log('Dados combinados (API + Supabase):', novosDados);
                }
              } catch (error) {
                console.error('Erro ao buscar/combinar dados adicionais da proposta:', error);
              }
            }
            
            // Buscar CPF do lead se houver lead_id
            if (currentContact.lead_id) {
              try {
                const resp = await fetch(`/api/admin/leads/${currentContact.lead_id}/cpf`, { credentials: 'include' });
                if (resp.ok) {
                  const data = await resp.json();
                  if (data.success && data.cpf) {
                    novosDados.cpf = data.cpf;
                  }
                }
              } catch (err) {
                console.error('Erro ao buscar CPF do lead (admin):', err);
              }
            }
            
            // Log dos dados antes da atualização
            console.log('Atualizando estado com novos dados processados:', {
              daAPI: {
                saldo: data.saldo,
                simulado: data.simulado,
                erro_consulta: data.erro_consulta,
                proposta: data.proposta,
                erro_proposta: data.erro_proposta,
                status_proposta: data.status_proposta,
                descricao_status: data.descricao_status,
                valor_proposta: data.valor_proposta,
                link_formalizacao: data.link_formalizacao,
                chave_pix: data.chave_pix
              },
              processados: {
                saldo,
                simulado,
                valorProposta: novosDados.valorProposta,
                linkFormalizacao: novosDados.linkFormalizacao,
                chavePix: novosDados.chavePix,
                cpf: novosDados.cpf
              },
              paraComponente: novosDados
            });
            
            setContactData(novosDados);
          } else {
            console.log('API indica falha:', data);
            
            // Se a API retornar erro, tentar obter dados diretos
            console.log('Tentando obter dados diretos devido a erro da API...');
            const dadosDiretos = await fetchDirectData();
            
            if (dadosDiretos) {
              console.log('Usando dados diretos:', dadosDiretos);
              setContactData(dadosDiretos);
            } else {
              setContactData({
                saldo: null,
                simulado: null,
                erroConsulta: data.message || 'Erro desconhecido ao buscar dados',
                proposta: null,
                erroProposta: null,
                statusProposta: null,
                descricaoStatus: null,
                valorProposta: null,
                linkFormalizacao: null,
                chavePix: null
              });
            }
          }
        } else {
          console.error(`Erro HTTP ${response.status} ao buscar dados do contato`);
          
          // Tentar obter dados diretos em caso de erro HTTP
          console.log('Tentando obter dados diretos devido a erro HTTP...');
          const dadosDiretos = await fetchDirectData();
          
          if (dadosDiretos) {
            console.log('Usando dados diretos após erro HTTP:', dadosDiretos);
            setContactData(dadosDiretos);
          } else {
            setContactData({
              saldo: null,
              simulado: null,
              erroConsulta: `Erro ${response.status} ao buscar dados`,
              proposta: null,
              erroProposta: null,
              statusProposta: null,
              descricaoStatus: null,
              valorProposta: null,
              linkFormalizacao: null,
              chavePix: null
            });
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados do contato:', error);
        setContactData({
          saldo: null,
          simulado: null,
          erroConsulta: `Erro: ${error.message}`,
          proposta: null,
          erroProposta: null,
          statusProposta: null,
          descricaoStatus: null,
          valorProposta: null,
          linkFormalizacao: null,
          chavePix: null
        });
      } finally {
        // Independente do resultado, desativar o carregamento
        setIsLoading(false);
      }
    }
    
    fetchContactData();
  }, [currentContact, currentUser?.id]);

  // Verificação do estado dos dados do contato (debug)
  useEffect(() => {
    console.log('Estado de contactData atualizado:', contactData);
    console.log('Verificação de campo a campo:');
    console.log('- saldo:', contactData.saldo, typeof contactData.saldo, Boolean(contactData.saldo));
    console.log('- simulado:', contactData.simulado, typeof contactData.simulado, Boolean(contactData.simulado));
    console.log('- erroConsulta:', contactData.erroConsulta, typeof contactData.erroConsulta, Boolean(contactData.erroConsulta));
    console.log('- proposta:', contactData.proposta, typeof contactData.proposta, Boolean(contactData.proposta));
    console.log('- statusProposta:', contactData.statusProposta, typeof contactData.statusProposta, Boolean(contactData.statusProposta));
  }, [contactData]);

  // Renderizar painel de dados do contato
  const renderContactDataPanel = () => {
    if (!currentContact) return null;
    
    console.log('Renderizando painel de dados do contato com:', contactData);
    
    // Valores formatados com nossa função robusta
    const saldoFormatado = formataMoeda(contactData.saldo);
    const simuladoFormatado = formataMoeda(contactData.simulado);
    const valorPropostaFormatado = formataMoeda(contactData.valorProposta);
    
    // Debug dos valores formatados
    console.log('Valores após formatação de moeda:');
    console.log(`- saldo original: ${contactData.saldo} (${typeof contactData.saldo})`);
    console.log(`- saldo formatado: ${saldoFormatado}`);
    console.log(`- simulado original: ${contactData.simulado} (${typeof contactData.simulado})`);
    console.log(`- simulado formatado: ${simuladoFormatado}`);
    console.log(`- valor proposta original: ${contactData.valorProposta} (${typeof contactData.valorProposta})`);
    console.log(`- valor proposta formatado: ${valorPropostaFormatado}`);
    console.log(`- link formalização: ${contactData.linkFormalizacao}`);
    console.log(`- chave pix: ${contactData.chavePix}`);
    
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
    
    // Função para forçar o carregamento direto dos dados do banco
    const forceDirectDataLoad = async () => {
      if (!currentContact?.remote_jid) return;
      
      try {
        console.log('Carregando dados diretamente do banco...');
        setContactData({
          ...contactData,
          erroConsulta: 'Carregando dados diretamente...'
        });
        
        // Carregar dados diretamente usando fetch simples
        const response = await fetch(`/api/dev/direct-data?contactId=${currentContact.remote_jid}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          setContactData({
            ...contactData,
            erroConsulta: `Erro ao acessar dados diretos: ${response.status}`
          });
          return;
        }
        
        const directData = await response.json();
        console.log('Dados obtidos diretamente:', directData);
        
        if (directData.success) {
          // Converter explicitamente para número
          let saldo = null;
          let simulado = null;
          let valorProposta = null;
          
          if (directData.balance !== null && directData.balance !== undefined) {
            saldo = Number(directData.balance);
          }
          
          if (directData.simulation !== null && directData.simulation !== undefined) {
            simulado = Number(directData.simulation);
          }
          
          // Processar valor da proposta - verificando todos os possíveis campos
          const valorPropostaRaw = directData.proposal_amount || directData.valor_proposta;
          if (valorPropostaRaw !== null && valorPropostaRaw !== undefined) {
            valorProposta = Number(valorPropostaRaw);
          }
          
          // Verificar vários campos possíveis para link e pix
          const linkFormalizacao = directData.formalization_link || directData.link_formalizacao;
          const chavePix = directData.pix_key || directData.chave_pix;
          
          setContactData({
            saldo,
            simulado,
            erroConsulta: null,
            proposta: directData.proposal_id,
            erroProposta: null,
            statusProposta: directData.proposal_status,
            descricaoStatus: directData.proposal_status && `Status da proposta: ${directData.proposal_status}`,
            valorProposta: valorProposta,
            linkFormalizacao: linkFormalizacao || null,
            chavePix: chavePix || null
          });
        } else {
          setContactData({
            ...contactData,
            erroConsulta: directData.message || 'Erro desconhecido ao carregar dados diretos'
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados diretos:', error);
        setContactData({
          ...contactData,
          erroConsulta: `Erro: ${error.message}`
        });
      }
    };
    
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
            
            {isLoading && contactData.saldo === null && contactData.erroConsulta === null ? (
              <div className="flex justify-center items-center py-2">
                <FaSpinner className="animate-spin text-cyan-400" />
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
            
            {isLoading && contactData.simulado === null && contactData.erroConsulta === null ? (
              <div className="flex justify-center items-center py-2">
                <FaSpinner className="animate-spin text-cyan-400" />
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
            {isLoading && contactData.proposta === null && contactData.erroConsulta === null ? (
              <div className="flex justify-center items-center py-2">
                <FaSpinner className="animate-spin text-cyan-400" />
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
                        setTimeout(() => setCopiedId(false), 1500);
                      }}
                      className="ml-1 text-cyan-200 hover:text-cyan-100 p-1"
                      title="Copiar Id da proposta"
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
                            setTimeout(() => setCopiedPix(false), 1500);
                          }}
                          className="ml-1 text-emerald-200 hover:text-emerald-100 p-1"
                          title="Copiar chave PIX"
                        >
                          <FaRegCopy />
              </button>
                        {copiedPix && <span className="text-xs text-emerald-300 ml-1">Copiado!</span>}
                      </div>
                      <span className="text-xs text-emerald-300 break-all font-mono">
                        {contactData.chavePix}
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
                        setTimeout(() => setCopiedLink(false), 1500);
                      }}
                      className="ml-2 text-blue-200 hover:text-blue-100 p-1"
                      title="Copiar link de formalização"
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
            <p className="text-xs text-cyan-300 truncate">
              {currentContact.phone || (currentContact.remote_jid || '').split('@')[0] || ''}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-3 ml-2">
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
                      <h2 className="text-lg font-semibold text-cyan-100">Conversas</h2>
                      <button 
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full p-2 hover:from-cyan-500 hover:to-blue-500 transition shadow-lg"
                        onClick={handleCreateContact}
                      >
                        <FaPlus />
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Pesquisar conversa"
                        className="w-full py-2 pl-10 pr-4 bg-white/10 text-cyan-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/60 border border-cyan-800/50 placeholder-cyan-300/70"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <FaSearch className="absolute left-3 top-3 text-cyan-300" />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {contacts.length === 0 ? (
                      <div className="p-4 text-center text-cyan-300">
                        Nenhuma conversa encontrada
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
                                <h3 className="font-semibold text-cyan-100">{contact.name || contact.push_name || 'Contato'}</h3>
                                <span className="text-xs text-cyan-300 ml-1 shrink-0 whitespace-nowrap">
                                  {contact.last_message_time && formatDate(contact.last_message_time)}
                                </span>
                              </div>
                              <p className="text-sm text-cyan-300 truncate w-full">
                                {contact.last_message || contact.phone || 'Nenhuma mensagem'}
                              </p>
                            </div>
                            
                            {/* Botão AI para ativar/desativar resposta automática do agente */}
                            <button 
                              key={`ai-button-${contact.id || contact.remote_jid}-${forceUpdate}`}
                              onClick={(e) => toggleAutoResponse(contact.id || contact.remote_jid, e)}
                              className={`ml-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-all ${
                                isAgentAiActive(contact)
                                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                                  : 'bg-gray-600/50 text-gray-300'
                              }`}
                              title={isAgentAiActive(contact) ? "Desativar resposta automática" : "Ativar resposta automática"}
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
                  </div>
                </div>
              )}
              
              {/* Área de mensagens */}
              {currentContact ? (
                <>
                  <div className={`flex-shrink-0 flex-grow-0 min-w-0 w-full ${!isMobileView ? 'md:basis-2/4 md:max-w-[50%]' : ''} flex flex-col h-full p-0`}>
                  {/* Cabeçalho do chat */}
                    {renderChatHeader()}
                  
                  {/* Área de mensagens */}
                    <div 
                      className="flex-1 overflow-y-auto p-3 bg-gradient-to-br from-emerald-950/20 via-cyan-950/20 to-blue-950/20 relative"
                      style={mobileStyles.messagesContainer}
                    >
                    {isLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <FaSpinner className="animate-spin text-3xl text-cyan-400" />
                      </div>
                    ) : (
                      <>
                        {isUpdating && (
                          <div className="absolute top-2 right-2 z-10 bg-cyan-800/60 p-1.5 rounded-full shadow-md">
                            <FaSpinner className="animate-spin text-xs text-cyan-100" />
                          </div>
                        )}
                        {messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-cyan-300">
                            <p className="text-lg">Nenhuma mensagem encontrada</p>
                            <p className="text-sm mt-2">Comece uma conversa agora</p>
                          </div>
                        ) : (
                          <div className="flex flex-col w-full">
                            {messages.map(msg => {
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
                              console.log(`Renderizando #${msg.id}: role=${msg.role}, position=${justifyContent}, content="${msg.content?.substring(0, 20)}..."`);
                              
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
                                    <p>{msg.content}</p>
                                      <div className={`text-xs mt-1 text-right whitespace-nowrap ${textColorClass} flex items-center justify-end`}>
                                      {formatDate(msg.created_at)}
                                        {msg.temp ? (
                                          <span className="ml-1">
                                            <FaSpinner className="animate-spin text-xs ml-1" />
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
                            })}
                            <div ref={messagesEndRef} />
                          </div>
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
                        <div className={`flex-1 mx-1 py-2`}>
                      <input
                        type="text"
                        placeholder="Digite uma mensagem"
                            className="w-full py-2 px-3 bg-white/10 text-cyan-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/60 border border-cyan-800/50 placeholder-cyan-300/70"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                      />
                        </div>
                      
                      {newMessage.trim() ? (
                        <button
                          type="submit"
                            className={`${screenWidth < 360 ? 'px-2 py-2' : 'p-2'} bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full hover:from-cyan-500 hover:to-blue-500 transition shadow-md flex-shrink-0 mx-1`}
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
    </div>
  );
} 