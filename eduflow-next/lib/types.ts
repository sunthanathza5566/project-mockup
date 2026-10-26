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
/** สถานะบัญชี (ADR-AUTH-001 A1) — ไม่มี field = 'active' (ข้อมูลเดิม/seed ไม่ต้อง migrate) */
export type UserStatus = 'active' | 'invited' | 'pending' | 'suspended';
/** ข้อมูลคำขอเข้าใช้งาน (มีเฉพาะ status 'pending') — ไม่มี role: ผู้อนุมัติเป็นคนกำหนด */
export interface AccessRequestInfo {
  programmeId?: string; facultyId?: string;      // หน่วยงานที่ขอ (อย่างใดอย่างหนึ่งหรือไม่ระบุ = ทั้งมหาวิทยาลัย)
  positionText?: string;                          // ≤100 ตัว — ข้อความประกอบ ไม่ใช่สิทธิ์
  reason: string;                                 // 1–500 ตัว
  requestedAt: number;
}
export interface AppUser {
  id: string; username: string; password: string; /* plaintext (seed) หรือ 'sha256:…' · '' = ยังไม่ตั้ง (invited) */
  universityId: string; email: string; fullName: string; roles: RoleAssignment[];
  /** ไม่มี = 'active' */
  status?: UserStatus;
  /** มีเฉพาะ status 'pending' — ลบทิ้งเมื่ออนุมัติ/ปฏิเสธ */
  accessRequest?: AccessRequestInfo;
}
/** คำเชิญ (aunqa_invitations) — เก็บเฉพาะ hash ของ token · TODO(PostgreSQL): invitations(token_hash unique) */
export interface Invitation {
  id: string;               // newId('inv')
  universityId: string;
  userId: string;           // ผู้ใช้ status 'invited'
  tokenHash: string;        // sha256Hex('aunqa-invite::' + token) — ไม่เก็บ token ดิบ
  createdBy: string;        // userId ผู้เชิญ
  createdAt: number;
  expiresAt: number;        // createdAt + INVITE_TTL_MS (7 วัน)
  usedAt?: number;
  revokedAt?: number;
}
/** ข้อมูลที่หน้า /invite แสดงก่อนตั้งรหัสผ่าน (อ่านอย่างเดียว) */
export interface InvitePreview {
  fullName: string; username: string; universityNameTh: string; universityNameEn: string;
  roles: RoleCode[]; expiresAt: number;
}
/** แถวคำขอเข้าใช้งานสำหรับหน้าผู้ดูแล (ไม่มีรหัสผ่าน) */
export interface AccessRequestView {
  userId: string; username: string; fullName: string; email: string; universityId: string;
  programmeId?: string; facultyId?: string; positionText?: string; reason: string; requestedAt: number;
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
  /** ผู้แก้เนื้อหา (narrative/PDCA) ล่าสุด — ใช้ segregation of duties: คนนี้อนุมัติข้อนี้ไม่ได้ */
  lastAuthorId?: string;
  /** ภาษาที่ได้จากคำแปล offline (แทนเฉพาะศัพท์) และผู้ใช้ยังไม่กดยืนยันว่าแก้เป็นฉบับสมบูรณ์ — gap R11 จนกว่าจะยืนยัน */
  needsTranslationReview?: { th?: boolean; en?: boolean };
}

export interface SarSectionVersion {
  id: string; sectionId: string; narrativeTh: string; narrativeEn: string; pdca: PdcaFlags;
  savedBy: string; savedAt: number; reason: 'autosave' | 'manual' | 'ai_accept' | 'submit';
}

export type RaterType = 'self' | 'committee' | 'ai_suggestion';
export interface Rating {
  id: string; cycleId: string; requirementId: string; raterType: RaterType;
  raterUserId: string; score: number; /* 1–7 */ rationale: string; at: number;
  /** คะแนนกรรมการรายเกณฑ์: criterionNo = 1–8 และ requirementId = `C<no>` */
  criterionNo?: number;
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
  source: 'manual' | 'ai' | 'action';
  confidence?: number;
  confirmedBy?: string;
  at: number;
}

/** เวอร์ชันของไฟล์หลักฐาน — เก็บ metadata + text ที่ extract เสมอ, dataUrl เฉพาะไฟล์ ≤ 1MB */
export interface EvidenceFile {
  id: string; evidenceId: string; version: number; name: string; mime: string; size: number;
  sha256: string; extractedText?: string; dataUrl?: string; uploadedBy: string; uploadedAt: number;
  /** 'not_scanned' = ไฟล์ binary (PDF/DOCX/XLSX/รูป) ยังไม่ได้สแกน PII (Phase B: text extraction) */
  piiScan?: 'scanned' | 'not_scanned';
}

