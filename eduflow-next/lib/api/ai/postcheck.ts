/**
 * AI post-check (กฎ 7.3 — บังคับในโค้ด):
 *  1) ทุก [E-…] ใน output ต้องมีจริงในรอบนั้น ไม่งั้นตัดทิ้ง
 *  2) ตัวเลขทุกตัวใน output ต้องพบใน input context ไม่งั้นติดธง (และตัดประโยคนั้นถ้า dropUnsafe)
 * pure function — ทดสอบง่าย
 */
import type { PostCheckResult } from '../../types';
import { extractNumbers, splitSentences } from '../../utils/text';

const CITE_RE = /\s*\[(E-\d+\.\d+-\d{2,})\]/g;

/** ชุดตัวเลขที่ "อนุญาต" = ตัวเลขทั้งหมดที่ปรากฏใน input context */
export function allowedNumbers(inputContext: string): Set<string> {
  return new Set(extractNumbers(inputContext));
}

export interface PostCheckOptions {
  allowedCodes: Set<string>;
  inputContext: string;
  /** true = ตัดประโยคที่มีตัวเลขไม่อยู่ใน input หรืออ้างรหัสปลอม ออกจากข้อความ */
  dropUnsafe?: boolean;
}

export function postCheckText(text: string, opt: PostCheckOptions): { text: string; result: PostCheckResult } {
  const nums = allowedNumbers(opt.inputContext);
  const removedCitations = new Set<string>();
  const unknownNumbers = new Set<string>();
  const flagged: string[] = [];
  const keptLines: string[] = [];

  for (const line of (text || '').split('\n')) {
    // แยกประโยคภายในบรรทัด แต่คงบรรทัดเดิมไว้
    const parts = splitSentences(line);
    const keptParts: string[] = [];
    for (const part of parts) {
      let bad = false;
      let cleaned = part.replace(CITE_RE, (m, code: string) => {
        if (opt.allowedCodes.has(code)) return m;
        removedCitations.add(code); bad = true; return '';
      });
      const unk = extractNumbers(cleaned).filter(n => !nums.has(n));
      if (unk.length) { unk.forEach(n => unknownNumbers.add(n)); bad = true; }
      if (bad) {
        flagged.push(part);
        if (opt.dropUnsafe) continue;
      }
      cleaned = cleaned.trim();
      if (cleaned) keptParts.push(cleaned);
    }
    if (keptParts.length) keptLines.push(keptParts.join(' '));
    else if (!line.trim()) keptLines.push('');
  }
  const result: PostCheckResult = {
    ok: removedCitations.size === 0 && unknownNumbers.size === 0,
    removedCitations: Array.from(removedCitations), unknownNumbers: Array.from(unknownNumbers), flaggedSentences: flagged,
  };
  return { text: keptLines.join('\n').trim(), result };
}

/**
 * กฎ 7.3 (AI ห้ามให้คะแนน/ตัดสิน) บังคับในโค้ด: ประโยคที่เข้ารูปให้คะแนน/ตัดสินผ่าน-ไม่ผ่าน ถูกตัดทิ้ง
 * รูปแบบ: คะแนน, ระดับ <1-7>, score, rating, verdict, ผ่าน/ไม่ผ่านเกณฑ์, adequate/inadequate
 */
// ตัวเลขที่เป็นข้อเท็จจริง (ทศนิยม / "จาก 5") ไม่ใช่การตัดสิน — ใช้ lookahead กันตัดเกิน (R2-2)
const NOT_FACT = String.raw`(?![\d๐-๙]|\.\d|\s*(?:จาก|out of|of)\s*\d)`;
const JUDGEMENT_RE = new RegExp([
  String.raw`(?:ให้|ควรได้|สมควรได้)\s*คะแนน`,
  String.raw`ได้คะแนน(?!\s*(?:เฉลี่ย|ความ|\d+\.\d))`,
  String.raw`คะแนน(?:ของ)?(?:เกณฑ์|ข้อ)(?:นี้|ย่อย)`,
  String.raw`คะแนน\s*[1-7๑-๗]${NOT_FACT}`,
  String.raw`ระดับ(?:ที่)?\s*[1-7๑-๗]${NOT_FACT}`,
  String.raw`(?:ควร)?ได้ระดับ(?!\s*\d+\.\d)`,
  String.raw`(?<!\d\s)\b(?:score[sd]?|rating|verdict|adequate|inadequate|pass|fail)\b(?!\s*(?:of|is|was|:)?\s*\d+\.\d)`,
  String.raw`(?:ไม่)?ผ่าน(?:เกณฑ์|ตามเกณฑ์|การประเมิน|มาตรฐาน)`,
  String.raw`(?:ถือว่า|ควร|สมควร)(?:จะ)?(?:ไม่)?ผ่าน`,
  String.raw`(?:ไม่)?เป็นไปตามเกณฑ์`,
  String.raw`ไม่ผ่าน[\s.!?]*$`,
  String.raw`ไม่เพียงพอ`,
  String.raw`เพียงพอ(?:ตามที่คาดหวัง|ตามเกณฑ์|ต่อเกณฑ์|แล้ว|ในระดับ|[\s.!?]*$)`,
].join('|'), 'iu');

/** ประโยคไทยมักไม่มีจุด: แยกต่อเป็นอนุประโยคที่ช่องว่างระหว่างอักษรไทย เพื่อตัดเท่าที่จำเป็น ไม่ใช่ทั้งย่อหน้า */
function splitClauses(sentence: string): string[] {
  return sentence.split(/(?<=[ก-๙])(?<![๐-๙])\s+(?=[ก-๙])(?![๐-๙])/).map(s => s.trim()).filter(Boolean);
}

export function stripJudgement(text: string): { text: string; removed: string[] } {
  const removed: string[] = [];
  const lines = (text || '').split('\n').map(line => {
    const kept = splitSentences(line).flatMap(splitClauses).filter(s => {
      if (JUDGEMENT_RE.test(s)) { removed.push(s); return false; }
      return true;
    });
    return kept.join(' ').trim();
  });
  return { text: lines.join('\n').trim(), removed };
}

/** รวมผลหลายข้อความ (เช่น review ที่มีหลายรายการ) */
export function mergePostChecks(rs: PostCheckResult[]): PostCheckResult {
  const u = (xs: string[][]) => Array.from(new Set(xs.flat()));
  return {
    ok: rs.every(r => r.ok),
    removedCitations: u(rs.map(r => r.removedCitations)),
    unknownNumbers: u(rs.map(r => r.unknownNumbers)),
    flaggedSentences: rs.flatMap(r => r.flaggedSentences),
  };
}
