/**
 * TASK-0003 S4 — เคสรายข้อในรอบเดโม่ 2569 (cycle-demo-2569, in_progress) — ผ่าน API จริงทั้งหมด
 * แต่ละเคสใช้ข้อคนละชุด จึงโหลดรวมกันได้ (ข้อ 3.6 สงวนไว้ให้ staff1 เล่นเส้นทางมาตรฐาน: เขียน → ส่งตรวจ → ประธานได้แจ้งเตือน)
 */
import * as api from '../../../api';
import { KEYS, load } from '../../../api/db';
import type { AppNotification, SarSection } from '../../../types';
import { DEMO_CYCLE, isoPlusDays, u } from './helpers';
import type { ScenarioDef } from './types';

const sec = (rid: string) => load<SarSection>(KEYS.sections).find(s => s.id === `${DEMO_CYCLE}::${rid}`)!;
const SEC = (rid: string) => `/app/sections/${encodeURIComponent(`${DEMO_CYCLE}::${rid}`)}`;

/** ส่งกลับข้อที่อนุมัติแล้ว/รอตรวจ ถ้ายังไม่ถูกส่งกลับ (idempotent) */
function returnIfNeeded(rid: string, note: string) {
  const s = sec(rid);
  if (s.status === 'approved' || s.status === 'ready_for_review') api.returnSection(u('chair1'), DEMO_CYCLE, rid, note);
}

