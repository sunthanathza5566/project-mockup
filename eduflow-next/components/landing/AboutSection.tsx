/**
 * จุดเด่น (#about) — ADR-UI-001 pages.md P1 · TASK-0002 saas-spec §P1: h2 กลาง + grid การ์ด (ไอคอนในกล่อง border bg-muted)
 * ไอคอน Icon.tsx แทน emoji · JSX แทน dangerouslySetInnerHTML · กฎตรวจช่องว่าง R1–R11 (C-8 UI)
 * grid: sm 2 คอลัมน์ · xl 4 คอลัมน์ (มี 4 ข้อ — lg:3 ตาม spec จะเหลือการ์ดเดี่ยว 1 ใบ จึงใช้ 4 ที่ ≥1280)
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
    <section className="scroll-mt-16 px-4 py-16 md:px-6 md:py-24" id="about" aria-labelledby="about-h">
      <div className="mx-auto max-w-screen-xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold text-foreground" id="about-h">จุดเด่น</h2>
          <p className="mt-3 text-lg text-muted-foreground">ออกแบบจากงานจริงของหลักสูตร — ไม่ให้คะแนนแทนกรรมการ ไม่แต่งหลักฐานขึ้นเอง</p>
        </div>
        <ul className="m-0 mt-12 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
          {ITEMS.map(m => (
            <li key={m.title} className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm dark:shadow-none">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-muted text-foreground" aria-hidden="true">
                <Icon name={m.icon} size={20} />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{m.title}</h3>
              <p className="mt-2 text-muted-foreground">{m.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
