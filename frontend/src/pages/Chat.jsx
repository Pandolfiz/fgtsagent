import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import Navbar from '../components/Navbar'
import ContactPanel from '../components/ContactPanel'
import { FaSearch, FaEllipsisV, FaPaperclip, FaMicrophone, FaSmile, FaPhone, FaVideo, FaPlus, FaArrowLeft, FaSpinner, FaExclamationTriangle, FaWallet, FaCalculator, FaFileAlt, FaTimesCircle, FaCheckCircle, FaInfoCircle, FaIdCard, FaRegCopy, FaChevronDown, FaCheck, FaClock, FaUser, FaEdit, FaRedo } from 'react-icons/fa'
import { IoSend } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import { useClipboard } from '../hooks/useClipboard'

// ✅ HOOKS CUSTOMIZADOS - Lógica modularizada
import { useContacts } from '../hooks/useContacts'
import { useMessages } from '../hooks/useMessages'
import { useMessagePolling } from '../hooks/useMessagePolling'
import { useUnifiedPolling } from '../hooks/useUnifiedPolling'
import { useScroll } from '../hooks/useScroll'
import { useChatState } from '../hooks/useChatState'

// ✅ UTILITÁRIOS - Funções reutilizáveis
import { sanitizeContent, formatTimestamp, formatDateSeparator } from '../utils/chatUtils'
import { debounce } from '../utils/debounce'

