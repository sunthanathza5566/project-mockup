/**
 * internal — ไม่ export ผ่าน facade `@/lib/api` (ไม่มี actor/ไม่ตรวจสิทธิ์: backend-dev RULE 1, security S-05)
 * ผู้เรียกต้องตรวจสิทธิ์ก่อนเสมอ: deleteUser (auth.api), reissueInvitation / cancelInvitation (onboarding.store)
 */
import type { Invitation } from '../types';
import { KEYS, load, save } from './db';

/** ยกเลิกคำเชิญที่ยังใช้ได้ทั้งหมดของผู้ใช้ · คืนจำนวนที่ยกเลิก */
export function revokeInvitationsOf(userId: string, now: number = Date.now()): number {
  const rows = load<Invitation>(KEYS.invitations);
  let n = 0;
  const next = rows.map(i => {
    if (i.userId !== userId || i.usedAt || i.revokedAt) return i;
    n++;
    return { ...i, revokedAt: now };
  });
  if (n) save(KEYS.invitations, next);
  return n;
}
