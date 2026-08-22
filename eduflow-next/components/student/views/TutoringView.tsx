'use client';

/**
 * จองเรียนพิเศษกับคุณครู — ฝั่งนักเรียน
 *
 * ขั้นตอน: เลือกวิชา (เฉพาะวิชาที่เรียนอยู่ในปีการศึกษานี้) → เลือกครู → เลือกรอบเวลา → ยืนยัน
 * เมื่อจองสำเร็จจะได้ "เลขที่การจอง" เป็นหลักฐาน และครูจะได้รับแจ้งเตือนทันที
 */

import { useCallback, useEffect, useState } from 'react';
import type { StudentProfile } from '@/lib/types';
import {
  getStudentSubjectsForTutoring, getOffersForSubject, bookTutoring,
  getStudentBookings, getSlotBookedCount, updateBookingStatus,
  TUTOR_MODE_LABEL, BOOKING_STATUS_LABEL, slotLabel,
  type TutorOffer, type TutorSlot, type TutorBooking,
} from '@/lib/api/tutoring.store';
import type { CourseSummary } from '@/lib/api/schedule.store';
import { subjectColor } from '@/lib/ui/subject-colors';
import { hasPermission } from '@/lib/api/permissions';
import { useDialog } from '@/context/DialogContext';

interface Props {
  profile: StudentProfile;
  showToast: (m: string) => void;
}

