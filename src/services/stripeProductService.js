/**
 * Serviço para buscar produtos e preços dinamicamente do Stripe
 * Elimina a necessidade de hardcoding IDs
 */

// ✅ VALIDAR: Chave do Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não está configurada no arquivo .env');
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeProductService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
    
    // ✅ VALIDAR: Configuração do Stripe
    this.validateStripeConfig();
  }

  /**
   * Valida a configuração do Stripe
   */
  async validateStripeConfig() {
    try {
      console.log('🔍 Validando configuração do Stripe...');
      
      // ✅ TESTAR: Conexão com Stripe
      const account = await stripe.accounts.retrieve();
      console.log('✅ Stripe configurado corretamente para conta:', account.id);
      
      // ✅ LOG: Ambiente atual
      this.logEnvironment();
      
    } catch (error) {
      console.error('❌ Erro na configuração do Stripe:', error.message);
      
      if (error.message.includes('Invalid API key')) {
        throw new Error('Chave do Stripe inválida. Verifique STRIPE_SECRET_KEY no arquivo .env');
      } else if (error.message.includes('No such account')) {
        throw new Error('Conta do Stripe não encontrada. Verifique STRIPE_SECRET_KEY');
      } else {
        throw new Error(`Erro na configuração do Stripe: ${error.message}`);
      }
    }
  }

  /**
   * Busca todos os produtos ativos do Stripe
   */
  async getAllProducts() {
    try {
      console.log('🔄 Buscando produtos do Stripe...');
      
      const products = await stripe.products.list({
        active: true,
        limit: 100
      });

      console.log(`✅ ${products.data.length} produtos encontrados`);
      
      // ✅ LOG: Detalhes dos produtos
      products.data.forEach(product => {
        console.log(`📦 Produto: ${product.name} (${product.id}) - Ativo: ${product.active}`);
      });
      
      return products.data;
    } catch (error) {
      console.error('❌ Erro ao buscar produtos:', error);
      
      if (error.message.includes('Invalid API key')) {
        throw new Error('Chave do Stripe inválida. Verifique STRIPE_SECRET_KEY');
      } else if (error.message.includes('No such account')) {
        throw new Error('Conta do Stripe não encontrada');
      } else {
        throw new Error(`Erro ao buscar produtos: ${error.message}`);
      }
    }
  }

  /**
   * Busca todos os preços ativos do Stripe
   */
  async getAllPrices() {
    try {
      console.log('🔄 Buscando preços do Stripe...');
      
      const prices = await stripe.prices.list({
        active: true,
        limit: 100,
        expand: ['data.product']
      });

      console.log(`✅ ${prices.data.length} preços encontrados`);
      
      // ✅ LOG: Detalhes dos preços
      prices.data.forEach(price => {
        console.log(`💰 Preço: ${price.id} - ${price.unit_amount} ${price.currency} - ${price.recurring?.interval || 'one-time'} - Produto: ${price.product?.name || 'N/A'}`);
      });
      
      // ✅ DEBUG: Verificar intervalos disponíveis
      const intervals = [...new Set(prices.data.map(p => p.recurring?.interval).filter(Boolean))];
      console.log(`🔍 Intervalos disponíveis:`, intervals);
      
      return prices.data;
    } catch (error) {
      console.error('❌ Erro ao buscar preços:', error);
      
      if (error.message.includes('Invalid API key')) {
        throw new Error('Chave do Stripe inválida. Verifique STRIPE_SECRET_KEY');
      } else if (error.message.includes('No such account')) {
        throw new Error('Conta do Stripe não encontrada');
      } else {
        throw new Error(`Erro ao buscar preços: ${error.message}`);
      }
    }
  }

  /**
   * Busca produtos com seus preços organizados
   */
  async getProductsWithPrices() {
    try {
      const cacheKey = 'products_with_prices';
      const cached = this.getFromCache(cacheKey);
      
      // ✅ FORÇAR REFRESH: Sempre buscar dados frescos para debug
      if (false && cached) {
        console.log('📋 Usando cache de produtos');
        return cached;
      }

      console.log('🔄 Buscando produtos e preços do Stripe...');
      
      const [products, prices] = await Promise.all([
        this.getAllProducts(),
        this.getAllPrices()
      ]);

      console.log(`📦 Produtos encontrados: ${products.length}`);
      console.log(`💰 Preços encontrados: ${prices.length}`);

      // ✅ ORGANIZAR PRODUTOS COM PREÇOS
      const productsWithPrices = products.map(product => {
        const productPrices = prices.filter(price => 
          price.product.id === product.id
        );

        console.log(`🔗 Produto ${product.name}: ${productPrices.length} preços encontrados`);
        
        // ✅ DEBUG: Verificar detalhes dos preços de cada produto
        productPrices.forEach(price => {
          console.log(`  💰 ${product.name}: ${price.unit_amount} ${price.currency} - ${price.recurring?.interval || 'one-time'}`);
        });
        
        // ✅ DEBUG: Verificar intervalos disponíveis para este produto
        const productIntervals = [...new Set(productPrices.map(p => p.recurring?.interval).filter(Boolean))];
        console.log(`  🔍 ${product.name} - Intervalos disponíveis:`, productIntervals);

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          metadata: product.metadata,
          prices: productPrices.map(price => {
            // ✅ DEBUG: Log detalhado de cada preço
            console.log(`🔍 Mapeando preço para ${product.name}:`, {
              id: price.id,
              amount: price.unit_amount,
              currency: price.currency,
              interval: price.recurring?.interval,
              recurring: price.recurring,
              metadata: price.metadata
            });
            
            // ✅ CORRIGIR MAPEAMENTO: Normalizar intervalos
            let normalizedInterval = price.recurring?.interval;
            
            // ✅ Mapear intervalos do Stripe para nossos padrões
            if (normalizedInterval === 'month' || normalizedInterval === 'monthly') {
              normalizedInterval = 'month';
            } else if (normalizedInterval === 'year' || normalizedInterval === 'yearly') {
              normalizedInterval = 'year';
            }
            
            return {
              id: price.id,
              amount: price.unit_amount,
              currency: price.currency,
              interval: normalizedInterval,
              metadata: price.metadata,
              amountFormatted: `R$ ${(price.unit_amount / 100).toFixed(2)}`
            };
          })
        };
      });

      // ✅ FILTRAR APENAS PRODUTOS COM PREÇOS
      const validProducts = productsWithPrices.filter(product => 
        product.prices.length > 0
      );

      console.log(`✅ ${validProducts.length} produtos válidos com preços`);
      
      // ✅ DEBUG: Verificar estrutura final dos preços
      validProducts.forEach(product => {
        console.log(`🎯 ${product.name} - Preços finais:`, {
          total: product.prices.length,
          intervals: product.prices.map(p => p.interval),
          monthly: product.prices.find(p => p.interval === 'month'),
          yearly: product.prices.find(p => p.interval === 'year')
        });
      });
      
      // ✅ SALVAR NO CACHE
      this.setCache(cacheKey, validProducts);
      
      return validProducts;
    } catch (error) {
      console.error('❌ Erro ao buscar produtos com preços:', error);
      throw error;
    }
  }

  /**
   * Busca produto específico por tipo de plano
   */
  async getProductByPlanType(planType) {
    try {
      // ✅ EVITAR LOOP: Buscar produtos diretamente, não via getProductsWithPrices
      const products = await this.getAllProducts();
      
      // ✅ BUSCAR POR METADATA OU NOME
      const product = products.find(p => 
        p.metadata?.plan === planType ||
        p.name.toLowerCase().includes(planType.toLowerCase())
      );

      if (!product) {
        throw new Error(`Produto não encontrado para o plano: ${planType}`);
      }

      console.log(`✅ Produto encontrado para ${planType}:`, product.name);
      return product;
    } catch (error) {
      console.error(`❌ Erro ao buscar produto para ${planType}:`, error);
      throw error;
    }
  }

  /**
   * Busca produto específico por tipo de plano COM PREÇOS
   */
  async getProductWithPricesByPlanType(planType) {
    try {
      console.log(`🔍 getProductWithPricesByPlanType chamado para: ${planType}`);
      
      // ✅ BUSCAR PRODUTO E PREÇOS
      const [products, prices] = await Promise.all([
        this.getAllProducts(),
        this.getAllPrices()
      ]);
      
      console.log(`📦 Produtos encontrados: ${products.length}`);
      console.log(`💰 Preços encontrados: ${prices.length}`);
      
      // ✅ BUSCAR PRODUTO POR TIPO
      const product = products.find(p => 
        p.metadata?.plan === planType ||
        p.name.toLowerCase().includes(planType.toLowerCase())
      );

      if (!product) {
        throw new Error(`Produto não encontrado para o plano: ${planType}`);
      }

      console.log(`✅ Produto encontrado:`, {
        id: product.id,
        name: product.name,
        metadata: product.metadata
      });

      // ✅ FILTRAR PREÇOS DO PRODUTO (usar price.product.id)
      const productPrices = prices.filter(p => p.product && p.product.id === product.id).map(price => ({
        id: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        metadata: price.metadata
      }));

      console.log(`💰 Preços do produto:`, {
        productId: product.id,
        pricesCount: productPrices.length,
        prices: productPrices.map(p => ({ id: p.id, amount: p.amount, interval: p.interval }))
      });

      // ✅ RETORNAR PRODUTO COM PREÇOS
      const productWithPrices = {
        ...product,
        prices: productPrices
      };

      console.log(`✅ Produto com preços encontrado para ${planType}:`, {
        name: product.name,
        pricesCount: productPrices.length,
        hasPrices: !!productWithPrices.prices,
        pricesType: typeof productWithPrices.prices
      });

      return productWithPrices;
    } catch (error) {
      console.error(`❌ Erro ao buscar produto com preços para ${planType}:`, error);
      throw error;
    }
  }

  /**
   * Busca preço específico por tipo de plano e intervalo
   */
  async getPriceByPlanAndInterval(planType, interval = 'monthly') {
    try {
      // ✅ EVITAR LOOP: Buscar produtos e preços diretamente
      const [products, prices] = await Promise.all([
        this.getAllProducts(),
        this.getAllPrices()
      ]);
      
      // ✅ BUSCAR PRODUTO POR TIPO
      const product = products.find(p => 
        p.metadata?.plan === planType ||
        p.name.toLowerCase().includes(planType.toLowerCase())
      );

      if (!product) {
        throw new Error(`Produto não encontrado para o plano: ${planType}`);
      }

      // ✅ CONVERTER INTERVALO
      const stripeInterval = interval === 'monthly' ? 'month' : 'year';
      
      // ✅ BUSCAR PREÇO DO PRODUTO
      const price = prices.find(p => 
        p.product.id === product.id && 
        p.recurring?.interval === stripeInterval
      );

      if (!price) {
        throw new Error(`Preço não encontrado para ${planType} - ${interval}`);
      }

      // ✅ FORMATAR PREÇO PARA RETORNO
      const formattedPrice = {
        id: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        metadata: price.metadata
      };

      console.log(`✅ Preço encontrado: ${planType} - ${interval} - R$ ${(formattedPrice.amount / 100).toFixed(2)}`);
      return formattedPrice;
    } catch (error) {
      console.error(`❌ Erro ao buscar preço para ${planType} - ${interval}:`, error);
      throw error;
    }
  }

  /**
   * Busca todos os produtos disponíveis para checkout
   */
  async getAvailableProducts() {
    try {
      const products = await this.getProductsWithPrices();
      
      // ✅ FORMATAR PARA FRONTEND
      const formattedProducts = products.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
        prices: product.prices.map(price => ({
          id: price.id,
          amount: price.amount,
          currency: price.currency,
          interval: price.interval,
          amountFormatted: `R$ ${(price.amount / 100).toFixed(2)}`,
          intervalText: price.interval === 'month' ? 'mensal' : 'anual'
        }))
      }));

      // ✅ ORDENAR PRODUTOS: Basic -> Pro -> Premium
      const sortedProducts = formattedProducts.sort((a, b) => {
        const getPlanOrder = (name) => {
          const lowerName = name.toLowerCase();
          if (lowerName.includes('basic')) return 1;
          if (lowerName.includes('pro')) return 2;
          if (lowerName.includes('premium')) return 3;
          return 999; // Outros planos vão para o final
        };

        return getPlanOrder(a.name) - getPlanOrder(b.name);
      });

      console.log('✅ Produtos ordenados:', sortedProducts.map(p => p.name));
      return sortedProducts;
    } catch (error) {
      console.error('❌ Erro ao buscar produtos disponíveis:', error);
      throw error;
    }
  }

  /**
   * Limpa cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache limpo');
  }

  /**
   * Busca do cache
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  /**
   * Salva no cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Verifica se está em modo de teste
   */
  isTestMode() {
    return process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');
  }

  /**
   * Log do ambiente atual
   */
  logEnvironment() {
    const mode = this.isTestMode() ? 'TESTE' : 'PRODUÇÃO';
    console.log(`🌍 Ambiente Stripe: ${mode}`);
    console.log(`🔑 Chave: ${process.env.STRIPE_SECRET_KEY?.substring(0, 20)}...`);
  }
}

module.exports = new StripeProductService();
