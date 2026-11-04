'use client';

/**
 * แท็บข้อมูลเดโม่ (friendly-spec §F8.3 · ADR-AUTH-001 A8.3) — หน้าแสดงแท็บนี้เฉพาะ super_admin
 * (`resetDemo` ของ non-super = forbidden อยู่แล้ว) · logic/testid `reset-demo` เดิม
 *
 * TASK-0003 S3d — ส่วน "ชุดข้อมูลทดสอบ" (scenario seed ของ db-engineer · `lib/mock-data/aunqa/scenarios/README.md`)
 * - loader ไม่ตรวจสิทธิ์เอง → คอมโพเนนต์นี้ไม่ render และ handler ไม่ทำงานถ้าไม่ใช่ super_admin (กันซ้ำกับ guard ของหน้า)
 * - รายการจาก `listScenarios()` จัดกลุ่มตาม `group` · ปุ่ม "โหลดเคสนี้" / "โหลดทุกเคส" / "รีเซ็ตเป็นข้อมูลมาตรฐาน"
 *   ทุกปุ่มยืนยันด้วย confirm (danger) ก่อน เพราะล้างข้อมูลทั้งหมด · ระหว่างโหลดปิดทุกปุ่ม + แถบสถานะ (โหลดทุกเคส ~5 วินาที)
 * - สำเร็จ: session ถูกล้างโดย loader → เก็บสรุป (เคส/บัญชี/ลิงก์เชิญ) ใน sessionStorage (`lib/ui/scenario-summary`)
 *   แล้วไป /login ซึ่งแสดง panel `login-scenario-summary`
 * - ผิดพลาด: dialog แจ้ง e.message (ไทยจาก loader) · ถ้า session หายไปแล้ว (ล้มหลังรีเซ็ต) พาไป /login
 * - ข้อความ titleTh/descriptionTh/roleTh/expectTh เป็นข้อมูล seed (ไม่แปล ตามหลัก dict-aunqa)
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AppUser } from '@/lib/types';
import { getCurrentUser, resetDemo } from '@/lib/api';
import {
  ALL_SCENARIOS_ID, listScenarios, loadScenarioPack, resetToStandardSeed,
  type ScenarioGroup, type ScenarioInfo, type ScenarioLoadResult,
} from '@/lib/mock-data/aunqa/scenarios';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { AsyncButton, InlineMessage } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { errMsg } from '@/lib/ui/aunqa';
import { saveScenarioSummary, type ScenarioSummary } from '@/lib/ui/scenario-summary';
import { CARD, isSuperAdmin } from './shared';

/** ลำดับและชื่อกลุ่ม (ตามหัวข้อตารางใน scenarios/README.md) */
const GROUPS: { k: ScenarioGroup; label: string }[] = [
  { k: 'cycle', label: 'รอบประเมินทุกสถานะ' },
  { k: 'section', label: 'รายข้อในรอบเดโม่ 2569' },
  { k: 'notification', label: 'แจ้งเตือน' },
  { k: 'user', label: 'ผู้ใช้และการรับผู้ใช้ใหม่' },
  { k: 'tenant', label: 'หลายมหาวิทยาลัย' },
  { k: 'evidence', label: 'หลักฐาน' },
  { k: 'action', label: 'แผนปรับปรุง' },
];

type Job = { kind: 'all' } | { kind: 'reset' } | { kind: 'one'; info: ScenarioInfo };

function pickCase(s: ScenarioInfo): ScenarioSummary['cases'][number] {
  return { id: s.id, titleTh: s.titleTh, accounts: s.accounts, paths: s.paths, expectTh: s.expectTh };
}