// ═══════════════════════ Notifications / Audit / AI ═══════════════════════

export type NotificationKind =
  | 'assigned' | 'comment' | 'changes_requested' | 'approved' | 'cycle_status' | 'deadline'
  | 'access_request' | 'account';
/** ปลายทางเชิงความหมาย (ADR-AUTH-001 A6) — frontend แปลงเป็น href เอง (lib/ui/notification.ts) */
export type NotificationTarget =
  | { type: 'section'; cycleId: string; requirementId: string; panel?: 'comments' }
  | { type: 'my_work' }
  | { type: 'cycle'; cycleId: string }
  | { type: 'assess'; cycleId: string }
  | { type: 'action'; actionId: string }
  | { type: 'admin'; tab: 'users' | 'requests' }
  | { type: 'home' };
export interface AppNotification {
  id: string; universityId: string; userId: string; kind: NotificationKind;
  cycleId?: string; requirementId?: string; messageTh: string;
  dedupeKey?: string; createdAt: number; readAt?: number;
  /** ใหม่ (optional เพื่อให้แถวเก่าอ่านได้) */
  messageEn?: string; target?: NotificationTarget;
}

export interface AuditLog {
  id: string; universityId: string; programmeId?: string; actorId: string; actorName: string;
  action: string; targetType: string; targetId: string;
  before?: unknown; after?: unknown; ip: string; at: number;
}

export type AiFeature = 'AI-1' | 'AI-2' | 'AI-3' | 'AI-4' | 'AI-7' | 'AI-9';
export interface PostCheckResult {
  ok: boolean;
  removedCitations: string[];       // [E-…] ที่ไม่มีจริง (ถูกตัด)
  unknownNumbers: string[];         // ตัวเลขที่ไม่พบใน input (ติดธง)
  flaggedSentences: string[];
}
export interface AiRun {
  id: string; universityId: string; feature: AiFeature; promptVersion: string; model: string;
  cycleId?: string; requirementId?: string; evidenceId?: string;
  /** AI-7 (ตรวจ PLO/CLO) ผูกกับหลักสูตร ไม่ผูกรอบ */
  programmeId?: string;
  inputRefs: string[];              // code ของ evidence / id ที่ใช้
  redactedInputHash: string; redactionCount: number;
  output: unknown; postCheck: PostCheckResult;
  createdBy: string; createdAt: number;
  accepted: boolean; acceptedBy?: string; acceptedAt?: number; latencyMs: number;
}

// ═══════════════════════ Gap / Readiness ═══════════════════════

export type GapRuleId = 'R1'|'R2'|'R3'|'R4'|'R5'|'R6'|'R7'|'R8'|'R9'|'R10'|'R11';
export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';
export interface Gap {
  id: string; ruleId: GapRuleId; severity: GapSeverity; requirementId: string;
  messageTh: string; evidenceId?: string; metricCode?: string;
  /** อ้างอิงเพิ่มเติม (เช่น id ของ PLO/วิชาที่ทำให้เกิด gap R7) — ใช้ทำ id ไม่ให้ซ้ำ */
  refId?: string;
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
  /** ms — การใช้งานล่าสุด (หมดอายุเมื่อไม่มีการใช้งานเกิน SESSION_IDLE_MS) — ADR-UI-001 B1 */
  lastActiveAt: number;
  /** ms — loginAt + SESSION_ABSOLUTE_MS (ไม่ถูกขยาย) */
  expiresAt: number;
}

// ═══════════════════════ Todo ต่อ role (Phase U, ADR-UI-001 B2) ═══════════════════════

export type TodoKind =
  | 'write_section' | 'fix_section' | 'translation_review'
  | 'review_sections' | 'assign_sections' | 'submit_cycle' | 'revise_cycle'
  | 'faculty_review' | 'final_approve' | 'start_assessment' | 'assess_cycle'
  | 'resolve_pii' | 'verify_actions'
  | 'start_cycle' | 'close_cycle';
