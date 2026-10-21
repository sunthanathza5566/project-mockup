/**
 * Export (M11 แบบเบา) — SAR เป็น Word (.doc จาก HTML), Evidence index + Appendix A เป็น .xlsx (exceljs)
 * ทุกฟังก์ชันคืน Blob (ไม่แตะ DOM) — ใช้ downloadBlob() ฝั่ง browser เพื่อบันทึกไฟล์
 * TODO(Phase B): DOCX จริง/PDF, evidence package ZIP
 */
import ExcelJS from 'exceljs';
import type { AppUser, Evidence, EvidenceLink, Rating, SarSection } from '../types';
import { appendAudit } from './audit.store';
import { AunqaError, KEYS, load } from './db';
import { compareReqId, listCriteria, listRequirements } from './framework';
import { getFaculties, getProgramme, getUniversity, getUserById } from './org.store';
import { can } from './rbac';
import { loadGapInput } from './dashboard';
import { readiness } from './gap';
import { getCycleRaw } from './workflow';
import { loadBundle, type Bundle } from './export-bundle.internal';

const BROWN_DARK = 'FF6B4F2F';
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl2br = (s: string) => esc(s).replace(/\n/g, '<br/>');

/** แปลง [E-…] ในข้อความเป็นลิงก์ไปภาคผนวก evidence index */
function linkCitations(text: string): string {
  return nl2br(text).replace(/\[(E-\d+\.\d+-\d{2,})\]/g, '<a href="#ev-$1">[$1]</a>');
}

const KIND_TH: Record<string, string> = {
  policy: 'นโยบาย', plan: 'แผน', minutes: 'รายงานการประชุม', survey: 'ผลสำรวจ', statistics: 'สถิติ', photo: 'ภาพกิจกรรม', publication: 'ผลงาน', other: 'อื่น ๆ',
};
const STATUS_TH: Record<string, string> = {
  not_started: 'ยังไม่เริ่ม', drafting: 'กำลังร่าง', ready_for_review: 'รอตรวจ', changes_requested: 'ส่งกลับแก้', approved: 'อนุมัติแล้ว',
};

