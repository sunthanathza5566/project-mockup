/**
 * Phase U (ADR-UI-001 6.2 B1–B4 + U2-B รอบ 2) — TASK-0001 U2-Q
 * - B1 session localStorage: idle/absolute, touchSession throttle/force, sessionTimeLeft, sessionExpiryKind, ข้ามแท็บ (subscribeSession)
 * - P7 username ไม่แยกตัวพิมพ์ + lockout สลับตัวพิมพ์ + createUser duplicate
 * - B2 listMyTodos ทุก kind (รวม start_cycle / close_cycle / assess_cycle 8/8) + อ่านอย่างเดียว + สิทธิ์
 * - B3 ผู้รับแจ้งเตือนแต่ละขั้น + unreadCount sync deadline
 * - B4 preflight + เทสต์ไขว้ blockers ⇔ transitionCycle throw 'invalid'
 * - regression: submitSection ข้อ not_started ว่าง → ปฏิเสธโดยไม่เปลี่ยนสถานะ/ไม่มี review event/audit
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as api from '@/lib/api';
import { KEYS, load, save } from '@/lib/api/db';
import { saveUsers, getUsers } from '@/lib/api/auth.api';
import type { AppNotification, AppUser, AuditLog, ReviewEvent, SarSection, Session, TodoItem, TodoKind } from '@/lib/types';
import { CYCLE, PROG, driveToAssessment, driveToLocked, freshSeededDemo, user } from './helpers';

const PW = 'demo1234';
const H = 60 * 60 * 1000;
const rawSession = (): Session | null => { const r = localStorage.getItem(KEYS.session); return r ? JSON.parse(r) : null; };
const notesOf = (u: AppUser) => load<AppNotification>(KEYS.notifications).filter(n => n.userId === u.id);
const todosOf = (u: AppUser, kind?: TodoKind, opts?: { now?: number }) =>
  api.listMyTodos(u, opts).filter(t => !kind || t.kind === kind);
const sectionsRaw = () => load<SarSection>(KEYS.sections);
function patchSection(cycleId: string, rid: string, patch: Partial<SarSection>) {
  save(KEYS.sections, sectionsRaw().map(s => (s.id === `${cycleId}::${rid}` ? { ...s, ...patch } : s)));
}
/** ทุก key ของ localStorage (ใช้ตรวจว่าฟังก์ชันอ่านอย่างเดียว) */
function storageDump(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; out[k] = localStorage.getItem(k)!; }
  return out;
}
/** ทุกข้อในรอบเดโม่ → approved (ผ่าน API จริงเหมือน helpers.driveToLocked) */
function approveAllDemo() {
  const chair = user('chair1'); const staff = user('staff1');
  for (const s of api.listSections(chair, CYCLE)) {
    if (s.status === 'approved') continue;
    if (s.status === 'drafting' || s.status === 'not_started') {
      api.assignSections(chair, CYCLE, [s.requirementId], staff.id);
      if (s.status === 'not_started') api.saveSection(staff, CYCLE, s.requirementId, { narrativeTh: 'เนื้อหาทดสอบสำหรับส่งตรวจ' }, 'manual');
      api.submitSection(staff, CYCLE, s.requirementId);
    }
    api.approveSection(chair, CYCLE, s.requirementId);
  }
}
async function rateAll(assessor: AppUser) {
  for (const c of api.listCriteria()) api.setCriterionRating(assessor, CYCLE, c.no, 5, 'เหตุผลทดสอบ');
}

afterEach(() => { vi.restoreAllMocks(); });

