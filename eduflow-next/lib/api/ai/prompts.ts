/**
 * Prompt templates สำหรับ Claude (ใช้ฝั่ง server ใน app/api/ai/route.ts) — pure, ไม่ import อะไรจาก store
 * กฎ spec 7: grounded only · ห้ามแต่งตัวเลข · อ้าง [E-…] เฉพาะที่มีใน input · ห้ามให้คะแนน/ตัดสิน/อนุมัติ
 * (กฎเหล่านี้ถูกบังคับซ้ำในโค้ดด้วย post-check ฝั่ง lib — prompt เป็นแค่ชั้นแรก)
 */

export type AiTask = 'tag' | 'draft' | 'review' | 'verbs' | 'summarize';
export const AI_TASKS: AiTask[] = ['tag', 'draft', 'review', 'verbs', 'summarize'];
export const CLAUDE_MODEL = 'claude-sonnet-5-5';
export const CLAUDE_PROMPT_VERSION = 'claude-v1';

const COMMON = `คุณเป็นผู้ช่วยของระบบ AUN-QA Copilot (เกณฑ์ AUN-QA ระดับหลักสูตร v4.0) ช่วยเขียน/ตรวจ/สรุปเท่านั้น ไม่ใช่ผู้ประเมิน
กฎเหล็ก:
1) ใช้เฉพาะข้อมูลใน INPUT ห้ามแต่งข้อเท็จจริงหรือตัวเลขที่ไม่มีใน INPUT
2) อ้างหลักฐานด้วยรหัสรูปแบบ [E-x.x-nn] เฉพาะรหัสที่อยู่ใน INPUT เท่านั้น ถ้าไม่มีหลักฐานให้บอกว่าขาด
3) ห้ามให้คะแนนทางการ ห้ามตัดสินผ่าน/ไม่ผ่าน ห้ามอนุมัติ ห้ามเปลี่ยนสถานะใด ๆ
4) ห้ามใส่ชื่อบุคคล เลขบัตร อีเมล เบอร์โทร (INPUT ถูกปิดบังข้อมูลส่วนบุคคลแล้ว ข้อความที่เป็น token ให้คงไว้)
5) ตอบเป็น JSON object เดียวตาม schema ที่กำหนดเท่านั้น ห้ามมี markdown ห้ามมีข้อความอื่นนอก JSON`;

const SCHEMA: Record<AiTask, { task: string; schema: string }> = {
  tag: {
    task: 'สรุปหลักฐาน 2–3 บรรทัด เสนอข้อ requirement ที่เกี่ยวข้อง (สูงสุด 3 ข้อ ใช้ id จาก INPUT.requirements เท่านั้น) และขั้น PDCA ที่เหมาะ',
    schema: '{"summary":string,"suggestions":[{"requirementId":string,"confidence":number(0-1),"reasons":[string]}],"pdcaStage":"P"|"D"|"C"|"A","pdcaReason":string}',
  },
  draft: {
    task: 'ร่าง narrative ของข้อนี้ตามภาษาใน INPUT.language ทุกประโยคที่อ้างข้อเท็จจริงต้องลงท้ายด้วย [E-…] ที่มีใน INPUT.evidence และระบุสิ่งที่ยังขาดใน missing',
    schema: '{"draft":string,"missing":[string],"usedEvidence":[string(รหัส E-…)]}',
  },
  review: {
    task: 'ตรวจ narrative เทียบกับข้อกำหนดของ requirement: คำถามวินิจฉัยที่ยังไม่ได้ตอบ ประโยคที่ไม่มี [E-…] และข้อเสนอปรับ (ไม่ให้คะแนน)',
    schema: '{"unanswered":[string],"uncitedSentences":[string],"suggestions":[string]}',
  },
  verbs: {
    task: 'ตรวจคำกริยาของ PLO/CLO แต่ละรายการตามระดับ Bloom (1 จำ, 2 เข้าใจ, 3 ประยุกต์ใช้, 4 วิเคราะห์, 5 ประเมินค่า, 6 สร้างสรรค์) ว่าวัดผลได้หรือไม่ ตรงกับ declaredLevel หรือไม่ และเสนอคำกริยาที่วัดได้กว่า (ไทย/อังกฤษ)',
    schema: '{"results":[{"id":string,"code":string,"kind":"plo"|"clo","verbs":[string],"detectedLevels":[number],"declaredLevel":number,"measurable":boolean,"levelMatch":boolean|null,"note":string,"suggestions":[string]}]} (ต้องมีผลครบทุก item ใน INPUT.items ใช้ id/code/kind/declaredLevel เดิม)',
  },
  summarize: {
    task: 'สรุป SAR รายข้อของเกณฑ์นี้สำหรับกรรมการ (จุดแข็ง/ข้อกังวลจากข้อมูลใน INPUT เท่านั้น) และเสนอคำถามสัมภาษณ์แบบ 5W1H แยกกลุ่ม lecturer, student, alumni, employer โดยอ้างอิง requirementId จริง',
    schema: '{"summaries":[{"requirementId":string,"summary":string,"strengths":[string],"concerns":[string]}],"questions":[{"group":"lecturer"|"student"|"alumni"|"employer","items":[{"w":"What"|"Why"|"Who"|"When"|"Where"|"How","requirementId":string,"question":string}]}]}',
  },
};

export function buildPrompt(task: AiTask, input: unknown): { system: string; user: string } {
  const s = SCHEMA[task];
  return {
    system: COMMON,
    user: `งาน: ${s.task}\n\nรูปแบบคำตอบ (JSON):\n${s.schema}\n\nINPUT:\n${JSON.stringify(input)}`,
  };
}

/** ดึง JSON object แรก-สุดท้ายจากข้อความตอบกลับ (กรณีโมเดลห่อด้วย ``` หรือมีข้อความนำ) */
export function extractJsonObject(text: string): unknown | null {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch { return null; }
}
