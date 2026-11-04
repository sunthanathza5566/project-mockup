/**
 * TASK-0003 S4 — หลักฐานทุกสถานะ + PII และแผนปรับปรุง (action plan) เคสขอบ — ผ่าน API จริง
 * PII ทั้งหมดเป็นของปลอม: อีเมลโดเมน .example และรหัสนักศึกษาที่ไม่มีอยู่จริง (ไม่ใช้เบอร์โทร เพราะอาจตรงกับเบอร์ของคนจริง)
 */
import * as api from '../../../api';
import { KEYS, load } from '../../../api/db';
import type { ActionItem, Evidence } from '../../../types';
import { CS, DEMO_CYCLE, isoPlusDays, u } from './helpers';
import type { ScenarioDef } from './types';

const TAG = '(scenario)';
const hasEvidence = (title: string) => load<Evidence>(KEYS.evidence).some(e => e.title === title);

const EV = {
  piiOpen: `รายชื่อนักศึกษาที่เข้าร่วมเทียบเคียงผลลัพธ์ ${TAG}`,
  piiDone: `แบบตอบรับผู้ใช้บัณฑิต ฉบับปิดบังข้อมูลแล้ว ${TAG}`,
  pending: `สรุปผลเทียบเคียงหลักสูตรคู่เทียบ 2568 ${TAG}`,
  unlinked: `ภาพกิจกรรมสัมมนาวิชาการ (ยังไม่ผูกข้อ) ${TAG}`,
};

