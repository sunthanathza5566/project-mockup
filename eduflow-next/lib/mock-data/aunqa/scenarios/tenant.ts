/**
 * TASK-0003 S4 — ข้าม tenant: มหาวิทยาลัยที่ 2 (uni-demo-2) มีคณะ/หลักสูตร/ประธาน/รอบของตัวเอง
 * ข้อยกเว้นกติกา "ผ่าน API เท่านั้น": คณะ + หลักสูตรของ uni-demo-2 ไม่มี API สร้าง (ระบบยังไม่มีหน้าจัดการองค์กร)
 *   → เขียนแถวองค์กร 2 แถวผ่าน save() แบบเดียวกับ lib/api/init.ts · ผู้ใช้/รอบ/ข้อ/แจ้งเตือน/คำขอ ผ่าน API จริงทั้งหมด
 */
import * as api from '../../../api';
import { KEYS, load, save } from '../../../api/db';
import type { Faculty, Programme } from '../../../types';
import { DEMO_UNIVERSITY_2 } from '../org';
import { PW, chairOf, cycleExists, ensureUser, maybeUser, shortNarrative, staffOf, u } from './helpers';
import type { ScenarioDef } from './types';

const U2 = DEMO_UNIVERSITY_2.id;
const D2 = DEMO_UNIVERSITY_2.emailDomain;

export const UNI2_FACULTY: Faculty = {
  id: 'fac-demo2-eng', universityId: U2, nameTh: 'คณะวิศวกรรมศาสตร์ทดสอบ (สมมติ)', nameEn: 'Faculty of Test Engineering (fictional)',
};
export const UNI2_PROGRAMME: Programme = {
  id: 'prog-demo2-ce', universityId: U2, facultyId: UNI2_FACULTY.id, code: 'CE-B-69',
  nameTh: 'วิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมคอมพิวเตอร์ (สมมติ)', nameEn: 'Bachelor of Engineering in Computer Engineering (fictional)',
  degreeLevel: 'bachelor', curriculumYear: 2566,
};
export const UNI2_CYCLE = 'cycle-scn-u2-2569';

function ensureUni2Org() {
  const facs = load<Faculty>(KEYS.faculties);
  if (!facs.some(f => f.id === UNI2_FACULTY.id)) save(KEYS.faculties, [...facs, { ...UNI2_FACULTY }]);
  const progs = load<Programme>(KEYS.programmes);
  if (!progs.some(p => p.id === UNI2_PROGRAMME.id)) save(KEYS.programmes, [...progs, { ...UNI2_PROGRAMME }]);
}

export const TENANT_SCENARIOS: ScenarioDef[] = [
  {
    info: {
      id: 'uni2-tenant', group: 'tenant', titleTh: 'มหาวิทยาลัยที่ 2 มีข้อมูลของตัวเอง (ข้าม tenant)',
      descriptionTh: 'uni-demo-2 (ปิด AI) มีคณะ/หลักสูตร CE-B-69 · uadmin2 สร้าง chairu2 + staffu2 · chairu2 เริ่มรอบ 2569 มอบข้อ 1.1 → staffu2 ส่งตรวจ → chairu2 ได้แจ้งเตือน · มีคำขอเข้าใช้งานโดเมน test-uni.example รออนุมัติ 1 รายการ',
      accounts: [
        { username: 'chairu2', roleTh: 'ประธาน uni 2 — ได้แจ้งเตือน 1.1' }, { username: 'staffu2', roleTh: 'อาจารย์ uni 2' },
        { username: 'uadmin2', roleTh: 'ผู้ดูแล uni 2 — มีคำขอ 1' }, { username: 'chair1', roleTh: 'uni 1 — ต้องไม่เห็นอะไรของ uni 2' },
      ],
      paths: ['/app/cycles', '/app/admin?tab=requests', '/app/review'],
      expectTh: [
        'chair1/uadmin ไม่เห็นรอบ/ผู้ใช้/คำขอของ uni 2 · chairu2 ไม่เห็นของ uni 1',
        'ประธาน uni 1 ไม่ได้แจ้งเตือนจากการส่งตรวจของ uni 2',
        'sadmin เห็นคำขอของทั้งสองมหาวิทยาลัย', 'หน้าที่ใช้ AI ของ uni 2 แสดงว่าปิด AI',
      ],
    },
    run: async () => {
      if (cycleExists(UNI2_CYCLE)) return;
      ensureUni2Org();
      const admin2 = u('uadmin2');
      const chair = await ensureUser(admin2, 'chairu2', 'ผศ.ประธาน มหาวิทยาลัยสอง (สมมติ)', [chairOf(UNI2_PROGRAMME.id)], `chair.ce@${D2}`);
      const staff = await ensureUser(admin2, 'staffu2', 'อ.อาจารย์ มหาวิทยาลัยสอง (สมมติ)', [staffOf(UNI2_PROGRAMME.id)], `staff.ce@${D2}`);
      api.createCycle(chair, { id: UNI2_CYCLE, programmeId: UNI2_PROGRAMME.id, academicYear: 2569 });
      await api.transitionCycle(chair, UNI2_CYCLE, 'in_progress', 'เริ่มรอบ uni 2');
      api.assignSections(chair, UNI2_CYCLE, ['1.1', '1.2'], staff.id);
      api.saveSection(staff, UNI2_CYCLE, '1.1', { narrativeTh: shortNarrative('1.1', 2569) }, 'manual');
      api.submitSection(staff, UNI2_CYCLE, '1.1');
      if (!maybeUser('u2req1')) {
        await api.submitAccessRequest({
          fullName: 'อ.ผู้ขอ มหาวิทยาลัยสอง (สมมติ)', email: `u2req1@${D2}`, username: 'u2req1', password: PW,
          programmeId: UNI2_PROGRAMME.id, reason: 'อาจารย์ใหม่ของหลักสูตร CE', consent: true,
        });
      }
    },
  },
];
