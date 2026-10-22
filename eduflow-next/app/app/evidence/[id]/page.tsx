'use client';

/**
 * รายละเอียดหลักฐาน (ADR-UI-001 pages.md P11)
 * crumbs หลักฐาน › รหัส · h1 "รหัส · ชื่อ" (E2E-06/11) + pill สถานะ + pill PII · pii-banner (InlineMessage, "เลขบัตรประชาชน")
 * grid 2: ข้อมูล (aq-dl + สถานะการเก็บไฟล์ P9 + hash/Term) + ev-edit · ข้อที่ผูก (ev-links) + ผูกเพิ่ม (RequirementPicker)
 * AI แนะนำข้อ (AI-1) · ไฟล์และเวอร์ชัน
 */
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  acceptAiRun, addFileVersion, can, getEvidence, getExtractedText, getRequirement, linkEvidence,
  listCycles, listFileVersions, programmeScope, readFileInput, resolvePii, runEvidenceTagger, unlinkEvidence,
  updateEvidence, verifyEvidence,
} from '@/lib/api';
import type { AiRun, EvidenceKind, PdcaStage } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import {
  Async, AsyncButton, Badge, Empty, EvidenceStatusBadge, InlineMessage, ModelBadge, PageHeader, useLoad, useMe,
} from '@/components/aunqa/common';
import RequirementPicker from '@/components/aunqa/RequirementPicker';
import Icon from '@/components/ui/Icon';
import Term from '@/components/ui/Term';
import { KIND_LIST, KIND_TH, PDCA_TH, decodeParam, errMsg, fmtDateTime, isAssessorOnly, sectionHref, truncateTh } from '@/lib/ui/aunqa';
import { notifyTodosChanged } from '@/lib/ui/todo';

const PII_KIND_TH: Record<string, string> = { thai_id: 'เลขบัตรประชาชน', student_id: 'รหัสนักศึกษา', email: 'อีเมล', phone: 'เบอร์โทร' };

