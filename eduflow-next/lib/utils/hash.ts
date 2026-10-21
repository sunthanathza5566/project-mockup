/** Hash / id helpers — sha256 ผ่าน crypto.subtle (browser + Node 20+) */

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(input: string | ArrayBuffer | Uint8Array): Promise<string> {
  let data: BufferSource;
  if (typeof input === 'string') data = new TextEncoder().encode(input);
  else if (input instanceof Uint8Array) data = input as unknown as BufferSource;
  else data = input;
  return toHex(await crypto.subtle.digest('SHA-256', data));
}

/** JSON.stringify ที่เรียง key ให้คงที่ — ใช้กับ snapshot hash */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

let seq = 0;
/** id สั้นไม่ซ้ำภายในเครื่อง — TODO(PostgreSQL): uuid */
export function newId(prefix: string): string {
  seq = (seq + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
