/**
 * TASK-0002 เฟส 6 — R2-B5 (S-09 / กฎ B7 · I-04 · ข้อความ username)
 * (1) helper เขียน/อ่านข้อมูลดิบที่ไม่มี guard 14 ชื่อ ไม่อยู่ใน export ของ `@/lib/api` (facade)
 *     แต่ยังมีในโมดูลจริง (กันพิมพ์ชื่อผิดจนเทสต์ผ่านเปล่า ๆ)
 * (2) P34: probe ชื่อที่ใช้ปลดล็อกรอบ final_approved ผ่าน facade = [] · ตัวที่ UI ใช้ยังอยู่ครบ
 * (3) ROLE_SCOPE_TYPES ถูก freeze ทั้งตัวนอกและ array ทุกตัว (เขียนทับ/push = TypeError, ค่าไม่เปลี่ยน)
 * (4) username ผิดรูป → message = USERNAME_INVALID_MESSAGE (ตรงคำใบ้ UI) ทั้ง createUser / inviteUser / submitAccessRequest
 * ข้อมูลทดสอบเป็นข้อมูลสมมติ
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as api from '@/lib/api';
import * as db from '@/lib/api/db';
import * as auth from '@/lib/api/auth.api';
import * as workflow from '@/lib/api/workflow';
import * as noti from '@/lib/api/notification.store';
import * as audit from '@/lib/api/audit.store';
import type { RoleAssignment } from '@/lib/types';
import { PROG, freshSeededDemo, user } from './helpers';

const DOMAIN = 'sample-uni.example';
const PW = 'secret-pass-8';
const STAFF: RoleAssignment[] = [{ role: 'programme_staff', scopeType: 'programme', scopeId: PROG }];
const HINT = 'ตัวอักษรอังกฤษ ตัวเลข หรือ . _ - ยาว 3–32 ตัว'; // คำใบ้ใต้ช่องชื่อผู้ใช้ (NewUserForm / RequestAccessForm)

/** ชื่อ → โมดูลจริงที่ต้องยังมีอยู่ */
const HIDDEN: Record<string, Record<string, unknown>> = {
  save: db, load: db, clearAllAunqa: db,
  getUsers: auth, saveUsers: auth,
  getCycleRaw: workflow, saveCycle: workflow, addReviewEvent: workflow,
  getSnapshots: workflow, buildSnapshotObject: workflow, computeSnapshotHash: workflow,
  notify: noti,
  appendAudit: audit, appendAuditThrottled: audit,
};

async function err(fn: () => unknown): Promise<{ code: string; message: string }> {
  try { await fn(); return { code: 'ok', message: '' }; } catch (e: any) { return { code: e?.code, message: e?.message }; }
}

beforeEach(async () => { await freshSeededDemo(); api.logoutUser(); });

describe('R2-B5 S-09 facade ไม่ export helper ที่ไม่มี guard', () => {
  it('รายการครบ 14 ชื่อ', () => {
    expect(Object.keys(HIDDEN)).toHaveLength(14);
  });

  for (const [name, mod] of Object.entries(HIDDEN)) {
    it(`${name}: ไม่อยู่ใน @/lib/api · ยังเป็นฟังก์ชันในโมดูลจริง`, () => {
      expect(name in api, `${name} หลุดออก facade`).toBe(false);
      expect((api as Record<string, unknown>)[name]).toBeUndefined();
      expect(typeof mod[name], `${name} ไม่มีในโมดูล (พิมพ์ชื่อผิด?)`).toBe('function');
    });
  }

  it('P34 probe: ชื่อที่ใช้ปลดล็อกรอบผ่าน facade = []', () => {
    const probe = ['saveCycle', 'addReviewEvent', 'getCycleRaw', 'getSnapshots', 'buildSnapshotObject', 'computeSnapshotHash', 'save', 'load']
      .filter(k => k in api);
    expect(probe).toEqual([]);
  });

  it('negative control: ตัวที่มี guard / UI ใช้ ยังอยู่ใน facade', () => {
    for (const k of ['KEYS', 'AunqaError', 'USERNAME_RE', 'USERNAME_INVALID_MESSAGE', 'ROLE_SCOPE_TYPES', 'createUser', 'setUserRoles',
      'listUsers', 'transitionCycle', 'transitionSection', 'listReviewEvents', 'verifySnapshot', 'isSectionEditable',
      'listNotifications', 'markRead', 'unreadCount', 'listAudit', 'auditToCsv', 'SYSTEM_ACTOR_ID', 'resetDemo', 'loginUser']) {
      expect(k in api, k).toBe(true);
    }
  });
});

