'use client';

/**
 * รายละเอียดหลักฐาน (saas-spec §P11 + friendly-spec §F13 — earth)
 * crumbs หลักฐาน › รหัส · h1 "รหัส · ชื่อ" (E2E-06/11) + pill สถานะ + pill PII · pii-banner (InlineMessage, "เลขบัตรประชาชน")
 * grid lg:3: การ์ดข้อมูล lg:col-span-2 (dl 8rem/1fr + ev-edit + ยืนยันตรวจสอบ) · การ์ดข้อที่ผูก (ev-links) + ผูกเพิ่ม (RequirementPicker)
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
import { Button, buttonVariants } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { Textarea } from '@/components/ui/primitives/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/primitives/table';
import { cn } from '@/lib/ui/cn';
import { KIND_LIST, KIND_TH, PDCA_TH, decodeParam, errMsg, fmtDateTime, isAssessorOnly, sectionHref, truncateTh } from '@/lib/ui/aunqa';
import { notifyTodosChanged } from '@/lib/ui/todo';

const PII_KIND_TH: Record<string, string> = { thai_id: 'เลขบัตรประชาชน', student_id: 'รหัสนักศึกษา', email: 'อีเมล', phone: 'เบอร์โทร' };

// ─── หน้าตา (saas-spec §C2, §C3, §C5 + friendly-spec §F13) ───
const CARD = 'rounded-xl border bg-card p-5 text-card-foreground shadow-sm dark:shadow-none md:p-6';
const H2 = 'm-0 text-lg font-semibold text-foreground';
const LABEL = 'text-base font-medium text-foreground';
const DT = 'aq-meta';
const DD = 'm-0 mb-2 min-w-0 break-words text-base text-foreground sm:mb-0';
const CHECK_ROW = 'flex min-h-11 cursor-pointer items-center gap-3 text-base text-foreground';
const CHECK_INPUT = 'h-5 w-5 shrink-0 accent-primary';
const STACK_TABLE = 'max-md:block';
const STACK_HEAD = 'max-md:sr-only';
const STACK_BODY = 'max-md:block';
const STACK_ROW = 'max-md:block max-md:p-4';
const STACK_CELL = 'max-md:block max-md:px-0 max-md:py-1 max-md:before:block max-md:before:text-sm max-md:before:font-medium max-md:before:text-muted-foreground max-md:before:content-[attr(data-label)]';

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
            status={<span className="inline-flex flex-wrap items-center gap-2">
              <EvidenceStatusBadge status={ev.status} />
              {ev.containsPii && !ev.piiResolved && <Badge tone="bad" icon="alert-triangle">PII ยังไม่จัดการ</Badge>}
            </span>}
            sub={`${KIND_TH[ev.kind]} · ${PDCA_TH[ev.pdcaStage]} · ปีการศึกษา ${ev.academicYear}`}
            actions={<Button asChild variant="outline"><Link href="/app/evidence"><Icon name="chevron-left" size={20} />คลังหลักฐาน</Link></Button>}
          />

          <div className="space-y-6">
            {ev.containsPii && (
              <InlineMessage tone={ev.piiResolved ? 'success' : 'danger'} testId="pii-banner"
                title={ev.piiResolved ? 'จัดการข้อมูลส่วนบุคคลแล้ว' : `พบข้อมูลที่อาจเป็นข้อมูลส่วนบุคคล (${ev.piiKinds.map(k => PII_KIND_TH[k] ?? k).join(', ')})`}
                actions={!ev.piiResolved && canWrite ? (
                  <AsyncButton variant="outline" testId="pii-resolve" onClick={async () => {
                    const note = await prompt({ title: 'ยืนยันจัดการข้อมูลส่วนบุคคล', message: 'ระบุสิ่งที่ทำ เช่น ปกปิดเลขบัตรในต้นฉบับแล้ว', required: true, confirmText: 'ยืนยันจัดการแล้ว' });
                    if (note !== null) act(() => resolvePii(user, id, note), 'บันทึกการจัดการ PII แล้ว');
                  }}>ทำเครื่องหมายว่าจัดการแล้ว</AsyncButton>
                ) : undefined}>
                {ev.piiResolved ? ev.piiResolvedNote : <>ปกปิดต้นฉบับแล้วบันทึกว่าจัดการเรียบร้อยก่อนใช้เป็นหลักฐาน <Term k="pii" label="PII" /></>}
              </InlineMessage>
            )}

            <div className="grid items-start gap-6 lg:grid-cols-3">
              <section className={cn(CARD, 'space-y-4 lg:col-span-2')} aria-labelledby="meta-h">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="meta-h" className={H2}>รายละเอียด</h2>
                  {canWrite && !edit && <Button variant="outline" size="compact" data-testid="ev-edit" onClick={() => {
                    setF({ title: ev.title, description: ev.description, kind: ev.kind, stage: ev.pdcaStage, year: String(ev.academicYear), url: ev.url || '' });
                    setEdit(true);
                  }}><Icon name="pencil" size={20} />แก้ไข</Button>}
                </div>
                {!edit ? (
                  <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-y-3">
                    <dt className={DT}>คำอธิบาย</dt><dd className={DD}>{ev.description || '—'}</dd>
                    <dt className={DT}>สรุปโดย AI</dt><dd className={DD}>{ev.aiSummary || '—'}</dd>
                    <dt className={DT}>ลิงก์</dt><dd className={DD}>{ev.url ? <a className="inline-flex items-center gap-1 break-all text-primary" href={ev.url} target="_blank" rel="noreferrer noopener">{ev.url}<Icon name="external" size={16} /><span className="sr-only"> (เปิดแท็บใหม่)</span></a> : '—'}</dd>
                    <dt className={DT}>ไฟล์</dt>
                    <dd className={DD}>{latest
                      ? <>{latest.name} · {fmtSize(latest.size)} · {latest.dataUrl ? 'เก็บไฟล์แล้ว' : 'เก็บเฉพาะข้อมูลไฟล์'}</>
                      : '—'}</dd>
                    <dt className={cn(DT, 'inline-flex items-center')}>hash <Term k="hash" label="hash" /></dt><dd className={DD}><code className="rounded-md bg-muted px-1.5 py-0.5 font-mono tabular-nums">{ev.sha256 ? ev.sha256.slice(0, 16) : '—'}</code></dd>
                    <dt className={DT}>ตรวจสอบโดย</dt><dd className={DD}>{ev.verifiedAt ? fmtDateTime(ev.verifiedAt) : 'ยังไม่ได้ตรวจสอบ'}</dd>
                  </dl>
                ) : (
                  <form className="space-y-4" onSubmit={e => {
                    e.preventDefault();
                    act(() => { updateEvidence(user, id, { title: f.title, description: f.description, kind: f.kind, pdcaStage: f.stage, academicYear: Number(f.year), url: f.url || undefined }); setEdit(false); }, 'บันทึกแล้ว');
                  }}>
                    <div className="space-y-1.5"><label htmlFor="ed-title" className={LABEL}>ชื่อ *</label>
                      <Input id="ed-title" required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} data-testid="ev-edit-title" /></div>
                    <div className="space-y-1.5"><label htmlFor="ed-desc" className={LABEL}>คำอธิบาย</label>
                      <Textarea id="ed-desc" rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5"><label htmlFor="ed-kind" className={LABEL}>ประเภท</label>
                        <NativeSelect id="ed-kind" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as EvidenceKind })}>{KIND_LIST.map(k => <option key={k} value={k}>{KIND_TH[k]}</option>)}</NativeSelect></div>
                      <div className="space-y-1.5"><label htmlFor="ed-pdca" className={LABEL}>ขั้น PDCA</label>
                        <NativeSelect id="ed-pdca" value={f.stage} onChange={e => setF({ ...f, stage: e.target.value as PdcaStage })}>{(['P', 'D', 'C', 'A'] as PdcaStage[]).map(s => <option key={s} value={s}>{PDCA_TH[s]}</option>)}</NativeSelect></div>
                      <div className="space-y-1.5"><label htmlFor="ed-year" className={LABEL}>ปีการศึกษา</label>
                        <Input id="ed-year" type="number" value={f.year} onChange={e => setF({ ...f, year: e.target.value })} /></div>
                    </div>
                    <div className="space-y-1.5"><label htmlFor="ed-url" className={LABEL}>ลิงก์</label>
                      <Input id="ed-url" type="url" value={f.url} onChange={e => setF({ ...f, url: e.target.value })} /></div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button type="submit" data-testid="ev-edit-save">บันทึก</Button>
                      <Button variant="outline" onClick={() => setEdit(false)}>ยกเลิก</Button>
                    </div>
                  </form>
                )}
                {canVerify && ev.status !== 'verified' && (
                  <div className="border-t pt-4">
                    <AsyncButton variant="outline" testId="ev-verify" onClick={() => act(() => verifyEvidence(user, id), 'ตรวจสอบหลักฐานแล้ว')}><Icon name="check-circle" size={20} />ยืนยันว่าตรวจสอบหลักฐานแล้ว</AsyncButton>
                  </div>
                )}
              </section>

              <section className={cn(CARD, 'space-y-4')} aria-labelledby="link-h">
                <h2 id="link-h" className={H2}>ข้อที่ผูก{cycleParam ? ' (ในรอบนี้)' : ' (ทุกรอบ)'}</h2>
                {ev.links.length === 0 ? <Empty icon="link" title="ยังไม่ผูกกับข้อใด" /> : (
                  <ul className="m-0 list-none divide-y p-0" data-testid="ev-links">
                    {ev.links.map(l => (
                      <li key={l.id} className="flex items-start gap-2 py-3 first:pt-0">
                        <div className="min-w-0 flex-1 space-y-1">
                          <Link className="font-medium tabular-nums text-primary" href={sectionHref(l.cycleId, l.requirementId)}>ข้อ {l.requirementId}</Link>
                          <p className="aq-meta m-0">{truncateTh(getRequirement(l.requirementId)?.textTh ?? '', 60)}</p>
                          {l.source === 'ai' && <Badge tone="info" icon="sparkle">AI แนะนำ</Badge>}
                        </div>
                        {canWrite && (
                          <Button variant="ghost" size="icon" className="-mr-2 shrink-0 text-muted-foreground" aria-label={`เลิกผูกข้อ ${l.requirementId}`} title={`เลิกผูกข้อ ${l.requirementId}`}
                            onClick={() => act(() => unlinkEvidence(user, id, l.cycleId, l.requirementId), 'เลิกผูกแล้ว')}>
                            <Icon name="x" size={20} />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {canWrite && cycles.length > 0 && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="space-y-1.5">
                      <label htmlFor="ev-link-cycle" className={LABEL}>ผูกเพิ่มในรอบ</label>
                      <NativeSelect id="ev-link-cycle" value={cid} onChange={e => setLinkCycle(e.target.value)} data-testid="ev-link-cycle">
                        {cycles.map(c => <option key={c.id} value={c.id}>รอบ {c.academicYear}</option>)}
                      </NativeSelect>
                    </div>
                    <RequirementPicker label="ข้อที่จะผูก" value={linkReqs} onChange={setLinkReqs} testIdPrefix="ev-link-req" />
                    <Button variant="outline" className="w-full" disabled={!linkReqs.length || !cid} data-testid="ev-link-btn"
                      onClick={() => act(() => { linkEvidence(user, id, cid, linkReqs); setLinkReqs([]); }, 'ผูกหลักฐานแล้ว')}><Icon name="link" size={20} />ผูกกับข้อที่เลือก</Button>
                  </div>
                )}
              </section>
            </div>

            <section className={cn(CARD, 'space-y-3')} aria-labelledby="ai-h" data-testid="ev-ai">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true"><Icon name="sparkle" size={20} /></span>
                <div className="min-w-0 space-y-1">
                  <h2 id="ai-h" className={H2}>AI แนะนำข้อที่เกี่ยวข้อง</h2>
                  <p className="aq-help m-0">AI สรุปหลักฐานและเสนอข้อ/ขั้น PDCA — ข้อมูลส่วนบุคคลถูกปกปิดก่อนส่ง ต้องกดยอมรับก่อนจึงบันทึกจริง</p>
                </div>
              </div>
              {canAi && canWrite ? (
                <AsyncButton testId="ev-ai-run" variant="outline" busyText="กำลังวิเคราะห์…" onClick={async () => {
                  try {
                    const r = await runEvidenceTagger(user, id, tagCycle || undefined);
                    setRun(r);
                    setPicked((r.output as { suggestions: { requirementId: string }[] }).suggestions.map(s => s.requirementId));
                  } catch (e) { showToast(errMsg(e), 'error'); }
                }}><Icon name="sparkle" size={20} />ให้ AI แนะนำ</AsyncButton>
              ) : <p className="aq-meta m-0">คุณไม่มีสิทธิ์ใช้ AI กับหลักฐานนี้</p>}
              {run && (() => {
                const out = run.output as { summary: string; pdcaStage: PdcaStage; pdcaReason: string; suggestions: { requirementId: string; confidence: number; reasons: string[] }[] };
                return (
                  <div className="mt-2 space-y-4 rounded-xl border bg-muted/40 p-4 animate-fade-in md:p-5" data-testid="ev-ai-result">
                    <div className="flex flex-wrap items-center gap-2">
                      <ModelBadge run={run} />
                      <span className="inline-flex items-center"><Badge tone="neutral" icon={false}>ปกปิดข้อมูลส่วนบุคคล {run.redactionCount} จุด</Badge><Term k="redaction" label="การปกปิดข้อมูลส่วนบุคคล" /></span>
                      <Badge tone={run.postCheck.ok ? 'ok' : 'warn'}>{run.postCheck.ok ? 'ผ่านการตรวจ' : 'พบข้อควรระวัง'}</Badge>
                    </div>
                    <div className="space-y-1 text-base text-foreground">
                      <p className="m-0"><strong className="font-semibold">สรุป:</strong> {out.summary}</p>
                      <p className="m-0"><strong className="font-semibold">ขั้น PDCA ที่เสนอ:</strong> {PDCA_TH[out.pdcaStage]} — {out.pdcaReason}</p>
                    </div>
                    {out.suggestions.length === 0 ? <Empty icon="search" title="AI ไม่พบข้อที่เกี่ยวข้องชัดเจน" /> : (
                      <ul className="m-0 list-none divide-y rounded-lg border bg-card p-0">
                        {out.suggestions.map(s => (
                          <li key={s.requirementId} className="flex flex-col gap-1 px-4 py-2 sm:flex-row sm:items-center sm:gap-4">
                            <label className={CHECK_ROW}>
                              <input type="checkbox" className={CHECK_INPUT} checked={picked.includes(s.requirementId)} data-testid={`ai-pick-${s.requirementId}`}
                                onChange={e => setPicked(p => e.target.checked ? [...p, s.requirementId] : p.filter(x => x !== s.requirementId))} />
                              <span className="font-medium tabular-nums">ข้อ {s.requirementId}</span> <Badge tone="info" icon={false}>{Math.round(s.confidence * 100)}%</Badge>
                            </label>
                            <span className="aq-meta min-w-0 flex-1">{s.reasons.join(' · ')}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap gap-2 border-t pt-4">
                      <Button data-testid="ev-ai-accept" onClick={() => act(() => { acceptAiRun(user, run.id, { requirementIds: picked }); setRun(null); }, 'บันทึกข้อเสนอของ AI แล้ว')}>ยอมรับข้อที่เลือก</Button>
                      <Button variant="ghost" onClick={() => setRun(null)}>ทิ้ง</Button>
                    </div>
                    {!tagCycle && <p className="aq-help m-0">ไม่มีรอบประเมิน จึงบันทึกได้เฉพาะสรุป/PDCA ไม่ผูกข้อ</p>}
                  </div>
                );
              })()}
            </section>

            <section className={cn(CARD, 'space-y-4')} aria-labelledby="file-h">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="file-h" className={H2}>ไฟล์และเวอร์ชัน ({files.length})</h2>
                {canWrite && (
                  <label className={cn(buttonVariants({ variant: 'outline', size: 'compact' }), 'cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring')}>
                    <Icon name="upload" size={20} />อัปโหลดเวอร์ชันใหม่
                    <input type="file" className="sr-only" data-testid="ev-newver" onChange={async e => {
                      const file = e.target.files?.[0]; e.target.value = '';
                      if (!file) return;
                      try { await addFileVersion(user, id, await readFileInput(file)); showToast('เพิ่มเวอร์ชันแล้ว', 'success'); q.reload(); }
                      catch (err) { showToast(errMsg(err), 'error'); }
                    }} />
                  </label>
                )}
              </div>
              {files.length === 0 ? <Empty icon="file-text" title="ไม่มีไฟล์แนบ" text="หลักฐานนี้อาจเป็นลิงก์หรือข้อความ" /> : (
                <Table className={STACK_TABLE}>
                  <TableHeader className={STACK_HEAD}>
                    <TableRow><TableHead>v</TableHead><TableHead>ไฟล์</TableHead><TableHead>ขนาด</TableHead><TableHead>hash</TableHead><TableHead>อัปโหลด</TableHead></TableRow>
                  </TableHeader>
                  <TableBody className={STACK_BODY}>
                    {files.map(fl => (
                      <TableRow key={fl.id} className={STACK_ROW}>
                        <TableCell data-label="เวอร์ชัน" className={cn(STACK_CELL, 'tabular-nums')}>{fl.version}</TableCell>
                        <TableCell data-label="ไฟล์" className={cn(STACK_CELL, 'break-all')}>{fl.dataUrl ? <a className="text-primary" href={fl.dataUrl} download={fl.name}>{fl.name}</a> : <span>{fl.name} <span className="aq-meta">(เก็บเฉพาะข้อมูลไฟล์)</span></span>}</TableCell>
                        <TableCell data-label="ขนาด" className={STACK_CELL}>
                          <span className="inline-flex flex-col items-start gap-1">
                            <span className="tabular-nums">{fmtSize(fl.size)}</span>
                            {fl.piiScan === 'not_scanned' && <Badge tone="neutral" icon="circle-dashed" title="ไฟล์ประเภทนี้ระบบยังอ่านข้อความไม่ได้ จึงยังตรวจข้อมูลส่วนบุคคลไม่ได้ — โปรดตรวจเองก่อนใช้" testId="pii-not-scanned">ยังไม่ได้ตรวจ PII</Badge>}
                          </span>
                        </TableCell>
                        <TableCell data-label="hash" className={STACK_CELL}><code className="rounded-md bg-muted px-1.5 py-0.5 font-mono tabular-nums">{fl.sha256.slice(0, 12)}…</code></TableCell>
                        <TableCell data-label="อัปโหลด" className={cn(STACK_CELL, 'tabular-nums')}>{fmtDateTime(fl.uploadedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <details className="group rounded-lg border bg-card">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">ข้อความที่ดึงจากไฟล์</span>
                  <Icon name="chevron-down" size={20} className="text-muted-foreground transition-transform duration-fast group-open:rotate-180" />
                </summary>
                <div className="border-t p-4">
                  {ev.containsPii && !ev.piiResolved
                    ? <p className="m-0 text-base text-muted-foreground">ซ่อนไว้เพราะพบข้อมูลส่วนบุคคลที่ยังไม่ได้จัดการ</p>
                    : <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-base leading-relaxed text-foreground">{text ? text.slice(0, 1500) : '(ไม่มีข้อความ)'}</div>}
                </div>
              </details>
            </section>
          </div>
        </>
      );
    }}</Async>
  );
}

export default function EvidenceDetailPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
