import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook customizado para gerenciar polling de mensagens
 * Otimizado para evitar loops infinitos e race conditions
 */
export const useMessagePolling = ({
  currentContact,
  messages,
  setMessages,
  setLoading,
  isInitialLoad,
  lastMessageRef,
  currentIntervalRef,
  timeoutsRef
}) => {
  const pollingIntervalRef = useRef(null);
  const isPollingRef = useRef(false);
  const lastPollTimeRef = useRef(Date.now());

  // Função para buscar novas mensagens
  const pollMessages = useCallback(async () => {
    if (!currentContact?.remote_jid || isPollingRef.current || isInitialLoad) {
      return;
    }

    isPollingRef.current = true;
    lastPollTimeRef.current = Date.now();

    try {
      console.log('[POLLING] 🔄 Verificando novas mensagens...');
      
      const response = await fetch(`/api/chat/messages/${currentContact.remote_jid}?since=${lastMessageRef.current || ''}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status} ao buscar mensagens`);
      }

      const data = await response.json();
      
      if (data.success && data.messages && data.messages.length > 0) {
        console.log(`[POLLING] ✅ ${data.messages.length} novas mensagens encontradas`);
        
        // Adicionar novas mensagens ao final da lista
        setMessages(prevMessages => {
          const newMessages = data.messages.filter(newMsg => 
            !prevMessages.some(existingMsg => existingMsg.id === newMsg.id)
          );
          
          if (newMessages.length > 0) {
            const updatedMessages = [...prevMessages, ...newMessages];
            // Manter ordenação por timestamp
            return updatedMessages.sort((a, b) => {
              const timeA = new Date(a.timestamp || a.created_at).getTime();
              const timeB = new Date(b.timestamp || b.created_at).getTime();
              return timeA - timeB; // Ordem crescente (mais antigas primeiro)
            });
          }
          
          return prevMessages;
        });

        // Atualizar referência da última mensagem
        const lastMessage = data.messages[data.messages.length - 1];
        if (lastMessage) {
          lastMessageRef.current = lastMessage.timestamp || lastMessage.created_at;
        }
      }
    } catch (error) {
      console.error('[POLLING] ❌ Erro ao buscar mensagens:', error);
    } finally {
      isPollingRef.current = false;
    }
  }, [currentContact?.remote_jid, isInitialLoad, setMessages]);

  // Função para agendar próximo polling
  const scheduleNextPoll = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
    }

    const interval = currentIntervalRef.current;
    console.log(`[POLLING] ⏰ Próximo polling em ${interval}ms`);
    
    pollingIntervalRef.current = setTimeout(() => {
      pollMessages().then(() => {
        scheduleNextPoll();
      });
    }, interval);
    
    timeoutsRef.current.push(pollingIntervalRef.current);
  }, [pollMessages, currentIntervalRef, timeoutsRef]);

  // Função para obter intervalo adaptativo
  const getAdaptiveInterval = useCallback(() => {
    const timeSinceLastPoll = Date.now() - lastPollTimeRef.current;
    
    // Se não há atividade recente, aumentar o intervalo
    if (timeSinceLastPoll > 300000) { // 5 minutos
      return 60000; // 1 minuto
    } else if (timeSinceLastPoll > 60000) { // 1 minuto
      return 30000; // 30 segundos
    } else {
      return 10000; // 10 segundos
    }
  }, []);

  // Iniciar polling quando contato mudar
  useEffect(() => {
    if (!currentContact?.remote_jid) {
      return;
    }

    console.log('[POLLING] 🚀 Iniciando polling para contato:', currentContact.name || currentContact.push_name);
    
    // ✅ CORREÇÃO: Inicializar com a última mensagem existente para evitar loop infinito
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      lastMessageRef.current = lastMessage.timestamp || lastMessage.created_at;
      console.log('[POLLING] 📝 Inicializando lastMessageRef com:', lastMessageRef.current);
    } else {
      lastMessageRef.current = null;
      console.log('[POLLING] 📝 Inicializando lastMessageRef como null (sem mensagens)');
    }
    
    // Definir intervalo inicial
    currentIntervalRef.current = 10000; // 10 segundos
    
    // Iniciar polling
    scheduleNextPoll();

    return () => {
      console.log('[POLLING] 🛑 Parando polling');
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentContact?.remote_jid, scheduleNextPoll]);

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
    if (!pollingIntervalRef.current && currentContact?.remote_jid) {
      scheduleNextPoll();
    }
  }, [currentContact?.remote_jid, scheduleNextPoll]);

  // Função para forçar polling imediato
  const forcePoll = useCallback(() => {
    if (!isPollingRef.current) {
      pollMessages();
    }
  }, [pollMessages]);

  return {
    pausePolling,
    resumePolling,
    forcePoll,
    isPolling: isPollingRef.current
  };
};























