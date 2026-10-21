/**
 * Notifications (M16) — in-app เท่านั้น (อีเมลจริง = Phase B)
 * deadline 7/3/1 วัน "คำนวณตอนโหลด" (syncDeadlineNotifications) แล้ว dedupe ด้วย dedupeKey
 * TODO(PostgreSQL): table notifications(id,user_id,kind,payload jsonb,read_at)
 */
import type { AppNotification, AppUser, NotificationKind, SarSection } from '../types';
import { newId } from '../utils/hash';
import { KEYS, load, save } from './db';
import { getUserById } from './org.store';

export interface NotifyInput {
  userId: string; kind: NotificationKind; messageTh: string;
  cycleId?: string; requirementId?: string; dedupeKey?: string;
}

/** internal — store อื่นเรียกใช้ (ไม่ผ่าน rbac เพราะเป็นผลข้างเคียงของ action ที่ตรวจสิทธิ์แล้ว) */
export function notify(input: NotifyInput): AppNotification | null {
  const target = getUserById(input.userId);
  if (!target) return null;
  const rows = load<AppNotification>(KEYS.notifications);
  if (input.dedupeKey && rows.some(n => n.userId === input.userId && n.dedupeKey === input.dedupeKey)) return null;
  const n: AppNotification = {
    id: newId('ntf'), universityId: target.universityId, userId: input.userId, kind: input.kind,
    cycleId: input.cycleId, requirementId: input.requirementId, messageTh: input.messageTh,
    dedupeKey: input.dedupeKey, createdAt: Date.now(),
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
    if (notify({ userId: user.id, kind: 'deadline', messageTh: msg, cycleId: g.cycleId, requirementId: g.reqs[0], dedupeKey: `deadline:${key}` })) added++;
  });
  return added;
}

export function listNotifications(user: AppUser, opts: { unreadOnly?: boolean } = {}): AppNotification[] {
  syncDeadlineNotifications(user);
  return load<AppNotification>(KEYS.notifications)
    .filter(n => n.userId === user.id && (!opts.unreadOnly || !n.readAt))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function unreadCount(user: AppUser): number {
  return load<AppNotification>(KEYS.notifications).filter(n => n.userId === user.id && !n.readAt).length;
}

export function markRead(user: AppUser, id?: string): void {
  const rows = load<AppNotification>(KEYS.notifications);
  const now = Date.now();
  let changed = false;
  rows.forEach(n => {
    if (n.userId === user.id && !n.readAt && (!id || n.id === id)) { n.readAt = now; changed = true; }
  });
  if (changed) save(KEYS.notifications, rows);
}
