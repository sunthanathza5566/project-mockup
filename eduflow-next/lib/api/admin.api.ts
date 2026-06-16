/**
 * Admin API — ตอนนี้ใช้ localStorage, พร้อมเปลี่ยนเป็น PostgreSQL
 */

import { getUsers, saveUsers, getPermissions, savePermissions, getWebAdminLog } from './auth.api';
import type { User, Permissions } from '../types';

// TODO(PostgreSQL): SELECT * FROM users ORDER BY role, created_at DESC
export async function getAllUsers(): Promise<User[]> {
  return getUsers();
}

// TODO(PostgreSQL): DELETE FROM users WHERE username = $1 AND role != 'web_admin'
export async function deleteUserById(username: string): Promise<void> {
  saveUsers(getUsers().filter(u => u.username !== username));
}

// TODO(PostgreSQL): SELECT role, permission_key, allowed FROM role_permissions
export async function getAllPermissions(): Promise<Permissions> {
  return getPermissions();
}

// TODO(PostgreSQL): UPDATE role_permissions SET allowed = $1 WHERE role = $2 AND permission_key = $3
export async function updatePermission(role: string, perm: string, val: boolean): Promise<void> {
  const perms = getPermissions();
  if (perms[role as keyof Permissions]) {
    (perms[role as keyof Permissions] as Record<string, boolean>)[perm] = val;
    savePermissions(perms);
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
