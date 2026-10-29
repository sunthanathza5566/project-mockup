/**
 * map โทนสถานะ → class Tailwind (ADR-UI-002 D6, saas-spec §C4)
 * ทุกค่าเป็น literal เต็ม — ห้ามประกอบชื่อ class จาก string (JIT ต้องสแกนเจอ, ไม่ใช้ safelist)
 * คู่สีทั้งหมดอยู่ในตาราง contrast saas-tokens §T2 (`*` บน `*-muted`)
 */
import type { HeatLevel } from '@/lib/types';
import type { Tone } from './status';

export type { Tone };
/** โทนของ InlineMessage/Alert — S1 ย้ายการประกาศจาก common.tsx มาใช้ตัวนี้แล้ว re-export */
export type MsgTone = 'success' | 'warn' | 'danger' | 'info' | 'neutral';

/** pill/badge พื้นอ่อน (คู่ #20 #21 #24 #27 #11 #6) */
export const TONE_SOFT: Record<Tone, string> = {
  ok: 'bg-success-muted text-success',
  warn: 'bg-warning-muted text-warning',
  bad: 'bg-destructive-muted text-destructive',
  info: 'bg-info-muted text-info',
  primary: 'bg-primary-muted text-primary',
  neutral: 'bg-muted text-muted-foreground',
};

/** สีตัวอักษร/ไอคอนสถานะบนการ์ด/พื้นหน้า (คู่ #18 #22 #25 #28 #9 #5) */
export const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-success',
  warn: 'text-warning',
  bad: 'text-destructive',
  info: 'text-info',
  primary: 'text-primary',
  neutral: 'text-muted-foreground',
};

/** InlineMessage/Alert: กล่อง (ขอบ + พื้นอ่อน) และสีไอคอน — เนื้อความใช้ text-foreground (คู่ #30–33) */
export const MSG_TONE: Record<MsgTone, { box: string; icon: string }> = {
  success: { box: 'border-success/30 bg-success-muted', icon: 'text-success' },
  warn: { box: 'border-warning/30 bg-warning-muted', icon: 'text-warning' },
  danger: { box: 'border-destructive/30 bg-destructive-muted', icon: 'text-destructive' },
  info: { box: 'border-info/30 bg-info-muted', icon: 'text-info' },
  neutral: { box: 'border-border bg-muted', icon: 'text-muted-foreground' },
};

/** ช่อง heatmap (C9) — "ว่าง" ใช้เส้นประ border-input (คู่ #16) */
export const HEAT_CLASS: Record<HeatLevel, string> = {
  empty: 'border-dashed border-input bg-muted text-muted-foreground',
  critical: 'border-transparent bg-destructive-muted text-destructive',
  warning: 'border-transparent bg-warning-muted text-warning',
  ok: 'border-transparent bg-primary-muted text-primary',
  ready: 'border-transparent bg-info-muted text-info',
  approved: 'border-transparent bg-success-muted text-success',
};

/** ระดับใน matrix หลักสูตร (P12) */
export const MATRIX_LEVEL: Record<'I' | 'R' | 'M', string> = {
  I: 'bg-primary-muted text-foreground',
  R: 'bg-info-muted text-info',
  M: 'bg-primary text-primary-foreground',
};
