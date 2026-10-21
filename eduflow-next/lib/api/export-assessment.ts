/**
 * Export รายงานกรรมการ (M12): Appendix B (findings ต่อข้อ) และ Appendix D (รายงานผลการประเมิน)
 * ไฟล์ .doc = HTML (ไม่ใช่ DOCX จริง) · ข้อความทุกส่วน escape แล้ว · คืน Blob (ใช้ downloadBlob ฝั่ง browser)
 * สิทธิ์: กรรมการของรอบ หรือผู้มีสิทธิ์อ่านรอบเมื่อ assessed/closed
 */
import type { AppUser, AssessmentCycle, AssessmentFinding, Rating } from '../types';
import { escapeHtml as esc, escapeHtmlBr as br } from '../utils/html';
import { RATING_SCALE, canSeeAssessment, listCriterionRatings, listFindings, listVerdicts, scaleLabel } from './assessor.store';
import { appendAudit } from './audit.store';
import { AunqaError } from './db';
import { listCriteria, listRequirements } from './framework';
import { getFaculties, getProgramme, getUniversity, getUserById } from './org.store';
import { can } from './rbac';
import { cycleScope, getCycleRaw } from './workflow';

const STYLE = `<style>body{font-family:'TH Sarabun New','Sarabun',serif;font-size:16pt;line-height:1.4}h1{font-size:24pt;text-align:center}h2{font-size:19pt;color:#6B4F2F;border-bottom:1px solid #6B4F2F}h3{font-size:16pt}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #888;padding:4px;font-size:13pt;vertical-align:top}th{background:#6B4F2F;color:#fff}.muted{color:#666;font-size:13pt}</style>`;

