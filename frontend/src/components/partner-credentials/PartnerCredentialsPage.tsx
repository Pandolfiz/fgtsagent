import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FaKey, FaEdit, FaTrash, FaSync, FaPlus, FaCircle, FaCheck, FaExclamation, FaQuestionCircle, FaCopy, FaEye, FaEyeSlash, FaSpinner, FaSearch, FaChevronLeft, FaChevronRight, FaShieldAlt, FaLock, FaChevronDown } from 'react-icons/fa';
import Navbar from '../Navbar';
import { PartnerType, AuthType } from '../../types/partnerCredentials';
import { api, PartnerCredential } from '../../utilities/api';

// Estado inicial do formulário
const initialFormState = {
  name: '',
  api_key: '',
  partner_type: 'v8' as PartnerType,
  auth_type: 'oauth' as AuthType,
  oauth_config: {
    grant_type: 'password',
    username: '',
    password: '',
    audience: '',
    scope: '',
    client_id: ''
  },
  status: 'active' as const
};

// Separar o CredentialForm para fora do componente principal
type CredentialFormProps = {
  formData: typeof initialFormState;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  buttonText: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onCancel: () => void;
};

// Componente de formulário memoizado para evitar re-renderizações desnecessárias
const CredentialForm = React.memo(({ formData, onSubmit, buttonText, onChange, onCancel }: CredentialFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-cyan-100 mb-1">
          Nome da Credencial
        </label>
        <input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={onChange}
          required
          className="w-full px-3 py-2 bg-cyan-900/40 border-cyan-800/30 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-white"
          placeholder="Ex: Parceiro V8 Produção"
        />
      </div>
      
      {/* Campos ocultos para tipo de parceiro e autenticação */}
      <input type="hidden" name="partner_type" value={formData.partner_type} />
      <input type="hidden" name="auth_type" value={formData.auth_type} />
      
      {/* Form para OAuth (sempre visível agora) */}
      <div className="space-y-4 p-4 bg-cyan-900/40 rounded-md border border-cyan-800/30">
        <h4 className="font-medium text-cyan-100 mb-1">Configuração OAuth</h4>
        
        <div>
          <label htmlFor="oauth.grant_type" className="block text-sm font-medium text-cyan-100 mb-1">
            Grant Type
          </label>
          <select
            name="oauth.grant_type"
            id="oauth.grant_type"
            value={formData.oauth_config.grant_type}
            onChange={onChange}
            className="w-full px-3 py-2 bg-cyan-900/40 border-cyan-800/30 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-white"
          >
            <option value="password">Password</option>
            <option value="client_credentials">Client Credentials</option>
            <option value="authorization_code">Authorization Code</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="oauth.client_id" className="block text-sm font-medium text-cyan-100 mb-1">
            Client ID
          </label>
          <input
            type="text"
            name="oauth.client_id"
            id="oauth.client_id"
            value={formData.oauth_config.client_id}
            onChange={onChange}
            className="w-full px-3 py-2 bg-cyan-900/40 border-cyan-800/30 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-white"
            placeholder="Ex: client_123456"
          />
        </div>
        
        {(formData.oauth_config.grant_type === 'password') && (
          <>
            <div>
              <label htmlFor="oauth.username" className="block text-sm font-medium text-cyan-100 mb-1">
                Username
              </label>
              <input
                type="text"
                name="oauth.username"
                id="oauth.username"
                value={formData.oauth_config.username}
                onChange={onChange}
                className="w-full px-3 py-2 bg-cyan-900/40 border-cyan-800/30 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-white"
                placeholder="Ex: api_user"
              />
            </div>
            
            <div>
              <label htmlFor="oauth.password" className="block text-sm font-medium text-cyan-100 mb-1">
                Password
              </label>
              <input
                type="password"
                name="oauth.password"
                id="oauth.password"
                value={formData.oauth_config.password}
                onChange={onChange}
                className="w-full px-3 py-2 bg-cyan-900/40 border-cyan-800/30 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-white"
                placeholder="****"
              />
            </div>
          </>
        )}
        
        <div>
          <label htmlFor="oauth.audience" className="block text-sm font-medium text-cyan-100 mb-1">
            Audience
          </label>
          <input
            type="text"
            name="oauth.audience"
            id="oauth.audience"
            value={formData.oauth_config.audience}
            onChange={onChange}
            className="w-full px-3 py-2 bg-cyan-900/40 border-cyan-800/30 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-white"
            placeholder="Ex: https://api.example.com"
          />
        </div>
        
        <div>
          <label htmlFor="oauth.scope" className="block text-sm font-medium text-cyan-100 mb-1">
            Scope
          </label>
          <input
            type="text"
            name="oauth.scope"
            id="oauth.scope"
            value={formData.oauth_config.scope}
            onChange={onChange}
            className="w-full px-3 py-2 bg-cyan-900/40 border-cyan-800/30 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-white"
            placeholder="Ex: read:data write:data"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center py-2 px-4 border border-cyan-800/30 shadow-sm text-sm font-medium rounded-md text-cyan-300 bg-cyan-900/30 hover:bg-cyan-800/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
        >
          {buttonText}
        </button>
      </div>
    </form>
  );
});

