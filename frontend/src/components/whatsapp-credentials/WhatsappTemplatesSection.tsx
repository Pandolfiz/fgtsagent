import React, { useState, useEffect } from 'react';
import { FaSync, FaFilter, FaEye, FaCopy, FaCheck, FaExclamationTriangle, FaClock, FaCheckCircle, FaTimesCircle, FaBan, FaPlus } from 'react-icons/fa';
import { CreateTemplateModal } from './CreateTemplateModal';

interface WhatsappTemplate {
  id: string;
  template_id: string;
  template_name: string;
  template_language: string;
  template_category: string;
  template_status: string;
  template_components: any;
  template_quality_rating: string;
  template_created_at: string;
  template_updated_at: string;
}

interface TemplateStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byLanguage: Record<string, number>;
}

interface WhatsappAccount {
  businessAccountId: string;
  phone: string;
  agentName: string;
  status: string;
  connectionType: string;
  createdAt: string;
  updatedAt: string;
  hasMetaData: boolean;
  metaStatus: string;
}

interface WhatsappTemplatesSectionProps {
  businessAccountId?: string;
  accessToken?: string;
}

export function WhatsappTemplatesSection({ businessAccountId, accessToken }: WhatsappTemplatesSectionProps) {
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [stats, setStats] = useState<TemplateStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    language: '',
    category: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  
  // Estados para contas disponíveis
  const [availableAccounts, setAvailableAccounts] = useState<WhatsappAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<WhatsappAccount | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);

  // Estado para o modal de criação
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Carregar contas disponíveis ao montar o componente
  useEffect(() => {
    loadAvailableAccounts();
  }, []);

  // Carregar templates e estatísticas quando uma conta for selecionada
  useEffect(() => {
    if (selectedAccount?.businessAccountId) {
      loadTemplates();
      loadStats(); // Sempre carregar estatísticas da conta selecionada
    }
  }, [selectedAccount]);

  // Carregar contas disponíveis do usuário logado
  const loadAvailableAccounts = async () => {
    setAccountsLoading(true);
    setError(null);
    
    try {
      // Buscar credenciais do usuário logado via API
      const response = await fetch('/api/whatsapp-credentials', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao buscar credenciais');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Formatar dados das contas
        const formattedAccounts = data.data
          .filter((cred: any) => cred.connection_type === 'ads')
          .map((cred: any) => ({
            businessAccountId: cred.wpp_business_account_id,
            phone: cred.phone,
            agentName: cred.agent_name || 'Sem nome',
            status: cred.status,
            connectionType: cred.connection_type,
            createdAt: cred.created_at,
            updatedAt: cred.updated_at,
            hasMetaData: !!(cred.wpp_number_id && cred.wpp_access_token),
            metaStatus: cred.metadata?.code_verification_status || 'NÃO_VERIFICADO'
          }));
        
        setAvailableAccounts(formattedAccounts);
        
        // Se não há businessAccountId prop, usar a primeira conta disponível
        if (!businessAccountId && formattedAccounts.length > 0) {
          setSelectedAccount(formattedAccounts[0]);
        } else if (businessAccountId) {
          // Encontrar a conta correspondente ao businessAccountId prop
          const account = formattedAccounts.find(acc => acc.businessAccountId === businessAccountId);
          if (account) {
            setSelectedAccount(account);
          }
        }
      } else {
        setError('Nenhuma credencial WhatsApp encontrada');
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao carregar credenciais');
    } finally {
      setAccountsLoading(false);
    }
  };

  // Carregar templates do banco de dados
  const loadTemplates = async () => {
    if (!selectedAccount?.businessAccountId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Buscar templates salvos no banco via API
      const response = await fetch(`/api/whatsapp-templates?businessAccountId=${selectedAccount.businessAccountId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao buscar templates');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.data || []);
      } else {
        setError(data.message || 'Erro ao carregar templates');
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  // Carregar estatísticas da conta selecionada
  const loadStats = async () => {
    if (!selectedAccount?.businessAccountId) return;
    
    try {
      // Buscar estatísticas via API para a conta selecionada
      const response = await fetch(`/api/whatsapp-templates/stats?businessAccountId=${selectedAccount.businessAccountId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao buscar estatísticas');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        console.error('Erro ao carregar estatísticas:', data.message);
        // Fallback: calcular estatísticas dos templates locais
        calculateLocalStats();
      }
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
      // Fallback: calcular estatísticas dos templates locais
      calculateLocalStats();
    }
  };

  // Fallback: calcular estatísticas dos templates locais
  const calculateLocalStats = () => {
    if (!templates.length) {
      setStats({
        total: 0,
        byStatus: {},
        byCategory: {},
        byLanguage: {}
      });
      return;
    }
    
    try {
      const total = templates.length;
      const byStatus: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      const byLanguage: Record<string, number> = {};
      
      templates.forEach(template => {
        byStatus[template.template_status] = (byStatus[template.template_status] || 0) + 1;
        byCategory[template.template_category] = (byCategory[template.template_category] || 0) + 1;
        byLanguage[template.template_language] = (byLanguage[template.template_language] || 0) + 1;
      });
      
      setStats({ total, byStatus, byCategory, byLanguage });
    } catch (error: any) {
      console.error('Erro ao calcular estatísticas locais:', error);
    }
  };

  // Sincronizar templates da API da Meta
  const syncTemplates = async () => {
    if (!selectedAccount?.businessAccountId) {
      setError('Selecione uma conta WhatsApp Business para sincronizar');
      return;
    }
    
    setSyncing(true);
    setError(null);
    
    try {
      // Sincronizar templates via API
      const response = await fetch('/api/whatsapp-templates/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessAccountId: selectedAccount.businessAccountId
        })
      });
      
      if (!response.ok) {
        throw new Error('Erro na sincronização');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Recarregar templates e estatísticas
        await loadTemplates();
        await loadStats();
        
        // Mostrar mensagem de sucesso
        setError(null);
      } else {
        setError(data.message || 'Erro na sincronização');
      }
    } catch (error: any) {
      setError(error.message || 'Erro na sincronização');
    } finally {
      setSyncing(false);
    }
  };

  // Aplicar filtros
  const applyFilters = () => {
    loadTemplates();
  };

  // Limpar filtros
  const clearFilters = () => {
    setFilters({ status: '', language: '', category: '' });
    setTimeout(() => loadTemplates(), 100);
  };

  // Copiar template para área de transferência
  const copyTemplate = (template: WhatsappTemplate) => {
    const templateText = `Template: ${template.template_name}\nStatus: ${template.template_status}\nCategoria: ${template.template_category}\nIdioma: ${template.template_language}`;
    
    navigator.clipboard.writeText(templateText).then(() => {
      setCopiedTemplate(template.template_id);
      setTimeout(() => setCopiedTemplate(null), 2000);
    });
  };

  // Função para recarregar após criação
  const handleTemplateCreated = () => {
    loadTemplates();
    loadStats();
  };

  // Obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <FaCheckCircle className="text-green-500" />;
      case 'PENDING':
        return <FaClock className="text-yellow-500" />;
      case 'REJECTED':
        return <FaTimesCircle className="text-red-500" />;
      case 'DISABLED':
        return <FaBan className="text-gray-500" />;
      case 'IN_APPEAL':
        return <FaExclamationTriangle className="text-orange-500" />;
      default:
        return <FaExclamationTriangle className="text-gray-500" />;
    }
  };

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50';
      case 'PENDING':
        return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50';
      case 'REJECTED':
        return 'bg-red-900/30 text-red-300 border-red-700/50';
      case 'DISABLED':
        return 'bg-gray-900/30 text-gray-300 border-gray-700/50';
      case 'IN_APPEAL':
        return 'bg-orange-900/30 text-orange-300 border-orange-700/50';
      default:
        return 'bg-gray-900/30 text-gray-300 border-gray-700/50';
    }
  };

  // Obter cor da categoria
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'MARKETING':
        return 'bg-cyan-900/30 text-cyan-300 border-cyan-700/50';
      case 'UTILITY':
        return 'bg-purple-900/30 text-purple-300 border-purple-700/50';
      case 'AUTHENTICATION':
        return 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50';
      default:
        return 'bg-gray-900/30 text-gray-300 border-gray-700/50';
    }
  };

  // Se não há contas disponíveis, mostrar mensagem de configuração
  if (availableAccounts.length === 0 && !accountsLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center border border-cyan-800/30">
        <FaExclamationTriangle className="mx-auto h-12 w-12 text-cyan-400 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          Nenhuma conta WhatsApp Business configurada
        </h3>
        <p className="text-cyan-200 mb-4">
          Configure suas credenciais da API oficial da Meta para visualizar templates de mensagens.
        </p>
        <button
          onClick={loadAvailableAccounts}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white text-sm font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Se está carregando contas, mostrar loading
  if (accountsLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center border border-cyan-800/30">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
        <p className="mt-2 text-cyan-200">Carregando contas disponíveis...</p>
      </div>
    );
  }

  // Se não há conta selecionada, mostrar seletor
  if (!selectedAccount) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-cyan-800/30">
        <h3 className="text-lg font-medium text-white mb-4 text-center">
          Selecione uma Conta WhatsApp Business
        </h3>
        <div className="space-y-3">
          {availableAccounts.map((account) => (
            <button
              key={account.businessAccountId}
              onClick={() => setSelectedAccount(account)}
              className="w-full p-3 text-left bg-white/5 hover:bg-white/10 rounded-lg border border-cyan-800/30 hover:border-cyan-600/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{account.agentName || 'Sem nome'}</p>
                  <p className="text-sm text-cyan-200">{account.phone || 'Sem número'}</p>
                  <p className="text-xs text-cyan-300">ID: {account.businessAccountId}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    account.hasMetaData 
                      ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50' 
                      : 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50'
                  }`}>
                    {account.hasMetaData ? 'Configurada' : 'Pendente'}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg border border-cyan-800/30 hover:border-cyan-600/50 transition-all duration-300">
      {/* Header */}
      <div className="px-6 py-4 border-b border-cyan-800/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">
              Templates de Mensagens
            </h3>
            <p className="text-sm text-cyan-200 mb-2">
              Templates aprovados e pendentes da sua conta WhatsApp Business
            </p>
            {selectedAccount && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-cyan-300">Conta:</span>
                <span className="text-xs font-medium text-white bg-cyan-900/30 px-2 py-1 rounded border border-cyan-700/50">
                  {selectedAccount.agentName || 'Sem nome'} ({selectedAccount.phone || 'Sem número'})
                </span>
                <button
                  onClick={() => setSelectedAccount(null)}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Trocar
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 text-sm font-medium rounded-md border transition-all duration-300 ${
                showFilters 
                  ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300' 
                  : 'bg-white/10 border-cyan-700/50 text-cyan-200 hover:bg-cyan-600/20 hover:border-cyan-500'
              }`}
            >
              <FaFilter className="inline mr-2" />
              Filtros
            </button>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaPlus className="inline mr-2" />
              Criar Template
            </button>
            
            <button
              onClick={syncTemplates}
              disabled={syncing}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white text-sm font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            >
              <FaSync className={`inline mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="px-6 py-4 bg-cyan-900/20 border-b border-cyan-800/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-cyan-200 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-cyan-700/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white/10 text-white placeholder-cyan-300"
              >
                <option value="">Todos os status</option>
                <option value="APPROVED">Aprovado</option>
                <option value="PENDING">Pendente</option>
                <option value="REJECTED">Rejeitado</option>
                <option value="DISABLED">Desabilitado</option>
                <option value="IN_APPEAL">Em Apelação</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-cyan-200 mb-1">
                Categoria
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-cyan-700/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white/10 text-white placeholder-cyan-300"
              >
                <option value="">Todas as categorias</option>
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utilitário</option>
                <option value="AUTHENTICATION">Autenticação</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-cyan-200 mb-1">
                Idioma
              </label>
              <select
                value={filters.language}
                onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
                className="w-full px-3 py-2 border border-cyan-700/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white/10 text-white placeholder-cyan-300"
              >
                <option value="">Todos os idiomas</option>
                <option value="pt_BR">Português (BR)</option>
                <option value="en_US">Inglês (US)</option>
                <option value="es_ES">Espanhol (ES)</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-3 mt-4">
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm font-medium text-cyan-200 bg-white/10 border border-cyan-700/50 rounded-md hover:bg-cyan-600/20 hover:border-cyan-500 transition-all duration-300"
            >
              Limpar
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 rounded-md shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      {stats && (
        <div className="px-6 py-4 bg-cyan-900/20 border-b border-cyan-800/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{stats.total}</div>
              <div className="text-sm text-cyan-200">Total de Templates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.byStatus.APPROVED || 0}</div>
              <div className="text-sm text-emerald-200">Aprovados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.byStatus.PENDING || 0}</div>
              <div className="text-sm text-yellow-200">Pendentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{stats.byStatus.REJECTED || 0}</div>
              <div className="text-sm text-red-200">Rejeitados</div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Templates */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
            <p className="mt-2 text-cyan-200">Carregando templates...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <FaExclamationTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-300 mb-2">{error}</p>
            <button
              onClick={loadTemplates}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white text-sm font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            >
              Tentar Novamente
            </button>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8">
            <FaExclamationTriangle className="mx-auto h-12 w-12 text-cyan-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              Nenhum template encontrado
            </h3>
            <p className="text-cyan-200 mb-4">
              {filters.status || filters.language || filters.category 
                ? 'Nenhum template corresponde aos filtros aplicados.'
                : 'Sincronize seus templates da API da Meta para começar.'
              }
            </p>
            {!filters.status && !filters.language && !filters.category && (
              <button
                onClick={syncTemplates}
                disabled={syncing}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white text-sm font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
              >
                <FaSync className={`inline mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando Templates' : 'Sincronizar Templates'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white/5 backdrop-blur-sm rounded-lg p-4 hover:bg-white/10 hover:shadow-lg transition-all duration-300 border border-cyan-800/30 hover:border-cyan-600/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-white">
                        {template.template_name}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(template.template_status)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(template.template_status)}`}>
                          {template.template_status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-cyan-200 mb-3">
                      <span className="flex items-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(template.template_category)}`}>
                          {template.template_category}
                        </span>
                      </span>
                      <span>•</span>
                      <span>{template.template_language}</span>
                      {template.template_quality_rating && (
                        <>
                          <span>•</span>
                          <span>Qualidade: {template.template_quality_rating}</span>
                        </>
                      )}
                    </div>
                    
                    {template.template_components && (
                      <div className="bg-cyan-900/20 rounded p-3 text-sm border border-cyan-800/30">
                        <div className="font-medium text-cyan-200 mb-2">Componentes:</div>
                        <div className="space-y-1">
                          {template.template_components.map((component: any, index: number) => (
                            <div key={index} className="text-cyan-100">
                              <span className="font-medium">{component.type}:</span> {component.text || 'N/A'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-cyan-300 mt-3">
                      <span>Criado: {new Date(template.template_created_at).toLocaleDateString('pt-BR')}</span>
                      {template.template_updated_at && (
                        <span>Atualizado: {new Date(template.template_updated_at).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  </div>
                   
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => copyTemplate(template)}
                      className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-600/20 rounded-md transition-all duration-300"
                      title="Copiar informações do template"
                    >
                      {copiedTemplate === template.template_id ? (
                        <FaCheck className="text-emerald-400" />
                      ) : (
                        <FaCopy />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Criação */}
      <CreateTemplateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        businessAccountId={selectedAccount?.businessAccountId || ''}
        onTemplateCreated={handleTemplateCreated}
      />
    </div>
  );
}
