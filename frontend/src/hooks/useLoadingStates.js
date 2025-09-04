import { useState, useCallback, useMemo } from 'react';

/**
 * Hook customizado para gerenciar estados de loading de forma unificada
 * Elimina conflitos entre múltiplos estados de loading
 */
export const useLoadingStates = (initialStates = {}) => {
  const [loadingStates, setLoadingStates] = useState({
    // Estados principais
    initial: false,
    syncing: false,
    updating: false,
    
    // Estados específicos
    contacts: false,
    messages: false,
    instances: false,
    
    // Estados de paginação
    moreContacts: false,
    moreMessages: false,
    
    // Estados de UI
    sending: false,
    searching: false,
    
    // Estados de controle
    allowInfiniteScroll: false,
    isInitialLoad: false,
    
    ...initialStates
  });

  // Função para definir um estado específico
  const setLoading = useCallback((key, value) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Função para definir múltiplos estados
  const setMultipleLoading = useCallback((states) => {
    setLoadingStates(prev => ({
      ...prev,
      ...states
    }));
  }, []);

  // Função para resetar todos os estados
  const resetLoading = useCallback(() => {
    setLoadingStates(prev => {
      const resetStates = {};
      Object.keys(prev).forEach(key => {
        resetStates[key] = false;
      });
      return resetStates;
    });
  }, []);

  // Função para resetar estados específicos
  const resetSpecificLoading = useCallback((keys) => {
    setLoadingStates(prev => {
      const resetStates = {};
      keys.forEach(key => {
        resetStates[key] = false;
      });
      return { ...prev, ...resetStates };
    });
  }, []);

  // Estados derivados computados
  const derivedStates = useMemo(() => {
    const isLoading = loadingStates.initial || 
                     loadingStates.syncing || 
                     loadingStates.updating ||
                     loadingStates.contacts || 
                     loadingStates.messages || 
                     loadingStates.instances;

    const isSyncing = loadingStates.syncing;
    const isUpdating = loadingStates.updating;
    const isInitialLoad = loadingStates.isInitialLoad;
    const allowInfiniteScroll = loadingStates.allowInfiniteScroll;

    const isLoadingMore = loadingStates.moreContacts || loadingStates.moreMessages;
    const isLoadingData = loadingStates.contacts || loadingStates.messages || loadingStates.instances;
    const isLoadingUI = loadingStates.sending || loadingStates.searching;

    return {
      isLoading,
      isSyncing,
      isUpdating,
      isInitialLoad,
      allowInfiniteScroll,
      isLoadingMore,
      isLoadingData,
      isLoadingUI
    };
  }, [loadingStates]);

  // Função para executar operação com loading
  const withLoading = useCallback(async (key, operation) => {
    try {
      setLoading(key, true);
      const result = await operation();
      return result;
    } finally {
      setLoading(key, false);
    }
  }, [setLoading]);

  // Função para executar operação com múltiplos loadings
  const withMultipleLoading = useCallback(async (states, operation) => {
    try {
      setMultipleLoading(states);
      const result = await operation();
      return result;
    } finally {
      // Resetar apenas os estados que foram definidos
      const resetStates = {};
      Object.keys(states).forEach(key => {
        resetStates[key] = false;
      });
      setMultipleLoading(resetStates);
    }
  }, [setMultipleLoading]);

  // Função para verificar se pode executar operação
  const canExecute = useCallback((excludeKeys = []) => {
    const relevantStates = Object.entries(loadingStates).filter(
      ([key, value]) => !excludeKeys.includes(key) && value
    );
    return relevantStates.length === 0;
  }, [loadingStates]);

  // Função para obter resumo dos estados
  const getLoadingSummary = useCallback(() => {
    const activeStates = Object.entries(loadingStates)
      .filter(([, value]) => value)
      .map(([key]) => key);
    
    return {
      activeStates,
      count: activeStates.length,
      hasActiveStates: activeStates.length > 0
    };
  }, [loadingStates]);

  return {
    // Estados individuais
    ...loadingStates,
    
    // Estados derivados
    ...derivedStates,
    
    // Funções de controle
    setLoading,
    setMultipleLoading,
    resetLoading,
    resetSpecificLoading,
    withLoading,
    withMultipleLoading,
    canExecute,
    getLoadingSummary
  };
};

export default useLoadingStates;
