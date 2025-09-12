import React, { useState, useEffect } from 'react';
import tokenBillingService from '../services/tokenBillingService';

const TokenBillingDemo = () => {
  const [customerId, setCustomerId] = useState('');
  const [tokensUsed, setTokensUsed] = useState(0);
  const [billingSummary, setBillingSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [costCalculation, setCostCalculation] = useState(null);

  // Calcular custo quando tokens mudarem
  useEffect(() => {
    if (tokensUsed > 0) {
      const calculation = tokenBillingService.calculateTokenCost(tokensUsed);
      setCostCalculation(calculation);
    }
  }, [tokensUsed]);

  const handleCreateSubscription = async () => {
    if (!customerId) {
      alert('Por favor, insira um Customer ID');
      return;
    }

    setLoading(true);
    try {
      const result = await tokenBillingService.createMonthlySubscription(customerId);
      alert(`Subscription criada com sucesso! ID: ${result.data.subscriptionId}`);
    } catch (error) {
      alert(`Erro ao criar subscription: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessUsage = async () => {
    if (!customerId || tokensUsed <= 0) {
      alert('Por favor, insira Customer ID e quantidade de tokens');
      return;
    }

    setLoading(true);
    try {
      const result = await tokenBillingService.processTokenUsage(customerId, tokensUsed);
      alert('Uso de tokens processado com sucesso!');
      await loadBillingSummary();
    } catch (error) {
      alert(`Erro ao processar uso: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadBillingSummary = async () => {
    if (!customerId) return;

    try {
      const result = await tokenBillingService.getBillingSummary(customerId);
      setBillingSummary(result.data);
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    }
  };

  const handleResetCycle = async () => {
    if (!customerId) {
      alert('Por favor, insira um Customer ID');
      return;
    }

    setLoading(true);
    try {
      await tokenBillingService.resetBillingCycle(customerId);
      alert('Ciclo de cobrança resetado com sucesso!');
      await loadBillingSummary();
    } catch (error) {
      alert(`Erro ao resetar ciclo: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Demonstração - Cobrança por Faixas de Tokens
      </h2>

      {/* Formulário Principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer ID
            </label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="cus_xxxxxxxxxxxxx"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tokens Usados
            </label>
            <input
              type="number"
              value={tokensUsed}
              onChange={(e) => setTokensUsed(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: 10000000 (10M tokens)"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleCreateSubscription}
              disabled={loading || !customerId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Criar Subscription
            </button>

            <button
              onClick={handleProcessUsage}
              disabled={loading || !customerId || tokensUsed <= 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Processar Uso
            </button>

            <button
              onClick={loadBillingSummary}
              disabled={loading || !customerId}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              Ver Resumo
            </button>

            <button
              onClick={handleResetCycle}
              disabled={loading || !customerId}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              Resetar Ciclo
            </button>
          </div>
        </div>

        {/* Cálculo de Custo */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Cálculo de Custo</h3>
          {costCalculation ? (
            <div className="space-y-2">
              <div className="text-sm">
                <strong>Tokens usados:</strong> {costCalculation.tokensUsedFormatted}
              </div>
              <div className="text-lg font-bold text-green-600">
                <strong>Total:</strong> {costCalculation.totalCostFormatted}
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Detalhamento:</h4>
                <div className="space-y-1 text-sm">
                  {costCalculation.breakdown.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{item.tier}: {item.tokens}</span>
                      <span>R$ {(item.cost / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Insira a quantidade de tokens para ver o cálculo</p>
          )}
        </div>
      </div>

      {/* Resumo de Cobrança */}
      {billingSummary && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Resumo de Cobrança</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Cliente</h4>
              <p className="text-sm text-gray-600">
                ID: {billingSummary.customer.id}
              </p>
              <p className="text-sm text-gray-600">
                Email: {billingSummary.customer.email || 'N/A'}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium">Subscriptions Ativas</h4>
              <p className="text-sm text-gray-600">
                {billingSummary.subscriptions.length} subscription(s)
              </p>
            </div>
            
            <div>
              <h4 className="font-medium">Cobranças Recentes</h4>
              <p className="text-sm text-gray-600">
                {billingSummary.recentCharges.length} cobrança(s) recente(s)
              </p>
            </div>
            
            <div>
              <h4 className="font-medium">Metadata</h4>
              <pre className="text-xs bg-white p-2 rounded overflow-auto">
                {JSON.stringify(billingSummary.customer.metadata, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Exemplos de Uso */}
      <div className="mt-8 bg-yellow-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Exemplos de Uso</h3>
        <div className="space-y-2 text-sm">
          <div>
            <strong>10M tokens:</strong> R$ 400 (taxa fixa) + R$ 100 (excedeu 4M) = R$ 500
          </div>
          <div>
            <strong>15M tokens:</strong> R$ 400 (taxa fixa) + R$ 100 (excedeu 4M) = R$ 500
          </div>
          <div>
            <strong>25M tokens:</strong> R$ 400 (taxa fixa) + R$ 200 (excedeu 4M e 12M) = R$ 600
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenBillingDemo;
