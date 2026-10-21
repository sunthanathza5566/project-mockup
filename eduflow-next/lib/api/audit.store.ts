/**
 * Audit log (M17) — append-only: ไม่มีฟังก์ชันแก้/ลบ (กฎเหล็กข้อ 3)
 * TODO(PostgreSQL): INSERT INTO audit_logs … + REVOKE UPDATE, DELETE ON audit_logs
 */
import type { AppUser, AuditLog } from '../types';
import { newId } from '../utils/hash';
import { KEYS, load, save } from './db';
import { getProgramme } from './org.store';
import { can } from './rbac';

export interface AuditInput {
  action: string; targetType: string; targetId: string;
  before?: unknown; after?: unknown; programmeId?: string;
}

/** system actor (ใช้ตอน seed / คำนวณอัตโนมัติ) */
export const SYSTEM_ACTOR_ID = 'system';

export function appendAudit(actor: AppUser | null, input: AuditInput, universityId?: string): AuditLog {
  const entry: AuditLog = {
    id: newId('aud'),
    universityId: actor?.universityId ?? universityId ?? '',
    programmeId: input.programmeId,
    actorId: actor?.id ?? SYSTEM_ACTOR_ID,
    actorName: actor?.fullName ?? 'system',
    action: input.action, targetType: input.targetType, targetId: input.targetId,
    before: input.before, after: input.after,
    ip: 'local', // TODO(PostgreSQL): IP จริงจาก request
    at: Date.now(),
  };
  const rows = load<AuditLog>(KEYS.audit);
  rows.push(entry);
  save(KEYS.audit, rows);
  return entry;
}

/** บันทึก audit แบบรวมถี่ (autosave): ข้ามถ้า actor+action+target เดิมถูกบันทึกภายใน windowMs */
export function appendAuditThrottled(actor: AppUser, input: AuditInput, windowMs = 60_000): void {
  const rows = load<AuditLog>(KEYS.audit);
  const now = Date.now();
  for (let i = rows.length - 1; i >= 0 && now - rows[i].at < windowMs; i--) {
    const r = rows[i];
    if (r.actorId === actor.id && r.action === input.action && r.targetId === input.targetId) return;
  }
  appendAudit(actor, input);
}

export interface AuditFilter { programmeId?: string; targetType?: string; targetId?: string; actorId?: string; limit?: number }

/** ดูได้ตามสิทธิ์: super/uni_admin/faculty_qa/dean ทั้ง university · chair เฉพาะหลักสูตรตน */
export function listAudit(user: AppUser, filter: AuditFilter = {}): AuditLog[] {
  const rows = load<AuditLog>(KEYS.audit).filter(a => {
    // ตรวจรายแถว: chair เห็นเฉพาะหลักสูตรตน · faculty_qa/dean เห็นเฉพาะคณะตน
    const prog = a.programmeId ? getProgramme(a.programmeId) : undefined;
    if (!can(user, 'audit.view', { universityId: a.universityId, programmeId: a.programmeId, facultyId: prog?.facultyId })) return false;
    if (filter.programmeId && a.programmeId !== filter.programmeId) return false;
    if (filter.targetType && a.targetType !== filter.targetType) return false;
    if (filter.targetId && a.targetId !== filter.targetId) return false;
    if (filter.actorId && a.actorId !== filter.actorId) return false;
    return true;
  }).sort((x, y) => y.at - x.at);
  return filter.limit ? rows.slice(0, filter.limit) : rows;
}

export function auditToCsv(rows: AuditLog[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['at', 'actor', 'action', 'targetType', 'targetId', 'before', 'after'];
  const lines = rows.map(r => [
    new Date(r.at).toISOString(), r.actorName, r.action, r.targetType, r.targetId,
    r.before === undefined ? '' : JSON.stringify(r.before), r.after === undefined ? '' : JSON.stringify(r.after),
  ].map(esc).join(','));
  return [head.join(','), ...lines].join('\n');
}