export const EVIDENCE_ACTION_SCENARIOS: ScenarioDef[] = [
  {
    info: {
      id: 'evidence-states', group: 'evidence', titleTh: 'หลักฐานทุกสถานะ + PII ค้าง/จัดการแล้ว + หลายเวอร์ชัน',
      descriptionTh: 'ข้อ 7.9: data1 อัปโหลด (1) ไฟล์ที่มีอีเมล/รหัสนักศึกษาปลอม → ติดธง PII ค้าง (2) ไฟล์มี PII ที่ประธานยืนยันว่าจัดการแล้ว + verify (3) หลักฐานรอ verify ที่มี 2 เวอร์ชัน · (4) หลักฐานที่ยังไม่ผูกข้อ · chair1 verify หลักฐาน PLO ของข้อ 1.1',
      accounts: [{ username: 'chair1', roleTh: 'verify / จัดการ PII' }, { username: 'data1', roleTh: 'ผู้อัปโหลด' }, { username: 'fqa1', roleTh: 'verify ได้' }],
      paths: ['/app/evidence', `/app/sections/${encodeURIComponent(`${DEMO_CYCLE}::7.9`)}`],
      expectTh: [
        'รายการหลักฐานมีสถานะ: อัปโหลดแล้ว (ไม่ผูก) / ติดป้ายแล้ว (รอ verify) / verified',
        'หลักฐาน "รายชื่อนักศึกษา…" ติดธงข้อมูลส่วนบุคคล (อีเมล, รหัสนักศึกษา) — verify ไม่ได้จนกว่าจะจัดการ PII',
        'หลักฐาน "สรุปผลเทียบเคียง…" มีประวัติไฟล์ 2 เวอร์ชัน', 'งาน "จัดการข้อมูลส่วนบุคคลในหลักฐาน" ของ chair1 เพิ่มเป็น 2 ชิ้น',
      ],
    },
    run: async () => {
      if (hasEvidence(EV.piiOpen)) return;
      const data = u('data1'); const chair = u('chair1');
      const base = { programmeId: CS, academicYear: 2568, cycleId: DEMO_CYCLE, requirementIds: ['7.9'] };
      await api.createEvidence(data, {
        ...base, title: EV.piiOpen, kind: 'statistics', pdcaStage: 'C',
        extractedText: 'ผู้ประสานงาน: somsri.test@student.test-mail.example · รหัสนักศึกษา 6512345678 เข้าร่วมกิจกรรมเทียบเคียงผลลัพธ์',
      });
      const done = await api.createEvidence(data, {
        ...base, title: EV.piiDone, kind: 'survey', pdcaStage: 'C',
        extractedText: 'ติดต่อกลับ: hr.contact@employer-sample.example (ผู้ใช้บัณฑิตยินยอมให้เปิดเผยอีเมลหน่วยงาน)',
      });
      api.resolvePii(chair, done.id, 'เป็นอีเมลหน่วยงานที่ยินยอมให้เปิดเผย ไม่ใช่ข้อมูลบุคคล (ข้อมูลทดสอบ)');
      api.verifyEvidence(chair, done.id);
      const pend = await api.createEvidence(data, {
        ...base, title: EV.pending, kind: 'other', pdcaStage: 'C', extractedText: 'ผลเทียบเคียงอัตราการได้งานกับหลักสูตรคู่เทียบ 2 แห่ง (ฉบับร่าง)',
      });
      await api.addFileVersion(data, pend.id, { name: 'benchmark-2568-v2.txt', mime: 'text/plain', size: 64, text: 'ผลเทียบเคียงอัตราการได้งาน ฉบับแก้ไข เพิ่มคู่เทียบแห่งที่ 3' },
        'ผลเทียบเคียงอัตราการได้งาน ฉบับแก้ไข เพิ่มคู่เทียบแห่งที่ 3');
      await api.createEvidence(data, { programmeId: CS, academicYear: 2568, title: EV.unlinked, kind: 'photo', pdcaStage: 'D', extractedText: 'ภาพกิจกรรมสัมมนาวิชาการประจำปี' });
      const plo = load<Evidence>(KEYS.evidence).find(e => e.code === 'E-1.1-01' && e.status !== 'verified');
      if (plo) api.verifyEvidence(chair, plo.id);
    },
  },
  {
    info: {
      id: 'actions-edge', group: 'action', titleTh: 'แผนปรับปรุง: รอตรวจรับ / ถูกส่งกลับ / เลยกำหนด / ยืนยันแล้ว',
      descriptionTh: 'staff1 สร้างแผนของตนเอง 2 รายการ แล้วทำจนเสร็จ (รายการหนึ่งถูก chair1 ส่งกลับ done → in_progress) · chair1 มอบแผนที่เลยกำหนด 10 วันให้ lect1 · chair1 ยืนยันแผน act-5 ของ data1',
      accounts: [{ username: 'chair1', roleTh: 'ตรวจรับ/ส่งกลับ/มอบหมาย' }, { username: 'staff1', roleTh: 'ผู้รับผิดชอบ' }, { username: 'lect1', roleTh: 'ผู้รับผิดชอบงานเลยกำหนด' }, { username: 'data1', roleTh: 'ได้แจ้งเตือนยืนยันแล้ว' }],
      paths: ['/app/actions'],
      expectTh: [
        'รายการ "staff1 · ข้อ 1.5" สถานะเสร็จแล้ว รอ chair1 ยืนยัน (งาน "ตรวจรับแผนปรับปรุง")',
        'รายการ "staff1 · ข้อ 6.6" กลับเป็นกำลังทำ พร้อมหมายเหตุใน audit', 'รายการ lect1 · ข้อ 2.5 เลยกำหนด',
        'กระดิ่ง data1 มี "action item ข้อ 8.1 ได้รับการยืนยันแล้ว" · lect1 มี "คุณได้รับมอบหมาย action item ข้อ 2.5 …"',
      ],
    },
    run: async () => {
      if (load<ActionItem>(KEYS.actionItems).some(a => a.description.includes(TAG))) return;
      const chair = u('chair1'); const staff = u('staff1'); const lect = u('lect1');
      const a1 = api.createActionItem(staff, { programmeId: CS, requirementId: '1.5', ownerUserId: staff.id, due: isoPlusDays(30), kpi: 'มีมติที่ประชุม 1 ฉบับ', description: `จัดประชุมนำผลประเมิน PLO ไปปรับรายวิชา ${TAG}` });
      api.setActionStatus(staff, a1.id, 'in_progress');
      api.setActionStatus(staff, a1.id, 'done');
      const a2 = api.createActionItem(staff, { programmeId: CS, requirementId: '6.6', ownerUserId: staff.id, due: isoPlusDays(20), description: `ปรับช่องทางนัดหมายอาจารย์ที่ปรึกษาออนไลน์ ${TAG}` });
      api.setActionStatus(staff, a2.id, 'in_progress');
      api.setActionStatus(staff, a2.id, 'done');
      api.setActionStatus(chair, a2.id, 'in_progress', 'ยังไม่มีผลสำรวจหลังปรับช่องทาง โปรดแนบก่อนปิดงาน');
      api.createActionItem(chair, { programmeId: CS, requirementId: '2.5', ownerUserId: lect.id, due: isoPlusDays(-10), kpi: 'รายงาน 1 ฉบับ', description: `ทบทวนโครงสร้างรายวิชาเลือกกับผู้ใช้บัณฑิต ${TAG}` });
      const act5 = load<ActionItem>(KEYS.actionItems).find(a => a.id === 'act-5' && a.status === 'done');
      if (act5) api.setActionStatus(chair, act5.id, 'verified');
    },
  },
];