// ─── SAR (.doc) ──────────────────────────────────────────────────────────
export function exportSarDoc(user: AppUser, cycleId: string): Blob {
  const b = loadBundle(user, cycleId);
  const criteria = listCriteria().slice().sort((a, z) => a.no - z.no);
  const reqs = listRequirements().slice().sort((a, z) => compareReqId(a.id, z.id));
  const gi = loadGapInput(cycleId);
  const ready = readiness(gi);
  const owners = Array.from(new Set(Array.from(b.sections.values()).map(s => s.ownerUserId).filter((x): x is string => !!x)))
    .map(id => getUserById(id)?.fullName).filter(Boolean) as string[];
  const codesByReq = (rid: string) => b.links.filter(l => l.requirementId === rid)
    .map(l => b.evidence.find(e => e.id === l.evidenceId)).filter((e): e is Evidence => !!e);

  const h: string[] = [];
  h.push(`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"/><title>SAR ${esc(b.programmeName)}</title>
<style>body{font-family:'TH Sarabun New','Sarabun',serif;font-size:16pt;line-height:1.4}h1{font-size:26pt;text-align:center}h2{font-size:20pt;color:#6B4F2F;border-bottom:1px solid #6B4F2F}h3{font-size:17pt}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #888;padding:4px;font-size:13pt;vertical-align:top}th{background:#6B4F2F;color:#fff}.cover{text-align:center;margin-top:160pt}.pb{page-break-before:always}.muted{color:#666;font-size:13pt}</style></head><body>`);

  // ปก
  h.push(`<div class="cover"><h1>รายงานการประเมินตนเอง (Self-Assessment Report)</h1><h1>ตามเกณฑ์ AUN-QA ระดับหลักสูตร เวอร์ชัน 4.0</h1>
<p><b>${esc(b.programmeName)}</b> (${esc(b.programmeCode)})</p><p>${esc(b.facultyName)} · ${esc(b.universityName)}</p>
<p>ปีการศึกษา ${b.academicYear} · revision ${b.revision}</p>${b.snapshotHash ? `<p class="muted">Snapshot SHA-256: ${esc(b.snapshotHash)}</p>` : ''}</div>`);

  // สารบัญ
  h.push(`<div class="pb"><h2>สารบัญ</h2><ol><li><a href="#exec">บทสรุปผู้บริหาร</a></li><li><a href="#part1">Part 1 — บทนำ</a></li><li>Part 2 — เกณฑ์ AUN-QA</li><ul>`);
  criteria.forEach(c => h.push(`<li><a href="#c${c.no}">เกณฑ์ที่ ${c.no} ${esc(c.nameTh)}</a></li>`));
  h.push(`</ul><li><a href="#part3">Part 3 — จุดแข็งและจุดที่ควรพัฒนา</a></li><li><a href="#part4">Part 4 — Self-assessment checklist (Appendix A)</a></li><li><a href="#evindex">ภาคผนวก — Evidence index</a></li></ol></div>`);

  // Exec summary
  const rated = Array.from(b.ratings.values());
  const avg = rated.length ? (rated.reduce((s, r) => s + r.score, 0) / rated.length).toFixed(2) : '-';
  h.push(`<div class="pb"><h2 id="exec">บทสรุปผู้บริหาร</h2><p>รายงานฉบับนี้จัดทำสำหรับหลักสูตร ${esc(b.programmeName)} ปีการศึกษา ${b.academicYear} ตามเกณฑ์ AUN-QA v4.0 จำนวน ${criteria.length} เกณฑ์ ${reqs.length} ข้อ
 ความพร้อมของรายงาน ${ready.percent}% · คะแนนประเมินตนเองเฉลี่ย ${avg} (จาก ${rated.length} ข้อที่ให้คะแนน) · หลักฐานที่อ้างอิง ${b.evidence.length} รายการ</p>
<p class="muted">ผู้เขียนสามารถแก้ไขข้อความสรุปนี้ใน Word ได้ก่อนเผยแพร่</p></div>`);

  // Part 1
  h.push(`<div class="pb"><h2 id="part1">Part 1 — บทนำ</h2><table><tr><th>รายการ</th><th>ข้อมูล</th></tr>
<tr><td>มหาวิทยาลัย</td><td>${esc(b.universityName)}</td></tr><tr><td>คณะ</td><td>${esc(b.facultyName)}</td></tr>
<tr><td>หลักสูตร</td><td>${esc(b.programmeName)} (${esc(b.programmeCode)})</td></tr><tr><td>ปีการศึกษาที่ประเมิน</td><td>${b.academicYear}</td></tr>
<tr><td>คณะทำงานเขียน SAR</td><td>${esc(owners.join(', ') || '-')}</td></tr></table></div>`);

  // Part 2
  h.push(`<div class="pb"><h2>Part 2 — AUN-QA Criteria</h2></div>`);
  criteria.forEach(c => {
    h.push(`<h2 id="c${c.no}">เกณฑ์ที่ ${c.no} ${esc(c.nameTh)} <span class="muted">(${esc(c.nameEn)})</span></h2>`);
    reqs.filter(r => r.criterionNo === c.no).forEach(r => {
      const s = b.sections.get(r.id);
      const rt = b.ratings.get(r.id);
      h.push(`<h3>${esc(r.id)} ${esc(r.textTh)}</h3><p class="muted">${esc(r.textEn)}</p>`);
      h.push(s && s.narrativeTh.trim() ? `<p>${linkCitations(s.narrativeTh)}</p>` : `<p class="muted">[ยังไม่มีเนื้อหา]</p>`);
      if (s && s.narrativeEn.trim()) h.push(`<p><i>${linkCitations(s.narrativeEn)}</i></p>`);
      if (s) h.push(`<p class="muted">PDCA: Plan ${s.pdca.plan ? '✓' : '✗'} · Do ${s.pdca.do ? '✓' : '✗'} · Check ${s.pdca.check ? '✓' : '✗'} · Act ${s.pdca.act ? '✓' : '✗'}${rt ? ` · Self-rating: ${rt.score}/7` : ''}</p>`);
      const ev = codesByReq(r.id);
      if (ev.length) h.push(`<p class="muted">หลักฐาน: ${ev.map(e => `<a href="#ev-${esc(e.code)}">${esc(e.code)}</a>`).join(', ')}</p>`);
    });
  });

  // Part 3
  h.push(`<div class="pb"><h2 id="part3">Part 3 — จุดแข็งและจุดที่ควรพัฒนา (สรุปอัตโนมัติจากข้อมูลในระบบ)</h2><table><tr><th>เกณฑ์</th><th>คะแนนเฉลี่ย (self)</th><th>ข้อคะแนนสูงสุด</th><th>ข้อคะแนนต่ำสุด</th><th>gap ที่เปิดอยู่</th></tr>`);
  criteria.forEach(c => {
    const rs = reqs.filter(r => r.criterionNo === c.no).map(r => ({ id: r.id, sc: b.ratings.get(r.id)?.score })).filter((x): x is { id: string; sc: number } => x.sc !== undefined);
    const top = rs.slice().sort((a, z) => z.sc - a.sc)[0]; const low = rs.slice().sort((a, z) => a.sc - z.sc)[0];
    const gaps = ready.gaps.filter(g => reqs.find(r => r.id === g.requirementId)?.criterionNo === c.no).length;
    h.push(`<tr><td>${c.no} ${esc(c.nameTh)}</td><td>${rs.length ? (rs.reduce((s, x) => s + x.sc, 0) / rs.length).toFixed(2) : '-'}</td><td>${top ? `${top.id} (${top.sc})` : '-'}</td><td>${low ? `${low.id} (${low.sc})` : '-'}</td><td>${gaps}</td></tr>`);
  });
  h.push(`</table></div>`);

  // Part 4 — Appendix A
  h.push(`<div class="pb"><h2 id="part4">Part 4 — Self-assessment checklist (Appendix A)</h2><table><tr><th>ข้อ</th><th>Requirement</th><th>Self-rating (1–7)</th><th>เหตุผล</th><th>สถานะ</th></tr>`);
  reqs.forEach(r => {
    const rt = b.ratings.get(r.id);
    h.push(`<tr><td>${esc(r.id)}</td><td>${esc(r.textTh)}</td><td>${rt ? rt.score : '-'}</td><td>${esc(rt?.rationale ?? '')}</td><td>${esc(STATUS_TH[b.sections.get(r.id)?.status ?? 'not_started'])}</td></tr>`);
  });
  h.push(`</table></div>`);

  // Evidence index
  h.push(`<div class="pb"><h2 id="evindex">ภาคผนวก — Evidence index</h2><table><tr><th>รหัส</th><th>ชื่อ</th><th>ประเภท</th><th>PDCA</th><th>ปี</th><th>ข้อที่ผูก</th><th>ลิงก์</th></tr>`);
  b.evidence.forEach(e => {
    const rids = Array.from(new Set(b.links.filter(l => l.evidenceId === e.id).map(l => l.requirementId))).sort(compareReqId);
    h.push(`<tr id="ev-${esc(e.code)}"><td>${esc(e.code)}</td><td>${esc(e.title)}</td><td>${esc(KIND_TH[e.kind] ?? e.kind)}</td><td>${e.pdcaStage}</td><td>${e.academicYear}</td><td>${esc(rids.join(', '))}</td><td>${esc(e.url ?? '')}</td></tr>`);
  });
  h.push(`</table></div></body></html>`);

  appendAudit(user, { action: 'export.sar_doc', targetType: 'cycle', targetId: cycleId, programmeId: getCycleRaw(cycleId).programmeId });
  return new Blob(['﻿', h.join('\n')], { type: 'application/msword' });
}

