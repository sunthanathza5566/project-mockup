'use client';

/**
 * ผู้ใช้ปัจจุบัน + วงจร session (ADR-UI-001 ข้อ 6.2 B1, 6.4 M3, pages.md P3)
 *
 * - logout ด้วยตนเอง: flushAll() → ทุกตัวสำเร็จ = AppLoader "logout" 600ms → ไปหน้าแรก → ล้าง session
 *                     มีตัวล้มเหลว = dialog danger "ยังบันทึกงานไม่ได้" (กลับไปแก้ = ยกเลิก logout)
 * - ออกจากแท็บอื่น (subscribeSession ได้ null) / หมดอายุ (sessionTimeLeft() = null):
 *     flushAll() ก่อนเสมอ → สำเร็จ/ไม่มีค้าง = ไป /login?reason=other-tab|expired
 *     มีตัวล้มเหลว = ไม่ redirect, ตั้ง `sessionLost` (AppShell แสดงแถบ session-lost, หน้าเปลี่ยนเป็นอ่านอย่างเดียว)
 * - ตรวจเวลาที่เหลือทุก 30 วินาที — เหลือ ≤ 5 นาที เตือนครั้งเดียวต่อรอบหมดอายุ
 * - session จาก subscribeSession ที่ไม่ใช่ null แต่เป็นคนละ userId (แท็บอื่นล็อกอินเป็นคนอื่นทับ) = นับเป็นออกจากแท็บอื่น (U-5ข)
 *   ได้ null → เลือกเหตุผลจาก session ล่าสุดที่รู้: เลยเวลาแล้ว = expired ไม่ใช่ other-tab (U-5ก)
 * - U-2: ระหว่าง sessionLost — endSession() (เรียกเมื่อเปลี่ยนหน้า/กดปุ่มทำงาน/กด "เข้าสู่ระบบใหม่") ล้าง user แล้วไป /login
 * - U-4: ปิด dialog ทั้งหมดก่อนออก (คำเตือน idle ไม่ค้างบนหน้า /login)
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AppUser, Session } from '@/lib/types';
import {
  getCurrentUser, getSession, initAunqa, logoutUser, sessionExpiryKind, sessionTimeLeft, subscribeSession, touchSession,
  SESSION_IDLE_MS,
} from '@/lib/api';
import { flushAll, type FlushResult } from '@/lib/ui/flush';
import { useDialog } from '@/context/DialogContext';
import AppLoader from '@/components/ui/AppLoader';

export type ExitReason = 'expired' | 'other-tab';

interface AuthContextValue {
  /** ผู้ใช้ปัจจุบัน (null = ยังไม่ล็อกอิน) — ใช้เป็น actor ของทุก write */
  user: AppUser | null;
  /** true จนกว่า seed ข้อมูลเดโม่ + อ่าน session เสร็จ */
  isLoading: boolean;
  /** อ่าน session ใหม่ (หลัง login / แก้ role) */
  refresh: () => void;
  /** ออกจากระบบด้วยตนเอง (flush ก่อน — ยกเลิกได้ถ้าบันทึกไม่ได้) */
  logout: () => void;
  /** error ตอนเริ่มข้อมูลเดโม่ (ถ้ามี) */
  initError: string;
  /** กำลังออกจากพื้นที่แอป (AppShell ไม่ต้อง redirect เอง) */
  exiting: boolean;
  /** session หมด/ออกจากแท็บอื่นแล้ว แต่ยังบันทึกงานบางชิ้นไม่ได้ → หน้าอ่านอย่างเดียว */
  sessionLost: FlushResult[] | null;
  /** ระหว่าง sessionLost: ล้างผู้ใช้แล้วไปหน้าเข้าสู่ระบบ (U-2) */
  endSession: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, isLoading: true, refresh: () => {}, logout: () => {}, initError: '', exiting: false, sessionLost: null, endSession: () => {},
});

