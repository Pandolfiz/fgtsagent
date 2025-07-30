const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

async function getDashboardStats(req, userId, period = 'daily') {
  try {
    const now = new Date();
    const saoPauloOffset = -3; // UTC-3

    // Função auxiliar para criar datas com o timezone correto de São Paulo
    function createSaoPauloDate(year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) {
      // Convertemos para UTC e aplicamos o offset para obter a data local correta
      const date = new Date(Date.UTC(year, month, day, hour - saoPauloOffset, minute, second, millisecond));
      
      // Log detalhado para depuração
      logger.info(`[DATETIME-DEBUG] Criando data: ano=${year}, mês=${month+1}, dia=${day}, hora=${hour}`);
      logger.info(`[DATETIME-DEBUG] Data resultante em ISO: ${date.toISOString()}`);
      logger.info(`[DATETIME-DEBUG] Data resultante local: ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`);
      
      return date;
    }

    // Função auxiliar para validar e criar datas seguras
    function createSafeDate(dateString, context = 'unknown') {
      if (!dateString) {
        logger.warn(`[DATE-WARNING] Data vazia encontrada no contexto: ${context}`);
        return new Date(0);
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        logger.warn(`[DATE-WARNING] Data inválida encontrada: ${dateString} no contexto: ${context}`);
        return new Date(0);
      }
      return date;
    }

    // Função auxiliar para comparar datas de forma segura
    function safeCompareDate(dateStringA, dateStringB, context = 'unknown') {
      try {
        const dateA = createSafeDate(dateStringA, context + ' - A');
        const dateB = createSafeDate(dateStringB, context + ' - B');
        return dateA > dateB;
      } catch (error) {
        logger.error(`[DATE-COMPARE-ERROR] Erro ao comparar datas no contexto ${context}: ${error.message}`);
        return false;
      }
    }

    // Definir limites de data consistentes para o período selecionado
    let periodStart, periodEnd;

    if (period === 'daily') {
      // Dia atual em timezone de São Paulo
      periodStart = createSaoPauloDate(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      periodEnd = createSaoPauloDate(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      logger.info(`[DASHBOARD] Filtro diário - Início: ${periodStart.toISOString()}, Fim: ${periodEnd.toISOString()}`);
    } else if (period === 'weekly') {
      // Semana atual (domingo a sábado) em timezone de São Paulo
      const dayOfWeek = now.getDay();
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - dayOfWeek);
      
      periodStart = createSaoPauloDate(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate(), 0, 0, 0, 0);
      
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      
      periodEnd = createSaoPauloDate(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), 23, 59, 59, 999);
      
      logger.info(`[DASHBOARD] Filtro semanal - Início: ${periodStart.toISOString()}, Fim: ${periodEnd.toISOString()}`);
    } else if (period === 'monthly') {
      // Mês atual em timezone de São Paulo
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      periodStart = createSaoPauloDate(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), firstOfMonth.getDate(), 0, 0, 0, 0);
      periodEnd = createSaoPauloDate(lastOfMonth.getFullYear(), lastOfMonth.getMonth(), lastOfMonth.getDate(), 23, 59, 59, 999);
      
      logger.info(`[DASHBOARD] Filtro mensal - Início: ${periodStart.toISOString()}, Fim: ${periodEnd.toISOString()}`);
    } else if (period === 'range') {
      logger.info(`[DASHBOARD] startDate: ${req.query.startDate}, endDate: ${req.query.endDate}`);
      if (!req.query.startDate || !req.query.endDate) {
        logger.warn('[DASHBOARD] Intervalo de datas incompleto.');
        return {
          error: true,
          message: 'Intervalo de datas incompleto.'
        };
      }
      
      // Convertemos as datas ISO string (YYYY-MM-DD) para objetos Date
      // Considerando que as datas são passadas como meio-dia UTC para evitar problemas com timezone
      const startDateParts = req.query.startDate.split('-').map(Number);
      const endDateParts = req.query.endDate.split('-').map(Number);
      
      if (startDateParts.length !== 3 || endDateParts.length !== 3) {
        logger.warn('[DASHBOARD] Datas inválidas.');
        return {
          error: true,
          message: 'Datas inválidas.'
        };
      }
      
      // Log para depuração de data
      logger.info(`[DASHBOARD-DEBUG] Recebendo datas: startDate=${req.query.startDate}, endDate=${req.query.endDate}`);
      
      // Criamos as datas no fuso de São Paulo (início do dia para início, fim do dia para fim)
      periodStart = createSaoPauloDate(startDateParts[0], startDateParts[1] - 1, startDateParts[2], 0, 0, 0, 0);
      periodEnd = createSaoPauloDate(endDateParts[0], endDateParts[1] - 1, endDateParts[2], 23, 59, 59, 999);
      
      // Log detalhado para depuração
      logger.info(`[DASHBOARD-DEBUG] Após conversão: periodStart=${periodStart.toISOString()}, periodEnd=${periodEnd.toISOString()}`);
      logger.info(`[DASHBOARD-DEBUG] Data em formato local: periodStart=${periodStart.toLocaleDateString('pt-BR')} 00:00:00, periodEnd=${periodEnd.toLocaleDateString('pt-BR')} 23:59:59`);
      
      // Checamos se as datas são válidas
      if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
        logger.warn('[DASHBOARD] Datas inválidas.');
        return {
          error: true,
          message: 'Datas inválidas.'
        };
      }
      
      // Limitamos o intervalo para 90 dias
      const maxDays = 90;
      if ((periodEnd - periodStart) / (1000 * 60 * 60 * 24) > maxDays) {
        logger.warn('[DASHBOARD] Intervalo muito grande.');
        return {
          error: true,
          message: 'Intervalo muito grande. Máximo permitido: 90 dias.'
        };
      }
      
      logger.info(`[DASHBOARD] Filtro personalizado - Início: ${periodStart.toISOString()}, Fim: ${periodEnd.toISOString()}`);
    }

    // 2. Buscar dados de propostas com filtro de período
    let proposalsQuery = supabaseAdmin.from('proposals').select('*').eq('client_id', userId);
    
    if (periodStart && periodEnd) {
      // Usar o mesmo filtro de período para todas as consultas
      proposalsQuery = proposalsQuery.gte('updated_at', periodStart.toISOString()).lte('updated_at', periodEnd.toISOString());
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

    // Usar as mesmas datas de período para o balance
    const balanceStart = periodStart; 
    const balanceEnd = periodEnd;

    // Filtrar balanceData pelo período
    const filteredBalanceData = (balanceData || []).filter(b => {
      // Sempre convertemos para objeto Date para compararmos, com validação
      if (!b.updated_at) {
        logger.warn(`[BALANCE-WARNING] Registro de balance sem updated_at encontrado: ${b.id}`);
        return false;
      }
      
      const balanceDate = new Date(b.updated_at);
      
      // Verificar se a data é válida
      if (isNaN(balanceDate.getTime())) {
        logger.warn(`[BALANCE-WARNING] Data inválida em balance: ${b.updated_at} (ID: ${b.id})`);
        return false;
      }
      
      // Log para depuração (apenas para algumas entradas para não sobrecarregar o log)
      if (balanceData && balanceData.length > 0 && balanceData.indexOf(b) < 3) {
        logger.info(`[FILTER-DEBUG] Comparando data: ${balanceDate.toISOString()} com período: ${periodStart.toISOString()} a ${periodEnd.toISOString()}`);
        logger.info(`[FILTER-DEBUG] Resultado da comparação: start=${balanceDate >= periodStart}, end=${balanceDate <= periodEnd}`);
      }
      
      // Verificar se a data está dentro do período definido
      const isInPeriod = periodStart && periodEnd ? balanceDate >= periodStart && balanceDate <= periodEnd : false;
      
      // Garantir que o registro tem um ID de lead válido
      if (isInPeriod && !b.lead_id) {
        logger.warn(`[BALANCE-WARNING] Registro de balance sem lead_id encontrado: ${b.id}`);
      }
      
      return isInPeriod && b.lead_id;
    });

    // Debug para verificar os resultados da filtragem
    logger.info(`[DASHBOARD] Registros de balance - Total: ${balanceData?.length || 0}, Filtrados para período ${period}: ${filteredBalanceData?.length || 0}`);
    if (filteredBalanceData && filteredBalanceData.length > 0) {
      logger.info(`[DASHBOARD] Exemplo de balance filtrado: ${JSON.stringify(filteredBalanceData[0])}`);
      logger.info(`[FILTER-DEBUG] Data do primeiro balance filtrado: ${new Date(filteredBalanceData[0].updated_at).toISOString()}`);
    }

    // Mapear o balance mais recente para cada lead, considerando apenas o período filtrado
    const latestBalanceByLead = {};
    (filteredBalanceData || []).forEach(b => {
      if (!b.lead_id) return;
      
      // Validar datas antes de comparar
      const currentDate = new Date(b.updated_at);
      if (isNaN(currentDate.getTime())) {
        logger.warn(`[BALANCE-WARNING] Data inválida ao mapear balance mais recente: ${b.updated_at} (ID: ${b.id})`);
        return;
      }
      
      if (!latestBalanceByLead[b.lead_id]) {
        latestBalanceByLead[b.lead_id] = b;
      } else {
        const existingDate = new Date(latestBalanceByLead[b.lead_id].updated_at);
        if (!isNaN(existingDate.getTime()) && currentDate > existingDate) {
          latestBalanceByLead[b.lead_id] = b;
        }
      }
    });

    // Filtrar leads que têm registro em balance no período
    const leadsWithBalance = (leadsData || []).filter(l => latestBalanceByLead[l.id]);

    // Calcular métricas
    const totalBalance = Object.values(latestBalanceByLead)
      .reduce((sum, item) => sum + parseFloat(item.balance || 0), 0);
    const totalsimulation = Object.values(latestBalanceByLead)
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

    // Calcular leads novos no período (com base em created_at)
    const newLeadsCount = (leadsData || []).filter(lead => {
      const leadDate = new Date(lead.created_at || lead.updated_at);
      return periodStart && periodEnd ? leadDate >= periodStart && leadDate <= periodEnd : false;
    }).length;

    // Extrair IDs de leads novos para excluí-los do cálculo de leads antigos
    const newLeadsIds = new Set((leadsData || [])
      .filter(lead => {
        const leadDate = new Date(lead.created_at || lead.updated_at);
        return periodStart && periodEnd ? leadDate >= periodStart && leadDate <= periodEnd : false;
      })
      .map(lead => lead.id));
    
    // Debug de leads novos
    if (newLeadsIds.size > 0) {
      logger.info(`[LEAD-DEBUG] IDs de ${newLeadsIds.size} leads novos identificados no período atual`);
    }

    // Calcular leads antigos que interagiram no período atual
    // Um lead antigo é aquele que foi criado antes do período atual mas tem registros de consulta no período
    const returningLeadsCount = (leadsData || [])
      .filter(lead => {
        // Pular se for um lead novo (já contado acima)
        if (newLeadsIds.has(lead.id)) {
          return false;
        }
        
        // Verificar se o lead foi criado antes do período atual
        const leadCreationDate = new Date(lead.created_at || lead.updated_at);
        const isOldLead = periodStart ? leadCreationDate < periodStart : false;
        
        // Verificar se o lead tem consulta no período atual
        const hasInteractionInPeriod = filteredBalanceData.some(
          balance => balance.lead_id === lead.id
        );
        
        // Log para depuração de leads antigos ativos
        if (isOldLead && hasInteractionInPeriod) {
          logger.info(`[RETURNING-LEAD-DEBUG] Lead antigo ativo encontrado: ${lead.name || lead.id} - Data criação: ${leadCreationDate.toISOString()} - Período: ${periodStart.toISOString()} a ${periodEnd.toISOString()}`);
        }
        
        return isOldLead && hasInteractionInPeriod;
      }).length;

    // Log específico para diagnóstico de leads antigos
    logger.info(`[RETURNING-LEAD-SUMMARY] Total leads: ${leadsData?.length || 0}, Leads novos: ${newLeadsCount}, Leads antigos ativos: ${returningLeadsCount}`);
    logger.info(`[RETURNING-LEAD-SUMMARY] Período filtrado: ${periodStart?.toISOString() || 'não definido'} a ${periodEnd?.toISOString() || 'não definido'}`);
    
    // Calcular porcentagem de leads que consultaram saldo
    const consultationPercentage = newLeadsCount > 0
      ? Math.round((leadsWithBalance.length / newLeadsCount) * 100)
      : 0;

    // Calcular porcentagem de consultas válidas (sem erros)
    const validConsultationsCount = (filteredBalanceData || []).filter(b => !b.error_reason).length;
    // Usar número de leads como denominador em vez do número total de consultas
    const validConsultationsPercentage = newLeadsCount > 0
      ? Math.round((validConsultationsCount / newLeadsCount) * 100)
      : 0;

    logger.info(`[DASHBOARD] Cards: totalProposals=${totalProposals}, totalPaidProposals=${totalPaidProposals}, totalProposalsValue=${totalProposalsValue}, totalPaidProposalsValue=${totalPaidProposalsValue}, totalPendingProposals=${totalPendingProposals}, totalFormalizationProposals=${totalFormalizationProposals}, newLeadsCount=${newLeadsCount}, returningLeadsCount=${returningLeadsCount}, consultationPercentage=${consultationPercentage}, validConsultationsPercentage=${validConsultationsPercentage}`);

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
        
        // Criar intervalos de hora usando a mesma função auxiliar para consistência
        const hourStart = createSaoPauloDate(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), periodStart.getUTCDate(), h, 0, 0, 0);
        const hourEnd = createSaoPauloDate(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), periodStart.getUTCDate(), h, 59, 59, 999);
        
        // Filtrar propostas nesta hora
        const filtered = proposalsData.filter(p => {
          const proposalDate = new Date(p.updated_at);
          return proposalDate >= hourStart && proposalDate <= hourEnd;
        });
        
        logger.info(`[DASHBOARD] Hora ${h}:00 - Encontradas ${filtered.length} propostas`);
        
        groupCounts.push(filtered.length);
        groupValues.push(filtered.reduce((s, p) => s + parseFloat(p.value || 0), 0));
      }
    } else if (period === 'weekly') {
      // Por dia (datas do intervalo da semana), label dd/mm
      // Calculamos cada dia da semana a partir da data inicial
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(periodStart);
        currentDate.setUTCDate(periodStart.getUTCDate() + i);
        
        const dayStart = createSaoPauloDate(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 0, 0, 0, 0);
        const dayEnd = createSaoPauloDate(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 23, 59, 59, 999);
        
        const label = dayStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        groupLabels.push(label);
        
        const filtered = proposalsData.filter(p => {
          const proposalDate = new Date(p.updated_at);
          return proposalDate >= dayStart && proposalDate <= dayEnd;
        });
        
        groupCounts.push(filtered.length);
        groupValues.push(filtered.reduce((s, p) => s + parseFloat(p.value || 0), 0));
      }
    } else if (period === 'monthly') {
      // Por dia do mês, label dd/mm
      const lastDayOfMonth = new Date(periodEnd);
      const daysInMonth = lastDayOfMonth.getUTCDate();
      
      for (let i = 1; i <= daysInMonth; i++) {
        const dayStart = createSaoPauloDate(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), i, 0, 0, 0, 0);
        const dayEnd = createSaoPauloDate(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), i, 23, 59, 59, 999);
        
        const label = dayStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        groupLabels.push(label);
        
        const filtered = proposalsData.filter(p => {
          const proposalDate = new Date(p.updated_at);
          return proposalDate >= dayStart && proposalDate <= dayEnd;
        });
        
        groupCounts.push(filtered.length);
        groupValues.push(filtered.reduce((s, p) => s + parseFloat(p.value || 0), 0));
      }
    } else if (period === 'range' && periodStart && periodEnd) {
      // Calculamos a diferença de dias entre as datas
      const diffTime = periodEnd.getTime() - periodStart.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (diffDays === 1) {
        // Para um único dia, agrupamos por hora
        for (let h = 0; h < 24; h++) {
          groupLabels.push(`${h}:00`);
          
          const hourStart = createSaoPauloDate(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), periodStart.getUTCDate(), h, 0, 0, 0);
          const hourEnd = createSaoPauloDate(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), periodStart.getUTCDate(), h, 59, 59, 999);
          
          const filtered = proposalsData.filter(p => {
            const proposalDate = new Date(p.updated_at);
            return proposalDate >= hourStart && proposalDate <= hourEnd;
          });
          
          groupCounts.push(filtered.length);
          groupValues.push(filtered.reduce((s, p) => s + parseFloat(p.value || 0), 0));
        }
      } else if (diffDays > 1 && diffDays <= 31) {
        // Para períodos até um mês, agrupamos por dia
        for (let i = 0; i < diffDays; i++) {
          const currentDate = new Date(periodStart);
          currentDate.setUTCDate(periodStart.getUTCDate() + i);
          
          const dayStart = createSaoPauloDate(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 0, 0, 0, 0);
          const dayEnd = createSaoPauloDate(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 23, 59, 59, 999);
          
          const label = dayStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          groupLabels.push(label);
          
          const filtered = proposalsData.filter(p => {
            const proposalDate = new Date(p.updated_at);
            return proposalDate >= dayStart && proposalDate <= dayEnd;
          });
          
          groupCounts.push(filtered.length);
          groupValues.push(filtered.reduce((s, p) => s + parseFloat(p.value || 0), 0));
        }
      } else {
        // Para períodos longos, agrupamos por semana
        // Função consistente para calcular o número da semana
        function getWeekNumber(date) {
          const target = new Date(date.getTime());
          const dayNum = (date.getUTCDay() + 6) % 7; // Ajusta para que a semana comece na segunda-feira
          target.setUTCDate(target.getUTCDate() - dayNum + 3); // Ajusta para a quinta-feira da semana
          const firstThursday = target.getTime();
          target.setUTCMonth(0, 1); // Janeiro 1
          if (target.getUTCDay() !== 4) { // Quinta-feira
            target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
          }
          return 1 + Math.ceil((firstThursday - target.getTime()) / 604800000); // 604800000 = número de ms em uma semana
        }
        
        // Mapeamos as datas para suas respectivas semanas
        const weeks = new Map();
        
        // Percorremos o período dia a dia
        const current = new Date(periodStart);
        while (current <= periodEnd) {
          const year = current.getUTCFullYear();
          const week = getWeekNumber(current);
          const weekKey = `${year}-S${week}`;
          
          if (!weeks.has(weekKey)) {
            weeks.set(weekKey, {
              startDate: new Date(current),
              endDate: new Date(current),
              proposals: []
            });
          } else {
            const weekData = weeks.get(weekKey);
            weekData.endDate = new Date(current);
          }
          
          // Avançamos para o próximo dia
          current.setUTCDate(current.getUTCDate() + 1);
        }
        
        // Agora filtramos as propostas para cada semana
        for (const [weekKey, weekData] of weeks.entries()) {
          const weekStart = createSaoPauloDate(
            weekData.startDate.getUTCFullYear(),
            weekData.startDate.getUTCMonth(),
            weekData.startDate.getUTCDate(),
            0, 0, 0, 0
          );
          
          const weekEnd = createSaoPauloDate(
            weekData.endDate.getUTCFullYear(),
            weekData.endDate.getUTCMonth(),
            weekData.endDate.getUTCDate(),
            23, 59, 59, 999
          );
          
          const filtered = proposalsData.filter(p => {
            const proposalDate = new Date(p.updated_at);
            return proposalDate >= weekStart && proposalDate <= weekEnd;
          });
          
          groupLabels.push(weekKey);
          groupCounts.push(filtered.length);
          groupValues.push(filtered.reduce((s, p) => s + parseFloat(p.value || 0), 0));
        }
      }
    } else {
      // Caso padrão: últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now);
        monthDate.setMonth(monthDate.getMonth() - i);
        
        const monthStart = createSaoPauloDate(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          1,
          0, 0, 0, 0
        );
        
        const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        const monthEnd = createSaoPauloDate(
          lastDay.getFullYear(),
          lastDay.getMonth(),
          lastDay.getDate(),
          23, 59, 59, 999
        );
        
        const label = monthStart.toLocaleString('pt-BR', { month: 'short' });
        groupLabels.push(label);
        
        const filtered = proposalsData.filter(p => {
          const proposalDate = new Date(p.updated_at);
          return proposalDate >= monthStart && proposalDate <= monthEnd;
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
          
          // Criar intervalos de hora consistentes usando createSaoPauloDate
          const hourStart = createSaoPauloDate(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), periodStart.getUTCDate(), h, 0, 0, 0);
          const hourEnd = createSaoPauloDate(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), periodStart.getUTCDate(), h, 59, 59, 999);
          
          filteredBalanceData.forEach(b => {
            const balanceDate = createSafeDate(b.updated_at, 'chart-hourly');
            if (balanceDate >= hourStart && balanceDate <= hourEnd) {
              if (b.balance != null && b.balance !== '') {
                if (!saldoPorLead[b.lead_id] || safeCompareDate(b.updated_at, saldoPorLead[b.lead_id].updated_at, 'chart-hourly-balance')) {
                  saldoPorLead[b.lead_id] = b;
                }
              }
              if (b.simulation != null && b.simulation !== '') {
                if (!simulacaoPorLead[b.lead_id] || safeCompareDate(b.updated_at, simulacaoPorLead[b.lead_id].updated_at, 'chart-hourly-simulation')) {
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
        for (let i = 0; i < 7; i++) {
          const currentDate = new Date(periodStart);
          currentDate.setUTCDate(periodStart.getUTCDate() + i);
          
          const dayStart = createSaoPauloDate(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 0, 0, 0, 0);
          const dayEnd = createSaoPauloDate(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 23, 59, 59, 999);
          
          const label = dayStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          leadsChartLabels.push(label);
          simulationsChartLabels.push(label);
          const saldoPorLead = {};
          const simulacaoPorLead = {};
          
          filteredBalanceData.forEach(b => {
            const balanceDate = createSafeDate(b.updated_at, 'chart-weekly');
            if (balanceDate >= dayStart && balanceDate <= dayEnd) {
              if (b.balance != null && b.balance !== '') {
                if (!saldoPorLead[b.lead_id] || safeCompareDate(b.updated_at, saldoPorLead[b.lead_id].updated_at, 'chart-weekly-balance')) {
                  saldoPorLead[b.lead_id] = b;
                }
              }
              if (b.simulation != null && b.simulation !== '') {
                if (!simulacaoPorLead[b.lead_id] || safeCompareDate(b.updated_at, simulacaoPorLead[b.lead_id].updated_at, 'chart-weekly-simulation')) {
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
        const lastDayOfMonth = new Date(periodEnd);
        const daysInMonth = lastDayOfMonth.getUTCDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
          const dayStart = createSaoPauloDate(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), i, 0, 0, 0, 0);
          const dayEnd = createSaoPauloDate(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), i, 23, 59, 59, 999);
          
          const label = dayStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          leadsChartLabels.push(label);
          simulationsChartLabels.push(label);
          const saldoPorLead = {};
          const simulacaoPorLead = {};
          
          filteredBalanceData.forEach(b => {
            const balanceDate = new Date(b.updated_at);
            if (balanceDate >= dayStart && balanceDate <= dayEnd) {
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
      } else if (period === 'range' && periodStart && periodEnd) {
        // Período personalizado
        const diffTime = periodEnd.getTime() - periodStart.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        if (diffDays === 1) {
          // Para um único dia, agrupamos por hora
          for (let h = 0; h < 24; h++) {
            leadsChartLabels.push(`${h}:00`);
            simulationsChartLabels.push(`${h}:00`);
            
            const hourStart = createSaoPauloDate(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), periodStart.getUTCDate(), h, 0, 0, 0);
            const hourEnd = createSaoPauloDate(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), periodStart.getUTCDate(), h, 59, 59, 999);
            
            const saldoPorLead = {};
            const simulacaoPorLead = {};
            
            filteredBalanceData.forEach(b => {
              const balanceDate = new Date(b.updated_at);
              if (balanceDate >= hourStart && balanceDate <= hourEnd) {
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
          // Para períodos até um mês, agrupamos por dia
          for (let i = 0; i < diffDays; i++) {
            const currentDate = new Date(periodStart);
            currentDate.setUTCDate(periodStart.getUTCDate() + i);
            
            const dayStart = createSaoPauloDate(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 0, 0, 0, 0);
            const dayEnd = createSaoPauloDate(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 23, 59, 59, 999);
            
            const label = dayStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            leadsChartLabels.push(label);
            simulationsChartLabels.push(label);
            
            const saldoPorLead = {};
            const simulacaoPorLead = {};
            
            filteredBalanceData.forEach(b => {
              const balanceDate = new Date(b.updated_at);
              if (balanceDate >= dayStart && balanceDate <= dayEnd) {
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
          // Para períodos longos, agrupamos por semana
          // Função para calcular o número da semana de forma consistente
          function getWeekNumber(date) {
            const target = new Date(date.getTime());
            const dayNum = (date.getUTCDay() + 6) % 7; // Ajusta para que a semana comece na segunda-feira
            target.setUTCDate(target.getUTCDate() - dayNum + 3); // Ajusta para a quinta-feira da semana
            const firstThursday = target.getTime();
            target.setUTCMonth(0, 1); // Janeiro 1
            if (target.getUTCDay() !== 4) { // Quinta-feira
              target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
            }
            return 1 + Math.ceil((firstThursday - target.getTime()) / 604800000); // 604800000 = número de ms em uma semana
          }
          
          // Mapeamos as datas para suas respectivas semanas
          const weeks = new Map();
          
          // Percorremos o período dia a dia
          const current = new Date(periodStart);
          while (current <= periodEnd) {
            const year = current.getUTCFullYear();
            const week = getWeekNumber(current);
            const weekKey = `${year}-S${week}`;
            
            if (!weeks.has(weekKey)) {
              weeks.set(weekKey, {
                startDate: new Date(current),
                endDate: new Date(current),
                proposals: []
              });
            } else {
              const weekData = weeks.get(weekKey);
              weekData.endDate = new Date(current);
            }
            
            // Avançamos para o próximo dia
            current.setUTCDate(current.getUTCDate() + 1);
          }
          
          // Agora filtramos os dados para cada semana
          for (const [weekKey, weekData] of weeks.entries()) {
            const weekStart = createSaoPauloDate(
              weekData.startDate.getUTCFullYear(),
              weekData.startDate.getUTCMonth(),
              weekData.startDate.getUTCDate(),
              0, 0, 0, 0
            );
            
            const weekEnd = createSaoPauloDate(
              weekData.endDate.getUTCFullYear(),
              weekData.endDate.getUTCMonth(),
              weekData.endDate.getUTCDate(),
              23, 59, 59, 999
            );
            
            leadsChartLabels.push(weekKey);
            simulationsChartLabels.push(weekKey);
            
            const saldoPorLead = {};
            const simulacaoPorLead = {};
            
            filteredBalanceData.forEach(b => {
              const balanceDate = new Date(b.updated_at);
              if (balanceDate >= weekStart && balanceDate <= weekEnd) {
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
        }
      }

      // Montar lista de leads para tabela (apenas leads com registro em balance)
      leadsList = leadsWithBalance.map(l => {
        const bal = latestBalanceByLead[l.id];
        logger.info(`[DASHBOARD-DEBUG] Lead: ${l.name} (${l.cpf}) | Balance: ${bal && bal.balance} | simulation: ${bal && bal.simulation}`);
        
        const safeDate = createSafeDate(bal && bal.updated_at, 'leadsList');
        
        // Verificar se o lead tem propostas
        const leadProposals = proposalsData ? proposalsData.filter(p => p.lead_id === l.id) : [];
        const hasProposals = leadProposals.length > 0;
        
        return {
          id: l.id, // Adicionar o ID do lead
          name: l.name || '-',
          cpf: l.cpf || '-',
          saldo: bal && bal.balance != null && bal.balance !== '' ? `R$ ${Number(bal.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
          simulado: bal && bal.simulation != null && bal.simulation !== '' ? `R$ ${Number(bal.simulation).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
          updated_at: bal && bal.updated_at && !isNaN(safeDate.getTime()) ? safeDate.toLocaleString('pt-BR') : '',
          raw_date: safeDate, // Data segura para ordenação
          erro: bal && bal.error_reason ? bal.error_reason : '',
          hasProposals: hasProposals // Indicador se o lead tem propostas
        };
      }).sort((a, b) => {
        // Ordenação segura com validação de tipo
        try {
          const dateA = a.raw_date instanceof Date ? a.raw_date : new Date(0);
          const dateB = b.raw_date instanceof Date ? b.raw_date : new Date(0);
          
          // Verificar se as datas são válidas antes de comparar
          const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
          const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
          
          return timeB - timeA; // Ordenando do mais recente para o mais antigo
        } catch (error) {
          logger.error(`[DASHBOARD-SORT-ERROR] Erro na ordenação: ${error.message}`);
          return 0; // Manter ordem original em caso de erro
        }
      }).map(lead => {
        // Remover o campo raw_date antes de enviar para o frontend
        const { raw_date, ...leadWithoutRawDate } = lead;
        return leadWithoutRawDate;
      });
    }

    return {
      period,
      periodStart: req.query.startDate || null,
      periodEnd: req.query.endDate || null,
      totalBalance: `R$ ${totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      totalSimulation: `R$ ${totalsimulation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
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
      newLeadsCount,
      returningLeadsCount,
      consultationPercentage,
      validConsultationsPercentage,
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