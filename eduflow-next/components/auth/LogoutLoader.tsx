'use client';

import { useEffect, useState } from 'react';

/**
 * หน้าจอกำลังโหลดตอนออกจากระบบ — มาสคอตหนังสือโบกมือลา (คู่กับ LoginLoader)
 * แสดงสั้น ๆ ~1.3 วิ ระหว่างล้าง session แล้วพากลับหน้าแรก
 */
const MESSAGES = ['กำลังบันทึกงานของคุณ…', 'กำลังออกจากระบบ…', 'แล้วพบกันใหม่!'];

export default function LogoutLoader() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => Math.min(i + 1, MESSAGES.length - 1)), 450);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="login-loader" role="status" aria-live="polite">
      <div className="ll-scene">
        <span className="ll-spark ll-spark-1">👋</span>
        <span className="ll-spark ll-spark-2">📖</span>
        <span className="ll-spark ll-spark-3">💤</span>
        <span className="ll-spark ll-spark-4">✨</span>

        <svg className="ll-book" viewBox="0 0 120 120" width="150" height="150" aria-hidden="true">
          <ellipse className="ll-shadow" cx="60" cy="108" rx="34" ry="6" />
          <g className="ll-bob">
            {/* ปกซ้าย/ขวา */}
            <path d="M60 34 C46 26 30 26 20 30 L20 88 C30 84 46 84 60 92 Z" fill="var(--brown-mid)" stroke="var(--brown-deep)" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M60 34 C74 26 90 26 100 30 L100 88 C90 84 74 84 60 92 Z" fill="var(--brown-light)" stroke="var(--brown-deep)" strokeWidth="2.5" strokeLinejoin="round" />
            {/* หน้าหนังสือ */}
            <path d="M60 40 C50 35 38 35 30 38 L30 84 C38 81 50 81 60 86 Z" fill="var(--warm-white)" />
            <path d="M60 40 C70 35 82 35 90 38 L90 84 C82 81 70 81 60 86 Z" fill="var(--cream)" />
            {/* หน้าตายิ้มหลับตา (ลาก่อน) */}
            <g>
              <path d="M46 51 Q50 48 54 51" fill="none" stroke="var(--brown-ink)" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M66 51 Q70 48 74 51" fill="none" stroke="var(--brown-ink)" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M52 60 Q60 65 68 60" fill="none" stroke="var(--brown-ink)" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="44" cy="58" r="3" fill="#E8A0A0" opacity="0.6" />
              <circle cx="76" cy="58" r="3" fill="#E8A0A0" opacity="0.6" />
            </g>
          </g>
        </svg>
      </div>

      <div className="ll-text">{MESSAGES[msgIdx]}</div>
      <div className="ll-dots"><span /><span /><span /></div>
    </div>
  );
}
