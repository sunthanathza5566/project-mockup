'use client';

/**
 * AppLoader — loader เต็มจอชุดเดียวสำหรับ init / login / logout (ADR-UI-001 components.md C22, ลูกเล่น L11)
 * แทน LoginLoader / LogoutLoader / Loading ของ AppShell (ลบใน U2-F2)
 * - BrandMark 56 + Wordmark 22 · วงแหวน 48 (arc 25% หมุน 1.2s) · ข้อความ 1 บรรทัด + บรรทัดรอง
 * - เวลาแสดงขั้นต่ำ 400ms / login ≤700ms / logout 600ms = ผู้เรียก (AuthContext) คุม
 * - init เกิน 10 วินาที → "ใช้เวลานานกว่าปกติ" + ปุ่ม "ลองใหม่" + ลิงก์ "กลับหน้าแรก"
 * - reduced-motion: ซ่อน arc แสดงวงพื้น + "…" (CSS)
 */
import { useEffect, useState } from 'react';
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
  return (
    <div className="aq-loader" role="status" aria-live="polite" data-testid="app-loader" data-mode={mode}>
      <div className="aq-loader__box">
        <span className="aq-loader__brand">
          <BrandMark size={56} />
          <Wordmark size={22} />
        </span>
        {!slow && (
          <span className="aq-loader-ring" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 48 48" focusable="false">
              <circle className="aq-loader-ring__track" cx="24" cy="24" r="20" fill="none" strokeWidth="4" />
              <circle
                className="aq-loader-ring__arc" cx="24" cy="24" r="20" fill="none" strokeWidth="4"
                strokeLinecap="round" strokeDasharray={`${(2 * Math.PI * 20) / 4} ${2 * Math.PI * 20}`}
              />
            </svg>
          </span>
        )}
        {slow ? (
          <>
            <p className="aq-loader__main">ใช้เวลานานกว่าปกติ</p>
            <div className="aq-loader__actions">
              <button type="button" className="aq-btn aq-btn-primary" onClick={() => location.reload()}>ลองใหม่</button>
              <a className="aq-btn aq-btn-ghost" href="/">กลับหน้าแรก</a>
            </div>
          </>
        ) : (
          <>
            <p className="aq-loader__main">{main}<span className="aq-loader__rm-dots" aria-hidden="true">…</span></p>
            <p className="aq-loader__sub aq-meta">{sub}</p>
          </>
        )}
      </div>
    </div>
  );
}
