/**
 * TASK-0003 S4 — Scenario seed: ชุดข้อมูลทดสอบทุกเคส แยกจาก seed มาตรฐาน (ข้อมูลสมมติทั้งหมด · รหัสผ่าน demo1234)
 *
 *   import { listScenarios, loadScenarioPack, resetToStandardSeed } from '@/lib/mock-data/aunqa/scenarios';
 *   listScenarios()                 → รายการเคส (id, ชื่อไทย, คำอธิบาย, บัญชีที่ควรล็อกอิน, หน้า, ผลที่คาด)
 *   await loadScenarioPack()        → รีเซ็ตเป็น seed มาตรฐาน แล้วโหลด "ทุกเคส" (ALL_SCENARIOS_ID = 'all')
 *   await loadScenarioPack('deadlines') → รีเซ็ต แล้วโหลดเคสเดียว
 *   await resetToStandardSeed()     → กลับเป็น seed มาตรฐาน (รวม F4: 3.6 → staff1 + แจ้งเตือนประธานคู่ข้อรอตรวจ)
 *
 * ทำงานเฉพาะในเบราว์เซอร์ (localStorage) · หลังโหลด/รีเซ็ต session ถูกล้าง → ต้องล็อกอินใหม่
 * ทุกเคสสร้างผ่าน API จริงของ lib/api (แจ้งเตือน / review event / audit ครบ) — ข้อยกเว้นเดียวดู tenant.ts
 * ห้าม export ไฟล์นี้ผ่าน lib/mock-data/aunqa/index.ts (init.ts import index → วงจร import)
 * ตารางเคสภาษาไทย: README.md ในโฟลเดอร์นี้
 */
import * as api from '../../../api';
import { applyStandardSeedExtras, standardExtrasApplied } from '../standard-extras';
import { CYCLE_SCENARIOS } from './cycles';
import { EVIDENCE_ACTION_SCENARIOS } from './evidence-actions';
import { DEMO_CYCLE, maybeUser, u } from './helpers';
import { SECTION_SCENARIOS } from './sections';
import { TENANT_SCENARIOS } from './tenant';
import type { ScenarioDef, ScenarioInfo, ScenarioLink, ScenarioLoadResult } from './types';
import { USER_SCENARIOS } from './users';

export type {
  ScenarioAccount, ScenarioContext, ScenarioDef, ScenarioGroup, ScenarioInfo, ScenarioLink, ScenarioLoadResult,
} from './types';

export const ALL_SCENARIOS_ID = 'all';

/**
 * ลำดับโหลดเมื่อโหลดทุกเคส: รอบย้อนหลังก่อน (แจ้งเตือนประวัติถูกอ่านแล้วและเก่ากว่า) → ผู้ใช้/tenant → เคสรายข้อของรอบ 2569
 * → หลักฐาน/แผน → แจ้งเตือนจำนวนมากสุดท้าย (ให้อยู่บนสุดของกระดิ่ง lect1)
 */
const REGISTRY: ScenarioDef[] = [
  ...CYCLE_SCENARIOS, ...USER_SCENARIOS, ...TENANT_SCENARIOS, ...SECTION_SCENARIOS, ...EVIDENCE_ACTION_SCENARIOS,
].sort((a, b) => Number(a.info.id === 'bell-overflow') - Number(b.info.id === 'bell-overflow'));

/** รายการเคสทั้งหมด (สำเนา — แก้แล้วไม่กระทบ registry) */
export function listScenarios(): ScenarioInfo[] {
  return REGISTRY.map(s => structuredClone(s.info));
}

function requireBrowser() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') throw new Error('scenario seed ใช้ได้เฉพาะในเบราว์เซอร์');
}

/**
 * ล้างข้อมูล aunqa_* ทั้งหมดแล้ว seed มาตรฐานใหม่ (ผ่าน resetDemo ของ super_admin เดโม่ `sadmin`)
 * + ใส่ส่วนเสริม F4 ถ้า init.ts ยังไม่ได้เรียก applyStandardSeedExtras เอง (idempotent)
 */
export async function resetToStandardSeed(): Promise<void> {
  requireBrowser();
  await api.initAunqa();
  const sadmin = maybeUser('sadmin');
  if (!sadmin) throw new Error('[scenario] ไม่พบบัญชี sadmin — รีเซ็ตไม่ได้');
  await api.resetDemo(sadmin);
  if (!standardExtrasApplied(DEMO_CYCLE)) applyStandardSeedExtras(u('chair1'), DEMO_CYCLE);
  api.clearSession();
}

/**
 * รีเซ็ตเป็น seed มาตรฐาน แล้วโหลดเคส `id` (ไม่ระบุ หรือ 'all' = ทุกเคส)
 * id ไม่รู้จัก → Error (ข้อความไทย) โดยไม่แตะข้อมูล · ผิดพลาดระหว่างโหลด → Error ระบุ id ที่พัง (ข้อมูลอาจโหลดไม่ครบ → กดรีเซ็ตใหม่)
 */
export async function loadScenarioPack(id?: string): Promise<ScenarioLoadResult> {
  requireBrowser();
  const all = !id || id === ALL_SCENARIOS_ID;
  const picked = all ? REGISTRY : REGISTRY.filter(s => s.info.id === id);
  if (!picked.length) throw new Error(`ไม่รู้จัก scenario "${id}" — ดูรายการจาก listScenarios()`);
  const started = Date.now();
  await resetToStandardSeed();
  const links: ScenarioLink[] = [];
  const loaded: string[] = [];
  for (const s of picked) {
    try {
      await s.run({ addLink: (labelTh, href) => links.push({ labelTh, href }) });
    } catch (e) {
      api.clearSession();
      throw new Error(`โหลด scenario "${s.info.id}" ไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}`);
    }
    loaded.push(s.info.id);
  }
  api.clearSession();
  return { loaded, links, ms: Date.now() - started };
}
