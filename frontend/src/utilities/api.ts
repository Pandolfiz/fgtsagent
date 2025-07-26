import { apiFetch } from './apiFetch';

// Base URLs para as diferentes APIs
const API_URL = '/api';

// Tipos base para resposta da API
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// Tipos para as credenciais da Evolution
export interface EvolutionCredential {
  id: string;
  client_id: string;
  phone: string;
  instance_name: string;
  partner_secret: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  agent_name?: string;
  status?: string;
  connection_type?: 'whatsapp_business' | 'ads';
}

// Tipos para credenciais de parceiros
export interface PartnerCredential {
  id: string;
  name: string;
  api_key?: string;
  partner_type: 'v8' | 'caixa' | 'governo' | 'outro';
  auth_type: 'apikey' | 'oauth';
  oauth_config?: {
    grant_type: string;
    username?: string;
    password?: string;
    audience?: string;
    scope?: string;
    client_id?: string;
  };
  status: 'active' | 'inactive' | 'pending' | 'error';
  user_id: string;
  created_at: string;
  updated_at: string;
}

// API para Partner Credentials
export const partnerCredentialsApi = {
  // Listar todas as credenciais
  getAll: async (): Promise<ApiResponse<PartnerCredential[]>> => {
    const response = await apiFetch(`${API_URL}/partner-credentials`);
    return response.json();
  },

  // Obter credencial por ID
  getById: async (id: string): Promise<ApiResponse<PartnerCredential>> => {
    const response = await apiFetch(`${API_URL}/partner-credentials/${id}`);
    return response.json();
  },

  // Criar nova credencial
  create: async (data: Omit<PartnerCredential, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<PartnerCredential>> => {
    const response = await apiFetch(`${API_URL}/partner-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Atualizar credencial existente
  update: async (id: string, data: Partial<Omit<PartnerCredential, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<PartnerCredential>> => {
    const response = await apiFetch(`${API_URL}/partner-credentials/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Excluir credencial
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiFetch(`${API_URL}/partner-credentials/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // Testar conexão com parceiro
  testConnection: async (id: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    const response = await apiFetch(`${API_URL}/partner-credentials/${id}/test-connection`, {
      method: 'POST'
    });
    return response.json();
  }
};

// API para Evolution Credentials
export const evolutionCredentialsApi = {
  // Listar todas as credenciais
  getAll: async (): Promise<ApiResponse<EvolutionCredential[]>> => {
    const response = await apiFetch(`${API_URL}/whatsapp-credentials`);
    return response.json();
  },

  // Obter credencial por ID
  getById: async (id: string): Promise<ApiResponse<EvolutionCredential>> => {
    const response = await apiFetch(`${API_URL}/whatsapp-credentials/${id}`);
    return response.json();
  },

  // Criar nova credencial
  create: async (data: Partial<EvolutionCredential>): Promise<ApiResponse<EvolutionCredential>> => {
    const response = await apiFetch(`${API_URL}/whatsapp-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Atualizar credencial existente
  update: async (id: string, data: Partial<EvolutionCredential>): Promise<ApiResponse<EvolutionCredential>> => {
    const response = await apiFetch(`${API_URL}/whatsapp-credentials/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Excluir credencial
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiFetch(`${API_URL}/whatsapp-credentials/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // Configurar instância na Evolution API
  setupInstance: async (id: string): Promise<ApiResponse<EvolutionCredential>> => {
    const response = await apiFetch(`${API_URL}/whatsapp-credentials/${id}/setup`, {
      method: 'POST'
    });
    return response.json();
  },

  // Reiniciar instância na Evolution API
  restartInstance: async (id: string): Promise<ApiResponse<any>> => {
    const response = await apiFetch(`${API_URL}/whatsapp-credentials/${id}/restart`, {
      method: 'POST'
    });
    return response.json();
  },

  // Desconectar instância na Evolution API
  disconnect: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiFetch(`${API_URL}/whatsapp-credentials/${id}/disconnect`, {
      method: 'POST'
    });
    return response.json();
  },

  // Obter QR Code para reconectar instância
  getQrCode: async (id: string): Promise<ApiResponse<{ base64?: string; code?: string; pairingCode?: string }>> => {
    const response = await apiFetch(`${API_URL}/whatsapp-credentials/${id}/qrcode`, {
      method: 'GET'
    });
    return response.json();
  },

  // Verificar status de um número
  checkStatus: async (id: string): Promise<ApiResponse<{ credential_id: string; phone: string; wpp_number_id: string; status: string; meta_data: any }>> => {
    const response = await apiFetch(`${API_URL}/whatsapp-credentials/${id}/check-status`);
    return response.json();
  },

  // Verificar status de todos os números
  checkAllStatus: async (): Promise<ApiResponse<Array<{ credential_id: string; phone: string; wpp_number_id: string; status: string; success: boolean; error?: string }>>> => {
    const response = await apiFetch(`${API_URL}/whatsapp-credentials/check-all-status`);
    return response.json();
  },

    // Gerenciamento de números na API oficial da Meta
    addPhoneNumber: async (data: {
      phoneNumber: string;
      businessAccountId: string;
      accessToken: string;
    }) => {
      const response = await apiFetch('/api/whatsapp-credentials/add-phone-number', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },

    checkPhoneAvailability: async (data: {
      phoneNumber: string;
      accessToken: string;
    }) => {
      const response = await apiFetch('/api/whatsapp-credentials/check-phone-availability', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },

    listPhoneNumbers: async (data: {
      businessAccountId: string;
      accessToken: string;
    }) => {
      const response = await apiFetch('/api/whatsapp-credentials/list-phone-numbers', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },

    removePhoneNumber: async (data: {
      phoneNumberId: string;
      accessToken: string;
    }) => {
      const response = await apiFetch('/api/whatsapp-credentials/remove-phone-number', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    }
};

// API para usuários
export const userApi = {
  // Obter usuário atual
  getCurrentUser: async (): Promise<ApiResponse<{ id: string; full_name?: string; email: string; [key: string]: any }>> => {
    const response = await apiFetch(`${API_URL}/auth/me`);
    const data = await response.json();
    // O backend retorna { success: true, user: {...} } mas a interface espera { success: true, data: {...} }
    // Vamos ajustar a estrutura para manter compatibilidade
    if (data.success && data.user) {
      return {
        success: true,
        data: data.user,
        message: data.message
      };
    }
    return data;
  }
};

// Exportar todas as APIs
export const api = {
  evolution: evolutionCredentialsApi,
  partnerCredentials: partnerCredentialsApi,
  user: userApi
};

export default api; 