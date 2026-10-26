/**
 * Notifications (M16) — in-app เท่านั้น (อีเมลจริง = Phase B)
 * deadline 7/3/1 วัน "คำนวณตอนโหลด" (syncDeadlineNotifications) แล้ว dedupe ด้วย dedupeKey
 * TODO(PostgreSQL): table notifications(id,user_id,kind,payload jsonb,read_at)
 */
import type { AppNotification, AppUser, NotificationKind, NotificationTarget, SarSection } from '../types';
import { newId } from '../utils/hash';
import { isActiveUser, isActorActive } from './auth.api';
import { KEYS, load, save } from './db';
import { getUserById } from './org.store';

/**
 * ADR-AUTH-001 A6: ทุกจุดต้องส่ง messageEn + target (ปลายทางเชิงความหมาย — frontend แปลงเป็น href เอง)
 * messageTh ต้องคงข้อความเดิมทุกตัวอักษร (เทสต์ phase-u B3 เทียบตรง)
 */
export interface NotifyInput {
  userId: string; kind: NotificationKind; messageTh: string; messageEn: string; target: NotificationTarget;
  cycleId?: string; requirementId?: string; dedupeKey?: string;
}

/** ปลายทางของแจ้งเตือนที่อ้างหลายข้อ: 1 ข้อ → section · หลายข้อ → งานของฉัน */
export function sectionsTarget(cycleId: string, requirementIds: string[]): NotificationTarget {
  return requirementIds.length === 1 ? { type: 'section', cycleId, requirementId: requirementIds[0] } : { type: 'my_work' };
}

/** "Requirement 1.1" / "Requirements 1.1, 1.2" (ข้อความ EN ของ N1/N11) */
export function requirementsEn(ids: string[]): string {
  return `${ids.length === 1 ? 'Requirement' : 'Requirements'} ${ids.join(', ')}`;
}

/**
 * internal — store อื่นเรียกใช้ (ไม่ผ่าน rbac เพราะเป็นผลข้างเคียงของ action ที่ตรวจสิทธิ์แล้ว)
 * ผู้รับที่ไม่ active (invited/pending/suspended) → ข้าม (ADR-AUTH-001 A5)
 */
export function notify(input: NotifyInput): AppNotification | null {
  const target = getUserById(input.userId);
  if (!target || !isActiveUser(target)) return null;
  const rows = load<AppNotification>(KEYS.notifications);
  if (input.dedupeKey && rows.some(n => n.userId === input.userId && n.dedupeKey === input.dedupeKey)) return null;
  const n: AppNotification = {
    id: newId('ntf'), universityId: target.universityId, userId: input.userId, kind: input.kind,
    cycleId: input.cycleId, requirementId: input.requirementId, messageTh: input.messageTh,
    dedupeKey: input.dedupeKey, createdAt: Date.now(),
    messageEn: input.messageEn, target: { ...input.target },
  };
  rows.push(n);
  save(KEYS.notifications, rows);
  return n;
}

/** bucket ของวันที่เหลือ: เกินกำหนด / ≤1 / ≤3 / ≤7 / ไกลกว่านั้น (null) */
export function deadlineBucket(daysLeft: number): 'overdue' | '1' | '3' | '7' | null {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 1) return '1';
  if (daysLeft <= 3) return '3';
  if (daysLeft <= 7) return '7';
  return null;
}

export function daysUntil(isoDate: string, now = Date.now()): number {
  const d = new Date(isoDate + (isoDate.length <= 10 ? 'T23:59:59' : '')).getTime();
  return Math.ceil((d - now) / 86_400_000);
}

/** สร้างแจ้งเตือนใกล้ deadline ให้ section ที่ user เป็นเจ้าของและยังไม่ approved (idempotent · รวมข้อที่ due เดียวกันเป็น 1 แจ้งเตือน) */
export function syncDeadlineNotifications(user: AppUser, now = Date.now()): number {
  const sections = load<SarSection>(KEYS.sections).filter(
    s => s.ownerUserId === user.id && s.due && s.status !== 'approved');
  const groups = new Map<string, { cycleId: string; due: string; b: 'overdue' | '1' | '3' | '7'; reqs: string[] }>();
  for (const s of sections) {
    const b = deadlineBucket(daysUntil(s.due!, now));
    if (!b) continue;
    const key = `${s.cycleId}:${s.due}:${b}`;
    const g = groups.get(key) ?? { cycleId: s.cycleId, due: s.due!, b, reqs: [] };
    g.reqs.push(s.requirementId);
    groups.set(key, g);
  }
  let added = 0;
  groups.forEach((g, key) => {
    const list = g.reqs.join(', ');
    const msg = g.b === 'overdue' ? `ข้อ ${list} เลยกำหนดส่งแล้ว (${g.due})`
      : `ข้อ ${list} ใกล้ถึงกำหนดส่ง (${g.due}) — เหลือไม่เกิน ${g.b} วัน`;
    const many = g.reqs.length > 1;
    const en = g.b === 'overdue' ? `${requirementsEn(g.reqs)} ${many ? 'are' : 'is'} past due (${g.due})`
      : `${requirementsEn(g.reqs)} ${many ? 'are' : 'is'} due soon (${g.due}) — ${g.b} ${g.b === '1' ? 'day' : 'days'} or less left`;
    if (notify({
      userId: user.id, kind: 'deadline', messageTh: msg, messageEn: en, target: sectionsTarget(g.cycleId, g.reqs),
      cycleId: g.cycleId, requirementId: g.reqs[0], dedupeKey: `deadline:${key}`,
    })) added++;
  });
  return added;
}

export function listNotifications(user: AppUser, opts: { unreadOnly?: boolean } = {}): AppNotification[] {
  syncDeadlineNotifications(user);
  return load<AppNotification>(KEYS.notifications)
    .filter(n => n.userId === user.id && (!opts.unreadOnly || !n.readAt))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** จำนวนที่ยังไม่อ่าน — sync deadline ก่อนนับ ให้ตรงกับ listNotifications (ADR-UI-001 B3) */
export function unreadCount(user: AppUser): number {
  syncDeadlineNotifications(user);
  return load<AppNotification>(KEYS.notifications).filter(n => n.userId === user.id && !n.readAt).length;
}

export function markRead(user: AppUser, id?: string): void {
  // R2-B2 (C8): บัญชีไม่ active → ไม่เขียน (no-op เงียบ ไม่ throw เพื่อไม่ให้ UI แจ้งเตือนพังก่อนถูกพาไป /login)
  if (!isActorActive(user)) return;
  const rows = load<AppNotification>(KEYS.notifications);
  const now = Date.now();
  let changed = false;
  rows.forEach(n => {
    if (n.userId === user.id && !n.readAt && (!id || n.id === id)) { n.readAt = now; changed = true; }
  });
  if (changed) save(KEYS.notifications, rows);
}
