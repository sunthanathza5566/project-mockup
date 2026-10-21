'use client';

import { Fragment, useState } from 'react';
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
import { Async, AsyncButton, Badge, CycleStatusBadge, Empty, ModelBadge, PageHeader, useLoad, useMe } from '@/components/aunqa/common';
import { GROUP_TH, decodeParam, errMsg, fmtDateTime, sectionHref } from '@/lib/ui/aunqa';

const scaleName = (n: number) => RATING_SCALE.find(s => s.score === n)?.nameTh ?? '';

/** S14 พื้นที่ทำงานกรรมการประเมิน: SAR (อ่านอย่างเดียว) + Appendix B ต่อข้อ + คะแนนรายเกณฑ์ + verdict + AI-9
 *  หลักสูตรเห็นผลของกรรมการได้เมื่อรอบเป็น “ประเมินแล้ว/ปิดรอบ” */
export default function AssessPage() {
  const user = useMe();
  const id = decodeParam(useParams().id);
  const [crit, setCrit] = useState(1);

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
            title={<>{assessor ? 'พื้นที่ทำงานกรรมการ' : 'ผลการประเมินของกรรมการ'} <span className="aq-muted aq-h1-sub">รอบ {cycle.academicYear} · {getProgramme(cycle.programmeId)?.nameTh}</span></>}
            sub={<>สถานะ <CycleStatusBadge status={cycle.status} /> · {assessor ? 'อ่าน SAR/หลักฐานได้อย่างเดียว บันทึกได้เฉพาะข้อค้นพบและคะแนนของคุณ' : 'อ่านอย่างเดียว'}</>}
            actions={<Link className="aq-btn" href={`/app/cycles/${id}`}>กลับแดชบอร์ดรอบ</Link>}
          />
          {!visible ? (
            <div className="auth-alert auth-alert-warn" data-testid="assess-hidden">ผลการประเมินของกรรมการจะแสดงเมื่อกรรมการส่งผลแล้ว (สถานะ “ประเมินแล้ว”) — ตอนนี้ยังไม่แสดงเพื่อความเป็นอิสระของการประเมิน</div>
          ) : (
            <>
              {assessor && cycle.status !== 'under_assessment' && (
                <div className="auth-alert auth-alert-warn" data-testid="assess-notopen">
                  {released ? 'ส่งผลประเมินแล้ว แก้ไขไม่ได้' : 'รอบนี้ยังไม่เข้าสู่ขั้นการประเมิน (รอ QA คณะ/ผู้ดูแลเริ่มการประเมิน) จึงยังบันทึกไม่ได้'}
                </div>
              )}
              {assessor && d.progress && <ProgressCard user={user} cycle={cycle} d={d} writable={writable} reload={q.reload} />}
              {!assessor && <ResultsOverview d={d} />}
              <div className="dash-tabs-bar aq-tabs" role="tablist" aria-label="เกณฑ์">
                {listCriteria().map(c => {
                  const done = d.progress ? d.progress.ratedCriteria.includes(c.no) : d.ratings.some(r => r.criterionNo === c.no);
                  return (
                    <button key={c.no} role="tab" aria-selected={crit === c.no} className={`dash-tab-btn${crit === c.no ? ' active' : ''}`} onClick={() => setCrit(c.no)} data-testid={`assess-crit-${c.no}`}>
                      เกณฑ์ {c.no}{done ? ' ✓' : ''}
                    </button>
                  );
                })}
              </div>
              <CriterionPanel key={crit} no={crit} user={user} cycle={cycle} d={d} writable={writable} reload={q.reload} />
            </>
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
    if (!(await confirm({ title: 'ส่งผลการประเมิน', message: 'เมื่อส่งแล้วรอบจะเป็น “ประเมินแล้ว” แก้ผลไม่ได้ และหลักสูตรจะเห็นข้อค้นพบ คะแนน และ verdict ของกรรมการทั้งหมด', variant: 'warning' }))) return;
    try { await transitionCycle(user, cycle.id, 'assessed'); showToast('ส่งผลการประเมินแล้ว', 'success'); reload(); } catch (e) { showToast(errMsg(e), 'error'); }
  }
  return (
    <section className="aq-card" aria-labelledby="prog-h" data-testid="assess-progress">
      <h2 id="prog-h" className="aq-h2">ความคืบหน้าและผลรวม</h2>
      <ul className="aq-checklist">
        <li data-done={p.ratedCriteria.length === 8}>{p.ratedCriteria.length === 8 ? '✓' : '○'} ให้คะแนนรายเกณฑ์แล้ว <strong data-testid="rated-count">{p.ratedCriteria.length}/8</strong>{p.missingCriteria.length > 0 && <span className="aq-muted"> (ยังขาดเกณฑ์ {p.missingCriteria.join(', ')})</span>}</li>
        <li data-done={p.hasVerdict}>{p.hasVerdict ? '✓' : '○'} เลือก verdict ภาพรวมแล้ว</li>
        <li>ข้อค้นพบ (Appendix B) ที่บันทึกแล้ว: {p.findingCount} ข้อ (ไม่บังคับ)</li>
      </ul>
      <div className="aq-form-inline">
        <label>Verdict ภาพรวม (คุณเลือกเอง — ระบบไม่คำนวณหรือแนะนำให้)
          <select className="aq-input" value={v} disabled={!writable} onChange={e => setV(e.target.value)} data-testid="verdict-score">
            <option value="">— ยังไม่เลือก —</option>
            {RATING_SCALE.map(s => <option key={s.score} value={s.score}>{s.score} — {s.nameTh}</option>)}
          </select>
        </label>
        <label style={{ flex: 1 }}>เหตุผลประกอบ<input className="aq-input" value={why} disabled={!writable} onChange={e => setWhy(e.target.value)} data-testid="verdict-why" /></label>
        {writable && <button className="aq-btn aq-btn-sm" disabled={!v} onClick={saveVerdict} data-testid="verdict-save">บันทึก verdict</button>}
      </div>
      <div className="aq-actions" style={{ marginTop: '0.8rem' }}>
        <AsyncButton className="aq-btn aq-btn-primary" testId="assess-finish" disabled={!writable || !p.canFinish} onClick={finish}
          title={!p.canFinish ? 'ต้องให้คะแนนครบ 8 เกณฑ์และเลือก verdict ก่อน' : undefined}>ส่งผลการประเมิน (เสร็จสิ้น)</AsyncButton>
        <AsyncButton className="aq-btn" testId="assess-appb" onClick={() => { downloadBlob(exportAppendixBDoc(user, cycle.id), `AppendixB_${cycle.academicYear}.doc`); }}>Appendix B (.doc)</AsyncButton>
        <AsyncButton className="aq-btn" testId="assess-appd" onClick={() => { downloadBlob(exportAppendixDDoc(user, cycle.id), `AppendixD_${cycle.academicYear}.doc`); }}>Appendix D (.doc)</AsyncButton>
      </div>
    </section>
  );
}

// ───────────── มุมมองหลักสูตรหลังประเมินแล้ว ─────────────
function ResultsOverview({ d }: { d: D }) {
  return (
    <section className="aq-card" aria-labelledby="res-h" data-testid="assess-results">
      <h2 id="res-h" className="aq-h2">สรุปผลของกรรมการ</h2>
      {d.verdicts.length === 0 ? <Empty text="ไม่มี verdict" /> : (
        <ul className="aq-list">
          {d.verdicts.map(v => (
            <li key={v.id} data-testid="verdict-row"><strong>{d.names[v.assessorUserId] || v.assessorUserId}</strong>
              <span style={{ flex: 1 }}>verdict <Badge tone="info">{v.verdict} — {scaleName(v.verdict)}</Badge> {v.rationale && <span className="aq-muted">{v.rationale}</span>}</span></li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ───────────── รายเกณฑ์ ─────────────
function CriterionPanel({ no, user, cycle, d, writable, reload }: { no: number; user: AppUser; cycle: AssessmentCycle; d: D; writable: boolean; reload: () => void }) {
  const { showToast } = useToast();
  const crit = listCriteria().find(c => c.no === no);
  const reqs = listRequirements(no);
  const myRating = d.ratings.find(r => r.criterionNo === no && r.raterUserId === user.id);
  const [score, setScore] = useState(String(myRating?.score ?? ''));
  const [why, setWhy] = useState(myRating?.rationale ?? '');
  const [run, setRun] = useState<AiRun | null>(null);
  const canAi = d.assessor && cycle.status === 'under_assessment' && can(user, 'ai.summarize', cycleScope(cycle));

  function saveRating() {
    try { setCriterionRating(user, cycle.id, no, Number(score), why); showToast(`บันทึกคะแนนเกณฑ์ ${no} แล้ว`, 'success'); reload(); } catch (e) { showToast(errMsg(e), 'error'); }
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
    <div data-testid={`assess-panel-${no}`}>
      <section className="aq-card" aria-labelledby="cr-h">
        <h2 id="cr-h" className="aq-h2">เกณฑ์ {no}: {crit?.nameTh} <span className="aq-muted aq-h2-sub">{crit?.nameEn}</span></h2>
        <div className="aq-form-inline">
          <label>คะแนนเกณฑ์นี้ (1–7)
            <select className="aq-input" value={score} disabled={!writable} onChange={e => setScore(e.target.value)} data-testid="crit-score">
              <option value="">— ยังไม่ให้คะแนน —</option>
              {RATING_SCALE.map(s => <option key={s.score} value={s.score}>{s.score} — {s.nameTh}</option>)}
            </select>
          </label>
          <label style={{ flex: 1 }}>เหตุผล<input className="aq-input" value={why} disabled={!writable} onChange={e => setWhy(e.target.value)} data-testid="crit-why" /></label>
          {writable && <button className="aq-btn aq-btn-sm aq-btn-primary" disabled={!score} onClick={saveRating} data-testid="crit-save">บันทึกคะแนน</button>}
        </div>
        {!d.assessor && d.ratings.filter(r => r.criterionNo === no).map(r => (
          <p key={r.id} data-testid="crit-result">{d.names[r.raterUserId] || r.raterUserId}: <Badge tone="info">{r.score} — {scaleName(r.score)}</Badge> {r.rationale}</p>
        ))}
        {d.assessor && others.length > 0 && (
          <p className="aq-muted">กรรมการท่านอื่น: {others.map(r => `${d.names[r.raterUserId] || r.raterUserId} ให้ ${r.score}`).join(' · ')}</p>
        )}
        {canAi && (
          <div style={{ marginTop: '0.8rem' }}>
            <AsyncButton className="aq-btn" testId="ai-summarize" onClick={summarize}>AI สรุปเกณฑ์นี้ + ร่างคำถามสัมภาษณ์</AsyncButton>
            <span className="aq-muted"> AI ช่วยสรุปและเสนอคำถามเท่านั้น — ไม่ให้คะแนนหรือ verdict</span>
          </div>
        )}
        {run && <SummaryResult run={run} onAddQuestion={addQuestion} writable={writable} onClose={() => setRun(null)} />}
      </section>

      {reqs.map(r => {
        const sec = d.sections.find(s => s.requirementId === r.id);
        const ev = d.evidence.filter(e => e.requirementIds.includes(r.id));
        return (
          <section key={r.id} className="aq-card" aria-labelledby={`req-${r.id}`} data-testid={`assess-req-${r.id}`}>
            <h3 id={`req-${r.id}`} className="aq-h3"><span className="aq-reqno">{r.id}</span> {r.textTh}</h3>
            <div className="aq-grid-2">
              <div>
                <div className="aq-row-between"><strong>SAR (อ่านอย่างเดียว)</strong>{sec && <Link className="aq-btn aq-btn-sm" href={sectionHref(cycle.id, r.id)}>เปิดเต็มหน้า</Link>}</div>
                <div className="aq-sar-text" data-testid="sar-readonly">{sec?.narrativeTh ? <Narrative text={sec.narrativeTh} evidence={ev} cycleId={cycle.id} /> : <span className="aq-muted">ยังไม่มีเนื้อหา</span>}</div>
                {self(r.id) && <p className="aq-muted">ประเมินตนเอง: {self(r.id)!.score} คะแนน — {self(r.id)!.rationale}</p>}
                <strong>หลักฐานที่ผูก ({ev.length})</strong>
                {ev.length === 0 ? <p className="aq-muted">ไม่มีหลักฐานผูกกับข้อนี้</p> : (
                  <ul className="aq-list">{ev.map(e => <li key={e.id}><Link href={`/app/evidence/${e.id}?cycle=${cycle.id}`}><strong>{e.code}</strong></Link> {e.title} <Badge>{e.pdcaStage}</Badge></li>)}</ul>
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
    <p style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((p, i) => {
        const m = /^\[(E-[^\]]+)\]$/.exec(p);
        const ev = m && evidence.find(e => e.code === m[1]);
        return ev ? <Link key={i} href={`/app/evidence/${ev.id}?cycle=${cycleId}`} className="aq-cite" data-testid={`cite-${ev.code}`}>{p}</Link> : <Fragment key={i}>{p}</Fragment>;
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
    <div className="aq-form" data-testid={`finding-${reqId}`}>
      <strong>Appendix B — ข้อค้นพบของคุณ</strong>
      {d.assessor ? fields.map(([k, l]) => (
        <label key={k}>{l}<textarea className="aq-textarea" rows={2} value={f[k]} readOnly={!writable} onChange={e => setF({ ...f, [k]: e.target.value })} data-testid={`f-${k}-${reqId}`} /></label>
      )) : null}
      {d.assessor && writable && <button className="aq-btn aq-btn-sm aq-btn-primary" onClick={save} data-testid={`f-save-${reqId}`}>บันทึกข้อนี้</button>}
      {others.length > 0 && (
        <div data-testid="finding-others">
          {others.map(o => (
            <div key={o.id} className="aq-clo-box">
              <strong>{d.names[o.assessorUserId] || o.assessorUserId}</strong> <span className="aq-muted">{fmtDateTime(o.updatedAt)}</span>
              {fields.map(([k, l]) => o[k] ? <p key={k}><span className="aq-muted">{l}:</span> {o[k]}</p> : null)}
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
    <div className="aq-ai-result" data-testid="ai9-result">
      <div className="aq-chips">
        <Badge tone="info">สรุปโดย AI</Badge><ModelBadge run={run} />
        <Badge title="จำนวนข้อมูลส่วนบุคคลที่ปกปิดก่อนส่ง">ปกปิด {run.redactionCount} จุด</Badge>
        <Badge tone={run.postCheck.ok ? 'ok' : 'warn'}>{run.postCheck.ok ? 'ผ่านการตรวจอ้างอิง/ตัวเลข' : 'พบข้อควรระวัง'}</Badge>
      </div>
      {(out.summaries ?? []).map(s => (
        <div key={s.requirementId}>
          <strong>ข้อ {s.requirementId}</strong> <span>{s.summary}</span>
          {s.strengths.length > 0 && <ul>{s.strengths.map((x, i) => <li key={i}>จุดแข็ง: {x}</li>)}</ul>}
          {s.concerns.length > 0 && <ul className="aq-warnlist">{s.concerns.map((x, i) => <li key={i}>ข้อสังเกต: {x}</li>)}</ul>}
        </div>
      ))}
      <h3 className="aq-h3">คำถามสัมภาษณ์แนะนำ</h3>
      {(out.questions ?? []).map(g => (
        <div key={g.group}>
          <strong>{GROUP_TH[g.group] ?? g.group}</strong>
          <ul className="aq-list">
            {g.items.map((it, i) => (
              <li key={i}><Badge>{it.w}</Badge><span style={{ flex: 1 }}>{it.question} <span className="aq-muted">(ข้อ {it.requirementId})</span></span>
                {writable && <button className="aq-btn aq-btn-sm" onClick={() => onAddQuestion(it.requirementId, `[${GROUP_TH[g.group]}] ${it.question}`)}>ใช้คำถามนี้</button>}</li>
            ))}
          </ul>
        </div>
      ))}
      <button className="aq-btn" onClick={onClose}>ปิด</button>
    </div>
  );
}
