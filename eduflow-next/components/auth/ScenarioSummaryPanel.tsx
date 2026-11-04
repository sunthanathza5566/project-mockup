'use client';

/**
 * TASK-0003 S3d — panel "ข้อมูลทดสอบที่โหลดล่าสุด" บนหน้า /login (testid `login-scenario-summary`)
 * อ่านสรุปที่แท็บเดโม่เก็บไว้ใน sessionStorage (`lib/ui/scenario-summary`) ครั้งเดียวต่อ mount
 * (ref กัน strict mode รัน effect ซ้ำ — ครั้งที่สองจะได้สรุปที่ลบลิงก์เชิญแล้ว)
 * - ลิงก์เชิญแสดงได้ครั้งเดียว (ลบจาก storage ทันทีที่อ่าน) · บัญชี/เคสอยู่จนกด "ปิดสรุปนี้"
 * - กดบัญชี = เติมชื่อผู้ใช้ + demo1234 ในฟอร์ม (กลไกเดียวกับ "บัญชีทดสอบ")
 * - เคสเดียวเปิดรายละเอียดไว้ · หลายเคสพับไว้ (native details)
 * - ข้อความ titleTh/roleTh/expectTh/labelTh เป็นข้อมูล seed (ไม่แปล)
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/primitives/button';
import Icon from '@/components/ui/Icon';
import { clearScenarioSummary, takeScenarioSummary, type ScenarioSummary } from '@/lib/ui/scenario-summary';

function timeTh(at: number): string {
  try { return new Date(at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}

export default function ScenarioSummaryPanel({ onPick }: { onPick: (username: string) => void }) {
  const [summary, setSummary] = useState<ScenarioSummary | null>(null);
  const taken = useRef(false);

  useEffect(() => {
    if (taken.current) return;
    taken.current = true;
    setSummary(takeScenarioSummary());
  }, []);

  if (!summary) return null;

  const secs = Math.max(1, Math.round(summary.ms / 1000));
  const headline = summary.kind === 'reset'
    ? `กลับเป็นข้อมูลมาตรฐานแล้ว เมื่อ ${timeTh(summary.at)}`
    : `โหลด ${summary.cases.length} เคส เมื่อ ${timeTh(summary.at)} (ใช้เวลา ${secs} วินาที)`;
  const single = summary.cases.length === 1;

  return (
    <section
      className="w-full max-w-md rounded-lg border border-primary/40 bg-card p-4 text-card-foreground"
      aria-labelledby="scn-sum-h" data-testid="login-scenario-summary"
    >
      <div className="flex items-start gap-2">
        <Icon name="list-check" size={20} className="mt-0.5 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 id="scn-sum-h" className="font-semibold text-foreground">ข้อมูลทดสอบที่โหลดล่าสุด</h2>
          <p className="aq-meta">{headline}</p>
        </div>
        <Button
          variant="ghost" size="icon" className="-my-2 -mr-2 shrink-0" aria-label="ปิดสรุปนี้"
          data-testid="login-scenario-close"
          onClick={() => { clearScenarioSummary(); setSummary(null); }}
        >
          <Icon name="x" size={20} />
        </Button>
      </div>

      {summary.kind === 'reset' ? (
        <p className="mt-3 text-base text-muted-foreground">เข้าสู่ระบบด้วยบัญชีทดสอบด้านล่าง รหัสผ่าน demo1234</p>
      ) : (
        <p className="mt-3 text-base text-muted-foreground">กดชื่อบัญชีเพื่อเติมในฟอร์ม รหัสผ่านทุกบัญชีคือ demo1234</p>
      )}

      {summary.links.length > 0 && (
        <div className="mt-3 rounded-md border border-warning/50 bg-warning-muted p-3" data-testid="login-scenario-links">
          <p className="font-medium text-foreground">ลิงก์เชิญ (แสดงครั้งเดียว)</p>
          <p className="aq-meta">รีเฟรชหน้าแล้วลิงก์จะหายไป ถ้าต้องการใหม่ให้โหลดเคสอีกครั้ง</p>
          <ul className="mt-2 space-y-1">
            {summary.links.map((l, i) => (
              <li key={i}>
                {/* ลิงก์ fragment (#t=…) — ใช้ <a> ธรรมดาให้หน้า /invite อ่าน hash ตอนโหลด */}
                <a href={l.href} className="inline-flex min-h-11 items-center gap-1 break-all text-base">
                  <Icon name="link" size={20} />{l.labelTh}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.cases.length > 0 && (
        <ul className="mt-3 space-y-2">
          {summary.cases.map(c => (
            <li key={c.id}>
              <details className="group rounded-md border bg-background" open={single}>
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">{c.titleTh}</span>
                  <Icon name="chevron-down" size={20} className="shrink-0 text-muted-foreground transition-transform duration-fast ease-move group-open:rotate-180" />
                </summary>
                <div className="space-y-3 border-t p-3">
                  {c.accounts.length > 0 && (
                    <div className="grid gap-2">
                      {c.accounts.map(a => (
                        <Button
                          key={a.username} variant="outline"
                          className="w-full flex-col items-start justify-start gap-0 px-3 py-2 text-left"
                          data-testid={`scenario-account-${c.id}-${a.username}`}
                          onClick={() => onPick(a.username)}
                        >
                          <code className="font-semibold text-primary">{a.username}</code>
                          <span className="aq-meta font-normal">{a.roleTh}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                  {c.paths.length > 0 && (
                    <p className="break-words text-base">
                      <span className="aq-meta">หน้าที่ควรเปิด </span><code className="text-sm">{c.paths.join(', ')}</code>
                    </p>
                  )}
                  {c.expectTh.length > 0 && (
                    <div>
                      <p className="aq-meta">สิ่งที่ควรเห็น</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-base">
                        {c.expectTh.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
