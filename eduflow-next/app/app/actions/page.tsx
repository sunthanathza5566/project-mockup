'use client';

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ACTION_TRANSITIONS, can, createActionItem, createActionsFromAfi, deleteActionItem, isActiveUser, listActionItems, listRequirements,
  listUsers, programmeScope, setActionStatus, updateActionItem,
} from '@/lib/api';
import type { ActionItem, ActionStatus, AppUser } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, AsyncButton, Badge, Empty, InlineMessage, PageHeader, useLoad } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import Term from '@/components/ui/Term';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/primitives/table';
import { Textarea } from '@/components/ui/primitives/textarea';
import { cn } from '@/lib/ui/cn';
import { ACTION_STATUS_VIEW } from '@/lib/ui/status';
import { TONE_TEXT } from '@/lib/ui/tone';
import { notifyTodosChanged } from '@/lib/ui/todo';
import { useScope } from '@/components/aunqa/useScope';
import { ACTION_BTN_TH, ACTION_STATUS_TH, errMsg, fmtDate } from '@/lib/ui/aunqa';

const STATUSES: ActionStatus[] = ['open', 'in_progress', 'done', 'verified'];

/** §F13 การ์ด (rounded-xl, p-5 md:p-6) */
const CARD = 'rounded-xl border bg-card p-5 shadow-sm dark:shadow-none md:p-6';
/** saas-spec §C5 มือถือ: แถวเป็นการ์ดย่อย + ป้ายคอลัมน์จาก data-label */
const STACK_TD =
  'max-md:block max-md:px-0 max-md:py-1 max-md:before:block max-md:before:text-sm max-md:before:font-medium max-md:before:text-muted-foreground max-md:before:content-[attr(data-label)]';
/** ปลายทางแจ้งเตือน (friendly-spec §F3.3): `/app/actions#action-{encodeURIComponent(id)}` */
const HASH_PREFIX = 'action-';

/** อ่าน id ของ action จาก hash ปัจจุบัน (ถอด percent-encoding) — ไม่ตรงรูปแบบ = null */
function hashActionId(): string | null {
  const raw = window.location.hash.slice(1);
  if (!raw) return null;
  let h = raw;
  try { h = decodeURIComponent(raw); } catch { /* hash เสีย → ใช้ค่าดิบ */ }
  return h.startsWith(HASH_PREFIX) && h.length > HASH_PREFIX.length ? h.slice(HASH_PREFIX.length) : null;
}

/**
 * แผนปรับปรุง (ADR-UI-001 pages.md P14 · saas-spec §P14 · friendly-spec §F13): สร้าง/แก้/เปลี่ยนสถานะตามสิทธิ์ · สร้างจาก AFI ·
 * verified → หลักฐานขั้น A รอบถัดไป · ตัวกรองอ่าน ?status= · คง testid เดิม
 * deep link (§F3.3): แถว `id="action-{id}"` — hash ตรง → เลื่อนมาที่แถว + `animate-highlight` (ย้ายหลักสูตร/ล้างตัวกรองให้ถ้าแถวถูกซ่อน)
 */
export default function ActionsPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}

