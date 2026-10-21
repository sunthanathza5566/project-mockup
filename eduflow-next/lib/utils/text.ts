/** Text helpers ที่ใช้ร่วมกันใน SAR / gap / AI post-check (pure) */

/** จับ [E-1.4-02] ทุกตัว (คืนรหัสโดยไม่มีวงเล็บ) */
export function extractCitations(text: string): string[] {
  const out: string[] = [];
  const re = /\[(E-\d+\.\d+-\d{2,})\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text || ''))) out.push(m[1]);
  return out;
}

/** นับคำ: ไทยใช้ Intl.Segmenter (ถ้ามี) · อังกฤษแยกด้วยช่องว่าง · ไม่นับ [E-…] */
export function countWords(text: string): number {
  const t = (text || '').replace(/\[E-\d+\.\d+-\d{2,}\]/g, ' ').trim();
  if (!t) return 0;
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: object) => { segment(s: string): Iterable<{ isWordLike?: boolean }> } }).Segmenter;
  if (Seg) {
    let n = 0;
    for (const s of new Seg('th', { granularity: 'word' }).segment(t)) if (s.isWordLike) n++;
    return n;
  }
  return t.split(/\s+/).filter(Boolean).length;
}

/** แบ่งประโยคอย่างหยาบ: ขึ้นบรรทัดใหม่ / . ! ? ตามด้วยช่องว่าง (ภาษาไทยมักจบด้วย \n หรือ ช่องว่าง) */
export function splitSentences(text: string): string[] {
  return (text || '')
    .split(/\n+|(?<=[.!?])\s+(?!\[)|(?<=\])\s+(?=[ก-๙A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/** ประโยคที่ยาวพอจะเป็นข้อเท็จจริงแต่ไม่มี [E-…] */
export function uncitedSentences(text: string, minLen = 20): string[] {
  return splitSentences(text).filter(s => s.length >= minLen && extractCitations(s).length === 0);
}

/** ดึงตัวเลขทั้งหมดในข้อความ (ตัด , ออก) ใช้ใน post-check — ไม่นับตัวเลขในรหัส [E-…] */
export function extractNumbers(text: string): string[] {
  const t = (text || '').replace(/\[E-\d+\.\d+-\d{2,}\]/g, ' ');
  return (t.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map(n => n.replace(/,/g, '')).filter(n => n.length > 0);
}
