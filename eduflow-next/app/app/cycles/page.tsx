'use client';

/**
 * รายการรอบประเมิน + สร้างรอบใหม่ (ADR-UI-001 pages.md P6)
 * ตาราง: ปี | หลักสูตร | สถานะ | ความคืบหน้า (bar อนุมัติ n/53) | ขั้นถัดไปโดย | เปิด
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { can, createCycle, getProgramme, getProgrammes, isAssessorOf, listCycles, listSections, programmeScope } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Async, CycleStatusBadge, Empty, PageHeader, useLoad, useMe } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressRing';
import { errMsg, fmtDate } from '@/lib/ui/aunqa';
import { NEXT_ACTOR_TH } from '@/lib/ui/status';
import { notifyTodosChanged } from '@/lib/ui/todo';

export default function CyclesPage() {
  const user = useMe();
  const router = useRouter();
  const { showToast } = useToast();
  const q = useLoad(() => {
    const cycles = listCycles(user);
    return {
      cycles,
      approved: new Map(cycles.map(c => [c.id, listSections(user, c.id).filter(s => s.status === 'approved').length])),
      creatable: getProgrammes(user.universityId).filter(p => can(user, 'cycle.create', programmeScope(p.id))),
    };
  }, [user.id]);

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
      showToast(`สร้างรอบ ${c.academicYear} แล้ว — มี 53 ข้อพร้อมให้มอบหมาย`, 'success');
      notifyTodosChanged();
      router.push(`/app/cycles/${c.id}`);
    } catch (err) {
      showToast(errMsg(err), 'error');
    } finally { setBusy(false); }
  }

  return (
    <Async q={q} skeleton="table">{({ cycles, approved, creatable }) => (
      <>
        <PageHeader
          title="รอบประเมิน"
          sub="รอบประเมินแต่ละปีของแต่ละหลักสูตร — เปิดดูแดชบอร์ดความพร้อมได้ที่นี่"
          actions={creatable.length > 0 && !open ? (
            <button type="button" className="aq-btn aq-btn-primary" onClick={() => setOpen(true)} data-testid="cycle-new">
              <Icon name="plus" size={20} />สร้างรอบใหม่
            </button>
          ) : undefined}
        />

        {creatable.length > 0 && open && (
          <form onSubmit={e => submit(e, creatable)} className="aq-card aq-form-grid" data-testid="cycle-form">
            <h2 className="aq-h2 aq-span-all">สร้างรอบประเมินใหม่</h2>
            <p className="aq-help aq-span-all">ระบบจะสร้างครบ 53 ข้อให้อัตโนมัติ</p>
            <div className="aq-field">
              <label htmlFor="cy-prog">หลักสูตร</label>
              <select id="cy-prog" className="aq-input" value={programmeId || creatable[0].id} onChange={e => { setProgrammeId(e.target.value); setCopyFrom(''); }} data-testid="cycle-programme">
                {creatable.map(p => { const pr = getProgramme(p.id); return <option key={p.id} value={p.id}>{pr?.code} — {pr?.nameTh}</option>; })}
              </select>
            </div>
            <div className="aq-field">
              <label htmlFor="cy-year">ปีการศึกษา (พ.ศ.) *</label>
              <input id="cy-year" className="aq-input" type="number" min={2500} max={2700} required aria-required="true" value={year} onChange={e => setYear(e.target.value)} data-testid="cycle-year" />
            </div>
            <div className="aq-field">
              <label htmlFor="cy-due">กำหนดส่ง SAR</label>
              <input id="cy-due" className="aq-input" type="date" value={due} onChange={e => setDue(e.target.value)} />
            </div>
            <div className="aq-field">
              <label htmlFor="cy-asm">วันประเมิน (ถ้าทราบ)</label>
              <input id="cy-asm" className="aq-input" type="date" value={assess} onChange={e => setAssess(e.target.value)} />
            </div>
            {cycles.some(c => c.programmeId === (programmeId || creatable[0].id)) && (
              <div className="aq-field aq-span-all">
                <label htmlFor="cy-copy">คัดลอกร่างและลิงก์หลักฐานจากรอบก่อน</label>
                <p className="aq-help">ไม่ต้องคัดลอกไฟล์</p>
                <select id="cy-copy" className="aq-input" value={copyFrom} onChange={e => setCopyFrom(e.target.value)}>
                  <option value="">ไม่คัดลอก</option>
                  {cycles.filter(c => c.programmeId === (programmeId || creatable[0].id)).map(c => <option key={c.id} value={c.id}>ปี {c.academicYear}</option>)}
                </select>
              </div>
            )}
            <div className="aq-actions aq-span-all">
              <button className="aq-btn aq-btn-primary" disabled={busy} aria-busy={busy || undefined} data-testid="cycle-submit">
                {busy ? <><span className="aq-spinner" aria-hidden="true" />กำลังสร้าง…</> : 'สร้างรอบ'}
              </button>
              <button type="button" className="aq-btn aq-btn-ghost" onClick={() => setOpen(false)}>ยกเลิก</button>
            </div>
          </form>
        )}

        {cycles.length === 0 ? (
          <Empty icon="calendar-cycle" title="ยังไม่มีรอบประเมินที่คุณเข้าถึงได้" />
        ) : (
          <div className="aq-card">
            <div className="aq-table-wrap">
              <table className="aq-table aq-table--stack" data-testid="cycles-table">
                <thead><tr><th>ปี</th><th>หลักสูตร</th><th>สถานะ</th><th>ความคืบหน้า</th><th>ขั้นถัดไปโดย</th><th><span className="aq-sr-only">เปิด</span></th></tr></thead>
                <tbody>
                  {cycles.map(c => {
                    const a = approved.get(c.id) ?? 0;
                    return (
                      <tr key={c.id}>
                        <td data-label="ปี"><strong className="aq-tnum">{c.academicYear}</strong>{c.revision > 1 && <div className="aq-meta">revision {c.revision}</div>}</td>
                        <td data-label="หลักสูตร"><div>{getProgramme(c.programmeId)?.nameTh}<div className="aq-meta">กำหนดส่ง {fmtDate(c.submissionDue)}</div></div></td>
                        <td data-label="สถานะ"><CycleStatusBadge status={c.status} /></td>
                        <td data-label="ความคืบหน้า"><ProgressBar value={a} max={53} label={`อนุมัติ ${a}/53`} /></td>
                        <td data-label="ขั้นถัดไปโดย">{NEXT_ACTOR_TH[c.status]}</td>
                        <td>
                          <div className="aq-cluster">
                            <Link className="aq-btn aq-btn-compact" href={`/app/cycles/${c.id}`}>เปิด<Icon name="chevron-right" size={20} /></Link>
                            {(isAssessorOf(user, c.id) || c.status === 'assessed' || c.status === 'closed') && (
                              <Link className="aq-btn aq-btn-ghost aq-btn-compact" href={`/app/cycles/${c.id}/assess`} data-testid={`assess-link-${c.id}`}>ผลประเมิน</Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    )}</Async>
  );
}