export default function DemoTab({ user }: { user: AppUser }) {
  const { confirm, notify } = useDialog();
  const { refresh } = useAuth();
  const router = useRouter();
  const allowed = isSuperAdmin(user);

  const list = useMemo(() => {
    try { return { items: listScenarios(), error: '' }; } catch (e) { return { items: [] as ScenarioInfo[], error: errMsg(e) }; }
  }, []);
  const grouped = useMemo(() => {
    return GROUPS.map(g => ({ ...g, items: list.items.filter(s => s.group === g.k) })).filter(g => g.items.length);
  }, [list.items]);

  const [busy, setBusy] = useState<Job['kind'] | null>(null);
  const [busyLabel, setBusyLabel] = useState('');

  if (!allowed) return null;

  async function run(job: Job) {
    if (!isSuperAdmin(user) || busy) return;
    const n = list.items.length;
    const ok = await confirm(
      job.kind === 'reset' ? {
        title: 'รีเซ็ตเป็นข้อมูลมาตรฐาน?',
        message: 'ข้อมูลทั้งหมดในเบราว์เซอร์นี้ (รวมเคสทดสอบที่โหลดไว้) จะถูกล้างแล้วสร้างข้อมูลเดโม่มาตรฐานใหม่ ย้อนกลับไม่ได้ และต้องเข้าสู่ระบบใหม่',
        variant: 'danger', confirmText: 'ยืนยันรีเซ็ตเป็นข้อมูลมาตรฐาน',
      } : job.kind === 'all' ? {
        title: `โหลดทุกเคส (${n} เคส)?`,
        message: 'ข้อมูลทั้งหมดในเบราว์เซอร์นี้จะถูกล้าง แล้วสร้างข้อมูลมาตรฐานพร้อมทุกเคสใหม่ ย้อนกลับไม่ได้ และต้องเข้าสู่ระบบใหม่ ใช้เวลาประมาณ 5 วินาที',
        variant: 'danger', confirmText: 'ยืนยันล้างและโหลดทุกเคส',
      } : {
        title: `โหลดเคส “${job.info.titleTh}”?`,
        message: 'ข้อมูลทั้งหมดในเบราว์เซอร์นี้จะถูกล้าง แล้วสร้างข้อมูลมาตรฐานพร้อมเคสนี้ใหม่ ย้อนกลับไม่ได้ และต้องเข้าสู่ระบบใหม่',
        variant: 'danger', confirmText: 'ยืนยันล้างและโหลดเคสนี้',
      },
    );
    if (!ok) return;
    setBusy(job.kind);
    setBusyLabel(job.kind === 'reset' ? 'กำลังรีเซ็ตเป็นข้อมูลมาตรฐาน…'
      : job.kind === 'all' ? 'กำลังโหลดทุกเคส… ใช้เวลาประมาณ 5 วินาที อย่าปิดหน้านี้'
      : 'กำลังโหลดเคสที่เลือก… อย่าปิดหน้านี้');
    try {
      let summary: ScenarioSummary;
      if (job.kind === 'reset') {
        const started = Date.now();
        await resetToStandardSeed();
        summary = { kind: 'reset', cases: [], links: [], ms: Date.now() - started, at: Date.now() };
      } else {
        const res: ScenarioLoadResult = await loadScenarioPack(job.kind === 'all' ? ALL_SCENARIOS_ID : job.info.id);
        const byId = new Map(list.items.map(s => [s.id, s]));
        summary = {
          kind: job.kind,
          cases: res.loaded.map(id => byId.get(id)).filter((s): s is ScenarioInfo => !!s).map(pickCase),
          links: res.links, ms: res.ms, at: Date.now(),
        };
      }
      saveScenarioSummary(summary);
      refresh();
      router.push('/login');
    } catch (e) {
      setBusy(null);
      await notify({
        title: job.kind === 'reset' ? 'รีเซ็ตไม่สำเร็จ' : 'โหลดชุดข้อมูลทดสอบไม่สำเร็จ',
        message: `${errMsg(e)} — ข้อมูลอาจโหลดไม่ครบ ลองกด “รีเซ็ตเป็นข้อมูลมาตรฐาน” แล้วโหลดใหม่`,
        variant: 'danger',
      });
      // ล้มหลังขั้นรีเซ็ต = session ถูกล้างแล้ว → ต้องเข้าสู่ระบบใหม่
      if (!getCurrentUser()) { refresh(); router.push('/login'); }
    }
  }

  const locked = busy !== null;

  return (
    <div className="space-y-6">
      <section className={`${CARD} max-w-2xl`} aria-labelledby="demo-h">
        <h2 id="demo-h" className="text-lg font-semibold text-foreground">รีเซ็ตข้อมูลเดโม่</h2>
        <p className="mt-2 text-base text-muted-foreground">ล้างข้อมูลทั้งหมดของระบบนี้ (รอบ หลักฐาน SAR audit log) และสร้างข้อมูลสมมติใหม่ — ต้องเข้าสู่ระบบใหม่</p>
        <p className="mt-2 text-base font-medium text-foreground">ล้างข้อมูลทุกมหาวิทยาลัยในเบราว์เซอร์นี้</p>
        <div className="mt-5">
          <AsyncButton variant="destructive" testId="reset-demo" busyText="กำลังรีเซ็ต…" disabled={locked} onClick={async () => {
            const ok = await confirm({
              title: 'รีเซ็ตข้อมูลเดโม่?', message: 'ข้อมูลที่แก้ไขทั้งหมดจะหาย และย้อนกลับไม่ได้', variant: 'danger',
              confirmText: 'ยืนยันล้างและสร้างข้อมูลเดโม่ใหม่',
            });
            if (!ok) return;
            try {
              await resetDemo(user);
              await notify({ title: 'รีเซ็ตเรียบร้อย', message: 'กรุณาเข้าสู่ระบบใหม่' });
              refresh();
              router.push('/login');
            } catch (e) { await notify({ title: 'รีเซ็ตไม่สำเร็จ', message: errMsg(e), variant: 'danger' }); }
          }}><Icon name="trash" size={20} />รีเซ็ตข้อมูลเดโม่</AsyncButton>
        </div>
      </section>

      <section className={CARD} aria-labelledby="scenario-h" aria-busy={locked || undefined}>
        <h2 id="scenario-h" className="text-lg font-semibold text-foreground">ชุดข้อมูลทดสอบ</h2>
        <p className="mt-2 max-w-prose text-base text-muted-foreground">
          โหลดข้อมูลสมมติของสถานการณ์ที่ต้องการทดสอบ แล้วเข้าสู่ระบบด้วยบัญชีที่แนะนำของเคสนั้น ทุกบัญชีใช้รหัสผ่าน demo1234
        </p>
        <p className="mt-2 max-w-prose text-base font-medium text-foreground">
          ทุกครั้งที่โหลดหรือรีเซ็ต ข้อมูลเดิมทั้งหมดในเบราว์เซอร์นี้จะถูกล้าง และต้องเข้าสู่ระบบใหม่
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <AsyncButton
            variant="default" testId="scenario-load-all" busyText="กำลังโหลด…"
            disabled={locked || !list.items.length} onClick={() => run({ kind: 'all' })}
          >
            <Icon name="download" size={20} />{`โหลดทุกเคส (${list.items.length})`}
          </AsyncButton>
          <AsyncButton
            variant="outline" testId="scenario-reset" busyText="กำลังรีเซ็ต…"
            disabled={locked} onClick={() => run({ kind: 'reset' })}
          >
            <Icon name="undo" size={20} />รีเซ็ตเป็นข้อมูลมาตรฐาน
          </AsyncButton>
        </div>

        <div className="mt-4 empty:hidden" aria-live="polite">
          {locked && (
            <InlineMessage tone="info" icon="loader" testId="scenario-busy">{busyLabel}</InlineMessage>
          )}
        </div>

        {list.error ? (
          <InlineMessage tone="danger" className="mt-5" testId="scenario-error">{`อ่านรายการชุดข้อมูลทดสอบไม่ได้: ${list.error}`}</InlineMessage>
        ) : !list.items.length ? (
          <p className="mt-5 text-base text-muted-foreground" data-testid="scenario-empty">ยังไม่มีชุดข้อมูลทดสอบ</p>
        ) : (
          <div className="mt-6 space-y-8 [container-type:inline-size]" data-testid="scenario-list">
            {grouped.map(g => (
              <section key={g.k} aria-labelledby={`scenario-g-${g.k}`}>
                <h3 id={`scenario-g-${g.k}`} className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-foreground">
                  {g.label}<span className="aq-meta font-normal">{`${g.items.length} เคส`}</span>
                </h3>
                <ul className="mt-3 grid gap-3 [@container_(min-width:48rem)]:grid-cols-2">
                  {g.items.map(s => (
                    <li key={s.id} className="flex flex-col gap-3 rounded-lg border bg-background p-4" data-testid={`scenario-${s.id}`}>
                      <div className="min-w-0 space-y-1">
                        <h4 className="font-medium text-foreground">{s.titleTh}</h4>
                        <p className="text-base text-muted-foreground">{s.descriptionTh}</p>
                      </div>
                      {s.accounts.length > 0 && (
                        <div>
                          <p className="aq-meta">บัญชีที่ควรล็อกอิน</p>
                          <ul className="mt-1 flex flex-wrap gap-2">
                            {s.accounts.map(a => (
                              <li key={a.username} className="rounded-md border bg-card px-2 py-1 text-sm">
                                <code className="font-semibold text-primary">{a.username}</code>
                                <span className="text-muted-foreground">{` · ${a.roleTh}`}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(s.expectTh.length > 0 || s.paths.length > 0) && (
                        <details className="group rounded-md border bg-card">
                          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-base font-medium [&::-webkit-details-marker]:hidden">
                            {`สิ่งที่ควรเห็น (${s.expectTh.length})`}
                            <Icon name="chevron-down" size={20} className="ml-auto text-muted-foreground transition-transform duration-fast ease-move group-open:rotate-180" />
                          </summary>
                          <div className="space-y-2 border-t px-3 py-3 text-base">
                            {s.paths.length > 0 && (
                              <p className="break-words">
                                <span className="aq-meta">หน้าที่ควรเปิด </span>
                                <code className="text-sm">{s.paths.join(', ')}</code>
                              </p>
                            )}
                            <ul className="list-disc space-y-1 pl-5">
                              {s.expectTh.map((t, i) => <li key={i}>{t}</li>)}
                            </ul>
                          </div>
                        </details>
                      )}
                      <div className="mt-auto">
                        <AsyncButton
                          variant="outline" testId={`scenario-load-${s.id}`} busyText="กำลังโหลด…"
                          disabled={locked} onClick={() => run({ kind: 'one', info: s })}
                        >
                          <Icon name="download" size={20} />โหลดเคสนี้
                        </AsyncButton>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
