/**
 * TASK-0002 เฟส 6 — รอบแก้หลังเฟส 7 (R2-B4 backend + pure function ของ R2-F11)
 * R2-B4 HANDOFF:
 * (1) unlinkEvidence ข้อ approved / ready_for_review = locked + ลิงก์ยังอยู่
 * (2) unlink ข้อ changes_requested ได้
 * (3) linkEvidence ข้อใหม่ที่ ready_for_review = locked · ผูกซ้ำข้อ approved = [] ไม่ throw
 * (4) createEvidence ระบุข้อที่ล็อก = locked · ไม่มีหลักฐาน/ไฟล์ใหม่ (ไม่มีกำพร้า)
 * (5) role × scopeType 8×4 (ถูก 8 / ผิด 24 = invalid) ผ่าน createUser / inviteUser / approveAccessRequest / setUserRoles
 * (6) setUserRoles คงบทบาทเดิมที่ผิดคู่ได้ (inject store) แต่เพิ่มคู่ผิดใหม่ไม่ได้
 * (7) uadmin setUserRoles(sadmin, [...roles, assessor@cycle]) = "ไม่มีสิทธิ์แก้บัญชี super_admin"
 * (8) approveAccessRequest → N12 ของ uadmin/sadmin มี readAt (คงแถว) · reject ยังลบ
 * R2-F11 pure: displayMessageTh (พ.ศ. + ศัพท์ไทย) · nameInitials / stripHonorific
 * ข้อมูลทดสอบเป็นข้อมูลสมมติ
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as api from '@/lib/api';
import { KEYS, load } from '@/lib/api/db';
import { getUsers, saveUsers, ROLE_SCOPE_TYPES } from '@/lib/api/auth.api';
import type { AppNotification, Evidence, EvidenceLink, RoleAssignment, RoleCode, SarSection } from '@/lib/types';
import { displayMessageTh } from '@/lib/ui/notification';
import { nameInitials, stripHonorific } from '@/lib/ui/name';
import { CYCLE, PROG, addEvidence, freshSeededDemo, user } from './helpers';

const DOMAIN = 'sample-uni.example';
const PW = 'secret-pass-8';
const UNI = 'uni-demo';
const FAC = 'fac-demo-sci';

async function code(fn: () => unknown): Promise<string> {
  try { await fn(); return 'ok'; } catch (e: any) { return e?.code ?? String(e); }
}
async function err(fn: () => unknown): Promise<{ code: string; message: string }> {
  try { await fn(); return { code: 'ok', message: '' }; } catch (e: any) { return { code: e?.code, message: e?.message }; }
}
const links = () => load<EvidenceLink>(KEYS.links);
const sectionStatus = (rid: string) => load<SarSection>(KEYS.sections).find(s => s.cycleId === CYCLE && s.requirementId === rid)!.status;
/** หลักฐาน seed ตัวแรกที่ผูกกับข้อนี้ในรอบเดโม่ */
const evOf = (rid: string) => links().find(l => l.cycleId === CYCLE && l.requirementId === rid)!.evidenceId;
const hasLink = (evId: string, rid: string) => links().some(l => l.evidenceId === evId && l.cycleId === CYCLE && l.requirementId === rid);
const raw = (username: string) => getUsers().find(u => u.username === username)!;

beforeEach(async () => { await freshSeededDemo(); api.logoutUser(); });
afterEach(() => { vi.restoreAllMocks(); });

