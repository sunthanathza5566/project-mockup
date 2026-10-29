/**
 * Table — shadcn table ปรับตาม ADR-UI-002 saas-spec §C5
 * wrapper เลื่อนแนวนอนได้ในตัว (ไม่ดันหน้าล้น) · เซลล์ text-base (16px) · หัวคอลัมน์ th 14px (ข้อยกเว้นของ size audit)
 * โครง table > thead/tbody > tr > th/td เหมือน HTML ปกติ — ลำดับคอลัมน์ให้ผู้เรียกคงตามเดิม
 */
import * as React from 'react';

import { cn } from '@/lib/ui/cn';

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** class ของ div ห่อ (เช่น ปิดกรอบเมื่ออยู่ในการ์ดแล้ว) */
  wrapperClassName?: string;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(({ className, wrapperClassName, ...props }, ref) => (
  <div className={cn('relative w-full overflow-x-auto rounded-lg border bg-card', wrapperClassName)}>
    <table ref={ref} className={cn('w-full caption-bottom border-collapse text-base', className)} {...props} />
  </div>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn('[&_tr]:bg-muted/60', className)} {...props} />,
);
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={className} {...props} />,
);
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn('border-t bg-muted/60 font-medium', className)} {...props} />
  ),
);
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn('border-t transition-colors hover:bg-muted/40 aria-selected:bg-primary-muted', className)}
      {...props}
    />
  ),
);
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn('h-11 px-4 text-left align-middle text-sm font-medium text-muted-foreground', className)}
      {...props}
    />
  ),
);
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => <td ref={ref} className={cn('px-4 py-3 align-top', className)} {...props} />,
);
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
  ),
);
TableCaption.displayName = 'TableCaption';

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
