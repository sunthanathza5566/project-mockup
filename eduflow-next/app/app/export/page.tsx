'use client';

import { useState } from 'react';
import {
  downloadBlob, exportAppendixAXlsx, exportAppendixBDoc, exportAppendixDDoc, exportEvidenceAndAppendixXlsx, exportEvidenceIndexXlsx, exportSarDoc,
  getProgramme,
} from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { AsyncButton, CycleStatusBadge, Empty, PageHeader } from '@/components/aunqa/common';
import { isAssessorOf } from '@/lib/api';
import { useScope } from '@/components/aunqa/useScope';
import { errMsg } from '@/lib/ui/aunqa';

/** S13 ส่งออก: SAR (.doc) · ดัชนีหลักฐาน · Appendix A (.xlsx) */
export default function ExportPage() {
  const { user, programmes, cycles, programmeId, cycleId, setProgrammeId, setCycleId } = useScope();
  const { showToast } = useToast();
  const [last, setLast] = useState('');
  const cycle = cycles.find(c => c.id === cycleId);
  const base = cycle ? `${getProgramme(cycle.programmeId)?.code ?? 'prog'}_${cycle.academicYear}` : 'aunqa';

  async function run(label: string, file: string, make: () => Blob | Promise<Blob>) {
    try {
      downloadBlob(await make(), file);
      setLast(`ดาวน์โหลด ${file} แล้ว`);
      showToast(`ส่งออก${label}แล้ว`, 'success');
    } catch (e) { showToast(errMsg(e), 'error'); }
  }

  return (
    <>
      <PageHeader title="ส่งออกเอกสาร" sub="ไฟล์ SAR เป็น .doc (เปิดด้วย Word ได้) และตารางหลักฐานเป็น .xlsx" />
      <div className="aq-toolbar">
        <select className="aq-input" value={programmeId} onChange={e => setProgrammeId(e.target.value)} aria-label="หลักสูตร" data-testid="x-programme">
          {programmes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.nameTh}</option>)}
        </select>
        <select className="aq-input" value={cycleId} onChange={e => setCycleId(e.target.value)} aria-label="รอบ" data-testid="x-cycle">
          {cycles.map(c => <option key={c.id} value={c.id}>รอบ {c.academicYear}</option>)}
        </select>
        {cycle && <CycleStatusBadge status={cycle.status} />}
      </div>

      {!cycle ? <Empty text="ยังไม่มีรอบประเมินให้ส่งออก" /> : (
        <div className="aq-grid-3">
          <section className="aq-card">
            <h2 className="aq-h2">รายงาน SAR</h2>
            <p className="aq-muted">ครบ 53 ข้อเรียงตามเกณฑ์ พร้อมคะแนนประเมินตนเองและรายการหลักฐานอ้างอิง</p>
            <AsyncButton className="aq-btn aq-btn-primary" testId="export-sar" onClick={() => run('SAR', `SAR_${base}.doc`, () => exportSarDoc(user, cycle.id))}>ดาวน์โหลด SAR (.doc)</AsyncButton>
          </section>
          <section className="aq-card">
            <h2 className="aq-h2">ดัชนีหลักฐาน</h2>
            <p className="aq-muted">รายการหลักฐานทั้งหมดของรอบ พร้อมรหัส ข้อที่ผูก และ hash</p>
            <AsyncButton className="aq-btn aq-btn-primary" testId="export-index" onClick={() => run('ดัชนีหลักฐาน', `EvidenceIndex_${base}.xlsx`, () => exportEvidenceIndexXlsx(user, cycle.id))}>ดาวน์โหลดดัชนีหลักฐาน (.xlsx)</AsyncButton>
          </section>
          <section className="aq-card">
            <h2 className="aq-h2">Appendix A</h2>
            <p className="aq-muted">ตารางสรุปตัวชี้วัด/หลักฐานตามเกณฑ์ สำหรับภาคผนวก</p>
            <div className="aq-actions">
              <AsyncButton className="aq-btn aq-btn-primary" testId="export-appendix" onClick={() => run('Appendix A', `AppendixA_${base}.xlsx`, () => exportAppendixAXlsx(user, cycle.id))}>Appendix A (.xlsx)</AsyncButton>
              <AsyncButton className="aq-btn" testId="export-both" onClick={() => run('ไฟล์รวม', `Evidence_AppendixA_${base}.xlsx`, () => exportEvidenceAndAppendixXlsx(user, cycle.id))}>รวมทั้งสองในไฟล์เดียว</AsyncButton>
            </div>
          </section>
        </div>
      )}
      {cycle && (
        <section className="aq-card" data-testid="export-assessor-section">
          <h2 className="aq-h2">ผลการประเมินโดยกรรมการ</h2>
          {isAssessorOf(user, cycle.id) || cycle.status === 'assessed' || cycle.status === 'closed' ? (
            <>
              <p className="aq-muted">Appendix B = ข้อค้นพบรายข้อและคะแนนรายเกณฑ์ · Appendix D = สรุปผล/verdict ของกรรมการ (.doc)</p>
              <div className="aq-actions">
                <AsyncButton className="aq-btn aq-btn-primary" testId="export-appendix-b" onClick={() => run('Appendix B', `AppendixB_${base}.doc`, () => exportAppendixBDoc(user, cycle.id))}>Appendix B (.doc)</AsyncButton>
                <AsyncButton className="aq-btn aq-btn-primary" testId="export-appendix-d" onClick={() => run('Appendix D', `AppendixD_${base}.doc`, () => exportAppendixDDoc(user, cycle.id))}>Appendix D (.doc)</AsyncButton>
              </div>
            </>
          ) : <p className="aq-muted" data-testid="export-assessor-locked">Appendix B / D จะดาวน์โหลดได้เมื่อกรรมการส่งผลประเมินแล้ว (สถานะ “ประเมินแล้ว”)</p>}
        </section>
      )}
      {last && <div className="auth-alert auth-alert-ok" role="status" data-testid="export-status">{last}</div>}
      {cycle && !cycle.lockedAt && <p className="aq-muted">หมายเหตุ: รอบนี้ยังไม่ล็อก เนื้อหาในไฟล์เป็นฉบับร่างล่าสุด</p>}
    </>
  );
}
