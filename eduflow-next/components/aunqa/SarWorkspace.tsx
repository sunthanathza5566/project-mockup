'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  acceptAiRun, addComment, approveSection, can, cycleScope, linkEvidence, programmeScope, resolveComment,
  restoreVersion, returnSection, runSarDrafter, runSarReviewer, runTranslate, saveSection, setSelfRating,
  submitSection, unlinkEvidence, validateCitations,
} from '@/lib/api';
import type {
  AiRun, AppUser, AssessmentCycle, Comment, Rating, Requirement, SarSection, SarSectionVersion,
} from '@/lib/types';
import type { EvidenceView } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { AsyncButton, Badge, Empty, ModelBadge, SectionStatusBadge } from './common';
import RequirementCard from './RequirementCard';
import TranslateResult from './TranslateResult';
import { PDCA_TH, errMsg, fmtDate, fmtDateTime } from '@/lib/ui/aunqa';

type Lang = 'th' | 'en';
const WRITABLE_CYCLE = ['draft', 'in_progress', 'revision_requested'];
const EDITABLE_SECTION = ['not_started', 'drafting', 'changes_requested'];

export interface WorkspaceData {
  cycle: AssessmentCycle;
  section: SarSection;
  req: Requirement;
  linked: EvidenceView[];
  linkable: EvidenceView[];
  versions: SarSectionVersion[];
  ratings: Rating[];
  comments: Comment[];
  names: Record<string, string>;
  aiEnabled: boolean;
}

