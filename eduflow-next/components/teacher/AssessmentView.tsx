'use client';

/**
 * บันทึกผลการประเมิน คุณลักษณะอันพึงประสงค์ / การอ่านคิดวิเคราะห์เขียน / กิจกรรมพัฒนาผู้เรียน
 * (ส่วนครูประจำชั้นประเมิน — ใช้เติมในเอกสาร ปพ.1 สรุป · ปพ.4 · ปพ.6)
 *
 * กันพัง: แก้แล้วยังไม่บันทึก → สลับนักเรียน/ห้อง = เตือนก่อนทิ้ง · บันทึก = ยืนยันก่อน
 */

import { useEffect, useMemo, useState } from 'react';
import { useDialog } from '@/context/DialogContext';
import {
  getAcademicYears, getGradeLevels, getClassrooms, getClassroomStudents,
  type AcademicYear, type GradeLevel, type Classroom,
} from '@/lib/api/academic.store';
import {
  getAssessment, saveAssessment, emptyAssessment,
  RESULT_OPTIONS, ACTIVITY_OPTIONS, CHARACTERISTIC_NAMES, type StudentAssessment,
} from '@/lib/api/assessment.store';

const eq = (a: StudentAssessment, b: StudentAssessment) => JSON.stringify(a) === JSON.stringify(b);
const isFilled = (a: StudentAssessment) =>
  !!(a.readingThinkingWriting || a.characteristicsOverall || a.learnerActivities || a.characteristics.some(Boolean));

