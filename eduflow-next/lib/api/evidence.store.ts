/**
 * Evidence repository (M5) — หลักฐาน 1 ชิ้นผูกได้หลายข้อโดยไม่ copy (EvidenceLink)
 * รหัส `E-<ข้อแรกที่ผูก>-<nn>` unique ต่อ programme · sha256 dedupe · PII scan · เวอร์ชันไฟล์
 * localStorage จำกัด ~5MB: เก็บ metadata + extractedText เสมอ, dataUrl เฉพาะไฟล์ ≤ 1MB
 * TODO(PostgreSQL): evidence + evidence_links + files · UNIQUE(programme_id, code) · ไฟล์จริงไป Storage
 */
import type {
  AppUser, Evidence, EvidenceFile, EvidenceKind, EvidenceLink, PdcaStage, PiiKind,
} from '../types';
import { newId, sha256Hex } from '../utils/hash';
import { scanPii } from '../utils/pii';
import { appendAudit } from './audit.store';
import { AunqaError, KEYS, load, save } from './db';
import { extractedTextOf } from './evidence-text.internal';
import { getRequirement } from './framework';
import { getProgramme, programmeScope } from './org.store';
import { can } from './rbac';
import { requireActiveActor } from './auth.api';
import { assertCycleWritable, assertSectionsEditable, cycleScope, getCycleRaw } from './workflow';

export const MAX_DATAURL_BYTES = 1024 * 1024;
const MAX_TEXT = 200_000;
const KINDS: EvidenceKind[] = ['policy', 'plan', 'minutes', 'survey', 'statistics', 'photo', 'publication', 'other'];
const STAGES: PdcaStage[] = ['P', 'D', 'C', 'A'];

/** spec 12: ไฟล์ ≤ 50MB · PDF/DOCX/XLSX/PNG/JPG/TXT/CSV เท่านั้น */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg', 'txt', 'csv'];
const TEXT_EXT = ['txt', 'csv'];
const extOf = (name: string) => (name.split('.').length > 1 ? name.split('.').pop()!.toLowerCase() : '');

export interface FileInput { name: string; mime: string; size: number; bytes?: ArrayBuffer; text?: string }

/** ตรวจขนาด/ชนิดไฟล์ (ใช้ทั้งก่อนอ่านไฟล์เข้า memory และตอนบันทึก) */
export function validateFileMeta(f: { name: string; size: number }): void {
  if (!ALLOWED_EXT.includes(extOf(f.name))) throw new AunqaError('invalid', 'รองรับเฉพาะไฟล์ PDF, DOCX, XLSX, PNG, JPG, TXT, CSV');
  if (f.size > MAX_FILE_BYTES) throw new AunqaError('invalid', 'ไฟล์ใหญ่เกิน 50MB');
}

/** อ่าน File ของ browser → FileInput (text สำหรับ .txt/.csv, ที่เหลือเก็บ bytes) */
export async function readFileInput(file: File): Promise<FileInput> {
  validateFileMeta(file);
  const isText = TEXT_EXT.includes(extOf(file.name));
  if (isText) return { name: file.name, mime: file.type || 'text/plain', size: file.size, text: await file.text(), bytes: await file.arrayBuffer() };
  return { name: file.name, mime: file.type || 'application/octet-stream', size: file.size, bytes: await file.arrayBuffer() };
}

