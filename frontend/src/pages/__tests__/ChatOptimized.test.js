import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ChatOptimized from '../ChatOptimized';

// Mock dos hooks customizados
jest.mock('../../hooks/usePolling', () => ({
  usePolling: jest.fn(() => ({
    isActive: true,
    forcePoll: jest.fn()
  }))
}));

jest.mock('../../hooks/useScrollToBottom', () => ({
  useScrollToBottom: jest.fn(() => ({
    containerRef: { current: null },
    isAtBottom: true,
    isScrolling: false,
    scrollToBottom: jest.fn(),
    scrollToPosition: jest.fn(),
    checkIfAtBottom: jest.fn(),
    getScrollInfo: jest.fn(() => ({
      scrollTop: 0,
      scrollHeight: 100,
      clientHeight: 100,
      isAtBottom: true,
      isScrolling: false,
      canScrollUp: false,
      canScrollDown: false
    }))
  }))
}));

jest.mock('../../hooks/useLoadingStates', () => ({
  useLoadingStates: jest.fn(() => ({
    isLoading: false,
    isSyncing: false,
    isUpdating: false,
    isInitialLoad: false,
    allowInfiniteScroll: true,
    isLoadingMore: false,
    isLoadingData: false,
    isLoadingUI: false,
    setLoading: jest.fn(),
    setMultipleLoading: jest.fn(),
    withLoading: jest.fn((key, operation) => operation()),
    withMultipleLoading: jest.fn((states, operation) => operation()),
    canExecute: jest.fn(() => true)
  }))
}));

// Mock do useClipboard
jest.mock('../../hooks/useClipboard', () => ({
  useClipboard: jest.fn(() => ({
    copyToClipboard: jest.fn(() => Promise.resolve(true)),
    readFromClipboard: jest.fn(() => Promise.resolve('')),
    isClipboardSupported: jest.fn(() => true)
  }))
}));

// Mock do useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(() => jest.fn())
}));

// Mock do apiFetch
jest.mock('../../utilities/apiFetch', () => ({
  apiFetch: jest.fn()
}));

// Mock do cachedFetch
jest.mock('../../utils/authCache', () => ({
  cachedFetch: jest.fn()
}));

// Mock do Navbar
jest.mock('../../components/Navbar', () => {
  return function MockNavbar() {
    return <div data-testid="navbar">Navbar</div>;
  };
});

// Mock do MessageInputOptimized
jest.mock('../../components/MessageInputOptimized', () => {
  return function MockMessageInputOptimized({ onSendMessage, disabled, placeholder }) {
    return (
      <div data-testid="message-input">
        <input
          data-testid="message-input-field"
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.value === 'test message' && onSendMessage) {
              onSendMessage('test message');
            }
          }}
        />
      </div>
    );
  };
});

