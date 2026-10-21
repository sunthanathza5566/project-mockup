/**
 * initAunqa / resetDemo — seed ข้อมูลเดโม่ครั้งแรก (users, org, cycle-demo-2569, evidence, metrics)
 * ข้อมูลทั้งหมดสมมติ (lib/mock-data/aunqa/**) · เรียกได้ซ้ำปลอดภัย (idempotent + กัน race ด้วย promise)
 * TODO(PostgreSQL): แทนที่ด้วย migration + seed script ฝั่ง server
 */
import type { AppUser, MetricValue } from '../types';
import {
  DEMO_EVIDENCE, DEMO_FACULTY, DEMO_METRICS, DEMO_PROGRAMMES, DEMO_UNIVERSITY, DEMO_UNIVERSITY_2, DEMO_USERS,
} from '../mock-data/aunqa';
import { appendAudit } from './audit.store';
import { hashPassword } from './auth.api';
import { assignCriterion, createCycle } from './cycle.store';
import { AunqaError, KEYS, clearAllAunqa, load, save } from './db';
import { createEvidence } from './evidence.store';
import { can } from './rbac';
import { transitionCycle } from './workflow';

export const DEMO_CYCLE_ID = 'cycle-demo-2569';
const DEMO_PROGRAMME_ID = 'prog-demo-cs';
const DEMO_CHAIR_ID = 'u-chair';
const DEMO_OWNER_ID = 'u-staff1';

function isoPlusDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

let seeding: Promise<void> | null = null;

async function seed(): Promise<void> {
  if (typeof window === 'undefined' || localStorage.getItem(KEYS.seeded)) return;

  save(KEYS.universities, [DEMO_UNIVERSITY, DEMO_UNIVERSITY_2]);
  save(KEYS.faculties, [DEMO_FACULTY]);
  save(KEYS.programmes, DEMO_PROGRAMMES);
  const users: AppUser[] = [];
  for (const u of DEMO_USERS) users.push({ ...u, password: await hashPassword(u.password) });
  save(KEYS.users, users);

  const chair = users.find(u => u.id === DEMO_CHAIR_ID)!;
  const cycle = createCycle(chair, {
    id: DEMO_CYCLE_ID, programmeId: DEMO_PROGRAMME_ID, academicYear: 2569,
    submissionDue: isoPlusDays(60), assessmentDate: isoPlusDays(120),
  });
  // มอบหมายเกณฑ์ที่ 1 (C1) ให้อาจารย์คนหนึ่ง — due ใกล้พอให้เห็นแจ้งเตือน 7 วัน
  assignCriterion(chair, cycle.id, 1, DEMO_OWNER_ID, isoPlusDays(5));
  await transitionCycle(chair, cycle.id, 'in_progress', 'เริ่มรอบเดโม่');

  for (const e of DEMO_EVIDENCE) {
    await createEvidence(chair, {
      programmeId: e.programmeId, title: e.title, description: e.description, kind: e.kind, pdcaStage: e.pdcaStage,
      academicYear: e.academicYear, cycleId: cycle.id, requirementIds: e.requirementIds, extractedText: e.extractedText,
    });
  }

  // metrics — เก็บตรง ๆ (ผ่าน validate ตอนออกแบบ seed แล้ว) เพื่อไม่ให้ audit ท่วม
  save<MetricValue>(KEYS.metrics, DEMO_METRICS.map(m => ({ ...m })));
  appendAudit(null, { action: 'system.seed', targetType: 'system', targetId: 'demo', after: { metrics: DEMO_METRICS.length, evidence: DEMO_EVIDENCE.length } }, DEMO_UNIVERSITY.id);

  localStorage.setItem(KEYS.seeded, '1');
}

/** เรียกตอนแอปเปิด (ซ้ำได้) — seed เฉพาะครั้งแรก */
export function initAunqa(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!seeding) {
    seeding = seed().catch(err => {
      // seed ไม่สำเร็จ → ล้างครึ่ง ๆ กลาง ๆ เพื่อให้ลองใหม่ได้ (ไม่ throw รายละเอียดภายในออก UI)
      clearAllAunqa();
      console.error('[aunqa] seed failed', err instanceof Error ? err.message : 'unknown');
      throw new Error('เริ่มต้นข้อมูลเดโม่ไม่สำเร็จ');
    }).finally(() => { seeding = null; });
  }
  return seeding;
}

/** ล้างข้อมูล aunqa_* ทั้งหมดแล้ว seed ใหม่ (เฉพาะเดโม่ — ล้าง audit ด้วย) */
export async function resetDemo(actor: AppUser): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!can(actor, 'user.manage', { universityId: actor.universityId })) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์รีเซ็ตข้อมูลเดโม่');
  // TODO(Phase B): ปิดฟังก์ชันนี้เมื่อไม่ใช่โหมดเดโม่ (env flag)
  if (seeding) await seeding.catch(() => undefined);
  clearAllAunqa();
  await initAunqa();
}

export function isSeeded(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem(KEYS.seeded);
}

/** จำนวนข้อมูลสำหรับหน้า admin/เดโม่ */
export function demoStats(): { users: number; evidence: number; audit: number } {
  return { users: load(KEYS.users).length, evidence: load(KEYS.evidence).length, audit: load(KEYS.audit).length };
}