function guard(user: AppUser, cycleId: string): AssessmentCycle {
  const c = getCycleRaw(cycleId);
  if (!can(user, 'read', cycleScope(c))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ส่งออกรอบนี้');
  if (!canSeeAssessment(user, c)) throw new AunqaError('forbidden', 'รายงานกรรมการจะเปิดให้ดูเมื่อการประเมินเสร็จสิ้น');
  return c;
}
const nameOf = (id: string) => getUserById(id)?.fullName ?? 'กรรมการ';
const wrap = (title: string, body: string) =>
  `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"/><title>${esc(title)}</title>${STYLE}</head><body>${body}</body></html>`;
const toBlob = (html: string) => new Blob(['﻿', html], { type: 'application/msword' });

function header(c: AssessmentCycle, title: string): string {
  const prog = getProgramme(c.programmeId);
  const fac = getFaculties(c.universityId).find(f => f.id === prog?.facultyId);
  return `<h1>${esc(title)}</h1><p style="text-align:center"><b>${esc(prog?.nameTh ?? '')}</b> (${esc(prog?.code ?? '')})<br/>${esc(fac?.nameTh ?? '')} · ${esc(getUniversity(c.universityId)?.nameTh ?? '')}<br/>ปีการศึกษา ${c.academicYear} · revision ${c.revision}</p>`;
}

/** Appendix B — Strengths / AFI / Interview Questions / Sources of Evidence ต่อข้อ */
export function exportAppendixBDoc(user: AppUser, cycleId: string): Blob {
  const c = guard(user, cycleId);
  const findings = listFindings(user, cycleId);
  const h: string[] = [header(c, 'Appendix B — Assessment Findings (ผลการพิจารณารายข้อ)')];
  for (const cr of listCriteria().slice().sort((a, z) => a.no - z.no)) {
    h.push(`<h2>เกณฑ์ที่ ${cr.no} ${esc(cr.nameTh)} <span class="muted">(${esc(cr.nameEn)})</span></h2>`);
    for (const r of listRequirements(cr.no)) {
      h.push(`<h3>${esc(r.id)} ${esc(r.textTh)}</h3>`);
      const fs = findings.filter(f => f.requirementId === r.id);
      if (!fs.length) { h.push('<p class="muted">[ยังไม่มีบันทึกจากกรรมการ]</p>'); continue; }
      for (const f of fs) {
        h.push(`<table><tr><th colspan="2">กรรมการ: ${esc(nameOf(f.assessorUserId))}</th></tr>
<tr><td width="25%"><b>Strengths</b></td><td>${br(f.strengths) || '-'}</td></tr>
<tr><td><b>Areas for Improvement (AFI)</b></td><td>${br(f.afi) || '-'}</td></tr>
<tr><td><b>Interview Questions</b></td><td>${br(f.interviewQuestions) || '-'}</td></tr>
<tr><td><b>Sources of Evidence</b></td><td>${br(f.sourcesOfEvidence) || '-'}</td></tr></table><br/>`);
      }
    }
  }
  appendAudit(user, { action: 'export.appendix_b', targetType: 'cycle', targetId: cycleId, programmeId: c.programmeId, after: { findings: findings.length } });
  return toBlob(wrap('Appendix B', h.join('')));
}

/** Appendix D — รายงานผลการประเมิน: คะแนนกรรมการรายเกณฑ์ + overall verdict (เลือกโดยกรรมการ) + สรุป strengths/AFI */
export function exportAppendixDDoc(user: AppUser, cycleId: string): Blob {
  const c = guard(user, cycleId);
  const ratings = listCriterionRatings(user, cycleId);
  const verdicts = listVerdicts(user, cycleId);
  const findings = listFindings(user, cycleId);
  const criteria = listCriteria().slice().sort((a, z) => a.no - z.no);
  const h: string[] = [header(c, 'Appendix D — Assessment Report (รายงานผลการประเมิน)')];

  h.push('<h2>1. คะแนนรายเกณฑ์ (ให้โดยกรรมการ)</h2><table><tr><th>เกณฑ์</th><th>กรรมการ</th><th>คะแนน</th><th>ความหมาย</th><th>เหตุผล</th></tr>');
  for (const cr of criteria) {
    const rs = ratings.filter((r: Rating) => r.criterionNo === cr.no);
    if (!rs.length) h.push(`<tr><td>${cr.no} ${esc(cr.nameTh)}</td><td colspan="4" class="muted">ยังไม่มีคะแนน</td></tr>`);
    rs.forEach(r => h.push(`<tr><td>${cr.no} ${esc(cr.nameTh)}</td><td>${esc(nameOf(r.raterUserId))}</td><td>${r.score}</td><td>${esc(scaleLabel(r.score)?.nameEn ?? '')}</td><td>${br(r.rationale)}</td></tr>`));
  }
  h.push('</table>');

  h.push('<h2>2. Overall verdict</h2><p class="muted">กรรมการเลือกเองแบบองค์รวม — ระบบไม่คำนวณจากค่าเฉลี่ยของคะแนนรายเกณฑ์</p>');
  if (!verdicts.length) h.push('<p class="muted">[ยังไม่มี verdict]</p>');
  verdicts.forEach(v => h.push(`<p><b>${esc(nameOf(v.assessorUserId))}</b>: ${v.verdict} — ${esc(scaleLabel(v.verdict)?.nameEn ?? '')}<br/>${br(v.rationale)}</p>`));

  h.push('<h2>3. จุดแข็งและข้อเสนอเพื่อการพัฒนา (จาก Appendix B)</h2>');
  for (const cr of criteria) {
    const reqIds = new Set(listRequirements(cr.no).map(r => r.id));
    const fs = findings.filter((f: AssessmentFinding) => reqIds.has(f.requirementId) && (f.strengths.trim() || f.afi.trim()));
    h.push(`<h3>เกณฑ์ที่ ${cr.no} ${esc(cr.nameTh)}</h3>`);
    if (!fs.length) { h.push('<p class="muted">-</p>'); continue; }
    h.push('<table><tr><th>ข้อ</th><th>Strengths</th><th>AFI</th></tr>');
    fs.forEach(f => h.push(`<tr><td>${esc(f.requirementId)}</td><td>${br(f.strengths) || '-'}</td><td>${br(f.afi) || '-'}</td></tr>`));
    h.push('</table>');
  }
  h.push(`<h2>ภาคผนวก — สเกลคะแนน</h2><table><tr><th>คะแนน</th><th>ระดับ</th></tr>${RATING_SCALE.map(s => `<tr><td>${s.score}</td><td>${esc(s.nameEn)}</td></tr>`).join('')}</table>`);
  appendAudit(user, { action: 'export.appendix_d', targetType: 'cycle', targetId: cycleId, programmeId: c.programmeId, after: { ratings: ratings.length, verdicts: verdicts.length } });
  return toBlob(wrap('Appendix D', h.join('')));
}
