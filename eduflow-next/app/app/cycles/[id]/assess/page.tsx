'use client';

/**
 * พื้นที่ทำงานกรรมการ / ผลประเมินของกรรมการ (saas-spec §P15 + friendly-spec §F13)
 * - แท็บเกณฑ์แบบ segmented (`assess-crit-{n}` role=tab, ←/→ Home/End) · ไอคอน check เมื่อให้คะแนนแล้ว
 * - การ์ดคะแนนรายเกณฑ์: NativeSelect `crit-score`, Textarea `crit-why`, ปุ่ม `crit-save` (default) → `crit-next` (outline)
 * - การ์ดความคืบหน้า (`assess-progress`, `rated-count`) + verdict + ส่งผล (ปุ่มหลักเดียว) + Appendix B/D (outline)
 * - ต่อข้อ: SAR อ่านอย่างเดียว (กล่อง muted) | Appendix B ของคุณ (Textarea) — lg ขึ้นไป 2 คอลัมน์
 * - presentation only (R2-F3): logic/testid/ข้อความเดิมทุกตัว (crit-why เปลี่ยน input → textarea ตาม §P15)
 */
import { Fragment, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  RATING_SCALE, can, cycleScope, exportAppendixBDoc, exportAppendixDDoc, downloadBlob, getAssessorProgress, getCycle,
  getProgramme, isAssessorOf, listCriteria, listCriterionRatings, listEvidence, listFindings, listRatings, listRequirements,
  listSections, listUsers, listVerdicts, runAssessorSummary, setCriterionRating, setVerdict, transitionCycle, upsertFinding,
} from '@/lib/api';
import type { AiRun, AppUser, AssessmentCycle, AssessmentFinding } from '@/lib/types';
import type { EvidenceView } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, AsyncButton, Badge, CycleStatusBadge, Empty, InlineMessage, ModelBadge, PageHeader, useLoad, useMe } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import ProgressRing from '@/components/ui/ProgressRing';
import { StepCheck } from '@/components/ui/Stepper';
import Term from '@/components/ui/Term';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { Textarea } from '@/components/ui/primitives/textarea';
import { useLang } from '@/context/LangContext';
import { cn } from '@/lib/ui/cn';
import { TONE_TEXT } from '@/lib/ui/tone';
import { notifyTodosChanged } from '@/lib/ui/todo';
import { GROUP_TH, decodeParam, errMsg, fmtDateTime, sectionHref } from '@/lib/ui/aunqa';

const scaleName = (n: number) => RATING_SCALE.find(s => s.score === n)?.nameTh ?? '';

const CARD = 'rounded-xl border bg-card p-5 shadow-sm dark:shadow-none md:p-6';
const H2 = 'text-xl font-semibold text-foreground';
const H3 = 'text-lg font-semibold text-foreground';
const LABEL = 'block text-base font-medium text-foreground';
const LINK = 'text-primary underline underline-offset-4 hover:decoration-2';
/** กล่องรองในการ์ด (SAR อ่านอย่างเดียว, ข้อค้นพบของกรรมการท่านอื่น, ผล AI) */
const SUBBOX = 'rounded-lg border bg-muted/40 p-4';

/** S14 พื้นที่ทำงานกรรมการประเมิน: SAR (อ่านอย่างเดียว) + Appendix B ต่อข้อ + คะแนนรายเกณฑ์ + verdict + AI-9
 *  หลักสูตรเห็นผลของกรรมการได้เมื่อรอบเป็น “ประเมินแล้ว/ปิดรอบ” */
