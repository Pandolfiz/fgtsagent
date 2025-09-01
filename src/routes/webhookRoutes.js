const express = require('express');
const router = express.Router();
const webhookService = require('../services/webhookService');
const logger = require('../utils/logger');

/**
 * @route POST /api/webhooks/stripe
 * @desc Endpoint de webhook Stripe
 * @access Public (Stripe envia para este endpoint)
 */
router.post('/stripe', 
  // OBRIGATÓRIO: Usar express.raw para webhooks Stripe
  express.raw({ type: 'application/json' }), 
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      console.log('🔔 Webhook Stripe recebido');
      console.log('📝 Headers:', {
        'stripe-signature': sig ? 'Presente' : 'Ausente',
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      });

      // OBRIGATÓRIO: Verificar assinatura HMAC
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('❌ STRIPE_WEBHOOK_SECRET não configurado');
        return res.status(500).json({ 
          error: 'Webhook secret não configurado' 
        });
      }

      // Verificar assinatura do webhook
      event = require('stripe')(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(
        req.body, 
        sig, 
        process.env.STRIPE_WEBHOOK_SECRET
      );

      console.log('✅ Assinatura do webhook verificada');
      console.log('📊 Evento:', event.type);
      console.log('🆔 ID do evento:', event.id);

      logger.info('Webhook signature verified', {
        eventType: event.type,
        eventId: event.id,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('❌ Falha na verificação da assinatura do webhook:', err.message);
      
      logger.error('Webhook signature verification failed', {
        error: err.message,
        stack: err.stack,
        signature: sig,
        timestamp: new Date().toISOString()
      });

      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Processar evento
    try {
      console.log('🔄 Processando evento...');
      
      await webhookService.handleEvent(event);
      
      console.log('✅ Evento processado com sucesso');
      
      res.json({ 
        received: true,
        eventType: event.type,
        eventId: event.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Falha no processamento do webhook:', error);
      
      logger.error('Webhook processing failed', {
        eventType: event.type,
        eventId: event.id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      res.status(500).json({ 
        error: 'Webhook processing failed',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/webhooks/stripe/events
 * @desc Listar eventos de webhook suportados
 * @access Public
 */
router.get('/stripe/events', (req, res) => {
  try {
    console.log('📋 Listando eventos de webhook suportados');
    
    const supportedEvents = webhookService.getSupportedEvents();
    
    logger.info('Webhook events listed', {
      count: supportedEvents.length,
      events: supportedEvents,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        supportedEvents,
        count: supportedEvents.length,
        description: 'Eventos de webhook suportados pela integração Stripe',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Erro ao listar eventos:', error);
    
    logger.error('Failed to list webhook events', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao listar eventos de webhook'
    });
  }
});

/**
 * @route POST /api/webhooks/stripe/test
 * @desc Testar processamento de webhook (apenas desenvolvimento)
 * @access Public
 */
router.post('/stripe/test', async (req, res) => {
  try {
    // Verificar se é ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Teste de webhook não permitido em produção'
      });
    }

    const { eventType, eventData } = req.body;
    
    console.log('🧪 Testando webhook:', eventType);
    
    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: 'Campo obrigatório: eventType'
      });
    }

    // Verificar se o evento é suportado
    if (!webhookService.isEventSupported(eventType)) {
      return res.status(400).json({
        success: false,
        error: `Tipo de evento não suportado: ${eventType}`,
        supportedEvents: webhookService.getSupportedEvents()
      });
    }

    // Criar evento de teste
    const testEvent = {
      id: `evt_test_${Date.now()}`,
      type: eventType,
      data: {
        object: eventData || {}
      },
      created: Math.floor(Date.now() / 1000)
    };

    console.log('🔧 Processando evento de teste...');
    
    await webhookService.handleEvent(testEvent);
    
    console.log('✅ Evento de teste processado com sucesso');

    logger.info('Test webhook processed successfully', {
      eventType,
      eventId: testEvent.id,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        message: 'Evento de teste processado com sucesso',
        eventType,
        eventId: testEvent.id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erro no teste de webhook:', error);
    
    logger.error('Test webhook failed', {
      error: error.message,
      stack: error.stack,
      eventType: req.body.eventType,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Erro no teste de webhook',
      details: error.message
    });
  }
});

/**
 * @route GET /api/webhooks/stripe/health
 * @desc Verificar saúde do sistema de webhooks
 * @access Public
 */
router.get('/stripe/health', (req, res) => {
  try {
    console.log('🏥 Verificando saúde do sistema de webhooks');
    
    const supportedEvents = webhookService.getSupportedEvents();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    const healthStatus = {
      status: 'healthy',
      webhooks: {
        enabled: true,
        secretConfigured: !!webhookSecret,
        supportedEvents: supportedEvents.length,
        events: supportedEvents
      },
      stripe: {
        secretKey: !!process.env.STRIPE_SECRET_KEY,
        publishableKey: !!process.env.STRIPE_PUBLISHABLE_KEY
      },
      timestamp: new Date().toISOString()
    };

    // Verificar se há problemas
    if (!webhookSecret) {
      healthStatus.status = 'warning';
      healthStatus.webhooks.secretConfigured = false;
    }

    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PUBLISHABLE_KEY) {
      healthStatus.status = 'error';
      healthStatus.stripe.configured = false;
    }

    logger.info('Webhook health check completed', {
      status: healthStatus.status,
      supportedEvents: supportedEvents.length,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: healthStatus
    });

  } catch (error) {
    console.error('❌ Erro na verificação de saúde:', error);
    
    logger.error('Webhook health check failed', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router; 