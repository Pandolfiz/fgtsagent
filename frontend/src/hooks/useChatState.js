import { useReducer, useCallback, useMemo } from 'react';

/**
 * Reducer para gerenciar o estado do chat
 * Centraliza todos os estados em um local
 */
const chatReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CURRENT_CONTACT':
      return {
        ...state,
        currentContact: action.payload
      };
    
    case 'SET_CURRENT_USER':
      return {
        ...state,
        currentUser: action.payload
      };
    
    case 'SET_INSTANCES':
      return {
        ...state,
        instances: action.payload
      };
    
    case 'SET_SELECTED_INSTANCE':
      return {
        ...state,
        selectedInstanceId: action.payload
      };
    
    case 'SET_AGENT_MODE':
      return {
        ...state,
        agentMode: action.payload
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.type]: action.payload.value
        }
      };
    
    case 'SET_SEARCH_TERM':
      return {
        ...state,
        searchTerm: action.payload
      };
    
    case 'SET_CONTACT_PANEL':
      return {
        ...state,
        isContactPanelOpen: action.payload.isOpen,
        selectedContactForPanel: action.payload.contact
      };
    
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload
      };
    
    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        isOnline: action.payload
      };
    
    case 'SET_SCREEN_SIZE':
      return {
        ...state,
        screenWidth: action.payload.width,
        isMobileView: action.payload.width < 768
      };
    
    case 'SET_DROPDOWN_OPEN':
      return {
        ...state,
        dropdownOpen: action.payload
      };
    
    case 'RESET_CHAT':
      return {
        ...state,
        currentContact: null,
        error: null,
        isContactPanelOpen: false,
        selectedContactForPanel: null
      };
    
    default:
      return state;
  }
};

/**
 * Estado inicial do chat
 */
const initialState = {
  // Dados principais
  currentContact: null,
  currentUser: null,
  instances: [],
  selectedInstanceId: 'all',
  agentMode: 'full',
  
  // Estados de UI
  isMobileView: window.innerWidth < 768,
  screenWidth: window.innerWidth,
  dropdownOpen: false,
  
  // Estados de painel lateral
  isContactPanelOpen: false,
  selectedContactForPanel: null,
  
  // Estados de loading
  loading: {
    contacts: false,
    messages: false,
    instances: false,
    syncing: false,
    moreContacts: false,
    moreMessages: false,
    initialLoad: false
  },
  
  // Estados de erro e status
  error: null,
  connectionStatus: null,
  isOnline: navigator.onLine,
  
  // Estados de busca
  searchTerm: ''
};

/**
 * Hook customizado para gerenciar o estado do chat
 */
export const useChatState = () => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Actions
  const setCurrentContact = useCallback((contact) => {
    dispatch({ type: 'SET_CURRENT_CONTACT', payload: contact });
  }, []);

  const setCurrentUser = useCallback((user) => {
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
  }, []);

  const setInstances = useCallback((instances) => {
    dispatch({ type: 'SET_INSTANCES', payload: instances });
  }, []);

  const setSelectedInstance = useCallback((instanceId) => {
    dispatch({ type: 'SET_SELECTED_INSTANCE', payload: instanceId });
  }, []);

  const setAgentMode = useCallback((mode) => {
    dispatch({ type: 'SET_AGENT_MODE', payload: mode });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const setLoading = useCallback((type, value) => {
    dispatch({ type: 'SET_LOADING', payload: { type, value } });
  }, []);

  const setSearchTerm = useCallback((term) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term });
  }, []);

  const setContactPanel = useCallback((isOpen, contact = null) => {
    dispatch({ 
      type: 'SET_CONTACT_PANEL', 
      payload: { isOpen, contact } 
    });
  }, []);

  const setConnectionStatus = useCallback((status) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
  }, []);

  const setOnlineStatus = useCallback((isOnline) => {
    dispatch({ type: 'SET_ONLINE_STATUS', payload: isOnline });
  }, []);

  const setScreenSize = useCallback((width) => {
    dispatch({ 
      type: 'SET_SCREEN_SIZE', 
      payload: { width } 
    });
  }, []);

  const setDropdownOpen = useCallback((isOpen) => {
    dispatch({ type: 'SET_DROPDOWN_OPEN', payload: isOpen });
  }, []);

  const resetChat = useCallback(() => {
    dispatch({ type: 'RESET_CHAT' });
  }, []);

  // ✅ CORRIGIDO: Memoizar o objeto actions para evitar re-renders desnecessários
  const actions = useMemo(() => ({
    setCurrentContact,
    setCurrentUser,
    setInstances,
    setSelectedInstance,
    setAgentMode,
    setError,
    clearError,
    setLoading,
    setSearchTerm,
    setContactPanel,
    setConnectionStatus,
    setOnlineStatus,
    setScreenSize,
    setDropdownOpen,
    resetChat
  }), [
    setCurrentContact,
    setCurrentUser,
    setInstances,
    setSelectedInstance,
    setAgentMode,
    setError,
    clearError,
    setLoading,
    setSearchTerm,
    setContactPanel,
    setConnectionStatus,
    setOnlineStatus,
    setScreenSize,
    setDropdownOpen,
    resetChat
  ]);

  return {
    state,
    actions
  };
};