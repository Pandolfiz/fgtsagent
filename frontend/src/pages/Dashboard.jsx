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
  FaChevronRight,
  FaPlus
} from 'react-icons/fa'
import { DateRange } from 'react-date-range'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'
import '../styles/calendar-custom.css'
import ptBR from 'date-fns/locale/pt-BR'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import Navbar from '../components/Navbar'
import { doesCurrentFilterIncludeToday } from '../utils/dateUtils'
import Button from '../components/Button'
import { Listbox } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { EyeIcon, TrashIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { Dialog, Transition } from '@headlessui/react'
import ReactDOM from 'react-dom'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabaseClient'
import { cachedFetch } from '../utils/authCache'
import api from '../utils/api' // ✅ IMPORTAR: Instância api configurada
import { useSessionPersistence } from '../hooks/useSessionPersistence'


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

// Adicione a função de mapeamento no topo do componente (após imports)
function mapMaritalStatus(status) {
  if (!status) return '';
  const normalized = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  switch (normalized) {
    case 'solteiro': return 'single';
    case 'casado': return 'married';
    case 'divorciado': return 'divorced';
    case 'viuvo':
    case 'viúvo': return 'widowed';
    default: return '';
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  // ✅ CORREÇÃO: Inicializar period como 'custom' para ser consistente com os botões de filtro
  const [period, setPeriod] = useState('custom')
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

  // Estado separado para proposta selecionada no histórico
  const [selectedProposalInHistory, setSelectedProposalInHistory] = useState(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const cancelButtonRef = useRef(null)
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [authError, setAuthError] = useState('')
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
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [selectedLeadForQuery, setSelectedLeadForQuery] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState('cartos')
  const [availableBanks, setAvailableBanks] = useState([])
  const [selectedBank, setSelectedBank] = useState('')
  const [loadingBanks, setLoadingBanks] = useState(false)

  // Estados para histórico de propostas
  const [proposalsHistoryModalOpen, setProposalsHistoryModalOpen] = useState(false)
  const [proposalsHistory, setProposalsHistory] = useState([])
  const [isLoadingProposals, setIsLoadingProposals] = useState(false)

  // Estados para modal de criar proposta
  const [createProposalModalOpen, setCreateProposalModalOpen] = useState(false)
  const [selectedLeadForProposal, setSelectedLeadForProposal] = useState(null)
  const [proposalFormData, setProposalFormData] = useState({})
  const [isCreatingProposal, setIsCreatingProposal] = useState(false)
  const [createProposalError, setCreateProposalError] = useState('')

  // Estados para modal de editar proposta
  const [editProposalModalOpen, setEditProposalModalOpen] = useState(false)
  const [editingProposal, setEditingProposal] = useState(null)
  const [isEditingProposal, setIsEditingProposal] = useState(false)
  const [editProposalError, setEditProposalError] = useState('')

  // ✅ NOVO ESTADO: Controla se a sincronização recorrente está ativa
  const [isRecurringSyncActive, setIsRecurringSyncActive] = useState(false)

  // ✅ FUNÇÃO GLOBAL: formatDateToYYYYMMDD para uso em todo o componente
  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ✅ LOG DE INICIALIZAÇÃO para depuração
  

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

  // ✅ NOVO: Hook de persistência de sessão
  const { session, loading: sessionLoading, error: sessionError, getToken, isAuthenticated: sessionIsAuthenticated, refreshSession } = useSessionPersistence();

  // ✅ CONTROLE: Evitar múltiplas chamadas simultâneas
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [lastUserDataFetch, setLastUserDataFetch] = useState(0);
  const [lastSessionToken, setLastSessionToken] = useState(null);
  const [userDataLoaded, setUserDataLoaded] = useState(false);

  // ✅ VERIFICAR: Autenticação e carregar dados do usuário
  useEffect(() => {
    // ✅ AGUARDAR: Hook de sessão terminar de carregar
    if (sessionLoading) {
      return;
    }

    // ✅ VERIFICAR: Se está autenticado
    if (!session || !session.access_token) {
      navigate('/login?error=not_authenticated&message=Faça login para continuar.');
      return;
    }

    // ✅ RESETAR: Estado quando a sessão mudar
    if (lastSessionToken !== null && session?.access_token !== lastSessionToken) {
      console.log('[DASHBOARD] 🔄 Sessão mudou - resetando estado');
      setUserDataLoaded(false);
      setUserData(null);
      setLastUserDataFetch(0); // ✅ RESETAR: Permitir nova tentativa
      setLastSessionToken(null); // ✅ RESETAR: Token da sessão anterior
    }

    // ✅ CONTROLE: Evitar múltiplas chamadas simultâneas
    if (isLoadingUserData) {
      return;
    }

    // ✅ CONTROLE: Debounce - aguardar 2 segundos entre chamadas
    const now = Date.now();
    if (lastUserDataFetch > 0 && now - lastUserDataFetch < 2000) {
      console.log('[DASHBOARD] ⏸️ Debounce ativo - aguardando 2 segundos');
      return;
    }

    // ✅ CONTROLE ADICIONAL: Evitar execução múltipla durante o mesmo ciclo
    if (lastSessionToken !== null && session?.access_token === lastSessionToken) {
      console.log('[DASHBOARD] ⏸️ Mesmo token de sessão - evitando execução');
      return;
    }

    // ✅ CONTROLE ADICIONAL: Evitar recarregar se os dados já foram carregados
    if (lastSessionToken !== null && userDataLoaded && userData && !isLoadingUserData) {
      console.log('[DASHBOARD] ⏸️ Dados já carregados - evitando recarregamento');
      return;
    }

    // ✅ CARREGAR: Dados do usuário via API (COM CONTROLE)
    const loadUserData = async () => {
      try {
        console.log('[DASHBOARD] 🚀 Iniciando carregamento de dados do usuário...');
        setIsLoadingUserData(true);
        setIsLoading(true);
        setAuthError('');
        setLastUserDataFetch(now);

        const response = await api.get('/auth/me', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (response.data.success) {
          console.log('[DASHBOARD] ✅ Dados do usuário carregados com sucesso');
          setUserData(response.data.user);
          setIsAuthenticated(true);
          setAuthError('');
          setLastSessionToken(session.access_token); // ✅ ATUALIZAR: Token da sessão atual
          setUserDataLoaded(true); // ✅ MARCAR: Dados carregados com sucesso
        } else {
          setAuthError(response.data.message || 'Erro ao carregar dados do usuário');
        }
        
      } catch (error) {
        console.error('❌ Dashboard: Erro ao carregar dados do usuário:', error);
        
        if (error.response?.status === 401) {
          setAuthError('Sua sessão expirou. Faça login novamente.');
          setTimeout(() => {
            navigate('/login?error=session_expired&message=Sua sessão expirou. Faça login novamente.');
          }, 2000);
        } else if (error.response?.status === 429) {
          // ✅ TRATAR: Rate limit - aguardar mais tempo e bloquear novas tentativas
          console.log('[DASHBOARD] ⚠️ Rate limit atingido - bloqueando por 10 segundos');
          setAuthError('Muitas requisições. Aguarde um momento...');
          setLastUserDataFetch(Date.now() + 10000); // Bloquear por 10 segundos
          setUserDataLoaded(false); // ✅ RESETAR: Permitir nova tentativa após bloqueio
          setTimeout(() => {
            setAuthError('');
          }, 10000);
        } else {
          setAuthError('Erro ao carregar dados do usuário. Tente novamente.');
        }
              } finally {
          console.log('[DASHBOARD] 🏁 Finalizando carregamento de dados do usuário');
          setIsLoading(false);
          setIsLoadingUserData(false);
        }
    };

    loadUserData();
    
  }, [sessionLoading, session?.access_token, navigate, isLoadingUserData, userDataLoaded, userData]);

  useEffect(() => {
    if (period === 'custom' && (!dateRange[0].startDate || !dateRange[0].endDate)) return

    // Flag para controlar se o componente está montado
    let isMounted = true;

    // Usar um temporizador para evitar múltiplas chamadas em sequência
    const timeoutId = setTimeout(() => {
      // ✅ CORREÇÃO: Usar os valores atuais de period e dateRange
      const currentPeriod = period;
      const currentDateRange = dateRange;
      
      const isRange = (currentPeriod === 'custom');
      const apiPeriod = isRange ? 'range' : currentPeriod;

      // ✅ URL: Sem /api (o proxy do Vite adiciona automaticamente)
      let url = `/dashboard/stats?period=${apiPeriod}`;
      if (isRange) {
        // ✅ USAR: Função global formatDateToYYYYMMDD
        const start = formatDateToYYYYMMDD(currentDateRange[0].startDate);
        const end = formatDateToYYYYMMDD(currentDateRange[0].endDate);

        url += `&startDate=${start}&endDate=${end}`;


      }

      console.log(`[DASHBOARD] Buscando dados com: ${url} (period: ${currentPeriod})`);

      const fetchData = async () => {
        try {
          // ✅ USAR: Instância api configurada (com proxy correto e interceptor automático)
          const res = await api.get(url.replace('/api', ''));

          // ✅ VERIFICAR: Status da resposta do axios
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

          if (res.status !== 200) {
            throw new Error(`Erro ao buscar dados: ${res.status} ${res.statusText}`);
          }

          // ✅ DADOS: Axios já retorna os dados parseados
          const data = res.data;
          if (isMounted) {
            console.log(`[DASHBOARD] Dados recebidos:`, data.data);
            setStats(data.data);
            console.log(`[DASHBOARD] Dados atualizados para período: ${currentPeriod}`);


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

  // ✅ NOVA FUNCIONALIDADE: Sincronização recorrente inteligente
  // Sincroniza automaticamente a cada 30 segundos apenas se o filtro incluir "hoje"
  useEffect(() => {
    // Só criar o intervalo se o filtro incluir "hoje"
    if (!doesCurrentFilterIncludeToday(period, dateRange)) {
      console.log(`[SYNC-DEBUG] Filtro não inclui hoje - sincronização recorrente desabilitada`);
      setIsRecurringSyncActive(false);
      return;
    }

    console.log(`[SYNC-DEBUG] Filtro inclui hoje - iniciando sincronização recorrente a cada 30 segundos`);
    setIsRecurringSyncActive(true);
    
    const intervalId = setInterval(() => {
      // Verificar novamente se o filtro ainda inclui "hoje" (pode ter mudado)
      if (doesCurrentFilterIncludeToday(period, dateRange)) {
        reloadDashboardData();
      } else {
        setIsRecurringSyncActive(false);
        clearInterval(intervalId);
      }
    }, 30 * 1000); // 30 segundos

    // Cleanup function
    return () => {
      setIsRecurringSyncActive(false);
      clearInterval(intervalId);
    };
  }, [period, dateRange]); // Dependências: recria o intervalo quando period/dateRange mudam

  // Função para recarregar dados do dashboard
  const reloadDashboardData = async () => {
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

      // ✅ CORREÇÃO: Usar a mesma lógica de construção de URL que fetchData
      const isRange = (period === 'custom');
      const apiPeriod = isRange ? 'range' : period;

      // ✅ URL: Sem /api (o proxy do Vite adiciona automaticamente)
      let url = `/dashboard/stats?period=${apiPeriod}`;
      if (isRange) {
        const start = formatDateToYYYYMMDD(dateRange[0].startDate);
        const end = formatDateToYYYYMMDD(dateRange[0].endDate);
        url += `&startDate=${start}&endDate=${end}`;
      }

      console.log(`[DASHBOARD] Recarregando dados com: ${url} (period: ${period})`);

      // ✅ USAR: Instância api configurada (com proxy correto)
      const res = await api.get(url, { headers });

      // Verificar se o token expirou (status 401)
      if (res.status === 401) {
        console.error('Erro de autenticação: Token expirado ou inválido');
        localStorage.removeItem('supabase_tokens');
        localStorage.setItem('redirectAfterLogin', '/dashboard');
        navigate('/login?error=session_expired&message=Sua sessão expirou. Por favor, faça login novamente.');
        return;
      }

      if (res.status !== 200) {
        throw new Error(`Erro ao buscar dados: ${res.status} ${res.statusText}`);
      }

      // ✅ DADOS: Axios já retorna os dados parseados
      const data = res.data;
      console.log(`[DASHBOARD] Dados recarregados:`, data.data);
      setStats(data.data);

    } catch (error) {
      console.error('Erro ao recarregar dados do dashboard:', error);
      if (error.message?.includes('401') || error.message?.includes('autoriza')) {
        navigate('/login?error=auth_error&message=Erro de autenticação. Por favor, faça login novamente.');
      }
    }
  };

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

  // ✅ CORREÇÃO: Removido useEffect problemático que sobrescrevia dateRange
  // O dateRange agora é controlado apenas pelos botões de filtro

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

    // Se a data já está formatada como string brasileira, retornar como está
    if (typeof dateString === 'string' && dateString.includes('/')) {
      return dateString
    }

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return dateString // Retornar o valor original se não conseguir parsear
      }
      return date.toLocaleString('pt-BR')
    } catch (error) {
      return dateString
    }
  }

  const formatDateCompact = (dateString) => {
    if (!dateString) return '-'

    // Se a data já está formatada como string brasileira, retornar como está
    if (typeof dateString === 'string' && dateString.includes('/')) {
      return dateString
    }

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return dateString // Retornar o valor original se não conseguir parsear
      }

      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // Se for hoje, mostrar apenas a hora
      if (diffDays === 1) {
        return date.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }

      // Se for ontem, mostrar "Ontem" + hora
      if (diffDays === 2) {
        return `Ontem ${date.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })}`
      }

      // Se for nos últimos 7 dias, mostrar dia da semana + hora
      if (diffDays <= 7) {
        return `${date.toLocaleDateString('pt-BR', {
          weekday: 'short'
        })} ${date.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })}`
      }

      // Para datas mais antigas, mostrar data completa
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }

  // Função para extrair apenas a data de uma string formatada brasileira
  const extractDateFromFormatted = (dateString) => {
    if (!dateString) return '-'

    // Se já é uma data formatada brasileira, extrair apenas a data
    if (typeof dateString === 'string' && dateString.includes('/')) {
      // Padrão: "30/07/2025, 14:30:25" -> "30/07/25"
      const dateMatch = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (dateMatch) {
        const [, day, month, year] = dateMatch
        return `${day}/${month}/${year.slice(-2)}`
      }

      // Se não conseguir extrair, retornar como está
      return dateString
    }

    // Se for uma data ISO, formatar
    try {
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        })
      }
    } catch (error) {
      // Ignorar erro
    }

    return dateString
  }

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

  const getLeadStatus = (lead) => {
    if (lead.ressaque_tag) return 'ressaque'
    if (lead.proposal_value) return 'proposta'
    if (lead.balance || lead.simulation) return 'consultado'
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
  const openEditModal = async (lead) => {
    if (!lead.id) {
      console.error('ID do lead não encontrado:', lead)
      // Fallback: usar dados limitados da tabela
    setEditingLead({
        id: null,
      name: lead.name || '',
      cpf: lead.cpf || '',
      email: lead.email || '',
      phone: lead.phone || '',
      status: lead.status || '',
        data: lead.data || {},
      rg: lead.rg || '',
      nationality: lead.nationality || '',
      is_pep: lead.is_pep || false,
      birth: lead.birth || '',
      marital_status: mapMaritalStatus(lead.marital_status),
      person_type: lead.person_type || '',
      mother_name: lead.mother_name || '',
      cep: lead.cep || '',
      estado: lead.estado || '',
      cidade: lead.cidade || '',
      bairro: lead.bairro || '',
      rua: lead.rua || '',
      numero: lead.numero || '',
      balance: lead.balance || '',
      pix: lead.pix || '',
      pix_key: lead.pix_key || '',
        simulation: lead.simulation || '',
      balance_error: lead.balance_error || '',
      proposal_error: lead.proposal_error || '',
      parcelas: lead.parcelas || null,
        provider: lead.provider || 'cartos',
        proposal_value: lead.proposal_value || '',
        proposal_status: lead.proposal_status || '',
        proposal_id: lead.proposal_id || '',
        error_reason: lead.error_reason || '',
        ressaque_tag: lead.ressaque_tag || false,
        created_at: lead.created_at || '',
        updated_at: lead.updated_at || ''
      })
      setEditModalOpen(true)
      return
    }

    try {
      // Buscar dados completos do lead
      const response = await fetch(`/api/leads/${lead.id}`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (data.success) {
        const fullLead = data.data
        setEditingLead({
          id: fullLead.id,
          // Campos básicos
          name: fullLead.name || '',
          cpf: fullLead.cpf || '',
          email: fullLead.email || '',
          phone: fullLead.phone || '',
          status: fullLead.status || '',
          data: fullLead.data || {},
          // Campos de documento
          rg: fullLead.rg || '',
          nationality: fullLead.nationality || '',
          is_pep: fullLead.is_pep || false,
          birth: fullLead.birth || '',
          marital_status: mapMaritalStatus(fullLead.marital_status),
          person_type: fullLead.person_type || '',
          mother_name: fullLead.mother_name || '',
          // Endereço
          cep: fullLead.cep || '',
          estado: fullLead.estado || '',
          cidade: fullLead.cidade || '',
          bairro: fullLead.bairro || '',
          rua: fullLead.rua || '',
          numero: fullLead.numero || '',
          // Campos financeiros
          balance: fullLead.balance || '',
          pix: fullLead.pix || '',
          pix_key: fullLead.pix_key || '',
          simulation: fullLead.simulation || '',
          balance_error: fullLead.balance_error || '',
          proposal_error: fullLead.proposal_error || '',
          parcelas: fullLead.parcelas || null,
      // Outros campos
          provider: fullLead.provider || 'cartos',
          // Campos de proposta
          proposal_value: fullLead.proposal_value || '',
          proposal_status: fullLead.proposal_status || '',
          proposal_id: fullLead.proposal_id || '',
          // Campos de erro e status
          error_reason: fullLead.error_reason || '',
          ressaque_tag: fullLead.ressaque_tag || false,
          // Campos de data
          created_at: fullLead.created_at || '',
          updated_at: fullLead.updated_at || ''
        })
      } else {
        console.error('Erro ao buscar dados do lead:', data.message)
        // Fallback: usar dados limitados da tabela
        setEditingLead({
          id: lead.id,
          name: lead.name || '',
          cpf: lead.cpf || '',
          email: lead.email || '',
          phone: lead.phone || '',
          status: lead.status || '',
          data: lead.data || {},
          rg: lead.rg || '',
          nationality: lead.nationality || '',
          is_pep: lead.is_pep || false,
                  birth: lead.birth || '',
        marital_status: mapMaritalStatus(lead.marital_status),
        person_type: lead.person_type || '',
          mother_name: lead.mother_name || '',
          cep: lead.cep || '',
          estado: lead.estado || '',
          cidade: lead.cidade || '',
          bairro: lead.bairro || '',
          rua: lead.rua || '',
          numero: lead.numero || '',
          balance: lead.balance || '',
          pix: lead.pix || '',
          pix_key: lead.pix_key || '',
          simulation: lead.simulation || '',
          balance_error: lead.balance_error || '',
          proposal_error: lead.proposal_error || '',
          parcelas: lead.parcelas || null,
          provider: lead.provider || 'cartos',
          proposal_value: lead.proposal_value || '',
          proposal_status: lead.proposal_status || '',
          proposal_id: lead.proposal_id || '',
          error_reason: lead.error_reason || '',
          ressaque_tag: lead.ressaque_tag || false,
          created_at: lead.created_at || '',
          updated_at: lead.updated_at || ''
        })
      }
      setEditModalOpen(true)
    } catch (error) {
      console.error('Erro ao buscar dados do lead:', error)
      // Fallback: usar dados limitados da tabela
      setEditingLead({
        id: lead.id,
        name: lead.name || '',
        cpf: lead.cpf || '',
        email: lead.email || '',
        phone: lead.phone || '',
        status: lead.status || '',
        data: lead.data || {},
        rg: lead.rg || '',
        nationality: lead.nationality || '',
        is_pep: lead.is_pep || false,
        birth: lead.birth || '',
        marital_status: mapMaritalStatus(lead.marital_status),
        person_type: lead.person_type || '',
        mother_name: lead.mother_name || '',
        cep: lead.cep || '',
        estado: lead.estado || '',
        cidade: lead.cidade || '',
        bairro: lead.bairro || '',
        rua: lead.rua || '',
        numero: lead.numero || '',
        balance: lead.balance || '',
        pix: lead.pix || '',
        pix_key: lead.pix_key || '',
        simulation: lead.simulation || '',
        balance_error: lead.balance_error || '',
        proposal_error: lead.proposal_error || '',
        parcelas: lead.parcelas || null,
        provider: lead.provider || 'cartos',
        proposal_value: lead.proposal_value || '',
        proposal_status: lead.proposal_status || '',
        proposal_id: lead.proposal_id || '',
        error_reason: lead.error_reason || '',
        ressaque_tag: lead.ressaque_tag || false,
        created_at: lead.created_at || '',
        updated_at: lead.updated_at || ''
    })
    setEditModalOpen(true)
    }
  }

  const saveLeadData = async () => {
    setIsSavingLead(true)
    setSaveError('')
    try {
      // Preparar dados para envio, removendo campos que não devem ser enviados
      const dataToSend = {
        name: editingLead.name,
        cpf: editingLead.cpf,
        email: editingLead.email,
        phone: editingLead.phone,
        status: editingLead.status,
        data: editingLead.data,
        // Campos de documento
        rg: editingLead.rg,
        nationality: editingLead.nationality,
        is_pep: editingLead.is_pep,
        birth: editingLead.birth,
        marital_status: editingLead.marital_status,
        person_type: editingLead.person_type,
        mother_name: editingLead.mother_name,
        // Endereço
        cep: editingLead.cep,
        estado: editingLead.estado,
        cidade: editingLead.cidade,
        bairro: editingLead.bairro,
        rua: editingLead.rua,
        numero: editingLead.numero,
        // Campos financeiros
        balance: editingLead.balance,
        pix: editingLead.pix,
        pix_key: editingLead.pix_key,
        simulation: editingLead.simulation,
        balance_error: editingLead.balance_error,
        proposal_error: editingLead.proposal_error,
        parcelas: editingLead.parcelas,
        // Outros campos
        provider: editingLead.provider,
        // Campos de proposta
        proposal_value: editingLead.proposal_value,
        proposal_status: editingLead.proposal_status,
        proposal_id: editingLead.proposal_id,
        // Campos de erro e status
        error_reason: editingLead.error_reason,
        ressaque_tag: editingLead.ressaque_tag
      }

      const res = await fetch(`/api/leads/${editingLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dataToSend)
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
    console.log('[DASHBOARD] Abrindo histórico de propostas para lead:', lead)
    setIsLoadingProposals(true)
    try {
      const url = `/api/leads/${lead.id}/proposals`
      console.log('[DASHBOARD] Fazendo requisição para:', url)

      const res = await fetch(url, { credentials: 'include' })
      console.log('[DASHBOARD] Status da resposta:', res.status)

      const json = await res.json()
      console.log('[DASHBOARD] Resposta da API:', json)

      if (json.success) {
        setProposalsHistory(json.data || [])
        setSelectedLead(lead)
        // Limpar proposta selecionada no histórico ao abrir o modal
        setSelectedProposalInHistory(null)
        setProposalsHistoryModalOpen(true)
        console.log('[DASHBOARD] Modal de histórico aberto com sucesso')
      } else {
        console.error('[DASHBOARD] Erro na resposta da API:', json.message)
      }
    } catch (err) {
      console.error('[DASHBOARD] Erro ao carregar histórico de propostas:', err)
    } finally {
      setIsLoadingProposals(false)
    }
  }

  const repeatQuery = async (leadId, provider = 'cartos', bankId = '') => {
    setRepeatingQuery(leadId)
    setRepeatError('')
    try {
      // Primeiro, buscar dados completos do lead
      const leadResponse = await fetch(`/api/leads/${leadId}`, {
        credentials: 'include'
      })
      const leadData = await leadResponse.json()

      if (!leadData.success) {
        throw new Error('Erro ao buscar dados do lead: ' + leadData.message)
      }

      // Buscar dados da credencial do banco selecionado
      console.log('Buscando dados do banco com ID:', bankId)
      const bankUrl = `/api/partner-credentials/${bankId}`
      console.log('URL do banco:', bankUrl)

      const bankResponse = await fetch(bankUrl, {
        credentials: 'include'
      })

      console.log('Status da resposta do banco:', bankResponse.status)
      console.log('Headers da resposta:', bankResponse.headers)

      if (!bankResponse.ok) {
        const errorText = await bankResponse.text()
        console.error('Erro na resposta do banco:', errorText)
        throw new Error(`Erro HTTP ${bankResponse.status}: ${errorText}`)
      }

      const bankData = await bankResponse.json()
      console.log('Dados do banco recebidos:', bankData)

      if (!bankData.success) {
        throw new Error('Erro ao buscar dados do banco: ' + bankData.message)
      }

      // Preparar payload do webhook
      console.log('Dados do lead:', leadData.data)
      console.log('Dados do banco:', bankData.data)
      console.log('User ID da credencial do banco:', bankData.data.user_id)

      // Verificar se os dados necessários estão presentes
      if (!leadData.data || !bankData.data) {
        throw new Error('Dados do lead ou banco não encontrados')
      }

      // Verificar se o banco tem oauth_config
      if (!bankData.data.oauth_config) {
        console.warn('Banco não tem oauth_config, usando valores padrão')
        bankData.data.oauth_config = {}
      }

      // Verificar se o user_id está presente na credencial do banco
      if (!bankData.data.user_id) {
        throw new Error('user_id não encontrado na credencial do banco')
      }

      const webhookPayload = [
        {
          cpf: leadData.data.cpf || '',
          provider: provider,
          nome: leadData.data.name || '',
          grant_type: bankData.data.oauth_config.grant_type || 'password',
          username: bankData.data.oauth_config.username || '',
          password: bankData.data.oauth_config.password || '',
          audience: bankData.data.oauth_config.audience || '',
          scope: bankData.data.oauth_config.scope || '',
          client_id: bankData.data.oauth_config.client_id || '',
          user_id: bankData.data.user_id || '',
          phone: leadData.data.phone || ''
        }
      ]

      console.log('Enviando webhook com payload:', webhookPayload)

      // Enviar webhook para o n8n
      const webhookUrl = 'https://n8n-n8n.8cgx4t.easypanel.host/webhook/consulta_app'
      console.log('Enviando webhook para:', webhookUrl)
      console.log('Payload do webhook:', webhookPayload)

      // Enviar webhook para o n8n de forma assíncrona (fire and forget)
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      }).then((webhookResponse) => {
      console.log('Status da resposta do webhook:', webhookResponse.status)
      console.log('Headers da resposta do webhook:', webhookResponse.headers)

      if (webhookResponse.status >= 200 && webhookResponse.status < 300) {
        console.log('Webhook enviado com sucesso para o n8n')
      } else {
          console.error('Erro na resposta do webhook:', webhookResponse.status)
        }
      }).catch((error) => {
        console.error('Erro ao enviar webhook:', error)
      });

      // Recarregar dados do dashboard apenas se o filtro atual incluir a data de hoje
      const shouldReload = doesCurrentFilterIncludeToday(period, dateRange);
      
      if (shouldReload) {
        await reloadDashboardData();
      }

    } catch (err) {
      setRepeatError('Erro ao repetir consulta: ' + err.message)
    } finally {
      setRepeatingQuery(null)
    }
  }

  const fetchAvailableBanks = async () => {
    try {
      setLoadingBanks(true)
      console.log('[DASHBOARD] Iniciando busca de bancos...')

      const response = await fetch('/api/partner-credentials', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[DASHBOARD] Resposta da API de bancos:', data)

      if (data.success && data.data) {
        // Filtrar apenas credenciais ativas
        const activeCredentials = data.data.filter(cred => cred.status === 'active')
        console.log('[DASHBOARD] Bancos ativos encontrados:', activeCredentials.length)
        setAvailableBanks(activeCredentials)

        // Selecionar o primeiro banco por padrão se houver
        if (activeCredentials.length > 0) {
          setSelectedBank(activeCredentials[0].id)
          console.log('[DASHBOARD] Banco padrão selecionado:', activeCredentials[0].name)
        }
      } else {
        console.error('Erro ao carregar bancos:', data.message)
        setAvailableBanks([])
      }
    } catch (error) {
      console.error('Erro ao buscar bancos disponíveis:', error)
      setAvailableBanks([])
    } finally {
      setLoadingBanks(false)
      console.log('[DASHBOARD] Busca de bancos concluída')
    }
  }

  const openProviderModal = async (lead) => {
    console.log('[DASHBOARD] Abrindo modal para lead:', lead.name)
    setSelectedLeadForQuery(lead)
    setSelectedProvider('cartos') // Reset para padrão
    setSelectedBank('') // Reset banco selecionado
    setShowProviderModal(true)

    // Buscar bancos disponíveis imediatamente
    fetchAvailableBanks() // Removido await para não bloquear a abertura do modal
  }

  const confirmRepeatQuery = async () => {
    if (selectedLeadForQuery) {
      if (!selectedBank) {
        setRepeatError('Por favor, selecione um banco')
        return
      }

      await repeatQuery(selectedLeadForQuery.id, selectedProvider, selectedBank)
      setShowProviderModal(false)
      setSelectedLeadForQuery(null)
    }
  }

  const openCreateProposalModal = async (lead) => {
    console.log('[DASHBOARD] Abrindo modal de criar proposta para lead:', lead.name)
    setSelectedLeadForProposal(lead)
    setCreateProposalError('')
    setSelectedProvider('cartos') // Reset para padrão
    setSelectedBank('') // Reset banco selecionado

    try {
      // Buscar dados completos do lead
      const response = await fetch(`/api/leads/${lead.id}`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (data.success) {
        const leadData = data.data

        // Preparar dados do formulário
        const formData = {
          // Dados do lead
          name: leadData.name || '',
          cpf: leadData.cpf || '',
          rg: leadData.rg || '',
          motherName: leadData.mother_name || leadData.motherName || '',
          email: leadData.email || '',
          birthDate: leadData.birth || leadData.birthDate || '',
          maritalStatus: mapMaritalStatus(leadData.marital_status || leadData.maritalStatus),
          phone: leadData.phone || '',
          postalCode: leadData.cep || leadData.postalCode || '',
          addressNumber: leadData.numero || leadData.address_number || leadData.addressNumber || '',
          chavePix: leadData.pix_key || leadData.chave_pix || leadData.chavePix || ''
        }

        setProposalFormData(formData)
        setCreateProposalModalOpen(true)

        // Buscar bancos disponíveis imediatamente
        fetchAvailableBanks()
      } else {
        console.error('Erro ao buscar dados do lead:', data.message)
        setCreateProposalError('Erro ao carregar dados do lead')
      }
    } catch (error) {
      console.error('Erro ao abrir modal de criar proposta:', error)
      setCreateProposalError('Erro ao carregar dados')
    }
  }

  // Função para abrir modal de edição de proposta
  const openEditProposalModal = async (proposal) => {
    try {
      console.log('[DASHBOARD] Abrindo modal de editar proposta:', proposal)
      setEditingProposal(proposal)
      setEditProposalError('')
      setEditProposalModalOpen(true)
    } catch (error) {
      console.error('Erro ao abrir modal de editar proposta:', error)
      setEditProposalError('Erro ao abrir modal de edição')
    }
  }

  // Função para salvar edição da proposta
  const saveProposalEdit = async () => {
    try {
      setIsEditingProposal(true)
      setEditProposalError('')

      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Token de acesso não encontrado')
      }

      const response = await fetch(`/api/proposals/${editingProposal.proposal_id || editingProposal.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chavePix: editingProposal.chavePix
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      if (data.success) {
        console.log('[DASHBOARD] Proposta editada com sucesso')
        setEditProposalModalOpen(false)
        setEditingProposal(null)
        // Recarregar dados do dashboard apenas se o filtro atual incluir a data de hoje
        console.log(`[SAVE-PROPOSAL-DEBUG] Period atual: ${period}, DateRange atual:`, dateRange);
        const shouldReload = doesCurrentFilterIncludeToday(period, dateRange);
        
        if (shouldReload) {
          await reloadDashboardData();
        }
      } else {
        throw new Error(data.message || 'Erro ao editar proposta')
      }
    } catch (error) {
      console.error('Erro ao editar proposta:', error)
      setEditProposalError(error.message)
    } finally {
      setIsEditingProposal(false)
    }
  }

  const createProposal = async () => {
    if (!selectedLeadForProposal) return

    if (!selectedBank) {
      setCreateProposalError('Por favor, selecione um banco')
      return
    }

    setIsCreatingProposal(true)
    setCreateProposalError('')

    try {
      // Buscar dados do partner_credentials selecionado
      const credentialsResponse = await fetch(`/api/partner-credentials/${selectedBank}`, {
        credentials: 'include'
      })
      const credentialsData = await credentialsResponse.json()

      if (!credentialsData.success) {
        throw new Error('Erro ao buscar dados do banco selecionado')
      }

      const bankData = credentialsData.data

      const payload = [{
        name: proposalFormData.name,
        cpf: proposalFormData.cpf,
        rg: proposalFormData.rg,
        motherName: proposalFormData.motherName,
        email: proposalFormData.email,
        birthDate: proposalFormData.birthDate,
        maritalStatus: proposalFormData.maritalStatus,
        phone: proposalFormData.phone,
        postalCode: proposalFormData.postalCode,
        addressNumber: proposalFormData.addressNumber,
        chavePix: proposalFormData.chavePix,
        grant_type: bankData.grant_type || '',
        username: bankData.username || '',
        password: bankData.password || '',
        audience: bankData.audience || '',
        scope: bankData.scope || '',
        client_id: bankData.client_id || '',
        user_id: bankData.user_id || ''
      }]

      console.log('[DASHBOARD] Enviando proposta para webhook:', payload)

      // Enviar webhook para o n8n de forma assíncrona (fire and forget)
      fetch('https://n8n-n8n.8cgx4t.easypanel.host/webhook/criaPropostaApp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
            }).then((webhookResponse) => {
        console.log('[DASHBOARD] Status da resposta do webhook:', webhookResponse.status)
      if (webhookResponse.status >= 200 && webhookResponse.status < 300) {
        console.log('[DASHBOARD] Proposta criada com sucesso')
          
          // ✅ Ações de sucesso executadas APENAS após confirmar sucesso do webhook
        setCreateProposalModalOpen(false)
        setSelectedLeadForProposal(null)
        setProposalFormData({})

          // Recarregar dados do dashboard apenas se o filtro atual incluir a data de hoje
          console.log(`[CREATE-PROPOSAL-DEBUG] Period atual: ${period}, DateRange atual:`, dateRange);
          const shouldReload = doesCurrentFilterIncludeToday(period, dateRange);
          console.log(`[CREATE-PROPOSAL-DEBUG] Deve recarregar? ${shouldReload}`);
          
          if (shouldReload) {
            console.log(`[CREATE-PROPOSAL-DEBUG] Iniciando recarregamento...`);
            reloadDashboardData(); // Removido await pois já estamos dentro de .then()
            console.log(`[CREATE-PROPOSAL-DEBUG] Recarregamento iniciado`);
      } else {
            console.log(`[CREATE-PROPOSAL-DEBUG] Recarregamento não necessário - filtro não inclui hoje`);
          }
        } else {
          console.error('[DASHBOARD] Erro no webhook:', webhookResponse.status)
        }
      }).catch((error) => {
        console.error('[DASHBOARD] Erro ao enviar webhook:', error)
      });

      // ✅ Código removido daqui - não executa mais prematuramente
    } catch (error) {
      console.error('[DASHBOARD] Erro ao criar proposta:', error)
      setCreateProposalError('Erro ao criar proposta. Tente novamente.')
    } finally {
      setIsCreatingProposal(false)
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
                      console.log(`[FILTER-DEBUG] Botão "7 dias" clicado`);
                      console.log(`[FILTER-DEBUG] Start: ${start.toISOString()}, End: ${end.toISOString()}`);
                      setPeriod('custom');
                      setDateRange(newDateRange);
                      setIsCalendarOpen(false);
                      console.log(`[FILTER-DEBUG] Estado atualizado - Period: custom, DateRange:`, newDateRange);
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
                  <th className="px-4 py-3 font-medium text-white">Ações</th>
                </tr>
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
                    <td className="px-4 py-3 text-white">{extractDateFromFormatted(prop.updated_at)}</td>
                    <td className="px-4 py-3 flex gap-2 text-white">
                      <button className="p-1 rounded bg-cyan-700/70 hover:bg-cyan-500 transition-colors" title="Visualizar" onClick={() => { setSelectedProposal(prop); setViewModalOpen(true); }}>
                        <FaEye className="w-4 h-4 text-white" />
                      </button>
                      {['pending'].includes((prop.status || '').toLowerCase()) && (
                      <button className="p-1 rounded bg-purple-700/70 hover:bg-purple-500 transition-colors" title="Editar Proposta" onClick={() => openEditProposalModal(prop)}>
                        <FaEdit className="w-4 h-4 text-white" />
                      </button>
                      )}
                      {prop.value && prop.lead_id && prop.lead_id !== '-' && (
                        <button className="p-1 rounded bg-blue-700/70 hover:bg-blue-500 transition-colors" title="Ver histórico de propostas" onClick={() => openProposalsHistory({ id: prop.lead_id, name: prop.lead_name })}>
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
                    <td className="px-4 py-3 text-white">{extractDateFromFormatted(lead.updated_at)}</td>
                    <td className={`px-4 py-3 ${lead.erro ? 'text-red-400' : 'text-white'}`}>{lead.erro || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          className="p-1 rounded bg-purple-700/70 hover:bg-purple-500 transition-colors"
                          title="Ver detalhes do lead"
                          onClick={async () => {
                            if (!lead.id) {
                              console.error('ID do lead não encontrado:', lead)
                              // Fallback: usar dados limitados da tabela
                            setSelectedLead(lead)
                            setViewLeadModalOpen(true)
                              return
                            }

                            try {
                              // Buscar dados completos do lead
                              const response = await fetch(`/api/leads/${lead.id}`, {
                                credentials: 'include'
                              })
                              const data = await response.json()
                              if (data.success) {
                                setSelectedLead(data.data)
                                setViewLeadModalOpen(true)
                              } else {
                                console.error('Erro ao buscar dados do lead:', data.message)
                                // Fallback: usar dados limitados da tabela
                                setSelectedLead(lead)
                                setViewLeadModalOpen(true)
                              }
                            } catch (error) {
                              console.error('Erro ao buscar dados do lead:', error)
                              // Fallback: usar dados limitados da tabela
                              setSelectedLead(lead)
                              setViewLeadModalOpen(true)
                            }
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

                        {lead.hasProposals && (
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
                          onClick={() => openProviderModal(lead)}
                          disabled={repeatingQuery === lead.id}
                        >
                          {repeatingQuery === lead.id ? (
                            <FaSpinner className="w-4 h-4 text-white animate-spin" />
                          ) : (
                            <FaRedo className="w-4 h-4 text-white" />
                          )}
                        </button>

                                <button
          className={`p-1 rounded transition-colors ${
            !lead.erro && lead.simulado && lead.simulado.includes('R$')
              ? 'bg-orange-700/70 hover:bg-orange-500'
              : 'bg-gray-600 cursor-not-allowed opacity-50'
          }`}
          title={
            !lead.erro && lead.simulado && lead.simulado.includes('R$')
              ? 'Criar proposta'
              : `Debug: erro="${lead.erro}", simulado="${lead.simulado}", type="${typeof lead.simulado}"`
          }
          onClick={() => {
            const condition = !lead.erro && lead.simulado && lead.simulado.includes('R$')
            console.log('[DEBUG] Lead data:', {
              name: lead.name,
              erro: lead.erro,
              erroType: typeof lead.erro,
              simulado: lead.simulado,
              simuladoType: typeof lead.simulado,
              condition: condition,
              part1: !lead.erro,
              part2: lead.simulado && lead.simulado.includes('R$')
            })
            openCreateProposalModal(lead)
          }}
          disabled={!(!lead.erro && lead.simulado && lead.simulado.includes('R$'))}
        >
          <FaPlus className="w-4 h-4 text-white" />
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
                                <option value="single">Solteiro</option>
                                <option value="married">Casado</option>
                                <option value="divorced">Divorciado</option>
                                <option value="widowed">Viúvo</option>
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
                              <p className="text-white">{editingLead.estado || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Cidade</label>
                              <p className="text-white">{editingLead.cidade || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Bairro</label>
                              <p className="text-white">{editingLead.bairro || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Rua</label>
                              <p className="text-white">{editingLead.rua || '-'}</p>
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
                              <p className="text-white">{formatCurrency(editingLead.balance)}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Simulação</label>
                              <p className="text-white">{formatCurrency(editingLead.simulation)}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Erro da Consulta</label>
                              <p className="text-red-400 text-sm">{editingLead.balance_error || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Erro da Proposta</label>
                              <p className="text-red-400 text-sm">{editingLead.proposal_error || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Chave PIX</label>
                              <input
                                type="text"
                                value={editingLead.pix_key || ''}
                                onChange={(e) => setEditingLead({...editingLead, pix_key: e.target.value})}
                                placeholder="Chave PIX"
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Tipo da Chave PIX</label>
                              <p className="text-white">{editingLead.pix || '-'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Configurações */}
                        <div>
                          <h4 className="text-sm font-semibold text-cyan-300 mb-4">Configurações</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Provedor</label>
                              <select
                                value={editingLead.provider || 'cartos'}
                                onChange={(e) => setEditingLead({...editingLead, provider: e.target.value})}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              >
                                <option value="cartos">Cartos</option>
                                <option value="qi">QI</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {saveError && (
                      <div className="mt-4 text-red-400 text-sm">{saveError}</div>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-gray-500 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none"
                        onClick={() => setEditModalOpen(false)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-cyan-700 bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 focus:outline-none disabled:opacity-60"
                        onClick={saveLeadData}
                        disabled={isSavingLead}
                      >
                        {isSavingLead ? (
                          <>
                            <FaSpinner className="animate-spin mr-2 w-4 h-4" />
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

        {/* Modal de Visualização de Lead */}
        <Transition.Root show={viewLeadModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setViewLeadModalOpen(false)}>
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
            </Transition.Child>
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                  <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700">
                    <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white mb-6">
                      Detalhes do Lead - {selectedLead?.name}
                    </Dialog.Title>

                    {selectedLead && (
                      <div className="space-y-6">
                        {/* Informações Básicas */}
                        <div>
                          <h4 className="text-sm font-semibold text-cyan-300 mb-4">Informações Básicas</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Nome</label>
                              <p className="text-white">{selectedLead.name || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">CPF</label>
                              <p className="text-white">{selectedLead.cpf || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Email</label>
                              <p className="text-white">{selectedLead.email || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Telefone</label>
                              <p className="text-white">{selectedLead.phone || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">RG</label>
                              <p className="text-white">{selectedLead.rg || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Nacionalidade</label>
                              <p className="text-white">{selectedLead.nationality || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Data de Nascimento</label>
                              <p className="text-white">{selectedLead.birth || '-'}</p>
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
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Nome da Mãe</label>
                              <p className="text-white">{selectedLead.mother_name || '-'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Endereço */}
                        <div>
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

                        {/* Informações Financeiras */}
                        <div>
                          <h4 className="text-sm font-semibold text-cyan-300 mb-4">Informações Financeiras</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Saldo</label>
                              <p className="text-white">{formatCurrency(selectedLead.balance)}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Simulação</label>
                              <p className="text-white">{formatCurrency(selectedLead.simulation)}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Valor da Proposta</label>
                              <p className="text-white">{formatCurrency(selectedLead.proposal_value)}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Status da Proposta</label>
                              <p className="text-white">{selectedLead.proposal_status || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">ID da Proposta</label>
                              <p className="text-white">{selectedLead.proposal_id || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Tipo da Chave PIX</label>
                              <p className="text-white">{selectedLead.pix || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Chave PIX</label>
                              <p className="text-white">{selectedLead.pix_key || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Erro da Consulta</label>
                              <p className="text-red-400 text-sm">{selectedLead.balance_error || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Erro da Proposta</label>
                              <p className="text-red-400 text-sm">{selectedLead.proposal_error || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Motivo do Erro</label>
                              <p className="text-red-400 text-sm">{selectedLead.error_reason || '-'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Parcelas */}
                        {selectedLead.parcelas && selectedLead.parcelas.length > 0 && (
                          <div className="md:w-1/2">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-sm font-semibold text-cyan-300">Parcelas do Saldo</h4>
                              <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
                                {selectedLead.parcelas.length} parcela{selectedLead.parcelas.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="bg-gray-800 p-3 rounded-lg max-h-48 overflow-y-auto">
                              {formatParcelas(selectedLead.parcelas).map((parcela, index) => {
                                return (
                                  <div key={index} className="flex justify-between items-center text-white text-sm mb-1 last:mb-0 border-b border-gray-700 pb-1 last:border-b-0">
                                    <span className="font-medium text-cyan-300">
                                      {parcela.ano !== '-' ? `${parcela.ano}` : `Parcela ${index + 1}`}:
                                    </span>
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
                                          // Extrair valor numérico da string formatada
                                          const valorStr = p.valor.replace(/[^\d,]/g, '').replace(',', '.')
                                          const valor = parseFloat(valorStr)
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
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Provedor</label>
                              <p className="text-white">{selectedLead.provider || '-'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Pessoa Exposta Politicamente (PEP)</label>
                              <p className="text-white">
                                {selectedLead.is_pep ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Sim
                                  </span>
                                ) : 'Não'}
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Tag de Ressaque</label>
                              <p className="text-white">
                                {selectedLead.ressaque_tag ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Ressaque
                                  </span>
                                ) : 'Não'}
                              </p>
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
                    )}

                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-gray-500 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none"
                        onClick={() => setViewLeadModalOpen(false)}
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
                                  selectedProposalInHistory && (selectedProposalInHistory.id === proposal.id || selectedProposalInHistory.proposal_id === proposal.proposal_id)
                                    ? 'border-cyan-500 bg-cyan-900/20'
                                    : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                                }`}
                                onClick={() => {
                                  if (selectedProposalInHistory && (selectedProposalInHistory.id === proposal.id || selectedProposalInHistory.proposal_id === proposal.proposal_id)) {
                                    setSelectedProposalInHistory(null) // Fechar detalhes se clicar no mesmo item
                                  } else {
                                    setSelectedProposalInHistory(proposal) // Abrir detalhes se clicar em item diferente
                                  }
                                }}
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
                                        proposal.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                                        'bg-gray-500/20 text-gray-400'
                                      }`}>
                                        {proposal.status === 'approved' ? 'Aprovada' :
                                         proposal.status === 'pending' ? 'Pendente' :
                                         proposal.status === 'rejected' ? 'Rejeitada' :
                                         proposal.status === 'paid' ? 'Paga' :
                                         proposal.status || 'Desconhecido'}
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      <span>Valor: {formatCurrency(proposal.value || proposal.amount)}</span>
                                      <span className="mx-2">•</span>
                                      <span>Criada em: {formatDate(proposal.created_at)}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Botão de Editar (apenas para propostas pendentes) */}
                                    {proposal.status === 'pending' && (
                                      <button
                                        className="p-1 rounded bg-purple-700/70 hover:bg-purple-500 transition-colors"
                                        title="Editar Proposta"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditProposalModal(proposal);
                                        }}
                                      >
                                        <FaEdit className="w-3 h-3 text-white" />
                                      </button>
                                    )}
                                    <FaChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                                      selectedProposalInHistory && (selectedProposalInHistory.id === proposal.id || selectedProposalInHistory.proposal_id === proposal.proposal_id) ? 'rotate-90' : ''
                                    }`} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Detalhes da Proposta Selecionada */}
                        {selectedProposalInHistory && (
                          <div className="bg-gray-800 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-cyan-300 mb-4">Dados do Proposta</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* ID da Proposta */}
                              <div>
                                <label className="block text-sm font-medium text-cyan-300 mb-1">ID da Proposta</label>
                                <p className="text-white text-sm break-all">{selectedProposalInHistory.proposal_id || selectedProposalInHistory.id}</p>
                              </div>

                              {/* Valor */}
                              <div>
                                <label className="block text-sm font-medium text-cyan-300 mb-1">Valor</label>
                                <p className="text-white">{formatCurrency(selectedProposalInHistory.value || selectedProposalInHistory.amount)}</p>
                              </div>

                              {/* Status */}
                              <div>
                                <label className="block text-sm font-medium text-cyan-300 mb-1">Status</label>
                                <p className="text-white">{selectedProposalInHistory.status || '-'}</p>
                              </div>

                              {/* Data de Criação */}
                              <div>
                                <label className="block text-sm font-medium text-cyan-300 mb-1">Data de Criação</label>
                                <p className="text-white">{formatDate(selectedProposalInHistory.created_at)}</p>
                              </div>

                              {/* Data de Atualização */}
                              <div>
                                <label className="block text-sm font-medium text-cyan-300 mb-1">Data de Atualização</label>
                                <p className="text-white">{formatDate(selectedProposalInHistory.updated_at)}</p>
                              </div>

                              {/* Número do Contrato */}
                              <div>
                                <label className="block text-sm font-medium text-cyan-300 mb-1">Número do Contrato</label>
                                <p className="text-white">{selectedProposalInHistory['Número contrato'] || '-'}</p>
                              </div>

                              {/* Link de Formalização */}
                              <div>
                                <label className="block text-sm font-medium text-cyan-300 mb-1">Link de Formalização</label>
                                {selectedProposalInHistory['Link de formalização'] ? (
                                  <a
                                    href={selectedProposalInHistory['Link de formalização']}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-400 hover:text-cyan-300 underline break-all text-sm"
                                  >
                                    {selectedProposalInHistory['Link de formalização']}
                                  </a>
                                ) : (
                                  <p className="text-white">-</p>
                                )}
                              </div>

                              {/* Status Reason */}
                              <div>
                                <label className="block text-sm font-medium text-cyan-300 mb-1">Motivo do Status</label>
                                <p className="text-white">{selectedProposalInHistory.status_reason || '-'}</p>
                              </div>

                              {/* Status Description */}
                              <div>
                                <label className="block text-sm font-medium text-cyan-300 mb-1">Descrição do Status</label>
                                <p className="text-white">{selectedProposalInHistory.status_description || '-'}</p>
                              </div>

                              {/* Error Reason */}
                              <div>
                                <label className="block text-sm font-medium text-cyan-300 mb-1">Motivo do Erro</label>
                                <p className="text-white">{selectedProposalInHistory.error_reason || '-'}</p>
                              </div>

                              {/* Chave PIX */}
                              <div>
                                <label className="block text-sm font-medium text-cyan-300 mb-1">Chave PIX</label>
                                <p className="text-white">{selectedProposalInHistory.chavePix || '-'}</p>
                              </div>

                              {/* Metadados - Ocupa toda a largura */}
                              {selectedProposalInHistory.metadata && Object.keys(selectedProposalInHistory.metadata).length > 0 && (
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-cyan-300 mb-2">Metadados</label>
                                  <div className="bg-gray-700 p-3 rounded-lg max-h-32 overflow-y-auto">
                                    <pre className="text-white text-xs overflow-auto">{JSON.stringify(selectedProposalInHistory.metadata, null, 2)}</pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-6 flex justify-between items-center">
                      {/* Botão de Criar Proposta */}
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-cyan-500 bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none transition-colors"
                        onClick={() => {
                          setProposalsHistoryModalOpen(false);
                          if (selectedLead) {
                            openCreateProposalModal(selectedLead);
                          }
                        }}
                      >
                        <FaPlus className="w-4 h-4 mr-2" />
                        Criar Nova Proposta
                      </button>

                      {/* Botão de Fechar */}
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

        {/* Modal de Edição de Proposta */}
        <Transition.Root show={editProposalModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setEditProposalModalOpen(false)}>
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
            </Transition.Child>
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                  <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700">
                    <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white mb-6">
                      Editar Proposta - {editingProposal?.proposal_id || editingProposal?.id}
                    </Dialog.Title>

                    {editProposalError && (
                      <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
                        <p className="text-red-400 text-sm">{editProposalError}</p>
                      </div>
                    )}

                    {editingProposal && (
                      <div className="space-y-6">
                        {/* Dados da Proposta (Somente Leitura) */}
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-cyan-300 mb-4">Dados da Proposta</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* ID da Proposta */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">ID da Proposta</label>
                              <p className="text-white text-sm">{editingProposal.proposal_id || editingProposal.id}</p>
                            </div>

                            {/* Valor */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Valor</label>
                              <p className="text-white">{formatCurrency(editingProposal.value || editingProposal.amount)}</p>
                            </div>

                            {/* Status */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Status</label>
                              <p className="text-white">{editingProposal.status || '-'}</p>
                            </div>

                            {/* Data de Criação */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Data de Criação</label>
                              <p className="text-white">{formatDate(editingProposal.created_at)}</p>
                            </div>

                            {/* Data de Atualização */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Data de Atualização</label>
                              <p className="text-white">{formatDate(editingProposal.updated_at)}</p>
                            </div>

                            {/* Número do Contrato */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Número do Contrato</label>
                              <p className="text-white">{editingProposal['Número contrato'] || '-'}</p>
                            </div>

                            {/* Link de Formalização */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Link de Formalização</label>
                              {editingProposal['Link de formalização'] ? (
                                <a
                                  href={editingProposal['Link de formalização']}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 hover:text-cyan-300 underline break-all text-sm"
                                >
                                  {editingProposal['Link de formalização']}
                                </a>
                              ) : (
                                <p className="text-white">-</p>
                              )}
                            </div>

                            {/* Motivo do Status */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Motivo do Status</label>
                              <p className="text-white">{editingProposal.status_reason || '-'}</p>
                            </div>

                            {/* Descrição do Status */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Descrição do Status</label>
                              <p className="text-white">{editingProposal.status_description || '-'}</p>
                            </div>

                            {/* Motivo do Erro */}
                            <div>
                              <label className="block text-sm font-medium text-cyan-300 mb-1">Motivo do Erro</label>
                              <p className="text-white">{editingProposal.error_reason || '-'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Campo Editável - Chave PIX */}
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-cyan-300 mb-4">Editar Chave PIX</h4>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-2">Chave PIX</label>
                            <input
                              type="text"
                              value={editingProposal.chavePix || ''}
                              onChange={(e) => setEditingProposal({...editingProposal, chavePix: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                              placeholder="Digite a chave PIX"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Este é o único campo editável da proposta
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-gray-500 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none"
                        onClick={() => setEditProposalModalOpen(false)}
                        disabled={isEditingProposal}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={saveProposalEdit}
                        disabled={isEditingProposal}
                      >
                        {isEditingProposal ? (
                          <>
                            <FaSpinner className="w-4 h-4 text-white animate-spin mr-2" />
                            Salvando...
                          </>
                        ) : (
                          'Salvar Alterações'
                        )}
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Modal de Seleção de Provedor */}
        <Transition.Root show={showProviderModal} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setShowProviderModal(false)}>
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
            </Transition.Child>
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700">
                    <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white mb-4">
                      Selecionar Provedor
                    </Dialog.Title>

                                      <div className="mb-6">
                    <p className="text-gray-200 mb-4">
                      Selecione qual provedor e banco deseja usar para consultar o saldo do lead <strong className="text-cyan-300">{selectedLeadForQuery?.name}</strong>:
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">Provedor</label>
                        <select
                          value={selectedProvider}
                          onChange={(e) => setSelectedProvider(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="cartos">Cartos</option>
                          <option value="qi">QI</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-2">Banco</label>
                        {loadingBanks ? (
                          <div className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white flex items-center">
                            <FaSpinner className="animate-spin mr-2 w-4 h-4" />
                            Carregando bancos...
                          </div>
                        ) : availableBanks.length > 0 ? (
                          <select
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="">Selecione um banco</option>
                            {availableBanks.map((bank) => (
                              <option key={bank.id} value={bank.id}>
                                {bank.name} ({bank.partner_type})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="w-full px-3 py-2 bg-gray-800 border border-red-500 rounded-lg text-red-400">
                            Nenhum banco disponível. Cadastre credenciais na página de Parceiros.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-gray-500 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none"
                        onClick={() => setShowProviderModal(false)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-cyan-700 bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 focus:outline-none disabled:opacity-60"
                        onClick={confirmRepeatQuery}
                        disabled={repeatingQuery === selectedLeadForQuery?.id}
                      >
                        {repeatingQuery === selectedLeadForQuery?.id ? (
                          <>
                            <FaSpinner className="animate-spin mr-2 w-4 h-4" />
                            Consultando...
                          </>
                        ) : (
                          'Confirmar Consulta'
                        )}
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Modal de Criar Proposta */}
        <Transition.Root show={createProposalModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setCreateProposalModalOpen(false)}>
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
            </Transition.Child>
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                  <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700 max-h-[90vh] overflow-y-auto">
                    <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white mb-6">
                      Criar Proposta - {selectedLeadForProposal?.name}
                    </Dialog.Title>

                    {createProposalError && (
                      <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                        {createProposalError}
                      </div>
                    )}

                    <div className="space-y-6">
                      {/* Dados do Lead */}
                      <div className="border-b border-gray-600 pb-4">
                        <h4 className="text-sm font-semibold text-cyan-300 mb-4">Dados do Lead</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Nome</label>
                            <input
                              type="text"
                              value={proposalFormData.name || ''}
                              onChange={(e) => setProposalFormData({...proposalFormData, name: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">CPF</label>
                            <input
                              type="text"
                              value={proposalFormData.cpf || ''}
                              onChange={(e) => setProposalFormData({...proposalFormData, cpf: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">RG</label>
                            <input
                              type="text"
                              value={proposalFormData.rg || ''}
                              onChange={(e) => setProposalFormData({...proposalFormData, rg: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Nome da Mãe</label>
                            <input
                              type="text"
                              value={proposalFormData.motherName || ''}
                              onChange={(e) => setProposalFormData({...proposalFormData, motherName: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Email</label>
                            <input
                              type="email"
                              value={proposalFormData.email || ''}
                              onChange={(e) => setProposalFormData({...proposalFormData, email: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Data de Nascimento</label>
                            <input
                              type="date"
                              value={proposalFormData.birthDate || ''}
                              onChange={(e) => setProposalFormData({...proposalFormData, birthDate: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Estado Civil</label>
                            <select
                              value={proposalFormData.maritalStatus || ''}
                              onChange={(e) => setProposalFormData({...proposalFormData, maritalStatus: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="">Selecione</option>
                              <option value="single">Solteiro</option>
                              <option value="married">Casado</option>
                              <option value="divorced">Divorciado</option>
                              <option value="widowed">Viúvo</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Telefone</label>
                            <input
                              type="text"
                              value={proposalFormData.phone || ''}
                              onChange={(e) => setProposalFormData({...proposalFormData, phone: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">CEP</label>
                            <input
                              type="text"
                              value={proposalFormData.postalCode || ''}
                              onChange={(e) => setProposalFormData({...proposalFormData, postalCode: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Número do Endereço</label>
                            <input
                              type="text"
                              value={proposalFormData.addressNumber || ''}
                              onChange={(e) => setProposalFormData({...proposalFormData, addressNumber: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-1">Chave PIX</label>
                            <input
                              type="text"
                              value={proposalFormData.chavePix || ''}
                              onChange={(e) => setProposalFormData({...proposalFormData, chavePix: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Seleção de Provedor e Banco */}
                      <div className="border-b border-gray-600 pb-4">
                        <h4 className="text-sm font-semibold text-cyan-300 mb-4">Configurações da Proposta</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-2">Provedor</label>
                            <select
                              value={selectedProvider}
                              onChange={(e) => setSelectedProvider(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="cartos">Cartos</option>
                              <option value="qi">QI</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-cyan-300 mb-2">Banco</label>
                            {loadingBanks ? (
                              <div className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white flex items-center">
                                <FaSpinner className="animate-spin mr-2 w-4 h-4" />
                                Carregando bancos...
                              </div>
                            ) : availableBanks.length > 0 ? (
                              <select
                                value={selectedBank}
                                onChange={(e) => setSelectedBank(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              >
                                <option value="">Selecione um banco</option>
                                {availableBanks.map((bank) => (
                                  <option key={bank.id} value={bank.id}>
                                    {bank.name} ({bank.partner_type})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="w-full px-3 py-2 bg-gray-800 border border-red-500 rounded-lg text-red-400">
                                Nenhum banco disponível. Cadastre credenciais na página de Parceiros.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-gray-500 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none"
                        onClick={() => setCreateProposalModalOpen(false)}
                        disabled={isCreatingProposal}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-cyan-700 bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 focus:outline-none disabled:opacity-60"
                        onClick={createProposal}
                        disabled={isCreatingProposal}
                      >
                        {isCreatingProposal ? (
                          <>
                            <FaSpinner className="animate-spin mr-2 w-4 h-4" />
                            Criando Proposta...
                          </>
                        ) : (
                          'Criar Proposta'
                        )}
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
      </div>
    </>
  )
}