/**
 * ตรวจสิทธิ์การใช้งานแบบ sync (ใช้ในหน้า UI ก่อน render ปุ่ม/หน้าจอ)
 *
 * แหล่งความจริง: eduflow_permissions ใน localStorage (web admin เป็นคนตั้ง)
 * merge กับ DEFAULT_PERMISSIONS เสมอ เพื่อให้สิทธิ์ที่เพิ่มใหม่มีค่าเริ่มต้นทันที
 *
 * TODO(PostgreSQL): ย้ายไป SELECT allowed FROM role_permissions WHERE role=$1 AND permission_key=$2
 *   และต้องบังคับซ้ำที่ server (RLS) — ฝั่ง client เป็นแค่การซ่อน UI เท่านั้น
 */

import { getPermissions, getSession } from './auth.api';
import { DEFAULT_PERMISSIONS } from '../mock-data';
import type { Permissions, Role } from '../types';

/**
 * รวมสิทธิ์ที่แอดมินตั้งไว้กับค่าเริ่มต้น — แหล่งความจริงเดียวของกติกาการ merge
 * (สิทธิ์ที่เพิ่มใหม่ในโค้ดมีค่าเริ่มต้นทันที · key เก่าที่เลิกใช้ถูกตัดทิ้ง)
 */
export function mergePermissions(stored: Partial<Permissions>): Permissions {
  const merged = {} as Permissions;
  (Object.keys(DEFAULT_PERMISSIONS) as (keyof Permissions)[]).forEach(role => {
    merged[role] = { ...DEFAULT_PERMISSIONS[role], ...(stored[role] || {}) };
    Object.keys(merged[role]).forEach(k => { if (!(k in DEFAULT_PERMISSIONS[role])) delete merged[role][k]; });
  });
  return merged;
}

/** web_admin คือ super admin — ผ่านทุกสิทธิ์เสมอ */
export function hasPermission(key: string, role?: Role): boolean {
  const r = role || getSession()?.role;
  if (!r) return false;
  if (r === 'web_admin') return true;
  if (!(r in DEFAULT_PERMISSIONS)) return false;

  return mergePermissions(getPermissions())[r as keyof Permissions][key] === true;
}

/** ใช้กับหน้าที่ต้อง login ก่อน + ต้องมีสิทธิ์นั้น */
export function requirePermission(key: string): { ok: boolean; reason?: string } {
  const session = getSession();
  if (!session) return { ok: false, reason: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' };
  if (!hasPermission(key, session.role))
    return { ok: false, reason: 'บัญชีของท่านไม่ได้รับสิทธิ์ใช้งานส่วนนี้ — ติดต่อผู้ดูแลระบบเพื่อขอเปิดสิทธิ์' };
  return { ok: true };
}
