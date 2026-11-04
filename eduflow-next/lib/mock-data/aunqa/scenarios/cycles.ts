/**
 * TASK-0003 S4 — รอบประเมินทุกสถานะ (หลักสูตร CS ปีย้อนหลัง 2559–2568 · รอบเดโม่ 2569 ยังเป็นรอบล่าสุด/ค่าเริ่มของทุกหน้า)
 * ทุกรอบเดินผ่าน API จริง: createCycle → transitionCycle → assignSections → saveSection → submitSection → approveSection
 *   → (fqa) faculty_approved → (dean) final_approved [lock + snapshot] → assignAssessor → under_assessment → ให้คะแนน/verdict → assessed → closed
 * เจ้าของข้อของรอบย้อนหลัง = staff2 (บัญชี scenario) เพื่อไม่ให้ "งานของฉัน" ของ staff1/lect1 รก
 * แจ้งเตือนของขั้นก่อนหน้า → อ่านแล้ว (markCycleNoticesRead) · แจ้งเตือนของขั้นล่าสุดยังไม่อ่าน (ให้เห็นที่กระดิ่ง)
 */
import * as api from '../../../api';
import { DEMO_NARRATIVES } from '../narratives';
import {
  CS, DEMO_CYCLE, allRequirementIds, cycleExists, ensureUser, markCycleNoticesRead, shortNarrative, staffOf, tick, u,
  type BuildTarget,
} from './helpers';
import type { ScenarioDef } from './types';

export const HISTORY_OWNER = 'staff2';
export const scnCycleId = (year: number) => `cycle-scn-cs-${year}`;

async function historyOwner() {
  return ensureUser(u('uadmin'), HISTORY_OWNER, 'อ.ทดสอบ รอบย้อนหลัง (สมมติ)', [staffOf(CS)]);
}

const selfScore = (rid: string) => DEMO_NARRATIVES.find(n => n.requirementId === rid)?.selfRating ?? 4;

/** เขียน + ส่งตรวจ + อนุมัติครบ 53 ข้อ (เจ้าของเขียน/ส่ง → ประธานอนุมัติ) */
function writeSubmitApproveAll(cycleId: string, year: number) {
  const chair = u('chair1'); const owner = u(HISTORY_OWNER);
  const ids = allRequirementIds();
  api.assignSections(chair, cycleId, ids, owner.id);
  for (const rid of ids) {
    api.saveSection(owner, cycleId, rid, { narrativeTh: shortNarrative(rid, year), pdca: { plan: true, do: true, check: true, act: true } }, 'manual');
    api.setSelfRating(owner, cycleId, rid, selfScore(rid), 'ประเมินตนเองจากผลการดำเนินงาน (ข้อมูลทดสอบ)');
    api.submitSection(owner, cycleId, rid);
    api.approveSection(chair, cycleId, rid);
  }
}

/** กรรมการให้คะแนนรายเกณฑ์ (criteria = เลขเกณฑ์) + finding บางข้อ + verdict (ถ้ากำหนด) */
function assessorWork(username: string, cycleId: string, criteria: number[], verdict?: number) {
  const a = u(username);
  for (const no of criteria) api.setCriterionRating(a, cycleId, no, no % 3 === 0 ? 3 : 4, `เกณฑ์ ${no}: มีหลักฐานเชิงระบบ (ข้อมูลทดสอบ)`);
  api.upsertFinding(a, cycleId, '1.1', {
    strengths: 'PLO ชัดเจนและเผยแพร่ครบช่องทาง (ข้อมูลทดสอบ)', afi: 'ควรเพิ่มการทบทวน PLO กับผู้ใช้บัณฑิตอย่างเป็นระบบ',
    interviewQuestions: 'หลักสูตรใช้ผลสำรวจผู้ใช้บัณฑิตปรับ PLO อย่างไร', sourcesOfEvidence: 'รายงานการประชุมหลักสูตร',
  });
  if (criteria.includes(3)) api.upsertFinding(a, cycleId, '3.6', { afi: 'ควรมีบันทึกการทบทวนการสอนหลังจบภาคเรียนทุกรายวิชา' });
  if (verdict !== undefined) api.setVerdict(a, cycleId, verdict, 'ผลการดำเนินงานเป็นไปตามเกณฑ์ (ข้อมูลทดสอบ)');
}

