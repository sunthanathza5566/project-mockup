'use client';

/**
 * คลังเกณฑ์ AUN-QA v4.0 (saas-spec §P19 + friendly-spec §F13 — earth)
 * การ์ดตัวกรอง: ช่องค้นหาใหญ่ + chip กรองเกณฑ์ 1–8 (ปุ่ม toggle aria-pressed — เลือกอยู่ = พื้น primary-muted)
 * ผล: section ต่อเกณฑ์ + grid md:2 xl:3 ของ RequirementCard · ไม่พบ = Empty + [ล้างคำค้น]
 * คง testid: req-search, req-criterion (กลุ่มตัวกรองเกณฑ์), req-count
 */
import { useMemo, useState } from 'react';
import { listCriteria, listRequirements, searchRequirements } from '@/lib/api';
import { Empty, PageHeader } from '@/components/aunqa/common';
import RequirementCard from '@/components/aunqa/RequirementCard';
import Icon from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { CRITERION_GROUP_TH } from '@/lib/ui/aunqa';
import { useLang } from '@/context/LangContext';

/** chip ตัวกรอง: outline compact · เลือกอยู่ = พื้น primary-muted + ขอบ primary + ตัวหนา (aria-pressed) */
const CHIP = 'rounded-full aria-pressed:border-primary aria-pressed:bg-primary-muted aria-pressed:font-semibold';

export default function RequirementsPage() {
  const [q, setQ] = useState('');
  const [only, setOnly] = useState<number>(0);
  const criteria = useMemo(() => listCriteria(), []);
  const { lang } = useLang();

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
      <div className="mb-8 space-y-4 rounded-xl border bg-card p-5 shadow-sm dark:shadow-none md:p-6">
        <div className="space-y-1.5">
          <label htmlFor="req-search" className="text-base font-medium text-foreground">ค้นหาข้อกำหนด</label>
          <div className="relative">
            <Icon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input id="req-search" type="search" className="rounded-lg pl-10 md:text-lg" placeholder="เช่น หลักสูตร, stakeholder, assessment, 3.6…"
              value={q} onChange={e => setQ(e.target.value)} data-testid="req-search" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="กรองตามเกณฑ์" data-testid="req-criterion">
          <Button variant="outline" size="compact" className={CHIP} aria-pressed={only === 0} onClick={() => setOnly(0)}>ทุกเกณฑ์</Button>
          {criteria.map(c => (
            <Button key={c.no} variant="outline" size="compact" className={CHIP} aria-pressed={only === c.no} title={`เกณฑ์ ${c.no}: ${c.nameTh}`}
              onClick={() => setOnly(o => (o === c.no ? 0 : c.no))}>เกณฑ์ {c.no}</Button>
          ))}
        </div>
        <p className="aq-meta m-0" role="status" data-testid="req-count">{`พบ ${total} ข้อ`}</p>
      </div>

      {groups.length === 0 ? (
        <Empty icon="search" title={`ไม่พบข้อที่ตรงกับ “${q}”`}
          action={<Button variant="outline" onClick={() => { setQ(''); setOnly(0); }}>ล้างคำค้น</Button>} />
      ) : (
        <div className="space-y-10">
          {groups.map(({ c, reqs }) => (
            <section key={c.no} aria-labelledby={`crit-${c.no}`}>
              <h2 id={`crit-${c.no}`} className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xl font-semibold text-foreground">
                {`เกณฑ์ ${c.no}: ${c.nameTh}`} <span className="aq-meta font-normal">{`${lang === 'en' ? '' : `${c.nameEn} · `}${CRITERION_GROUP_TH[c.group]} · ${reqs.length} ข้อ`}</span>
              </h2>
              <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">{reqs.map(r => <RequirementCard key={r.id} req={r} compact />)}</div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