function toDataUrl(bytes: ArrayBuffer, mime: string): string {
  const u8 = new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(bin)}`;
}

export interface EvidenceView extends Evidence { links: EvidenceLink[]; requirementIds: string[] }

function viewOf(e: Evidence, links: EvidenceLink[], cycleId?: string): EvidenceView {
  const mine = links.filter(l => l.evidenceId === e.id && (!cycleId || l.cycleId === cycleId));
  return { ...e, links: mine, requirementIds: Array.from(new Set(mine.map(l => l.requirementId))) };
}

function getRaw(id: string): Evidence {
  const e = load<Evidence>(KEYS.evidence).find(x => x.id === id);
  if (!e) throw new AunqaError('not_found', 'ไม่พบหลักฐาน');
  return e;
}
function saveOne(e: Evidence): void {
  const rows = load<Evidence>(KEYS.evidence);
  const i = rows.findIndex(x => x.id === e.id);
  if (i < 0) rows.push(e); else rows[i] = e;
  save(KEYS.evidence, rows);
}

function assertWrite(actor: AppUser, e: { programmeId: string }): void {
  requireActiveActor(actor);
  if (!can(actor, 'evidence.write', programmeScope(e.programmeId)))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์จัดการหลักฐานของหลักสูตรนี้');
}

/**
 * เปลี่ยนไฟล์ของหลักฐานที่ผูกกับรอบที่ lock แล้ว → ไม่ได้ (เนื้อหาที่ยื่นต้องคงเดิม)
 * metadata / verify / PII note / ผูกรอบอื่นที่ยังไม่ lock แก้ได้ (snapshot เก็บ metadata ตอน lock ไว้เทียบ — review #5)
 * การผูก/ถอดลิงก์ของรอบที่ lock ถูกบล็อกที่ assertCycleWritable ของรอบนั้นอยู่แล้ว
 */
function assertNotInLockedCycle(evidenceId: string): void {
  const cycleIds = new Set(load<EvidenceLink>(KEYS.links).filter(l => l.evidenceId === evidenceId).map(l => l.cycleId));
  for (const cid of cycleIds) {
    const c = load<{ id: string; lockedAt?: number }>(KEYS.cycles).find(x => x.id === cid);
    if (c?.lockedAt) throw new AunqaError('locked', 'หลักฐานนี้ถูกอ้างอิงในรอบที่ล็อกแล้ว แก้ไขไม่ได้');
  }
}

// ─── รหัส E-<req>-<nn> ────────────────────────────────────────────────────
export const CITATION_RE = /\[(E-\d+\.\d+-\d{2,})\]/g;

/** รหัสถัดไปที่ยังไม่ซ้ำใน programme (req = ข้อแรกที่ผูก; ไม่ระบุ → '0.0') */
export function nextEvidenceCode(programmeId: string, firstReq?: string): string {
  const base = `E-${firstReq && getRequirement(firstReq) ? firstReq : '0.0'}-`;
  const used = new Set(load<Evidence>(KEYS.evidence).filter(e => e.programmeId === programmeId).map(e => e.code));
  let n = 1;
  while (used.has(base + String(n).padStart(2, '0'))) n++;
  return base + String(n).padStart(2, '0');
}

// ─── PII ─────────────────────────────────────────────────────────────────
function piiOf(...texts: (string | undefined)[]): { contains: boolean; kinds: PiiKind[] } {
  const kinds = new Set<PiiKind>();
  scanPii(texts.filter(Boolean).join('\n')).forEach(f => kinds.add(f.kind));
  return { contains: kinds.size > 0, kinds: Array.from(kinds) };
}

// ─── Create ──────────────────────────────────────────────────────────────
export interface CreateEvidenceInput {
  programmeId: string; title: string; description?: string; kind: EvidenceKind; pdcaStage: PdcaStage; academicYear: number;
  cycleId?: string; requirementIds?: string[];
  url?: string; file?: FileInput; extractedText?: string;
  /** ข้ามการตรวจไฟล์ซ้ำ (ผู้ใช้ยืนยันแล้ว) */
  allowDuplicate?: boolean; source?: 'manual' | 'ai';
}

function validateMeta(i: { title: string; kind: EvidenceKind; pdcaStage: PdcaStage; academicYear: number; url?: string }) {
  if (!i.title.trim() || i.title.length > 200) throw new AunqaError('invalid', 'ชื่อหลักฐานต้องไม่ว่างและไม่เกิน 200 ตัวอักษร');
  if (!KINDS.includes(i.kind)) throw new AunqaError('invalid', 'ประเภทหลักฐานไม่ถูกต้อง');
  if (!STAGES.includes(i.pdcaStage)) throw new AunqaError('invalid', 'ขั้น PDCA ไม่ถูกต้อง');
  if (!Number.isInteger(i.academicYear) || i.academicYear < 2400 || i.academicYear > 2700) throw new AunqaError('invalid', 'ปีการศึกษาไม่ถูกต้อง');
  if (i.url && !/^https?:\/\/\S+$/i.test(i.url)) throw new AunqaError('invalid', 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
}

async function storeFile(actor: AppUser, evidenceId: string, file: FileInput, extracted: string | undefined): Promise<EvidenceFile> {
  validateFileMeta({ name: file.name, size: Math.max(file.size, file.bytes?.byteLength ?? 0) });
  const sha = await sha256Hex(file.bytes ?? file.text ?? '');
  const files = load<EvidenceFile>(KEYS.files);
  const version = files.filter(f => f.evidenceId === evidenceId).length + 1;
  const rec: EvidenceFile = {
    id: newId('fil'), evidenceId, version, name: file.name.slice(0, 200), mime: file.mime, size: file.size, sha256: sha,
    extractedText: extracted ? extracted.slice(0, MAX_TEXT) : undefined,
    piiScan: extracted !== undefined ? 'scanned' : 'not_scanned', uploadedBy: actor.id, uploadedAt: Date.now(),
  };
  if (file.bytes && file.bytes.byteLength <= MAX_DATAURL_BYTES) {
    try { rec.dataUrl = toDataUrl(file.bytes, file.mime); } catch { /* เก็บ metadata อย่างเดียว */ }
  }
  files.push(rec);
  try { save(KEYS.files, files); } catch {
    // โควตา localStorage เต็ม → เก็บแค่ metadata + text
    delete rec.dataUrl;
    save(KEYS.files, files);
  }
  return rec;
}

export async function createEvidence(actor: AppUser, input: CreateEvidenceInput): Promise<EvidenceView> {
  const prog = getProgramme(input.programmeId);
  if (!prog) throw new AunqaError('not_found', 'ไม่พบหลักสูตร');
  assertWrite(actor, input);
  validateMeta(input);
  const reqIds = Array.from(new Set(input.requirementIds ?? []));
  reqIds.forEach(r => { if (!getRequirement(r)) throw new AunqaError('invalid', `ไม่พบข้อ ${r}`); });
  if (reqIds.length && !input.cycleId) throw new AunqaError('invalid', 'ต้องระบุรอบประเมินเมื่อผูกกับข้อ');
  // R2-B4: ตรวจสถานะรอบ/ข้อก่อนสร้าง — ไม่ให้เกิดหลักฐานกำพร้าเมื่อ linkEvidence ท้ายฟังก์ชันถูกปฏิเสธ
  if (reqIds.length) {
    const cycle = getCycleRaw(input.cycleId!);
    assertCycleWritable(cycle);
    assertSectionsEditable(cycle.id, reqIds);
  }
  if (!input.file && !input.url && !input.extractedText) throw new AunqaError('invalid', 'ต้องแนบไฟล์ ลิงก์ หรือข้อความอย่างน้อยหนึ่งอย่าง');

  const extracted = input.extractedText ?? input.file?.text;
  const hashSrc = input.file ? (input.file.bytes ?? input.file.text) : input.extractedText;
  const sha = hashSrc !== undefined ? await sha256Hex(hashSrc) : undefined;

  const all = load<Evidence>(KEYS.evidence).filter(e => e.programmeId === prog.id);
  if (!input.allowDuplicate) {
    const dup = sha ? all.find(e => e.sha256 === sha) : (input.url ? all.find(e => e.url === input.url) : undefined);
    if (dup) throw new AunqaError('duplicate', `พบหลักฐานซ้ำ (${dup.code}: ${dup.title})`, { duplicateOf: dup.id, code: dup.code });
  }

  const now = Date.now();
  const pii = piiOf(input.title, input.description, extracted, input.file?.name); // D-sec A-6: ชื่อไฟล์ด้วย
  const ev: Evidence = {
    id: newId('evd'), universityId: prog.universityId, programmeId: prog.id,
    code: nextEvidenceCode(prog.id, reqIds[0]),
    title: input.title.trim(), description: (input.description ?? '').trim(),
    kind: input.kind, pdcaStage: input.pdcaStage, academicYear: input.academicYear,
    url: input.url || undefined, sha256: sha, containsPii: pii.contains, piiKinds: pii.kinds, piiResolved: false,
    status: 'uploaded', createdAt: now, createdBy: actor.id, updatedAt: now,
  };
  if (input.file) {
    const f = await storeFile(actor, ev.id, input.file, extracted);
    ev.currentFileId = f.id; ev.sha256 = f.sha256;
  } else if (extracted) {
    const f = await storeFile(actor, ev.id, { name: `${ev.code}.txt`, mime: 'text/plain', size: extracted.length, text: extracted }, extracted);
    ev.currentFileId = f.id;
  }
  saveOne(ev);
  appendAudit(actor, {
    action: 'evidence.create', targetType: 'evidence', targetId: ev.id, programmeId: prog.id,
    after: { code: ev.code, title: ev.title, containsPii: ev.containsPii },
  });
  if (reqIds.length) linkEvidence(actor, ev.id, input.cycleId!, reqIds, input.source ?? 'manual');
  return viewOf(getRaw(ev.id), load<EvidenceLink>(KEYS.links));
}

// ─── Update / files ──────────────────────────────────────────────────────
export interface UpdateEvidenceInput { title?: string; description?: string; kind?: EvidenceKind; pdcaStage?: PdcaStage; academicYear?: number; url?: string }

export function updateEvidence(actor: AppUser, id: string, patch: UpdateEvidenceInput): Evidence {
  const e = getRaw(id);
  assertWrite(actor, e);
  const next: Evidence = { ...e, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) } as Evidence;
  validateMeta(next);
  const ft = e.currentFileId ? load<EvidenceFile>(KEYS.files).find(f => f.id === e.currentFileId)?.extractedText : undefined;
  const cur = e.currentFileId ? load<EvidenceFile>(KEYS.files).find(f => f.id === e.currentFileId) : undefined;
  const pii = piiOf(next.title, next.description, ft, cur?.name); // D-sec A-6
  if (pii.contains !== e.containsPii || pii.kinds.join() !== e.piiKinds.join()) {
    next.containsPii = pii.contains; next.piiKinds = pii.kinds;
    if (!pii.contains) next.piiResolved = false;
  }
  // แก้ metadata สำคัญ → ต้อง verify ใหม่
  if (e.status === 'verified' && (patch.pdcaStage || patch.academicYear || patch.title)) {
    next.status = 'tagged'; next.verifiedBy = undefined; next.verifiedAt = undefined;
  }
  next.updatedAt = Date.now();
  saveOne(next);
  appendAudit(actor, { action: 'evidence.update', targetType: 'evidence', targetId: id, programmeId: e.programmeId, before: patch && pick(e, patch), after: patch });
  return next;
}
function pick(src: object, patch: object): object {
  const s = src as Record<string, unknown>;
  return Object.fromEntries(Object.keys(patch).map(k => [k, s[k]]));
}

/** อัปโหลดทับ = เพิ่มเวอร์ชันใหม่ (เวอร์ชันเก่าเก็บไว้) */
export async function addFileVersion(actor: AppUser, evidenceId: string, file: FileInput, extractedText?: string): Promise<EvidenceFile> {
  const e = getRaw(evidenceId);
  assertWrite(actor, e);
  assertNotInLockedCycle(evidenceId);
  const extracted = extractedText ?? file.text;
  const f = await storeFile(actor, evidenceId, file, extracted);
  const pii = piiOf(e.title, e.description, extracted, file.name); // D-sec A-6
  const next: Evidence = {
    ...e, currentFileId: f.id, sha256: f.sha256, containsPii: pii.contains, piiKinds: pii.kinds,
    piiResolved: pii.contains ? false : e.piiResolved, updatedAt: Date.now(),
    status: e.status === 'verified' ? 'tagged' : e.status, verifiedBy: undefined, verifiedAt: undefined,
  };
  saveOne(next);
  appendAudit(actor, { action: 'evidence.new_version', targetType: 'evidence', targetId: evidenceId, programmeId: e.programmeId, after: { version: f.version, sha256: f.sha256 } });
  return f;
}

export function listFileVersions(user: AppUser, evidenceId: string): EvidenceFile[] {
  const e = getRaw(evidenceId);
  if (!can(user, 'read', programmeScope(e.programmeId))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ดูหลักฐานนี้');
  return load<EvidenceFile>(KEYS.files).filter(f => f.evidenceId === evidenceId).sort((a, b) => b.version - a.version);
}

// ─── Links ───────────────────────────────────────────────────────────────
export function linkEvidence(
  actor: AppUser, evidenceId: string, cycleId: string, requirementIds: string[],
  source: 'manual' | 'ai' = 'manual', confidence?: number, confirmedBy?: string,
): EvidenceLink[] {
  const e = getRaw(evidenceId);
  assertWrite(actor, e);
  const cycle = getCycleRaw(cycleId);
  if (cycle.programmeId !== e.programmeId) throw new AunqaError('invalid', 'หลักฐานกับรอบประเมินต้องเป็นหลักสูตรเดียวกัน');
  if (!can(actor, 'evidence.write', cycleScope(cycle))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ผูกหลักฐานในรอบนี้');
  assertCycleWritable(cycle);
  const rids = Array.from(new Set(requirementIds));
  // validate ทั้งหมดก่อนแตะข้อมูล (cache คืน reference ร่วม — ห้าม throw กลางลูปหลัง mutate)
  for (const rid of rids) if (!getRequirement(rid)) throw new AunqaError('invalid', `ไม่พบข้อ ${rid}`);
  const links = load<EvidenceLink>(KEYS.links);
  // R2-B4 (BUG-0002-P1): ข้อที่ส่งตรวจ/อนุมัติแล้วผูกหลักฐานเพิ่มไม่ได้ (ตรวจเฉพาะข้อที่ยังไม่เคยผูก — ผูกซ้ำ = no-op เดิม)
  assertSectionsEditable(cycleId, rids.filter(rid => !links.some(l => l.evidenceId === evidenceId && l.cycleId === cycleId && l.requirementId === rid)));
  const added: EvidenceLink[] = [];
  for (const rid of rids) {
    if (links.some(l => l.evidenceId === evidenceId && l.cycleId === cycleId && l.requirementId === rid)) continue;
    const l: EvidenceLink = { id: newId('lnk'), evidenceId, requirementId: rid, cycleId, source, confidence, confirmedBy: confirmedBy ?? (source === 'manual' ? actor.id : undefined), at: Date.now() };
    links.push(l); added.push(l);
  }
  if (added.length) {
    save(KEYS.links, links);
    if (e.status === 'uploaded') saveOne({ ...e, status: 'tagged', updatedAt: Date.now() });
    appendAudit(actor, {
      action: 'evidence.link', targetType: 'evidence', targetId: evidenceId, programmeId: e.programmeId,
      after: { cycleId, requirements: added.map(l => l.requirementId), source },
    });
  }
  return added;
}

export function unlinkEvidence(actor: AppUser, evidenceId: string, cycleId: string, requirementId: string): void {
  const e = getRaw(evidenceId);
  assertWrite(actor, e);
  const cycle = getCycleRaw(cycleId);
  assertCycleWritable(cycle);
  const links = load<EvidenceLink>(KEYS.links);
  const keep = links.filter(l => !(l.evidenceId === evidenceId && l.cycleId === cycleId && l.requirementId === requirementId));
  if (keep.length === links.length) return;
  // R2-B4 (BUG-0002-P1): เลิกผูกจากข้อที่ส่งตรวจ/อนุมัติแล้วไม่ได้ — ต้องถูกส่งกลับแก้ก่อน
  assertSectionsEditable(cycleId, [requirementId]);
  save(KEYS.links, keep);
  if (e.status === 'tagged' && !keep.some(l => l.evidenceId === evidenceId))
    saveOne({ ...e, status: 'uploaded', updatedAt: Date.now() });
  appendAudit(actor, { action: 'evidence.unlink', targetType: 'evidence', targetId: evidenceId, programmeId: e.programmeId, before: { cycleId, requirementId } });
}

// ─── Verify / PII ────────────────────────────────────────────────────────
export function verifyEvidence(actor: AppUser, id: string): Evidence {
  requireActiveActor(actor);
  const e = getRaw(id);
  if (!can(actor, 'evidence.verify', programmeScope(e.programmeId))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ยืนยันหลักฐาน');
  if (e.containsPii && !e.piiResolved) throw new AunqaError('invalid', 'หลักฐานนี้ติดธงข้อมูลส่วนบุคคล ต้องจัดการ (ปิดบัง/ยืนยัน) ก่อน verify');
  if (!load<EvidenceLink>(KEYS.links).some(l => l.evidenceId === id)) throw new AunqaError('invalid', 'ต้องผูกกับข้ออย่างน้อย 1 ข้อก่อน verify');
  const next: Evidence = { ...e, status: 'verified', verifiedBy: actor.id, verifiedAt: Date.now(), updatedAt: Date.now() };
  saveOne(next);
  appendAudit(actor, { action: 'evidence.verify', targetType: 'evidence', targetId: id, programmeId: e.programmeId, before: { status: e.status }, after: { status: 'verified' } });
  return next;
}

/** ผู้มีสิทธิ์ยืนยันว่า PII ถูกจัดการแล้ว (เช่น ปิดบังในไฟล์ใหม่/ยืนยันว่าเป็นข้อมูลสาธารณะ) */
export function resolvePii(actor: AppUser, id: string, note: string): Evidence {
  const e = getRaw(id);
  assertWrite(actor, e);
  if (!e.containsPii) throw new AunqaError('invalid', 'หลักฐานนี้ไม่มีธง PII');
  if (!note.trim()) throw new AunqaError('invalid', 'ต้องระบุวิธีจัดการ PII');
  const next: Evidence = { ...e, piiResolved: true, piiResolvedNote: note.trim(), updatedAt: Date.now() };
  saveOne(next);
  appendAudit(actor, { action: 'evidence.resolve_pii', targetType: 'evidence', targetId: id, programmeId: e.programmeId, after: { note: note.trim(), kinds: e.piiKinds } });
  return next;
}

/** ตั้งสรุป AI (เรียกจาก ai.service.acceptAiRun โดยผู้ใช้ที่กดยอมรับ) */
export function setAiSummary(actor: AppUser, id: string, summary: string, pdcaStage?: PdcaStage): Evidence {
  const e = getRaw(id);
  assertWrite(actor, e);
  const next: Evidence = { ...e, aiSummary: summary, pdcaStage: pdcaStage ?? e.pdcaStage, updatedAt: Date.now() };
  saveOne(next);
  appendAudit(actor, { action: 'evidence.ai_summary', targetType: 'evidence', targetId: id, programmeId: e.programmeId, after: { pdcaStage: next.pdcaStage } });
  return next;
}

// ─── Queries ─────────────────────────────────────────────────────────────
export interface EvidenceQuery {
  programmeId: string; cycleId?: string; requirementId?: string; q?: string; year?: number;
  kind?: EvidenceKind; pdcaStage?: PdcaStage; containsPii?: boolean; status?: Evidence['status'];
  /** แสดงเฉพาะที่ผูกกับ cycleId (assessor ถูกบังคับเป็น true) */
  onlyLinked?: boolean;
}

export function listEvidence(user: AppUser, query: EvidenceQuery): EvidenceView[] {
  if (!can(user, 'read', programmeScope(query.programmeId, { cycleId: query.cycleId })))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ดูหลักฐานของหลักสูตรนี้');
  const isAssessorOnly = user.roles.every(r => r.role === 'assessor');
  const onlyLinked = query.onlyLinked || isAssessorOnly || !!query.requirementId;
  const links = load<EvidenceLink>(KEYS.links);
  const files = query.q ? load<EvidenceFile>(KEYS.files) : [];
  const q = query.q?.trim().toLowerCase();
  return load<Evidence>(KEYS.evidence)
    .filter(e => e.programmeId === query.programmeId)
    .map(e => viewOf(e, links, query.cycleId))
    .filter(v => {
      if (onlyLinked && !v.links.length) return false;
      if (query.requirementId && !v.requirementIds.includes(query.requirementId)) return false;
      if (query.year && v.academicYear !== query.year) return false;
      if (query.kind && v.kind !== query.kind) return false;
      if (query.pdcaStage && v.pdcaStage !== query.pdcaStage) return false;
      if (query.status && v.status !== query.status) return false;
      if (query.containsPii !== undefined && v.containsPii !== query.containsPii) return false;
      if (q) {
        const text = files.find(f => f.id === v.currentFileId)?.extractedText ?? '';
        const hay = `${v.code} ${v.title} ${v.description} ${v.aiSummary ?? ''} ${text}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** สิทธิ์ดูหลักฐาน: cycleId ต้องเป็นหลักสูตรเดียวกัน · assessor-only ต้องมี link ของหลักฐานนี้ในรอบนั้น */
