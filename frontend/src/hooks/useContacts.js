import { useState, useEffect, useCallback } from 'react';

/**
 * Hook customizado para gerenciar contatos do chat
 * @param {Object} params - Parâmetros do hook
 * @param {Object} params.currentUser - Usuário atual
 * @param {string} params.selectedInstanceId - ID da instância selecionada
 * @returns {Object} - Estado e funções para gerenciar contatos
 */
export const useContacts = ({ currentUser, selectedInstanceId, searchTerm = '' }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    hasMore: true,
    total: 0
  });

  /**
   * Busca contatos da API
   * @param {number} page - Página a ser carregada
   * @param {boolean} reset - Se deve resetar a lista
   */
  const fetchContacts = useCallback(async (page = 1, reset = true) => {
    if (!currentUser?.id) {
      console.log('[CONTACTS] ⚠️ Usuário não autenticado, pulando busca de contatos');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`[CONTACTS] 📞 Carregando contatos: {instanceId: '${selectedInstanceId}', page: ${page}, reset: ${reset}}`);

      // Construir URL com parâmetros
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      });

      if (selectedInstanceId && selectedInstanceId !== 'all') {
        params.append('instance', selectedInstanceId);
      }

      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const url = `/api/contacts?${params.toString()}`;
      console.log(`[CONTACTS] 🌐 Fazendo requisição para: ${url}`);

      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[CONTACTS] 📊 Resposta da API:`, data);

      if (!data.success) {
        throw new Error(data.message || 'Erro ao buscar contatos');
      }

      const newContacts = data.contacts || [];
      const newPagination = data.pagination || {};

      if (reset) {
        setContacts(newContacts);
      } else {
        // ✅ CORREÇÃO: Filtrar duplicatas baseado em remote_jid
        setContacts(prev => {
          const existingRemoteJids = new Set(prev.map(contact => contact.remote_jid));
          const uniqueNewContacts = newContacts.filter(contact => 
            !existingRemoteJids.has(contact.remote_jid)
          );
          
          console.log(`[CONTACTS] 🔍 Filtrados ${newContacts.length - uniqueNewContacts.length} contatos duplicados`);
          
          return [...prev, ...uniqueNewContacts];
        });
      }

      setPagination(prev => ({
        ...prev,
        page: newPagination.page || page,
        hasMore: newPagination.hasMore || false,
        total: newPagination.total || 0
      }));

      console.log(`[CONTACTS] ✅ ${newContacts.length} contatos carregados (página ${page})`);

    } catch (err) {
      console.error('[CONTACTS] ❌ Erro ao buscar contatos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, selectedInstanceId, searchTerm, pagination.limit]);

  /**
   * Carrega mais contatos (scroll infinito)
   */
  const loadMoreContacts = useCallback(() => {
    if (!loading && pagination.hasMore) {
      console.log(`[CONTACTS] 📄 Carregando mais contatos (página ${pagination.page + 1})`);
      fetchContacts(pagination.page + 1, false);
    }
  }, [loading, pagination.hasMore, pagination.page, fetchContacts]);

  /**
   * Sincroniza contatos (refresh)
   */
  const syncContacts = useCallback(() => {
    console.log('[CONTACTS] 🔄 Sincronizando contatos...');
    fetchContacts(1, true);
  }, [fetchContacts]);

  /**
   * Atualiza um contato específico na lista
   * @param {string} contactId - ID do contato
   * @param {Object} updates - Atualizações a serem aplicadas
   */
  const updateContact = useCallback((contactId, updates) => {
    setContacts(prev => prev.map(contact => 
      contact.id === contactId 
        ? { ...contact, ...updates }
        : contact
    ));
  }, []);

  /**
   * Filtra contatos por termo de busca
   * @param {string} searchTerm - Termo de busca
   */
  const filterContacts = useCallback((searchTerm) => {
    if (!searchTerm.trim()) {
      return contacts;
    }

    const term = searchTerm.toLowerCase();
    return contacts.filter(contact => 
      contact.name?.toLowerCase().includes(term) ||
      contact.phone?.includes(term)
    );
  }, [contacts]);

  /**
   * Limpa a lista de contatos
   */
  const clearContacts = useCallback(() => {
    setContacts([]);
    setPagination(prev => ({
      ...prev,
      page: 1,
      hasMore: true,
      total: 0
    }));
  }, []);

  /**
   * Reseta a paginação
   */
  const resetPagination = useCallback(() => {
    setPagination(prev => ({
      ...prev,
      page: 1,
      hasMore: true
    }));
  }, []);

  // Efeito para carregar contatos quando usuário, instância ou busca mudam
  useEffect(() => {
    if (currentUser?.id) {
      console.log(`[CONTACTS] 🔄 Parâmetros mudaram, recarregando contatos: {instanceId: '${selectedInstanceId}', searchTerm: '${searchTerm}'}`);
      fetchContacts(1, true);
    }
  }, [currentUser?.id, selectedInstanceId, searchTerm, fetchContacts]);

  // ✅ POLLING AUTOMÁTICO: Agora gerenciado pelo useUnifiedPolling

  return {
    contacts,
    loading,
    error,
    pagination,
    fetchContacts,
    loadMoreContacts,
    syncContacts,
    updateContact,
    filterContacts,
    clearContacts,
    resetPagination
  };
};





