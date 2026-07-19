'use client';

import { useEffect, useState } from 'react';
import type { StudentProfile } from '@/lib/types';
import { getWalletBalance, getWalletTxns, type WalletTxn } from '@/lib/api/wallet.store';

interface Props {
  profile: StudentProfile;
  showToast: (m: string) => void;
}

const TXN_META: Record<WalletTxn['type'], { icon: string; color: string }> = {
  'topup-promptpay': { icon: '📲', color: 'var(--success)' },
  'topup-admin':     { icon: '🛠', color: 'var(--success)' },
  'purchase':        { icon: '🛍', color: 'var(--absent)' },
};

/**
 * กระเป๋าเงินนักเรียน — ดูยอด/ประวัติได้อย่างเดียว
 * การเติมเงินทำได้เฉพาะ "ผู้ปกครอง" (ผ่าน PromptPay) เพื่อควบคุมการใช้จ่ายของนักเรียน
 */
export default function TopupView({ profile }: Props) {
  const [balance, setBalance] = useState(0);
  const [txns,    setTxns]    = useState<WalletTxn[]>([]);

  useEffect(() => {
    setBalance(getWalletBalance(profile.studentId));
    setTxns(getWalletTxns(profile.studentId));
  }, [profile.studentId]);

  return (
    <div className="stu-view-wrap">
      <div className="stu-page-header">
        <h2 className="stu-page-title">💰 กระเป๋าเงินของฉัน</h2>
        <p className="stu-page-sub">ใช้ซื้อของที่ร้านค้าโรงเรียน · เติมเงินโดยผู้ปกครองเท่านั้น</p>
      </div>

      {/* ยอดคงเหลือ */}
      <div style={{ background: 'var(--brown-dark)', color: 'var(--cream)', borderRadius: 16, padding: '1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem' }}>ยอดเงินคงเหลือ</div>
        <div style={{ fontSize: '2.2rem', fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>฿{balance.toLocaleString('th-TH')}</div>
      </div>

      {/* กติกา */}
      <div className="stu-lib-note" style={{ marginBottom: '1.25rem' }}>
        🔒 <strong>เติมเงินได้เฉพาะผู้ปกครอง</strong> ผ่านหน้า Dashboard ผู้ปกครอง (PromptPay)
        เพื่อควบคุมการใช้จ่ายให้อยู่ในขอบเขตที่ผู้ปกครองกำหนด — หากยอดเงินหมด จะไม่สามารถซื้อของได้
        · กรณีระบบขัดข้อง ผู้ดูแลระบบเติมให้ได้โดยยืนยันตัวตนด้วยบัตรประชาชน
      </div>

      {/* ประวัติรายการ */}
      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--brown-dark)', marginBottom: '0.6rem' }}>ประวัติรายการ ({txns.length})</div>
      {txns.length === 0
        ? <div className="stu-empty">ยังไม่มีรายการ — ให้ผู้ปกครองเติมเงินก่อนเริ่มใช้งาน</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {txns.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.6rem 0.9rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{TXN_META[t.type].icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--brown-dark)', fontWeight: 500 }}>{t.detail}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(t.at).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · โดย {t.by}
                  </div>
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: TXN_META[t.type].color, whiteSpace: 'nowrap' }}>
                  {t.amount > 0 ? '+' : ''}฿{Math.abs(t.amount).toLocaleString('th-TH')}
                </span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
