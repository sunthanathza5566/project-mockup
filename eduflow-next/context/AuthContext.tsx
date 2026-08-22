'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@/lib/types';
import { getSession, clearSession, initAuth } from '@/lib/api/auth.api';
import { seedDemoAcademics, seedDemoCohort, seedFullGrades, seedDemoRosterGrades, allStudentCodes } from '@/lib/api/academic.store';
import { seedDemoAssessments } from '@/lib/api/assessment.store';
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
    seedDemoAcademics();   // จำลองข้อมูลผลการเรียน ปี 2568/2569 (รันครั้งเดียว) สำหรับทดสอบเอกสาร ปพ.
    seedDemoCohort();      // cohort ที่เลื่อนชั้นข้ามปี (รหัสเดิม) — ให้ ปพ.1 แสดงผลครบทุกปี
    seedFullGrades();      // ห้องทดสอบครบทุกชั้น ป.1-6/ม.1-6 (ปี 2569) สำหรับทดสอบเลื่อนชั้น
    seedDemoRosterGrades(); // คะแนนบัญชี demo ม.1/1 (10021-10025) — ให้ GPA Dashboard = หน้าผลการเรียน
    // จำลองผลประเมินคุณลักษณะฯ ให้นักเรียน "ทุกคนที่มีอยู่จริงในห้อง" (mock + seed + cohort)
    // — กันเอกสาร ปพ.1/4/6 ขึ้น '—' เพราะนักเรียนบางคนไม่อยู่ในชุดรหัสที่ generate เอง
    seedDemoAssessments(allStudentCodes());
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