// ════════════════════════════ B1 session ════════════════════════════
describe('B1 session (localStorage + หมดอายุ)', () => {
  beforeEach(async () => { await freshSeededDemo(); api.logoutUser(); sessionStorage.clear(); });

  it('login เก็บใน localStorage พร้อม lastActiveAt/expiresAt = loginAt + 12 ชม. (ไม่ใช้ sessionStorage)', async () => {
    const t0 = 1_900_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(t0);
    const r = await api.loginUser('chair1', PW);
    expect(r.success).toBe(true);
    const s = rawSession()!;
    expect(s).toMatchObject({ userId: 'u-chair', loginAt: t0, lastActiveAt: t0, expiresAt: t0 + api.SESSION_ABSOLUTE_MS });
    expect(sessionStorage.getItem(KEYS.session)).toBeNull();
    expect(api.SESSION_IDLE_MS).toBe(4 * H);
    expect(api.SESSION_ABSOLUTE_MS).toBe(12 * H);
  });

  it('key เดิมใน sessionStorage ถูกลบทิ้ง ไม่ถูกย้าย (ต้องล็อกอินใหม่)', () => {
    sessionStorage.setItem(KEYS.session, JSON.stringify({ userId: 'u-chair', loginAt: 1 }));
    expect(api.getSession()).toBeNull();
    expect(sessionStorage.getItem(KEYS.session)).toBeNull();
    expect(localStorage.getItem(KEYS.session)).toBeNull();
  });

  it('touchSession: ≤60s ไม่เขียน · >60s เขียน · force เขียนทันที · ไม่ขยาย expiresAt · ไม่มี session = no-op', async () => {
    const t0 = 1_900_000_000_000;
    const now = vi.spyOn(Date, 'now').mockReturnValue(t0);
    await api.loginUser('chair1', PW);
    const exp = rawSession()!.expiresAt;
    api.touchSession(t0 + 60_000);
    expect(rawSession()!.lastActiveAt).toBe(t0);
    api.touchSession(t0 + 60_001);
    expect(rawSession()!.lastActiveAt).toBe(t0 + 60_001);
    api.touchSession(t0 + 60_002, { force: true });
    expect(rawSession()!.lastActiveAt).toBe(t0 + 60_002);
    expect(rawSession()!.expiresAt).toBe(exp);
    now.mockReturnValue(t0 + 10_000);
    api.logoutUser();
    api.touchSession(t0 + 99 * 60_000, { force: true });
    expect(localStorage.getItem(KEYS.session)).toBeNull();
  });

  it('idle: ไม่ใช้งานเกิน 4 ชม. → getSession null + ล้าง key · พอดี 4 ชม. ยังอยู่', async () => {
    const t0 = 1_900_000_000_000;
    const now = vi.spyOn(Date, 'now').mockReturnValue(t0);
    await api.loginUser('chair1', PW);
    now.mockReturnValue(t0 + 4 * H);
    expect(api.getSession()?.userId).toBe('u-chair');
    now.mockReturnValue(t0 + 4 * H + 1);
    expect(api.getSession()).toBeNull();
    expect(localStorage.getItem(KEYS.session)).toBeNull();
    expect(api.getCurrentUser()).toBeNull();
  });

  it('absolute: ใช้งานต่อเนื่องก็หมดที่ 12 ชม. (touch ไม่ต่ออายุ)', async () => {
    const t0 = 1_900_000_000_000;
    const now = vi.spyOn(Date, 'now').mockReturnValue(t0);
    await api.loginUser('chair1', PW);
    for (let h = 3; h <= 12; h += 3) { now.mockReturnValue(t0 + h * H); api.touchSession(undefined, { force: true }); }
    now.mockReturnValue(t0 + 12 * H);
    expect(api.getSession()).not.toBeNull();
    now.mockReturnValue(t0 + 12 * H + 1);
    expect(api.getSession()).toBeNull();
  });

  it('sessionTimeLeft = min(expiresAt, lastActive+IDLE) − now · sessionExpiryKind idle/absolute (เท่ากัน = absolute)', async () => {
    const t0 = 1_900_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(t0);
    await api.loginUser('chair1', PW);
    expect(api.sessionTimeLeft(t0 + H)).toBe(3 * H);
    expect(api.sessionExpiryKind(t0 + H)).toBe('idle');
    // ใช้งานต่อเนื่องทุก 3 ชม. จนล่าสุดที่ 9 ชม. → idle หมด 13 ชม. แต่ absolute 12 ชม. มาก่อน
    for (const h of [3, 6, 9]) api.touchSession(t0 + h * H, { force: true });
    expect(api.sessionTimeLeft(t0 + 10 * H)).toBe(2 * H);
    expect(api.sessionExpiryKind(t0 + 10 * H)).toBe('absolute');
    // lastActive 8 ชม. → idle = 12 ชม. = absolute พอดี → 'absolute'
    localStorage.setItem(KEYS.session, JSON.stringify({ ...rawSession()!, lastActiveAt: t0 + 8 * H }));
    expect(api.sessionExpiryKind(t0 + 8 * H + 1)).toBe('absolute');
    expect(api.sessionTimeLeft(t0 + 8 * H + 1)).toBe(4 * H - 1);
  });

  it('sessionTimeLeft/ExpiryKind: ไม่มี session หรือหมดแล้ว = null (และล้าง key) ไม่คืนค่าติดลบ', async () => {
    expect(api.sessionTimeLeft()).toBeNull();
    expect(api.sessionExpiryKind()).toBeNull();
    const t0 = 1_900_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(t0);
    await api.loginUser('chair1', PW);
    expect(api.sessionTimeLeft(t0 + 5 * H)).toBeNull();
    expect(localStorage.getItem(KEYS.session)).toBeNull();
    expect(api.sessionExpiryKind(t0 + 5 * H)).toBeNull();
  });

  it('AC-19: lastActiveAt ย้อน 3 ชม. 56 นาที → เหลือ 4 นาที (idle) → touch force → กลับเป็น 4 ชม.', async () => {
    const t0 = 1_900_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(t0);
    await api.loginUser('chair1', PW);
    const s = rawSession()!;
    localStorage.setItem(KEYS.session, JSON.stringify({ ...s, lastActiveAt: t0 - (3 * H + 56 * 60_000) }));
    expect(api.sessionTimeLeft(t0)).toBe(4 * 60_000);
    expect(api.sessionExpiryKind(t0)).toBe('idle');
    api.touchSession(t0, { force: true });
    expect(api.sessionTimeLeft(t0)).toBe(4 * H);
  });

  it('session รูปแบบเสีย / ไม่มี expiresAt → ถือว่าหมดอายุ + ล้าง key', () => {
    localStorage.setItem(KEYS.session, '{not json');
    expect(api.getSession()).toBeNull();
    expect(localStorage.getItem(KEYS.session)).toBeNull();
    localStorage.setItem(KEYS.session, JSON.stringify({ userId: 'u-chair', loginAt: Date.now(), lastActiveAt: Date.now() }));
    expect(api.getSession()).toBeNull();
    expect(localStorage.getItem(KEYS.session)).toBeNull();
  });

  it('getCurrentUser นับเป็นการใช้งาน (touch แบบ throttle 60s)', async () => {
    const t0 = 1_900_000_000_000;
    const now = vi.spyOn(Date, 'now').mockReturnValue(t0);
    await api.loginUser('chair1', PW);
    now.mockReturnValue(t0 + 30_000);
    expect(api.getCurrentUser()?.username).toBe('chair1');
    expect(rawSession()!.lastActiveAt).toBe(t0);
    now.mockReturnValue(t0 + 2 * 60_000);
    api.getCurrentUser();
    expect(rawSession()!.lastActiveAt).toBe(t0 + 2 * 60_000);
  });

  it('logoutUser ล้างทั้ง localStorage และ sessionStorage + audit auth.logout', async () => {
    await api.loginUser('chair1', PW);
    sessionStorage.setItem(KEYS.session, 'stale');
    api.logoutUser();
    expect(localStorage.getItem(KEYS.session)).toBeNull();
    expect(sessionStorage.getItem(KEYS.session)).toBeNull();
    expect(load<AuditLog>(KEYS.audit).some(a => a.action === 'auth.logout' && a.actorId === 'u-chair')).toBe(true);
  });

  describe('ข้ามแท็บ (subscribeSession)', () => {
    const g = globalThis as any;
    let et: EventTarget;
    beforeEach(() => {
      et = new EventTarget();
      g.addEventListener = et.addEventListener.bind(et);
      g.removeEventListener = et.removeEventListener.bind(et);
    });
    afterEach(() => { delete g.addEventListener; delete g.removeEventListener; });
    /** จำลอง 'storage' event ที่แท็บอื่นยิง (Node ไม่มี StorageEvent) */
    const fire = (key: string | null) => et.dispatchEvent(Object.assign(new Event('storage'), { key }));

    it('แท็บอื่น logout → cb(null) · แท็บอื่น touch → cb(session) · key อื่นไม่ยิง · unsubscribe แล้วหยุด', async () => {
      await api.loginUser('chair1', PW);
      const cb = vi.fn();
      const off = api.subscribeSession(cb);
      fire(KEYS.users);
      expect(cb).not.toHaveBeenCalled();
      fire(KEYS.session);                               // touch จากแท็บอื่น
      expect(cb).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 'u-chair' }));
      localStorage.removeItem(KEYS.session);            // แท็บอื่นออกจากระบบ
      fire(KEYS.session);
      expect(cb).toHaveBeenLastCalledWith(null);
      expect(cb).toHaveBeenCalledTimes(2);
      off();
      fire(KEYS.session);
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it('แท็บอื่นล็อกอินเป็นคนอื่น → cb ได้ session ใหม่ (user คนใหม่)', async () => {
      await api.loginUser('chair1', PW);
      const cb = vi.fn();
      api.subscribeSession(cb);
      await api.loginUser('staff1', PW);
      fire(KEYS.session);
      expect(cb).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 'u-staff1' }));
    });

    it('SSR (ไม่มี addEventListener) → no-op คืน unsubscribe ได้', () => {
      delete g.addEventListener;
      const off = api.subscribeSession(() => {});
      expect(typeof off).toBe('function');
      expect(() => off()).not.toThrow();
    });
  });
});

