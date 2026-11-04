/** TASK-0003 S4 — สัญญา (contract) ของ scenario seed สำหรับ frontend / qa */

export type ScenarioGroup = 'cycle' | 'section' | 'user' | 'tenant' | 'evidence' | 'action' | 'notification';

export interface ScenarioAccount {
  /** username สำหรับล็อกอิน (รหัสผ่าน demo1234 ทุกบัญชี) */
  username: string;
  /** บทบาท/หน้าที่ของบัญชีนี้ในเคส (ไทย) */
  roleTh: string;
}

export interface ScenarioInfo {
  /** id สำหรับ loadScenarioPack(id) / query ?scenario=<id> */
  id: string;
  group: ScenarioGroup;
  titleTh: string;
  descriptionTh: string;
  /** บัญชีที่ควรล็อกอินดู (เรียงตามลำดับที่แนะนำ) */
  accounts: ScenarioAccount[];
  /** หน้า (path) ที่ควรเปิดดู */
  paths: string[];
  /** สิ่งที่ควรเห็น (ผลที่คาด) */
  expectTh: string[];
}

export interface ScenarioLink {
  /** คำอธิบายไทย เช่น "ลิงก์เชิญ invite1 (ยังใช้ได้)" */
  labelTh: string;
  /** path ในแอป เช่น /invite#t=… */
  href: string;
}

export interface ScenarioLoadResult {
  /** id ที่โหลดสำเร็จ ตามลำดับ */
  loaded: string[];
  /** ลิงก์ที่สร้างตอนโหลด (เช่น ลิงก์เชิญ — token เปลี่ยนทุกครั้งที่โหลด แสดงได้ครั้งเดียว) */
  links: ScenarioLink[];
  /** เวลาที่ใช้ (ms) */
  ms: number;
}

/** context ที่ส่งให้แต่ละ scenario ตอนรัน */
export interface ScenarioContext {
  addLink(labelTh: string, href: string): void;
}

export interface ScenarioDef {
  info: ScenarioInfo;
  run(ctx: ScenarioContext): Promise<void>;
}
