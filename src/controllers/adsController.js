const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

class AdsController {
  // Buscar ranking de anúncios por leads gerados
  async getAdsRanking(req, res) {
    try {
      const clientId = req.user.id;
      const { period = '30', limit = 50, startDate: customStartDate, endDate: customEndDate } = req.query;

      // Calcular data de início baseada no período
      let startDate, endDate;
      
      if (period === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));
        endDate = new Date();
      }

      logger.info(`[ADS_RANKING] Buscando ranking de anúncios para cliente ${clientId}, período: ${period} dias`);
      logger.info(`[ADS_RANKING] Parâmetros recebidos: period=${period}, customStartDate=${customStartDate}, customEndDate=${customEndDate}`);
      logger.info(`[ADS_RANKING] Datas calculadas: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`);

      // Query para ranking de anúncios individuais
      const { data: adsRanking, error: adsError } = await supabaseAdmin
        .from('tracking')
        .select(`
          ads_id,
          ads_headline,
          ads_copy,
          media_type,
          source_type,
          source_url,
          created_at
        `)
        .eq('client_id', clientId)
        .not('ads_id', 'is', null)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (adsError) throw adsError;

      // Agrupar e contar leads por anúncio
      const adsStats = {};
      adsRanking.forEach(track => {
        const key = track.ads_id;
        if (!adsStats[key]) {
          adsStats[key] = {
            ads_id: track.ads_id,
            ads_headline: track.ads_headline,
            ads_copy: track.ads_copy,
            media_type: track.media_type,
            source_type: track.source_type,
            source_url: track.source_url,
            total_leads: 0,
            first_lead: track.created_at,
            last_lead: track.created_at
          };
        }
        adsStats[key].total_leads++;
        if (track.created_at > adsStats[key].last_lead) {
          adsStats[key].last_lead = track.created_at;
        }
        if (track.created_at < adsStats[key].first_lead) {
          adsStats[key].first_lead = track.created_at;
        }
      });

      // Converter para array e ordenar por total de leads
      const adsRankingArray = Object.values(adsStats)
        .sort((a, b) => b.total_leads - a.total_leads)
        .slice(0, parseInt(limit));

      // Query para estatísticas gerais
      const { data: generalStats, error: statsError } = await supabaseAdmin
        .from('tracking')
        .select('ads_id, created_at')
        .eq('client_id', clientId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (statsError) throw statsError;

      const totalLeads = generalStats.length;
      const uniqueAds = new Set(generalStats.map(s => s.ads_id)).size;
      const leadsToday = generalStats.filter(s => {
        const today = new Date();
        const leadDate = new Date(s.created_at);
        return leadDate.toDateString() === today.toDateString();
      }).length;

      // Focar apenas nos cliques por enquanto
      // TODO: Implementar conversões reais no futuro

      const response = {
        success: true,
        data: {
          ranking: adsRankingArray,
          summary: {
            total_leads: totalLeads,
            unique_ads: uniqueAds,
            leads_today: leadsToday,
            period_days: parseInt(period)
          }
        }
      };

      logger.info(`[ADS_RANKING] Retornando ${adsRankingArray.length} anúncios no ranking`);
      res.json(response);

    } catch (error) {
      logger.error('[ADS_RANKING] Erro:', error.message);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar ranking de anúncios',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Buscar estatísticas detalhadas de um anúncio específico
  async getAdDetails(req, res) {
    try {
      const clientId = req.user.id;
      const { adsId } = req.params;
      const { period = '30', startDate: customStartDate, endDate: customEndDate } = req.query;

      // Calcular data de início baseada no período
      let startDate, endDate;
      
      if (period === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));
        endDate = new Date();
      }

      logger.info(`[AD_DETAILS] Buscando detalhes do anúncio ${adsId} para cliente ${clientId}`);

      // Buscar dados do anúncio
      const { data: adData, error: adError } = await supabaseAdmin
        .from('tracking')
        .select(`
          ads_id,
          ads_headline,
          ads_copy,
          media_type,
          source_type,
          source_url,
          created_at
        `)
        .eq('client_id', clientId)
        .eq('ads_id', adsId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (adError) throw adError;

      if (!adData || adData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Anúncio não encontrado'
        });
      }

      const ad = adData[0];
      const totalLeads = adData.length;

      // Focar apenas nos cliques por enquanto
      // TODO: Implementar conversões reais no futuro

      // Timeline de leads
      const timeline = {};
      adData.forEach(lead => {
        const date = new Date(lead.created_at).toISOString().split('T')[0];
        timeline[date] = (timeline[date] || 0) + 1;
      });