export default function SarWorkspace({ data, user, reload, remount }: {
  data: WorkspaceData; user: AppUser; reload: () => void; remount: () => void;
}) {
  const { cycle, section, req, linked, linkable, versions, ratings, comments, names, aiEnabled } = data;
  const { showToast } = useToast();
  const { confirm, prompt } = useDialog();

  const scope = cycleScope(cycle, { ownerUserId: section.ownerUserId });
  const cycleWritable = !cycle.lockedAt && WRITABLE_CYCLE.includes(cycle.status);
  const sectionEditable = EDITABLE_SECTION.includes(section.status);
  const canWrite = can(user, 'sar.write', scope);
  const editable = canWrite && cycleWritable && sectionEditable;
  const canEvidenceWrite = can(user, 'evidence.write', programmeScope(cycle.programmeId)) && cycleWritable;
  const canAi = can(user, 'ai.use', scope) && aiEnabled;

  // ─── editor state ───
  const [lang, setLang] = useState<Lang>('th');
  const [th, setTh] = useState(section.narrativeTh);
  const [en, setEn] = useState(section.narrativeEn);
  const [pdca, setPdca] = useState(section.pdca);
  const [touched, setTouched] = useState(false);
  const [saveInfo, setSaveInfo] = useState('');
  const [saveErr, setSaveErr] = useState(false);
  const thRef = useRef<HTMLTextAreaElement>(null);
  const enRef = useRef<HTMLTextAreaElement>(null);

  function save(reason: 'autosave' | 'manual'): boolean {
    try {
      saveSection(user, cycle.id, req.id, {
        narrativeTh: th, narrativeEn: en,
        pdca: { plan: pdca.plan, do: pdca.do, check: pdca.check, act: pdca.act },
      }, reason);
      setTouched(false); setSaveErr(false);
      setSaveInfo(`บันทึกแล้ว ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
      if (reason === 'manual') { showToast('บันทึกแล้ว', 'success'); reload(); }
      return true;
    } catch (e) {
      setSaveErr(true); setSaveInfo(`ยังไม่ได้บันทึก: ${errMsg(e)}`);
      if (reason === 'manual') showToast(errMsg(e), 'error');
      return false;
    }
  }

  // autosave: หยุดพิมพ์ 1.5 วิ
  useEffect(() => {
    if (!editable || !touched) return;
    const t = setTimeout(() => save('autosave'), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [th, en, pdca, touched, editable]);

  const citations = useMemo(() => validateCitations(cycle.id, `${th}\n${en}`), [cycle.id, th, en, linked.length]);
  const words = (lang === 'th' ? th : en).trim().split(/\s+/).filter(Boolean).length;

  function insertCitation(code: string) {
    const ref = lang === 'th' ? thRef.current : enRef.current;
    const tag = `[${code}]`;
    const cur = lang === 'th' ? th : en;
    const pos = ref ? ref.selectionStart : cur.length;
    const next = `${cur.slice(0, pos)}${tag}${cur.slice(pos)}`;
    if (lang === 'th') setTh(next); else setEn(next);
    setTouched(true);
    setTimeout(() => { ref?.focus(); ref?.setSelectionRange(pos + tag.length, pos + tag.length); }, 0);
  }

  // ─── workflow ───
  async function doSubmit() {
    if (touched && !save('manual')) return;
    const ok = await confirm({ title: 'ส่งตรวจ', message: `ส่งข้อ ${req.id} ให้ประธานหลักสูตรตรวจ? หลังส่งแล้วจะแก้ไขไม่ได้จนกว่าจะถูกส่งกลับ` });
    if (!ok) return;
    try { submitSection(user, cycle.id, req.id); showToast('ส่งตรวจแล้ว', 'success'); remount(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function doApprove() {
    try { approveSection(user, cycle.id, req.id); showToast(`อนุมัติข้อ ${req.id} แล้ว`, 'success'); remount(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function doReturn() {
    const note = await prompt({ title: `ส่งข้อ ${req.id} กลับแก้ไข`, message: 'ระบุสิ่งที่ต้องแก้ (เจ้าของข้อจะได้รับแจ้งเตือน)', required: true, variant: 'warning' });
    if (note === null) return;
    try { returnSection(user, cycle.id, req.id, note); showToast('ส่งกลับแล้ว', 'success'); remount(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function doRestore(v: SarSectionVersion) {
    const ok = await confirm({ title: 'กู้คืนเวอร์ชัน', message: `กู้คืนเนื้อหาเมื่อ ${fmtDateTime(v.savedAt)}? เนื้อหาปัจจุบันจะถูกเก็บเป็นเวอร์ชันไว้ก่อน`, variant: 'warning' });
    if (!ok) return;
    try { restoreVersion(user, v.id); showToast('กู้คืนแล้ว', 'success'); remount(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }

  const approverRole = section.status === 'ready_for_review' && can(user, 'sar.approve', scope);
  const selfAuthored = approverRole && !!section.lastAuthorId && section.lastAuthorId === user.id;
  const canApprove = approverRole && !selfAuthored;
  const canReturn = (section.status === 'ready_for_review' || section.status === 'approved') && can(user, 'sar.return', scope);
  const canSubmit = editable && (section.status === 'drafting' || section.status === 'changes_requested' || section.status === 'not_started');

  // ─── evidence link ───
  const [linkId, setLinkId] = useState('');
  function doLink() {
    if (!linkId) return;
    try { linkEvidence(user, linkId, cycle.id, [req.id]); setLinkId(''); showToast('ผูกหลักฐานแล้ว', 'success'); reload(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  function doUnlink(id: string) {
    try { unlinkEvidence(user, id, cycle.id, req.id); showToast('เลิกผูกแล้ว', 'success'); reload(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }

  // ─── AI ───
  const [run, setRun] = useState<AiRun | null>(null);
  const [aiMode, setAiMode] = useState<'append' | 'replace'>('append');
  async function doAi(kind: 'draft' | 'review') {
    if (touched) save('autosave');
    try {
      const r = kind === 'draft' ? await runSarDrafter(user, cycle.id, req.id, lang) : await runSarReviewer(user, cycle.id, req.id, lang);
      setRun(r);
    } catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function doTranslate() {
    if (touched && !save('autosave')) return;
    try { setRun(await runTranslate(user, section.id, lang === 'th' ? 'en' : 'th')); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  function doAccept() {
    if (!run) return;
    if (touched && !save('autosave')) return;
    try {
      acceptAiRun(user, run.id, { mode: aiMode });
      showToast(run.feature === 'AI-2' ? 'ใส่ร่างเข้าเอกสารแล้ว' : run.feature === 'AI-4' ? 'ใส่คำแปลเข้าเอกสารแล้ว (ดูที่แท็บภาษาปลายทาง)' : 'รับทราบคำแนะนำแล้ว', 'success');
      setRun(null);
      remount();
    } catch (e) { showToast(errMsg(e), 'error'); }
  }

  // ─── comments ───
  const [cBody, setCBody] = useState('');
  function doComment() {
    try { addComment(user, cycle.id, req.id, cBody); setCBody(''); reload(); } catch (e) { showToast(errMsg(e), 'error'); }
  }

  const unresolved = comments.filter(c => !c.resolvedAt).length;

  return (
    <div className="aq-editor" data-testid="sar-editor">
      {/* ซ้าย: requirement card */}
      <aside className="aq-col" aria-label="ข้อกำหนด">
        <RequirementCard req={req} />
        <div className="aq-card aq-meta">
          <div>สถานะ: <SectionStatusBadge status={section.status} /></div>
          <div>เจ้าของ: {names[section.ownerUserId || ''] || 'ยังไม่มอบหมาย'}</div>
          <div>กำหนดส่ง: {fmtDate(section.due)}</div>
        </div>
      </aside>

      {/* กลาง: narrative */}
      <section className="aq-col" aria-label="เนื้อหา SAR">
        {!editable && (
          <div className="auth-alert auth-alert-warn" data-testid="readonly-reason">
            {cycle.lockedAt ? 'รอบถูกล็อกแล้ว แก้ไขไม่ได้'
              : !cycleWritable ? 'รอบอยู่ในสถานะที่แก้ไขเนื้อหาไม่ได้'
                : !sectionEditable ? 'ข้อนี้อยู่ระหว่างตรวจหรืออนุมัติแล้ว แก้ไขไม่ได้'
                  : 'คุณไม่มีสิทธิ์แก้ไขข้อนี้ (ดูอย่างเดียว)'}
          </div>
        )}
        <div className="aq-card">
          <div className="aq-row-between">
            <div className="aq-tabs-mini" role="tablist">
              <button role="tab" aria-selected={lang === 'th'} className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')} data-testid="tab-th">ภาษาไทย</button>
              <button role="tab" aria-selected={lang === 'en'} className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')} data-testid="tab-en">English</button>
            </div>
            <span className={`aq-muted aq-save${saveErr ? ' aq-save-err' : ''}`} role="status" data-testid="save-status">
              {saveInfo || (editable ? 'พร้อมแก้ไข' : 'อ่านอย่างเดียว')}
            </span>
          </div>
          <textarea
            ref={thRef} className="aq-textarea" rows={14} hidden={lang !== 'th'} value={th} readOnly={!editable}
            aria-label="เนื้อหา SAR ภาษาไทย" data-testid="narrative-th"
            placeholder="บรรยายตามเกณฑ์ข้อนี้ พร้อมอ้างอิงหลักฐานด้วยรหัส เช่น [E-1.1-01]"
            onChange={e => { setTh(e.target.value); setTouched(true); }}
          />
          <textarea
            ref={enRef} className="aq-textarea" rows={14} hidden={lang !== 'en'} value={en} readOnly={!editable}
            aria-label="SAR narrative (English)" data-testid="narrative-en" lang="en"
            placeholder="Describe how the programme meets this criterion; cite evidence like [E-1.1-01]"
            onChange={e => { setEn(e.target.value); setTouched(true); }}
          />
          <div className="aq-row-between">
            <span className="aq-muted">{words} คำ</span>
            {editable && <button className="aq-btn aq-btn-sm" onClick={() => save('manual')} data-testid="save-manual">บันทึกตอนนี้</button>}
          </div>
          {citations.invalid.length > 0 && (
            <div className="auth-alert auth-alert-err" role="alert" data-testid="citation-warn">
              อ้างอิงหลักฐานที่ไม่มีอยู่ในรอบนี้: {citations.invalid.map(c => `[${c}]`).join(' ')} — ระบบจะไม่บันทึกจนกว่าจะแก้
            </div>
          )}
          {citations.valid.length > 0 && <div className="aq-muted" style={{ fontSize: '0.8rem' }}>อ้างอิงแล้ว: {citations.valid.map(c => `[${c}]`).join(' ')}</div>}
        </div>

        <fieldset className="aq-card aq-pdca" disabled={!editable}>
          <legend className="aq-h3">PDCA ที่ครอบคลุมในเนื้อหา</legend>
          {([['plan', 'P', 'Plan — มีแผน/นโยบาย'], ['do', 'D', 'Do — ดำเนินการจริง'], ['check', 'C', 'Check — ติดตามตรวจสอบ'], ['act', 'A', 'Act — ปรับปรุงจากผล']] as const).map(([k, l, t]) => (
            <label key={k}>
              <input type="checkbox" checked={pdca[k]} data-testid={`pdca-${l}`}
                onChange={e => { setPdca(p => ({ ...p, [k]: e.target.checked })); setTouched(true); }} /> {t}
            </label>
          ))}
        </fieldset>

        <RatingPanel user={user} cycle={cycle} section={section} ratings={ratings} scope={scope} cycleWritable={cycleWritable} reload={reload} />

        <div className="aq-card aq-actions" data-testid="section-actions">
          {canSubmit && <AsyncButton className="aq-btn aq-btn-primary" testId="section-submit" onClick={doSubmit}>ส่งตรวจ</AsyncButton>}
          {canApprove && <AsyncButton className="aq-btn aq-btn-primary" testId="section-approve" onClick={doApprove}>อนุมัติข้อนี้</AsyncButton>}
          {canReturn && <AsyncButton className="aq-btn aq-btn-danger" testId="section-return" onClick={doReturn}>ส่งกลับแก้ไข</AsyncButton>}
          {selfAuthored && (
            <div className="auth-alert auth-alert-warn" style={{ flex: '1 1 100%' }} data-testid="segregation-note">
              คุณเป็นผู้เขียนเนื้อหาล่าสุดของข้อนี้ จึงอนุมัติเองไม่ได้ (หลักการแยกหน้าที่ผู้เขียนกับผู้อนุมัติ) — ให้มอบหมายข้อนี้ให้ผู้อื่นปรับหรือส่งตรวจ แล้วคุณค่อยอนุมัติ หรือกด “ส่งกลับแก้ไข” หากต้องการให้แก้เพิ่ม
            </div>
          )}
          {!canSubmit && !canApprove && !canReturn && !selfAuthored && <span className="aq-muted">ไม่มีการดำเนินการที่ทำได้ในสถานะนี้</span>}
        </div>

        <details className="aq-card" data-testid="versions">
          <summary className="aq-h3">ประวัติเวอร์ชัน ({versions.length})</summary>
          {versions.length === 0 ? <Empty text="ยังไม่มีเวอร์ชันที่บันทึก" /> : (
            <ul className="aq-list">
              {versions.map(v => (
                <li key={v.id}>
                  <span>{fmtDateTime(v.savedAt)}</span>
                  <Badge>{v.reason === 'autosave' ? 'อัตโนมัติ' : v.reason === 'manual' ? 'บันทึกเอง' : v.reason === 'ai_accept' ? 'จาก AI' : 'ส่งตรวจ'}</Badge>
                  <span className="aq-muted" style={{ flex: 1 }}>{names[v.savedBy] || v.savedBy}</span>
                  {editable && <button className="aq-btn aq-btn-sm" onClick={() => doRestore(v)}>กู้คืน</button>}
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>

      {/* ขวา: evidence + AI + comments */}
      <aside className="aq-col" aria-label="หลักฐานและผู้ช่วย">
        <section className="aq-card" aria-labelledby="ev-h">
          <h2 id="ev-h" className="aq-h3">หลักฐานที่ผูกกับข้อนี้ ({linked.length})</h2>
          {linked.length === 0 ? <Empty text="ยังไม่มีหลักฐานที่ผูก" /> : (
            <ul className="aq-list" data-testid="linked-evidence">
              {linked.map(e => (
                <li key={e.id} className="aq-ev-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/app/evidence/${e.id}?cycle=${cycle.id}`}><strong>{e.code}</strong></Link> {e.title}
                    <div className="aq-chips">
                      <Badge>{e.pdcaStage}</Badge>
                      {e.containsPii && !e.piiResolved && <Badge tone="bad" title="พบข้อมูลส่วนบุคคลที่ยังไม่จัดการ">PII</Badge>}
                      {e.status === 'verified' && <Badge tone="ok">ตรวจแล้ว</Badge>}
                    </div>
                  </div>
                  {editable && <button className="aq-btn aq-btn-sm" onClick={() => insertCitation(e.code)} data-testid={`insert-${e.code}`}>แทรก [{e.code}]</button>}
                  {canEvidenceWrite && <button className="aq-btn aq-btn-sm" aria-label={`เลิกผูก ${e.code}`} onClick={() => doUnlink(e.id)}>✕</button>}
                </li>
              ))}
            </ul>
          )}
          {canEvidenceWrite && linkable.length > 0 && (
            <div className="aq-form-inline" style={{ marginTop: '0.6rem' }}>
              <select className="aq-input aq-input-sm" value={linkId} onChange={e => setLinkId(e.target.value)} aria-label="เลือกหลักฐานที่จะผูก" data-testid="link-select">
                <option value="">— ผูกหลักฐานเพิ่ม —</option>
                {linkable.map(e => <option key={e.id} value={e.id}>{e.code} {e.title}</option>)}
              </select>
              <button className="aq-btn aq-btn-sm" disabled={!linkId} onClick={doLink} data-testid="link-btn">ผูก</button>
            </div>
          )}
        </section>

        <section className="aq-card" aria-labelledby="ai-h" data-testid="ai-panel">
          <h2 id="ai-h" className="aq-h3">ผู้ช่วย AI</h2>
          <p className="aq-muted" style={{ fontSize: '0.8rem' }}>AI เสนอเท่านั้น — ข้อมูลส่วนบุคคลถูกปกปิดก่อนส่ง และต้องกด “ยอมรับ” จึงเข้าเอกสาร (ไม่ให้คะแนนทางการ)</p>
          {!canAi ? (
            <p className="aq-muted">{aiEnabled ? 'คุณไม่มีสิทธิ์ใช้ AI ในข้อนี้' : 'มหาวิทยาลัยปิดการใช้ AI'}</p>
          ) : (
            <>
              <div className="aq-actions">
                <AsyncButton className="aq-btn" testId="ai-draft" onClick={() => doAi('draft')} disabled={!editable} title={!editable ? 'แก้ไขข้อนี้ไม่ได้ในสถานะปัจจุบัน' : undefined}>ร่าง ({lang.toUpperCase()})</AsyncButton>
                <AsyncButton className="aq-btn" testId="ai-review" onClick={() => doAi('review')}>ตรวจ ({lang.toUpperCase()})</AsyncButton>
                <AsyncButton className="aq-btn" testId="ai-translate" onClick={doTranslate} disabled={!editable} title={!editable ? 'แก้ไขข้อนี้ไม่ได้ในสถานะปัจจุบัน' : undefined}>
                  {lang === 'th' ? 'แปลเป็น EN' : 'แปลเป็น TH'}
                </AsyncButton>
              </div>
              {run && run.feature === 'AI-4' && (
                <TranslateResult run={run} source={(run.output as { from?: string }).from === 'en' ? en : th} mode={aiMode} setMode={setAiMode}
                  onAccept={doAccept} onDiscard={() => setRun(null)} canAccept={editable} />
              )}
              {run && run.feature !== 'AI-4' && <AiResult run={run} aiMode={aiMode} setAiMode={setAiMode} onAccept={doAccept} onDiscard={() => setRun(null)} canAccept={run.feature === 'AI-3' || editable} />}
            </>
          )}
        </section>

        <section className="aq-card" aria-labelledby="cm-h">
          <h2 id="cm-h" className="aq-h3">ความเห็น ({unresolved} ค้าง)</h2>
          {comments.length === 0 ? <Empty text="ยังไม่มีความเห็น" /> : (
            <ul className="aq-list" data-testid="comments">
              {comments.map(c => (
                <li key={c.id} className={c.resolvedAt ? 'aq-resolved' : ''}>
                  <div style={{ flex: 1 }}>
                    <strong>{names[c.authorId] || c.authorId}</strong> <span className="aq-muted">{fmtDateTime(c.at)}</span>
                    <div>{c.body}</div>
                  </div>
                  {!c.resolvedAt && can(user, 'comment', scope) && (
                    <button className="aq-btn aq-btn-sm" onClick={() => { try { resolveComment(user, c.id); reload(); } catch (e) { showToast(errMsg(e), 'error'); } }}>แก้แล้ว</button>
                  )}
                  {c.resolvedAt && <Badge tone="ok">แก้แล้ว</Badge>}
                </li>
              ))}
            </ul>
          )}
          {can(user, 'comment', scope) && (
            <div style={{ marginTop: '0.6rem' }}>
              <textarea className="aq-textarea" rows={2} value={cBody} onChange={e => setCBody(e.target.value)} placeholder="เขียนความเห็น…" aria-label="ความเห็นใหม่" data-testid="comment-body" />
              <button className="aq-btn aq-btn-sm" disabled={!cBody.trim()} onClick={doComment} data-testid="comment-add">ส่งความเห็น</button>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

// ─────────────────────────── ผล AI ───────────────────────────

function AiResult({ run, aiMode, setAiMode, onAccept, onDiscard, canAccept }: {
  run: AiRun; aiMode: 'append' | 'replace'; setAiMode: (m: 'append' | 'replace') => void;
  onAccept: () => void; onDiscard: () => void; canAccept: boolean;
}) {
  const pc = run.postCheck;
  const out = run.output as { draft?: string; missing?: string[]; usedEvidence?: string[]; unanswered?: string[]; uncitedSentences?: string[]; suggestions?: string[] };
  return (
    <div className="aq-ai-result" data-testid="ai-result">
      <div className="aq-chips">
        <Badge tone="info">{run.feature === 'AI-2' ? 'ร่างเนื้อหา' : 'ตรวจเนื้อหา'}</Badge>
        <ModelBadge run={run} />
        <Badge title="จำนวนข้อมูลส่วนบุคคลที่ถูกปกปิดก่อนส่ง">ปกปิด {run.redactionCount} จุด</Badge>
        <Badge tone={pc.ok ? 'ok' : 'warn'} testId="postcheck">{pc.ok ? 'ผ่านการตรวจอ้างอิง/ตัวเลข' : 'พบข้อควรระวัง'}</Badge>
      </div>
      {!pc.ok && (
        <ul className="aq-warnlist">
          {pc.removedCitations.length > 0 && <li>ตัดการอ้างอิงที่ไม่มีจริงออกแล้ว: {pc.removedCitations.join(', ')}</li>}
          {pc.unknownNumbers.length > 0 && <li>ตัวเลขที่ไม่พบในข้อมูลต้นทาง (ตรวจสอบก่อนใช้): {pc.unknownNumbers.join(', ')}</li>}
          {pc.flaggedSentences.map((s, i) => <li key={i}>ประโยคที่ติดธง: {s}</li>)}
        </ul>
      )}
      {run.feature === 'AI-2' && (
        <>
          <pre className="aq-ai-draft" data-testid="ai-draft-text">{out.draft || '(ไม่มีร่าง)'}</pre>
          {out.missing && out.missing.length > 0 && <div><strong>ยังขาด:</strong><ul>{out.missing.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}
          <div className="aq-form-inline">
            <label><input type="radio" checked={aiMode === 'append'} onChange={() => setAiMode('append')} /> ต่อท้าย</label>
            <label><input type="radio" checked={aiMode === 'replace'} onChange={() => setAiMode('replace')} /> แทนที่ทั้งหมด</label>
          </div>
        </>
      )}
      {run.feature === 'AI-3' && (
        <div data-testid="ai-review-result">
          {([['ยังไม่ได้ตอบ', out.unanswered], ['ประโยคที่ไม่มีอ้างอิง', out.uncitedSentences], ['ข้อเสนอแนะ', out.suggestions]] as const).map(([t, list]) =>
            list && list.length > 0 ? <div key={t}><strong>{t}</strong><ul>{list.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null)}
        </div>
      )}
      <div className="aq-actions">
        <button className="aq-btn aq-btn-primary" onClick={onAccept} disabled={!canAccept} data-testid="ai-accept">
          {run.feature === 'AI-2' ? 'ยอมรับและใส่ในเอกสาร' : 'รับทราบ'}
        </button>
        <button className="aq-btn" onClick={onDiscard} data-testid="ai-discard">ทิ้ง</button>
      </div>
    </div>
  );
}

// ─────────────────────────── self-rating / committee ───────────────────────────

function RatingPanel({ user, cycle, section, ratings, scope, cycleWritable, reload }: {
  user: AppUser; cycle: AssessmentCycle; section: SarSection; ratings: Rating[];
  scope: ReturnType<typeof cycleScope>; cycleWritable: boolean; reload: () => void;
}) {
  const { showToast } = useToast();
  const mine = (t: Rating['raterType']) => [...ratings].filter(r => r.requirementId === section.requirementId && r.raterType === t).sort((a, b) => b.at - a.at)[0];
  const self = mine('self');
  const committee = mine('committee');
  const canSelf = can(user, 'rating.self', scope) && cycleWritable;

  const [score, setScore] = useState(String(self?.score ?? ''));
  const [why, setWhy] = useState(self?.rationale ?? '');

  function saveSelf() {
    try { setSelfRating(user, cycle.id, section.requirementId, Number(score), why); showToast('บันทึกคะแนนประเมินตนเองแล้ว', 'success'); reload(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  return (
    <section className="aq-card" aria-labelledby="rate-h" data-testid="rating-panel">
      <h2 id="rate-h" className="aq-h3">คะแนนประเมินตนเอง (1–7)</h2>
      <div className="aq-form-inline">
        <select className="aq-input aq-input-sm" value={score} disabled={!canSelf} onChange={e => setScore(e.target.value)} aria-label="คะแนนประเมินตนเอง" data-testid="self-score">
          <option value="">— ยังไม่ให้คะแนน —</option>
          {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input className="aq-input" style={{ flex: 1 }} placeholder="เหตุผลประกอบ" value={why} disabled={!canSelf} onChange={e => setWhy(e.target.value)} aria-label="เหตุผลของคะแนน" data-testid="self-why" />
        {canSelf && <button className="aq-btn aq-btn-sm" disabled={!score} onClick={saveSelf} data-testid="self-save">บันทึกคะแนน</button>}
      </div>
      {self && <p className="aq-muted">ล่าสุด: {self.score} คะแนน ({fmtDateTime(self.at)})</p>}
      {committee && (
        <div style={{ marginTop: '0.8rem' }}>
          <h3 className="aq-h3">คะแนนกรรมการประเมิน (รายข้อเดิม)</h3>
          <p>คะแนน {committee.score} — {committee.rationale || 'ไม่มีเหตุผล'}</p>
        </div>
      )}
    </section>
  );
}
