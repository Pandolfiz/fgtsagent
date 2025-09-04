import React, { useState, useCallback, useMemo } from 'react';
import { FaFilter, FaCalendarAlt, FaUser, FaMessage, FaTimes, FaSearch } from 'react-icons/fa';

/**
 * Componente de filtros avançados para mensagens e contatos
 */
const AdvancedFilters = ({ 
  onFiltersChange, 
  initialFilters = {},
  availableUsers = [],
  messageTypes = ['text', 'image', 'video', 'audio', 'document'],
  className = ''
}) => {
  const [filters, setFilters] = useState({
    dateRange: {
      start: '',
      end: ''
    },
    users: [],
    messageTypes: [],
    searchTerm: '',
    hasMedia: null,
    isRead: null,
    ...initialFilters
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Opções de filtros rápidos
  const quickFilters = [
    { key: 'today', label: 'Hoje', getDateRange: () => {
      const today = new Date();
      return {
        start: today.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      };
    }},
    { key: 'yesterday', label: 'Ontem', getDateRange: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday.toISOString().split('T')[0],
        end: yesterday.toISOString().split('T')[0]
      };
    }},
    { key: 'week', label: 'Esta semana', getDateRange: () => {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return {
        start: weekStart.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      };
    }},
    { key: 'month', label: 'Este mês', getDateRange: () => {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: monthStart.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      };
    }}
  ];

  // Aplicar filtro rápido
  const applyQuickFilter = useCallback((quickFilter) => {
    const dateRange = quickFilter.getDateRange();
    const newFilters = {
      ...filters,
      dateRange
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  // Atualizar filtros
  const updateFilters = useCallback((updates) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  // Limpar todos os filtros
  const clearFilters = useCallback(() => {
    const clearedFilters = {
      dateRange: { start: '', end: '' },
      users: [],
      messageTypes: [],
      searchTerm: '',
      hasMedia: null,
      isRead: null
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  }, [onFiltersChange]);

  // Toggle de usuário
  const toggleUser = useCallback((userId) => {
    const newUsers = filters.users.includes(userId)
      ? filters.users.filter(id => id !== userId)
      : [...filters.users, userId];
    updateFilters({ users: newUsers });
  }, [filters.users, updateFilters]);

  // Toggle de tipo de mensagem
  const toggleMessageType = useCallback((type) => {
    const newTypes = filters.messageTypes.includes(type)
      ? filters.messageTypes.filter(t => t !== type)
      : [...filters.messageTypes, type];
    updateFilters({ messageTypes: newTypes });
  }, [filters.messageTypes, updateFilters]);

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

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header dos filtros */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaFilter className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">Filtros Avançados</h3>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
              >
                <FaTimes className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? 'Recolher' : 'Expandir'}
            </button>
          </div>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          {quickFilters.map(filter => (
            <button
              key={filter.key}
              onClick={() => applyQuickFilter(filter)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros expandidos */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Busca por texto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaSearch className="w-4 h-4 inline mr-1" />
              Buscar texto
            </label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => updateFilters({ searchTerm: e.target.value })}
              placeholder="Digite para buscar em mensagens..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaCalendarAlt className="w-4 h-4 inline mr-1" />
              Período
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => updateFilters({ 
                  dateRange: { ...filters.dateRange, start: e.target.value }
                })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => updateFilters({ 
                  dateRange: { ...filters.dateRange, end: e.target.value }
                })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro por usuários */}
          {availableUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaUser className="w-4 h-4 inline mr-1" />
                Usuários
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {availableUsers.map(user => (
                  <label key={user.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.users.includes(user.id)}
                      onChange={() => toggleUser(user.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{user.name || user.email}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Filtro por tipo de mensagem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaMessage className="w-4 h-4 inline mr-1" />
              Tipo de mensagem
            </label>
            <div className="grid grid-cols-2 gap-2">
              {messageTypes.map(type => (
                <label key={type} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.messageTypes.includes(type)}
                    onChange={() => toggleMessageType(type)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filtros booleanos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contém mídia
              </label>
              <select
                value={filters.hasMedia === null ? '' : filters.hasMedia.toString()}
                onChange={(e) => updateFilters({ 
                  hasMedia: e.target.value === '' ? null : e.target.value === 'true'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status de leitura
              </label>
              <select
                value={filters.isRead === null ? '' : filters.isRead.toString()}
                onChange={(e) => updateFilters({ 
                  isRead: e.target.value === '' ? null : e.target.value === 'true'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="true">Lidas</option>
                <option value="false">Não lidas</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilters;
