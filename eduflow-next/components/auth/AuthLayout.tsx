'use client';

/**
 * Layout หน้า login แยกจาก landing nav (ADR-UI-001 pages.md P2 · TASK-0002 saas-spec §P2)
 * - <1024: คอลัมน์เดียว — แถวบน = แบรนด์ (ลิงก์ /) + ข้อความสั้นใต้แบรนด์ · tools ชิดขวา (ขึ้นบรรทัดใหม่ได้) · ฟอร์มตามมา
 * - ≥1024: grid 2 คอลัมน์ — ซ้าย = แบรนด์/tools/ฟอร์ม · ขวา = แผงแบรนด์ bg-muted border-l (ไม่มีพื้นสีเข้มแล้ว)
 * - tools: ตัวปรับขนาดตัวอักษร (login-fontscale) + LangToggle + ปุ่มสลับธีม (theme-toggle) — element ชุดเดียวทุกขนาดจอ
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Brand } from '@/components/ui/BrandMark';
import Icon from '@/components/ui/Icon';
import LangToggle from '@/components/ui/LangToggle';
import { FontScaleSeg } from '@/components/ui/DisplayPrefs';
import { ThemeToggleButton } from '@/components/ui/ThemeToggle';

const BRAND_TITLE = 'ทำ SAR อย่างมีหลักฐาน';

/** ภาพเส้นนิ่ง: เอกสาร + วงแหวน (L12) — สีจาก currentColor/token */
function BrandArt() {
  return (
    <svg
      className="h-auto max-w-full text-muted-foreground" width="220" height="160" viewBox="0 0 220 160"
      aria-hidden="true" focusable="false" fill="none" stroke="currentColor"
    >
      <rect x="34" y="14" width="104" height="132" rx="10" strokeWidth="2" />
      <path d="M54 44h64M54 62h64M54 80h48M54 98h56M54 116h36" strokeWidth="2" strokeLinecap="round" />
      <circle cx="160" cy="110" r="34" strokeWidth="6" className="stroke-primary" />
      <path d="m146 110 10 10 18-20" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="stroke-foreground" />
    </svg>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <a href="#main" className="aq-skip">ข้ามไปเนื้อหาหลัก</a>
      <div className="flex min-h-screen min-w-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <Link href="/" aria-label="AUN-QA Copilot หน้าแรก" className="inline-flex min-h-11 items-center no-underline">
              <Brand size={22} />
            </Link>
            <p className="aq-meta lg:hidden">{BRAND_TITLE}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FontScaleSeg testId="login-fontscale" />
            <LangToggle />
            <ThemeToggleButton className="border-transparent bg-transparent" />
          </div>
        </div>
        <main id="main" tabIndex={-1} className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-12 pt-6 md:px-6">
          {children}
        </main>
      </div>
      <aside
        className="hidden flex-col justify-center gap-10 border-l bg-muted px-12 py-16 lg:flex"
        aria-label="เกี่ยวกับ AUN-QA Copilot"
      >
        <div className="max-w-md">
          <p className="text-2xl font-semibold text-foreground">{BRAND_TITLE}</p>
          <ul className="mt-6 grid list-none gap-3 p-0">
            <li className="flex items-center gap-3 text-lg text-foreground"><Icon name="check" size={20} className="text-primary" />มอบหมาย ติดตาม</li>
            <li className="flex items-center gap-3 text-lg text-foreground"><Icon name="check" size={20} className="text-primary" />ผูกหลักฐาน ตรวจช่องว่าง</li>
            <li className="flex items-center gap-3 text-lg text-foreground"><Icon name="check" size={20} className="text-primary" />ส่งออก Word ครบ 53 ข้อ</li>
          </ul>
        </div>
        <BrandArt />
      </aside>
    </div>
  );
}