function assertCanView(user: AppUser, e: Evidence, cycleId?: string): void {
  const deny = () => new AunqaError('forbidden', 'ไม่มีสิทธิ์ดูหลักฐานนี้');
  if (cycleId && getCycleRaw(cycleId).programmeId !== e.programmeId) throw deny();
  if (!can(user, 'read', programmeScope(e.programmeId, { cycleId }))) throw deny();
  if (user.roles.every(r => r.role === 'assessor')
    && !(cycleId && load<EvidenceLink>(KEYS.links).some(l => l.evidenceId === e.id && l.cycleId === cycleId))) throw deny();
}

export function getEvidence(user: AppUser, id: string, cycleId?: string): EvidenceView {
  const e = getRaw(id);
  assertCanView(user, e, cycleId);
  return viewOf(e, load<EvidenceLink>(KEYS.links), cycleId);
}

/** ลิงก์ทั้งหมดของรอบ (ใช้ใน SAR editor / gap) */
export function listLinks(user: AppUser, cycleId: string): EvidenceLink[] {
  const c = getCycleRaw(cycleId);
  if (!can(user, 'read', cycleScope(c))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์เข้าถึงรอบประเมินนี้');
  return load<EvidenceLink>(KEYS.links).filter(l => l.cycleId === cycleId);
}

/** ข้อความที่ extract จากไฟล์ปัจจุบัน — ตรวจสิทธิ์เหมือน getEvidence (สำหรับ UI) */
export function getExtractedText(user: AppUser, evidenceId: string, cycleId?: string): string {
  assertCanView(user, getRaw(evidenceId), cycleId);
  return extractedTextOf(evidenceId);
}