/**
 * สร้างรอบ CS ปี `year` แล้วเดินไปถึง `target` · idempotent (ถ้ามีรอบ id นี้แล้ว ไม่ทำซ้ำ)
 * คืน cycleId
 */
export async function buildCycle(year: number, target: BuildTarget, opts: { copyFrom?: string } = {}): Promise<string> {
  const id = scnCycleId(year);
  if (cycleExists(id)) return id;
  await historyOwner();
  const chair = u('chair1'); const fqa = u('fqa1'); const dean = u('dean1'); const uadmin = u('uadmin');
  const ce = year - 543; // ค.ศ. ของปีการศึกษา
  api.createCycle(chair, {
    id, programmeId: CS, academicYear: year, copyFromCycleId: opts.copyFrom,
    submissionDue: `${ce + 1}-05-31`, assessmentDate: `${ce + 1}-07-15`,
  });
  if (target === 'draft') {
    // รอบร่าง: มอบหมายเกณฑ์ 1 ไว้ล่วงหน้า (ข้อทั้งหมดยัง not_started เว้นแต่ copy มา)
    api.assignCriterion(chair, id, 1, u(HISTORY_OWNER).id);
    return id;
  }
  await api.transitionCycle(chair, id, 'in_progress', 'เริ่มรอบ (ข้อมูลทดสอบ)');
  writeSubmitApproveAll(id, year);
  if (target === 'in_progress') return finish(id);

  let last = await tick();
  await api.transitionCycle(chair, id, 'under_review');
  if (target === 'under_review') return finish(id, last);

  if (target === 'revision_requested') {
    last = await tick();
    await api.transitionCycle(fqa, id, 'revision_requested', 'ข้อ 1.1 และ 3.6 ยังขาดหลักฐานขั้น Check — โปรดเพิ่มผลการทบทวนแล้วส่งใหม่ (ข้อมูลทดสอบ)');
    return finish(id, last);
  }

  last = await tick();
  await api.transitionCycle(fqa, id, 'faculty_approved');
  if (target === 'faculty_approved') return finish(id, last);

  last = await tick();
  await api.transitionCycle(dean, id, 'final_approved');
  if (target === 'final_approved') return finish(id, last);

  if (target === 'revision_2') {
    // เปิด revision ใหม่หลัง lock (ไม่มีแจ้งเตือนตามระบบ) → ประธานส่งกลับ 2 ข้อ → เจ้าของแก้ 1.1 แล้วส่งใหม่ · 2.1 ยังรอแก้
    api.openRevision(dean, id, 'พบตัวเลขอัตราการสำเร็จการศึกษาไม่ตรงกับข้อมูลทะเบียน ต้องแก้ไขก่อนประเมิน (ข้อมูลทดสอบ)');
    last = await tick();
    const owner = u(HISTORY_OWNER);
    api.returnSection(chair, id, '1.1', 'แก้ตัวเลขให้ตรงข้อมูลทะเบียนปีล่าสุด (revision 2)');
    api.returnSection(chair, id, '2.1', 'เพิ่มผลเทียบเคียงกับหลักสูตรอื่น (revision 2)');
    api.saveSection(owner, id, '1.1', { narrativeTh: `${shortNarrative('1.1', year)} — ปรับตัวเลขตามข้อมูลทะเบียนแล้ว (revision 2)` }, 'manual');
    api.submitSection(owner, id, '1.1');
    return finish(id, last);
  }

  api.assignAssessor(fqa, id, u('assess1').id);
  if (target === 'under_assessment') api.assignAssessor(fqa, id, u('lect2').id); // หลาย role: อาจารย์ DS + กรรมการรอบนี้
  last = await tick();
  await api.transitionCycle(fqa, id, 'under_assessment');
  if (target === 'under_assessment') {
    assessorWork('assess1', id, [1, 2, 3, 4, 5, 6, 7, 8], 5);   // ครบ + verdict
    assessorWork('lect2', id, [1, 2, 3]);                     // ไม่ครบ (ขาด 5 เกณฑ์) + ไม่มี verdict → ปิดการประเมินไม่ได้
    return finish(id, last);
  }

  assessorWork('assess1', id, [1, 2, 3, 4, 5, 6, 7, 8], 5);
  last = await tick();
  await api.transitionCycle(u('assess1'), id, 'assessed');
  if (target === 'assessed') return finish(id, last);

  last = await tick();
  await api.transitionCycle(uadmin, id, 'closed');
  api.createActionsFromAfi(chair, id); // แผนปรับปรุงจาก AFI ของกรรมการ (ไม่มีผู้รับผิดชอบ → ไม่มีแจ้งเตือน)
  return finish(id, last);
}

