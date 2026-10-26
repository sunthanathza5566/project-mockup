/**
 * แจ้งเตือน — ฝั่งแสดงผล (friendly-spec §F3, ADR-AUTH-001 A6) · pure function ทั้งไฟล์ (เทสต์ด้วย vitest ได้)
 * - `notificationHref` แปลงปลายทางเชิงความหมาย (`n.target`) เป็น path ภายในแอปเท่านั้น (ไม่มี href จาก data → กัน open redirect)
 * - `notificationText` ข้อความตามภาษาของหน้า: EN = `messageEn` → fallback `NOTI_KIND_EN[kind]`
 * - `relativeTime` / `groupByDay` ใช้วันที่ท้องถิ่นของเครื่อง · ข้อความสร้างที่นี่ทั้งสองภาษา (ไม่ผ่าน dict — กล่องรายการเป็น data-no-i18n)
 */
import type { AppNotification, NotificationKind } from '@/lib/types';
import type { Lang } from '@/lib/i18n/dict';
import { fmtDateTime, sectionHref } from './aunqa';

/** ข้อความอังกฤษสำรองตามชนิด (แถวเก่าที่ไม่มี messageEn) — friendly-spec §F12 */
export const NOTI_KIND_EN: Record<NotificationKind, string> = {
  assigned: 'You have a new assignment',
  comment: 'New comment',
  changes_requested: 'Returned for changes',
  approved: 'Approved',
  cycle_status: 'Cycle status updated',
  deadline: 'Deadline reminder',
  access_request: 'New access request',
  account: 'Account update',
};

const enc = encodeURIComponent;

/** ปลายทางของแจ้งเตือน (friendly-spec §F3.3) — คืน path ภายใน `/app…` เสมอ */
export function notificationHref(n: Pick<AppNotification, 'target' | 'cycleId' | 'requirementId'>): string {
  const t = n.target;
  if (t) {
    switch (t.type) {
      case 'section': return sectionHref(t.cycleId, t.requirementId) + (t.panel === 'comments' ? '#comments' : '');
      case 'my_work': return '/app#mywork';
      case 'cycle':   return `/app/cycles/${enc(t.cycleId)}`;
      case 'assess':  return `/app/cycles/${enc(t.cycleId)}/assess`;
      case 'action':  return `/app/actions#action-${enc(t.actionId)}`;
      case 'admin':   return `/app/admin?tab=${t.tab === 'requests' ? 'requests' : 'users'}`;
      case 'home':    return '/app';
    }
  }
  // แถวเก่า (ก่อน R2-B1) ไม่มี target
  if (n.cycleId && n.requirementId) return sectionHref(n.cycleId, n.requirementId);
  if (n.cycleId) return `/app/cycles/${enc(n.cycleId)}`;
  return '/app';
}

/**
 * ปลายทางเป็นหน้าเดิมแต่ต่างแค่ hash? — คืน hash (`#…`) ถ้า path+query ของ `href` ตรงกับหน้าปัจจุบันและมี hash, ไม่งั้น null
 * ใช้แก้ Next 14: `<Link>` ไปหน้าเดิมแค่เปลี่ยน hash จะไม่ยิง `hashchange` (R2-F8)
 */
export function samePageHash(href: string, current: { pathname: string; search: string }): string | null {
  const i = href.indexOf('#');
  if (i < 0) return null;
  const hash = href.slice(i);
  if (hash.length < 2) return null;
  return href.slice(0, i) === current.pathname + current.search ? hash : null;
}

/** ข้อความแจ้งเตือนตามภาษา (friendly-spec §F3.1) */
export function notificationText(n: Pick<AppNotification, 'kind' | 'messageTh' | 'messageEn'>, lang: Lang): string {
  if (lang === 'en') return n.messageEn || NOTI_KIND_EN[n.kind] || n.messageTh;
  return n.messageTh;
}

/** เวลาเที่ยงคืนของวันท้องถิ่นที่มี ts */
function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 0 = วันนี้ · 1 = เมื่อวาน · 2 = ก่อนหน้านี้ (อนาคตนับเป็นวันนี้) */
function dayBucket(ts: number, now: number): 0 | 1 | 2 {
  const today = startOfDay(now);
  if (ts >= today) return 0;
  // ย้อน 1 วันด้วย setDate (กันวันที่ยาวไม่เท่า 24 ชม. ช่วงปรับเวลา)
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  return ts >= y.getTime() ? 1 : 2;
}

function hhmm(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * เวลาแบบสัมพัทธ์ (friendly-spec §F3.1): < 1 นาที "เมื่อสักครู่" · < 60 นาที "{n} นาทีที่แล้ว" ·
 * วันนี้ "วันนี้ HH:MM" · เมื่อวาน "เมื่อวาน HH:MM" · เก่ากว่า = fmtDateTime (th) / วันที่แบบอังกฤษ (en)
 */
export function relativeTime(ts: number, now: number = Date.now(), lang: Lang = 'th'): string {
  const diff = now - ts;
  const en = lang === 'en';
  if (diff < 60_000) return en ? 'Just now' : 'เมื่อสักครู่';
  if (diff < 60 * 60_000) {
    const m = Math.floor(diff / 60_000);
    return en ? `${m} min ago` : `${m} นาทีที่แล้ว`;
  }
  const b = dayBucket(ts, now);
  if (b === 0) return en ? `Today ${hhmm(ts)}` : `วันนี้ ${hhmm(ts)}`;
  if (b === 1) return en ? `Yesterday ${hhmm(ts)}` : `เมื่อวาน ${hhmm(ts)}`;
  return en
    ? new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : fmtDateTime(ts);
}

export type DayGroupKey = 'today' | 'yesterday' | 'earlier';
export interface DayGroup<T> { key: DayGroupKey; labelTh: string; labelEn: string; items: T[] }

const GROUP_META: { key: DayGroupKey; labelTh: string; labelEn: string }[] = [
  { key: 'today', labelTh: 'วันนี้', labelEn: 'Today' },
  { key: 'yesterday', labelTh: 'เมื่อวาน', labelEn: 'Yesterday' },
  { key: 'earlier', labelTh: 'ก่อนหน้านี้', labelEn: 'Earlier' },
];

/** แบ่งกลุ่ม วันนี้ / เมื่อวาน / ก่อนหน้านี้ ตามวันที่ท้องถิ่น — คงลำดับเดิมในกลุ่ม · คืนเฉพาะกลุ่มที่มีรายการ (≤3 กลุ่ม) */
export function groupByDay<T extends { createdAt: number }>(items: T[], now: number = Date.now()): DayGroup<T>[] {
  const buckets: T[][] = [[], [], []];
  for (const it of items) buckets[dayBucket(it.createdAt, now)].push(it);
  return GROUP_META.map((g, i) => ({ ...g, items: buckets[i] })).filter(g => g.items.length > 0);
}
