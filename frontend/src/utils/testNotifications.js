/**
 * Utilitário para testar notificações diretamente no frontend
 */

export const createTestNotifications = () => {
  const testNotifications = [
    {
      id: 'test-error-1',
      type: 'balance_error',
      title: '❌ Erro na Consulta de Saldo',
      message: 'Pedro Nascimento: Instituição Fiduciária não possui autorização do Trabalhador para Operação Fiduciária.',
      timestamp: new Date().toISOString(),
      data: {
        leadId: 'e1e7185c-dc0f-467a-9013-32fdf25020d7',
        clientId: '06987548-fc75-4434-b8f0-ca6370e3bf56',
        errorReason: 'Instituição Fiduciária não possui autorização do Trabalhador para Operação Fiduciária.',
        leadName: 'Pedro Nascimento'
      }
    },
    {
      id: 'test-success-1',
      type: 'balance_success',
      title: '💰 Novo Saldo Consultado',
      message: 'Pedro Nascimento: R$ 35.000,75',
      timestamp: new Date().toISOString(),
      data: {
        leadId: 'e1e7185c-dc0f-467a-9013-32fdf25020d7',
        clientId: '06987548-fc75-4434-b8f0-ca6370e3bf56',
        balance: 35000.75,
        leadName: 'Pedro Nascimento'
      }
    },
    {
      id: 'test-zero-1',
      type: 'balance_zero',
      title: '💰 Consulta de Saldo Realizada',
      message: 'Pedro Nascimento: R$ 0,00 (sem saldo disponível)',
      timestamp: new Date().toISOString(),
      data: {
        leadId: 'e1e7185c-dc0f-467a-9013-32fdf25020d7',
        clientId: '06987548-fc75-4434-b8f0-ca6370e3bf56',
        balance: 0,
        leadName: 'Pedro Nascimento'
      }
    },
    {
      id: 'test-proposal-1',
      type: 'proposal_insert',
      title: '📋 Nova Proposta Criada',
      message: 'Pedro Nascimento: R$ 28.000,00',
      timestamp: new Date().toISOString(),
      data: {
        leadId: 'e1e7185c-dc0f-467a-9013-32fdf25020d7',
        clientId: '06987548-fc75-4434-b8f0-ca6370e3bf56',
        value: 28000.00,
        leadName: 'Pedro Nascimento'
      }
    }
  ];

  return testNotifications;
};

export const addTestNotificationsToStorage = () => {
  try {
    const testNotifications = createTestNotifications();
    localStorage.setItem('notifications', JSON.stringify(testNotifications));
    console.log('✅ Notificações de teste adicionadas ao localStorage');
    return testNotifications;
  } catch (error) {
    console.error('❌ Erro ao adicionar notificações de teste:', error);
    return [];
  }
};