describe('R2-B5 I-04 ROLE_SCOPE_TYPES frozen', () => {
  it('ตัวนอก + array ทุกบทบาท isFrozen · ตัวเดียวกับใน facade', () => {
    const t = auth.ROLE_SCOPE_TYPES;
    expect(api.ROLE_SCOPE_TYPES).toBe(t);
    expect(Object.isFrozen(t)).toBe(true);
    const roles = Object.keys(t);
    expect(roles.length).toBe(8);
    for (const r of roles) expect(Object.isFrozen((t as Record<string, unknown>)[r]), r).toBe(true);
  });

  it('push / เขียนทับ / เพิ่ม key / ลบ key = TypeError และค่าไม่เปลี่ยน (ESM = strict mode)', () => {
    const t = auth.ROLE_SCOPE_TYPES as unknown as Record<string, string[]>;
    const before = JSON.stringify(t);
    const role = Object.keys(t)[0];
    expect(() => t[role].push('university')).toThrow(TypeError);
    expect(() => { t[role][0] = 'cycle'; }).toThrow(TypeError);
    expect(() => { t[role] = ['university', 'faculty', 'programme', 'cycle']; }).toThrow(TypeError);
    expect(() => { t.hacker = ['university']; }).toThrow(TypeError);
    expect(() => { delete t[role]; }).toThrow(TypeError);
    expect(JSON.stringify(t)).toBe(before);
    // validate ยังใช้ตารางเดิม: programme_staff@university ยังผิดคู่
    expect(api.isRoleScopeCompatible('programme_staff', 'university')).toBe(false);
  });
});

describe('R2-B5 ข้อความ username = USERNAME_INVALID_MESSAGE', () => {
  it('ค่าคงที่ตรงคำใบ้ UI และ USERNAME_RE รับตัวพิมพ์ใหญ่ (ไม่ใช่ a-z อย่างเดียว)', () => {
    expect(api.USERNAME_INVALID_MESSAGE).toBe(`ชื่อผู้ใช้ต้องเป็น${HINT}`);
    expect(api.USERNAME_RE.test('Somchai.K')).toBe(true);
  });

  const BAD = ['ab', 'มีไทย', 'has space', 'x'.repeat(33), 'bad@char'];

  it('createUser: username ผิด 5 แบบ → invalid + ข้อความใหม่ · ไม่มีผู้ใช้เพิ่ม', async () => {
    const n = api.listUsers('uni-demo').length;
    for (const [i, u] of BAD.entries()) {
      const r = await err(() => api.createUser(user('uadmin'), { username: u, password: PW, email: `cu${i}@${DOMAIN}`, fullName: 'ทดสอบ สมมติ', roles: STAFF }));
      expect(r, u).toEqual({ code: 'invalid', message: api.USERNAME_INVALID_MESSAGE });
    }
    expect(api.listUsers('uni-demo').length).toBe(n);
    // control: ตัวพิมพ์ใหญ่ผ่าน
    expect((await err(() => api.createUser(user('uadmin'), { username: 'Upper.Case', password: PW, email: `upper@${DOMAIN}`, fullName: 'ทดสอบ สมมติ', roles: STAFF }))).code).toBe('ok');
  });

  it('inviteUser: username ผิด → invalid + ข้อความใหม่', async () => {
    for (const [i, u] of BAD.entries()) {
      const r = await err(() => api.inviteUser(user('uadmin'), { username: u, email: `iu${i}@${DOMAIN}`, fullName: 'ทดสอบ สมมติ', roles: STAFF }));
      expect(r, u).toEqual({ code: 'invalid', message: api.USERNAME_INVALID_MESSAGE });
    }
  });

  it('submitAccessRequest: username ผิด → invalid + ข้อความใหม่', async () => {
    for (const [i, u] of BAD.entries()) {
      const r = await err(() => api.submitAccessRequest({
        fullName: 'สมมติ ขอใช้', email: `ra${i}@${DOMAIN}`, username: u, password: PW, reason: 'ทดสอบ', consent: true,
      } as api.AccessRequestInput));
      expect(r, u).toEqual({ code: 'invalid', message: api.USERNAME_INVALID_MESSAGE });
    }
  });

  it('ไม่มีที่ใดใช้ข้อความเก่า "a-z, 0-9"', async () => {
    const r = await err(() => api.createUser(user('uadmin'), { username: '!!', password: PW, email: `old@${DOMAIN}`, fullName: 'ทดสอบ', roles: STAFF }));
    expect(r.message).not.toContain('a-z');
  });
});