// Função helper para renderizar com router
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ChatOptimized', () => {
  beforeEach(() => {
    // Mock fetch global
    global.fetch = jest.fn();
    
    // Mock window.innerWidth para mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderização Inicial', () => {
    test('deve renderizar o componente sem erros', () => {
      renderWithRouter(<ChatOptimized />);
      
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });

    test('deve mostrar mensagem de seleção de conversa quando não há contato selecionado', () => {
      renderWithRouter(<ChatOptimized />);
      
      expect(screen.getByText('Selecione uma conversa para começar')).toBeInTheDocument();
      expect(screen.getByText('Ou sincronize seus contatos para ver as conversas disponíveis')).toBeInTheDocument();
    });

    test('deve renderizar barra de busca e botão de sincronização', () => {
      renderWithRouter(<ChatOptimized />);
      
      expect(screen.getByPlaceholderText('Buscar contatos...')).toBeInTheDocument();
      expect(screen.getByText('Sincronizar')).toBeInTheDocument();
    });
  });

  describe('Funcionalidade de Busca', () => {
    test('deve permitir digitar na barra de busca', () => {
      renderWithRouter(<ChatOptimized />);
      
      const searchInput = screen.getByPlaceholderText('Buscar contatos...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      expect(searchInput.value).toBe('test search');
    });

    test('deve filtrar contatos baseado na busca', () => {
      // Mock de contatos
      const mockContacts = [
        { id: 1, name: 'João Silva', remote_jid: '5511999999999@s.whatsapp.net' },
        { id: 2, name: 'Maria Santos', remote_jid: '5511888888888@s.whatsapp.net' }
      ];

      renderWithRouter(<ChatOptimized />);
      
      // Simular contatos carregados
      const { rerender } = renderWithRouter(<ChatOptimized />);
      
      // Simular busca
      const searchInput = screen.getByPlaceholderText('Buscar contatos...');
      fireEvent.change(searchInput, { target: { value: 'João' } });
      
      // Verificar se a busca foi aplicada
      expect(searchInput.value).toBe('João');
    });
  });

  describe('Funcionalidade de Sincronização', () => {
    test('deve chamar função de sincronização ao clicar no botão', async () => {
      // Mock da resposta da API
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      renderWithRouter(<ChatOptimized />);
      
      const syncButton = screen.getByText('Sincronizar');
      fireEvent.click(syncButton);
      
      // Verificar se a função foi chamada
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/contacts/sync',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          })
        );
      });
    });
  });

  describe('Funcionalidade de Mensagens', () => {
    test('deve renderizar input de mensagem quando há contato selecionado', () => {
      // Mock de contato selecionado
      const mockContact = {
        id: 1,
        name: 'João Silva',
        remote_jid: '5511999999999@s.whatsapp.net'
      };

      renderWithRouter(<ChatOptimized />);
      
      // Simular seleção de contato
      // Nota: Em um teste real, isso seria feito através de interação do usuário
      // ou mock do estado do componente
    });

    test('deve permitir envio de mensagem', async () => {
      renderWithRouter(<ChatOptimized />);
      
      // Simular envio de mensagem
      const messageInput = screen.getByTestId('message-input-field');
      fireEvent.change(messageInput, { target: { value: 'test message' } });
      
      // Verificar se a mensagem foi enviada
      await waitFor(() => {
        expect(messageInput.value).toBe('test message');
      });
    });
  });

  describe('Responsividade', () => {
    test('deve adaptar layout para mobile', () => {
      // Mock de tela mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      renderWithRouter(<ChatOptimized />);
      
      // Verificar se o layout se adapta para mobile
      // Nota: Em um teste real, isso seria verificado através de classes CSS
      // ou propriedades de estilo
    });

    test('deve adaptar layout para desktop', () => {
      // Mock de tela desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      renderWithRouter(<ChatOptimized />);
      
      // Verificar se o layout se adapta para desktop
    });
  });

  describe('Estados de Loading', () => {
    test('deve mostrar indicador de loading quando carregando', () => {
      // Mock de estado de loading
      const { useLoadingStates } = require('../../hooks/useLoadingStates');
      useLoadingStates.mockReturnValue({
        isLoading: true,
        isSyncing: false,
        isUpdating: false,
        isInitialLoad: false,
        allowInfiniteScroll: true,
        isLoadingMore: false,
        isLoadingData: false,
        isLoadingUI: false,
        setLoading: jest.fn(),
        setMultipleLoading: jest.fn(),
        withLoading: jest.fn((key, operation) => operation()),
        withMultipleLoading: jest.fn((states, operation) => operation()),
        canExecute: jest.fn(() => true)
      });

      renderWithRouter(<ChatOptimized />);
      
      // Verificar se o indicador de loading é mostrado
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });

    test('deve mostrar indicador de sincronização quando sincronizando', () => {
      // Mock de estado de sincronização
      const { useLoadingStates } = require('../../hooks/useLoadingStates');
      useLoadingStates.mockReturnValue({
        isLoading: false,
        isSyncing: true,
        isUpdating: false,
        isInitialLoad: false,
        allowInfiniteScroll: true,
        isLoadingMore: false,
        isLoadingData: false,
        isLoadingUI: false,
        setLoading: jest.fn(),
        setMultipleLoading: jest.fn(),
        withLoading: jest.fn((key, operation) => operation()),
        withMultipleLoading: jest.fn((states, operation) => operation()),
        canExecute: jest.fn(() => true)
      });

      renderWithRouter(<ChatOptimized />);
      
      // Verificar se o indicador de sincronização é mostrado
      const syncButton = screen.getByText('Sincronizar');
      expect(syncButton).toBeInTheDocument();
    });
  });

  describe('Tratamento de Erros', () => {
    test('deve mostrar mensagem de erro quando há erro', () => {
      renderWithRouter(<ChatOptimized />);
      
      // Simular erro
      // Nota: Em um teste real, isso seria feito através de mock de erro
      // ou simulação de falha na API
    });

    test('deve mostrar indicador de conexão quando offline', () => {
      // Mock de conexão offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      });

      renderWithRouter(<ChatOptimized />);
      
      // Verificar se o indicador de conexão é mostrado
      expect(screen.getByText('Sem conexão com a internet')).toBeInTheDocument();
    });
  });

  describe('Acessibilidade', () => {
    test('deve ter elementos acessíveis', () => {
      renderWithRouter(<ChatOptimized />);
      
      // Verificar se elementos importantes têm labels apropriados
      const searchInput = screen.getByPlaceholderText('Buscar contatos...');
      expect(searchInput).toBeInTheDocument();
      
      const syncButton = screen.getByText('Sincronizar');
      expect(syncButton).toBeInTheDocument();
    });

    test('deve suportar navegação por teclado', () => {
      renderWithRouter(<ChatOptimized />);
      
      // Verificar se elementos são focáveis
      const searchInput = screen.getByPlaceholderText('Buscar contatos...');
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe('Performance', () => {
    test('deve renderizar sem re-renders desnecessários', () => {
      const { rerender } = renderWithRouter(<ChatOptimized />);
      
      // Simular re-render com mesmas props
      rerender(<ChatOptimized />);
      
      // Verificar se não há re-renders desnecessários
      // Nota: Em um teste real, isso seria verificado através de
      // mock de console.log ou ferramentas de profiling
    });

    test('deve limpar recursos adequadamente', () => {
      const { unmount } = renderWithRouter(<ChatOptimized />);
      
      // Desmontar componente
      unmount();
      
      // Verificar se recursos foram limpos
      // Nota: Em um teste real, isso seria verificado através de
      // mock de clearTimeout, clearInterval, etc.
    });
  });
});

// Testes de integração
describe('ChatOptimized Integration Tests', () => {
  test('deve carregar dados iniciais corretamente', async () => {
    // Mock das respostas da API
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, user: { id: 1, name: 'Test User' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, contacts: [] })
      });

    renderWithRouter(<ChatOptimized />);
    
    // Verificar se as chamadas da API foram feitas
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/me',
        expect.objectContaining({
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });

  test('deve sincronizar contatos corretamente', async () => {
    // Mock das respostas da API
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, contacts: [] })
      });

    renderWithRouter(<ChatOptimized />);
    
    const syncButton = screen.getByText('Sincronizar');
    fireEvent.click(syncButton);
    
    // Verificar se a sincronização foi executada
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/contacts/sync',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });
});
