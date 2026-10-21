/**
 * ตารางแมปสถานะ → tone + ไอคอน (+ ข้อความ) — ADR-UI-001 components.md C11, C13 · pages.md P14
 * ข้อความไทยหลักอยู่ใน `lib/ui/aunqa.ts` (ที่เดียว) — ไฟล์นี้อ้างอิงต่อ
 * ทุกสถานะแสดงเป็น สี + ไอคอน + ข้อความ เสมอ
 */
import type { CycleStatus, EvidenceStatus, GapSeverity, HeatLevel, SectionStatus } from '@/lib/types';
import type { IconName } from '@/components/ui/Icon';
import { ACTION_STATUS_TH, CYCLE_STATUS_TH, HEAT_TH, SECTION_STATUS_TH, SEVERITY_TH } from './aunqa';

export type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'primary';

export interface StatusView { label: string; tone: Tone; icon: IconName }

/** ไอคอนตั้งต้นของแต่ละ tone (Badge ใช้เมื่อไม่ส่ง icon) — primary = ไม่มีไอคอน */
export const TONE_ICON: Record<Tone, IconName | null> = {
  ok: 'check-circle', warn: 'alert-triangle', bad: 'x-circle', info: 'info', neutral: 'circle-dashed', primary: null,
};

export const SECTION_STATUS_VIEW: Record<SectionStatus, StatusView> = {
  not_started:       { label: SECTION_STATUS_TH.not_started,       tone: 'neutral', icon: 'circle-dashed' },
  drafting:          { label: SECTION_STATUS_TH.drafting,          tone: 'primary', icon: 'pencil' },
  ready_for_review:  { label: SECTION_STATUS_TH.ready_for_review,  tone: 'info',    icon: 'clock' },
  changes_requested: { label: SECTION_STATUS_TH.changes_requested, tone: 'warn',    icon: 'undo' },
  approved:          { label: SECTION_STATUS_TH.approved,          tone: 'ok',      icon: 'check-circle' },
};

export const CYCLE_STATUS_VIEW: Record<CycleStatus, StatusView> = {
  draft:              { label: CYCLE_STATUS_TH.draft,              tone: 'neutral', icon: 'circle-dashed' },
  in_progress:        { label: CYCLE_STATUS_TH.in_progress,        tone: 'primary', icon: 'pencil' },
  under_review:       { label: CYCLE_STATUS_TH.under_review,       tone: 'info',    icon: 'clock' },
  revision_requested: { label: CYCLE_STATUS_TH.revision_requested, tone: 'warn',    icon: 'undo' },
  faculty_approved:   { label: CYCLE_STATUS_TH.faculty_approved,   tone: 'info',    icon: 'clock' },
  final_approved:     { label: CYCLE_STATUS_TH.final_approved,     tone: 'ok',      icon: 'lock' },
  under_assessment:   { label: CYCLE_STATUS_TH.under_assessment,   tone: 'info',    icon: 'clock' },
  assessed:           { label: CYCLE_STATUS_TH.assessed,           tone: 'ok',      icon: 'check-circle' },
  closed:             { label: CYCLE_STATUS_TH.closed,             tone: 'neutral', icon: 'check' },
};

export const EVIDENCE_STATUS_VIEW: Record<EvidenceStatus, StatusView> = {
  uploaded: { label: 'อัปโหลดแล้ว',     tone: 'neutral', icon: 'file-text' },
  tagged:   { label: 'AI แนะนำข้อแล้ว', tone: 'info',    icon: 'sparkle' },
  verified: { label: 'ตรวจสอบแล้ว',     tone: 'ok',      icon: 'check-circle' },
};

/** PII ของหลักฐาน */
export const PII_VIEW = {
  unresolved: { label: 'PII ยังไม่จัดการ', tone: 'bad', icon: 'alert-triangle' },
  notScanned: { label: 'ยังไม่ได้ตรวจ PII', tone: 'neutral', icon: 'circle-dashed' },
} as const satisfies Record<string, StatusView>;

export const SEVERITY_VIEW: Record<GapSeverity, StatusView> = {
  critical: { label: SEVERITY_TH.critical, tone: 'bad',     icon: 'x-circle' },
  high:     { label: SEVERITY_TH.high,     tone: 'warn',    icon: 'alert-triangle' },
  medium:   { label: SEVERITY_TH.medium,   tone: 'info',    icon: 'info' },
  low:      { label: SEVERITY_TH.low,      tone: 'neutral', icon: 'circle-dashed' },
};

/** ช่อง heatmap (C13): ไอคอนระดับ + คลาส tone (`aq-heat-{level}`) */
export const HEAT_VIEW: Record<HeatLevel, { label: string; icon: IconName }> = {
  empty:    { label: HEAT_TH.empty,    icon: 'circle-dashed' },
  critical: { label: HEAT_TH.critical, icon: 'x-circle' },
  warning:  { label: HEAT_TH.warning,  icon: 'alert-triangle' },
  ok:       { label: HEAT_TH.ok,       icon: 'check' },
  ready:    { label: HEAT_TH.ready,    icon: 'clock' },
  approved: { label: HEAT_TH.approved, icon: 'check-circle' },
};

/** แผนปรับปรุง (P14) */
export const ACTION_STATUS_VIEW: Record<keyof typeof ACTION_STATUS_TH, StatusView> = {
  open:        { label: ACTION_STATUS_TH.open,        tone: 'neutral', icon: 'circle-dashed' },
  in_progress: { label: ACTION_STATUS_TH.in_progress, tone: 'primary', icon: 'pencil' },
  done:        { label: ACTION_STATUS_TH.done,        tone: 'info',    icon: 'clock' },
  verified:    { label: ACTION_STATUS_TH.verified,    tone: 'ok',      icon: 'check-circle' },
};

/** ผู้ตอบของ AI run (C11) */
export function aiModelView(model: string): StatusView {
  return model.startsWith('offline')
    ? { label: 'โหมดในเครื่อง (offline)', tone: 'neutral', icon: 'settings' }
    : { label: 'Claude', tone: 'info', icon: 'sparkle' };
}
