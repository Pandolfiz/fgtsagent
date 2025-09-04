import { useState, useCallback, useMemo } from 'react';

/**
 * Hook para gerenciar filtros avançados de mensagens e contatos
 */
const useAdvancedFilters = (initialData = [], options = {}) => {
  const {
    searchFields = ['content', 'name', 'email'],
    dateField = 'created_at',
    userField = 'user_id',
    messageTypeField = 'type',
    mediaField = 'has_media',
    readField = 'is_read'
  } = options;

  const [filters, setFilters] = useState({
    dateRange: { start: '', end: '' },
    users: [],
    messageTypes: [],
    searchTerm: '',
    hasMedia: null,
    isRead: null
  });

  // Função para aplicar filtros aos dados
  const applyFilters = useCallback((data) => {
    if (!data || !Array.isArray(data)) return [];

    return data.filter(item => {
      // Filtro por termo de busca
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const hasMatch = searchFields.some(field => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(searchLower);
        });
        if (!hasMatch) return false;
      }

      // Filtro por período
      if (filters.dateRange.start || filters.dateRange.end) {
        const itemDate = new Date(item[dateField]);
        if (filters.dateRange.start) {
          const startDate = new Date(filters.dateRange.start);
          if (itemDate < startDate) return false;
        }
        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end);
          endDate.setHours(23, 59, 59, 999); // Incluir todo o dia final
          if (itemDate > endDate) return false;
        }
      }

      // Filtro por usuários
      if (filters.users.length > 0) {
        if (!filters.users.includes(item[userField])) return false;
      }

      // Filtro por tipos de mensagem
      if (filters.messageTypes.length > 0) {
        if (!filters.messageTypes.includes(item[messageTypeField])) return false;
      }

      // Filtro por mídia
      if (filters.hasMedia !== null) {
        const hasMedia = Boolean(item[mediaField] || item.media || item.attachments);
        if (hasMedia !== filters.hasMedia) return false;
      }

      // Filtro por status de leitura
      if (filters.isRead !== null) {
        const isRead = Boolean(item[readField]);
        if (isRead !== filters.isRead) return false;
      }

      return true;
    });
  }, [filters, searchFields, dateField, userField, messageTypeField, mediaField, readField]);

  // Dados filtrados
  const filteredData = useMemo(() => {
    return applyFilters(initialData);
  }, [initialData, applyFilters]);

  // Atualizar filtros
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Limpar todos os filtros
  const clearFilters = useCallback(() => {
    setFilters({
      dateRange: { start: '', end: '' },
      users: [],
      messageTypes: [],
      searchTerm: '',
      hasMedia: null,
      isRead: null
    });
  }, []);

  // Aplicar filtro rápido por data
  const applyQuickDateFilter = useCallback((type) => {
    const today = new Date();
    let startDate = '';
    let endDate = '';

    switch (type) {
      case 'today':
        startDate = endDate = today.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = endDate = yesterday.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        startDate = weekStart.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = monthStart.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'last7days':
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 7);
        startDate = last7Days.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'last30days':
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 30);
        startDate = last30Days.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    updateFilters({
      dateRange: { start: startDate, end: endDate }
    });
  }, [updateFilters]);

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.users.length > 0) count++;
    if (filters.messageTypes.length > 0) count++;
    if (filters.searchTerm) count++;
    if (filters.hasMedia !== null) count++;
    if (filters.isRead !== null) count++;
    return count;
  }, [filters]);

  // Obter estatísticas dos dados filtrados
  const getFilterStats = useCallback(() => {
    const total = initialData.length;
    const filtered = filteredData.length;
    const percentage = total > 0 ? Math.round((filtered / total) * 100) : 0;

    return {
      total,
      filtered,
      percentage,
      hasFilters: activeFiltersCount > 0
    };
  }, [initialData.length, filteredData.length, activeFiltersCount]);

  // Obter opções únicas para filtros
  const getFilterOptions = useCallback(() => {
    const users = [...new Set(initialData.map(item => item[userField]).filter(Boolean))];
    const messageTypes = [...new Set(initialData.map(item => item[messageTypeField]).filter(Boolean))];
    
    return {
      users: users.map(id => ({
        id,
        name: `Usuário ${id}` // TODO: Buscar nome real do usuário
      })),
      messageTypes
    };
  }, [initialData, userField, messageTypeField]);

  // Exportar filtros para URL ou localStorage
  const exportFilters = useCallback(() => {
    return {
      filters,
      timestamp: new Date().toISOString()
    };
  }, [filters]);

  // Importar filtros de URL ou localStorage
  const importFilters = useCallback((importedData) => {
    if (importedData && importedData.filters) {
      setFilters(importedData.filters);
    }
  }, []);

  return {
    filters,
    filteredData,
    updateFilters,
    clearFilters,
    applyQuickDateFilter,
    activeFiltersCount,
    getFilterStats,
    getFilterOptions,
    exportFilters,
    importFilters
  };
};

export default useAdvancedFilters;