function Inner() {
  const { user, programmes, cycles, programmeId, setProgrammeId } = useScope();
  const { showToast } = useToast();
  const { confirm, prompt } = useDialog();
  const qs = useSearchParams().get('status') as ActionStatus | null;
  const [statusF, setStatusF] = useState<ActionStatus | 'all'>(qs && STATUSES.includes(qs) ? qs : 'all');
  const [form, setForm] = useState<ActionItem | 'new' | null>(null);
  /** action ที่ถูกชี้จาก hash (ไฮไลต์) + ตัวนับรอบ เพื่อเล่น animation ซ้ำเมื่อกดลิงก์เดิมอีกครั้ง */
  const [hl, setHl] = useState<{ id: string; n: number } | null>(null);
  const handled = useRef<string>('');

  const q = useLoad(() => {
    if (!programmeId) return null;
    return {
      items: listActionItems(user, programmeId),
      people: listUsers(user.universityId).filter(u => can(u as AppUser, 'read', programmeScope(programmeId))),
    };
  }, [user.id, programmeId]);

  const canCreate = !!programmeId && can(user, 'action.write', programmeScope(programmeId));
  const released = cycles.filter(c => c.status === 'assessed' || c.status === 'closed');

  // ─── deep link: ตรวจ hash ตอนโหลดเสร็จ, hashchange/popstate และหลังคลิกลิงก์ในหน้าเดียวกัน (router ไม่ยิง hashchange) ───
  const items = q.data?.items;
  // `handled` = hash ล่าสุดที่จัดการแล้ว (ไฮไลต์แล้ว หรือหาไม่เจอในทุกหลักสูตร) — hash เดิมไม่ทำซ้ำ (ยกเว้น hashchange ด้านล่าง)
  const checkHash = useCallback(() => {
    const key = window.location.hash;
    if (key === handled.current) return;
    const id = hashActionId();
    if (!id) { handled.current = key; return; }
    if (!items) return; // ยังโหลดไม่เสร็จ — effect เรียกใหม่เมื่อ items มา
    const here = items.find(a => a.id === id);
    if (!here) {
      // อยู่หลักสูตรอื่นที่ผู้ใช้เข้าถึงได้ → สลับหลักสูตร (โหลดเสร็จแล้ว effect นี้ทำงานอีกรอบ)
      const other = programmes.find(p => {
        if (p.id === programmeId) return false;
        try { return listActionItems(user, p.id).some(a => a.id === id); } catch { return false; }
      });
      if (other) setProgrammeId(other.id); else handled.current = key;
      return;
    }
    handled.current = key;
    setStatusF(s => (s !== 'all' && here.status !== s ? 'all' : s));
    setHl(prev => ({ id, n: (prev?.n ?? 0) + 1 }));
  }, [items, programmes, programmeId, user, setProgrammeId]);

  useEffect(() => { checkHash(); }, [checkHash]);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const later = () => { if (t) clearTimeout(t); t = setTimeout(checkHash, 80); };
    // hashchange = มีคนชี้มาที่แถวนี้จริง (รวมแจ้งเตือนที่ยิงซ้ำด้วย hash เดิม — R2-F8 minor) → ล้าง `handled` ให้ไฮไลต์ซ้ำได้
    const again = () => { handled.current = ''; later(); };
    window.addEventListener('hashchange', again);
    window.addEventListener('popstate', later);
    document.addEventListener('click', later, true);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener('hashchange', again);
      window.removeEventListener('popstate', later);
      document.removeEventListener('click', later, true);
    };
  }, [checkHash]);

  // เลื่อนไปแถวที่ไฮไลต์ + เล่น animation ใหม่ทุกครั้งที่ถูกชี้ (ลบ class → reflow → ใส่คืน)
  useLayoutEffect(() => {
    if (!hl) return;
    const el = document.getElementById(`${HASH_PREFIX}${hl.id}`);
    if (!el) return;
    el.classList.remove('animate-highlight');
    void el.offsetWidth;
    el.classList.add('animate-highlight');
    el.scrollIntoView({ block: 'center' });
    el.focus({ preventScroll: true });
  }, [hl]);

  async function fromAfi(cycleId: string) {
    try {
      const made = createActionsFromAfi(user, cycleId);
      notifyTodosChanged();
      showToast(made.length ? `สร้าง action ${made.length} รายการจาก AFI แล้ว` : 'ไม่มี AFI ใหม่ที่ต้องสร้าง (สร้างครบแล้วหรือกรรมการยังไม่ได้ระบุ)', made.length ? 'success' : 'info');
      q.reload();
    } catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function change(a: ActionItem, to: ActionStatus) {
    let note: string | undefined;
    if (to === 'verified') {
      if (!(await confirm({ title: 'ตรวจรับ action', message: 'เมื่อตรวจรับแล้ว action นี้จะกลายเป็นหลักฐานขั้น A (Act) ในรอบประเมินถัดไปโดยอัตโนมัติ', confirmText: 'ยืนยันตรวจรับ' }))) return;
    } else if (to === 'done') {
      const r = await prompt({ title: 'ทำเสร็จแล้ว', message: 'สรุปผลที่ทำได้ (ไม่บังคับ)', placeholder: 'เช่น จัดอบรมแล้ว 2 ครั้ง', confirmText: 'ยืนยันทำเสร็จแล้ว' });
      if (r === null) return;
      note = r || undefined;
    }
    try { setActionStatus(user, a.id, to, note); showToast(`เปลี่ยนสถานะเป็น “${ACTION_STATUS_TH[to]}” แล้ว`, 'success'); notifyTodosChanged(); q.reload(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function del(a: ActionItem) {
    if (!(await confirm({ title: 'ลบ action', message: 'ลบรายการนี้?', variant: 'danger', confirmText: 'ยืนยันลบ' }))) return;
    try { deleteActionItem(user, a.id); showToast('ลบแล้ว', 'success'); q.reload(); } catch (e) { showToast(errMsg(e), 'error'); }
  }

  return (
    <>
      <PageHeader title="แผนปรับปรุง (Action plan)" sub="ติดตามสิ่งที่ต้องปรับปรุงจากผลประเมินและการตรวจภายใน"
        actions={canCreate && !form ? <Button onClick={() => setForm('new')} data-testid="act-new"><Icon name="plus" size={20} />เพิ่มรายการ</Button> : undefined} />
      <InlineMessage tone="info" icon="list-check" className="mb-6">รายการที่ตรวจรับแล้ว จะกลายเป็นหลักฐานขั้น A ในรอบถัดไปโดยอัตโนมัติ <Term k="pdca" label="PDCA" /></InlineMessage>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <NativeSelect wrapperClassName="w-full sm:w-auto sm:min-w-[20rem]" value={programmeId} onChange={e => setProgrammeId(e.target.value)} aria-label="หลักสูตร" data-testid="act-programme">
          {programmes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.nameTh}</option>)}
        </NativeSelect>
        <NativeSelect wrapperClassName="w-full sm:w-auto sm:min-w-[12rem]" value={statusF} onChange={e => setStatusF(e.target.value as ActionStatus | 'all')} aria-label="กรองสถานะ" data-testid="act-filter">
          <option value="all">ทุกสถานะ</option>
          {STATUSES.map(s => <option key={s} value={s}>{ACTION_STATUS_TH[s]}</option>)}
        </NativeSelect>
      </div>

      {canCreate && released.length > 0 && (
        <div className={cn(CARD, 'mb-6 flex flex-wrap items-center gap-3')} data-testid="afi-box">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true">
            <Icon name="sparkle" size={20} />
          </span>
          <strong className="min-w-0 flex-1 basis-60 font-medium text-foreground">สร้างจากข้อเสนอแนะของกรรมการ (AFI):</strong>
          <div className="flex flex-wrap gap-2">
            {released.map(c => <AsyncButton key={c.id} variant="outline" size="compact" testId={`afi-${c.id}`} onClick={() => fromAfi(c.id)}>รอบ {c.academicYear}</AsyncButton>)}
          </div>
        </div>
      )}

      <Async q={q}>{d => !d ? <Empty icon="book-open" title="ยังไม่มีหลักสูตรที่เข้าถึงได้" /> : (
        <>
          {form && <ActionForm user={user} programmeId={programmeId} item={form === 'new' ? null : form} people={d.people
            // review minor #3: เลือกได้เฉพาะบัญชี active · คงผู้รับผิดชอบเดิมที่ถูกระงับไว้ตอนแก้ ไม่ให้ select ว่าง
            // P8 (R2-F11): ผู้รับผิดชอบต้องทำรายการได้จริง (action.write ของตนในหลักสูตรนี้) — ไม่ใช่ผู้ดูแลระบบ/คณบดี
            .filter(p => (isActiveUser(p) && can(p as AppUser, 'action.write', programmeScope(programmeId, { ownerUserId: p.id })))
              || (form !== 'new' && p.id === form.ownerUserId))
            .map(p => ({ id: p.id, name: p.fullName }))}
            cycles={cycles.map(c => ({ id: c.id, label: `รอบ ${c.academicYear}` }))} onClose={() => setForm(null)} onDone={() => { setForm(null); q.reload(); }} />}
          {(() => {
            const shown = d.items.filter(a => statusF === 'all' || a.status === statusF);
            const name = (id?: string) => d.people.find(p => p.id === id)?.fullName ?? '—';
            if (shown.length === 0) return d.items.length
              ? <Empty icon="filter" title="ไม่มีรายการในสถานะนี้" action={<Button variant="outline" onClick={() => setStatusF('all')}>แสดงทุกสถานะ</Button>} />
              : <Empty icon="list-check" title="ยังไม่มีแผนปรับปรุง" text="สร้างจากข้อเสนอแนะของกรรมการ (AFI) หลังประเมิน หรือเพิ่มเอง"
                  action={canCreate ? <Button onClick={() => setForm('new')}><Icon name="plus" size={20} />เพิ่มรายการ</Button> : undefined} />;
            return (
              <Table data-testid="action-table" className="max-md:block" wrapperClassName="rounded-xl shadow-sm dark:shadow-none">
                <TableHeader className="max-md:sr-only">
                  <tr><TableHead>ข้อ</TableHead><TableHead>รายละเอียด</TableHead><TableHead>ผู้รับผิดชอบ</TableHead><TableHead>กำหนด</TableHead><TableHead>สถานะ</TableHead><TableHead><span className="sr-only">การกระทำ</span></TableHead></tr>
                </TableHeader>
                <TableBody className="max-md:block">
                  {shown.map(a => {
                    const scope = programmeScope(a.programmeId, { ownerUserId: a.ownerUserId });
                    const nexts = ACTION_TRANSITIONS.filter(t => t.from === a.status && can(user, t.action, scope) && !(t.to === 'verified' && a.ownerUserId === user.id));
                    const editable = (a.status === 'open' || a.status === 'in_progress') && can(user, 'action.write', scope);
                    const overdue = a.due && a.status !== 'verified' && a.status !== 'done' && new Date(`${a.due}T23:59:59`).getTime() < Date.now();
                    const isHl = hl?.id === a.id;
                    return (
                      <TableRow key={a.id} id={`${HASH_PREFIX}${a.id}`} data-testid={`action-${a.id}`}
                        tabIndex={isHl ? -1 : undefined} data-highlight={isHl || undefined}
                        className={cn('scroll-mt-24 max-md:block max-md:p-4', isHl && 'animate-highlight')}>
                        <TableCell data-label="ข้อ" className={cn('whitespace-nowrap', STACK_TD)}>
                          <Link className="inline-flex min-h-11 items-center font-semibold tabular-nums text-primary underline-offset-4 hover:underline max-md:min-h-0" href="/app/requirements">{a.requirementId}</Link>
                        </TableCell>
                        <TableCell data-label="รายละเอียด" className={cn('min-w-[16rem]', STACK_TD)}>
                          <div className="space-y-1">
                            <p className="m-0 text-foreground">{a.description}</p>
                            {a.kpi && <p className="aq-meta m-0">KPI: {a.kpi}</p>}
                            {a.evidenceId && <div><Badge tone="ok">เป็นหลักฐานขั้น A แล้ว</Badge></div>}
                          </div>
                        </TableCell>
                        <TableCell data-label="ผู้รับผิดชอบ" className={STACK_TD}>{name(a.ownerUserId)}</TableCell>
                        <TableCell data-label="กำหนด" className={STACK_TD}>
                          <div className="whitespace-nowrap">{fmtDate(a.due)}</div>
                          {overdue && <div className="mt-1"><Badge tone="bad" icon="clock">เลยกำหนด</Badge></div>}
                        </TableCell>
                        <TableCell data-label="สถานะ" className={STACK_TD}>
                          <Badge tone={ACTION_STATUS_VIEW[a.status].tone} icon={ACTION_STATUS_VIEW[a.status].icon} testId="action-status">{ACTION_STATUS_TH[a.status]}</Badge>
                        </TableCell>
                        <TableCell className="max-md:block max-md:px-0 max-md:pb-0 max-md:pt-3">
                          <div className="flex flex-wrap items-center gap-2 md:justify-end">
                            {nexts.map(t => <Button key={t.to} size="compact" className="whitespace-nowrap" onClick={() => change(a, t.to)} data-testid={`action-to-${t.to}`}>{t.to === 'in_progress' ? (a.status === 'done' ? 'กลับไปทำต่อ' : 'เริ่มทำ') : ACTION_BTN_TH[t.to]}</Button>)}
                            {editable && <Button variant="outline" size="compact" onClick={() => setForm(a)}><Icon name="pencil" size={20} />แก้</Button>}
                            {a.status === 'open' && can(user, 'action.write', scope) && (
                              <Button variant="ghost" size="icon" onClick={() => del(a)} aria-label="ลบ" title="ลบ"><Icon name="trash" size={20} /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            );
          })()}
        </>
      )}</Async>
    </>
  );
}

const FIELD = 'grid min-w-0 gap-1.5';
const LABEL = 'font-medium text-foreground';

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
  // P8 (R2-F11): เตือน (ไม่บล็อก) เมื่อเลือกวันกำหนดในอดีต — เทียบวันท้องถิ่น
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const pastDue = !!f.due && f.due < todayIso && f.due !== (item?.due ?? '');
  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (item) updateActionItem(user, item.id, { description: f.desc, ownerUserId: f.owner || undefined, due: f.due || undefined, kpi: f.kpi || undefined });
      else createActionItem(user, { programmeId, requirementId: f.req, description: f.desc, ownerUserId: f.owner || undefined, due: f.due || undefined, kpi: f.kpi || undefined, originCycleId: f.origin || undefined });
      showToast(item ? 'บันทึกแล้ว' : 'เพิ่ม action แล้ว', 'success'); onDone();
    } catch (err) { showToast(errMsg(err), 'error'); }
  }
  return (
    <form className={cn(CARD, 'mb-6 space-y-5 animate-fade-in')} onSubmit={submit} data-testid="action-form">
      <h2 className="m-0 text-lg font-semibold text-foreground">{item ? 'แก้ action' : 'เพิ่ม action'}</h2>
      <label className={FIELD}><span className={LABEL}>ข้อที่เกี่ยวข้อง</span>
        <NativeSelect value={f.req} disabled={!!item} onChange={e => setF({ ...f, req: e.target.value })} data-testid="act-req">
          {reqs.map(r => <option key={r.id} value={r.id}>{r.id} — {r.textTh.slice(0, 60)}</option>)}
        </NativeSelect>
      </label>
      <label className={FIELD}><span className={LABEL}>รายละเอียดสิ่งที่จะทำ</span><Textarea rows={3} required value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} data-testid="act-desc" /></label>
      <div className="grid gap-5 md:grid-cols-3">
        <label className={FIELD}><span className={LABEL}>ผู้รับผิดชอบ</span>
          <NativeSelect value={f.owner} onChange={e => setF({ ...f, owner: e.target.value })} data-testid="act-owner">
            <option value="">— ยังไม่ระบุ —</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
        </label>
        <div className={FIELD}>
          <label className={FIELD}><span className={LABEL}>กำหนดเสร็จ</span><Input type="date" value={f.due} onChange={e => setF({ ...f, due: e.target.value })} data-testid="act-due" aria-describedby={pastDue ? 'act-due-past' : undefined} /></label>
          {pastDue && (
            <p id="act-due-past" className="aq-help m-0 flex items-start gap-1" data-testid="act-due-past">
              <Icon name="alert-triangle" size={16} className={cn('mt-1 shrink-0', TONE_TEXT.warn)} />วันที่นี้ผ่านมาแล้ว รายการจะขึ้นว่า “เลยกำหนด” ทันทีหลังบันทึก
            </p>
          )}
        </div>
        {!item && cycles.length > 0 && (
          <label className={FIELD}><span className={LABEL}>มาจากรอบ</span>
            <NativeSelect value={f.origin} onChange={e => setF({ ...f, origin: e.target.value })}>
              <option value="">— ไม่ระบุ —</option>
              {cycles.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </NativeSelect>
          </label>
        )}
      </div>
      <label className={FIELD}><span className={LABEL}>ตัวชี้วัดความสำเร็จ (KPI)</span><Input value={f.kpi} onChange={e => setF({ ...f, kpi: e.target.value })} data-testid="act-kpi" /></label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" data-testid="act-save">บันทึก</Button>
        <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
      </div>
    </form>
  );
}