export const SECTION_SCENARIOS: ScenarioDef[] = [
  {
    info: {
      id: 'sec-returned', group: 'section', titleTh: 'ข้อถูกส่งกลับแก้พร้อมเหตุผล (1.5)',
      descriptionTh: 'ข้อ 1.5 (staff1 เป็นเจ้าของ, รอตรวจ) → chair1 กด "ส่งกลับแก้ไข" พร้อมเหตุผล',
      accounts: [{ username: 'staff1', roleTh: 'เจ้าของข้อ — ต้องแก้' }, { username: 'chair1', roleTh: 'ผู้ส่งกลับ' }],
      paths: [SEC('1.5'), '/app'],
      expectTh: ['กระดิ่ง staff1: "ข้อ 1.5 ถูกส่งกลับแก้: …" กดแล้วไปหน้าข้อ 1.5', 'หน้าหลัก staff1 มีงาน "แก้ข้อ 1.5" (เร่งด่วน) พร้อมเหตุผล', 'หน้า 1.5 แก้ไขได้อีกครั้ง → ส่งตรวจใหม่ → chair1 ได้แจ้งเตือน'],
    },
    run: async () => { returnIfNeeded('1.5', 'ยังขาดหลักฐานการนำผลประเมิน PLO ไปปรับปรุง (ขั้น Act) — แนบรายงานการประชุมที่มีมติ'); },
  },
  {
    info: {
      id: 'sec-approved-reopened', group: 'section', titleTh: 'ข้อที่อนุมัติแล้วถูกส่งกลับ (1.2)',
      descriptionTh: 'ข้อ 1.2 อนุมัติแล้ว → ประธานพบข้อผิดพลาด จึงส่งกลับ (approved → changes_requested)',
      accounts: [{ username: 'staff1', roleTh: 'เจ้าของข้อ' }, { username: 'chair1', roleTh: 'ผู้ส่งกลับ' }],
      paths: [SEC('1.2')],
      expectTh: ['สถานะ 1.2 = "ส่งกลับแก้" · ความคืบหน้ารอบลดจาก 45 เป็น 44 อนุมัติ', 'ประวัติข้อแสดง approved → changes_requested พร้อมเหตุผล'],
    },
    run: async () => { returnIfNeeded('1.2', 'ตัวเลขผู้สำเร็จการศึกษาไม่ตรงกับตัวชี้วัด ปี 2568 โปรดตรวจทาน'); },
  },
  {
    info: {
      id: 'sec-self-written', group: 'section', titleTh: 'ประธานเขียนเอง → อนุมัติเองไม่ได้ (5.1)',
      descriptionTh: 'chair1 เขียนข้อ 5.1 เองแล้วกดส่งตรวจ → ไม่มีใครได้แจ้งเตือน (ประธานคนเดียว) และอนุมัติเองไม่ได้ตามกฎแยกหน้าที่',
      accounts: [{ username: 'chair1', roleTh: 'ผู้เขียนล่าสุด = ผู้อนุมัติ' }],
      paths: [SEC('5.1'), '/app/review'],
      expectTh: ['คิวรอตรวจแสดง 5.1 ว่า "คุณเขียนเอง" ไม่มีปุ่มอนุมัติ', 'งาน "ตรวจและอนุมัติ" มีหมายเหตุ "อีก 1 ข้อคุณเขียนเอง ต้องให้ผู้อื่นอนุมัติ"', 'ทางออก: ส่งกลับแก้ → มอบหมายให้อาจารย์เขียน → ส่งใหม่'],
    },
    run: async () => {
      const s = sec('5.1');
      if (s.status !== 'drafting') return;
      const chair = u('chair1');
      api.saveSection(chair, DEMO_CYCLE, '5.1', { narrativeTh: `${s.narrativeTh}\n\nปรับแผนอัตรากำลังเพิ่มเติมโดยประธานหลักสูตร (ข้อมูลทดสอบ)` }, 'manual');
      api.submitSection(chair, DEMO_CYCLE, '5.1');
    },
  },
  {
    info: {
      id: 'sec-comments', group: 'section', titleTh: 'ความเห็น (comment) ตอบกลับแล้วปิด + thread ที่ยังเปิด (1.3, 1.4)',
      descriptionTh: 'ข้อ 1.4: chair1 ตั้งความเห็น → staff1 (เจ้าของ) ตอบ → chair1 ปิด thread · ข้อ 1.3: dean1 ตั้งความเห็นที่ยังไม่ปิด',
      accounts: [{ username: 'staff1', roleTh: 'เจ้าของข้อ — ได้แจ้งเตือนความเห็น' }, { username: 'chair1', roleTh: 'ผู้ตั้ง/ปิด' }, { username: 'dean1', roleTh: 'ผู้ตั้งความเห็นที่ยังเปิด' }],
      paths: [`${SEC('1.4')}#comments`, `${SEC('1.3')}#comments`],
      expectTh: ['1.4 มี thread ที่ปิดแล้ว (มีคำตอบของ staff1)', '1.3 มี thread เปิดจากคณบดี', 'กระดิ่ง staff1 มี "มีความเห็นใหม่ที่ข้อ 1.4" และ "…ข้อ 1.3"'],
    },
    run: async () => {
      if (api.listComments(u('chair1'), DEMO_CYCLE, '1.4').length) return;
      const chair = u('chair1'); const staff = u('staff1');
      const root = api.addComment(chair, DEMO_CYCLE, '1.4', 'ช่วยระบุวันที่ประชุมทบทวนหลักสูตรให้ชัดเจนในย่อหน้าที่ 2');
      api.addComment(staff, DEMO_CYCLE, '1.4', 'เพิ่มวันที่ประชุม 12 ก.ย. 2568 ในหลักฐาน E-1.4-02 แล้วค่ะ', { parentId: root.id });
      api.resolveComment(chair, root.id);
      api.addComment(u('dean1'), DEMO_CYCLE, '1.3', 'ควรเพิ่มข้อมูลเปรียบเทียบกับหลักสูตรคู่เทียบอย่างน้อย 1 แห่ง');
    },
  },
  {
    info: {
      id: 'sec-translation', group: 'section', titleTh: 'ข้อที่ต้องตรวจคำแปล (7.9 → lect1)',
      descriptionTh: 'chair1 มอบข้อ 7.9 ให้ lect1 → lect1 ใส่ฉบับภาษาอังกฤษที่ได้จากการแปลแบบ offline และติดธง "ต้องตรวจคำแปล (EN)"',
      accounts: [{ username: 'lect1', roleTh: 'เจ้าของข้อ' }],
      paths: [SEC('7.9'), '/app'],
      expectTh: ['หน้าหลัก lect1 มีงาน "ตรวจคำแปล" ข้อ 7.9', 'ช่องว่าง (gap) R11 "คำแปลยังไม่ได้ยืนยัน" ที่ข้อ 7.9', 'กด "ยืนยันคำแปล" แล้วธง/งานหายไป'],
    },
    run: async () => {
      const s = sec('7.9');
      if (s.needsTranslationReview?.en || s.status !== 'drafting') return;
      const lect = u('lect1');
      api.assignSections(u('chair1'), DEMO_CYCLE, ['7.9'], lect.id);
      api.saveSection(lect, DEMO_CYCLE, '7.9', {
        narrativeEn: 'The programme benchmarks graduate outcomes with two peer programmes every year (offline machine translation — needs review).',
        needsTranslationReview: { en: true },
      }, 'manual');
    },
  },
  {
    info: {
      id: 'deadlines', group: 'section', titleTh: 'กำหนดส่ง: เลยกำหนด / ไม่เกิน 1 / 3 / 7 วัน (2.1–2.4 → lect1)',
      descriptionTh: 'chair1 ส่งกลับข้อ 2.1–2.4 (เคยอนุมัติแล้ว) และมอบหมายให้ lect1 พร้อมกำหนดส่ง −2, 0 (วันนี้), +2, +6 วันจากวันที่โหลด → ตกช่วงแจ้งเตือน เลยกำหนด / ≤1 / ≤3 / ≤7 วัน (ระบบนับถึง 23:59 ของวันครบกำหนด)',
      accounts: [{ username: 'lect1', roleTh: 'เจ้าของข้อที่ใกล้/เลยกำหนด' }],
      paths: ['/app', '/app#mywork'],
      expectTh: ['กระดิ่ง lect1 (เมื่อเปิด) มีแจ้งเตือน deadline 4 รายการ: เลยกำหนด / ไม่เกิน 1 / 3 / 7 วัน', 'งานที่ต้องทำเรียงเร่งด่วนก่อน: "เลยกำหนด 2 วัน" ขึ้นบนสุด', 'แจ้งเตือน deadline สร้างตอนเปิดกระดิ่ง (คำนวณตอนโหลด) และไม่ซ้ำเมื่อเปิดอีก'],
    },
    run: async () => {
      const chair = u('chair1'); const lect = u('lect1');
      const plan: [string, number][] = [['2.1', -2], ['2.2', 0], ['2.3', 2], ['2.4', 6]];
      for (const [rid, d] of plan) {
        returnIfNeeded(rid, 'ปรับเนื้อหาให้ตรงข้อมูลปีล่าสุด แล้วส่งภายในกำหนด');
        if (sec(rid).ownerUserId !== lect.id) api.assignSections(chair, DEMO_CYCLE, [rid], lect.id, isoPlusDays(d));
      }
    },
  },
  {
    info: {
      id: 'bell-overflow', group: 'notification', titleTh: 'แจ้งเตือนเกิน 30 รายการ อ่าน/ยังไม่อ่านปนกัน (lect1)',
      descriptionTh: 'chair1 มอบข้อ 4.1 (อนุมัติแล้ว) ให้ lect1 แล้วตั้งความเห็น 35 ครั้ง → lect1 ได้แจ้งเตือน 36 รายการ อ่านแล้ว 20 ที่เก่าที่สุด',
      accounts: [{ username: 'lect1', roleTh: 'ผู้รับแจ้งเตือนจำนวนมาก' }],
      paths: ['/app'],
      expectTh: ['panel กระดิ่งแสดง 30 รายการล่าสุด ตัวนับ "ยังไม่อ่าน" ≥ 16', 'รายการที่อ่านแล้วไม่ตัวหนา ไม่มีป้าย "ใหม่"', '"อ่านทั้งหมด" ทำให้ตัวนับเป็น 0'],
    },
    run: async () => {
      const chair = u('chair1'); const lect = u('lect1');
      if (sec('4.1').ownerUserId === lect.id) return;
      api.assignSections(chair, DEMO_CYCLE, ['4.1'], lect.id);
      for (let i = 1; i <= 35; i++) api.addComment(chair, DEMO_CYCLE, '4.1', `ความเห็นรอบที่ ${i}: ตรวจตาราง CLO รายวิชาที่ ${i} (ข้อมูลทดสอบ)`);
      const mine = load<AppNotification>(KEYS.notifications).filter(n => n.userId === lect.id).sort((a, b) => a.createdAt - b.createdAt);
      mine.slice(0, 20).forEach(n => api.markRead(lect, n.id));
    },
  },
];
