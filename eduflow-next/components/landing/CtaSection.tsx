/** CTA band (#contact) พื้นเข้ม aq-on-dark — ปุ่มบนพื้นเข้มตาม C1 (U1b F3) */
import Link from 'next/link';
import Icon from '@/components/ui/Icon';

export default function CtaSection() {
  return (
    <section className="aq-cta-band aq-on-dark" id="contact" aria-labelledby="cta-h">
      <div className="aq-cta-band__inner">
        <div>
          <h2 className="aq-cta-band__title" id="cta-h">พร้อมเริ่มรอบประเมินแล้วหรือยัง</h2>
          <p className="aq-on-dark-muted">ข้อมูลทั้งหมดเป็นข้อมูลสมมติ เก็บในเบราว์เซอร์ของคุณเท่านั้น · มีบัญชีทดสอบทุกบทบาท</p>
        </div>
        <div className="aq-cluster">
          <Link href="/login" className="aq-btn aq-btn-primary">เข้าสู่ระบบ<Icon name="chevron-right" size={20} /></Link>
          <Link href="/login" className="aq-btn">ลองบัญชีเดโม่</Link>
        </div>
      </div>
    </section>
  );
}
