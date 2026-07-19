'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getAcademicYears, createAcademicYear,
  getGradeLevels, createGradeLevel,
  getClassrooms, createClassroom,
  getClassroomStudents, addStudentToClassroom, removeStudentFromClassroom,
  type AcademicYear, type GradeLevel, type Classroom,
} from '@/lib/api/academic.store';
import { logActivity } from '@/lib/api/activity.log';
import type { TeacherStudent } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

interface Props {
  adminUsername: string;
}

/** รายการที่รอขึ้นระบบจริง — ต้อง "ยืนยัน" ทีละรายการ แล้ว "บันทึกขึ้นระบบ" อีกครั้ง */
interface PendingItem {
  id: number;
  kind: 'year' | 'grade' | 'room' | 'student';
  label: string;
  payload: { year?: string; gradeName?: string; room?: string; code?: string; name?: string; yearId?: string; gradeId?: string; roomId?: string };
  confirmed: boolean;
}

const KIND_LABEL: Record<PendingItem['kind'], string> = {
  year: 'ปีการศึกษา', grade: 'ระดับชั้น', room: 'ห้องเรียน', student: 'นักเรียน',
};

/**
 * โครงสร้างวิชาการ — แอดมินเท่านั้น (เรียงเป็นแถวยาวตามหมวดหมู่)
 * ความปลอดภัย 2 ชั้น: กดเพิ่ม → เข้าคิวรอ → กดยืนยันรายรายการ → กดบันทึกขึ้นระบบจริง
 * ข้อมูลจะไปถึง ครู/นักเรียน/ผู้ปกครอง ก็ต่อเมื่อบันทึกขึ้นระบบแล้วเท่านั้น
 */
