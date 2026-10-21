/**
 * แบรนด์ AUN-QA Copilot (ADR-UI-001 tokens.md T12)
 * - BrandMark: สี่เหลี่ยมมุมโค้ง rx=8 พื้น primary · กระดาษขาวพับมุมขวาบน + เส้นข้อความ 3 เส้น primary-tint
 *   · วงกลม accent r=6 มุมขวาล่าง มีเครื่องหมายถูกสี on-accent · aria-hidden (ชื่ออยู่ใน wordmark)
 * - Wordmark: "AUN-QA" 700 ink + "Copilot" 600 primary · ขนาด 20 (sidebar/top bar) / 22 (login, loader) / 24 (landing nav)
 */

export default function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={`aq-brandmark${className ? ` ${className}` : ''}`}
      width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false"
    >
      <rect width="32" height="32" rx="8" style={{ fill: 'var(--c-primary)' }} />
      <path d="M8 6h11l5 5v15H8z" style={{ fill: 'var(--c-surface)' }} />
      <path d="M19 6v5h5" style={{ fill: 'var(--c-primary-tint)' }} />
      <path d="M11 14h9M11 17.5h9M11 21h5" strokeWidth="1.6" strokeLinecap="round" style={{ stroke: 'var(--c-primary-tint)' }} />
      <circle cx="24" cy="24" r="6" style={{ fill: 'var(--c-accent)' }} />
      <path d="m21.4 24 1.8 1.8 3.4-3.6" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--c-on-accent)' }} />
    </svg>
  );
}

export function Wordmark({ size = 20 }: { size?: 20 | 22 | 24 }) {
  return (
    <span className={`aq-wordmark aq-wordmark--${size}`}>
      <span className="aq-wordmark__a">AUN-QA</span> <span className="aq-wordmark__b">Copilot</span>
    </span>
  );
}

/** BrandMark + Wordmark (ใช้ใน sidebar, top bar, login, loader, 404) */
export function Brand({ size = 20, markSize = 32 }: { size?: 20 | 22 | 24; markSize?: number }) {
  return (
    <span className="aq-brand">
      <BrandMark size={markSize} />
      <Wordmark size={size} />
    </span>
  );
}
