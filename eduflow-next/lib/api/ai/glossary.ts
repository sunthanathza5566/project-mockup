/**
 * Glossary ศัพท์ AUN-QA มาตรฐาน TH↔EN (AI-4) — pure, ไม่ import store
 * ใช้ 2 ทาง: (1) offline provider แทนศัพท์ตรง ๆ  (2) ส่งชุดย่อยที่พบในข้อความให้ Claude ใช้เป็นศัพท์บังคับ
 * ที่มา: ศัพท์จาก AUN-QA Guide to AUN-QA Assessment at Programme Level v4.0 + คำไทยที่ใช้ใน mock-data/framework ของระบบ
 * [ต้องตรวจสอบกับคู่มือสถาบัน] คำไทยบางคำมหาวิทยาลัยใช้ต่างกัน — แก้ได้ที่ตารางนี้ที่เดียว
 */
export interface GlossaryEntry {
  th: string;
  en: string;
  /** รูปอื่นที่ควรจับได้ตอนแปลจากไทย→อังกฤษ */
  thAlt?: string[];
  /** รูปอื่นที่ควรจับได้ตอนแปลจากอังกฤษ→ไทย (รวมตัวย่อ) */
  enAlt?: string[];
}

export const AUNQA_GLOSSARY: GlossaryEntry[] = [
  { th: 'ผลลัพธ์การเรียนรู้ที่คาดหวัง', en: 'expected learning outcomes (ELO)', thAlt: ['ผลลัพธ์การเรียนรู้ที่คาดหวังของหลักสูตร'], enAlt: ['ELO', 'ELOs', 'expected learning outcome', 'expected learning outcomes'] },
  { th: 'ผลลัพธ์การเรียนรู้ระดับหลักสูตร', en: 'programme learning outcomes (PLO)', enAlt: ['PLO', 'PLOs', 'programme learning outcomes', 'programme learning outcome'] },
  { th: 'ผลลัพธ์การเรียนรู้ระดับรายวิชา', en: 'course learning outcomes (CLO)', enAlt: ['CLO', 'CLOs', 'course learning outcomes', 'course learning outcome'] },
  { th: 'การเชื่อมโยงสอดคล้องของการเรียนการสอนกับผลลัพธ์', en: 'constructive alignment', thAlt: ['การจัดการเรียนการสอนที่สอดคล้องกับผลลัพธ์'], enAlt: ['constructive alignment'] },
  { th: 'ผู้มีส่วนได้ส่วนเสีย', en: 'stakeholders', thAlt: ['ผู้มีส่วนได้เสีย'], enAlt: ['stakeholder', 'stakeholders'] },
  { th: 'การเทียบเคียง', en: 'benchmarking', thAlt: ['การเปรียบเทียบสมรรถนะ'], enAlt: ['benchmarking', 'benchmark'] },
  { th: 'ข้อเสนอแนะเพื่อการปรับปรุง', en: 'areas for improvement (AFI)', thAlt: ['ประเด็นที่ควรปรับปรุง'], enAlt: ['AFI', 'AFIs', 'areas for improvement', 'area for improvement'] },
  { th: 'วงจรเดมมิ่ง', en: 'PDCA cycle (Plan-Do-Check-Act)', thAlt: ['วงจร PDCA'], enAlt: ['PDCA cycle', 'PDCA', 'Plan-Do-Check-Act'] },
  { th: 'รายงานการประเมินตนเอง', en: 'Self-Assessment Report (SAR)', enAlt: ['SAR', 'self-assessment report', 'Self-Assessment Report'] },
  { th: 'การประเมินตนเอง', en: 'self-assessment', enAlt: ['self-assessment'] },
  { th: 'การประกันคุณภาพการศึกษา', en: 'quality assurance (QA)', enAlt: ['quality assurance', 'QA'] },
  { th: 'การประกันคุณภาพภายใน', en: 'internal quality assurance (IQA)', enAlt: ['internal quality assurance', 'IQA'] },
  { th: 'การประกันคุณภาพภายนอก', en: 'external quality assurance (EQA)', enAlt: ['external quality assurance', 'EQA'] },
  { th: 'การเรียนรู้ตลอดชีวิต', en: 'lifelong learning', enAlt: ['lifelong learning', 'life-long learning'] },
  { th: 'การเรียนรู้โดยใช้ผู้เรียนเป็นศูนย์กลาง', en: 'student-centred learning', thAlt: ['การเรียนการสอนที่เน้นผู้เรียนเป็นสำคัญ'], enAlt: ['student-centred learning', 'student-centered learning', 'student centred learning'] },
  { th: 'การเรียนรู้เชิงรุก', en: 'active learning', enAlt: ['active learning'] },
  { th: 'การวัดและประเมินผลการเรียนรู้', en: 'student assessment', thAlt: ['การประเมินผลผู้เรียน'], enAlt: ['student assessment', 'assessment of students'] },
  { th: 'การประเมินผลเชิงพัฒนา', en: 'formative assessment', enAlt: ['formative assessment'] },
  { th: 'การประเมินผลสรุป', en: 'summative assessment', enAlt: ['summative assessment'] },
  { th: 'เกณฑ์การประเมิน', en: 'assessment criteria', thAlt: ['เกณฑ์การวัดผล'], enAlt: ['assessment criteria'] },
  { th: 'แผนการรับนักศึกษา', en: 'student intake plan', enAlt: ['student intake plan', 'intake plan'] },
  { th: 'การรับนักศึกษา', en: 'student admission', enAlt: ['student admission', 'admission'] },
  { th: 'การติดตามความก้าวหน้าของนักศึกษา', en: 'student progress monitoring', enAlt: ['student progress monitoring', 'progress monitoring'] },
  { th: 'อัตราการสำเร็จการศึกษา', en: 'graduation rate', thAlt: ['อัตราการสำเร็จตามเวลา', 'อัตราสำเร็จตามเวลา'], enAlt: ['graduation rate', 'pass rate'] },
  { th: 'อัตราการออกกลางคัน', en: 'dropout rate', thAlt: ['อัตราออกกลางคัน'], enAlt: ['dropout rate', 'drop-out rate'] },
  { th: 'ระยะเวลาเฉลี่ยในการสำเร็จการศึกษา', en: 'average time to graduate', thAlt: ['เวลาเฉลี่ยจบ'], enAlt: ['average time to graduate', 'time to graduation'] },
  { th: 'ภาวะการมีงานทำ', en: 'employability', thAlt: ['การมีงานทำของบัณฑิต'], enAlt: ['employability', 'employment rate'] },
  { th: 'ผู้ใช้บัณฑิต', en: 'employers of graduates', thAlt: ['นายจ้าง'], enAlt: ['employers', 'employer'] },
  { th: 'ศิษย์เก่า', en: 'alumni', thAlt: ['บัณฑิตที่สำเร็จการศึกษา'], enAlt: ['alumni', 'alumnus'] },
  { th: 'ความพึงพอใจ', en: 'satisfaction', enAlt: ['satisfaction'] },
  { th: 'หลักสูตร', en: 'programme', enAlt: ['programme', 'program', 'curriculum'] },
  { th: 'รายวิชา', en: 'course', thAlt: ['วิชา'], enAlt: ['course', 'courses'] },
  { th: 'ประธานหลักสูตร', en: 'programme chair', enAlt: ['programme chair', 'program chair'] },
  { th: 'อาจารย์ประจำหลักสูตร', en: 'programme staff', thAlt: ['อาจารย์ผู้รับผิดชอบหลักสูตร'], enAlt: ['programme staff', 'academic staff of the programme'] },
  { th: 'คณาจารย์', en: 'academic staff', thAlt: ['บุคลากรสายวิชาการ'], enAlt: ['academic staff', 'teaching staff'] },
  { th: 'บุคลากรสายสนับสนุน', en: 'support staff', enAlt: ['support staff'] },
  { th: 'การพัฒนาอาจารย์', en: 'staff development', thAlt: ['การพัฒนาบุคลากร'], enAlt: ['staff development'] },
  { th: 'ภาระงานของอาจารย์', en: 'staff workload', enAlt: ['staff workload', 'workload'] },
  { th: 'สิ่งอำนวยความสะดวกและโครงสร้างพื้นฐาน', en: 'facilities and infrastructure', thAlt: ['สิ่งสนับสนุนการเรียนรู้'], enAlt: ['facilities and infrastructure', 'facilities'] },
  { th: 'ผลลัพธ์ของหลักสูตร', en: 'programme outcomes', enAlt: ['programme outcomes'] },
  { th: 'ผลผลิตและผลลัพธ์', en: 'outputs and outcomes', enAlt: ['outputs and outcomes'] },
  { th: 'การปรับปรุงอย่างต่อเนื่อง', en: 'continuous improvement', enAlt: ['continuous improvement', 'continual improvement'] },
  { th: 'การทบทวนหลักสูตร', en: 'programme review', thAlt: ['การปรับปรุงหลักสูตร'], enAlt: ['programme review', 'curriculum review'] },
  { th: 'ข้อกำหนดของหลักสูตร', en: 'programme specification', thAlt: ['รายละเอียดของหลักสูตร'], enAlt: ['programme specification'] },
  { th: 'ข้อมูลย้อนกลับ', en: 'feedback', thAlt: ['ข้อมูลป้อนกลับ'], enAlt: ['feedback'] },
  { th: 'หลักฐาน', en: 'evidence', enAlt: ['evidence'] },
  { th: 'ตัวชี้วัด', en: 'indicator', thAlt: ['ตัวบ่งชี้'], enAlt: ['indicator', 'indicators', 'KPI'] },
  { th: 'ค่าเป้าหมาย', en: 'target value', enAlt: ['target value', 'target'] },
  { th: 'ค่าเทียบเคียง', en: 'benchmark value', enAlt: ['benchmark value'] },
  { th: 'ทักษะทางวิชาชีพ', en: 'professional skills', enAlt: ['professional skills'] },
  { th: 'ทักษะทั่วไป', en: 'generic skills', thAlt: ['ทักษะที่ถ่ายโอนได้'], enAlt: ['generic skills', 'transferable skills'] },
  { th: 'การเรียนรู้ด้วยการปฏิบัติ', en: 'work-based learning', enAlt: ['work-based learning'] },
  { th: 'การฝึกประสบการณ์วิชาชีพ', en: 'internship', thAlt: ['สหกิจศึกษา'], enAlt: ['internship', 'cooperative education'] },
  { th: 'การรับฟังความคิดเห็น', en: 'stakeholder consultation', enAlt: ['stakeholder consultation', 'consultation'] },
  { th: 'ความต้องการของผู้มีส่วนได้ส่วนเสีย', en: 'stakeholders’ needs', enAlt: ['stakeholders’ needs', "stakeholders' needs", 'stakeholder needs'] },
];

