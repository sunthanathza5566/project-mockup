'use client';

/**
 * การ์ดข้อกำหนด (saas-spec §P19 / P9 + friendly-spec §F13 — earth)
 * รหัสข้อ = badge primary · ข้อความไทย font-medium · อังกฤษ aq-meta · "อธิบายแบบภาษาคน" text-base
 * details คำถามวินิจฉัย / ตัวอย่างหลักฐาน / วิธีถึงระดับ 4 (summary ≥44px, recipe §C2 details)
 * `embedded` = อยู่ในแผงพับของ section editor (ไม่มีกรอบการ์ดซ้อน)
 * คง testid `req-card-{id}` + ข้อความเดิมทุกตัว
 */
import type { ReactNode } from 'react';
import type { Requirement } from '@/lib/types';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/ui/cn';
import { Badge } from './common';

function More({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="group rounded-lg border bg-card" open={open}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{title}</span>
        <Icon name="chevron-down" size={20} className="text-muted-foreground transition-transform duration-fast group-open:rotate-180" />
      </summary>
      <div className="border-t px-4 py-3 text-base text-foreground">{children}</div>
    </details>
  );
}

export default function RequirementCard({ req, compact = false, embedded = false }: { req: Requirement; compact?: boolean; embedded?: boolean }) {
  return (
    <article
      className={cn(
        'flex min-w-0 flex-col gap-4',
        !embedded && 'rounded-xl border bg-card p-5 text-card-foreground shadow-sm transition-colors duration-fast hover:border-input dark:shadow-none md:p-6',
      )}
      data-testid={`req-card-${req.id}`}
    >
      <header className="flex items-start gap-3">
        <Badge tone="primary" icon={false}><span className="tabular-nums">{req.id}</span></Badge>
        <div className="min-w-0 space-y-1">
          <p className="m-0 font-medium leading-relaxed text-foreground">{req.textTh}</p>
          <p className="aq-meta m-0" lang="en">{req.textEn}</p>
        </div>
      </header>
      {(req.needsBenchmark || req.needsTrend || req.relatedMetrics.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {req.needsBenchmark && <Badge tone="info">ต้องมี benchmark</Badge>}
          {req.needsTrend && <Badge tone="info">ต้องมีแนวโน้ม 3–5 ปี</Badge>}
          {req.relatedMetrics.map(m => <Badge key={m} icon="chart-line">{m}</Badge>)}
        </div>
      )}
      <p className="m-0 rounded-lg bg-muted px-4 py-3 text-base text-foreground"><strong className="font-semibold">อธิบายแบบภาษาคน:</strong> {req.plainTh}</p>
      <div className="space-y-2">
        <More title={`ตัวอย่างหลักฐานที่ควรมี (${req.suggestedEvidence.length})`} open={!compact && !embedded}>
          <ul className="m-0 list-disc space-y-1 pl-5">{req.suggestedEvidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </More>
        <More title={`คำถามวินิจฉัย (${req.diagnosticQuestions.length})`}>
          <ul className="m-0 list-disc space-y-1 pl-5">{req.diagnosticQuestions.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </More>
        <More title="ทำอย่างไรให้ถึงระดับ 4">
          <p className="m-0">{req.tipTh}</p>
        </More>
      </div>
    </article>
  );
}
