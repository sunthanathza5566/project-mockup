'use client';

/**
 * ระบบเปลี่ยนภาษา ไทย/English — เปลี่ยน "เฉพาะหน้าที่เลือก" เท่านั้น
 *
 * กติกา:
 *   - 1 คลิกที่ปุ่ม 🌐 = สลับภาษาของหน้านั้นทันที (ไม่มี dropdown ไม่ต้อง reload)
 *   - ภาษาถูกจำแยกราย "หน้า" (ใช้ pathname เป็น key) เก็บใน localStorage
 *     เช่น เปลี่ยนหน้า /teacher เป็น EN แล้ว /student ยังเป็นไทยอยู่
 *
 * TODO(PostgreSQL/next-intl): ถ้าต้องการจำภาษาข้ามอุปกรณ์ ให้ย้าย map นี้ไปเก็บใน user_preferences
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { translate, type Lang } from '@/lib/i18n/dict';
import { syncPageLanguage } from '@/lib/i18n/dom-translate';

const STORE_KEY = 'eduflow_lang_pages';

interface LangContextValue {
  lang: Lang;
  /** สลับภาษาของหน้าปัจจุบัน (1 คลิก) */
  toggleLang: () => void;
  /** แปลข้อความ — ใส่ข้อความไทยเป็น key */
  t: (text: string) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: 'th', toggleLang: () => {}, t: (s) => s,
});

function loadMap(): Record<string, Lang> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const [map, setMap] = useState<Record<string, Lang>>({});

  // อ่านค่าที่จำไว้หลัง mount — กัน hydration mismatch (server render เป็นไทยเสมอ)
  useEffect(() => { setMap(loadMap()); }, []);

  const lang: Lang = map[pathname] || 'th';

  const toggleLang = useCallback(() => {
    setMap(prev => {
      const next = { ...prev, [pathname]: (prev[pathname] || 'th') === 'th' ? 'en' as Lang : 'th' as Lang };
      if (typeof window !== 'undefined') localStorage.setItem(STORE_KEY, JSON.stringify(next));
      return next;
    });
  }, [pathname]);

  // แปลข้อความส่วนที่ยังไม่ได้ครอบด้วย t() ให้ครบทั้งหน้า (และย้อนกลับได้เมื่อสลับเป็นไทย)
  useEffect(() => syncPageLanguage(lang), [lang, pathname]);

  const t = useCallback((text: string) => translate(text, lang), [lang]);

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
