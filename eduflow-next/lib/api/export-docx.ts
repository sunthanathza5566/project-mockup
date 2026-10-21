/**
 * Export SAR เป็น DOCX จริง (M11) ด้วยไลบรารี docx — ปก, สารบัญ (TOC field), บทสรุป, Part 1–4, เกณฑ์ 1–8 ข้อ x.1…, ภาคผนวก Evidence index
 * ฟอนต์ TH Sarabun New · [E-…] ในเนื้อหาเป็นลิงก์ภายในไปแถวใน evidence index
 * สารบัญเป็น field: Word จะถามอัปเดต field ตอนเปิดไฟล์ (features.updateFields) — กด "ใช่" เพื่อให้เลขหน้าขึ้น
 * คง exportSarDoc (.doc HTML) ใน export.ts ไว้เป็น fallback
 */
import {
  AlignmentType, BorderStyle, Bookmark, Document, Footer, HeadingLevel, InternalHyperlink, Packer, PageNumber, Paragraph,
  ShadingType, Table, TableCell, TableOfContents, TableRow, TextRun, WidthType,
} from 'docx';
import type { AppUser, Evidence } from '../types';
import { appendAudit } from './audit.store';
import { loadGapInput } from './dashboard';
import { loadBundle } from './export-bundle.internal';
import { compareReqId, listCriteria, listRequirements } from './framework';
import { readiness } from './gap';
import { getUserById } from './org.store';
import { getCycleRaw } from './workflow';

const FONT = 'TH Sarabun New';
const BROWN = '6B4F2F';
const GREY = '666666';
const CITE_SPLIT = /(\[E-\d+\.\d+-\d{2,}\])/g;

const KIND_TH: Record<string, string> = {
  policy: 'นโยบาย', plan: 'แผน', minutes: 'รายงานการประชุม', survey: 'ผลสำรวจ', statistics: 'สถิติ', photo: 'ภาพกิจกรรม', publication: 'ผลงาน', other: 'อื่น ๆ',
};
const STATUS_TH: Record<string, string> = {
  not_started: 'ยังไม่เริ่ม', drafting: 'กำลังร่าง', ready_for_review: 'รอตรวจ', changes_requested: 'ส่งกลับแก้', approved: 'อนุมัติแล้ว',
};

/** ชื่อ bookmark ที่ Word รับได้ (ตัวอักษร/ตัวเลข/_) */
const bm = (code: string) => `ev_${code.replace(/[^A-Za-z0-9]/g, '_')}`;

const run = (text: string, o: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {}) =>
  new TextRun({ text, font: FONT, bold: o.bold, italics: o.italics, color: o.color, size: o.size, sizeComplexScript: o.size });

function para(text: string, o: { bold?: boolean; italics?: boolean; color?: string; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number } = {}) {
  return new Paragraph({ alignment: o.align, spacing: { after: o.after ?? 120 }, children: [run(text, o)] });
}

/** ข้อความที่มี [E-…] → TextRun + ลิงก์ภายใน (เฉพาะรหัสที่อยู่ใน evidence index ของรอบนี้) */
function richParas(text: string, known: Set<string>, o: { italics?: boolean } = {}): Paragraph[] {
  return text.split('\n').map(line => new Paragraph({
    spacing: { after: 100 },
    children: line.split(CITE_SPLIT).filter(Boolean).map(part => {
      const m = /^\[(E-\d+\.\d+-\d{2,})\]$/.exec(part);
      if (m && known.has(m[1])) return new InternalHyperlink({ anchor: bm(m[1]), children: [run(part, { color: '1F4E9E', italics: o.italics })] });
      return run(part, { italics: o.italics });
    }),
  }));
}

const heading = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel], pageBreak = false) =>
  new Paragraph({ heading: level, pageBreakBefore: pageBreak, spacing: { before: 240, after: 120 }, children: [run(text, { bold: true })] });

function cell(children: Paragraph[] | string, o: { header?: boolean; width?: number } = {}) {
  const ps = typeof children === 'string' ? [para(children, { bold: o.header, color: o.header ? 'FFFFFF' : undefined, size: 26, after: 0 })] : children;
  return new TableCell({
    children: ps, width: o.width ? { size: o.width, type: WidthType.PERCENTAGE } : undefined,
    shading: o.header ? { type: ShadingType.CLEAR, fill: BROWN, color: 'auto' } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  });
}

function table(head: string[], rows: (string | Paragraph[])[][], widths?: number[]) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: '888888' };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, { header: true, width: widths?.[i] })) }),
      ...rows.map(r => new TableRow({ children: r.map((c, i) => cell(c, { width: widths?.[i] })) })),
    ],
  });
}