export default function AssessPage() {
  const user = useMe();
  const id = decodeParam(useParams().id);
  const [crit, setCrit] = useState(1);
  const [justRated, setJustRated] = useState<number | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /** C5: ←/→ Home/End เลื่อนแท็บ */
  function onTabKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const n = listCriteria().length;
    const i = crit - 1;
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    setCrit(next + 1);
    tabRefs.current[next]?.focus();
  }

  /** UX-9: เกณฑ์ 8 → เลื่อนไปการ์ดสรุป + focus verdict */
  function goNext(no: number) {
    if (no < 8) { setCrit(no + 1); tabRefs.current[no]?.focus(); return; }
    document.getElementById('assess-progress')?.scrollIntoView({ block: 'start' });
    (document.querySelector('[data-testid="verdict-score"]') as HTMLElement | null)?.focus();
  }

  const q = useLoad(() => {
    const cycle = getCycle(user, id);
    const assessor = isAssessorOf(user, id);
    const sections = listSections(user, id);
    const evidence = listEvidence(user, { programmeId: cycle.programmeId, cycleId: id });
    let selfRatings: ReturnType<typeof listRatings> = [];
    try { selfRatings = listRatings(user, id).filter(r => r.raterType === 'self'); } catch { /* ไม่มีสิทธิ์ดูคะแนน */ }
    return {
      cycle, assessor, sections, evidence, selfRatings,
      findings: listFindings(user, id), ratings: listCriterionRatings(user, id), verdicts: listVerdicts(user, id),
      progress: assessor ? getAssessorProgress(user, id) : null,
      names: Object.fromEntries(listUsers(cycle.universityId).map(u => [u.id, u.fullName])) as Record<string, string>,
    };
  }, [user.id, id]);

  return (
    <Async q={q}>{d => {
      const { cycle, assessor } = d;
      const released = cycle.status === 'assessed' || cycle.status === 'closed';
      const writable = assessor && cycle.status === 'under_assessment' && can(user, 'finding.write', cycleScope(cycle));
      const visible = assessor || released;
      return (
        <>
          <PageHeader
            crumbs={[{ label: 'รอบประเมิน', href: '/app/cycles' }, { label: String(cycle.academicYear), href: `/app/cycles/${id}` }, { label: 'ประเมิน' }]}
            title={assessor ? 'พื้นที่ทำงานกรรมการ' : 'ผลการประเมินของกรรมการ'}
            status={<CycleStatusBadge status={cycle.status} />}
            sub={<>รอบ {cycle.academicYear} · {getProgramme(cycle.programmeId)?.nameTh} · {assessor ? 'อ่าน SAR/หลักฐานได้อย่างเดียว บันทึกได้เฉพาะข้อค้นพบและคะแนนของคุณ' : 'อ่านอย่างเดียว'}</>}
            actions={<Button asChild variant="outline" className="whitespace-nowrap"><Link href={`/app/cycles/${id}`}><Icon name="chevron-left" size={20} />แดชบอร์ดรอบ</Link></Button>}
          />
          {!visible ? (
            <InlineMessage tone="info" icon="lock" testId="assess-hidden">ผลการประเมินของกรรมการจะแสดงเมื่อกรรมการส่งผลแล้ว (สถานะ “ประเมินแล้ว”) — ตอนนี้ยังไม่แสดงเพื่อความเป็นอิสระของการประเมิน</InlineMessage>
          ) : (
            <div className="space-y-6">
              {assessor && cycle.status !== 'under_assessment' && (
                <InlineMessage tone={released ? 'success' : 'info'} testId="assess-notopen">
                  {released ? 'ส่งผลประเมินแล้ว แก้ไขไม่ได้' : 'รอบนี้ยังไม่เข้าสู่ขั้นการประเมิน — QA คณะหรือผู้ดูแลจะเป็นผู้เริ่ม และคุณจะได้รับแจ้งเตือนทันที'}
                </InlineMessage>
              )}
              {assessor && d.progress && <ProgressCard user={user} cycle={cycle} d={d} writable={writable} reload={q.reload} />}
              {!assessor && <ResultsOverview d={d} />}
              <div className="space-y-4">
                <div
                  className="flex flex-wrap gap-1 rounded-xl border bg-muted p-1" role="tablist" aria-label="เกณฑ์" onKeyDown={onTabKey}
                >
                  {listCriteria().map((c, i) => {
                    const done = d.progress ? d.progress.ratedCriteria.includes(c.no) : d.ratings.some(r => r.criterionNo === c.no);
                    return (
                      <button key={c.no} ref={el => { tabRefs.current[i] = el; }} type="button" role="tab" id={`crit-tab-${c.no}`}
                        aria-selected={crit === c.no} aria-controls={`crit-panel-${c.no}`} tabIndex={crit === c.no ? 0 : -1}
                        className="inline-flex min-h-11 flex-1 basis-[6.5rem] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border-0 bg-transparent px-3 font-medium text-muted-foreground transition-colors duration-fast hover:bg-card/60 hover:text-foreground aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-sm"
                        onClick={() => setCrit(c.no)} data-testid={`assess-crit-${c.no}`}>
                        เกณฑ์ {c.no}
                        {done && <><span className={TONE_TEXT.ok}><StepCheck drawn={justRated === c.no} /></span><span className="sr-only"> (ให้คะแนนแล้ว)</span></>}
                      </button>
                    );
                  })}
                </div>
                <CriterionPanel key={crit} no={crit} user={user} cycle={cycle} d={d} writable={writable} reload={q.reload}
                  onRated={() => setJustRated(crit)} onNext={() => goNext(crit)} />
              </div>
            </div>
          )}
        </>
      );
    }}</Async>
  );
}

