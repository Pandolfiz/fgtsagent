import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para gerenciar code splitting dinâmico
 * Permite carregar componentes sob demanda baseado em condições
 */
const useCodeSplitting = () => {
  const [loadedComponents, setLoadedComponents] = useState(new Set());
  const [loadingComponents, setLoadingComponents] = useState(new Set());
  const [componentCache, setComponentCache] = useState(new Map());

  // Função para carregar um componente dinamicamente
  const loadComponent = useCallback(async (componentName, importFunction) => {
    // Se já está carregando, aguardar
    if (loadingComponents.has(componentName)) {
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (loadedComponents.has(componentName)) {
            resolve(componentCache.get(componentName));
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }

    // Se já está carregado, retornar do cache
    if (loadedComponents.has(componentName)) {
      return componentCache.get(componentName);
    }

    // Marcar como carregando
    setLoadingComponents(prev => new Set(prev).add(componentName));

    try {
      // Carregar o componente
      const component = await importFunction();
      
      // Armazenar no cache
      setComponentCache(prev => new Map(prev).set(componentName, component));
      setLoadedComponents(prev => new Set(prev).add(componentName));
      
      return component;
    } catch (error) {
      console.error(`Erro ao carregar componente ${componentName}:`, error);
      throw error;
    } finally {
      // Remover da lista de carregando
      setLoadingComponents(prev => {
        const newSet = new Set(prev);
        newSet.delete(componentName);
        return newSet;
      });
    }
  }, [loadedComponents, loadingComponents, componentCache]);

  // Função para pré-carregar componentes
  const preloadComponent = useCallback(async (componentName, importFunction) => {
    if (!loadedComponents.has(componentName) && !loadingComponents.has(componentName)) {
      // Carregar em background sem bloquear a UI
      loadComponent(componentName, importFunction).catch(error => {
        console.warn(`Falha ao pré-carregar ${componentName}:`, error);
      });
    }
  }, [loadedComponents, loadingComponents, loadComponent]);

  // Função para verificar se um componente está carregado
  const isComponentLoaded = useCallback((componentName) => {
    return loadedComponents.has(componentName);
  }, [loadedComponents]);

  // Função para verificar se um componente está carregando
  const isComponentLoading = useCallback((componentName) => {
    return loadingComponents.has(componentName);
  }, [loadingComponents]);

  // Função para limpar cache de componentes não utilizados
  const clearUnusedComponents = useCallback((keepComponents = []) => {
    const keepSet = new Set(keepComponents);
    const newLoadedComponents = new Set();
    const newComponentCache = new Map();

    loadedComponents.forEach(componentName => {
      if (keepSet.has(componentName)) {
        newLoadedComponents.add(componentName);
        newComponentCache.set(componentName, componentCache.get(componentName));
      }
    });

    setLoadedComponents(newLoadedComponents);
    setComponentCache(newComponentCache);
  }, [loadedComponents, componentCache]);

  // Função para obter estatísticas de carregamento
  const getLoadingStats = useCallback(() => {
    return {
      loadedCount: loadedComponents.size,
      loadingCount: loadingComponents.size,
      cachedCount: componentCache.size,
      loadedComponents: Array.from(loadedComponents),
      loadingComponents: Array.from(loadingComponents)
    };
  }, [loadedComponents, loadingComponents, componentCache]);

  return {
    loadComponent,
    preloadComponent,
    isComponentLoaded,
    isComponentLoading,
    clearUnusedComponents,
    getLoadingStats
  };
};

export default useCodeSplitting;
