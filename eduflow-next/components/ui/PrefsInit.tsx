'use client';

/**
 * ใส่ค่าการแสดงผลของผู้ใช้ (ขนาดตัวอักษร / เอฟเฟกต์ฉลอง) ลง <html> ตอน mount
 * (ADR-UI-001 tokens.md T2.4 — ยอมกระพริบครั้งเดียวก่อนอ่านค่า) · ไม่ render อะไร
 */
import { useEffect } from 'react';
import { applyUiPrefs } from '@/lib/ui/prefs';

export default function PrefsInit() {
  useEffect(() => { applyUiPrefs(); }, []);
  return null;
}
