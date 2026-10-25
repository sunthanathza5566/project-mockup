'use client';

/**
 * 404 view (client — ใช้ useAuth) · ADR-UI-001 pages.md P20 — "กลับหน้าหลัก" ไป /app ถ้าล็อกอิน มิฉะนั้น /
 * หน้าตา ADR-UI-002 saas-spec P20: กลางจอ · ตัวเลข 404 ใหญ่สีเทา · h1 text-2xl · ปุ่มหลัก + ปุ่ม outline
 */
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/primitives/button';
import { Brand } from '@/components/ui/BrandMark';

export default function NotFoundView() {
  const { user } = useAuth();
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-center">
      <Link href="/" aria-label="AUN-QA Copilot หน้าแรก" className="mb-10 rounded-md no-underline"><Brand size={22} /></Link>
      <p className="text-5xl font-semibold tabular-nums text-muted-foreground" aria-hidden="true">404</p>
      <h1 className="mt-3 text-2xl font-semibold text-foreground">ไม่พบหน้าที่ต้องการ</h1>
      <p className="mt-2 max-w-md text-base text-muted-foreground">ลิงก์อาจพิมพ์ผิดหรือหน้านี้ถูกย้ายแล้ว</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild className="visited:text-primary-foreground"><Link href={user ? '/app' : '/'}>กลับหน้าหลัก</Link></Button>
        <Button asChild variant="outline" className="visited:text-foreground"><Link href="/">ไปหน้าแรก</Link></Button>
      </div>
    </main>
  );
}