function escapeRe(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** รูปที่ใช้จับในภาษาต้นทาง */
function sourceForms(e: GlossaryEntry, from: 'th' | 'en'): string[] {
  return from === 'th' ? [e.th, ...(e.thAlt ?? [])] : [e.en, ...(e.enAlt ?? [])];
}

/** เรียงรูปยาว→สั้น เพื่อให้วลียาวชนะวลีสั้นที่เป็นส่วนย่อย */
function rulesFor(from: 'th' | 'en'): { forms: { form: string; entry: GlossaryEntry }[]; re: RegExp } {
  const forms = AUNQA_GLOSSARY.flatMap(entry => sourceForms(entry, from).map(form => ({ form, entry })))
    .sort((a, b) => b.form.length - a.form.length);
  // อังกฤษ: ขอบเขตคำ + ไม่แยกตัวพิมพ์ (ตัวย่อ 2–4 ตัวพิมพ์ใหญ่ล้วนต้องตรงตัวพิมพ์) · ไทย: จับตรง ๆ
  const parts = forms.map(f => {
    if (from === 'th') return escapeRe(f.form);
    return `(?<![\\p{L}\\p{N}])${escapeRe(f.form)}(?![\\p{L}\\p{N}])`;
  });
  return { forms, re: new RegExp(parts.join('|'), from === 'th' ? 'gu' : 'giu') };
}

const rulesTh = (() => { let r: ReturnType<typeof rulesFor> | undefined; return () => (r ??= rulesFor('th')); })();
const rulesEn = (() => { let r: ReturnType<typeof rulesFor> | undefined; return () => (r ??= rulesFor('en')); })();

function lookup(forms: { form: string; entry: GlossaryEntry }[], matched: string, from: 'th' | 'en'): GlossaryEntry | undefined {
  const exact = forms.find(f => f.form === matched);
  if (exact) return exact.entry;
  if (from === 'en') {
    const lower = matched.toLowerCase();
    // ตัวย่อ (ตัวพิมพ์ใหญ่ล้วน) ต้องตรงตัวพิมพ์ — ไม่ให้ "pass" ฯลฯ ชนกับตัวย่อ
    return forms.find(f => f.form.toLowerCase() === lower && !(/^[A-Z]{2,5}s?$/.test(f.form) && f.form !== matched))?.entry;
  }
  return undefined;
}

export interface GlossaryHit { th: string; en: string }

/** ศัพท์ใน glossary ที่พบในข้อความ (เรียงตามลำดับที่พบ ไม่ซ้ำ) */
export function findGlossaryHits(text: string, from: 'th' | 'en'): GlossaryEntry[] {
  const { forms, re } = from === 'th' ? rulesTh() : rulesEn();
  const seen = new Set<GlossaryEntry>();
  const out: GlossaryEntry[] = [];
  for (const m of (text || '').matchAll(re)) {
    const e = lookup(forms, m[0], from);
    if (e && !seen.has(e)) { seen.add(e); out.push(e); }
  }
  return out;
}

/** แทนศัพท์ glossary ด้วยคำคู่ในภาษาปลายทาง — ไม่แตะส่วนอื่นของข้อความ ([E-…] และตัวเลขคงเดิม) */
export function applyGlossary(text: string, from: 'th' | 'en'): { text: string; hits: GlossaryEntry[]; replaced: number } {
  const { forms, re } = from === 'th' ? rulesTh() : rulesEn();
  const hits: GlossaryEntry[] = [];
  let replaced = 0;
  const out = (text || '').replace(re, m => {
    const e = lookup(forms, m, from);
    if (!e) return m;
    if (!hits.includes(e)) hits.push(e);
    replaced++;
    return from === 'th' ? e.en : e.th;
  });
  return { text: out, hits, replaced };
}
