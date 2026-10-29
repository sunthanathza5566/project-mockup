/** footer (pages.md P1 · TASK-0002 saas-spec §P1): border-t py-8 ข้อความ muted (ไม่มีพื้นเข้มแล้ว) */
import { Brand } from '@/components/ui/BrandMark';

export default function Footer() {
  return (
    <footer className="border-t px-4 py-8 md:px-6">
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between gap-3">
        <Brand size={20} />
        <p className="text-muted-foreground">ข้อมูลทั้งหมดเป็นข้อมูลสมมติเพื่อการสาธิต</p>
      </div>
    </footer>
  );
}
