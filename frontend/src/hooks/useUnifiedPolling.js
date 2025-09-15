import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook unificado para gerenciar polling de todos os dados do chat
 * Otimizado para UX e performance
 */
export const useUnifiedPolling = ({
  currentContact,
  currentUser,
  isContactPanelOpen,
  // Funções de atualização
  fetchMessages,
  fetchContacts,
  fetchLeadData,
  // Estados
  messages,
  setMessages,
  // Refs
  lastMessageRef,
  timeoutsRef,
  // Callbacks
  setLastSyncTime
}) => {
  const pollingIntervalRef = useRef(null);
  const isPollingRef = useRef(false);
  const lastPollTimeRef = useRef(Date.now());
  const isProcessingMessagesRef = useRef(false);
  const lastPollingIdRef = useRef(null);
  const pollingTimeoutRef = useRef(null);
  const [isUpdating, setIsUpdating] = useState({
    messages: false,
    contacts: false,
    leadData: false
  });

  // Configuração de intervalos baseada na atividade do usuário
  const getPollingConfig = useCallback(() => {
    const timeSinceLastActivity = Date.now() - lastPollTimeRef.current;
    const isActive = timeSinceLastActivity < 300000; // 5 minutos

    if (isActive) {
      // Usuário ativo - polling mais frequente
      return {
        messages: 15000,    // 15 segundos
        contacts: 60000,    // 1 minuto
        leadData: 90000,    // 1.5 minutos
        interval: 15000     // Verificação a cada 15s
      };
    } else {
      // Usuário inativo - polling menos frequente
      return {
        messages: 60000,    // 1 minuto
        contacts: 300000,   // 5 minutos
        leadData: 300000,   // 5 minutos
        interval: 60000     // Verificação a cada 1 minuto
      };
    }
  }, []);

  // Função unificada de polling
  const unifiedPoll = useCallback(async () => {
    const pollingId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();
    
    console.log(`[UNIFIED-POLLING-${pollingId}] 🚀 Iniciando polling...`, {
      timestamp: startTime,
      isPollingRef: isPollingRef.current,
      lastPollingId: lastPollingIdRef.current
    });
    
    // Log apenas se houver problema
    if (isPollingRef.current) {
      console.log(`[UNIFIED-POLLING-${pollingId}] ⚠️ Polling já em andamento`);
    }
    
    if (isPollingRef.current || !currentUser?.id) {
      return;
    }

    // ✅ CORREÇÃO: Verificar se já existe um polling em andamento com ID diferente
    if (lastPollingIdRef.current && lastPollingIdRef.current !== pollingId) {
      console.log(`[UNIFIED-POLLING-${pollingId}] ⚠️ Polling anterior ainda em andamento`);
      return;
    }

    // ✅ CORREÇÃO: Registrar este polling como ativo
    lastPollingIdRef.current = pollingId;
    lastPollTimeRef.current = startTime;

    isPollingRef.current = true;
    lastPollTimeRef.current = Date.now();
    const config = getPollingConfig();

    try {
      console.log(`[UNIFIED-POLLING-${pollingId}] 🔄 Executando polling unificado...`);
      console.log(`[UNIFIED-POLLING-${pollingId}] 📊 Config:`, config);
      console.log(`[UNIFIED-POLLING-${pollingId}] 👤 Usuário:`, currentUser?.id);
      console.log(`[UNIFIED-POLLING-${pollingId}] 💬 Contato atual:`, currentContact?.name || currentContact?.remote_jid);
      console.log(`[UNIFIED-POLLING-${pollingId}] 📋 Painel aberto:`, isContactPanelOpen);

      // 1. Atualizar mensagens (sempre que há contato selecionado)
      if (currentContact?.remote_jid) {
        setIsUpdating(prev => ({ ...prev, messages: true }));
        
        try {
          const response = await fetch(`/api/messages/${currentContact.remote_jid}?page=1&limit=20`, {
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.messages && data.messages.length > 0) {
              // ✅ CORREÇÃO: Evitar processamento duplo de mensagens
              if (isProcessingMessagesRef.current) {
                return;
              }
              
              isProcessingMessagesRef.current = true;
              
              setMessages(prevMessages => {
                // ✅ CORREÇÃO: Filtrar mensagens que já existem, incluindo mensagens temporárias
                const newMessages = data.messages.filter(newMsg => {
                  // Verificar se já existe uma mensagem com o mesmo ID
                  const existsById = prevMessages.some(existingMsg => existingMsg.id === newMsg.id);
                  
                  // Verificar se já existe uma mensagem temporária com conteúdo similar e timestamp próximo
                  const existsAsTemp = prevMessages.some(existingMsg => 
                    existingMsg.temp && 
                    existingMsg.content === newMsg.content &&
                    existingMsg.from_me === newMsg.from_me &&
                    Math.abs(new Date(existingMsg.created_at).getTime() - new Date(newMsg.timestamp || newMsg.created_at).getTime()) < 10000 // 10 segundos
                  );
                  
                  // Verificar se já existe uma mensagem real com conteúdo e timestamp muito próximos
                  const existsAsReal = prevMessages.some(existingMsg => 
                    !existingMsg.temp &&
                    existingMsg.content === newMsg.content &&
                    existingMsg.from_me === newMsg.from_me &&
                    Math.abs(new Date(existingMsg.timestamp || existingMsg.created_at).getTime() - new Date(newMsg.timestamp || newMsg.created_at).getTime()) < 5000 // 5 segundos
                  );
                  
                  return !existsById && !existsAsTemp && !existsAsReal;
                });
                
                // Log apenas se houver mensagens novas ou problemas
                if (newMessages.length > 0) {
                  console.log(`[UNIFIED-POLLING-${pollingId}] ✅ ${newMessages.length} mensagens novas encontradas`);
                  console.log(`[UNIFIED-POLLING-${pollingId}] 🔍 DEBUG - Mensagem que passou pelo filtro:`, {
                    id: newMessages[0].id,
                    content: newMessages[0].content,
                    sender: newMessages[0].sender,
                    timestamp: newMessages[0].timestamp || newMessages[0].created_at,
                    isTemporary: newMessages[0].isTemporary
                  });
                }
                
                if (newMessages.length > 0) {
                  const updatedMessages = [...prevMessages, ...newMessages];
                  const sortedMessages = updatedMessages.sort((a, b) => {
                    const timeA = new Date(a.timestamp || a.created_at).getTime();
                    const timeB = new Date(b.timestamp || b.created_at).getTime();
                    return timeA - timeB;
                  });
                  
                  const lastMessage = sortedMessages[sortedMessages.length - 1];
                  lastMessageRef.current = lastMessage.timestamp || lastMessage.created_at;
                  
                  return sortedMessages;
                }
                
                return prevMessages;
              });
              // ✅ CORREÇÃO: Liberar o lock após processamento
              setTimeout(() => {
                isProcessingMessagesRef.current = false;
              }, 100);
            }
          }
        } catch (error) {
          console.error(`[UNIFIED-POLLING-${pollingId}] ❌ Erro ao atualizar mensagens:`, error);
        } finally {
          setTimeout(() => {
            setIsUpdating(prev => ({ ...prev, messages: false }));
          }, 2000);
        }
      }

      // 2. Atualizar lista de contatos (sempre)
      setIsUpdating(prev => ({ ...prev, contacts: true }));
      
      try {
        await fetchContacts(1, false);
      } catch (error) {
          console.error(`[UNIFIED-POLLING-${pollingId}] ❌ Erro ao atualizar contatos:`, error);
      } finally {
        setTimeout(() => {
          setIsUpdating(prev => ({ ...prev, contacts: false }));
        }, 2000);
      }

      // 3. Atualizar dados do lead (apenas se painel aberto)
      if (isContactPanelOpen && currentContact) {
        const phone = currentContact?.phone || (currentContact?.remote_jid ? currentContact.remote_jid.split('_')[1] : null);
        
        if (phone) {
          setIsUpdating(prev => ({ ...prev, leadData: true }));
          
          try {
            await fetchLeadData(phone);
            console.log('[UNIFIED-POLLING] 👤 Dados do lead atualizados');
          } catch (error) {
            console.error('[UNIFIED-POLLING] ❌ Erro ao atualizar dados do lead:', error);
          } finally {
            setTimeout(() => {
              setIsUpdating(prev => ({ ...prev, leadData: false }));
            }, 2000);
          }
        }
      }

      // ✅ ATUALIZAR LAST SYNC TIME
      if (setLastSyncTime) {
        setLastSyncTime(new Date().toISOString());
      }

    } catch (error) {
      console.error(`[UNIFIED-POLLING-${pollingId}] ❌ Erro no polling unificado:`, error);
    } finally {
      isPollingRef.current = false;
      lastPollingIdRef.current = null;
    }
  }, [
    currentUser?.id,
    currentContact?.remote_jid,
    isContactPanelOpen,
    fetchMessages,
    fetchContacts,
    fetchLeadData,
    setMessages,
    lastMessageRef,
    getPollingConfig,
    setLastSyncTime
  ]);

  // Função para agendar próximo polling
  const scheduleNextPoll = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
    }

    const config = getPollingConfig();
    const interval = config.interval;
    
    console.log(`[UNIFIED-POLLING] ⏰ Próximo polling em ${interval}ms`);
    
    pollingIntervalRef.current = setTimeout(() => {
      unifiedPoll();
      scheduleNextPoll();
    }, interval);
    
    timeoutsRef.current.push(pollingIntervalRef.current);
  }, [unifiedPoll, getPollingConfig, timeoutsRef]);

  // Iniciar polling quando usuário estiver logado
  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    console.log('[UNIFIED-POLLING] 🚀 Iniciando polling unificado');
    
    // Iniciar polling
    scheduleNextPoll();

    return () => {
      console.log('[UNIFIED-POLLING] 🛑 Parando polling unificado');
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentUser?.id]); // ✅ CORREÇÃO: Remover scheduleNextPoll das dependências

  // Parar polling quando componente desmontar
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
      }
    };
  }, []);

  // Função para pausar polling
  const pausePolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Função para retomar polling
  const resumePolling = useCallback(() => {
    if (!pollingIntervalRef.current && currentUser?.id) {
      scheduleNextPoll();
    }
  }, [currentUser?.id]); // ✅ CORREÇÃO: Remover scheduleNextPoll das dependências

  // Função para forçar polling imediato
  const forcePoll = useCallback(() => {
    if (!isPollingRef.current) {
      unifiedPoll();
    }
  }, [unifiedPoll]);

  return {
    pausePolling,
    resumePolling,
    forcePoll,
    isPolling: isPollingRef.current,
    isUpdating
  };
};
