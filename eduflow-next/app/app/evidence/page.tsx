'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AunqaError, can, createEvidence, listEvidence, listRequirements, programmeScope, readFileInput,
} from '@/lib/api';
import type { EvidenceKind, PdcaStage } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, Badge, Empty, EvidenceStatusBadge, PageHeader, useLoad } from '@/components/aunqa/common';
import { useScope } from '@/components/aunqa/useScope';
import { KIND_LIST, KIND_TH, PDCA_TH, errMsg, isAssessorOnly } from '@/lib/ui/aunqa';

/** S7 คลังหลักฐาน: ค้นหา/กรอง · อัปโหลด + metadata · ผูกหลายข้อ · ธง PII */
export default function EvidencePage() {
  const { user, programmes, cycles, programmeId, cycleId, setProgrammeId, setCycleId } = useScope();
  const { showToast } = useToast();
  const { confirm, notify } = useDialog();
  const assessor = isAssessorOnly(user);

  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [kind, setKind] = useState<EvidenceKind | ''>('');
  const [stage, setStage] = useState<PdcaStage | ''>('');
  const [piiOnly, setPiiOnly] = useState(false);
  const [reqFilter, setReqFilter] = useState('');

  const list = useLoad(() => {
    if (!programmeId) return [];
    return listEvidence(user, {
      programmeId, cycleId: cycleId || undefined, q: q || undefined, year: year ? Number(year) : undefined,
      kind: kind || undefined, pdcaStage: stage || undefined, containsPii: piiOnly ? true : undefined,
      requirementId: reqFilter || undefined, onlyLinked: assessor,
    });
  }, [user.id, programmeId, cycleId, q, year, kind, stage, piiOnly, reqFilter]);

  const canWrite = !!programmeId && !assessor && can(user, 'evidence.write', programmeScope(programmeId));
  const reqs = listRequirements();

  // ─── upload form ───
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    title: '', description: '', kind: 'other' as EvidenceKind, stage: 'D' as PdcaStage,
    year: String(new Date().getFullYear() + 543), url: '', text: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [reqIds, setReqIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const fileInput = file ? await readFileInput(file) : undefined;
      const base = {
        programmeId, title: f.title, description: f.description, kind: f.kind, pdcaStage: f.stage,
        academicYear: Number(f.year), cycleId: cycleId || undefined, requirementIds: reqIds,
        url: f.url || undefined, file: fileInput, extractedText: f.text || undefined,
      };
      let ev;
      try {
        ev = await createEvidence(user, base);
      } catch (err) {
        if (err instanceof AunqaError && err.code === 'duplicate') {
          const ok = await confirm({ title: 'พบไฟล์ซ้ำ', message: `${err.message} ต้องการสร้างหลักฐานใหม่ซ้ำอีกชิ้นหรือไม่?`, variant: 'warning', confirmText: 'สร้างซ้ำ' });
          if (!ok) return;
          ev = await createEvidence(user, { ...base, allowDuplicate: true });
        } else throw err;
      }
      showToast(`เพิ่มหลักฐาน ${ev.code} แล้ว`, 'success');
      if (ev.containsPii) {
        await notify({ title: 'พบข้อมูลส่วนบุคคล', variant: 'warning', message: `หลักฐาน ${ev.code} มีข้อมูลที่อาจเป็นข้อมูลส่วนบุคคล (เช่น เลขบัตรประชาชน) กรุณาตรวจและปกปิดก่อนใช้งานต่อ` });
      }
      setF(s => ({ ...s, title: '', description: '', url: '', text: '' })); setFile(null); setReqIds([]); setOpen(false);
      list.reload();
    } catch (err) {
      showToast(errMsg(err), 'error');
    } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="คลังหลักฐาน" sub="หลักฐานชิ้นเดียวผูกได้หลายข้อ โดยไม่ต้องคัดลอก — รหัส E-x.x-nn ใช้อ้างอิงใน SAR" />

      <div className="aq-toolbar">
        <select className="aq-input" value={programmeId} onChange={e => setProgrammeId(e.target.value)} aria-label="หลักสูตร" data-testid="ev-programme">
          {programmes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.nameTh}</option>)}
        </select>
        <select className="aq-input" value={cycleId} onChange={e => setCycleId(e.target.value)} aria-label="รอบประเมิน" data-testid="ev-cycle">
          {!assessor && <option value="">ทุกรอบ / ไม่ระบุรอบ</option>}
          {cycles.map(c => <option key={c.id} value={c.id}>รอบ {c.academicYear}</option>)}
        </select>
      </div>

      <div className="aq-toolbar">
        <input className="aq-input" type="search" placeholder="ค้นหาชื่อ/รหัส/เนื้อหา…" aria-label="ค้นหาหลักฐาน" value={q} onChange={e => setQ(e.target.value)} data-testid="ev-search" />
        <input className="aq-input aq-input-sm" type="number" placeholder="ปี พ.ศ." aria-label="ปีการศึกษา" value={year} onChange={e => setYear(e.target.value)} style={{ width: 110 }} data-testid="ev-year" />
        <select className="aq-input aq-input-sm" value={kind} onChange={e => setKind(e.target.value as EvidenceKind | '')} aria-label="ประเภท" data-testid="ev-kind">
          <option value="">ทุกประเภท</option>{KIND_LIST.map(k => <option key={k} value={k}>{KIND_TH[k]}</option>)}
        </select>
        <select className="aq-input aq-input-sm" value={stage} onChange={e => setStage(e.target.value as PdcaStage | '')} aria-label="PDCA" data-testid="ev-pdca">
          <option value="">PDCA ทั้งหมด</option>{(['P', 'D', 'C', 'A'] as PdcaStage[]).map(s => <option key={s} value={s}>{PDCA_TH[s]}</option>)}
        </select>
        <select className="aq-input aq-input-sm" value={reqFilter} onChange={e => setReqFilter(e.target.value)} aria-label="ข้อ" disabled={!cycleId} data-testid="ev-req">
          <option value="">ทุกข้อ</option>{reqs.map(r => <option key={r.id} value={r.id}>ข้อ {r.id}</option>)}
        </select>
        <label className="aq-check"><input type="checkbox" checked={piiOnly} onChange={e => setPiiOnly(e.target.checked)} data-testid="ev-pii" /> เฉพาะที่พบ PII</label>
      </div>

      {canWrite && (
        <div className="aq-card">
          {!open ? <button className="aq-btn aq-btn-primary" onClick={() => setOpen(true)} data-testid="ev-new">+ เพิ่มหลักฐาน</button> : (
            <form className="aq-form" onSubmit={submit} data-testid="ev-form">
              <h2 className="aq-h2">เพิ่มหลักฐานใหม่</h2>
              <label>ชื่อหลักฐาน *<input className="aq-input" required maxLength={200} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} data-testid="ev-title" /></label>
              <label>คำอธิบาย<textarea className="aq-textarea" rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></label>
              <div className="aq-form-inline">
                <label>ประเภท<select className="aq-input" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as EvidenceKind })} data-testid="ev-f-kind">{KIND_LIST.map(k => <option key={k} value={k}>{KIND_TH[k]}</option>)}</select></label>
                <label>PDCA<select className="aq-input" value={f.stage} onChange={e => setF({ ...f, stage: e.target.value as PdcaStage })}>{(['P', 'D', 'C', 'A'] as PdcaStage[]).map(s => <option key={s} value={s}>{PDCA_TH[s]}</option>)}</select></label>
                <label>ปีการศึกษา (พ.ศ.)<input className="aq-input" type="number" required value={f.year} onChange={e => setF({ ...f, year: e.target.value })} style={{ width: 120 }} /></label>
              </div>
              <label>ไฟล์ (ถ้ามี)<input className="aq-input" type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} data-testid="ev-file" /></label>
              <label>หรือลิงก์ (https://…)<input className="aq-input" type="url" value={f.url} onChange={e => setF({ ...f, url: e.target.value })} /></label>
              <label>ข้อความในหลักฐาน (วางเพื่อให้ตรวจ PII และให้ AI แนะนำข้อ)
                <textarea className="aq-textarea" rows={3} value={f.text} onChange={e => setF({ ...f, text: e.target.value })} data-testid="ev-text" />
              </label>
              <label>ผูกกับข้อ (เลือกได้หลายข้อ — ต้องเลือกรอบด้านบนด้วย)
                <select className="aq-input" multiple size={6} value={reqIds} disabled={!cycleId}
                  onChange={e => setReqIds(Array.from(e.target.selectedOptions).map(o => o.value))} data-testid="ev-f-reqs">
                  {reqs.map(r => <option key={r.id} value={r.id}>{r.id} {r.textTh.slice(0, 60)}</option>)}
                </select>
              </label>
              <div className="aq-actions">
                <button className="aq-btn aq-btn-primary" disabled={busy} data-testid="ev-submit">{busy ? 'กำลังบันทึก…' : 'บันทึกหลักฐาน'}</button>
                <button type="button" className="aq-btn" onClick={() => setOpen(false)}>ยกเลิก</button>
              </div>
            </form>
          )}
        </div>
      )}

      <Async q={list}>{rows => rows.length === 0 ? <Empty text="ไม่พบหลักฐานตามเงื่อนไข" /> : (
        <div className="aq-card aq-table-wrap">
          <table className="aq-table" data-testid="ev-table">
            <thead><tr><th>รหัส</th><th>ชื่อ</th><th>ประเภท</th><th>PDCA</th><th>ปี</th><th>ข้อที่ผูก</th><th>สถานะ</th></tr></thead>
            <tbody>
              {rows.map(e => (
                <tr key={e.id} data-testid={`ev-row-${e.code}`}>
                  <td><Link href={`/app/evidence/${e.id}${cycleId ? `?cycle=${cycleId}` : ''}`}><strong>{e.code}</strong></Link></td>
                  <td>{e.title}{e.containsPii && !e.piiResolved && <> <Badge tone="bad" title="พบข้อมูลส่วนบุคคล">PII</Badge></>}</td>
                  <td>{KIND_TH[e.kind]}</td>
                  <td>{e.pdcaStage}</td>
                  <td>{e.academicYear}</td>
                  <td>{e.requirementIds.length ? e.requirementIds.join(', ') : <span className="aq-muted">ยังไม่ผูก</span>}</td>
                  <td><EvidenceStatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}</Async>
    </>
  );
}
