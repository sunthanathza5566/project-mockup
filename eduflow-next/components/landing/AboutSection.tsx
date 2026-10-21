/**
 * จุดเด่น (#about) — ADR-UI-001 pages.md P1 · ไอคอน Icon.tsx แทน emoji · JSX แทน dangerouslySetInnerHTML
 * · กฎตรวจช่องว่าง R1–R11 (C-8 UI)
 */
import type { ReactNode } from 'react';
import Icon, { type IconName } from '@/components/ui/Icon';

const ITEMS: { icon: IconName; title: string; body: ReactNode }[] = [
  { icon: 'link', title: 'หลักฐานชิ้นเดียว ผูกได้หลายข้อ',
    body: <>ไม่ต้องคัดลอก รหัส <strong>E-x.x-nn</strong> ไม่ซ้ำและอ้างอิงในเนื้อหาได้ทันที</> },
  { icon: 'search', title: 'ตรวจช่องว่าง R1–R11 + heatmap',
    body: <>แสดง heatmap 53 ข้อและความพร้อมด้านหลักฐาน รู้ว่าต้องเติมอะไรก่อน</> },
  { icon: 'lock', title: 'อนุมัติตามบทบาท + ล็อก + hash',
    body: <>ล็อกฉบับเมื่ออนุมัติสุดท้าย พร้อมลายนิ้วมือเอกสาร (hash) ตรวจย้อนได้</> },
  { icon: 'shield-user', title: 'AI ปกปิดข้อมูลส่วนบุคคล + ต้องกดยอมรับ',
    body: <>ตรวจการอ้างอิงและตัวเลข และต้องให้คนกด “ยอมรับ” ก่อนเข้าเอกสาร</> },
];

export default function AboutSection() {
  return (
    <section className="aq-lsection" id="about" aria-labelledby="about-h">
      <div className="aq-lsection__inner">
        <h2 className="aq-lsection__title" id="about-h">จุดเด่น</h2>
        <p className="aq-lsection__lead">ออกแบบจากงานจริงของหลักสูตร — ไม่ให้คะแนนแทนกรรมการ ไม่แต่งหลักฐานขึ้นเอง</p>
        <ul className="aq-features">
          {ITEMS.map(m => (
            <li key={m.title} className="aq-card aq-feature">
              <span className="aq-feature__icon" aria-hidden="true"><Icon name={m.icon} size={24} /></span>
              <h3 className="aq-feature__title">{m.title}</h3>
              <p className="aq-muted">{m.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
