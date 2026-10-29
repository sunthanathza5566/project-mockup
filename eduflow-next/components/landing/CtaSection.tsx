/**
 * CTA (#contact) — TASK-0002 saas-spec §P1: การ์ดกว้าง rounded-xl border bg-card กึ่งกลาง (ยกเลิกแถบพื้นเข้มแบบเดิม)
 * ปุ่มหลัก default 1 ปุ่ม + ปุ่มรอง outline
 */
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives/button';

export default function CtaSection() {
  return (
    <section className="scroll-mt-16 px-4 pb-16 md:px-6 md:pb-24" id="contact" aria-labelledby="cta-h">
      <div className="mx-auto max-w-screen-xl rounded-xl border bg-card p-8 text-center text-card-foreground shadow-sm dark:shadow-none md:p-12">
        <h2 className="text-3xl font-semibold" id="cta-h">พร้อมเริ่มรอบประเมินแล้วหรือยัง</h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">ข้อมูลทั้งหมดเป็นข้อมูลสมมติ เก็บในเบราว์เซอร์ของคุณเท่านั้น · มีบัญชีทดสอบทุกบทบาท</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/login">เข้าสู่ระบบ<Icon name="chevron-right" size={20} /></Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">ลองบัญชีเดโม่</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
