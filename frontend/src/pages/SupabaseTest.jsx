import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import Navbar from '../components/Navbar';

export default function SupabaseTest() {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [envVars, setEnvVars] = useState({});

  useEffect(() => {
    // Verificar as variáveis de ambiente
    setEnvVars({
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'não definido',
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'definido (oculto)' : 'não definido',
      SUPABASE_URL: import.meta.env.SUPABASE_URL || 'não definido',
    });
  }, []);

  const addResult = (test, result, details = null) => {
    setTestResults(prev => [...prev, { 
      id: Date.now(), 
      test, 
      result, 
      timestamp: new Date().toLocaleTimeString(),
      details
    }]);
  };

  const testAuth = async () => {
    try {
      addResult('Teste de autenticação anônima', 'Iniciando...');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        addResult('Teste de autenticação anônima', 'Falha', error);
        return false;
      }
      
      addResult('Teste de autenticação anônima', 'Sucesso', {
        session: data.session ? 'Ativa' : 'Não ativa',
        user: data.session?.user?.id || 'Não autenticado'
      });
      return true;
    } catch (error) {
      addResult('Teste de autenticação anônima', 'Erro inesperado', error);
      return false;
    }
  };

  const testContacts = async () => {
    try {
      addResult('Consulta tabela contacts', 'Iniciando...');
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('contacts')
        .select('count');
      const duration = Date.now() - startTime;
      
      if (error) {
        addResult('Consulta tabela contacts', `Falha (${duration}ms)`, error);
        return false;
      }
      
      addResult('Consulta tabela contacts', `Sucesso (${duration}ms)`, {
        count: data[0]?.count || 0
      });
      return true;
    } catch (error) {
      addResult('Consulta tabela contacts', 'Erro inesperado', error);
      return false;
    }
  };

  const testClientContacts = async () => {
    try {
      // Primeiro obtém usuário
      addResult('Consulta contatos do usuário', 'Buscando usuário atual...');
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData.user) {
        addResult('Consulta contatos do usuário', 'Falha - Usuário não autenticado');
        return false;
      }
      
      addResult('Consulta contatos do usuário', 'Usuário encontrado', {
        userId: authData.user.id
      });
      
      // Consulta contatos do usuário
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('client_id', authData.user.id);
      const duration = Date.now() - startTime;
      
      if (error) {
        addResult('Consulta contatos do usuário', `Falha (${duration}ms)`, error);
        return false;
      }
      
      addResult('Consulta contatos do usuário', `Sucesso (${duration}ms)`, {
        count: data.length,
        firstContact: data.length > 0 ? `${data[0].push_name} (${data[0].phone})` : 'Nenhum'
      });
      return true;
    } catch (error) {
      addResult('Consulta contatos do usuário', 'Erro inesperado', error);
      return false;
    }
  };
  
  const testAPIUser = async () => {
    try {
      addResult('Teste API de usuário', 'Iniciando...');
      const startTime = Date.now();
      const response = await fetch('/api/auth/me');
      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        const errorText = await response.text();
        addResult('Teste API de usuário', `Falha (${duration}ms)`, {
          status: response.status,
          error: errorText
        });
        return false;
      }
      
      const userData = await response.json();
      addResult('Teste API de usuário', `Sucesso (${duration}ms)`, {
        userId: userData.id,
        displayName: userData.displayName
      });
      return userData;
    } catch (error) {
      addResult('Teste API de usuário', 'Erro inesperado', error);
      return false;
    }
  };
  
  const testDirectContacts = async (userId) => {
    if (!userId) {
      addResult('Teste direto de contatos', 'Não foi possível executar - ID de usuário necessário');
      return false;
    }
    
    try {
      addResult('Teste direto de contatos', `Consultando para ID ${userId}...`);
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('client_id', userId);
      const duration = Date.now() - startTime;
      
      if (error) {
        addResult('Teste direto de contatos', `Falha (${duration}ms)`, error);
        return false;
      }
      
      addResult('Teste direto de contatos', `Sucesso (${duration}ms)`, {
        count: data.length,
        contacts: data.map(c => `${c.push_name} (${c.phone})`).join(', ')
      });
      return true;
    } catch (error) {
      addResult('Teste direto de contatos', 'Erro inesperado', error);
      return false;
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      // Teste 1: Autenticação
      await testAuth();
      
      // Teste 2: Acesso à tabela contatos
      await testContacts();
      
      // Teste 3: Autenticação de usuário pela API
      const userData = await testAPIUser();
      
      // Teste 4: Consulta contatos do usuário atual
      await testClientContacts();
      
      // Teste 5: Consulta direta usando ID do Backend
      if (userData && userData.id) {
        await testDirectContacts(userData.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar fullWidth />
      <div className="bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden p-6 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Diagnóstico de Conexão Supabase</h1>
          
          <div className="mb-6 bg-black/30 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-2">Variáveis de Ambiente</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex">
                  <span className="text-emerald-400 font-mono">{key}:</span>
                  <span className="text-white ml-2 font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex space-x-4 mb-6">
            <button
              onClick={runAllTests}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Executando testes...
                </>
              ) : 'Executar todos os testes'}
            </button>
            
            <button
              onClick={testAPIUser}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Testar API de usuário
            </button>
            
            <button
              onClick={testContacts}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              Testar tabela de contatos
            </button>
          </div>
          
          <div className="overflow-hidden rounded-lg border border-cyan-800">
            <table className="min-w-full divide-y divide-cyan-800">
              <thead className="bg-black/30">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
                    Teste
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
                    Resultado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
                    Horário
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
                    Detalhes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-black/20 divide-y divide-cyan-900">
                {testResults.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-cyan-200">
                      Nenhum teste executado ainda
                    </td>
                  </tr>
                ) : (
                  testResults.map((result) => (
                    <tr key={result.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {result.test}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${result.result.includes('Sucesso') ? 'bg-green-100 text-green-800' : 
                            result.result.includes('Falha') ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {result.result}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-200">
                        {result.timestamp}
                      </td>
                      <td className="px-6 py-4 text-sm text-cyan-200 max-w-xs overflow-hidden">
                        {result.details ? (
                          typeof result.details === 'object' ? (
                            <pre className="text-xs overflow-auto max-h-20">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          ) : result.details
                        ) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
} 