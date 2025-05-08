import React, { useState, useEffect } from 'react';
import { api, EvolutionCredential } from '../../utilities/api';
import { FaWhatsapp, FaEdit, FaTrash, FaSync, FaPlus, FaCircle, FaCheck, FaExclamation, FaQuestionCircle, FaHourglass } from 'react-icons/fa';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import Navbar from '../Navbar';
import { QRCodeSVG } from 'qrcode.react';

export function EvolutionCredentialsPage() {
  const [credentials, setCredentials] = useState<EvolutionCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<EvolutionCredential | null>(null);
  // Estado para exibir modal de QR Code
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrData, setQrData] = useState<{ base64?: string; code?: string; pairingCode?: string } | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    phone: '',
    instance_name: '',
    agent_name: ''
  });

  // Wizard: etapas do formulário de criação
  const [step, setStep] = useState(1);
  const [connectionType, setConnectionType] = useState<'ads' | 'agent' | null>(null);

  // Carregar credenciais
  const loadCredentials = async () => {
    setLoading(true);
    try {
      const response = await api.evolution.getAll();
      if (response.success && response.data) {
        setCredentials(response.data);
      } else {
        setError(response.message || 'Erro ao carregar credenciais');
      }
    } catch (err) {
      setError('Erro ao carregar credenciais: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadCredentials();
  }, []);

  // Resetar form para adicionar nova credencial
  const handleAddNew = () => {
    setFormData({
      phone: '',
      instance_name: '',
      agent_name: ''
    });
    setShowAddModal(true);
  };

  // Preparar form para editar credencial existente
  const handleEdit = (credential: EvolutionCredential) => {
    setSelectedCredential(credential);
    setFormData({
      phone: credential.phone || '',
      instance_name: credential.instance_name || '',
      agent_name: credential.agent_name || ''
    });
    setShowEditModal(true);
  };

  // Preparar confirmação para excluir credencial
  const handleDelete = (credential: EvolutionCredential) => {
    setSelectedCredential(credential);
    setShowDeleteModal(true);
  };

  // Atualizar campos do formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Salvar nova credencial
  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Criar registro de credencial
      const createRes = await api.evolution.create(formData);
      if (createRes.success && createRes.data) {
        // Fechar modal de criação
        setShowAddModal(false);
        // Criar instância na Evolution API
        const setupRes = await api.evolution.setupInstance(createRes.data.id);
        if (setupRes.success && setupRes.data) {
          // Atualizar lista de credenciais
          setCredentials(prev => [...prev, setupRes.data!]);
          // Exibir QR Code para configuração
          const qrRes = await api.evolution.getQrCode(setupRes.data.id);
          if (qrRes.success && qrRes.data) {
            setQrData(qrRes.data);
            setSelectedCredential(setupRes.data!);
            setShowQrModal(true);
          }
        } else {
          setError(setupRes.message || 'Erro ao configurar instância');
        }
      } else {
        setError(createRes.message || 'Erro ao salvar credencial');
      }
    } catch (err) {
      setError('Erro ao salvar credencial: ' + (err instanceof Error ? err.message : String(err)));
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
      const response = await api.evolution.update(selectedCredential.id, formData);
      if (response.success && response.data) {
        setCredentials(prev => 
          prev.map(cred => cred.id === selectedCredential.id ? response.data! : cred)
        );
        setShowEditModal(false);
      } else {
        setError(response.message || 'Erro ao atualizar credencial');
      }
    } catch (err) {
      setError('Erro ao atualizar credencial: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Confirmar exclusão de credencial
  const handleConfirmDelete = async () => {
    if (!selectedCredential) return;
    
    setLoading(true);
    try {
      const response = await api.evolution.delete(selectedCredential.id);
      if (response.success) {
        setCredentials(prev => prev.filter(cred => cred.id !== selectedCredential.id));
        setShowDeleteModal(false);
      } else {
        setError(response.message || 'Erro ao excluir credencial');
      }
    } catch (err) {
      setError('Erro ao excluir credencial: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Configurar instância WhatsApp
  const handleSetupInstance = async (credential: EvolutionCredential) => {
    setLoading(true);
    try {
      const response = await api.evolution.setupInstance(credential.id);
      if (response.success && response.data) {
        setCredentials(prev => 
          prev.map(cred => cred.id === credential.id ? response.data! : cred)
        );
      } else {
        setError(response.message || 'Erro ao configurar instância');
      }
    } catch (err) {
      setError('Erro ao configurar instância: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Reiniciar instância WhatsApp
  const handleRestartInstance = async (credential: EvolutionCredential) => {
    setLoading(true);
    try {
      const response = await api.evolution.restartInstance(credential.id);
      if (response.success) {
        await loadCredentials(); // Recarregar todas as credenciais para ter status atualizado
      } else {
        setError(response.message || 'Erro ao reiniciar instância');
      }
    } catch (err) {
      setError('Erro ao reiniciar instância: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Desconectar instância WhatsApp
  const handleDisconnect = async (credential: EvolutionCredential) => {
    setLoading(true);
    try {
      const response = await api.evolution.disconnect(credential.id);
      if (response.success) {
        await loadCredentials();
      } else {
        setError(response.message || 'Erro ao desconectar instância');
      }
    } catch (err) {
      setError('Erro ao desconectar instância: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Exibir QR Code para reconectar instância
  const handleShowQrCode = async (credential: EvolutionCredential) => {
    setLoading(true);
    try {
      const response = await api.evolution.getQrCode(credential.id);
      if (response.success && response.data) {
        setQrData(response.data);
        setSelectedCredential(credential);
        setShowQrModal(true);
      } else {
        setError(response.message || 'Erro ao obter QR Code');
      }
    } catch (err) {
      setError('Erro ao obter QR Code: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Renderizar badge de status com a cor apropriada
  const StatusBadge = ({ status, size = 'sm' }: { status?: string, size?: 'sm' | 'lg' }) => {
    if (!status) return null;
    
    const getStatusConfig = (status: string) => {
      switch (status.toLowerCase()) {
        case 'connected':
          return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Conectado' };
        case 'connecting':
          return { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Conectando' };
        case 'disconnected':
          return { color: 'bg-red-100 text-red-800 border-red-200', label: 'Desconectado' };
        case 'open':
          return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Conectado' };
        default:
          return { color: 'bg-gray-100 text-gray-800 border-gray-200', label: status };
      }
    };
    
    const config = getStatusConfig(status);
    const classes = size === 'sm' 
      ? 'py-1 px-2 text-xs rounded'
      : 'py-1.5 px-3 text-sm rounded-md';
    
    return (
      <span className={`${config.color} ${classes} font-medium border`}>
        {config.label}
      </span>
    );
  };

  const getStatusDisplay = (status?: string) => {
    if (!status) return <FaQuestionCircle className="text-gray-400" />;
    
    switch (status.toLowerCase()) {
      case 'connected':
      case 'open':
        return <FaCheck className="text-green-500" />;
      case 'connecting':
        return <FaHourglass className="text-blue-500" />;
      case 'disconnected':
        return <FaExclamation className="text-red-500" />;
      default:
        return <FaQuestionCircle className="text-gray-400" />;
    }
  };

  // Obter ícone baseado no status
  const StatusIcon = ({ status }: { status?: string }) => {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
        {getStatusDisplay(status)}
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="p-6 bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
          <h1 className="text-3xl font-bold mb-4 lg:mb-0 bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-cyan-200 to-blue-300">
            Credenciais WhatsApp
          </h1>
          <button
            onClick={handleAddNew}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 flex items-center"
          >
            <FaPlus className="mr-2" /> Nova Credencial
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-600/20 backdrop-blur-sm border border-red-500 rounded-lg shadow-sm text-red-200">
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-xs text-red-300 hover:text-red-100"
            >
              Fechar
            </button>
          </div>
        )}

        {loading && credentials.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : credentials.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-8 text-center">
            <FaWhatsapp className="mx-auto text-4xl text-cyan-400 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Nenhuma credencial configurada</h3>
            <p className="text-cyan-100 mb-6">Adicione sua primeira credencial do WhatsApp para começar a usar a integração.</p>
            <button
              onClick={handleAddNew}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 flex items-center mx-auto"
            >
              <FaPlus className="mr-2" /> Adicionar Credencial
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {credentials.map((credential) => (
              <div
                key={credential.id}
                className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg border border-cyan-800/30 hover:border-cyan-600/50 transition-all duration-300 overflow-hidden"
              >
                <div className="p-4 border-b border-cyan-800/30">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-600/20 text-emerald-400 mr-3">
                        <FaWhatsapp className="text-xl" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{credential.agent_name || credential.instance_name || 'Sem nome'}</h3>
                        <p className="text-cyan-300 text-sm">{credential.phone || 'Sem número'}</p>
                      </div>
                    </div>
                    <StatusBadge status={credential.status} size="lg" />
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-xs text-cyan-300 mb-1">Instância</p>
                      <p className="font-medium text-white truncate">{credential.instance_name || '-'}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-xs text-cyan-300 mb-1">ID</p>
                      <p className="font-medium text-white truncate">{credential.id}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-between">
                    <button
                      onClick={() => handleEdit(credential)}
                      className="px-3 py-1.5 rounded-md bg-white/10 text-white text-sm hover:bg-white/20 transition-colors flex items-center"
                    >
                      <FaEdit className="mr-1" /> Editar
                    </button>
                    <button
                      onClick={() => handleRestartInstance(credential)}
                      className="px-3 py-1.5 rounded-md bg-white/10 text-white text-sm hover:bg-white/20 transition-colors flex items-center"
                    >
                      <FaSync className="mr-1" /> Reiniciar
                    </button>
                    <button
                      onClick={() => credential.status?.toLowerCase() === 'connected' || credential.status?.toLowerCase() === 'open'
                        ? handleDisconnect(credential)
                        : handleShowQrCode(credential)
                      }
                      className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                        credential.status?.toLowerCase() === 'connected' || credential.status?.toLowerCase() === 'open'
                          ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      }`}
                    >
                      {credential.status?.toLowerCase() === 'connected' || credential.status?.toLowerCase() === 'open'
                        ? 'Desconectar'
                        : 'Conectar'}
                    </button>
                    <button
                      onClick={() => handleDelete(credential)}
                      className="px-3 py-1.5 rounded-md bg-red-500/20 text-red-300 text-sm hover:bg-red-500/30 transition-colors flex items-center"
                    >
                      <FaTrash className="mr-1" /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Adição */}
        <Transition appear show={showAddModal} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setShowAddModal(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
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
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-cyan-900 to-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-cyan-100 mb-4"
                    >
                      Nova Credencial WhatsApp
                    </Dialog.Title>
                    <form onSubmit={handleSaveNew}>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Nome do Bot
                        </label>
                        <input
                          type="text"
                          name="agent_name"
                          value={formData.agent_name}
                          onChange={handleChange}
                          className="w-full p-2 rounded-md bg-slate-800 border border-cyan-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          placeholder="Ex: Bot de Atendimento"
                          required
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Nome da Instância
                        </label>
                        <input
                          type="text"
                          name="instance_name"
                          value={formData.instance_name}
                          onChange={handleChange}
                          className="w-full p-2 rounded-md bg-slate-800 border border-cyan-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          placeholder="Ex: atendimento1"
                          required
                        />
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Número de Telefone
                        </label>
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full p-2 rounded-md bg-slate-800 border border-cyan-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          placeholder="Ex: 5511999999999"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowAddModal(false)}
                          className="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-cyan-600 text-white hover:from-emerald-600 hover:to-cyan-700 transition-colors"
                          disabled={loading}
                        >
                          {loading ? 'Criando...' : 'Criar'}
                        </button>
                      </div>
                    </form>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Modal de Edição */}
        <Transition appear show={showEditModal} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setShowEditModal(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
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
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-cyan-900 to-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-cyan-100 mb-4"
                    >
                      Editar Credencial
                    </Dialog.Title>
                    <form onSubmit={handleUpdate}>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Nome do Bot
                        </label>
                        <input
                          type="text"
                          name="agent_name"
                          value={formData.agent_name}
                          onChange={handleChange}
                          className="w-full p-2 rounded-md bg-slate-800 border border-cyan-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          placeholder="Ex: Bot de Atendimento"
                          required
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Nome da Instância
                        </label>
                        <input
                          type="text"
                          name="instance_name"
                          value={formData.instance_name}
                          onChange={handleChange}
                          className="w-full p-2 rounded-md bg-slate-800 border border-cyan-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          placeholder="Ex: atendimento1"
                          required
                        />
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Número de Telefone
                        </label>
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full p-2 rounded-md bg-slate-800 border border-cyan-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          placeholder="Ex: 5511999999999"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowEditModal(false)}
                          className="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-cyan-600 text-white hover:from-emerald-600 hover:to-cyan-700 transition-colors"
                          disabled={loading}
                        >
                          {loading ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </form>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Modal de Exclusão */}
        <Transition appear show={showDeleteModal} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => setShowDeleteModal(false)}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
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
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-red-900 to-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-red-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-white mb-4"
                    >
                      Confirmar Exclusão
                    </Dialog.Title>
                    <div className="mb-6">
                      <p className="text-gray-300 mb-2">
                        Tem certeza que deseja excluir esta credencial?
                      </p>
                      <p className="text-white font-medium">
                        {selectedCredential?.agent_name || selectedCredential?.instance_name || 'Sem nome'}
                      </p>
                      <p className="text-red-300 text-sm mt-4">
                        Esta ação não pode ser desfeita e removerá permanentemente esta instância do WhatsApp.
                      </p>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(false)}
                        className="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                        disabled={loading}
                      >
                        {loading ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Modal de QR Code */}
        <Transition appear show={showQrModal} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => setShowQrModal(false)}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
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
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-cyan-900 to-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-cyan-100 mb-4"
                    >
                      Conectar WhatsApp
                    </Dialog.Title>
                    <div className="flex flex-col items-center mb-6">
                      {qrData?.base64 ? (
                        <div className="bg-white p-4 rounded-lg shadow-inner">
                          <img
                            src={`data:image/png;base64,${qrData.base64}`}
                            alt="QR Code para conexão"
                            className="w-64 h-64"
                          />
                        </div>
                      ) : qrData?.code ? (
                        <div className="bg-white p-4 rounded-lg shadow-inner">
                          <QRCodeSVG value={qrData.code} size={256} />
                        </div>
                      ) : (
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
                      )}
                      
                      {qrData?.pairingCode && (
                        <div className="mt-4 text-center">
                          <p className="text-white">Ou use o código de pareamento:</p>
                          <p className="text-xl font-mono font-bold text-cyan-300 mt-2 tracking-widest bg-slate-800 p-2 rounded">
                            {qrData.pairingCode}
                          </p>
                        </div>
                      )}
                      
                      <p className="text-gray-300 text-sm mt-4 text-center">
                        Escaneie este QR Code com seu WhatsApp para conectar o número{' '}
                        <span className="font-medium text-white">{selectedCredential?.phone || ''}</span>
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => setShowQrModal(false)}
                        className="px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-cyan-600 text-white hover:from-emerald-600 hover:to-cyan-700 transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>
    </>
  );
} 