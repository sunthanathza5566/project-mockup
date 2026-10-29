'use client';

/**
 * ผู้ดูแลระบบ `/app/admin` (friendly-spec §F8 · saas-spec §P18/C11 · ADR-AUTH-001)
 * แท็บ (button[role=tab] เดิม + ลูกศร/Home/End):
 *   ผู้ใช้และบทบาท (tab-users, user.manage) · คำขอเข้าใช้งาน + ตัวนับ (tab-requests, user.manage)
 *   · Audit log (tab-audit, audit.view) · ข้อมูลเดโม่ (tab-demo, **super_admin เท่านั้น** — A8.3)
 * แท็บเริ่มอ่านจาก `?tab=` (deep link ของแจ้งเตือน N12/N14: `?tab=requests` / `?tab=users`) — ค่าที่ไม่รู้จัก/ไม่มีสิทธิ์
 * = แท็บแรกที่เห็นได้ · กดแท็บแล้ว URL ตามไปด้วย (replace) เพื่อให้กดแจ้งเตือนซ้ำแล้วสลับแท็บได้
 * ไม่มีสิทธิ์ทั้งสองอย่าง = Empty icon lock · ตัวนับคำขอคำนวณใหม่หลังอนุมัติ/ปฏิเสธ และเมื่อ `aunqa:todos-changed`
 */
import { Suspense, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { countPendingAccessRequests } from '@/lib/api';
import { Empty, PageHeader, useMe } from '@/components/aunqa/common';
import { Button } from '@/components/ui/primitives/button';
import { canAny } from '@/lib/ui/aunqa';
import { TODOS_CHANGED_EVENT, countLabel } from '@/lib/ui/todo';
import { cn } from '@/lib/ui/cn';
import UsersTab from '@/components/aunqa/admin/UsersTab';
import RequestsTab from '@/components/aunqa/admin/RequestsTab';
import AuditTab from '@/components/aunqa/admin/AuditTab';
import DemoTab from '@/components/aunqa/admin/DemoTab';
import { isSuperAdmin } from '@/components/aunqa/admin/shared';

type Tab = 'users' | 'requests' | 'audit' | 'demo';
const TABS: Tab[] = ['users', 'requests', 'audit', 'demo'];
const isTab = (v: string | null): v is Tab => !!v && (TABS as string[]).includes(v);

export default function AdminPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}

function Inner() {
  const user = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const qs = useSearchParams().get('tab');
  const canUsers = canAny(user, 'user.manage');
  const canAudit = canAny(user, 'audit.view');
  const superUser = isSuperAdmin(user);

  const [pending, setPending] = useState(() => countPendingAccessRequests(user));
  const recount = useCallback(() => setPending(countPendingAccessRequests(user)), [user]);
  useEffect(() => {
    recount();
    window.addEventListener(TODOS_CHANGED_EVENT, recount);
    return () => window.removeEventListener(TODOS_CHANGED_EVENT, recount);
  }, [recount]);

  // N6 R2-F13: `short` = ป้ายบนจอ <480 ให้ทุกแท็บพอดีแถบ 358px (ไม่ถูกตัดเหลือ "Audi")
  const tabs: { k: Tab; label: string; short: string; show: boolean; testId: string; count?: number }[] = [
    { k: 'users', label: 'ผู้ใช้และบทบาท', short: 'ผู้ใช้', show: canUsers, testId: 'tab-users' },
    { k: 'requests', label: 'คำขอเข้าใช้งาน', short: 'คำขอ', show: canUsers, testId: 'tab-requests', count: pending },
    { k: 'audit', label: 'Audit log', short: 'Audit log', show: canAudit, testId: 'tab-audit' },
    { k: 'demo', label: 'ข้อมูลเดโม่', short: 'เดโม่', show: superUser, testId: 'tab-demo' },
  ];
  const shown = tabs.filter(t => t.show);
  const fromUrl = isTab(qs) && shown.some(t => t.k === qs) ? qs : null;
  const [tab, setTab] = useState<Tab | null>(fromUrl);
  // deep link ใหม่ขณะอยู่หน้านี้ (กดแจ้งเตือนจาก panel) → สลับแท็บตาม URL
  useEffect(() => { if (fromUrl) setTab(fromUrl); }, [fromUrl]);
  const active: Tab | undefined = shown.find(t => t.k === tab)?.k ?? shown[0]?.k;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (!active) {
    return (
      <>
        <PageHeader title="ผู้ดูแลระบบ" />
        <Empty icon="lock" title="คุณไม่มีสิทธิ์เข้าหน้านี้" text="หน้านี้สำหรับผู้ดูแลมหาวิทยาลัยและผู้ที่ดู audit log ได้"
          action={<Button asChild><Link href="/app">กลับหน้าหลัก</Link></Button>} />
      </>
    );
  }

  function choose(k: Tab) {
    setTab(k);
    router.replace(`${pathname}?tab=${k}`, { scroll: false });
  }
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = shown.findIndex(t => t.k === active);
    const n = e.key === 'ArrowRight' ? (i + 1) % shown.length : e.key === 'ArrowLeft' ? (i - 1 + shown.length) % shown.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? shown.length - 1 : -1;
    if (n < 0) return;
    e.preventDefault(); choose(shown[n].k); tabRefs.current[n]?.focus();
  }

  return (
    <>
      <PageHeader title="ผู้ดูแลระบบ" sub="จัดการผู้ใช้และบทบาท ตรวจ audit log (บันทึกถาวร แก้ไม่ได้)" />
      {/* R2-F10 (ui M1): แท็บไม่ตกบรรทัด — แถวเดียว เลื่อนแนวนอนได้เมื่อจอแคบ · เส้นใต้แถบใช้ inset shadow (overflow ตัด -mb-px) */}
      <div
        className="mb-6 flex flex-nowrap gap-1 overflow-x-auto overscroll-x-contain px-1 pt-1 [box-shadow:inset_0_-1px_0_hsl(var(--border))]"
        role="tablist" aria-label="ส่วนของผู้ดูแลระบบ" onKeyDown={onKey}
      >
        {shown.map((t, i) => {
          const sel = active === t.k;
          const n = t.count ? countLabel(t.count) : null;
          return (
            <button
              key={t.k} ref={el => { tabRefs.current[i] = el; }} type="button" role="tab" id={`admin-tab-${t.k}`}
              aria-selected={sel} aria-controls={`admin-panel-${t.k}`} tabIndex={sel ? 0 : -1}
              onClick={() => choose(t.k)} data-testid={t.testId}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 text-base font-medium text-muted-foreground',
                'transition-colors duration-fast hover:text-foreground aria-selected:border-primary aria-selected:text-foreground',
              )}
            >
              <span className="sm:hidden">{t.short}</span><span className="max-sm:hidden">{t.label}</span>
              {n && (
                <span className="aq-badge inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 tabular-nums text-primary-foreground">
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div id={`admin-panel-${active}`} role="tabpanel" aria-labelledby={`admin-tab-${active}`}>
        {active === 'users' && <UsersTab user={user} />}
        {active === 'requests' && <RequestsTab user={user} onChanged={recount} />}
        {active === 'audit' && <AuditTab user={user} />}
        {active === 'demo' && <DemoTab user={user} />}
      </div>
    </>
  );
}
