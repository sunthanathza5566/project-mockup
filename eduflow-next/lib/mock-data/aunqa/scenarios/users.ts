/**
 * TASK-0003 S4 — เคสผู้ใช้ / การรับผู้ใช้ใหม่ / หลาย role / หลักสูตรไม่มีประธาน (ผ่าน API จริงทั้งหมด)
 * ข้อมูลบุคคลทั้งหมดสมมติ: ชื่อ "(สมมติ)" · อีเมลโดเมน *.example · รหัสผ่าน demo1234
 */
import * as api from '../../../api';
import { KEYS, load } from '../../../api/db';
import type { SarSection } from '../../../types';
import {
  CS, DEMO_CYCLE, DOMAIN, DS, FAC, PW, chairOf, cycleExists, ensureUser, maybeUser, shortNarrative, staffOf, u, withClockShift,
} from './helpers';
import type { ScenarioDef } from './types';

const SEC = (cycleId: string, rid: string) => `/app/sections/${encodeURIComponent(`${cycleId}::${rid}`)}`;
const sectionOf = (cycleId: string, rid: string) => load<SarSection>(KEYS.sections).find(s => s.id === `${cycleId}::${rid}`)!;

async function request(username: string, fullName: string, extra: { programmeId?: string; facultyId?: string; positionText?: string }, reason: string) {
  if (maybeUser(username)) return;
  await api.submitAccessRequest({ fullName, email: `${username}@${DOMAIN}`, username, password: PW, reason, consent: true, ...extra });
}

export const DS_NO_CHAIR_CYCLE = 'cycle-scn-ds-2569';
export const DS_SUSPENDED_CHAIR_CYCLE = 'cycle-scn-ds-2568';

