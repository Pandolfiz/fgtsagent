#!/usr/bin/env node

/**
 * Script para criar produtos e preços de teste no Stripe
 * Execute: node scripts/create-test-products.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ✅ VERIFICAR MODO
if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
  console.error('❌ ERRO: Este script deve ser executado em modo de TESTE!');
  console.error('Configure STRIPE_SECRET_KEY com uma chave de teste (sk_test_...)');
  process.exit(1);
}

console.log('🚀 Criando produtos e preços de TESTE no Stripe...');
console.log('Modo:', process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'TESTE' : 'PRODUÇÃO');

// ✅ PRODUTOS DE TESTE
const testProducts = [
  {
    name: 'Plano Basic - Teste',
    description: 'Plano básico para testes com funcionalidades essenciais',
    metadata: {
      plan: 'basic',
      type: 'test',
      environment: 'development'
    },
    prices: [
      {
        amount: 2900, // R$ 29,00
        currency: 'brl',
        interval: 'month',
        metadata: {
          plan: 'basic',
          interval: 'monthly',
          type: 'test'
        }
      },
      {
        amount: 29000, // R$ 290,00
        currency: 'brl',
        interval: 'year',
        metadata: {
          plan: 'basic',
          interval: 'annual',
          type: 'test'
        }
      }
    ]
  },
  {
    name: 'Plano Pro - Teste',
    description: 'Plano profissional para testes com funcionalidades avançadas',
    metadata: {
      plan: 'pro',
      type: 'test',
      environment: 'development'
    },
    prices: [
      {
        amount: 5900, // R$ 59,00
        currency: 'brl',
        interval: 'month',
        metadata: {
          plan: 'pro',
          interval: 'monthly',
          type: 'test'
        }
      },
      {
        amount: 59000, // R$ 590,00
        currency: 'brl',
        interval: 'year',
        metadata: {
          plan: 'pro',
          interval: 'annual',
          type: 'test'
        }
      }
    ]
  },
  {
    name: 'Plano Premium - Teste',
    description: 'Plano premium para testes com todas as funcionalidades',
    metadata: {
      plan: 'premium',
      type: 'test',
      environment: 'development'
    },
    prices: [
      {
        amount: 9900, // R$ 99,00
        currency: 'brl',
        interval: 'month',
        metadata: {
          plan: 'premium',
          interval: 'monthly',
          type: 'test'
        }
      },
      {
        amount: 99000, // R$ 990,00
        currency: 'brl',
        interval: 'year',
        metadata: {
          plan: 'premium',
          interval: 'annual',
          type: 'test'
        }
      }
    ]
  }
];

async function createTestProducts() {
  try {
    const results = [];
    
    for (const productData of testProducts) {
      console.log(`\n🔄 Criando produto: ${productData.name}`);
      
      // ✅ CRIAR PRODUTO
      const product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
        metadata: productData.metadata
      });
      
      console.log(`✅ Produto criado: ${product.id}`);
      
      const productResult = {
        productId: product.id,
        name: product.name,
        prices: []
      };
      
      // ✅ CRIAR PREÇOS PARA O PRODUTO
      for (const priceData of productData.prices) {
        console.log(`  🔄 Criando preço: ${priceData.interval} - R$ ${(priceData.amount / 100).toFixed(2)}`);
        
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: priceData.amount,
          currency: priceData.currency,
          recurring: {
            interval: priceData.interval
          },
          metadata: priceData.metadata
        });
        
        console.log(`  ✅ Preço criado: ${price.id}`);
        
        productResult.prices.push({
          priceId: price.id,
          amount: priceData.amount,
          currency: priceData.currency,
          interval: priceData.interval
        });
      }
      
      results.push(productResult);
    }
    
    // ✅ EXIBIR RESULTADOS
    console.log('\n🎉 PRODUTOS DE TESTE CRIADOS COM SUCESSO!');
    console.log('\n📋 CONFIGURAÇÃO PARA O CÓDIGO:');
    
    results.forEach(product => {
      console.log(`\n📦 ${product.name}:`);
      product.prices.forEach(price => {
        console.log(`  ${price.interval}: ${price.priceId} (R$ ${(price.amount / 100).toFixed(2)})`);
      });
    });
    
    // ✅ SALVAR EM ARQUIVO
    const fs = require('fs');
    const configPath = require('path').resolve(__dirname, '../config/test-products.json');
    
    fs.writeFileSync(configPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Configuração salva em: ${configPath}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Erro ao criar produtos de teste:', error);
    throw error;
  }
}

// ✅ EXECUTAR SCRIPT
if (require.main === module) {
  createTestProducts()
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script falhou:', error.message);
      process.exit(1);
    });
}

module.exports = { createTestProducts };
