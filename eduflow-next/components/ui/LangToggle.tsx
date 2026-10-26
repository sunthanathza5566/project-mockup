'use client';

/**
 * LangSwitch — ปุ่มภาษาแบบ segmented 2 ปุ่ม `ไทย │ English` (ADR-UI-003 D4 / friendly-spec §F2.1)
 * - ชื่อไฟล์/ default export เดิม (`LangToggle`) — ผู้เรียกเดิม (topbar, login, landing) ได้หน้าตาใหม่อัตโนมัติ
 * - ภาษาที่เลือก = พื้น primary-muted + ตัวหนา + aria-pressed=true · กดปุ่มที่เลือกอยู่ = ไม่ทำอะไร
 * - ป้ายเป็น autonym (ไม่ใช้ธง): `ไทย` lang="th" · `English` lang="en" (≥768) / `EN` + aria-label="English" (<768) — WCAG 3.1.2
 * - จำภาษาค่าเดียวทั้งระบบ (LangContext · R2-F11) · ทั้งกลุ่ม data-no-i18n (ป้ายภาษาไม่ถูกแปล)
 * testid: กลุ่ม `lang-switch`, ปุ่ม `lang-th`, `lang-en`
 */
import { useLang } from '@/context/LangContext';
import type { Lang } from '@/lib/i18n/dict';
import { cn } from '@/lib/ui/cn';
import Icon from './Icon';
import { SEGMENT_WRAP, SEGMENT_ITEM } from './ThemeToggle';

export default function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  const pick = (value: Lang) => { if (value !== lang) setLang(value); };

  return (
    <div
      role="group"
      aria-label="ภาษา / Language"
      title={lang === 'th' ? 'เปลี่ยนภาษาทุกหน้า' : 'Changes the language on every page'}
      className={cn(SEGMENT_WRAP, 'shrink-0', className)}
      data-no-i18n=""
      data-testid="lang-switch"
    >
      <Icon name="globe" size={18} className="mx-1.5 hidden text-muted-foreground md:inline-block" />
      <button
        type="button"
        lang="th"
        aria-pressed={lang === 'th'}
        className={SEGMENT_ITEM}
        onClick={() => pick('th')}
        data-testid="lang-th"
      >
        ไทย
      </button>
      <button
        type="button"
        lang="en"
        aria-pressed={lang === 'en'}
        aria-label="English"
        className={SEGMENT_ITEM}
        onClick={() => pick('en')}
        data-testid="lang-en"
      >
        <span className="hidden md:inline">English</span>
        <span className="md:hidden" aria-hidden="true">EN</span>
      </button>
    </div>
  );
}