export const USER_SCENARIOS: ScenarioDef[] = [
  {
    info: {
      id: 'user-pending', group: 'user', titleTh: 'คำขอเข้าใช้งานรออนุมัติ 2 รายการ',
      descriptionTh: 'newreq1 (ระบุหลักสูตร CS) และ newreq2 (ระบุคณะ + ตำแหน่ง) ส่งคำขอที่ /request-access → ผู้ดูแลได้แจ้งเตือน',
      accounts: [{ username: 'uadmin', roleTh: 'อนุมัติ/ปฏิเสธ' }, { username: 'sadmin', roleTh: 'เห็นคำขอทุกมหาวิทยาลัย' }, { username: 'newreq1', roleTh: 'ผู้ขอ — ล็อกอินแล้วเห็น "รออนุมัติ"' }],
      paths: ['/app/admin?tab=requests', '/login'],
      expectTh: ['แท็บคำขอมี 2 รายการ ตัวนับเมนู = 2', 'กระดิ่ง uadmin/sadmin มี "มีคำขอเข้าใช้งานใหม่จาก …"', 'newreq1 ล็อกอิน (demo1234) → แจ้งว่ารออนุมัติ ไม่เข้าระบบ', 'อนุมัติ newreq1 เป็นอาจารย์ CS → newreq1 ได้แจ้งเตือน "บัญชีของคุณได้รับอนุมัติแล้ว"'],
    },
    run: async () => {
      await request('newreq1', 'อ.ใหม่ ขอใช้งาน (สมมติ)', { programmeId: CS }, 'เป็นอาจารย์ประจำหลักสูตรใหม่ ต้องเขียน SAR เกณฑ์ที่ 3');
      await request('newreq2', 'คุณสายใจ งานประกันคุณภาพ (สมมติ)', { facultyId: FAC, positionText: 'เจ้าหน้าที่งานประกันคุณภาพคณะ' }, 'ต้องช่วยรวบรวมหลักฐานระดับคณะ');
    },
  },
  {
    info: {
      id: 'user-rejected', group: 'user', titleTh: 'คำขอเข้าใช้งานที่ถูกปฏิเสธ',
      descriptionTh: 'rejreq1 ส่งคำขอ → uadmin ปฏิเสธพร้อมหมายเหตุ → ระบบลบแถวผู้ขอ + ลบแจ้งเตือนชื่อผู้ขอจากผู้ดูแลทุกคน (PDPA) · ผู้ขอไม่ได้รับแจ้ง (พฤติกรรมปัจจุบัน)',
      accounts: [{ username: 'uadmin', roleTh: 'ผู้ปฏิเสธ — ดู audit' }, { username: 'rejreq1', roleTh: 'ผู้ขอ — ล็อกอินไม่ได้' }],
      paths: ['/app/admin?tab=requests', '/app/admin?tab=audit', '/request-access'],
      expectTh: ['ไม่มี rejreq1 ในรายชื่อ/คำขอ · ไม่มีแจ้งเตือนชื่อ rejreq1 ค้าง', 'audit มี user.reject เก็บแค่โดเมนอีเมล', 'rejreq1 ล็อกอิน = ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง · ส่งคำขอใหม่ด้วยชื่อเดิมได้'],
    },
    run: async () => {
      if (load<{ id: string; action: string }>(KEYS.audit).some(a => a.action === 'user.reject')) return;
      await request('rejreq1', 'นายทดลอง ถูกปฏิเสธ (สมมติ)', { programmeId: CS }, 'อยากลองใช้ระบบ');
      const r = api.listAccessRequests(u('uadmin')).find(x => x.username === 'rejreq1');
      if (r) api.rejectAccessRequest(u('uadmin'), r.userId, 'ไม่ใช่บุคลากรของหลักสูตร');
    },
  },
  {
    info: {
      id: 'user-invited', group: 'user', titleTh: 'ผู้ถูกเชิญ: ลิงก์ยังใช้ได้ / หมดอายุ / ตอบรับแล้ว',
      descriptionTh: 'uadmin เชิญ invite1 (ลิงก์ใช้ได้ 7 วัน), invite2 (เชิญเมื่อ 8 วันก่อน → หมดอายุ), invite3 (ตั้งรหัสแล้ว → active)',
      accounts: [{ username: 'uadmin', roleTh: 'ผู้เชิญ — ออกลิงก์ใหม่/ยกเลิก' }, { username: 'invite3', roleTh: 'ตอบรับแล้ว (อาจารย์ CS)' }],
      paths: ['/app/admin?tab=users', '/invite'],
      expectTh: ['แท็บผู้ใช้: invite1/invite2 สถานะ "รอรับเชิญ" · invite3 "ใช้งาน"', 'เปิดลิงก์เชิญ invite1 (จากผลการโหลด) → ตั้งรหัส → เข้าระบบได้', 'เปิดลิงก์ invite2 → "ลิงก์เชิญไม่ถูกต้องหรือหมดอายุแล้ว"', 'กระดิ่ง uadmin มี "invite3 … ตั้งรหัสผ่านและเริ่มใช้งานแล้ว"', 'invite1/invite2 ล็อกอินไม่ได้ (ยังไม่มีรหัส)'],
    },
    run: async ctx => {
      const admin = u('uadmin'); const roles = [staffOf(CS)];
      if (!maybeUser('invite1')) {
        const r = await api.inviteUser(admin, { username: 'invite1', email: `invite1@${DOMAIN}`, fullName: 'อ.รับเชิญ หนึ่ง (สมมติ)', roles });
        ctx.addLink('ลิงก์เชิญ invite1 (ยังใช้ได้ 7 วัน)', `/invite#t=${r.token}`);
      }
      if (!maybeUser('invite2')) {
        const r = await withClockShift(-8, () => api.inviteUser(admin, { username: 'invite2', email: `invite2@${DOMAIN}`, fullName: 'อ.รับเชิญ สอง (สมมติ)', roles }));
        ctx.addLink('ลิงก์เชิญ invite2 (หมดอายุแล้ว)', `/invite#t=${r.token}`);
      }
      if (!maybeUser('invite3')) {
        const r = await api.inviteUser(admin, { username: 'invite3', email: `invite3@${DOMAIN}`, fullName: 'อ.รับเชิญ สาม (สมมติ)', roles });
        await api.acceptInvitation(r.token, PW); // ล็อกอินอัตโนมัติ → loader ล้าง session ตอนจบ
        api.logoutUser();
      }
    },
  },
  {
    info: {
      id: 'user-suspended', group: 'user', titleTh: 'ผู้ใช้ถูกระงับ ที่ยังเป็นเจ้าของข้อ (exstaff → 8.2)',
      descriptionTh: 'uadmin สร้าง exstaff (อาจารย์ CS) → chair1 มอบข้อ 8.2 ให้ → uadmin ระงับบัญชีพร้อมเหตุผล',
      accounts: [{ username: 'exstaff', roleTh: 'ถูกระงับ — ล็อกอินไม่ได้' }, { username: 'uadmin', roleTh: 'เปิดใช้อีกครั้งได้' }, { username: 'chair1', roleTh: 'ต้องมอบข้อ 8.2 ใหม่' }],
      paths: ['/app/admin?tab=users', `/app/cycles/${DEMO_CYCLE}/assign`],
      expectTh: ['exstaff ล็อกอิน → แจ้งว่าบัญชีถูกระงับ', 'หน้ามอบหมาย: 8.2 ยังแสดงเจ้าของเดิม แต่ dropdown ไม่มี exstaff ให้เลือก', 'แจ้งเตือนที่ควรถึง exstaff ถูกข้าม (เช่น อนุมัติ 8.2 แล้ว exstaff ไม่ได้รับ)', 'audit มี user.suspend + เหตุผล'],
    },
    run: async () => {
      const admin = u('uadmin');
      const ex = await ensureUser(admin, 'exstaff', 'อ.ลาออก แล้ว (สมมติ)', [staffOf(CS)]);
      if (ex.status === 'suspended') return;
      if (sectionOf(DEMO_CYCLE, '8.2').ownerUserId !== ex.id) api.assignSections(u('chair1'), DEMO_CYCLE, ['8.2'], ex.id);
      api.setUserStatus(admin, ex.id, 'suspended', 'ลาออกจากมหาวิทยาลัย มีผล 1 พ.ย. (ข้อมูลทดสอบ)');
    },
  },
  {
    info: {
      id: 'multi-role', group: 'user', titleTh: 'ผู้ใช้หลาย role / หลายขอบเขต (mrole1)',
      descriptionTh: 'mrole1 = อาจารย์หลักสูตร CS + เจ้าหน้าที่ข้อมูลคณะ · chair1 มอบข้อ 7.1 ให้ · (ดูเคส cycle-under-assessment ด้วย: lect2 = อาจารย์ DS + กรรมการรอบ 2562)',
      accounts: [{ username: 'mrole1', roleTh: 'อาจารย์ CS + เจ้าหน้าที่ข้อมูล' }],
      paths: ['/app', '/app/metrics', `/app/cycles/${DEMO_CYCLE}`],
      expectTh: ['เมนูรวมสิทธิ์ทั้งสอง role (ตัวชี้วัด/นำเข้าข้อมูลได้ + เขียนข้อที่ได้รับ)', 'งานของฉันมีข้อ 7.1', 'แก้ข้ออื่นที่ไม่ใช่ของตนไม่ได้'],
    },
    run: async () => {
      const m = await ensureUser(u('uadmin'), 'mrole1', 'อ.สองบทบาท ทดสอบ (สมมติ)', [staffOf(CS), { role: 'data_staff', scopeType: 'faculty', scopeId: FAC }]);
      if (sectionOf(DEMO_CYCLE, '7.1').ownerUserId !== m.id) api.assignSections(u('chair1'), DEMO_CYCLE, ['7.1'], m.id);
    },
  },
  {
    info: {
      id: 'ds-no-chair', group: 'user', titleTh: 'หลักสูตรไม่มีประธาน (DS รอบ 2569)',
      descriptionTh: 'uadmin สร้างและเริ่มรอบ DS 2569 · หลักสูตร DS ไม่มีประธาน → ไม่มีใครมอบหมายข้อ/อนุมัติได้ · lect2 (อาจารย์ DS) เห็นรอบแต่เขียนไม่ได้',
      accounts: [{ username: 'lect2', roleTh: 'อาจารย์ DS — ไม่มีข้อให้เขียน' }, { username: 'uadmin', roleTh: 'ต้องเพิ่มประธาน DS' }],
      paths: [`/app/cycles/${DS_NO_CHAIR_CYCLE}`],
      expectTh: ['รอบ DS 2569 สถานะ "กำลังดำเนินการ" ทุกข้อ "ยังไม่เริ่ม" ไม่มีเจ้าของ', 'lect2 เปิดข้อใดก็แก้ไม่ได้', 'ทางแก้: uadmin กำหนดประธานให้ DS (แท็บผู้ใช้)'],
    },
    run: async () => {
      if (cycleExists(DS_NO_CHAIR_CYCLE)) return;
      const admin = u('uadmin');
      api.createCycle(admin, { id: DS_NO_CHAIR_CYCLE, programmeId: DS, academicYear: 2569 });
      await api.transitionCycle(admin, DS_NO_CHAIR_CYCLE, 'in_progress', 'เริ่มรอบ DS (ยังไม่มีประธาน)');
    },
  },
  {
    info: {
      id: 'chair-suspended', group: 'user', titleTh: 'ประธานถูกระงับ → อาจารย์ส่งตรวจแล้วไม่มีผู้รับแจ้งเตือน (DS รอบ 2568)',
      descriptionTh: 'chairds (ประธาน DS) สร้างรอบ DS 2568 และมอบข้อ 1.1–1.2 ให้ lect2 → uadmin ระงับ chairds → lect2 ส่งตรวจ 1.1 → ไม่มีใครได้แจ้งเตือน',
      accounts: [{ username: 'lect2', roleTh: 'ส่งตรวจแล้ว (ผู้รับ = 0)' }, { username: 'uadmin', roleTh: 'เปิดใช้ chairds อีกครั้ง' }],
      paths: [SEC(DS_SUSPENDED_CHAIR_CYCLE, '1.1')],
      expectTh: ['1.1 สถานะ "รอตรวจ" แต่ไม่มีแจ้งเตือนถึงใคร (ผู้รับต้อง active)', 'chairds ล็อกอินไม่ได้ (ถูกระงับ)', 'เปิดใช้ chairds แล้ว: แจ้งเตือนเก่าไม่ย้อนมา แต่คิวรอตรวจเห็น 1.1'],
    },
    run: async () => {
      if (cycleExists(DS_SUSPENDED_CHAIR_CYCLE)) return;
      const admin = u('uadmin'); const lect2 = u('lect2');
      const chair = await ensureUser(admin, 'chairds', 'ผศ.ประธาน ดีเอส (สมมติ)', [chairOf(DS)]);
      api.createCycle(chair, { id: DS_SUSPENDED_CHAIR_CYCLE, programmeId: DS, academicYear: 2568 });
      await api.transitionCycle(chair, DS_SUSPENDED_CHAIR_CYCLE, 'in_progress', 'เริ่มรอบ DS 2568');
      api.assignSections(chair, DS_SUSPENDED_CHAIR_CYCLE, ['1.1', '1.2'], lect2.id);
      api.saveSection(lect2, DS_SUSPENDED_CHAIR_CYCLE, '1.1', { narrativeTh: shortNarrative('1.1', 2568) }, 'manual');
      api.saveSection(lect2, DS_SUSPENDED_CHAIR_CYCLE, '1.2', { narrativeTh: shortNarrative('1.2', 2568) }, 'manual');
      api.setUserStatus(admin, chair.id, 'suspended', 'ลาศึกษาต่อ (ข้อมูลทดสอบ)');
      api.submitSection(lect2, DS_SUSPENDED_CHAIR_CYCLE, '1.1');
    },
  },
];
