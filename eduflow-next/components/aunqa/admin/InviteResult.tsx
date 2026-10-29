'use client';

/**
 * ผลการเชิญ (friendly-spec §F8.1 `invite-result`) — แสดงเหนือตารางจนกว่าผู้ดูแลกดปิด
 * - ลิงก์ใช้ fragment `#t=` (ADR-AUTH-001 A7: ไม่เข้า log ของ server/Referer) · token ดิบมีเฉพาะใน state ของหน้านี้
 *   (ไม่เก็บลง storage) — ปิดกล่อง/ออกจากหน้า = หาย ต้องกด "สร้างลิงก์ใหม่"
 * - คัดลอก: Clipboard API → toast · ใช้ไม่ได้ → เลือกข้อความในช่องให้ + toast บอกให้กด Ctrl+C
 * - เปิดแล้ว focus ที่ช่องลิงก์ (ผู้ใช้คีย์บอร์ด/โปรแกรมอ่านหน้าจอรู้ทันทีว่าผลอยู่ตรงไหน)
 */
import { useEffect, useRef } from 'react';
import { useToast } from '@/context/ToastContext';
import { InlineMessage } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { fmtDateTime } from '@/lib/ui/aunqa';
import { INVITE_DEMO_NOTE } from './shared';

export interface InviteShown { userId: string; fullName: string; token: string; expiresAt: number }

export function inviteLink(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/invite#t=${token}`;
}

export default function InviteResult({ invite, onClose }: { invite: InviteShown; onClose: () => void }) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const link = inviteLink(invite.token);

  useEffect(() => { inputRef.current?.focus(); }, [invite.token]);

  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('no clipboard');
      await navigator.clipboard.writeText(link);
      showToast('คัดลอกลิงก์แล้ว', 'success');
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      showToast('กด Ctrl+C เพื่อคัดลอก', 'info');
    }
  }

  return (
    <InlineMessage
      tone="success" large testId="invite-result" className="mb-6"
      title={`สร้างคำเชิญสำหรับ ${invite.fullName} แล้ว`}
      onClose={onClose}
    >
      <div className="space-y-3">
        <p>คัดลอกลิงก์ส่งให้ผู้ใช้ทางช่องทางของหน่วยงาน</p>
        <p className="aq-meta">{`หมดอายุ ${fmtDateTime(invite.expiresAt)}`}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            ref={inputRef} readOnly value={link} aria-label="ลิงก์เชิญ" className="font-mono sm:flex-1"
            onFocus={e => e.currentTarget.select()} data-testid="invite-link"
          />
          <Button variant="outline" className="shrink-0" onClick={copy} data-testid="invite-copy">
            <Icon name="link" size={20} />คัดลอกลิงก์
          </Button>
        </div>
        <p className="break-all">
          <span>รหัสเชิญ</span>{' '}
          <code className="rounded-md bg-card px-1.5 py-0.5 font-mono text-foreground" data-testid="invite-code">{invite.token}</code>
        </p>
        <p className="aq-meta">ระบบแสดงลิงก์นี้ครั้งเดียว — ถ้าหายให้กด &quot;สร้างลิงก์ใหม่&quot;</p>
        {/* U2: ระบบสาธิตเก็บข้อมูลใน localStorage — ลิงก์ใช้ได้เฉพาะเบราว์เซอร์เดียวกับผู้ดูแล */}
        <p className="flex items-start gap-2 rounded-md bg-card p-3 text-foreground" data-testid="invite-demo-note">
          <Icon name="info" size={20} className="mt-0.5 shrink-0 text-primary" />
          <span>{INVITE_DEMO_NOTE}</span>
        </p>
      </div>
    </InlineMessage>
  );
}
