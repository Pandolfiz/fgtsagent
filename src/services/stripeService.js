const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');

/**
 * Serviço principal Stripe
 * Mantém apenas as funções essenciais de busca de planos e produtos
 */
class StripeService {
  /**
   * Obter todos os planos disponíveis
   */
  async getPlans() {
    try {
      console.log('🔍 Buscando planos no Stripe...');
      
      // Buscar produtos ativos
      const products = await stripe.products.list({
        limit: 100,
        active: true
      });

      console.log(`📦 ${products.data.length} produtos encontrados`);

      // Buscar preços para cada produto
      const plansWithPrices = await Promise.all(
        products.data.map(async (product) => {
          const prices = await stripe.prices.list({
            product: product.id,
            active: true,
            expand: ['data.product']
          });

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            metadata: product.metadata,
            prices: prices.data.map(price => ({
              id: price.id,
              unit_amount: price.unit_amount,
              currency: price.currency,
              recurring: price.recurring,
              interval: price.recurring?.interval || 'one_time'
            }))
          };
        })
      );

      console.log('✅ Planos processados com sucesso');
      return plansWithPrices;

    } catch (error) {
      console.error('❌ Erro ao buscar planos:', error);
      logger.error('Failed to retrieve plans', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Obter todos os produtos disponíveis
   */
  async getProducts() {
    try {
      console.log('🔍 Buscando produtos no Stripe...');
      
      const products = await stripe.products.list({
        limit: 100,
        active: true
      });

      console.log(`📦 ${products.data.length} produtos encontrados`);

      // Buscar preços para cada produto
      const productsWithPrices = await Promise.all(
        products.data.map(async (product) => {
          const prices = await stripe.prices.list({
            product: product.id,
            active: true
          });

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            metadata: product.metadata,
            images: product.images,
            prices: prices.data.map(price => ({
              id: price.id,
              unit_amount: price.unit_amount,
              currency: price.currency,
              recurring: price.recurring,
              interval: price.recurring?.interval || 'one_time'
            }))
          };
        })
      );

      console.log('✅ Produtos processados com sucesso');
      return productsWithPrices;

    } catch (error) {
      console.error('❌ Erro ao buscar produtos:', error);
      logger.error('Failed to retrieve products', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
}

module.exports = new StripeService(); 
