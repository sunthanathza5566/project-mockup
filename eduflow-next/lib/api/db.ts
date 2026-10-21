/**
 * Storage helpers ของ AUN-QA — ทุก key ขึ้นต้น `aunqa_`
 * TODO(PostgreSQL): แต่ละ key = 1 ตาราง (ดู comment ใน lib/types.ts) · ย้ายเป็น query + RLS
 */
import { readJSON, writeJSON } from './storage-cache';

export const KEYS = {
  seeded: 'aunqa_seeded_v1',
  users: 'aunqa_users',
  universities: 'aunqa_universities',
  faculties: 'aunqa_faculties',
  programmes: 'aunqa_programmes',
  cycles: 'aunqa_cycles',
  sections: 'aunqa_sections',
  versions: 'aunqa_section_versions',
  ratings: 'aunqa_ratings',
  comments: 'aunqa_comments',
  reviewEvents: 'aunqa_review_events',
  snapshots: 'aunqa_snapshots',
  evidence: 'aunqa_evidence',
  links: 'aunqa_evidence_links',
  files: 'aunqa_files',
  metrics: 'aunqa_metrics',
  notifications: 'aunqa_notifications',
  audit: 'aunqa_audit',
  aiRuns: 'aunqa_ai_runs',
  session: 'aunqa_session',
  attempts: 'aunqa_attempts',
} as const;

export function load<T>(key: string): T[] { return readJSON<T[]>(key, []); }
export function save<T>(key: string, rows: T[]): void { writeJSON(key, rows); }

/** ล้างข้อมูล aunqa_* ทั้งหมด (ใช้กับ resetDemo เท่านั้น) */
export function clearAllAunqa(): void {
  if (typeof window === 'undefined') return;
  const del: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('aunqa_')) del.push(k);
  }
  del.forEach(k => localStorage.removeItem(k));
  sessionStorage.removeItem(KEYS.session);
}

/** Error ของ domain — message เป็นภาษาไทยให้แสดงผู้ใช้ได้, ไม่มีรายละเอียดภายใน */
export type AunqaErrorCode =
  | 'forbidden' | 'locked' | 'invalid' | 'not_found' | 'duplicate' | 'bad_transition' | 'citation_invalid' | 'ai_disabled';
export class AunqaError extends Error {
  code: AunqaErrorCode;
  detail?: Record<string, unknown>;
  constructor(code: AunqaErrorCode, message: string, detail?: Record<string, unknown>) {
    super(message); this.name = 'AunqaError'; this.code = code; this.detail = detail;
  }
}
