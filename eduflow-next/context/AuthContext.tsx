'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { AppUser } from '@/lib/types';
import { initAunqa, getCurrentUser, logoutUser } from '@/lib/api';
import LogoutLoader from '@/components/auth/LogoutLoader';

interface AuthContextValue {
  /** ผู้ใช้ปัจจุบัน (null = ยังไม่ล็อกอิน) — ใช้เป็น actor ของทุก write */
  user: AppUser | null;
  /** true จนกว่า seed ข้อมูลเดโม่ + อ่าน session เสร็จ */
  isLoading: boolean;
  /** อ่าน session ใหม่ (หลัง login / แก้ role) */
  refresh: () => void;
  /** ออกจากระบบ: แสดงอนิเมชั่นสั้น ๆ แล้วล้าง session + กลับหน้าแรก */
  logout: () => void;
  /** error ตอนเริ่มข้อมูลเดโม่ (ถ้ามี) */
  initError: string;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, isLoading: true, refresh: () => {}, logout: () => {}, initError: '',
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<AppUser | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [initError, setInitError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const loggingOutRef = useRef(false);

  const refresh = useCallback(() => {
    setUser(getCurrentUser());
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    setLoggingOut(true);
    // ไปหน้าแรกก่อน แล้วค่อยล้าง session — ถ้าล้างก่อน guard จะเด้งไป /login แทน
    setTimeout(() => {
      router.push('/');
      setTimeout(() => {
        logoutUser();
        setUser(null);
        setLoggingOut(false);
        loggingOutRef.current = false;
      }, 450);
    }, 1000);
  }, [router]);

  useEffect(() => {
    // TODO(PostgreSQL): แทนที่ด้วย session จาก server (next-auth / JWT)
    initAunqa()
      .catch(e => setInitError(e instanceof Error ? e.message : 'เริ่มต้นข้อมูลไม่สำเร็จ'))
      .finally(refresh);
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, isLoading, refresh, logout, initError }}>
      {children}
      {loggingOut && <LogoutLoader />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
