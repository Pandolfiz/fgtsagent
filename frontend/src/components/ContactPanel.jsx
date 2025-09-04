import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { 
  FaEye, 
  FaEdit, 
  FaFileAlt, 
  FaRedo, 
  FaPlus, 
  FaTimes,
  FaUser,
  FaPhone,
  FaIdCard,
  FaDollarSign,
  FaChartLine,
  FaHistory,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaWallet,
  FaCalculator,
  FaInfoCircle,
  FaTimesCircle,
  FaRegCopy
} from 'react-icons/fa';
// import { apiFetch } from '../utilities/apiFetch'; // ❌ Arquivo não existe

const ContactPanel = ({ 
  contact, 
  isOpen, 
  onClose, 
  onEditLead, 
  onCreateProposal, 
  onViewProposalHistory,
  onRepeatQuery,
  contactData, // ✅ ADICIONADO: Receber dados já carregados do Chat.jsx
  instances = [] // ✅ ADICIONADO: Receber dados das instâncias para buscar o nome
}) => {
  const [leadData, setLeadData] = useState(null);
  const [proposalData, setProposalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Estados para feedback de cópia
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Função para formatar moeda (igual ao Chat.jsx)
  const formataMoeda = useCallback((valor) => {
    if (!valor || valor === null || valor === undefined || valor === '') return null;
    
    // Se já é uma string formatada, retornar
    if (typeof valor === 'string' && valor.includes('R$')) return valor;
    
    // Converter para número
    const numero = typeof valor === 'string' ? parseFloat(valor.replace(/[^\d,.-]/g, '').replace(',', '.')) : valor;
    
    if (isNaN(numero)) return null;
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numero);
  }, []);

  // Função para formatar data
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Função para formatar data relativa
  const formatRelativeDate = useCallback((dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora mesmo';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInHours < 48) return 'Ontem';
    return formatDate(dateString);
  }, [formatDate]);

  // Função para obter status colorido
  const getStatusColor = useCallback((status) => {
    switch (status?.toLowerCase()) {
      case 'aprovado':
      case 'approved':
        return 'text-green-400';
      case 'pendente':
      case 'pending':
        return 'text-yellow-400';
      case 'rejeitado':
      case 'rejected':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }, []);

  // Função para obter o nome da instância (baseada no Chat_backup.jsx)
  const getContactInstanceName = useCallback((contact) => {
    if (!contact?.instance_id || !instances.length) return null;
    
    const instance = instances.find(inst => inst.id === contact.instance_id);
    return instance?.agent_name || instance?.instance_name || null;
  }, [instances]);

  // Mapeamento de status para versões mais legíveis (igual ao Chat.jsx)
  const getStatusLabel = useCallback((status) => {
    const statusMap = {
      'aprovada': 'Aprovada',
      'em_analise': 'Em Análise',
      'rejeitada': 'Rejeitada',
      'pendente': 'Pendente',
      'paid': 'Paga',
      'processing': 'Processando',
      'canceled': 'Cancelada',
      'failed': 'Falhou'
    };
    return statusMap[status] || status || 'Pendente';
  }, []);

  // Mapeamento de status para classes de estilo (igual ao Chat.jsx)
  const getStatusClass = useCallback((status) => {
    const classMap = {
      'aprovada': 'bg-emerald-600/50 text-emerald-200',
      'em_analise': 'bg-amber-600/50 text-amber-200',
      'rejeitada': 'bg-red-600/50 text-red-200',
      'pendente': 'bg-blue-600/50 text-blue-200',
      'paid': 'bg-emerald-600/50 text-emerald-200',
      'processing': 'bg-amber-600/50 text-amber-200',
      'canceled': 'bg-red-600/50 text-red-200',
      'failed': 'bg-red-600/50 text-red-200'
    };
    return classMap[status] || 'bg-blue-600/50 text-blue-200';
  }, []);

  // Usar dados já carregados do Chat.jsx em vez de fazer nova requisição
  useEffect(() => {
    if (contactData && contactData.leadId) {
      // Converter dados do contactData para o formato esperado pelo ContactPanel
      const leadData = {
        id: contactData.leadId,
        cpf: contactData.cpf,
        email: contactData.email,
        balance: contactData.saldo,
        simulation: contactData.simulado,
        balance_error: contactData.erroConsulta,
        proposal_id: contactData.proposta,
        proposal_error: contactData.erroProposta,
        proposal_status: contactData.statusProposta,
        proposal_value: contactData.valorProposta,
        proposal_link: contactData.linkFormalizacao,
        pix_key: contactData.chavePix,
        updated_at: new Date().toISOString() // Usar data atual como fallback
      };
      
      setLeadData(leadData);
      setError(null);
      setIsInitialLoad(false);
      
      // Se há dados de proposta, configurar proposalData
      if (contactData.proposta) {
        setProposalData({
          id: contactData.proposta,
          status: contactData.statusProposta,
          value: contactData.valorProposta,
          error_reason: contactData.erroProposta,
          'Link de formalização': contactData.linkFormalizacao,
          created_at: new Date().toISOString()
        });
      } else {
        setProposalData(null);
      }
    } else if (contact && !contactData?.leadId) {
      // Se não há dados do lead, manter isInitialLoad como true
      // Isso evita mostrar a versão incompleta
      setLeadData(null);
      setProposalData(null);
      setError(null);
      setIsInitialLoad(true); // Manter como true para não renderizar
    }
    
    // Se não há contato, limpar estado imediatamente
    if (!contact) {
      setLeadData(null);
      setProposalData(null);
      setError(null);
      setIsInitialLoad(false);
    }
  }, [contactData, contact?.id]);

  const handleRepeatQuery = useCallback(async () => {
    if (!leadData) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/leads/${leadData.id}/query`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        // Chamar callback para recarregar dados no Chat.jsx
        if (onRepeatQuery) {
          onRepeatQuery(leadData);
        }
      } else {
        setError('Erro ao repetir consulta');
      }
    } catch (err) {
      console.error('Erro ao repetir consulta:', err);
      setError('Erro ao repetir consulta');
    } finally {
      setLoading(false);
    }
  }, [leadData, onRepeatQuery]);

  console.log('[DEBUG-CONTACT-PANEL] 🔍 Estado do componente:', {
    isOpen,
    contact: !!contact,
    contactData: !!contactData,
    contactDataLeadId: contactData?.leadId,
    isInitialLoad,
    leadData: !!leadData
  });

  if (!isOpen || !contact) {
    console.log('[DEBUG-CONTACT-PANEL] ❌ Não renderizando: isOpen =', isOpen, 'contact =', !!contact);
    return null;
  }

  console.log('[DEBUG-CONTACT-PANEL] ✅ Renderizando painel lateral - simplificado');

  // Valores formatados com nossa função robusta (igual ao Chat.jsx)
  const saldoFormatado = formataMoeda(contactData.saldo);
  const simuladoFormatado = formataMoeda(contactData.simulado);
  const valorPropostaFormatado = formataMoeda(contactData.valorProposta);

  return (
    <div className="flex-shrink-0 flex-grow-0 min-w-0 w-80 border-l border-gray-600/30 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 border-b border-gray-600/30 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Dados do Cliente</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700/50"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Informações Básicas do Contato */}
        <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-600/20 hover:bg-gray-800/60 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white flex items-center">
              <FaUser className="w-4 h-4 mr-2 text-cyan-400" />
              Informações Básicas
            </h4>
            {contactData?.leadId && (
              <button
                onClick={() => onEditLead && onEditLead({ id: contactData.leadId, name: contact.name, phone: contact.phone, cpf: contactData.cpf })}
                className="text-cyan-400 hover:text-cyan-300 p-2 rounded-lg hover:bg-cyan-900/20 transition-colors"
                title="Editar Lead"
              >
                <FaEdit className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {/* Nome */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Nome</label>
              <p className="text-white text-sm font-medium">{contact.push_name || contact.name || 'Nome não disponível'}</p>
            </div>

            {/* CPF */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">CPF</label>
              <p className="text-white text-sm font-mono">
                {contactData?.cpf || contact?.cpf || contact?.lead_cpf }
              </p>
            </div>

            {/* WhatsApp Instance */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Instância WhatsApp</label>
              <p className="text-white text-sm">
                {getContactInstanceName(contact) || 
                 (contact.instance_id ? `Instância ${contact.instance_id}` : 'Não definida')}
              </p>
            </div>
          </div>
        </div>

        
        {/* Card combinado: Saldo FGTS e Simulação */}
        <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-600/20 hover:bg-gray-800/60 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white flex items-center">
              <FaWallet className="text-cyan-400 mr-2" />
              Simulação
            </h4>
            {contactData?.leadId && (
              <button
                onClick={() => onRepeatQuery && onRepeatQuery({ id: contactData.leadId, name: contact.name, phone: contact.phone })}
                className="text-cyan-400 hover:text-cyan-300 p-2 rounded-lg hover:bg-cyan-900/20 transition-colors"
                title="Repetir Consulta"
              >
                <FaRedo className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {contactData?.erroConsulta ? (
            /* Mensagem de erro unificada */
            <div className="bg-red-900/30 p-3 rounded-md border border-red-600/50">
              <div className="flex items-start">
                <FaTimesCircle className="text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-200 mb-1">Erro na consulta</p>
                  <p className="text-xs text-red-300">{contactData.erroConsulta}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* Saldo FGTS */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Saldo FGTS</label>
                {contactData?.saldo === null ? (
                  <div className="py-2 text-gray-400">
                    <div className="h-4 bg-gray-600/30 rounded animate-pulse"></div>
                  </div>
                ) : saldoFormatado ? (
                  <p className="text-lg font-bold text-white">
                    {saldoFormatado}
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm">Não disponível</p>
                )}
              </div>
              
              {/* Simulação */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Simulação</label>
                {contactData?.simulado === null ? (
                  <div className="py-2 text-gray-400">
                    <div className="h-4 bg-gray-600/30 rounded animate-pulse"></div>
                  </div>
                ) : simuladoFormatado ? (
                  <p className="text-lg font-bold text-white">
                    {simuladoFormatado}
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm">Não disponível</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Seção de Proposta */}
        <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-600/20 hover:bg-gray-800/60 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <FaFileAlt className="text-cyan-400 mr-2" />
              Proposta
              {contactData?.statusProposta && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${getStatusClass(contactData.statusProposta)}`}>
                  {getStatusLabel(contactData.statusProposta)}
                </span>
              )}
            </h4>
            {contactData?.leadId && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onCreateProposal && onCreateProposal({ id: contactData.leadId, name: contact.name, phone: contact.phone, cpf: contactData.cpf })}
                  className="text-cyan-400 hover:text-cyan-300 p-2 rounded-lg hover:bg-cyan-900/20 transition-colors"
                  title="Nova Proposta"
                >
                  <FaPlus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onViewProposalHistory && onViewProposalHistory({ id: contactData.leadId, name: contact.name })}
                  className="text-cyan-400 hover:text-cyan-300 p-2 rounded-lg hover:bg-cyan-900/20 transition-colors"
                  title="Histórico de Propostas"
                >
                  <FaHistory className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          {contactData.proposta === null && !contactData.erroConsulta ? (
            <div className="py-2 text-gray-400">
              <div className="h-4 bg-gray-600/30 rounded animate-pulse mb-2"></div>
              <div className="h-3 bg-gray-600/30 rounded animate-pulse w-2/3"></div>
            </div>
          ) : contactData.proposta ? (
            <>
              {/* Linha com ID e botão de copiar */}
              <div className="mb-3 flex items-center">
                <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded-lg border border-gray-600/30 w-full">
                  <span className="text-xs text-gray-400">Id</span>
                  <span className="text-xs font-mono text-white break-all">
                    {contactData.proposta}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(contactData.proposta);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 1500);
                    }}
                    className="ml-1 text-cyan-400 hover:text-cyan-300 p-1"
                    title="Copiar Id da proposta"
                    aria-label="Copiar ID da proposta"
                  >
                    <FaRegCopy />
                  </button>
                  {copiedId && <span className="text-xs text-emerald-300 ml-1">Copiado!</span>}
                </div>
              </div>
              
              {/* Cards PIX e Valor */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* Card PIX */}
                {contactData.chavePix && (
                  <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600/30 flex flex-col justify-between">
                    <div className="flex items-center mb-1">
                      <FaWallet className="text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-xs font-semibold text-cyan-200 mr-2">Chave PIX</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(contactData.chavePix);
                          setCopiedPix(true);
                          setTimeout(() => setCopiedPix(false), 1500);
                        }}
                        className="ml-1 text-cyan-200 hover:text-cyan-100 p-1"
                        title="Copiar chave PIX"
                        aria-label="Copiar chave PIX"
                      >
                        <FaRegCopy />
                      </button>
                      {copiedPix && <span className="text-xs text-emerald-300 ml-1">Copiado!</span>}
                    </div>
                    <span className="text-xs text-cyan-300 break-all font-mono">
                      {contactData.chavePix || ''}
                    </span>
                  </div>
                )}
                
                {/* Card Valor */}
                {valorPropostaFormatado && (
                  <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600/30 flex flex-col justify-between">
                    <span className="text-xs font-semibold text-cyan-200 mb-1">Valor</span>
                    <span className="text-lg font-bold text-cyan-300">{valorPropostaFormatado}</span>
                  </div>
                )}
              </div>
                
              {/* Link de Formalização */}
              {contactData.linkFormalizacao && (
                <div className="mb-3 bg-gray-700/50 p-3 rounded-lg border border-gray-600/30 flex items-center">
                  <FaFileAlt className="text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-cyan-200 mb-1">Link de Formalização</p>
                    <a
                      href={contactData.linkFormalizacao}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-300 underline hover:text-cyan-200 break-all"
                    >
                      {contactData.linkFormalizacao}
                    </a>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(contactData.linkFormalizacao);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 1500);
                    }}
                    className="ml-2 text-cyan-200 hover:text-cyan-100 p-1"
                    title="Copiar link de formalização"
                    aria-label="Copiar link de formalização"
                  >
                    <FaRegCopy />
                  </button>
                  {copiedLink && <span className="text-xs text-emerald-300 ml-1">Copiado!</span>}
                </div>
              )}
              
              {/* Descrição do Status */}
              {contactData.descricaoStatus && !/^Status da proposta:/i.test(contactData.descricaoStatus) && (
                <div className="mt-2 bg-gray-700/50 p-3 rounded-lg border border-gray-600/30">
                  <div className="flex items-start">
                    <FaInfoCircle className="text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-200">{contactData.descricaoStatus}</p>
                  </div>
                </div>
              )}
              
              {/* Erro da Proposta */}
              {contactData.erroProposta && (
                <div className="mt-2 bg-red-900/30 p-3 rounded-lg border border-red-600/50">
                  <div className="flex items-start">
                    <FaTimesCircle className="text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-200">{contactData.erroProposta}</p>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

      </div>
    </div>
  );
};

export default ContactPanel;