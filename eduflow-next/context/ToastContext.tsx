'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ToastContextValue {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  toast: { msg: string; type?: string; visible: boolean } | null;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {}, toast: null,
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; type?: string; visible: boolean } | null>(null);
  let timer: ReturnType<typeof setTimeout>;

  const showToast = useCallback((msg: string, type?: 'success' | 'error' | 'info') => {
    clearTimeout(timer);
    setToast({ msg, type, visible: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    timer = setTimeout(() => setToast(prev => prev ? { ...prev, visible: false } : null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
