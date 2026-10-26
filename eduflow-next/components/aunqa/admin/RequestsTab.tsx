'use client';

/**
 * แท็บ "คำขอเข้าใช้งาน" (friendly-spec §F8.2 · ADR-AUTH-001 O2)
 * - การ์ดต่อคำขอ `req-{userId}`: ชื่อ · อีเมล · ส่งเมื่อ · หน่วยงานที่ขอ · ตำแหน่ง · เหตุผล (blockquote)
 *   + เลือก "บทบาทที่ให้" (`req-role-{id}`, ค่าเริ่ม programme_staff, ไม่มี super_admin เว้นผู้อนุมัติเป็น super)
 *   + "ขอบเขต" (`req-scope-{id}`, ค่าเริ่ม = หน่วยงานที่ขอ) → [อนุมัติคำขอ] [ปฏิเสธ] (ห่าง 16px)
 * - ขอบเขตสร้างจาก `universityId` ของคำขอ (super_admin เห็นคำขอทุกมหาวิทยาลัย — แสดงชื่อมหาวิทยาลัยกำกับ)
 * - อนุมัติ → toast + การ์ดหาย + ตัวนับลด + `aunqa:todos-changed` (ตัวนับเมนู) · ปฏิเสธ → prompt เหตุผล (ไม่บังคับ)
 * - ว่าง = Empty icon inbox · โหลด/ผิดพลาด = Async (skeleton cards / ErrorBox)
 */
import { useState } from 'react';
import type { AccessRequestView, AppUser, RoleCode } from '@/lib/types';
import {
  approveAccessRequest, getFaculties, getProgrammes, getUniversity, listAccessRequests, listCycles, rejectAccessRequest,
} from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { useLang } from '@/context/LangContext';
import { Async, AsyncButton, Empty, InlineMessage, useLoad } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { ROLE_TH, errMsg } from '@/lib/ui/aunqa';
import { relativeTime } from '@/lib/ui/notification';
import { notifyTodosChanged } from '@/lib/ui/todo';
import { CARD, LABEL, grantableRoles, parseScope, scopeOptions, type ScopeOption } from './shared';

/** ป้ายหน่วยงานที่ขอ + key ขอบเขตเริ่มต้น (ตรงกับรายการใน scopeOptions) */
function requestedUnit(r: AccessRequestView): { label: string; key: string } {
  if (r.programmeId) {
    const p = getProgrammes(r.universityId).find(x => x.id === r.programmeId);
    if (p) return { label: `หลักสูตร ${p.code}`, key: `programme:${p.id}` };
  }
  if (r.facultyId) {
    const f = getFaculties(r.universityId).find(x => x.id === r.facultyId);
    if (f) return { label: `คณะ ${f.nameTh}`, key: `faculty:${f.id}` };
  }
  return { label: 'ทั้งมหาวิทยาลัย', key: `university:${r.universityId}` };
}

export default function RequestsTab({ user, onChanged }: { user: AppUser; onChanged: () => void }) {
  const q = useLoad(() => {
    const rows = listAccessRequests(user);
    const cycles = listCycles(user);
    const scopesByUni = new Map<string, ScopeOption[]>();
    rows.forEach(r => { if (!scopesByUni.has(r.universityId)) scopesByUni.set(r.universityId, scopeOptions(r.universityId, cycles)); });
    return { rows, scopesByUni };
  }, [user.id]);

  return (
    <Async q={q} skeleton="cards">{({ rows, scopesByUni }) => rows.length === 0 ? (
      <Empty icon="inbox" title="ไม่มีคำขอรออนุมัติ" text={'คำขอจากหน้า "ขอเข้าใช้งาน" จะมาแสดงที่นี่'} />
    ) : (
      <ul className="grid list-none gap-4" aria-label="คำขอเข้าใช้งาน">
        {rows.map(r => (
          <RequestCard
            key={r.userId} user={user} req={r} scopes={scopesByUni.get(r.universityId) ?? []}
            onDone={() => { q.reload(); onChanged(); notifyTodosChanged(); }}
          />
        ))}
      </ul>
    )}</Async>
  );
}

