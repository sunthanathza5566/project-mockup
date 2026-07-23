'use client';

import { useEffect, useState } from 'react';

/**
 * หน้าจอกำลังโหลดตอนเข้าสู่ระบบ — มาสคอต "หนังสือน้อย" เด้ง ๆ น่ารัก
 * แสดงระหว่างตรวจสอบบัญชี + ก่อน redirect เพื่อให้ล็อกอินมีลูกเล่น ไม่นิ่งจนน่าเบื่อ
 *
 * ข้อความกำลังโหลดสลับไปเรื่อย ๆ · ทุกอย่างเป็น CSS animation ไม่มีไฟล์ภาพภายนอก
 */
const MESSAGES = [
  'กำลังเปิดสมุดของคุณ…',
  'กำลังจัดโต๊ะเรียน…',
  'เกือบพร้อมแล้ว…',
  'ยินดีต้อนรับกลับมา!',
];

export default function LoginLoader({ name }: { name?: string }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => Math.min(i + 1, MESSAGES.length - 1)), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="login-loader" role="status" aria-live="polite">
      <div className="ll-scene">
        {/* ดาว/หัวใจลอยรอบตัว */}
        <span className="ll-spark ll-spark-1">✨</span>
        <span className="ll-spark ll-spark-2">📖</span>
        <span className="ll-spark ll-spark-3">⭐</span>
        <span className="ll-spark ll-spark-4">🎓</span>

        {/* มาสคอตหนังสือ */}
        <svg className="ll-book" viewBox="0 0 120 120" width="150" height="150" aria-hidden="true">
          {/* เงา */}
          <ellipse className="ll-shadow" cx="60" cy="108" rx="34" ry="6" />
          <g className="ll-bob">
            {/* ปกซ้าย/ขวา */}
            <path d="M60 34 C46 26 30 26 20 30 L20 88 C30 84 46 84 60 92 Z" fill="var(--brown-mid)" stroke="var(--brown-deep)" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M60 34 C74 26 90 26 100 30 L100 88 C90 84 74 84 60 92 Z" fill="var(--brown-light)" stroke="var(--brown-deep)" strokeWidth="2.5" strokeLinejoin="round" />
            {/* หน้าหนังสือ */}
            <path d="M60 40 C50 35 38 35 30 38 L30 84 C38 81 50 81 60 86 Z" fill="var(--warm-white)" />
            <path d="M60 40 C70 35 82 35 90 38 L90 84 C82 81 70 81 60 86 Z" fill="var(--cream)" />
            {/* เส้นตัวอักษรบนหน้า */}
            <g stroke="var(--brown-light)" strokeWidth="2" strokeLinecap="round" opacity="0.7">
              <line x1="36" y1="46" x2="54" y2="49" /><line x1="36" y1="53" x2="54" y2="56" /><line x1="36" y1="60" x2="52" y2="63" />
              <line x1="66" y1="49" x2="84" y2="46" /><line x1="66" y1="56" x2="84" y2="53" /><line x1="68" y1="63" x2="84" y2="60" />
            </g>
            {/* หน้าที่พลิก */}
            <path className="ll-page" d="M60 40 C70 35 82 35 90 38 L90 84 C82 81 70 81 60 86 Z" fill="#fff" opacity="0.95" />
            {/* หน้ายิ้ม */}
            <g className="ll-face">
              <circle cx="50" cy="52" r="2.6" fill="var(--brown-ink)" className="ll-eye" />
              <circle cx="70" cy="52" r="2.6" fill="var(--brown-ink)" className="ll-eye" />
              <path d="M52 60 Q60 66 68 60" fill="none" stroke="var(--brown-ink)" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="44" cy="58" r="3" fill="#E8A0A0" opacity="0.6" />
              <circle cx="76" cy="58" r="3" fill="#E8A0A0" opacity="0.6" />
            </g>
          </g>
        </svg>
      </div>

      <div className="ll-text">{name && msgIdx === MESSAGES.length - 1 ? `ยินดีต้อนรับ ${name}!` : MESSAGES[msgIdx]}</div>
      <div className="ll-dots"><span /><span /><span /></div>
    </div>
  );
}