export interface TodoItem {
  /** `${kind}:${cycleId ?? programmeId}:${requirementIds?.[0] ?? ''}` */
  id: string;
  kind: TodoKind;
  urgent: boolean;
  /** พร้อมแสดง (ไม่มีชื่อบุคคลอื่น) */
  titleTh: string;
  detailTh?: string;
  programmeId: string;
  cycleId?: string;
  academicYear?: number;
  /** เรียงด้วย compareReqId */
  requirementIds?: string[];
  evidenceIds?: string[];
  actionIds?: string[];
  /** YYYY-MM-DD ใกล้สุดของกลุ่ม */
  due?: string;
  daysLeft?: number;
  /** ≥1 */
  count: number;
}

// ═══════════════════════ Preflight ก่อนเปลี่ยนสถานะรอบ (Phase U, ADR-UI-001 B4) ═══════════════════════

export interface PreflightWarning {
  code: 'critical_gaps' | 'high_gaps' | 'pii_unresolved' | 'translation_review' | 'missing_self_rating' | 'no_assessor';
  count: number;
  messageTh: string;
  /** unique, เรียง compareReqId */
  requirementIds: string[];
}
export interface TransitionPreflight {
  to: CycleStatus;
  /** มี rule จากสถานะปัจจุบัน && can(user, rule.action, cycleScope) */
  allowed: boolean;
  /** ข้อความไทยของเงื่อนไขที่ transitionCycle จะ throw */
  blockers: string[];
  warnings: PreflightWarning[];
  gapCounts: Record<GapSeverity, number>;
  approvedCount: number;
  totalSections: number;
}

// ═══════════════════════ Curriculum (M4) ═══════════════════════
// TODO(PostgreSQL): plos / courses (+course_prerequisites) / clos / clo_plo_map / course_methods

export type PloType = 'generic' | 'specific';
export type MapLevel = 'I' | 'R' | 'M';
export interface Plo {
  id: string; programmeId: string; code: string; textTh: string; textEn: string; type: PloType; bloomLevel: number; /* 1–6 */
}
export interface Course {
  id: string; programmeId: string; code: string; nameTh: string; nameEn: string; credits: number;
  year: number; semester: number; category: string; isElective: boolean; track?: string;
  /** id ของวิชาที่ต้องเรียนก่อน (course_prerequisites) */
  prerequisiteIds: string[];
}
export interface Clo { id: string; courseId: string; code: string; textTh: string; textEn?: string; bloomLevel: number }
export interface CloPloMap { cloId: string; ploId: string; level: MapLevel }
export interface CourseMethod { id: string; courseId: string; kind: 'teaching' | 'assessment'; method: string; cloIds: string[] }

export interface CurriculumData {
  plos: Plo[]; courses: Course[]; clos: Clo[]; map: CloPloMap[]; methods: CourseMethod[];
}
export type CurriculumGapKind = 'plo_no_course' | 'course_no_plo' | 'plo_no_assessment' | 'prereq_cycle';
export interface CurriculumGap { kind: CurriculumGapKind; refId: string; messageTh: string }

// ═══════════════════════ Action plan (M14) ═══════════════════════
// TODO(PostgreSQL): action_items

export type ActionStatus = 'open' | 'in_progress' | 'done' | 'verified';
export interface ActionItem {
  id: string; universityId: string; programmeId: string; originCycleId?: string; requirementId: string;
  description: string; ownerUserId?: string; due?: string; kpi?: string; status: ActionStatus;
  /** evidence ขั้น A ที่สร้างอัตโนมัติจาก action ที่ done/verified (สร้างครั้งแรกตอนเปิดรอบใหม่) */
  evidenceId?: string;
  /** รอบแรกที่ถูกสร้างหลัง action เสร็จ ซึ่งผูก evidence ขั้น A แล้ว — รอบถัดไปไม่ผูกอัตโนมัติ (B6) */
  materializedCycleId?: string;
  doneAt?: number; verifiedBy?: string; verifiedAt?: number;
  createdAt: number; createdBy: string; updatedAt: number;
}

// ═══════════════════════ Assessor workspace (M12) ═══════════════════════
// TODO(PostgreSQL): assessment_findings / assessment_verdicts

export interface AssessmentFinding {
  id: string; cycleId: string; requirementId: string; assessorUserId: string;
  strengths: string; afi: string; interviewQuestions: string; sourcesOfEvidence: string; updatedAt: number;
}
/** verdict 1–7 ตามสเกลเดียวกับคะแนน — กรรมการเลือกเอง ระบบไม่คำนวณ */
export interface AssessmentVerdict {
  id: string; cycleId: string; assessorUserId: string; verdict: number; rationale: string; at: number;
}
