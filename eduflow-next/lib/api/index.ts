/**
 * AUN-QA Copilot — API facade (Phase A: localStorage, key prefix `aunqa_`)
 * frontend import จากที่นี่ที่เดียว:  import { ... } from '@/lib/api'
 *
 * TODO(PostgreSQL): แทนที่ implementation ด้วย fetch('/api/...') / server action โดยคง signature เดิม
 */
// R2-B5 (S-09, กฎ B7): db / auth.api / workflow / notification.store / audit.store export เป็นรายชื่อ
//   ตัวที่ตั้งใจไม่ export (เขียน/อ่านข้อมูลดิบโดยไม่มี actor/guard — ใช้ได้เฉพาะภายใน lib/api):
//   db: load, save, clearAllAunqa · auth.api: getUsers, saveUsers · workflow: getCycleRaw, saveCycle, addReviewEvent,
//   getSnapshots, buildSnapshotObject, computeSnapshotHash · notification.store: notify · audit.store: appendAudit, appendAuditThrottled
//   เพิ่ม export ใหม่ในโมดูลเหล่านี้ต้องเพิ่มชื่อที่นี่เอง (ตั้งใจ: ไม่หลุดออก facade โดยไม่รู้ตัว)
export { KEYS, AunqaError } from './db';
export type { AunqaErrorCode } from './db';
export * from './rbac';          // can, hasRole, isAssessorOf, Action, Scope
export {
  PASSWORD_MIN, PASSWORD_MAX, INVITE_TTL_MS, USERNAME_RE, USERNAME_INVALID_MESSAGE, EMAIL_RE,
  userStatus, isActiveUser, isActorActive, requireActiveActor, validatePassword,
  ROLE_SCOPE_TYPES, allowedScopeTypes, isRoleScopeCompatible, validateRoleScopes,
  withoutPassword, sanitizeRoles, hashPassword, getLockUntil, remainingAttempts,
  SESSION_IDLE_MS, SESSION_ABSOLUTE_MS, getSession, clearSession, touchSession, sessionTimeLeft, sessionExpiryKind,
  subscribeSession, getCurrentUser, loginUser, logoutUser,
  createUser, setUserRoles, deleteUser, setUserStatus, hasRoleCode,
} from './auth.api';
export type { ScopeType, LoginResult, NewUserInput } from './auth.api';
export * from './onboarding.store'; // ADR-AUTH-001: inviteUser, acceptInvitation, submitAccessRequest, approve/rejectAccessRequest …
export * from './org.store';     // getUniversity, getFaculties, getProgrammes, listUsers, findUniversityByEmail
export * from './framework';     // listCriteria, listRequirements, searchRequirements, listMetricDefinitions
export * from './init';          // initAunqa, resetDemo
export * from './cycle.store';   // createCycle, listCycles, assignSections, assignCriterion, assignAssessor
export {
  CYCLE_TRANSITIONS, SECTION_TRANSITIONS, isAllowedCycleTransition, isAllowedSectionTransition,
  nextCycleStatuses, nextSectionStatuses, cycleScope, assertCycleWritable, assertSectionEditable,
  assertSectionsEditable, isSectionEditable, listReviewEvents, verifySnapshot,
  transitionCycle, openRevision, transitionSection,
} from './workflow';
export type { TransitionRule, Snapshot } from './workflow';
export * from './evidence.store';
export * from './sar.store';
export * from './gap';           // pure rules R1–R10, readiness
export * from './dashboard';     // getReadiness, getGaps
export * from './metrics.store';
export {
  sectionsTarget, requirementsEn, deadlineBucket, daysUntil, syncDeadlineNotifications,
  listNotifications, unreadCount, markRead,
} from './notification.store';
export type { NotifyInput } from './notification.store';
export { SYSTEM_ACTOR_ID, listAudit, auditToCsv } from './audit.store';
export type { AuditInput, AuditFilter } from './audit.store';
export * from './ai.service';
export * from './export';
export * from './export-docx';      // exportSarDocx (DOCX จริง)
export * from './metrics-import';   // template / preview+commit metrics / cohort (M6)
export * from './export-assessment'; // Appendix B / D (M12)
export * from './curriculum.store';  // PLO/course/CLO/map/methods (M4) + getCurriculumGaps/Matrix
export { curriculumGaps, curriculumMatrix, findPrereqCycles } from './curriculum-gap';
// action plan (M14) — export เป็นรายชื่อ: materializeActionEvidence ไม่ตรวจสิทธิ์ ห้ามหลุดออก facade (B7)
export {
  ACTION_TRANSITIONS, nextActionStatuses, listActionItems, createActionItem, updateActionItem, deleteActionItem,
  setActionStatus, createActionsFromAfi,
} from './action.store';
export type { ActionTransition, ActionItemInput } from './action.store';
export * from './assessor.store';     // findings / committee rating / verdict (M12)
export * from './todo';               // listMyTodos (Phase U, ADR-UI-001 B2)
export * from './preflight';          // getTransitionPreflight (Phase U, ADR-UI-001 B4)
// หมายเหตุ: evidence-text.internal / curriculum-data.internal / invitation.internal (revokeInvitationsOf, S-05)
//   / notification.internal (purgeAccessRequestNotices, S-01) ไม่ถูก export ผ่าน facade โดยเจตนา (ไม่มี guard)
