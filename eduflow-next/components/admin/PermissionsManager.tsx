'use client';

import { useEffect, useState, useCallback } from 'react';
import { PERMISSION_LABELS, ROLE_LABELS } from '@/lib/mock-data';
import { getAllPermissions, updatePermission } from '@/lib/api/admin.api';
import { useDialog } from '@/context/DialogContext';
import type { Permissions } from '@/lib/types';

const ROLE_META: { role: keyof Permissions; icon: string; note?: string }[] = [
  { role: 'teacher',      icon: '🧑‍🏫' },
  { role: 'student',      icon: '🎓' },
  { role: 'parent',       icon: '👨‍👩‍👧', note: 'สิทธิ์เพิ่มเติม เช่น ติดตามบุตรหลานแบบ Realtime จะเปิดใช้เมื่อระบบพร้อม' },
  { role: 'school_admin', icon: '🏫',   note: 'กำหนดขอบเขตการจัดการข้อมูลภายในโรงเรียนของตนเอง' },
];

/**
 * สิทธิ์การเข้าถึง — web admin เป็นผู้กำหนดสิทธิ์ทั้งหมดแต่เพียงผู้เดียว
 * ครอบคลุมทุกฟังก์ชันจริงของแต่ละ role · UI แบบสวิตช์เปิด/ปิด
 */
export default function PermissionsManager() {
  const { confirm, notify } = useDialog();
  const [perms, setPerms] = useState<Permissions | null>(null);

  const refresh = useCallback(() => { getAllPermissions().then(setPerms); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function toggle(role: string, perm: string, val: boolean) {
    const label = PERMISSION_LABELS[role]?.[perm] || perm;
    if (!(await confirm({ title: val ? 'เปิดสิทธิ์นี้?' : 'ปิดสิทธิ์นี้?', message: <>{val ? 'เปิด' : 'ปิด'}สิทธิ์ <b>“{label}”</b> ของ{ROLE_LABELS[role]}</>, variant: val ? 'primary' : 'warning', confirmText: val ? 'เปิดสิทธิ์' : 'ปิดสิทธิ์' }))) { refresh(); return; }
    await updatePermission(role, perm, val);
    refresh();
    notify({ title: val ? 'เปิดสิทธิ์แล้ว' : 'ปิดสิทธิ์แล้ว', message: <>“{label}” · {ROLE_LABELS[role]}</>, variant: 'success' });
  }

  if (!perms) return null;

  return (
    <div className="dash-section">
      <div className="ez-title">สิทธิ์การเข้าถึง</div>
      <div className="ez-subtitle">
        เปิด/ปิดการใช้งานแต่ละฟังก์ชันของทุก role — <b>web admin เป็นผู้กำหนดสิทธิ์ทั้งหมด</b> การเปลี่ยนแปลงถูกบันทึกลง Log ทุกครั้ง
      </div>

      <div className="perm-grid-v2">
        {ROLE_META.map(({ role, icon, note }) => {
          const rp = perms[role];
          const labels = PERMISSION_LABELS[role] || {};
          const enabled = Object.values(rp).filter(Boolean).length;
          return (
            <div key={role} className="perm-card">
              <div className="perm-card-head">
                <span className="perm-card-icon">{icon}</span>
                <div style={{ flex: 1 }}>
                  <div className="perm-card-title">{ROLE_LABELS[role]}</div>
                  <div className="perm-card-sub">เปิดใช้ {enabled} จาก {Object.keys(rp).length} สิทธิ์</div>
                </div>
              </div>
              {note && <div className="perm-card-note">{note}</div>}
              <div className="perm-rows">
                {Object.keys(rp).map(perm => (
                  <label key={perm} className={`perm-row-v2${rp[perm] ? ' on' : ''}`}>
                    <span className="perm-row-label">{labels[perm] || perm}</span>
                    <span className={`perm-switch${rp[perm] ? ' on' : ''}`}>
                      <input type="checkbox" checked={rp[perm]} onChange={e => toggle(role, perm, e.target.checked)} />
                      <span className="perm-knob" />
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
