'use client';

import { useToast } from '@/context/ToastContext';

/**
 * ปุ่มเปลี่ยนภาษา ไทย/English — อยู่บน navbar ทุกหน้า
 * ตอนนี้เป็น placeholder: เตรียม UI ไว้ก่อน ยังไม่เปิดใช้งานจริง
 * TODO(i18n): เชื่อมกับระบบแปลภาษา (เช่น next-intl) แล้วเปลี่ยนทั้งหน้า UI ตามภาษาที่เลือก
 */
export default function LangToggle() {
  const { showToast } = useToast();
  return (
    <button
      type="button"
      className="lang-toggle"
      title="เปลี่ยนภาษา / Change language"
      onClick={() => showToast('🌐 ระบบเปลี่ยนภาษา ไทย/English — จะเปิดใช้ในเวอร์ชันถัดไป')}
    >
      🌐 ไทย <span className="lang-toggle-alt">| EN</span>
    </button>
  );
}
