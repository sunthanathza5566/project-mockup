'use client';

/**
 * ช่องเลือก "ขอบเขต" ที่กรองตามบทบาท (R2-F10 · BUG-0002-P2) — ใช้ร่วม 3 จุด: อนุมัติคำขอ / เพิ่มผู้ใช้ / เพิ่มบทบาท
 * - แสดงเฉพาะระดับที่ใช้ได้กับบทบาท (`scopesForRole` ← backend `allowedScopeTypes`)
 * - ค่าว่าง '' = ยังไม่เลือก → มีตัวเลือก "— เลือกขอบเขต —" (disabled) ให้ผู้ใช้เลือกเอง
 * - ไม่มีตัวเลือกที่ใช้ได้ (เช่น กรรมการแต่ยังไม่มีรอบ) → select ปิด + ข้อความอธิบายใน option
 * - error ใต้ช่อง (aq-field-error) + aria-invalid/aria-describedby · help ใต้ช่องบอกระดับที่ใช้ได้
 */
import type { RoleCode } from '@/lib/types';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { LABEL, emptyScopeText, scopesForRole, type ScopeOption } from './shared';
import { allowedScopeTypes } from '@/lib/api';

const LEVEL_TH = { university: 'ทั้งมหาวิทยาลัย', faculty: 'คณะ', programme: 'หลักสูตร', cycle: 'รอบประเมิน' } as const;

/** ข้อความช่วย: "บทบาทนี้ใช้ขอบเขตระดับ: หลักสูตร" */
export function scopeHelp(role: RoleCode): string {
  return `บทบาทนี้ใช้ขอบเขตระดับ${allowedScopeTypes(role).map(t => LEVEL_TH[t]).join(' / ')}`;
}

export default function ScopeSelect({ id, role, scopes, value, onChange, testId, error, label = 'ขอบเขต', className }: {
  id: string; role: RoleCode; scopes: ScopeOption[]; value: string; onChange: (v: string) => void;
  testId?: string; error?: string; label?: string; className?: string;
}) {
  const options = scopesForRole(scopes, role);
  const describedBy = [`${id}-help`, error && `${id}-err`].filter(Boolean).join(' ');
  return (
    <div className={className ?? 'space-y-1.5'}>
      <label htmlFor={id} className={LABEL}>{label}</label>
      <NativeSelect
        id={id} value={options.length ? value : ''} disabled={options.length === 0}
        onChange={e => onChange(e.target.value)} data-testid={testId}
        aria-invalid={!!error || undefined} aria-describedby={describedBy}
      >
        {options.length === 0 ? (
          <option value="">{emptyScopeText(role)}</option>
        ) : (
          <>
            {!value && <option value="" disabled>— เลือกขอบเขต —</option>}
            {options.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </>
        )}
      </NativeSelect>
      <p className="aq-help" id={`${id}-help`}>{scopeHelp(role)}</p>
      {error && <p className="aq-field-error" id={`${id}-err`}>{error}</p>}
    </div>
  );
}
