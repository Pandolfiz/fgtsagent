import React, { useState, useEffect } from 'react';
import sessionTester from '../utils/sessionTester';

const SessionTestPanel = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      // Capturar logs do console
      const originalLog = console.log;
      const logs = [];
      
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalLog.apply(console, args);
      };
      
      // Executar testes
      await sessionTester.runAllTests();
      
      // Processar resultados
      const results = sessionTester.testResults.map(result => ({
        ...result,
        logs: logs.filter(log => log.includes(result.test))
      }));
      
      setTestResults(results);
      
      // Restaurar console.log
      console.log = originalLog;
      
    } catch (error) {
      console.error('Erro ao executar testes:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (success) => {
    return success ? '✅' : '❌';
  };

  const getStatusText = (success) => {
    return success ? 'PASSOU' : 'FALHOU';
  };

  const getStatusColor = (success) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          🧪 Teste de Persistência de Sessão
        </h2>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          {showDetails ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
        </button>
      </div>

      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Este painel testa a persistência da sessão após a limpeza dos conflitos de autenticação.
          Execute os testes para verificar se tudo está funcionando corretamente.
        </p>
        
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`px-6 py-3 rounded-lg font-medium text-white ${
            isRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isRunning ? '🔄 Executando Testes...' : '🚀 Executar Testes de Sessão'}
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">
            📊 Resultados dos Testes
          </h3>
          
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${
                result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-800">
                  {index + 1}. {result.test}
                </h4>
                <span className={`font-bold ${getStatusColor(result.success)}`}>
                  {getStatusIcon(result.success)} {getStatusText(result.success)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {Object.entries(result.results).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <span className={value ? 'text-green-600' : 'text-red-600'}>
                      {value ? '✅' : '❌'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                    </span>
                    <span className="text-sm font-medium">
                      {typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : value}
                    </span>
                  </div>
                ))}
              </div>

              {showDetails && result.logs && result.logs.length > 0 && (
                <div className="mt-3">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                      📝 Ver Logs Detalhados
                    </summary>
                    <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 max-h-32 overflow-y-auto">
                      {result.logs.map((log, logIndex) => (
                        <div key={logIndex} className="mb-1">
                          {log}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          ))}

          {/* Resumo */}
          <div className="bg-gray-100 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">📈 Resumo</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {testResults.length}
                </div>
                <div className="text-sm text-gray-600">Total de Testes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {testResults.filter(r => r.success).length}
                </div>
                <div className="text-sm text-gray-600">Testes Passaram</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {testResults.filter(r => !r.success).length}
                </div>
                <div className="text-sm text-gray-600">Testes Falharam</div>
              </div>
            </div>
            
            <div className="mt-3 text-center">
              <div className="text-lg font-medium text-gray-800">
                Taxa de Sucesso: {
                  Math.round((testResults.filter(r => r.success).length / testResults.length) * 100)
                }%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">💡 Como Usar</h4>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Faça login na aplicação primeiro</li>
          <li>Clique em "Executar Testes de Sessão"</li>
          <li>Verifique os resultados na aba do console do navegador</li>
          <li>Analise os detalhes de cada teste</li>
          <li>Se algum teste falhar, verifique os logs para identificar o problema</li>
        </ol>
      </div>

      {/* Comandos úteis */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-2">🔧 Comandos Úteis</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>
            <code className="bg-gray-200 px-2 py-1 rounded">window.testSessionPersistence()</code>
            <span className="ml-2">- Executa testes via console</span>
          </div>
          <div>
            <code className="bg-gray-200 px-2 py-1 rounded">localStorage.getItem('authToken')</code>
            <span className="ml-2">- Verifica token no localStorage</span>
          </div>
          <div>
            <code className="bg-gray-200 px-2 py-1 rounded">document.cookie</code>
            <span className="ml-2">- Verifica cookies de autenticação</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionTestPanel;

