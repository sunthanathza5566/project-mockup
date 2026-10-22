'use client';

/**
 * คลังเกณฑ์ AUN-QA v4.0 (ADR-UI-001 pages.md P19)
 * ช่องค้นหาใหญ่ + chip กรองเกณฑ์ 1–8 (ปุ่ม toggle aria-pressed) · การ์ดข้อ restyle · ไม่พบ = Empty + [ล้างคำค้น]
 * คง testid: req-search, req-criterion (กลุ่มตัวกรองเกณฑ์), req-count
 */
import { useMemo, useState } from 'react';
import { listCriteria, listRequirements, searchRequirements } from '@/lib/api';
import { Empty, PageHeader } from '@/components/aunqa/common';
import RequirementCard from '@/components/aunqa/RequirementCard';
import Icon from '@/components/ui/Icon';
import { CRITERION_GROUP_TH } from '@/lib/ui/aunqa';

export default function RequirementsPage() {
  const [q, setQ] = useState('');
  const [only, setOnly] = useState<number>(0);
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
      <PageHeader title="คลังเกณฑ์ AUN-QA" sub="8 เกณฑ์ 53 ข้อ ตาม AUN-QA Programme Level Version 4.0 — ค้นหาได้ทั้งภาษาไทยและอังกฤษ" />
      <div className="aq-card aq-req-filter">
        <div className="aq-field">
          <label htmlFor="req-search">ค้นหาข้อกำหนด</label>
          <div className="aq-picker__control">
            <Icon name="search" size={20} className="aq-picker__icon" />
            <input id="req-search" className="aq-input aq-picker__input" type="search" placeholder="เช่น หลักสูตร, stakeholder, assessment, 3.6…"
              value={q} onChange={e => setQ(e.target.value)} data-testid="req-search" />
          </div>
        </div>
        <div className="aq-cluster" role="group" aria-label="กรองตามเกณฑ์" data-testid="req-criterion">
          <button type="button" className="aq-btn aq-btn-compact" aria-pressed={only === 0} onClick={() => setOnly(0)}>ทุกเกณฑ์</button>
          {criteria.map(c => (
            <button key={c.no} type="button" className="aq-btn aq-btn-compact" aria-pressed={only === c.no} title={c.nameTh}
              onClick={() => setOnly(o => (o === c.no ? 0 : c.no))}>เกณฑ์ {c.no}</button>
          ))}
        </div>
        <p className="aq-meta" role="status" data-testid="req-count">{`พบ ${total} ข้อ`}</p>
      </div>

      {groups.length === 0 ? (
        <Empty icon="search" title={`ไม่พบข้อที่ตรงกับ “${q}”`}
          action={<button type="button" className="aq-btn" onClick={() => { setQ(''); setOnly(0); }}>ล้างคำค้น</button>} />
      ) : groups.map(({ c, reqs }) => (
        <section key={c.no} className="aq-section" aria-labelledby={`crit-${c.no}`}>
          <h2 id={`crit-${c.no}`} className="aq-h2">
            เกณฑ์ {c.no}: {c.nameTh} <span className="aq-h2-sub">{c.nameEn} · {CRITERION_GROUP_TH[c.group]} · {reqs.length} ข้อ</span>
          </h2>
          <div className="aq-reqgrid">{reqs.map(r => <RequirementCard key={r.id} req={r} compact />)}</div>
        </section>
      ))}
    </>
  );
}
