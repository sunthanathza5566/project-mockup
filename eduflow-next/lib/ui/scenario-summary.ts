/**
 * TASK-0003 S3d — สรุป "ชุดข้อมูลทดสอบที่โหลดล่าสุด" ส่งจากแท็บเดโม่ (/app/admin?tab=demo) ไปหน้า /login
 *
 * หลังโหลด scenario session ถูกล้าง (ต้องล็อกอินใหม่) จึงส่งสรุปผ่าน `sessionStorage` (แท็บเดียว ปิดแท็บแล้วหาย)
 * - ข้อมูลทั้งหมดเป็นข้อมูลสมมติของ scenario seed (username เดโม่ · ไม่มีรหัสผ่าน — ทุกบัญชีใช้ demo1234 ตาม README)
 * - ลิงก์เชิญ (`/invite#t=…`) เป็น token ใช้ครั้งเดียว: หน้า login อ่านแล้วลบออกจาก storage ทันที (`takeScenarioSummary`)
 *   แสดงได้ครั้งเดียวต่อการโหลด — รีเฟรชแล้วลิงก์หาย ต้องโหลดเคสใหม่ (ตรงกับ README "แสดงได้ครั้งเดียว")
 * - ส่วนบัญชี/เคสคงไว้ในแท็บจนผู้ใช้กดปิด panel (`clearScenarioSummary`)
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

function isSummary(v: unknown): v is ScenarioSummary {
  const o = v as ScenarioSummary;
  return !!o && typeof o === 'object' && Array.isArray(o.cases) && Array.isArray(o.links) && typeof o.at === 'number';
}

/** อ่านสรุป แล้วลบลิงก์เชิญออกจาก storage (คืนลิงก์ให้ครั้งนี้ครั้งเดียว) · ไม่มี/เสีย = null */
export function takeScenarioSummary(): ScenarioSummary | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SCENARIO_SUMMARY_KEY);
    if (!raw) return null;
    const s: unknown = JSON.parse(raw);
    if (!isSummary(s)) { sessionStorage.removeItem(SCENARIO_SUMMARY_KEY); return null; }
    if (s.links.length) sessionStorage.setItem(SCENARIO_SUMMARY_KEY, JSON.stringify({ ...s, links: [] }));
    return s;
  } catch {
    return null;
  }
}

export function clearScenarioSummary(): void {
  try { sessionStorage.removeItem(SCENARIO_SUMMARY_KEY); } catch { /* ignore */ }
}