function finish(id: string, keepFrom = Number.POSITIVE_INFINITY): string {
  markCycleNoticesRead(id, keepFrom);
  return id;
}

// ─────────────────────────── catalog ───────────────────────────
const ROOT = (y: number) => `/app/cycles/${scnCycleId(y)}`;

export const CYCLE_SCENARIOS: ScenarioDef[] = [
  {
    info: {
      id: 'cycle-closed', group: 'cycle', titleTh: 'รอบปิดแล้ว (2560) — เดินครบทุกขั้น',
      descriptionTh: 'รอบ 2560 ผ่านครบ: เขียน → ส่งตรวจ → อนุมัติ 53 ข้อ → QA คณะ → คณบดีล็อก → กรรมการประเมิน → ปิดรอบ แล้วสร้างแผนปรับปรุงจาก AFI',
      accounts: [{ username: 'chair1', roleTh: 'ประธาน — ดูประวัติ/ผลประเมิน' }, { username: 'uadmin', roleTh: 'ผู้ปิดรอบ' }, { username: 'assess1', roleTh: 'กรรมการ' }],
      paths: [ROOT(2560), `${ROOT(2560)}/assess`, '/app/actions'],
      expectTh: ['สถานะ "ปิดรอบแล้ว" แก้ไขอะไรไม่ได้', 'หน้าผลประเมินเห็นคะแนนรายเกณฑ์ + verdict ของ assess1', 'แผนปรับปรุงมีรายการจาก AFI ข้อ 1.1 และ 3.6 (ยังไม่มีผู้รับผิดชอบ)', 'ประวัติการอนุมัติ (review events) ครบทุกขั้น'],
    },
    run: async () => { await buildCycle(2560, 'closed'); },
  },
  {
    info: {
      id: 'cycle-assessed', group: 'cycle', titleTh: 'รอบประเมินเสร็จ รอปิดรอบ (2561)',
      descriptionTh: 'กรรมการ assess1 ให้คะแนนครบ 8 เกณฑ์ + verdict แล้วกด "เสร็จสิ้นการประเมิน" → รอผู้มีสิทธิ์ปิดรอบ',
      accounts: [{ username: 'uadmin', roleTh: 'ปิดรอบได้' }, { username: 'fqa1', roleTh: 'ปิดรอบได้ + ได้แจ้งเตือนผลประเมิน' }, { username: 'chair1', roleTh: 'ได้แจ้งเตือนผลประเมิน' }],
      paths: [ROOT(2561), `${ROOT(2561)}/assess`],
      expectTh: ['กระดิ่ง chair1/fqa1/uadmin มี "กรรมการส่งผลประเมินรอบ 2561 (CS-B-69) แล้ว" ยังไม่อ่าน', 'ปุ่ม "ปิดรอบ" ใช้ได้กับ uadmin/fqa1/chair1', 'งานที่ต้องทำมี "ปิดรอบ"'],
    },
    run: async () => { await buildCycle(2561, 'assessed'); },
  },
  {
    info: {
      id: 'cycle-under-assessment', group: 'cycle', titleTh: 'กำลังประเมิน — กรรมการให้คะแนนครบ 1 คน / ไม่ครบ 1 คน (2562)',
      descriptionTh: 'assess1 ให้คะแนนครบ + verdict แล้ว · lect2 (อาจารย์ DS ที่ได้รับมอบหมายเป็นกรรมการรอบนี้ = ผู้ใช้หลาย role) ให้คะแนนแค่เกณฑ์ 1–3 ไม่มี verdict',
      accounts: [{ username: 'assess1', roleTh: 'กรรมการ (ครบ)' }, { username: 'lect2', roleTh: 'อาจารย์ DS + กรรมการรอบนี้ (ไม่ครบ)' }, { username: 'fqa1', roleTh: 'QA คณะ' }],
      paths: [`${ROOT(2562)}/assess`],
      expectTh: ['assess1 กด "เสร็จสิ้นการประเมิน" ไม่ได้ ข้อความบอกว่ายังรอ lect2 (ขาด 5 เกณฑ์)', 'lect2 เห็นรอบนี้ในรายการรอบ (ฐานะกรรมการ) และเห็นงานของ DS ตามบทบาทเดิม', 'กระดิ่ง assess1/lect2 มี "รอบ 2562 (CS-B-69) เปิดให้ประเมินแล้ว"'],
    },
    run: async () => { await buildCycle(2562, 'under_assessment'); },
  },
  {
    info: {
      id: 'cycle-revision-2', group: 'cycle', titleTh: 'เปิด revision ใหม่หลังล็อก (2563, revision 2)',
      descriptionTh: 'คณบดีอนุมัติสุดท้าย (lock + snapshot r1) แล้วเปิด revision 2 → ประธานส่งกลับข้อ 1.1, 2.1 → เจ้าของแก้ 1.1 ส่งใหม่แล้ว · 2.1 ยังรอแก้',
      accounts: [{ username: 'chair1', roleTh: 'อนุมัติ 1.1 ได้ · รอ 2.1' }, { username: 'staff2', roleTh: 'เจ้าของข้อ — มีงานแก้ 2.1' }, { username: 'dean1', roleTh: 'ผู้เปิด revision' }],
      paths: [ROOT(2563), `/app/sections/${encodeURIComponent(`${scnCycleId(2563)}::2.1`)}`],
      expectTh: ['รอบแสดง revision 2 สถานะ "กำลังดำเนินการ" ไม่ล็อก', 'ประวัติมี "[revision 2] …" ของคณบดี', 'staff2 กระดิ่งมี "ข้อ 2.1 ถูกส่งกลับแก้: …" · chair1 มี "ข้อ 1.1 ส่งตรวจแล้ว"', 'หมายเหตุ: การเปิด revision เองไม่มีแจ้งเตือน (พฤติกรรมระบบปัจจุบัน)'],
    },
    run: async () => { await buildCycle(2563, 'revision_2'); },
  },
  {
    info: {
      id: 'cycle-final-approved', group: 'cycle', titleTh: 'อนุมัติสุดท้าย + ล็อกแล้ว (2564)',
      descriptionTh: 'คณบดีอนุมัติสุดท้าย → ล็อก + snapshot hash · รอ uadmin/fqa1 มอบหมายกรรมการและเริ่มประเมิน',
      accounts: [{ username: 'uadmin', roleTh: 'มอบหมายกรรมการ/เริ่มประเมิน' }, { username: 'fqa1', roleTh: 'มอบหมายกรรมการ/เริ่มประเมิน' }, { username: 'dean1', roleTh: 'เปิด revision ได้' }],
      paths: [ROOT(2564)],
      expectTh: ['ป้ายล็อก + ตรวจ integrity ผ่าน (hash ตรง)', 'แก้ข้อ/ผูกหลักฐานไม่ได้', 'กระดิ่ง uadmin/fqa1 มี "รอบ 2564 (CS-B-69) อนุมัติสุดท้ายและล็อกแล้ว"'],
    },
    run: async () => { await buildCycle(2564, 'final_approved'); },
  },
  {
    info: {
      id: 'cycle-faculty-approved', group: 'cycle', titleTh: 'QA คณะอนุมัติแล้ว รอคณบดี (2565)',
      descriptionTh: 'QA คณะอนุมัติ → รอคณบดี "อนุมัติสุดท้ายและล็อก" หรือ "ส่งกลับแก้ไข"',
      accounts: [{ username: 'dean1', roleTh: 'ผู้อนุมัติสุดท้าย' }, { username: 'chair1', roleTh: 'ดูสถานะ' }],
      paths: [ROOT(2565), '/app/review'],
      expectTh: ['กระดิ่ง dean1 มี "QA คณะอนุมัติรอบ 2565 (CS-B-69) แล้ว — รอคณบดีพิจารณาอนุมัติสุดท้าย"', 'หน้าหลัก dean1 มีงาน "อนุมัติสุดท้าย"'],
    },
    run: async () => { await buildCycle(2565, 'faculty_approved'); },
  },
  {
    info: {
      id: 'cycle-under-review', group: 'cycle', titleTh: 'ส่งให้ QA คณะตรวจแล้ว (2566)',
      descriptionTh: 'อนุมัติครบ 53 ข้อ → ประธานกด "ส่งให้ QA คณะตรวจ"',
      accounts: [{ username: 'fqa1', roleTh: 'ผู้ตรวจ (อนุมัติ/ส่งกลับ)' }, { username: 'staff2', roleTh: 'เจ้าของข้อ — ได้ข้อความ "ส่งให้ QA คณะตรวจ"' }],
      paths: [ROOT(2566), '/app/review'],
      expectTh: ['กระดิ่ง fqa1 มี "รอบประเมิน 2566 (CS-B-69) ส่งมาให้ QA คณะตรวจแล้ว — รอการพิจารณาของท่าน"', 'fqa1 ส่งกลับรายข้อได้ (ช่วง under_review)'],
    },
    run: async () => { await buildCycle(2566, 'under_review'); },
  },
  {
    info: {
      id: 'cycle-revision-requested', group: 'cycle', titleTh: 'QA คณะส่งรอบกลับแก้พร้อมเหตุผล (2567)',
      descriptionTh: 'fqa1 ส่งกลับระดับรอบพร้อมเหตุผล → ประธานต้องกด "กลับไปดำเนินการ" แล้วแก้',
      accounts: [{ username: 'chair1', roleTh: 'เห็นเหตุผล + ขั้นตอนต่อ' }, { username: 'staff2', roleTh: 'เห็นเหตุผล' }],
      paths: [ROOT(2567)],
      expectTh: ['หน้ารอบแสดงเหตุผลส่งกลับ (ผู้ส่ง + ข้อความ)', 'กระดิ่ง chair1/staff2 มี "รอบ 2567 ถูกส่งกลับแก้ (โดย ดร.กมล ประกันคุณภาพ): …"'],
    },
    run: async () => { await buildCycle(2567, 'revision_requested'); },
  },
  {
    info: {
      id: 'cycle-draft', group: 'cycle', titleTh: 'รอบร่าง ยังไม่เริ่ม — ข้อทั้งหมด "ยังไม่เริ่ม" (2568)',
      descriptionTh: 'สร้างรอบแล้วแต่ยังไม่กด "เริ่ม" · มอบหมายเกณฑ์ 1 ให้ staff2 ไว้ล่วงหน้า · ข้อทุกข้อสถานะ not_started',
      accounts: [{ username: 'chair1', roleTh: 'เริ่มรอบ/มอบหมาย' }],
      paths: [ROOT(2568), `${ROOT(2568)}/assign`],
      expectTh: ['สถานะ "ร่าง" มีปุ่ม "เริ่ม/กลับไปดำเนินการ"', 'ข้อทั้งหมดแสดง "ยังไม่เริ่ม"', 'งานที่ต้องทำของ chair1 มี "เริ่มรอบ"'],
    },
    run: async () => { await buildCycle(2568, 'draft'); },
  },
  {
    info: {
      id: 'cycle-copied', group: 'cycle', titleTh: 'รอบที่คัดลอกร่างจากรอบก่อน (2559 ← 2569)',
      descriptionTh: 'สร้างรอบด้วย "คัดลอกจากรอบก่อน" (copyFromCycleId = รอบเดโม่ 2569): narrative + ลิงก์หลักฐาน + เจ้าของข้อถูกยกมา ข้อที่มีเนื้อหาเป็น "กำลังเขียน" · แผนปรับปรุงที่เสร็จแล้วกลายเป็นหลักฐานขั้น Act (ถ้ายังไม่เคยถูกใช้)',
      accounts: [{ username: 'chair1', roleTh: 'ดูผลการคัดลอก' }],
      paths: [`/app/cycles/${scnCycleId(2559)}`],
      expectTh: ['ข้อทุกข้อมีเนื้อหา สถานะ "กำลังเขียน" (ไม่ copy ผู้เขียนล่าสุด → ประธานอนุมัติได้หลังส่ง)', 'หลักฐานเดิมผูกกับรอบนี้ด้วย (ต้นฉบับไม่ถูกแก้)'],
    },
    run: async () => { await buildCycle(2559, 'draft', { copyFrom: DEMO_CYCLE }); },
  },
];
