'use client';

/**
 * ส่งออกเอกสาร (ADR-UI-001 pages.md P17)
 * toolbar หลักสูตร/รอบ + pill สถานะ · คำเตือน "ยังไม่ล็อก" (InlineMessage ด้านบน) · คำเตือน R11 (C-8) จาก getGaps กรอง R11
 * การ์ด SAR / ดัชนีหลักฐาน / Appendix A · Appendix B/D · export-status (InlineMessage success มีชื่อไฟล์ SAR_…)
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  downloadBlob, exportAppendixAXlsx, exportAppendixBDoc, exportAppendixDDoc, exportEvidenceAndAppendixXlsx,
  exportEvidenceIndexXlsx, exportSarDoc, exportSarDocx, getGaps, getProgramme, isAssessorOf,
} from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { AsyncButton, CycleStatusBadge, Empty, InlineMessage, PageHeader } from '@/components/aunqa/common';
import { useScope } from '@/components/aunqa/useScope';
import Icon from '@/components/ui/Icon';
import Term from '@/components/ui/Term';
import { errMsg, sectionHref } from '@/lib/ui/aunqa';

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

  return (
    <>
      <PageHeader title="ส่งออกเอกสาร" sub="ไฟล์ SAR เป็น .docx (เปิดด้วย Word) พร้อมสารบัญ และตารางหลักฐานเป็น .xlsx" />
      <div className="aq-toolbar">
        <select className="aq-input" value={programmeId} onChange={e => setProgrammeId(e.target.value)} aria-label="หลักสูตร" data-testid="x-programme">
          {programmes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.nameTh}</option>)}
        </select>
        <select className="aq-input" value={cycleId} onChange={e => setCycleId(e.target.value)} aria-label="รอบ" data-testid="x-cycle">
          {cycles.map(c => <option key={c.id} value={c.id}>รอบ {c.academicYear}</option>)}
        </select>
        {cycle && <CycleStatusBadge status={cycle.status} />}
      </div>

      {cycle && !cycle.lockedAt && (
        <InlineMessage tone="warn" testId="export-not-locked">รอบนี้ยังไม่ล็อก เนื้อหาในไฟล์เป็นฉบับร่างล่าสุด</InlineMessage>
      )}
      {r11.length > 0 && (
        <InlineMessage tone="warn" testId="export-r11-warning"
          title={`มี ${r11.length} ข้อที่คำแปลยังไม่ได้ยืนยัน — ตรวจก่อนส่งเอกสารจริง`}>
          <p className="aq-cluster">
            {r11.map(g => (
              <Link key={g.id} className="aq-link aq-code" href={sectionHref(cycle!.id, g.requirementId)}>
                {g.requirementId} ({g.refId === 'en' ? 'EN' : 'TH'})
              </Link>
            ))}
          </p>
        </InlineMessage>
      )}

      {!cycle ? <Empty icon="download" title="ยังไม่มีรอบประเมินให้ส่งออก" /> : (
        <div className="aq-grid-3 aq-mb-4">
          <section className="aq-card" aria-labelledby="x-sar-h">
            <div className="aq-export-head"><Icon name="file-text" size={24} /><h2 id="x-sar-h" className="aq-h3">รายงาน SAR</h2></div>
            <p className="aq-muted">ครบ 53 ข้อเรียงตามเกณฑ์ พร้อมคะแนนประเมินตนเองและรายการหลักฐานอ้างอิง</p>
            <div className="aq-actions aq-mt-4">
              <AsyncButton className="aq-btn aq-btn-primary" testId="export-sar-docx" busyText="กำลังสร้างไฟล์ Word…" onClick={() => run('SAR (.docx)', `SAR_${base}.docx`, () => exportSarDocx(user, cycle.id))}>
                <Icon name="download" size={20} />ดาวน์โหลด SAR (.docx)
              </AsyncButton>
              <AsyncButton className="aq-btn" testId="export-sar" title="ไฟล์สำรองแบบเดิม ใช้เมื่อเปิด .docx ไม่ได้" busyText="กำลังสร้างไฟล์…" onClick={() => run('SAR (.doc)', `SAR_${base}.doc`, () => exportSarDoc(user, cycle.id))}>ไฟล์สำรอง (.doc)</AsyncButton>
            </div>
            <p className="aq-help aq-mt-2" data-testid="export-docx-note">
              เมื่อเปิด .docx ใน Word หากขึ้นข้อความถามให้อัปเดต field ให้กด “ใช่” (หรือคลิกขวาที่สารบัญ แล้วเลือก “Update Field”)
              เพื่อให้สารบัญแสดงเลขหน้าครบ · .doc เป็นไฟล์สำรองที่ไม่มีสารบัญอัตโนมัติ
            </p>
          </section>
          <section className="aq-card" aria-labelledby="x-idx-h">
            <div className="aq-export-head"><Icon name="list-check" size={24} /><h2 id="x-idx-h" className="aq-h3">ดัชนีหลักฐาน</h2></div>
            <p className="aq-muted">รายการหลักฐานทั้งหมดของรอบ พร้อมรหัส ข้อที่ผูก และ <Term k="hash">hash</Term></p>
            <div className="aq-actions aq-mt-4">
              <AsyncButton className="aq-btn aq-btn-primary" testId="export-index" busyText="กำลังสร้างไฟล์…" onClick={() => run('ดัชนีหลักฐาน', `EvidenceIndex_${base}.xlsx`, () => exportEvidenceIndexXlsx(user, cycle.id))}>
                <Icon name="download" size={20} />ดาวน์โหลด (.xlsx)
              </AsyncButton>
            </div>
          </section>
          <section className="aq-card" aria-labelledby="x-a-h">
            <div className="aq-export-head"><Icon name="chart-line" size={24} /><h2 id="x-a-h" className="aq-h3"><Term k="appendix_a">Appendix A</Term></h2></div>
            <p className="aq-muted">ตารางสรุปคะแนนประเมินตนเอง/หลักฐานตามเกณฑ์ สำหรับภาคผนวก</p>
            <div className="aq-actions aq-mt-4">
              <AsyncButton className="aq-btn aq-btn-primary" testId="export-appendix" busyText="กำลังสร้างไฟล์…" onClick={() => run('Appendix A', `AppendixA_${base}.xlsx`, () => exportAppendixAXlsx(user, cycle.id))}>Appendix A (.xlsx)</AsyncButton>
              <AsyncButton className="aq-btn" testId="export-both" busyText="กำลังสร้างไฟล์…" onClick={() => run('ไฟล์รวม', `Evidence_AppendixA_${base}.xlsx`, () => exportEvidenceAndAppendixXlsx(user, cycle.id))}>รวมทั้งสองในไฟล์เดียว</AsyncButton>
            </div>
          </section>
        </div>
      )}
      {cycle && (
        <section className="aq-card" aria-labelledby="x-asr-h" data-testid="export-assessor-section">
          <h2 id="x-asr-h" className="aq-h3">ผลการประเมินโดยกรรมการ</h2>
          {isAssessorOf(user, cycle.id) || cycle.status === 'assessed' || cycle.status === 'closed' ? (
            <>
              <p className="aq-muted"><Term k="appendix_b">Appendix B</Term> = ข้อค้นพบรายข้อและคะแนนรายเกณฑ์ · <Term k="appendix_d">Appendix D</Term> = สรุปผล/verdict ของกรรมการ (.doc)</p>
              <div className="aq-actions aq-mt-4">
                <AsyncButton className="aq-btn aq-btn-primary" testId="export-appendix-b" busyText="กำลังสร้างไฟล์…" onClick={() => run('Appendix B', `AppendixB_${base}.doc`, () => exportAppendixBDoc(user, cycle.id))}>Appendix B (.doc)</AsyncButton>
                <AsyncButton className="aq-btn" testId="export-appendix-d" busyText="กำลังสร้างไฟล์…" onClick={() => run('Appendix D', `AppendixD_${base}.doc`, () => exportAppendixDDoc(user, cycle.id))}>Appendix D (.doc)</AsyncButton>
              </div>
            </>
          ) : <p className="aq-muted" data-testid="export-assessor-locked">Appendix B / D จะดาวน์โหลดได้เมื่อกรรมการส่งผลประเมินแล้ว (สถานะ “ประเมินแล้ว”)</p>}
        </section>
      )}
      {last && <InlineMessage tone="success" testId="export-status">{last}</InlineMessage>}
    </>
  );
}
