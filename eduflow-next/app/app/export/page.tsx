'use client';

/**
 * ส่งออกเอกสาร (ADR-UI-001 pages.md P17 · saas-spec §P17 · friendly-spec §F13)
 * toolbar หลักสูตร/รอบ + pill สถานะ · คำเตือน "ยังไม่ล็อก" (InlineMessage ด้านบน) · คำเตือน R11 (C-8) จาก getGaps กรอง R11
 * การ์ดต่อเอกสาร (ไอคอนในกล่อง muted + h2 + คำอธิบาย + ปุ่ม) grid md:2 — ปุ่ม primary 1 ปุ่มต่อการ์ด ที่เหลือ outline
 * Appendix B/D · export-status (InlineMessage success มีชื่อไฟล์ SAR_…)
 */
import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  downloadBlob, exportAppendixAXlsx, exportAppendixBDoc, exportAppendixDDoc, exportEvidenceAndAppendixXlsx,
  exportEvidenceIndexXlsx, exportSarDoc, exportSarDocx, getGaps, getProgramme, isAssessorOf,
} from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { AsyncButton, CycleStatusBadge, Empty, InlineMessage, PageHeader } from '@/components/aunqa/common';
import { useScope } from '@/components/aunqa/useScope';
import Icon, { type IconName } from '@/components/ui/Icon';
import Term from '@/components/ui/Term';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { cn } from '@/lib/ui/cn';
import { errMsg, sectionHref } from '@/lib/ui/aunqa';

const CARD = 'rounded-xl border bg-card p-5 shadow-sm dark:shadow-none md:p-6';

/** การ์ดเอกสาร 1 ชนิด: ไอคอนในกล่อง muted + หัวข้อ + คำอธิบาย + ปุ่ม */
function DocCard({ id, icon, title, desc, children, footer, className, testId }: {
  id: string; icon: IconName; title: ReactNode; desc: ReactNode; children?: ReactNode; footer?: ReactNode; className?: string; testId?: string;
}) {
  return (
    <section className={cn(CARD, 'flex flex-col gap-4', className)} aria-labelledby={id} data-testid={testId}>
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground" aria-hidden="true">
          <Icon name={icon} size={24} />
        </span>
        <div className="min-w-0 space-y-1">
          <h2 id={id} className="m-0 text-lg font-semibold text-foreground">{title}</h2>
          <div className="text-base text-muted-foreground">{desc}</div>
        </div>
      </div>
      {children && <div className="mt-auto flex flex-wrap gap-2">{children}</div>}
      {footer}
    </section>
  );
}