// ════════════════════════════ P7 username ════════════════════════════
describe('P7 username ไม่แยกตัวพิมพ์ + lockout', () => {
  beforeEach(async () => { await freshSeededDemo(); api.logoutUser(); localStorage.removeItem(KEYS.attempts); });

  it('login ด้วย CHAIR1 / "  Chair1 " ได้ session ของ chair1', async () => {
    expect((await api.loginUser('CHAIR1', PW)).user?.id).toBe('u-chair');
    expect((await api.loginUser('  Chair1 ', PW)).user?.id).toBe('u-chair');
    expect(api.getSession()?.username).toBe('chair1');
  });

  it('รหัสผ่านยังแยกตัวพิมพ์', async () => {
    const r = await api.loginUser('chair1', 'DEMO1234');
    expect(r).toMatchObject({ success: false, error: 'invalid', remaining: 4 });
  });

  it('ผิด 5 ครั้งโดยสลับตัวพิมพ์ → ล็อกทุกรูปแบบ แม้รหัสถูก (เลี่ยง lockout ไม่ได้)', async () => {
    const forms = ['chair1', 'CHAIR1', 'Chair1', 'cHaIr1'];
    for (let i = 0; i < 4; i++) {
      const r = await api.loginUser(forms[i], 'wrong');
      expect(r.error).toBe('invalid');
      expect(r.remaining).toBe(4 - i);
    }
    expect(api.remainingAttempts('CHAIR1')).toBe(1);
    const r5 = await api.loginUser('CHair1', 'wrong');
    expect(r5.error).toBe('locked');
    for (const f of forms) {
      expect(api.getLockUntil(f)).toBeGreaterThan(Date.now());
      expect((await api.loginUser(f, PW)).error).toBe('locked');
    }
    expect(api.getSession()).toBeNull();
  });

  it('login สำเร็จล้างตัวนับของทุกรูปแบบตัวพิมพ์', async () => {
    await api.loginUser('CHAIR1', 'wrong');
    await api.loginUser('chair1', 'wrong');
    expect(api.remainingAttempts('Chair1')).toBe(3);
    await api.loginUser('Chair1', PW);
    expect(api.remainingAttempts('chair1')).toBe(5);
  });

  it('createUser: "Chair1" = duplicate · username ใหม่เก็บตามที่พิมพ์ และล็อกอินแบบตัวเล็กได้', async () => {
    const admin = user('uadmin');
    const base = { password: 'secret12', fullName: 'ผู้ใช้ทดสอบ สมมติ', roles: [] };
    await expect(api.createUser(admin, { ...base, username: 'Chair1', email: 'x1@example.test' }))
      .rejects.toMatchObject({ code: 'duplicate', message: 'Username นี้ถูกใช้แล้ว' });
    const u = await api.createUser(admin, { ...base, username: 'NewUser.Q', email: 'x2@example.test' });
    expect(u.username).toBe('NewUser.Q');
    await expect(api.createUser(admin, { ...base, username: 'newuser.q', email: 'x3@example.test' }))
      .rejects.toMatchObject({ code: 'duplicate' });
    expect((await api.loginUser('newuser.q', 'secret12')).user?.id).toBe(u.id);
  });
});

