/**
 * การตั้งค่าการแสดงผลของผู้ใช้ (ADR-UI-001 tokens.md T2.4, ข้อ 4 L7, pages.md P2)
 * เก็บที่ localStorage `aunqa_ui_prefs` — ไม่มีข้อมูลส่วนบุคคล/สิทธิ์
 *   fontScale: 1 | 1.125 | 1.25  → `--user-scale` บน <html> (100% / 112.5% / 125%)
 *   effects:   false → `html[data-effects="off"]` (ซ่อนประกายฉลอง L7)
 *   demoOpen:  สถานะเปิด/ปิด "บัญชีทดสอบ" บนหน้า login
 */
import { useCallback, useEffect, useState } from 'react';

export type FontScale = 1 | 1.125 | 1.25;
export const FONT_SCALES: { value: FontScale; label: string; aria: string }[] = [
  { value: 1, label: 'ก', aria: 'ตัวอักษรขนาดปกติ' },
  { value: 1.125, label: 'ก+', aria: 'ตัวอักษรใหญ่' },
  { value: 1.25, label: 'ก++', aria: 'ตัวอักษรใหญ่มาก' },
];

export interface UiPrefs {
  fontScale: FontScale;
  effects: boolean;
  demoOpen: boolean;
}

export const UI_PREFS_KEY = 'aunqa_ui_prefs';
export const UI_PREFS_EVENT = 'aunqa:ui-prefs-changed';
const DEFAULTS: UiPrefs = { fontScale: 1, effects: true, demoOpen: false };

function normScale(v: unknown): FontScale {
  return v === 1.125 || v === 1.25 ? v : 1;
}

export function getUiPrefs(): UiPrefs {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = JSON.parse(localStorage.getItem(UI_PREFS_KEY) || '{}') as Partial<UiPrefs>;
    return {
      fontScale: normScale(raw.fontScale),
      effects: raw.effects !== false,
      demoOpen: raw.demoOpen === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** ใส่ค่าลง <html> — เรียกตอน mount และทุกครั้งที่ค่าเปลี่ยน */
export function applyUiPrefs(p: UiPrefs = getUiPrefs()): void {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.style.setProperty('--user-scale', `${p.fontScale * 100}%`);
  if (p.effects) el.removeAttribute('data-effects');
  else el.setAttribute('data-effects', 'off');
}

export function setUiPrefs(patch: Partial<UiPrefs>): UiPrefs {
  const next: UiPrefs = { ...getUiPrefs(), ...patch };
  next.fontScale = normScale(next.fontScale);
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(UI_PREFS_KEY, JSON.stringify(next)); } catch { /* storage เต็ม/ปิด — ใช้ค่าในหน่วยความจำ */ }
    applyUiPrefs(next);
    window.dispatchEvent(new CustomEvent(UI_PREFS_EVENT));
  }
  return next;
}

/** hook อ่าน/เขียน prefs — ซิงก์ระหว่างคอมโพเนนต์ (อีเวนต์) และระหว่างแท็บ (storage) */
export function useUiPrefs(): [UiPrefs, (patch: Partial<UiPrefs>) => void] {
  const [prefs, setPrefs] = useState<UiPrefs>(DEFAULTS);
  useEffect(() => {
    const sync = () => setPrefs(getUiPrefs());
    sync();
    const onStorage = (e: StorageEvent) => { if (e.key === UI_PREFS_KEY) { sync(); applyUiPrefs(); } };
    window.addEventListener(UI_PREFS_EVENT, sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(UI_PREFS_EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  const update = useCallback((patch: Partial<UiPrefs>) => setPrefs(setUiPrefs(patch)), []);
  return [prefs, update];
}
