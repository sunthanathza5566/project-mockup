'use client';

/**
 * AppLoader — loader เต็มจอชุดเดียวสำหรับ init / login / logout (ADR-UI-001 components.md C22, ลูกเล่น L11 · หน้าตา ADR-UI-002 saas-spec §C15)
 * แทน LoginLoader / LogoutLoader / Loading ของ AppShell (ลบใน U2-F2)
 * - พื้น bg-background · BrandMark 48 + Wordmark 22 · วง SVG 40 (track muted + arc 25% primary หมุน) · ข้อความ 1 บรรทัด + บรรทัดรอง
 * - เวลาแสดงขั้นต่ำ 400ms / login ≤700ms / logout 600ms = ผู้เรียก (AuthContext) คุม
 * - init เกิน 10 วินาที → "ใช้เวลานานกว่าปกติ" + ปุ่ม "ลองใหม่" + ลิงก์ "กลับหน้าแรก"
 * - reduced-motion: ซ่อน arc (motion-reduce:hidden) แสดงวงพื้น + "…"
 */
import { useEffect, useState } from 'react';
import { Button } from './primitives/button';
import BrandMark, { Wordmark } from './BrandMark';

export type AppLoaderMode = 'init' | 'login' | 'logout';

const SLOW_MS = 10_000;

function copy(mode: AppLoaderMode, name?: string): [string, string] {
  switch (mode) {
    case 'login': return [name ? `ยินดีต้อนรับ ${name}` : 'ยินดีต้อนรับ', 'กำลังเปิดพื้นที่ทำงานของคุณ…'];
    case 'logout': return ['กำลังออกจากระบบ…', 'บันทึกงานที่ค้างแล้ว'];
    default: return ['กำลังเตรียมข้อมูล…', 'ครั้งแรกอาจใช้เวลาสักครู่'];
  }
}

export default function AppLoader({ mode, name }: { mode: AppLoaderMode; name?: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (mode !== 'init') return;
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, [mode]);

  const [main, sub] = copy(mode, name);
  const arc = 2 * Math.PI * 17;
  return (
    <div
      className="fixed inset-0 z-loader flex items-center justify-center bg-background p-6 text-center"
      role="status" aria-live="polite" data-testid="app-loader" data-mode={mode}
    >
      <div className="flex max-w-[30rem] flex-col items-center gap-4">
        <span className="flex flex-col items-center gap-3">
          <BrandMark size={48} />
          <Wordmark size={22} />
        </span>
        {!slow && (
          <span className="inline-flex h-10 w-10" aria-hidden="true">
            <svg className="block h-full w-full" width="40" height="40" viewBox="0 0 40 40" focusable="false">
              <circle className="stroke-muted" cx="20" cy="20" r="17" fill="none" strokeWidth="3.5" />
              <circle
                className="origin-center animate-spin stroke-primary [transform-box:fill-box] motion-reduce:hidden"
                cx="20" cy="20" r="17" fill="none" strokeWidth="3.5"
                strokeLinecap="round" strokeDasharray={`${arc / 4} ${arc}`}
              />
            </svg>
          </span>
        )}
        {slow ? (
          <>
            <p className="text-lg font-semibold text-foreground">ใช้เวลานานกว่าปกติ</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => location.reload()}>ลองใหม่</Button>
              <Button asChild variant="outline"><a href="/">กลับหน้าแรก</a></Button>
            </div>
          </>
        ) : (
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">{main}<span className="hidden motion-reduce:inline" aria-hidden="true">…</span></p>
            <p className="aq-meta">{sub}</p>
          </div>
        )}
      </div>
    </div>
  );
}