// ════════════════════ P1 ล็อกหลักฐาน ════════════════════
describe('R2-B4 P1 การผูกหลักฐานกับข้อที่ล็อก', () => {
  it('(1) unlinkEvidence ข้อ approved (1.1) และ ready_for_review (1.5) = locked · ลิงก์ยังอยู่', async () => {
    const chair = user('chair1');
    for (const rid of ['1.1', '1.5']) {
      const evId = evOf(rid);
      const st = sectionStatus(rid);
      expect(['approved', 'ready_for_review']).toContain(st);
      const before = links().length;
      const r = await err(() => api.unlinkEvidence(chair, evId, CYCLE, rid));
      expect(r.code, rid).toBe('locked');
      expect(r.message).toContain('ต้องถูกส่งกลับแก้ก่อน');
      expect(hasLink(evId, rid)).toBe(true);
      expect(links().length).toBe(before);
    }
  });

  it('(1b) ลิงก์ที่ไม่มีอยู่ของข้อที่ล็อก = no-op เดิม (ไม่ throw)', async () => {
    const evId = evOf('3.6');
    expect(hasLink(evId, '1.1')).toBe(false);
    expect(await code(() => api.unlinkEvidence(user('chair1'), evId, CYCLE, '1.1'))).toBe('ok');
  });

  it('(2) ประธานส่งข้อ 1.5 กลับ (changes_requested) → เลิกผูกได้', async () => {
    const chair = user('chair1');
    api.returnSection(chair, CYCLE, '1.5', 'ขอให้ปรับหลักฐาน (ทดสอบ)');
    expect(sectionStatus('1.5')).toBe('changes_requested');
    const evId = evOf('1.5');
    expect(await code(() => api.unlinkEvidence(chair, evId, CYCLE, '1.5'))).toBe('ok');
    expect(hasLink(evId, '1.5')).toBe(false);
  });

  it('(3) linkEvidence ข้อใหม่ที่ ready_for_review = locked (ไม่ผูกข้ออื่นในชุดด้วย) · ผูกซ้ำข้อ approved = [] ไม่ throw · ข้อ drafting ผูกได้', async () => {
    const chair = user('chair1');
    const evId = evOf('3.6');
    expect(hasLink(evId, '6.6')).toBe(false);
    const before = links().length;
    expect(await code(() => api.linkEvidence(chair, evId, CYCLE, ['5.1', '6.6']))).toBe('locked');
    expect(links().length).toBe(before);
    expect(hasLink(evId, '5.1')).toBe(false);

    const ev11 = evOf('1.1');
    expect(api.linkEvidence(chair, ev11, CYCLE, ['1.1'])).toEqual([]);
    expect(api.linkEvidence(chair, evId, CYCLE, ['5.1']).map(l => l.requirementId)).toEqual(['5.1']);
  });

  it('(4) createEvidence ระบุข้อที่ล็อก (1.1) = locked · จำนวนหลักฐาน/ไฟล์/ลิงก์ไม่เปลี่ยน · ระบุข้อ drafting สร้างได้', async () => {
    const chair = user('chair1');
    const n = { ev: load<Evidence>(KEYS.evidence).length, files: load(KEYS.files).length, links: links().length };
    expect(await code(() => addEvidence(chair, { requirementIds: ['3.6', '1.1'], title: 'หลักฐานกำพร้า (ทดสอบ)' }))).toBe('locked');
    expect(load<Evidence>(KEYS.evidence).length).toBe(n.ev);
    expect(load(KEYS.files).length).toBe(n.files);
    expect(links().length).toBe(n.links);
    expect(load<Evidence>(KEYS.evidence).some(e => e.title === 'หลักฐานกำพร้า (ทดสอบ)')).toBe(false);
    expect(await code(() => addEvidence(chair, { requirementIds: ['3.6'] }))).toBe('ok');
  });

  it('isSectionEditable: not_started/drafting/changes_requested = true · ready_for_review/approved = false', () => {
    const mk = (status: SarSection['status']) => ({ ...load<SarSection>(KEYS.sections)[0], status });
    for (const s of ['not_started', 'drafting', 'changes_requested'] as const) expect(api.isSectionEditable(mk(s)), s).toBe(true);
    for (const s of ['ready_for_review', 'approved'] as const) expect(api.isSectionEditable(mk(s)), s).toBe(false);
  });
});

// ════════════════════ P2 role ↔ scopeType ════════════════════
const SCOPE_ID: Record<RoleAssignment['scopeType'], string> = { university: UNI, faculty: FAC, programme: PROG, cycle: CYCLE };
const ROLES = Object.keys(ROLE_SCOPE_TYPES) as RoleCode[];
const TYPES = Object.keys(SCOPE_ID) as RoleAssignment['scopeType'][];
const COMBOS = ROLES.flatMap(role => TYPES.map(scopeType => ({ role, scopeType, ok: ROLE_SCOPE_TYPES[role].includes(scopeType) })));
const grant = (c: { role: RoleCode; scopeType: RoleAssignment['scopeType'] }): RoleAssignment =>
  ({ role: c.role, scopeType: c.scopeType, scopeId: SCOPE_ID[c.scopeType] });

