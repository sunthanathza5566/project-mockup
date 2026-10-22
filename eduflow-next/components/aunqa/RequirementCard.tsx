'use client';

/**
 * การ์ดข้อกำหนด (ADR-UI-001 pages.md P19 / P9)
 * เลขข้อใน pill primary-tint · ข้อความไทย fs-md 600 · อังกฤษ fs-sm muted · "อธิบายแบบภาษาคน" fs-base
 * details คำถามวินิจฉัย / ตัวอย่างหลักฐาน / วิธีถึงระดับ 4 (summary 44px)
 * `embedded` = อยู่ในแผงพับของ section editor (ไม่มีกรอบการ์ดซ้อน)
 */
import type { Requirement } from '@/lib/types';
import Icon from '@/components/ui/Icon';
import { Badge } from './common';

function More({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="aq-collapse" open={open}>
      <summary>{title}<Icon name="chevron-down" size={20} className="aq-collapse__chev" /></summary>
      {children}
    </details>
  );
}

export default function RequirementCard({ req, compact = false, embedded = false }: { req: Requirement; compact?: boolean; embedded?: boolean }) {
  return (
    <article className={embedded ? 'aq-reqcard aq-reqcard--embedded' : 'aq-reqcard'} data-testid={`req-card-${req.id}`}>
      <header>
        <span className="aq-reqno">{req.id}</span>
        <div>
          <p className="aq-req-th">{req.textTh}</p>
          <p className="aq-req-en aq-meta" lang="en">{req.textEn}</p>
        </div>
      </header>
      {(req.needsBenchmark || req.needsTrend || req.relatedMetrics.length > 0) && (
        <div className="aq-cluster aq-mt-2">
          {req.needsBenchmark && <Badge tone="info">ต้องมี benchmark</Badge>}
          {req.needsTrend && <Badge tone="info">ต้องมีแนวโน้ม 3–5 ปี</Badge>}
          {req.relatedMetrics.map(m => <Badge key={m} icon="chart-line">{m}</Badge>)}
        </div>
      )}
      <p className="aq-plain"><strong>อธิบายแบบภาษาคน:</strong> {req.plainTh}</p>
      <More title={`ตัวอย่างหลักฐานที่ควรมี (${req.suggestedEvidence.length})`} open={!compact && !embedded}>
        <ul>{req.suggestedEvidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
      </More>
      <More title={`คำถามวินิจฉัย (${req.diagnosticQuestions.length})`}>
        <ul>{req.diagnosticQuestions.map((e, i) => <li key={i}>{e}</li>)}</ul>
      </More>
      <More title="ทำอย่างไรให้ถึงระดับ 4">
        <p>{req.tipTh}</p>
      </More>
    </article>
  );
}
