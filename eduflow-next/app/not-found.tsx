'use client';

/** 404 (ADR-UI-001 pages.md P20) — "กลับหน้าหลัก" ไป /app ถ้าล็อกอิน มิฉะนั้น / */
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Icon from '@/components/ui/Icon';
import { Brand } from '@/components/ui/BrandMark';

export default function NotFound() {
  const { user } = useAuth();
  return (
    <main id="main" className="aq-notfound">
      <Link href="/" aria-label="AUN-QA Copilot หน้าแรก" className="aq-brand-link"><Brand size={22} /></Link>
      <span className="aq-notfound__art" aria-hidden="true"><Icon name="search" size={40} /></span>
      <h1 className="aq-h1">ไม่พบหน้าที่ต้องการ</h1>
      <p className="aq-muted">ลิงก์อาจพิมพ์ผิดหรือหน้านี้ถูกย้ายแล้ว</p>
      <div className="aq-notfound__actions">
        <Link href={user ? '/app' : '/'} className="aq-btn aq-btn-primary">กลับหน้าหลัก</Link>
        <Link href="/" className="aq-btn aq-btn-ghost">ไปหน้าแรก</Link>
      </div>
    </main>
  );
}