type D = {
  cycle: AssessmentCycle; assessor: boolean; sections: ReturnType<typeof listSections>; evidence: EvidenceView[];
  selfRatings: ReturnType<typeof listRatings>; findings: AssessmentFinding[]; ratings: ReturnType<typeof listCriterionRatings>;
  verdicts: ReturnType<typeof listVerdicts>; progress: ReturnType<typeof getAssessorProgress> | null; names: Record<string, string>;
};

/** แถว checklist: สถานะ = สี + ไอคอน + ข้อความ */
function CheckItem({ state, icon, children }: { state: 'ok' | 'warn' | 'neutral'; icon: Parameters<typeof Icon>[0]['name']; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-foreground" data-done={state === 'ok' ? true : state === 'warn' ? false : undefined}>
      <Icon name={icon} size={20} className={cn('mt-0.5 shrink-0', TONE_TEXT[state])} />
      {children}
    </li>
  );
}

// ───────────── ความคืบหน้า + verdict + ส่งผล ─────────────
function ProgressCard({ user, cycle, d, writable, reload }: { user: AppUser; cycle: AssessmentCycle; d: D; writable: boolean; reload: () => void }) {
  const { showToast } = useToast();
  const { confirm } = useDialog();
  const mine = d.verdicts.find(v => v.assessorUserId === user.id);
  const [v, setV] = useState(String(mine?.verdict ?? ''));
  const [why, setWhy] = useState(mine?.rationale ?? '');
  const p = d.progress!;
  function saveVerdict() {
    try { setVerdict(user, cycle.id, Number(v), why); showToast('บันทึก verdict แล้ว', 'success'); reload(); } catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function finish() {
    if (!(await confirm({
      title: 'ส่งผลการประเมิน', variant: 'warning', confirmText: 'ยืนยันส่งผลการประเมิน',
      message: 'เมื่อส่งแล้วรอบจะเป็น “ประเมินแล้ว” แก้ผลไม่ได้ และหลักสูตรจะเห็นข้อค้นพบ คะแนน และ verdict ของกรรมการทั้งหมด',
    }))) return;
    try { await transitionCycle(user, cycle.id, 'assessed'); showToast('ส่งผลการประเมินแล้ว', 'success'); notifyTodosChanged(); reload(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  const k = p.ratedCriteria.length;
  const missing = [
    p.missingCriteria.length ? `ให้คะแนนเกณฑ์ ${p.missingCriteria.join(', ')}` : '',
    p.hasVerdict ? '' : 'เลือก verdict',
  ].filter(Boolean).join(' · ');
  return (
    <section className={cn(CARD, 'scroll-mt-20 space-y-6')} id="assess-progress" aria-labelledby="prog-h" data-testid="assess-progress">
      <h2 id="prog-h" className={H2}>ความคืบหน้าและผลรวม</h2>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ProgressRing size="sm" value={k} max={8} center={`${k}/8`} ariaLabel={`ให้คะแนนแล้ว ${k} จาก 8 เกณฑ์`} />
        <ul className="min-w-0 list-none space-y-2">
          <CheckItem state={k === 8 ? 'ok' : 'warn'} icon={k === 8 ? 'check-circle' : 'circle-dashed'}>
            {/* UX-U3-7: ข้อความตามสถานะจริง — ยังไม่ทำ = บอกสิ่งที่ยังไม่ทำ */}
            <span>{k === 8 ? 'ให้คะแนนครบทุกเกณฑ์แล้ว' : 'ยังให้คะแนนรายเกณฑ์ไม่ครบ'} <strong className="font-semibold tabular-nums" data-testid="rated-count">{k}/8</strong>{p.missingCriteria.length > 0 && <span className="text-muted-foreground">{` (ยังขาดเกณฑ์ ${p.missingCriteria.join(', ')})`}</span>}</span>
          </CheckItem>
          <CheckItem state={p.hasVerdict ? 'ok' : 'warn'} icon={p.hasVerdict ? 'check-circle' : 'circle-dashed'}>
            <span>{p.hasVerdict ? `เลือก verdict ภาพรวมแล้ว${mine?.verdict ? ` (${mine.verdict})` : ''}` : 'ยังไม่เลือก verdict ภาพรวม'}</span>
          </CheckItem>
          <CheckItem state="neutral" icon="file-text"><span>{`ข้อค้นพบ (Appendix B) ที่บันทึกแล้ว: ${p.findingCount} ข้อ (ไม่บังคับ)`}</span></CheckItem>
        </ul>
      </div>
      <div className="grid items-end gap-4 rounded-lg border bg-muted/40 p-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="verdict-score" className={LABEL}><Term k="verdict">Verdict</Term> ภาพรวม (คุณเลือกเอง — ระบบไม่คำนวณหรือแนะนำให้)</label>
          <NativeSelect id="verdict-score" value={v} disabled={!writable} onChange={e => setV(e.target.value)} data-testid="verdict-score">
            <option value="">— ยังไม่เลือก —</option>
            {RATING_SCALE.map(s => <option key={s.score} value={s.score}>{`${s.score} — ${s.nameTh}`}</option>)}
          </NativeSelect>
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="verdict-why" className={LABEL}>เหตุผลประกอบ</label>
          <Input id="verdict-why" value={why} disabled={!writable} onChange={e => setWhy(e.target.value)} data-testid="verdict-why" />
        </div>
        {writable && <Button type="button" variant="outline" disabled={!v} onClick={saveVerdict} data-testid="verdict-save">บันทึก verdict</Button>}
      </div>
      <div className="flex flex-wrap items-start gap-2 border-t pt-5">
        <span className="inline-flex max-w-full flex-col gap-1">
          <AsyncButton variant="default" testId="assess-finish" disabled={!writable || !p.canFinish} onClick={finish} busyText="กำลังส่งผล…">
            <Icon name="check-circle" size={20} />ส่งผลการประเมิน (เสร็จสิ้น)
          </AsyncButton>
          {writable && !p.canFinish && missing && <span className="aq-btn-reason">ยังขาด: {missing}</span>}
        </span>
        <span className="inline-flex items-center gap-1">
          <AsyncButton variant="outline" testId="assess-appb" onClick={() => { downloadBlob(exportAppendixBDoc(user, cycle.id), `AppendixB_${cycle.academicYear}.doc`); }}>
            <Icon name="download" size={20} />Appendix B (.doc)
          </AsyncButton>
          <Term k="appendix_b" label="Appendix B" />
        </span>
        <span className="inline-flex items-center gap-1">
          <AsyncButton variant="outline" testId="assess-appd" onClick={() => { downloadBlob(exportAppendixDDoc(user, cycle.id), `AppendixD_${cycle.academicYear}.doc`); }}>
            <Icon name="download" size={20} />Appendix D (.doc)
          </AsyncButton>
          <Term k="appendix_d" label="Appendix D" />
        </span>
      </div>
    </section>
  );
}

// ───────────── มุมมองหลักสูตรหลังประเมินแล้ว ─────────────
function ResultsOverview({ d }: { d: D }) {
  return (
    <section className={CARD} aria-labelledby="res-h" data-testid="assess-results">
      <h2 id="res-h" className={cn(H2, 'mb-4')}>สรุปผลของกรรมการ</h2>
      {d.verdicts.length === 0 ? <Empty text="ไม่มี verdict" /> : (
        <ul className="list-none divide-y rounded-lg border">
          {d.verdicts.map(v => (
            <li key={v.id} data-testid="verdict-row" className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <strong className="font-semibold text-foreground">{d.names[v.assessorUserId] || v.assessorUserId}</strong>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">verdict <Badge tone="info">{v.verdict} — {scaleName(v.verdict)}</Badge> {v.rationale && <span className="text-muted-foreground">{v.rationale}</span>}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ───────────── รายเกณฑ์ ─────────────
function CriterionPanel({ no, user, cycle, d, writable, reload, onRated, onNext }: {
  no: number; user: AppUser; cycle: AssessmentCycle; d: D; writable: boolean; reload: () => void; onRated: () => void; onNext: () => void;
}) {
  const { showToast } = useToast();
  const crit = listCriteria().find(c => c.no === no);
  const { lang } = useLang();
  const reqs = listRequirements(no);
  const myRating = d.ratings.find(r => r.criterionNo === no && r.raterUserId === user.id);
  const [score, setScore] = useState(String(myRating?.score ?? ''));
  const [why, setWhy] = useState(myRating?.rationale ?? '');
  const [run, setRun] = useState<AiRun | null>(null);
  const [saved, setSaved] = useState(false);
  const canAi = d.assessor && cycle.status === 'under_assessment' && can(user, 'ai.summarize', cycleScope(cycle));

  function saveRating() {
    try {
      setCriterionRating(user, cycle.id, no, Number(score), why);
      showToast(`บันทึกคะแนนเกณฑ์ ${no} แล้ว`, 'success');
      setSaved(true); onRated(); notifyTodosChanged(); reload();
    } catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function summarize() {
    try { setRun(await runAssessorSummary(user, cycle.id, no)); } catch (e) { showToast(errMsg(e), 'error'); }
  }
  function addQuestion(reqId: string, text: string) {
    try {
      const cur = d.findings.find(f => f.requirementId === reqId && f.assessorUserId === user.id);
      const prev = cur?.interviewQuestions ?? '';
      upsertFinding(user, cycle.id, reqId, { ...pick(cur), interviewQuestions: prev ? `${prev}\n${text}` : text });
      showToast(`เพิ่มคำถามในข้อ ${reqId} แล้ว`, 'success'); reload();
    } catch (e) { showToast(errMsg(e), 'error'); }
  }
  const others = d.ratings.filter(r => r.criterionNo === no && r.raterUserId !== user.id);
  const self = (rid: string) => d.selfRatings.find(r => r.requirementId === rid);

  return (
    <div id={`crit-panel-${no}`} role="tabpanel" aria-labelledby={`crit-tab-${no}`} className="space-y-6" data-testid={`assess-panel-${no}`}>
      <section className={cn(CARD, 'space-y-5')} aria-labelledby="cr-h">
        <h2 id="cr-h" className={H2}>
          {`เกณฑ์ ${no}: ${crit?.nameTh ?? ''}`} {lang !== 'en' && <span className="block text-base font-normal text-muted-foreground">{crit?.nameEn}</span>}
        </h2>
        <div className="grid items-start gap-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-1.5">
            <label htmlFor={`crit-score-${no}`} className={LABEL}>คะแนนเกณฑ์นี้ (1–7) <Term k="self_rating" label="สเกล 1–7" /></label>
            <NativeSelect id={`crit-score-${no}`} value={score} disabled={!writable} onChange={e => { setScore(e.target.value); setSaved(false); }} data-testid="crit-score">
              <option value="">— ยังไม่ให้คะแนน —</option>
              {RATING_SCALE.map(s => <option key={s.score} value={s.score}>{`${s.score} — ${s.nameTh}`}</option>)}
            </NativeSelect>
          </div>
          <div className="min-w-0 space-y-1.5">
            <label htmlFor={`crit-why-${no}`} className={LABEL}>เหตุผล</label>
            <Textarea id={`crit-why-${no}`} rows={2} className="min-h-20" value={why} disabled={!writable} onChange={e => { setWhy(e.target.value); setSaved(false); }} data-testid="crit-why" />
          </div>
        </div>
        {(writable || saved) && (
          <div className="flex flex-wrap items-center gap-3">
            {writable && <Button type="button" disabled={!score} onClick={saveRating} data-testid="crit-save">บันทึกคะแนนเกณฑ์นี้</Button>}
            {saved && (
              <>
                <span className="aq-saved inline-flex items-center gap-1 text-success" role="status"><Icon name="check" size={16} />บันทึกแล้ว</span>
                <Button type="button" variant="outline" data-testid="crit-next" onClick={onNext}>
                  {no < 8 ? `ไปเกณฑ์ ${no + 1} →` : 'ไปสรุปผลและเลือก verdict ↓'}
                </Button>
              </>
            )}
          </div>
        )}
        {!d.assessor && d.ratings.filter(r => r.criterionNo === no).map(r => (
          <p key={r.id} data-testid="crit-result" className="flex flex-wrap items-center gap-2 text-foreground">
            {d.names[r.raterUserId] || r.raterUserId}: <Badge tone="info">{r.score} — {scaleName(r.score)}</Badge> {r.rationale}
          </p>
        ))}
        {d.assessor && others.length > 0 && (
          <p className="text-muted-foreground">กรรมการท่านอื่น: {others.map(r => `${d.names[r.raterUserId] || r.raterUserId} ให้ ${r.score}`).join(' · ')}</p>
        )}
        {canAi && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-5">
            <AsyncButton variant="outline" testId="ai-summarize" onClick={summarize}>
              <Icon name="sparkle" size={20} />AI สรุปเกณฑ์นี้ + ร่างคำถามสัมภาษณ์
            </AsyncButton>
            <span className="text-muted-foreground"> AI ช่วยสรุปและเสนอคำถามเท่านั้น — ไม่ให้คะแนนหรือ verdict</span>
          </div>
        )}
        {run && <SummaryResult run={run} onAddQuestion={addQuestion} writable={writable} onClose={() => setRun(null)} />}
      </section>

      {reqs.map(r => {
        const sec = d.sections.find(s => s.requirementId === r.id);
        const ev = d.evidence.filter(e => e.requirementIds.includes(r.id));
        return (
          <section key={r.id} className={cn(CARD, 'space-y-4')} aria-labelledby={`req-${r.id}`} data-testid={`assess-req-${r.id}`}>
            <h3 id={`req-${r.id}`} className={cn(H3, 'flex items-start gap-3')}>
              <span className="inline-flex shrink-0 items-center rounded-md bg-primary-muted px-2 font-semibold tabular-nums text-primary">{r.id}</span>
              <span className="min-w-0">{r.textTh}</span>
            </h3>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="font-semibold text-foreground">SAR (อ่านอย่างเดียว)</strong>
                  {sec && <Button asChild variant="outline" size="compact"><Link href={sectionHref(cycle.id, r.id)}>เปิดเต็มหน้า<Icon name="external" size={16} /></Link></Button>}
                </div>
                <div className={cn(SUBBOX, 'max-h-[28rem] overflow-y-auto')} data-testid="sar-readonly">
                  {sec?.narrativeTh ? <Narrative text={sec.narrativeTh} evidence={ev} cycleId={cycle.id} /> : <span className="text-muted-foreground">ยังไม่มีเนื้อหา</span>}
                </div>
                {self(r.id) && <p className="text-muted-foreground">{`ประเมินตนเอง: ${self(r.id)!.score} คะแนน — ${self(r.id)!.rationale}`}</p>}
                <strong className="block font-semibold text-foreground">หลักฐานที่ผูก ({ev.length})</strong>
                {ev.length === 0 ? <p className="text-muted-foreground">ไม่มีหลักฐานผูกกับข้อนี้</p> : (
                  <ul className="list-none divide-y rounded-lg border">
                    {ev.map(e => (
                      <li key={e.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2">
                        <Link className={cn(LINK, 'font-semibold tabular-nums')} href={`/app/evidence/${e.id}?cycle=${cycle.id}`}><strong className="font-semibold">{e.code}</strong></Link>
                        <span className="min-w-0 flex-1 text-foreground">{e.title}</span> <Badge>{e.pdcaStage}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <FindingForm key={`${r.id}-${d.findings.find(f => f.requirementId === r.id && f.assessorUserId === user.id)?.updatedAt ?? 0}`}
                reqId={r.id} user={user} cycle={cycle} d={d} writable={writable} reload={reload} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

function pick(f?: AssessmentFinding) {
  return { strengths: f?.strengths ?? '', afi: f?.afi ?? '', sourcesOfEvidence: f?.sourcesOfEvidence ?? '', interviewQuestions: f?.interviewQuestions ?? '' };
}

/** แสดง narrative โดยทำ [E-x.x-xx] ให้คลิกไปดูหลักฐานได้ */
function Narrative({ text, evidence, cycleId }: { text: string; evidence: EvidenceView[]; cycleId: string }) {
  const parts = text.split(/(\[E-[^\]]+\])/g);
  return (
    <p className="whitespace-pre-wrap break-words leading-[1.75] text-foreground">
      {parts.map((p, i) => {
        const m = /^\[(E-[^\]]+)\]$/.exec(p);
        const ev = m && evidence.find(e => e.code === m[1]);
        return ev ? <Link key={i} href={`/app/evidence/${ev.id}?cycle=${cycleId}`} className={cn(LINK, 'font-medium')} data-testid={`cite-${ev.code}`}>{p}</Link> : <Fragment key={i}>{p}</Fragment>;
      })}
    </p>
  );
}

// ───────────── Appendix B ต่อข้อ ─────────────
function FindingForm({ reqId, user, cycle, d, writable, reload }: { reqId: string; user: AppUser; cycle: AssessmentCycle; d: D; writable: boolean; reload: () => void }) {
  const { showToast } = useToast();
  const mine = d.findings.find(f => f.requirementId === reqId && f.assessorUserId === user.id);
  const [f, setF] = useState(pick(mine));
  const others = d.findings.filter(x => x.requirementId === reqId && x.assessorUserId !== user.id);
  function save() {
    try { upsertFinding(user, cycle.id, reqId, f); showToast(`บันทึกข้อค้นพบข้อ ${reqId} แล้ว`, 'success'); reload(); } catch (e) { showToast(errMsg(e), 'error'); }
  }
  const fields: [keyof typeof f, string][] = [
    ['strengths', 'จุดแข็ง (Strengths)'], ['afi', 'ข้อควรปรับปรุง (AFI)'],
    ['interviewQuestions', 'คำถามสัมภาษณ์'], ['sourcesOfEvidence', 'แหล่งหลักฐาน (Sources of evidence)'],
  ];
  return (
    <div className="min-w-0 space-y-4" data-testid={`finding-${reqId}`}>
      <strong className="block font-semibold text-foreground">Appendix B — ข้อค้นพบของคุณ</strong>
      {d.assessor ? fields.map(([k, l]) => (
        <label key={k} className="block space-y-1.5">
          <span className={LABEL}>{l}</span>
          <Textarea rows={2} className="min-h-20" value={f[k]} readOnly={!writable} onChange={e => setF({ ...f, [k]: e.target.value })} data-testid={`f-${k}-${reqId}`} />
        </label>
      )) : null}
      {d.assessor && writable && <Button type="button" size="compact" onClick={save} data-testid={`f-save-${reqId}`}>บันทึกข้อนี้</Button>}
      {others.length > 0 && (
        <div className="space-y-3" data-testid="finding-others">
          {others.map(o => (
            <div key={o.id} className={cn(SUBBOX, 'space-y-1')}>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <strong className="font-semibold text-foreground">{d.names[o.assessorUserId] || o.assessorUserId}</strong> <span className="aq-meta">{fmtDateTime(o.updatedAt)}</span>
              </p>
              {fields.map(([k, l]) => o[k] ? <p key={k} className="text-foreground"><span className="text-muted-foreground">{l}:</span> {o[k]}</p> : null)}
            </div>
          ))}
        </div>
      )}
      {!d.assessor && others.length === 0 && <Empty text="กรรมการไม่ได้บันทึกข้อค้นพบในข้อนี้" />}
    </div>
  );
}

// ───────────── ผล AI-9 ─────────────
interface Summary { requirementId: string; summary: string; strengths: string[]; concerns: string[] }
interface QGroup { group: keyof typeof GROUP_TH; items: { w: string; requirementId: string; question: string }[] }
function SummaryResult({ run, onAddQuestion, writable, onClose }: { run: AiRun; onAddQuestion: (reqId: string, text: string) => void; writable: boolean; onClose: () => void }) {
  const out = run.output as { summaries?: Summary[]; questions?: QGroup[] };
  return (
    <div className={cn(SUBBOX, 'animate-fade-in space-y-4')} data-testid="ai9-result">
      <div className="flex flex-wrap gap-2">
        <Badge tone="info">สรุปโดย AI</Badge><ModelBadge run={run} />
        <Badge title="จำนวนข้อมูลส่วนบุคคลที่ปกปิดก่อนส่ง">ปกปิด {run.redactionCount} จุด</Badge>
        <Badge tone={run.postCheck.ok ? 'ok' : 'warn'}>{run.postCheck.ok ? 'ผ่านการตรวจอ้างอิง/ตัวเลข' : 'พบข้อควรระวัง'}</Badge>
      </div>
      {(out.summaries ?? []).map(s => (
        <div key={s.requirementId} className="space-y-1 text-foreground">
          <p><strong className="font-semibold">ข้อ {s.requirementId}</strong> <span>{s.summary}</span></p>
          {s.strengths.length > 0 && <ul className="list-disc space-y-0.5 pl-6">{s.strengths.map((x, i) => <li key={i}>จุดแข็ง: {x}</li>)}</ul>}
          {s.concerns.length > 0 && (
            <ul className="list-none space-y-0.5">
              {s.concerns.map((x, i) => (
                <li key={i} className="flex items-start gap-2"><Icon name="alert-triangle" size={20} className={cn('mt-0.5 shrink-0', TONE_TEXT.warn)} /><span>ข้อสังเกต: {x}</span></li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <h3 className={H3}>คำถามสัมภาษณ์แนะนำ</h3>
      {(out.questions ?? []).map(g => (
        <div key={g.group} className="space-y-2">
          <strong className="block font-semibold text-foreground">{GROUP_TH[g.group] ?? g.group}</strong>
          <ul className="list-none divide-y rounded-lg border bg-card">
            {g.items.map((it, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
                <Badge>{it.w}</Badge>
                <span className="min-w-0 flex-1 basis-48 text-foreground">{it.question} <span className="text-muted-foreground">(ข้อ {it.requirementId})</span></span>
                {writable && <Button type="button" variant="outline" size="compact" onClick={() => onAddQuestion(it.requirementId, `[${GROUP_TH[g.group]}] ${it.question}`)}>ใช้คำถามนี้</Button>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={onClose}>ปิด</Button>
    </div>
  );
}
