/**
 * Button — shadcn button (registry v3, new-york) ปรับตาม ADR-UI-002 D3 + saas-spec §C1
 * - hook `aq-btn` ใน base (target audit 44px) · size compact ใส่ `aq-btn-compact` (40px ที่ ≥1024)
 * - ไม่ห้ามตัดบรรทัด (ข้อความไทยยาวต้องขึ้นบรรทัดใหม่ได้) · ไม่มี ring และไม่ลบ outline (ใช้ outline กลางใน base)
 * - disabled ไม่ใช้ opacity — ใช้พื้น muted + ตัวอักษร muted-foreground (คู่ #6)
 *
 * ช่วงเปลี่ยนผ่าน (TASK-0002 S1.5 — legacy.css ยังโหลดก่อน globals.css · S6 ลบ `LEGACY_WIN` ทั้งก้อน):
 * legacy มีกฎ specificity สูงกว่า utility ปกติ จึงแก้ที่ primitive ไม่ให้ผู้เรียกใส่ override ทีละไฟล์
 *   - `.aq-btn:hover:not(:disabled)` (0,3,0) ทาพื้น tint + ตัวอักษร primary ทับ `hover:*` (0,2,0)
 *     → `[&.aq-btn:hover]:*` (0,3,0 อยู่ไฟล์ที่โหลดทีหลัง จึงชนะ) ซ้ำสีพื้น/ตัวอักษร hover ของ variant
 *   - `.aq-btn:visited` (0,2,0) และ `a:visited` (0,1,1) ทำตัวอักษรลิงก์รูปปุ่มเป็นสี primary
 *     → `visited:text-*` (0,2,0 ทีหลัง) ตามสีตัวอักษรของ variant
 *   - `.aq-btn` ให้พื้นขาว + ขอบ 1px กับทุกปุ่ม → variant ที่ไม่มีขอบใส่ `border-transparent` (ghost + `bg-transparent`)
 *     ขอบใสยังกินที่ 1px เท่า outline ปุ่มทุก variant จึงสูงเท่ากัน
 * ข้อควรรู้: สีตอน hover ล็อกด้วย `[&.aq-btn:hover]:*` — ผู้เรียกที่จะเปลี่ยนสี hover ต้องใช้ prefix เดียวกันจนถึง S6
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/ui/cn';

/** S1.5 — ตัวชนะ legacy.css ต่อ variant (ดูหัวไฟล์) · S6: ลบ object นี้และ `+ LEGACY_WIN.*` ทั้งหมด */
const LEGACY_WIN = {
  default:
    ' border-transparent visited:text-primary-foreground [&.aq-btn:hover]:bg-primary/90 [&.aq-btn:hover]:text-primary-foreground',
  outline: ' visited:text-foreground [&.aq-btn:hover]:bg-accent [&.aq-btn:hover]:text-foreground',
  ghost:
    ' border-transparent bg-transparent visited:text-foreground [&.aq-btn:hover]:bg-accent [&.aq-btn:hover]:text-foreground',
  destructive:
    ' border-transparent visited:text-destructive-foreground [&.aq-btn:hover]:bg-destructive/90 [&.aq-btn:hover]:text-destructive-foreground',
  destructiveOutline:
    ' visited:text-destructive [&.aq-btn:hover]:bg-destructive-muted [&.aq-btn:hover]:text-destructive',
} as const;

const buttonVariants = cva(
  'aq-btn inline-flex items-center justify-center gap-2 rounded-md text-base font-medium text-center no-underline transition-colors duration-fast ease-hover [&_svg]:shrink-0 ' +
    'disabled:pointer-events-none disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none ' +
    'aria-disabled:pointer-events-none aria-disabled:border-transparent aria-disabled:bg-muted aria-disabled:text-muted-foreground aria-disabled:shadow-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' + LEGACY_WIN.default,
        outline: 'border border-input bg-card text-foreground hover:bg-accent' + LEGACY_WIN.outline,
        ghost: 'text-foreground hover:bg-accent' + LEGACY_WIN.ghost,
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90' + LEGACY_WIN.destructive,
        destructiveOutline:
          'border border-destructive bg-card text-destructive hover:bg-destructive-muted' + LEGACY_WIN.destructiveOutline,
      },
      size: {
        default: 'min-h-11 px-4 py-2',
        compact: 'aq-btn-compact min-h-11 px-3 py-1.5 lg:min-h-10',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** ให้ลูก (เช่น <Link>) เป็น element จริงแต่ได้หน้าตาปุ่ม */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        // <button> ค่าเริ่ม type=button (กัน submit ฟอร์มโดยไม่ตั้งใจ) — asChild ไม่ใส่ type
        {...(asChild ? {} : { type: type ?? 'button' })}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
