/**
 * AUN-QA Copilot — API facade (Phase A: localStorage, key prefix `aunqa_`)
 * frontend import จากที่นี่ที่เดียว:  import { ... } from '@/lib/api'
 *
 * TODO(PostgreSQL): แทนที่ implementation ด้วย fetch('/api/...') / server action โดยคง signature เดิม
 */
export * from './db';            // AunqaError, KEYS
export * from './rbac';          // can, hasRole, isAssessorOf, Action, Scope
export * from './auth.api';      // loginUser, logoutUser, getCurrentUser, createUser, setUserRoles, deleteUser, setUserStatus, PASSWORD_MIN/MAX
export * from './onboarding.store'; // ADR-AUTH-001: inviteUser, acceptInvitation, submitAccessRequest, approve/rejectAccessRequest …
export * from './org.store';     // getUniversity, getFaculties, getProgrammes, listUsers, findUniversityByEmail
export * from './framework';     // listCriteria, listRequirements, searchRequirements, listMetricDefinitions
export * from './init';          // initAunqa, resetDemo
export * from './cycle.store';   // createCycle, listCycles, assignSections, assignCriterion, assignAssessor
export * from './workflow';      // transitionCycle, transitionSection, openRevision, verifySnapshot
export * from './evidence.store';
export * from './sar.store';
export * from './gap';           // pure rules R1–R10, readiness
export * from './dashboard';     // getReadiness, getGaps
export * from './metrics.store';
export * from './notification.store';
export * from './audit.store';
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