// ════════════════════════════ B2 todos ════════════════════════════
describe('B2 listMyTodos — ทุก kind', () => {
  beforeEach(async () => { await freshSeededDemo(); });

  it('รูปแบบ id / ฟิลด์ว่างไม่อยู่ใน object / count ≥1 / เรียง urgent → daysLeft → ลำดับ kind', () => {
    const order: TodoKind[] = ['fix_section', 'write_section', 'translation_review', 'review_sections', 'revise_cycle', 'start_cycle',
      'assign_sections', 'submit_cycle', 'faculty_review', 'final_approve', 'start_assessment', 'assess_cycle', 'close_cycle', 'resolve_pii', 'verify_actions'];
    for (const name of ['chair1', 'staff1', 'lect1', 'fqa1', 'dean1', 'uadmin', 'assess1', 'data1']) {
      const items = api.listMyTodos(user(name));
      for (const t of items) {
        expect(t.id).toBe(`${t.kind}:${t.cycleId ?? t.programmeId}:${t.requirementIds?.[0] ?? ''}`);
        expect(t.count).toBeGreaterThanOrEqual(1);
        for (const [k, v] of Object.entries(t)) expect(v, `${name} ${t.id}.${k}`).not.toBeUndefined();
        expect(t.titleTh).not.toMatch(/ผศ\.|อ\.วิภา|ดร\./); // ไม่มีชื่อบุคคลอื่น
      }
      for (let i = 1; i < items.length; i++) {
        const a = items[i - 1], b = items[i];
        const key = (t: TodoItem) => [Number(!t.urgent), t.daysLeft ?? Infinity, order.indexOf(t.kind)];
        const [ka, kb] = [key(a), key(b)];
        const cmp = ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
        expect(cmp, `${name}: ${a.id} ก่อน ${b.id}`).toBeLessThanOrEqual(0);
      }
    }
  });

  it('อ่านอย่างเดียว: ไม่เขียน localStorage (notifications/audit/sections ฯลฯ) ทุก role', () => {
    const before = storageDump();
    for (const name of ['chair1', 'staff1', 'fqa1', 'dean1', 'uadmin', 'assess1', 'sadmin', 'uadmin2']) api.listMyTodos(user(name));
    expect(storageDump()).toEqual(before);
  });

  it('review_sections (chair1, seed): นับเฉพาะข้อ ready_for_review ที่คนอื่นเขียน + detailTh ข้อที่เขียนเอง', () => {
    const chair = user('chair1');
    const ready = sectionsRaw().filter(s => s.cycleId === CYCLE && s.status === 'ready_for_review');
    expect(ready.length).toBeGreaterThan(1);
    const t = todosOf(chair, 'review_sections')[0];
    expect(t).toMatchObject({ count: ready.length, urgent: false, cycleId: CYCLE, academicYear: 2569, titleTh: `ตรวจและอนุมัติ ${ready.length} ข้อที่ส่งมา (รอบ 2569)` });
    expect(t.detailTh).toBeUndefined();
    patchSection(CYCLE, ready[0].requirementId, { lastAuthorId: chair.id });
    const t2 = todosOf(chair, 'review_sections')[0];
    expect(t2.count).toBe(ready.length - 1);
    expect(t2.requirementIds).not.toContain(ready[0].requirementId);
    expect(t2.detailTh).toBe('อีก 1 ข้อคุณเขียนเอง ต้องให้ผู้อื่นอนุมัติ');
    // ไม่มีสิทธิ์อนุมัติ → ไม่เห็น
    for (const n of ['staff1', 'fqa1', 'dean1', 'assess1', 'uadmin']) expect(todosOf(user(n), 'review_sections')).toEqual([]);
  });

  it('assign_sections (chair1, seed) = ข้อไม่มีเจ้าของและยังไม่ approved (= 7 ในเดโม่)', () => {
    const exp = sectionsRaw().filter(s => s.cycleId === CYCLE && !s.ownerUserId && s.status !== 'approved');
    const t = todosOf(user('chair1'), 'assign_sections')[0];
    expect(exp.length).toBe(7);
    expect(t).toMatchObject({ count: 7, titleTh: 'มอบหมายผู้เขียน 7 ข้อที่ยังไม่มีเจ้าของ (รอบ 2569)' });
    expect(t.requirementIds).toEqual(exp.map(s => s.requirementId).sort(api.compareReqId));
    expect(todosOf(user('staff1'), 'assign_sections')).toEqual([]);
  });

  it('write_section: เฉพาะเจ้าของ · ข้อความวันครบกำหนด + urgent ≤3 วัน (เลย/วันนี้/เหลือ)', () => {
    const chair = user('chair1'); const staff = user('staff1');
    const c = api.createCycle(chair, { programmeId: PROG, academicYear: 2575 });
    api.assignSections(chair, c.id, ['2.1'], staff.id);
    patchSection(c.id, '2.1', { due: '2030-01-10' });
    const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
    const one = (now: number) => todosOf(staff, 'write_section', { now }).filter(t => t.cycleId === c.id);
    expect(one(at(2030, 1, 1))[0]).toMatchObject({ titleTh: 'เขียนข้อ 2.1 · เหลือ 10 วัน', urgent: false, due: '2030-01-10', daysLeft: 10, requirementIds: ['2.1'] });
    expect(one(at(2030, 1, 9))[0]).toMatchObject({ titleTh: 'เขียนข้อ 2.1 · เหลือ 2 วัน', urgent: true, daysLeft: 2 });
    expect(one(at(2030, 1, 6))[0]).toMatchObject({ titleTh: 'เขียนข้อ 2.1 · เหลือ 5 วัน', urgent: false });
    expect(one(at(2030, 1, 8))[0]).toMatchObject({ daysLeft: 3, urgent: true });
    const today = one(at(2030, 1, 11))[0];
    expect(today.titleTh).toBe('เขียนข้อ 2.1 · ครบกำหนดวันนี้');
    expect(today.urgent).toBe(true);
    expect(Math.abs(today.daysLeft!)).toBe(0);
    expect(one(at(2030, 1, 13))[0]).toMatchObject({ titleTh: 'เขียนข้อ 2.1 · เลยกำหนด 2 วัน', urgent: true, daysLeft: -2 });
    // ไม่มี due → ไม่มีส่วนต่อท้าย/ไม่มี due
    patchSection(c.id, '2.1', { due: undefined });
    const nd = one(at(2030, 1, 1))[0];
    expect(nd.titleTh).toBe('เขียนข้อ 2.1');
    expect('due' in nd).toBe(false);
    // คนอื่น (ไม่ใช่เจ้าของ) ไม่เห็น
    expect(todosOf(user('lect1'), 'write_section').filter(t => t.cycleId === c.id)).toEqual([]);
    expect(todosOf(chair, 'write_section').filter(t => t.cycleId === c.id)).toEqual([]);
  });

  it('fix_section: urgent + detailTh = note ล่าสุดตัด 120 ตัว · translation_review (ไทย/อังกฤษ/ไทยและอังกฤษ)', () => {
    const chair = user('chair1'); const staff = user('staff1');
    const rid = sectionsRaw().find(s => s.cycleId === CYCLE && s.status === 'ready_for_review')!.requirementId;
    api.assignSections(chair, CYCLE, [rid], staff.id);
    const longNote = 'ก'.repeat(130);
    api.returnSection(chair, CYCLE, rid, longNote);
    const f = todosOf(staff, 'fix_section').find(t => t.requirementIds?.[0] === rid)!;
    expect(f).toMatchObject({ urgent: true, titleTh: `แก้ไขข้อ ${rid} ตามที่ถูกส่งกลับ`, detailTh: 'ก'.repeat(120) });
    // urgent มาก่อนงานไม่เร่งด่วน
    expect(api.listMyTodos(staff)[0].urgent).toBe(true);

    patchSection(CYCLE, rid, { needsTranslationReview: { en: true } });
    expect(todosOf(staff, 'translation_review').find(t => t.requirementIds?.[0] === rid)?.titleTh).toBe(`ตรวจคำแปลข้อ ${rid} (อังกฤษ)`);
    patchSection(CYCLE, rid, { needsTranslationReview: { th: true } });
    expect(todosOf(staff, 'translation_review').find(t => t.requirementIds?.[0] === rid)?.titleTh).toBe(`ตรวจคำแปลข้อ ${rid} (ไทย)`);
    patchSection(CYCLE, rid, { needsTranslationReview: { th: true, en: true } });
    const tr = todosOf(staff, 'translation_review').find(t => t.requirementIds?.[0] === rid)!;
    expect(tr).toMatchObject({ urgent: false, titleTh: `ตรวจคำแปลข้อ ${rid} (ไทยและอังกฤษ)` });
    // ข้อที่ส่งตรวจแล้ว (แก้ไม่ได้) → ไม่มีงานตรวจคำแปล
    patchSection(CYCLE, rid, { status: 'ready_for_review' });
    expect(todosOf(staff, 'translation_review').find(t => t.requirementIds?.[0] === rid)).toBeUndefined();
  });

  it('start_cycle: รอบ draft ไม่มีเจ้าของ = ไม่ขึ้น · มอบหมาย 1 ข้อ = ขึ้นที่ผู้มี cycle.create (chair1, uadmin)', () => {
    const chair = user('chair1');
    const c = api.createCycle(chair, { programmeId: PROG, academicYear: 2576 });
    const sc = (n: string) => todosOf(user(n), 'start_cycle').filter(t => t.cycleId === c.id);
    expect(sc('chair1')).toEqual([]);
    api.assignSections(chair, c.id, ['1.1'], user('staff1').id);
    expect(sc('chair1')[0]).toMatchObject({ titleTh: 'เริ่มดำเนินการรอบ 2576 (มอบหมายแล้ว 1 ข้อ)', urgent: false, count: 1 });
    expect(sc('uadmin')).toHaveLength(1);
    for (const n of ['staff1', 'fqa1', 'dean1']) expect(sc(n)).toEqual([]);
    // เริ่มแล้ว → หาย
    return api.transitionCycle(chair, c.id, 'in_progress').then(() => expect(sc('chair1')).toEqual([]));
  });

  it('submit_cycle (ครบ 53 อนุมัติ) → faculty_review → final_approve → start_assessment → assess_cycle 0/8 → 8/8 → close_cycle', async () => {
    const chair = user('chair1'); const fqa = user('fqa1'); const dean = user('dean1'); const uadmin = user('uadmin'); const ass = user('assess1');
    expect(todosOf(chair, 'submit_cycle')).toEqual([]);
    approveAllDemo();
    const sub = todosOf(chair, 'submit_cycle')[0];
    expect(sub).toMatchObject({ titleTh: 'ส่งรอบ 2569 ให้ QA คณะตรวจ', urgent: false });
    expect(sub.due).toBeDefined();
    expect(todosOf(chair, 'assign_sections')).toEqual([]);
    // submissionDue ≤ 3 วัน → urgent
    expect(todosOf(chair, 'submit_cycle', { now: new Date(sub.due! + 'T09:00:00').getTime() })[0].urgent).toBe(true);

    await api.transitionCycle(chair, CYCLE, 'under_review');
    expect(todosOf(chair, 'submit_cycle')).toEqual([]);
    expect(todosOf(fqa, 'faculty_review')[0]).toMatchObject({ titleTh: 'ตรวจรอบ 2569 ระดับคณะ' });
    expect(todosOf(dean, 'faculty_review')).toEqual([]);

    await api.transitionCycle(fqa, CYCLE, 'faculty_approved');
    expect(todosOf(fqa, 'faculty_review')).toEqual([]);
    expect(todosOf(dean, 'final_approve')[0]).toMatchObject({ titleTh: 'พิจารณาอนุมัติสุดท้ายรอบ 2569' });

    await api.transitionCycle(dean, CYCLE, 'final_approved');
    for (const u of [fqa, uadmin]) {
      const t = todosOf(u, 'start_assessment')[0];
      expect(t).toMatchObject({ titleTh: 'เริ่มการประเมินรอบ 2569' });
      expect(t.detailTh).toBeUndefined(); // seed มี assess1 แล้ว
    }
    expect(todosOf(chair, 'start_assessment')).toEqual([]);
    expect(todosOf(ass, 'assess_cycle')).toEqual([]); // ยังไม่เปิดประเมิน

    await api.transitionCycle(fqa, CYCLE, 'under_assessment');
    let a = todosOf(ass, 'assess_cycle')[0];
    expect(a).toMatchObject({ titleTh: 'ประเมินรอบ 2569 (ให้คะแนนแล้ว 0/8)', urgent: false });
    api.setCriterionRating(ass, CYCLE, 1, 5, 'เหตุผล');
    expect(todosOf(ass, 'assess_cycle')[0].titleTh).toBe('ประเมินรอบ 2569 (ให้คะแนนแล้ว 1/8)');
    await rateAll(ass);
    a = todosOf(ass, 'assess_cycle')[0];
    expect(a).toMatchObject({ titleTh: 'เลือก verdict และส่งผลประเมินรอบ 2569', urgent: true });
    api.setVerdict(ass, CYCLE, 5, 'เหตุผลประกอบ');
    expect(todosOf(ass, 'assess_cycle')[0]).toMatchObject({ titleTh: 'ส่งผลประเมินรอบ 2569', urgent: true });
    // assessmentDate ≤ 3 วัน → urgent แม้ยังไม่ครบ (ตรวจด้วย now)
    expect(a.due).toBeDefined();

    await api.transitionCycle(ass, CYCLE, 'assessed');
    expect(todosOf(ass, 'assess_cycle')).toEqual([]);
    for (const u of [chair, uadmin, fqa]) {
      expect(todosOf(u, 'close_cycle')[0], u.username).toMatchObject({
        titleTh: 'ปิดรอบ 2569 หลังได้รับผลประเมิน', detailTh: 'ตรวจผลและสร้างแผนปรับปรุงจากข้อเสนอแนะ (AFI) ก่อนปิดรอบ', urgent: false,
      });
    }
    for (const n of ['staff1', 'dean1', 'assess1']) expect(todosOf(user(n), 'close_cycle')).toEqual([]);
    await api.transitionCycle(uadmin, CYCLE, 'closed');
    expect(todosOf(chair, 'close_cycle')).toEqual([]);
  });

  it('assess_cycle: assessmentDate ≤ 3 วัน → urgent แม้ให้คะแนนยังไม่ครบ', async () => {
    await driveToAssessment();
    const ass = user('assess1');
    const t = todosOf(ass, 'assess_cycle')[0];
    expect(t.urgent).toBe(false);
    const near = todosOf(ass, 'assess_cycle', { now: new Date(t.due! + 'T09:00:00').getTime() })[0];
    expect(near.urgent).toBe(true);
    expect(near.titleTh).toBe('ประเมินรอบ 2569 (ให้คะแนนแล้ว 0/8)');
  });

  it('start_assessment detailTh เมื่อยังไม่มีกรรมการ', async () => {
    await driveToLocked();
    saveUsers(getUsers().map(u => (u.id === 'u-assess' ? { ...u, roles: [] } : u)));
    expect(todosOf(user('fqa1'), 'start_assessment')[0].detailTh).toBe('ยังไม่ได้มอบหมายกรรมการประเมิน');
  });

  it('revise_cycle: QA คณะส่งกลับ → chair1 เห็น urgent + note', async () => {
    approveAllDemo();
    await api.transitionCycle(user('chair1'), CYCLE, 'under_review');
    await api.transitionCycle(user('fqa1'), CYCLE, 'revision_requested', 'เพิ่มหลักฐานเกณฑ์ 3');
    const t = todosOf(user('chair1'), 'revise_cycle')[0];
    expect(t).toMatchObject({ urgent: true, titleTh: 'รอบ 2569 ถูกส่งกลับแก้ไข', detailTh: 'เพิ่มหลักฐานเกณฑ์ 3' });
    expect(api.listMyTodos(user('chair1'))[0].kind).toBe('revise_cycle');
    expect(todosOf(user('staff1'), 'revise_cycle')).toEqual([]);
  });

  it('resolve_pii (ไม่ใช่ assessor-only) และหายเมื่อจัดการแล้ว · verify_actions = done ที่ไม่ใช่ของตัวเอง', () => {
    const chair = user('chair1');
    const pii = api.listEvidence(chair, { programmeId: PROG }).filter(e => e.containsPii && !e.piiResolved);
    expect(pii.length).toBeGreaterThanOrEqual(1);
    const t = todosOf(chair, 'resolve_pii')[0];
    expect(t).toMatchObject({ programmeId: PROG, count: pii.length, titleTh: `จัดการข้อมูลส่วนบุคคลในหลักฐาน ${pii.length} ชิ้น` });
    expect('cycleId' in t).toBe(false);
    expect(t.evidenceIds?.slice().sort()).toEqual(pii.map(e => e.id).sort());
    expect(todosOf(user('staff1'), 'resolve_pii')).toHaveLength(1);
    expect(todosOf(user('assess1'), 'resolve_pii')).toEqual([]);
    for (const e of pii) api.resolvePii(chair, e.id, 'ปกปิดเลขบัตรแล้ว');
    expect(todosOf(chair, 'resolve_pii')).toEqual([]);

    const v = todosOf(chair, 'verify_actions')[0];
    expect(v).toMatchObject({ titleTh: 'ตรวจรับแผนปรับปรุง 1 รายการ', count: 1, actionIds: ['act-5'] });
    expect(todosOf(user('fqa1'), 'verify_actions')[0]?.count).toBe(1);
    expect(todosOf(user('staff1'), 'verify_actions')).toEqual([]);
  });

  it('ข้ามมหาวิทยาลัย / super_admin: uadmin2 ไม่เห็นงานของมหาวิทยาลัยแรก', () => {
    expect(api.listMyTodos(user('uadmin2'))).toEqual([]);
  });
});

