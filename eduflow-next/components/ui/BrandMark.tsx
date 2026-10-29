/**
 * แบรนด์ AUN-QA Copilot (ADR-UI-001 tokens.md T12 · หน้าตา ADR-UI-002 saas-spec §C16)
 * - BrandMark: สี่เหลี่ยมมุมโค้งพื้น primary + glyph เดิม (กระดาษพับมุม + เส้นข้อความ 3 เส้น + วงเครื่องหมายถูก)
 *   สีจาก token ทั้งหมด (fill-primary / currentColor = primary-foreground) — ไม่มีสี accent ที่สอง · aria-hidden (ชื่ออยู่ใน wordmark)
 * - Wordmark: "AUN-QA" 600 + "Copilot" 500 สี foreground · ขนาด 20 (sidebar/top bar) / 22 (login, loader) / 24 (landing nav)
 */
import { cn } from '@/lib/ui/cn';

export default function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={cn('block shrink-0 text-primary-foreground', className)}
      width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false"
    >
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <path d="M8 6h11l5 5v15H8z" fill="currentColor" />
      <path d="M19 6v5h5" className="fill-primary" fillOpacity={0.35} />
      <path d="M11 14h9M11 17.5h9M11 21h5" fill="none" strokeWidth="1.6" strokeLinecap="round" className="stroke-primary" />
      <circle cx="24" cy="24" r="6" fill="currentColor" strokeWidth="1.5" className="stroke-primary" />
      <path d="m21.4 24 1.8 1.8 3.4-3.6" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary" />
    </svg>
  );
}

const WORD_SIZE: Record<20 | 22 | 24, string> = { 20: 'text-xl', 22: 'text-[1.375rem]', 24: 'text-2xl' };

export function Wordmark({ size = 20 }: { size?: 20 | 22 | 24 }) {
  return (
    <span className={cn('whitespace-nowrap font-semibold text-foreground', WORD_SIZE[size])}>
      <span>AUN-QA</span> <span className="font-medium">Copilot</span>
    </span>
  );
}

/** BrandMark + Wordmark (ใช้ใน sidebar, top bar, login, loader, 404) */
export function Brand({ size = 20, markSize = 32 }: { size?: 20 | 22 | 24; markSize?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-foreground no-underline">
      <BrandMark size={markSize} />
      <Wordmark size={size} />
    </span>
  );
}
