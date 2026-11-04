/**
 * TASK-0003 S3d — สรุป "ชุดข้อมูลทดสอบที่โหลดล่าสุด" ส่งจากแท็บเดโม่ (/app/admin?tab=demo) ไปหน้า /login
 *
 * หลังโหลด scenario session ถูกล้าง (ต้องล็อกอินใหม่) จึงส่งสรุปผ่าน `sessionStorage` (แท็บเดียว ปิดแท็บแล้วหาย)
 * - ข้อมูลทั้งหมดเป็นข้อมูลสมมติของ scenario seed (username เดโม่ · ไม่มีรหัสผ่าน — ทุกบัญชีใช้ demo1234 ตาม README)
 * - ลิงก์เชิญ (`/invite#t=…`) เป็น token ใช้ครั้งเดียว: หน้า login อ่านแล้วลบออกจาก storage ทันที (`takeScenarioSummary`)
 *   แสดงได้ครั้งเดียวต่อการโหลด — รีเฟรชแล้วลิงก์หาย ต้องโหลดเคสใหม่ (ตรงกับ README "แสดงได้ครั้งเดียว")
 * - ส่วนบัญชี/เคสคงไว้ในแท็บจนผู้ใช้กดปิด panel (`clearScenarioSummary`) หรือครบ 10 นาทีนับจาก `at` (อ่านครั้งถัดไปแล้วทิ้ง)
 */
import type { ScenarioInfo, ScenarioLink } from '@/lib/mock-data/aunqa/scenarios';

export const SCENARIO_SUMMARY_KEY = 'aunqa_ui_scenario_summary';

export interface ScenarioSummary {
  /** 'all' = โหลดทุกเคส · 'reset' = กลับเป็นข้อมูลมาตรฐาน · อื่น = id ของเคสเดียว */
  kind: 'all' | 'reset' | 'one';
  /** เคสที่โหลดสำเร็จ (ข้อมูลจาก listScenarios ตามลำดับที่โหลด) — reset = [] */
  cases: Pick<ScenarioInfo, 'id' | 'titleTh' | 'accounts' | 'paths' | 'expectTh'>[];
  links: ScenarioLink[];
  ms: number;
  /** เวลาที่โหลดเสร็จ (epoch ms) */
  at: number;
}

export function saveScenarioSummary(s: ScenarioSummary): void {
  try { sessionStorage.setItem(SCENARIO_SUMMARY_KEY, JSON.stringify(s)); } catch { /* storage เต็ม/ปิด → ไม่แสดงสรุป */ }
}

/** อายุสูงสุดของสรุปใน storage (security S-3) — เกินแล้วทิ้งทั้งก้อน รวมลิงก์เชิญที่ยังไม่ถูกอ่าน */
export const SCENARIO_SUMMARY_TTL_MS = 10 * 60 * 1000;

/**
 * รูปลิงก์เชิญที่ยอมรับ (security S-2): token = base64url ของ 32 ไบต์ไม่เติม '=' → 43 ตัวพอดี
 * (`newInviteToken` ใน `lib/api/onboarding.store.ts`) · อย่างอื่น (เช่น `javascript:`) ถูกกรองทิ้งก่อนใส่ `<a href>`
 */
const INVITE_HREF_RE = /^\/invite#t=[A-Za-z0-9_-]{43}$/;

function isSafeLink(v: unknown): v is ScenarioLink {
  const l = v as ScenarioLink;
  return !!l && typeof l === 'object' && typeof l.labelTh === 'string'
    && typeof l.href === 'string' && INVITE_HREF_RE.test(l.href);
}

function isSummary(v: unknown): v is ScenarioSummary {
  const o = v as ScenarioSummary;
  return !!o && typeof o === 'object' && Array.isArray(o.cases) && Array.isArray(o.links) && typeof o.at === 'number';
}

/**
 * อ่านสรุป แล้วลบลิงก์เชิญออกจาก storage (คืนลิงก์ให้ครั้งนี้ครั้งเดียว) · ไม่มี/เสีย/หมดอายุ = null
 * ข้อยกเว้นของเดโม่: ปกติ token เชิญไม่ลง storage (ADR R5) แต่ที่นี่ต้องส่งข้ามการล้าง session ไปหน้า /login
 * จึงจำกัดไว้ที่ sessionStorage + อ่านได้ครั้งเดียว + อายุไม่เกิน 10 นาที + กรองรูป href
 */
export function takeScenarioSummary(now: number = Date.now()): ScenarioSummary | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SCENARIO_SUMMARY_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSummary(parsed) || !(now - parsed.at >= 0 && now - parsed.at <= SCENARIO_SUMMARY_TTL_MS)) {
      sessionStorage.removeItem(SCENARIO_SUMMARY_KEY);
      return null;
    }
    const s: ScenarioSummary = { ...parsed, links: parsed.links.filter(isSafeLink) };
    if (parsed.links.length) sessionStorage.setItem(SCENARIO_SUMMARY_KEY, JSON.stringify({ ...parsed, links: [] }));
    return s;
  } catch {
    return null;
  }
}

export function clearScenarioSummary(): void {
  try { sessionStorage.removeItem(SCENARIO_SUMMARY_KEY); } catch { /* ignore */ }
}
