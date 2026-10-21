'use client';

/**
 * ปุ่มเปลี่ยนภาษา ไทย/English (ADR-UI-001 C1 + P2/P4) — 1 คลิกสลับภาษาของ "หน้านี้"
 * ใช้ปุ่ม secondary (บนพื้นเข้มได้สไตล์ .aq-on-dark อัตโนมัติ) · ไอคอน languages แทน emoji
 */
import { useLang } from '@/context/LangContext';
import Icon from './Icon';

export default function LangToggle({ className }: { className?: string }) {
  const { lang, toggleLang } = useLang();
  const isTH = lang === 'th';

  return (
    <button
      type="button"
      className={`aq-btn aq-lang${className ? ` ${className}` : ''}`}
      title={isTH ? 'เปลี่ยนเป็นภาษาอังกฤษ (เฉพาะหน้านี้)' : 'Switch to Thai (this page only)'}
      aria-label={isTH ? 'เปลี่ยนภาษา (ตอนนี้: ไทย)' : 'Change language (now: English)'}
      onClick={toggleLang}
      data-no-i18n=""
    >
      <Icon name="languages" size={20} />
      <span className={isTH ? 'aq-lang__on' : 'aq-lang__off'}>ไทย</span>
      <span className="aq-lang__sep" aria-hidden="true">|</span>
      <span className={isTH ? 'aq-lang__off' : 'aq-lang__on'}>EN</span>
    </button>
  );
}
