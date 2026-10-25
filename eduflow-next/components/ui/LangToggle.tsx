'use client';

/**
 * ปุ่มเปลี่ยนภาษา ไทย/English (ADR-UI-001 C1 + P2/P4) — 1 คลิกสลับภาษาของ "หน้านี้" (ปุ่มเดียว ไม่เปลี่ยน role)
 * หน้าตา segmented ตาม ADR-UI-002 saas-spec §C16: กรอบ border-input · ภาษาที่ใช้อยู่ = พื้น accent ตัว foreground · อีกภาษา = muted
 * ไอคอน languages แทน emoji
 */
import { useLang } from '@/context/LangContext';
import { cn } from '@/lib/ui/cn';
import Icon from './Icon';

const ON = 'rounded-sm bg-accent px-2 text-foreground';
const OFF = 'rounded-sm px-2 text-muted-foreground';

export default function LangToggle({ className }: { className?: string }) {
  const { lang, toggleLang } = useLang();
  const isTH = lang === 'th';

  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-11 min-w-11 shrink-0 items-center gap-1 rounded-md border border-input bg-card px-1.5 text-base font-medium transition-colors duration-fast hover:border-foreground/40',
        className,
      )}
      title={isTH ? 'เปลี่ยนเป็นภาษาอังกฤษ (เฉพาะหน้านี้)' : 'Switch to Thai (this page only)'}
      aria-label={isTH ? 'เปลี่ยนภาษา (ตอนนี้: ไทย)' : 'Change language (now: English)'}
      onClick={toggleLang}
      data-no-i18n=""
    >
      <Icon name="languages" size={18} className="ml-0.5 text-muted-foreground" />
      <span className={isTH ? ON : OFF}>ไทย</span>
      <span className="sr-only" aria-hidden="true">|</span>
      <span className={isTH ? OFF : ON}>EN</span>
    </button>
  );
}