const CHECK_MS = 30_000;
const WARN_MS = 5 * 60 * 1000;
const LOGOUT_NAV_MS = 400;   // แสดง loader ขั้นต่ำก่อนเปลี่ยนหน้า
const LOGOUT_TOTAL_MS = 600; // logout รวม (C22)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<AppUser | null>(null);
  const [isLoading, setLoading]   = useState(true);
  const [initError, setInitError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [exiting, setExiting]     = useState(false);
  const [sessionLost, setSessionLost] = useState<FlushResult[] | null>(null);
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { confirm, notify, dismissAll } = useDialog();

  const userRef = useRef<AppUser | null>(null);
  userRef.current = user;
  const busyRef = useRef(false);          // logout/exit กำลังทำ
  const warnedRef = useRef<string>('');   // key ของรอบหมดอายุที่เตือนแล้ว
  const lostRef = useRef(false);
  const lostReasonRef = useRef<ExitReason>('expired');
  const lastSessionRef = useRef<Session | null>(null); // session ล่าสุดที่รู้ (ใช้แยก expired / other-tab)

  const refresh = useCallback(() => {
    const u = getCurrentUser();
    lastSessionRef.current = getSession();
    setUser(u);
    if (u) { setSessionLost(null); lostRef.current = false; }
    setLoading(false);
  }, []);

  // ออกจากพื้นที่แอปเสร็จ (อยู่นอก /app แล้ว) → เลิกสถานะ exiting
  useEffect(() => {
    if (exiting && !pathname.startsWith('/app')) setExiting(false);
  }, [exiting, pathname]);

  const doLogout = useCallback(() => {
    dismissAll();
    setLoggingOut(true);
    setExiting(true);
    setTimeout(() => router.push('/'), LOGOUT_NAV_MS);
    setTimeout(() => {
      logoutUser();
      setUser(null);
      setLoggingOut(false);
      busyRef.current = false;
    }, LOGOUT_TOTAL_MS);
  }, [router, dismissAll]);

  const logout = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const failed = flushAll().filter(r => !r.ok);
    if (failed.length) {
      const f = failed[0];
      const go = await confirm({
        title: 'ยังบันทึกงานไม่ได้',
        message: `${f.label}: ${f.error ?? ''}`,
        variant: 'danger',
        cancelText: 'กลับไปแก้',
        confirmText: 'ยืนยันออกโดยไม่บันทึก',
      });
      if (!go) { busyRef.current = false; return; }
    }
    doLogout();
  }, [confirm, doLogout]);

  /** session หาย (หมดอายุ / ออกจากแท็บอื่น) */
  const handleLost = useCallback((reason: ExitReason) => {
    if (busyRef.current || lostRef.current || !userRef.current) return;
    dismissAll();
    const failed = flushAll().filter(r => !r.ok);
    if (failed.length) {
      lostRef.current = true;
      lostReasonRef.current = reason;
      setSessionLost(failed);   // คง user ไว้ในหน่วยความจำ ให้หน้าเดิมอ่าน/คัดลอกได้ (อ่านอย่างเดียว) จนกว่าจะออกจากหน้า
      return;
    }
    busyRef.current = true;
    setExiting(true);
    userRef.current = null;
    setUser(null);
    router.push(`/login?reason=${reason}`);
    busyRef.current = false;
  }, [router, dismissAll]);

  /** U-2: ออกจากสถานะ sessionLost จริง (เปลี่ยนหน้า / กดปุ่มทำงาน / เข้าสู่ระบบใหม่) */
  const endSession = useCallback(() => {
    if (!lostRef.current) return;
    dismissAll();
    setExiting(true);
    userRef.current = null;
    setUser(null);
    setSessionLost(null);
    lostRef.current = false;
    router.push(`/login?reason=${lostReasonRef.current}`);
  }, [router, dismissAll]);

  // init seed + session
  useEffect(() => {
    // TODO(PostgreSQL): แทนที่ด้วย session จาก server (httpOnly cookie)
    initAunqa()
      .catch(e => setInitError(e instanceof Error ? e.message : 'เริ่มต้นข้อมูลไม่สำเร็จ'))
      .finally(refresh);
  }, [refresh]);

  // ข้ามแท็บ: สนใจเฉพาะ null (ออก/หมดอายุ)
  useEffect(() => subscribeSession(s => {
    const prev = lastSessionRef.current;
    if (s === null) {
      const now = Date.now();
      const expired = !!prev && (now >= prev.expiresAt || now - prev.lastActiveAt >= SESSION_IDLE_MS);
      handleLost(expired ? 'expired' : 'other-tab');
      return;
    }
    lastSessionRef.current = s;
    if (userRef.current && s.userId !== userRef.current.id) handleLost('other-tab');
  }), [handleLost]);

  // ตรวจเวลาที่เหลือทุก 30 วินาที (เฉพาะเมื่อมี user)
  useEffect(() => {
    if (!user) return;
    const tick = async () => {
      if (busyRef.current || lostRef.current) return;
      const now = Date.now();
      const cur = getSession();
      if (cur) lastSessionRef.current = cur;
      const kind = sessionExpiryKind(now);
      const left = sessionTimeLeft(now);
      if (left === null) { handleLost('expired'); return; }
      if (left > WARN_MS || !kind) return;
      const key = `${kind}:${Math.round((now + left) / 60_000)}`;
      if (warnedRef.current === key) return;
      warnedRef.current = key;
      const m = Math.max(1, Math.ceil(left / 60_000));
      if (kind === 'idle') {
        const stay = await confirm({
          title: 'ใกล้หมดเวลาการใช้งาน',
          message: `ไม่มีการใช้งานมาระยะหนึ่ง ระบบจะออกจากระบบในอีก ${m} นาที`,
          variant: 'warning',
          confirmText: 'ยืนยันใช้งานต่อ',
          cancelText: 'ออกจากระบบตอนนี้',
          initialFocus: 'confirm',
          dismissible: false,
        });
        // ระหว่างรอ อาจออกจากระบบ/session หายไปแล้ว (dialog ถูก dismissAll) → ไม่ทำอะไรต่อ
        if (!userRef.current || busyRef.current || lostRef.current) return;
        if (stay) {
          if (sessionTimeLeft() === null) handleLost('expired');
          else { touchSession(undefined, { force: true }); warnedRef.current = ''; }
        } else {
          logout();
        }
      } else {
        await notify({
          title: 'ใกล้หมดเวลาการใช้งาน',
          message: `ครบเวลาใช้งานสูงสุด 12 ชั่วโมง ระบบจะออกจากระบบในอีก ${m} นาที — งานที่พิมพ์ค้างจะถูกบันทึกให้ก่อน`,
          variant: 'warning',
          okText: 'รับทราบ',
        });
      }
    };
    const id = setInterval(tick, CHECK_MS);
    return () => clearInterval(id);
  }, [user, confirm, notify, logout, handleLost]);

  return (
    <AuthContext.Provider value={{ user, isLoading, refresh, logout, initError, exiting, sessionLost, endSession }}>
      {children}
      {loggingOut && <AppLoader mode="logout" />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