// ════════════════════════════ B3 notifications ════════════════════════════
describe('B3 ผู้รับแจ้งเตือนแต่ละขั้น', () => {
  beforeEach(async () => { await freshSeededDemo(); save(KEYS.notifications, []); });
  const code = () => api.getProgrammes().find(p => p.id === PROG)!.code;
  const msgs = (n: string) => notesOf(user(n)).map(x => x.messageTh);
  const clear = () => save(KEYS.notifications, []);

  it('under_review → QA คณะ ข้อความใหม่ · เจ้าของข้อได้ข้อความเดิม · actor/คณบดี/super_admin/ต่างมหาวิทยาลัยไม่ได้', async () => {
    approveAllDemo(); clear();
    await api.transitionCycle(user('chair1'), CYCLE, 'under_review');
    expect(code()).toBe('CS-B-69');
    expect(msgs('fqa1')).toEqual([`รอบประเมิน 2569 (CS-B-69) ส่งมาให้ QA คณะตรวจแล้ว — รอการพิจารณาของท่าน`]);
    expect(notesOf(user('fqa1'))[0]).toMatchObject({ kind: 'cycle_status', cycleId: CYCLE });
    expect(msgs('staff1')).toEqual(['รอบประเมิน 2569 ส่งให้ QA คณะตรวจ']);
    for (const n of ['chair1', 'dean1', 'sadmin', 'uadmin2', 'assess1']) expect(msgs(n), n).toEqual([]);
  });

  it('faculty_approved → คณบดี · final_approved → ผู้มี assessor.assign (uadmin, fqa1) + เจ้าของ/ประธานข้อความเดิม', async () => {
    approveAllDemo();
    await api.transitionCycle(user('chair1'), CYCLE, 'under_review');
    clear();
    await api.transitionCycle(user('fqa1'), CYCLE, 'faculty_approved');
    expect(msgs('dean1')).toEqual(['QA คณะอนุมัติรอบ 2569 (CS-B-69) แล้ว — รอคณบดีพิจารณาอนุมัติสุดท้าย']);
    expect(msgs('chair1')).toEqual(['QA คณะอนุมัติรอบ 2569 แล้ว รอคณบดี']);
    expect(msgs('fqa1')).toEqual([]);
    expect(msgs('uadmin')).toEqual([]);
    clear();
    await api.transitionCycle(user('dean1'), CYCLE, 'final_approved');
    const lockMsg = 'รอบ 2569 (CS-B-69) อนุมัติสุดท้ายและล็อกแล้ว — เริ่มการประเมินและมอบหมายกรรมการได้';
    expect(msgs('uadmin')).toEqual([lockMsg]);
    expect(msgs('fqa1')).toEqual([lockMsg]);
    expect(msgs('chair1')).toEqual(['คณบดีอนุมัติสุดท้ายและล็อกรอบ 2569 แล้ว']);
    expect(msgs('staff1')).toEqual(['คณบดีอนุมัติสุดท้ายและล็อกรอบ 2569 แล้ว']);
    for (const n of ['dean1', 'sadmin', 'uadmin2']) expect(msgs(n), n).toEqual([]);
  });

  it('under_assessment → กรรมการข้อความกรรมการ · เจ้าของ/ประธาน "เข้าสู่ขั้นการประเมิน…" · actor ไม่ได้', async () => {
    await driveToLocked(); clear();
    await api.transitionCycle(user('fqa1'), CYCLE, 'under_assessment');
    expect(msgs('assess1')).toEqual(['รอบ 2569 (CS-B-69) เปิดให้ประเมินแล้ว — เริ่มให้คะแนนได้ที่พื้นที่ทำงานกรรมการ']);
    expect(msgs('chair1')).toEqual(['รอบ 2569 เข้าสู่ขั้นการประเมินโดยกรรมการแล้ว']);
    expect(msgs('staff1')).toEqual(['รอบ 2569 เข้าสู่ขั้นการประเมินโดยกรรมการแล้ว']);
    for (const n of ['fqa1', 'dean1', 'uadmin', 'uadmin2']) expect(msgs(n), n).toEqual([]);
  });

  it('assessed → ประธาน + approve.faculty + cycle.close ได้คนละ 1 ข้อความ · กรรมการ (actor) ไม่ได้', async () => {
    await driveToAssessment();
    const ass = user('assess1');
    await rateAll(ass);
    api.setVerdict(ass, CYCLE, 5, 'เหตุผลประกอบ');
    clear();
    await api.transitionCycle(ass, CYCLE, 'assessed');
    const m = 'กรรมการส่งผลประเมินรอบ 2569 (CS-B-69) แล้ว — ดูผลได้ที่หน้าผลประเมิน';
    for (const n of ['chair1', 'fqa1', 'uadmin']) expect(msgs(n), n).toEqual([m]);
    for (const n of ['assess1', 'staff1', 'dean1', 'sadmin', 'uadmin2']) expect(msgs(n), n).toEqual([]);
  });

  it('unreadCount sync deadline ก่อนนับ = ตรงกับ listNotifications(unreadOnly) · markRead → 0', () => {
    const staff = user('staff1');
    const own = sectionsRaw().find(s => s.cycleId === CYCLE && s.ownerUserId === staff.id && s.status !== 'approved')
      ?? sectionsRaw().find(s => s.cycleId === CYCLE && s.status === 'drafting')!;
    const due = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    patchSection(CYCLE, own.requirementId, { ownerUserId: staff.id, due });
    expect(notesOf(staff)).toEqual([]);
    const n = api.unreadCount(staff);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(notesOf(staff).some(x => x.kind === 'deadline')).toBe(true);
    expect(api.listNotifications(staff, { unreadOnly: true })).toHaveLength(n);
    expect(api.unreadCount(staff)).toBe(n); // idempotent (dedupe)
    api.markRead(staff);
    expect(api.unreadCount(staff)).toBe(0);
  });
});

