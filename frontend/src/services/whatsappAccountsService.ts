import { apiFetch } from '../utilities/apiFetch';

export type WhatsappAccount = {
  id: string;
  phone: string;
  agent_name: string;
  connection_type: string; // 'whatsapp_business', 'api_oficial', etc
  instance_name?: string;
  status?: string;
  [key: string]: any;
};

/**
 * Busca as contas de WhatsApp do usuário autenticado
 */
export async function listWhatsappAccounts(): Promise<WhatsappAccount[]> {
  const response = await apiFetch('/api/whatsapp-credentials/');
  if (!response.success) throw new Error(response.message || 'Erro ao buscar contas de WhatsApp');
  return response.data as WhatsappAccount[];
} 