describe('R2-B4 P2 บทบาท ↔ ระดับขอบเขต', () => {
  it('ตาราง: 8 role × 4 scopeType = ถูก 8 คู่ ผิด 24 คู่ · allowedScopeTypes/isRoleScopeCompatible ตรงตาราง', () => {
    expect(ROLES).toHaveLength(8);
    expect(COMBOS.filter(c => c.ok)).toHaveLength(8);
    expect(COMBOS.filter(c => !c.ok)).toHaveLength(24);
    for (const c of COMBOS) expect(api.isRoleScopeCompatible(c.role, c.scopeType), `${c.role}@${c.scopeType}`).toBe(c.ok);
    expect(api.allowedScopeTypes('assessor')).toEqual(['cycle']);
    expect(api.allowedScopeTypes('nope' as RoleCode)).toEqual([]);
  });

  it('(5a) createUser (sadmin) ทุกคู่: ถูก = ok, ผิด = invalid "ขอบเขตไม่ตรงกับบทบาท" + ไม่มีผู้ใช้ใหม่', async () => {
    const sa = user('sadmin');
    let i = 0;
    for (const c of COMBOS) {
      const username = `cu${i++}`;
      const r = await err(() => api.createUser(sa, { username, password: PW, email: `${username}@${DOMAIN}`, fullName: 'ทดสอบ ขอบเขต', roles: [grant(c)] }));
      expect(r.code, `${c.role}@${c.scopeType}`).toBe(c.ok ? 'ok' : 'invalid');
      if (!c.ok) {
        expect(r.message).toContain('ขอบเขตไม่ตรงกับบทบาท');
        expect(raw(username)).toBeUndefined();
      }
    }
  });

  it('(5b) inviteUser (sadmin) ทุกคู่: ถูก = ok, ผิด = invalid + ไม่มีคำเชิญ/ผู้ใช้ใหม่', async () => {
    const sa = user('sadmin');
    let i = 0;
    for (const c of COMBOS) {
      const username = `iu${i++}`;
      const inv = load(KEYS.invitations).length;
      const got = await code(() => api.inviteUser(sa, { username, email: `${username}@${DOMAIN}`, fullName: 'ทดสอบ เชิญ', roles: [grant(c)] }));
      expect(got, `${c.role}@${c.scopeType}`).toBe(c.ok ? 'ok' : 'invalid');
      if (!c.ok) { expect(raw(username)).toBeUndefined(); expect(load(KEYS.invitations).length).toBe(inv); }
    }
  });

  it('(5c) approveAccessRequest: คู่ผิด 24 แบบ = invalid คำขอยังรอ · คู่ถูกของทุก role อนุมัติได้', async () => {
    const sa = user('sadmin');
    await api.submitAccessRequest({ fullName: 'สมมติ ขอใช้', email: `rq0@${DOMAIN}`, username: 'rq0', password: PW, reason: 'ทดสอบ', consent: true });
    const id = raw('rq0').id;
    for (const c of COMBOS.filter(x => !x.ok)) {
      expect(await code(() => api.approveAccessRequest(sa, id, [grant(c)])), `${c.role}@${c.scopeType}`).toBe('invalid');
      expect(raw('rq0').status).toBe('pending');
    }
    let i = 1;
    for (const c of COMBOS.filter(x => x.ok)) {
      const username = `rq${i++}`;
      await api.submitAccessRequest({ fullName: 'สมมติ ขอใช้', email: `${username}@${DOMAIN}`, username, password: PW, reason: 'ทดสอบ', consent: true });
      expect(await code(() => api.approveAccessRequest(sa, raw(username).id, [grant(c)])), `${c.role}@${c.scopeType}`).toBe('ok');
      expect(raw(username).roles).toEqual([grant(c)]);
    }
  });

  it('(5d) setUserRoles (sadmin → lect1) เพิ่มทุกคู่: ถูก = ok, ผิด = invalid + roles เดิม', async () => {
    const sa = user('sadmin');
    const base = raw('lect1').roles;
    for (const c of COMBOS) {
      const got = await code(() => api.setUserRoles(sa, raw('lect1').id, [...base, grant(c)]));
      expect(got, `${c.role}@${c.scopeType}`).toBe(c.ok ? 'ok' : 'invalid');
      if (!c.ok) expect(raw('lect1').roles).toEqual(base);
      api.setUserRoles(sa, raw('lect1').id, base);
    }
  });

  it('(6) บทบาทเดิมที่ผิดคู่ (ข้อมูลก่อนกติกา) คงไว้ได้ / ถอดได้ · เพิ่มคู่ผิดใหม่ไม่ได้ · scopeType แปลกปลอม = "ขอบเขตบทบาทไม่ถูกต้อง"', async () => {
    const ua = user('uadmin');
    const legacy: RoleAssignment = { role: 'dean', scopeType: 'programme', scopeId: PROG };
    saveUsers(getUsers().map(u => (u.username === 'lect1' ? { ...u, roles: [...u.roles, legacy] } : u)));
    const id = raw('lect1').id;
    const withLegacy = raw('lect1').roles;
    // คงไว้ + เพิ่มคู่ถูก
    const add: RoleAssignment = { role: 'faculty_qa', scopeType: 'faculty', scopeId: FAC };
    expect(await code(() => api.setUserRoles(ua, id, [...withLegacy, add]))).toBe('ok');
    expect(raw('lect1').roles).toContainEqual(legacy);
    // เพิ่มคู่ผิดใหม่ (คนละคู่กับของเดิม)
    const r = await err(() => api.setUserRoles(ua, id, [...raw('lect1').roles, { role: 'staff' as RoleCode, scopeType: 'faculty', scopeId: FAC }]));
    expect(r.code).toBe('invalid');
    const r2 = await err(() => api.setUserRoles(ua, id, [...raw('lect1').roles, { role: 'programme_staff', scopeType: 'faculty', scopeId: FAC }]));
    expect(r2).toEqual({ code: 'invalid', message: expect.stringContaining('ขอบเขตไม่ตรงกับบทบาท') });
    const r3 = await err(() => api.setUserRoles(ua, id, [...raw('lect1').roles, { role: 'programme_staff', scopeType: 'galaxy' as any, scopeId: FAC }]));
    expect(r3).toEqual({ code: 'invalid', message: 'ขอบเขตบทบาทไม่ถูกต้อง' });
    // ถอดของเดิมที่ผิดคู่ได้
    expect(await code(() => api.setUserRoles(ua, id, raw('lect1').roles.filter(x => x.role !== 'dean')))).toBe('ok');
    expect(raw('lect1').roles).not.toContainEqual(legacy);
  });

  it('(7) uadmin เพิ่มบทบาทให้ sadmin = forbidden "ไม่มีสิทธิ์แก้บัญชี super_admin" (ตรวจเป้าหมายก่อน) · roles ไม่เปลี่ยน', async () => {
    const sa = raw('sadmin');
    const r = await err(() => api.setUserRoles(user('uadmin'), sa.id, [...sa.roles, { role: 'assessor', scopeType: 'cycle', scopeId: CYCLE }]));
    expect(r).toEqual({ code: 'forbidden', message: 'ไม่มีสิทธิ์แก้บัญชี super_admin' });
    expect(raw('sadmin').roles).toEqual(sa.roles);
  });
});

