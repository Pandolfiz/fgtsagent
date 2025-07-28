import React, { useEffect, useState, useRef, Fragment } from 'react'
import { 
  FaSearch, 
  FaFilter, 
  FaSort, 
  FaEdit, 
  FaFileAlt, 
  FaRedo, 
  FaEye,
  FaSpinner,
  FaTimes,
  FaCheck,
  FaExclamationTriangle
} from 'react-icons/fa'
import { Dialog, Transition } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { Listbox } from '@headlessui/react'
import Navbar from '../components/Navbar'
import supabase from '../lib/supabaseClient'

// Remover o componente Portal customizado

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [filteredLeads, setFilteredLeads] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortField, setSortField] = useState('updated_at')
  const [sortDirection, setSortDirection] = useState('desc')
  
  // Estados para modais
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [proposalModalOpen, setProposalModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [editingLead, setEditingLead] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  
  // Estados para repetir consulta
  const [repeatingQuery, setRepeatingQuery] = useState(null)
  const [repeatError, setRepeatError] = useState('')

  // Opções de status para filtro
  const statusOptions = [
    { value: '', label: 'Todos os Status' },
    { value: 'pre_consulta', label: 'Pré Consulta' },
    { value: 'simulacao', label: 'Simulação' },
    { value: 'proposta_criada', label: 'Proposta Criada' },
    { value: 'proposta_pendente', label: 'Proposta Pendente' },
    { value: 'proposta_cancelada', label: 'Proposta Cancelada' },
    { value: 'proposta_paga', label: 'Proposta Paga' }
  ]

  // Opções de ordenação
  const sortOptions = [
    { value: 'name', label: 'Nome' },
    { value: 'cpf', label: 'CPF' },
    { value: 'balance', label: 'Saldo Consulta' },
    { value: 'simulation', label: 'Saldo Simulação' },
    { value: 'updated_at', label: 'Data Última Interação' },
    { value: 'proposal_value', label: 'Valor Proposta' }
  ]

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsAuthenticated(true)
          fetchLeads()
        } else {
          window.location.href = '/login'
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error)
        window.location.href = '/login'
      }
    }
    checkAuth()
  }, [])

  const fetchLeads = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Token de acesso não encontrado')
      }
      
      const response = await fetch('/api/leads/complete', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Erro na resposta:', errorText)
        throw new Error(`Erro ao buscar leads: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setLeads(data.data)
        setFilteredLeads(data.data)
      } else {
        console.error('Erro na resposta:', data.message)
      }
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Função para determinar o status do lead baseado nos dados
  const getLeadStatus = (lead) => {
    if (lead.proposal_status === 'paid') return 'proposta_paga'
    if (lead.proposal_status === 'cancelled') return 'proposta_cancelada'
    if (lead.proposal_status === 'pending') return 'proposta_pendente'
    if (lead.proposal_status === 'formalization') return 'proposta_criada'
    if (lead.simulation && lead.simulation > 0) return 'simulacao'
    if (lead.balance && lead.balance > 0) return 'pre_consulta'
    return 'pre_consulta'
  }

  // Função para renderizar badge de status
  const StatusBadge = ({ status }) => {
    const statusMap = {
      'pre_consulta': 'bg-gray-100 text-gray-800 border-gray-200',
      'simulacao': 'bg-blue-100 text-blue-800 border-blue-200',
      'proposta_criada': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'proposta_pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'proposta_cancelada': 'bg-red-100 text-red-800 border-red-200',
      'proposta_paga': 'bg-emerald-100 text-emerald-800 border-emerald-200'
    }
    
    const labelMap = {
      'pre_consulta': 'Pré Consulta',
      'simulacao': 'Simulação',
      'proposta_criada': 'Proposta Criada',
      'proposta_pendente': 'Proposta Pendente',
      'proposta_cancelada': 'Proposta Cancelada',
      'proposta_paga': 'Proposta Paga'
    }
    
    const classes = statusMap[status] || statusMap['pre_consulta']
    const label = labelMap[status] || 'Pré Consulta'
    
    return (
      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${classes} inline-block`}>
        {label}
      </span>
    )
  }

  // Função para formatar moeda
  const formatCurrency = (value) => {
    if (!value || value === 0) return '-'
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value)
  }

  // Função para formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('pt-BR')
  }

  // Função para filtrar e ordenar leads
  useEffect(() => {
    let filtered = [...leads]

    // Aplicar filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(lead => 
        lead.name?.toLowerCase().includes(term) ||
        lead.cpf?.includes(term) ||
        lead.phone?.includes(term)
      )
    }

    // Aplicar filtro de status
    if (statusFilter) {
      filtered = filtered.filter(lead => getLeadStatus(lead) === statusFilter)
    }

    // Aplicar ordenação
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      // Tratamento especial para campos de data
      if (sortField === 'updated_at') {
        aValue = new Date(aValue || 0)
        bValue = new Date(bValue || 0)
      }

      // Tratamento especial para campos numéricos
      if (['balance', 'simulation', 'proposal_value'].includes(sortField)) {
        aValue = parseFloat(aValue || 0)
        bValue = parseFloat(bValue || 0)
      }

      // Tratamento especial para campos de texto
      if (['name', 'cpf'].includes(sortField)) {
        aValue = (aValue || '').toLowerCase()
        bValue = (bValue || '').toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredLeads(filtered)
  }, [leads, searchTerm, statusFilter, sortField, sortDirection])

  // Função para abrir modal de edição
  const openEditModal = (lead) => {
    setSelectedLead(lead)
    setEditingLead({
      name: lead.name || '',
      cpf: lead.cpf || '',
      phone: lead.phone || '',
      email: lead.email || ''
    })
    setSaveError('')
    setEditModalOpen(true)
  }

  // Função para salvar dados do lead
  const saveLeadData = async () => {
    try {
      setIsSaving(true)
      setSaveError('')

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Token de acesso não encontrado')
      }

      const response = await fetch(`/api/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingLead)
      })

      const data = await response.json()

      if (data.success) {
        // Atualizar a lista de leads
        setLeads(prev => prev.map(lead => 
          lead.id === selectedLead.id 
            ? { ...lead, ...editingLead }
            : lead
        ))
        setEditModalOpen(false)
      } else {
        setSaveError(data.message || 'Erro ao salvar dados')
      }
    } catch (error) {
      setSaveError('Erro ao salvar dados: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Função para repetir consulta
  const repeatQuery = async (leadId) => {
    try {
      setRepeatingQuery(leadId)
      setRepeatError('')

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Token de acesso não encontrado')
      }

      const response = await fetch(`/api/leads/${leadId}/repeat-query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        // Recarregar a lista de leads
        await fetchLeads()
      } else {
        setRepeatError(data.message || 'Erro ao repetir consulta')
      }
    } catch (error) {
      setRepeatError('Erro ao repetir consulta: ' + error.message)
    } finally {
      setRepeatingQuery(null)
    }
  }

  // Função para alternar direção da ordenação
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="p-6 bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-6">
              {/* Skeleton para título */}
              <div className="h-8 bg-gray-200/20 rounded-lg w-48 animate-pulse" />
              {/* Skeleton para filtros */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200/20 rounded-lg animate-pulse" />
                ))}
              </div>
              {/* Skeleton para tabela */}
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200/20 rounded animate-pulse w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950">
          <div className="text-red-400 text-xl">Não autenticado</div>
        </div>
      </>
    )
  }

  // Debug: mostrar informações na tela
  if (leads.length === 0 && !isLoading) {
    return (
      <>
        <Navbar />
        <div className="p-6 bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Leads</h1>
              <p className="text-cyan-200">Gerencie todos os seus leads em um só lugar</p>
    
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 text-center">
              <p className="text-white text-lg">Nenhum lead encontrado</p>

              <button 
                onClick={() => fetchLeads()}
                className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
              >
                Tentar carregar novamente
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="p-6 bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen leads-page">
        <div className="w-full">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Leads</h1>
          <p className="text-cyan-200">Gerencie todos os seus leads em um só lugar</p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total de Leads */}
          <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-700/30">
            <div className="text-3xl font-bold text-white mb-2">
              {leads.length}
            </div>
            <div className="text-cyan-200 text-sm font-medium">
              Total de Leads
            </div>
          </div>

          {/* Propostas Pagas */}
          <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 backdrop-blur-sm rounded-lg p-6 border border-emerald-700/30">
            <div className="text-3xl font-bold text-white mb-2">
              {leads.filter(lead => getLeadStatus(lead) === 'proposta_paga').length}
            </div>
            <div className="text-emerald-200 text-sm font-medium">
              Propostas Pagas
            </div>
          </div>

          {/* Propostas Pendentes */}
          <div className="bg-gradient-to-br from-yellow-900/50 to-amber-900/50 backdrop-blur-sm rounded-lg p-6 border border-yellow-700/30">
            <div className="text-3xl font-bold text-white mb-2">
              {leads.filter(lead => getLeadStatus(lead) === 'proposta_pendente').length}
            </div>
            <div className="text-yellow-200 text-sm font-medium">
              Propostas Pendentes
            </div>
          </div>

          {/* Com Erros */}
          <div className="bg-gradient-to-br from-red-900/50 to-pink-900/50 backdrop-blur-sm rounded-lg p-6 border border-red-700/30">
            <div className="text-3xl font-bold text-white mb-2">
              {leads.filter(lead => lead.error_reason && lead.error_reason.trim() !== '').length}
            </div>
            <div className="text-red-200 text-sm font-medium">
              Com Erros
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6 relative z-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-300" />
              <input
                type="text"
                placeholder="Buscar por nome, CPF ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-transparent backdrop-blur border border-cyan-500 text-cyan-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/60 transition-colors duration-200"
              />
            </div>

            {/* Filtro de Status */}
            <Listbox value={statusFilter} onChange={setStatusFilter}>
              <div className="relative">
                <Listbox.Button className="w-full px-3 py-2 rounded-lg bg-transparent backdrop-blur border border-cyan-500 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 transition-colors duration-200 shadow-inner flex items-center justify-between">
                  {statusOptions.find(opt => opt.value === statusFilter)?.label || 'Todos os Status'}
                  <ChevronUpDownIcon className="w-5 h-5 text-cyan-300 ml-2" />
                </Listbox.Button>
                <Listbox.Options className="absolute z-[99999] w-full mt-1 rounded-lg bg-cyan-950 border border-cyan-700 shadow-xl backdrop-blur-md focus:outline-none max-h-60 overflow-auto">
                  {statusOptions.map(option => (
                    <Listbox.Option
                      key={option.value}
                      value={option.value}
                      className={({ active, selected }) =>
                        `cursor-pointer select-none px-4 py-2 text-base rounded-lg transition-colors duration-100 
                        ${selected ? 'bg-cyan-700/60 text-white font-semibold' : ''}
                        ${active && !selected ? 'bg-cyan-800/80 text-cyan-100' : ''}`
                      }
                    >
                      {option.label}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>

            {/* Ordenação */}
            <Listbox value={sortField} onChange={setSortField}>
              <div className="relative">
                <Listbox.Button className="w-full px-3 py-2 rounded-lg bg-transparent backdrop-blur border border-cyan-500 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 transition-colors duration-200 shadow-inner flex items-center justify-between">
                  <span>Ordenar por: {sortOptions.find(opt => opt.value === sortField)?.label}</span>
                  <FaSort className="w-4 h-4 text-cyan-300 ml-2" />
                </Listbox.Button>
                <Listbox.Options className="absolute z-[99999] w-full mt-1 rounded-lg bg-cyan-950 border border-cyan-700 shadow-xl backdrop-blur-md focus:outline-none max-h-60 overflow-auto">
                  {sortOptions.map(option => (
                    <Listbox.Option
                      key={option.value}
                      value={option.value}
                      className={({ active, selected }) =>
                        `cursor-pointer select-none px-4 py-2 text-base rounded-lg transition-colors duration-100 
                        ${selected ? 'bg-cyan-700/60 text-white font-semibold' : ''}
                        ${active && !selected ? 'bg-cyan-800/80 text-cyan-100' : ''}`
                      }
                    >
                      {option.label}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
          </div>
        </div>

        {/* Tabela de Leads */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden relative z-10">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-white">
              <thead className="bg-gray-900/30 text-white">
                <tr>
                  <th className="px-4 py-3 font-medium text-white cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => toggleSort('name')}>
                    <div className="flex items-center gap-2">
                      Nome
                      {sortField === 'name' && (
                        <FaSort className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium text-white cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => toggleSort('cpf')}>
                    <div className="flex items-center gap-2">
                      CPF
                      {sortField === 'cpf' && (
                        <FaSort className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium text-white cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => toggleSort('balance')}>
                    <div className="flex items-center gap-2">
                      Saldo Consulta
                      {sortField === 'balance' && (
                        <FaSort className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium text-white cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => toggleSort('simulation')}>
                    <div className="flex items-center gap-2">
                      Saldo Simulação
                      {sortField === 'simulation' && (
                        <FaSort className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium text-white cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => toggleSort('updated_at')}>
                    <div className="flex items-center gap-2">
                      Última Interação
                      {sortField === 'updated_at' && (
                        <FaSort className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium text-white">Status</th>
                  <th className="px-4 py-3 font-medium text-white cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => toggleSort('proposal_value')}>
                    <div className="flex items-center gap-2">
                      Proposta
                      {sortField === 'proposal_value' && (
                        <FaSort className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium text-white">Erro</th>
                  <th className="px-4 py-3 font-medium text-white">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, index) => (
                  <tr 
                    key={lead.id} 
                    className={`border-b border-gray-700/30 hover:bg-white/5 transition-colors ${index === filteredLeads.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-4 py-3 text-white">{lead.name || '-'}</td>
                    <td className="px-4 py-3 text-white">{lead.cpf || '-'}</td>
                    <td className="px-4 py-3 text-white">{formatCurrency(lead.balance)}</td>
                    <td className="px-4 py-3 text-white">{formatCurrency(lead.simulation)}</td>
                    <td className="px-4 py-3 text-white">{formatDate(lead.updated_at)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={getLeadStatus(lead)} />
                    </td>
                    <td className="px-4 py-3 text-white">
                      {lead.proposal_value ? formatCurrency(lead.proposal_value) : '-'}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {lead.error_reason ? (
                        <span className="text-red-400 text-sm">{lead.error_reason}</span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button 
                          className="p-1 rounded bg-cyan-700/70 hover:bg-cyan-500 transition-colors" 
                          title="Editar dados pessoais"
                          onClick={() => openEditModal(lead)}
                        >
                          <FaEdit className="w-4 h-4 text-white" />
                        </button>
                        
                        {lead.proposal_id && (
                          <button 
                            className="p-1 rounded bg-blue-700/70 hover:bg-blue-500 transition-colors" 
                            title="Ver dados da proposta"
                            onClick={() => {
                              setSelectedLead(lead)
                              setProposalModalOpen(true)
                            }}
                          >
                            <FaFileAlt className="w-4 h-4 text-white" />
                          </button>
                        )}
                        
                        <button 
                          className="p-1 rounded bg-green-700/70 hover:bg-green-500 transition-colors" 
                          title="Repetir consulta"
                          onClick={() => repeatQuery(lead.id)}
                          disabled={repeatingQuery === lead.id}
                        >
                          {repeatingQuery === lead.id ? (
                            <FaSpinner className="w-4 h-4 text-white animate-spin" />
                          ) : (
                            <FaRedo className="w-4 h-4 text-white" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-white">
                      {searchTerm || statusFilter ? 'Nenhum lead encontrado com os filtros aplicados' : 'Nenhum lead encontrado'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{filteredLeads.length}</div>
            <div className="text-cyan-200 text-sm">Total de Leads</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {filteredLeads.filter(lead => getLeadStatus(lead) === 'proposta_paga').length}
            </div>
            <div className="text-emerald-200 text-sm">Propostas Pagas</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {filteredLeads.filter(lead => getLeadStatus(lead) === 'proposta_pendente').length}
            </div>
            <div className="text-yellow-200 text-sm">Propostas Pendentes</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {filteredLeads.filter(lead => lead.error_reason).length}
            </div>
            <div className="text-red-200 text-sm">Com Erros</div>
          </div>
        </div>
        </div> {/* fecha max-w-7xl mx-auto */}
      </div>   {/* fecha p-6 bg-gradient-to-br ... */}
      {/* Toast de erro para repetir consulta */}
      {repeatError && (
        <div className="fixed bottom-4 right-4 bg-red-500/90 text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle />
            <span className="text-sm">{repeatError}</span>
            <button 
              onClick={() => setRepeatError('')}
              className="ml-auto text-white/70 hover:text-white"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}
    </>
  )
} 