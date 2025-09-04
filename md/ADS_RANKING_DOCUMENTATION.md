# 📊 Sistema de Ranking de Anúncios - CTWA CLID

## 📋 Visão Geral

Este documento descreve o sistema de ranking de anúncios implementado para analisar a performance dos anúncios baseado nos dados de tracking do sistema CTWA CLID da Meta.

## 🎯 Funcionalidades

### 1. Ranking de Anúncios
- **Localização**: `/ads`
- **Funcionalidade**: Exibe ranking de anúncios baseado em leads gerados
- **Métricas**:
  - Total de leads por anúncio
  - Taxa de conversão
  - Conversões pagas
  - Taxa de conversão paga

### 2. Análise Detalhada
- **Detalhes por anúncio**: Clique em "Detalhes" para ver métricas específicas
- **Timeline**: Visualização temporal dos leads
- **Valor total**: Soma das propostas pagas
- **Média por conversão**: Valor médio das conversões

### 3. Estatísticas de Campanhas
- **Por tipo de mídia**: Video, Image, etc.
- **Distribuição por dia da semana**
- **Distribuição por hora do dia**
- **Métricas gerais**: Total de leads, anúncios únicos, período

## 🗄️ Estrutura da Tabela Tracking

A tabela `tracking` armazena os dados de rastreamento dos anúncios:

```sql
CREATE TABLE tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  messages_id TEXT,
  ctwa_clid TEXT,           -- ID único do CTWA CLID da Meta
  ads_headline TEXT,        -- Título do anúncio
  ads_copy TEXT,            -- Texto do anúncio
  source_type TEXT,         -- Tipo de origem (ad, organic, etc.)
  ads_id TEXT,              -- ID do anúncio na Meta
  media_type TEXT,          -- Tipo de mídia (video, image, etc.)
  client_id UUID,           -- ID do cliente
  source_url TEXT           -- URL de origem do anúncio
);
```

## 🔗 Endpoints da API

### 1. Ranking de Anúncios
```
GET /api/ads/ranking?period=30&limit=50
```

