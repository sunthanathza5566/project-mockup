/**
 * Hero (ADR-UI-001 pages.md P1) — L1b fade-up ครั้งเดียว (CSS) · hero card: ring 45/53 ค่าคงที่ของเดโม่ (L2)
 * + ป้าย "ตัวอย่างข้อมูลเดโม่" + mini heatmap 53 จุด (ตกแต่ง aria-hidden มีข้อความสรุปข้างบน)
 */
import Link from 'next/link';
import ProgressRing from '@/components/ui/ProgressRing';
import Icon from '@/components/ui/Icon';
import { Badge } from '@/components/aunqa/common';

/** ภาพตัวอย่าง 53 ช่อง: 45 อนุมัติ · 5 รอตรวจ · 3 เตือน (ตกแต่งเท่านั้น ตรงกับตัวเลขบนการ์ด) */
const WARN_AT = new Set([6, 22, 40]);
const READY_AT = new Set([12, 27, 33, 46, 51]);
const MINI = Array.from({ length: 53 }, (_, i) => (WARN_AT.has(i) ? 'warning' : READY_AT.has(i) ? 'ready' : 'approved'));

export default function HeroSection() {
  return (
    <section className="aq-hero" id="home" aria-labelledby="hero-h">
      <div className="aq-hero__content">
        <Badge tone="primary" icon={false}>AUN-QA ระดับหลักสูตร · Version 4.0</Badge>
        <h1 className="aq-hero__title" id="hero-h">
          ทำ SAR ให้เสร็จ<br />อย่างมี<span className="aq-hero__mark">หลักฐาน</span>
        </h1>
        <p className="aq-hero__lead">
          ผู้ช่วยจัดทำรายงานประเมินตนเองตามเกณฑ์ AUN-QA ครบ 8 เกณฑ์ 53 ข้อ — AI เป็นผู้ช่วยเสนอ ไม่ใช่ผู้ตัดสิน
        </p>
        <div className="aq-hero__actions">
          <Link href="/login" className="aq-btn aq-btn-primary" data-testid="hero-start">
            เริ่มใช้งาน<Icon name="chevron-right" size={20} />
          </Link>
          <a href="#flow" className="aq-btn">ดูขั้นตอน</a>
        </div>
      </div>

      <div className="aq-card aq-card--accent aq-hero__card">
        <div className="aq-card__head">
          <h2 className="aq-h3">รอบประเมินเดโม่ 2569</h2>
          <Badge tone="neutral" icon="info">ตัวอย่างข้อมูลเดโม่</Badge>
        </div>
        <div className="aq-hero__ring">
          <ProgressRing value={45} max={53} caption="อนุมัติแล้ว" ariaLabel="ตัวอย่าง: อนุมัติแล้ว 45 จาก 53 ข้อ" />
          <div className="aq-stack">
            <p>อนุมัติแล้ว 45 จาก 53 ข้อ · รอตรวจ 5 · ต้องเติม 3</p>
            <span><Badge tone="ok">ผ่านการตรวจอ้างอิง</Badge></span>
          </div>
        </div>
        <div className="aq-mini-heat" aria-hidden="true">
          {MINI.map((l, i) => <i key={i} className={`aq-heat-${l}`} />)}
        </div>
      </div>
    </section>
  );
}
