'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getAcademicYears, createAcademicYear,
  getGradeLevels, createGradeLevel,
  getClassrooms, createClassroom,
  type AcademicYear, type GradeLevel, type Classroom,
} from '@/lib/api/academic.store';
import { useToast } from '@/context/ToastContext';

interface Props {
  adminUsername: string;
}

/**
 * โครงสร้างวิชาการ — แอดมินเท่านั้น
 * สร้าง ปีการศึกษา → ระดับชั้น → ห้องเรียน
 * (ครูจะเข้ามาสร้าง "รายวิชา" ในห้องที่แอดมินสร้างไว้ แล้วบันทึกคะแนนต่อ)
 */
export default function AcademicManager({ adminUsername }: Props) {
  const { showToast } = useToast();

  const [years,       setYears]       = useState<AcademicYear[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [classrooms,  setClassrooms]  = useState<Classroom[]>([]);

  const [selYear,  setSelYear]  = useState<string>('');
  const [selGrade, setSelGrade] = useState<string>('');

  const [newYear,  setNewYear]  = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newRoom,  setNewRoom]  = useState('');

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
    setClassrooms(selGrade ? getClassrooms(selGrade) : []);
  }, [selGrade, gradeLevels]);

  function handleCreateYear() {
    const y = newYear.trim();
    if (!/^\d{4}$/.test(y)) { showToast('⚠️ ปีการศึกษาต้องเป็นตัวเลข 4 หลัก เช่น 2568'); return; }
    const created = createAcademicYear(y, adminUsername);
    if (!created) { showToast('⚠️ ปีการศึกษานี้มีอยู่แล้ว'); return; }
    showToast(`✅ สร้างปีการศึกษา ${y} แล้ว`);
    setNewYear('');
    setYears(getAcademicYears());
    setSelYear(created.id);
  }

  function handleCreateGrade() {
    const g = newGrade.trim();
    if (!g) { showToast('⚠️ กรอกชื่อระดับชั้น เช่น ม.4'); return; }
    if (!selYear) { showToast('⚠️ เลือกปีการศึกษาก่อน'); return; }
    const created = createGradeLevel(selYear, g);
    if (!created) { showToast('⚠️ ระดับชั้นนี้มีอยู่แล้วในปีนี้'); return; }
    showToast(`✅ สร้างระดับชั้น ${g} แล้ว`);
    setNewGrade('');
    setGradeLevels(getGradeLevels(selYear));
    setSelGrade(created.id);
  }

  function handleCreateRoom() {
    const r = newRoom.trim();
    if (!r) { showToast('⚠️ กรอกเลขห้อง เช่น 3'); return; }
    if (!selGrade) { showToast('⚠️ เลือกระดับชั้นก่อน'); return; }
    const created = createClassroom(selYear, selGrade, r);
    if (!created) { showToast('⚠️ ห้องนี้มีอยู่แล้วในระดับชั้นนี้'); return; }
    const gradeName = gradeLevels.find(g => g.id === selGrade)?.name || '';
    showToast(`✅ สร้างห้อง ${gradeName}/${r} แล้ว — ครูสามารถสร้างรายวิชาในห้องนี้ได้`);
    setNewRoom('');
    setClassrooms(getClassrooms(selGrade));
  }

  const inputStyle: React.CSSProperties = {
    padding: '0.55rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8,
    fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', outline: 'none',
    background: 'var(--warm-white)', color: 'var(--text-body)', width: '100%',
  };

  const yearObj = years.find(y => y.id === selYear);

  return (
    <div className="dash-section">
      <div className="dash-section-title">🏫 โครงสร้างวิชาการ — ปีการศึกษา / ระดับชั้น / ห้องเรียน</div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        โครงสร้างนี้เป็นฐานของระบบบันทึกคะแนนและเอกสาร ปพ. — เฉพาะแอดมินสร้างได้
        ครูจะเห็นเฉพาะห้องที่สร้างไว้แล้ว และเข้าไปสร้างรายวิชา + บันทึกคะแนนเอง
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* ── ปีการศึกษา ── */}
        <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.1rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--brown-dark)', marginBottom: '0.75rem' }}>📅 ปีการศึกษา</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
            {years.map(y => (
              <button
                key={y.id}
                className={`dash-tab-btn${selYear === y.id ? ' active' : ''}`}
                style={{ justifyContent: 'space-between', display: 'flex' }}
                onClick={() => setSelYear(y.id)}
              >
                <span>ปีการศึกษา {y.year}</span>
                <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>โดย {y.createdBy}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input style={inputStyle} placeholder="เช่น 2568" value={newYear} onChange={e => setNewYear(e.target.value)} />
            <button className="dash-action-btn" style={{ whiteSpace: 'nowrap' }} onClick={handleCreateYear}>➕ สร้าง</button>
          </div>
        </div>

        {/* ── ระดับชั้น ── */}
        <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.1rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--brown-dark)', marginBottom: '0.75rem' }}>
            🎓 ระดับชั้น {yearObj ? `(ปี ${yearObj.year})` : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
            {gradeLevels.length === 0
              ? <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ยังไม่มีระดับชั้นในปีนี้</div>
              : gradeLevels.map(g => (
                  <button key={g.id} className={`dash-tab-btn${selGrade === g.id ? ' active' : ''}`} onClick={() => setSelGrade(g.id)}>
                    {g.name}
                  </button>
                ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input style={inputStyle} placeholder="เช่น ม.4" value={newGrade} onChange={e => setNewGrade(e.target.value)} />
            <button className="dash-action-btn" style={{ whiteSpace: 'nowrap' }} onClick={handleCreateGrade}>➕ สร้าง</button>
          </div>
        </div>

        {/* ── ห้องเรียน ── */}
        <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.1rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--brown-dark)', marginBottom: '0.75rem' }}>
            🚪 ห้องเรียน {selGrade ? `(${gradeLevels.find(g => g.id === selGrade)?.name || ''})` : ''}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.85rem' }}>
            {classrooms.length === 0
              ? <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ยังไม่มีห้องในระดับชั้นนี้</div>
              : classrooms.map(c => (
                  <span key={c.id} style={{ fontSize: '0.8rem', background: 'var(--warm-white)', border: '1px solid var(--border)', color: 'var(--brown-dark)', padding: '0.3rem 0.8rem', borderRadius: 50 }}>
                    {gradeLevels.find(g => g.id === c.gradeLevelId)?.name}/{c.room}
                  </span>
                ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input style={inputStyle} placeholder="เลขห้อง เช่น 3" value={newRoom} onChange={e => setNewRoom(e.target.value)} />
            <button className="dash-action-btn" style={{ whiteSpace: 'nowrap' }} onClick={handleCreateRoom}>➕ สร้าง</button>
          </div>
        </div>
      </div>
    </div>
  );
}
