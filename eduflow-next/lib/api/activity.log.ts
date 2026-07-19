/**
 * Activity Log — บันทึกทุก action สำคัญของ แอดมิน/ครู เพื่อตรวจสอบย้อนหลัง
 * (bug / user error สามารถไล่ดูจาก log แล้วแก้เป็นจุด ๆ ได้)
 *
 * TODO(PostgreSQL): INSERT INTO activity_logs (actor, role, category, action, detail, created_at)
 */

import { getSession } from './auth.api';

const LOG_KEY = 'eduflow_activity_log';
const MAX_ENTRIES = 300;

export type LogCategory = 'admin' | 'teacher' | 'system';

export interface ActivityEntry {
  actor: string;       // username
  actorName: string;
  role: string;
  category: LogCategory;
  action: string;      // เช่น 'บันทึกคะแนน'
  detail: string;      // เช่น 'สถิติ (ร23101) ห้อง ม.3/1'
  timestamp: string;   // th-TH locale
  at: number;
}

function isBrowser() { return typeof window !== 'undefined'; }

export function getActivityLog(): ActivityEntry[] {
  if (!isBrowser()) return [];
  return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
}

export function logActivity(category: LogCategory, action: string, detail = ''): void {
  if (!isBrowser()) return;
  const s = getSession();
  const entries = getActivityLog();
  entries.unshift({
    actor: s?.username || 'unknown', actorName: s?.name || '—', role: s?.role || '—',
    category, action, detail,
    timestamp: new Date().toLocaleString('th-TH'), at: Date.now(),
  });
  localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

/** log แบบกันถี่ — action เดิม key เดิมภายใน 60 วิ จะบันทึกครั้งเดียว (ใช้กับการพิมพ์คะแนน real-time) */
const lastLogged: Record<string, number> = {};
export function logActivityThrottled(category: LogCategory, action: string, detail = '', key = action): void {
  const now = Date.now();
  if (lastLogged[key] && now - lastLogged[key] < 60_000) return;
  lastLogged[key] = now;
  logActivity(category, action, detail);
}
