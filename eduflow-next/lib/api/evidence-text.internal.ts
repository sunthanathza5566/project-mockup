/**
 * INTERNAL — ไม่ export ผ่าน facade `@/lib/api` (index.ts ไม่มี export * จากไฟล์นี้)
 * ข้อความที่ extract จากไฟล์หลักฐานแบบ "ไม่ตรวจสิทธิ์": ผู้เรียก (ai.service) ต้องตรวจสิทธิ์เองก่อน
 * และส่งเข้า AI หลัง redact เท่านั้น · ฝั่ง UI ใช้ getExtractedText(user, id, cycleId) ที่ผ่าน guard
 */
import type { Evidence, EvidenceFile } from '../types';
import { KEYS, load } from './db';

export function extractedTextOf(evidenceId: string): string {
  const e = load<Evidence>(KEYS.evidence).find(x => x.id === evidenceId);
  if (!e) return '';
  return load<EvidenceFile>(KEYS.files).find(f => f.id === e.currentFileId)?.extractedText ?? '';
}
