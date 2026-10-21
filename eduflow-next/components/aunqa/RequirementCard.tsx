'use client';

import type { Requirement } from '@/lib/types';
import { Badge } from './common';

/** การ์ดข้อกำหนด: ข้อความ TH/EN · อธิบายภาษาง่าย · หลักฐานที่ควรมี · คำถามวินิจฉัย · ทำอย่างไรให้ถึงระดับ 4 */
export default function RequirementCard({ req, compact = false }: { req: Requirement; compact?: boolean }) {
  return (
    <article className="aq-reqcard" data-testid={`req-card-${req.id}`}>
      <header>
        <span className="aq-reqno">{req.id}</span>
        <div>
          <div className="aq-req-th">{req.textTh}</div>
          <div className="aq-muted aq-req-en" lang="en">{req.textEn}</div>
        </div>
      </header>
      <div className="aq-chips">
        {req.needsBenchmark && <Badge tone="info">ต้องมี benchmark</Badge>}
        {req.needsTrend && <Badge tone="info">ต้องมีแนวโน้ม 3–5 ปี</Badge>}
        {req.relatedMetrics.map(m => <Badge key={m}>{m}</Badge>)}
      </div>
      <p className="aq-plain"><strong>ภาษาง่าย:</strong> {req.plainTh}</p>
      <details open={!compact}>
        <summary>หลักฐานที่ควรมี ({req.suggestedEvidence.length})</summary>
        <ul>{req.suggestedEvidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
      </details>
      <details>
        <summary>คำถามวินิจฉัย ({req.diagnosticQuestions.length})</summary>
        <ul>{req.diagnosticQuestions.map((e, i) => <li key={i}>{e}</li>)}</ul>
      </details>
      <details>
        <summary>ทำอย่างไรให้ถึงระดับ 4</summary>
        <p>{req.tipTh}</p>
      </details>
    </article>
  );
}
