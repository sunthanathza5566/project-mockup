'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Session } from '@/lib/types';
import { getSession, clearSession, initAuth } from '@/lib/api/auth.api';

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  refresh: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  session: null, isLoading: true, refresh: () => {}, logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null);
  const [isLoading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setSession(getSession());
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  useEffect(() => {
    // TODO(PostgreSQL): แทนที่ด้วย next-auth หรือ JWT verify
    initAuth();
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ session, isLoading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
