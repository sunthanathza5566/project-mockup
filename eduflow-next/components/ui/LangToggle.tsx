'use client';

import { useLang } from '@/context/LangContext';

/**
 * ปุ่มเปลี่ยนภาษา ไทย/English — อยู่บน navbar ทุกหน้า
 * กด 1 ครั้ง = สลับภาษาของ "หน้านี้" ทันที (หน้าอื่นไม่เปลี่ยนตาม)
 */
export default function LangToggle() {
  const { lang, toggleLang } = useLang();
  const isTH = lang === 'th';

  return (
    <button
      type="button"
      className="lang-toggle"
      title={isTH ? 'เปลี่ยนเป็นภาษาอังกฤษ (เฉพาะหน้านี้)' : 'Switch to Thai (this page only)'}
      aria-label="Change language"
      onClick={toggleLang}
    >
      🌐 <span className={isTH ? '' : 'lang-toggle-alt'}>ไทย</span>
      <span className="lang-toggle-sep">|</span>
      <span className={isTH ? 'lang-toggle-alt' : ''}>EN</span>
    </button>
  );
}
