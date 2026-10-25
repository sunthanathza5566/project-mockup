/**
 * Badge / status pill — shadcn badge ปรับตาม ADR-UI-002 saas-spec §C4
 * ขนาด 13px มาจาก role class `aq-badge` (size audit) — ห้ามใส่ text-* ขนาดอื่นซ้อน
 * สี = ชุดเดียวกับ TONE_SOFT ใน lib/ui/tone.ts (คู่ `*` บน `*-muted`)
 * สถานะต้องเป็น สี + ไอคอน + ข้อความ เสมอ (ผู้เรียกใส่ไอคอนใน children)
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/ui/cn';
import { TONE_SOFT } from '@/lib/ui/tone';

const badgeVariants = cva('aq-badge inline-flex items-center gap-1 rounded-md px-2 py-0.5', {
  variants: {
    tone: {
      ...TONE_SOFT,
      outline: 'border border-input bg-card text-foreground',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, tone, ...props }, ref) => (
  <span ref={ref} className={cn(badgeVariants({ tone }), className)} {...props} />
));
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
