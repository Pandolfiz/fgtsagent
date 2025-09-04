import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import supabase from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { 
  FaTrophy, 
  FaChartLine, 
  FaEye, 
  FaMousePointer, 
  FaDollarSign,
  FaCalendarAlt,
  FaFilter,
  FaSort,
  FaExternalLinkAlt,
  FaVideo,
  FaImage,
  FaAd,
  FaUsers,
  FaPercentage,
  FaClock,
  FaSpinner,
  FaSearch,
  FaChevronDown,
  FaChevronUp,
  FaDownload,
  FaRedo,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowUp,
  FaCheck,
  FaArrowDown,
  FaMinus,
  FaTimes
} from 'react-icons/fa';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/solid';
import { Dialog } from '@headlessui/react';
import { Fragment } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarElement
} from 'chart.js';
import { format, subDays, startOfMonth, endOfMonth, differenceInDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarElement
);

// Configuração global para gráficos
ChartJS.defaults.color = '#64748b';
ChartJS.defaults.font.family = '"Inter", "Helvetica", "Arial", sans-serif';

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

const Ads = () => {
  const [adsRanking, setAdsRanking] = useState([]);
  const [campaignStats, setCampaignStats] = useState(null);
  
  // Debug: Log quando campaignStats muda
  useEffect(() => {
    console.log('[DEBUG] campaignStats mudou:', campaignStats);
  }, [campaignStats]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAd, setSelectedAd] = useState(null);
  const [adDetails, setAdDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sortBy, setSortBy] = useState('total_leads');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPeriodChanging, setIsPeriodChanging] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMediaType, setSelectedMediaType] = useState('');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
      key: 'selection'
    }
  ]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  
  // Debug: Log quando campaignStats muda
  useEffect(() => {
    if (campaignStats) {
      console.log('[DEBUG] campaignStats atualizado:', {
        total_leads: campaignStats.summary?.total_leads,
        unique_ads: campaignStats.summary?.unique_ads,
        period_days: campaignStats.summary?.period_days,
        media_ranking: campaignStats.media_ranking?.length
      });
    }
  }, [campaignStats]);
  const [chartData, setChartData] = useState(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const calendarPositionRef = useRef({ top: 0, left: 0, right: 0 });

  // Função para formatar data única
  const formatSingleDate = (date) => {
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  const sortOptions = [
    { value: 'total_leads', label: 'Total de Mensagens' },
    { value: 'first_lead', label: 'Primeiro Mensagens' },
    { value: 'last_lead', label: 'Último Mensagens' }
  ];

  const mediaTypeOptions = [
    { value: '', label: 'Todos os Tipos' },
    { value: 'image', label: 'Imagem' },
    { value: 'video', label: 'Vídeo' },
    { value: 'carousel', label: 'Carrossel' },
    { value: 'story', label: 'Stories' }
  ];

  // Carregar ranking de anúncios
  const loadAdsRanking = async (isRefresh = false, period = 'custom') => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Token de acesso não encontrado');
      }

      // Construir URL com parâmetros
      let url = `/api/ads/ranking?period=${period}&limit=100`;
      
      if (period === 'custom' && dateRange[0]) {
        const startDate = dateRange[0].startDate.toISOString();
        const endDate = dateRange[0].endDate.toISOString();
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar ranking: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setAdsRanking(data.data.ranking);
      } else {
        throw new Error(data.message || 'Erro ao carregar dados');
      }
    } catch (err) {
      console.error('Erro ao carregar ranking de anúncios:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Carregar estatísticas de campanhas
  const loadCampaignStats = async (period = 'custom') => {
    try {
      console.log('[DEBUG] === INICIANDO loadCampaignStats ===');
      console.log('[DEBUG] Período atual:', period);
      console.log('[DEBUG] Estado atual campaignStats:', campaignStats);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Token de acesso não encontrado');
      }

      // Construir URL com parâmetros
      let url = `/api/ads/campaigns/stats?period=${period}`;
      
      if (period === 'custom' && dateRange[0]) {
        const startDate = dateRange[0].startDate.toISOString();
        const endDate = dateRange[0].endDate.toISOString();
        url += `&startDate=${startDate}&endDate=${endDate}`;
        console.log('[DEBUG] Período customizado:', { 
          startDate, 
          endDate, 
          dateRange: dateRange[0],
          period 
        });
      } else if (period === 'custom') {
        console.log('[DEBUG] Período custom mas sem dateRange:', { period, dateRange });
      }

      console.log('[DEBUG] URL da requisição:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar estatísticas: ${response.status}`);
      }

      const data = await response.json();
      console.log('[DEBUG] Dados recebidos:', data);
      
      if (data.success) {
        console.log('[DEBUG] Definindo campaignStats com dados:', data.data);
        setCampaignStats(data.data);
        console.log('[DEBUG] === FINALIZANDO loadCampaignStats com sucesso ===');
      } else {
        console.error('[DEBUG] Erro na resposta:', data.message);
        // Não resetar o estado em caso de erro
        console.log('[DEBUG] Mantendo campaignStats atual:', campaignStats);
        console.log('[DEBUG] === FINALIZANDO loadCampaignStats com erro ===');
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas de campanhas:', err);
      console.log('[DEBUG] === ERRO em loadCampaignStats ===');
      console.log('[DEBUG] Mantendo campaignStats atual:', campaignStats);
      console.log('[DEBUG] === FINALIZANDO loadCampaignStats com erro ===');
    }
  };

  // Carregar detalhes de um anúncio
  const loadAdDetails = async (adsId) => {
    try {
      setLoadingDetails(true);
      setSelectedAd(adsId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Token de acesso não encontrado');
      }

      // Construir URL com parâmetros
      let url = `/api/ads/${adsId}/details?period=custom`;
      
      if (dateRange[0]) {
        const startDate = dateRange[0].startDate.toISOString();
        const endDate = dateRange[0].endDate.toISOString();
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar detalhes: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setAdDetails(data.data);
        setDetailsModalOpen(true);
      } else {
        throw new Error(data.message || 'Erro ao carregar detalhes');
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes do anúncio:', err);
      setError(err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Função para carregar dados do gráfico
  const loadChartData = async (period = 'custom') => {
    try {
      setLoadingChart(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Token de acesso não encontrado');
      }

      // Calcular período baseado na seleção
      let startDate, endDate;
      if (period === 'custom') {
        startDate = dateRange[0].startDate;
        endDate = dateRange[0].endDate;
      } else {
        endDate = new Date();
        startDate = subDays(endDate, parseInt(period));
      }

      const response = await fetch(`/api/ads/chart-data?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar dados do gráfico: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setChartData(data.data);
      } else {
        throw new Error(data.message || 'Erro ao carregar dados do gráfico');
      }
    } catch (err) {
      console.error('Erro ao carregar dados do gráfico:', err);
      // Em caso de erro, criar dados simulados para demonstração
      setChartData(createMockChartData());
    } finally {
      setLoadingChart(false);
    }
  };

  // Função para criar dados simulados do gráfico
  const createMockChartData = () => {
    const days = [];
    const leadsData = [];
    
    const startDate = dateRange[0].startDate;
    const endDate = dateRange[0].endDate;
    const totalDays = differenceInDays(endDate, startDate) + 1;
    
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      days.push(format(date, 'dd/MM', { locale: ptBR }));
      
                        // Simular dados com variação
                  const baseLeads = Math.floor(Math.random() * 20) + 5;

                  leadsData.push(baseLeads);
    }
    
    return {
      labels: days,
      datasets: [
        {
          label: 'Mensagens',
          data: leadsData,
          borderColor: 'rgb(34, 211, 238)',
          backgroundColor: 'rgba(34, 211, 238, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  // Função para refresh dos dados
  const handleRefresh = () => {
    loadAdsRanking(true);
    loadCampaignStats();
    loadChartData();
  };

  // Função para exportar dados
  const handleExport = () => {
    try {
      const exportData = filteredAds.map((ad, index) => ({
        'Posição': index + 1,
        'ID do Anúncio': ad.ads_id,
        'Título': ad.ads_headline || 'N/A',
        'Descrição': ad.ads_copy || 'N/A',
        'Tipo de Mídia': ad.media_type || 'N/A',
        'Total de Leads': ad.total_leads,
        'Conversões': ad.total_conversions,
        'Taxa de Conversão (%)': parseFloat(ad.conversion_rate).toFixed(2),
        'Conversões Pagas': ad.paid_conversions,
        'Taxa de Conversão Paga (%)': parseFloat(ad.paid_conversion_rate).toFixed(2),
        'Valor Total': ad.total_value || 0,
        'Valor Médio': ad.average_value || 0,
        'Link do Anúncio': ad.source_url || 'N/A'
      }));

      // Converter para CSV
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escapar vírgulas e aspas
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // Criar e baixar arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `ranking-anuncios-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      setError('Erro ao exportar dados. Tente novamente.');
    }
  };

  // Função para filtrar e ordenar dados
  const getFilteredAndSortedData = () => {
    let filtered = adsRanking;

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(ad => 
        ad.ads_headline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ad.ads_copy?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tipo de mídia
    if (selectedMediaType) {
      filtered = filtered.filter(ad => ad.media_type === selectedMediaType);
    }

    // Ordenação
    filtered.sort((a, b) => {
      let aValue = a[sortBy] || 0;
      let bValue = b[sortBy] || 0;

      if (sortBy.includes('rate')) {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return filtered;
  };

  // Função para obter ícone de tendência
  const getTrendIcon = (value, previousValue) => {
    if (value > previousValue) return <FaArrowUp className="text-green-400" />;
    if (value < previousValue) return <FaArrowDown className="text-red-400" />;
    return <FaMinus className="text-gray-400" />;
  };

  // Função para formatar valores
  const formatValue = (value, type = 'number') => {
    if (type === 'currency') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    }
    if (type === 'percentage') {
      return `${parseFloat(value).toFixed(2)}%`;
    }
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Função para alternar ordenação
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  // Função para obter ícone do tipo de mídia
  const getMediaIcon = (mediaType) => {
    switch (mediaType?.toLowerCase()) {
      case 'video':
        return <FaVideo className="text-blue-400" />;
      case 'image':
        return <FaImage className="text-green-400" />;
      case 'carousel':
        return <FaAd className="text-purple-400" />;
      case 'story':
        return <FaClock className="text-orange-400" />;
      default:
        return <FaAd className="text-gray-400" />;
    }
  };



  // Função para aplicar período personalizado
  const applyCustomPeriod = async () => {
    console.log('[DEBUG] === APLICANDO PERÍODO PERSONALIZADO ===');
    console.log('[DEBUG] dateRange atual:', dateRange[0]);
    
    setIsCalendarOpen(false);
    setIsPeriodChanging(true);
    
    try {
      console.log('[DEBUG] Iniciando carregamento de dados...');
      await Promise.all([
        loadAdsRanking(false, 'custom'),
        loadCampaignStats('custom'),
        loadChartData('custom')
      ]);
      console.log('[DEBUG] === PERÍODO PERSONALIZADO APLICADO COM SUCESSO ===');
    } catch (error) {
      console.error('[DEBUG] Erro ao aplicar período personalizado:', error);
    } finally {
      setIsPeriodChanging(false);
    }
  };

  // Função para abrir calendário
  const openCustomCalendar = () => {
    setIsCalendarOpen(true);
    updateCalendarPosition();
  };

  // Função para atualizar a posição do calendário
  const updateCalendarPosition = () => {
    // Buscar especificamente o botão do período usando um ID único
    const periodButton = document.getElementById('period-button');
    if (periodButton) {
      const rect = periodButton.getBoundingClientRect();
      const portalWidth = 650; // Largura do portal com 2 meses
      const viewportWidth = window.innerWidth;
      
      // Calcular posição horizontal para centralizar ou ajustar se necessário
      let left = rect.left + window.scrollX;
      
      // Se o portal não cabe à direita, ajustar para a esquerda
      if (left + portalWidth > viewportWidth) {
        left = viewportWidth - portalWidth - 20; // 20px de margem
      }
      
      // Se ainda não cabe, centralizar
      if (left < 20) {
        left = (viewportWidth - portalWidth) / 2;
      }
      
      calendarPositionRef.current = {
        top: rect.bottom + window.scrollY + 4,
        left: Math.max(20, left), // Mínimo 20px da borda
        right: window.innerWidth - rect.right - window.scrollX
      };
    }
  };

  // Carregar dados iniciais apenas uma vez
  useEffect(() => {
    console.log('[DEBUG] Carregando dados iniciais...');
    loadAdsRanking();
    loadCampaignStats();
    loadChartData();
  }, []);

  // OTIMIZADO: Debounce simplificado igual ao Dashboard
  useEffect(() => {
    console.log('[DEBUG] === USEEFFECT dateRange (OTIMIZADO) ===');
    console.log('[DEBUG] dateRange[0]:', dateRange[0]);
    
    // Só carregar se:
    // 1. dateRange[0] existir
    // 2. Tanto startDate quanto endDate estiverem definidos
    // 3. startDate e endDate forem diferentes (intervalo válido)
    if (dateRange[0] && dateRange[0].startDate && dateRange[0].endDate) {
      const startDate = dateRange[0].startDate;
      const endDate = dateRange[0].endDate;
      
      // Verificar se é um intervalo válido (não o mesmo dia)
      if (startDate.getTime() !== endDate.getTime()) {
        console.log('[DEBUG] Intervalo válido detectado, aguardando 300ms antes de carregar...');
        
        // Debounce de 300ms para evitar múltiplas requisições (otimizado igual ao Dashboard)
        const timer = setTimeout(() => {
          console.log('[DEBUG] Carregando dados após debounce...');
          console.log('[DEBUG] Período:', startDate.toISOString(), 'até', endDate.toISOString());
          
          setIsPeriodChanging(true);
          Promise.all([
            loadAdsRanking(false, 'custom'),
            loadCampaignStats('custom'),
            loadChartData('custom')
          ]).finally(() => {
            setIsPeriodChanging(false);
          });
        }, 300);
        
        // Cleanup do timer se o componente desmontar ou dependências mudarem
        return () => {
          console.log('[DEBUG] Limpando timer de debounce');
          clearTimeout(timer);
        };
      } else {
        console.log('[DEBUG] Mesmo dia selecionado, aguardando seleção de intervalo...');
      }
    }
  }, [dateRange]);

  // Controlar o calendário (similar ao Dashboard)
  useEffect(() => {
    function handleClickOutside(event) {
      const calendar = document.getElementById('calendar-dropdown');
      const periodButton = document.querySelector('button[type="button"]');
      
      if (calendar && periodButton && 
          !calendar.contains(event.target) && 
          !periodButton.contains(event.target)) {
        setIsCalendarOpen(false);
      }
    }

    function handleScroll() {
      if (isCalendarOpen) {
        updateCalendarPosition();
      }
    }

    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);
      // Atualizar a posição ao abrir o calendário
      updateCalendarPosition();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    }
  }, [isCalendarOpen]);

  // Obter dados filtrados e ordenados
  const filteredAds = getFilteredAndSortedData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-30px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-cyan-100">Carregando dados de anúncios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950">
      <Navbar />
      <div className="p-6 pt-5">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <FaTrophy className="text-yellow-400" />
                  Ranking de Anúncios
                </h1>
                <p className="text-cyan-200">
                  Análise de performance dos anúncios baseada em leads e conversões
                </p>
              </div>
              
              {/* Controles */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Barra de busca */}
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-300" />
                  <input
                    type="text"
                    placeholder="Buscar anúncios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-lg bg-cyan-950 border border-cyan-500 text-cyan-100 placeholder-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 w-64"
                  />
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2"
                  >
                    <FaFilter />
                    Filtros
                    {showFilters ? <FaChevronUp /> : <FaChevronDown />}
                  </Button>
                  
                                  <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2"
                >
                  {isRefreshing ? <FaSpinner className="animate-spin" /> : <FaRedo />}
                  Atualizar
                </Button>
                
                <Button
                  onClick={handleExport}
                  className="flex items-center gap-2"
                >
                  <FaDownload />
                  Exportar
                </Button>
                </div>
              </div>
            </div>

            {/* Filtros expandidos */}
            {showFilters && (
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/30 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Período */}
                  <div>
                    <label className="block text-cyan-200 text-sm font-medium mb-2">
                      <FaCalendarAlt className="inline mr-2" />
                      Período
                    </label>
                    <div className="relative">
                      <button
                        id="period-button"
                        type="button"
                        className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors duration-200 bg-white/5 border-cyan-500 text-cyan-100 ${
                          isPeriodChanging ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => {
                          updateCalendarPosition();
                          setIsCalendarOpen(true);
                        }}
                        disabled={isPeriodChanging}
                      >
                        {isPeriodChanging 
                          ? 'Carregando...' 
                          : dateRange[0].startDate && dateRange[0].endDate ?
                            (dateRange[0].startDate.getTime() === dateRange[0].endDate.getTime() ?
                              formatSingleDate(dateRange[0].startDate) :
                              `${format(dateRange[0].startDate, 'dd/MM')} a ${format(dateRange[0].endDate, 'dd/MM/yyyy')}`)
                            : 'Selecionar período'
                        }
                      </button>
                      
                      {/* Indicador de loading durante mudança de período */}
                      {isPeriodChanging && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  

                  {/* Tipo de Mídia */}
                  <div>
                    <label className="block text-cyan-200 text-sm font-medium mb-2">
                      <FaVideo className="inline mr-2" />
                      Tipo de Mídia
                    </label>
                    <select
                      value={selectedMediaType}
                      onChange={(e) => setSelectedMediaType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-cyan-950 border border-cyan-500 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                    >
                      {mediaTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ordenação */}
                  <div>
                    <label className="block text-cyan-200 text-sm font-medium mb-2">
                      <FaSort className="inline mr-2" />
                      Ordenar por
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-cyan-950 border border-cyan-500 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                    >
                      {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Estatísticas Gerais */}
            {campaignStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30 hover:border-cyan-400/50 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-200 text-sm font-medium">Total de Mensagens</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {formatValue(campaignStats.summary.total_leads)}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {getTrendIcon(campaignStats.summary.total_leads, 0)}
                        <span className="text-xs text-cyan-300">vs período anterior</span>
                      </div>
                    </div>
                    <div className="p-3 bg-cyan-500/20 rounded-full">
                      <FaUsers className="text-cyan-400 text-2xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-6 border border-green-400/30 hover:border-green-400/50 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-200 text-sm font-medium">Anúncios Únicos</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {formatValue(campaignStats.summary.unique_ads)}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {getTrendIcon(campaignStats.summary.unique_ads, 0)}
                        <span className="text-xs text-green-300">ativos no período</span>
                      </div>
                    </div>
                    <div className="p-3 bg-green-500/20 rounded-full">
                      <FaAd className="text-green-400 text-2xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-xl p-6 border border-blue-400/30 hover:border-blue-400/50 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-200 text-sm font-medium">Período</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {campaignStats.summary.period_days}
                      </p>
                      <p className="text-xs text-blue-300 mt-2">dias analisados</p>
                    </div>
                    <div className="p-3 bg-blue-500/20 rounded-full">
                      <FaClock className="text-blue-400 text-2xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-6 border border-purple-400/30 hover:border-purple-400/50 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-200 text-sm font-medium">Média por Anúncio</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {campaignStats.summary.total_leads > 0 && campaignStats.summary.unique_ads > 0 
                          ? Math.round(campaignStats.summary.total_leads / campaignStats.summary.unique_ads)
                          : 0
                        }
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <FaChartLine className="text-purple-400 text-xs" />
                        <span className="text-xs text-purple-300">leads por anúncio</span>
                      </div>
                    </div>
                    <div className="p-3 bg-purple-500/20 rounded-full">
                      <FaChartLine className="text-purple-400 text-2xl" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gráficos de Performance Temporal */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <FaChartLine className="text-cyan-400" />
                  Performance
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-200 text-sm">
                    {`${format(dateRange[0].startDate, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange[0].endDate, 'dd/MM/yyyy', { locale: ptBR })}`}
                  </span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
                {loadingChart ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                      <p className="text-cyan-100">Carregando dados do gráfico...</p>
                    </div>
                  </div>
                ) : chartData ? (
                  <div className="h-96">
                    <Line
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            labels: {
                              color: '#e5e7eb',
                              font: {
                                family: '"Inter", "Helvetica", "Arial", sans-serif'
                              }
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(17, 24, 39, 0.9)',
                            titleColor: '#e5e7eb',
                            bodyColor: '#e5e7eb',
                            borderColor: 'rgba(34, 211, 238, 0.3)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            displayColors: true,
                            callbacks: {
                              label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                  label += ': ';
                                }
                                label += new Intl.NumberFormat('pt-BR').format(context.parsed.y);
                                return label;
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            grid: {
                              color: 'rgba(34, 211, 238, 0.1)',
                              drawBorder: false
                            },
                            ticks: {
                              color: '#9ca3af',
                              font: {
                                family: '"Inter", "Helvetica", "Arial", sans-serif'
                              }
                            }
                          },
                          y: {
                            grid: {
                              color: 'rgba(34, 211, 238, 0.1)',
                              drawBorder: false
                            },
                            ticks: {
                              color: '#9ca3af',
                              font: {
                                family: '"Inter", "Helvetica", "Arial", sans-serif'
                              },
                              callback: function(value) {
                                return new Intl.NumberFormat('pt-BR').format(value);
                              }
                            }
                          }
                        },
                        interaction: {
                          intersect: false,
                          mode: 'index'
                        },
                        elements: {
                          point: {
                            radius: 4,
                            hoverRadius: 6,
                            backgroundColor: 'rgba(34, 211, 238, 0.8)',
                            borderColor: 'rgb(34, 211, 238)',
                            borderWidth: 2
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FaChartLine className="text-cyan-400 text-4xl mx-auto mb-4" />
                    <p className="text-cyan-200">Nenhum dado disponível para o período selecionado</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {/* Ranking de Anúncios */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <FaTrophy className="text-yellow-400" />
                Ranking de Anúncios
                <span className="text-sm font-normal text-cyan-300">
                  ({filteredAds.length} anúncios)
                </span>
              </h2>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
                  className="flex items-center gap-2"
                >
                  {viewMode === 'cards' ? <FaSort /> : <FaTrophy />}
                  {viewMode === 'cards' ? 'Ver Tabela' : 'Ver Cards'}
                </Button>
              </div>
            </div>

            {filteredAds.length === 0 ? (
              /* Estado Vazio */
              <div className="text-center py-16">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 border border-cyan-500/30">
                  <FaTrophy className="text-cyan-400 text-6xl mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-white mb-4">
                    {searchTerm || selectedMediaType ? 'Nenhum anúncio encontrado' : 'Nenhum anúncio disponível'}
                  </h3>
                  <p className="text-cyan-200 mb-6">
                    {searchTerm || selectedMediaType 
                      ? 'Tente ajustar os filtros ou termo de busca para encontrar anúncios.'
                      : 'Não há dados de anúncios para o período selecionado.'
                    }
                  </p>
                  {(searchTerm || selectedMediaType) && (
                    <div className="flex justify-center gap-4">
                      <Button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedMediaType('');
                        }}
                        className="flex items-center gap-2"
                      >
                        <FaFilter />
                        Limpar Filtros
                      </Button>
                      <Button
                        onClick={handleRefresh}
                        className="flex items-center gap-2"
                      >
                        <FaRedo />
                        Atualizar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : viewMode === 'cards' ? (
              /* Visualização em Cards */
              <div className="relative">
                {/* Overlay de loading durante mudança de período */}
                {isPeriodChanging && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center">
                    <div className="bg-cyan-950/90 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/30">
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-400 border-t-transparent"></div>
                        <span className="text-cyan-200 text-sm">Atualizando dados...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAds.map((ad, index) => (
                  <div 
                    key={ad.ads_id}
                    className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10"
                  >
                    {/* Header do Card */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          index === 0 ? 'bg-yellow-500/20' :
                          index === 1 ? 'bg-gray-400/20' :
                          index === 2 ? 'bg-orange-500/20' :
                          'bg-cyan-500/20'
                        }`}>
                          {index < 3 ? (
                            <FaTrophy className={`text-lg ${
                              index === 0 ? 'text-yellow-400' : 
                              index === 1 ? 'text-gray-300' : 
                              'text-orange-400'
                            }`} />
                          ) : (
                            <span className="text-white font-bold text-sm">#{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-sm line-clamp-2">
                            {ad.ads_headline || 'Anúncio sem título'}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getMediaIcon(ad.media_type)}
                            <span className="text-cyan-300 text-xs capitalize">
                              {ad.media_type || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => loadAdDetails(ad.ads_id)}
                        className="p-2 text-xs"
                      >
                        <FaEye />
                      </Button>
                    </div>

                    {/* Métricas */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-cyan-200 text-sm">Mensagens</span>
                        <span className="text-white font-semibold">
                          {formatValue(ad.total_leads)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-cyan-200 text-sm">Período</span>
                        <span className="text-cyan-300 text-xs">
                          {ad.first_lead && ad.last_lead ? (
                            <>
                              {format(new Date(ad.first_lead), 'dd/MM', { locale: ptBR })} - {format(new Date(ad.last_lead), 'dd/MM', { locale: ptBR })}
                            </>
                          ) : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-4 border-t border-cyan-700/30">
                      <div className="flex items-center justify-between text-xs text-cyan-300">
                        <span>ID: {ad.ads_id}</span>
                        {ad.source_url && (
                          <a 
                            href={ad.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-cyan-200 transition-colors"
                          >
                            <FaExternalLinkAlt />
                            Ver Anúncio
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            ) : (
              /* Visualização em Tabela */
              <div className="relative">
                {/* Overlay de loading durante mudança de período */}
                {isPeriodChanging && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center">
                    <div className="bg-cyan-950/90 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/30">
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-400 border-t-transparent"></div>
                        <span className="text-cyan-200 text-sm">Atualizando dados...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-cyan-950/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-cyan-200 font-medium">#</th>
                        <th className="px-4 py-3 text-left text-cyan-200 font-medium">Anúncio</th>
                        <th className="px-4 py-3 text-left text-cyan-200 font-medium">Tipo</th>
                        <th 
                          className="px-4 py-3 text-left text-cyan-200 font-medium cursor-pointer hover:bg-cyan-800/50 transition-colors"
                          onClick={() => toggleSort('total_leads')}
                        >
                          <div className="flex items-center gap-2">
                            Leads
                            {sortBy === 'total_leads' && (
                              <FaSort className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>

                        <th className="px-4 py-3 text-left text-cyan-200 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAds.map((ad, index) => (
                        <tr 
                          key={ad.ads_id} 
                          className="border-b border-cyan-700/30 hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-4 text-cyan-100">
                            <div className="flex items-center gap-2">
                              {index < 3 && (
                                <FaTrophy className={`text-lg ${
                                  index === 0 ? 'text-yellow-400' : 
                                  index === 1 ? 'text-gray-300' : 
                                  'text-orange-400'
                                }`} />
                              )}
                              <span className="font-semibold">#{index + 1}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="max-w-xs">
                              <p className="text-white font-medium truncate" title={ad.ads_headline}>
                                {ad.ads_headline}
                              </p>
                              <p className="text-cyan-300 text-sm truncate" title={ad.ads_copy}>
                                {ad.ads_copy}
                              </p>
                              {ad.source_url && (
                                <a 
                                  href={ad.source_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 text-xs hover:text-cyan-300 flex items-center gap-1 mt-1"
                                >
                                  <FaExternalLinkAlt className="w-3 h-3" />
                                  Ver anúncio
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {getMediaIcon(ad.media_type)}
                              <span className="text-cyan-200 text-sm capitalize">
                                {ad.media_type || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-white font-semibold">
                            {formatValue(ad.total_leads)}
                          </td>
                          <td className="px-4 py-4">
                            <Button
                              onClick={() => loadAdDetails(ad.ads_id)}
                              className="p-2 text-xs"
                            >
                              <FaEye />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar com Estatísticas por Tipo de Mídia */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FaChartLine className="text-cyan-400" />
                Por Tipo de Mídia
              </h3>
              
              {campaignStats?.media_breakdown && (
                <div className="space-y-4">
                  {Object.entries(campaignStats.media_breakdown).map(([mediaType, stats]) => (
                    <div key={mediaType} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getMediaIcon(mediaType)}
                          <span className="text-white font-medium capitalize">{mediaType}</span>
                        </div>
                        <span className="text-cyan-300 text-sm">
                          {formatValue(stats.count)} anúncios
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-cyan-200">Mensagens:</span>
                          <span className="text-white">{formatValue(stats.total_leads)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-cyan-200">Média:</span>
                          <span className="text-cyan-300">
                            {stats.count > 0 ? Math.round(stats.total_leads / stats.count) : 0} por anúncio
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de Detalhes do Anúncio */}
        <Transition appear show={detailsModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setDetailsModalOpen(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
            </Transition.Child>

            <div className="fixed inset-0 z-50 overflow-y-auto">
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
                  <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-900 to-blue-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-500/30">
                    {loadingDetails ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                          <p className="text-cyan-100">Carregando detalhes do anúncio...</p>
                        </div>
                      </div>
                    ) : adDetails ? (
                      <div>
                        {/* Header do Modal */}
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-white flex items-center gap-3">
                              <FaTrophy className="text-yellow-400" />
                              Detalhes do Anúncio
                            </Dialog.Title>
                            <p className="text-cyan-200 mt-2">Análise completa de performance</p>
                          </div>
                          <button
                            onClick={() => setDetailsModalOpen(false)}
                            className="text-cyan-300 hover:text-white transition-colors"
                          >
                            <FaTimesCircle className="text-2xl" />
                          </button>
                        </div>

                        {/* Informações do Anúncio */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
                            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                              <FaAd className="text-cyan-400" />
                              Informações do Anúncio
                            </h4>
                            <div className="space-y-3">
                              <div>
                                <label className="text-cyan-200 text-sm font-medium">Título</label>
                                <p className="text-white font-medium">{adDetails.ads_headline || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="text-cyan-200 text-sm font-medium">Descrição</label>
                                <p className="text-white">{adDetails.ads_copy || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="text-cyan-200 text-sm font-medium">Tipo de Mídia</label>
                                <div className="flex items-center gap-2 mt-1">
                                  {getMediaIcon(adDetails.media_type)}
                                  <span className="text-white capitalize">{adDetails.media_type || 'N/A'}</span>
                                </div>
                              </div>
                              <div>
                                <label className="text-cyan-200 text-sm font-medium">ID do Anúncio</label>
                                <p className="text-cyan-300 font-mono text-sm">{adDetails.ads_id}</p>
                              </div>
                              {adDetails.source_url && (
                                <div>
                                  <label className="text-cyan-200 text-sm font-medium">Link do Anúncio</label>
                                  <a 
                                    href={adDetails.source_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 mt-1"
                                  >
                                    <FaExternalLinkAlt />
                                    Ver anúncio original
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
                            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                              <FaChartLine className="text-green-400" />
                              Métricas de Performance
                            </h4>
                            <div className="space-y-4">
                              <div className="text-center">
                                <p className="text-4xl font-bold text-white">{formatValue(adDetails.metrics?.total_leads || 0)}</p>
                                <p className="text-cyan-200 text-lg">Total de Mensagens</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-cyan-700/30">
                                <div className="text-center">
                                  <p className="text-lg font-bold text-cyan-400">
                                    {adDetails.metrics?.first_lead ? format(new Date(adDetails.metrics.first_lead), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                                  </p>
                                  <p className="text-cyan-200 text-sm">Primeira Mensagem</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-bold text-cyan-400">
                                    {adDetails.metrics?.last_lead ? format(new Date(adDetails.metrics.last_lead), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                                  </p>
                                  <p className="text-cyan-200 text-sm">Última Mensagem</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Timeline de Performance */}
                        {adDetails.timeline && adDetails.timeline.length > 0 && (
                          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30 mb-6">
                            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                              <FaClock className="text-blue-400" />
                              Timeline de Performance
                            </h4>
                            <div className="space-y-3">
                              {adDetails.timeline.map((day, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                                    <span className="text-white font-medium">{day.date}</span>
                                  </div>
                                  <div className="flex items-center gap-6">
                                    <span className="text-cyan-200 text-sm">{day.count} Mensagens</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Período de Análise */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
                          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FaCalendarAlt className="text-purple-400" />
                            Período de Análise
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-white">{adDetails.period_days || 0}</p>
                              <p className="text-cyan-200 text-sm">Dias Analisados</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-cyan-400">
                                {adDetails.metrics?.total_leads > 0 && adDetails.period_days > 0 
                                  ? Math.round(adDetails.metrics.total_leads / adDetails.period_days)
                                  : 0
                                }
                              </p>
                              <p className="text-cyan-200 text-sm">Leads por Dia</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-400">
                                {adDetails.metrics?.total_conversions > 0 && adDetails.period_days > 0 
                                  ? Math.round(adDetails.metrics.total_conversions / adDetails.period_days)
                                  : 0
                                }
                              </p>
                              <p className="text-cyan-200 text-sm">Conversões por Dia</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FaExclamationTriangle className="text-yellow-400 text-4xl mx-auto mb-4" />
                        <p className="text-cyan-200">Erro ao carregar detalhes do anúncio</p>
                      </div>
                    )}
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
                 </Transition>

         {/* Portal do Calendário - Renderizado fora da estrutura normal (similar ao Dashboard) */}
         {isCalendarOpen && (
           <Portal>
             <div id="calendar-dropdown" className="absolute z-[999] bg-cyan-950 border border-cyan-700 rounded-lg shadow-xl" style={{
               top: calendarPositionRef.current.top,
               left: calendarPositionRef.current.left || 'auto',
               width: '650px',
               minWidth: '600px'
             }}>
               <div className="p-3 border-b border-cyan-700/30">
                 <div className="flex items-center justify-between">
                   <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                     <FaCalendarAlt className="text-cyan-400" />
                     Selecionar Período
                   </h4>
                   <button
                     onClick={() => setIsCalendarOpen(false)}
                     className="text-cyan-400 hover:text-cyan-300 transition-colors p-1"
                   >
                     <FaTimes className="text-sm" />
                   </button>
                 </div>
               </div>
               
               <div className="p-3 min-w-[600px]">
                 <DateRange
                   editableDateInputs={true}
                   onChange={(item) => {
                     console.log('[DEBUG] DateRange onChange:', item.selection);
                     setDateRange([item.selection]);
                   }}
                   moveRangeOnFirstSelection={false}
                   ranges={dateRange}
                   locale={ptBR}
                   className="date-range-picker"
                   showMonthAndYearPickers={true}
                   showSelectionPreview={true}
                   showDateDisplay={false}
                   months={2}
                   direction="horizontal"
                   rangeColors={['#06b6d4']}
                   color="#06b6d4"
                   staticRanges={[]}
                   inputRanges={[]}
                   preventSnapRefocus={true}
                   retainScrollPosition={true}
                   showPreview={false}
                 />
               </div>
               
               <div className="p-3 border-t border-cyan-700/30 bg-cyan-900/20">
                 {/* Botões de período padrão */}
                 <div className="flex flex-wrap gap-2 mb-3">
                   <Button onClick={async () => {
                     const end = new Date();
                     const start = subDays(end, 6);
                     const newDateRange = [{
                       startDate: start,
                       endDate: end,
                       key: 'selection'
                     }];
                     console.log(`[FILTER-DEBUG] Botão "7 dias" clicado`);
                     setDateRange(newDateRange);
                     setIsCalendarOpen(false);
                     
                     // Carregar dados imediatamente
                     setIsPeriodChanging(true);
                     try {
                       await Promise.all([
                         loadAdsRanking(false, 'custom'),
                         loadCampaignStats('custom'),
                         loadChartData('custom')
                       ]);
                       console.log('[DEBUG] Dados de 7 dias carregados com sucesso');
                     } catch (error) {
                       console.error('Erro ao carregar dados de 7 dias:', error);
                     } finally {
                       setIsPeriodChanging(false);
                     }
                   }} className="text-xs px-2 py-1 whitespace-nowrap">7 dias</Button>

                   <Button onClick={async () => {
                     const end = new Date();
                     const start = subDays(end, 29);
                     const newDateRange = [{
                       startDate: start,
                       endDate: end,
                       key: 'selection'
                     }];
                     console.log(`[FILTER-DEBUG] Botão "30 dias" clicado`);
                     setDateRange(newDateRange);
                     setIsCalendarOpen(false);
                     
                     // Carregar dados imediatamente
                     setIsPeriodChanging(true);
                     try {
                       await Promise.all([
                         loadAdsRanking(false, 'custom'),
                         loadCampaignStats('custom'),
                         loadChartData('custom')
                       ]);
                       console.log('[DEBUG] Dados de 30 dias carregados com sucesso');
                     } catch (error) {
                       console.error('Erro ao carregar dados de 30 dias:', error);
                     } finally {
                       setIsPeriodChanging(false);
                     }
                   }} className="text-xs px-2 py-1 whitespace-nowrap">30 dias</Button>

                   <Button onClick={async () => {
                     const today = new Date();
                     const start = startOfMonth(today);
                     const end = endOfMonth(today);
                     const newDateRange = [{
                       startDate: start,
                       endDate: end,
                       key: 'selection'
                     }];
                     console.log(`[FILTER-DEBUG] Botão "Este mês" clicado`);
                     setDateRange(newDateRange);
                     setIsCalendarOpen(false);
                     
                     // Carregar dados imediatamente
                     setIsPeriodChanging(true);
                     try {
                       await Promise.all([
                         loadAdsRanking(false, 'custom'),
                         loadCampaignStats('custom'),
                         loadChartData('custom')
                       ]);
                       console.log('[DEBUG] Dados deste mês carregados com sucesso');
                     } catch (error) {
                       console.error('Erro ao carregar dados deste mês:', error);
                     } finally {
                       setIsPeriodChanging(false);
                     }
                   }} className="text-xs px-2 py-1 whitespace-nowrap">Este mês</Button>

                   <Button onClick={async () => {
                     const today = new Date();
                     const start = startOfMonth(subMonths(today, 1));
                     const end = endOfMonth(subMonths(today, 1));
                     const newDateRange = [{
                       startDate: start,
                       endDate: end,
                       key: 'selection'
                     }];
                     console.log(`[FILTER-DEBUG] Botão "Mês passado" clicado`);
                     setDateRange(newDateRange);
                     setIsCalendarOpen(false);
                     
                     // Carregar dados imediatamente
                     setIsPeriodChanging(true);
                     try {
                       await Promise.all([
                         loadAdsRanking(false, 'custom'),
                         loadCampaignStats('custom'),
                         loadChartData('custom')
                       ]);
                       console.log('[DEBUG] Dados do mês passado carregados com sucesso');
                     } catch (error) {
                       console.error('Erro ao carregar dados do mês passado:', error);
                     } finally {
                       setIsPeriodChanging(false);
                     }
                   }} className="text-xs px-2 py-1 whitespace-nowrap">Mês passado</Button>
                 </div>
                 
                 <div className="flex items-center justify-between">
                   <div className="text-cyan-200 text-xs">
                     <div className="text-cyan-300 font-medium">
                       {format(dateRange[0].startDate, 'dd/MM/yyyy', { locale: ptBR })} - {format(dateRange[0].endDate, 'dd/MM/yyyy', { locale: ptBR })}
                     </div>
                     <div className="text-cyan-400">
                       {differenceInDays(dateRange[0].endDate, dateRange[0].startDate) + 1} dias
                     </div>
                   </div>
                   
                   <div className="flex gap-2">
                     <Button
                       onClick={() => {
                         setIsCalendarOpen(false);
                       }}
                       className="px-3 py-1 text-xs bg-gray-600/50 hover:bg-gray-600 text-gray-200 border border-gray-500/50"
                     >
                       Cancelar
                     </Button>
                     <Button
                       onClick={applyCustomPeriod}
                       className="px-3 py-1 text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-500/50"
                     >
                       <FaCheck className="mr-1" />
                       Aplicar
                     </Button>
                   </div>
                 </div>
               </div>
             </div>
           </Portal>
         )}
       </div>
     </div>
   );
 };
 
 export default Ads;