// ─── XLSX ────────────────────────────────────────────────────────────────
function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BROWN_DARK } };
  row.alignment = { horizontal: 'center', vertical: 'middle' };
}
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function toBlob(wb: ExcelJS.Workbook): Promise<Blob> {
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: XLSX_MIME });
}

function addEvidenceSheet(wb: ExcelJS.Workbook, b: Bundle) {
  const ws = wb.addWorksheet('Evidence index');
  ws.columns = [
    { header: 'รหัส', key: 'code', width: 14 }, { header: 'ชื่อหลักฐาน', key: 'title', width: 44 }, { header: 'ประเภท', key: 'kind', width: 16 },
    { header: 'PDCA', key: 'pdca', width: 8 }, { header: 'ปี', key: 'year', width: 8 }, { header: 'ข้อที่ผูก', key: 'reqs', width: 22 },
    { header: 'สถานะ', key: 'status', width: 12 }, { header: 'PII', key: 'pii', width: 10 }, { header: 'ลิงก์', key: 'url', width: 40 }, { header: 'SHA-256', key: 'sha', width: 20 },
  ];
  styleHeader(ws.getRow(1));
  b.evidence.forEach(e => {
    const rids = Array.from(new Set(b.links.filter(l => l.evidenceId === e.id).map(l => l.requirementId))).sort(compareReqId);
    ws.addRow({
      code: e.code, title: e.title, kind: KIND_TH[e.kind] ?? e.kind, pdca: e.pdcaStage, year: e.academicYear, reqs: rids.join(', '),
      status: e.status, pii: e.containsPii ? (e.piiResolved ? 'จัดการแล้ว' : 'ค้าง') : '-', url: e.url ?? '', sha: e.sha256 ? e.sha256.slice(0, 16) + '…' : '',
    });
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function addAppendixSheet(wb: ExcelJS.Workbook, b: Bundle) {
  const ws = wb.addWorksheet('Appendix A');
  ws.columns = [
    { header: 'เกณฑ์', key: 'c', width: 8 }, { header: 'ข้อ', key: 'id', width: 8 }, { header: 'Requirement', key: 'text', width: 60 },
    { header: 'Self-rating (1–7)', key: 'score', width: 16 }, { header: 'เหตุผล', key: 'why', width: 50 }, { header: 'สถานะ', key: 'status', width: 16 },
    { header: 'จำนวนหลักฐาน', key: 'ev', width: 14 },
  ];
  styleHeader(ws.getRow(1));
  listRequirements().slice().sort((a, z) => compareReqId(a.id, z.id)).forEach(r => {
    const rt = b.ratings.get(r.id);
    ws.addRow({
      c: r.criterionNo, id: r.id, text: r.textTh, score: rt?.score ?? '', why: rt?.rationale ?? '',
      status: STATUS_TH[b.sections.get(r.id)?.status ?? 'not_started'], ev: new Set(b.links.filter(l => l.requirementId === r.id).map(l => l.evidenceId)).size,
    });
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

export async function exportEvidenceIndexXlsx(user: AppUser, cycleId: string): Promise<Blob> {
  const b = loadBundle(user, cycleId);
  const wb = new ExcelJS.Workbook();
  addEvidenceSheet(wb, b);
  appendAudit(user, { action: 'export.evidence_index', targetType: 'cycle', targetId: cycleId, programmeId: getCycleRaw(cycleId).programmeId });
  return toBlob(wb);
}

export async function exportAppendixAXlsx(user: AppUser, cycleId: string): Promise<Blob> {
  const b = loadBundle(user, cycleId);
  const wb = new ExcelJS.Workbook();
  addAppendixSheet(wb, b);
  appendAudit(user, { action: 'export.appendix_a', targetType: 'cycle', targetId: cycleId, programmeId: getCycleRaw(cycleId).programmeId });
  return toBlob(wb);
}

/** ทั้งสองแผ่นในไฟล์เดียว */
export async function exportEvidenceAndAppendixXlsx(user: AppUser, cycleId: string): Promise<Blob> {
  const b = loadBundle(user, cycleId);
  const wb = new ExcelJS.Workbook();
  addEvidenceSheet(wb, b);
  addAppendixSheet(wb, b);
  appendAudit(user, { action: 'export.evidence_appendix', targetType: 'cycle', targetId: cycleId, programmeId: getCycleRaw(cycleId).programmeId });
  return toBlob(wb);
}

/** บันทึกไฟล์ฝั่ง browser */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}

