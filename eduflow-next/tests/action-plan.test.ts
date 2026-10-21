import { describe, it, expect } from 'vitest';
import * as api from '@/lib/api';
import { ACTION_TRANSITIONS, nextActionStatuses } from '@/lib/api/action.store';
import { listAudit } from '@/lib/api/audit.store';
import { KEYS, load } from '@/lib/api/db';
import type { ActionItem, Evidence } from '@/lib/types';
import { PROG, CYCLE, freshSeededDemo, user } from './helpers';

const forb = expect.objectContaining({ code: 'forbidden' });
const stages = (id: string) => api.listActionItems(user('chair1'), PROG).find(a => a.id === id)!;

describe('Action plan (M14) — state machine', () => {
  it('ตารางการเปลี่ยนสถานะ', () => {
    expect(nextActionStatuses('open')).toEqual(['in_progress']);
    expect(nextActionStatuses('in_progress')).toEqual(['done']);
    expect(nextActionStatuses('done').sort()).toEqual(['in_progress', 'verified']);
    expect(nextActionStatuses('verified')).toEqual([]);
    expect(ACTION_TRANSITIONS.find(t => t.to === 'verified')!.action).toBe('action.verify');
  });

  it('seed 6 รายการ (2 done/verified) และ transition ผิดลำดับถูกปฏิเสธ', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    const items = api.listActionItems(chair, PROG);
    expect(items).toHaveLength(6);
    expect(items.filter(a => a.status === 'done' || a.status === 'verified')).toHaveLength(2);
    const open = items.find(a => a.status === 'open')!;
    expect(() => api.setActionStatus(chair, open.id, 'done')).toThrowError(expect.objectContaining({ code: 'bad_transition' }));
    expect(() => api.setActionStatus(chair, open.id, 'verified')).toThrowError(expect.objectContaining({ code: 'bad_transition' }));
    const ver = items.find(a => a.status === 'verified')!;
    expect(() => api.setActionStatus(chair, ver.id, 'in_progress')).toThrowError(expect.objectContaining({ code: 'bad_transition' }));
  });

  it('เดินครบ open -> in_progress -> done -> verified + audit + เปิดซ้ำจาก done ได้ (ยังไม่เป็นหลักฐาน)', async () => {
    await freshSeededDemo();
    const chair = user('chair1'); const staff = user('staff1');
    const a = api.createActionItem(chair, { programmeId: PROG, requirementId: '3.6', description: 'ปรับปรุงการสอน', ownerUserId: staff.id, due: '2570-03-01', kpi: 'ผ่าน 80%' });
    expect(a.status).toBe('open');
    api.setActionStatus(staff, a.id, 'in_progress');
    const d = api.setActionStatus(staff, a.id, 'done');
    expect(d.doneAt).toBeTruthy();
    expect(api.setActionStatus(staff, a.id, 'in_progress').doneAt).toBeUndefined(); // เปิดซ้ำ
    api.setActionStatus(staff, a.id, 'done');
    const v = api.setActionStatus(chair, a.id, 'verified');
    expect(v.verifiedBy).toBe(chair.id);
    const acts = listAudit(chair, { programmeId: PROG, targetId: a.id }).map(x => x.action);
    for (const k of ['action.create', 'action.in_progress', 'action.done', 'action.verified']) expect(acts).toContain(k);
  });
});

describe('Action plan — สิทธิ์และ segregation', () => {
  it('เจ้าของงานยืนยัน (verify) งานของตัวเองไม่ได้ แม้มีสิทธิ์ verify; คนอื่นที่มีสิทธิ์ทำได้', async () => {
    await freshSeededDemo();
    const chair = user('chair1'); const fqa = user('fqa1');
    const a = api.createActionItem(chair, { programmeId: PROG, requirementId: '1.5', description: 'x', ownerUserId: chair.id });
    api.setActionStatus(chair, a.id, 'in_progress');
    api.setActionStatus(chair, a.id, 'done');
    expect(() => api.setActionStatus(chair, a.id, 'verified')).toThrowError(forb);
    expect(stages(a.id).status).toBe('done');
    expect(api.setActionStatus(fqa, a.id, 'verified').status).toBe('verified');
  });

  it('staff/data/dean/assessor verify ไม่ได้; staff แก้ได้เฉพาะงานตัวเอง; ต่าง tenant ถูกกัน', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    const done = api.listActionItems(chair, PROG).find(a => a.status === 'done')!; // act-5 เจ้าของ data1
    for (const u of ['staff1', 'dean1', 'assess1']) expect(() => api.setActionStatus(user(u), done.id, 'verified')).toThrow();
    const others = api.listActionItems(chair, PROG).find(a => a.ownerUserId === chair.id && a.status === 'open')!;
    expect(() => api.setActionStatus(user('staff1'), others.id, 'in_progress')).toThrowError(forb);
    expect(() => api.updateActionItem(user('staff1'), others.id, { description: 'hack' })).toThrowError(forb);
    expect(() => api.listActionItems(user('uadmin2'), PROG)).toThrowError(forb);
    expect(() => api.createActionItem(user('uadmin2'), { programmeId: PROG, requirementId: '1.1', description: 'x' })).toThrowError(forb);
  });

  it('validation: ข้อไม่มีจริง / วันที่ผิดรูปแบบ / แก้-ลบเมื่อสถานะไม่ใช่ open', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    expect(() => api.createActionItem(chair, { programmeId: PROG, requirementId: '9.9', description: 'x' })).toThrowError(expect.objectContaining({ code: 'invalid' }));
    expect(() => api.createActionItem(chair, { programmeId: PROG, requirementId: '1.1', description: 'x', due: '01/02/2570' })).toThrowError(expect.objectContaining({ code: 'invalid' }));
    expect(() => api.createActionItem(chair, { programmeId: PROG, requirementId: '1.1', description: '   ' })).toThrowError(expect.objectContaining({ code: 'invalid' }));
    const done = api.listActionItems(chair, PROG).find(a => a.status === 'done')!;
    expect(() => api.updateActionItem(chair, done.id, { description: 'y' })).toThrowError(expect.objectContaining({ code: 'locked' }));
    expect(() => api.deleteActionItem(chair, done.id)).toThrowError(expect.objectContaining({ code: 'locked' }));
  });
});

