import supabase from '../lib/supabaseClient';
import { PartnerType, AuthType } from '../types/partnerCredentials';

// Interface para credenciais de parceiros
export interface PartnerCredential {
  id: string;
  name: string;
  api_key?: string;
  partner_type: PartnerType;
  auth_type: AuthType;
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

// Interface para criar novas credenciais
export interface CreatePartnerCredentialData {
  name: string;
  api_key?: string;
  partner_type: PartnerType;
  auth_type: AuthType;
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
}

// Função de utilidade para obter o ID do usuário autenticado
async function getCurrentUserId(): Promise<string> {
  try {
    // Tentar obter da sessão
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id) {
      console.log('Usuário identificado via sessão:', session.user.id);
      return session.user.id;
    }
    
    // Tentar obter do usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user?.id) {
      console.log('Usuário identificado via getUser:', user.id);
      return user.id;
    }
    
    // Modo de desenvolvimento - usar um ID fixo para testes
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ MODO DE DESENVOLVIMENTO: Usando ID de usuário de teste');
      // Você pode configurar um ID de usuário de teste aqui ou como variável de ambiente
      return 'dev-user-id-temporario';
    }
    
    throw new Error('Usuário não autenticado');
  } catch (error) {
    console.error('Erro ao obter ID do usuário:', error);
    
    // Em desenvolvimento, permite continuar com ID de teste
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ MODO DE DESENVOLVIMENTO: Usando ID de usuário de teste após erro');
      return 'dev-user-id-temporario';
    }
    
    throw new Error('Usuário não autenticado');
  }
}

/** Lista todas as credenciais do usuário logado */
export async function listPartnerCredentials(): Promise<PartnerCredential[]> {
  try {
    const userId = await getCurrentUserId();
    
    console.log(`Buscando credenciais para userId: ${userId}`);
    
    const { data, error } = await supabase
      .from('partner_credentials')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro do Supabase ao buscar credenciais:', error);
      throw error;
    }
    
    console.log(`Encontradas ${data?.length || 0} credenciais`);
    
    // Se estiver em desenvolvimento e não houver dados, retornar mock
    if (process.env.NODE_ENV === 'development' && (!data || data.length === 0)) {
      console.warn('⚠️ MODO DE DESENVOLVIMENTO: Retornando dados mocados');
      return getMockCredentials(userId);
    }
    
    return data || [];
  } catch (error) {
    console.error('Erro ao listar credenciais:', error);
    
    // Em desenvolvimento, permite retornar dados mock em caso de erro
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ MODO DE DESENVOLVIMENTO: Retornando dados mocados após erro');
      return getMockCredentials('dev-user-id-temporario');
    }
    
    throw error;
  }
}

/** Obtém uma credencial específica do usuário */
export async function getPartnerCredentialById(id: string): Promise<PartnerCredential> {
  try {
    const userId = await getCurrentUserId();
  
    const { data, error } = await supabase
      .from('partner_credentials')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
  
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao obter credencial por ID:', error);
    
    // Em desenvolvimento, retornar dado mock
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ MODO DE DESENVOLVIMENTO: Retornando dado mocado para ID', id);
      const mockData = getMockCredentials('dev-user-id-temporario');
      const credential = mockData.find(c => c.id === id) || mockData[0];
      return credential;
    }
    
    throw error;
  }
}

/** Cria nova credencial de parceiro */
export async function createPartnerCredential(credential: Omit<CreatePartnerCredentialData, 'user_id'>): Promise<PartnerCredential> {
  try {
    const userId = await getCurrentUserId();
    
    const newCredential = {
      ...credential,
      user_id: userId
    };
    
    const { data, error } = await supabase
      .from('partner_credentials')
      .insert([newCredential])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar credencial:', error);
    
    // Em desenvolvimento, simular sucesso
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ MODO DE DESENVOLVIMENTO: Retornando dado simulado após criar');
      return {
        ...credential,
        id: Date.now().toString(),
        user_id: 'dev-user-id-temporario',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as PartnerCredential;
    }
    
    throw error;
  }
}

/** Atualiza credencial existente */
export async function updatePartnerCredential(id: string, updates: Partial<Omit<PartnerCredential, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<PartnerCredential> {
  try {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('partner_credentials')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar credencial:', error);
    
    // Em desenvolvimento, simular sucesso
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ MODO DE DESENVOLVIMENTO: Retornando dado simulado após atualizar');
      return {
        id,
        user_id: 'dev-user-id-temporario',
        name: updates.name || 'Credencial Atualizada',
        partner_type: updates.partner_type || 'v8',
        auth_type: updates.auth_type || 'oauth',
        oauth_config: updates.oauth_config,
        status: updates.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as PartnerCredential;
    }
    
    throw error;
  }
}

/** Deleta credencial de parceiro */
export async function deletePartnerCredential(id: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('partner_credentials')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao excluir credencial:', error);
    
    // Em desenvolvimento, simular sucesso
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ MODO DE DESENVOLVIMENTO: Simulando exclusão bem-sucedida');
      return true;
    }
    
    throw error;
  }
}

/** Testa a conexão com a API do parceiro */
export async function testPartnerConnection(id: string): Promise<{ success: boolean; message: string }> {
  // Em um cenário real, aqui seria feita uma chamada para um endpoint de teste
  // que validaria as credenciais do parceiro
  
  // Simulando um teste para demonstração
  await new Promise(resolve => setTimeout(resolve, 1500));
  const success = Math.random() > 0.3;
  
  return {
    success,
    message: success 
      ? 'Conexão com a API estabelecida com sucesso!' 
      : 'Falha ao conectar com a API do parceiro. Verifique a chave e tente novamente.'
  };
}

/** Dados mockados para desenvolvimento */
function getMockCredentials(userId: string): PartnerCredential[] {
  return [
    {
      id: '1',
      name: 'Parceiro V8 Produção (Mock)',
      api_key: 'v8_prod_key_123456789',
      partner_type: 'v8',
      auth_type: 'apikey',
      status: 'active',
      user_id: userId,
      created_at: '2023-10-15T14:00:00Z',
      updated_at: '2023-10-15T14:00:00Z'
    },
    {
      id: '2',
      name: 'Parceiro V8 Homologação (Mock)',
      api_key: 'v8_hml_key_987654321',
      partner_type: 'v8',
      auth_type: 'apikey',
      status: 'inactive',
      user_id: userId,
      created_at: '2023-10-15T14:00:00Z',
      updated_at: '2023-10-15T14:00:00Z'
    },
    {
      id: '3',
      name: 'Caixa Econômica (Mock)',
      api_key: '',
      partner_type: 'caixa',
      auth_type: 'oauth',
      oauth_config: {
        grant_type: 'password',
        username: 'caixa_user',
        password: '********',
        audience: 'https://api.caixa.gov.br',
        scope: 'read:fgts write:fgts',
        client_id: 'caixa_client_123',
      },
      status: 'active',
      user_id: userId,
      created_at: '2023-11-20T10:30:00Z',
      updated_at: '2023-11-20T10:30:00Z'
    }
  ];
} 