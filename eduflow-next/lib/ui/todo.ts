/**
 * งานที่ต้องทำต่อ role — ฝั่งแสดงผล (ADR-UI-001 ข้อ 6.2 B2, components.md C6, pages.md P5)
 * - `todoTotal` = นิยามเดียวของตัวเลข badge ทั้งระบบ (ผลรวม count — U1b M2)
 * - `groupForHome` รวมการ์ด write_section ที่ไม่เร่งด่วนเมื่อมี > 3 (แสดงผลเท่านั้น — U1b m5)
 * - `TODO_ACTION` ตาราง kind → ไอคอน / ป้ายปุ่ม / ปลายทาง
 */
import type { TodoItem, TodoKind } from '@/lib/types';
import type { IconName } from '@/components/ui/Icon';
import { sectionHref } from './aunqa';

/** อีเวนต์ให้ AppSidebar คำนวณ badge ใหม่ หลัง action ที่เปลี่ยนสถานะงาน */
export const TODOS_CHANGED_EVENT = 'aunqa:todos-changed';
export function notifyTodosChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(TODOS_CHANGED_EVENT));
}

const REVIEW_KINDS: TodoKind[] = ['review_sections', 'faculty_review', 'final_approve'];

/** badge "หน้าหลัก" — ผลรวม count ทุก kind */
export function todoTotal(items: Pick<TodoItem, 'count'>[]): number {
  return items.reduce((s, t) => s + (t.count > 0 ? t.count : 0), 0);
}

/** badge "รอตรวจ" — ผลรวม count ของ review_sections + faculty_review + final_approve */
export function reviewTotal(items: Pick<TodoItem, 'kind' | 'count'>[]): number {
  return todoTotal(items.filter(t => REVIEW_KINDS.includes(t.kind)));
}

/** ข้อความตัวเลขบน badge: ซ่อนเมื่อ 0 (คืน null), > 99 = "99+" */
export function countLabel(n: number): string | null {
  if (n <= 0) return null;
  return n > 99 ? '99+' : String(n);
}

const cycleHref = (t: TodoItem) => (t.cycleId ? `/app/cycles/${encodeURIComponent(t.cycleId)}` : '/app/cycles');
const secHref = (t: TodoItem) => (t.cycleId && t.requirementIds?.[0] ? sectionHref(t.cycleId, t.requirementIds[0]) : '/app');

/** assess_cycle ที่ให้คะแนนครบ 8/8 แล้ว (titleTh ตาม ADR 6.2 B2) */
export function isAssessReadyToSubmit(t: Pick<TodoItem, 'kind' | 'titleTh'>): boolean {
  return t.kind === 'assess_cycle' && /^(เลือก verdict และ)?ส่งผลประเมิน/.test(t.titleTh);
}

export interface TodoActionView { icon: IconName; label: string; href: string }

/** ตาราง kind → ปุ่ม (pages.md P5) */
export function todoAction(t: TodoItem): TodoActionView {
  switch (t.kind) {
    case 'write_section':      return { icon: 'pencil', label: 'เขียนข้อนี้', href: secHref(t) };
    case 'fix_section':        return { icon: 'undo', label: 'ไปแก้ไขข้อนี้', href: secHref(t) };
    case 'translation_review': return { icon: 'languages', label: 'ตรวจคำแปล', href: secHref(t) };
    case 'review_sections':    return { icon: 'inbox-check', label: `ตรวจ ${t.count} ข้อ`, href: '/app/review' };
    case 'assign_sections':    return { icon: 'users', label: 'มอบหมายงาน', href: `${cycleHref(t)}/assign` };
    case 'submit_cycle':       return { icon: 'check-circle', label: 'ส่งให้ QA คณะ', href: cycleHref(t) };
    case 'revise_cycle':       return { icon: 'undo', label: 'เปิดรอบเพื่อแก้ไข', href: cycleHref(t) };
    case 'faculty_review':     return { icon: 'inbox-check', label: 'ตรวจรอบนี้', href: cycleHref(t) };
    case 'final_approve':      return { icon: 'lock', label: 'พิจารณาอนุมัติ', href: cycleHref(t) };
    case 'start_assessment':   // detailTh มีเฉพาะเมื่อยังไม่มีกรรมการ (B2) → ไปหน้ามอบหมาย
      return { icon: 'calendar-cycle', label: 'เริ่มการประเมิน', href: t.detailTh ? `${cycleHref(t)}/assign` : cycleHref(t) };
    case 'assess_cycle':
      return isAssessReadyToSubmit(t)
        ? { icon: 'check-circle', label: 'ส่งผลประเมิน', href: `${cycleHref(t)}/assess#assess-progress` }
        : { icon: 'library', label: 'ไปพื้นที่ทำงานกรรมการ', href: `${cycleHref(t)}/assess` };
    case 'resolve_pii':        return { icon: 'alert-triangle', label: 'ดูหลักฐานที่มี PII', href: '/app/evidence?pii=1' };
    case 'verify_actions':     return { icon: 'list-check', label: 'ตรวจรับแผนปรับปรุง', href: '/app/actions?status=done' };
    case 'start_cycle':        return { icon: 'calendar-cycle', label: 'เริ่มดำเนินการรอบ', href: cycleHref(t) };
    case 'close_cycle':        return { icon: 'check', label: 'ปิดรอบ', href: cycleHref(t) };
  }
}

