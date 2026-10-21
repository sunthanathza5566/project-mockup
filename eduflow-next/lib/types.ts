/**
 * Domain types — AUN-QA Copilot (spec หัวข้อ 4.1 / 8)
 *
 * ส่วน "Contract" ด้านบนต้องตรงกับที่ตกลงใน TASK-0001 (db-engineer ใช้ใน lib/mock-data/aunqa/**)
 * TODO(PostgreSQL): แต่ละ interface = 1 ตารางในหัวข้อ 8 ของ spec (camelCase ↔ snake_case)
 */

// ═══════════════════════ Contract (ห้ามเปลี่ยนชื่อ) ═══════════════════════

export type RoleCode = 'super_admin'|'uni_admin'|'programme_chair'|'programme_staff'|'data_staff'|'faculty_qa'|'dean'|'assessor';
export type CriterionGroup = 'design'|'resource'|'output';
export type PdcaStage = 'P'|'D'|'C'|'A';
export type EvidenceKind = 'policy'|'plan'|'minutes'|'survey'|'statistics'|'photo'|'publication'|'other';

export interface Criterion { no: number; nameEn: string; nameTh: string; group: CriterionGroup }
export interface Requirement {
  id: string; /* '1.1' */ criterionNo: number; textEn: string; textTh: string; plainTh: string;
  suggestedEvidence: string[]; diagnosticQuestions: string[]; tipTh: string; /* ทำอย่างไรให้ถึงระดับ 4 */
  relatedMetrics: string[]; needsBenchmark: boolean; needsTrend: boolean;
}
export interface University { id: string; nameTh: string; nameEn: string; emailDomain: string; aiEnabled: boolean }
export interface Faculty { id: string; universityId: string; nameTh: string; nameEn: string }
export interface Programme {
  id: string; universityId: string; facultyId: string; code: string; nameTh: string; nameEn: string;
  degreeLevel: 'bachelor'|'master'|'doctoral'; curriculumYear: number;
}
export interface RoleAssignment { role: RoleCode; scopeType: 'university'|'faculty'|'programme'|'cycle'; scopeId: string }
export interface AppUser {
  id: string; username: string; password: string; /* plaintext (seed) หรือ 'sha256:…' */
  universityId: string; email: string; fullName: string; roles: RoleAssignment[];
}
export interface MetricDefinition {
  code: string; nameTh: string; nameEn: string; unit: string;
  periodType: 'academic_year'|'fiscal_year'|'calendar_year'|'cohort'|'graduation_year';
}
export interface MetricValue {
  id: string; programmeId: string; code: string; period: number; value: number;
  targetValue?: number; benchmarkValue?: number; benchmarkSource?: string;
}
export interface DemoEvidenceSeed {
  title: string; description: string; kind: EvidenceKind; pdcaStage: PdcaStage;
  academicYear: number; requirementIds: string[]; extractedText: string; programmeId: string;
}

// ═══════════════════════ Cycle & SAR ═══════════════════════

export type CycleStatus =
  | 'draft' | 'in_progress' | 'under_review' | 'revision_requested'
  | 'faculty_approved' | 'final_approved' | 'under_assessment' | 'assessed' | 'closed';
export type SectionStatus = 'not_started' | 'drafting' | 'ready_for_review' | 'changes_requested' | 'approved';

export interface AssessmentCycle {
  id: string;
  universityId: string;
  programmeId: string;
  frameworkCode: string;            // 'AUNQA-P-v4'
  academicYear: number;             // พ.ศ. (เช่น 2569)
  status: CycleStatus;
  submissionDue?: string;           // ISO date
  assessmentDate?: string;
  revision: number;                 // เริ่ม 1 · เปิด revision ใหม่หลัง lock → +1
  lockedAt?: number;
  lockedBy?: string;
  snapshotHash?: string;            // sha256 ของ snapshot JSON ทั้งเล่ม
  copiedFromCycleId?: string;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
}

export interface PdcaFlags { plan: boolean; do: boolean; check: boolean; act: boolean }

export interface SarSection {
  id: string;                       // `${cycleId}::${requirementId}`
  cycleId: string;
  requirementId: string;
  ownerUserId?: string;
  due?: string;                     // ISO date
  status: SectionStatus;
  narrativeTh: string;
  narrativeEn: string;
  pdca: PdcaFlags;
  wordCount: number;
  updatedAt: number;
  updatedBy?: string;
}

export interface SarSectionVersion {
  id: string; sectionId: string; narrativeTh: string; narrativeEn: string; pdca: PdcaFlags;
  savedBy: string; savedAt: number; reason: 'autosave' | 'manual' | 'ai_accept' | 'submit';
}

export type RaterType = 'self' | 'committee' | 'ai_suggestion';
export interface Rating {
  id: string; cycleId: string; requirementId: string; raterType: RaterType;
  raterUserId: string; score: number; /* 1–7 */ rationale: string; at: number;
}

