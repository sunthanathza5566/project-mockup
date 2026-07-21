'use client';

/**
 * จัดการตารางสอน — เพิ่ม / แก้ไข / ลบ คาบสอนของแต่ละห้อง
 *
 * Flow: ปีการศึกษา → ระดับชั้น → ห้อง → คลิกช่องในตาราง → กรอกข้อมูลวิชา → บันทึก
 * ระบบกันคาบชนให้อัตโนมัติ (ห้องซ้ำคาบ / ครูสอนซ้อนคาบ)
 *
 * สิทธิ์: manageTeachSchedule (ครูที่แอดมินเปิดสิทธิ์, school_admin, web_admin)
 * ทุกการกระทำถูกบันทึก log: ทำอะไร · วันเวลา · ผู้ทำ (ชื่อ + username) — แสดงท้ายหน้า
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getAcademicYears, getGradeLevels, getClassrooms,
  type AcademicYear, type GradeLevel, type Classroom,
} from '@/lib/api/academic.store';
import {
  getWeekGrid, getScheduleCourses, getScheduleLog, addSlot, updateSlot, deleteSlot,
  clearClassroomSchedule, canManageSchedule, suggestSubjectCode, dayTH, periodTime,
  SUBJECT_TYPES, SUBJECT_KEYS, defaultGradingMode,
  type ScheduleSlot, type DayKey, type SubjectType, type ScheduleLogEntry,
} from '@/lib/api/schedule.store';
import type { GradingMode } from '@/lib/api/academic.store';
import { getUsers } from '@/lib/api/auth.api';
import ScheduleGrid from '@/components/schedule/ScheduleGrid';
import CourseList from '@/components/schedule/CourseList';
import { useToast } from '@/context/ToastContext';
import { useLang } from '@/context/LangContext';

interface Props {
  teacherUsername: string;
  teacherId: string;
  teacherName: string;
  onBack?: () => void;
}

/** ค่าตั้งต้นของฟอร์มคาบสอน */
interface FormState {
  subjectName: string;
  subjectCode: string;
  subjectKey: string;
  subjectType: SubjectType;
  gradingMode: GradingMode;
  credit: number;
  teacherUsername: string;
  room: string;
  note: string;
}

const emptyForm = (teacherUsername: string): FormState => ({
  subjectName: '', subjectCode: '', subjectKey: 'math', subjectType: 'พื้นฐาน',
  gradingMode: 'numeric', credit: 1.0, teacherUsername, room: '', note: '',
});

