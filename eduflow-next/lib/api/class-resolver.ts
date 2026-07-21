/**
 * ตัวเชื่อม "ห้องเรียน" ระหว่างระบบเก่า (mock classId เช่น c1) กับระบบใหม่ที่มาจากตารางสอน
 *
 * รูปแบบ classId ที่ระบบรองรับ:
 *   - 'c1'          → ห้องจาก mock เดิม (บัญชีเดโม่)
 *   - 'r1#ค21101'   → ห้องจริงจากโครงสร้างวิชาการ (classroomId) + รหัสวิชา ← มาจากตารางสอน
 *
 * มีไว้เพื่อให้ทุกฟีเจอร์ (เช็คชื่อ / การบ้าน / สื่อการสอน / คะแนน) ใช้ห้องชุดเดียวกัน
 * และนักเรียนในห้องนั้นเห็นเฉพาะวิชาที่ตนต้องเรียนจริง
 *
 * TODO(PostgreSQL): เลิกใช้ไฟล์นี้เมื่อย้ายไป DB — ใช้ FK class_id ตรง ๆ ได้เลย
 */

import { TEACHER_DATA_MOCK } from '../mock-data';
import { getAcademicYears, getGradeLevels, getClassrooms, getClassroomStudents } from './academic.store';
import { getClassroomSchedule } from './schedule.store';
import type { TeacherStudent } from '../types';

/** แยก classId เป็นห้อง + รหัสวิชา */
export function parseClassId(classId: string): { roomId: string; subjectCode?: string } {
  const [roomId, subjectCode] = classId.split('#');
  return { roomId, subjectCode };
}

/** สร้าง classId มาตรฐานจากห้อง + รหัสวิชา (รหัสวิชาไม่ซ้ำกันในห้องเดียว) */
export function makeClassId(classroomId: string, subjectCode: string): string {
  return `${classroomId}#${subjectCode}`;
}

/** ห้องเรียนทั้งหมดในระบบ (จากโครงสร้างวิชาการ) */
export function listClassroomIds(): string[] {
  const ids: string[] = [];
  getAcademicYears().forEach(y =>
    getGradeLevels(y.id).forEach(g =>
      getClassrooms(g.id).forEach(r => ids.push(r.id))));
  return ids;
}

/** รายชื่อนักเรียนของ classId — รองรับทั้งรูปแบบเก่าและใหม่ */
export function getClassStudentList(classId: string): TeacherStudent[] {
  const { roomId } = parseClassId(classId);
  const mock = TEACHER_DATA_MOCK.students.filter(s => s.classId === roomId);
  if (mock.length > 0) return mock;
  return getClassroomStudents(roomId);
}

/** ห้องเรียน (classroomId) ของนักเรียนคนนี้ตามโครงสร้างวิชาการ */
export function getStudentRoomId(studentCode: string): string | null {
  if (!studentCode) return null;
  for (const roomId of listClassroomIds()) {
    if (getClassroomStudents(roomId).some(s => s.code === studentCode)) return roomId;
  }
  return null;
}

/**
 * classId ทั้งหมดที่นักเรียนคนนี้เกี่ยวข้อง — ใช้กรองการบ้าน/สื่อการสอน/ประกาศ
 * รวม: ห้อง mock เดิม + ห้องจริง + ทุกวิชาที่อยู่ในตารางเรียนของห้องนั้น
 */
export function getStudentClassIds(studentCode: string): string[] {
  const ids = new Set<string>();

  const mock = TEACHER_DATA_MOCK.students.find(s => s.code === studentCode);
  if (mock) ids.add(mock.classId);

  const roomId = getStudentRoomId(studentCode);
  if (roomId) {
    ids.add(roomId);
    getClassroomSchedule(roomId).forEach(slot => ids.add(makeClassId(roomId, slot.subjectCode)));
  }
  return Array.from(ids);
}