export interface Comment {
  id: string; cycleId: string; targetType: 'section' | 'cycle'; targetId: string;
  authorId: string; body: string; parentId?: string;
  anchor?: { start: number; end: number; text: string };
  at: number; resolvedAt?: number; resolvedBy?: string;
}

export interface ReviewEvent {
  id: string; cycleId: string; targetType: 'cycle' | 'section'; targetId: string;
  fromStatus: string; toStatus: string; actorId: string; note?: string; at: number;
}

// ═══════════════════════ Evidence ═══════════════════════

export type EvidenceStatus = 'uploaded' | 'tagged' | 'verified';
export type PiiKind = 'thai_id' | 'student_id' | 'email' | 'phone';
export interface PiiFinding { kind: PiiKind; count: number; sample: string /* masked */ }

export interface Evidence {
  id: string;
  universityId: string;
  programmeId: string;
  code: string;                     // 'E-1.4-02' unique ต่อ programme
  title: string;
  description: string;
  aiSummary?: string;
  kind: EvidenceKind;
  pdcaStage: PdcaStage;
  academicYear: number;
  currentFileId?: string;
  url?: string;
  sha256?: string;
  containsPii: boolean;
  piiKinds: PiiKind[];
  piiResolved: boolean;
  piiResolvedNote?: string;
  status: EvidenceStatus;
  verifiedBy?: string;
  verifiedAt?: number;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
}

export interface EvidenceLink {
  id: string;
  evidenceId: string;
  requirementId: string;
  cycleId: string;
  source: 'manual' | 'ai';
  confidence?: number;
  confirmedBy?: string;
  at: number;
}

/** เวอร์ชันของไฟล์หลักฐาน — เก็บ metadata + text ที่ extract เสมอ, dataUrl เฉพาะไฟล์ ≤ 1MB */
export interface EvidenceFile {
  id: string; evidenceId: string; version: number; name: string; mime: string; size: number;
  sha256: string; extractedText?: string; dataUrl?: string; uploadedBy: string; uploadedAt: number;
}

// ═══════════════════════ Notifications / Audit / AI ═══════════════════════

export type NotificationKind =
  | 'assigned' | 'comment' | 'changes_requested' | 'approved' | 'cycle_status' | 'deadline';
export interface AppNotification {
  id: string; universityId: string; userId: string; kind: NotificationKind;
  cycleId?: string; requirementId?: string; messageTh: string;
  dedupeKey?: string; createdAt: number; readAt?: number;
}

export interface AuditLog {
  id: string; universityId: string; programmeId?: string; actorId: string; actorName: string;
  action: string; targetType: string; targetId: string;
  before?: unknown; after?: unknown; ip: string; at: number;
}

export type AiFeature = 'AI-1' | 'AI-2' | 'AI-3';
export interface PostCheckResult {
  ok: boolean;
  removedCitations: string[];       // [E-…] ที่ไม่มีจริง (ถูกตัด)
  unknownNumbers: string[];         // ตัวเลขที่ไม่พบใน input (ติดธง)
  flaggedSentences: string[];
}
export interface AiRun {
  id: string; universityId: string; feature: AiFeature; promptVersion: string; model: string;
  cycleId?: string; requirementId?: string; evidenceId?: string;
  inputRefs: string[];              // code ของ evidence / id ที่ใช้
  redactedInputHash: string; redactionCount: number;
  output: unknown; postCheck: PostCheckResult;
  createdBy: string; createdAt: number;
  accepted: boolean; acceptedBy?: string; acceptedAt?: number; latencyMs: number;
}

// ═══════════════════════ Gap / Readiness ═══════════════════════

export type GapRuleId = 'R1'|'R2'|'R3'|'R4'|'R5'|'R6'|'R7'|'R8'|'R9'|'R10';
export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';
export interface Gap {
  id: string; ruleId: GapRuleId; severity: GapSeverity; requirementId: string;
  messageTh: string; evidenceId?: string; metricCode?: string;
}

export type HeatLevel = 'empty' | 'critical' | 'warning' | 'ok' | 'ready' | 'approved';
export interface HeatCell {
  requirementId: string; criterionNo: number; sectionStatus: SectionStatus;
  level: HeatLevel; score: number; gaps: Record<GapSeverity, number>;
}
export interface PendingWork { userId: string; open: number; overdue: number; nextDue?: string; requirementIds: string[] }
export interface Readiness {
  percent: number;                  // 0–100
  heatmap: HeatCell[];              // 53 ช่อง
  gapCounts: Record<GapSeverity, number>;
  gaps: Gap[];
  pending: PendingWork[];
}

// ═══════════════════════ Session ═══════════════════════

export interface Session {
  userId: string; username: string; fullName: string; universityId: string;
  roles: RoleAssignment[]; loginAt: number;
}
