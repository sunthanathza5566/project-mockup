'use client';

/**
 * ThemeProvider — ห่อ next-themes ด้วยค่าที่ล็อกตาม ADR-UI-002 saas-tokens §T12 + ADR-UI-003 D2
 * class "dark" บน <html> · ค่าเริ่ม = สว่าง (ADR-UI-003 D2; ยังเลือก "ตามเครื่อง" ได้ผ่าน enableSystem) · เก็บที่ localStorage `aunqa_theme` (light|dark|system — ไม่มีข้อมูลส่วนบุคคล)
 * next-themes ฉีดสคริปต์ก่อน paint → ไม่กระพริบ · ตั้ง style color-scheme ให้ฟอร์ม native เอง
 */
import type { ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export const THEME_STORAGE_KEY = 'aunqa_theme';

export default function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      storageKey={THEME_STORAGE_KEY}
    >
      {children}
    </NextThemesProvider>
  );
}
