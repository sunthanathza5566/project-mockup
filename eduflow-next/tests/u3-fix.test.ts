/**
 * U3 fix — TASK-0001 (qa-tester หลัง fix)
 * U3P-2 saveSection(actor, cycleId, reqId, input, reason = 'autosave', opts?: { baseUpdatedAt?: number })
 *   - base เก่ากว่า section.updatedAt → AunqaError 'conflict' + detail.current = ฉบับล่าสุด · ไม่เขียนอะไร (section / version / audit)
 *   - base เท่ากับหรือใหม่กว่า → บันทึกได้ · ไม่ส่ง opts / ส่ง {} / baseUpdatedAt undefined = พฤติกรรมเดิม (เขียนทับ)
 *   - base ไม่ใช่ตัวเลข finite → 'invalid' · ลำดับการตรวจ: forbidden / locked มาก่อน conflict
 * UX-U3-1 เหตุผลที่ส่งกลับอ่านได้จาก listReviewEvents (กรองตาม section + changes_requested ตัวล่าสุด)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as api from '@/lib/api';
import { AunqaError, KEYS, load } from '@/lib/api/db';
import type { AuditLog, SarSection, SarSectionVersion } from '@/lib/types';
import { CYCLE, driveToLocked, freshSeededDemo, user } from './helpers';

const sid = (rid: string) => `${CYCLE}::${rid}`;
const raw = (rid: string) => load<SarSection>(KEYS.sections).find(s => s.id === sid(rid))!;
const versionsOf = (rid: string) => load<SarSectionVersion>(KEYS.versions).filter(v => v.sectionId === sid(rid));
const audits = () => load<AuditLog>(KEYS.audit);

function catchErr(fn: () => unknown): AunqaError {
  try { fn(); } catch (e) { if (e instanceof AunqaError) return e; throw e; }
  throw new Error('expected AunqaError');
}

afterEach(() => { vi.restoreAllMocks(); });

describe('U3P-2 saveSection conflict (baseUpdatedAt)', () => {
  const R = '3.6'; // seed: drafting ยังไม่มีเจ้าของ → ประธาน (chair1) แก้ได้
  let t = 1_900_000_000_000;
  const at = (ms: number) => vi.spyOn(Date, 'now').mockReturnValue(ms);

  beforeEach(async () => { await freshSeededDemo(); t = 1_900_000_000_000; });

  it('base เก่ากว่า → conflict + detail.current = ฉบับล่าสุด และไม่เขียน section/version/audit', () => {
    const chair = user('chair1');
    at(t);
    const a = api.saveSection(chair, CYCLE, R, { narrativeTh: 'ฉบับแท็บ A ตอนเปิด' }, 'manual');
    const base = a.updatedAt;
    at(t + 5_000);
    const b = api.saveSection(chair, CYCLE, R, { narrativeTh: 'ฉบับแท็บ B' }, 'manual', { baseUpdatedAt: base });
    expect(b.updatedAt).toBe(t + 5_000);

    const before = { sec: JSON.stringify(raw(R)), ver: versionsOf(R).length, aud: audits().length };
    at(t + 9_000);
    const e = catchErr(() => api.saveSection(chair, CYCLE, R, { narrativeTh: 'ฉบับแท็บ A ที่จะทับ' }, 'autosave', { baseUpdatedAt: base }));
    expect(e.code).toBe('conflict');
    const cur = e.detail?.current as SarSection;
    expect(cur.id).toBe(sid(R));
    expect(cur.narrativeTh).toBe('ฉบับแท็บ B');
    expect(cur.updatedAt).toBe(t + 5_000);
    // ไม่มีอะไรถูกเขียน
    expect(JSON.stringify(raw(R))).toBe(before.sec);
    expect(versionsOf(R)).toHaveLength(before.ver);
    expect(audits()).toHaveLength(before.aud);
    // detail.current เป็นสำเนา (แก้แล้วไม่กระทบที่เก็บ)
    cur.narrativeTh = 'mutated';
    expect(raw(R).narrativeTh).toBe('ฉบับแท็บ B');
  });

  it('manual / submit-like reason ก็เจอ conflict เหมือนกัน (ไม่ขึ้นกับ reason)', () => {
    const chair = user('chair1');
    at(t); const base = api.saveSection(chair, CYCLE, R, { narrativeTh: 'x1' }, 'manual').updatedAt; // เก็บเป็นค่า primitive: ตัวที่คืนเป็น reference ของ cache (ถูกแก้ตามการบันทึกครั้งถัดไป)
    at(t + 1); api.saveSection(chair, CYCLE, R, { narrativeTh: 'x2' }, 'manual');
    at(t + 2);
    expect(catchErr(() => api.saveSection(chair, CYCLE, R, { narrativeTh: 'x3' }, 'manual', { baseUpdatedAt: base })).code).toBe('conflict');
    // เปลี่ยนแค่ pdca ก็ถือว่า conflict (ตรวจก่อนเทียบว่าเปลี่ยนอะไร)
    expect(catchErr(() => api.saveSection(chair, CYCLE, R, { pdca: { plan: true, do: false, check: false, act: false } }, 'autosave', { baseUpdatedAt: base })).code).toBe('conflict');
    expect(raw(R).narrativeTh).toBe('x2');
  });

  it('base เท่ากับ updatedAt ปัจจุบัน → บันทึกได้ และใช้ updatedAt ที่ได้เป็น base ต่อได้ (บันทึกต่อเนื่องในแท็บเดียว)', () => {
    const chair = user('chair1');
    at(t); const b1 = api.saveSection(chair, CYCLE, R, { narrativeTh: 'ครั้งที่ 1' }, 'manual').updatedAt;
    at(t + 2_000); const b = api.saveSection(chair, CYCLE, R, { narrativeTh: 'ครั้งที่ 2' }, 'autosave', { baseUpdatedAt: b1 });
    expect(b.narrativeTh).toBe('ครั้งที่ 2');
    const b2 = b.updatedAt;
    at(t + 4_000); const c = api.saveSection(chair, CYCLE, R, { narrativeTh: 'ครั้งที่ 3' }, 'autosave', { baseUpdatedAt: b2 });
    expect(c.narrativeTh).toBe('ครั้งที่ 3');
    expect(raw(R).updatedAt).toBe(t + 4_000);
  });

  it('base ใหม่กว่า updatedAt (นาฬิกาเดินหน้า) → บันทึกได้ ไม่ใช่ conflict', () => {
    const chair = user('chair1');
    at(t); api.saveSection(chair, CYCLE, R, { narrativeTh: 'เดิม' }, 'manual');
    at(t + 1_000);
    const s = api.saveSection(chair, CYCLE, R, { narrativeTh: 'ใหม่' }, 'manual', { baseUpdatedAt: t + 500_000 });
    expect(s.narrativeTh).toBe('ใหม่');
  });

  it('ไม่ส่ง opts / ส่ง {} / baseUpdatedAt: undefined = พฤติกรรมเดิม (เขียนทับฉบับใหม่กว่าได้)', () => {
    const chair = user('chair1');
    at(t); api.saveSection(chair, CYCLE, R, { narrativeTh: 'v1' }, 'manual');
    at(t + 10); api.saveSection(chair, CYCLE, R, { narrativeTh: 'v2' }, 'manual');
    at(t + 20); expect(api.saveSection(chair, CYCLE, R, { narrativeTh: 'v3' }).narrativeTh).toBe('v3');
    at(t + 30); expect(api.saveSection(chair, CYCLE, R, { narrativeTh: 'v4' }, 'autosave', {}).narrativeTh).toBe('v4');
    at(t + 40); expect(api.saveSection(chair, CYCLE, R, { narrativeTh: 'v5' }, 'manual', { baseUpdatedAt: undefined }).narrativeTh).toBe('v5');
    expect(raw(R).narrativeTh).toBe('v5');
  });

  it('baseUpdatedAt ไม่ใช่ตัวเลข finite (NaN / Infinity / string) → invalid และไม่เขียน', () => {
    const chair = user('chair1');
    at(t); api.saveSection(chair, CYCLE, R, { narrativeTh: 'คงเดิม' }, 'manual');
    for (const bad of [NaN, Infinity, -Infinity, '123' as unknown as number]) {
      const e = catchErr(() => api.saveSection(chair, CYCLE, R, { narrativeTh: 'ห้ามเขียน' }, 'manual', { baseUpdatedAt: bad }));
      expect(e.code, String(bad)).toBe('invalid');
    }
    expect(raw(R).narrativeTh).toBe('คงเดิม');
  });

  it('สิทธิ์มาก่อน conflict: assessor (ไม่มีสิทธิ์เขียน) + base เก่า → forbidden ไม่ใช่ conflict (ไม่รั่ว detail.current)', () => {
    const chair = user('chair1');
    at(t); const base = api.saveSection(chair, CYCLE, R, { narrativeTh: 'a' }, 'manual').updatedAt;
    at(t + 1); api.saveSection(chair, CYCLE, R, { narrativeTh: 'b' }, 'manual');
    for (const u of ['assess1', 'dean1']) {
      const e = catchErr(() => api.saveSection(user(u), CYCLE, R, { narrativeTh: 'c' }, 'manual', { baseUpdatedAt: base }));
      expect(e.code, u).toBe('forbidden');
      expect(e.detail?.current, u).toBeUndefined();
    }
  });

  it('ข้อที่ส่งตรวจแล้ว (ready_for_review) + base เก่า → locked ไม่ใช่ conflict', () => {
    const chair = user('chair1');
    const rfr = api.listSections(chair, CYCLE).find(s => s.status === 'ready_for_review')!;
    expect(rfr).toBeTruthy();
    const e = catchErr(() => api.saveSection(chair, CYCLE, rfr.requirementId, { narrativeTh: 'x' }, 'manual', { baseUpdatedAt: 0 }));
    expect(e.code).toBe('locked');
  });

  it('รอบที่ล็อกแล้ว + base เก่า → locked ไม่ใช่ conflict', async () => {
    await driveToLocked();
    const e = catchErr(() => api.saveSection(user('chair1'), CYCLE, '1.1', { narrativeTh: 'x' }, 'manual', { baseUpdatedAt: 0 }));
    expect(e.code).toBe('locked');
  });

  it('ไม่พบข้อ → not_found (ก่อน conflict)', () => {
    expect(catchErr(() => api.saveSection(user('chair1'), CYCLE, '99.9', { narrativeTh: 'x' }, 'manual', { baseUpdatedAt: 0 })).code).toBe('not_found');
  });

  it('เปลี่ยนเจ้าของจากที่อื่น (assignSections ขยับ updatedAt) → base เดิม conflict และ detail.current มีเจ้าของใหม่', () => {
    const chair = user('chair1'); const staff = user('staff1');
    at(t); const base = api.saveSection(chair, CYCLE, R, { narrativeTh: 'ก่อนมอบหมาย' }, 'manual').updatedAt;
    at(t + 3_000); api.assignSections(chair, CYCLE, [R], staff.id);
    expect(raw(R).updatedAt).toBe(t + 3_000);
    at(t + 6_000);
    const e = catchErr(() => api.saveSection(chair, CYCLE, R, { narrativeTh: 'หลังมอบหมาย' }, 'manual', { baseUpdatedAt: base }));
    expect(e.code).toBe('conflict');
    expect((e.detail?.current as SarSection).ownerUserId).toBe(staff.id);
    expect(raw(R).narrativeTh).toBe('ก่อนมอบหมาย');
  });
});

describe('UX-U3-1 เหตุผลที่ส่งกลับ (listReviewEvents)', () => {
  beforeEach(async () => { await freshSeededDemo(); });

  it('ส่งกลับ 2 ครั้ง → ตัวล่าสุดของ section นั้นคือเหตุผลล่าสุด และผู้ที่อ่านรอบได้ (staff1) เห็นด้วย', () => {
    const chair = user('chair1'); const staff = user('staff1');
    const rid = '1.5'; // seed: ready_for_review เจ้าของ staff1
    expect(raw(rid).status).toBe('ready_for_review');
    expect(raw(rid).ownerUserId).toBe(staff.id);
    const owner = staff;
    api.returnSection(chair, CYCLE, rid, 'เหตุผลครั้งที่ 1');
    api.submitSection(owner, CYCLE, rid);
    api.returnSection(chair, CYCLE, rid, 'เหตุผลครั้งที่ 2');
    expect(raw(rid).status).toBe('changes_requested');

    for (const u of [chair, owner]) {
      const evs = api.listReviewEvents(u, CYCLE)
        .filter(e => e.targetType === 'section' && e.targetId === sid(rid) && e.toStatus === 'changes_requested');
      expect(evs.map(e => e.note)).toEqual(['เหตุผลครั้งที่ 1', 'เหตุผลครั้งที่ 2']);
      expect(evs[evs.length - 1].actorId).toBe(chair.id);
    }
  });
});

