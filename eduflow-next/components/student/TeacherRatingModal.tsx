'use client';

import { useState } from 'react';
import type { SchedulePeriod } from '@/lib/types';
import { submitTeacherRating, hasRatedToday, markRatedToday } from '@/lib/api/ratings.store';

interface Props {
  todaySchedule: SchedulePeriod[];
  onClose: () => void;
  showToast: (m: string) => void;
}

/**
 * ให้คะแนนการสอนท้ายคาบ (ร่าง / DRAFT)
 * - เลือกคาบจากตารางเรียนวันนี้ → ให้ดาว 1–5 + คอมเมนต์
 * - ส่งแบบ "นิรนาม" — ไม่แนบชื่อ/รหัสนักเรียน ครูไม่ทราบว่าใครประเมิน
 */
export default function TeacherRatingModal({ todaySchedule, onClose, showToast }: Props) {
  const [selPeriod, setSelPeriod] = useState<SchedulePeriod | null>(null);
  const [stars,     setStars]     = useState(0);
  const [comment,   setComment]   = useState('');

  function handleSubmit() {
    if (!selPeriod) { showToast('⚠️ เลือกคาบเรียนก่อน'); return; }
    if (stars === 0) { showToast('⚠️ ให้คะแนนดาวก่อน (1–5)'); return; }
    submitTeacherRating(selPeriod.teacher, selPeriod.subject, stars, comment.trim());
    markRatedToday(selPeriod.teacher, selPeriod.subject);
    showToast('✅ ส่งแบบประเมินแบบนิรนามแล้ว — ขอบคุณครับ');
    onClose();
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(42,26,14,0.45)', zIndex: 999 }}
      />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 18,
          boxShadow: '0 24px 64px rgba(42,26,14,0.25)', zIndex: 1000,
          width: 'min(92vw, 460px)', maxHeight: '85vh', overflowY: 'auto', padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <h3 style={{ margin: 0, color: 'var(--brown-dark)', fontSize: '1.05rem' }}>⭐ ให้คะแนนการสอนท้ายคาบ</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          🔒 แบบประเมินนี้เป็น<strong>นิรนาม</strong> — ไม่บันทึกชื่อหรือรหัสของคุณ คุณครูจะเห็นเฉพาะคะแนนเฉลี่ยรวมเท่านั้น
        </p>

        {/* เลือกคาบวันนี้ */}
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: '0.5rem' }}>เลือกคาบเรียนวันนี้</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.1rem' }}>
          {todaySchedule.length === 0
            ? <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>วันนี้ไม่มีคาบเรียน</div>
            : todaySchedule.map(p => {
                const rated = hasRatedToday(p.teacher, p.subject);
                const active = selPeriod?.period === p.period;
                return (
                  <button
                    key={p.period}
                    disabled={rated}
                    onClick={() => setSelPeriod(p)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.6rem 0.8rem', borderRadius: 10, cursor: rated ? 'not-allowed' : 'pointer',
                      border: `1px solid ${active ? 'var(--brown-deep)' : 'var(--border)'}`,
                      background: active ? 'rgba(107,79,47,0.1)' : 'var(--cream)',
                      opacity: rated ? 0.5 : 1, fontSize: '0.82rem', color: 'var(--text-body)',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <span>คาบ {p.period} · {p.subject}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      {rated ? '✓ ประเมินแล้ว' : p.teacher}
                    </span>
                  </button>
                );
              })}
        </div>

        {/* ดาว */}
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: '0.4rem' }}>ความพึงพอใจ</div>
        <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.1rem' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setStars(n)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '1.8rem', filter: n <= stars ? 'none' : 'grayscale(1) opacity(0.35)',
                transition: 'filter 0.15s',
              }}
              aria-label={`${n} ดาว`}
            >
              ⭐
            </button>
          ))}
        </div>

        {/* คอมเมนต์ */}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="ข้อเสนอแนะถึงคุณครู (ไม่บังคับ · นิรนาม)"
          rows={3}
          style={{
            width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 8,
            fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', resize: 'vertical',
            outline: 'none', background: 'var(--cream)', marginBottom: '1.1rem',
          }}
        />

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="stu-hw-submit-btn" style={{ flex: 1 }} onClick={handleSubmit}>📤 ส่งแบบประเมิน (นิรนาม)</button>
          <button className="stu-hw-submit-btn" style={{ background: 'var(--text-muted)' }} onClick={onClose}>ยกเลิก</button>
        </div>
      </div>
    </>
  );
}
