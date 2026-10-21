'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ACTION_TRANSITIONS, can, createActionItem, createActionsFromAfi, deleteActionItem, listActionItems, listRequirements,
  listUsers, programmeScope, setActionStatus, updateActionItem,
} from '@/lib/api';
import type { ActionItem, ActionStatus, AppUser } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, AsyncButton, Badge, Empty, PageHeader, useLoad } from '@/components/aunqa/common';
import { useScope } from '@/components/aunqa/useScope';
import { ACTION_BTN_TH, ACTION_STATUS_TH, errMsg, fmtDate } from '@/lib/ui/aunqa';

const STATUS_TONE = { open: 'neutral', in_progress: 'info', done: 'warn', verified: 'ok' } as const;
const STATUSES: ActionStatus[] = ['open', 'in_progress', 'done', 'verified'];

/** S15 แผนปรับปรุง (action plan): สร้าง/แก้/เปลี่ยนสถานะตามสิทธิ์ · สร้างจาก AFI ของกรรมการ · done/verified → หลักฐานขั้น A ในรอบถัดไป */
export default function ActionsPage() {
  const { user, programmes, cycles, programmeId, setProgrammeId } = useScope();
  const { showToast } = useToast();
  const { confirm, prompt } = useDialog();
  const [statusF, setStatusF] = useState<ActionStatus | 'all'>('all');
  const [form, setForm] = useState<ActionItem | 'new' | null>(null);

  const q = useLoad(() => {
    if (!programmeId) return null;
    return {
      items: listActionItems(user, programmeId),
      people: listUsers(user.universityId).filter(u => can(u as AppUser, 'read', programmeScope(programmeId))),
    };
  }, [user.id, programmeId]);

  const canCreate = !!programmeId && can(user, 'action.write', programmeScope(programmeId));
  const released = cycles.filter(c => c.status === 'assessed' || c.status === 'closed');

  async function fromAfi(cycleId: string) {
    try {
      const made = createActionsFromAfi(user, cycleId);
      showToast(made.length ? `สร้าง action ${made.length} รายการจาก AFI แล้ว` : 'ไม่มี AFI ใหม่ที่ต้องสร้าง (สร้างครบแล้วหรือกรรมการยังไม่ได้ระบุ)', made.length ? 'success' : 'info');
      q.reload();
    } catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function change(a: ActionItem, to: ActionStatus) {
    let note: string | undefined;
    if (to === 'verified') {
      if (!(await confirm({ title: 'ตรวจรับ action', message: 'เมื่อตรวจรับแล้ว action นี้จะกลายเป็นหลักฐานขั้น A (Act) ในรอบประเมินถัดไปโดยอัตโนมัติ' }))) return;
    } else if (to === 'done') {
      const r = await prompt({ title: 'ทำเสร็จแล้ว', message: 'สรุปผลที่ทำได้ (ไม่บังคับ)', placeholder: 'เช่น จัดอบรมแล้ว 2 ครั้ง' });
      if (r === null) return;
      note = r || undefined;
    }
    try { setActionStatus(user, a.id, to, note); showToast(`เปลี่ยนสถานะเป็น “${ACTION_STATUS_TH[to]}” แล้ว`, 'success'); q.reload(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function del(a: ActionItem) {
    if (!(await confirm({ title: 'ลบ action', message: 'ลบรายการนี้?', variant: 'danger', confirmText: 'ลบ' }))) return;
    try { deleteActionItem(user, a.id); showToast('ลบแล้ว', 'success'); q.reload(); } catch (e) { showToast(errMsg(e), 'error'); }
  }

  return (
    <>
      <PageHeader title="แผนปรับปรุง (Action plan)" sub="ติดตามสิ่งที่ต้องปรับปรุงจากผลประเมินและการตรวจภายใน — รายการที่ทำเสร็จและตรวจรับแล้วจะกลายเป็นหลักฐานขั้น A ในรอบถัดไป" />
      <div className="aq-toolbar">
        <select className="aq-input" value={programmeId} onChange={e => setProgrammeId(e.target.value)} aria-label="หลักสูตร" data-testid="act-programme">
          {programmes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.nameTh}</option>)}
        </select>
        <select className="aq-input aq-input-sm" value={statusF} onChange={e => setStatusF(e.target.value as ActionStatus | 'all')} aria-label="กรองสถานะ" data-testid="act-filter">
          <option value="all">ทุกสถานะ</option>
          {STATUSES.map(s => <option key={s} value={s}>{ACTION_STATUS_TH[s]}</option>)}
        </select>
        {canCreate && !form && <button className="aq-btn aq-btn-primary" onClick={() => setForm('new')} data-testid="act-new">+ เพิ่ม action</button>}
      </div>

      {canCreate && released.length > 0 && (
        <div className="aq-card aq-actions" data-testid="afi-box">
          <strong>สร้างจากข้อเสนอแนะของกรรมการ (AFI):</strong>
          {released.map(c => <AsyncButton key={c.id} className="aq-btn aq-btn-sm" testId={`afi-${c.id}`} onClick={() => fromAfi(c.id)}>รอบ {c.academicYear}</AsyncButton>)}
        </div>
      )}

      <Async q={q}>{d => !d ? <Empty text="ยังไม่มีหลักสูตรที่เข้าถึงได้" /> : (
        <>
          {form && <ActionForm user={user} programmeId={programmeId} item={form === 'new' ? null : form} people={d.people.map(p => ({ id: p.id, name: p.fullName }))}
            cycles={cycles.map(c => ({ id: c.id, label: `รอบ ${c.academicYear}` }))} onClose={() => setForm(null)} onDone={() => { setForm(null); q.reload(); }} />}
          {(() => {
            const items = d.items.filter(a => statusF === 'all' || a.status === statusF);
            const name = (id?: string) => d.people.find(p => p.id === id)?.fullName ?? '—';
            if (items.length === 0) return <Empty text={d.items.length ? 'ไม่มีรายการในสถานะนี้' : 'ยังไม่มี action item'} />;
            return (
              <div className="aq-card aq-table-wrap">
                <table className="aq-table" data-testid="action-table">
                  <thead><tr><th>ข้อ</th><th>รายละเอียด</th><th>ผู้รับผิดชอบ</th><th>กำหนด</th><th>สถานะ</th><th /></tr></thead>
                  <tbody>
                    {items.map(a => {
                      const scope = programmeScope(a.programmeId, { ownerUserId: a.ownerUserId });
                      const nexts = ACTION_TRANSITIONS.filter(t => t.from === a.status && can(user, t.action, scope) && !(t.to === 'verified' && a.ownerUserId === user.id));
                      const editable = (a.status === 'open' || a.status === 'in_progress') && can(user, 'action.write', scope);
                      const overdue = a.due && a.status !== 'verified' && a.status !== 'done' && new Date(`${a.due}T23:59:59`).getTime() < Date.now();
                      return (
                        <tr key={a.id} data-testid={`action-${a.id}`}>
                          <td><Link href={`/app/requirements`}>{a.requirementId}</Link></td>
                          <td>{a.description}{a.kpi && <div className="aq-muted">KPI: {a.kpi}</div>}{a.evidenceId && <div><Badge tone="ok">เป็นหลักฐานขั้น A แล้ว</Badge></div>}</td>
                          <td>{name(a.ownerUserId)}</td>
                          <td>{fmtDate(a.due)}{overdue && <div><Badge tone="bad">เลยกำหนด</Badge></div>}</td>
                          <td><Badge tone={STATUS_TONE[a.status]} testId="action-status">{ACTION_STATUS_TH[a.status]}</Badge></td>
                          <td className="aq-nowrap">
                            {nexts.map(t => <button key={t.to} className="aq-btn aq-btn-sm aq-btn-primary" onClick={() => change(a, t.to)} data-testid={`action-to-${t.to}`}>{ACTION_BTN_TH[t.to]}</button>)}
                            {editable && <> <button className="aq-btn aq-btn-sm" onClick={() => setForm(a)}>แก้</button></>}
                            {a.status === 'open' && can(user, 'action.write', scope) && <> <button className="aq-btn aq-btn-sm" onClick={() => del(a)} aria-label="ลบ">ลบ</button></>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </>
      )}</Async>
    </>
  );
}

function ActionForm({ user, programmeId, item, people, cycles, onClose, onDone }: {
  user: AppUser; programmeId: string; item: ActionItem | null; people: { id: string; name: string }[];
  cycles: { id: string; label: string }[]; onClose: () => void; onDone: () => void;
}) {
  const { showToast } = useToast();
  const reqs = listRequirements();
  const [f, setF] = useState({
    req: item?.requirementId ?? reqs[0]?.id ?? '', desc: item?.description ?? '', owner: item?.ownerUserId ?? '',
    due: item?.due ?? '', kpi: item?.kpi ?? '', origin: item?.originCycleId ?? '',
  });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (item) updateActionItem(user, item.id, { description: f.desc, ownerUserId: f.owner || undefined, due: f.due || undefined, kpi: f.kpi || undefined });
      else createActionItem(user, { programmeId, requirementId: f.req, description: f.desc, ownerUserId: f.owner || undefined, due: f.due || undefined, kpi: f.kpi || undefined, originCycleId: f.origin || undefined });
      showToast(item ? 'บันทึกแล้ว' : 'เพิ่ม action แล้ว', 'success'); onDone();
    } catch (err) { showToast(errMsg(err), 'error'); }
  }
  return (
    <form className="aq-card aq-form" onSubmit={submit} data-testid="action-form">
      <h2 className="aq-h2">{item ? 'แก้ action' : 'เพิ่ม action'}</h2>
      <label>ข้อที่เกี่ยวข้อง
        <select className="aq-input" value={f.req} disabled={!!item} onChange={e => setF({ ...f, req: e.target.value })} data-testid="act-req">
          {reqs.map(r => <option key={r.id} value={r.id}>{r.id} — {r.textTh.slice(0, 60)}</option>)}
        </select>
      </label>
      <label>รายละเอียดสิ่งที่จะทำ<textarea className="aq-textarea" rows={3} required value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} data-testid="act-desc" /></label>
      <div className="aq-form-inline">
        <label>ผู้รับผิดชอบ
          <select className="aq-input" value={f.owner} onChange={e => setF({ ...f, owner: e.target.value })} data-testid="act-owner">
            <option value="">— ยังไม่ระบุ —</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>กำหนดเสร็จ<input className="aq-input" type="date" value={f.due} onChange={e => setF({ ...f, due: e.target.value })} data-testid="act-due" /></label>
        {!item && cycles.length > 0 && (
          <label>มาจากรอบ
            <select className="aq-input" value={f.origin} onChange={e => setF({ ...f, origin: e.target.value })}>
              <option value="">— ไม่ระบุ —</option>
              {cycles.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        )}
      </div>
      <label>ตัวชี้วัดความสำเร็จ (KPI)<input className="aq-input" value={f.kpi} onChange={e => setF({ ...f, kpi: e.target.value })} data-testid="act-kpi" /></label>
      <div className="aq-actions"><button className="aq-btn aq-btn-primary" data-testid="act-save">บันทึก</button><button type="button" className="aq-btn" onClick={onClose}>ยกเลิก</button></div>
    </form>
  );
}
