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
  FaPercentage,
  FaEdit,
  FaEye,
  FaFileAlt,
  FaRedo,
  FaSpinner,
  FaExclamationTriangle,
  FaTimes,
  FaChevronRight
} from 'react-icons/fa'
import { DateRange } from 'react-date-range'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'
import '../styles/calendar-custom.css'
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
import supabase from '../lib/supabaseClient'
import { cachedFetch } from '../utils/authCache'

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
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [proposalDetails, setProposalDetails] = useState(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const cancelButtonRef = useRef(null)
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const calendarPositionRef = useRef({ right: '0px', width: '650px' })

  // Estados para modais de leads
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState({})
  const [isSavingLead, setIsSavingLead] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [viewLeadModalOpen, setViewLeadModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [repeatingQuery, setRepeatingQuery] = useState(null)
  const [repeatError, setRepeatError] = useState('')

  // Estados para histórico de propostas
  const [proposalsHistoryModalOpen, setProposalsHistoryModalOpen] = useState(false)
  const [proposalsHistory, setProposalsHistory] = useState([])
  const [isLoadingProposals, setIsLoadingProposals] = useState(false)

  // Função para calcular a posição do calendário
  const updateCalendarPosition = () => {
    try {
      // Buscar elementos de referência
      const dateButton = document.getElementById('date-display');
      const dateRangeButton = document.getElementById('date-range-input') || document.getElementById('date-range-input-mobile');
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      const referenceElement = dateButton || dateRangeButton;
      
      // Se os elementos necessários existirem
      if (referenceElement) {
        const refRect = referenceElement.getBoundingClientRect();
        
        // Se for mobile, centralize o calendário
        if (windowWidth < 768) {
          // Em dispositivos móveis, tornar o calendário mais compacto
          const mobileWidth = Math.min(300, windowWidth - 32); // 16px de padding em cada lado
          
          calendarPositionRef.current = {
            right: 'auto',
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${mobileWidth}px`,
            maxHeight: `${windowHeight - 100}px`,
            overflow: 'auto'
          };
        } 
        // Se for tablet
        else if (windowWidth < 1024) {
          const tabletWidth = Math.min(450, windowWidth - 48);
          
          // Calcular se há espaço suficiente à direita
          const rightSpace = windowWidth - refRect.right;
          const leftSpace = refRect.left;
          
          // Verificar qual lado tem mais espaço
          if (rightSpace > leftSpace && rightSpace > tabletWidth) {
            // Alinhar à direita do elemento
            calendarPositionRef.current = {
              left: `${refRect.right - tabletWidth}px`,
              right: 'auto',
              transform: 'none',
              width: `${tabletWidth}px`,
              maxHeight: `${windowHeight - 100}px`,
              overflow: 'auto'
            };
          } else {
            // Alinhar à esquerda, mas garantir que não ultrapasse a borda
            const leftPosition = Math.max(16, refRect.left);
            
            calendarPositionRef.current = {
              left: `${leftPosition}px`,
              right: 'auto',
              transform: 'none',
              width: `${tabletWidth}px`,
              maxHeight: `${windowHeight - 100}px`,
              overflow: 'auto'
            };
          }
        }
        // Se for desktop
        else {
          // Largura responsiva que não ultrapasse a viewport
          const desktopWidth = Math.min(640, windowWidth - 64);
          
          // Calcular posição horizontal para não ultrapassar as bordas
          let leftPosition = refRect.left;
          
          // Verificar se o calendário ultrapassaria a borda direita
          if (leftPosition + desktopWidth > windowWidth - 16) {
            leftPosition = windowWidth - desktopWidth - 16;
          }
          
          // Garantir que não ultrapasse a borda esquerda
          leftPosition = Math.max(16, leftPosition);
          
          calendarPositionRef.current = {
            right: 'auto',
            left: `${leftPosition}px`,
            transform: 'none',
            width: `${desktopWidth}px`,
            maxHeight: `${windowHeight - 100}px`,
            overflow: 'auto'
          };
        }
        
        // Verificar se há espaço suficiente abaixo para o calendário
        // Estimar altura do calendário (aproximadamente)
        const calendarHeight = isMobile ? 450 : 350;
        
        // Se não houver espaço suficiente abaixo, posicionar acima
        const bottomSpace = windowHeight - refRect.bottom;
        if (bottomSpace < calendarHeight && refRect.top > calendarHeight) {
          // Posicionar acima do elemento
          calendarPositionRef.current.top = `${refRect.top - calendarHeight - 5 + window.scrollY}px`;
        } else {
          // Posicionar abaixo do elemento (comportamento padrão)
          calendarPositionRef.current.top = `${refRect.bottom + 5 + window.scrollY}px`;
        }
      }
    } catch (error) {
      console.error('Erro ao calcular posição do calendário:', error);
      // Valores padrão em caso de erro
      calendarPositionRef.current = {
        right: 'auto',
        left: '16px',
        width: '300px',
        maxHeight: '80vh',
        overflow: 'auto'
      };
    }
  };

  // Detectar mudanças no tamanho da tela para ajustar o calendário
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
      updateCalendarPosition();
    }
    
    window.addEventListener('resize', handleResize);
    updateCalendarPosition(); // Calcular posição inicial
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Obter o token de autenticação de forma consistente
        let authToken = localStorage.getItem('authToken');
        
        // Se não encontrar no localStorage, tentar obter de outras fontes
        if (!authToken) {
          // 1. Verificar tokens do Supabase no localStorage
          const storedTokens = localStorage.getItem('supabase.auth.token');
          if (storedTokens) {
            try {
              const tokens = JSON.parse(storedTokens);
              if (tokens?.currentSession?.access_token) {
                authToken = tokens.currentSession.access_token;
                console.log('Token encontrado no localStorage (supabase.auth.token)');
                // Armazenar de forma consistente
                localStorage.setItem('authToken', authToken);
              }
            } catch (e) {
              console.error('Erro ao ler tokens do localStorage:', e);
            }
          }
          
          // 2. Verificar cookies
          if (!authToken) {
            const getCookie = (name) => {
              const value = `; ${document.cookie}`;
              const parts = value.split(`; ${name}=`);
              if (parts.length === 2) return parts.pop().split(';').shift();
            };
            
            authToken = getCookie('supabase-auth-token') || getCookie('js-auth-token');
            
            if (authToken) {
              console.log('Token encontrado nos cookies');
              // Armazenar de forma consistente
              localStorage.setItem('authToken', authToken);
            }
          }
        }
        
        // Se ainda não temos token, tentar obter via Supabase SDK
        if (!authToken) {
          try {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.access_token) {
              authToken = data.session.access_token;
              console.log('Token obtido via Supabase SDK');
              // Armazenar de forma consistente
              localStorage.setItem('authToken', authToken);
              // Definir também nos cookies para consistência
              document.cookie = `supabase-auth-token=${authToken}; path=/; max-age=86400; SameSite=Lax`;
              document.cookie = `js-auth-token=${authToken}; path=/; max-age=86400; SameSite=Lax`;
            }
          } catch (supabaseError) {
            console.error('Erro ao obter sessão do Supabase:', supabaseError);
          }
        }
        
        // Preparar headers para a requisição
        const headers = {
          'Content-Type': 'application/json',
        };
        
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        // Fazer a requisição de verificação usando cache
        const data = await cachedFetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers
        });

        if (!data || !data.success) {
          console.error('Erro de autenticação:', data);
          console.log('Detalhes da resposta:', data);
          
          // Se o erro for de autenticação, limpar tokens e redirecionar para login
          if (data && data.status === 401) {
            // Limpar tokens armazenados
            localStorage.removeItem('authToken');
            document.cookie = `supabase-auth-token=; path=/; max-age=0`;
            document.cookie = `js-auth-token=; path=/; max-age=0`;
            
            // Tentar fazer logout via Supabase para garantir
            try {
              await supabase.auth.signOut();
            } catch (e) {
              console.error('Erro ao fazer logout via Supabase:', e);
            }
            
            localStorage.setItem('redirectAfterLogin', '/dashboard');
            navigate('/login?error=auth_required&message=Você precisa estar autenticado para acessar o dashboard.');
            return;
          }
          
          // Se falhar por outro motivo, tentar recarregar a página uma vez
          if (!window.sessionStorage.getItem('auth_retry')) {
            window.sessionStorage.setItem('auth_retry', 'true');
            window.location.reload();
            return;
          }
          
          window.sessionStorage.removeItem('auth_retry');
          navigate('/login?error=auth_error&message=Erro ao verificar autenticação. Por favor, faça login novamente.');
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
      const isRange = (period === 'custom' || period === 'monthly');
      const apiPeriod = isRange ? 'range' : period;

      // Formatar datas explicitamente para garantir que não haja problemas de timezone
      let url = `/api/dashboard/stats?period=${apiPeriod}`;
      if (isRange) {
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
          // Recuperar o token de autenticação do localStorage
          let authToken = localStorage.getItem('authToken');
          if (!authToken) {
            // Tentar obter do supabase.auth.token
            const storedTokens = localStorage.getItem('supabase.auth.token');
            if (storedTokens) {
              try {
                const tokens = JSON.parse(storedTokens);
                if (tokens?.currentSession?.access_token) {
                  authToken = tokens.currentSession.access_token;
                  localStorage.setItem('authToken', authToken);
                }
              } catch (e) {
                // ignora
              }
            }
          }
          const headers = { 'Content-Type': 'application/json' };
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
          }
          const res = await fetch(url, { credentials: 'include', headers });
          
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
            
            // Log específico para depuração das métricas de leads
            console.log(`[DASHBOARD-LEADS-DEBUG] Leads Novos: ${data.data.newLeadsCount}, Leads Antigos Ativos: ${data.data.returningLeadsCount}, Total de Leads: ${data.data.totalLeads}`);
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
    }, 300);
    
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

  // Função para formatar a data do dia atual
  function formatSingleDate(date) {
    return `Dia ${format(date, 'dd/MM/yyyy')}`
  }

  // Fechar calendário ao clicar fora e atualizar posição quando necessário
  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest('#calendar-dropdown') && !event.target.closest('#date-range-input') && !event.target.closest('#date-range-input-mobile') && !event.target.closest('#date-display')) {
        setIsCalendarOpen(false)
      }
    }
    
    function handleScroll() {
      if (isCalendarOpen) {
        updateCalendarPosition();
      }
    }
    
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScroll)
      window.addEventListener('resize', handleScroll)
      // Atualizar a posição ao abrir o calendário
      updateCalendarPosition();
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [isCalendarOpen])

  // Inicializar com a data de hoje
  useEffect(() => {
    const today = new Date();
    setDateRange([{ startDate: today, endDate: today, key: 'selection' }]);
    // Não definimos o período como 'custom' aqui para manter o comportamento padrão
  }, []);

  // Atualizar o intervalo de datas quando o período for alterado para diário, semanal ou mensal
  useEffect(() => {
    if (period === 'custom') return;
    const today = new Date();
    if (period === 'daily') {
      setDateRange([{ startDate: today, endDate: today, key: 'selection' }]);
    } else if (period === 'weekly') {
      const startDate = new Date();
      startDate.setDate(today.getDate() - 6);
      setDateRange([{ startDate, endDate: today, key: 'selection' }]);
    } else if (period === 'monthly') {
      const startDate = new Date();
      startDate.setDate(today.getDate() - 29);
      setDateRange([{ startDate, endDate: today, key: 'selection' }]);
    }
  }, [period]);

  // Garante que o calendário possa ser aberto corretamente após carregamento
  useEffect(() => {
    if (stats && !window.calendarInitialized) {
      window.calendarInitialized = true;
      // Pequeno atraso para garantir que o DOM tenha sido completamente renderizado
      setTimeout(() => {
        updateCalendarPosition();
      }, 300);
    }
  }, [stats]);

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

  // Funções auxiliares para formatação
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-'
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) : parseFloat(value)
    if (isNaN(numValue)) return '-'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleString('pt-BR')
    } catch (error) {
      return dateString
    }
  }

  const formatParcelas = (parcelas) => {
    if (!parcelas || !Array.isArray(parcelas)) return []
    return parcelas.map(parcela => {
      const match = parcela.match(/(\d+):\s*([\d,]+)/)
      if (match) {
        return {
          ano: match[1],
          valor: formatCurrency(match[2])
        }
      }
      return { ano: '-', valor: parcela }
    })
  }

  const getLeadStatus = (lead) => {
    if (lead.ressaque_tag) return 'ressaque'
    if (lead.proposal_value) return 'proposta'
    if (lead.balance || lead.Simulation) return 'consultado'
    return 'novo'
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

  async function handleViewProposal() {
    if (!selectedProposal) return
    setIsLoadingDetails(true)
    setDetailsError('')
    try {
      const res = await fetch(`/api/proposals/${selectedProposal.id}`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        setProposalDetails(json.proposal)
      } else {
        setDetailsError(json.message || 'Erro ao carregar detalhes da proposta')
      }
    } catch (err) {
      setDetailsError('Erro ao carregar detalhes da proposta: ' + err.message)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  // Funções para manipular leads
  const openEditModal = (lead) => {
    setEditingLead({
      // Campos básicos
      name: lead.name || '',
      cpf: lead.cpf || '',
      email: lead.email || '',
      phone: lead.phone || '',
      status: lead.status || '',
      // Campos de documento
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
    setEditModalOpen(true)
  }

  const saveLeadData = async () => {
    setIsSavingLead(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/leads/${editingLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingLead)
      })
      const json = await res.json()
      if (json.success) {
        setEditModalOpen(false)
        // Atualizar a lista de leads
        setStats(prev => ({
          ...prev,
          leadsList: prev.leadsList.map(lead => 
            lead.id === editingLead.id ? { ...lead, ...editingLead } : lead
          )
        }))
      } else {
        setSaveError(json.message || 'Erro ao salvar dados')
      }
    } catch (err) {
      setSaveError('Erro ao salvar dados: ' + err.message)
    } finally {
      setIsSavingLead(false)
    }
  }

  const openProposalsHistory = async (lead) => {
    setIsLoadingProposals(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/proposals`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        setProposalsHistory(json.data || [])
        setSelectedLead(lead)
        setProposalsHistoryModalOpen(true)
      }
    } catch (err) {
      console.error('Erro ao carregar histórico de propostas:', err)
    } finally {
      setIsLoadingProposals(false)
    }
  }

  const repeatQuery = async (leadId) => {
    setRepeatingQuery(leadId)
    setRepeatError('')
    try {
      const res = await fetch(`/api/leads/${leadId}/repeat-query`, {
        method: 'POST',
        credentials: 'include'
      })
      const json = await res.json()
      if (!json.success) {
        setRepeatError(json.message || 'Erro ao repetir consulta')
      }
    } catch (err) {
      setRepeatError('Erro ao repetir consulta: ' + err.message)
    } finally {
      setRepeatingQuery(null)
    }
  }

  useEffect(() => {
    if (viewModalOpen && selectedProposal) {
      handleViewProposal()
    }
  }, [viewModalOpen, selectedProposal])

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
    { title: 'Leads Novos', value: stats.newLeadsCount, icon: <FaUserPlus className="text-green-500" />, bgClass: 'bg-white/10', titleColor: 'text-green-400' },
    { title: 'Leads Antigos Ativos', value: stats.returningLeadsCount, icon: <FaUserPlus className="text-purple-500" />, bgClass: 'bg-white/10', titleColor: 'text-purple-400' },
    { title: 'Porcentagem de Consultas', value: `${stats.consultationPercentage || '0'}%`, icon: <FaPercentage className="text-blue-500" />, bgClass: 'bg-white/10', titleColor: 'text-blue-400' },
    { title: 'Consultas Válidas', value: `${stats.validConsultationsPercentage || '0'}%`, icon: <FaPercentage className="text-teal-500" />, bgClass: 'bg-white/10', titleColor: 'text-teal-400' },
    { title: 'Saldo Total Consultado', value: stats.totalBalance, icon: <FaDollarSign className="text-emerald-500" />, bgClass: 'bg-white/10', titleColor: 'text-emerald-400' },
    { title: 'Saldo Simulado Total', value: stats.totalSimulation, icon: <FaDollarSign className="text-emerald-500" />, bgClass: 'bg-white/10', titleColor: 'text-emerald-400' },
    { title: 'Propostas Criadas', value: stats.totalProposals, icon: <FaFileSignature className="text-cyan-500" />, bgClass: 'bg-white/10', titleColor: 'text-cyan-400' },
    { title: 'Valor Total de Propostas', value: stats.totalProposalsValue, icon: <FaMoneyBillWave className="text-cyan-500" />, bgClass: 'bg-white/10', titleColor: 'text-cyan-400' },
    { title: 'Propostas em Formalização', value: stats.totalFormalizationProposals, icon: <FaFileSignature className="text-blue-500" />, bgClass: 'bg-white/10', titleColor: 'text-blue-400' },
    { title: 'Valor em Formalização', value: stats.totalFormalizationProposalsValue, icon: <FaMoneyBillWave className="text-blue-500" />, bgClass: 'bg-white/10', titleColor: 'text-blue-400' },
    { title: 'Propostas Pagas', value: stats.totalPaidProposals, icon: <FaCheckCircle className="text-teal-500" />, bgClass: 'bg-white/10', titleColor: 'text-teal-400' },
    { title: 'Valor Propostas Pagas', value: stats.totalPaidProposalsValue, icon: <FaDollarSign className="text-teal-500" />, bgClass: 'bg-white/10', titleColor: 'text-teal-400' },
    { title: 'Conversão de Pagamentos', value: stats.conversionRate, icon: <FaChartLine className="text-purple-500" />, bgClass: 'bg-white/10', titleColor: 'text-purple-400' },
    { title: 'Propostas Pendentes', value: stats.totalPendingProposals, icon: <FaHourglassHalf className="text-yellow-500" />, bgClass: 'bg-white/10', titleColor: 'text-yellow-400' },
    { title: 'Valor Pendentes', value: stats.totalPendingProposalsValue, icon: <FaMoneyBillWave className="text-yellow-500" />, bgClass: 'bg-white/10', titleColor: 'text-yellow-400' },
    { title: 'Propostas Canceladas', value: stats.totalCancelledProposals, icon: <FaTimesCircle className="text-red-500" />, bgClass: 'bg-white/10', titleColor: 'text-red-400' }
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
          {/* Filtros de período - reorganizados para responsividade */}
          <div className="w-full lg:w-auto lg:flex lg:flex-row lg:items-center lg:gap-2 lg:ml-auto">
            {/* Desktop: todos os filtros em uma linha */}
            <div className="hidden lg:flex lg:flex-row lg:items-center lg:gap-2">
              <div className="flex items-center">
                <button
                  type="button"
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors duration-200 ${period === 'custom' ? 'bg-white/5 border-cyan-500 text-cyan-100' : 'border-transparent bg-cyan-700/40 text-white'}`}
                  onClick={() => {
                    updateCalendarPosition();
                    setIsCalendarOpen(true);
                    setPeriod('custom');
                  }}
                  id="date-display"
                >
                  {dateRange[0].startDate && dateRange[0].endDate ? 
                    (dateRange[0].startDate.getTime() === dateRange[0].endDate.getTime() ? 
                      formatSingleDate(dateRange[0].startDate) : 
                      `${format(dateRange[0].startDate, 'dd/MM')} a ${format(dateRange[0].endDate, 'dd/MM/yyyy')}`) 
                    : formatSingleDate(dateRange[0].startDate)}
                </button>
                <button
                  type="button"
                  className="p-2 rounded-lg bg-white/10 border border-cyan-500 text-cyan-100 hover:bg-cyan-800/30 transition-colors flex-shrink-0 ml-1"
                  title="Selecionar período personalizado"
                  onClick={() => {
                    updateCalendarPosition();
                    setIsCalendarOpen(prev => !prev);
                    if (!isCalendarOpen) {
                      setPeriod('custom');
                    }
                  }}
                  id="date-range-input"
                >
                  <CalendarIcon className="w-5 h-5" />
                </button>
              </div>
              
{/* Botões de período removidos conforme solicitado */}
            </div>
            
            {/* Mobile: filtros empilhados */}
            <div className="flex flex-col lg:hidden w-full">
              {/* Primeira linha: botão de período personalizado e botão de calendário */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="flex items-center flex-1">
                  <button
                    type="button"
                    className={`px-3 py-2 rounded-lg border text-sm transition-colors duration-200 ${period === 'custom' ? 'bg-white/5 border-cyan-500 text-cyan-100' : 'border-transparent bg-cyan-700/40 text-white'} flex-1`}
                    onClick={() => {
                      updateCalendarPosition();
                      setIsCalendarOpen(true);
                      setPeriod('custom');
                    }}
                  >
                    {dateRange[0].startDate && dateRange[0].endDate ? 
                      (dateRange[0].startDate.getTime() === dateRange[0].endDate.getTime() ? 
                        formatSingleDate(dateRange[0].startDate) : 
                        `${format(dateRange[0].startDate, 'dd/MM')} a ${format(dateRange[0].endDate, 'dd/MM/yyyy')}`) 
                      : formatSingleDate(dateRange[0].startDate)}
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-lg bg-white/10 border border-cyan-500 text-cyan-100 hover:bg-cyan-800/30 transition-colors flex-shrink-0 ml-1"
                    title="Selecionar período personalizado"
                    onClick={() => {
                      updateCalendarPosition();
                      setIsCalendarOpen(prev => !prev);
                      if (!isCalendarOpen) {
                        setPeriod('custom');
                      }
                    }}
                    id="date-range-input-mobile"
                  >
                    <CalendarIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
{/* Segunda linha: botões de período removidos conforme solicitado */}
            </div>
            
            {/* Calendário compartilhado por ambos os modos (web e mobile) */}
            {isCalendarOpen && (
              <Portal>
                <div id="calendar-dropdown" className="absolute z-[999] mt-2 bg-cyan-950 border border-cyan-800 rounded-lg shadow-lg" style={{
                  top: calendarPositionRef.current.top,
                  right: calendarPositionRef.current.right,
                  left: calendarPositionRef.current.left || 'auto',
                  transform: calendarPositionRef.current.transform || 'none',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
                  maxWidth: '100vw'
                }}>
                  <div className="flex justify-between items-center px-4 py-3 border-b border-cyan-800/50">
                    <h3 className="text-cyan-100 font-medium">Selecionar Período</h3>
                    <button 
                      onClick={() => setIsCalendarOpen(false)} 
                      className="text-cyan-300 hover:text-white"
                      aria-label="Fechar calendário"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="calendar-content">
                    <DateRange
                      editableDateInputs
                      onChange={item => {
                        setDateRange([item.selection]);
                        setPeriod('custom');
                      }}
                      moveRangeOnFirstSelection={false}
                      ranges={dateRange}
                      locale={ptBR}
                      showMonthAndYearPickers={true}
                      showDateDisplay={false}
                      months={isMobile ? 1 : window.innerWidth < 1024 ? 1 : 2}
                      direction={window.innerWidth < 1024 ? "vertical" : "horizontal"}
                      rangeColors={["#06b6d4"]}
                      color="#06b6d4"
                      weekStartsOn={0}
                      weekdayDisplayFormat="EEEEE"
                      fixedHeight={true}
                    />
                  </div>
                  
                  <div className="flex flex-wrap justify-between items-center px-4 pb-4 gap-2 border-t border-cyan-800/30 pt-3">
                    <Button 
                      onClick={() => {
                        const today = new Date();
                        setDateRange([{
                          startDate: today,
                          endDate: today,
                          key: 'selection'
                        }]);
                        setPeriod('custom');
                        setIsCalendarOpen(false);
                      }} 
                      className="text-sm px-3 py-1 bg-cyan-700/40 border border-cyan-600 text-cyan-100 hover:bg-cyan-600/60"
                    >
                      Hoje
                    </Button>
                    
                    <Button onClick={() => {
                      const now = new Date();
                      const yesterday = new Date(now);
                      yesterday.setDate(now.getDate() - 1);
                      yesterday.setHours(0, 0, 0, 0);
                      const yesterdayEnd = new Date(yesterday);
                      yesterdayEnd.setHours(23, 59, 59, 999);
                      const newDateRange = [{ 
                        startDate: yesterday, 
                        endDate: yesterday,
                        key: 'selection' 
                      }];
                      setPeriod('custom');
                      setDateRange(newDateRange);
                      setIsCalendarOpen(false);
                    }} className="text-sm px-3 py-1 whitespace-nowrap">Ontem</Button>
                    
                    <Button onClick={() => {
                      const today = new Date();
                      const start = new Date(today);
                      start.setDate(today.getDate() - today.getDay());
                      const end = new Date(start);
                      end.setDate(start.getDate() + 6);
                      setPeriod('custom');
                      setDateRange([{ startDate: start, endDate: end, key: 'selection' }]);
                      setIsCalendarOpen(false);
                    }} className="text-sm px-3 py-1 whitespace-nowrap">Semanal</Button>
                    
                    <Button onClick={() => {
                      const end = new Date();
                      const start = subDays(end, 6);
                      const newDateRange = [{ 
                        startDate: start, 
                        endDate: end, 
                        key: 'selection' 
                      }];
                      setPeriod('custom');
                      setDateRange(newDateRange);
                      setIsCalendarOpen(false);
                    }} className="text-sm px-3 py-1 whitespace-nowrap">7 dias</Button>
                    
                    <Button onClick={() => {
                      const end = new Date();
                      const start = subDays(end, 29);
                      const newDateRange = [{ 
                        startDate: start, 
                        endDate: end, 
                        key: 'selection' 
                      }];
                      setPeriod('custom');
                      setDateRange(newDateRange);
                      setIsCalendarOpen(false);
                    }} className="text-sm px-3 py-1 whitespace-nowrap">30 dias</Button>
                    
                    <Button onClick={() => {
                      const today = new Date();
                      const start = startOfMonth(today);
                      const end = endOfMonth(today);
                      const newDateRange = [{ 
                        startDate: start, 
                        endDate: end, 
                        key: 'selection' 
                      }];
                      setPeriod('custom');
                      setDateRange(newDateRange);
                      setIsCalendarOpen(false);
                    }} className="text-sm px-3 py-1 whitespace-nowrap">Mensal</Button>
                    
{/* Botão Aplicar removido conforme solicitado */}
                  </div>
                </div>
              </Portal>
            )}
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
          <div className="bg-white/10 rounded-lg shadow-lg p-4">
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
          <div className="bg-white/10 rounded-lg shadow-lg p-4">
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
        <div className="bg-white/10 rounded-lg shadow-lg p-4 mb-8">
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
                    <Listbox.Button ref={buttonRef} className="w-full px-3 py-2 rounded-lg bg-transparent border border-cyan-500 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 transition-colors duration-200 shadow-inner flex items-center justify-between">
                      {statusOptions.find(opt => opt.value === statusFilter)?.label}
                      <ChevronUpDownIcon className="w-5 h-5 text-cyan-300 ml-2" />
                    </Listbox.Button>
                    {open && (
                      <Portal>
                        <Listbox.Options style={dropdownStyle} className="rounded-lg bg-cyan-950 border border-cyan-700 shadow-xl focus:outline-none">
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
                      <button className="p-1 rounded bg-cyan-700/70 hover:bg-cyan-500 transition-colors" title="Visualizar" onClick={() => { setSelectedProposal(prop); setViewModalOpen(true); }}>
                        <FaEye className="w-4 h-4 text-white" />
                      </button>
                      <button className="p-1 rounded bg-purple-700/70 hover:bg-purple-500 transition-colors" title="Editar" onClick={() => openEditModal(prop)}>
                        <FaEdit className="w-4 h-4 text-white" />
                      </button>
                      {prop.value && (
                        <button className="p-1 rounded bg-blue-700/70 hover:bg-blue-500 transition-colors" title="Ver histórico de propostas" onClick={() => openProposalsHistory(prop)}>
                          <FaFileAlt className="w-4 h-4 text-white" />
                        </button>
                      )}
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
          <div className="bg-white/10 rounded-lg shadow-lg p-4">
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
          <div className="bg-white/10 rounded-lg shadow-lg p-4">
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
        <div className="bg-white/10 rounded-lg shadow-lg p-4">
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
                  <th className="px-4 py-3 font-medium text-white">Erro</th>
                  <th className="px-4 py-3 font-medium rounded-tr-lg text-white">Ações</th>
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
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button 
                          className="p-1 rounded bg-purple-700/70 hover:bg-purple-500 transition-colors" 
                          title="Ver detalhes do lead"
                          onClick={() => {
                            setSelectedLead(lead)
                            setViewLeadModalOpen(true)
                          }}
                        >
                          <FaEye className="w-4 h-4 text-white" />
                        </button>
                        
                        <button 
                          className="p-1 rounded bg-cyan-700/70 hover:bg-cyan-500 transition-colors" 
                          title="Editar dados pessoais"
                          onClick={() => openEditModal(lead)}
                        >
                          <FaEdit className="w-4 h-4 text-white" />
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
                {stats.leadsList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-white">
                      Nenhum lead encontrado no período selecionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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

        {/* Modal de Visualização de Proposta */}
        <Transition.Root show={viewModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" initialFocus={cancelButtonRef} onClose={() => setViewModalOpen(false)}>
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
            </Transition.Child>
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                  <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700">
                    <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white mb-4">
                      Detalhes da Proposta
                    </Dialog.Title>
                    
                    {isLoadingDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                        <span className="ml-3 text-cyan-200">Carregando detalhes...</span>
                      </div>
                    ) : detailsError ? (
                      <div className="text-red-400 text-sm mb-4">{detailsError}</div>
                    ) : proposalDetails ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Nome do Lead</label>
                            <p className="text-white">{selectedProposal?.lead_name || '-'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">CPF</label>
                            <p className="text-white">{selectedProposal?.lead_cpf || '-'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Valor da Proposta</label>
                            <p className="text-white">{proposalDetails.value ? `R$ ${new Intl.NumberFormat('pt-BR').format(proposalDetails.value)}` : '-'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Status</label>
                            <StatusBadge status={proposalDetails.status} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Data de Criação</label>
                            <p className="text-white">{proposalDetails.created_at ? new Date(proposalDetails.created_at).toLocaleDateString('pt-BR') : '-'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Chave PIX</label>
                            <p className="text-white break-all">{proposalDetails.pix_key || proposalDetails.chave_pix || '-'}</p>
                          </div>
                        </div>
                        
                        {proposalDetails.formalization_link && (
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Link de Formalização</label>
                            <a 
                              href={proposalDetails.formalization_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 underline break-all"
                            >
                              {proposalDetails.formalization_link}
                            </a>
                          </div>
                        )}
                        
                        {proposalDetails.status_detail && (
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Detalhes do Status</label>
                            <p className="text-white">{proposalDetails.status_detail}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center py-8">
                        Nenhum detalhe disponível
                      </div>
                    )}
                    
                    <div className="mt-6 flex justify-end">
                      <button 
                        ref={cancelButtonRef}
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
      </div>
    </>
  )
}