export function PartnerCredentialsPage() {
  const [credentials, setCredentials] = useState<PartnerCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<PartnerCredential | null>(null);
  const [showApiKey, setShowApiKey] = useState<{[key: string]: boolean}>({});
  const [testingConnection, setTestingConnection] = useState<{[key: string]: boolean}>({});
  const [testResults, setTestResults] = useState<{[key: string]: { success: boolean; message: string } | null}>({});
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('Todos os tipos');
  // Estado para notificação de atalho
  const [shortcutNotification, setShortcutNotification] = useState<{ visible: boolean; message: string }>({ 
    visible: false, 
    message: '' 
  });
  // Estado para notificações toast
  const [toast, setToast] = useState<{ 
    visible: boolean; 
    message: string; 
    type: 'success' | 'error' | 'info' | 'warning' 
  }>({ 
    visible: false, 
    message: '',
    type: 'info'
  });
  
  // Estados para busca e paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Form states
  const [formData, setFormData] = useState(initialFormState);

  // Carregar credenciais
  useEffect(() => {
    async function loadCredentials() {
      try {
        setLoading(true);
        console.log("Iniciando carregamento de credenciais de parceiros...");
        const response = await api.partnerCredentials.getAll();
        console.log("Resposta da API:", response);
        
        if (response.success) {
          // Verificar e corrigir dados incompletos
          const validatedData = (response.data || []).map(cred => ({
            ...cred,
            name: cred.name || 'Sem nome',
            partner_type: cred.partner_type || 'outro',
            status: cred.status || 'inactive'
          }));
          
          console.log("Dados recebidos originais:", response.data);
          console.log("Dados validados:", validatedData);
          console.log("Exemplo de oauth_config:", validatedData.length > 0 ? validatedData[0].oauth_config : "Nenhum");
          
          setCredentials(validatedData);
          setError(null);
        } else {
          throw new Error(response.message || 'Erro desconhecido');
        }
      } catch (err) {
        console.error('Erro detalhado ao carregar credenciais:', err);
        setError('Erro ao carregar credenciais: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    }
    
    loadCredentials();
  }, []);

  // Exibir notificação toast por 3 segundos
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Copiar chave API para o clipboard
  const copyApiKeyToClipboard = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey)
      .then(() => {
        // Adicionar notificação de sucesso
        showToast('Chave API copiada com sucesso!', 'success');
      })
      .catch(err => {
        console.error('Erro ao copiar chave API:', err);
        showToast('Erro ao copiar chave API para a área de transferência', 'error');
      });
  };

  // Alternar visibilidade da chave API
  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Resetar form para adicionar nova credencial
  const handleAddNew = () => {
    setFormData(initialFormState);
    setShowAddModal(true);
  };

  // Preparar form para editar credencial existente
  const handleEdit = (credential: PartnerCredential) => {
    setSelectedCredential(credential);
    setFormData({
      name: credential.name || '',
      api_key: credential.api_key || '',
      partner_type: credential.partner_type || 'v8',
      auth_type: credential.auth_type || 'oauth',
      oauth_config: {
        grant_type: credential.oauth_config?.grant_type || 'password',
        username: credential.oauth_config?.username || '',
        password: credential.oauth_config?.password || '',
        audience: credential.oauth_config?.audience || '',
        scope: credential.oauth_config?.scope || '',
        client_id: credential.oauth_config?.client_id || ''
      },
      status: (credential.status || 'active') as 'active'
    });
    setShowEditModal(true);
  };

  // Preparar confirmação para excluir credencial
  const handleDelete = (credential: PartnerCredential) => {
    setSelectedCredential(credential);
    setShowDeleteModal(true);
  };

  // Atualizar campos do formulário - versão atualizada para suportar campos aninhados
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('oauth.')) {
      const oauthField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        oauth_config: {
          ...prev.oauth_config,
          [oauthField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Resetar campos OAuth se o tipo de autenticação mudar para apikey
    if (name === 'auth_type' && value === 'apikey') {
      setFormData(prev => ({
        ...prev,
        auth_type: 'apikey' as AuthType,
        oauth_config: {
          grant_type: 'password',
          username: '',
          password: '',
          audience: '',
          scope: '',
          client_id: ''
        }
      }));
    }
  };

  // Salvar nova credencial
  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await api.partnerCredentials.create({
        name: formData.name,
        api_key: formData.api_key,
        partner_type: formData.partner_type,
        auth_type: formData.auth_type,
        oauth_config: formData.oauth_config,
        status: formData.status === 'active' ? 'active' : 'pending'
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Erro ao criar credencial');
      }
      
      // Atualizar lista de credenciais
      setCredentials(prev => [...prev, response.data as PartnerCredential]);
      setShowAddModal(false);
      setError(null);
      
      // Mostrar toast de sucesso
      showToast(`Credencial "${formData.name}" criada com sucesso!`, 'success');
    } catch (err) {
      setError('Erro ao salvar credencial: ' + (err instanceof Error ? err.message : String(err)));
      // Mostrar toast de erro
      showToast('Erro ao salvar credencial: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar credencial existente
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCredential) return;
    
    setLoading(true);
    try {
      const response = await api.partnerCredentials.update(
        selectedCredential.id,
        {
          name: formData.name,
          api_key: formData.api_key,
          partner_type: formData.partner_type,
          auth_type: formData.auth_type,
          oauth_config: formData.oauth_config,
          status: formData.status === 'active' ? 'active' : selectedCredential.status
        }
      );
      
      if (!response.success) {
        throw new Error(response.message || 'Erro ao atualizar credencial');
      }
      
      setCredentials(prev => 
        prev.map(cred => cred.id === selectedCredential.id ? (response.data as PartnerCredential) : cred)
      );
      setShowEditModal(false);
      setError(null);
      
      // Mostrar toast de sucesso
      showToast(`Credencial "${formData.name}" atualizada com sucesso!`, 'success');
    } catch (err) {
      setError('Erro ao atualizar credencial: ' + (err instanceof Error ? err.message : String(err)));
      // Mostrar toast de erro
      showToast('Erro ao atualizar credencial: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Confirmar exclusão de credencial
  const handleConfirmDelete = async () => {
    if (!selectedCredential) return;
    
    setLoading(true);
    try {
      const response = await api.partnerCredentials.delete(selectedCredential.id);
      
      if (!response.success) {
        throw new Error(response.message || 'Erro ao excluir credencial');
      }
      
      setCredentials(prev => prev.filter(cred => cred.id !== selectedCredential.id));
      setShowDeleteModal(false);
      setError(null);
      
      // Mostrar toast de sucesso
      showToast(`Credencial "${selectedCredential.name}" excluída com sucesso!`, 'success');
    } catch (err) {
      setError('Erro ao excluir credencial: ' + (err instanceof Error ? err.message : String(err)));
      // Mostrar toast de erro
      showToast('Erro ao excluir credencial: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Testar conexão com a API do parceiro
  const handleTestConnection = async (credential: PartnerCredential) => {
    try {
      setTestingConnection(prev => ({ ...prev, [credential.id]: true }));
      setTestResults(prev => ({ ...prev, [credential.id]: null }));
      
      const response = await api.partnerCredentials.testConnection(credential.id);
      
      if (!response.success) {
        throw new Error(response.message || 'Erro ao testar conexão');
      }
      
      const result = {
        success: response.data?.success || false,
        message: response.data?.message || 'Sem mensagem'
      };
      
      setTestResults(prev => ({ ...prev, [credential.id]: result }));
      
      // Mostrar toast com o resultado do teste
      if (result.success) {
        showToast(`Conexão com "${credential.name}" testada com sucesso!`, 'success');
      } else {
        showToast(`Falha no teste de conexão: ${result.message}`, 'warning');
      }
    } catch (err) {
      setTestResults(prev => ({ 
        ...prev, 
        [credential.id]: { 
          success: false, 
          message: 'Erro ao testar conexão: ' + (err instanceof Error ? err.message : String(err))
        } 
      }));
      
      // Mostrar toast de erro
      showToast('Erro ao testar conexão: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setTestingConnection(prev => ({ ...prev, [credential.id]: false }));
      
      // Limpar resultado do teste após 5 segundos
      setTimeout(() => {
        setTestResults(prev => ({ ...prev, [credential.id]: null }));
      }, 5000);
    }
  };

  // Componente para exibir o status da credencial
  const StatusBadge = ({ status, size = 'sm' }: { status?: string, size?: 'sm' | 'lg' }) => {
    const getStatusConfig = (status: string) => {
      switch (status) {
        case 'active':
          return {
            color: 'text-green-500',
            bg: 'bg-green-500/10',
            border: 'border-green-500/20',
            text: 'Ativo',
            icon: <FaCheck />
          };
        case 'inactive':
          return {
            color: 'text-gray-500',
            bg: 'bg-gray-500/10',
            border: 'border-gray-500/20',
            text: 'Inativo',
            icon: <FaCircle />
          };
        case 'pending':
          return {
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/20',
            text: 'Pendente',
            icon: <FaQuestionCircle />
          };
        case 'error':
          return {
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            text: 'Erro',
            icon: <FaExclamation />
          };
        default:
          return {
            color: 'text-gray-500',
            bg: 'bg-gray-500/10',
            border: 'border-gray-500/20',
            text: 'Desconhecido',
            icon: <FaQuestionCircle />
          };
      }
    };
    
    const config = getStatusConfig(status || 'inactive');
    
    return (
      <span className={`inline-flex items-center ${size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'} rounded-full ${config.bg} ${config.color} ${config.border} border`}>
        <span className={`mr-1 ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>{config.icon}</span>
        {config.text}
      </span>
    );
  };

  // Componente para exibir o tipo de parceiro
  const PartnerTypeBadge = ({ type }: { type: PartnerType }) => {
    const getTypeConfig = (type: PartnerType) => {
      switch (type) {
        case 'v8':
          return {
            color: 'text-blue-600',
            bg: 'bg-blue-100',
            text: 'V8'
          };
        case 'caixa':
          return {
            color: 'text-orange-600',
            bg: 'bg-orange-100',
            text: 'Caixa'
          };
        case 'governo':
          return {
            color: 'text-green-600',
            bg: 'bg-green-100',
            text: 'Governo'
          };
        default:
          return {
            color: 'text-gray-600',
            bg: 'bg-gray-100',
            text: 'Outro'
          };
      }
    };
    
    const config = getTypeConfig(type);
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${config.color} ${config.bg}`}>
        {config.text}
      </span>
    );
  };

  // Filtrar credenciais com base no termo de busca
  const filteredCredentials = credentials.filter(cred => 
    (cred.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (cred.partner_type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    ((cred.api_key || '')?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );
  
  // Calcular total de páginas
  const totalPages = Math.ceil(filteredCredentials.length / itemsPerPage);
  
  // Obter credenciais para a página atual
  const paginatedCredentials = filteredCredentials.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Gerenciador de atalhos de teclado (movido para depois da definição de totalPages)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC fecha modais
      if (event.key === 'Escape') {
        if (showAddModal) {
          setShowAddModal(false);
          showShortcutNotification('Modal fechado');
        }
        else if (showEditModal) {
          setShowEditModal(false);
          showShortcutNotification('Modal fechado');
        }
        else if (showDeleteModal) {
          setShowDeleteModal(false);
          showShortcutNotification('Modal fechado');
        }
        else if (showFilterDropdown) {
          setShowFilterDropdown(false);
          showShortcutNotification('Filtro fechado');
        }
      }
      
      // Atalhos adicionais usando combinações de teclas (Alt+)
      if (event.altKey) {
        // Alt+N para nova credencial
        if (event.key === 'n') {
          event.preventDefault();
          handleAddNew();
          showShortcutNotification('Adicionando nova credencial');
        }
        
        // Alt+F para focar na busca
        if (event.key === 'f') {
          event.preventDefault();
          const searchInput = document.querySelector('input[type="text"][placeholder*="Buscar"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            showShortcutNotification('Focando na busca');
          }
        }
        
        // Alt+1, Alt+2, etc para navegar entre páginas
        const pageNum = parseInt(event.key, 10);
        if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
          event.preventDefault();
          handlePageChange(pageNum);
          showShortcutNotification(`Navegando para página ${pageNum}`);
        }
      }
    };

    // Adicionar event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Limpar event listener quando o componente for desmontado
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAddModal, showEditModal, showDeleteModal, showFilterDropdown, totalPages]);
  
  // Manipular mudança de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Manipular busca
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Resetar para primeira página ao buscar
  };

  // Manipular seleção de filtro
  const handleFilterSelect = (filterType: string) => {
    setSelectedFilter(filterType);
    setSearchTerm(filterType === 'Todos os tipos' ? '' : `tipo:${filterType.toLowerCase()}`);
    setShowFilterDropdown(false);
  };

  // Exibir notificação de atalho por 2 segundos
  const showShortcutNotification = (message: string) => {
    setShortcutNotification({ visible: true, message });
    setTimeout(() => {
      setShortcutNotification({ visible: false, message: '' });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 text-white">
      <Navbar fullWidth={true} />
      
      {/* Notificação de atalho */}
      <Transition
        show={shortcutNotification.visible}
        enter="transition-opacity duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        as="div"
        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="bg-cyan-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-md shadow-lg border border-cyan-800/40">
          <div className="flex items-center">
            <span className="mr-2">⌨️</span>
            <span>{shortcutNotification.message}</span>
          </div>
        </div>
      </Transition>
      
      {/* Toast notification */}
      <Transition
        show={toast.visible}
        enter="transition ease-out duration-300"
        enterFrom="transform opacity-0 scale-95 translate-y-2"
        enterTo="transform opacity-100 scale-100 translate-y-0"
        leave="transition ease-in duration-200"
        leaveFrom="transform opacity-100 scale-100 translate-y-0"
        leaveTo="transform opacity-0 scale-95 translate-y-2"
        as="div"
        className="fixed bottom-4 right-4 z-50"
      >
        <div className={`flex items-center px-6 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-600/40 text-white' :
          toast.type === 'error' ? 'bg-red-900/90 border-red-600/40 text-white' :
          toast.type === 'warning' ? 'bg-amber-900/90 border-amber-600/40 text-white' :
          'bg-cyan-900/90 border-cyan-600/40 text-white'
        } backdrop-blur-sm border`}>
          <div className="flex items-center">
            <span className="mr-3">
              {toast.type === 'success' ? '✅' :
               toast.type === 'error' ? '❌' :
               toast.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="font-medium">{toast.message}</span>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
            className="ml-4 text-white/80 hover:text-white"
          >
            &times;
          </button>
        </div>
      </Transition>
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header principal com ícone e texto */}
        <div className="mb-6 px-4 sm:px-0">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl sm:leading-9 mb-2 flex items-center">
                <FaKey className="mr-3 h-8 w-8 text-cyan-400 filter drop-shadow-[0_0_6px_rgba(14,165,233,0.7)]" />
                Credenciais de Parceiros
              </h1>
              <p className="text-cyan-100 text-lg">
                Configure e gerencie conexões seguras para integrações com serviços externos
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <button
                onClick={() => setShowKeyboardShortcuts(true)}
                className="inline-flex items-center px-4 py-2 border border-cyan-800/30 shadow-sm text-sm font-medium rounded-md text-cyan-300 bg-cyan-900/30 hover:bg-cyan-800/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                title="Mostrar atalhos de teclado"
              >
                <span className="mr-2">⌨️</span>
                Atalhos
              </button>
              <button
                onClick={handleAddNew}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-800 bg-opacity-80 hover:bg-opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
              >
                <FaPlus className="mr-2 h-4 w-4" />
                Nova Credencial
              </button>
            </div>
          </div>
          
          {/* Estatísticas rápidas */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white bg-opacity-10 overflow-hidden shadow rounded-lg backdrop-blur-sm border border-cyan-900/30">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-cyan-100 rounded-md p-3">
                    <FaKey className="h-6 w-6 text-cyan-700" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-cyan-100 truncate">
                        Total de Credenciais
                      </dt>
                      <dd>
                        <div className="text-lg font-semibold text-white">
                          {credentials.length}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white bg-opacity-10 overflow-hidden shadow rounded-lg backdrop-blur-sm border border-cyan-900/30">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                    <FaCheck className="h-6 w-6 text-green-700" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-cyan-100 truncate">
                        Credenciais Ativas
                      </dt>
                      <dd>
                        <div className="text-lg font-semibold text-white">
                          {credentials.filter(c => c.status === 'active').length}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white bg-opacity-10 overflow-hidden shadow rounded-lg backdrop-blur-sm border border-cyan-900/30">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <FaShieldAlt className="h-6 w-6 text-blue-700" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-cyan-100 truncate">
                        Oauth Configurado
                      </dt>
                      <dd>
                        <div className="text-lg font-semibold text-white">
                          {credentials.filter(c => c.auth_type === 'oauth').length}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Exibir mensagem de erro se houver */}
        {error && (
          <div className="rounded-md bg-red-900/40 p-4 mb-6 mx-4 sm:mx-0 border border-red-700/40 shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaExclamation className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-200">Erro</h3>
                <div className="mt-2 text-sm text-red-200">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="px-4 py-0 sm:px-0">
          <div className="bg-white bg-opacity-10 shadow-md sm:rounded-lg overflow-hidden border border-cyan-900/30 backdrop-blur-sm">
            <div className="px-4 py-5 border-b border-cyan-900/30 sm:px-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-white flex items-center">
                    <FaKey className="mr-2 text-cyan-400" />
                    Credenciais Disponíveis
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-cyan-100">
                    {filteredCredentials.length} credenciais encontradas
                  </p>
                </div>
                
                {/* Controles de filtragem */}
                <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
                  {/* Campo de busca */}
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaSearch className="h-4 w-4 text-cyan-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearch}
                      className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 pr-3 py-2 sm:text-sm 
                        bg-cyan-900/40 border-cyan-900/60 text-white placeholder-cyan-300 rounded-md"
                      placeholder="Buscar credenciais..."
                    />
                  </div>
                  
                  {/* Dropdown de Filtro Estilizado */}
                  <div className="relative">
                    <button
                      type="button"
                      className="relative inline-flex justify-between items-center w-full px-4 py-2 text-sm font-medium text-white bg-cyan-900/60 border border-cyan-800/30 rounded-md shadow-sm hover:bg-cyan-800/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-cyan-900 focus:ring-cyan-700"
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      aria-haspopup="true"
                      aria-expanded={showFilterDropdown}
                    >
                      <span>{selectedFilter}</span>
                      <FaChevronDown className={`ml-2 h-4 w-4 transition-transform ${showFilterDropdown ? 'transform rotate-180' : ''}`} />
                    </button>
                
                    {/* Dropdown Menu */}
                    {showFilterDropdown && (
                      <div className="absolute right-0 z-10 mt-1 w-full bg-cyan-900/90 backdrop-blur-sm border border-cyan-800/50 shadow-lg rounded-md overflow-hidden">
                        <div className="py-1">
                          {['Todos os tipos', 'V8', 'Banrisul', 'BMP | Money Plus', 'I9', 'Digio', 'Fintex', 'Bankerize', 'Ágil', 'Smart', 'Outro'].map((option) => (
                            <button
                              key={option}
                              className={`flex w-full items-center px-4 py-3 text-sm text-white hover:bg-cyan-800/70 ${selectedFilter === option ? 'bg-cyan-800' : ''}`}
                              onClick={() => handleFilterSelect(option)}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleAddNew}
                    className="md:hidden inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                  >
                    <FaPlus className="mr-2" />
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
            
            {/* Lista de credenciais */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mx-auto"></div>
                  <p className="mt-2 text-cyan-100">
                    Carregando credenciais...
                  </p>
                </div>
              ) : filteredCredentials.length === 0 ? (
                <div className="p-8 text-center">
                  {searchTerm ? (
                    <>
                      <p className="text-cyan-100">
                        Nenhuma credencial encontrada para "{searchTerm}".
                      </p>
                      <button
                        onClick={() => setSearchTerm('')}
                        className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-cyan-800 bg-cyan-100 hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                      >
                        Limpar busca
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto max-w-md p-6 bg-white/5 rounded-lg shadow-inner">
                        <div className="bg-white/10 p-8 rounded-lg shadow-sm border border-cyan-900/30">
                          <FaKey className="mx-auto h-12 w-12 text-cyan-500 mb-4" />
                          <p className="text-center text-cyan-100 mb-4">
                            Nenhuma credencial cadastrada.
                          </p>
                          <button
                            onClick={handleAddNew}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-md text-white bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                          >
                            <FaPlus className="mr-2" />
                            Adicionar Credencial
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-cyan-900/30">
                    <thead className="bg-cyan-900/30">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-100 uppercase tracking-wider">
                          Nome
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-100 uppercase tracking-wider">
                          Banco
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-100 uppercase tracking-wider">
                          Chave
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-100 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-100 uppercase tracking-wider">
                          Data criação
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-cyan-100 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-900/30">
                      {paginatedCredentials.map((credential) => (
                        <tr key={credential.id} className="hover:bg-white/5">
                          <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-white">
                            {credential.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-white">
                            <PartnerTypeBadge type={credential.partner_type} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-white">
                            <div className="flex items-center space-x-2">
                              {credential.auth_type === 'apikey' ? (
                                <>
                                  <span className="font-mono bg-cyan-900/40 text-white p-1.5 rounded max-w-[180px] overflow-hidden border border-cyan-800/30">
                                    {showApiKey[credential.id] 
                                      ? credential.api_key 
                                      : `${(credential.api_key || '').substring(0, 6)}${'•'.repeat(10)}`
                                    }
                                  </span>
                                  <button
                                    onClick={() => toggleApiKeyVisibility(credential.id)}
                                    className="text-cyan-300 hover:text-white"
                                    title={showApiKey[credential.id] ? "Ocultar chave" : "Mostrar chave"}
                                  >
                                    {showApiKey[credential.id] ? <FaEyeSlash /> : <FaEye />}
                                  </button>
                                  <button
                                    onClick={() => copyApiKeyToClipboard(credential.api_key || '')}
                                    className="text-cyan-300 hover:text-white"
                                    title="Copiar chave"
                                  >
                                    <FaCopy />
                                  </button>
                                </>
                              ) : (
                                <span className="flex items-center gap-1.5 text-white bg-cyan-900/40 p-1.5 rounded border border-cyan-800/30">
                                  <FaLock className="text-cyan-400" />
                                  OAuth {credential.oauth_config?.grant_type || 'password'}
                                </span>
                              )}
                            </div>
                            {/* Adicionar debug info - remover em produção */}
                            {process.env.NODE_ENV !== 'production' && (
                              <div className="mt-2 text-xs text-cyan-300 opacity-50 hidden">
                                {JSON.stringify(credential.oauth_config)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-white">
                            <StatusBadge status={credential.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-white">
                            {new Date(credential.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-3">
                              <button
                                onClick={() => handleTestConnection(credential)}
                                className={`${testingConnection[credential.id] ? 'opacity-50 cursor-not-allowed' : ''} 
                                  text-cyan-400 hover:text-white`}
                                disabled={testingConnection[credential.id]}
                                title="Testar conexão"
                              >
                                {testingConnection[credential.id] ? (
                                  <FaSpinner className="h-5 w-5 animate-spin" />
                                ) : (
                                  <FaSync className="h-5 w-5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleEdit(credential)}
                                className="text-blue-400 hover:text-white"
                                title="Editar"
                              >
                                <FaEdit className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(credential)}
                                className="text-red-400 hover:text-white"
                                title="Excluir"
                              >
                                <FaTrash className="h-5 w-5" />
                              </button>
                            </div>
                            
                            {/* Resultado do teste de conexão */}
                            {testResults[credential.id] && (
                              <div className={`mt-2 text-xs rounded-md p-2 ${
                                testResults[credential.id]?.success 
                                  ? 'bg-green-900/40 text-green-300 border border-green-800/30' 
                                  : 'bg-red-900/40 text-red-300 border border-red-800/30'
                              }`}>
                                {testResults[credential.id]?.message}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Paginação atualizada */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-cyan-900/30 border-t border-cyan-900/30 sm:px-6">
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-white">
                            Mostrando <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredCredentials.length)}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredCredentials.length)}</span> de <span className="font-medium">{filteredCredentials.length}</span> resultados
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Paginação">
                            <button
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium
                                ${currentPage === 1 
                                  ? 'border-cyan-800/30 bg-cyan-900/40 text-cyan-400/40 cursor-not-allowed' 
                                  : 'border-cyan-800/30 bg-cyan-900/30 text-cyan-300 hover:bg-cyan-800/40'
                                }`}
                            >
                              <span className="sr-only">Anterior</span>
                              <FaChevronLeft className="h-5 w-5" />
                            </button>
                            
                            {/* Páginas */}
                            {Array.from({ length: totalPages }).map((_, i) => (
                              <button
                                key={i + 1}
                                onClick={() => handlePageChange(i + 1)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                                  ${currentPage === i + 1
                                    ? 'z-10 bg-cyan-700/70 border-cyan-600 text-white'
                                    : 'bg-cyan-900/30 border-cyan-800/30 text-cyan-300 hover:bg-cyan-800/40'
                                  }`}
                              >
                                {i + 1}
                              </button>
                            ))}
                            
                            <button
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium
                                ${currentPage === totalPages 
                                  ? 'border-cyan-800/30 bg-cyan-900/40 text-cyan-400/40 cursor-not-allowed' 
                                  : 'border-cyan-800/30 bg-cyan-900/30 text-cyan-300 hover:bg-cyan-800/40'
                                }`}
                            >
                              <span className="sr-only">Próxima</span>
                              <FaChevronRight className="h-5 w-5" />
                            </button>
                          </nav>
                        </div>
                      </div>
                      
                      {/* Mobile pagination */}
                      <div className="flex sm:hidden items-center justify-between">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md
                            ${currentPage === 1 
                              ? 'border-cyan-800/30 bg-cyan-900/40 text-cyan-400/40 cursor-not-allowed' 
                              : 'border-cyan-800/30 bg-cyan-900/30 text-white hover:bg-cyan-800/40'
                            }`}
                        >
                          Anterior
                        </button>
                        <div className="text-sm text-white">
                          <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                        </div>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md
                            ${currentPage === totalPages 
                              ? 'border-cyan-800/30 bg-cyan-900/40 text-cyan-400/40 cursor-not-allowed' 
                              : 'border-cyan-800/30 bg-cyan-900/30 text-white hover:bg-cyan-800/40'
                            }`}
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal para adicionar credencial */}
      <Transition appear show={showAddModal} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setShowAddModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 to-cyan-950 p-6 text-left align-middle shadow-xl transition-all border border-cyan-800/30">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-white flex items-center"
                  >
                    <FaPlus className="mr-2 text-cyan-400" />
                    Adicionar Nova Credencial
                  </Dialog.Title>
                  <div className="mt-4">
                    <CredentialForm 
                      formData={formData} 
                      onSubmit={handleSaveNew} 
                      buttonText="Adicionar" 
                      onChange={handleChange}
                      onCancel={() => setShowAddModal(false)}
                    />
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* Modal para editar credencial */}
      <Transition appear show={showEditModal} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setShowEditModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 to-cyan-950 p-6 text-left align-middle shadow-xl transition-all border border-cyan-800/30">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-white flex items-center"
                  >
                    <FaEdit className="mr-2 text-cyan-400" />
                    Editar Credencial
                  </Dialog.Title>
                  <div className="mt-4">
                    <CredentialForm 
                      formData={formData} 
                      onSubmit={handleUpdate} 
                      buttonText="Atualizar" 
                      onChange={handleChange}
                      onCancel={() => setShowEditModal(false)}
                    />
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* Modal para excluir credencial */}
      <Transition appear show={showDeleteModal} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setShowDeleteModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 to-cyan-950 p-6 text-left align-middle shadow-xl transition-all border border-cyan-800/30">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-white flex items-center"
                  >
                    <FaTrash className="mr-2 text-red-400" />
                    Excluir Credencial
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-cyan-100">
                      Tem certeza que deseja excluir a credencial <strong>{selectedCredential?.name}</strong>? Esta ação não pode ser desfeita.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center py-2 px-4 border border-cyan-800/30 shadow-sm text-sm font-medium rounded-md text-cyan-300 bg-cyan-900/30 hover:bg-cyan-800/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                      onClick={() => setShowDeleteModal(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      onClick={handleConfirmDelete}
                    >
                      Excluir
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal de atalhos de teclado */}
      <Transition appear show={showKeyboardShortcuts} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setShowKeyboardShortcuts(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 to-cyan-950 p-6 text-left align-middle shadow-xl transition-all border border-cyan-800/30">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-white flex items-center"
                  >
                    <span className="mr-2">⌨️</span>
                    Atalhos de Teclado
                  </Dialog.Title>
                  <div className="mt-4 space-y-4">
                    <div className="bg-cyan-900/40 rounded-md p-4 border border-cyan-800/30">
                      <h4 className="font-medium text-cyan-100 mb-2">Navegação</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex justify-between">
                          <span className="text-cyan-300">Alt + F</span>
                          <span className="text-white">Focar na busca</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-cyan-300">Alt + N</span>
                          <span className="text-white">Nova credencial</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-cyan-300">Alt + 1,2,3...</span>
                          <span className="text-white">Navegar para a página</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-cyan-900/40 rounded-md p-4 border border-cyan-800/30">
                      <h4 className="font-medium text-cyan-100 mb-2">Modais</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex justify-between">
                          <span className="text-cyan-300">ESC</span>
                          <span className="text-white">Fechar qualquer modal</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-cyan-300">Enter</span>
                          <span className="text-white">Confirmar formulário</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                      onClick={() => setShowKeyboardShortcuts(false)}
                    >
                      Entendi
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
} 