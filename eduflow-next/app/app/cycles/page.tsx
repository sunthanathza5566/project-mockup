'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { can, createCycle, isAssessorOf, getProgramme, getProgrammes, listCycles, programmeScope } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Async, CycleStatusBadge, Empty, PageHeader, useLoad, useMe } from '@/components/aunqa/common';
import { errMsg, fmtDate } from '@/lib/ui/aunqa';

/** รายการรอบประเมิน + สร้างรอบใหม่ (สร้างครบ 53 ข้ออัตโนมัติ) */
export default function CyclesPage() {
  const user = useMe();
  const router = useRouter();
  const { showToast } = useToast();
  const q = useLoad(() => ({
    cycles: listCycles(user),
    creatable: getProgrammes(user.universityId).filter(p => can(user, 'cycle.create', programmeScope(p.id))),
  }), [user.id]);

  const [open, setOpen] = useState(false);
  const [programmeId, setProgrammeId] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear() + 543));
  const [due, setDue] = useState('');
  const [assess, setAssess] = useState('');
  const [copyFrom, setCopyFrom] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent, creatable: { id: string }[]) {
    e.preventDefault();
    const pid = programmeId || creatable[0]?.id;
    if (!pid) return;
    setBusy(true);
    try {
      const c = createCycle(user, {
        programmeId: pid, academicYear: Number(year),
        submissionDue: due || undefined, assessmentDate: assess || undefined,
        copyFromCycleId: copyFrom || undefined,
      });
      showToast('สร้างรอบประเมินแล้ว — มี 53 ข้อพร้อมมอบหมาย', 'success');
      router.push(`/app/cycles/${c.id}`);
    } catch (err) {
      showToast(errMsg(err), 'error');
    } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="รอบประเมิน" sub="รอบประเมินแต่ละปีของแต่ละหลักสูตร — เปิดดูแดชบอร์ดความพร้อมได้ที่นี่" />
      <Async q={q}>{({ cycles, creatable }) => (
        <>
          {creatable.length > 0 && (
            <div className="aq-card">
              {!open ? (
                <button className="aq-btn aq-btn-primary" onClick={() => setOpen(true)} data-testid="cycle-new">+ สร้างรอบใหม่</button>
              ) : (
                <form onSubmit={e => submit(e, creatable)} className="aq-form" data-testid="cycle-form">
                  <h2 className="aq-h2">สร้างรอบประเมินใหม่</h2>
                  <label>หลักสูตร
                    <select className="aq-input" value={programmeId || creatable[0].id} onChange={e => { setProgrammeId(e.target.value); setCopyFrom(''); }} data-testid="cycle-programme">
                      {creatable.map(p => <option key={p.id} value={p.id}>{p.code} — {p.nameTh}</option>)}
                    </select>
                  </label>
                  <label>ปีการศึกษา (พ.ศ.)
                    <input className="aq-input" type="number" min={2500} max={2700} required value={year} onChange={e => setYear(e.target.value)} data-testid="cycle-year" />
                  </label>
                  <label>กำหนดส่ง SAR
                    <input className="aq-input" type="date" value={due} onChange={e => setDue(e.target.value)} />
                  </label>
                  <label>วันประเมิน (ถ้าทราบ)
                    <input className="aq-input" type="date" value={assess} onChange={e => setAssess(e.target.value)} />
                  </label>
                  <label>คัดลอกร่างและลิงก์หลักฐานจากรอบก่อน (ไม่ต้องคัดลอกไฟล์)
                    <select className="aq-input" value={copyFrom} onChange={e => setCopyFrom(e.target.value)}>
                      <option value="">ไม่คัดลอก</option>
                      {cycles.filter(c => c.programmeId === (programmeId || creatable[0].id)).map(c => <option key={c.id} value={c.id}>ปี {c.academicYear}</option>)}
                    </select>
                  </label>
                  <div className="aq-actions">
                    <button className="aq-btn aq-btn-primary" disabled={busy} data-testid="cycle-submit">{busy ? 'กำลังสร้าง…' : 'สร้างรอบ'}</button>
                    <button type="button" className="aq-btn" onClick={() => setOpen(false)}>ยกเลิก</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {cycles.length === 0 ? <Empty text="ยังไม่มีรอบประเมินที่คุณเข้าถึงได้" /> : (
            <div className="aq-table-wrap aq-card">
              <table className="aq-table" data-testid="cycles-table">
                <thead><tr><th>ปี</th><th>หลักสูตร</th><th>สถานะ</th><th>กำหนดส่ง</th><th>revision</th><th /></tr></thead>
                <tbody>
                  {cycles.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.academicYear}</strong></td>
                      <td>{getProgramme(c.programmeId)?.nameTh}</td>
                      <td><CycleStatusBadge status={c.status} /></td>
                      <td>{fmtDate(c.submissionDue)}</td>
                      <td>{c.revision}</td>
                      <td><Link className="aq-btn aq-btn-sm" href={`/app/cycles/${c.id}`}>เปิดแดชบอร์ด</Link>{(isAssessorOf(user, c.id) || c.status === 'assessed' || c.status === 'closed') && <> <Link className="aq-btn aq-btn-sm" href={`/app/cycles/${c.id}/assess`} data-testid={`assess-link-${c.id}`}>ผลประเมิน</Link></>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}</Async>
    </>
  );
}
