'use client';

/**
 * Layout หน้า login แยกจาก landing nav (ADR-UI-001 pages.md P2 — แทน AuthNav ที่พังที่ 390 / M3)
 * - <1280: top bar = Wordmark (ลิงก์ /) + ตัวปรับขนาดตัวอักษร (login-fontscale) + LangToggle · ฟอร์มคอลัมน์เดียว
 * - ≥1280: แบ่งครึ่ง — แผงแบรนด์พื้นเข้ม (aq-on-dark) ซ้าย + ฟอร์มขวา · ตัวปรับและ LangToggle ย้ายไปมุมล่างแผงแบรนด์
 *   (element เดียวกัน ย้ายด้วย CSS grid → testid ไม่ซ้ำ)
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Brand } from '@/components/ui/BrandMark';
import Icon from '@/components/ui/Icon';
import LangToggle from '@/components/ui/LangToggle';
import { FontScaleSeg } from '@/components/ui/DisplayPrefs';

/** ภาพเส้นนิ่ง: เอกสาร + วงแหวน accent (L12) */
function BrandArt() {
  return (
    <svg className="aq-auth__art" width="220" height="160" viewBox="0 0 220 160" aria-hidden="true" focusable="false" fill="none">
      <rect x="34" y="14" width="104" height="132" rx="10" strokeWidth="2" style={{ stroke: 'var(--c-on-dark-muted)' }} />
      <path d="M54 44h64M54 62h64M54 80h48M54 98h56M54 116h36" strokeWidth="2" strokeLinecap="round" style={{ stroke: 'var(--c-on-dark-muted)' }} />
      <circle cx="160" cy="110" r="34" strokeWidth="6" style={{ stroke: 'var(--c-accent)' }} />
      <path d="m146 110 10 10 18-20" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--c-on-dark)' }} />
    </svg>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="aq-auth">
      <a href="#main" className="aq-skip">ข้ามไปเนื้อหาหลัก</a>
      <div className="aq-auth__top">
        <Link href="/" aria-label="AUN-QA Copilot หน้าแรก"><Brand size={22} /></Link>
      </div>
      <aside className="aq-auth__brand aq-on-dark" aria-label="เกี่ยวกับ AUN-QA Copilot">
        <Link href="/" aria-label="AUN-QA Copilot หน้าแรก"><Brand size={22} /></Link>
        <div>
          <p className="aq-auth__brand-title">ทำ SAR อย่างมีหลักฐาน</p>
          <ul>
            <li><Icon name="check" size={20} />มอบหมาย ติดตาม</li>
            <li><Icon name="check" size={20} />ผูกหลักฐาน ตรวจช่องว่าง</li>
            <li><Icon name="check" size={20} />ส่งออก Word ครบ 53 ข้อ</li>
          </ul>
        </div>
        <BrandArt />
      </aside>
      <div className="aq-auth__tools">
        <FontScaleSeg testId="login-fontscale" />
        <LangToggle />
      </div>
      <main id="main" tabIndex={-1} className="aq-auth__main">{children}</main>
    </div>
  );
}
