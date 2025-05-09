import React, { useEffect, useState, useRef, Fragment } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import {
  FaDollarSign,
  FaFileSignature,
  FaMoneyBillWave,
  FaCheckCircle,
  FaChartLine,
  FaHourglassHalf,
  FaTimesCircle,
  FaUserPlus,
  FaPercentage
} from 'react-icons/fa'
import { DateRange } from 'react-date-range'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'
import ptBR from 'date-fns/locale/pt-BR'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import Navbar from '../components/Navbar'
import Button from '../components/Button'
import { Listbox } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { EyeIcon, TrashIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { Dialog, Transition } from '@headlessui/react'
import ReactDOM from 'react-dom'
import { useNavigate } from 'react-router-dom'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

// Configuração global para todos os gráficos
ChartJS.defaults.color = '#64748b'
ChartJS.defaults.font.family = '"Inter", "Helvetica", "Arial", sans-serif'

// Personalização de tooltips
const tooltipStyles = {
  backgroundColor: 'rgba(17, 24, 39, 0.8)',
  borderColor: 'rgba(15, 118, 110, 0.3)',
  borderWidth: 1,
  titleFont: {
    size: 13,
    weight: 'bold'
  },
  bodyFont: {
    size: 12
  },
  padding: 10,
  caretSize: 6,
  displayColors: false,
  callbacks: {
    label: function(context) {
      let label = context.dataset.label || '';
      if (label) {
        label += ': ';
      }
      if (context.parsed.y !== null) {
        if (label.includes('R$')) {
          label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
        } else {
          label += new Intl.NumberFormat('pt-BR').format(context.parsed.y);
        }
      }
      return label;
    }
  }
}

const periodOptions = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' }
]

const statusOptions = [
  { value: '', label: 'Todos Status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Paga' },
  { value: 'formalization', label: 'Formalização' },
  { value: 'cancelled', label: 'Cancelada' }
]

