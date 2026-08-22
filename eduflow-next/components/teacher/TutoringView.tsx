'use client';

/**
 * เปิดสอนพิเศษนอกเวลา — ฝั่งครู
 * ลงทะเบียนเปิดสอน (วิชา · รูปแบบ · รอบเวลา · ค่าเรียน · จำนวนที่รับ · หลักฐานการลงทะเบียน)
 * และดูรายการนักเรียนที่จองเข้ามา พร้อมยืนยัน/ยกเลิก
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getTeacherOffers, createOffer, deleteOffer, updateOffer,
  getTeacherBookings, updateBookingStatus, getSlotBookedCount, seedDemoTutoring,
  TUTOR_MODE_LABEL, TUTOR_DAYS, BOOKING_STATUS_LABEL, slotLabel,
  type TutorOffer, type TutorSlot, type TutorMode, type TutorBooking,
} from '@/lib/api/tutoring.store';
import { SUBJECT_KEYS } from '@/lib/api/schedule.store';
import { isDemoTeacher } from '@/lib/api/teacher.api';
import { hasPermission } from '@/lib/api/permissions';
import type { ClassInfo } from '@/lib/types';
import { useDialog } from '@/context/DialogContext';

interface Props {
  teacherUsername: string;
  teacherId: string;
  teacherName: string;
  classes: ClassInfo[];   // วิชาที่ครูสอนอยู่ — ใช้เป็นตัวเลือกวิชาที่เปิดสอนพิเศษ
  onBack?: () => void;
}

const emptySlot = (): TutorSlot => ({ id: `ts${Date.now()}${Math.random().toString(36).slice(2, 5)}`, day: 'sat', start: '09:00', end: '10:30' });

export default function TutoringView({ teacherUsername, teacherId, teacherName, classes, onBack }: Props) {
  const { confirm, notify, prompt } = useDialog();
  const allowed = hasPermission('offerTutoring');

  const [offers,   setOffers]   = useState<TutorOffer[]>([]);
  const [bookings, setBookings] = useState<TutorBooking[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error,    setError]    = useState('');

  // ── ฟอร์มลงทะเบียนเปิดสอน ──
  const [subjectKey,  setSubjectKey]  = useState(classes[0]?.key || 'math');
  const [subjectName, setSubjectName] = useState(classes[0]?.subject || '');
  const [subjectCode, setSubjectCode] = useState('');
  const [gradeLevels, setGradeLevels] = useState('');
  const [mode,        setMode]        = useState<TutorMode>('online');
  const [location,    setLocation]    = useState('');
  const [price,       setPrice]       = useState(200);
  const [capacity,    setCapacity]    = useState(5);
  const [contact,     setContact]     = useState('');
  const [note,        setNote]        = useState('');
  const [docName,     setDocName]     = useState('');
  const [slots,       setSlots]       = useState<TutorSlot[]>([emptySlot()]);

  const refresh = useCallback(() => {
    setOffers(getTeacherOffers(teacherUsername));
    setBookings(getTeacherBookings(teacherUsername));
  }, [teacherUsername]);

  useEffect(() => {
    // ครูเดโม่: จำลองข้อมูลเปิดสอนพิเศษ + การจองของนักเรียนที่สอนอยู่ (ทำครั้งเดียว)
    if (isDemoTeacher(teacherUsername)) seedDemoTutoring(teacherUsername, teacherId, teacherName);
    refresh();
  }, [refresh, teacherUsername, teacherId, teacherName]);

  function resetForm() {
    setSubjectKey(classes[0]?.key || 'math');
    setSubjectName(classes[0]?.subject || '');
    setSubjectCode(''); setGradeLevels(''); setMode('online'); setLocation('');
    setPrice(200); setCapacity(5); setContact(''); setNote(''); setDocName('');
    setSlots([emptySlot()]);
    setError('');
  }

  async function handleCreate() {
    if (!subjectName.trim()) { setError('กรุณาเลือกวิชาที่ต้องการเปิดสอน'); notify({ title: 'ข้อมูลไม่ครบ', message: 'กรุณาเลือกวิชาที่ต้องการเปิดสอน', variant: 'warning' }); return; }
    if (slots.length === 0) { notify({ title: 'ข้อมูลไม่ครบ', message: 'เพิ่มรอบเวลาที่สอนอย่างน้อย 1 รอบ', variant: 'warning' }); return; }
    if (!(await confirm({
      title: 'ลงทะเบียนเปิดสอนวิชานี้?',
      message: <><b>{subjectName}</b> · {TUTOR_MODE_LABEL[mode]}<br />฿{price}/ชม. · รับรอบละ {capacity} คน · {slots.length} รอบเวลา</>,
      confirmText: 'ลงทะเบียนเปิดสอน',
    }))) return;
    const r = createOffer({
      teacherUsername, teacherId, teacherName,
      subjectKey, subjectName, subjectCode,
      gradeLevels, mode, location,
      pricePerHour: price, capacity, slots, contact, note,
      documentName: docName || 'ยังไม่ได้แนบเอกสาร',
      active: true,
    });
    if (!r.ok) { setError(r.error); notify({ title: 'เปิดสอนไม่สำเร็จ', message: r.error, variant: 'danger' }); return; }
    setShowForm(false);
    resetForm();
    refresh();
    notify({ title: 'เปิดสอนพิเศษแล้ว', message: <>เปิดสอน <b>{subjectName}</b><br />เลขที่หลักฐาน {r.offer.documentRef}</>, variant: 'success' });
  }

  async function handleDelete(o: TutorOffer) {
    if (!(await confirm({ title: 'ยกเลิกการเปิดสอนวิชานี้?', message: <>ยกเลิกการเปิดสอน <b>{o.subjectName}</b> — การจองที่ค้างอยู่จะไม่ถูกลบ</>, variant: 'danger', confirmText: 'ยกเลิกการเปิดสอน' }))) return;
    deleteOffer(o.id);
    refresh();
    notify({ title: 'ยกเลิกการเปิดสอนแล้ว', message: o.subjectName, variant: 'success' });
  }

  async function toggleActive(o: TutorOffer) {
    if (!(await confirm({ title: o.active ? 'ปิดรับจองชั่วคราว?' : 'เปิดรับจองอีกครั้ง?', message: <><b>{o.subjectName}</b> — {o.active ? 'นักเรียนจะจองรอบใหม่ไม่ได้จนกว่าจะเปิดคืน' : 'นักเรียนจะจองรอบได้อีกครั้ง'}</>, variant: o.active ? 'warning' : 'primary', confirmText: o.active ? 'ปิดรับจอง' : 'เปิดรับจอง' }))) return;
    updateOffer(o.id, { active: !o.active });
    refresh();
    notify({ title: o.active ? 'ปิดรับจองแล้ว' : 'เปิดรับจองแล้ว', message: o.subjectName, variant: 'success' });
  }

  async function setBooking(b: TutorBooking, status: 'confirmed' | 'cancelled' | 'done') {
    let reason = '';
    if (status === 'cancelled') {
      const r = await prompt({ title: 'ยกเลิกการจองของนักเรียน?', message: <>ยกเลิกการจองของ <b>{b.studentName}</b> · {b.subjectName}<br />ระบุเหตุผล (แจ้งนักเรียน):</>, placeholder: 'เช่น รอบเต็ม / ปรับตารางสอน', variant: 'danger', confirmText: 'ยืนยันยกเลิก', required: true });
      if (r === null) return;
      reason = r;
    } else {
      const label = status === 'confirmed' ? 'ยืนยันการสอน' : 'ทำเครื่องหมายเรียนเสร็จสิ้น';
      if (!(await confirm({ title: `${label}?`, message: <><b>{b.studentName}</b> · {b.subjectName} · {b.slotLabel}</>, variant: status === 'confirmed' ? 'success' : 'primary', confirmText: label }))) return;
    }
    if (updateBookingStatus(b.id, status, reason)) {
      refresh();
      notify({ title: `อัปเดตเป็น “${BOOKING_STATUS_LABEL[status]}”`, message: <>{b.studentName} · {b.subjectName}</>, variant: status === 'cancelled' ? 'warning' : 'success' });
    }
  }

  if (!allowed) {
    return (
      <div className="panel-shell">
        <div className="panel-card">
          <div className="perm-denied">
            <span className="perm-denied-icon">🔒</span>
            บัญชีของท่านไม่ได้รับสิทธิ์ <b>เปิดรับสอนพิเศษนอกเวลา</b><br />
            ติดต่อผู้ดูแลระบบเพื่อขอเปิดสิทธิ์
          </div>
          {onBack && <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button className="ez-btn ez-btn-ghost" onClick={onBack}>← ย้อนกลับ</button>
          </div>}
        </div>
      </div>
    );
  }

  return (
    <div className="panel-shell">
      <div className="panel-card">
        <div className="panel-head">
          <h2 className="panel-title">เปิด<em>สอนพิเศษ</em>นอกเวลา</h2>
          <p className="panel-sub">
            ลงทะเบียนวิชาที่ท่านรับสอนเสริม — นักเรียนจะเห็นเฉพาะวิชาที่ตนเรียนอยู่ในปีการศึกษานั้น
            · หลักฐานการลงทะเบียนถูกออกเลขที่ให้อัตโนมัติ (ระบบตรวจสอบเอกสารจริงจะเพิ่มภายหลัง)
          </p>
        </div>

        <div className="panel-toolbar">
          <button className="ez-btn ez-btn-primary" onClick={() => { setShowForm(s => !s); setError(''); }}>
            {showForm ? '✕ ปิดฟอร์ม' : '➕ ลงทะเบียนเปิดสอนวิชาใหม่'}
          </button>
        </div>

        {/* ── ฟอร์มลงทะเบียน ── */}
        {showForm && (
          <div className="panel-body" style={{ marginBottom: '1.25rem' }}>
            {error && <div className="sched-error">{error}</div>}

            <div className="sched-form-grid">
              <div className="sched-form-field">
                <label className="sched-form-label">วิชาที่เปิดสอน *</label>
                <select
                  className="sched-select"
                  value={subjectName}
                  onChange={e => {
                    const cls = classes.find(c => c.subject === e.target.value);
                    setSubjectName(e.target.value);
                    if (cls) setSubjectKey(cls.key);
                  }}
                >
                  <option value="">— เลือกวิชา —</option>
                  {Array.from(new Set(classes.map(c => c.subject))).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">กลุ่มสาระ</label>
                <select className="sched-select" value={subjectKey} onChange={e => setSubjectKey(e.target.value)}>
                  {SUBJECT_KEYS.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                </select>
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">รหัสวิชา (ถ้ามี)</label>
                <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={subjectCode} onChange={e => setSubjectCode(e.target.value)} />
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">ระดับชั้นที่รับสอน</label>
                <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} placeholder="เช่น ม.1–ม.3" value={gradeLevels} onChange={e => setGradeLevels(e.target.value)} />
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">รูปแบบการสอน</label>
                <select className="sched-select" value={mode} onChange={e => setMode(e.target.value as TutorMode)}>
                  {(Object.keys(TUTOR_MODE_LABEL) as TutorMode[]).map(m => <option key={m} value={m}>{TUTOR_MODE_LABEL[m]}</option>)}
                </select>
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">{mode === 'online' ? 'ลิงก์ห้องเรียนออนไลน์' : 'สถานที่ (โดยสังเขป)'}</label>
                <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">ค่าเรียน (บาท/ชั่วโมง)</label>
                <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} type="number" min={0} value={price} onChange={e => setPrice(parseInt(e.target.value) || 0)} />
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">จำนวนที่รับต่อรอบ</label>
                <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} type="number" min={1} value={capacity} onChange={e => setCapacity(parseInt(e.target.value) || 1)} />
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">ช่องทางติดต่อ</label>
                <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} placeholder="LINE / เบอร์โทร" value={contact} onChange={e => setContact(e.target.value)} />
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">หลักฐานการลงทะเบียน (จำลอง)</label>
                <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} placeholder="ชื่อไฟล์เอกสาร เช่น อนุมัติสอนพิเศษ.pdf" value={docName} onChange={e => setDocName(e.target.value)} />
              </div>
              <div className="sched-form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="sched-form-label">รายละเอียดเพิ่มเติม</label>
                <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น ทบทวนเนื้อหาก่อนสอบกลางภาค" />
              </div>
            </div>

            {/* รอบเวลา */}
            <div className="stu-info-card-title" style={{ marginTop: '0.5rem' }}>รอบเวลาที่สอน</div>
            {slots.map((s, i) => (
              <div key={s.id} className="acad-add-row" style={{ marginBottom: '0.5rem' }}>
                <select className="sched-select" value={s.day} onChange={e => setSlots(list => list.map(x => x.id === s.id ? { ...x, day: e.target.value as TutorSlot['day'] } : x))}>
                  {TUTOR_DAYS.map(d => <option key={d.key} value={d.key}>{d.th}</option>)}
                </select>
                <input className="ez-input acad-input" type="time" value={s.start} onChange={e => setSlots(list => list.map(x => x.id === s.id ? { ...x, start: e.target.value } : x))} />
                <span style={{ color: 'var(--text-muted)' }}>ถึง</span>
                <input className="ez-input acad-input" type="time" value={s.end} onChange={e => setSlots(list => list.map(x => x.id === s.id ? { ...x, end: e.target.value } : x))} />
                {slots.length > 1 && (
                  <button className="ez-btn ez-btn-ghost acad-btn" style={{ color: 'var(--absent)' }} onClick={() => setSlots(list => list.filter(x => x.id !== s.id))}>🗑</button>
                )}
                {i === slots.length - 1 && (
                  <button className="ez-btn ez-btn-ghost acad-btn" onClick={() => setSlots(list => [...list, emptySlot()])}>➕ เพิ่มรอบ</button>
                )}
              </div>
            ))}

            <div className="sched-modal-actions">
              <button className="ez-btn ez-btn-primary" onClick={handleCreate}>💾 ลงทะเบียนเปิดสอน</button>
              <button className="ez-btn ez-btn-ghost" onClick={() => { setShowForm(false); resetForm(); }}>ยกเลิก</button>
            </div>
          </div>
        )}

        {/* ── รายการที่เปิดสอนอยู่ ── */}
        <div className="panel-body">
          <div className="stu-info-card-title">วิชาที่ท่านเปิดสอน ({offers.length})</div>
          {offers.length === 0 ? (
            <div className="stu-empty">ยังไม่ได้เปิดสอนวิชาใด — กด “ลงทะเบียนเปิดสอนวิชาใหม่” เพื่อเริ่ม</div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {offers.map(o => (
                <div key={o.id} className="ez-student-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <span className="ez-student-name">{o.subjectName}</span>
                    <span className={`sched-type-badge ${o.active ? 'sched-type-activity' : 'sched-type-club'}`}>
                      {o.active ? 'เปิดรับจอง' : 'ปิดรับชั่วคราว'}
                    </span>
                    <span className="sched-type-badge sched-type-elective">{TUTOR_MODE_LABEL[o.mode]}</span>
                    <span className="news-date">เลขที่ {o.documentRef}</span>
                  </div>
                  <div className="ez-student-meta">
                    ฿{o.pricePerHour}/ชม. · รับรอบละ {o.capacity} คน · {o.gradeLevels || 'ทุกระดับชั้น'}
                    {o.location && ` · ${o.location}`}
                  </div>
                  <div className="ez-student-meta" style={{ marginTop: '0.25rem' }}>
                    รอบเวลา: {o.slots.map(s => `${slotLabel(s)} (จองแล้ว ${getSlotBookedCount(o.id, s.id)}/${o.capacity})`).join(' · ')}
                  </div>
                  <div className="sched-log-meta" style={{ marginTop: '0.3rem' }}>หลักฐาน: {o.documentName} · สถานะตรวจสอบ: {o.verified ? '✅ ตรวจสอบแล้ว' : '⏳ รอฝ่ายบุคคลตรวจสอบ (จำลอง)'}
                  </div>
                  <div className="sched-modal-actions" style={{ marginTop: '0.6rem' }}>
                    <button className="ez-btn ez-btn-ghost acad-btn" onClick={() => toggleActive(o)}>
                      {o.active ? '⏸ ปิดรับจอง' : '▶️ เปิดรับจอง'}
                    </button>
                    <button className="ez-btn ez-btn-ghost acad-btn" style={{ color: 'var(--absent)' }} onClick={() => handleDelete(o)}>🗑 ยกเลิกการเปิดสอน</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── นักเรียนที่จองเข้ามา ── */}
        <div className="panel-body" style={{ marginTop: '1.25rem' }}>
          <div className="stu-info-card-title">รายการจองจากนักเรียน ({bookings.length})</div>
          {bookings.length === 0 ? (
            <div className="stu-empty">ยังไม่มีนักเรียนจอง</div>
          ) : (
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {bookings.map(b => (
                <div key={b.id} className="sched-log-row">
                  <span className={`sched-log-action ${b.status === 'confirmed' ? 'sched-log-add' : b.status === 'cancelled' ? 'sched-log-del' : 'sched-log-edit'}`}>
                    {BOOKING_STATUS_LABEL[b.status]}
                  </span>
                  <div className="sched-log-body">
                    <div className="sched-log-detail">
                      {b.studentName} ({b.studentClass} · รหัส {b.studentCode}) — {b.subjectName} · {b.slotLabel}
                    </div>
                    <div className="sched-log-meta">
                      เลขที่ {b.refCode} · จองเมื่อ {new Date(b.createdAt).toLocaleString('th-TH')}
                      {b.note && ` · หมายเหตุ: ${b.note}`}
                      {b.cancelReason && ` · เหตุผลยกเลิก: ${b.cancelReason}`}
                    </div>
                    {(b.status === 'pending' || b.status === 'confirmed') && (
                      <div className="sched-modal-actions" style={{ marginTop: '0.4rem' }}>
                        {b.status === 'pending' && (
                          <button className="ez-btn ez-btn-success acad-btn" onClick={() => setBooking(b, 'confirmed')}>✅ ยืนยันการสอน</button>
                        )}
                        {b.status === 'confirmed' && (
                          <button className="ez-btn ez-btn-ghost acad-btn" onClick={() => setBooking(b, 'done')}>🎓 เรียนเสร็จสิ้น</button>
                        )}
                        <button className="ez-btn ez-btn-ghost acad-btn" style={{ color: 'var(--absent)' }} onClick={() => setBooking(b, 'cancelled')}>✕ ยกเลิก</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {onBack && (
          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button className="ez-btn ez-btn-ghost" onClick={onBack}>← ย้อนกลับ</button>
          </div>
        )}
      </div>
    </div>
  );
}