export default function AssessmentView() {
  const { confirm, notify } = useDialog();
  const [years, setYears]   = useState<AcademicYear[]>([]);
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [rooms, setRooms]   = useState<Classroom[]>([]);

  const [yearId, setYearId]   = useState('');
  const [gradeId, setGradeId] = useState('');
  const [roomId, setRoomId]   = useState('');
  const [code, setCode]       = useState('');
  const [form, setForm]       = useState<StudentAssessment>(emptyAssessment());
  const [saved, setSaved]     = useState<StudentAssessment>(emptyAssessment()); // ค่าที่บันทึกไว้ล่าสุด (baseline)

  const dirty = useMemo(() => !eq(form, saved), [form, saved]);

  useEffect(() => { setYears(getAcademicYears()); }, []);

  /** เตือนก่อนทิ้งการแก้ไขที่ยังไม่บันทึก — คืน true ถ้าไปต่อได้ */
  async function guard(): Promise<boolean> {
    if (!dirty) return true;
    return confirm({ title: 'ยังไม่ได้บันทึกผลการประเมิน', message: 'ออกจากนักเรียนคนนี้โดยไม่บันทึกการแก้ไข?', variant: 'warning', confirmText: 'ออกโดยไม่บันทึก', cancelText: 'อยู่ต่อ' });
  }

  async function pickYear(v: string)  { if (!(await guard())) return; setYearId(v); setGrades(v ? getGradeLevels(v) : []); setGradeId(''); setRooms([]); setRoomId(''); setCode(''); }
  async function pickGrade(v: string) { if (!(await guard())) return; setGradeId(v); setRooms(v ? getClassrooms(v) : []); setRoomId(''); setCode(''); }
  async function pickRoom(v: string)  { if (!(await guard())) return; setRoomId(v); setCode(''); }
  async function pickStudent(v: string) {
    if (!(await guard())) return;
    setCode(v);
    const loaded = v ? (getAssessment(v) || emptyAssessment()) : emptyAssessment();
    setForm(loaded); setSaved(loaded);
  }

  const students = useMemo(() => (roomId ? getClassroomStudents(roomId) : []), [roomId]);

  async function doSave() {
    if (!code) { notify({ title: 'ยังบันทึกไม่ได้', message: 'เลือกนักเรียนก่อน', variant: 'warning' }); return; }
    if (!isFilled(form)) { notify({ title: 'ยังไม่ได้เลือกผล', message: 'เลือกผลการประเมินอย่างน้อย 1 รายการก่อนบันทึก', variant: 'warning' }); return; }
    if (!(await confirm({ title: 'ยืนยันบันทึกผลการประเมิน?', message: <>นักเรียน <b>{studentName}</b> ({code})<br />ผลนี้จะแสดงในเอกสาร ปพ.1 / ปพ.4 / ปพ.6</>, confirmText: 'ยืนยันบันทึก' }))) return;
    saveAssessment(code, form);
    setSaved(form);
    notify({ title: 'บันทึกผลการประเมินแล้ว', message: 'จะแสดงในเอกสาร ปพ.1 / ปพ.4 / ปพ.6', variant: 'success' });
  }

  const sel: React.CSSProperties = { padding: '0.55rem 0.7rem', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--warm-white)', fontFamily: "'DM Sans',sans-serif", fontSize: '0.88rem', color: 'var(--text-body)', minWidth: 150 };
  const Result = ({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts: readonly string[] }) => (
    <select style={sel} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— เลือกผล —</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  const setChar = (i: number, v: string) => setForm(f => ({ ...f, characteristics: f.characteristics.map((x, j) => j === i ? v : x) }));

  const studentName = students.find(s => s.code === code)?.name || '';

  return (
    <div className="panel-shell ez-sm">
      <div className="panel-card">
        <div className="panel-head">
          <h2 className="panel-title">บันทึก<em>ผลการประเมิน</em></h2>
          <p className="panel-sub">คุณลักษณะอันพึงประสงค์ · การอ่านคิดวิเคราะห์เขียน · กิจกรรมพัฒนาผู้เรียน — เลือกปี → ชั้น → ห้อง → นักเรียน</p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <select style={sel} value={yearId} onChange={e => pickYear(e.target.value)}>
            <option value="">— ปีการศึกษา —</option>{years.map(y => <option key={y.id} value={y.id}>ปี {y.year}</option>)}
          </select>
          <select style={sel} value={gradeId} onChange={e => pickGrade(e.target.value)} disabled={!yearId}>
            <option value="">— ระดับชั้น —</option>{grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select style={sel} value={roomId} onChange={e => pickRoom(e.target.value)} disabled={!gradeId}>
            <option value="">— ห้อง —</option>{rooms.map(r => <option key={r.id} value={r.id}>ห้อง {r.room}</option>)}
          </select>
          <select style={sel} value={code} onChange={e => pickStudent(e.target.value)} disabled={!roomId}>
            <option value="">— นักเรียน —</option>{students.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
          </select>
        </div>

        {!code ? (
          <div className="stu-empty">เลือกนักเรียนเพื่อบันทึกผลการประเมิน</div>
        ) : (
          <>
            {dirty && (
              <div style={{ background: 'rgba(196,128,74,0.1)', border: '1px solid var(--late)', color: 'var(--late)', borderRadius: 10, padding: '0.55rem 0.85rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                ● มีการแก้ไขที่ยังไม่ได้บันทึก — กด “บันทึกผลการประเมิน” ก่อนสลับนักเรียน
              </div>
            )}

            <div className="stu-info-card" style={{ marginBottom: '1rem' }}>
              <div className="stu-info-card-title">คุณลักษณะอันพึงประสงค์ 8 ประการ</div>
              {CHARACTERISTIC_NAMES.map((name, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.9rem' }}>{i + 1}. {name}</span>
                  <Result value={form.characteristics[i]} onChange={v => setChar(i, v)} opts={RESULT_OPTIONS} />
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>สรุปผลคุณลักษณะฯ</span>
                <Result value={form.characteristicsOverall} onChange={v => setForm(f => ({ ...f, characteristicsOverall: v }))} opts={RESULT_OPTIONS} />
              </div>
            </div>

            <div className="stu-info-card" style={{ marginBottom: '1.25rem' }}>
              <div className="stu-info-card-title">การประเมินอื่น</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.4rem 0' }}>
                <span style={{ fontSize: '0.9rem' }}>การอ่าน คิดวิเคราะห์ และเขียน</span>
                <Result value={form.readingThinkingWriting} onChange={v => setForm(f => ({ ...f, readingThinkingWriting: v }))} opts={RESULT_OPTIONS} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.4rem 0' }}>
                <span style={{ fontSize: '0.9rem' }}>กิจกรรมพัฒนาผู้เรียน</span>
                <Result value={form.learnerActivities} onChange={v => setForm(f => ({ ...f, learnerActivities: v }))} opts={ACTIVITY_OPTIONS} />
              </div>
            </div>

            <button className="ez-btn ez-btn-primary" style={{ width: '100%', minHeight: 48, fontSize: '0.95rem', opacity: dirty ? 1 : 0.6 }} onClick={doSave} disabled={!dirty}>
              {dirty ? 'บันทึกผลการประเมิน' : 'บันทึกแล้ว ✓'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