// Componente Portal reutilizável
function Portal({ children }) {
  const portalRoot = document.getElementById('portal-root') || (() => {
    const el = document.createElement('div')
    el.id = 'portal-root'
    document.body.appendChild(el)
    return el
  })()
  return ReactDOM.createPortal(children, portalRoot)
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [period, setPeriod] = useState('daily')
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: 'selection'
    }
  ])
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [proposalToDelete, setProposalToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const cancelButtonRef = useRef(null)
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Tentar obter tokens de várias fontes
        let authToken = null;
        
        // 1. Verificar localStorage (tokens do Supabase)
        const storedTokens = localStorage.getItem('supabase_tokens');
        if (storedTokens) {
          try {
            const tokens = JSON.parse(storedTokens);
            if (tokens && tokens.access_token) {
              authToken = tokens.access_token;
              console.log('Token encontrado no localStorage');
            }
          } catch (e) {
            console.error('Erro ao ler tokens do localStorage:', e);
          }
        }
        
        // 2. Verificar cookies
        const jsAuthToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('js-auth-token='))
          ?.split('=')[1];
          
        if (jsAuthToken) {
          console.log('Token encontrado nos cookies JavaScript');
          authToken = jsAuthToken;
        }
        
        // Tentar fazer a requisição com o token se disponível
        const headers = {
          'Content-Type': 'application/json',
        };
        
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers
        });

        if (!response.ok) {
          console.error('Erro de autenticação:', response.status, response.statusText);
          const responseText = await response.text();
          console.log('Detalhes da resposta:', responseText);
          
          localStorage.setItem('redirectAfterLogin', '/dashboard');
          navigate('/login?error=auth_required&message=Você precisa estar autenticado para acessar o dashboard.');
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        navigate('/login?error=auth_error&message=Erro ao verificar autenticação. Por favor, faça login novamente.');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (period === 'custom' && (!dateRange[0].startDate || !dateRange[0].endDate)) return
    
    // Flag para controlar se o componente está montado
    let isMounted = true;
    
    // Usar um temporizador para evitar múltiplas chamadas em sequência
    const timeoutId = setTimeout(() => {
      const apiPeriod = period === 'custom' ? 'range' : period
      
      // Formatar datas explicitamente para garantir que não haja problemas de timezone
      let url = `/api/dashboard/stats?period=${apiPeriod}`
      if (period === 'custom') {
        // Garantir que estamos formatando corretamente as datas para o backend
        // Formato YYYY-MM-DD sem considerar timezone
        const formatDateToYYYYMMDD = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        const start = formatDateToYYYYMMDD(dateRange[0].startDate);
        const end = formatDateToYYYYMMDD(dateRange[0].endDate);
        
        url += `&startDate=${start}&endDate=${end}`;
        
        // Logs para depuração
        console.log(`[API-DEBUG] Data início objeto: ${dateRange[0].startDate}`);
        console.log(`[API-DEBUG] Data início formatada: ${start}`);
        console.log(`[API-DEBUG] Data fim objeto: ${dateRange[0].endDate}`);
        console.log(`[API-DEBUG] Data fim formatada: ${end}`);
      }
      
      console.log(`[DASHBOARD] Buscando dados com: ${url}`);
      
      const fetchData = async () => {
        try {
          const res = await fetch(url, { credentials: 'include' });
          
          // Verificar se o token expirou (status 401)
          if (res.status === 401) {
            console.error('Erro de autenticação: Token expirado ou inválido');
            
            // Limpar tokens locais
            localStorage.removeItem('supabase_tokens');
            
            // Salvar a URL atual para redirecionamento pós-login
            localStorage.setItem('redirectAfterLogin', '/dashboard');
            
            // Redirecionar para a página de login com mensagem
            navigate('/login?error=session_expired&message=Sua sessão expirou. Por favor, faça login novamente.');
            return;
          }
          
          if (!res.ok) {
            throw new Error(`Erro ao buscar dados: ${res.status} ${res.statusText}`);
          }
          
          const data = await res.json();
          if (isMounted) {
            console.log(`[DASHBOARD] Dados recebidos:`, data.data);
            setStats(data.data);
            console.log(`[DASHBOARD] Dados atualizados para período: ${period}`);
          }
        } catch (error) {
          console.error('Erro ao buscar dados do dashboard:', error);
          if (error.message?.includes('401') || error.message?.includes('autoriza')) {
            // Situação adicional de erro de autorização
            navigate('/login?error=auth_error&message=Erro de autenticação. Por favor, faça login novamente.');
          }
        }
      };
      
      fetchData();
    }, 300); // Espera 300ms antes de fazer a chamada para evitar várias em sequência
    
    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [period, dateRange, navigate]);

  // Função para formatar o intervalo de datas
  function formatDateRange(range) {
    if (!range[0].startDate || !range[0].endDate) return ''
    return `${format(range[0].startDate, 'dd/MM/yyyy')} a ${format(range[0].endDate, 'dd/MM/yyyy')}`
  }

  // Fechar calendário ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest('#calendar-dropdown') && !event.target.closest('#date-range-input')) {
        setIsCalendarOpen(false)
      }
    }
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isCalendarOpen])

  // Função para renderizar o badge de status com a cor apropriada
  function StatusBadge({ status }) {
    const statusMap = {
      'pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'em_formalizacao': 'bg-blue-100 text-blue-800 border-blue-200',
      'formalizacao': 'bg-blue-100 text-blue-800 border-blue-200',
      'pago': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'cancelado': 'bg-red-100 text-red-800 border-red-200'
    }
    const defaultClasses = 'bg-gray-100 text-gray-800 border-gray-200'
    const classes = statusMap[status?.toLowerCase()] || defaultClasses
    
    return (
      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${classes} inline-block`}>
        {status ? status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1) : 'Indefinido'}
      </span>
    )
  }

  async function handleDeleteProposal() {
    if (!proposalToDelete) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/proposals/${proposalToDelete.id}`, { method: 'DELETE', credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        setStats(prev => ({
          ...prev,
          recentProposals: prev.recentProposals.filter(p => p.id !== proposalToDelete.id)
        }))
        setDeleteModalOpen(false)
        setProposalToDelete(null)
      } else {
        setDeleteError(json.message || 'Erro ao excluir proposta')
      }
    } catch (err) {
      setDeleteError('Erro ao excluir proposta: ' + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950">
        <div className="text-cyan-400 text-xl">Carregando dashboard...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!stats) {
    return (
      <div className="p-6 bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen">
        <div className="space-y-6">
          {/* Skeleton para cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200/20 rounded-lg animate-pulse" />
            ))}
          </div>
          {/* Skeleton para gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200/20 rounded-lg animate-pulse" />
            <div className="h-64 bg-gray-200/20 rounded-lg animate-pulse" />
          </div>
          {/* Skeleton para título de seção */}
          <div className="h-8 bg-gray-200/20 rounded-lg w-48 animate-pulse" />
          {/* Skeleton para tabela */}
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-200/20 rounded animate-pulse w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const cards = [
    { title: 'Leads Novos', value: stats.newLeadsCount, icon: <FaUserPlus className="text-green-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-green-400' },
    { title: 'Porcentagem de Consultas', value: `${stats.consultationPercentage || '0'}%`, icon: <FaPercentage className="text-blue-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-blue-400' },
    { title: 'Consultas Válidas', value: `${stats.validConsultationsPercentage || '0'}%`, icon: <FaPercentage className="text-teal-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-teal-400' },
    { title: 'Saldo Total Consultado', value: stats.totalBalance, icon: <FaDollarSign className="text-emerald-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-emerald-400' },
    { title: 'Saldo Simulado Total', value: stats.totalSimulation, icon: <FaDollarSign className="text-emerald-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-emerald-400' },
    { title: 'Propostas Criadas', value: stats.totalProposals, icon: <FaFileSignature className="text-cyan-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-cyan-400' },
    { title: 'Valor Total de Propostas', value: stats.totalProposalsValue, icon: <FaMoneyBillWave className="text-cyan-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-cyan-400' },
    { title: 'Propostas em Formalização', value: stats.totalFormalizationProposals, icon: <FaFileSignature className="text-blue-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-blue-400' },
    { title: 'Valor em Formalização', value: stats.totalFormalizationProposalsValue, icon: <FaMoneyBillWave className="text-blue-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-blue-400' },
    { title: 'Propostas Pagas', value: stats.totalPaidProposals, icon: <FaCheckCircle className="text-teal-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-teal-400' },
    { title: 'Valor Propostas Pagas', value: stats.totalPaidProposalsValue, icon: <FaDollarSign className="text-teal-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-teal-400' },
    { title: 'Conversão de Pagamentos', value: stats.conversionRate, icon: <FaChartLine className="text-purple-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-purple-400' },
    { title: 'Propostas Pendentes', value: stats.totalPendingProposals, icon: <FaHourglassHalf className="text-yellow-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-yellow-400' },
    { title: 'Valor Pendentes', value: stats.totalPendingProposalsValue, icon: <FaMoneyBillWave className="text-yellow-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-yellow-400' },
    { title: 'Propostas Canceladas', value: stats.totalCancelledProposals, icon: <FaTimesCircle className="text-red-500" />, bgClass: 'bg-white/10 backdrop-blur-sm', titleColor: 'text-red-400' }
  ]

  // Configurações comuns para os gráficos
  const chartOptions = {
    responsive: true, 
    maintainAspectRatio: false,
    animations: {
      tension: {
        duration: 1000,
        easing: 'easeInOutCubic',
        from: 1,
        to: 0.4,
        loop: false
      }
    },
    plugins: {
      tooltip: tooltipStyles,
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          color: '#fff',
          font: {
            size: 12
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(156, 163, 175, 0.1)',
          drawBorder: false
        },
        ticks: {
          padding: 10,
          color: '#fff',
          font: {
            weight: 'bold',
            size: 13
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          padding: 10,
          color: '#fff'
        }
      }
    }
  }

  const filteredProposals = statusFilter
    ? stats.recentProposals.filter(p => (p.status || '').toLowerCase() === statusFilter)
    : stats.recentProposals

  return (
    <>
      <Navbar />
      <div className="p-6 bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen">
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
          <h1 className="text-3xl font-bold mb-4 lg:mb-0 bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-cyan-200 to-blue-300">
            Dashboard FGTS
          </h1>
          <div className="flex w-full justify-end items-center gap-2 max-w-2xl ml-auto">
            <div className="flex flex-nowrap items-center gap-2">
              <Listbox value={period} onChange={setPeriod}>
                <div className="relative w-full min-w-[200px]">
                  <Listbox.Button className="w-full px-3 py-2 rounded-lg bg-white/5 backdrop-blur border border-cyan-500 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 transition-colors duration-200 shadow-inner flex items-center justify-between">
                    {period === 'custom' && dateRange[0].startDate && dateRange[0].endDate ? 
                      (dateRange[0].startDate.getTime() === dateRange[0].endDate.getTime() ? 
                        `Dia ${format(dateRange[0].startDate, 'dd/MM/yyyy')}` : 
                        `${format(dateRange[0].startDate, 'dd/MM')} a ${format(dateRange[0].endDate, 'dd/MM/yyyy')}`) 
                      : periodOptions.find(opt => opt.value === period)?.label || 'Personalizado'}
                    <ChevronUpDownIcon className="w-5 h-5 text-cyan-300 ml-2 flex-shrink-0" />
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-50 mt-1 w-full rounded-lg bg-cyan-950/95 border border-cyan-700 shadow-lg ring-1 ring-cyan-800/30 focus:outline-none">
                    {periodOptions.map(option => (
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
              <div className="flex items-center">
                <button
                  type="button"
                  className="p-2 rounded-lg bg-white/10 border border-cyan-500 text-cyan-100 hover:bg-cyan-800/30 transition-colors flex-shrink-0"
                  title="Selecionar período personalizado"
                  onClick={() => {
                    setIsCalendarOpen(open => !open);
                    // Se abrir o calendário, ajustar para modo personalizado
                    if (!isCalendarOpen) {
                      setPeriod('custom');
                    }
                  }}
                  id="date-range-input"
                >
                  <CalendarIcon className="w-5 h-5" />
                </button>
                {isCalendarOpen && (
                  <div id="calendar-dropdown" className="absolute z-50 mt-2 right-0 shadow-lg">
                    <DateRange
                      editableDateInputs
                      onChange={item => {
                        setDateRange([item.selection]);
                        setPeriod('custom'); // Garantir que o modo está como personalizado
                      }}
                      moveRangeOnFirstSelection={false}
                      ranges={dateRange}
                      locale={ptBR}
                      className="bg-white rounded shadow"
                    />
                    <Button onClick={() => {
                      setIsCalendarOpen(false);
                      setPeriod('custom');
                      
                      // O useEffect cuidará da chamada à API quando os estados forem atualizados
                      console.log('[DASHBOARD] Botão "Aplicar" do calendário clicado - atualizando estado');
                    }} className="ml-2">Aplicar</Button>
                  </div>
                )}
              </div>
            </div>
            <Button onClick={() => {
              const now = new Date();
              // Criar data de ontem explicitamente com hora, minuto, segundo zerados
              const yesterday = new Date(now);
              yesterday.setDate(now.getDate() - 1);
              yesterday.setHours(0, 0, 0, 0);
              
              // Criar também data fim (fim do dia de ontem)
              const yesterdayEnd = new Date(yesterday);
              yesterdayEnd.setHours(23, 59, 59, 999);
              
              // Log detalhado para depuração
              console.log(`[ONTEM] Data de ontem início: ${yesterday.toISOString()}`);
              console.log(`[ONTEM] Data de ontem fim: ${yesterdayEnd.toISOString()}`);
              console.log(`[ONTEM] Data início formatada: ${yesterday.toISOString().slice(0, 10)}`);
              
              // Configurar as datas e atualizar o estado
              const newDateRange = [{ 
                startDate: yesterday, 
                endDate: yesterday, // Mantemos a mesma data para que seja apenas um dia
                key: 'selection' 
              }];
              
              // Apenas atualizamos o estado - o useEffect cuidará da chamada à API
              console.log('[DASHBOARD] Botão "Ontem" clicado - atualizando estado');
              setPeriod('custom');
              setDateRange(newDateRange);
              setIsCalendarOpen(false);
            }} className="text-sm px-3 py-1 whitespace-nowrap flex-shrink-0">Ontem</Button>
            
            <Button onClick={() => {
              const end = new Date()
              const start = subDays(end, 7)
              
              // Configurar as datas e atualizar o estado
              const newDateRange = [{ 
                startDate: start, 
                endDate: end, 
                key: 'selection' 
              }]
              
              // Apenas atualizamos o estado - o useEffect cuidará da chamada à API
              console.log('[DASHBOARD] Botão "7 dias" clicado - atualizando estado');
              setPeriod('custom')
              setDateRange(newDateRange)
              setIsCalendarOpen(false)
            }} className="text-sm px-3 py-1 whitespace-nowrap flex-shrink-0">7 dias</Button>
            
            <Button onClick={() => {
              const end = new Date()
              const start = subDays(end, 30)
              
              // Configurar as datas e atualizar o estado
              const newDateRange = [{ 
                startDate: start, 
                endDate: end, 
                key: 'selection' 
              }]
              
              // Apenas atualizamos o estado - o useEffect cuidará da chamada à API
              console.log('[DASHBOARD] Botão "30 dias" clicado - atualizando estado');
              setPeriod('custom')
              setDateRange(newDateRange)
              setIsCalendarOpen(false)
            }} className="text-sm px-3 py-1 whitespace-nowrap flex-shrink-0">30 dias</Button>
            
            <Button onClick={() => {
              const last = subMonths(new Date(), 1)
              const start = startOfMonth(last)
              const end = endOfMonth(last)
              
              // Configurar as datas e atualizar o estado
              const newDateRange = [{ 
                startDate: start, 
                endDate: end, 
                key: 'selection' 
              }]
              
              // Apenas atualizamos o estado - o useEffect cuidará da chamada à API
              console.log('[DASHBOARD] Botão "Último mês" clicado - atualizando estado');
              setPeriod('custom')
              setDateRange(newDateRange)
              setIsCalendarOpen(false)
            }} className="text-sm px-3 py-1 whitespace-nowrap flex-shrink-0">Último mês</Button>
          </div>
        </div>

        {/* Cards de indicadores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className={`${card.bgClass} rounded-lg shadow-lg p-4 flex items-center space-x-4 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:bg-white/20`}
              onClick={() => console.log(`Card clicado: ${card.title}`)}
            >
              <div className="text-4xl flex items-center justify-center w-12 h-12 rounded-full bg-gray-800/20">{card.icon}</div>
              <div>
                <p className={`text-sm font-semibold ${card.titleColor}`}>{card.title}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-white">{period === 'daily' ? 'Propostas por Hora' : period === 'weekly' ? 'Propostas por Dia' : 'Propostas'}</h2>
            <div className="h-64 w-full">
              <Line
                data={{
                  labels: stats.proposalsChartData.labels,
                  datasets: [
                    {
                      label: 'Quantidade',
                      data: stats.proposalsChartData.values,
                      backgroundColor: 'rgba(6, 182, 212, 0.25)',
                      borderColor: 'rgba(6, 182, 212, 1)',
                      borderWidth: 2,
                      pointBackgroundColor: 'rgba(6, 182, 212, 1)',
                      pointBorderColor: '#fff',
                      pointRadius: 4,
                      pointHoverRadius: 6,
                      tension: 0.4,
                      fill: true
                    }
                  ]
                }}
                options={chartOptions}
              />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-white">{period === 'daily' ? 'Valor das Propostas por Hora' : period === 'weekly' ? 'Valor das Propostas por Dia' : 'Valor das Propostas'}</h2>
            <div className="h-64 w-full">
              <Line
                data={{
                  labels: stats.valueChartData.labels,
                  datasets: [
                    {
                      label: 'R$',
                      data: stats.valueChartData.values,
                      backgroundColor: 'rgba(14, 116, 144, 0.25)',
                      borderColor: 'rgba(14, 116, 144, 1)',
                      borderWidth: 2,
                      pointBackgroundColor: 'rgba(14, 116, 144, 1)',
                      pointBorderColor: '#fff',
                      pointRadius: 4,
                      pointHoverRadius: 6,
                      tension: 0.4,
                      fill: true
                    }
                  ]
                }}
                options={{
                  ...chartOptions,
                  scales: {
                    ...chartOptions.scales,
                    y: {
                      ...chartOptions.scales.y,
                      ticks: {
                        ...chartOptions.scales.y.ticks,
                        callback: function(value) {
                          return 'R$ ' + new Intl.NumberFormat('pt-BR').format(value);
                        },
                        padding: 10,
                        color: '#fff',
                        font: {
                          weight: 'bold',
                          size: 13
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Propostas Recentes */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-4 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-2 gap-2">
            <h2 className="text-xl font-semibold text-white mb-2 md:mb-0">Propostas Recentes</h2>
            <Listbox value={statusFilter} onChange={setStatusFilter}>
              {({ open }) => {
                const buttonRef = useRef(null)
                const [dropdownStyle, setDropdownStyle] = useState({})
                useEffect(() => {
                  if (open && buttonRef.current) {
                    const rect = buttonRef.current.getBoundingClientRect()
                    setDropdownStyle({
                      position: 'fixed',
                      top: rect.bottom + 4,
                      left: rect.left,
                      width: rect.width,
                      zIndex: 9999
                    })
                  }
                }, [open])
                return (
                  <div className="relative w-48">
                    <Listbox.Button ref={buttonRef} className="w-full px-3 py-2 rounded-lg bg-white/5 backdrop-blur border border-cyan-500 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 transition-colors duration-200 shadow-inner flex items-center justify-between">
                      {statusOptions.find(opt => opt.value === statusFilter)?.label}
                      <ChevronUpDownIcon className="w-5 h-5 text-cyan-300 ml-2" />
                    </Listbox.Button>
                    {open && (
                      <Portal>
                        <Listbox.Options style={dropdownStyle} className="rounded-lg bg-cyan-950/95 border border-cyan-700 shadow-lg ring-1 ring-cyan-800/30 focus:outline-none">
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
                      </Portal>
                    )}
                  </div>
                )
              }}
            </Listbox>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-white">
              <thead className="bg-gray-900/30 text-white">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-lg text-white">Nome</th>
                  <th className="px-4 py-3 font-medium text-white">CPF</th>
                  <th className="px-4 py-3 font-medium text-white">Valor</th>
                  <th className="px-4 py-3 font-medium text-white">Status</th>
                  <th className="px-4 py-3 font-medium text-white">Data</th>
                  <th className="px-4 py-3 font-medium text-white">Ações</th>                </tr>
              </thead>
              <tbody>
                {filteredProposals.map((prop, index) => (
                  <tr 
                    key={prop.id} 
                    className={`border-b border-gray-700/30 hover:bg-white/5 transition-colors ${index === stats.recentProposals.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-4 py-3 text-white">{prop.lead_name}</td>
                    <td className="px-4 py-3 text-white">{prop.lead_cpf}</td>
                    <td className="px-4 py-3 text-white">{prop.value}</td>
                    <td className="px-4 py-3 text-white">
                      <StatusBadge status={prop.status} />
                    </td>
                    <td className="px-4 py-3 text-white">{prop.updated_at}</td>
                    <td className="px-4 py-3 flex gap-2 text-white">
                      <button className="p-1 rounded bg-cyan-700/70 hover:bg-cyan-500 transition-colors" title="Visualizar">
                        <EyeIcon className="w-5 h-5 text-white" />
                      </button>
                      {['pending', 'formalization'].includes((prop.status || '').toLowerCase()) && (
                        <button className="p-1 rounded bg-red-700/70 hover:bg-red-500 transition-colors" title="Excluir" onClick={() => { setProposalToDelete(prop); setDeleteModalOpen(true) }}>
                          <TrashIcon className="w-5 h-5 text-white" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {stats.recentProposals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-white">
                      Nenhuma proposta encontrada no período selecionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leads: Consultas e Simulações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-white">Consultas de Saldo</h2>
            <div className="h-64 w-full">
              <Line
                data={{ 
                  labels: stats.leadsChartData.labels, 
                  datasets: [{ 
                    label: 'Consultas', 
                    data: stats.leadsChartData.values, 
                    backgroundColor: 'rgba(16, 185, 129, 0.25)', 
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    fill: true
                  }] 
                }}
                options={chartOptions}
              />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-white">Simulações de Saque</h2>
            <div className="h-64 w-full">
              <Line
                data={{ 
                  labels: stats.simulationsChartData.labels, 
                  datasets: [{ 
                    label: 'Simulações', 
                    data: stats.simulationsChartData.values, 
                    backgroundColor: 'rgba(5, 150, 105, 0.25)', 
                    borderColor: 'rgba(5, 150, 105, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(5, 150, 105, 1)',
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    fill: true
                  }] 
                }}
                options={chartOptions}
              />
            </div>
          </div>
        </div>

        {/* Lista de Leads */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <h2 className="text-xl font-semibold mb-4 text-white">Leads que tentaram consultar/simular</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-white">
              <thead className="bg-gray-900/30 text-white">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-lg text-white">Nome</th>
                  <th className="px-4 py-3 font-medium text-white">CPF</th>
                  <th className="px-4 py-3 font-medium text-white">Saldo</th>
                  <th className="px-4 py-3 font-medium text-white">Simulado</th>
                  <th className="px-4 py-3 font-medium text-white">Data</th>
                  <th className="px-4 py-3 font-medium rounded-tr-lg text-white">Erro</th>
                </tr>
              </thead>
              <tbody>
                {stats.leadsList.map((lead, i) => (
                  <tr 
                    key={i} 
                    className={`border-b border-gray-700/30 hover:bg-white/5 transition-colors ${i === stats.leadsList.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-4 py-3 text-white">{lead.name}</td>
                    <td className="px-4 py-3 text-white">{lead.cpf}</td>
                    <td className="px-4 py-3 text-white">{lead.saldo}</td>
                    <td className="px-4 py-3 text-white">{lead.simulado}</td>
                    <td className="px-4 py-3 text-white">{lead.updated_at}</td>
                    <td className={`px-4 py-3 ${lead.erro ? 'text-red-400' : 'text-white'}`}>{lead.erro || '-'}</td>
                  </tr>
                ))}
                {stats.leadsList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-white">
                      Nenhum lead encontrado no período selecionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Transition.Root show={deleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" initialFocus={cancelButtonRef} onClose={() => setDeleteModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
          </Transition.Child>
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700">
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white">Confirmar exclusão</Dialog.Title>
                  <div className="mt-2 text-gray-200">Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.</div>
                  {deleteError && <div className="mt-2 text-red-400 text-sm">{deleteError}</div>}
                  <div className="mt-6 flex justify-end gap-2">
                    <button ref={cancelButtonRef} type="button" className="inline-flex justify-center rounded-md border border-gray-500 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>Cancelar</button>
                    <button type="button" className="inline-flex justify-center rounded-md border border-red-700 bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 focus:outline-none disabled:opacity-60" onClick={handleDeleteProposal} disabled={isDeleting}>
                      {isDeleting ? <span className="animate-spin mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block align-middle" /> : null}
                      Excluir
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  )
}