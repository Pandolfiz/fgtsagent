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
  FaExclamationTriangle,
  FaChevronRight
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
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [proposalsHistoryModalOpen, setProposalsHistoryModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [editingLead, setEditingLead] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  
  // Estados para histórico de propostas
  const [proposalsHistory, setProposalsHistory] = useState([])
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [isLoadingProposals, setIsLoadingProposals] = useState(false)
  
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
    { value: 'Simulation', label: 'Saldo Simulação' },
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
    if (lead.Simulation && lead.Simulation > 0) return 'simulacao'
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
    // Verificar se o valor é válido
    if (!value || value === 0 || value === '' || value === null || value === undefined) {
      return '-'
    }
    
    // Converter para número se for string
    let numericValue = value
    if (typeof value === 'string') {
      // Remover caracteres não numéricos exceto ponto e vírgula
      const cleanValue = value.replace(/[^\d.,]/g, '')
      numericValue = parseFloat(cleanValue.replace(',', '.'))
    }
    
    // Verificar se é um número válido
    if (isNaN(numericValue) || !isFinite(numericValue)) {
      return '-'
    }
    
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(numericValue)
  }

  // Função para formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('pt-BR')
  }

  // Função para formatar parcelas
  const formatParcelas = (parcelas) => {
    if (!parcelas || !Array.isArray(parcelas) || parcelas.length === 0) {
      return []
    }

    return parcelas.map((parcela, index) => {
      let valor = '-'
      let ano = '-'
      
      if (typeof parcela === 'object' && parcela.amount) {
        valor = formatCurrency(parcela.amount)
        if (parcela.dueDate) {
          const data = new Date(parcela.dueDate)
          ano = data.getFullYear().toString()
        }
      } else if (typeof parcela === 'string') {
        // Tentar extrair valor de string
        const match = parcela.match(/(\d+(?:[.,]\d+)?)/)
        if (match) {
          valor = formatCurrency(parseFloat(match[1].replace(',', '.')))
        }
        // Tentar extrair ano de string
        const yearMatch = parcela.match(/(20\d{2})/)
        if (yearMatch) {
          ano = yearMatch[1]
        }
      }
      
      return { ano, valor, original: parcela }
    })
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
      if (['balance', 'Simulation', 'proposal_value'].includes(sortField)) {
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
      email: lead.email || '',
      status: lead.status || '',
      data: lead.data || {},
      // Campos adicionais da tabela leads
      rg: lead.rg || '',
      nationality: lead.nationality || '',
      is_pep: lead.is_pep || false,
      birth: lead.birth || '',
      marital_status: lead.marital_status || '',
      person_type: lead.person_type || '',
      mother_name: lead.mother_name || '',
      // Endereço
      cep: lead.cep || '',
      estado: lead.estado || '',
      cidade: lead.cidade || '',
      bairro: lead.bairro || '',
      rua: lead.rua || '',
      numero: lead.numero || '',
      // Campos financeiros
      balance: lead.balance || '',
      pix: lead.pix || '',
      pix_key: lead.pix_key || '',
      Simulation: lead.Simulation || '',
      balance_error: lead.balance_error || '',
      proposal_error: lead.proposal_error || '',
      parcelas: lead.parcelas || null,
      // Outros campos
      provider: lead.provider || 'cartos'
    })
    setSaveError('')
    setEditModalOpen(true)
  }

  // Função para abrir histórico de propostas
  const openProposalsHistory = async (lead) => {
    try {
      setIsLoadingProposals(true)
      setSelectedLead(lead)
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Token de acesso não encontrado')
      }
      
      const response = await fetch(`/api/leads/${lead.id}/proposals`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar propostas: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setProposalsHistory(data.data)
      } else {
        console.error('Erro na resposta:', data.message)
        setProposalsHistory([])
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de propostas:', error)
      setProposalsHistory([])
    } finally {
      setIsLoadingProposals(false)
      setProposalsHistoryModalOpen(true)
    }
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

      // Preparar dados para envio - todos os campos da tabela leads
      const updateData = {
        name: editingLead.name || null,
        cpf: editingLead.cpf || null,
        email: editingLead.email || null,
        phone: editingLead.phone || null,
        status: editingLead.status || null,
        data: editingLead.data || {},
        // Campos adicionais da tabela leads
        rg: editingLead.rg || null,
        nationality: editingLead.nationality || null,
        is_pep: editingLead.is_pep || false,
        birth: editingLead.birth || null,
        marital_status: editingLead.marital_status || null,
        person_type: editingLead.person_type || null,
        mother_name: editingLead.mother_name || null,
        // Endereço
        cep: editingLead.cep || null,
        estado: editingLead.estado || null,
        cidade: editingLead.cidade || null,
        bairro: editingLead.bairro || null,
        rua: editingLead.rua || null,
        numero: editingLead.numero || null,
        // Campos financeiros
        balance: editingLead.balance || null,
        pix: editingLead.pix || null,
        pix_key: editingLead.pix_key || null,
        Simulation: editingLead.Simulation || null,
        balance_error: editingLead.balance_error || null,
        proposal_error: editingLead.proposal_error || null,
        parcelas: editingLead.parcelas || null,
        // Outros campos
        provider: editingLead.provider || 'cartos'
      }

      // Remover campos vazios para evitar erros de tipo
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === '' || updateData[key] === undefined) {
          updateData[key] = null
        }
      })

      const response = await fetch(`/api/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Erro na resposta:', errorData)
        throw new Error(errorData.message || 'Erro ao atualizar lead')
      }

      const result = await response.json()
      
      if (result.success) {
        // Atualizar a lista de leads
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === selectedLead.id 
              ? { ...lead, ...updateData }
              : lead
          )
        )
        
        setEditModalOpen(false)
        setSelectedLead(null)
        setEditingLead({})
        
        // Mostrar mensagem de sucesso
        if (typeof window !== 'undefined' && window.toast) {
          window.toast.success('Lead atualizado com sucesso!')
        }
      } else {
        throw new Error(result.message || 'Erro ao atualizar lead')
      }
    } catch (error) {
      console.error('Erro ao salvar lead:', error)
      setSaveError(error.message || 'Erro ao salvar dados do lead')
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
                  <th className="px-4 py-3 font-medium text-white cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => toggleSort('Simulation')}>
                    <div className="flex items-center gap-2">
                      Saldo Simulação
                      {sortField === 'Simulation' && (
                        <FaSort className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium text-white">
                    Erro Consulta
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
                  <th className="px-4 py-3 font-medium text-white">Ressaque</th>
                  <th className="px-4 py-3 font-medium text-white cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => toggleSort('proposal_value')}>
                    <div className="flex items-center gap-2">
                      Proposta
                      {sortField === 'proposal_value' && (
                        <FaSort className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium text-white">
                    Erro Proposta
                  </th>
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
                    <td className="px-4 py-3 text-white">{formatCurrency(lead.Simulation)}</td>
                    <td className="px-4 py-3 text-white">
                      {lead.balance_error ? (
                        <span className="text-red-400 text-sm">{lead.balance_error}</span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-white">{formatDate(lead.updated_at)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={getLeadStatus(lead)} />
                    </td>
                    <td className="px-4 py-3">
                      {lead.ressaque_tag ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Ressaque
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {lead.proposal_value ? formatCurrency(lead.proposal_value) : '-'}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {lead.proposal_error ? (
                        <span className="text-red-400 text-sm">{lead.proposal_error}</span>
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
                        
                        <button 
                          className="p-1 rounded bg-purple-700/70 hover:bg-purple-500 transition-colors" 
                          title="Ver detalhes do lead"
                          onClick={() => {
                            setSelectedLead(lead)
                            setViewModalOpen(true)
                          }}
                        >
                          <FaEye className="w-4 h-4 text-white" />
                        </button>
                        
                        {lead.proposal_value && (
                          <button 
                            className="p-1 rounded bg-blue-700/70 hover:bg-blue-500 transition-colors" 
                            title="Ver histórico de propostas"
                            onClick={() => openProposalsHistory(lead)}
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
                    <td colSpan={10} className="px-4 py-6 text-center text-white">
                      {searchTerm || statusFilter ? 'Nenhum lead encontrado com os filtros aplicados' : 'Nenhum lead encontrado'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>


        </div> {/* fecha max-w-7xl mx-auto */}
      </div>   {/* fecha p-6 bg-gradient-to-br ... */}

      {/* Modal de Edição de Lead */}
      <Transition.Root show={editModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setEditModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
          </Transition.Child>
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700">
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white mb-6">
                    Editar Dados Pessoais
                  </Dialog.Title>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Coluna Esquerda */}
                    <div className="space-y-6">
                      {/* Informações Básicas */}
                      <div className="border-b border-gray-600 pb-4">
                        <h4 className="text-sm font-semibold text-cyan-300 mb-4">Informações Básicas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Nome</label>
                            <input
                              type="text"
                              value={editingLead.name || ''}
                              onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">CPF</label>
                            <input
                              type="text"
                              value={editingLead.cpf || ''}
                              onChange={(e) => setEditingLead({...editingLead, cpf: e.target.value})}
                              placeholder="000.000.000-00"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">RG</label>
                            <input
                              type="text"
                              value={editingLead.rg || ''}
                              onChange={(e) => setEditingLead({...editingLead, rg: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Data de Nascimento</label>
                            <input
                              type="date"
                              value={editingLead.birth || ''}
                              onChange={(e) => setEditingLead({...editingLead, birth: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Nome da Mãe</label>
                            <input
                              type="text"
                              value={editingLead.mother_name || ''}
                              onChange={(e) => setEditingLead({...editingLead, mother_name: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Nacionalidade</label>
                            <input
                              type="text"
                              value={editingLead.nationality || ''}
                              onChange={(e) => setEditingLead({...editingLead, nationality: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Estado Civil</label>
                            <select
                              value={editingLead.marital_status || ''}
                              onChange={(e) => setEditingLead({...editingLead, marital_status: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="">Selecione...</option>
                              <option value="solteiro">Solteiro</option>
                              <option value="casado">Casado</option>
                              <option value="divorciado">Divorciado</option>
                              <option value="viuvo">Viúvo</option>
                              <option value="uniao_estavel">União Estável</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Tipo de Pessoa</label>
                            <select
                              value={editingLead.person_type || ''}
                              onChange={(e) => setEditingLead({...editingLead, person_type: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="">Selecione...</option>
                              <option value="fisica">Pessoa Física</option>
                              <option value="juridica">Pessoa Jurídica</option>
                            </select>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editingLead.is_pep || false}
                              onChange={(e) => setEditingLead({...editingLead, is_pep: e.target.checked})}
                              className="mr-2"
                            />
                            <label className="text-sm font-medium text-cyan-300">Pessoa Exposta Politicamente (PEP)</label>
                          </div>
                        </div>
                      </div>

                      {/* Contato */}
                      <div className="border-b border-gray-600 pb-4">
                        <h4 className="text-sm font-semibold text-cyan-300 mb-4">Contato</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Email</label>
                            <input
                              type="email"
                              value={editingLead.email || ''}
                              onChange={(e) => setEditingLead({...editingLead, email: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Telefone</label>
                            <input
                              type="text"
                              value={editingLead.phone || ''}
                              onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})}
                              placeholder="(00) 00000-0000"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Endereço */}
                      <div className="border-b border-gray-600 pb-4">
                        <h4 className="text-sm font-semibold text-cyan-300 mb-4">Endereço</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">CEP</label>
                            <input
                              type="text"
                              value={editingLead.cep || ''}
                              onChange={(e) => setEditingLead({...editingLead, cep: e.target.value})}
                              placeholder="00000-000"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Estado</label>
                            <input
                              type="text"
                              value={editingLead.estado || ''}
                              onChange={(e) => setEditingLead({...editingLead, estado: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Cidade</label>
                            <input
                              type="text"
                              value={editingLead.cidade || ''}
                              onChange={(e) => setEditingLead({...editingLead, cidade: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Bairro</label>
                            <input
                              type="text"
                              value={editingLead.bairro || ''}
                              onChange={(e) => setEditingLead({...editingLead, bairro: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Rua</label>
                            <input
                              type="text"
                              value={editingLead.rua || ''}
                              onChange={(e) => setEditingLead({...editingLead, rua: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Número</label>
                            <input
                              type="text"
                              value={editingLead.numero || ''}
                              onChange={(e) => setEditingLead({...editingLead, numero: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Coluna Direita */}
                    <div className="space-y-6">
                      {/* Informações Financeiras */}
                      <div className="border-b border-gray-600 pb-4">
                        <h4 className="text-sm font-semibold text-cyan-300 mb-4">Informações Financeiras</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Saldo</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingLead.balance || ''}
                              onChange={(e) => setEditingLead({...editingLead, balance: e.target.value})}
                              placeholder="0,00"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Simulação</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingLead.Simulation || ''}
                              onChange={(e) => setEditingLead({...editingLead, Simulation: e.target.value})}
                              placeholder="0,00"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Erro da Consulta</label>
                            <input
                              type="text"
                              value={editingLead.balance_error || ''}
                              onChange={(e) => setEditingLead({...editingLead, balance_error: e.target.value})}
                              placeholder="Erro da consulta"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Erro da Proposta</label>
                            <input
                              type="text"
                              value={editingLead.proposal_error || ''}
                              onChange={(e) => setEditingLead({...editingLead, proposal_error: e.target.value})}
                              placeholder="Erro da proposta"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Chave PIX</label>
                            <input
                              type="text"
                              value={editingLead.pix || ''}
                              onChange={(e) => setEditingLead({...editingLead, pix: e.target.value})}
                              placeholder="Chave PIX"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Tipo da Chave PIX</label>
                            <select
                              value={editingLead.pix_key || ''}
                              onChange={(e) => setEditingLead({...editingLead, pix_key: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="">Selecione...</option>
                              <option value="cpf">CPF</option>
                              <option value="cnpj">CNPJ</option>
                              <option value="email">Email</option>
                              <option value="phone">Telefone</option>
                              <option value="random">Chave Aleatória</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Status e Configurações */}
                      <div>
                        <h4 className="text-sm font-semibold text-cyan-300 mb-4">Status e Configurações</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Status</label>
                            <select
                              value={editingLead.status || ''}
                              onChange={(e) => setEditingLead({...editingLead, status: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="">Selecione...</option>
                              <option value="novo">Novo</option>
                              <option value="em_analise">Em Análise</option>
                              <option value="aprovado">Aprovado</option>
                              <option value="rejeitado">Rejeitado</option>
                              <option value="finalizado">Finalizado</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Provedor</label>
                            <input
                              type="text"
                              value={editingLead.provider || 'cartos'}
                              onChange={(e) => setEditingLead({...editingLead, provider: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {saveError && (
                    <div className="mt-4 text-red-400 text-sm">{saveError}</div>
                  )}
                  
                  <div className="mt-6 flex justify-end gap-2">
                    <button 
                      type="button" 
                      className="inline-flex justify-center rounded-md border border-gray-500 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none" 
                      onClick={() => setEditModalOpen(false)}
                      disabled={isSaving}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button" 
                      className="inline-flex justify-center rounded-md border border-cyan-700 bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 focus:outline-none disabled:opacity-60" 
                      onClick={saveLeadData}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block align-middle" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar'
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Modal de Visualização de Proposta */}
      <Transition.Root show={viewModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setViewModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
          </Transition.Child>
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700">
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white mb-6">
                    Dados do Lead - {selectedLead?.name}
                  </Dialog.Title>
                  
                  {selectedLead && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Coluna Esquerda */}
                      <div className="space-y-6">
                        {/* Informações Básicas */}
                        <div className="border-b border-gray-600 pb-4">
                          <h4 className="text-sm font-semibold text-cyan-300 mb-4">Informações Básicas</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Nome do Lead</label>
                              <p className="text-white">{selectedLead.name || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">CPF</label>
                              <p className="text-white">{selectedLead.cpf || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">RG</label>
                              <p className="text-white">{selectedLead.rg || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Data de Nascimento</label>
                              <p className="text-white">{selectedLead.birth ? new Date(selectedLead.birth).toLocaleDateString('pt-BR') : '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Nome da Mãe</label>
                              <p className="text-white">{selectedLead.mother_name || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Nacionalidade</label>
                              <p className="text-white">{selectedLead.nationality || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Estado Civil</label>
                              <p className="text-white">{selectedLead.marital_status || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Tipo de Pessoa</label>
                              <p className="text-white">{selectedLead.person_type || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">PEP</label>
                              <p className="text-white">{selectedLead.is_pep ? 'Sim' : 'Não'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Contato */}
                        <div className="border-b border-gray-600 pb-4">
                          <h4 className="text-sm font-semibold text-cyan-300 mb-4">Contato</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Email</label>
                              <p className="text-white">{selectedLead.email || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Telefone</label>
                              <p className="text-white">{selectedLead.phone || '-'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Endereço */}
                        <div className="border-b border-gray-600 pb-4">
                          <h4 className="text-sm font-semibold text-cyan-300 mb-4">Endereço</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">CEP</label>
                              <p className="text-white">{selectedLead.cep || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Estado</label>
                              <p className="text-white">{selectedLead.estado || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Cidade</label>
                              <p className="text-white">{selectedLead.cidade || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Bairro</label>
                              <p className="text-white">{selectedLead.bairro || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Rua</label>
                              <p className="text-white">{selectedLead.rua || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Número</label>
                              <p className="text-white">{selectedLead.numero || '-'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Coluna Direita */}
                      <div className="space-y-6">
                        {/* Informações Financeiras */}
                        <div className="border-b border-gray-600 pb-4">
                          <h4 className="text-sm font-semibold text-cyan-300 mb-4">Informações Financeiras</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Saldo</label>
                              <p className="text-white">{formatCurrency(selectedLead.balance)}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Simulação</label>
                              <p className="text-white">{formatCurrency(selectedLead.Simulation)}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Erro da Consulta</label>
                              <p className="text-red-400 text-sm">{selectedLead.balance_error || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Valor da Proposta</label>
                              <p className="text-white">{formatCurrency(selectedLead.proposal_value)}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Erro da Proposta</label>
                              <p className="text-red-400 text-sm">{selectedLead.proposal_error || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Chave PIX</label>
                              <p className="text-white">{selectedLead.pix || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Tipo da Chave PIX</label>
                              <p className="text-white">{selectedLead.pix_key || '-'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Parcelas */}
                        {selectedLead.parcelas && selectedLead.parcelas.length > 0 && (
                          <div className="border-b border-gray-600 pb-4">
                            <h4 className="text-sm font-semibold text-cyan-300 mb-4">Parcelas</h4>
                            <div className="bg-gray-800 p-4 rounded-lg max-h-48 overflow-y-auto">
                              {formatParcelas(selectedLead.parcelas).map((parcela, index) => {
                                return (
                                  <div key={index} className="flex justify-between items-center text-white text-sm mb-2 last:mb-0 border-b border-gray-700 pb-2 last:border-b-0">
                                    <span className="font-medium text-cyan-300">{parcela.ano}:</span>
                                    <span className="font-semibold">{parcela.valor}</span>
                                  </div>
                                )
                              })}
                              {/* Resumo total */}
                              <div className="mt-3 pt-2 border-t border-gray-600">
                                <div className="flex justify-between items-center text-white text-sm font-bold">
                                  <span className="text-cyan-300">Total:</span>
                                  <span>
                                    {formatCurrency(
                                      formatParcelas(selectedLead.parcelas)
                                        .filter(p => p.valor !== '-')
                                        .reduce((total, p) => {
                                          const valor = parseFloat(p.valor.replace(/[^\d,]/g, '').replace(',', '.'))
                                          return total + (isNaN(valor) ? 0 : valor)
                                        }, 0)
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Status e Metadados */}
                        <div>
                          <h4 className="text-sm font-semibold text-cyan-300 mb-4">Status e Metadados</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Status</label>
                              <p className="text-white">{selectedLead.status || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Ressaque</label>
                              <p className="text-white">
                                {selectedLead.ressaque_tag ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Ressaque
                                  </span>
                                ) : 'Não'}
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Provedor</label>
                              <p className="text-white">{selectedLead.provider || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Data de Criação</label>
                              <p className="text-white">{selectedLead.created_at ? new Date(selectedLead.created_at).toLocaleString('pt-BR') : '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Última Atualização</label>
                              <p className="text-white">{selectedLead.updated_at ? new Date(selectedLead.updated_at).toLocaleString('pt-BR') : '-'}</p>
                            </div>
                          </div>
                          
                          {/* Dados Adicionais */}
                          {selectedLead.data && Object.keys(selectedLead.data).length > 0 && (
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-cyan-300 mb-2">Dados Adicionais</label>
                              <div className="bg-gray-800 p-3 rounded-lg max-h-32 overflow-y-auto">
                                <pre className="text-white text-xs overflow-auto">{JSON.stringify(selectedLead.data, null, 2)}</pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-end">
                    <button 
                      type="button" 
                      className="inline-flex justify-center rounded-md border border-gray-500 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none" 
                      onClick={() => setViewModalOpen(false)}
                    >
                      Fechar
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Modal de Histórico de Propostas */}
      <Transition.Root show={proposalsHistoryModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setProposalsHistoryModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
          </Transition.Child>
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700">
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white mb-6">
                    Histórico de Propostas - {selectedLead?.name}
                  </Dialog.Title>
                  
                  {isLoadingProposals ? (
                    <div className="flex justify-center items-center py-8">
                      <FaSpinner className="w-8 h-8 text-cyan-500 animate-spin" />
                      <span className="ml-3 text-white">Carregando propostas...</span>
                    </div>
                  ) : proposalsHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <FaFileAlt className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">Nenhuma proposta encontrada para este lead.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-cyan-300 mb-3">Lista de Propostas</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {proposalsHistory.map((proposal, index) => (
                            <div 
                              key={proposal.id || index}
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedProposal?.id === proposal.id 
                                  ? 'border-cyan-500 bg-cyan-900/20' 
                                  : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                              }`}
                              onClick={() => setSelectedProposal(proposal)}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-white">
                                      Proposta #{proposal.proposal_id || proposal.id}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      proposal.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                      proposal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                      proposal.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                      'bg-gray-500/20 text-gray-400'
                                    }`}>
                                      {proposal.status === 'approved' ? 'Aprovada' :
                                       proposal.status === 'pending' ? 'Pendente' :
                                       proposal.status === 'rejected' ? 'Rejeitada' :
                                       proposal.status || 'Desconhecido'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    <span>Valor: {formatCurrency(proposal.value || proposal.amount)}</span>
                                    <span className="mx-2">•</span>
                                    <span>Criada em: {formatDate(proposal.created_at)}</span>
                                  </div>
                                </div>
                                <FaChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                                  selectedProposal?.id === proposal.id ? 'rotate-90' : ''
                                }`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Detalhes da Proposta Selecionada */}
                      {selectedProposal && (
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-cyan-300 mb-4">Dados do Proposta</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* ID da Proposta */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">ID da Proposta</label>
                              <p className="text-white text-sm break-all">{selectedProposal.proposal_id || selectedProposal.id}</p>
                            </div>
                            
                            {/* Valor */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Valor</label>
                              <p className="text-white">{formatCurrency(selectedProposal.value || selectedProposal.amount)}</p>
                            </div>
                            
                            {/* Status */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Status</label>
                              <p className="text-white">{selectedProposal.status || '-'}</p>
                            </div>
                            
                            {/* Data de Criação */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Data de Criação</label>
                              <p className="text-white">{formatDate(selectedProposal.created_at)}</p>
                            </div>
                            
                            {/* Data de Atualização */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Data de Atualização</label>
                              <p className="text-white">{formatDate(selectedProposal.updated_at)}</p>
                            </div>
                            
                            {/* Número do Contrato */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Número do Contrato</label>
                              <p className="text-white">{selectedProposal['Número contrato'] || '-'}</p>
                            </div>
                            
                            {/* Link de Formalização */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Link de Formalização</label>
                              {selectedProposal['Link de formalização'] ? (
                                <a 
                                  href={selectedProposal['Link de formalização']} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 hover:text-cyan-300 underline break-all text-sm"
                                >
                                  {selectedProposal['Link de formalização']}
                                </a>
                              ) : (
                                <p className="text-white">-</p>
                              )}
                            </div>
                            
                            {/* Status Reason */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Motivo do Status</label>
                              <p className="text-white">{selectedProposal.status_reason || '-'}</p>
                            </div>
                            
                            {/* Status Description */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Descrição do Status</label>
                              <p className="text-white">{selectedProposal.status_description || '-'}</p>
                            </div>
                            
                            {/* Error Reason */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Motivo do Erro</label>
                              <p className="text-white">{selectedProposal.error_reason || '-'}</p>
                            </div>
                            
                            {/* Chave PIX */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Chave PIX</label>
                              <p className="text-white">{selectedProposal.chavePix || '-'}</p>
                            </div>
                            
                            {/* Metadados - Ocupa toda a largura */}
                            {selectedProposal.metadata && Object.keys(selectedProposal.metadata).length > 0 && (
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-cyan-300 mb-2">Metadados</label>
                                <div className="bg-gray-700 p-3 rounded-lg max-h-32 overflow-y-auto">
                                  <pre className="text-white text-xs overflow-auto">{JSON.stringify(selectedProposal.metadata, null, 2)}</pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-end gap-3">
                    <button 
                      type="button" 
                      className="inline-flex justify-center rounded-md border border-gray-500 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none" 
                      onClick={() => setProposalsHistoryModalOpen(false)}
                    >
                      Fechar
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

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