function RequestCard({ user, req, scopes, onDone }: {
  user: AppUser; req: AccessRequestView; scopes: ScopeOption[]; onDone: () => void;
}) {
  const { showToast } = useToast();
  const { prompt } = useDialog();
  const { lang } = useLang();
  const unit = requestedUnit(req);
  const roles = grantableRoles(user);
  const [role, setRole] = useState<RoleCode>('programme_staff');
  const [scope, setScope] = useState(scopes.some(s => s.key === unit.key) ? unit.key : scopes[0]?.key ?? '');
  const otherUni = req.universityId !== user.universityId ? getUniversity(req.universityId) : undefined;
  const id = req.userId;

  async function approve() {
    try {
      approveAccessRequest(user, id, [{ role, ...parseScope(scope) }]);
      showToast(`อนุมัติแล้ว — ${req.fullName} เข้าสู่ระบบได้ทันที`, 'success');
      onDone();
    } catch (e) { showToast(errMsg(e), 'error'); }
  }

  async function reject() {
    const note = await prompt({
      title: 'ปฏิเสธคำขอ',
      message: `ปฏิเสธคำขอของ ${req.fullName}? ข้อมูลผู้ขอจะถูกลบออกจากระบบ`,
      placeholder: 'เหตุผล (ไม่บังคับ)', variant: 'danger', confirmText: 'ยืนยันปฏิเสธ', required: false,
    });
    if (note === null) return;
    try {
      rejectAccessRequest(user, id, note.trim() || undefined);
      showToast('ปฏิเสธคำขอแล้ว — ลบข้อมูลผู้ขอออกจากระบบ', 'success');
      onDone();
    } catch (e) { showToast(errMsg(e), 'error'); }
  }

  return (
    <li className={CARD} data-testid={`req-${id}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="text-lg font-semibold text-foreground">{req.fullName}</h3>
        <span className="aq-meta break-all">{req.email}</span>
        <span className="aq-meta">
          <span>ส่งเมื่อ</span>{' '}
          <time dateTime={new Date(req.requestedAt).toISOString()}>{relativeTime(req.requestedAt, Date.now(), lang)}</time>
        </span>
      </div>
      {otherUni && <p className="aq-meta mt-1">{lang === 'en' ? otherUni.nameEn : otherUni.nameTh}</p>}
      {/* S-07: ระบบยังไม่ยืนยันอีเมล (ข-06) → เตือนผู้อนุมัติให้ตรวจตัวตนเอง */}
      <InlineMessage tone="warn" className="mt-3" testId={`req-unverified-${id}`}>
        อีเมลนี้ยังไม่ได้ยืนยัน — ตรวจสอบตัวตนผู้ขอก่อนอนุมัติ
      </InlineMessage>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-base sm:grid-cols-[max-content_minmax(0,1fr)]">
        <dt className="text-muted-foreground">หน่วยงานที่ขอ</dt>
        <dd className="text-foreground">{unit.label}</dd>
        {req.positionText && (
          <>
            <dt className="text-muted-foreground">ตำแหน่ง/หน้าที่</dt>
            <dd className="text-foreground">{req.positionText}</dd>
          </>
        )}
        <dt className="text-muted-foreground">เหตุผลที่ขอใช้งาน</dt>
        <dd>
          <blockquote className="whitespace-pre-line break-words border-l-2 border-input pl-3 text-muted-foreground">{req.reason}</blockquote>
        </dd>
      </dl>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`req-role-${id}`} className={LABEL}>บทบาทที่ให้</label>
          <NativeSelect id={`req-role-${id}`} value={role} onChange={e => setRole(e.target.value as RoleCode)} data-testid={`req-role-${id}`}>
            {roles.map(r => <option key={r} value={r}>{ROLE_TH[r]}</option>)}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`req-scope-${id}`} className={LABEL}>ขอบเขต</label>
          <NativeSelect id={`req-scope-${id}`} value={scope} onChange={e => setScope(e.target.value)} data-testid={`req-scope-${id}`}>
            {scopes.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </NativeSelect>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-4">
        <AsyncButton variant="default" testId={`req-approve-${id}`} busyText="กำลังอนุมัติ…" onClick={approve}>
          <Icon name="check" size={20} />อนุมัติคำขอ
        </AsyncButton>
        <AsyncButton variant="destructiveOutline" testId={`req-reject-${id}`} onClick={reject}>
          ปฏิเสธ
        </AsyncButton>
      </div>
    </li>
  );
}
