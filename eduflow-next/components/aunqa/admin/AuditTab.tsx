'use client';

/**
 * แท็บ Audit log (saas-spec §P18/C5) — logic/testid เดิม (`audit-filter`, `audit-csv`, `audit-table`) หน้าตาใหม่
 * แถบเครื่องมือ: ช่องกรอง + ปุ่ม CSV + จำนวน · ตารางซ้อนการ์ดบนมือถือ
 */
import { useState } from 'react';
import type { AppUser } from '@/lib/types';
import { auditToCsv, downloadBlob, listAudit } from '@/lib/api';
import { Async, Empty, useLoad } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/primitives/table';
import { fmtDateTime } from '@/lib/ui/aunqa';
import { STACK } from './shared';

export default function AuditTab({ user }: { user: AppUser }) {
  const [filter, setFilter] = useState('');
  const q = useLoad(() => listAudit(user, { limit: 300 }), [user.id]);
  return (
    <Async q={q} skeleton="table">{rows => {
      const f = filter.toLowerCase();
      const shown = rows.filter(r => !f || `${r.action} ${r.actorName} ${r.targetType} ${r.targetId}`.toLowerCase().includes(f));
      return (
        <>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-0 md:max-w-md md:flex-1">
              <Icon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search" className="pl-10" placeholder="กรองตาม action / ผู้ทำ / เป้าหมาย" aria-label="กรอง audit"
                value={filter} onChange={e => setFilter(e.target.value)} data-testid="audit-filter"
              />
            </div>
            <Button
              variant="outline" className="self-start md:self-auto" data-testid="audit-csv"
              onClick={() => downloadBlob(new Blob(['﻿' + auditToCsv(shown)], { type: 'text/csv;charset=utf-8' }), 'audit-log.csv')}
            >
              <Icon name="download" size={20} />ดาวน์โหลด CSV
            </Button>
            <span className="aq-meta md:ml-auto" aria-live="polite">{`${shown.length} จาก ${rows.length} รายการล่าสุด`}</span>
          </div>
          {shown.length === 0 ? <Empty icon="search" title="ไม่พบรายการ" /> : (
            <Table data-testid="audit-table" className={STACK.table} wrapperClassName={STACK.wrap}>
              <TableHeader className={STACK.thead}>
                <tr>
                  <TableHead>เวลา</TableHead>
                  <TableHead>ผู้ทำ</TableHead>
                  <TableHead>การกระทำ</TableHead>
                  <TableHead>เป้าหมาย</TableHead>
                </tr>
              </TableHeader>
              <TableBody className={STACK.tbody}>
                {shown.map(r => (
                  <TableRow key={r.id} className={STACK.tr}>
                    <TableCell data-label="เวลา" className={`${STACK.td} whitespace-nowrap tabular-nums`}>{fmtDateTime(r.at)}</TableCell>
                    <TableCell data-label="ผู้ทำ" className={STACK.td}>{r.actorName}</TableCell>
                    <TableCell data-label="การกระทำ" className={STACK.td}>
                      <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-foreground">{r.action}</code>
                    </TableCell>
                    <TableCell data-label="เป้าหมาย" className={`${STACK.td} break-all`}>{`${r.targetType}: ${r.targetId}`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      );
    }}</Async>
  );
}