// ════════════════════════════ B4 preflight ════════════════════════════
describe('B4 getTransitionPreflight', () => {
  beforeEach(async () => { await freshSeededDemo(); });

  it('dean1 @ faculty_approved → final_approved: allowed, ไม่มี blocker, gapCounts ตรง getGaps, warning ครบ', async () => {
    approveAllDemo();
    await api.transitionCycle(user('chair1'), CYCLE, 'under_review');
    await api.transitionCycle(user('fqa1'), CYCLE, 'faculty_approved');
    const dean = user('dean1');
    const before = storageDump();
    const p = api.getTransitionPreflight(dean, CYCLE, 'final_approved');
    expect(storageDump()).toEqual(before); // ไม่เขียน store/audit
    const gaps = api.getGaps(dean, CYCLE);
    expect(p).toMatchObject({ to: 'final_approved', allowed: true, blockers: [], approvedCount: 53, totalSections: 53 });
    const crit = gaps.filter(g => g.severity === 'critical').length;
    const high = gaps.filter(g => g.severity === 'high').length;
    expect(p.gapCounts.critical).toBe(crit);
    expect(p.gapCounts.high).toBe(high);
    const w = Object.fromEntries(p.warnings.map(x => [x.code, x]));
    expect(w.critical_gaps).toMatchObject({ count: crit, messageTh: `ยังมีช่องว่างระดับวิกฤต ${crit} รายการ` });
    expect(w.high_gaps).toMatchObject({ count: high, messageTh: `ยังมีช่องว่างระดับสูง ${high} รายการ` });
    expect(w.pii_unresolved?.messageTh).toMatch(/^หลักฐานที่มีข้อมูลส่วนบุคคลยังไม่ได้จัดการ \d+ รายการ$/);
    for (const x of p.warnings) {
      expect(x.count).toBeGreaterThan(0);
      expect(x.requirementIds).toEqual(Array.from(new Set(x.requirementIds)).sort(api.compareReqId));
    }
    // ผู้ไม่มีสิทธิ์อ่านได้ แต่ allowed=false
    expect(api.getTransitionPreflight(user('fqa1'), CYCLE, 'final_approved').allowed).toBe(false);
    // transition ที่ไม่มี rule
    expect(api.getTransitionPreflight(dean, CYCLE, 'closed').allowed).toBe(false);
  });

  it('สิทธิ์: ต่างมหาวิทยาลัย = forbidden · รอบไม่มีอยู่ = not_found', () => {
    expect(() => api.getTransitionPreflight(user('uadmin2'), CYCLE, 'under_review')).toThrow(expect.objectContaining({ code: 'forbidden' }));
    expect(() => api.getTransitionPreflight(user('chair1'), 'cycle-nope', 'under_review')).toThrow(expect.objectContaining({ code: 'not_found' }));
  });

  it('under_assessment: no_assessor (count 1, requirementIds []) เมื่อยังไม่มีกรรมการ · ไม่มี gap warnings', async () => {
    await driveToLocked();
    expect(api.getTransitionPreflight(user('fqa1'), CYCLE, 'under_assessment').warnings).toEqual([]);
    saveUsers(getUsers().map(u => (u.id === 'u-assess' ? { ...u, roles: [] } : u)));
    expect(api.getTransitionPreflight(user('fqa1'), CYCLE, 'under_assessment').warnings)
      .toEqual([{ code: 'no_assessor', count: 1, messageTh: 'ยังไม่ได้มอบหมายกรรมการประเมิน', requirementIds: [] }]);
  });

  /** เทสต์ไขว้ (backend-dev แนะนำ): blockers.length>0 ⇔ transitionCycle throw 'invalid' และข้อความ blocker อยู่ใน error */
  async function cross(actor: AppUser, to: Parameters<typeof api.transitionCycle>[2], note?: string) {
    const p = api.getTransitionPreflight(actor, CYCLE, to);
    expect(p.allowed).toBe(true);
    let err: any = null;
    try { await api.transitionCycle(actor, CYCLE, to, note); } catch (e) { err = e; }
    if (p.blockers.length) {
      expect(err?.code, `blockers=${JSON.stringify(p.blockers)}`).toBe('invalid');
      for (const b of p.blockers) expect(err.message).toContain(b);
    } else {
      expect(err, `ไม่มี blocker แต่ throw ${err?.message}`).toBeNull();
    }
    return p;
  }

  it('ไขว้: in_progress → under_review (มีข้อยังไม่อนุมัติ → throw / ครบ → ผ่าน)', async () => {
    const chair = user('chair1');
    const open = sectionsRaw().filter(s => s.cycleId === CYCLE && s.status !== 'approved').length;
    const p1 = await cross(chair, 'under_review');
    expect(p1.blockers).toEqual([`ยังมี ${open} ข้อที่ไม่ผ่านการอนุมัติ`]);
    expect(api.getCycle(chair, CYCLE).status).toBe('in_progress');
    approveAllDemo();
    const p2 = await cross(chair, 'under_review');
    expect(p2.blockers).toEqual([]);
    expect(api.getCycle(chair, CYCLE).status).toBe('under_review');
  });

  it('ไขว้: under_review → faculty_approved หลัง QA คณะส่งกลับรายข้อ 1 ข้อ', async () => {
    approveAllDemo();
    await api.transitionCycle(user('chair1'), CYCLE, 'under_review');
    const fqa = user('fqa1');
    api.returnSection(fqa, CYCLE, '1.1', 'ขอหลักฐานเพิ่ม');
    const p = await cross(fqa, 'faculty_approved');
    expect(p.blockers).toEqual(['ยังมี 1 ข้อที่ไม่ผ่านการอนุมัติ']);
  });

  it('ไขว้: under_assessment → assessed (ไม่ครบ+ไม่มี verdict / ครบไม่มี verdict / ครบ+verdict)', async () => {
    await driveToAssessment();
    const ass = user('assess1');
    const p1 = await cross(ass, 'assessed');
    expect(p1.blockers).toHaveLength(2);
    expect(p1.blockers[0]).toMatch(/^ยังรอกรรมการให้คะแนนรายเกณฑ์ให้ครบ: .+\(ขาด 8 เกณฑ์\)$/);
    expect(p1.blockers[1]).toBe('ยังไม่มีกรรมการเลือก verdict');
    await rateAll(ass);
    const p2 = await cross(ass, 'assessed');
    expect(p2.blockers).toEqual(['ยังไม่มีกรรมการเลือก verdict']);
    api.setVerdict(ass, CYCLE, 5, 'เหตุผลประกอบ');
    const p3 = await cross(ass, 'assessed');
    expect(p3.blockers).toEqual([]);
    expect(api.getCycle(ass, CYCLE).status).toBe('assessed');
  });

  it('ไขว้: transition ที่ไม่มีเงื่อนไขบล็อก (draft→in_progress, final_approved→under_assessment) ผ่านเสมอเมื่อ blockers ว่าง', async () => {
    const chair = user('chair1');
    const c = api.createCycle(chair, { programmeId: PROG, academicYear: 2577 });
    const p = api.getTransitionPreflight(chair, c.id, 'in_progress');
    expect(p).toMatchObject({ allowed: true, blockers: [], warnings: [] });
    await expect(api.transitionCycle(chair, c.id, 'in_progress')).resolves.toMatchObject({ status: 'in_progress' });
    await driveToLocked();
    await cross(user('fqa1'), 'under_assessment');
  });
});

