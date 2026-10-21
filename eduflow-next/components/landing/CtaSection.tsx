'use client';

import { useRouter } from 'next/navigation';

export default function CtaSection() {
  const router = useRouter();
  return (
    <section className="cta-section" id="contact">
      <div className="cta-inner">
        <div>
          <div className="section-label">พร้อมลองแล้วหรือยัง?</div>
          <h2 className="section-title">ลองใช้ <em>AUN-QA Copilot</em><br />กับข้อมูลเดโม่</h2>
          <p className="section-desc">
            ข้อมูลทั้งหมดเป็นข้อมูลสมมติ เก็บในเบราว์เซอร์ของคุณเท่านั้น · มีบัญชีทดสอบทุกบทบาทให้กดเลือก
          </p>
        </div>
        <div className="cta-actions">
          <button className="btn-cta-main" onClick={() => router.push('/login')}>เข้าสู่ระบบเดโม่ →</button>
        </div>
      </div>
    </section>
  );
}
