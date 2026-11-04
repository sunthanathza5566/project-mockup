/**
 * TASK-0003 S6 — scenario seed (AC2) + ส่วนเสริม F4 + guard S-1 เป็นเทสต์ถาวร
 * (review #2 รอบ 1, security S-1, smoke ใน lib/mock-data/aunqa/scenarios/README.md)
 * โหลดทุกเคส ~5 วินาทีใน Node → timeout ต่อเทสต์ตั้งเอง
 */
import { describe, it, expect } from 'vitest';
import * as api from '@/lib/api';
import { KEYS, load } from '@/lib/api/db';
import {
  ALL_SCENARIOS_ID, listScenarios, loadScenarioPack, resetToStandardSeed,
} from '@/lib/mock-data/aunqa/scenarios';
import { withClockShift } from '@/lib/mock-data/aunqa/scenarios/helpers';
import { UNI2_CYCLE } from '@/lib/mock-data/aunqa/scenarios/tenant';
import { DS_SUSPENDED_CHAIR_CYCLE } from '@/lib/mock-data/aunqa/scenarios/users';
import {
  applyStandardSeedExtras, STANDARD_PLAY_OWNER_ID, STANDARD_PLAY_SECTION,
} from '@/lib/mock-data/aunqa/standard-extras';
import type { AppNotification, AppUser, SarSection } from '@/lib/types';
import { freshSeededDemo, user, CYCLE } from '@/tests/helpers';

const LONG = 300_000;
const FORBIDDEN_MSG = 'เฉพาะผู้ดูแลระบบสูงสุดเท่านั้นที่รีเซ็ตข้อมูลเดโม่ได้';

/** snapshot localStorage ทั้งก้อน (key เรียง) — ใช้พิสูจน์ "ไม่แตะข้อมูล" */
function snap(): string {
  const o: [string, string | null][] = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; o.push([k, localStorage.getItem(k)]); }
  return JSON.stringify(o.sort((a, b) => a[0].localeCompare(b[0])));
}
const notes = () => load<AppNotification>(KEYS.notifications);
const N3_RE = /ส่งตรวจแล้ว รอประธานอนุมัติ/;
function suspend(username: string): AppUser {
  const s = user(username);
  localStorage.setItem(KEYS.users, JSON.stringify(load<AppUser>(KEYS.users).map(u => (u.id === s.id ? { ...u, status: 'suspended' } : u))));
  return s;
}

