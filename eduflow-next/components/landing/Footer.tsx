/** footer พื้นเข้มต่อเนื่องจาก CTA (pages.md P1) */
import { Brand } from '@/components/ui/BrandMark';

export default function Footer() {
  return (
    <footer className="aq-footer aq-on-dark">
      <div className="aq-footer__inner">
        <Brand size={20} />
        <p className="aq-on-dark-muted">ข้อมูลทั้งหมดเป็นข้อมูลสมมติเพื่อการสาธิต</p>
      </div>
    </footer>
  );
}