describe('Action plan -> หลักฐานขั้น A ในรอบใหม่', () => {
  it('done/verified กลายเป็น evidence ขั้น A ในรอบใหม่ ไม่ซ้ำในรอบที่ 3 และ pdca/source ถูกต้อง', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    const evBefore = load<Evidence>(KEYS.evidence).length;
    const c2 = api.createCycle(chair, { programmeId: PROG, academicYear: 2570 });
    const acts = load<ActionItem>(KEYS.actionItems).filter(a => a.status === 'done' || a.status === 'verified');
    expect(acts).toHaveLength(2);
    expect(acts.every(a => !!a.evidenceId)).toBe(true);
    expect(load<Evidence>(KEYS.evidence).length).toBe(evBefore + 2);
    const links2 = api.listLinks(chair, c2.id).filter(l => l.source === 'action');
    expect(links2.map(l => l.requirementId).sort()).toEqual(acts.map(a => a.requirementId).sort());
    const mat = load<Evidence>(KEYS.evidence).filter(e => e.title.startsWith('ผลดำเนินการตามแผนปรับปรุง'));
    expect(mat).toHaveLength(2);
    expect(mat.every(e => e.pdcaStage === 'A')).toBe(true);
    // รอบที่ 3: ผูก evidence เดิม ไม่สร้างใหม่
    const c3 = api.createCycle(chair, { programmeId: PROG, academicYear: 2571 });
    expect(load<Evidence>(KEYS.evidence).filter(e => e.title.startsWith('ผลดำเนินการตามแผนปรับปรุง'))).toHaveLength(2);
    expect(api.listLinks(chair, c3.id).filter(l => l.source === 'action')).toHaveLength(2);
    // action ที่ยังไม่ done ไม่ถูกสร้าง
    expect(acts.length).toBe(load<ActionItem>(KEYS.actionItems).filter(a => !!a.evidenceId).length);
    // gap R1 ของข้อนั้นในรอบใหม่ไม่ขึ้นแล้ว (มีหลักฐานผูก)
    const r1 = api.getGaps(chair, c2.id).filter(g => g.ruleId === 'R1').map(g => g.requirementId);
    for (const a of acts) expect(r1).not.toContain(a.requirementId);
  });

  it('action ที่ถูกใช้เป็นหลักฐานแล้ว เปิดซ้ำ (done -> in_progress) ไม่ได้ (locked)', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    const done = api.listActionItems(chair, PROG).find(a => a.status === 'done')!;
    api.createCycle(chair, { programmeId: PROG, academicYear: 2570 });
    expect(() => api.setActionStatus(chair, done.id, 'in_progress')).toThrowError(expect.objectContaining({ code: 'locked' }));
  });

  it('action ที่ done หลังรอบ 2570 ถูกดึงเข้ารอบ 2571 เท่านั้น (ไม่ย้อนรอบ 2570)', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    const c2 = api.createCycle(chair, { programmeId: PROG, academicYear: 2570 });
    const a = api.listActionItems(chair, PROG).find(x => x.status === 'open' && x.ownerUserId === chair.id)!;
    api.setActionStatus(chair, a.id, 'in_progress');
    api.setActionStatus(chair, a.id, 'done');
    const c3 = api.createCycle(chair, { programmeId: PROG, academicYear: 2571 });
    expect(api.listLinks(chair, c2.id).filter(l => l.source === 'action')).toHaveLength(2);
    expect(api.listLinks(chair, c3.id).filter(l => l.source === 'action')).toHaveLength(3);
    expect(CYCLE).toBeTruthy();
  });
});
