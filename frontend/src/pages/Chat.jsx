import React, { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { FaSearch, FaEllipsisV, FaPaperclip, FaMicrophone, FaSmile, FaPhone, FaVideo, FaPlus, FaArrowLeft, FaSpinner, FaExclamationTriangle } from 'react-icons/fa'
import { IoSend } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'

export default function Chat() {
  const [contacts, setContacts] = useState([])
  const [displayContacts, setDisplayContacts] = useState([]) // Estado para exibição ordenada
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [currentContact, setCurrentContact] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [autoResponseContacts, setAutoResponseContacts] = useState({})
  const [forceUpdate, setForceUpdate] = useState(0)
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()

  // Estado para controlar quando deve rolar a tela
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const [prevMessagesLength, setPrevMessagesLength] = useState(0);

  // Detectar mudanças de tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

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
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Redirecionar para a página de login se não estiver autenticado
          navigate('/login?error=auth_required&message=Você precisa estar autenticado para acessar o chat.');
          return null;
        }
        
        const errorText = await response.text();
        console.error(`Erro HTTP ${response.status} ao buscar usuário:`, errorText);
        throw new Error(`Erro ao buscar usuário: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
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

  // Função para verificar se o agente está ativado para um contato
  const isAgentEnabled = (contact) => {
    if (!contact) return false;
    // Certifica-se de que o undefined/null também seja tratado como 'human' (desligado)
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

  // Limpar mensagens e marcar como carregando ao trocar de contato
  useEffect(() => {
    if (currentContact) {
      // Ao trocar de contato, limpar as mensagens e marcar como carregando
      setMessages([]);
      setIsLoading(true);
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentContact || !currentUser) return;
    
    try {
      const payload = {
        conversationId: currentContact.remote_jid,
        content: newMessage,
        recipientId: currentContact.phone,
        role: 'ME'
      };
      
      console.log('Enviando nova mensagem:', payload);
      
      // Já indica que deve rolar para o final após enviar uma nova mensagem
      setShouldScrollToBottom(true);
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      // Adicionar diagnóstico de resposta
      console.log('Status da resposta:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status} ao enviar mensagem`);
      }
      
      const data = await response.json();
      console.log('Resposta completa do envio de mensagem:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Erro ao enviar mensagem');
      }
      
      // Extrair a mensagem da resposta da API
      const newMsg = data.message;
      if (!newMsg) {
        console.warn('API retornou sucesso mas sem objeto de mensagem');
        // Criar uma mensagem temporária com ID local até que a mensagem real seja obtida pelo polling
        const tempMsg = {
          id: `temp-${Date.now()}`,
          content: newMessage,
          sender_id: currentUser.id,
          receiver_id: currentContact.phone || currentContact.remote_jid,
          created_at: new Date().toISOString(),
          is_read: false,
          from_me: true, // Garantir que seja mostrada como enviada pelo usuário
          role: 'ME'  // Garantir que tenha o papel correto para exibição
        };
        setMessages(prev => [...prev, tempMsg]);
      } else {
        // Adicionar a flag from_me para garantir que seja renderizada corretamente
        const processedMsg = {
          ...newMsg,
          from_me: true,
          role: newMsg.role || 'ME'  // Preservar role se existir, senão definir como 'ME'
        };
        // Adicionar a mensagem retornada pela API
        setMessages(prev => [...prev, processedMsg]);
      }
      
      // Limpar campo de mensagem
      setNewMessage('');
      
      // Adicionar log detalhado para debug
      console.log('=========== DEBUG DE MENSAGEM ENVIADA ===========');
      console.log('Detalhes da resposta:', data);
      console.log('URL da API chamada: /api/messages');
      console.log('Mensagem enviada para: ' + currentContact.phone);
      console.log('Agent state: ' + (currentContact?.agent_state || 'indefinido'));
      console.log('==================================================');
      
      // O código para envio automático de respostas foi removido completamente
      // Não será enviada nenhuma resposta automática do assistente
      console.log(`Mensagem enviada com sucesso. Agent state: ${currentContact?.agent_state || 'indefinido'}`);
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setError('Erro ao enviar mensagem. Por favor, tente novamente.');
    }
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

  // Renderizar informações de diagnóstico
  const renderDiagnosticInfo = () => {
    return (
      <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-cyan-900/50 shadow-lg">
        <h3 className="text-lg font-semibold mb-2 text-cyan-100">Informações de Diagnóstico:</h3>
        <p className="text-cyan-300">Conexão com API: {connectionStatus?.connected ? 'OK' : 'Falha'}</p>
        <p className="text-cyan-300">Última verificação: {connectionStatus?.timestamp ? new Date(connectionStatus.timestamp).toLocaleTimeString() : 'N/A'}</p>
        
        {/* Resumo dos tipos de mensagens recebidas */}
        <div className="mt-2">
          <h4 className="text-md font-semibold text-cyan-100">Distribuição de mensagens:</h4>
          <p className="text-cyan-300">
            ME (usuário): {messages.filter(m => m.role === 'ME').length} mensagens
          </p>
          <p className="text-cyan-300">
            AI (assistente): {messages.filter(m => m.role === 'AI').length} mensagens
          </p>
          <p className="text-cyan-300">
            USER (cliente): {messages.filter(m => m.role === 'USER').length} mensagens
          </p>
          <p className="text-cyan-300">
            Sem role definido: {messages.filter(m => !m.role).length} mensagens
          </p>
        </div>
        
        {/* Adicionar botões de teste para enviar mensagens com diferentes roles */}
        {currentContact && (
          <div className="mt-3">
            <h4 className="text-md font-semibold text-cyan-100">Testes de mensagem:</h4>
            <div className="flex space-x-2 mt-2">
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                onClick={() => sendTestMessage('ME')}
              >
                Testar Mensagem 'ME'
              </button>
              <button 
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-sm"
                onClick={() => sendTestMessage('AI')}
              >
                Testar Mensagem 'AI'
              </button>
              <button 
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded-md text-sm"
                onClick={() => sendTestMessage('USER')}
              >
                Testar Mensagem 'USER'
              </button>
            </div>
            <div className="mt-2">
              <button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3 py-1 rounded-md text-sm"
                onClick={sendTestMessageWithDetails}
              >
                Teste Completo (Todos os Types)
              </button>
              <button 
                className="ml-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-3 py-1 rounded-md text-sm"
                onClick={testRoleVsSenderId}
              >
                Teste Role vs Sender_ID
              </button>
            </div>
          </div>
        )}
        
        {error && (
          <p className="text-red-400">
            Erro ao recarregar dados: {error}
          </p>
        )}
        <div className="flex space-x-2 mt-4">
          <button
            className="bg-gradient-to-r from-cyan-800 to-blue-700 hover:from-cyan-700 hover:to-blue-600 text-white px-4 py-2 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={debugDatabase}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <FaSpinner className="animate-spin inline mr-2" />
                Diagnosticando...
              </>
            ) : (
              'Diagnosticar'
            )}
          </button>
          <button
            className="bg-gradient-to-r from-emerald-800 to-cyan-700 hover:from-emerald-700 hover:to-cyan-600 text-white px-4 py-2 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <FaSpinner className="animate-spin inline mr-2" />
                Atualizando...
              </>
            ) : (
              'Tentar novamente'
            )}
          </button>
        </div>
      </div>
    );
  };

  // Renderizar tela de erro
  if (error && !contacts.length) {
    return (
      <div className="h-screen bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 text-white flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
          <div className="bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 flex-1 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-cyan-900/50">
              <div className="flex flex-col items-center justify-center py-4">
                <FaExclamationTriangle className="text-yellow-500 text-5xl mb-4" />
                <h2 className="text-xl font-semibold mb-2 text-white">
                  Erro ao carregar dados
                </h2>
                <p className="text-cyan-300 mb-6 text-center">
                  {error}
                </p>
                {renderDiagnosticInfo()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 text-white flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-6 max-w-7xl flex flex-col overflow-hidden">
        {error ? (
          <div className="bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 flex-1 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-cyan-900/50">
              <div className="flex flex-col items-center justify-center py-4">
                <FaExclamationTriangle className="text-yellow-500 text-5xl mb-4" />
                <h2 className="text-xl font-semibold mb-2 text-white">
                  Erro ao carregar dados
                </h2>
                <p className="text-cyan-300 mb-6 text-center">
                  {error}
                </p>
                {renderDiagnosticInfo()}
              </div>
            </div>
          </div>
        ) : isLoading && !currentUser ? (
          <div className="flex flex-col h-screen overflow-hidden">
            <Navbar fullWidth />
            <div className="bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 flex-1 flex items-center justify-center p-4">
              <div className="max-w-4xl w-full bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-cyan-900/50">
                <div className="flex flex-col items-center justify-center py-4">
                  <FaSpinner className="animate-spin text-4xl text-cyan-400 mx-auto mb-4" />
                  <p className="text-lg text-cyan-300">Carregando conversas...</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border border-cyan-900/50 flex-1 flex flex-col">
            <div className="flex h-full">
              {/* Lista de contatos - oculta no modo mobile quando um contato está selecionado */}
              {(!isMobileView || !currentContact) && (
                <div className="w-full md:w-1/3 border-r border-cyan-900/50 flex flex-col h-full">
                  <div className="p-2 border-b border-cyan-900/50">
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-lg font-semibold text-cyan-100">Conversas</h2>
                      <button 
                        className="bg-gradient-to-r from-cyan-800 to-blue-700 text-white rounded-full p-2 hover:from-cyan-700 hover:to-blue-600 transition shadow-lg"
                        onClick={handleCreateContact}
                      >
                        <FaPlus />
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Pesquisar conversa"
                        className="w-full py-2 pl-10 pr-4 bg-white/10 text-cyan-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/60 border border-cyan-900/50 placeholder-cyan-300/70"
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
                            className={`flex items-center p-2 cursor-pointer border-b border-cyan-900/30 hover:bg-white/5 transition-colors ${
                              currentContact?.id === contact.id || currentContact?.remote_jid === contact.remote_jid ? 'bg-white/10' : ''
                            }`}
                            onClick={() => handleSelectContact(contact)}
                          >
                            <div className="relative">
                              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                                {(contact.name || contact.push_name || 'C').substring(0, 2).toUpperCase()}
                              </div>
                              {contact.online && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-cyan-950"></div>
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
                                isAgentEnabled(contact)
                                  ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white' 
                                  : 'bg-gray-600/50 text-gray-300'
                              }`}
                              title={isAgentEnabled(contact) ? "Desativar resposta automática" : "Ativar resposta automática"}
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
                <div className="w-full md:w-2/3 flex flex-col h-full">
                  {/* Cabeçalho do chat */}
                  <div className="p-2 border-b border-cyan-900/50 bg-white/5 flex items-center">
                    {isMobileView && (
                      <button 
                        className="mr-3 text-cyan-300 hover:text-cyan-100"
                        onClick={handleBackToContacts}
                      >
                        <FaArrowLeft />
                      </button>
                    )}
                    <div className="flex items-center flex-1">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                          {(currentContact.name || currentContact.push_name || 'C').substring(0, 2).toUpperCase()}
                        </div>
                        {currentContact.online && (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-cyan-950"></div>
                        )}
                      </div>
                      <div className="ml-3">
                        <h3 className="font-semibold text-cyan-100">{currentContact.name || currentContact.push_name || 'Contato'}</h3>
                        <p className="text-xs text-cyan-300">
                          {currentContact.phone || (currentContact.remote_jid || '').split('@')[0] || ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <button className="text-cyan-300 hover:text-cyan-100">
                        <FaPhone />
                      </button>
                      <button className="text-cyan-300 hover:text-cyan-100">
                        <FaVideo />
                      </button>
                      <button className="text-cyan-300 hover:text-cyan-100">
                        <FaEllipsisV />
                      </button>
                    </div>
                  </div>
                  
                  {/* Área de mensagens */}
                  <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-br from-cyan-950/30 to-blue-950/30 relative">
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
                                bgColorClass = 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg';
                                borderClass = 'border-blue-700/50';
                                textColorClass = 'text-blue-100/80';
                              } 
                              else if (msg.role === 'AI') {
                                justifyContent = 'flex-end';
                                bgColorClass = 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg';
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
                                    className={`max-w-[75%] shadow-lg ${bgColorClass} p-2 border ${borderClass}`}
                                  >
                                    <p>{msg.content}</p>
                                    <div className={`text-xs mt-1 text-right whitespace-nowrap ${textColorClass}`}>
                                      {formatDate(msg.created_at)}
                                      {(msg.role === 'ME' || msg.role === 'AI') && (
                                        <span className="ml-1">
                                          {msg.is_read ? '✓✓' : '✓'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Formulário de envio de mensagem */}
                  <div className="border-t border-cyan-900/50 bg-white/5">
                    <form 
                      className="p-2 flex items-center"
                      onSubmit={handleSendMessage}
                    >
                      <button 
                        type="button"
                        className="text-cyan-300 hover:text-cyan-100 mr-2"
                      >
                        <FaSmile />
                      </button>
                      <button 
                        type="button"
                        className="text-cyan-300 hover:text-cyan-100 mr-2"
                      >
                        <FaPaperclip />
                      </button>
                      <input
                        type="text"
                        placeholder="Digite uma mensagem"
                        className="flex-1 py-2 px-3 bg-white/10 text-cyan-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/60 border border-cyan-900/50 placeholder-cyan-300/70"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                      />
                      
                      {newMessage.trim() ? (
                        <button
                          type="submit"
                          className="ml-2 bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-full p-2 hover:from-cyan-500 hover:to-blue-600 transition shadow-md"
                        >
                          <IoSend />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ml-2 text-cyan-300 hover:text-cyan-100"
                        >
                          <FaMicrophone />
                        </button>
                      )}
                    </form>
                  </div>
                </div>
              ) : (
                <div className="hidden md:flex md:w-2/3 items-center justify-center">
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