**Parâmetros:**
- `period`: Período em dias (7, 30, 90, 365)
- `limit`: Número máximo de anúncios (padrão: 50)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "ranking": [
      {
        "ads_id": "120214176345760373",
        "ads_headline": "Título do anúncio",
        "ads_copy": "Texto do anúncio",
        "media_type": "video",
        "source_type": "ad",
        "source_url": "https://fb.me/...",
        "total_leads": 46,
        "total_conversions": 12,
        "paid_conversions": 8,
        "conversion_rate": "26.09",
        "paid_conversion_rate": "17.39",
        "first_lead": "2025-08-23T17:28:23.021636+00:00",
        "last_lead": "2025-09-02T03:03:42.409486+00:00"
      }
    ],
    "summary": {
      "total_leads": 81,
      "unique_ads": 4,
      "leads_today": 5,
      "period_days": 30
    }
  }
}
```

### 2. Detalhes de Anúncio
```
GET /api/ads/:adsId/details?period=30
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "ad": {
      "ads_id": "120214176345760373",
      "ads_headline": "Título do anúncio",
      "ads_copy": "Texto do anúncio",
      "media_type": "video",
      "source_type": "ad",
      "source_url": "https://fb.me/..."
    },
    "metrics": {
      "total_leads": 46,
      "total_conversions": 12,
      "paid_conversions": 8,
      "conversion_rate": "26.09",
      "paid_conversion_rate": "17.39",
      "total_value": 15000.00,
      "average_value": 1875.00
    },
    "timeline": [
      { "date": "2025-08-23", "count": 5 },
      { "date": "2025-08-24", "count": 8 }
    ],
    "period_days": 30
  }
}
```

### 3. Estatísticas de Campanhas
```
GET /api/ads/campaigns/stats?period=30
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "media_ranking": [
      {
        "media_type": "video",
        "total_leads": 70,
        "unique_ads": 3,
        "average_leads_per_ad": "23.33"
      }
    ],
    "day_distribution": [
      { "day": "segunda-feira", "count": 15 },
      { "day": "terça-feira", "count": 12 }
    ],
    "hour_distribution": [
      { "hour": 9, "count": 5 },
      { "hour": 10, "count": 8 }
    ],
    "summary": {
      "total_leads": 81,
      "unique_ads": 4,
      "period_days": 30
    }
  }
}
```

## 🎨 Interface do Usuário

### Características da Página
- **Design responsivo**: Funciona em desktop e mobile
- **Filtros**: Período (7, 30, 90, 365 dias)
- **Ordenação**: Por leads, conversão, conversões pagas
- **Visualização**: Tabela com ranking e painel de detalhes
- **Ícones**: Diferentes ícones para tipos de mídia
- **Cores**: Tema cyan/blue consistente com o sistema

### Funcionalidades da UI
1. **Ranking principal**: Tabela com top anúncios
2. **Painel de detalhes**: Informações específicas do anúncio selecionado
3. **Estatísticas gerais**: Cards com métricas resumidas
4. **Análise por mídia**: Ranking por tipo de mídia
5. **Links externos**: Acesso direto aos anúncios originais

## 🔧 Configuração

### 1. Backend
- **Controller**: `src/controllers/adsController.js`
- **Rotas**: `src/routes/adsRoutes.js`
- **Middleware**: Autenticação obrigatória

### 2. Frontend
- **Página**: `frontend/src/pages/Ads.jsx`
- **Rota**: `/ads`
- **Navegação**: Adicionado ao menu principal

### 3. Banco de Dados
- **Tabela**: `tracking` (já existente)
- **Relacionamentos**: 
  - `tracking.client_id` → `clients.id`
  - `tracking.leads` → `leads.id` (via phone)
  - `leads.proposals` → `proposals.lead_id`

## 📊 Métricas Calculadas

### Conversões
- **Total de conversões**: Leads que geraram propostas
- **Conversões pagas**: Propostas com status 'paid'
- **Taxa de conversão**: (Conversões / Total de leads) * 100
- **Taxa de conversão paga**: (Conversões pagas / Total de leads) * 100

### Valores
- **Valor total**: Soma de todas as propostas pagas
- **Valor médio**: Valor total / Número de conversões pagas

### Distribuições
- **Por tipo de mídia**: Agrupamento por `media_type`
- **Por dia da semana**: Distribuição temporal
- **Por hora**: Padrões de horário

## 🚀 Como Usar

### 1. Acessar a Página
1. Faça login no sistema
2. Navegue para `/ads` ou clique em "Ads" no menu
3. A página carregará automaticamente os dados dos últimos 30 dias

### 2. Filtrar Dados
1. Use o seletor de período no canto superior direito
2. Escolha entre 7, 30, 90 ou 365 dias
3. Os dados serão recarregados automaticamente

### 3. Analisar Performance
1. Visualize o ranking na tabela principal
2. Clique em "Detalhes" para ver métricas específicas
3. Analise as estatísticas por tipo de mídia
4. Use os links externos para ver os anúncios originais

### 4. Interpretar Métricas
- **Leads**: Número de pessoas que clicaram no anúncio
- **Conversões**: Leads que completaram o processo
- **Taxa de conversão**: Eficiência do anúncio
- **Valor**: Receita gerada pelo anúncio

## 🔍 Troubleshooting

### Problemas Comuns

1. **Dados não aparecem**
   - Verifique se há registros na tabela `tracking`
   - Confirme se o `ads_id` não é nulo
   - Verifique o período selecionado

2. **Erro de autenticação**
   - Confirme se está logado
   - Verifique se o token de acesso é válido
   - Tente fazer logout e login novamente

3. **Performance lenta**
   - Reduza o período de análise
   - Diminua o limite de resultados
   - Verifique índices no banco de dados

### Logs
- **Backend**: Verifique logs em `src/logs/`
- **Frontend**: Abra DevTools para ver erros no console
- **API**: Use Network tab para verificar requisições

## 📈 Próximos Passos

### Melhorias Futuras
1. **Gráficos**: Adicionar visualizações gráficas
2. **Exportação**: Permitir exportar dados em CSV/Excel
3. **Alertas**: Notificações para mudanças de performance
4. **Comparação**: Comparar períodos diferentes
5. **ROI**: Calcular retorno sobre investimento
6. **Segmentação**: Análise por demografia/geografia

### Integrações
1. **Meta Ads API**: Buscar dados diretamente da Meta
2. **Google Analytics**: Integrar com GA4
3. **Webhooks**: Atualizações em tempo real
4. **Relatórios**: Geração automática de relatórios

## 📚 Referências

- [Meta CTWA Documentation](https://developers.facebook.com/docs/whatsapp/click-to-whatsapp-ads)
- [Supabase Documentation](https://supabase.com/docs)
- [React Icons](https://react-icons.github.io/react-icons/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Desenvolvido para o sistema FgtsAgent**  
*Versão 1.0 - Setembro 2025*
