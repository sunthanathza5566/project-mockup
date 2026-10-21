/**
 * AUN-QA Copilot — API facade (Phase A: localStorage, key prefix `aunqa_`)
 * frontend import จากที่นี่ที่เดียว:  import { ... } from '@/lib/api'
 *
 * TODO(PostgreSQL): แทนที่ implementation ด้วย fetch('/api/...') / server action โดยคง signature เดิม
 */
export * from './db';            // AunqaError, KEYS
export * from './rbac';          // can, hasRole, isAssessorOf, Action, Scope
export * from './auth.api';      // loginUser, logoutUser, getCurrentUser, createUser, setUserRoles, deleteUser
export * from './org.store';     // getUniversity, getFaculties, getProgrammes, listUsers
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
export * from './export-assessment'; // Appendix B / D (M12)
export * from './curriculum.store';  // PLO/course/CLO/map/methods (M4) + getCurriculumGaps/Matrix
export { curriculumGaps, curriculumMatrix, findPrereqCycles } from './curriculum-gap';
export * from './action.store';      // action plan (M14)
export * from './assessor.store';     // findings / committee rating / verdict (M12)
// หมายเหตุ: evidence-text.internal / curriculum-data.internal ไม่ถูก export ผ่าน facade โดยเจตนา (ไม่มี guard)
