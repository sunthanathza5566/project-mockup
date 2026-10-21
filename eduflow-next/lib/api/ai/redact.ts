/**
 * PII redaction layer (กฎเหล็กข้อ 2) — ทุกข้อความต้องผ่านที่นี่ก่อนถึง provider ใด ๆ
 * regex: เลขบัตร ปชช. / รหัสนักศึกษา / อีเมล / เบอร์โทร → token
 * TODO(Phase B): NER จับชื่อบุคคล
 */
import { redactPii } from '../../utils/pii';

export interface Redacted<T> { value: T; count: number }

export function redactText(text: string): { text: string; count: number } {
  return redactPii(text);
}

/** redact ทุก string ใน object/array (deep) แล้วนับจำนวนที่ถูกแทน */
export function redactDeep<T>(input: T): Redacted<T> {
  let count = 0;
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') { const r = redactPii(v); count += r.count; return r.text; }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return { value: walk(input) as T, count };
}