/** SAR ทั้งเล่มเป็น .docx — สิทธิ์เดียวกับ exportSarDoc (อ่านรอบได้) */
export async function exportSarDocx(user: AppUser, cycleId: string): Promise<Blob> {
  const b = loadBundle(user, cycleId);
  const criteria = listCriteria().slice().sort((a, z) => a.no - z.no);
  const reqs = listRequirements().slice().sort((a, z) => compareReqId(a.id, z.id));
  const ready = readiness(loadGapInput(cycleId));
  const owners = Array.from(new Set(Array.from(b.sections.values()).map(s => s.ownerUserId).filter((x): x is string => !!x)))
    .map(id => getUserById(id)?.fullName).filter(Boolean) as string[];
  const known = new Set(b.evidence.map(e => e.code));
  const evByReq = (rid: string) => b.links.filter(l => l.requirementId === rid)
    .map(l => b.evidence.find(e => e.id === l.evidenceId)).filter((e): e is Evidence => !!e);
  const rated = Array.from(b.ratings.values());
  const avg = rated.length ? (rated.reduce((s, r) => s + r.score, 0) / rated.length).toFixed(2) : '-';

  // ── ปก ──
  const cover: Paragraph[] = [
    new Paragraph({ spacing: { before: 3200 }, children: [] }),
    para('รายงานการประเมินตนเอง', { bold: true, size: 56, align: AlignmentType.CENTER }),
    para('Self-Assessment Report', { bold: true, size: 44, align: AlignmentType.CENTER }),
    para('ตามเกณฑ์ AUN-QA ระดับหลักสูตร เวอร์ชัน 4.0', { size: 36, align: AlignmentType.CENTER, after: 400 }),
    para(`${b.programmeName} (${b.programmeCode})`, { bold: true, size: 40, align: AlignmentType.CENTER }),
    para(`${b.facultyName} · ${b.universityName}`, { size: 34, align: AlignmentType.CENTER }),
    para(`ปีการศึกษา ${b.academicYear} · revision ${b.revision}`, { size: 34, align: AlignmentType.CENTER }),
    ...(b.snapshotHash ? [para(`Snapshot SHA-256: ${b.snapshotHash}`, { size: 22, color: GREY, align: AlignmentType.CENTER })] : []),
  ];

  // ── สารบัญ ──
  const toc: (Paragraph | TableOfContents)[] = [
    heading('สารบัญ', HeadingLevel.HEADING_1),
    new TableOfContents('สารบัญ', { hyperlink: true, headingStyleRange: '1-3' }),
  ];

  const body: (Paragraph | Table)[] = [];
  // ── บทสรุปผู้บริหาร ──
  body.push(heading('บทสรุปผู้บริหาร', HeadingLevel.HEADING_1, true));
  body.push(para(`รายงานฉบับนี้จัดทำสำหรับหลักสูตร ${b.programmeName} ปีการศึกษา ${b.academicYear} ตามเกณฑ์ AUN-QA v4.0 จำนวน ${criteria.length} เกณฑ์ ${reqs.length} ข้อ ความพร้อมของรายงาน ${ready.percent}% · คะแนนประเมินตนเองเฉลี่ย ${avg} (จาก ${rated.length} ข้อที่ให้คะแนน) · หลักฐานที่อ้างอิง ${b.evidence.length} รายการ`));
  body.push(para('ผู้เขียนสามารถแก้ไขข้อความสรุปนี้ใน Word ได้ก่อนเผยแพร่', { color: GREY, size: 26 }));

  // ── Part 1 ──
  body.push(heading('Part 1 — บทนำ', HeadingLevel.HEADING_1, true));
  body.push(table(['รายการ', 'ข้อมูล'], [
    ['มหาวิทยาลัย', b.universityName], ['คณะ', b.facultyName], ['หลักสูตร', `${b.programmeName} (${b.programmeCode})`],
    ['ปีการศึกษาที่ประเมิน', String(b.academicYear)], ['คณะทำงานเขียน SAR', owners.join(', ') || '-'],
  ], [30, 70]));

  // ── Part 2 ──
  body.push(heading('Part 2 — AUN-QA Criteria', HeadingLevel.HEADING_1, true));
  criteria.forEach(c => {
    body.push(heading(`เกณฑ์ที่ ${c.no} ${c.nameTh} (${c.nameEn})`, HeadingLevel.HEADING_2));
    reqs.filter(r => r.criterionNo === c.no).forEach(r => {
      const s = b.sections.get(r.id);
      const rt = b.ratings.get(r.id);
      body.push(heading(`${r.id} ${r.textTh}`, HeadingLevel.HEADING_3));
      body.push(para(r.textEn, { color: GREY, size: 26 }));
      if (s && s.narrativeTh.trim()) body.push(...richParas(s.narrativeTh, known));
      else body.push(para('[ยังไม่มีเนื้อหา]', { color: GREY }));
      if (s && s.narrativeEn.trim()) body.push(...richParas(s.narrativeEn, known, { italics: true }));
      if (s) body.push(para(`PDCA: Plan ${s.pdca.plan ? '✓' : '✗'} · Do ${s.pdca.do ? '✓' : '✗'} · Check ${s.pdca.check ? '✓' : '✗'} · Act ${s.pdca.act ? '✓' : '✗'}${rt ? ` · Self-rating: ${rt.score}/7` : ''}`, { color: GREY, size: 26 }));
      const ev = evByReq(r.id);
      if (ev.length) body.push(new Paragraph({
        spacing: { after: 120 },
        children: [run('หลักฐาน: ', { color: GREY, size: 26 }), ...ev.flatMap((e, i) => [
          ...(i ? [run(', ', { color: GREY, size: 26 })] : []),
          new InternalHyperlink({ anchor: bm(e.code), children: [run(e.code, { color: '1F4E9E', size: 26 })] }),
        ])],
      }));
    });
  });

  // ── Part 3 ──
  body.push(heading('Part 3 — จุดแข็งและจุดที่ควรพัฒนา (สรุปอัตโนมัติจากข้อมูลในระบบ)', HeadingLevel.HEADING_1, true));
  body.push(table(['เกณฑ์', 'คะแนนเฉลี่ย (self)', 'ข้อคะแนนสูงสุด', 'ข้อคะแนนต่ำสุด', 'gap ที่เปิดอยู่'], criteria.map(c => {
    const rs = reqs.filter(r => r.criterionNo === c.no).map(r => ({ id: r.id, sc: b.ratings.get(r.id)?.score }))
      .filter((x): x is { id: string; sc: number } => x.sc !== undefined);
    const top = rs.slice().sort((a, z) => z.sc - a.sc)[0]; const low = rs.slice().sort((a, z) => a.sc - z.sc)[0];
    const gaps = ready.gaps.filter(g => reqs.find(r => r.id === g.requirementId)?.criterionNo === c.no).length;
    return [`${c.no} ${c.nameTh}`, rs.length ? (rs.reduce((s, x) => s + x.sc, 0) / rs.length).toFixed(2) : '-',
      top ? `${top.id} (${top.sc})` : '-', low ? `${low.id} (${low.sc})` : '-', String(gaps)];
  }), [34, 16, 18, 18, 14]));

  // ── Part 4 ──
  body.push(heading('Part 4 — Self-assessment checklist (Appendix A)', HeadingLevel.HEADING_1, true));
  body.push(table(['ข้อ', 'Requirement', 'Self-rating (1–7)', 'เหตุผล', 'สถานะ'], reqs.map(r => {
    const rt = b.ratings.get(r.id);
    return [r.id, r.textTh, rt ? String(rt.score) : '-', rt?.rationale ?? '', STATUS_TH[b.sections.get(r.id)?.status ?? 'not_started']];
  }), [7, 40, 13, 27, 13]));

  // ── ภาคผนวก Evidence index ──
  body.push(heading('ภาคผนวก — Evidence index', HeadingLevel.HEADING_1, true));
  body.push(table(['รหัส', 'ชื่อ', 'ประเภท', 'PDCA', 'ปี', 'ข้อที่ผูก', 'ลิงก์'], b.evidence.map(e => {
    const rids = Array.from(new Set(b.links.filter(l => l.evidenceId === e.id).map(l => l.requirementId))).sort(compareReqId);
    return [
      [new Paragraph({ children: [new Bookmark({ id: bm(e.code), children: [run(e.code, { size: 26 })] })] })],
      e.title, KIND_TH[e.kind] ?? e.kind, e.pdcaStage, String(e.academicYear), rids.join(', '), e.url ?? '',
    ];
  }), [13, 30, 12, 7, 8, 15, 15]));

  const doc = new Document({
    creator: 'AUN-QA Copilot', title: `SAR ${b.programmeName} ${b.academicYear}`,
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: FONT, size: 32, sizeComplexScript: 32 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 44, sizeComplexScript: 44, bold: true, color: BROWN } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 38, sizeComplexScript: 38, bold: true, color: BROWN } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 34, sizeComplexScript: 34, bold: true } },
      ],
    },
    sections: [
      { children: cover },
      {
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 28 })] })] }) },
        children: [...toc, ...body],
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  appendAudit(user, { action: 'export.sar_docx', targetType: 'cycle', targetId: cycleId, programmeId: getCycleRaw(cycleId).programmeId });
  return blob;
}
