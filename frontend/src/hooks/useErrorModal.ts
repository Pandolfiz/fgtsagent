import { useState, useCallback } from 'react';

interface ErrorModalState {
  isOpen: boolean;
  title?: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  metaCode?: number;
  metaSubcode?: number;
}

export function useErrorModal() {
  const [modalState, setModalState] = useState<ErrorModalState>({
    isOpen: false,
    message: '',
    type: 'error'
  });

  const showError = useCallback((message: string, title?: string, metaCode?: number, metaSubcode?: number) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type: 'error',
      metaCode,
      metaSubcode
    });
  }, []);

  const showWarning = useCallback((message: string, title?: string) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type: 'warning'
    });
  }, []);

  const showInfo = useCallback((message: string, title?: string) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type: 'info'
    });
  }, []);

  const showSuccess = useCallback((message: string, title?: string) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type: 'success'
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    modalState,
    showError,
    showWarning,
    showInfo,
    showSuccess,
    closeModal
  };
} 