// ════════════════════ P7 N12 mark read ════════════════════
describe('R2-B4 P7 แจ้งเตือนคำขอเข้าใช้งาน (N12)', () => {
  const n12 = (requesterId: string) => load<AppNotification>(KEYS.notifications)
    .filter(n => n.kind === 'access_request' && n.dedupeKey === `access_request:${requesterId}`);

  it('(8) อนุมัติ → N12 ของผู้ดูแลทุกคน (uadmin + sadmin) มี readAt และแถวยังอยู่ · แจ้งเตือนอื่นของผู้ดูแล/ผู้ใช้เดิมไม่ถูกแตะ', async () => {
    await api.submitAccessRequest({ fullName: 'สมมติ อนุมัติ', email: `ap1@${DOMAIN}`, username: 'ap1', password: PW, reason: 'ทดสอบ', consent: true });
    const id = raw('ap1').id;
    const before = n12(id);
    const recipients = new Set(before.map(n => n.userId));
    expect(recipients.has(raw('uadmin').id)).toBe(true);
    expect(recipients.has(raw('sadmin').id)).toBe(true);
    expect(before.every(n => !n.readAt)).toBe(true);
    const otherUnread = load<AppNotification>(KEYS.notifications).filter(n => n.kind !== 'access_request' && n.userId !== id && !n.readAt).length;

    api.approveAccessRequest(user('uadmin'), id, [{ role: 'programme_staff', scopeType: 'programme', scopeId: PROG }]);
    const after = n12(id);
    expect(after).toHaveLength(before.length);
    expect(after.every(n => typeof n.readAt === 'number')).toBe(true);
    // ผู้ขอที่ได้รับอนุมัติได้แจ้งเตือนบัญชีของตัวเอง (ยังไม่อ่าน) — ไม่ใช่ N12
    expect(load<AppNotification>(KEYS.notifications).some(n => n.userId === id && n.kind === 'account' && !n.readAt)).toBe(true);
    expect(load<AppNotification>(KEYS.notifications).filter(n => n.kind !== 'access_request' && n.userId !== id && !n.readAt).length).toBe(otherUnread);
  });

  it('(8b) ปฏิเสธ → N12 ถูกลบจากผู้รับทุกคน (เหมือนเดิม)', async () => {
    await api.submitAccessRequest({ fullName: 'สมมติ ปฏิเสธ', email: `rj1@${DOMAIN}`, username: 'rj1', password: PW, reason: 'ทดสอบ', consent: true });
    const id = raw('rj1').id;
    expect(n12(id).length).toBeGreaterThan(0);
    api.rejectAccessRequest(user('uadmin'), id, 'ไม่ใช่บุคลากร (ทดสอบ)');
    expect(n12(id)).toHaveLength(0);
  });
});