const LOG_CLASS: Record<string, string> = {
  'เพิ่มคาบสอน': 'sched-log-add',
  'แก้ไขคาบสอน': 'sched-log-edit',
  'ลบคาบสอน': 'sched-log-del',
  'ล้างตารางทั้งห้อง': 'sched-log-del',
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

  const [refreshKey, setRefreshKey] = useState(0);
  const bump = useCallback(() => setRefreshKey(k => k + 1), []);

  // ── modal เพิ่ม/แก้ไข ──
  const [editing, setEditing] = useState<{ day: DayKey; period: number; slot: ScheduleSlot | null } | null>(null);
  const [form,    setForm]    = useState<FormState>(emptyForm(teacherUsername));
  const [error,   setError]   = useState('');

  // รายชื่อครูสำหรับเลือกครูผู้สอน (จากบัญชีจริงในระบบ)
  const [teacherOptions, setTeacherOptions] = useState<{ username: string; name: string; code: string }[]>([]);

  useEffect(() => {
    const ys = getAcademicYears();
    setYears(ys);
    if (ys.length > 0) setSelYear(ys[0]);
    setTeacherOptions(
      getUsers().filter(u => u.role === 'teacher')
        .map(u => ({ username: u.username, name: u.name, code: u.code || u.username.toUpperCase() }))
    );
  }, []);
  useEffect(() => { setGrades(selYear ? getGradeLevels(selYear.id) : []); setSelGrade(null); setSelRoom(null); }, [selYear]);
  useEffect(() => { setRooms(selGrade ? getClassrooms(selGrade.id) : []); setSelRoom(null); }, [selGrade]);

  const grid    = selRoom ? getWeekGrid(selRoom.id) : null;
  const courses = selRoom ? getScheduleCourses(selRoom.id) : [];
  const logs: ScheduleLogEntry[] = selRoom ? getScheduleLog(selRoom.id) : getScheduleLog();
  // อ้าง refreshKey เพื่อให้ค่าข้างบนถูกคำนวณใหม่หลังบันทึก (ข้อมูลอยู่ใน localStorage ไม่ใช่ state)
  void refreshKey;

  function openCell(day: DayKey, period: number, slot: ScheduleSlot | null) {
    setError('');
    setEditing({ day, period, slot });
    setForm(slot ? {
      subjectName: slot.subjectName, subjectCode: slot.subjectCode, subjectKey: slot.subjectKey,
      subjectType: slot.subjectType, gradingMode: slot.gradingMode || 'numeric', credit: slot.credit,
      teacherUsername: slot.teacherUsername, room: slot.room, note: slot.note,
    } : emptyForm(teacherUsername));
  }

  /**
   * เติมค่าให้อัตโนมัติเมื่อเปลี่ยนกลุ่มสาระ/ประเภทวิชา (ครูแก้ทับได้)
   *   - รหัสวิชาตามกลุ่มสาระ + ระดับชั้น
   *   - เปลี่ยนเป็นกิจกรรม/ชุมนุม → ตั้งเป็น "ไม่คิดเกรด (ผ/มผ)" ให้เลย
   */
  function autoFill(next: Partial<FormState>) {
    setForm(prev => {
      const merged = { ...prev, ...next };
      if (next.subjectType) merged.gradingMode = defaultGradingMode(next.subjectType);
      if ((next.subjectKey || next.subjectType) && selGrade) {
        merged.subjectCode = suggestSubjectCode(merged.subjectKey, selGrade.name, merged.subjectType);
        if (next.subjectKey && !prev.subjectName) {
          merged.subjectName = SUBJECT_KEYS.find(s => s.key === next.subjectKey)?.label || '';
        }
      }
      return merged;
    });
  }

  function handleSave() {
    if (!editing || !selRoom) return;
    const teacher = teacherOptions.find(o => o.username === form.teacherUsername);
    const payload = {
      classroomId: selRoom.id,
      day: editing.day,
      period: editing.period,
      subjectCode: form.subjectCode || suggestSubjectCode(form.subjectKey, selGrade?.name || 'ม.1', form.subjectType),
      subjectName: form.subjectName,
      subjectKey: form.subjectKey,
      subjectType: form.subjectType,
      gradingMode: form.gradingMode,
      credit: form.credit,
      teacherUsername: form.teacherUsername,
      teacherId: teacher?.code || teacherId,
      teacherName: teacher?.name || teacherName,
      room: form.room,
      note: form.note,
    };

    const result = editing.slot ? updateSlot(editing.slot.id, payload) : addSlot(payload);
    if (!result.ok) { setError(result.error); return; }

    showToast(editing.slot
      ? `✅ แก้ไขคาบสอน ${dayTH(editing.day)} คาบ ${editing.period} แล้ว`
      : `✅ เพิ่ม "${payload.subjectName}" ${dayTH(editing.day)} คาบ ${editing.period} แล้ว`);
    setEditing(null);
    bump();
  }

  function handleDelete() {
    if (!editing?.slot) return;
    if (!window.confirm(`ลบคาบสอน "${editing.slot.subjectName}" ${dayTH(editing.day)} คาบ ${editing.period}?`)) return;
    const r = deleteSlot(editing.slot.id);
    if (!r.ok) { setError(r.error || 'ลบไม่สำเร็จ'); return; }
    showToast('🗑 ลบคาบสอนแล้ว — บันทึกลง log เรียบร้อย');
    setEditing(null);
    bump();
  }

  function handleClearRoom() {
    if (!selRoom || !selGrade) return;
    if (!window.confirm(`ล้างตารางสอนทั้งหมดของห้อง ${selGrade.name}/${selRoom.room}?\nการกระทำนี้จะถูกบันทึกใน log`)) return;
    const r = clearClassroomSchedule(selRoom.id);
    if (!r.ok) { showToast(`⚠️ ${r.error}`); return; }
    showToast(`🧹 ล้างตารางแล้ว ${r.removed} คาบ`);
    bump();
  }

  if (!allowed) {
    return (
      <div className="panel-shell panel-shell-wide">
        <div className="panel-card">
          <div className="perm-denied">
            <span className="perm-denied-icon">🔒</span>
            บัญชีของท่านไม่ได้รับสิทธิ์ <b>จัดการตารางสอน</b><br />
            ผู้ดูแลระบบสามารถเปิดสิทธิ์ “จัดการตารางสอน (เพิ่ม/แก้ไข/ลบ)” ให้ได้ที่หน้าสิทธิ์การเข้าถึง
          </div>
          {onBack && <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button className="ez-btn ez-btn-ghost" onClick={onBack}>← {t('ย้อนกลับ')}</button>
          </div>}
        </div>
      </div>
    );
  }

  return (
    <div className="panel-shell panel-shell-wide">
      <div className="panel-card">
        <div className="panel-head">
          <h2 className="panel-title">⚙️ {t('จัดการตารางสอน')}</h2>
          <p className="panel-sub">
            เลือกห้องเรียน แล้วคลิกช่องในตารางเพื่อ <b>เพิ่ม / แก้ไข / ลบ</b> คาบสอน ·
            ระบบตรวจคาบชนให้อัตโนมัติ (ห้องซ้ำคาบ และครูสอนซ้อนคาบ) · ทุกการกระทำถูกบันทึกลง log
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

        <div className="panel-body">
          {!selRoom ? (
            <div className="ez-help-box">
              💡 เลือก <b>ปีการศึกษา → ระดับชั้น → ห้อง</b> ก่อน จึงจะเริ่มจัดตารางสอนได้
              {selYear && grades.length === 0 && <><br />⚠️ ปีนี้ยังไม่มีระดับชั้น — ให้แอดมินสร้างในหน้า “โครงสร้างวิชาการ” ก่อน</>}
              {selGrade && rooms.length === 0 && <><br />⚠️ ชั้นนี้ยังไม่มีห้องเรียน — ให้แอดมินสร้างห้องก่อน</>}
            </div>
          ) : (
            <>
              <div className="sched-courses-head" style={{ marginTop: 0 }}>
                <span className="sched-courses-title">🏫 ห้อง {selGrade?.name}/{selRoom.room} · ปีการศึกษา {selYear?.year}</span>
                <button className="ez-btn ez-btn-ghost" style={{ minHeight: 38, fontSize: '0.85rem', color: 'var(--absent)' }} onClick={handleClearRoom}>
                  🧹 ล้างตารางทั้งห้อง
                </button>
              </div>
              <div className="ez-help-box" style={{ marginBottom: '0.9rem' }}>
                👆 คลิกช่องว่าง = เพิ่มคาบสอน · คลิกช่องที่มีวิชาแล้ว = แก้ไขหรือลบ
              </div>

              {grid && <ScheduleGrid grid={grid} highlightTeacher={teacherUsername} onCellClick={openCell} />}
              <CourseList courses={courses} />
            </>
          )}
        </div>

        {/* ── Log ── */}
        <div className="sched-log">
          <div className="sched-log-title">📜 {t('ประวัติการแก้ไข (Log)')}</div>
          <div className="sched-log-sub">
            บันทึกทุกการเพิ่ม/แก้ไข/ลบ พร้อม <b>ผู้ทำรายการ (ชื่อ + รหัสผู้ใช้)</b> และ <b>วันที่-เวลา</b> —
            ใช้ตรวจสอบย้อนหลังเมื่อข้อมูลผิดพลาด {selRoom ? `(แสดงเฉพาะห้อง ${selGrade?.name}/${selRoom.room})` : '(แสดงทุกห้อง)'}
          </div>
          {logs.length === 0 ? (
            <div className="acad-empty">ยังไม่มีประวัติการแก้ไขตารางสอน</div>
          ) : (
            logs.slice(0, 30).map(l => (
              <div key={l.id} className="sched-log-row">
                <span className={`sched-log-action ${LOG_CLASS[l.action] || 'sched-log-edit'}`}>{l.action}</span>
                <div className="sched-log-body">
                  <div className="sched-log-detail">{l.classLabel} · {l.detail}</div>
                  <div className="sched-log-meta">
                    🕐 {l.timestamp} · โดย <span className="sched-log-actor">{l.actorName}</span> (ID: {l.actorUsername} · {l.actorRole})
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {onBack && (
          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button className="ez-btn ez-btn-ghost" onClick={onBack}>← {t('ย้อนกลับ')}</button>
          </div>
        )}
      </div>

      {/* ── Modal เพิ่ม/แก้ไขคาบสอน ── */}
      {editing && (
        <div className="sched-modal-wrap" onClick={() => setEditing(null)}>
          <div className="sched-modal" onClick={e => e.stopPropagation()}>
            <div className="sched-modal-title">
              {editing.slot ? '✏️ แก้ไขคาบสอน' : '➕ เพิ่มคาบสอน'}
            </div>
            <div className="sched-modal-sub">
              ห้อง {selGrade?.name}/{selRoom?.room} · วัน{dayTH(editing.day)} · คาบ {editing.period} ({periodTime(editing.period)})
            </div>

            {error && <div className="sched-error">{error}</div>}

            <div className="sched-form-grid">
              <div className="sched-form-field">
                <label className="sched-form-label">กลุ่มสาระ</label>
                <select className="sched-select" value={form.subjectKey} onChange={e => autoFill({ subjectKey: e.target.value })}>
                  {SUBJECT_KEYS.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                </select>
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">{t('ประเภทวิชา')}</label>
                <select className="sched-select" value={form.subjectType} onChange={e => autoFill({ subjectType: e.target.value as SubjectType })}>
                  {SUBJECT_TYPES.map(ty => <option key={ty} value={ty}>วิชา{ty}</option>)}
                </select>
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">การตัดสินผลการเรียน</label>
                <select className="sched-select" value={form.gradingMode} onChange={e => setForm(f => ({ ...f, gradingMode: e.target.value as GradingMode }))}>
                  <option value="numeric">คิดเกรด 4 – 0 (คิด GPA)</option>
                  <option value="symbol">ไม่คิดเกรด ใช้ ผ / มผ (ไม่คิด GPA)</option>
                </select>
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">{t('ชื่อวิชา')} *</label>
                <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={form.subjectName}
                  placeholder="เช่น คณิตศาสตร์พื้นฐาน"
                  onChange={e => setForm(f => ({ ...f, subjectName: e.target.value }))} />
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">{t('รหัสวิชา')}</label>
                <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={form.subjectCode}
                  placeholder="เว้นว่าง = สร้างอัตโนมัติ"
                  onChange={e => setForm(f => ({ ...f, subjectCode: e.target.value }))} />
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">{t('ครูผู้สอน')} *</label>
                <select className="sched-select" value={form.teacherUsername} onChange={e => setForm(f => ({ ...f, teacherUsername: e.target.value }))}>
                  {teacherOptions.length === 0 && <option value={teacherUsername}>{teacherName}</option>}
                  {teacherOptions.map(o => <option key={o.username} value={o.username}>{o.name} ({o.code})</option>)}
                </select>
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">ห้องที่ใช้สอน</label>
                <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={form.room}
                  placeholder="เช่น ห้อง 201 / ห้องแล็บ 1"
                  onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">หน่วยกิต</label>
                <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} type="number" min={0} step={0.5} value={form.credit}
                  onChange={e => setForm(f => ({ ...f, credit: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="sched-form-field">
                <label className="sched-form-label">หมายเหตุ</label>
                <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={form.note}
                  placeholder="เช่น เรียนรวม 2 ห้อง"
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>

            <div className="sched-modal-actions">
              <button className="ez-btn ez-btn-primary" style={{ flex: 1, minWidth: 140 }} onClick={handleSave}>
                💾 {editing.slot ? 'บันทึกการแก้ไข' : 'เพิ่มคาบสอน'}
              </button>
              {editing.slot && (
                <button className="ez-btn ez-btn-ghost" style={{ color: 'var(--absent)', borderColor: 'rgba(160,80,80,0.4)' }} onClick={handleDelete}>
                  🗑 {t('ลบ')}
                </button>
              )}
              <button className="ez-btn ez-btn-ghost" onClick={() => setEditing(null)}>{t('ยกเลิก')}</button>
            </div>

            {editing.slot && (
              <div className="sched-log-meta" style={{ marginTop: '0.85rem' }}>
                สร้างโดย {editing.slot.createdByName} ({editing.slot.createdBy}) เมื่อ {new Date(editing.slot.createdAt).toLocaleString('th-TH')}
                {editing.slot.updatedAt && <> · แก้ไขล่าสุดโดย {editing.slot.updatedByName} เมื่อ {new Date(editing.slot.updatedAt).toLocaleString('th-TH')}</>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