export default function AcademicManager({ adminUsername }: Props) {
  const { showToast } = useToast();

  const [years,       setYears]       = useState<AcademicYear[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [classrooms,  setClassrooms]  = useState<Classroom[]>([]);
  const [roomStudents, setRoomStudents] = useState<TeacherStudent[]>([]);

  const [selYear,  setSelYear]  = useState('');
  const [selGrade, setSelGrade] = useState('');
  const [selRoom,  setSelRoom]  = useState('');

  const [newYear,  setNewYear]  = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newRoom,  setNewRoom]  = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newStudentName, setNewStudentName] = useState('');

  const [pending, setPending] = useState<PendingItem[]>([]);

  const refresh = useCallback(() => {
    const ys = getAcademicYears();
    setYears(ys);
    if (!selYear && ys.length > 0) setSelYear(ys[0].id);
  }, [selYear]);
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!selYear) { setGradeLevels([]); return; }
    const gs = getGradeLevels(selYear);
    setGradeLevels(gs);
    setSelGrade(prev => (gs.some(g => g.id === prev) ? prev : (gs[0]?.id || '')));
  }, [selYear, years]);

  useEffect(() => {
    const rooms = selGrade ? getClassrooms(selGrade) : [];
    setClassrooms(rooms);
    setSelRoom(prev => (rooms.some(r => r.id === prev) ? prev : ''));
  }, [selGrade, gradeLevels]);

  useEffect(() => {
    setRoomStudents(selRoom ? getClassroomStudents(selRoom) : []);
  }, [selRoom, classrooms, pending]);

  // ── ขั้นที่ 1: กดเพิ่ม → เข้าคิวรอยืนยัน (ยังไม่ขึ้นระบบจริง) ──
  function queue(kind: PendingItem['kind'], label: string, payload: PendingItem['payload']) {
    setPending(p => [...p, { id: Date.now() + Math.random(), kind, label, payload, confirmed: false }]);
    showToast(`⏳ "${label}" เข้าคิวแล้ว — กดยืนยัน และบันทึกขึ้นระบบ ข้อมูลจึงจะใช้งานจริง`);
  }

  function queueYear() {
    const y = newYear.trim();
    if (!/^\d{4}$/.test(y)) { showToast('⚠️ ปีการศึกษาต้องเป็นตัวเลข 4 หลัก เช่น 2568'); return; }
    if (years.some(x => x.year === y) || pending.some(p => p.kind === 'year' && p.payload.year === y)) { showToast('⚠️ ปีการศึกษานี้มีอยู่แล้ว'); return; }
    queue('year', `ปีการศึกษา ${y}`, { year: y });
    setNewYear('');
  }

  function queueGrade() {
    const g = newGrade.trim();
    if (!g) { showToast('⚠️ กรอกชื่อระดับชั้น เช่น ม.4'); return; }
    if (!selYear) { showToast('⚠️ เลือกปีการศึกษาก่อน'); return; }
    if (gradeLevels.some(x => x.name === g) || pending.some(p => p.kind === 'grade' && p.payload.gradeName === g && p.payload.yearId === selYear)) { showToast('⚠️ ระดับชั้นนี้มีอยู่แล้วในปีนี้'); return; }
    queue('grade', `ระดับชั้น ${g} (ปี ${years.find(y => y.id === selYear)?.year})`, { gradeName: g, yearId: selYear });
    setNewGrade('');
  }

  function queueRoom() {
    const r = newRoom.trim();
    if (!r) { showToast('⚠️ กรอกเลขห้อง เช่น 3'); return; }
    if (!selGrade) { showToast('⚠️ เลือกระดับชั้นก่อน'); return; }
    if (classrooms.some(x => x.room === r) || pending.some(p => p.kind === 'room' && p.payload.room === r && p.payload.gradeId === selGrade)) { showToast('⚠️ ห้องนี้มีอยู่แล้วในระดับชั้นนี้'); return; }
    const gradeName = gradeLevels.find(g => g.id === selGrade)?.name || '';
    queue('room', `ห้อง ${gradeName}/${r}`, { room: r, yearId: selYear, gradeId: selGrade });
    setNewRoom('');
  }

  function queueStudent() {
    const code = newStudentCode.trim();
    const name = newStudentName.trim();
    if (!code || !name) { showToast('⚠️ กรอกรหัสและชื่อนักเรียนให้ครบ'); return; }
    if (!selRoom) { showToast('⚠️ เลือกห้องเรียนก่อน'); return; }
    if (roomStudents.some(s => s.code === code) || pending.some(p => p.kind === 'student' && p.payload.code === code && p.payload.roomId === selRoom)) { showToast('⚠️ รหัสนักเรียนนี้อยู่ในห้องแล้ว'); return; }
    const gradeName = gradeLevels.find(g => g.id === selGrade)?.name || '';
    const roomNo = classrooms.find(c => c.id === selRoom)?.room || '';
    queue('student', `${name} (${code}) → ห้อง ${gradeName}/${roomNo}`, { code, name, roomId: selRoom });
    setNewStudentCode(''); setNewStudentName('');
  }

  // ── ขั้นที่ 2: ยืนยันรายรายการ ──
  function toggleConfirm(id: number) {
    setPending(p => p.map(x => x.id === id ? { ...x, confirmed: !x.confirmed } : x));
  }
  function removePending(id: number) {
    setPending(p => p.filter(x => x.id !== id));
  }

  // ── ขั้นที่ 3: บันทึกขึ้นระบบจริง (เฉพาะรายการที่ยืนยันแล้ว) ──
  function commitConfirmed() {
    const confirmed = pending.filter(p => p.confirmed);
    if (confirmed.length === 0) { showToast('⚠️ ยังไม่มีรายการที่กดยืนยัน'); return; }
    if (!window.confirm(`บันทึก ${confirmed.length} รายการขึ้นระบบจริง?\nข้อมูลจะแสดงให้ ครู นักเรียน และผู้ปกครอง ใช้งานทันที`)) return;

    let ok = 0;
    for (const item of confirmed) {
      const p = item.payload;
      let done = false;
      if (item.kind === 'year')    done = !!createAcademicYear(p.year!, adminUsername);
      if (item.kind === 'grade')   done = !!createGradeLevel(p.yearId!, p.gradeName!);
      if (item.kind === 'room')    done = !!createClassroom(p.yearId!, p.gradeId!, p.room!);
      if (item.kind === 'student') done = addStudentToClassroom(p.roomId!, p.code!, p.name!);
      if (done) {
        ok++;
        logActivity('admin', `เพิ่ม${KIND_LABEL[item.kind]}`, item.label);
      }
    }
    setPending(p => p.filter(x => !x.confirmed));
    setYears(getAcademicYears());
    if (selYear) setGradeLevels(getGradeLevels(selYear));
    if (selGrade) setClassrooms(getClassrooms(selGrade));
    if (selRoom) setRoomStudents(getClassroomStudents(selRoom));
    showToast(`✅ บันทึกขึ้นระบบแล้ว ${ok} รายการ — ครู/นักเรียน/ผู้ปกครอง ใช้งานได้ทันที`);
  }

  function handleRemoveStudent(code: string, name: string) {
    if (!selRoom || !confirm(`ลบ "${name}" ออกจากห้อง?`)) return;
    removeStudentFromClassroom(selRoom, code);
    logActivity('admin', 'ลบนักเรียนออกจากห้อง', `${name} (${code})`);
    showToast(`ลบ ${name} ออกจากห้องแล้ว`);
    setRoomStudents(getClassroomStudents(selRoom));
  }

  const gradeName = gradeLevels.find(g => g.id === selGrade)?.name || '';

  /** แถวหมวดหมู่แบบยาวเต็มความกว้าง */
  function SectionRow({ icon, title, sub, children }: { icon: string; title: string; sub: string; children: React.ReactNode }) {
    return (
      <div className="acad-row">
        <div className="acad-row-head">
          <span className="acad-row-icon">{icon}</span>
          <div>
            <div className="acad-row-title">{title}</div>
            <div className="acad-row-sub">{sub}</div>
          </div>
        </div>
        <div className="acad-row-body">{children}</div>
      </div>
    );
  }

  return (
    <div className="dash-section">
      <div className="ez-title">🏫 โครงสร้างวิชาการ</div>
      <div className="ez-subtitle">
        ฐานของระบบบันทึกคะแนนและเอกสาร ปพ. — ทุกการเพิ่มต้อง <b>ยืนยัน</b> และ <b>บันทึกขึ้นระบบ</b> อีกครั้ง
        ก่อนข้อมูลจะไปถึงครู นักเรียน และผู้ปกครอง
      </div>

      {/* ── 1. ปีการศึกษา ── */}
      <SectionRow icon="📅" title="ปีการศึกษา" sub="เลือกปีที่ทำงาน หรือเพิ่มปีใหม่">
        <div className="ez-choice-row" style={{ marginBottom: '0.75rem' }}>
          {years.map(y => (
            <button key={y.id} className={`ez-choice-btn acad-chip${selYear === y.id ? ' active' : ''}`} onClick={() => setSelYear(y.id)}>
              {selYear === y.id ? '✓ ' : ''}ปี {y.year}
            </button>
          ))}
        </div>
        <div className="acad-add-row">
          <input className="ez-input acad-input" placeholder="ปีใหม่ เช่น 2568" value={newYear} onChange={e => setNewYear(e.target.value)} />
          <button className="ez-btn ez-btn-primary acad-btn" onClick={queueYear}>➕ เพิ่ม</button>
        </div>
      </SectionRow>

      {/* ── 2. ระดับชั้น ── */}
      <SectionRow icon="🎓" title={`ระดับชั้น ${selYear ? `— ปี ${years.find(y => y.id === selYear)?.year}` : ''}`} sub="ระดับชั้นในปีการศึกษาที่เลือก">
        <div className="ez-choice-row" style={{ marginBottom: '0.75rem' }}>
          {gradeLevels.length === 0
            ? <span className="acad-empty">ยังไม่มีระดับชั้นในปีนี้</span>
            : gradeLevels.map(g => (
                <button key={g.id} className={`ez-choice-btn acad-chip${selGrade === g.id ? ' active' : ''}`} onClick={() => setSelGrade(g.id)}>
                  {selGrade === g.id ? '✓ ' : ''}{g.name}
                </button>
              ))}
        </div>
        <div className="acad-add-row">
          <input className="ez-input acad-input" placeholder="ชั้นใหม่ เช่น ม.4" value={newGrade} onChange={e => setNewGrade(e.target.value)} />
          <button className="ez-btn ez-btn-primary acad-btn" onClick={queueGrade}>➕ เพิ่ม</button>
        </div>
      </SectionRow>

      {/* ── 3. ห้องเรียน ── */}
      <SectionRow icon="🚪" title={`ห้องเรียน ${gradeName ? `— ${gradeName}` : ''}`} sub="ห้องในระดับชั้นที่เลือก — ครูจะเห็นเฉพาะห้องที่บันทึกขึ้นระบบแล้ว">
        <div className="ez-choice-row" style={{ marginBottom: '0.75rem' }}>
          {classrooms.length === 0
            ? <span className="acad-empty">ยังไม่มีห้องในระดับชั้นนี้</span>
            : classrooms.map(c => (
                <button key={c.id} className={`ez-choice-btn acad-chip${selRoom === c.id ? ' active' : ''}`} onClick={() => setSelRoom(c.id)}>
                  {selRoom === c.id ? '✓ ' : ''}{gradeName}/{c.room}
                </button>
              ))}
        </div>
        <div className="acad-add-row">
          <input className="ez-input acad-input" placeholder="เลขห้องใหม่ เช่น 3" value={newRoom} onChange={e => setNewRoom(e.target.value)} />
          <button className="ez-btn ez-btn-primary acad-btn" onClick={queueRoom}>➕ เพิ่ม</button>
        </div>
      </SectionRow>

      {/* ── 4. นักเรียนในห้อง ── */}
      <SectionRow icon="👥" title={`นักเรียนในห้อง ${selRoom ? `— ${gradeName}/${classrooms.find(c => c.id === selRoom)?.room} (${roomStudents.length} คน)` : ''}`} sub="เลือกห้องด้านบนก่อน แล้วเพิ่ม/ลบนักเรียนในห้องนั้น">
        {!selRoom ? (
          <span className="acad-empty">เลือกห้องเรียนก่อนเพื่อจัดการนักเรียน</span>
        ) : (
          <>
            <div className="acad-students">
              {roomStudents.length === 0
                ? <span className="acad-empty">ยังไม่มีนักเรียน — เพิ่มด้านล่าง</span>
                : roomStudents.map(s => (
                    <div key={s.code} className="acad-student-chip">
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{s.code}</span>
                      <span>{s.name}</span>
                      {s.classId === selRoom && (
                        <button className="acad-student-del" onClick={() => handleRemoveStudent(s.code, s.name)}>✕</button>
                      )}
                    </div>
                  ))}
            </div>
            <div className="acad-add-row">
              <input className="ez-input acad-input" placeholder="รหัสนักเรียน เช่น 10026" value={newStudentCode} onChange={e => setNewStudentCode(e.target.value)} />
              <input className="ez-input acad-input" style={{ flex: 1.5 }} placeholder="ชื่อ-นามสกุล" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} />
              <button className="ez-btn ez-btn-primary acad-btn" onClick={queueStudent}>➕ เพิ่ม</button>
            </div>
          </>
        )}
      </SectionRow>

      {/* ── คิวรอยืนยัน + บันทึกขึ้นระบบจริง ── */}
      {pending.length > 0 && (
        <div className="acad-pending">
          <div className="acad-pending-title">
            🗂 รายการรอขึ้นระบบ ({pending.length}) — ยืนยันทีละรายการ แล้วกดบันทึกขึ้นระบบจริง
          </div>
          {pending.map(item => (
            <div key={item.id} className={`acad-pending-row${item.confirmed ? ' confirmed' : ''}`}>
              <span className="ez-badge" style={{ background: 'var(--cream-dark)', color: 'var(--brown-deep)' }}>{KIND_LABEL[item.kind]}</span>
              <span style={{ flex: 1, minWidth: 160 }}>{item.label}</span>
              {item.confirmed
                ? <span className="ez-badge ez-badge-done">✓ ยืนยันแล้ว</span>
                : <button className="ez-btn ez-btn-success acad-btn" onClick={() => toggleConfirm(item.id)}>✅ ยืนยัน</button>}
              <button className="acad-student-del" onClick={() => removePending(item.id)}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
            <button className="ez-btn ez-btn-primary" onClick={commitConfirmed}>
              💾 บันทึกขึ้นระบบจริง ({pending.filter(p => p.confirmed).length} รายการที่ยืนยันแล้ว)
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ข้อมูลจะแสดงให้ ครู นักเรียน ผู้ปกครอง เมื่อบันทึกแล้วเท่านั้น
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
