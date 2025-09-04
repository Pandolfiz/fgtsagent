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
    if (isPollingRef.current || !currentUser?.id) {
      return;
    }

    isPollingRef.current = true;
    lastPollTimeRef.current = Date.now();
    const config = getPollingConfig();

    try {
      console.log('[UNIFIED-POLLING] 🔄 Executando polling unificado...');
      console.log('[UNIFIED-POLLING] 📊 Config:', config);
      console.log('[UNIFIED-POLLING] 👤 Usuário:', currentUser?.id);
      console.log('[UNIFIED-POLLING] 💬 Contato atual:', currentContact?.name || currentContact?.remote_jid);
      console.log('[UNIFIED-POLLING] 📋 Painel aberto:', isContactPanelOpen);

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
              setMessages(prevMessages => {
                const newMessages = data.messages.filter(newMsg => 
                  !prevMessages.some(existingMsg => existingMsg.id === newMsg.id)
                );
                
                if (newMessages.length > 0) {
                  console.log(`[UNIFIED-POLLING] 📝 ${newMessages.length} novas mensagens`);
                  
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
            }
          }
        } catch (error) {
          console.error('[UNIFIED-POLLING] ❌ Erro ao atualizar mensagens:', error);
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
        console.log('[UNIFIED-POLLING] 📋 Lista de contatos atualizada');
      } catch (error) {
        console.error('[UNIFIED-POLLING] ❌ Erro ao atualizar contatos:', error);
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
        console.log('[UNIFIED-POLLING] ⏰ LastSyncTime atualizado');
      }

    } catch (error) {
      console.error('[UNIFIED-POLLING] ❌ Erro no polling unificado:', error);
    } finally {
      isPollingRef.current = false;
    }
  }, [
    currentUser?.id,
    currentContact,
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
  }, [currentUser?.id, scheduleNextPoll]);

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
  }, [currentUser?.id, scheduleNextPoll]);

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
