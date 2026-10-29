/**
 * cn — รวม className แบบ shadcn (ADR-UI-002 D2)
 * ใช้ twMerge ค่าเริ่ม: ห้ามเพิ่มชื่อ fontSize ใหม่นอก xs…5xl ถ้าไม่ได้ extendTailwindMerge
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
