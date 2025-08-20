import { useReducer, useCallback, useMemo } from 'react';

// Tipos de ações para o reducer
const ACTIONS = {
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE_STATUS: 'UPDATE_MESSAGE_STATUS',
  SET_CONTACTS: 'SET_CONTACTS',
  SET_CURRENT_CONTACT: 'SET_CURRENT_CONTACT',
  SET_LOADING: 'SET_LOADING',
  SET_PAGINATION: 'SET_PAGINATION',
  SET_UNREAD_COUNT: 'SET_UNREAD_COUNT',
  SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
  RESET_CHAT: 'RESET_CHAT'
};

// Estado inicial otimizado
const initialState = {
  // Mensagens
  messages: [],
  lastMessageId: null,
  
  // Contatos
  contacts: [],
  currentContact: null,
  searchQuery: '',
  
  // Estados de loading
  loading: {
    initialLoad: false,
    syncing: false,
    allowInfiniteScroll: false,
    isLoadingMoreMessages: false
  },
  
  // Paginação
  pagination: {
    messagesPage: 1,
    hasMoreMessages: true,
    contactsPage: 1,
    hasMoreContacts: true
  },
  
  // Contadores
  unreadCount: 0,
  
  // Timestamps
  lastStatusUpdate: '1970-01-01T00:00:00Z',
  lastSync: null
};

// Função reducer otimizada
const chatReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_MESSAGES:
      return {
        ...state,
        messages: action.payload,
        lastMessageId: action.payload.length > 0 ? action.payload[action.payload.length - 1].id : null
      };
      
    case ACTIONS.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload],
        lastMessageId: action.payload.id
      };
      
    case ACTIONS.UPDATE_MESSAGE_STATUS:
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id 
            ? { ...msg, status: action.payload.status }
            : msg
        )
      };
      
    case ACTIONS.SET_CONTACTS:
      return {
        ...state,
        contacts: action.payload
      };
      
    case ACTIONS.SET_CURRENT_CONTACT:
      return {
        ...state,
        currentContact: action.payload,
        // Resetar mensagens quando mudar de contato
        messages: [],
        lastMessageId: null,
        unreadCount: 0,
        pagination: {
          ...state.pagination,
          messagesPage: 1,
          hasMoreMessages: true
        }
      };
      
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          ...action.payload
        }
      };
      
    case ACTIONS.SET_PAGINATION:
      return {
        ...state,
        pagination: {
          ...state.pagination,
          ...action.payload
        }
      };
      
    case ACTIONS.SET_UNREAD_COUNT:
      return {
        ...state,
        unreadCount: action.payload
      };
      
    case ACTIONS.SET_SEARCH_QUERY:
      return {
        ...state,
        searchQuery: action.payload
      };
      
    case ACTIONS.RESET_CHAT:
      return {
        ...initialState,
        contacts: state.contacts, // Manter contatos
        lastSync: state.lastSync // Manter último sync
      };
      
    default:
      return state;
  }
};

// Hook customizado otimizado para gerenciar estado do chat
export const useChatState = () => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Ações otimizadas com useCallback
  const setMessages = useCallback((messages) => {
    dispatch({ type: ACTIONS.SET_MESSAGES, payload: messages });
  }, []);

  const addMessage = useCallback((message) => {
    dispatch({ type: ACTIONS.ADD_MESSAGE, payload: message });
  }, []);

  const updateMessageStatus = useCallback((messageId, status) => {
    dispatch({ 
      type: ACTIONS.UPDATE_MESSAGE_STATUS, 
      payload: { id: messageId, status } 
    });
  }, []);

  const setContacts = useCallback((contacts) => {
    dispatch({ type: ACTIONS.SET_CONTACTS, payload: contacts });
  }, []);

  const setCurrentContact = useCallback((contact) => {
    dispatch({ type: ACTIONS.SET_CURRENT_CONTACT, payload: contact });
  }, []);

  const setLoading = useCallback((key, value) => {
    dispatch({ 
      type: ACTIONS.SET_LOADING, 
      payload: { [key]: value } 
    });
  }, []);

  const setPagination = useCallback((key, value) => {
    dispatch({ 
      type: ACTIONS.SET_PAGINATION, 
      payload: { [key]: value } 
    });
  }, []);

  const setUnreadCount = useCallback((count) => {
    dispatch({ type: ACTIONS.SET_UNREAD_COUNT, payload: count });
  }, []);

  const setSearchQuery = useCallback((query) => {
    dispatch({ type: ACTIONS.SET_SEARCH_QUERY, payload: query });
  }, []);

  const resetChat = useCallback(() => {
    dispatch({ type: ACTIONS.RESET_CHAT });
  }, []);

  // Estados derivados otimizados com useMemo
  const isInitialLoad = useMemo(() => state.loading.initialLoad, [state.loading.initialLoad]);
  const isSyncing = useMemo(() => state.loading.syncing, [state.loading.syncing]);
  const allowInfiniteScroll = useMemo(() => state.loading.allowInfiniteScroll, [state.loading.allowInfiniteScroll]);
  const isLoadingMoreMessages = useMemo(() => state.loading.isLoadingMoreMessages, [state.loading.isLoadingMoreMessages]);

  const messagesPage = useMemo(() => state.pagination.messagesPage, [state.pagination.messagesPage]);
  const hasMoreMessages = useMemo(() => state.pagination.hasMoreMessages, [state.pagination.hasMoreMessages]);
  const contactsPage = useMemo(() => state.pagination.contactsPage, [state.pagination.contactsPage]);
  const hasMoreContacts = useMemo(() => state.pagination.hasMoreContacts, [state.pagination.hasMoreContacts]);

  const hasMessages = useMemo(() => state.messages.length > 0, [state.messages.length]);
  const hasContacts = useMemo(() => state.contacts.length > 0, [state.contacts.length]);
  const hasCurrentContact = useMemo(() => !!state.currentContact, [state.currentContact]);

  // Função para atualizar múltiplos estados de loading
  const setMultipleLoading = useCallback((loadingStates) => {
    dispatch({ 
      type: ACTIONS.SET_LOADING, 
      payload: loadingStates 
    });
  }, []);

  // Função para atualizar múltiplos estados de paginação
  const setMultiplePagination = useCallback((paginationStates) => {
    dispatch({ 
      type: ACTIONS.SET_PAGINATION, 
      payload: paginationStates 
    });
  }, []);

  return {
    // Estado
    ...state,
    
    // Estados derivados
    isInitialLoad,
    isSyncing,
    allowInfiniteScroll,
    isLoadingMoreMessages,
    messagesPage,
    hasMoreMessages,
    contactsPage,
    hasMoreContacts,
    hasMessages,
    hasContacts,
    hasCurrentContact,
    
    // Ações
    setMessages,
    addMessage,
    updateMessageStatus,
    setContacts,
    setCurrentContact,
    setLoading,
    setPagination,
    setUnreadCount,
    setSearchQuery,
    resetChat,
    setMultipleLoading,
    setMultiplePagination
  };
};

export default useChatState;
