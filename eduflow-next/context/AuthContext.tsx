'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@/lib/types';
import { getSession, clearSession, initAuth } from '@/lib/api/auth.api';
import LogoutLoader from '@/components/auth/LogoutLoader';

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  refresh: () => void;
  /** ออกจากระบบ: แสดงอนิเมชั่นสั้น ๆ แล้วล้าง session + กลับหน้าแรก (จัดการครบในนี้ ผู้เรียกไม่ต้อง redirect เอง) */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  session: null, isLoading: true, refresh: () => {}, logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const loggingOutRef = useRef(false);

  const refresh = useCallback(() => {
    setSession(getSession());
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    if (loggingOutRef.current) return;  // กันกดซ้ำ
    loggingOutRef.current = true;
    setLoggingOut(true);
    // แสดงมาสคอตโบกมือลา ~1.3 วิ แล้วไปหน้าแรกก่อน (layout ปัจจุบัน unmount)
    // จากนั้นค่อยล้าง session — ถ้าล้างก่อนเปลี่ยน route หน้า guard จะเด้งไป /login แทนหน้าแรก
    setTimeout(() => {
      router.push('/');
      setTimeout(() => {
        clearSession();
        setSession(null);
        setLoggingOut(false);
        loggingOutRef.current = false;
      }, 450);
    }, 1300);
  }, [router]);

  useEffect(() => {
    // TODO(PostgreSQL): แทนที่ด้วย next-auth หรือ JWT verify
    initAuth();
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ session, isLoading, refresh, logout }}>
      {children}
      {loggingOut && <LogoutLoader />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
