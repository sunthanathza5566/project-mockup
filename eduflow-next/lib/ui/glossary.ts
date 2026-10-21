/**
 * พจนานุกรมศัพท์สำหรับปุ่ม (?) — ADR-UI-001 components.md C17
 * ใช้กับ `<Term k="pdca">PDCA</Term>` · คำอธิบาย 1–3 ประโยคภาษาง่าย
 * ชื่อกฎ R1–R11 ตรงกับ `lib/api/gap.ts`
 */

export interface GlossaryEntry { titleTh: string; bodyTh: string; bodyEn: string }

const RULES: Record<string, [string, string, string]> = {
  R1: ['R1 ยังไม่มีหลักฐาน', 'ข้อนี้ยังไม่มีหลักฐานผูกเลย (ระดับวิกฤต)', 'R1 No evidence: this item has no linked evidence yet (critical).'],
  R2: ['R2 ขาดขั้น Check/Act', 'มีหลักฐานแล้ว แต่ยังไม่มีหลักฐานขั้นตรวจสอบ (C) หรือขั้นปรับปรุง (A) ของวงจร PDCA', 'R2 Missing Check/Act: evidence exists but none covers the Check or Act stage of PDCA.'],
  R3: ['R3 ข้อมูลแนวโน้มไม่ครบ', 'ตัวชี้วัดที่ข้อนี้ต้องใช้มีข้อมูลน้อยกว่า 3 ปี จึงยังแสดงแนวโน้มไม่ได้', 'R3 Trend data too short: a required metric has fewer than 3 years of data.'],
  R4: ['R4 เนื้อหาสั้นหรือว่าง', 'เนื้อหา SAR ของข้อนี้ว่าง หรือสั้นกว่า 100 คำ', 'R4 Narrative too short: the SAR text is empty or under 100 words.'],
  R5: ['R5 หลักฐานเก่า', 'หลักฐานที่ผูกไว้เก่ากว่า 3 ปีนับจากปีของรอบประเมิน', 'R5 Outdated evidence: linked evidence is older than 3 years.'],
  R6: ['R6 ข้อมูลส่วนบุคคลค้าง', 'หลักฐานที่ผูกไว้มีข้อมูลส่วนบุคคลที่ยังไม่ได้จัดการ', 'R6 Unresolved personal data: linked evidence contains personal data that has not been handled.'],
  R7: ['R7 ข้อมูลหลักสูตรไม่สอดคล้อง', 'ผัง PLO–รายวิชา–การวัดผลยังมีช่องว่าง เช่น PLO ที่ไม่มีวิชารับผิดชอบ', 'R7 Curriculum mapping gap: e.g. a PLO with no responsible course or assessment.'],
  R8: ['R8 ยังไม่มีการเทียบเคียง', 'ข้อนี้ต้องมีข้อมูลเทียบเคียง (benchmark) แต่ยังไม่มี', 'R8 No benchmark: this item needs comparison data but none is recorded.'],
  R9: ['R9 ประโยคไม่อ้างหลักฐาน', 'มีประโยคในเนื้อหาที่ไม่ได้อ้างรหัสหลักฐาน [E-…]', 'R9 Uncited sentences: some sentences do not cite an evidence code [E-…].'],
  R10: ['R10 คะแนนสูงแต่หลักฐานไม่ครบ', 'ให้คะแนนตนเองตั้งแต่ 4 ขึ้นไป แต่ข้อนี้ยังขาดหลักฐานหรือขั้น Check/Act', 'R10 Rating above evidence: self-rating is 4 or higher while evidence or Check/Act is missing.'],
  R11: ['R11 คำแปลยังไม่ได้ยืนยัน', 'เนื้อหามาจากคำแปลอัตโนมัติแบบแทนศัพท์ และผู้เขียนยังไม่ได้ยืนยันว่าตรวจแล้ว', 'R11 Translation not confirmed: text came from automatic term-substitution translation and has not been confirmed by the author.'],
};

