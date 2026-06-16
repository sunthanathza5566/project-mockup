'use client';

import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';

export default function CtaSection() {
  const router     = useRouter();
  const { showToast } = useToast();

  return (
    <section className="cta-section" id="contact">
      <div className="cta-inner">
        <div>
          <div className="section-label">พร้อมเริ่มต้นแล้วหรือยัง?</div>
          <h2 className="section-title">
            เริ่มต้นใช้งาน<em>EduFlow</em><br />วันนี้ ฟรี 30 วัน
          </h2>
          <p className="section-desc">
            ไม่ต้องใช้บัตรเครดิต · ติดตั้งง่าย · ทีมงานช่วยเหลือตลอด 24 ชั่วโมง
          </p>
        </div>
        <div className="cta-actions">
          <button className="btn-cta-main" onClick={() => router.push('/register')}>
            สมัครใช้งานฟรี →
          </button>
          <button className="btn-cta-outline" onClick={() => showToast('ติดต่อทีมงานเพื่อนัดสาธิต...')}>
            นัดสาธิตระบบ
          </button>
        </div>
      </div>
    </section>
  );
}