// ════════════════════════════ regression U2-B รอบ 2 ════════════════════════════
describe('regression: submitSection ข้อ not_started ที่ว่าง', () => {
  beforeEach(async () => { await freshSeededDemo(); });

  it('ปฏิเสธ invalid โดยไม่เปลี่ยนสถานะ · ไม่มี review event · ไม่มี audit (ทั้งว่างและ whitespace)', () => {
    const chair = user('chair1'); const staff = user('staff1');
    const c = api.createCycle(chair, { programmeId: PROG, academicYear: 2578 });
    api.assignSections(chair, c.id, ['3.1', '3.2'], staff.id);
    patchSection(c.id, '3.2', { narrativeTh: '   \n\t', narrativeEn: '  ' });
    for (const rid of ['3.1', '3.2']) {
      const sid = `${c.id}::${rid}`;
      const auditBefore = load<AuditLog>(KEYS.audit).length;
      const revBefore = load<ReviewEvent>(KEYS.reviewEvents).length;
      expect(() => api.submitSection(staff, c.id, rid)).toThrow(expect.objectContaining({ code: 'invalid', message: 'ต้องมีเนื้อหา narrative ก่อนส่งตรวจ' }));
      expect(sectionsRaw().find(s => s.id === sid)!.status).toBe('not_started');
      expect(load<AuditLog>(KEYS.audit).length).toBe(auditBefore);
      expect(load<AuditLog>(KEYS.audit).some(a => a.targetId === sid && a.action.startsWith('section.drafting'))).toBe(false);
      expect(load<ReviewEvent>(KEYS.reviewEvents).length).toBe(revBefore);
    }
  });

  it('ลำดับ error เดิม: ไม่มีสิทธิ์ = forbidden (ไม่ใช่ invalid) · รอบล็อก = locked', async () => {
    const chair = user('chair1'); const staff = user('staff1');
    const c = api.createCycle(chair, { programmeId: PROG, academicYear: 2579 });
    api.assignSections(chair, c.id, ['4.1'], staff.id);
    expect(() => api.submitSection(user('lect1'), c.id, '4.1')).toThrow(expect.objectContaining({ code: 'forbidden' }));
    expect(() => api.submitSection(user('assess1'), c.id, '4.1')).toThrow(expect.objectContaining({ code: 'forbidden' }));
    expect(sectionsRaw().find(s => s.id === `${c.id}::4.1`)!.status).toBe('not_started');
    // รอบเดโม่ที่ล็อก: ข้อ not_started ไม่มีแล้ว → จำลองด้วยการตั้งสถานะใน store
    await driveToLocked();
    patchSection(CYCLE, '1.1', { status: 'not_started', narrativeTh: '', narrativeEn: '' });
    expect(() => api.submitSection(user('chair1'), CYCLE, '1.1')).toThrow(expect.objectContaining({ code: 'locked' }));
  });

  it('ข้อ not_started ที่มีเนื้อหา ยังส่งตรวจได้ 2 ขั้น (not_started → drafting → ready_for_review)', () => {
    const chair = user('chair1'); const staff = user('staff1');
    const c = api.createCycle(chair, { programmeId: PROG, academicYear: 2580 });
    api.assignSections(chair, c.id, ['5.1'], staff.id);
    patchSection(c.id, '5.1', { narrativeTh: 'มีเนื้อหาแล้ว' });
    expect(api.submitSection(staff, c.id, '5.1').status).toBe('ready_for_review');
    const ev = load<ReviewEvent>(KEYS.reviewEvents).filter(e => e.targetId === `${c.id}::5.1`).map(e => e.toStatus);
    expect(ev).toEqual(['drafting', 'ready_for_review']);
  });
});
