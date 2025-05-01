const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

async function getDashboardStats(req, userId, period = 'daily') {
  try {
    const now = new Date();
    // 1. Buscar total de saldo consultado
    // REMOVER a busca anterior de balance (balanceQuery) e usar apenas a busca completa:
    // let balanceQuery = supabaseAdmin
    //   .from('balance')
    //   .select('balance, simulation')
    //   .eq('client_id', userId);
    // ...
    // const { data: balanceData, error: balanceError } = await balanceQuery.order('created_at', { ascending: false });
    // if (balanceError) logger.error(`Erro ao buscar saldos: ${balanceError.message}`);
    // FIM DA REMOÇÃO

    // 2. Buscar dados de propostas com filtro de período
    let proposalsQuery = supabase.from('proposals').select('*').eq('client_id', userId);
    if (period === 'range') {
      logger.info(`[DASHBOARD] startDate: ${req.query.startDate}, endDate: ${req.query.endDate}`);
      if (!req.query.startDate || !req.query.endDate) {
        logger.warn('[DASHBOARD] Intervalo de datas incompleto.');
        return {
          error: true,
          message: 'Intervalo de datas incompleto.'
        };
      }
      const start = new Date(req.query.startDate);
      const end = new Date(req.query.endDate);
      if (isNaN(start) || isNaN(end)) {
        logger.warn('[DASHBOARD] Datas inválidas.');
        return {
          error: true,
          message: 'Datas inválidas.'
        };
      }
      // Limitar intervalo para 90 dias
      const maxDays = 90;
      if ((end - start) / (1000 * 60 * 60 * 24) > maxDays) {
        logger.warn('[DASHBOARD] Intervalo muito grande.');
        return {
          error: true,
          message: 'Intervalo muito grande. Máximo permitido: 90 dias.'
        };
      }
      start.setUTCHours(0,0,0,0);
      end.setUTCHours(23,59,59,999);
      proposalsQuery = proposalsQuery.gte('updated_at', start.toISOString()).lte('updated_at', end.toISOString());
    } else if (period === 'daily') {
      const start = new Date(now); start.setHours(0,0,0,0);
      const end = new Date(now); end.setHours(23,59,59,999);
      proposalsQuery = proposalsQuery.gte('updated_at', start.toISOString()).lte('updated_at', end.toISOString());
    } else if (period === 'weekly') {
      const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23,59,59,999);
      proposalsQuery = proposalsQuery.gte('updated_at', startOfWeek.toISOString()).lte('updated_at', endOfWeek.toISOString());
    } else if (period === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      proposalsQuery = proposalsQuery.gte('updated_at', startOfMonth.toISOString()).lte('updated_at', endOfMonth.toISOString());
    }
    const { data: proposalsData, error: proposalsError } = await proposalsQuery;
    if (proposalsError) logger.error(`Erro ao buscar propostas: ${proposalsError.message}`);

    logger.info(`[DASHBOARD] Período selecionado: ${period}`);
    logger.info(`[DASHBOARD] Propostas retornadas do Supabase (${proposalsData?.length || 0}):`);
    if (proposalsData && proposalsData.length > 0) {
      logger.info(`[DASHBOARD] Exemplo de proposta: ${JSON.stringify(proposalsData[0])}`);
    }

    // 3. Buscar dados de leads
    const { data: leadsData, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('client_id', userId);
    if (leadsError) logger.error(`Erro ao buscar leads: ${leadsError.message}`);

    // Buscar todos os registros de balance do cliente
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .from('balance')
      .select('*')
      .eq('client_id', userId);
    if (balanceError) logger.error(`Erro ao buscar saldos: ${balanceError.message}`);

    // Definir limites de data conforme o período selecionado
    let balanceStart, balanceEnd;
    if (period === 'daily') {
      balanceStart = new Date(now); balanceStart.setHours(0,0,0,0);
      balanceEnd = new Date(now); balanceEnd.setHours(23,59,59,999);
    } else if (period === 'weekly') {
      balanceStart = new Date(now); balanceStart.setDate(now.getDate() - now.getDay()); balanceStart.setHours(0,0,0,0);
      balanceEnd = new Date(balanceStart); balanceEnd.setDate(balanceStart.getDate() + 6); balanceEnd.setHours(23,59,59,999);
    } else if (period === 'monthly') {
      balanceStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      balanceEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'range' && req.query.startDate && req.query.endDate) {
      balanceStart = new Date(req.query.startDate + 'T00:00:00.000Z');
      balanceEnd = new Date(req.query.endDate + 'T23:59:59.999Z');
    }

    // Filtrar balanceData pelo período
    const filteredBalanceData = (balanceData || []).filter(b => {
      const d = new Date(b.updated_at);
      if (period === 'daily') {
        return d.getFullYear() === balanceStart.getFullYear() &&
               d.getMonth() === balanceStart.getMonth() &&
               d.getDate() === balanceStart.getDate();
      }
      if (period === 'range' && balanceStart && balanceEnd) {
        return d >= balanceStart && d <= balanceEnd;
      }
      return d >= balanceStart && d <= balanceEnd;
    });

    // Mapear o balance mais recente para cada lead, considerando apenas o período filtrado
    const latestBalanceByLead = {};
    (filteredBalanceData || []).forEach(b => {
      if (!b.lead_id) return;
      if (!latestBalanceByLead[b.lead_id] || new Date(b.updated_at) > new Date(latestBalanceByLead[b.lead_id].updated_at)) {
        latestBalanceByLead[b.lead_id] = b;
      }
    });

    // Filtrar leads que têm registro em balance no período
    const leadsWithBalance = (leadsData || []).filter(l => latestBalanceByLead[l.id]);

    // Calcular métricas
    const totalBalance = Object.values(latestBalanceByLead)
      .reduce((sum, item) => sum + parseFloat(item.balance || 0), 0);
    const totalSimulation = Object.values(latestBalanceByLead)
      .reduce((sum, item) => sum + parseFloat(item.simulation || 0), 0);
    const totalProposals = proposalsData ? proposalsData.length : 0;
    const totalPaidProposals = proposalsData
      ? proposalsData.filter(p => p.status === 'paid').length
      : 0;
    const totalProposalsValue = proposalsData
      ? proposalsData.reduce((sum, item) => sum + parseFloat(item.value || 0), 0)
      : 0;
    const totalPaidProposalsValue = proposalsData
      ? proposalsData.filter(p => p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.value || 0), 0)
      : 0;
    const totalPendingProposals = proposalsData
      ? proposalsData.filter(p => p.status === 'pending').length
      : 0;
    const totalPendingProposalsValue = proposalsData
      ? proposalsData.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.value || 0), 0)
      : 0;
    const totalCancelledProposals = proposalsData
      ? proposalsData.filter(p => p.status === 'cancelled').length
      : 0;
    const totalFormalizationProposals = proposalsData
      ? proposalsData.filter(p => p.status === 'formalization').length
      : 0;
    const totalFormalizationProposalsValue = proposalsData
      ? proposalsData.filter(p => p.status === 'formalization').reduce((sum, p) => sum + parseFloat(p.value || 0), 0)
      : 0;
    const totalLeads = leadsData ? leadsData.length : 0;

    logger.info(`[DASHBOARD] Cards: totalProposals=${totalProposals}, totalPaidProposals=${totalPaidProposals}, totalProposalsValue=${totalProposalsValue}, totalPaidProposalsValue=${totalPaidProposalsValue}, totalPendingProposals=${totalPendingProposals}, totalFormalizationProposals=${totalFormalizationProposals}`);

    // Taxa de conversão (propostas pagas / propostas criadas)
    const conversionRate = totalProposals > 0
      ? ((totalPaidProposals / totalProposals) * 100).toFixed(2)
      : 0;

    // Agrupamento dinâmico para os gráficos
    let groupLabels = [];
    let groupCounts = [];
    let groupValues = [];
    if (period === 'daily') {
      // Por hora
      for (let h = 0; h < 24; h++) {
        groupLabels.push(`${h}:00`);
        const filtered = proposalsData.filter(p => new Date(p.updated_at).getHours() === h &&
          new Date(p.updated_at).getDate() === now.getDate() &&
          new Date(p.updated_at).getMonth() === now.getMonth() &&
          new Date(p.updated_at).getFullYear() === now.getFullYear());
        groupCounts.push(filtered.length);
        groupValues.push(filtered.reduce((s, p) => s + parseFloat(p.value || 0), 0));
      }
    } else if (period === 'weekly') {
      // Por dia (datas do intervalo da semana), label dd/mm
      const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
      for (let i = 0; i < 7; i++) {
        const current = new Date(startOfWeek);
        current.setDate(startOfWeek.getDate() + i);
        const label = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        groupLabels.push(label);
        const filtered = proposalsData.filter(p => {
          const d = new Date(p.updated_at);
          return d.getFullYear() === current.getFullYear() &&
                 d.getMonth() === current.getMonth() &&
                 d.getDate() === current.getDate();
        });
        groupCounts.push(filtered.length);
        groupValues.push(filtered.reduce((s, p) => s + parseFloat(p.value || 0), 0));
      }
    } else if (period === 'monthly') {
      // Por dia do mês, label dd/mm
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const daysInMonth = endOfMonth.getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const current = new Date(now.getFullYear(), now.getMonth(), i);
        const label = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        groupLabels.push(label);
        const filtered = proposalsData.filter(p => {
          const d = new Date(p.updated_at);
          return d.getFullYear() === current.getFullYear() &&
                 d.getMonth() === current.getMonth() &&
                 d.getDate() === current.getDate();
        });
        groupCounts.push(filtered.length);
        groupValues.push(filtered.reduce((s, p) => s + parseFloat(p.value || 0), 0));
      }
    } else if (period === 'range' && req.query.startDate && req.query.endDate) {
      const start = new Date(req.query.startDate);
      const end = new Date(req.query.endDate);
      end.setUTCHours(23, 59, 59, 999);
      const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays === 1) {
        // Agrupar por hora
        for (let h = 0; h < 24; h++) {
          groupLabels.push(`${h}:00`);
          const filtered = proposalsData.filter(p => {
            const d = new Date(p.updated_at);
            return d.getUTCFullYear() === start.getUTCFullYear() &&
                   d.getUTCMonth() === start.getUTCMonth() &&
                   d.getUTCDate() === start.getUTCDate() &&
                   d.getUTCHours() === h;
          });
          groupCounts.push(filtered.length);
          groupValues.push(filtered.reduce((s, p) => s + parseFloat(p.value || 0), 0));
        }
      } else if (diffDays > 1 && diffDays <= 31) {
        // Agrupar por dia, label dd/mm
        for (let i = 0; i < diffDays; i++) {
          const current = new Date(start);
          current.setUTCDate(start.getUTCDate() + i);
          const label = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          groupLabels.push(label);
          const filtered = proposalsData.filter(p => {
            const d = new Date(p.updated_at);
            return d.getUTCFullYear() === current.getUTCFullYear() &&
                   d.getUTCMonth() === current.getUTCMonth() &&
                   d.getUTCDate() === current.getUTCDate();
          });
          groupCounts.push(filtered.length);
          groupValues.push(filtered.reduce((s, p) => s + parseFloat(p.value || 0), 0));
        }
      } else {
        // Agrupar por semana
        function getWeekNumber(d) {
          d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
          const weekNo = Math.ceil((((d - yearStart) / 86400000) + yearStart.getUTCDay()+1)/7);
          return `${d.getUTCFullYear()}-S${weekNo}`;
        }
        // Descobrir todas as semanas no range
        let weekLabels = [];
        for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
          const week = getWeekNumber(d);
          if (!weekLabels.includes(week)) weekLabels.push(week);
        }
        weekLabels.forEach(week => {
          const filtered = proposalsData.filter(p => {
            const d = new Date(p.updated_at);
            return getWeekNumber(d) === week;
          });
          groupLabels.push(week);
          groupCounts.push(filtered.length);
          groupValues.push(filtered.reduce((s, p) => s + parseFloat(p.value || 0), 0));
        });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = date.getMonth();
        const year = date.getFullYear();
        groupLabels.push(date.toLocaleString('pt-BR', { month: 'short' }));
        const filtered = proposalsData.filter(p => {
          const d = new Date(p.updated_at);
          return d.getMonth() === month && d.getFullYear() === year;
        });
        groupCounts.push(filtered.length);
        groupValues.push(filtered.reduce((s, p) => s + parseFloat(p.value || 0), 0));
      }
    }
    logger.info(`[DASHBOARD] Labels do gráfico: ${JSON.stringify(groupLabels)}`);
    logger.info(`[DASHBOARD] Quantidades por label: ${JSON.stringify(groupCounts)}`);
    logger.info(`[DASHBOARD] Valores por label: ${JSON.stringify(groupValues)}`);

    const proposalsChartData = { labels: groupLabels, values: groupCounts };
    const valueChartData = { labels: groupLabels, values: groupValues.map(v => v.toFixed(2)) };

    // Criar um mapa de leads para lookup rápido (nome e cpf), garantindo chaves como string sem espaços
    const leadsMap = (leadsData || []).reduce((acc, lead) => {
      if (lead.id) {
        acc[String(lead.id).trim()] = {
          name: lead.name || 'Sem nome',
          cpf: lead.cpf || '-'
        };
      }
      return acc;
    }, {});
    logger.info(`[DASHBOARD] leadsMap keys: ${Object.keys(leadsMap)}`);
    // Propostas recentes do cliente, com filtro por status
    let filteredProposals = proposalsData.filter(p => p.client_id === userId);
    if (req && req.query && req.query.status) {
      filteredProposals = filteredProposals.filter(p => p.status === req.query.status);
    }
    const recentProposals = filteredProposals
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 5)
      .map(prop => {
        const leadKey = prop.lead_id ? String(prop.lead_id).trim() : '';
        const leadInfo = leadsMap[leadKey] || { name: '-', cpf: '-' };
        logger.info(`[DASHBOARD] Proposta ${prop.proposal_id} - lead_id: ${leadKey} - leadInfo: ${JSON.stringify(leadInfo)}`);
        return {
          id: prop.proposal_id,
          value: prop.value ? `R$ ${parseFloat(prop.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
          status: prop.status || '-',
          updated_at: new Date(prop.updated_at).toLocaleString('pt-BR'),
          lead_id: prop.lead_id || '-',
          lead_name: leadInfo.name,
          lead_cpf: leadInfo.cpf,
          // Adicione outros campos relevantes se necessário
        };
      });

    // Criar um mapa de balance por lead_id para lookup rápido
    const balanceMap = (proposalsData || []).reduce((acc, p) => {
      if (p.lead_id) acc[String(p.lead_id)] = p;
      return acc;
    }, {});

    // --- NOVA SEÇÃO: GRÁFICOS E LISTA DE LEADS ---
    let leadsChartLabels = [];
    let leadsChartCounts = [];
    let simulationsChartLabels = [];
    let simulationsChartCounts = [];
    let leadsList = [];

    if (filteredBalanceData && filteredBalanceData.length > 0) {
      if (period === 'daily') {
        // Por hora
        for (let h = 0; h < 24; h++) {
          leadsChartLabels.push(`${h}:00`);
          simulationsChartLabels.push(`${h}:00`);
          const saldoPorLead = {};
          const simulacaoPorLead = {};
          filteredBalanceData.forEach(b => {
            const d = new Date(b.updated_at);
            if (
              d.getHours() === h &&
              d.getDate() === now.getDate() &&
              d.getMonth() === now.getMonth() &&
              d.getFullYear() === now.getFullYear()
            ) {
              if (b.balance != null && b.balance !== '') {
                if (!saldoPorLead[b.lead_id] || new Date(b.updated_at) > new Date(saldoPorLead[b.lead_id].updated_at)) {
                  saldoPorLead[b.lead_id] = b;
                }
              }
              if (b.simulation != null && b.simulation !== '') {
                if (!simulacaoPorLead[b.lead_id] || new Date(b.updated_at) > new Date(simulacaoPorLead[b.lead_id].updated_at)) {
                  simulacaoPorLead[b.lead_id] = b;
                }
              }
            }
          });
          leadsChartCounts.push(Object.keys(saldoPorLead).length);
          simulationsChartCounts.push(Object.values(simulacaoPorLead).reduce((sum, b) => sum + Number(b.simulation), 0));
        }
      } else if (period === 'weekly') {
        // Por dia (datas do intervalo da semana), label dd/mm
        const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
        for (let i = 0; i < 7; i++) {
          const current = new Date(startOfWeek);
          current.setDate(startOfWeek.getDate() + i);
          const label = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          leadsChartLabels.push(label);
          simulationsChartLabels.push(label);
          const saldoPorLead = {};
          const simulacaoPorLead = {};
          filteredBalanceData.forEach(b => {
            const d = new Date(b.updated_at);
            if (
              d.getFullYear() === current.getFullYear() &&
              d.getMonth() === current.getMonth() &&
              d.getDate() === current.getDate()
            ) {
              if (b.balance != null && b.balance !== '') {
                if (!saldoPorLead[b.lead_id] || new Date(b.updated_at) > new Date(saldoPorLead[b.lead_id].updated_at)) {
                  saldoPorLead[b.lead_id] = b;
                }
              }
              if (b.simulation != null && b.simulation !== '') {
                if (!simulacaoPorLead[b.lead_id] || new Date(b.updated_at) > new Date(simulacaoPorLead[b.lead_id].updated_at)) {
                  simulacaoPorLead[b.lead_id] = b;
                }
              }
            }
          });
          leadsChartCounts.push(Object.keys(saldoPorLead).length);
          simulationsChartCounts.push(Object.values(simulacaoPorLead).reduce((sum, b) => sum + Number(b.simulation), 0));
        }
      } else if (period === 'monthly') {
        // Por dia do mês, label dd/mm
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const daysInMonth = endOfMonth.getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const current = new Date(now.getFullYear(), now.getMonth(), i);
          const label = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          leadsChartLabels.push(label);
          simulationsChartLabels.push(label);
          const saldoPorLead = {};
          const simulacaoPorLead = {};
          filteredBalanceData.forEach(b => {
            const d = new Date(b.updated_at);
            if (
              d.getFullYear() === current.getFullYear() &&
              d.getMonth() === current.getMonth() &&
              d.getDate() === current.getDate()
            ) {
              if (b.balance != null && b.balance !== '') {
                if (!saldoPorLead[b.lead_id] || new Date(b.updated_at) > new Date(saldoPorLead[b.lead_id].updated_at)) {
                  saldoPorLead[b.lead_id] = b;
                }
              }
              if (b.simulation != null && b.simulation !== '') {
                if (!simulacaoPorLead[b.lead_id] || new Date(b.updated_at) > new Date(simulacaoPorLead[b.lead_id].updated_at)) {
                  simulacaoPorLead[b.lead_id] = b;
                }
              }
            }
          });
          leadsChartCounts.push(Object.keys(saldoPorLead).length);
          simulationsChartCounts.push(Object.values(simulacaoPorLead).reduce((sum, b) => sum + Number(b.simulation), 0));
        }
      } else if (period === 'range' && req.query.startDate && req.query.endDate) {
        const start = new Date(req.query.startDate);
        const end = new Date(req.query.endDate);
        end.setUTCHours(23, 59, 59, 999);
        const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays === 1) {
          // Agrupar por hora
          for (let h = 0; h < 24; h++) {
            leadsChartLabels.push(`${h}:00`);
            simulationsChartLabels.push(`${h}:00`);
            const saldoPorLead = {};
            const simulacaoPorLead = {};
            filteredBalanceData.forEach(b => {
              const d = new Date(b.updated_at);
              if (d.getUTCHours() === h && d.getUTCFullYear() === start.getUTCFullYear() && d.getUTCMonth() === start.getUTCMonth() && d.getUTCDate() === start.getUTCDate()) {
                if (b.balance != null && b.balance !== '') {
                  if (!saldoPorLead[b.lead_id] || new Date(b.updated_at) > new Date(saldoPorLead[b.lead_id].updated_at)) {
                    saldoPorLead[b.lead_id] = b;
                  }
                }
                if (b.simulation != null && b.simulation !== '') {
                  if (!simulacaoPorLead[b.lead_id] || new Date(b.updated_at) > new Date(simulacaoPorLead[b.lead_id].updated_at)) {
                    simulacaoPorLead[b.lead_id] = b;
                  }
                }
              }
            });
            leadsChartCounts.push(Object.keys(saldoPorLead).length);
            simulationsChartCounts.push(Object.values(simulacaoPorLead).reduce((sum, b) => sum + Number(b.simulation), 0));
          }
        } else if (diffDays > 1 && diffDays <= 31) {
          // Agrupar por dia, label dd/mm
          for (let i = 0; i < diffDays; i++) {
            const current = new Date(start);
            current.setUTCDate(start.getUTCDate() + i);
            const label = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            leadsChartLabels.push(label);
            simulationsChartLabels.push(label);
            const saldoPorLead = {};
            const simulacaoPorLead = {};
            filteredBalanceData.forEach(b => {
              const d = new Date(b.updated_at);
              if (d.getUTCFullYear() === current.getUTCFullYear() && d.getUTCMonth() === current.getUTCMonth() && d.getUTCDate() === current.getUTCDate()) {
                if (b.balance != null && b.balance !== '') {
                  if (!saldoPorLead[b.lead_id] || new Date(b.updated_at) > new Date(saldoPorLead[b.lead_id].updated_at)) {
                    saldoPorLead[b.lead_id] = b;
                  }
                }
                if (b.simulation != null && b.simulation !== '') {
                  if (!simulacaoPorLead[b.lead_id] || new Date(b.updated_at) > new Date(simulacaoPorLead[b.lead_id].updated_at)) {
                    simulacaoPorLead[b.lead_id] = b;
                  }
                }
              }
            });
            leadsChartCounts.push(Object.keys(saldoPorLead).length);
            simulationsChartCounts.push(Object.values(simulacaoPorLead).reduce((sum, b) => sum + Number(b.simulation), 0));
          }
        } else {
          // Agrupar por semana
          function getWeekNumber(d) {
            d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
            const weekNo = Math.ceil((((d - yearStart) / 86400000) + yearStart.getUTCDay()+1)/7);
            return `${d.getUTCFullYear()}-S${weekNo}`;
          }
          // Descobrir todas as semanas no range
          let weekLabels = [];
          for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
            const week = getWeekNumber(d);
            if (!weekLabels.includes(week)) weekLabels.push(week);
          }
          weekLabels.forEach(week => {
            const saldoPorLead = {};
            const simulacaoPorLead = {};
            filteredBalanceData.forEach(b => {
              const d = new Date(b.updated_at);
              if (getWeekNumber(d) === week) {
                if (b.balance != null && b.balance !== '') {
                  if (!saldoPorLead[b.lead_id] || new Date(b.updated_at) > new Date(saldoPorLead[b.lead_id].updated_at)) {
                    saldoPorLead[b.lead_id] = b;
                  }
                }
                if (b.simulation != null && b.simulation !== '') {
                  if (!simulacaoPorLead[b.lead_id] || new Date(b.updated_at) > new Date(simulacaoPorLead[b.lead_id].updated_at)) {
                    simulacaoPorLead[b.lead_id] = b;
                  }
                }
              }
            });
            leadsChartLabels.push(week);
            simulationsChartLabels.push(week);
            leadsChartCounts.push(Object.keys(saldoPorLead).length);
            simulationsChartCounts.push(Object.values(simulacaoPorLead).reduce((sum, b) => sum + Number(b.simulation), 0));
          });
        }
      } else {
        // ... (caso antigo, pode ser removido ou mantido para compatibilidade) ...
      }

      // Montar lista de leads para tabela (apenas leads com registro em balance)
      leadsList = leadsWithBalance.map(l => {
        const bal = latestBalanceByLead[l.id];
        logger.info(`[DASHBOARD-DEBUG] Lead: ${l.name} (${l.cpf}) | Balance: ${bal && bal.balance} | Simulation: ${bal && bal.simulation}`);
        return {
          name: l.name || '-',
          cpf: l.cpf || '-',
          saldo: bal && bal.balance != null && bal.balance !== '' ? `R$ ${Number(bal.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
          simulado: bal && bal.simulation != null && bal.simulation !== '' ? `R$ ${Number(bal.simulation).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
          updated_at: bal && bal.updated_at ? new Date(bal.updated_at).toLocaleString('pt-BR') : '',
          erro: bal && bal.error_reason ? bal.error_reason : ''
        };
      });
    }

    return {
      period,
      periodStart: req.query.startDate || null,
      periodEnd: req.query.endDate || null,
      totalBalance: `R$ ${totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      totalSimulation: `R$ ${totalSimulation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      totalProposals,
      totalPaidProposals,
      totalProposalsValue: `R$ ${totalProposalsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      totalPaidProposalsValue: `R$ ${totalPaidProposalsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      totalPendingProposals,
      totalPendingProposalsValue: `R$ ${totalPendingProposalsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      totalCancelledProposals,
      totalFormalizationProposals,
      totalFormalizationProposalsValue: `R$ ${totalFormalizationProposalsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      totalLeads,
      conversionRate: `${conversionRate}%`,
      recentProposals,
      proposalsChartData,
      valueChartData,
      leadsChartData: { labels: leadsChartLabels, values: leadsChartCounts },
      simulationsChartData: { labels: simulationsChartLabels, values: simulationsChartCounts },
      leadsList
    };
  } catch (error) {
    logger.error(`Erro ao buscar dados do dashboard: ${error.message}`);
    return null;
  }
}

module.exports = {
  renderDashboard: async function(req, res) {
    try {
      if (!req.user) return res.redirect('/auth/login?message=Sessão expirada');
      const period = req.query.period || 'daily';
      const stats = await getDashboardStats(req, req.user.id, period);
      const userName = res.locals.user?.displayName || 'Usuário';
      res.render('dashboard/index', { title: 'Dashboard FGTS', userName, period, ...stats });
    } catch (err) {
      logger.error(`Erro renderizar dashboard: ${err.message}`);
      res.render('error', { title: 'Erro', message: 'Ocorreu um erro ao carregar o dashboard', error: {} });
    }
  },
  getApiDashboardStats: async function(req, res) {
    try {
      const period = req.query.period || 'daily';
      const stats = await getDashboardStats(req, req.user.id, period);
      return res.json({ success: true, data: stats });
    } catch (error) {
      logger.error(`Erro API dashboard: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Erro ao obter estatísticas do dashboard' });
    }
  }
};