import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class TokenBillingService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/token-billing`,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Criar subscription mensal com taxa fixa de R$ 400
   */
  async createMonthlySubscription(customerId) {
    try {
      const response = await this.api.post('/create-subscription', {
        customerId
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar subscription mensal:', error);
      throw error;
    }
  }

  /**
   * Processar uso de tokens e cobrar quando necessário
   */
  async processTokenUsage(customerId, tokensUsed) {
    try {
      const response = await this.api.post('/process-usage', {
        customerId,
        tokensUsed
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao processar uso de tokens:', error);
      throw error;
    }
  }

  /**
   * Resetar ciclo de cobrança (início do mês)
   */
  async resetBillingCycle(customerId) {
    try {
      const response = await this.api.post('/reset-cycle', {
        customerId
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao resetar ciclo de cobrança:', error);
      throw error;
    }
  }

  /**
   * Obter resumo de cobrança do cliente
   */
  async getBillingSummary(customerId) {
    try {
      const response = await this.api.get(`/summary/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter resumo de cobrança:', error);
      throw error;
    }
  }

  /**
   * Cobrar por faixa específica (para testes)
   */
  async chargeTier(customerId, amount, description) {
    try {
      const response = await this.api.post('/charge-tier', {
        customerId,
        amount,
        description
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao cobrar por faixa:', error);
      throw error;
    }
  }

  /**
   * Calcular custo baseado no uso de tokens
   */
  calculateTokenCost(tokensUsed) {
    let totalCost = 40000; // R$ 400 fixo (em centavos)
    let breakdown = [];

    // Taxa fixa
    breakdown.push({
      tier: 'Taxa Fixa',
      tokens: '0 - 4M',
      cost: 40000,
      description: 'Taxa fixa mensal'
    });

    // Verificar faixas adicionais
    if (tokensUsed > 4000000) {
      const additionalTiers = Math.ceil((tokensUsed - 4000000) / 8000000);
      const additionalCost = additionalTiers * 10000; // R$ 100 por faixa
      totalCost += additionalCost;

      for (let i = 0; i < additionalTiers; i++) {
        const startTokens = 4000000 + (i * 8000000) + 1;
        const endTokens = Math.min(4000000 + ((i + 1) * 8000000), tokensUsed);
        
        breakdown.push({
          tier: `Faixa ${i + 1}`,
          tokens: `${(startTokens / 1000000).toFixed(1)}M - ${(endTokens / 1000000).toFixed(1)}M`,
          cost: 10000,
          description: `Cobrança adicional por exceder ${(startTokens / 1000000).toFixed(1)}M tokens`
        });
      }
    }

    return {
      totalCost,
      totalCostFormatted: `R$ ${(totalCost / 100).toFixed(2)}`,
      breakdown,
      tokensUsed,
      tokensUsedFormatted: `${(tokensUsed / 1000000).toFixed(1)}M tokens`
    };
  }

  /**
   * Simular uso de tokens para demonstração
   */
  simulateTokenUsage(customerId, tokensUsed) {
    return new Promise((resolve, reject) => {
      // Simular delay de processamento
      setTimeout(async () => {
        try {
          const result = await this.processTokenUsage(customerId, tokensUsed);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 1000);
    });
  }
}

export default new TokenBillingService();
