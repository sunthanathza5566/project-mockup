/**
 * ทำไมเชื่อถือได้ (#trust) — 3 ข้อ (pages.md P1 · TASK-0002 saas-spec §P1)
 * ≥768: 2 คอลัมน์ — หัวข้อซ้าย · รายการขวาในการ์ด (แถวคั่นเส้น + check สี success) · <768 ซ้อนกัน
 */
import Icon, { type IconName } from '@/components/ui/Icon';

const ITEMS: { icon: IconName; title: string }[] = [
  { icon: 'users', title: 'ไม่ให้คะแนนแทนกรรมการ' },
  { icon: 'file-text', title: 'ไม่แต่งหลักฐาน' },
  { icon: 'list-check', title: 'ทุกการแก้ไขมี audit log' },
];

export default function TrustSection() {
  return (
    <section className="scroll-mt-16 px-4 py-16 md:px-6 md:py-24" id="trust" aria-labelledby="trust-h">
      <div className="mx-auto grid max-w-screen-xl gap-8 md:grid-cols-2 md:items-center md:gap-12">
        <h2 className="text-3xl font-semibold text-foreground" id="trust-h">ทำไมเชื่อถือได้</h2>
        <ul className="m-0 list-none rounded-lg border bg-card p-0 text-card-foreground shadow-sm dark:shadow-none">
          {ITEMS.map(m => (
            <li key={m.title} className="flex items-center gap-4 border-t px-4 py-4 first:border-t-0 sm:px-6">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted text-foreground" aria-hidden="true">
                <Icon name={m.icon} size={20} />
              </span>
              <h3 className="min-w-0 flex-1 text-lg font-semibold">{m.title}</h3>
              <Icon name="check" size={20} className="text-success" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
