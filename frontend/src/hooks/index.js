// Hooks customizados otimizados para performance
export { default as useChatState } from './useChatState';
export { default as useScrollManager } from './useScrollManager';
export { default as usePolling } from './usePolling';
export { default as useScrollToBottom } from './useScrollToBottom';
export { default as useLoadingStates } from './useLoadingStates';

// Hooks da Fase 2: Funcionalidades Avançadas
export { default as useLazyLoading } from './useLazyLoading';
export { default as useNotifications } from './useNotifications';

// Hooks da Fase 3: Otimizações Avançadas
export { default as useVirtualScrolling } from './useVirtualScrolling';
export { default as useMessageSearch } from './useMessageSearch';
export { default as usePWA } from './usePWA';

// Hooks da Fase 4: Otimizações Finais
export { default as useCodeSplitting } from './useCodeSplitting';
export { default as useAdvancedFilters } from './useAdvancedFilters';

// Re-exportar todos os hooks para uso direto
export * from './useChatState';
export * from './useScrollManager';
export * from './usePolling';
export * from './useScrollToBottom';
export * from './useLoadingStates';
export * from './useLazyLoading';
export * from './useNotifications';
export * from './useVirtualScrolling';
export * from './useMessageSearch';
export * from './usePWA';
export * from './useCodeSplitting';
export * from './useAdvancedFilters';
