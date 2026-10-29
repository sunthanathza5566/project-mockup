'use client';

/**
 * ระบบเปลี่ยนภาษา ไทย/English — จำค่าเดียวทั้งระบบ (R2-F11 · playtest U3 · orchestrator ตัดสิน 2026-10-27)
 *
 * กติกา:
 *   - 1 คลิกที่ปุ่มภาษา (segmented ไทย│English — ADR-UI-003 D4) = เปลี่ยนภาษาทั้งแอปทันที (ไม่มี dropdown ไม่ต้อง reload)
 *   - เลือกครั้งเดียวใช้ทุกหน้า (login → หน้าหลัก → หน้าเชิญ ฯลฯ) และจำข้ามการเปิดใหม่ใน localStorage key `aunqa_lang`
 *     (ค่าเดียว 'th' | 'en' — ไม่ใช่ข้อมูลส่วนบุคคล) · แท็บอื่นของเบราว์เซอร์เดียวกันตามผ่าน `storage` event
 *   - ย้ายจากแบบเดิม (จำรายหน้า key `eduflow_lang_pages` = { pathname: lang }) ครั้งแรกที่โหลด:
 *     ใช้ค่าของหน้าปัจจุบันถ้ามี ไม่งั้นใช้รายการล่าสุดที่บันทึกในแผนที่เดิม แล้วลบ key เก่า
 *
 * TODO(PostgreSQL/next-intl): ถ้าต้องการจำภาษาข้ามอุปกรณ์ ให้ย้ายค่านี้ไปเก็บใน user_preferences
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { translate, type Lang } from '@/lib/i18n/dict';
import { syncPageLanguage } from '@/lib/i18n/dom-translate';

export const LANG_STORE_KEY = 'aunqa_lang';
/** key เดิม (จำรายหน้า) — อ่านครั้งเดียวเพื่อย้ายค่า แล้วลบ */
const LEGACY_PAGES_KEY = 'eduflow_lang_pages';

interface LangContextValue {
  lang: Lang;
  /** สลับภาษาทั้งแอป (1 คลิก) */
  toggleLang: () => void;
  /** ตั้งภาษาทั้งแอปเป็นค่าที่ระบุ (ADR-UI-003 D4 — ปุ่ม segmented ไทย│English) · ค่าเดิมอยู่แล้ว = ไม่ทำอะไร */
  setLang: (lang: Lang) => void;
  /** แปลข้อความ — ใส่ข้อความไทยเป็น key */
  t: (text: string) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: 'th', toggleLang: () => {}, setLang: () => {}, t: (s) => s,
});

const isLang = (v: unknown): v is Lang => v === 'th' || v === 'en';

/** อ่านภาษาที่จำไว้ (+ ย้ายจาก key เดิม) — client เท่านั้น · storage ปิด/เสีย = ไทย */
function loadLang(pathname: string): Lang {
  if (typeof window === 'undefined') return 'th';
  try {
    const cur = localStorage.getItem(LANG_STORE_KEY);
    if (isLang(cur)) return cur;
    const raw = localStorage.getItem(LEGACY_PAGES_KEY);
    if (!raw) return 'th';
    let legacy: Lang = 'th';
    try {
      const map = JSON.parse(raw) as Record<string, unknown>;
      if (map && typeof map === 'object') {
        const vals = Object.values(map).filter(isLang);
        legacy = isLang(map[pathname]) ? map[pathname] as Lang : vals[vals.length - 1] ?? 'th';
      }
    } catch { /* ค่าเก่าเสีย — ใช้ไทย */ }
    localStorage.setItem(LANG_STORE_KEY, legacy);
    localStorage.removeItem(LEGACY_PAGES_KEY);
    return legacy;
  } catch { return 'th'; }
}

function saveLang(value: Lang) {
  try { localStorage.setItem(LANG_STORE_KEY, value); } catch { /* storage ปิด — ใช้ได้เฉพาะรอบนี้ */ }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const [lang, setLangState] = useState<Lang>('th');

  // อ่านค่าที่จำไว้หลัง mount — กัน hydration mismatch (server render เป็นไทยเสมอ)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLangState(loadLang(pathname)); }, []);

  // แท็บอื่นเปลี่ยนภาษา → ตาม
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === LANG_STORE_KEY && isLang(e.newValue)) setLangState(e.newValue); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setLang = useCallback((value: Lang) => {
    setLangState(prev => {
      if (prev === value) return prev;
      saveLang(value);
      return value;
    });
  }, []);

  const toggleLang = useCallback(() => {
    setLangState(prev => {
      const next: Lang = prev === 'th' ? 'en' : 'th';
      saveLang(next);
      return next;
    });
  }, []);

  // แปลข้อความส่วนที่ยังไม่ได้ครอบด้วย t() ให้ครบทั้งหน้า (และย้อนกลับได้เมื่อสลับเป็นไทย) — ทำใหม่ทุกครั้งที่เปลี่ยนหน้า
  useEffect(() => syncPageLanguage(lang), [lang, pathname]);

  // N5 R2-F13 (WCAG 3.1.1): <html lang> ตามภาษาที่เลือก — layout render "th" เสมอ จึงตั้งฝั่ง client
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const t = useCallback((text: string) => translate(text, lang), [lang]);

  return (
    <LangContext.Provider value={{ lang, toggleLang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