export default function TutoringView({ profile }: Props) {
  const allowed = hasPermission('bookTutoring');
  const { notify, prompt } = useDialog();

  const [subjects, setSubjects] = useState<CourseSummary[]>([]);
  const [selSubject, setSelSubject] = useState<CourseSummary | null>(null);
  const [offers, setOffers] = useState<TutorOffer[]>([]);
  const [bookings, setBookings] = useState<TutorBooking[]>([]);
  const [confirm, setConfirm] = useState<{ offer: TutorOffer; slot: TutorSlot } | null>(null);
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<TutorBooking | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    setBookings(getStudentBookings(profile.studentId));
  }, [profile.studentId]);

  useEffect(() => {
    setSubjects(getStudentSubjectsForTutoring(profile.studentId));
    refresh();
  }, [profile.studentId, refresh]);

  useEffect(() => {
    setOffers(selSubject ? getOffersForSubject(selSubject.subjectKey, selSubject.subjectName) : []);
  }, [selSubject]);

  function handleBook() {
    if (!confirm) return;
    const r = bookTutoring(
      confirm.offer.id, confirm.slot.id,
      { code: profile.studentId, name: `${profile.firstName} ${profile.lastName}`.trim(), className: `${profile.grade}/${profile.room}` },
      note,
    );
    if (!r.ok) { setError(r.error); return; }
    setConfirm(null);
    setNote('');
    setError('');
    setReceipt(r.booking);
    refresh();
  }

  async function cancelBooking(b: TutorBooking) {
    const reason = await prompt({ title: 'ยกเลิกการจองเรียนพิเศษ?', message: <><b>{b.subjectName}</b> · {b.teacherName} · {b.slotLabel}<br />ระบุเหตุผล (แจ้งคุณครู):</>, placeholder: 'เช่น ติดธุระ / เปลี่ยนแผน', variant: 'danger', confirmText: 'ยืนยันยกเลิก', required: true });
    if (reason === null) return;
    if (updateBookingStatus(b.id, 'cancelled', reason)) {
      refresh();
      notify({ title: 'ยกเลิกการจองแล้ว', message: 'แจ้งคุณครูเรียบร้อย', variant: 'success' });
    }
  }

  if (!allowed) {
    return (
      <div className="stu-view-wrap">
        <div className="perm-denied">
          <span className="perm-denied-icon">🔒</span>
          บัญชีของท่านไม่ได้รับสิทธิ์จองเรียนพิเศษ — ติดต่อผู้ดูแลระบบ
        </div>
      </div>
    );
  }

  return (
    <div className="stu-view-wrap">
      <div className="stu-page-header">
        <h2 className="stu-page-title">🎓 จองเรียนพิเศษกับคุณครู</h2>
        <p className="stu-page-sub">
          แสดงเฉพาะวิชาที่ท่านเรียนอยู่ในปีการศึกษา {profile.academicYear} (ตามหลักสูตรของห้อง {profile.grade}/{profile.room})
        </p>
      </div>

      {/* ── ขั้นที่ 1: เลือกวิชา ── */}
      <div className="stu-section">
        <div className="stu-section-title">1 · เลือกวิชาที่ต้องการเรียนเสริม</div>
        {subjects.length === 0 ? (
          <div className="stu-empty">
            ยังไม่มีรายวิชาในตารางเรียนของท่าน 🕐<br />
            เมื่อโรงเรียนจัดตารางเรียนให้ห้องของท่านแล้ว รายวิชาจะแสดงที่นี่
          </div>
        ) : (
          <div className="stu-filters">
            {subjects.map(s => (
              <button
                key={`${s.subjectCode}-${s.subjectName}`}
                className={`stu-filter-chip${selSubject?.subjectCode === s.subjectCode ? ' active' : ''}`}
                onClick={() => setSelSubject(s)}
              >
                {s.subjectName} ({s.subjectCode})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── ขั้นที่ 2: เลือกครู/รอบเวลา ── */}
      {selSubject && (
        <div className="stu-section">
          <div className="stu-section-title">2 · ครูที่เปิดสอน “{selSubject.subjectName}”</div>
          {offers.length === 0 ? (
            <div className="stu-empty">ยังไม่มีคุณครูเปิดสอนพิเศษวิชานี้ในขณะนี้</div>
          ) : (
            <div className="stu-cls-grid">
              {offers.map(o => {
                const col = subjectColor(o.subjectKey);
                return (
                  <div key={o.id} className="stu-cls-card" style={{ borderTop: `3px solid ${col.dot}` }}>
                    <div className="stu-cls-name">{o.teacherName}</div>
                    <div className="stu-cls-teacher">
                      {o.subjectName} · {TUTOR_MODE_LABEL[o.mode]} · ฿{o.pricePerHour}/ชม.
                    </div>
                    <div className="stu-info-row">
                      <span className="stu-info-label">ระดับชั้นที่รับ</span>
                      <span className="stu-info-val">{o.gradeLevels || 'ทุกระดับชั้น'}</span>
                    </div>
                    {o.location && (
                      <div className="stu-info-row">
                        <span className="stu-info-label">{o.mode === 'online' ? 'ห้องเรียนออนไลน์' : 'สถานที่'}</span>
                        <span className="stu-info-val">{o.location}</span>
                      </div>
                    )}
                    {o.contact && (
                      <div className="stu-info-row">
                        <span className="stu-info-label">ติดต่อ</span>
                        <span className="stu-info-val">{o.contact}</span>
                      </div>
                    )}
                    {o.note && <div className="stu-cls-hw-alert">📌 {o.note}</div>}
                    <div className="stu-info-row">
                      <span className="stu-info-label">หลักฐานครู</span>
                      <span className="stu-info-val">
                        เลขที่ {o.documentRef} · {o.verified ? '✅ ตรวจสอบแล้ว' : '⏳ รอตรวจสอบ'}
                      </span>
                    </div>

                    <div style={{ marginTop: '0.6rem', display: 'grid', gap: '0.4rem' }}>
                      {o.slots.map(s => {
                        const booked = getSlotBookedCount(o.id, s.id);
                        const full = booked >= o.capacity;
                        return (
                          <button
                            key={s.id}
                            className="stu-cls-btn"
                            disabled={full}
                            style={full ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                            onClick={() => { setError(''); setConfirm({ offer: o, slot: s }); }}
                          >
                            {slotLabel(s)} · {full ? 'เต็มแล้ว' : `ว่าง ${o.capacity - booked}/${o.capacity}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── การจองของฉัน ── */}
      <div className="stu-section">
        <div className="stu-section-title">📋 การจองของฉัน ({bookings.length})</div>
        {bookings.length === 0 ? (
          <div className="stu-empty">ยังไม่มีรายการจอง</div>
        ) : (
          <div className="stu-hw-list">
            {bookings.map(b => (
              <div key={b.id} className="stu-hw-card">
                <div className="stu-hw-card-top">
                  <span className="stu-hw-subject-tag" style={{ background: 'var(--cream-dark)', color: 'var(--brown-deep)' }}>
                    {b.subjectName}
                  </span>
                  <span className={`stu-hw-status-badge ${
                    b.status === 'confirmed' ? 'badge-graded' :
                    b.status === 'cancelled' ? 'badge-overdue' :
                    b.status === 'done' ? 'badge-submitted' : 'badge-pending'}`}>
                    {BOOKING_STATUS_LABEL[b.status]}
                  </span>
                </div>
                <div className="stu-hw-card-title">{b.teacherName} · {b.slotLabel}</div>
                <div className="stu-hw-card-meta">
                  <span>เลขที่ {b.refCode}</span>
                  <span>{TUTOR_MODE_LABEL[b.mode]}</span>
                  <span>฿{b.pricePerHour}/ชม.</span>
                  <span>จองเมื่อ {new Date(b.createdAt).toLocaleString('th-TH')}</span>
                </div>
                {b.cancelReason && <div className="stu-cls-hw-alert">เหตุผลยกเลิก: {b.cancelReason}</div>}
                {(b.status === 'pending' || b.status === 'confirmed') && (
                  <button className="stu-hw-submit-btn" style={{ background: 'var(--absent)' }} onClick={() => cancelBooking(b)}>
                    ✕ ยกเลิกการจอง
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Popup ยืนยันการจอง ── */}
      {confirm && (
        <div className="sched-modal-wrap" onClick={() => setConfirm(null)}>
          <div className="sched-modal" style={{ width: 'min(420px, 94vw)' }} onClick={e => e.stopPropagation()}>
            <div className="sched-modal-title">📘 ยืนยันการจองเรียนพิเศษ</div>
            <div className="sched-modal-sub">ตรวจสอบรายละเอียดก่อนยืนยัน</div>
            {error && <div className="sched-error">{error}</div>}

            <div className="stu-info-card" style={{ marginBottom: '0.85rem' }}>
              <div className="stu-info-row"><span className="stu-info-label">วิชา</span><span className="stu-info-val">{confirm.offer.subjectName}</span></div>
              <div className="stu-info-row"><span className="stu-info-label">ครูผู้สอน</span><span className="stu-info-val">{confirm.offer.teacherName}</span></div>
              <div className="stu-info-row"><span className="stu-info-label">รอบเวลา</span><span className="stu-info-val">{slotLabel(confirm.slot)}</span></div>
              <div className="stu-info-row"><span className="stu-info-label">รูปแบบ</span><span className="stu-info-val">{TUTOR_MODE_LABEL[confirm.offer.mode]}</span></div>
              <div className="stu-info-row"><span className="stu-info-label">ค่าเรียน</span><span className="stu-info-val">฿{confirm.offer.pricePerHour} / ชั่วโมง</span></div>
            </div>

            <div className="sched-form-field">
              <label className="sched-form-label">ข้อความถึงคุณครู (ถ้ามี)</label>
              <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={note}
                placeholder="เช่น อยากทบทวนบทที่ 3" onChange={e => setNote(e.target.value)} />
            </div>

            <div className="sched-modal-actions">
              <button className="ez-btn ez-btn-primary" style={{ flex: 1 }} onClick={handleBook}>✅ ยืนยันการจอง</button>
              <button className="ez-btn ez-btn-ghost" onClick={() => setConfirm(null)}>ยกเลิก</button>
            </div>
            <div className="sched-log-meta" style={{ marginTop: '0.75rem' }}>
              * การชำระเงินตกลงกับคุณครูโดยตรง — ระบบบันทึกเป็นหลักฐานการจองเท่านั้น
            </div>
          </div>
        </div>
      )}

      {/* ── หลักฐานการจอง ── */}
      {receipt && (
        <div className="sched-modal-wrap" onClick={() => setReceipt(null)}>
          <div className="sched-modal" style={{ width: 'min(400px, 94vw)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.6rem', marginBottom: '0.4rem' }}>✅</div>
            <div className="sched-modal-title" style={{ color: 'var(--success)' }}>จองสำเร็จ!</div>
            <div className="sched-modal-sub">
              เลขที่การจอง <b>{receipt.refCode}</b><br />
              {receipt.subjectName} · {receipt.teacherName} · {receipt.slotLabel}
            </div>
            <div className="ez-help-box" style={{ textAlign: 'left' }}>
              รอคุณครูกดยืนยัน — สถานะจะเปลี่ยนเป็น “ยืนยันแล้ว” และท่านจะได้รับแจ้งเตือน
            </div>
            <button className="ez-btn ez-btn-primary" style={{ width: '100%', marginTop: '0.85rem' }} onClick={() => setReceipt(null)}>ปิด</button>
          </div>
        </div>
      )}
    </div>
  );
}
