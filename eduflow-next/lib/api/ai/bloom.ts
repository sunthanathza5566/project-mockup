/**
 * Bloom taxonomy verb dictionary (ไทย/อังกฤษ) สำหรับ AI-7 offline — pure, deterministic
 * ระดับ: 1 Remember · 2 Understand · 3 Apply · 4 Analyze · 5 Evaluate · 6 Create
 * ข้อจำกัด: จับคำด้วย dictionary/substring (ไม่มี NLP) → เป็นข้อเสนอให้มนุษย์ตรวจ ไม่ใช่คำตัดสิน
 */

export const BLOOM_NAME_EN: Record<number, string> = { 1: 'Remember', 2: 'Understand', 3: 'Apply', 4: 'Analyze', 5: 'Evaluate', 6: 'Create' };
export const BLOOM_NAME_TH: Record<number, string> = { 1: 'จำ', 2: 'เข้าใจ', 3: 'ประยุกต์ใช้', 4: 'วิเคราะห์', 5: 'ประเมินค่า', 6: 'สร้างสรรค์' };

const TH: Record<number, string[]> = {
  1: ['จดจำ', 'จำได้', 'ระบุ', 'บอก', 'ระลึก', 'เรียกชื่อ', 'แสดงรายการ', 'ท่องจำ'],
  2: ['อธิบาย', 'สรุป', 'จำแนก', 'ยกตัวอย่าง', 'แปลความ', 'ตีความ', 'บรรยาย', 'ขยายความ', 'อภิปราย'],
  3: ['ประยุกต์', 'ใช้', 'แก้ปัญหา', 'คำนวณ', 'เขียน', 'ทดลอง', 'สาธิต', 'ปฏิบัติ', 'ดำเนินการ', 'พิสูจน์', 'ทำงาน', 'สื่อสาร'],
  4: ['วิเคราะห์', 'แยกแยะ', 'เปรียบเทียบ', 'ตรวจสอบ', 'เชื่อมโยง', 'วินิจฉัย', 'จัดหมวดหมู่'],
  5: ['ประเมิน', 'วิพากษ์', 'วิจารณ์', 'ตัดสินใจ', 'ตัดสิน', 'ให้เหตุผล'],
  6: ['สร้างสรรค์', 'สร้าง', 'ออกแบบ', 'พัฒนา', 'วางแผน', 'ประดิษฐ์', 'สังเคราะห์'],
};
const EN: Record<number, string[]> = {
  1: ['define', 'list', 'name', 'recall', 'identify', 'state', 'recognize', 'recognise', 'label', 'memorize', 'memorise'],
  2: ['explain', 'describe', 'summarize', 'summarise', 'classify', 'discuss', 'illustrate', 'interpret', 'paraphrase'],
  3: ['apply', 'use', 'solve', 'implement', 'demonstrate', 'execute', 'calculate', 'operate', 'perform', 'write', 'collaborate', 'communicate', 'prove'],
  4: ['analyze', 'analyse', 'compare', 'contrast', 'differentiate', 'examine', 'distinguish', 'investigate', 'organize', 'organise', 'deconstruct'],
  5: ['evaluate', 'assess', 'critique', 'judge', 'justify', 'defend', 'recommend', 'appraise', 'argue'],
  6: ['create', 'design', 'develop', 'construct', 'formulate', 'compose', 'plan', 'produce', 'propose', 'build', 'invent'],
};
/** คำกว้าง/วัดผลไม่ได้ */
const VAGUE_TH = ['เข้าใจ', 'รู้', 'ตระหนัก', 'เห็นคุณค่า', 'ซาบซึ้ง', 'คุ้นเคย', 'สนใจ'];
const VAGUE_EN = ['understand', 'know', 'appreciate', 'be aware', 'be familiar', 'learn', 'believe', 'enjoy'];

/** คำกริยาอังกฤษสั้น (≤4 ตัว) ใช้ inflection ตายตัวกัน false positive เช่น "user" */
function enRegex(v: string): RegExp {
  const tail = v.length <= 4 ? '(?:s|es|d|ed|ing)?' : '\\w{0,4}';
  return new RegExp(`\\b${v}${tail}\\b`, 'i');
}

export interface VerbHit { verb: string; level: number }
export interface VerbAnalysis { hits: VerbHit[]; levels: number[]; vague: string[]; measurable: boolean }

export function analyzeVerbs(textTh: string, textEn: string): VerbAnalysis {
  const th = (textTh || '').toLowerCase();
  const en = (textEn || '').toLowerCase();
  const hits: VerbHit[] = [];
  const seen = new Set<string>();
  const push = (verb: string, level: number) => { const k = `${level}:${verb}`; if (!seen.has(k)) { seen.add(k); hits.push({ verb, level }); } };
  for (const lvl of [1, 2, 3, 4, 5, 6]) {
    // ไทย: longest-first กัน "สร้าง" ซ้ำกับ "สร้างสรรค์" (ระดับเดียวกันอยู่แล้ว)
    for (const v of TH[lvl].slice().sort((a, b) => b.length - a.length)) if (th.includes(v)) push(v, lvl);
    for (const v of EN[lvl]) if (en && enRegex(v).test(en)) push(v, lvl);
  }
  const vague = [
    ...VAGUE_TH.filter(v => th.includes(v)),
    ...VAGUE_EN.filter(v => new RegExp(`\\b${v}\\w{0,3}\\b`, 'i').test(en)),
  ];
  const levels = Array.from(new Set(hits.map(h => h.level))).sort((a, b) => a - b);
  return { hits, levels, vague, measurable: hits.length > 0 };
}

/** คำกริยาที่วัดได้เสนอตามระดับ (ไทย + อังกฤษ) */
export function suggestVerbs(level: number, limit = 3): string[] {
  const lv = Math.min(6, Math.max(1, Math.round(level)));
  const th = TH[lv].filter(v => v.length >= 3 && v !== 'ใช้').slice(0, limit);
  const en = EN[lv].slice(0, limit);
  return [...th, ...en];
}
