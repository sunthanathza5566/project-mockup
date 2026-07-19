/**
 * Admin API — ตอนนี้ใช้ localStorage, พร้อมเปลี่ยนเป็น PostgreSQL
 * ทุก action สำคัญบันทึกลง activity log เพื่อตรวจสอบย้อนหลัง
 */

import { getUsers, saveUsers, getPermissions, savePermissions, getWebAdminLog, hashPassword } from './auth.api';
import { logActivity } from './activity.log';
import { DEFAULT_PERMISSIONS, PERMISSION_LABELS, ROLE_LABELS } from '../mock-data';
import type { User, Permissions, Role } from '../types';

// TODO(PostgreSQL): SELECT * FROM users ORDER BY role, created_at DESC
export async function getAllUsers(): Promise<User[]> {
  return getUsers();
}

// TODO(PostgreSQL): INSERT INTO users (...) VALUES (...) — เฉพาะ web_admin
export async function addUserAccount(u: { username: string; password: string; role: Role; name: string; code?: string; school?: string }): Promise<{ ok: boolean; error?: string }> {
  const users = getUsers();
  if (users.some(x => x.username === u.username)) return { ok: false, error: 'username นี้มีอยู่แล้ว' };
  if (users.some(x => u.code && x.code === u.code && x.role === u.role)) return { ok: false, error: 'รหัสนี้มีบัญชีอยู่แล้ว' };
  users.push({ ...u, password: await hashPassword(u.password), createdAt: new Date().toISOString().slice(0, 10) });
  saveUsers(users);
  logActivity('admin', 'เพิ่มผู้ใช้', `${ROLE_LABELS[u.role] || u.role}: ${u.name} (${u.username})`);
  return { ok: true };
}

// TODO(PostgreSQL): DELETE FROM users WHERE username = $1 AND role != 'web_admin'
export async function deleteUserById(username: string): Promise<void> {
  const target = getUsers().find(u => u.username === username);
  saveUsers(getUsers().filter(u => u.username !== username));
  logActivity('admin', 'ลบผู้ใช้', target ? `${ROLE_LABELS[target.role] || target.role}: ${target.name} (${username})` : username);
}

// TODO(PostgreSQL): SELECT role, permission_key, allowed FROM role_permissions
// merge กับ DEFAULT เพื่อให้ key สิทธิ์ที่เพิ่มใหม่ปรากฏแม้ localStorage จะมีข้อมูลเก่า
export async function getAllPermissions(): Promise<Permissions> {
  const stored = getPermissions();
  const merged = {} as Permissions;
  (Object.keys(DEFAULT_PERMISSIONS) as (keyof Permissions)[]).forEach(role => {
    merged[role] = { ...DEFAULT_PERMISSIONS[role], ...(stored[role] || {}) };
    // ตัด key เก่าที่ไม่มีในแคตตาล็อกปัจจุบันออก
    Object.keys(merged[role]).forEach(k => { if (!(k in DEFAULT_PERMISSIONS[role])) delete merged[role][k]; });
  });
  return merged;
}

// TODO(PostgreSQL): UPDATE role_permissions SET allowed = $1 WHERE role = $2 AND permission_key = $3
export async function updatePermission(role: string, perm: string, val: boolean): Promise<void> {
  const perms = await getAllPermissions();
  if (perms[role as keyof Permissions]) {
    perms[role as keyof Permissions][perm] = val;
    savePermissions(perms);
    logActivity('admin', 'แก้ไขสิทธิ์', `${ROLE_LABELS[role] || role} · ${PERMISSION_LABELS[role]?.[perm] || perm} → ${val ? 'เปิด' : 'ปิด'}`);
  }
}

// TODO(PostgreSQL): SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 20
export async function getAdminLog() {
  return getWebAdminLog();
}

// TODO(PostgreSQL): SELECT COUNT(*) FROM users, SELECT COUNT(*) FROM schools
export async function getSystemStats() {
  const users = getUsers();
  const log = getWebAdminLog();
  return {
    totalUsers: users.length,
    totalSchools: 847,
    adminLoginCount: log.loginHistory.length,
    adminCount: log.admins.length,
  };
}

// TODO(PostgreSQL): SELECT COUNT(*) FROM students WHERE school_id = $1, etc.
export async function getSchoolAdminStats(schoolId: string) {
  return {
    teachers: 42,
    students: 1240,
    onTimeToday: 71,
    absentToday: 8,
    lateToday: 21,
  };
}
