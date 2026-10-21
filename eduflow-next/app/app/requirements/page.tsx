'use client';

import { useMemo, useState } from 'react';
import { listCriteria, listRequirements, searchRequirements } from '@/lib/api';
import { PageHeader, Empty } from '@/components/aunqa/common';
import RequirementCard from '@/components/aunqa/RequirementCard';
import { CRITERION_GROUP_TH } from '@/lib/ui/aunqa';

/** คลังเกณฑ์ AUN-QA v4.0: 8 เกณฑ์ 53 ข้อ ค้นหา TH/EN */
export default function RequirementsPage() {
  const [q, setQ] = useState('');
  const [only, setOnly] = useState<number | 0>(0);
  const criteria = useMemo(() => listCriteria(), []);

  const groups = useMemo(() => {
    const hits = q.trim() ? new Set(searchRequirements(q).map(r => r.id)) : null;
    return criteria
      .filter(c => !only || c.no === only)
      .map(c => ({ c, reqs: listRequirements(c.no).filter(r => !hits || hits.has(r.id)) }))
      .filter(g => g.reqs.length > 0);
  }, [q, only, criteria]);

  const total = groups.reduce((n, g) => n + g.reqs.length, 0);

  return (
    <>
      <PageHeader title="คลังเกณฑ์" sub="8 เกณฑ์ 53 ข้อ ตาม AUN-QA Programme Level Version 4.0 — ค้นหาได้ทั้งภาษาไทยและอังกฤษ" />
      <div className="aq-toolbar">
        <input
          className="aq-input" type="search" placeholder="ค้นหา เช่น หลักสูตร, stakeholder, assessment…" aria-label="ค้นหาข้อกำหนด"
          value={q} onChange={e => setQ(e.target.value)} data-testid="req-search"
        />
        <select className="aq-input" value={only} onChange={e => setOnly(Number(e.target.value))} aria-label="กรองตามเกณฑ์" data-testid="req-criterion">
          <option value={0}>ทุกเกณฑ์</option>
          {criteria.map(c => <option key={c.no} value={c.no}>เกณฑ์ {c.no}: {c.nameTh}</option>)}
        </select>
        <span className="aq-muted" data-testid="req-count">พบ {total} ข้อ</span>
      </div>

      {groups.length === 0 ? <Empty text="ไม่พบข้อกำหนดที่ตรงกับคำค้น" /> : groups.map(({ c, reqs }) => (
        <section key={c.no} className="aq-section" aria-labelledby={`crit-${c.no}`}>
          <h2 id={`crit-${c.no}`} className="aq-h2">
            เกณฑ์ {c.no}: {c.nameTh} <span className="aq-muted aq-h2-sub">{c.nameEn} · {CRITERION_GROUP_TH[c.group]} · {reqs.length} ข้อ</span>
          </h2>
          <div className="aq-reqgrid">{reqs.map(r => <RequirementCard key={r.id} req={r} compact />)}</div>
        </section>
      ))}
    </>
  );
}
