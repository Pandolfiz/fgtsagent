/**
 * Hook para controle de mensagens template da Meta API
 */
import { useState, useEffect, useCallback } from 'react';

export const useMetaTemplateControl = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Função para obter token do localStorage
  const getToken = useCallback(async () => {
    try {
      const authData = localStorage.getItem('supabase.auth.token');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.access_token || parsed;
      }
      return null;
    } catch (error) {
      console.error('Erro ao obter token:', error);
      return null;
    }
  }, []);

  /**
   * Verifica se uma instância é da Meta API
   */
  const checkIsMetaAPI = useCallback(async (instanceId) => {
    if (!instanceId) return false;

    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      const response = await fetch(`/api/meta-template/is-meta-api?instanceId=${instanceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao verificar instância');
      }

      return data.data.isMetaAPI;
    } catch (err) {
      console.error('Erro ao verificar se é Meta API:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  /**
   * Verifica o status de envio de mensagem (livre vs template)
   */
  const checkSendStatus = useCallback(async (conversationId, instanceId) => {
    if (!conversationId || !instanceId) {
      return {
        canSendFreeMessage: true,
        requiresTemplate: false,
        reason: 'missing_params',
        lastUserMessage: null,
        hoursSinceLastMessage: null
      };
    }

    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      const response = await fetch(
        `/api/meta-template/check-send-status?conversationId=${conversationId}&instanceId=${instanceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao verificar status de envio');
      }

      return data.data;
    } catch (err) {
      console.error('Erro ao verificar status de envio:', err);
      setError(err.message);
      return {
        canSendFreeMessage: false,
        requiresTemplate: true,
        reason: 'error',
        error: err.message,
        lastUserMessage: null,
        hoursSinceLastMessage: null
      };
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  /**
   * Busca templates aprovados para uma instância
   */
  const getApprovedTemplates = useCallback(async (instanceId) => {
    if (!instanceId) return [];

    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      console.log('[META_TEMPLATE] Buscando templates para instanceId:', instanceId);
      console.log('[META_TEMPLATE] Token disponível:', !!token);
      
      const response = await fetch(`/api/meta-template/approved-templates?instanceId=${instanceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[META_TEMPLATE] Resposta da API:', response.status, response.statusText);

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar templates');
      }

      return data.data.templates || [];
    } catch (err) {
      console.error('Erro ao buscar templates aprovados:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  return {
    loading,
    error,
    checkIsMetaAPI,
    checkSendStatus,
    getApprovedTemplates
  };
};