describe('TASK-0003 S-1: loader/reset ต้องเป็น super_admin ที่ active และไม่แตะ storage เมื่อถูกปฏิเสธ', () => {
  it.each(['lect1', 'chair1', 'uadmin'])('%s → forbidden ทุกทาง (load id / load all / reset / id ผิด) และ storage ไม่เปลี่ยน', async (name) => {
    await freshSeededDemo();
    const before = snap();
    const a = user(name);
    await expect(loadScenarioPack(a, 'user-pending')).rejects.toMatchObject({ code: 'forbidden', message: FORBIDDEN_MSG });
    await expect(loadScenarioPack(a)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(loadScenarioPack(a, ALL_SCENARIOS_ID)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(loadScenarioPack(a, 'nope')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(resetToStandardSeed(a)).rejects.toMatchObject({ code: 'forbidden', message: FORBIDDEN_MSG });
    expect(snap()).toBe(before);
  }, LONG);

  it('actor = null / undefined → forbidden และ storage ไม่เปลี่ยน', async () => {
    await freshSeededDemo();
    const before = snap();
    await expect(loadScenarioPack(null as unknown as AppUser)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(loadScenarioPack(undefined as unknown as AppUser, 'deadlines')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(resetToStandardSeed(null as unknown as AppUser)).rejects.toMatchObject({ code: 'forbidden' });
    expect(snap()).toBe(before);
  });

  it('non-super บน storage ว่าง → forbidden และไม่เกิด seed เลย (localStorage.length = 0)', async () => {
    localStorage.clear();
    const lect = { id: 'u-x', username: 'x', roles: [{ role: 'lecturer', scopeType: 'programme', scopeId: 'p' }] } as unknown as AppUser;
    await expect(loadScenarioPack(lect, 'user-pending')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(resetToStandardSeed(lect)).rejects.toMatchObject({ code: 'forbidden' });
    expect(localStorage.length).toBe(0);
  });

  it('sadmin ที่ถูกระงับ → forbidden ทั้ง load และ reset, storage ไม่เปลี่ยน', async () => {
    await freshSeededDemo();
    const s = suspend('sadmin');
    const before = snap();
    await expect(loadScenarioPack(s, 'user-pending')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(loadScenarioPack(s)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(resetToStandardSeed(s)).rejects.toMatchObject({ code: 'forbidden' });
    expect(snap()).toBe(before);
  }, LONG);

  it('sadmin active + id ไม่รู้จัก → reject "ไม่รู้จัก scenario" และ storage ไม่เปลี่ยน', async () => {
    await freshSeededDemo();
    const before = snap();
    await expect(loadScenarioPack(user('sadmin'), 'nope')).rejects.toThrow(/ไม่รู้จัก scenario "nope"/);
    expect(snap()).toBe(before);
  });

  it('negative control: sadmin active โหลดได้ และ session ถูกล้าง', async () => {
    await freshSeededDemo();
    const before = snap();
    const r = await loadScenarioPack(user('sadmin'), 'user-pending');
    expect(r.loaded).toEqual(['user-pending']);
    expect(snap()).not.toBe(before);
    expect(api.getCurrentUser()).toBeNull();
  }, LONG);
});

describe('TASK-0003 AC2: โหลดทีละเคส / ทุกเคส', () => {
  it('registry: id ไม่ซ้ำ, ไม่ใช่ "all", มีบัญชีและผลที่คาดทุกเคส; listScenarios คืนสำเนา', () => {
    const list = listScenarios();
    expect(list.length).toBeGreaterThanOrEqual(27);
    const ids = list.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(ALL_SCENARIOS_ID);
    for (const s of list) {
      expect(s.titleTh.length).toBeGreaterThan(0);
      expect(s.accounts.length).toBeGreaterThan(0);
      expect(s.expectTh.length).toBeGreaterThan(0);
    }
    expect(ids[ids.length - 1]).toBe('bell-overflow'); // โหลดท้ายสุด (ให้อยู่บนสุดของกระดิ่ง)
    list[0].titleTh = 'แก้แล้ว';
    expect(listScenarios()[0].titleTh).not.toBe('แก้แล้ว');
  });

  it('โหลดทีละ id ครบทุกเคส ไม่ throw, loaded = [id], session ถูกล้าง', async () => {
    await freshSeededDemo();
    const sadmin = user('sadmin');
    for (const s of listScenarios()) {
      const r = await loadScenarioPack(sadmin, s.id);
      expect(r.loaded, s.id).toEqual([s.id]);
      expect(api.getCurrentUser(), s.id).toBeNull();
    }
  }, LONG);

  it('Date.now กลับเป็นตัวเดิมหลังเคส user-invited (withClockShift)', async () => {
    await freshSeededDemo();
    const real = Date.now;
    const r = await loadScenarioPack(user('sadmin'), 'user-invited');
    expect(Date.now).toBe(real);
    expect(Math.abs(Date.now() - new Date().getTime())).toBeLessThan(5000);
    expect(r.links).toHaveLength(2);
  }, LONG);

  it('withClockShift คืน Date.now แม้ fn throw', async () => {
    const real = Date.now;
    let inside = 0;
    await expect(withClockShift(-8, async () => { inside = Date.now(); throw new Error('boom'); })).rejects.toThrow('boom');
    expect(Date.now).toBe(real);
    expect(real() - inside).toBeGreaterThan(7.9 * 86_400_000);
    expect(await withClockShift(1, async () => 42)).toBe(42);
    expect(Date.now).toBe(real);
  });

  it('up → down → up: load all, reset, load all — ผลทุกรอบครบและลิงก์เชิญใหม่ทุกครั้ง', async () => {
    await freshSeededDemo();
    const sadmin = user('sadmin');
    const n = listScenarios().length;
    const a = await loadScenarioPack(sadmin);
    expect(a.loaded).toHaveLength(n);
    expect(a.links).toHaveLength(2);
    // ลิงก์ invite1 ใช้ได้ / invite2 หมดอายุ
    const tok = (h: string) => h.split('#t=')[1];
    expect(a.links.every(l => /^\/invite#t=[A-Za-z0-9_-]{43}$/.test(l.href))).toBe(true);
    expect(await api.peekInvitation(tok(a.links[0].href))).not.toBeNull();
    expect(await api.peekInvitation(tok(a.links[1].href))).toBeNull();

    await resetToStandardSeed(sadmin);
    expect(load<SarSection>(KEYS.sections).some(s => s.cycleId.startsWith('cycle-scn-'))).toBe(false);
    expect(api.getCurrentUser()).toBeNull();

    const b = await loadScenarioPack(user('sadmin'), ALL_SCENARIOS_ID);
    expect(b.loaded).toEqual(a.loaded);
    expect(b.links).toHaveLength(2);
    expect(b.links.map(l => l.href)).not.toEqual(a.links.map(l => l.href));
    expect(api.getCurrentUser()).toBeNull();
  }, LONG);
});

describe('TASK-0003 smoke ตาม README (หลังโหลดทุกเคส)', () => {
  it('ผลที่คาดตัวอย่างของแต่ละกลุ่ม', async () => {
    await freshSeededDemo();
    await loadScenarioPack(user('sadmin'));

    // cycle-under-assessment: assess1 ปิดการประเมินไม่ได้ ขาด 5 เกณฑ์
    await expect(api.transitionCycle(user('assess1'), 'cycle-scn-cs-2562', 'assessed')).rejects.toThrow(/ขาด 5 เกณฑ์/);
    // cycle-closed / cycle-final-approved: integrity ผ่าน
    expect((await api.verifySnapshot('cycle-scn-cs-2560')).ok).toBe(true);
    expect((await api.verifySnapshot('cycle-scn-cs-2564')).ok).toBe(true);
    // chair-suspended: ds-2568 ข้อ 1.1 รอตรวจแต่ไม่มีแจ้งเตือนถึงใคร
    const ds11 = load<SarSection>(KEYS.sections).find(s => s.id === `${DS_SUSPENDED_CHAIR_CYCLE}::1.1`);
    expect(ds11?.status).toBe('ready_for_review');
    expect(notes().filter(n => n.cycleId === DS_SUSPENDED_CHAIR_CYCLE && n.requirementId === '1.1' && n.kind !== 'assigned')).toEqual([]);
    expect(notes().some(n => n.cycleId === DS_SUSPENDED_CHAIR_CYCLE && N3_RE.test(n.messageTh))).toBe(false);
    // uni2-tenant: chairu2 ได้แจ้งเตือน 1.1 แต่ chair1 ไม่ได้ และไม่เห็นรอบ uni 2
    const chairu2 = user('chairu2'); const chair1 = user('chair1');
    expect(notes().some(n => n.userId === chairu2.id && n.cycleId === UNI2_CYCLE && n.requirementId === '1.1')).toBe(true);
    expect(notes().some(n => n.userId === chair1.id && n.cycleId === UNI2_CYCLE)).toBe(false);
    expect(api.listCycles(chair1).map(c => c.id)).not.toContain(UNI2_CYCLE);
    // user-pending / user-suspended: สถานะตอนล็อกอิน
    expect(await api.loginUser('newreq1', 'demo1234')).toMatchObject({ success: false, error: 'pending' });
    expect(await api.loginUser('exstaff', 'demo1234')).toMatchObject({ success: false, error: 'suspended' });
    // user-rejected: ไม่มีบัญชี rejreq1
    expect(api.getAllUsers().some(u => u.username === 'rejreq1')).toBe(false);
    // deadlines: lect1 ได้ 4 bucket และเรียกซ้ำไม่เกิดซ้ำ
    const lect1 = user('lect1');
    api.syncDeadlineNotifications(lect1);
    const buckets = new Set(notes().filter(n => n.userId === lect1.id && n.kind === 'deadline' && n.cycleId === CYCLE)
      .map(n => n.dedupeKey!.split(':').pop()));
    for (const b of ['overdue', '1', '3', '7']) expect(buckets.has(b), b).toBe(true);
    expect(api.syncDeadlineNotifications(lect1)).toBe(0);
    api.clearSession();
  }, LONG);
});

describe('TASK-0003 F4: ส่วนเสริม seed มาตรฐาน', () => {
  it('seed มาตรฐาน: 3.6 เป็นของ staff1, chair1 ยังไม่อ่าน N3 = 5 คู่ข้อรอตรวจ, เรียกซ้ำคืน 0', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    expect(load<SarSection>(KEYS.sections).find(s => s.id === `${CYCLE}::${STANDARD_PLAY_SECTION}`)?.ownerUserId).toBe(STANDARD_PLAY_OWNER_ID);
    expect(user('staff1').id).toBe(STANDARD_PLAY_OWNER_ID);
    const ready = load<SarSection>(KEYS.sections).filter(s => s.cycleId === CYCLE && s.status === 'ready_for_review');
    const n3 = notes().filter(n => n.userId === chair.id && !n.readAt && N3_RE.test(n.messageTh));
    expect(n3).toHaveLength(5);
    expect(n3.map(n => n.requirementId).sort()).toEqual(ready.map(s => s.requirementId).sort());
    expect(n3.map(n => n.requirementId).sort()).toEqual(['1.5', '6.6', '8.1', '8.2', '8.3']);
    const count = notes().length;
    expect(applyStandardSeedExtras(chair, CYCLE)).toBe(0);
    expect(notes().length).toBe(count);
  });

  it('resetToStandardSeed หลังโหลดเคส ได้ F4 เหมือนเดิม (N3 = 5, 3.6 → staff1) และ idempotent', async () => {
    await freshSeededDemo();
    await loadScenarioPack(user('sadmin'), 'sec-returned');
    await resetToStandardSeed(user('sadmin'));
    const chair = user('chair1');
    expect(load<SarSection>(KEYS.sections).find(s => s.id === `${CYCLE}::3.6`)?.ownerUserId).toBe('u-staff1');
    expect(notes().filter(n => n.userId === chair.id && !n.readAt && N3_RE.test(n.messageTh))).toHaveLength(5);
    expect(applyStandardSeedExtras(chair, CYCLE)).toBe(0);
  }, LONG);
});