export const GLOSSARY: Record<string, GlossaryEntry> = {
  sar: {
    titleTh: 'SAR',
    bodyTh: 'รายงานการประเมินตนเอง (Self-Assessment Report) ที่หลักสูตรเขียนตามเกณฑ์ AUN-QA ครบ 8 เกณฑ์ 53 ข้อ เพื่อให้กรรมการอ่านก่อนประเมิน',
    bodyEn: 'Self-Assessment Report: the programme’s report against all 8 AUN-QA criteria (53 items), read by assessors before the visit.',
  },
  pdca: {
    titleTh: 'PDCA',
    bodyTh: 'วงจรพัฒนางาน 4 ขั้น: P วางแผน · D ดำเนินการ · C ตรวจสอบ · A ปรับปรุง หลักฐานที่ดีควรครอบคลุมครบทั้งสี่ขั้น',
    bodyEn: 'Plan–Do–Check–Act improvement cycle. Good evidence covers all four stages.',
  },
  offline: {
    titleTh: 'โหมดในเครื่อง (offline)',
    bodyTh: 'ระบบช่วยด้วยกฎที่อยู่ในเครื่อง ไม่ส่งข้อมูลออกไปภายนอก ผลจึงเป็นโครงร่างหรือคำแนะนำพื้นฐาน ไม่ใช่ข้อความฉบับเต็ม',
    bodyEn: 'Local mode: the assistant uses built-in rules and sends nothing outside, so results are outlines or basic suggestions.',
  },
  redaction: {
    titleTh: 'ปกปิดข้อมูลส่วนบุคคล',
    bodyTh: 'ก่อนส่งข้อความให้ AI ระบบจะแทนข้อมูลส่วนบุคคล เช่น เลขบัตรประชาชน อีเมล เบอร์โทร ด้วยเครื่องหมายแทน',
    bodyEn: 'Before text is sent to AI, personal data such as ID numbers, emails and phone numbers is replaced with placeholders.',
  },
  append_replace: {
    titleTh: 'ต่อท้าย / แทนที่',
    bodyTh: '“ต่อท้ายข้อความเดิม” จะเพิ่มร่างไว้ท้ายเนื้อหาที่มีอยู่ · “แทนที่ทั้งหมด” จะลบเนื้อหาเดิมแล้วใส่ร่างแทน (กู้คืนได้จากแท็บประวัติ)',
    bodyEn: '“Append” adds the draft after existing text. “Replace all” swaps the existing text for the draft (restorable from History).',
  },
  tagged: {
    titleTh: 'AI แนะนำข้อแล้ว',
    bodyTh: 'AI อ่านหลักฐานแล้วเสนอว่าเกี่ยวกับข้อใด ผู้ใช้ต้องตรวจและยืนยันเองก่อนผูกจริง',
    bodyEn: 'AI has suggested which items this evidence relates to. A person must review and confirm before linking.',
  },
  readiness: {
    titleTh: 'ความพร้อมด้านหลักฐาน',
    bodyTh: 'คะแนนต่อข้อตามสถานะ (อนุมัติ 100 · รอตรวจ 90 · กำลังเขียน 50 · ส่งกลับ 40 · ยังไม่เริ่ม 0) หักตามช่องว่างที่พบ แล้วเฉลี่ยทั้ง 53 ข้อ',
    bodyEn: 'Per-item score by status (approved 100, in review 90, drafting 50, returned 40, not started 0), reduced by open gaps, averaged over 53 items.',
  },
  revision: {
    titleTh: 'revision',
    bodyTh: 'ครั้งที่ของรอบประเมิน เมื่อรอบถูกส่งกลับแก้ไขหลังล็อกแล้ว ระบบจะเปิด revision ใหม่และเก็บฉบับเดิมไว้',
    bodyEn: 'Revision number of the cycle. Reopening a locked cycle starts a new revision and keeps the previous one.',
  },
  hash: {
    titleTh: 'hash (ลายนิ้วมือเอกสาร)',
    bodyTh: 'รหัสที่คำนวณจากเนื้อหาไฟล์หรือ SAR ถ้าเนื้อหาเปลี่ยนแม้ตัวอักษรเดียว รหัสจะเปลี่ยน จึงใช้ตรวจว่าเอกสารตรงกับฉบับที่ล็อก',
    bodyEn: 'A fingerprint computed from the content. Any change alters it, so it proves the document matches the locked version.',
  },
  verdict: {
    titleTh: 'verdict',
    bodyTh: 'ผลสรุปการประเมินภาพรวมของกรรมการ (คะแนน 1–7 พร้อมเหตุผล) บันทึกหลังให้คะแนนครบ 8 เกณฑ์',
    bodyEn: 'The assessors’ overall judgement (score 1–7 with rationale), recorded after all 8 criteria are rated.',
  },
  appendix_a: {
    titleTh: 'Appendix A',
    bodyTh: 'ตารางสรุปคะแนนประเมินตนเองรายข้อของหลักสูตร ส่งแนบไปกับ SAR',
    bodyEn: 'Table of the programme’s self-ratings per item, attached to the SAR.',
  },
  appendix_b: {
    titleTh: 'Appendix B',
    bodyTh: 'แบบบันทึกคะแนนของกรรมการรายเกณฑ์ พร้อมเหตุผล',
    bodyEn: 'Assessors’ rating sheet per criterion with rationale.',
  },
  appendix_d: {
    titleTh: 'Appendix D',
    bodyTh: 'สรุปจุดแข็งและข้อเสนอแนะเพื่อการปรับปรุง (AFI) ของกรรมการ',
    bodyEn: 'Assessors’ summary of strengths and areas for improvement (AFI).',
  },
  benchmark: {
    titleTh: 'benchmark (การเทียบเคียง)',
    bodyTh: 'ข้อมูลของสถาบันหรือหลักสูตรอื่นที่ใช้เปรียบเทียบผลของเรา เช่น อัตราการได้งานทำ',
    bodyEn: 'Comparable data from other institutions or programmes, e.g. employment rate.',
  },
  plo: {
    titleTh: 'PLO',
    bodyTh: 'ผลลัพธ์การเรียนรู้ระดับหลักสูตร (Programme Learning Outcome) สิ่งที่บัณฑิตทุกคนต้องทำได้เมื่อจบ',
    bodyEn: 'Programme Learning Outcome: what every graduate must be able to do.',
  },
  clo: {
    titleTh: 'CLO',
    bodyTh: 'ผลลัพธ์การเรียนรู้ระดับรายวิชา (Course Learning Outcome) ซึ่งต้องผูกกับ PLO',
    bodyEn: 'Course Learning Outcome, which must map to PLOs.',
  },
  irm: {
    titleTh: 'I / R / M',
    bodyTh: 'ระดับที่รายวิชาส่งเสริม PLO: I แนะนำ · R ฝึกซ้ำ · M เชี่ยวชาญ',
    bodyEn: 'How a course supports a PLO: I Introduce, R Reinforce, M Master.',
  },
  bloom: {
    titleTh: 'Bloom’s Taxonomy',
    bodyTh: 'ลำดับระดับการเรียนรู้ 6 ขั้น จากจำ เข้าใจ ประยุกต์ วิเคราะห์ ประเมินค่า ถึงสร้างสรรค์ ใช้ดูว่าคำกริยาใน CLO อยู่ระดับใด',
    bodyEn: 'Six levels of learning from Remember to Create, used to check the verb level of a CLO.',
  },
  self_rating: {
    titleTh: 'คะแนนประเมินตนเอง (1–7)',
    bodyTh: '1 ไม่เพียงพออย่างยิ่ง · 2 ไม่เพียงพอ ต้องปรับปรุง · 3 ยังไม่เพียงพอแต่ปรับเล็กน้อยก็พอ · 4 เพียงพอตามที่คาดหวัง · 5 ดีกว่าเพียงพอ · 6 เป็นแบบอย่างที่ดี · 7 ยอดเยี่ยมระดับโลก',
    bodyEn: '1 Absolutely inadequate · 2 Inadequate, improvement necessary · 3 Inadequate, minor improvement needed · 4 Adequate as expected · 5 Better than adequate · 6 Example of best practices · 7 Excellent (world-class).',
  },
  pii: {
    titleTh: 'PII (ข้อมูลส่วนบุคคล)',
    bodyTh: 'ข้อมูลที่ระบุตัวบุคคลได้ เช่น เลขบัตรประชาชน ชื่อ-สกุล อีเมล เบอร์โทร ต้องปกปิดหรือจัดการก่อนเผยแพร่ตาม PDPA',
    bodyEn: 'Personally identifiable information such as ID numbers, names, emails and phone numbers. It must be handled before publishing (PDPA).',
  },
  evidence_code: {
    titleTh: 'รหัสหลักฐาน',
    bodyTh: 'รูปแบบ E-ข้อ-ลำดับ เช่น E-1.1-01 ใช้อ้างใน SAR · E-0.0-nn คือหลักฐานที่ยังไม่ได้ผูกข้อตอนสร้าง',
    bodyEn: 'Format E-item-number, e.g. E-1.1-01, used for citations. E-0.0-nn means it was not linked to an item when created.',
  },
  segregation: {
    titleTh: 'แยกหน้าที่ผู้เขียนกับผู้อนุมัติ',
    bodyTh: 'ผู้ที่เขียนข้อล่าสุดอนุมัติข้อนั้นเองไม่ได้ ต้องให้ผู้อื่นตรวจและอนุมัติ',
    bodyEn: 'The latest author of an item cannot approve it; someone else must review and approve.',
  },
  ...Object.fromEntries(Object.entries(RULES).map(([id, [t, th, en]]) => [`gap_rule_${id}`, { titleTh: t, bodyTh: th, bodyEn: en }])),
};

/** รายการกฎ R1–R11 ตามลำดับ (ใช้ใน popover "กฎ R1–R11 คืออะไร") */
export const GAP_RULE_KEYS = Object.keys(RULES).map(id => `gap_rule_${id}`);