      const response = {
        success: true,
        data: {
          ad: {
            ads_id: ad.ads_id,
            ads_headline: ad.ads_headline,
            ads_copy: ad.ads_copy,
            media_type: ad.media_type,
            source_type: ad.source_type,
            source_url: ad.source_url
          },
          metrics: {
            total_leads: totalLeads,
            first_lead: adData[adData.length - 1]?.created_at,
            last_lead: adData[0]?.created_at
          },
          timeline: Object.entries(timeline)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date) - new Date(b.date)),
          period_days: parseInt(period)
        }
      };

      logger.info(`[AD_DETAILS] Retornando detalhes do anúncio ${adsId}: ${totalLeads} cliques`);
      res.json(response);

    } catch (error) {
      logger.error('[AD_DETAILS] Erro:', error.message);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar detalhes do anúncio',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Buscar estatísticas gerais de campanhas
  async getCampaignStats(req, res) {
    try {
      const clientId = req.user.id;
      const { period = '30', startDate: customStartDate, endDate: customEndDate } = req.query;

      // Calcular data de início baseada no período
      let startDate, endDate;
      
      if (period === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));
        endDate = new Date();
      }

      logger.info(`[CAMPAIGN_STATS] Buscando estatísticas de campanhas para cliente ${clientId}, período: ${period}, datas: ${startDate.toISOString()} - ${endDate.toISOString()}`);
      logger.info(`[CAMPAIGN_STATS] Parâmetros recebidos: period=${period}, customStartDate=${customStartDate}, customEndDate=${customEndDate}`);

      // Buscar todos os dados de tracking do período
      const { data: trackingData, error: trackingError } = await supabaseAdmin
        .from('tracking')
        .select(`
          ads_id,
          ads_headline,
          media_type,
          source_type,
          created_at
        `)
        .eq('client_id', clientId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('ads_id', 'is', null);

      if (trackingError) throw trackingError;
      
      logger.info(`[CAMPAIGN_STATS] Encontrados ${trackingData?.length || 0} registros de tracking`);

      // Agrupar por tipo de mídia
      const mediaStats = {};
      trackingData.forEach(track => {
        const mediaType = track.media_type || 'unknown';
        if (!mediaStats[mediaType]) {
          mediaStats[mediaType] = { count: 0, ads: new Set() };
        }
        mediaStats[mediaType].count++;
        mediaStats[mediaType].ads.add(track.ads_id);
      });

      // Converter para array
      const mediaRanking = Object.entries(mediaStats)
        .map(([media, stats]) => ({
          media_type: media,
          total_leads: stats.count,
          unique_ads: stats.ads.size,
          average_leads_per_ad: (stats.count / stats.ads.size).toFixed(2)
        }))
        .sort((a, b) => b.total_leads - a.total_leads);

      // Estatísticas por dia da semana
      const dayStats = {};
      trackingData.forEach(track => {
        const day = new Date(track.created_at).toLocaleDateString('pt-BR', { weekday: 'long' });
        dayStats[day] = (dayStats[day] || 0) + 1;
      });

      // Estatísticas por hora
      const hourStats = {};
      trackingData.forEach(track => {
        const hour = new Date(track.created_at).getHours();
        hourStats[hour] = (hourStats[hour] || 0) + 1;
      });

      const response = {
        success: true,
        data: {
          media_ranking: mediaRanking,
          day_distribution: Object.entries(dayStats)
            .map(([day, count]) => ({ day, count }))
            .sort((a, b) => b.count - a.count),
          hour_distribution: Object.entries(hourStats)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }))
            .sort((a, b) => a.hour - b.hour),
          summary: {
            total_leads: trackingData.length,
            unique_ads: new Set(trackingData.map(t => t.ads_id)).size,
            period_days: parseInt(period)
          }
        }
      };

      logger.info(`[CAMPAIGN_STATS] Retornando estatísticas: ${trackingData.length} leads, ${mediaRanking.length} tipos de mídia`);
      res.json(response);

    } catch (error) {
      logger.error('[CAMPAIGN_STATS] Erro:', error.message);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas de campanhas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Buscar dados para gráficos temporais
  async getChartData(req, res) {
    try {
      const clientId = req.user.id;
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Parâmetros start_date e end_date são obrigatórios'
        });
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      logger.info(`[CHART_DATA] Buscando dados do gráfico para cliente ${clientId}, período: ${startDate.toISOString()} - ${endDate.toISOString()}`);

      // Query para dados diários de leads e conversões
      const { data: dailyData, error } = await supabaseAdmin
        .from('tracking')
        .select(`
          created_at,
          ads_id
        `)
        .eq('client_id', clientId)
        .not('ads_id', 'is', null)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Agrupar dados por dia
      const dailyStats = {};
      dailyData.forEach(track => {
        const date = new Date(track.created_at);
        const dateKey = date.toISOString().split('T')[0];
        
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = {
            date: dateKey,
            leads: 0,
            conversions: 0
          };
        }
        
        dailyStats[dateKey].leads += 1;
      });

      // Converter para arrays ordenados
      const labels = [];
      const leadsData = [];

      // Preencher todos os dias do período
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const stats = dailyStats[dateKey] || { leads: 0 };
        
        labels.push(currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
        leadsData.push(stats.leads);
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const chartData = {
        labels,
        datasets: [
          {
            label: 'Cliques',
            data: leadsData,
            borderColor: 'rgb(34, 211, 238)',
            backgroundColor: 'rgba(34, 211, 238, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      };

      logger.info(`[CHART_DATA] Retornando dados do gráfico: ${labels.length} dias, ${leadsData.reduce((a, b) => a + b, 0)} cliques totais`);
      
      res.json({
        success: true,
        data: chartData
      });

    } catch (error) {
      logger.error('[CHART_DATA] Erro:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}

module.exports = new AdsController();
