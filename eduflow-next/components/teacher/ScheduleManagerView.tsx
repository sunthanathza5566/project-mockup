'use client';

/**
 * แผนการเรียนการสอน — ขั้นที่ 2 ของ pipeline (แบบ "รายการ" ไม่ใช่ตาราง)
 *
 * ครูเลือกห้อง แล้วเพิ่มรายการในแผน: เลือกวิชาจากคลัง · วัน · คาบ · เวลาเรียน · วันที่ (ว/ด/ป) · ห้อง
 * แต่ละรายการเปิด/ปิดได้ — เฉพาะรายการที่ "เปิด" เท่านั้นที่ไปแสดงใน "ตารางสอน"
 *
 * สิทธิ์: manageTeachSchedule · ระบบกันคาบชน (ห้องซ้ำคาบ/ครูสอนซ้อน) · ทุกการกระทำถูกบันทึก log
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getAcademicYears, getGradeLevels, getClassrooms,
  type AcademicYear, type GradeLevel, type Classroom,
} from '@/lib/api/academic.store';
import {
  getClassroomPlan, getScheduleCourses, getScheduleLog, clearScheduleLog, addSlot, updateSlot, deleteSlot, setSlotActive,
  clearClassroomSchedule, canManageSchedule, suggestSubjectCode, dayTH, periodTime,
  getLunchConfig, setLunchConfig,
  DAYS, PERIODS, SUBJECT_TYPES, SUBJECT_KEYS, defaultGradingMode,
  type ScheduleSlot, type DayKey, type SubjectType, type ScheduleLogEntry,
} from '@/lib/api/schedule.store';
import type { GradingMode } from '@/lib/api/academic.store';
import { getCatalogSubjects, type CatalogSubject } from '@/lib/api/subject-catalog.store';
import { getUsers, getSession } from '@/lib/api/auth.api';
import LogControls from '@/components/ui/LogControls';
import CourseList from '@/components/schedule/CourseList';
import { subjectColor } from '@/lib/ui/subject-colors';
import { useToast } from '@/context/ToastContext';
import { useLang } from '@/context/LangContext';

interface Props {
  teacherUsername: string;
  teacherId: string;
  teacherName: string;
  onBack?: () => void;
}

interface FormState {
  catalogId: string;
  subjectName: string;
  subjectNameEn: string;
  subjectCode: string;
  subjectKey: string;
  subjectType: SubjectType;
  gradingMode: GradingMode;
  credit: number;
  teacherUsername: string;
  day: DayKey;
  period: number;
  startTime: string;
  endTime: string;
  date: string;
  room: string;
  note: string;
}

const emptyForm = (teacherUsername: string): FormState => ({
  catalogId: '', subjectName: '', subjectNameEn: '', subjectCode: '', subjectKey: 'math', subjectType: 'พื้นฐาน',
  gradingMode: 'numeric', credit: 1.0, teacherUsername,
  day: 'mon', period: 1, startTime: periodTime(1).split('–')[0], endTime: periodTime(1).split('–')[1] || '', date: '', room: '',
  note: '',
});

const LOG_CLASS: Record<string, string> = {
  'เพิ่มคาบสอน': 'sched-log-add', 'แก้ไขคาบสอน': 'sched-log-edit',
  'ลบคาบสอน': 'sched-log-del', 'ล้างตารางทั้งห้อง': 'sched-log-del',
};

export default function ScheduleManagerView({ teacherUsername, teacherId, teacherName, onBack }: Props) {
  const { showToast } = useToast();
  const { t } = useLang();
  const allowed = canManageSchedule();

  const [years,    setYears]    = useState<AcademicYear[]>([]);
  const [grades,   setGrades]   = useState<GradeLevel[]>([]);
  const [rooms,    setRooms]    = useState<Classroom[]>([]);
  const [selYear,  setSelYear]  = useState<AcademicYear | null>(null);
  const [selGrade, setSelGrade] = useState<GradeLevel | null>(null);
  const [selRoom,  setSelRoom]  = useState<Classroom | null>(null);

  const [teacherOptions, setTeacherOptions] = useState<{ username: string; name: string; code: string }[]>([]);
  const [catalog, setCatalog] = useState<CatalogSubject[]>([]);

  const [refreshKey, setRefreshKey] = useState(0);
  const bump = useCallback(() => setRefreshKey(k => k + 1), []);
  const [logSize, setLogSize] = useState(20);
  const isWebAdmin = getSession()?.role === 'web_admin';

  // ── ฟอร์มเพิ่ม/แก้ไขรายการในแผน ──
  const [form, setForm] = useState<FormState>(emptyForm(teacherUsername));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // ── ตั้งเวลาพักเที่ยง ──
  const [lunchOpen, setLunchOpen] = useState(false);
  const [lunch, setLunch] = useState(getLunchConfig());

  useEffect(() => {
    const ys = getAcademicYears();
    setYears(ys);
    if (ys.length > 0) setSelYear(ys[0]);
    setTeacherOptions(getUsers().filter(u => u.role === 'teacher').map(u => ({ username: u.username, name: u.name, code: u.code || u.username.toUpperCase() })));
    setCatalog(getCatalogSubjects());
  }, []);
  useEffect(() => { setGrades(selYear ? getGradeLevels(selYear.id) : []); setSelGrade(null); setSelRoom(null); }, [selYear]);
  useEffect(() => { setRooms(selGrade ? getClassrooms(selGrade.id) : []); setSelRoom(null); }, [selGrade]);
  useEffect(() => { setEditingId(null); setForm(emptyForm(teacherUsername)); setError(''); }, [selRoom, teacherUsername]);

  const plan = selRoom ? getClassroomPlan(selRoom.id) : [];
  const courses = selRoom ? getScheduleCourses(selRoom.id) : [];
  const logs: ScheduleLogEntry[] = selRoom ? getScheduleLog(selRoom.id) : getScheduleLog();
  const shownLogs = logSize === -1 ? logs : logs.slice(0, logSize);
  void refreshKey; // ให้ค่าด้านบนคำนวณใหม่หลังบันทึก (ข้อมูลอยู่ใน localStorage)

  function handleClearLog() {
    if (!window.confirm('ล้างประวัติการแก้ไข (log) นี้ทั้งหมด?\nการกระทำนี้ย้อนกลับไม่ได้')) return;
    const res = clearScheduleLog(selRoom?.id);
    if (res.ok) { bump(); showToast('ล้าง log แล้ว'); }
    else showToast(res.error || 'ล้างไม่สำเร็จ');
  }

  /** เลือกวิชาจากคลัง → เติมช่องวิชาให้อัตโนมัติ */
  function pickCatalog(id: string) {
    const s = catalog.find(x => x.id === id);
    setForm(prev => s ? {
      ...prev, catalogId: id,
      subjectCode: s.code, subjectName: s.name, subjectNameEn: s.nameEn, subjectKey: s.subjectKey,
      subjectType: s.subjectType, gradingMode: s.gradingMode, credit: s.credit,
    } : { ...prev, catalogId: '' });
  }

  /** เปลี่ยนคาบ → เติมเวลาเริ่ม/จบมาตรฐานของคาบนั้น (ครูแก้ทับได้) */
  function pickPeriod(period: number) {
    const [st, en] = periodTime(period).split('–');
    setForm(f => ({ ...f, period, startTime: st, endTime: en || '' }));
  }

  function resetForm() { setEditingId(null); setForm(emptyForm(teacherUsername)); setError(''); }

  function submit() {
    if (!selRoom) return;
    setError('');
    const teacher = teacherOptions.find(o => o.username === form.teacherUsername);
    const payload = {
      classroomId: selRoom.id,
      day: form.day,
      period: form.period,
      subjectCode: form.subjectCode || suggestSubjectCode(form.subjectKey, selGrade?.name || 'ม.1', form.subjectType),
      subjectName: form.subjectName,
      subjectNameEn: form.subjectNameEn,
      subjectKey: form.subjectKey,
      subjectType: form.subjectType,
      gradingMode: form.gradingMode,
      credit: form.credit,
      teacherUsername: form.teacherUsername,
      teacherId: teacher?.code || teacherId,
      teacherName: teacher?.name || teacherName,
      startTime: form.startTime,
      endTime: form.endTime,
      date: form.date,
      room: form.room,
      note: form.note,
    };
    const result = editingId ? updateSlot(editingId, payload) : addSlot(payload);
    if (!result.ok) { setError(result.error); return; }
    showToast(editingId ? '✅ แก้ไขรายการในแผนแล้ว' : `✅ เพิ่ม "${payload.subjectName}" ลงแผน (${dayTH(form.day)} คาบ ${form.period})`);
    resetForm();
    bump();
  }

  function startEdit(s: ScheduleSlot) {
    setError('');
    setEditingId(s.id);
    setForm({
      catalogId: catalog.find(c => c.code === s.subjectCode)?.id || '',
      subjectName: s.subjectName, subjectNameEn: s.subjectNameEn || '', subjectCode: s.subjectCode, subjectKey: s.subjectKey,
      subjectType: s.subjectType, gradingMode: s.gradingMode || 'numeric', credit: s.credit,
      teacherUsername: s.teacherUsername, day: s.day, period: s.period,
      startTime: s.startTime || periodTime(s.period).split('–')[0], endTime: s.endTime || periodTime(s.period).split('–')[1] || '',
      date: s.date || '', room: s.room, note: s.note,
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggle(s: ScheduleSlot) {
    const turningOn = s.active === false;
    const r = setSlotActive(s.id, turningOn);
    if (!r.ok) { showToast(r.error || 'เปลี่ยนสถานะไม่สำเร็จ'); return; }
    showToast(turningOn ? '▶️ เปิดใช้งานรายการ — จะแสดงในตารางสอน' : '⏸ ปิดรายการ — ซ่อนจากตารางสอน (ยังอยู่ในแผน)');
    bump();
  }

  function remove(s: ScheduleSlot) {
    if (!window.confirm(`ลบ "${s.subjectName}" ${dayTH(s.day)} คาบ ${s.period} ออกจากแผน?`)) return;
    if (deleteSlot(s.id).ok) { showToast('ลบรายการแล้ว'); if (editingId === s.id) resetForm(); bump(); }
  }

  function clearRoom() {
    if (!selRoom || !selGrade) return;
    if (!window.confirm(`ล้างแผนทั้งหมดของห้อง ${selGrade.name}/${selRoom.room}?\nการกระทำนี้จะถูกบันทึกใน log`)) return;
    const r = clearClassroomSchedule(selRoom.id);
    if (!r.ok) { showToast(`${r.error}`); return; }
    showToast(`ล้างแผนแล้ว ${r.removed} รายการ`); bump();
  }

  function saveLunch() {
    if (setLunchConfig(lunch)) { showToast(`พักเที่ยงหลังคาบ ${lunch.afterPeriod} · ${lunch.time}`); setLunchOpen(false); bump(); }
    else showToast('ไม่มีสิทธิ์ตั้งเวลาพักเที่ยง');
  }

  if (!allowed) {
    return (
      <div className="panel-shell">
        <div className="panel-card">
          <div className="perm-denied">
            <span className="perm-denied-icon">🔒</span>
            บัญชีของท่านไม่ได้รับสิทธิ์ <b>จัดการแผนการเรียน</b><br />
            ผู้ดูแลระบบเปิดสิทธิ์ “จัดการตารางสอน (เพิ่ม/แก้ไข/ลบ)” ให้ได้ที่หน้าสิทธิ์การเข้าถึง
          </div>
          {onBack && <div style={{ textAlign: 'center', marginTop: '1rem' }}><button className="ez-btn ez-btn-ghost" onClick={onBack}>← {t('ย้อนกลับ')}</button></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="panel-shell panel-shell-wide">
      <div className="panel-card">
        <div className="panel-head">
          <h2 className="panel-title"><em>แผนการเรียน</em>การสอน</h2>
          <p className="panel-sub">
            ขั้นที่ 2 — เลือกห้อง แล้วเพิ่มรายการในแผน (วิชา · วัน · คาบ · เวลา · วันที่) ·
            เปิด/ปิดแต่ละรายการได้ · <b>ตารางสอนจะแสดงเฉพาะรายการที่เปิดใช้งาน</b>
          </p>
        </div>

        {/* ── เลือกห้อง ── */}
        <div className="sched-form-grid">
          <div className="sched-form-field">
            <label className="sched-form-label">{t('ปีการศึกษา')}</label>
            <select className="sched-select" value={selYear?.id || ''} onChange={e => setSelYear(years.find(y => y.id === e.target.value) || null)}>
              <option value="">— เลือกปีการศึกษา —</option>
              {years.map(y => <option key={y.id} value={y.id}>ปี {y.year}</option>)}
            </select>
          </div>
          <div className="sched-form-field">
            <label className="sched-form-label">{t('ระดับชั้น')}</label>
            <select className="sched-select" value={selGrade?.id || ''} disabled={!selYear} onChange={e => setSelGrade(grades.find(g => g.id === e.target.value) || null)}>
              <option value="">— เลือกระดับชั้น —</option>
              {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="sched-form-field">
            <label className="sched-form-label">{t('ห้องเรียน')}</label>
            <select className="sched-select" value={selRoom?.id || ''} disabled={!selGrade} onChange={e => setSelRoom(rooms.find(r => r.id === e.target.value) || null)}>
              <option value="">— เลือกห้อง —</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{selGrade?.name}/{r.room}</option>)}
            </select>
          </div>
        </div>

        {!selRoom ? (
          <div className="ez-help-box">
            💡 เลือก <b>ปีการศึกษา → ระดับชั้น → ห้อง</b> ก่อน จึงจะเริ่มจัดแผนได้
            {selYear && grades.length === 0 && <><br />⚠️ ปีนี้ยังไม่มีระดับชั้น — เพิ่มที่หน้า “โครงสร้างวิชาการ” ก่อน</>}
            {selGrade && rooms.length === 0 && <><br />⚠️ ชั้นนี้ยังไม่มีห้องเรียน — เพิ่มห้องก่อน</>}
          </div>
        ) : (
          <>
            {/* ── ฟอร์มเพิ่ม/แก้ไขรายการ ── */}
            <div className="panel-body" style={{ marginBottom: '1.1rem' }}>
              <div className="stu-info-card-title">{editingId ? '✏️ แก้ไขรายการในแผน' : `➕ เพิ่มรายการ — ห้อง ${selGrade?.name}/${selRoom.room}`}</div>
              {error && <div className="sched-error">{error}</div>}

              <div className="sched-form-field" style={{ marginBottom: '0.75rem' }}>
                <label className="sched-form-label">📚 เลือกวิชาจากคลัง</label>
                <select className="sched-select" value={form.catalogId} onChange={e => pickCatalog(e.target.value)}>
                  <option value="">— เลือกจากคลังวิชา หรือกรอกเองด้านล่าง —</option>
                  {catalog.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}{s.nameEn ? ` (${s.nameEn})` : ''}</option>)}
                </select>
                {catalog.length === 0 && <div className="gb-pick-hint">ยังไม่มีวิชาในคลัง — เพิ่มที่หน้า “จัดการวิชา” ก่อน</div>}
              </div>

              <div className="sched-form-grid">
                <div className="sched-form-field">
                  <label className="sched-form-label">{t('ชื่อวิชา')} *</label>
                  <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={form.subjectName} placeholder="เช่น คณิตศาสตร์พื้นฐาน" onChange={e => setForm(f => ({ ...f, subjectName: e.target.value, catalogId: '' }))} />
                </div>
                <div className="sched-form-field">
                  <label className="sched-form-label">รหัสวิชา</label>
                  <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={form.subjectCode} placeholder="เว้นว่าง = สร้างอัตโนมัติ" onChange={e => setForm(f => ({ ...f, subjectCode: e.target.value }))} />
                </div>
                <div className="sched-form-field">
                  <label className="sched-form-label">{t('ครูผู้สอน')} *</label>
                  <select className="sched-select" value={form.teacherUsername} onChange={e => setForm(f => ({ ...f, teacherUsername: e.target.value }))}>
                    {teacherOptions.length === 0 && <option value={teacherUsername}>{teacherName}</option>}
                    {teacherOptions.map(o => <option key={o.username} value={o.username}>{o.name} ({o.code})</option>)}
                  </select>
                </div>
                <div className="sched-form-field">
                  <label className="sched-form-label">วัน</label>
                  <select className="sched-select" value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value as DayKey }))}>
                    {DAYS.map(d => <option key={d.key} value={d.key}>{d.th}</option>)}
                  </select>
                </div>
                <div className="sched-form-field">
                  <label className="sched-form-label">คาบที่</label>
                  <select className="sched-select" value={form.period} onChange={e => pickPeriod(parseInt(e.target.value))}>
                    {PERIODS.map(p => <option key={p.period} value={p.period}>คาบ {p.period}</option>)}
                  </select>
                </div>
                <div className="sched-form-field">
                  <label className="sched-form-label">เวลาเริ่ม–จบ</label>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                    <span style={{ color: 'var(--text-muted)' }}>–</span>
                    <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                  </div>
                </div>
                <div className="sched-form-field">
                  <label className="sched-form-label">วันที่เริ่มใช้ (ว/ด/ป)</label>
                  <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="sched-form-field">
                  <label className="sched-form-label">ห้องที่ใช้สอน</label>
                  <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={form.room} placeholder="เช่น ห้อง 201" onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
                </div>
                <div className="sched-form-field">
                  <label className="sched-form-label">กลุ่มสาระ</label>
                  <select className="sched-select" value={form.subjectKey} onChange={e => setForm(f => ({ ...f, subjectKey: e.target.value, catalogId: '' }))}>
                    {SUBJECT_KEYS.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                  </select>
                </div>
                <div className="sched-form-field">
                  <label className="sched-form-label">ประเภท / การตัดสินผล</label>
                  <select className="sched-select" value={form.subjectType} onChange={e => { const ty = e.target.value as SubjectType; setForm(f => ({ ...f, subjectType: ty, gradingMode: defaultGradingMode(ty), catalogId: '' })); }}>
                    {SUBJECT_TYPES.map(ty => <option key={ty} value={ty}>วิชา{ty} ({defaultGradingMode(ty) === 'symbol' ? 'ผ/มผ' : 'เกรด'})</option>)}
                  </select>
                </div>
              </div>

              <div className="sched-modal-actions">
                <button className="ez-btn ez-btn-primary" onClick={submit}>{editingId ? '💾 บันทึกการแก้ไข' : '➕ เพิ่มลงแผน'}</button>
                {editingId && <button className="ez-btn ez-btn-ghost" onClick={resetForm}>ยกเลิก</button>}
                <button className="ez-btn ez-btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => { setLunch(getLunchConfig()); setLunchOpen(o => !o); }}>🍱 ตั้งเวลาพักเที่ยง</button>
              </div>

              {lunchOpen && (
                <div style={{ background: 'var(--warm-white)', border: '2px solid var(--border)', borderRadius: 12, padding: '1rem', marginTop: '0.75rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="sched-form-field">
                    <label className="sched-form-label">พักเที่ยงหลังคาบ</label>
                    <select className="sched-select" value={lunch.afterPeriod} onChange={e => setLunch(l => ({ ...l, afterPeriod: parseInt(e.target.value) }))}>
                      {PERIODS.slice(0, -1).map(p => <option key={p.period} value={p.period}>คาบ {p.period}</option>)}
                    </select>
                  </div>
                  <div className="sched-form-field">
                    <label className="sched-form-label">ช่วงเวลา</label>
                    <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={lunch.time} onChange={e => setLunch(l => ({ ...l, time: e.target.value }))} placeholder="12:00–13:00" />
                  </div>
                  <button className="ez-btn ez-btn-primary" style={{ minHeight: 44 }} onClick={saveLunch}>💾 บันทึก</button>
                </div>
              )}
            </div>

            {/* ── รายการในแผน ── */}
            <div className="panel-body">
              <div className="sched-courses-head" style={{ marginTop: 0 }}>
                <span className="sched-courses-title">รายการในแผน — {selGrade?.name}/{selRoom.room} ({plan.length})</span>
                {plan.length > 0 && <button className="ez-btn ez-btn-ghost" style={{ minHeight: 36, fontSize: '0.82rem', color: 'var(--absent)' }} onClick={clearRoom}>🧹 ล้างแผนทั้งห้อง</button>}
              </div>

              {plan.length === 0 ? (
                <div className="stu-empty">ยังไม่มีรายการในแผน — เพิ่มด้านบน แล้วตารางสอนจะดึงไปแสดงให้อัตโนมัติ</div>
              ) : (
                <div className="sched-scroll">
                  <table className="sched-course-table">
                    <thead>
                      <tr>
                        <th>วัน</th><th>คาบ</th><th>เวลา</th>
                        <th style={{ textAlign: 'left' }}>วิชา</th>
                        <th style={{ textAlign: 'left' }}>ครู</th>
                        <th>ห้อง</th><th>วันที่เริ่ม</th><th>สถานะ</th><th>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.map(s => {
                        const active = s.active !== false;
                        return (
                          <tr key={s.id} style={{ opacity: active ? 1 : 0.55 }}>
                            <td style={{ textAlign: 'center' }}>{dayTH(s.day)}</td>
                            <td style={{ textAlign: 'center' }}>{s.period}</td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{s.startTime || '—'}{s.endTime ? `–${s.endTime}` : ''}</td>
                            <td>
                              <span className="sched-course-dot" style={{ background: subjectColor(s.subjectKey).dot }} />
                              {s.subjectName} <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>({s.subjectCode})</span>
                            </td>
                            <td>{s.teacherName}</td>
                            <td style={{ textAlign: 'center' }}>{s.room || '—'}</td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{s.date ? new Date(s.date).toLocaleDateString('th-TH') : '—'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button className={`perm-switch${active ? ' on' : ''}`} onClick={() => toggle(s)} title={active ? 'เปิดใช้งาน (คลิกเพื่อปิด)' : 'ปิดอยู่ (คลิกเพื่อเปิด)'} style={{ display: 'inline-block' }}>
                                <span className="perm-knob" />
                              </button>
                            </td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <button className="ez-btn ez-btn-ghost acad-btn" style={{ marginRight: 4 }} onClick={() => startEdit(s)}>✏️</button>
                              <button className="ez-btn ez-btn-ghost acad-btn" style={{ color: 'var(--absent)' }} onClick={() => remove(s)}>🗑</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <CourseList courses={courses} title="รายวิชาที่เปิดใช้งาน (แสดงในตารางสอน)" />
            </div>
          </>
        )}

        {/* ── Log ── */}
        <div className="sched-log">
          <div className="sched-log-title">{t('ประวัติการแก้ไข (Log)')}</div>
          <div className="sched-log-sub">
            บันทึกทุกการเพิ่ม/แก้ไข/ลบ/เปิด-ปิด พร้อม <b>ผู้ทำรายการ</b> และ <b>วันเวลา</b>
            {selRoom ? ` (เฉพาะห้อง ${selGrade?.name}/${selRoom.room})` : ' (ทุกห้อง)'}
          </div>
          <LogControls
            total={logs.length}
            shown={shownLogs.length}
            pageSize={logSize}
            onPageSize={setLogSize}
            onClear={isWebAdmin ? handleClearLog : undefined}
          />
          {logs.length === 0 ? (
            <div className="acad-empty">ยังไม่มีประวัติการแก้ไข</div>
          ) : shownLogs.map(l => (
            <div key={l.id} className="sched-log-row">
              <span className={`sched-log-action ${LOG_CLASS[l.action] || 'sched-log-edit'}`}>{l.action}</span>
              <div className="sched-log-body">
                <div className="sched-log-detail">{l.classLabel} · {l.detail}</div>
                <div className="sched-log-meta">{l.timestamp} · โดย <span className="sched-log-actor">{l.actorName}</span> (ID: {l.actorUsername} · {l.actorRole})</div>
              </div>
            </div>
          ))}
        </div>

        {onBack && (
          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button className="ez-btn ez-btn-primary" onClick={onBack}>ดูตารางสอนที่สร้างจากแผนนี้ →</button>
          </div>
        )}
      </div>
    </div>
  );
}