export default function ExportPage() {
  const { user, programmes, cycles, programmeId, cycleId, setProgrammeId, setCycleId } = useScope();
  const { showToast } = useToast();
  const [last, setLast] = useState('');
  const cycle = cycles.find(c => c.id === cycleId);
  const base = cycle ? `${getProgramme(cycle.programmeId)?.code ?? 'prog'}_${cycle.academicYear}` : 'aunqa';

  /** C-8: ข้อที่คำแปลยังไม่ได้ยืนยัน (gap R11 — refId = ภาษา) */
  const r11 = useMemo(() => {
    if (!cycle) return [];
    try { return getGaps(user, cycle.id).filter(g => g.ruleId === 'R11'); } catch { return []; }
  }, [user, cycle]);

  async function run(label: string, file: string, make: () => Blob | Promise<Blob>) {
    try {
      downloadBlob(await make(), file);
      setLast(`ดาวน์โหลด ${file} แล้ว`);
      showToast(`ส่งออก${label}แล้ว`, 'success');
    } catch (e) { showToast(errMsg(e), 'error'); }
  }

  const assessorOpen = !!cycle && (isAssessorOf(user, cycle.id) || cycle.status === 'assessed' || cycle.status === 'closed');

  return (
    <>
      <PageHeader title="ส่งออกเอกสาร" sub="ไฟล์ SAR เป็น .docx (เปิดด้วย Word) พร้อมสารบัญ และตารางหลักฐานเป็น .xlsx" />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <NativeSelect wrapperClassName="w-full sm:w-auto sm:min-w-[20rem]" value={programmeId} onChange={e => setProgrammeId(e.target.value)} aria-label="หลักสูตร" data-testid="x-programme">
          {programmes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.nameTh}</option>)}
        </NativeSelect>
        <NativeSelect wrapperClassName="w-full sm:w-auto sm:min-w-[10rem]" value={cycleId} onChange={e => setCycleId(e.target.value)} aria-label="รอบ" data-testid="x-cycle">
          {cycles.map(c => <option key={c.id} value={c.id}>รอบ {c.academicYear}</option>)}
        </NativeSelect>
        {cycle && <CycleStatusBadge status={cycle.status} />}
      </div>

      {(cycle && !cycle.lockedAt) || r11.length > 0 ? (
        <div className="mb-6 space-y-3">
          {cycle && !cycle.lockedAt && (
            <InlineMessage tone="warn" testId="export-not-locked">รอบนี้ยังไม่ล็อก เนื้อหาในไฟล์เป็นฉบับร่างล่าสุด</InlineMessage>
          )}
          {r11.length > 0 && (
            <InlineMessage tone="warn" testId="export-r11-warning"
              title={`มี ${r11.length} ข้อที่คำแปลยังไม่ได้ยืนยัน — ตรวจก่อนส่งเอกสารจริง`}>
              <p className="m-0 flex flex-wrap gap-x-4 gap-y-1">
                {r11.map(g => (
                  <Link key={g.id} className="inline-flex min-h-11 items-center font-medium tabular-nums text-foreground underline-offset-4 visited:text-foreground hover:underline" href={sectionHref(cycle!.id, g.requirementId)}>
                    {g.requirementId} ({g.refId === 'en' ? 'EN' : 'TH'})
                  </Link>
                ))}
              </p>
            </InlineMessage>
          )}
        </div>
      ) : null}

      {!cycle ? <Empty icon="download" title="ยังไม่มีรอบประเมินให้ส่งออก" /> : (
        <div className="mb-6 grid gap-4 md:grid-cols-2 md:gap-6">
          <DocCard id="x-sar-h" icon="file-text" title="รายงาน SAR" className="md:col-span-2"
            desc="ครบ 53 ข้อเรียงตามเกณฑ์ พร้อมคะแนนประเมินตนเองและรายการหลักฐานอ้างอิง"
            footer={(
              <p className="aq-help m-0" data-testid="export-docx-note">
                เมื่อเปิด .docx ใน Word หากขึ้นข้อความถามให้อัปเดต field ให้กด “ใช่” (หรือคลิกขวาที่สารบัญ แล้วเลือก “Update Field”)
                เพื่อให้สารบัญแสดงเลขหน้าครบ · .doc เป็นไฟล์สำรองที่ไม่มีสารบัญอัตโนมัติ
              </p>
            )}>
            <AsyncButton variant="default" testId="export-sar-docx" busyText="กำลังสร้างไฟล์ Word…" onClick={() => run('SAR (.docx)', `SAR_${base}.docx`, () => exportSarDocx(user, cycle.id))}>
              <Icon name="download" size={20} />ดาวน์โหลด SAR (.docx)
            </AsyncButton>
            <AsyncButton variant="outline" testId="export-sar" title="ไฟล์สำรองแบบเดิม ใช้เมื่อเปิด .docx ไม่ได้" busyText="กำลังสร้างไฟล์…" onClick={() => run('SAR (.doc)', `SAR_${base}.doc`, () => exportSarDoc(user, cycle.id))}>ไฟล์สำรอง (.doc)</AsyncButton>
          </DocCard>
          <DocCard id="x-idx-h" icon="list-check" title="ดัชนีหลักฐาน"
            desc={<>รายการหลักฐานทั้งหมดของรอบ พร้อมรหัส ข้อที่ผูก และ <Term k="hash">hash</Term></>}>
            <AsyncButton variant="default" testId="export-index" busyText="กำลังสร้างไฟล์…" onClick={() => run('ดัชนีหลักฐาน', `EvidenceIndex_${base}.xlsx`, () => exportEvidenceIndexXlsx(user, cycle.id))}>
              <Icon name="download" size={20} />ดาวน์โหลด (.xlsx)
            </AsyncButton>
          </DocCard>
          <DocCard id="x-a-h" icon="chart-line" title={<Term k="appendix_a">Appendix A</Term>}
            desc="ตารางสรุปคะแนนประเมินตนเอง/หลักฐานตามเกณฑ์ สำหรับภาคผนวก">
            <AsyncButton variant="default" testId="export-appendix" busyText="กำลังสร้างไฟล์…" onClick={() => run('Appendix A', `AppendixA_${base}.xlsx`, () => exportAppendixAXlsx(user, cycle.id))}>Appendix A (.xlsx)</AsyncButton>
            <AsyncButton variant="outline" testId="export-both" busyText="กำลังสร้างไฟล์…" onClick={() => run('ไฟล์รวม', `Evidence_AppendixA_${base}.xlsx`, () => exportEvidenceAndAppendixXlsx(user, cycle.id))}>รวมทั้งสองในไฟล์เดียว</AsyncButton>
          </DocCard>
          <DocCard id="x-asr-h" icon="shield-check" title="ผลการประเมินโดยกรรมการ" className="md:col-span-2" testId="export-assessor-section"
            desc={assessorOpen
              ? <><Term k="appendix_b">Appendix B</Term> = ข้อค้นพบรายข้อและคะแนนรายเกณฑ์ · <Term k="appendix_d">Appendix D</Term> = สรุปผล/verdict ของกรรมการ (.doc)</>
              : <span data-testid="export-assessor-locked">Appendix B / D จะดาวน์โหลดได้เมื่อกรรมการส่งผลประเมินแล้ว (สถานะ “ประเมินแล้ว”)</span>}>
            {assessorOpen && <>
              <AsyncButton variant="default" testId="export-appendix-b" busyText="กำลังสร้างไฟล์…" onClick={() => run('Appendix B', `AppendixB_${base}.doc`, () => exportAppendixBDoc(user, cycle.id))}>Appendix B (.doc)</AsyncButton>
              <AsyncButton variant="outline" testId="export-appendix-d" busyText="กำลังสร้างไฟล์…" onClick={() => run('Appendix D', `AppendixD_${base}.doc`, () => exportAppendixDDoc(user, cycle.id))}>Appendix D (.doc)</AsyncButton>
            </>}
          </DocCard>
        </div>
      )}
      {last && <InlineMessage tone="success" testId="export-status">{last}</InlineMessage>}
    </>
  );
}
