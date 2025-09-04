import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook customizado para polling seguro e controlado
 * Elimina loops infinitos e gerencia recursos adequadamente
 */
export const usePolling = (callback, interval = 30000, options = {}) => {
  const {
    enabled = true,
    immediate = false,
    maxRetries = 3,
    backoffMultiplier = 1.5,
    maxInterval = 300000 // 5 minutos máximo
  } = options;

  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const isActiveRef = useRef(false);
  const callbackRef = useRef(callback);

  // Atualizar referência do callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Função para executar o polling
  const executePoll = useCallback(async () => {
    if (!isActiveRef.current || !enabled) return;

    try {
      await callbackRef.current();
      retryCountRef.current = 0; // Reset contador de retry em caso de sucesso
    } catch (error) {
      console.warn('[POLLING] Erro no polling:', error);
      retryCountRef.current++;
      
      // Se excedeu max retries, parar polling
      if (retryCountRef.current >= maxRetries) {
        console.error('[POLLING] Máximo de tentativas excedido, parando polling');
        stopPolling();
        return;
      }
    }
  }, [enabled, maxRetries]);

  // Função para agendar próximo poll
  const scheduleNextPoll = useCallback(() => {
    if (!isActiveRef.current || !enabled) return;

    // Calcular intervalo com backoff exponencial
    const currentInterval = Math.min(
      interval * Math.pow(backoffMultiplier, retryCountRef.current),
      maxInterval
    );

    timeoutRef.current = setTimeout(() => {
      if (isActiveRef.current) {
        executePoll().finally(() => {
          scheduleNextPoll();
        });
      }
    }, currentInterval);
  }, [interval, backoffMultiplier, maxInterval, enabled, executePoll]);

  // Função para iniciar polling
  const startPolling = useCallback(() => {
    if (isActiveRef.current) return;
    
    isActiveRef.current = true;
    console.log('[POLLING] Iniciando polling com intervalo:', interval);
    
    if (immediate) {
      executePoll().finally(() => {
        scheduleNextPoll();
      });
    } else {
      scheduleNextPoll();
    }
  }, [immediate, interval, executePoll, scheduleNextPoll]);

  // Função para parar polling
  const stopPolling = useCallback(() => {
    if (!isActiveRef.current) return;
    
    isActiveRef.current = false;
    console.log('[POLLING] Parando polling');
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Função para pausar polling
  const pausePolling = useCallback(() => {
    if (!isActiveRef.current) return;
    
    console.log('[POLLING] Pausando polling');
    stopPolling();
  }, [stopPolling]);

  // Função para retomar polling
  const resumePolling = useCallback(() => {
    if (isActiveRef.current) return;
    
    console.log('[POLLING] Retomando polling');
    startPolling();
  }, [startPolling]);

  // Função para forçar execução imediata
  const forcePoll = useCallback(() => {
    if (!isActiveRef.current) return;
    
    console.log('[POLLING] Forçando execução imediata');
    executePoll();
  }, [executePoll]);

  // Iniciar/parar baseado no estado enabled
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    isActive: isActiveRef.current,
    startPolling,
    stopPolling,
    pausePolling,
    resumePolling,
    forcePoll,
    retryCount: retryCountRef.current
  };
};

export default usePolling;