function fmtSize(n: number): string {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024).toFixed(1)} KB`;
}

function Inner() {
  const user = useMe();
  const id = decodeParam(useParams().id);
  const cycleParam = useSearchParams().get('cycle') || '';
  const { showToast } = useToast();
  const { prompt } = useDialog();
  const assessor = isAssessorOnly(user);

  const q = useLoad(() => {
    const ev = getEvidence(user, id, cycleParam || undefined);
    const scope = programmeScope(ev.programmeId, { cycleId: cycleParam || undefined });
    return {
      ev,
      files: listFileVersions(user, id),
      text: ev.containsPii && !ev.piiResolved ? '' : getExtractedText(user, id, cycleParam || undefined),
      cycles: listCycles(user, ev.programmeId),
      canWrite: !assessor && can(user, 'evidence.write', programmeScope(ev.programmeId)),
      canVerify: can(user, 'evidence.verify', programmeScope(ev.programmeId)),
      canAi: can(user, 'ai.check', scope) || can(user, 'ai.use', scope),
    };
  }, [user.id, id, cycleParam]);

  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ title: '', description: '', kind: 'other' as EvidenceKind, stage: 'D' as PdcaStage, year: '', url: '' });
  const [linkCycle, setLinkCycle] = useState('');
  const [linkReqs, setLinkReqs] = useState<string[]>([]);
  const [run, setRun] = useState<AiRun | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  function act(fn: () => void, ok: string) {
    try { fn(); showToast(ok, 'success'); notifyTodosChanged(); q.reload(); } catch (e) { showToast(errMsg(e), 'error'); }
  }

  return (
    <Async q={q} skeleton="form">{({ ev, files, text, cycles, canWrite, canVerify, canAi }) => {
      const cid = linkCycle || cycleParam || cycles[0]?.id || '';
      const tagCycle = cycleParam || cycles[0]?.id || '';
      const latest = files.slice().sort((a, b) => b.version - a.version)[0];
      return (
        <>
          <PageHeader
            crumbs={[{ label: 'หลักฐาน', href: '/app/evidence' }, { label: ev.code }]}
            title={`${ev.code} · ${ev.title}`}
            status={<span className="aq-cluster">
              <EvidenceStatusBadge status={ev.status} />
              {ev.containsPii && !ev.piiResolved && <Badge tone="bad" icon="alert-triangle">PII ยังไม่จัดการ</Badge>}
            </span>}
            sub={<>{KIND_TH[ev.kind]} · {PDCA_TH[ev.pdcaStage]} · ปีการศึกษา {ev.academicYear}</>}
            actions={<Link className="aq-btn" href="/app/evidence"><Icon name="chevron-left" size={20} />คลังหลักฐาน</Link>}
          />

          {ev.containsPii && (
            <InlineMessage tone={ev.piiResolved ? 'success' : 'danger'} testId="pii-banner"
              title={ev.piiResolved ? 'จัดการข้อมูลส่วนบุคคลแล้ว' : `พบข้อมูลที่อาจเป็นข้อมูลส่วนบุคคล (${ev.piiKinds.map(k => PII_KIND_TH[k] ?? k).join(', ')})`}
              actions={!ev.piiResolved && canWrite ? (
                <AsyncButton className="aq-btn" testId="pii-resolve" onClick={async () => {
                  const note = await prompt({ title: 'ยืนยันจัดการข้อมูลส่วนบุคคล', message: 'ระบุสิ่งที่ทำ เช่น ปกปิดเลขบัตรในต้นฉบับแล้ว', required: true, confirmText: 'ยืนยันจัดการแล้ว' });
                  if (note !== null) act(() => resolvePii(user, id, note), 'บันทึกการจัดการ PII แล้ว');
                }}>ทำเครื่องหมายว่าจัดการแล้ว</AsyncButton>
              ) : undefined}>
              {ev.piiResolved ? ev.piiResolvedNote : <>ปกปิดต้นฉบับแล้วบันทึกว่าจัดการเรียบร้อยก่อนใช้เป็นหลักฐาน <Term k="pii" label="PII" /></>}
            </InlineMessage>
          )}

          <div className="aq-grid-2">
            <section className="aq-card" aria-labelledby="meta-h">
              <div className="aq-card__head">
                <h2 id="meta-h" className="aq-h3">รายละเอียด</h2>
                {canWrite && !edit && <button type="button" className="aq-btn aq-btn-compact" data-testid="ev-edit" onClick={() => {
                  setF({ title: ev.title, description: ev.description, kind: ev.kind, stage: ev.pdcaStage, year: String(ev.academicYear), url: ev.url || '' });
                  setEdit(true);
                }}><Icon name="pencil" size={20} />แก้ไข</button>}
              </div>
              {!edit ? (
                <dl className="aq-dl">
                  <dt>คำอธิบาย</dt><dd>{ev.description || '—'}</dd>
                  <dt>สรุปโดย AI</dt><dd>{ev.aiSummary || '—'}</dd>
                  <dt>ลิงก์</dt><dd>{ev.url ? <a className="aq-link" href={ev.url} target="_blank" rel="noreferrer noopener">{ev.url}<Icon name="external" size={16} /><span className="aq-sr-only"> (เปิดแท็บใหม่)</span></a> : '—'}</dd>
                  <dt>ไฟล์</dt>
                  <dd>{latest
                    ? <>{latest.name} · {fmtSize(latest.size)} · {latest.dataUrl ? 'เก็บไฟล์แล้ว' : 'เก็บเฉพาะข้อมูลไฟล์'}</>
                    : '—'}</dd>
                  <dt>hash <Term k="hash" label="hash" /></dt><dd><code className="aq-code">{ev.sha256 ? ev.sha256.slice(0, 16) : '—'}</code></dd>
                  <dt>ตรวจสอบโดย</dt><dd>{ev.verifiedAt ? fmtDateTime(ev.verifiedAt) : 'ยังไม่ได้ตรวจสอบ'}</dd>
                </dl>
              ) : (
                <form className="aq-form" onSubmit={e => {
                  e.preventDefault();
                  act(() => { updateEvidence(user, id, { title: f.title, description: f.description, kind: f.kind, pdcaStage: f.stage, academicYear: Number(f.year), url: f.url || undefined }); setEdit(false); }, 'บันทึกแล้ว');
                }}>
                  <div className="aq-field"><label htmlFor="ed-title">ชื่อ *</label>
                    <input id="ed-title" className="aq-input" required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} data-testid="ev-edit-title" /></div>
                  <div className="aq-field"><label htmlFor="ed-desc">คำอธิบาย</label>
                    <textarea id="ed-desc" className="aq-textarea" rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
                  <div className="aq-form-grid">
                    <div className="aq-field"><label htmlFor="ed-kind">ประเภท</label>
                      <select id="ed-kind" className="aq-input" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as EvidenceKind })}>{KIND_LIST.map(k => <option key={k} value={k}>{KIND_TH[k]}</option>)}</select></div>
                    <div className="aq-field"><label htmlFor="ed-pdca">ขั้น PDCA</label>
                      <select id="ed-pdca" className="aq-input" value={f.stage} onChange={e => setF({ ...f, stage: e.target.value as PdcaStage })}>{(['P', 'D', 'C', 'A'] as PdcaStage[]).map(s => <option key={s} value={s}>{PDCA_TH[s]}</option>)}</select></div>
                    <div className="aq-field"><label htmlFor="ed-year">ปีการศึกษา</label>
                      <input id="ed-year" className="aq-input" type="number" value={f.year} onChange={e => setF({ ...f, year: e.target.value })} /></div>
                  </div>
                  <div className="aq-field"><label htmlFor="ed-url">ลิงก์</label>
                    <input id="ed-url" className="aq-input" type="url" value={f.url} onChange={e => setF({ ...f, url: e.target.value })} /></div>
                  <div className="aq-actions"><button className="aq-btn aq-btn-primary" data-testid="ev-edit-save">บันทึก</button><button type="button" className="aq-btn aq-btn-ghost" onClick={() => setEdit(false)}>ยกเลิก</button></div>
                </form>
              )}
              {canVerify && ev.status !== 'verified' && (
                <div className="aq-actions aq-mt-4">
                  <AsyncButton className="aq-btn" testId="ev-verify" onClick={() => act(() => verifyEvidence(user, id), 'ตรวจสอบหลักฐานแล้ว')}><Icon name="check-circle" size={20} />ยืนยันว่าตรวจสอบหลักฐานแล้ว</AsyncButton>
                </div>
              )}
            </section>

            <section className="aq-card" aria-labelledby="link-h">
              <h2 id="link-h" className="aq-h3">ข้อที่ผูก{cycleParam ? ' (ในรอบนี้)' : ' (ทุกรอบ)'}</h2>
              {ev.links.length === 0 ? <Empty icon="link" title="ยังไม่ผูกกับข้อใด" /> : (
                <ul className="aq-list" data-testid="ev-links">
                  {ev.links.map(l => (
                    <li key={l.id}>
                      <Link className="aq-link aq-code" href={sectionHref(l.cycleId, l.requirementId)}>ข้อ {l.requirementId}</Link>
                      <span className="aq-flex-1 aq-meta">{truncateTh(getRequirement(l.requirementId)?.textTh ?? '', 60)} {l.source === 'ai' && <Badge tone="info" icon="sparkle">AI แนะนำ</Badge>}</span>
                      {canWrite && (
                        <button type="button" className="aq-btn aq-btn-ghost aq-btn-icon aq-btn-compact" aria-label={`เลิกผูกข้อ ${l.requirementId}`} title={`เลิกผูกข้อ ${l.requirementId}`}
                          onClick={() => act(() => unlinkEvidence(user, id, l.cycleId, l.requirementId), 'เลิกผูกแล้ว')}>
                          <Icon name="x" size={20} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {canWrite && cycles.length > 0 && (
                <div className="aq-form aq-mt-4">
                  <div className="aq-field">
                    <label htmlFor="ev-link-cycle">ผูกเพิ่มในรอบ</label>
                    <select id="ev-link-cycle" className="aq-input" value={cid} onChange={e => setLinkCycle(e.target.value)} data-testid="ev-link-cycle">
                      {cycles.map(c => <option key={c.id} value={c.id}>รอบ {c.academicYear}</option>)}
                    </select>
                  </div>
                  <RequirementPicker label="ข้อที่จะผูก" value={linkReqs} onChange={setLinkReqs} testIdPrefix="ev-link-req" />
                  <button type="button" className="aq-btn" disabled={!linkReqs.length || !cid} data-testid="ev-link-btn"
                    onClick={() => act(() => { linkEvidence(user, id, cid, linkReqs); setLinkReqs([]); }, 'ผูกหลักฐานแล้ว')}><Icon name="link" size={20} />ผูกกับข้อที่เลือก</button>
                </div>
              )}
            </section>
          </div>

          <section className="aq-card" aria-labelledby="ai-h" data-testid="ev-ai">
            <h2 id="ai-h" className="aq-h3">AI แนะนำข้อที่เกี่ยวข้อง</h2>
            <p className="aq-help">AI สรุปหลักฐานและเสนอข้อ/ขั้น PDCA — ข้อมูลส่วนบุคคลถูกปกปิดก่อนส่ง ต้องกดยอมรับก่อนจึงบันทึกจริง</p>
            {canAi && canWrite ? (
              <AsyncButton testId="ev-ai-run" className="aq-btn aq-mt-2" busyText="กำลังวิเคราะห์…" onClick={async () => {
                try {
                  const r = await runEvidenceTagger(user, id, tagCycle || undefined);
                  setRun(r);
                  setPicked((r.output as { suggestions: { requirementId: string }[] }).suggestions.map(s => s.requirementId));
                } catch (e) { showToast(errMsg(e), 'error'); }
              }}><Icon name="sparkle" size={20} />ให้ AI แนะนำ</AsyncButton>
            ) : <p className="aq-meta">คุณไม่มีสิทธิ์ใช้ AI กับหลักฐานนี้</p>}
            {run && (() => {
              const out = run.output as { summary: string; pdcaStage: PdcaStage; pdcaReason: string; suggestions: { requirementId: string; confidence: number; reasons: string[] }[] };
              return (
                <div className="aq-ai-result" data-testid="ev-ai-result">
                  <div className="aq-cluster">
                    <ModelBadge run={run} />
                    <span><Badge tone="neutral" icon={false}>ปกปิดข้อมูลส่วนบุคคล {run.redactionCount} จุด</Badge><Term k="redaction" label="การปกปิดข้อมูลส่วนบุคคล" /></span>
                    <Badge tone={run.postCheck.ok ? 'ok' : 'warn'}>{run.postCheck.ok ? 'ผ่านการตรวจ' : 'พบข้อควรระวัง'}</Badge>
                  </div>
                  <p className="aq-mt-2"><strong>สรุป:</strong> {out.summary}</p>
                  <p><strong>ขั้น PDCA ที่เสนอ:</strong> {PDCA_TH[out.pdcaStage]} — {out.pdcaReason}</p>
                  {out.suggestions.length === 0 ? <Empty icon="search" title="AI ไม่พบข้อที่เกี่ยวข้องชัดเจน" /> : (
                    <ul className="aq-list aq-mt-2">
                      {out.suggestions.map(s => (
                        <li key={s.requirementId}>
                          <label className="aq-check">
                            <input type="checkbox" checked={picked.includes(s.requirementId)} data-testid={`ai-pick-${s.requirementId}`}
                              onChange={e => setPicked(p => e.target.checked ? [...p, s.requirementId] : p.filter(x => x !== s.requirementId))} />
                            ข้อ {s.requirementId} <Badge tone="info" icon={false}>{Math.round(s.confidence * 100)}%</Badge>
                          </label>
                          <span className="aq-flex-1 aq-meta">{s.reasons.join(' · ')}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="aq-actions aq-mt-4">
                    <button type="button" className="aq-btn aq-btn-primary" data-testid="ev-ai-accept" onClick={() => act(() => { acceptAiRun(user, run.id, { requirementIds: picked }); setRun(null); }, 'บันทึกข้อเสนอของ AI แล้ว')}>ยอมรับข้อที่เลือก</button>
                    <button type="button" className="aq-btn aq-btn-ghost" onClick={() => setRun(null)}>ทิ้ง</button>
                  </div>
                  {!tagCycle && <p className="aq-help">ไม่มีรอบประเมิน จึงบันทึกได้เฉพาะสรุป/PDCA ไม่ผูกข้อ</p>}
                </div>
              );
            })()}
          </section>

          <section className="aq-card" aria-labelledby="file-h">
            <div className="aq-card__head">
              <h2 id="file-h" className="aq-h3">ไฟล์และเวอร์ชัน ({files.length})</h2>
              {canWrite && (
                <label className="aq-btn aq-btn-compact aq-file-btn">
                  <Icon name="upload" size={20} />อัปโหลดเวอร์ชันใหม่
                  <input type="file" className="aq-sr-only" data-testid="ev-newver" onChange={async e => {
                    const file = e.target.files?.[0]; e.target.value = '';
                    if (!file) return;
                    try { await addFileVersion(user, id, await readFileInput(file)); showToast('เพิ่มเวอร์ชันแล้ว', 'success'); q.reload(); }
                    catch (err) { showToast(errMsg(err), 'error'); }
                  }} />
                </label>
              )}
            </div>
            {files.length === 0 ? <Empty icon="file-text" title="ไม่มีไฟล์แนบ" text="หลักฐานนี้อาจเป็นลิงก์หรือข้อความ" /> : (
              <div className="aq-table-wrap">
                <table className="aq-table aq-table--stack">
                  <thead><tr><th>v</th><th>ไฟล์</th><th>ขนาด</th><th>hash</th><th>อัปโหลด</th></tr></thead>
                  <tbody>
                    {files.map(fl => (
                      <tr key={fl.id}>
                        <td data-label="เวอร์ชัน" className="aq-tnum">{fl.version}</td>
                        <td data-label="ไฟล์">{fl.dataUrl ? <a className="aq-link" href={fl.dataUrl} download={fl.name}>{fl.name}</a> : <span>{fl.name} <span className="aq-meta">(เก็บเฉพาะข้อมูลไฟล์)</span></span>}</td>
                        <td data-label="ขนาด">
                          <span>{fmtSize(fl.size)}
                            {fl.piiScan === 'not_scanned' && <div><Badge tone="neutral" icon="circle-dashed" title="ไฟล์ประเภทนี้ระบบยังอ่านข้อความไม่ได้ จึงยังตรวจข้อมูลส่วนบุคคลไม่ได้ — โปรดตรวจเองก่อนใช้" testId="pii-not-scanned">ยังไม่ได้ตรวจ PII</Badge></div>}
                          </span>
                        </td>
                        <td data-label="hash"><code className="aq-code">{fl.sha256.slice(0, 12)}…</code></td>
                        <td data-label="อัปโหลด">{fmtDateTime(fl.uploadedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <details className="aq-collapse aq-mt-4">
              <summary>ข้อความที่ดึงจากไฟล์<Icon name="chevron-down" size={20} className="aq-collapse__chev" /></summary>
              {ev.containsPii && !ev.piiResolved
                ? <p className="aq-muted">ซ่อนไว้เพราะพบข้อมูลส่วนบุคคลที่ยังไม่ได้จัดการ</p>
                : <div className="aq-ai-draft aq-prose--pre">{text ? text.slice(0, 1500) : '(ไม่มีข้อความ)'}</div>}
            </details>
          </section>
        </>
      );
    }}</Async>
  );
}

export default function EvidenceDetailPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