/** การ์ดบนหน้าหลัก: todo จริง 1 รายการ · การ์ดรวม write_section · คำขอเข้าใช้งานรออนุมัติ (ผู้ดูแล — V1 m2) */
export type HomeTodo =
  | { kind: 'item'; item: TodoItem; action: TodoActionView }
  | { kind: 'write_section_group'; items: TodoItem[]; titleTh: string; action: TodoActionView }
  | { kind: 'access_requests'; count: number; titleTh: string; action: TodoActionView };

/** ปลายทางของงาน "อนุมัติคำขอเข้าใช้งาน" (แท็บคำขอของหน้าผู้ดูแลระบบ — ตรงกับ notificationHref target admin/requests) */
export const ACCESS_REQUESTS_HREF = '/app/admin?tab=requests';

/**
 * แทรกงาน "อนุมัติคำขอเข้าใช้งาน N รายการ" (n = countPendingAccessRequests ของผู้มี user.manage) ต่อจากงานเร่งด่วน
 * ไม่ใช่ TodoKind ของ backend — เป็นงานฝั่งแสดงผลจากตัวนับคำขอ · n ≤ 0 = คืนรายการเดิม
 */
export function withAccessRequests(home: HomeTodo[], n: number): HomeTodo[] {
  if (n <= 0) return home;
  const req: HomeTodo = {
    kind: 'access_requests', count: n,
    titleTh: `อนุมัติคำขอเข้าใช้งาน ${n} รายการ`,
    action: { icon: 'shield-user', label: 'ดูคำขอเข้าใช้งาน', href: ACCESS_REQUESTS_HREF },
  };
  const at = home.findIndex(h => !(h.kind === 'item' && h.item.urgent));
  const i = at < 0 ? home.length : at;
  return [...home.slice(0, i), req, ...home.slice(i)];
}

/** ตัวนับ "หน้าหลัก" + "(รวม N งาน)" = todoTotal + คำขอเข้าใช้งานรออนุมัติ (นิยามเดียว ทั้ง sidebar และหน้าหลัก) */
export function homeTotal(items: Pick<TodoItem, 'count'>[], accessRequests: number): number {
  return todoTotal(items) + Math.max(0, accessRequests);
}

/** วันที่ถือว่า "ใกล้กำหนดส่ง" สำหรับประโยคสรุปในการ์ดทักทาย (V1 m3) */
export const SOON_DAYS = 7;

/**
 * ประโยคสรุปในการ์ดทักทาย — ต้องสอดคล้องกับรายการ "สิ่งที่ต้องทำ" เสมอ (V1 m3)
 * 0 งาน → ไม่มีงานค้าง · มี urgent → N งานที่ควรทำก่อน · มีกำหนดส่ง ≤ 7 วัน → บอกจำนวนวัน · อื่น ๆ → มี N งาน ยังไม่เร่งด่วน
 */
export function greetingSummaryTh(items: Pick<TodoItem, 'count' | 'urgent' | 'daysLeft'>[], accessRequests = 0): string {
  const total = homeTotal(items, accessRequests);
  if (total === 0) return 'วันนี้ไม่มีงานค้าง';
  const urgent = items.filter(t => t.urgent).length;
  if (urgent > 0) return `วันนี้มี ${urgent} งานที่ควรทำก่อน`;
  const soon = items
    .map(t => t.daysLeft)
    .filter((d): d is number => d !== undefined && d >= 0 && d <= SOON_DAYS)
    .reduce<number | undefined>((a, d) => (a === undefined || d < a ? d : a), undefined);
  if (soon === 0) return `มี ${total} งานรอท่าน · ครบกำหนดส่งวันนี้`;
  if (soon !== undefined) return `มี ${total} งานรอท่าน · ใกล้กำหนดส่งที่สุดอีก ${soon} วัน`;
  return `มี ${total} งานรอท่าน · ยังไม่มีงานเร่งด่วน`;
}

/** ถ้า write_section ที่ไม่ urgent มี > 3 รายการ → รวมเป็นการ์ดเดียวที่ตำแหน่งของรายการแรก (การแสดงผลเท่านั้น) */
export function groupForHome(items: TodoItem[]): HomeTodo[] {
  const calm = items.filter(t => t.kind === 'write_section' && !t.urgent);
  if (calm.length <= 3) return items.map(item => ({ kind: 'item', item, action: todoAction(item) }));
  const nearest = calm.reduce((a, b) => ((b.daysLeft ?? Infinity) < (a.daysLeft ?? Infinity) ? b : a), calm[0]);
  const when = nearest.daysLeft === undefined ? 'ยังไม่กำหนดส่ง' : `เหลือ ${nearest.daysLeft} วัน`;
  const group: HomeTodo = {
    kind: 'write_section_group',
    items: calm,
    titleTh: `เขียนอีก ${calm.length} ข้อ (ใกล้สุด ${nearest.requirementIds?.[0] ?? ''} · ${when})`,
    action: { icon: 'pencil', label: 'ดูรายการข้อของฉัน', href: '#mywork' },
  };
  const out: HomeTodo[] = [];
  let placed = false;
  for (const item of items) {
    if (item.kind === 'write_section' && !item.urgent) {
      if (!placed) { out.push(group); placed = true; }
      continue;
    }
    out.push({ kind: 'item', item, action: todoAction(item) });
  }
  return out;
}
