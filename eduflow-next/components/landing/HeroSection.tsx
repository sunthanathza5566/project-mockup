/**
 * Hero (ADR-UI-001 pages.md P1 · TASK-0002 saas-spec §P1) — กึ่งกลาง: badge outline → h1 → lead → ปุ่ม → "ภาพผลิตภัณฑ์" (การ์ด)
 * - พื้น: ลายตาราง 1px สี --border จางด้วย mask radial (CSS ล้วน ตกแต่ง aria-hidden)
 * - L1b fade-up ครั้งเดียว · การ์ด: ring 45/53 ค่าคงที่ของเดโม่ (L2) + ป้าย "ตัวอย่างข้อมูลเดโม่"
 *   + mini heatmap 53 จุด (ตกแต่ง aria-hidden มีข้อความสรุปข้างบน)
 */
import Link from 'next/link';
import ProgressRing from '@/components/ui/ProgressRing';
import Icon from '@/components/ui/Icon';
import { Badge } from '@/components/aunqa/common';
import { Badge as TagBadge } from '@/components/ui/primitives/badge';
import { Button } from '@/components/ui/primitives/button';
import { cn } from '@/lib/ui/cn';

/** ภาพตัวอย่าง 53 ช่อง: 45 อนุมัติ · 5 รอตรวจ · 3 เตือน (ตกแต่งเท่านั้น ตรงกับตัวเลขบนการ์ด) */
const WARN_AT = new Set([6, 22, 40]);
const READY_AT = new Set([12, 27, 33, 46, 51]);
type MiniLevel = 'warning' | 'ready' | 'approved';
const MINI: MiniLevel[] = Array.from({ length: 53 }, (_, i) => (WARN_AT.has(i) ? 'warning' : READY_AT.has(i) ? 'ready' : 'approved'));
/** ช่องเล็ก 12px ใช้สีสถานะทึบ (ตกแต่ง ไม่มีข้อความบนช่อง) */
const MINI_CLASS: Record<MiniLevel, string> = { warning: 'bg-warning', ready: 'bg-info', approved: 'bg-success' };

const GRID_BG =
  'pointer-events-none absolute inset-0 -z-10 ' +
  'bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] ' +
  'bg-[size:2.5rem_2.5rem] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]';

export default function HeroSection() {
  return (
    <section className="relative isolate scroll-mt-16 overflow-x-clip px-4 py-16 md:px-6 md:py-24" id="home" aria-labelledby="hero-h">
      <div className={GRID_BG} aria-hidden="true" />
      <div className="mx-auto flex max-w-screen-xl flex-col items-center">
        <div className="flex animate-fade-up flex-col items-center text-center">
          <TagBadge tone="outline" className="rounded-full px-3 py-1">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            AUN-QA ระดับหลักสูตร · Version 4.0
          </TagBadge>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold text-foreground lg:text-5xl" id="hero-h">
            ทำ SAR ให้เสร็จ<br />อย่างมี<span className="text-primary">หลักฐาน</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            ผู้ช่วยจัดทำรายงานประเมินตนเองตามเกณฑ์ AUN-QA ครบ 8 เกณฑ์ 53 ข้อ — AI เป็นผู้ช่วยเสนอ ไม่ใช่ผู้ตัดสิน
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/login" data-testid="hero-start">
                เริ่มใช้งาน<Icon name="chevron-right" size={20} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href="#flow">ดูขั้นตอน</a>
            </Button>
          </div>
        </div>

        <div className="mt-12 w-full max-w-3xl animate-fade-up rounded-xl border bg-card p-4 text-card-foreground shadow-sm dark:shadow-none md:mt-16 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">รอบประเมินเดโม่ 2569</h2>
            <Badge tone="neutral" icon="info">ตัวอย่างข้อมูลเดโม่</Badge>
          </div>
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
            <ProgressRing value={45} max={53} caption="อนุมัติแล้ว" ariaLabel="ตัวอย่าง: อนุมัติแล้ว 45 จาก 53 ข้อ" />
            <div className="flex min-w-0 flex-col items-start gap-2">
              <p>อนุมัติแล้ว 45 จาก 53 ข้อ · รอตรวจ 5 · ต้องเติม 3</p>
              <span><Badge tone="ok">ผ่านการตรวจอ้างอิง</Badge></span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-[repeat(auto-fill,0.75rem)] gap-1" aria-hidden="true">
            {MINI.map((l, i) => <i key={i} className={cn('block h-3 w-3 rounded-sm', MINI_CLASS[l])} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
