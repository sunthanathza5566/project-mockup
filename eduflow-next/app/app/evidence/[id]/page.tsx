'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  acceptAiRun, addFileVersion, can, getEvidence, getExtractedText, getRequirement, linkEvidence, listCycles,
  listFileVersions, listRequirements, programmeScope, readFileInput, resolvePii, runEvidenceTagger, unlinkEvidence,
  updateEvidence, verifyEvidence,
} from '@/lib/api';
import type { AiRun, EvidenceKind, PdcaStage } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, AsyncButton, Badge, Empty, EvidenceStatusBadge, PageHeader, useLoad, useMe } from '@/components/aunqa/common';
import { KIND_LIST, KIND_TH, PDCA_TH, decodeParam, errMsg, fmtDateTime, isAssessorOnly, sectionHref } from '@/lib/ui/aunqa';

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

  // edit
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ title: '', description: '', kind: 'other' as EvidenceKind, stage: 'D' as PdcaStage, year: '', url: '' });
  // link
  const [linkCycle, setLinkCycle] = useState('');
  const [linkReqs, setLinkReqs] = useState<string[]>([]);
  // ai
  const [run, setRun] = useState<AiRun | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  function act(fn: () => void, ok: string) {
    try { fn(); showToast(ok, 'success'); q.reload(); } catch (e) { showToast(errMsg(e), 'error'); }
  }

  return (
    <Async q={q}>{({ ev, files, text, cycles, canWrite, canVerify, canAi }) => {
      const cid = linkCycle || cycleParam || cycles[0]?.id || '';
      const tagCycle = cycleParam || cycles[0]?.id || '';
      return (
        <>
          <PageHeader
            title={<>{ev.code} <span className="aq-muted aq-h1-sub">{ev.title}</span></>}
            sub={<><EvidenceStatusBadge status={ev.status} /> · {KIND_TH[ev.kind]} · {PDCA_TH[ev.pdcaStage]} · ปี {ev.academicYear}</>}
            actions={<Link className="aq-btn" href="/app/evidence">← คลังหลักฐาน</Link>}
          />

          {ev.containsPii && (
            <div className={`auth-alert ${ev.piiResolved ? 'auth-alert-ok' : 'auth-alert-err'}`} role="alert" data-testid="pii-banner">
              <div style={{ flex: 1 }}>
                {ev.piiResolved
                  ? <>จัดการข้อมูลส่วนบุคคลแล้ว: {ev.piiResolvedNote}</>
                  : <>⚠️ พบข้อมูลที่อาจเป็นข้อมูลส่วนบุคคล ({ev.piiKinds.map(k => ({ thai_id: 'เลขบัตรประชาชน', student_id: 'รหัสนักศึกษา', email: 'อีเมล', phone: 'เบอร์โทร' }[k])).join(', ')}) — ปกปิดต้นฉบับแล้วบันทึกว่าจัดการเรียบร้อยก่อนใช้เป็นหลักฐาน</>}
              </div>
              {!ev.piiResolved && canWrite && (
                <AsyncButton className="aq-btn aq-btn-sm" testId="pii-resolve" onClick={async () => {
                  const note = await prompt({ title: 'ยืนยันจัดการข้อมูลส่วนบุคคล', message: 'ระบุสิ่งที่ทำ เช่น ปกปิดเลขบัตรในต้นฉบับแล้ว', required: true });
                  if (note !== null) act(() => resolvePii(user, id, note), 'บันทึกการจัดการ PII แล้ว');
                }}>จัดการแล้ว</AsyncButton>
              )}
            </div>
          )}

          <div className="aq-grid-2">
            <section className="aq-card" aria-labelledby="meta-h">
              <div className="aq-row-between">
                <h2 id="meta-h" className="aq-h2">รายละเอียด</h2>
                {canWrite && !edit && <button className="aq-btn aq-btn-sm" data-testid="ev-edit" onClick={() => {
                  setF({ title: ev.title, description: ev.description, kind: ev.kind, stage: ev.pdcaStage, year: String(ev.academicYear), url: ev.url || '' });
                  setEdit(true);
                }}>แก้ไข</button>}
              </div>
              {!edit ? (
                <dl className="aq-dl">
                  <dt>คำอธิบาย</dt><dd>{ev.description || '—'}</dd>
                  <dt>สรุปโดย AI</dt><dd>{ev.aiSummary || '—'}</dd>
                  <dt>ลิงก์</dt><dd>{ev.url ? <a href={ev.url} target="_blank" rel="noreferrer noopener">{ev.url}</a> : '—'}</dd>
                  <dt>sha256</dt><dd><code>{ev.sha256 ? `${ev.sha256.slice(0, 16)}…` : '—'}</code></dd>
                  <dt>ตรวจสอบโดย</dt><dd>{ev.verifiedAt ? fmtDateTime(ev.verifiedAt) : 'ยังไม่ได้ตรวจสอบ'}</dd>
                </dl>
              ) : (
                <form className="aq-form" onSubmit={e => {
                  e.preventDefault();
                  act(() => { updateEvidence(user, id, { title: f.title, description: f.description, kind: f.kind, pdcaStage: f.stage, academicYear: Number(f.year), url: f.url || undefined }); setEdit(false); }, 'บันทึกแล้ว');
                }}>
                  <label>ชื่อ<input className="aq-input" required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} data-testid="ev-edit-title" /></label>
                  <label>คำอธิบาย<textarea className="aq-textarea" rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></label>
                  <div className="aq-form-inline">
                    <select className="aq-input" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as EvidenceKind })} aria-label="ประเภท">{KIND_LIST.map(k => <option key={k} value={k}>{KIND_TH[k]}</option>)}</select>
                    <select className="aq-input" value={f.stage} onChange={e => setF({ ...f, stage: e.target.value as PdcaStage })} aria-label="PDCA">{(['P', 'D', 'C', 'A'] as PdcaStage[]).map(s => <option key={s} value={s}>{PDCA_TH[s]}</option>)}</select>
                    <input className="aq-input" type="number" value={f.year} onChange={e => setF({ ...f, year: e.target.value })} aria-label="ปี" style={{ width: 110 }} />
                  </div>
                  <label>ลิงก์<input className="aq-input" type="url" value={f.url} onChange={e => setF({ ...f, url: e.target.value })} /></label>
                  <div className="aq-actions"><button className="aq-btn aq-btn-primary" data-testid="ev-edit-save">บันทึก</button><button type="button" className="aq-btn" onClick={() => setEdit(false)}>ยกเลิก</button></div>
                </form>
              )}
              {canVerify && ev.status !== 'verified' && (
                <div className="aq-actions" style={{ marginTop: '0.8rem' }}>
                  <AsyncButton className="aq-btn" testId="ev-verify" onClick={() => act(() => verifyEvidence(user, id), 'ตรวจสอบหลักฐานแล้ว')}>ยืนยันว่าตรวจสอบหลักฐานแล้ว</AsyncButton>
                </div>
              )}
            </section>

            <section className="aq-card" aria-labelledby="link-h">
              <h2 id="link-h" className="aq-h2">ข้อที่ผูก{cycleParam ? ' (ในรอบนี้)' : ' (ทุกรอบ)'}</h2>
              {ev.links.length === 0 ? <Empty text="ยังไม่ผูกกับข้อใด" /> : (
                <ul className="aq-list" data-testid="ev-links">
                  {ev.links.map(l => (
                    <li key={l.id}>
                      <Link href={sectionHref(l.cycleId, l.requirementId)}>ข้อ {l.requirementId}</Link>
                      <span className="aq-muted" style={{ flex: 1 }}>{getRequirement(l.requirementId)?.textTh.slice(0, 50)}… {l.source === 'ai' && <Badge tone="info">AI แนะนำ</Badge>}</span>
                      {canWrite && <button className="aq-btn aq-btn-sm" aria-label={`เลิกผูกข้อ ${l.requirementId}`} onClick={() => act(() => unlinkEvidence(user, id, l.cycleId, l.requirementId), 'เลิกผูกแล้ว')}>✕</button>}
                    </li>
                  ))}
                </ul>
              )}
              {canWrite && cycles.length > 0 && (
                <div className="aq-form" style={{ marginTop: '0.8rem' }}>
                  <label>ผูกเพิ่มในรอบ
                    <select className="aq-input" value={cid} onChange={e => setLinkCycle(e.target.value)} data-testid="ev-link-cycle">
                      {cycles.map(c => <option key={c.id} value={c.id}>รอบ {c.academicYear}</option>)}
                    </select>
                  </label>
                  <select className="aq-input" multiple size={5} value={linkReqs} aria-label="เลือกข้อที่จะผูก" data-testid="ev-link-reqs"
                    onChange={e => setLinkReqs(Array.from(e.target.selectedOptions).map(o => o.value))}>
                    {listRequirements().map(r => <option key={r.id} value={r.id}>{r.id} {r.textTh.slice(0, 50)}</option>)}
                  </select>
                  <button className="aq-btn aq-btn-sm" disabled={!linkReqs.length || !cid} data-testid="ev-link-btn"
                    onClick={() => act(() => { linkEvidence(user, id, cid, linkReqs); setLinkReqs([]); }, 'ผูกหลักฐานแล้ว')}>ผูกกับข้อที่เลือก</button>
                </div>
              )}
            </section>
          </div>

          <section className="aq-card" aria-labelledby="ai-h" data-testid="ev-ai">
            <h2 id="ai-h" className="aq-h2">AI แนะนำข้อที่เกี่ยวข้อง</h2>
            <p className="aq-muted">AI สรุปหลักฐานและเสนอข้อ/ขั้น PDCA — ข้อมูลส่วนบุคคลถูกปกปิดก่อนส่ง ต้องกดยอมรับก่อนจึงบันทึกจริง</p>
            {canAi && canWrite ? (
              <AsyncButton testId="ev-ai-run" onClick={async () => {
                try {
                  const r = await runEvidenceTagger(user, id, tagCycle || undefined);
                  setRun(r);
                  setPicked((r.output as { suggestions: { requirementId: string }[] }).suggestions.map(s => s.requirementId));
                } catch (e) { showToast(errMsg(e), 'error'); }
              }}>ให้ AI แนะนำ</AsyncButton>
            ) : <p className="aq-muted">คุณไม่มีสิทธิ์ใช้ AI กับหลักฐานนี้</p>}
            {run && (() => {
              const out = run.output as { summary: string; pdcaStage: PdcaStage; pdcaReason: string; suggestions: { requirementId: string; confidence: number; reasons: string[] }[] };
              return (
                <div className="aq-ai-result" data-testid="ev-ai-result">
                  <div className="aq-chips">
                    <Badge title="จำนวนจุดที่ปกปิด">ปกปิด {run.redactionCount} จุด</Badge>
                    <Badge tone={run.postCheck.ok ? 'ok' : 'warn'}>{run.postCheck.ok ? 'ผ่านการตรวจ' : 'พบข้อควรระวัง'}</Badge>
                  </div>
                  <p><strong>สรุป:</strong> {out.summary}</p>
                  <p><strong>ขั้น PDCA ที่เสนอ:</strong> {PDCA_TH[out.pdcaStage]} — {out.pdcaReason}</p>
                  {out.suggestions.length === 0 ? <Empty text="AI ไม่พบข้อที่เกี่ยวข้องชัดเจน" /> : (
                    <ul className="aq-list">
                      {out.suggestions.map(s => (
                        <li key={s.requirementId}>
                          <label className="aq-check">
                            <input type="checkbox" checked={picked.includes(s.requirementId)} data-testid={`ai-pick-${s.requirementId}`}
                              onChange={e => setPicked(p => e.target.checked ? [...p, s.requirementId] : p.filter(x => x !== s.requirementId))} />
                            ข้อ {s.requirementId} <Badge tone="info">{Math.round(s.confidence * 100)}%</Badge>
                          </label>
                          <span className="aq-muted" style={{ flex: 1 }}>{s.reasons.join(' · ')}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="aq-actions">
                    <button className="aq-btn aq-btn-primary" data-testid="ev-ai-accept" onClick={() => act(() => { acceptAiRun(user, run.id, { requirementIds: picked }); setRun(null); }, 'บันทึกข้อเสนอของ AI แล้ว')}>ยอมรับข้อที่เลือก</button>
                    <button className="aq-btn" onClick={() => setRun(null)}>ทิ้ง</button>
                  </div>
                  {!tagCycle && <p className="aq-muted">ไม่มีรอบประเมิน จึงบันทึกได้เฉพาะสรุป/PDCA ไม่ผูกข้อ</p>}
                </div>
              );
            })()}
          </section>

          <section className="aq-card" aria-labelledby="file-h">
            <div className="aq-row-between">
              <h2 id="file-h" className="aq-h2">ไฟล์และเวอร์ชัน ({files.length})</h2>
              {canWrite && (
                <label className="aq-btn aq-btn-sm" style={{ cursor: 'pointer' }}>
                  อัปโหลดเวอร์ชันใหม่
                  <input type="file" hidden data-testid="ev-newver" onChange={async e => {
                    const file = e.target.files?.[0]; e.target.value = '';
                    if (!file) return;
                    try { await addFileVersion(user, id, await readFileInput(file)); showToast('เพิ่มเวอร์ชันแล้ว', 'success'); q.reload(); }
                    catch (err) { showToast(errMsg(err), 'error'); }
                  }} />
                </label>
              )}
            </div>
            {files.length === 0 ? <Empty text="ไม่มีไฟล์แนบ (อาจเป็นลิงก์หรือข้อความ)" /> : (
              <div className="aq-table-wrap">
                <table className="aq-table">
                  <thead><tr><th>v</th><th>ไฟล์</th><th>ขนาด</th><th>sha256</th><th>อัปโหลด</th></tr></thead>
                  <tbody>
                    {files.map(fl => (
                      <tr key={fl.id}>
                        <td>{fl.version}</td>
                        <td>{fl.dataUrl ? <a href={fl.dataUrl} download={fl.name}>{fl.name}</a> : <>{fl.name} <span className="aq-muted">(เก็บเฉพาะข้อมูลไฟล์)</span></>}</td>
                        <td>{(fl.size / 1024).toFixed(1)} KB</td>
                        <td><code>{fl.sha256.slice(0, 12)}…</code></td>
                        <td>{fmtDateTime(fl.uploadedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <details style={{ marginTop: '0.8rem' }}>
              <summary>ข้อความที่ดึงจากไฟล์</summary>
              {ev.containsPii && !ev.piiResolved
                ? <p className="aq-muted">ซ่อนไว้เพราะพบข้อมูลส่วนบุคคลที่ยังไม่ได้จัดการ</p>
                : <pre className="aq-ai-draft">{text ? text.slice(0, 1500) : '(ไม่มีข้อความ)'}</pre>}
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