// ════════════════════ R2-F11 pure ════════════════════
describe('R2-F11 displayMessageTh / ชื่อย่อ', () => {
  it('ISO date → วันที่ไทย พ.ศ. · ไม่จับ timestamp T… · วันที่ผิดรูปคงเดิม', () => {
    expect(displayMessageTh('กำหนดเสร็จ (2026-10-31)')).toBe('กำหนดเสร็จ (31 ต.ค. 2569)');
    expect(displayMessageTh('กำหนดเสร็จ 2030-03-15')).toBe('กำหนดเสร็จ 15 มี.ค. 2573');
    expect(displayMessageTh('เวลา 2026-10-31T10:00:00Z')).toContain('2026-10-31T10:00:00Z');
    expect(displayMessageTh('รหัส 2026-13-40')).toBe('รหัส 2026-13-40');
  });

  it('"comment" → "ความเห็น" · "action item" → "แผนปรับปรุง" ตัดช่องว่างข้างคำไทย · messageTh จริงของระบบ', () => {
    expect(displayMessageTh('มี comment ใหม่ที่ข้อ 3.6')).toBe('มีความเห็นใหม่ที่ข้อ 3.6');
    expect(displayMessageTh('คุณได้รับมอบหมาย action item ข้อ 3.6 กำหนดเสร็จ 2026-10-31'))
      .toBe('คุณได้รับมอบหมายแผนปรับปรุงข้อ 3.6 กำหนดเสร็จ 31 ต.ค. 2569');
    expect(displayMessageTh('action item ข้อ 2.1 ได้รับการยืนยันแล้ว')).not.toMatch(/action item/i);
    expect(displayMessageTh('ข้อความธรรมดา')).toBe('ข้อความธรรมดา');
  });

  it('nameInitials ตัดคำนำหน้า · stripHonorific ไม่ตัดชื่อที่ขึ้นต้นเหมือนคำนำหน้า (คุณากร)', () => {
    // HANDOFF เขียน "ปร" แต่ฟังก์ชันตั้งใจเก็บสระบน/ล่างที่ตามพยัญชนะตัวที่ 2 (ไม่ตัดสระลอย) → "ปรี"
    expect(nameInitials('ผศ.ดร.ปรีชา ใจดี')).toBe('ปรี');
    expect(nameInitials('อ.วิภา เขียนรายงาน')).toBe('วิ');
    expect(stripHonorific('คุณากร ทดสอบ')).toBe('คุณากร ทดสอบ');
    expect(stripHonorific('อ.วิภา เขียนรายงาน')).toBe('วิภา เขียนรายงาน');
    expect(stripHonorific('ดร.')).toBe('ดร.');
  });
});