export default function Chat() {
  const navigate = useNavigate()
  
  // ✅ REFS - Apenas para DOM (definir primeiro)
  const messagesContainerRef = useRef(null)
  const contactsContainerRef = useRef(null)
  const messageInputRef = useRef(null)
  const lastMessageRef = useRef(null)
  const currentIntervalRef = useRef(null)
  const timeoutsRef = useRef([])
  const scrollTimeoutRef = useRef(null) // ✅ Ref para debounce do scroll das mensagens
  const contactsScrollTimeoutRef = useRef(null) // ✅ Ref para debounce do scroll de contatos
  
  // ✅ ESTADOS LOCAIS MÍNIMOS - Apenas UI
  const [newMessage, setNewMessage] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isContactPanelOpen, setIsContactPanelOpen] = useState(false)
  const [selectedContactForPanel, setSelectedContactForPanel] = useState(null)
  
  // Estados para dados do contato/lead
  const [contactData, setContactData] = useState({
    leadId: null,
    saldo: null,
    simulado: null,
    erroConsulta: null,
    proposta: null,
    erroProposta: null,
    statusProposta: null,
    descricaoStatus: null,
    valorProposta: null,
    linkFormalizacao: null,
    chavePix: null,
    cpf: null
  })
  
  // Estados para feedback de cópia
  const [copiedId, setCopiedId] = useState(false)
  const [copiedPix, setCopiedPix] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  
  // Estados para indicadores de atualização automática (agora gerenciados pelo useUnifiedPolling)
  
  // Estados para modais e funcionalidades do painel lateral
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [proposalsHistoryModalOpen, setProposalsHistoryModalOpen] = useState(false)
  const [providerModalOpen, setProviderModalOpen] = useState(false)
  const [createProposalModalOpen, setCreateProposalModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [proposalsHistory, setProposalsHistory] = useState([])
  const [repeatingQuery, setRepeatingQuery] = useState(null)
  
  // Estados para edição de lead
  const [editingLead, setEditingLead] = useState({})
  const [isSavingLead, setIsSavingLead] = useState(false)
  const [saveError, setSaveError] = useState('')
  
  // Estados para histórico de propostas
  const [isLoadingProposals, setIsLoadingProposals] = useState(false)
  
  // Estados para repetir consulta
  const [repeatError, setRepeatError] = useState('')
  const [selectedLeadForQuery, setSelectedLeadForQuery] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState('cartos')
  const [availableBanks, setAvailableBanks] = useState([])
  const [selectedBank, setSelectedBank] = useState('')
  const [loadingBanks, setLoadingBanks] = useState(false)
  
  // Estados para criar proposta
  const [selectedLeadForProposal, setSelectedLeadForProposal] = useState(null)
  const [proposalFormData, setProposalFormData] = useState({})
  const [isCreatingProposal, setIsCreatingProposal] = useState(false)
  const [createProposalError, setCreateProposalError] = useState('')
  
  // ✅ ESTADOS PARA FUNCIONALIDADES DA VERSÃO ANTERIOR
  const [instances, setInstances] = useState([])
  const [selectedInstanceId, setSelectedInstanceId] = useState('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const dropdownRef = useRef(null)
  
  // ✅ HOOKS EXTERNOS
  const { copyToClipboard } = useClipboard()

  // ✅ ESTADO UNIFICADO - Definir primeiro
  const { 
    state, 
    actions 
  } = useChatState()

  // ✅ DESTRUCTURING DO ESTADO UNIFICADO
  const { 
    currentContact, 
    currentUser, 
    isMobileView, 
    searchTerm, 
    error 
  } = state

  // ✅ HOOKS CUSTOMIZADOS - Toda lógica complexa abstraída
  const { 
    contacts: displayContacts, 
    loading: contactsLoading, 
    pagination,
    fetchContacts, 
    loadMoreContacts,
    syncContacts: refreshContacts,
    updateContact // ✅ ADICIONADO: Para atualizar estado do contato após toggle AI
  } = useContacts({ currentUser, selectedInstanceId })

  const { 
    messages, 
    setMessages, // ✅ ADICIONADO: Para o useMessagePolling
    addMessage, 
    loading: messagesLoading, 
    fetchMessages,
    loadMoreMessages, // ✅ ADICIONADO: Função para scroll infinito
    isAtBottom,
    unreadCount,
    checkIfAtBottom,
    // ✅ ADICIONADO: Estados para condições do scroll infinito
      hasMoreMessages,
    isLoadingMoreMessages,
    allowInfiniteScroll,
    isInitialLoad
  } = useMessages({ currentContact, messagesContainerRef })

  // ✅ FUNÇÃO PARA BUSCAR DADOS DO LEAD POR TELEFONE
  const fetchLeadData = useCallback(async (phone) => {
    if (!phone) return;
    
    try {
      console.log('[LEAD-DATA] 🔍 Buscando dados do lead para telefone:', phone);
      
      // Resetar dados anteriores
      setContactData({
        leadId: null,
    saldo: null,
    simulado: null,
    erroConsulta: null,
    proposta: null,
    erroProposta: null,
    statusProposta: null,
    descricaoStatus: null,
    valorProposta: null,
    linkFormalizacao: null,
        chavePix: null,
        cpf: null
      });
      
      // Buscar todos os leads e filtrar por telefone
      const response = await fetch('/api/leads', {
              credentials: 'include'
            });
            
      if (response.ok) {
        const data = await response.json();
        console.log('[LEAD-DATA] 📊 Resposta da API:', data);
        
        if (data.success && data.data && data.data.length > 0) {
          console.log('[LEAD-DATA] 📋 Leads encontrados:', data.data.length);
          console.log('[LEAD-DATA] 🔍 Telefones nos leads:', data.data.map(l => ({ id: l.id, phone: l.phone, name: l.name })));
          
          // Filtrar leads por telefone
          const lead = data.data.find(l => l.phone === phone);
          
          if (!lead) {
            console.log('[LEAD-DATA] ⚠️ Nenhum lead encontrado para telefone:', phone);
            console.log('[LEAD-DATA] 🔍 Telefone buscado:', phone);
            console.log('[LEAD-DATA] 🔍 Telefones disponíveis:', data.data.map(l => l.phone));
            return;
          }
          
          console.log('[LEAD-DATA] ✅ Lead encontrado:', lead);
          
          // Atualizar dados do contato
          setContactData(prev => ({
            ...prev,
            leadId: lead.id,
            cpf: lead.cpf,
            saldo: lead.balance,
            simulado: lead.simulation,
            erroConsulta: lead.balance_error,
            erroProposta: lead.proposal_error
          }));
          
          // Buscar propostas do lead
          if (lead.id) {
            const proposalsResponse = await fetch(`/api/leads/${lead.id}/proposals`, {
          credentials: 'include'
        });
        
            if (proposalsResponse.ok) {
              const proposalsData = await proposalsResponse.json();
              if (proposalsData.success && proposalsData.data && proposalsData.data.length > 0) {
                const proposal = proposalsData.data[0]; // Pegar a proposta mais recente
                
                console.log('[LEAD-DATA] ✅ Proposta encontrada:', proposal);
                
                setContactData(prev => ({
            ...prev,
                  proposta: proposal.proposal_id,
                  statusProposta: proposal.status,
                  descricaoStatus: proposal.status_description,
                  valorProposta: proposal.value,
                  linkFormalizacao: proposal['Link de formalização'],
                  chavePix: proposal.chavePix
          }));
              } else {
                console.log('[LEAD-DATA] ℹ️ Nenhuma proposta encontrada para o lead');
              }
            } else {
              console.error('[LEAD-DATA] ❌ Erro ao buscar propostas:', proposalsResponse.status);
            }
          }
        } else {
          console.log('[LEAD-DATA] ℹ️ Nenhum lead encontrado na resposta da API');
        }
        } else {
        console.error('[LEAD-DATA] ❌ Erro ao buscar lead:', response.status);
            }
          } catch (error) {
      console.error('[LEAD-DATA] ❌ Erro ao buscar dados do lead:', error);
    }
  }, [])

  // ✅ SISTEMA UNIFICADO DE POLLING
  const { 
    resumePolling: startPolling, 
    pausePolling: stopPolling, 
    isPolling,
    isUpdating: unifiedUpdating
  } = useUnifiedPolling({ 
    currentContact, 
    currentUser,
    isContactPanelOpen,
    fetchMessages,
    fetchContacts,
    fetchLeadData,
    messages,
    setMessages,
    lastMessageRef,
    timeoutsRef,
    setLastSyncTime // ✅ ADICIONADO: Callback para atualizar lastSyncTime
  })

  const { 
    scrollToBottom 
  } = useScroll({ 
    messagesContainerRef,
    loadMoreMessages: loadMoreMessages, // ✅ CORRIGIDO: Usar a função do useMessages
    checkIfAtBottom: checkIfAtBottom, // ✅ CORRIGIDO: Usar a função do useMessages
    // ✅ ADICIONADO: Parâmetros para condições do scroll infinito (igual ao backup)
    hasMoreMessages: hasMoreMessages,
    isLoadingMoreMessages: isLoadingMoreMessages,
    allowInfiniteScroll: allowInfiniteScroll,
    isInitialLoad: isInitialLoad,
    currentContact: currentContact
  })

  // ✅ SCROLL INFINITO PARA MENSAGENS (baseado no backup)
  const handleScrollImmediate = useCallback((e) => {
    const container = e.target;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    // ✅ Ações IMEDIATAS (não podem ter delay)
    // ✅ CORREÇÃO: Detecção mais precisa do final (tolerância de 5px)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 5;
    
    // ✅ OTIMIZAÇÃO: Só atualizar estado se mudou (evita re-renders desnecessários)
    if (isAtBottom !== isNearBottom) {
      checkIfAtBottom(isNearBottom);
    }
    
    // Resetar contador imediatamente se no final
    if (isNearBottom && unreadCount > 0) {
      // setUnreadCount(0); // TODO: Implementar se necessário
    }
  }, [isAtBottom, checkIfAtBottom, unreadCount]);
  
  const handleScrollDebounced = useCallback((e) => {
    const container = e.target;
    const { scrollTop } = container;
    
    // ✅ CORREÇÃO: Log de debug para scroll infinito
    console.log('[SCROLL-DEBUG] 🎯 Scroll debounced:', {
      scrollTop,
      hasMoreMessages,
      isLoadingMoreMessages,
      allowInfiniteScroll,
      isInitialLoad,
      currentContactId: currentContact?.remote_jid,
      conditions: {
        scrollTopLessThan100: scrollTop < 100,
        hasMoreMessages: hasMoreMessages,
        notLoadingMore: !isLoadingMoreMessages,
        allowInfiniteScroll: allowInfiniteScroll,
        notInitialLoad: !isInitialLoad,
        hasContact: !!currentContact?.remote_jid
      }
    });
    
    // ✅ SIMPLIFICADO: Condições mais permissivas para scroll infinito
    if (scrollTop < 100 && 
        hasMoreMessages && 
        !isLoadingMoreMessages && 
        currentContact?.remote_jid) {
      
      console.log('[SCROLL-DEBUG] ✅ Condições atendidas - chamando loadMoreMessages');
      loadMoreMessages();
    } else {
      console.log('[SCROLL-DEBUG] ❌ Condições não atendidas para scroll infinito:', {
        scrollTopLessThan100: scrollTop < 100,
        hasMoreMessages: hasMoreMessages,
        notLoadingMore: !isLoadingMoreMessages,
        hasContact: !!currentContact?.remote_jid
      });
    }
  }, [hasMoreMessages, isLoadingMoreMessages, currentContact, loadMoreMessages]);

  const handleScroll = useCallback((e) => {
    // ✅ Executar ações imediatas
    handleScrollImmediate(e);
    
    // ✅ OTIMIZAÇÃO: Debounce mínimo apenas para scroll infinito (10ms)
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      handleScrollDebounced(e);
    }, 10);
  }, [handleScrollImmediate, handleScrollDebounced]);

  // ✅ LOADING STATES UNIFICADOS
  const isLoading = contactsLoading.contacts || messagesLoading.messages
  const isSyncing = contactsLoading.syncing

  // ✅ EFEITOS SIMPLIFICADOS - Apenas integração
  useEffect(() => {
    // Só buscar usuário se não tiver um já carregado
    if (currentUser?.id) return;
    
    async function getCurrentUser() {
    try {
      console.log("Iniciando fetchUserFromApi...");
        const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
        
        const data = await response.json();
      
      if (!data || !data.success) {
        if (data && data.status === 401) {
          navigate('/login?error=auth_required&message=Você precisa estar autenticado para acessar o chat.');
            return;
        }
        
        console.error(`Erro ao buscar usuário:`, data);
          actions.setError(`Erro ao buscar usuário: ${data?.message || 'Erro desconhecido'}`);
          return;
      }
      
      // Verificar e extrair o objeto user da resposta
      if (data.success && data.user) {
          actions.setCurrentUser(data.user);
      } else if (data.id) {
          actions.setCurrentUser(data);
      } else {
        console.error('Formato de resposta inesperado:', data);
          actions.setError('Formato de resposta inesperado da API');
      }
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        actions.setError('Erro ao buscar usuário');
      }
    }
    
    getCurrentUser();
  }, [navigate, currentUser?.id]) // ✅ CORRIGIDO: Removido actions das dependências

  // ✅ REMOVIDO: useEffect duplicado - o useContacts já gerencia o carregamento inicial

  // ✅ REMOVIDO: useEffect que causava loop infinito
  // O carregamento de mensagens será feito diretamente na seleção de contato

  // ✅ CARREGAR INSTÂNCIAS REAIS DO WHATSAPP
  const fetchInstances = useCallback(async () => {
    try {
        console.log('[INSTANCES] 🔄 Carregando instâncias do WhatsApp...');
      
      const response = await fetch('/api/whatsapp-credentials', {
              credentials: 'include'
            });
          
                if (response.ok) {
            const data = await response.json();
          if (data.success && data.data) {
            // Log para debug - ver todos os status
            console.log('[INSTANCES] 🔍 Status das credenciais:', data.data.map(cred => ({
              id: cred.id,
              agent_name: cred.agent_name,
              status: cred.status,
              connection_type: cred.connection_type
            })));
            
            // Não filtrar por status - mostrar todas as instâncias
            const validInstances = data.data;
            
            // Formatar instâncias para o formato esperado
            const formattedInstances = validInstances.map(cred => ({
              id: cred.id,
              agent_name: cred.agent_name || cred.instance_name || `Instância ${cred.phone}`,
              instance_name: cred.instance_name || `WhatsApp ${cred.phone}`,
              phone: cred.phone,
              status: cred.status,
              connected: cred.status === 'open' || cred.status === 'connected' || cred.status === 'active'
            }));
            
            console.log('[INSTANCES] ✅ Instâncias carregadas:', formattedInstances);
            setInstances(formattedInstances);
            
            // Verificar se há instâncias conectadas
            const connectedInstances = formattedInstances.filter(inst => inst.connected);
            console.log('[INSTANCES] 🔗 Instâncias conectadas:', connectedInstances);
            console.log('[INSTANCES] 📊 Status de conexão:', {
              total: formattedInstances.length,
              connected: connectedInstances.length,
              willBeConnected: connectedInstances.length > 0
            });
            
            setConnectionStatus({ 
              connected: connectedInstances.length > 0,
              totalInstances: formattedInstances.length,
              connectedInstances: connectedInstances.length
            });
        } else {
            console.log('[INSTANCES] ⚠️ Nenhuma instância encontrada');
          setInstances([]);
            setConnectionStatus({ connected: false, totalInstances: 0, connectedInstances: 0 });
        }
      } else {
          console.error('[INSTANCES] ❌ Erro ao carregar instâncias:', response.status);
        setInstances([]);
          setConnectionStatus({ connected: false, totalInstances: 0, connectedInstances: 0 });
      }
    } catch (error) {
        console.error('[INSTANCES] ❌ Erro ao buscar instâncias:', error);
      setInstances([]);
        setConnectionStatus({ connected: false, totalInstances: 0, connectedInstances: 0 });
      }
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      fetchInstances();
    }
    
    // Simular última sincronização
    setLastSyncTime(new Date().toISOString());
  }, [currentUser?.id, fetchInstances])

  // ✅ HANDLERS SIMPLIFICADOS - Apenas coordenação (igual ao backup)
  const handleContactSelect = (contact) => {
    console.log('[CONTACT] 📱 Selecionando contato:', contact.name || contact.push_name);
    console.log('[CONTACT] 🔍 Contato atual:', currentContact?.name || currentContact?.push_name);
    console.log('[CONTACT] 🔍 Remote JID atual:', currentContact?.remote_jid);
    console.log('[CONTACT] 🔍 Remote JID novo:', contact?.remote_jid);
    console.log('[CONTACT] 📊 Total de contatos disponíveis:', displayContacts.length);
    console.log('[CONTACT] 📊 Instância selecionada:', selectedInstanceId);
    
    // ✅ UX: PROTEÇÃO - Se for o mesmo contato, não recarregar
    if (currentContact?.remote_jid === contact?.remote_jid) {
      console.log('[CONTACT] ⚠️ Mesmo contato já selecionado - mantendo histórico');
            return;
          }
          
    console.log('[CONTACT] ✅ Contato DIFERENTE detectado - carregando novo histórico');
    
    // ✅ UX: Transição imediata sem estados de carregamento visíveis
    actions.setCurrentContact(contact);
    setNewMessage('');
    
      // ✅ UX: Carregar mensagens do NOVO contato COM reset (contato diferente)
    if (contact?.remote_jid) {
      console.log('[CONTACT] 📩 Carregando mensagens do contato selecionado:', contact.remote_jid);
      fetchMessages(contact.remote_jid, 1, true); // ← reset=true para contato diferente
      startPolling();
      } else {
      console.error('[CONTACT] ❌ Contato sem remote_jid!');
      stopPolling();
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentContact || isSendingMessage) return

    console.log('[SEND] 🚀 Iniciando envio de mensagem:', { 
      content: newMessage.trim(), 
      contactId: currentContact.remote_jid,
      isSendingMessage,
      currentMessagesCount: messages.length
    })

    setIsSendingMessage(true)
    
    try {
      const messageId = `temp_${Date.now()}`
      const messageContent = newMessage.trim()
      
      // ✅ CORREÇÃO: Verificar se já existe uma mensagem temporária similar sendo enviada
      const existingTempMessage = messages.find(msg => 
        msg.temp && 
        msg.content === messageContent && 
        msg.from_me && 
        Math.abs(new Date(msg.created_at).getTime() - Date.now()) < 2000 // 2 segundos
      )
      
      if (existingTempMessage) {
        console.log('[SEND] ⚠️ Mensagem similar já sendo enviada, ignorando duplicata')
        setIsSendingMessage(false)
        return
      }
      
      const tempMessage = {
        id: messageId,
        content: messageContent,
        from_me: true,
        role: 'ME', // Definir como ME (mensagem nossa)
        created_at: new Date().toISOString(),
        temp: true
      }

      console.log('[SEND] 📝 Adicionando mensagem temporária:', tempMessage)
      
      // Adicionar mensagem temporária
      addMessage(tempMessage)
      setNewMessage('')
      
      // Scroll automático
      setTimeout(() => scrollToBottom(true), 50)

      // Enviar para API (usando endpoint correto do backup)
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: currentContact.remote_jid,
          content: messageContent,
          recipientId: currentContact.phone || currentContact.remote_jid,
          role: 'ME',
          messageId: messageId
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.message) {
          // ✅ CORREÇÃO: Apenas remover mensagem temporária, deixar o polling adicionar a real
          setMessages(prevMessages => 
            prevMessages.filter(msg => msg.id !== messageId)
          );
          console.log('[SEND] ✅ Mensagem temporária removida, aguardando polling adicionar a real');
        }
      } else {
        // ✅ CORREÇÃO: Remover mensagem temporária em caso de erro
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg.id !== messageId)
        );
        actions.setError('Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      // ✅ CORREÇÃO: Remover mensagem temporária em caso de erro
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== messageId)
      );
      actions.setError('Erro ao enviar mensagem')
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleCopyMessage = useCallback((content) => {
    copyToClipboard(content)
  }, [copyToClipboard])

  const handleOpenContactPanel = useCallback((contact) => {
    console.log('[DEBUG-PANEL] 🚀 Abrindo painel lateral para contato:', contact);
    setSelectedContactForPanel(contact)
    setIsContactPanelOpen(true)
    console.log('[DEBUG-PANEL] ✅ Estados atualizados - painel deve aparecer');
  }, [])

  const handleCloseContactPanel = useCallback(() => {
    setIsContactPanelOpen(false)
    setSelectedContactForPanel(null)
  }, [])

  // ✅ FUNÇÃO PARA BUSCAR DADOS DO LEAD POR TELEFONE (movida para antes do useUnifiedPolling)

  // ✅ FUNÇÃO PARA TOGGLE AI (igual ao backup)
  const toggleAutoResponse = async (contactId, e) => {
    e.stopPropagation();
    
    try {
      console.log('[TOGGLE-AI] 🚀 Alternando AI para contato:', contactId);
      
      const response = await fetch(`/api/contacts/${contactId}/toggle-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
      const data = await response.json();
      if (data.success) {
          console.log('[TOGGLE-AI] ✅ AI toggle atualizado:', data.message);
          
          // ✅ Atualizar o estado do contato na lista local imediatamente
          updateContact(contactId, { agent_state: data.contact.agent_state });
          console.log('[TOGGLE-AI] 🔄 Estado local atualizado para:', data.contact.agent_state);
          
          // Mostrar feedback visual temporário
          const button = e.target.closest('button');
          if (button) {
            const originalText = button.textContent;
            button.textContent = data.contact.agent_state === 'ai' ? 'AI ✓' : 'AI';
          setTimeout(() => {
              button.textContent = originalText;
            }, 1000);
          }
          }
                } else {
        const errorData = await response.json();
        console.error('[TOGGLE-AI] ❌ Erro na resposta:', errorData.message);
        actions.setError(errorData.message || 'Erro ao alternar AI');
        }
      } catch (error) {
      console.error('[TOGGLE-AI] ❌ Erro ao alternar AI:', error);
      actions.setError('Erro de conexão ao alternar AI');
    }
  }

  // ✅ FUNÇÕES PARA SELETOR DE INSTÂNCIAS
  const getSelectedInstanceText = useCallback(() => {
    if (contactsLoading.contacts) return 'Carregando...';
    if (selectedInstanceId === 'all') return 'Todas as instâncias';
    
    const selectedInstance = instances.find(instance => instance.id === selectedInstanceId);
    return selectedInstance?.agent_name || selectedInstance?.instance_name || `Instância ${selectedInstanceId}`;
  }, [contactsLoading.contacts, selectedInstanceId, instances]);

  const handleInstanceSelect = useCallback((instanceId) => {
    console.log(`[INSTANCE-SELECT] 🔄 Selecionando instância: ${instanceId}`);
    console.log(`[INSTANCE-SELECT] 📊 Estado atual selectedInstanceId: ${selectedInstanceId}`);
    console.log(`[INSTANCE-SELECT] 📊 Contato atual: ${currentContact?.name || 'Nenhum'}`);
    
    // ✅ CORREÇÃO: Limpar contato selecionado quando mudar de instância
    if (currentContact) {
      console.log(`[INSTANCE-SELECT] 🧹 Limpando contato selecionado: ${currentContact.name}`);
      actions.setCurrentContact(null);
    }
    
    setSelectedInstanceId(instanceId);
    setDropdownOpen(false);
    
    // ✅ REMOVIDO: fetchContacts manual - o useContacts já gerencia via useEffect
    console.log(`[INSTANCE-SELECT] 📞 Instância selecionada, useContacts irá recarregar automaticamente`);
  }, [selectedInstanceId, currentContact, actions]);

  const formatLastSyncTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
      const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString('pt-BR');
  }, []);

  // ✅ SCROLL INFINITO PARA LISTA DE CONVERSAS
  const handleContactsScrollImmediate = useCallback((e) => {
    const container = e.target;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    // ✅ Detectar quando está próximo do final (100px do bottom)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    if (isNearBottom && !contactsLoading.moreContacts && pagination.hasMore && currentUser) {
      console.log('[CONTACTS] 🔄 Próximo ao final da lista - carregando mais contatos');
      loadMoreContacts();
    }
  }, [contactsLoading.moreContacts, pagination.hasMore, currentUser, loadMoreContacts]);
  
  const handleContactsScrollDebounced = useCallback((e) => {
    // ✅ Ações pesadas com debounce se necessário
    // Por enquanto não há ações pesadas para contatos
  }, []);
  
  const handleContactsScroll = useCallback((e) => {
    // ✅ Executar ações imediatas
    handleContactsScrollImmediate(e);
    
    // ✅ Debounce para ações pesadas (150ms)
    if (contactsScrollTimeoutRef.current) {
      clearTimeout(contactsScrollTimeoutRef.current);
    }
    
    contactsScrollTimeoutRef.current = setTimeout(() => {
      handleContactsScrollDebounced(e);
    }, 150);
  }, [handleContactsScrollImmediate, handleContactsScrollDebounced]);

  // ✅ ESTILO PERSONALIZADO DA SCROLLBAR
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
      // Limpar o estilo quando o componente desmontar
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // ✅ CLEANUP DOS TIMEOUTS
  useEffect(() => {
    return () => {
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

  // ✅ BUSCAR DADOS DO LEAD QUANDO CONTATO É SELECIONADO
  useEffect(() => {
    console.log('[DEBUG] 🔍 useEffect currentContact:', currentContact);
    console.log('[DEBUG] 🔍 currentContact?.phone:', currentContact?.phone);
    console.log('[DEBUG] 🔍 currentContact?.remote_jid:', currentContact?.remote_jid);
    
    // Extrair telefone do contato (phone ou do remote_jid)
    const phone = currentContact?.phone || (currentContact?.remote_jid ? currentContact.remote_jid.split('_')[1] : null);
    
    if (phone) {
      console.log('[DEBUG] ✅ Chamando fetchLeadData com telefone:', phone);
      fetchLeadData(phone);
    } else {
      console.log('[DEBUG] ⚠️ Não há telefone no contato atual');
    }
  }, [currentContact?.phone, currentContact?.remote_jid, fetchLeadData]);

  // ✅ POLLING AUTOMÁTICO: Agora gerenciado pelo useUnifiedPolling

  // ✅ FUNÇÃO PARA FORMATAR MOEDA (igual ao backup)
  const formataMoeda = useCallback((valor) => {
    if (!valor || valor === null || valor === undefined || valor === '') return null;
    
    // Se já é uma string formatada, retornar
    if (typeof valor === 'string' && valor.includes('R$')) return valor;
    
    // Converter para número
    const numero = typeof valor === 'string' ? parseFloat(valor.replace(/[^\d,.-]/g, '').replace(',', '.')) : valor;
    
    if (isNaN(numero)) return null;
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numero);
  }, []);

  // ✅ FUNÇÕES PARA BOTÕES DO PAINEL LATERAL (baseadas no Dashboard)
  const handleEditLead = useCallback(async (leadData) => {
    console.log('[CHAT] 📝 Editando lead:', leadData);
    try {
      // Buscar dados completos do lead
      const response = await fetch(`/api/leads/${leadData.id}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
      const data = await response.json();
        if (data.success) {
          setEditingLead(data.data);
          setEditModalOpen(true);
          }
        }
    } catch (error) {
      console.error('[CHAT] ❌ Erro ao buscar dados do lead:', error);
    }
  }, []);

  // ✅ FUNÇÃO PARA BUSCAR BANCOS DISPONÍVEIS
  const fetchAvailableBanks = useCallback(async () => {
    try {
      setLoadingBanks(true);
      console.log('[CHAT] Iniciando busca de bancos...');

      const response = await fetch('/api/partner-credentials', {
            credentials: 'include'
          });
          
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[CHAT] Resposta da API de bancos:', data);

      if (data.success && data.data) {
        // Filtrar apenas credenciais ativas
        const activeCredentials = data.data.filter(cred => cred.status === 'active');
        console.log('[CHAT] Bancos ativos encontrados:', activeCredentials.length);
        setAvailableBanks(activeCredentials);

        // Selecionar o primeiro banco por padrão se houver
        if (activeCredentials.length > 0) {
          setSelectedBank(activeCredentials[0].id);
          console.log('[CHAT] Banco padrão selecionado:', activeCredentials[0].name);
              }
              } else {
        console.error('Erro ao carregar bancos:', data.message);
        setAvailableBanks([]);
        }
              } catch (error) {
      console.error('Erro ao buscar bancos disponíveis:', error);
      setAvailableBanks([]);
    } finally {
      setLoadingBanks(false);
      console.log('[CHAT] Busca de bancos concluída');
    }
  }, []);

  const handleCreateProposal = useCallback(async (leadData) => {
    console.log('[CHAT] ➕ Criando proposta para lead:', leadData);
    try {
      // Buscar dados completos do lead
      const response = await fetch(`/api/leads/${leadData.id}`, {
            credentials: 'include'
          });
          
      if (response.ok) {
            const data = await response.json();
        if (data.success) {
          const leadData = data.data;
          
          // Preparar dados do formulário
          const formData = {
            name: leadData.name || '',
            cpf: leadData.cpf || '',
            rg: leadData.rg || '',
            motherName: leadData.mother_name || leadData.motherName || '',
            email: leadData.email || '',
            birthDate: leadData.birth || leadData.birthDate || '',
            phone: leadData.phone || '',
            postalCode: leadData.cep || leadData.postalCode || '',
            addressNumber: leadData.numero || leadData.address_number || leadData.addressNumber || '',
            chavePix: leadData.pix_key || leadData.chave_pix || leadData.chavePix || ''
          };
          
          setProposalFormData(formData);
          setSelectedLeadForProposal(leadData);
          setCreateProposalModalOpen(true);
          
          // Buscar bancos disponíveis imediatamente
          fetchAvailableBanks();
        }
      }
    } catch (error) {
      console.error('[CHAT] ❌ Erro ao buscar dados do lead:', error);
      setCreateProposalError('Erro ao carregar dados do lead');
    }
  }, [fetchAvailableBanks]);

  // Função para validar campos obrigatórios
  const validateProposalForm = useCallback(() => {
    const requiredFields = [
      { key: 'name', label: 'Nome' },
      { key: 'cpf', label: 'CPF' },
      { key: 'rg', label: 'RG' },
      { key: 'motherName', label: 'Nome da Mãe' },
      { key: 'email', label: 'Email' },
      { key: 'birthDate', label: 'Data de Nascimento' },
      { key: 'maritalStatus', label: 'Estado Civil' },
      { key: 'phone', label: 'Telefone' },
      { key: 'postalCode', label: 'CEP' },
      { key: 'addressNumber', label: 'Número do Endereço' },
      { key: 'chavePix', label: 'Chave PIX' }
    ];

    const missingFields = requiredFields.filter(field => {
      const value = proposalFormData[field.key];
      return !value || value.trim() === '';
    });

    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(field => field.label).join(', ');
      return `Por favor, preencha os seguintes campos obrigatórios: ${fieldNames}`;
    }

    if (!selectedBank) {
      return 'Por favor, selecione um banco';
    }

    return null; // Validação passou
  }, [proposalFormData, selectedBank]);

  const createProposal = useCallback(async () => {
    if (!selectedLeadForProposal) return;

    // Validar todos os campos obrigatórios
    const validationError = validateProposalForm();
    if (validationError) {
      setCreateProposalError(validationError);
      return;
    }

    setIsCreatingProposal(true);
    setCreateProposalError('');

    try {
      // Buscar dados do partner_credentials selecionado
      const credentialsResponse = await fetch(`/api/partner-credentials/${selectedBank}`, {
              credentials: 'include'
            });
      const credentialsData = await credentialsResponse.json();

      if (!credentialsData.success) {
        throw new Error('Erro ao buscar dados do banco selecionado');
      }

      const bankData = credentialsData.data;

      const payload = [{
        name: proposalFormData.name,
        cpf: proposalFormData.cpf,
        rg: proposalFormData.rg,
        mother_name: proposalFormData.motherName,
        email: proposalFormData.email,
        birth: proposalFormData.birthDate,
        marital_status: proposalFormData.maritalStatus,
        phone: proposalFormData.phone,
        cep: proposalFormData.postalCode,
        address_number: proposalFormData.addressNumber,
        pix_key: proposalFormData.chavePix,
        provider: selectedProvider,
        bank_id: selectedBank,
        bank_name: bankData.name,
        bank_partner_type: bankData.partner_type,
        user_id: currentUser?.id || ''
      }];

      console.log('[CHAT] 📤 Enviando proposta para webhook:', payload);

      // Enviar webhook para o n8n de forma assíncrona (fire and forget)
      fetch('https://n8n-n8n.8cgx4t.easypanel.host/webhook/criaPropostaApp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).then((webhookResponse) => {
        console.log('[CHAT] Status da resposta do webhook:', webhookResponse.status);
        if (webhookResponse.status >= 200 && webhookResponse.status < 300) {
          console.log('[CHAT] ✅ Proposta criada com sucesso');
          
          // Ações de sucesso executadas APENAS após confirmar sucesso do webhook
          setCreateProposalModalOpen(false);
          setSelectedLeadForProposal(null);
          setProposalFormData({});
          setSelectedBank('');
          
          // Recarregar dados do contato
        if (currentContact) {
            fetchLeadData(currentContact);
          }
            } else {
          throw new Error(`Erro do webhook: ${webhookResponse.status}`);
        }
      }).catch((webhookError) => {
        console.error('[CHAT] ❌ Erro no webhook:', webhookError);
        throw webhookError;
      });
    } catch (error) {
      console.error('[CHAT] ❌ Erro ao criar proposta:', error);
      setCreateProposalError(error.message || 'Erro ao criar proposta');
    } finally {
      setIsCreatingProposal(false);
    }
  }, [selectedLeadForProposal, selectedBank, proposalFormData, selectedProvider, currentContact, currentUser, validateProposalForm]);

  const handleViewProposalHistory = useCallback(async (leadData) => {
    console.log('[CHAT] 📋 Visualizando histórico de propostas para lead:', leadData);
    setIsLoadingProposals(true);
    try {
      const response = await fetch(`/api/leads/${leadData.id}/proposals`, {
        credentials: 'include'
      });
      
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
          setProposalsHistory(data.data || []);
          setSelectedLead(leadData);
          setProposalsHistoryModalOpen(true);
              }
            }
    } catch (error) {
      console.error('[CHAT] ❌ Erro ao buscar histórico de propostas:', error);
    } finally {
      setIsLoadingProposals(false);
    }
  }, []);

  const handleRepeatQuery = useCallback(async (leadData) => {
    console.log('[CHAT] 🔄 Repetindo consulta para lead:', leadData);
    setSelectedLeadForQuery(leadData);
    setSelectedProvider('cartos');
    setSelectedBank('');
    setProviderModalOpen(true);
    
    // Buscar bancos disponíveis imediatamente
    fetchAvailableBanks();
  }, []);


  const confirmRepeatQuery = useCallback(async () => {
    if (selectedLeadForQuery) {
      if (!selectedBank) {
        setRepeatError('Por favor, selecione um banco');
      return;
    }
    
      setRepeatingQuery(selectedLeadForQuery.id);
      setRepeatError('');

      try {
        const response = await fetch(`/api/leads/${selectedLeadForQuery.id}/repeat-query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            provider: selectedProvider,
            bankId: selectedBank
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
          console.log('[CHAT] Consulta repetida com sucesso');
          setProviderModalOpen(false);
          setSelectedLeadForQuery(null);
          // Recarregar dados do contato se necessário
          if (currentContact) {
            fetchLeadData();
        }
      } else {
          setRepeatError(data.message || 'Erro ao repetir consulta');
        }
    } catch (error) {
        console.error('[CHAT] Erro ao repetir consulta:', error);
        setRepeatError('Erro ao repetir consulta: ' + error.message);
    } finally {
        setRepeatingQuery(null);
      }
    }
  }, [selectedLeadForQuery, selectedBank, selectedProvider, currentContact]);

  const saveLeadData = useCallback(async () => {
    setIsSavingLead(true);
    setSaveError('');
    
    try {
      const dataToSend = {
        name: editingLead.name,
        cpf: editingLead.cpf,
        email: editingLead.email,
        phone: editingLead.phone,
        status: editingLead.status,
        rg: editingLead.rg,
        nationality: editingLead.nationality,
        is_pep: editingLead.is_pep,
        birth: editingLead.birth,
        marital_status: editingLead.marital_status,
        person_type: editingLead.person_type,
        mother_name: editingLead.mother_name,
        cep: editingLead.cep,
        estado: editingLead.estado,
        cidade: editingLead.cidade,
        bairro: editingLead.bairro,
        rua: editingLead.rua,
        numero: editingLead.numero,
        balance: editingLead.balance,
        pix: editingLead.pix,
        pix_key: editingLead.pix_key,
        simulation: editingLead.simulation,
        balance_error: editingLead.balance_error,
        proposal_error: editingLead.proposal_error,
        parcelas: editingLead.parcelas,
        provider: editingLead.provider,
        proposal_value: editingLead.proposal_value,
        proposal_status: editingLead.proposal_status,
        proposal_id: editingLead.proposal_id,
        error_reason: editingLead.error_reason,
        ressaque_tag: editingLead.ressaque_tag
      };

      const res = await fetch(`/api/leads/${editingLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dataToSend)
      });
      
      const json = await res.json();
      
      if (json.success) {
        setEditModalOpen(false);
        // Recarregar dados do contato se necessário
        if (currentContact) {
          fetchLeadData();
        }
      } else {
        setSaveError(json.message || 'Erro ao salvar dados');
                }
              } catch (err) {
      setSaveError('Erro ao salvar dados: ' + err.message);
      } finally {
      setIsSavingLead(false);
    }
  }, [editingLead, currentContact]);

  // ✅ RENDERIZAÇÃO SIMPLIFICADA
  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950">
        <Navbar />
        <div className="container mx-auto flex-1 flex flex-col p-6">
          <div className="max-w-4xl mx-auto bg-red-900/30 border border-red-700 rounded-lg p-4 text-center">
            <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-2" />
            <p className="text-lg font-semibold text-red-200">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen h-screen max-h-screen flex flex-col overflow-hidden w-full bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950">
      <Navbar />
      
      <div className="container-fluid mx-auto flex-1 flex flex-col overflow-hidden w-full p-6">
        <div className="w-full h-full flex flex-col overflow-hidden">
          <div className="flex flex-col md:flex-row border border-cyan-800/50 rounded-lg shadow-2xl bg-white/5 backdrop-blur-sm overflow-hidden flex-1 w-full">
            
            {/* ✅ LISTA DE CONTATOS - Componente simplificado */}
              {(!isMobileView || !currentContact) && (
                <div className="flex-shrink-0 flex-grow-0 min-w-0 w-full md:basis-1/4 md:max-w-[25%] border-r border-cyan-800/50 flex flex-col h-full p-0">
                {/* Header dos contatos */}
                <div className="p-2 border-b border-cyan-800/50 bg-gradient-to-r from-cyan-900/20 to-blue-900/20">
                  <div className="flex items-center justify-between mb-3">
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
                            <span>
                              {connectionStatus.connected 
                                ? `Conectado (${connectionStatus.connectedInstances}/${connectionStatus.totalInstances})`
                                : 'Desconectado'
                              }
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                        onClick={refreshContacts}
                          className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors"
                          title="Sincronizar contatos"
                        >
                          <FaSpinner className={`w-3 h-3 text-white ${isSyncing ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                          className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full p-2 hover:from-cyan-500 hover:to-blue-500 transition shadow-lg"
                        >
                          <FaPlus />
                        </button>
                      </div>
                    </div>
                    
                  {/* Seletor de Instâncias */}
                    {(() => {
                    const shouldShow = instances.length > 0 || connectionStatus === null;
                      return shouldShow && (
                      <div className="mb-3 relative" ref={dropdownRef}>
                        <button
                          type="button"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-full py-2 px-3 bg-white/10 text-cyan-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/60 border border-cyan-800/50 transition-colors duration-200 hover:bg-white/15 flex items-center justify-between cursor-pointer"
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
                      {dropdownOpen && (
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
                            {instances.length === 0 ? (
                              <div className="px-3 py-2 text-center text-cyan-400 text-sm">
                                Nenhuma instância encontrada
                              </div>
                            ) : (
                              instances.map((instance) => (
                              <button
                                key={instance.id}
                                type="button"
                                onClick={() => handleInstanceSelect(instance.id)}
                                className={`w-full px-3 py-2 text-left hover:bg-white/10 transition-colors duration-200 flex items-center justify-between ${
                                  selectedInstanceId === instance.id ? 'bg-white/20 text-cyan-100' : 'text-cyan-200'
                                } border-b border-cyan-800/30 last:border-b-0 last:rounded-b-lg`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    instance.connected ? 'bg-emerald-500' : 'bg-red-500'
                                  }`}></div>
                                <span>
                                  {instance.agent_name || instance.instance_name || `Instância ${instance.id}`}
                                </span>
                                  {instance.phone && (
                                    <span className="text-xs text-cyan-400">
                                      ({instance.phone})
                                    </span>
                                  )}
                                </div>
                                {selectedInstanceId === instance.id && (
                                  <FaCheck className="w-3 h-3 text-cyan-400" />
                                )}
                              </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                    })()}
                    
                  {/* Busca */}
                    <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
                      <input
                        type="text"
                      placeholder="Buscar conversas..."
                        value={searchTerm}
                      onChange={(e) => actions.setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-cyan-100 placeholder-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    </div>
                  </div>

                {/* Lista de contatos */}
                  <div 
                    ref={contactsContainerRef}
                    className="overflow-y-auto flex-1"
                    onScroll={handleContactsScroll}
                  >
                  {contactsLoading.contacts ? (
                      <div className="p-6 text-center text-cyan-300">
                      <FaSpinner className="animate-spin text-2xl mx-auto mb-2" />
                      <p>Carregando conversas...</p>
                          </div>
                  ) : displayContacts.length === 0 ? (
                    <div className="p-6 text-center text-cyan-300">
                      <p>Nenhuma conversa encontrada</p>
                      </div>
                    ) : (
                    displayContacts.map((contact, index) => (
                          <div
                            key={`${contact.remote_jid || contact.id || 'contact'}-${index}`}
                            className={`flex items-center p-2 cursor-pointer border-b border-cyan-800/30 hover:bg-white/5 transition-colors ${
                              currentContact?.id === contact.id || currentContact?.remote_jid === contact.remote_jid ? 'bg-white/10' : ''
                            }`}
                        onClick={() => handleContactSelect(contact)}
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
                              <h3 className="font-semibold text-cyan-100">{contact.name || contact.push_name || 'Contato'}</h3>
                              {contact.instance_name && (
                                          <span className="text-xs text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded-full font-medium">
                                  {contact.instance_name}
                                          </span>
                                        )}
                                </div>
                                <span className="text-xs text-cyan-300 ml-1 shrink-0 whitespace-nowrap">
                              {formatTimestamp(contact.last_message_time || contact.updated_at || contact.created_at)}
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
                              onClick={(e) => toggleAutoResponse(contact.id || contact.remote_jid, e)}
                              className={`ml-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-all ${
                            contact.agent_state === 'ai'
                                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                                  : 'bg-gray-600/50 text-gray-300'
                              }`}
                          title={contact.agent_state === 'ai' ? "Desativar resposta automática" : "Ativar resposta automática"}
                          aria-label={contact.agent_state === 'ai' ? "Desativar resposta automática" : "Ativar resposta automática"}
                          aria-pressed={contact.agent_state === 'ai'}
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
                    {contactsLoading.moreContacts && (
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
                    
                    {/* Botão para carregar mais contatos */}
                    {pagination.hasMore && !contactsLoading.contacts && !contactsLoading.moreContacts && displayContacts.length > 0 && (
                      <div className="p-3 text-center">
                        <button
                          onClick={loadMoreContacts}
                          className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 rounded-lg transition-colors text-sm"
                        >
                          Carregar mais conversas
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
            {/* ✅ ÁREA DE CHAT - Componente simplificado */}
              {currentContact ? (
              <div className="flex-1 flex flex-col min-w-0 relative">
                
                {/* ✅ BOTÃO DE ANCORAGEM: Flutuante FIXO sobre a área de mensagens (igual ao backup) */}
                {(() => {
                  const shouldShowButton = !isAtBottom && messages.length > 0;
                  console.log('[BUTTON] 🔍 Debug botão scroll:', {
                    isAtBottom,
                    messagesLength: messages.length,
                    shouldShowButton
                  });
                  return shouldShowButton;
                })() && (
                    <button
                      onClick={() => {
                      console.log('[BUTTON] 🎯 Botão clicado - fazendo scroll');
                      scrollToBottom(true);
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
                {/* Header do chat */}
                <div className="p-2 border-b border-cyan-800/50 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isMobileView && (
                        <button
                        onClick={() => actions.setCurrentContact(null)}
                        className="text-cyan-300 hover:text-cyan-100 p-2"
                        >
                        <FaArrowLeft />
                        </button>
                    )}
                    <div>
                      <h3 className="font-semibold text-cyan-100">
                        {currentContact.name || currentContact.push_name || 'Contato'}
                      </h3>
                      <p className="text-sm text-cyan-300">
                        {currentContact.phone}
                      </p>
                  </div>
                </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        console.log('[DEBUG-BUTTON] 🖱️ Botão clicado!');
                        console.log('[DEBUG-BUTTON] 📊 currentContact:', currentContact);
                        handleOpenContactPanel(currentContact);
                      }}
                      className="text-cyan-300 hover:text-cyan-100 p-2"
                      title="Ver dados do contato"
                    >
                      <FaUser />
                    </button>
                    <button className="text-cyan-300 hover:text-cyan-100 p-2">
                      <FaPhone />
                    </button>
                    <button className="text-cyan-300 hover:text-cyan-100 p-2">
                      <FaVideo />
                    </button>
                  </div>
                </div>

                {/* Mensagens */}
                    <div 
                      ref={messagesContainerRef}
                      className="flex-1 overflow-y-auto p-3 bg-gradient-to-br from-emerald-950/20 via-cyan-950/20 to-blue-950/20 relative"
                      style={{ 
                        height: '100%',
                        maxHeight: 'calc(100vh - 12rem)',
                        minHeight: '300px',
                        display: 'flex',
                    flexDirection: 'column',
                    willChange: 'scroll-position',
                    contain: 'layout style paint',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden',
                    perspective: '1000px'
                      }}
                      onScroll={handleScroll}
                    >
                  {/* Spacer para empurrar mensagens para o final */}
                            <div className="flex-grow"></div>
                  
                          <div className="flex flex-col w-full">
                            {messages.map((msg, index) => {
                              const previousMsg = index > 0 ? messages[index - 1] : null;
                      const showDateSeparator = previousMsg ? 
                        new Date(msg.created_at).toDateString() !== new Date(previousMsg.created_at).toDateString() : 
                        true;
                              
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
                    
                          {/* Mensagem */}
                          <div className={`flex ${msg.role === 'USER' ? 'justify-start' : 'justify-end'} mb-2`}>
                            <div className={`max-w-[70%] rounded-lg p-3 ${
                              msg.role === 'USER' 
                                ? 'bg-white/10 text-cyan-100 border border-cyan-800/30'
                                : msg.role === 'AI'
                                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-700 text-white'
                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                            }`}>
                              <div className="break-words">
                                {sanitizeContent(msg.content)}
                          </div>
                              <div className={`text-xs mt-1 ${
                                msg.role === 'USER' 
                                  ? 'text-cyan-300' 
                                  : msg.role === 'AI'
                                  ? 'text-purple-100'
                                  : 'text-cyan-100'
                              }`}>
                                {formatTimestamp(msg.created_at)}
                                {msg.role === 'USER' && (
                                  <button
                                    onClick={() => handleCopyMessage(msg.content)}
                                    className="ml-2 text-cyan-400 hover:text-cyan-200"
                                    title="Copiar mensagem"
                                  >
                                    <FaRegCopy className="w-3 h-3" />
                                  </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                </React.Fragment>
                              );
                            })}
                          </div>
                                    </div>
                  
                {/* Input de mensagem */}
                <div className="p-3 border-t border-cyan-800/50 bg-white/5">
                  <div className="flex items-center gap-2">
                    <button className="text-cyan-300 hover:text-cyan-100 p-2">
                      <FaPaperclip />
                      </button>
                    <button className="text-cyan-300 hover:text-cyan-100 p-2">
                      <FaSmile />
                      </button>
                    
                    <div className="flex-1 relative">
                          <input
                        ref={messageInputRef}
                            type="text"
                            value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Digite sua mensagem..."
                        className="w-full px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-lg text-cyan-100 placeholder-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        disabled={isSendingMessage}
                      />
                    </div>
                    
                            <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSendingMessage}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-500 disabled:to-gray-600 text-white p-2 rounded-lg transition-all duration-200"
                    >
                      {isSendingMessage ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <IoSend />
                      )}
                    </button>
                              </div>
                            </div>
                          </div>
                        ) : (
              /* ✅ TELA INICIAL - Quando nenhum contato está selecionado */
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-emerald-950/20 via-cyan-950/20 to-blue-950/20">
                <div className="text-center text-cyan-300">
                  <FaPhone className="text-6xl mx-auto mb-4 opacity-50" />
                  <h2 className="text-2xl font-semibold mb-2">Selecione uma conversa</h2>
                  <p>Escolha um contato para começar a conversar</p>
                                      </div>
                                    </div>
                                  )}
                                  
            {/* ✅ PAINEL LATERAL DE DADOS DO CONTATO - Integrado ao layout */}
                                  {(() => {
              const shouldRender = isContactPanelOpen && selectedContactForPanel;
              // TESTE: Forçar renderização se há contato selecionado
              const forceRender = currentContact && true;
              
              console.log('[DEBUG-PANEL] 🔍 Condições do painel:', {
                isContactPanelOpen,
                selectedContactForPanel: !!selectedContactForPanel,
                contactData: !!contactData,
                contactDataLeadId: contactData?.leadId,
                shouldRender,
                forceRender,
                currentContact: !!currentContact
              });
              
              if (shouldRender || forceRender) {
                console.log('[DEBUG-PANEL] ✅ Renderizando ContactPanel com props:', {
                  contact: selectedContactForPanel || currentContact,
                  isOpen: isContactPanelOpen || forceRender,
                  contactData: contactData
                });
              } else {
                console.log('[DEBUG-PANEL] ❌ NÃO renderizando ContactPanel');
              }
              
              return shouldRender || forceRender;
            })() && (
              <ContactPanel
                contact={selectedContactForPanel || currentContact}
                isOpen={isContactPanelOpen || true}
                onClose={handleCloseContactPanel}
                onEditLead={handleEditLead}
                onCreateProposal={handleCreateProposal}
                onViewProposalHistory={handleViewProposalHistory}
                onRepeatQuery={handleRepeatQuery}
                contactData={contactData} // ✅ ADICIONADO: Passar dados já carregados
                instances={instances} // ✅ ADICIONADO: Passar dados das instâncias
                isAutoUpdating={unifiedUpdating.leadData} // ✅ ADICIONADO: Indicador de atualização automática unificado
              />
            )}
                  </div>
                </div>
            </div>

      {/* ✅ MODAIS DO PAINEL LATERAL */}
      
      {/* Modal de Edição de Lead */}
      <Transition.Root show={editModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setEditModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
          </Transition.Child>
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700">
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white mb-6">
                    Editar Dados Pessoais
                  </Dialog.Title>
                  
                  {saveError && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                      {saveError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Coluna Esquerda */}
                    <div className="space-y-6">
                      {/* Informações Básicas */}
                      <div className="border-b border-gray-600 pb-4">
                        <h4 className="text-sm font-semibold text-cyan-300 mb-4">Informações Básicas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                            <input
                              type="text"
                              value={editingLead.name || ''}
                              onChange={(e) => setEditingLead(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                                    </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">CPF</label>
                            <input
                              type="text"
                              value={editingLead.cpf || ''}
                              onChange={(e) => setEditingLead(prev => ({ ...prev, cpf: e.target.value }))}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                                  </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                            <input
                              type="email"
                              value={editingLead.email || ''}
                              onChange={(e) => setEditingLead(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                                </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Telefone</label>
                            <input
                              type="text"
                              value={editingLead.phone || ''}
                              onChange={(e) => setEditingLead(prev => ({ ...prev, phone: e.target.value }))}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Documentos */}
                      <div className="border-b border-gray-600 pb-4">
                        <h4 className="text-sm font-semibold text-cyan-300 mb-4">Documentos</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">RG</label>
                            <input
                              type="text"
                              value={editingLead.rg || ''}
                              onChange={(e) => setEditingLead(prev => ({ ...prev, rg: e.target.value }))}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Data de Nascimento</label>
                            <input
                              type="date"
                              value={editingLead.birth || ''}
                              onChange={(e) => setEditingLead(prev => ({ ...prev, birth: e.target.value }))}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Nome da Mãe</label>
                            <input
                              type="text"
                              value={editingLead.mother_name || ''}
                              onChange={(e) => setEditingLead(prev => ({ ...prev, mother_name: e.target.value }))}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Coluna Direita */}
                    <div className="space-y-6">
                      {/* Endereço */}
                      <div className="border-b border-gray-600 pb-4">
                        <h4 className="text-sm font-semibold text-cyan-300 mb-4">Endereço</h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">CEP</label>
                              <input
                                type="text"
                                value={editingLead.cep || ''}
                                onChange={(e) => setEditingLead(prev => ({ ...prev, cep: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Número</label>
                              <input
                                type="text"
                                value={editingLead.numero || ''}
                                onChange={(e) => setEditingLead(prev => ({ ...prev, numero: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Rua</label>
                            <input
                              type="text"
                              value={editingLead.rua || ''}
                              onChange={(e) => setEditingLead(prev => ({ ...prev, rua: e.target.value }))}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Cidade</label>
                              <input
                                type="text"
                                value={editingLead.cidade || ''}
                                onChange={(e) => setEditingLead(prev => ({ ...prev, cidade: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Estado</label>
                              <input
                                type="text"
                                value={editingLead.estado || ''}
                                onChange={(e) => setEditingLead(prev => ({ ...prev, estado: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              />
                            </div>
                          </div>
                        </div>
                                    </div>
                  
                      {/* Informações Financeiras */}
                      <div>
                        <h4 className="text-sm font-semibold text-cyan-300 mb-4">Informações Financeiras</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Chave PIX</label>
                            <input
                              type="text"
                              value={editingLead.pix_key || ''}
                              onChange={(e) => setEditingLead(prev => ({ ...prev, pix_key: e.target.value }))}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Saldo</label>
                            <input
                              type="text"
                              value={editingLead.balance || ''}
                              readOnly
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-not-allowed opacity-60"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                      <button 
                        type="button"
                      className="inline-flex justify-center rounded-md border border-gray-500 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none"
                      onClick={() => setEditModalOpen(false)}
                      >
                      Cancelar
                      </button>
                      <button 
                        type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={saveLeadData}
                      disabled={isSavingLead}
                    >
                      {isSavingLead ? (
                        <>
                          <FaSpinner className="animate-spin mr-2 w-4 h-4" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar'
                      )}
                    </button>
                                    </div>
                </Dialog.Panel>
              </Transition.Child>
                                  </div>
                                </div>
        </Dialog>
      </Transition.Root>

      {/* Modal de Histórico de Propostas */}
      <Transition.Root show={proposalsHistoryModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setProposalsHistoryModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
          </Transition.Child>
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700">
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white mb-6">
                    Histórico de Propostas - {selectedLead?.name}
                  </Dialog.Title>
                  
                  {isLoadingProposals ? (
                    <div className="flex justify-center items-center py-8">
                      <FaSpinner className="w-8 h-8 text-cyan-500 animate-spin" />
                      <span className="ml-3 text-white">Carregando propostas...</span>
                          </div>
                  ) : proposalsHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-300">Nenhuma proposta encontrada para este lead.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {proposalsHistory.map((proposal, index) => (
                        <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-medium">Proposta #{proposal.proposal_id}</p>
                              <p className="text-gray-300 text-sm">Status: {proposal.status}</p>
                              <p className="text-gray-300 text-sm">Valor: {proposal.value}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setProposalsHistoryModalOpen(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Fechar
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Modal de Repetir Consulta */}
      <Transition.Root show={providerModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setProviderModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
          </Transition.Child>
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700">
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white mb-4">
                    Repetir Consulta
                  </Dialog.Title>
                  
                  <div className="mb-6">
                    <p className="text-gray-200 mb-4">
                      Selecione qual provedor e banco deseja usar para consultar o saldo do lead <strong className="text-cyan-300">{selectedLeadForQuery?.name}</strong>:
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">Provedor</label>
                        <select
                          value={selectedProvider}
                          onChange={(e) => setSelectedProvider(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="cartos">Cartos</option>
                          <option value="qi">QI</option>
                        </select>
                                    </div>
                  
                      <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">Banco</label>
                        {loadingBanks ? (
                          <div className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white flex items-center">
                            <FaSpinner className="animate-spin mr-2 w-4 h-4" />
                            Carregando bancos...
                          </div>
                        ) : availableBanks.length > 0 ? (
                          <select
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="">Selecione um banco</option>
                            {availableBanks.map((bank) => (
                              <option key={bank.id} value={bank.id}>
                                {bank.name} ({bank.partner_type})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="w-full px-3 py-2 bg-gray-800 border border-red-500 rounded-lg text-red-400">
                            Nenhum banco disponível. Cadastre credenciais na página de Parceiros.
                          </div>
                        )}
                      </div>
                          </div>
                        </div>
                      
                  {repeatError && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                      {repeatError}
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                        <button
                        type="button"
                      className="inline-flex justify-center rounded-md border border-gray-500 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none"
                      onClick={() => setProviderModalOpen(false)}
                      >
                      Cancelar
                        </button>
                        <button
                          type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={confirmRepeatQuery}
                      disabled={repeatingQuery === selectedLeadForQuery?.id || !selectedBank}
                    >
                      {repeatingQuery === selectedLeadForQuery?.id ? (
                        <>
                          <FaSpinner className="animate-spin mr-2 w-4 h-4" />
                          Consultando...
                        </>
                      ) : (
                        'Repetir Consulta'
                      )}
                        </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Modal de Criar Proposta */}
      <Transition.Root show={createProposalModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setCreateProposalModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
          </Transition.Child>
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700">
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white mb-6">
                    Criar Proposta - {selectedLeadForProposal?.name}
                  </Dialog.Title>
                  
                  {createProposalError && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                      {createProposalError}
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Dados do Lead */}
                    <div className="border-b border-gray-600 pb-4">
                      <h4 className="text-sm font-semibold text-cyan-300 mb-4">Dados do Lead</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-cyan-300 mb-1">
                            Nome <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={proposalFormData.name || ''}
                            onChange={(e) => setProposalFormData({...proposalFormData, name: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                              !proposalFormData.name ? 'border-red-500' : 'border-gray-600'
                            }`}
                            placeholder="Digite o nome completo"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-cyan-300 mb-1">
                            CPF <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={proposalFormData.cpf || ''}
                            onChange={(e) => setProposalFormData({...proposalFormData, cpf: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                              !proposalFormData.cpf ? 'border-red-500' : 'border-gray-600'
                            }`}
                            placeholder="000.000.000-00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-cyan-300 mb-1">
                            RG <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={proposalFormData.rg || ''}
                            onChange={(e) => setProposalFormData({...proposalFormData, rg: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                              !proposalFormData.rg ? 'border-red-500' : 'border-gray-600'
                            }`}
                            placeholder="Digite o RG"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-cyan-300 mb-1">
                            Nome da Mãe <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={proposalFormData.motherName || ''}
                            onChange={(e) => setProposalFormData({...proposalFormData, motherName: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                              !proposalFormData.motherName ? 'border-red-500' : 'border-gray-600'
                            }`}
                            placeholder="Nome completo da mãe"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-cyan-300 mb-1">
                            Email <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="email"
                            value={proposalFormData.email || ''}
                            onChange={(e) => setProposalFormData({...proposalFormData, email: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                              !proposalFormData.email ? 'border-red-500' : 'border-gray-600'
                            }`}
                            placeholder="email@exemplo.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-cyan-300 mb-1">
                            Data de Nascimento <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="date"
                            value={proposalFormData.birthDate || ''}
                            onChange={(e) => setProposalFormData({...proposalFormData, birthDate: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                              !proposalFormData.birthDate ? 'border-red-500' : 'border-gray-600'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-cyan-300 mb-1">
                            Estado Civil <span className="text-red-400">*</span>
                          </label>
                          <select
                            value={proposalFormData.maritalStatus || ''}
                            onChange={(e) => setProposalFormData({...proposalFormData, maritalStatus: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                              !proposalFormData.maritalStatus ? 'border-red-500' : 'border-gray-600'
                            }`}
                          >
                            <option value="">Selecione o estado civil</option>
                            <option value="single">Solteiro</option>
                            <option value="married">Casado</option>
                            <option value="divorced">Divorciado</option>
                            <option value="widowed">Viúvo</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-cyan-300 mb-1">
                            Telefone <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={proposalFormData.phone || ''}
                            onChange={(e) => setProposalFormData({...proposalFormData, phone: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                              !proposalFormData.phone ? 'border-red-500' : 'border-gray-600'
                            }`}
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-cyan-300 mb-1">
                            CEP <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={proposalFormData.postalCode || ''}
                            onChange={(e) => setProposalFormData({...proposalFormData, postalCode: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                              !proposalFormData.postalCode ? 'border-red-500' : 'border-gray-600'
                            }`}
                            placeholder="00000-000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-cyan-300 mb-1">
                            Número do Endereço <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={proposalFormData.addressNumber || ''}
                            onChange={(e) => setProposalFormData({...proposalFormData, addressNumber: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                              !proposalFormData.addressNumber ? 'border-red-500' : 'border-gray-600'
                            }`}
                            placeholder="123"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-cyan-300 mb-1">
                            Chave PIX <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={proposalFormData.chavePix || ''}
                            onChange={(e) => setProposalFormData({...proposalFormData, chavePix: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                              !proposalFormData.chavePix ? 'border-red-500' : 'border-gray-600'
                            }`}
                            placeholder="Digite a chave PIX"
                          />
                        </div>
                  </div>
                </div>
                  
                    {/* Seleção de Provedor e Banco */}
                    <div className="border-b border-gray-600 pb-4">
                      <h4 className="text-sm font-semibold text-cyan-300 mb-4">Configurações da Proposta</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-cyan-300 mb-2">Provedor</label>
                          <select
                            value={selectedProvider}
                            onChange={(e) => setSelectedProvider(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="cartos">Cartos</option>
                            <option value="qi">QI</option>
                          </select>
                      </div>

                        <div>
                          <label className="block text-sm font-medium text-cyan-300 mb-2">Banco</label>
                          {loadingBanks ? (
                            <div className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white flex items-center">
                              <FaSpinner className="animate-spin mr-2 w-4 h-4" />
                              Carregando bancos...
                    </div>
                          ) : availableBanks.length > 0 ? (
                            <select
                              value={selectedBank}
                              onChange={(e) => setSelectedBank(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="">Selecione um banco</option>
                              {availableBanks.map((bank) => (
                                <option key={bank.id} value={bank.id}>
                                  {bank.name} ({bank.partner_type})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="w-full px-3 py-2 bg-gray-800 border border-red-500 rounded-lg text-red-400">
                              Nenhum banco disponível. Cadastre credenciais na página de Parceiros.
                </div>
              )}
            </div>
          </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button 
                      type="button" 
                      className="inline-flex justify-center rounded-md border border-gray-500 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none" 
                      onClick={() => setCreateProposalModalOpen(false)} 
                      disabled={isCreatingProposal}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button" 
                      className={`inline-flex justify-center rounded-md border px-4 py-2 text-sm font-medium focus:outline-none disabled:opacity-60 ${
                        validateProposalForm() 
                          ? 'border-gray-500 bg-gray-600 text-gray-300 cursor-not-allowed' 
                          : 'border-cyan-700 bg-cyan-700 text-white hover:bg-cyan-600'
                      }`}
                      onClick={createProposal} 
                      disabled={isCreatingProposal || !!validateProposalForm()}
                    >
                      {isCreatingProposal ? (
                        <>
                          <FaSpinner className="animate-spin mr-2 w-4 h-4" />
                          Criando...
                        </>
                      ) : validateProposalForm() ? (
                        'Preencha todos os campos'
                      ) : (
                        'Criar Proposta'
                      )}
                    </button>
      </div>
                </Dialog.Panel>
              </Transition.Child>
    </div>
          </div>
        </Dialog>
      </Transition.Root>
          </div>
  )

  // ✅ FUNÇÃO renderContactDataPanel() REMOVIDA - usando apenas o componente ContactPanel 
}
