'use client';

/**
 * ตัวแสดง + พิมพ์เอกสาร ปพ. (HTML → พิมพ์/บันทึก PDF ด้วยเบราว์เซอร์)
 * รองรับ ปพ.1 (Transcript) · ปพ.2 (ประกาศนียบัตร) · ปพ.3 (รายชื่อผู้จบ) · ปพ.4 (คุณลักษณะ) · ปพ.6 (สมุดพก)
 * ปพ.5 = Excel (จัดการที่ ReportDocsView) · ปพ.7-9 = ยังไม่รองรับ (ไม่อยู่ในสเปก)
 */

import { useEffect } from 'react';
import type { PPDoc } from '@/lib/report-docs';
import {
  buildTranscript, buildReportCard, buildCharacteristics, buildGraduationRoster,
  docMeta, type DocStudent,
} from '@/lib/report-docs-data';
import { getAssessment } from '@/lib/api/assessment.store';

interface Props {
  doc: PPDoc;
  classroomLabel: string;   // ม.1/1
  academicYear: string;
  classroomId: string;
  student?: DocStudent;     // จำเป็นสำหรับ ปพ.1/6 (รายบุคคล)
  onClose: () => void;
}

const PRINT_STYLE_ID = 'pp-print-style';

export default function ReportDocPreview({ doc, classroomLabel, academicYear, classroomId, student, onClose }: Props) {
  const meta = docMeta(classroomLabel, academicYear);
  const s = meta.settings;

  // ใส่ print CSS ครั้งเดียว: พิมพ์เฉพาะกระดาษเอกสาร ซ่อน UI อื่น
  useEffect(() => {
    if (document.getElementById(PRINT_STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = PRINT_STYLE_ID;
    el.textContent = `@media print {
      body * { visibility: hidden !important; }
      .pp-paper, .pp-paper * { visibility: visible !important; }
      .pp-paper { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; margin: 0 !important; }
      .pp-noprint { display: none !important; }
    }`;
    document.head.appendChild(el);
  }, []);

  const SchoolHeader = () => (
    <div style={{ textAlign: 'center', borderBottom: '2px solid #222', paddingBottom: 10, marginBottom: 14 }}>
      {s.showLogo && <div style={{ fontSize: 26, marginBottom: 2 }}>🏫</div>}
      <div style={{ fontSize: 17, fontWeight: 700 }}>{s.schoolName || 'ชื่อสถานศึกษา'}</div>
      {s.address && <div style={{ fontSize: 12, color: '#444' }}>{s.address}</div>}
      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>{doc.name} — {doc.title}</div>
      <div style={{ fontSize: 12, color: '#444' }}>ปีการศึกษา {academicYear}</div>
    </div>
  );

  const InfoLine = ({ label, val }: { label: string; val: string }) => (
    <div style={{ display: 'flex', gap: 6, fontSize: 13, marginBottom: 3 }}>
      <span style={{ color: '#555' }}>{label}</span><span style={{ fontWeight: 600 }}>{val}</span>
    </div>
  );

  const Signatures = () => s.showSignature ? (
    <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 40, fontSize: 13, textAlign: 'center' }}>
      <div>
        <div style={{ borderBottom: '1px dotted #333', width: 170, margin: '0 auto 6px' }} />
        (นายทะเบียน)
      </div>
      <div>
        <div style={{ borderBottom: '1px dotted #333', width: 170, margin: '0 auto 6px' }} />
        ({s.directorName || '...........................'})<br />{s.directorTitle}
      </div>
    </div>
  ) : null;

  const th: React.CSSProperties = { border: '1px solid #333', padding: '5px 8px', fontSize: 12.5, background: '#f0ece3', fontWeight: 700 };
  const td: React.CSSProperties = { border: '1px solid #333', padding: '5px 8px', fontSize: 12.5 };

  function Body() {
    // ── ปพ.6 สมุดพก ──
    if (doc.id === 'pp6' && student) {
      const r = buildReportCard(student);
      return (
        <>
          <div style={{ marginBottom: 12 }}>
            <InfoLine label="ชื่อ-นามสกุล:" val={student.name} />
            <InfoLine label="เลขประจำตัวนักเรียน:" val={student.code} />
            <InfoLine label="ชั้น:" val={classroomLabel} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>ผลการเรียนรายวิชา</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <thead><tr><th style={{ ...th, textAlign: 'left' }}>รายวิชา</th><th style={th}>ผลการเรียน</th></tr></thead>
            <tbody>
              {r.rows.length === 0
                ? <tr><td style={{ ...td, textAlign: 'center' }} colSpan={2}>ยังไม่มีข้อมูล</td></tr>
                : r.rows.map(x => <tr key={x.courseId}><td style={td}>{x.courseName}</td><td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{x.grade}</td></tr>)}
            </tbody>
          </table>
          <div style={{ fontSize: 13, marginBottom: 4 }}>ผลการเรียนเฉลี่ย (GPA): <b>{r.gpax !== null ? r.gpax.toFixed(2) : '—'}</b></div>
          {(() => {
            const a = getAssessment(student.code);
            const rows: [string, string][] = [
              ['การอ่าน คิดวิเคราะห์ และเขียน', a?.readingThinkingWriting || '—'],
              ['คุณลักษณะอันพึงประสงค์', a?.characteristicsOverall || '—'],
              ['กิจกรรมพัฒนาผู้เรียน', a?.learnerActivities || '—'],
              ['เวลาเรียน (มา/ขาด/ลา/สาย)', '—'],
            ];
            return (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                <tbody>
                  {rows.map(([k, v]) => <tr key={k}><td style={{ ...td, width: '55%' }}>{k}</td><td style={{ ...td, textAlign: 'center' }}>{v}</td></tr>)}
                </tbody>
              </table>
            );
          })()}
          <div style={{ marginTop: 14, fontSize: 13 }}>ความเห็นครูประจำชั้น: ______________________________________________</div>
          <div style={{ marginTop: 8, fontSize: 13 }}>ความเห็นผู้ปกครอง: ________________________________________________</div>
          <Signatures />
        </>
      );
    }
    // ── ปพ.4 คุณลักษณะอันพึงประสงค์ ──
    if (doc.id === 'pp4') {
      const c = buildCharacteristics(student || { code: '—', name: '(เลือกนักเรียน)' });
      return (
        <>
          <div style={{ marginBottom: 12 }}>
            <InfoLine label="ชื่อ-นามสกุล:" val={student?.name || '—'} />
            <InfoLine label="ชั้น:" val={classroomLabel} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ ...th, width: 50 }}>ข้อ</th><th style={{ ...th, textAlign: 'left' }}>คุณลักษณะอันพึงประสงค์</th><th style={{ ...th, width: 160 }}>ผลการประเมิน</th></tr></thead>
            <tbody>
              {c.items.map(it => (
                <tr key={it.no}><td style={{ ...td, textAlign: 'center' }}>{it.no}</td><td style={td}>{it.name}</td><td style={{ ...td, textAlign: 'center' }}>{it.result || '—'}</td></tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700 }}>สรุปผลการประเมินคุณลักษณะอันพึงประสงค์: {c.overall || '—'}</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>เกณฑ์: ดีเยี่ยม / ดี / ผ่าน / ไม่ผ่าน</div>
          <Signatures />
        </>
      );
    }
    // ── ปพ.3 รายชื่อผู้สำเร็จการศึกษา ──
    if (doc.id === 'pp3') {
      const roster = buildGraduationRoster(classroomId);
      return (
        <>
          <div style={{ marginBottom: 10, fontSize: 13 }}>ระดับชั้น {classroomLabel} · ปีการศึกษา {academicYear}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ ...th, width: 50 }}>ที่</th><th style={{ ...th, textAlign: 'left' }}>ชื่อ-นามสกุล</th><th style={th}>เลขประจำตัว</th><th style={th}>GPAX</th><th style={th}>หมายเหตุ</th></tr></thead>
            <tbody>
              {roster.length === 0
                ? <tr><td style={{ ...td, textAlign: 'center' }} colSpan={5}>ไม่มีนักเรียนในห้องนี้</td></tr>
                : roster.map(r => (
                  <tr key={r.student.code}><td style={{ ...td, textAlign: 'center' }}>{r.no}</td><td style={td}>{r.student.name}</td><td style={{ ...td, textAlign: 'center' }}>{r.student.code}</td><td style={{ ...td, textAlign: 'center' }}>{r.gpax !== null ? r.gpax.toFixed(2) : '—'}</td><td style={td}>&nbsp;</td></tr>
                ))}
            </tbody>
          </table>
          <Signatures />
        </>
      );
    }
    return <div style={{ textAlign: 'center', color: '#888', padding: 30 }}>เอกสารนี้ยังไม่รองรับการแสดงผล</div>;
  }

  // ── ปพ.1 ระเบียนแสดงผลการเรียน (รูปแบบตามแบบราชการ ระดับประถมศึกษา) ──
  function PP1() {
    const t = buildTranscript(student!);
    const a = getAssessment(student!.code);
    const parts = student!.name.trim().split(/\s+/);
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ');
    const rows = t.rows;
    const perCol = Math.max(1, Math.ceil(rows.length / 3));
    const groups = [rows.slice(0, perCol), rows.slice(perCol, perCol * 2), rows.slice(perCol * 2)];
    const MIN_ROWS = 16;

    const Dot = ({ label, value }: { label: string; value?: string }) => (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, fontSize: 12.5, marginBottom: 7 }}>
        <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ flex: 1, borderBottom: '1px dotted #333', textAlign: 'center', minWidth: 10, lineHeight: 1.2 }}>{value || ' '}</span>
      </div>
    );

    const cell: React.CSSProperties = { borderLeft: '1px solid #333', borderRight: '1px solid #333', verticalAlign: 'top', fontSize: 11, padding: '0 4px', height: 22 };
    const hCell: React.CSSProperties = { border: '1px solid #333', fontSize: 11, fontWeight: 700, padding: '3px 2px', textAlign: 'center' };
    const vCell: React.CSSProperties = { ...hCell, writingMode: 'vertical-rl' as const, whiteSpace: 'nowrap' };

    const group = (list: typeof rows, key: number) => (
      <table key={key} style={{ flex: 1, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={hCell}>รหัส/รายวิชา</th>
            <th style={{ ...vCell, width: 20 }}>เวลา (ชั่วโมง)</th>
            <th style={{ ...vCell, width: 22 }}>ผลการเรียน</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: MIN_ROWS }, (_, i) => {
            const r = list[i];
            return (
              <tr key={i}>
                <td style={cell}>{r ? `${r.courseCode} ${r.courseName}` : ' '}</td>
                <td style={{ ...cell, width: 20, textAlign: 'center' }}>{' '}</td>
                <td style={{ ...cell, width: 22, textAlign: 'center', fontWeight: 700 }}>{r ? r.grade : ' '}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );

    // ระดับการศึกษาตามชั้นจริง: ป → ประถม · ม.1-3 → มัธยมต้น (บ) · ม.4-6 → มัธยมปลาย (พ)
    const isPrimary = classroomLabel.startsWith('ป');
    const isUpperSec = /^ม\.[456]/.test(classroomLabel);
    const levelText = isPrimary ? 'ระดับประถมศึกษา' : isUpperSec ? 'ระดับมัธยมศึกษาตอนปลาย' : 'ระดับมัธยมศึกษาตอนต้น';
    const levelCode = isPrimary ? 'ป' : isUpperSec ? 'พ' : 'บ';

    return (
      <div style={{ fontSize: 12.5, color: '#111' }}>
        {/* หัวเอกสาร */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ width: 54, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #bbb', borderRadius: '50%', fontSize: 9, color: '#999', textAlign: 'center', lineHeight: 1.1, flexShrink: 0 }}>ตรา<br />ครุฑ</div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>ระเบียนแสดงผลการเรียนหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน {levelText}</div>
            <div style={{ marginTop: 8, textAlign: 'left', paddingLeft: 26, display: 'flex', gap: 18 }}>
              <span style={{ whiteSpace: 'nowrap' }}>ปพ.1 : {levelCode}</span>
              <span>ชุดที่ <span style={{ borderBottom: '1px dotted #333', display: 'inline-block', width: 80 }} /> เลขที่ <span style={{ borderBottom: '1px dotted #333', display: 'inline-block', width: 110 }} /></span>
            </div>
          </div>
          <div style={{ width: 96, textAlign: 'center', flexShrink: 0 }}>
            <div style={{ color: 'red', fontSize: 12, marginBottom: 4 }}>(ตัวอย่าง)</div>
            <div style={{ border: '1px solid #333', width: 82, height: 104, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#555', lineHeight: 1.5 }}>ติดรูป<br />3 × 4 ซม.</div>
          </div>
        </div>

        {/* ฟิลด์ข้อมูล */}
        <div style={{ marginTop: 10 }}>
          <Dot label="โรงเรียน" value={s.schoolName} />
          <Dot label="สังกัด" value={s.address} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24 }}>
            <div>
              <Dot label="ตำบล/แขวง" />
              <Dot label="อำเภอ/เขต" />
              <Dot label="จังหวัด" />
              <Dot label="สำนักงานเขตพื้นที่การศึกษา" />
              <Dot label="วันเข้าเรียน" />
              <Dot label="โรงเรียนเดิม" />
              <Dot label="จังหวัด" />
              <Dot label="ชั้นเรียนสุดท้าย" value={classroomLabel} />
            </div>
            <div>
              <Dot label="ชื่อ" value={first} />
              <Dot label="ชื่อสกุล" value={last} />
              <Dot label="เลขประจำตัวนักเรียน" value={student!.code} />
              <Dot label="เลขประจำตัวประชาชน" />
              <Dot label="เกิดวันที่ / เดือน / พ.ศ." />
              <Dot label="เพศ / สัญชาติ / ศาสนา" />
              <Dot label="ชื่อ-ชื่อสกุลบิดา" />
              <Dot label="ชื่อ-ชื่อสกุลมารดา" />
            </div>
          </div>
        </div>

        {/* ผลการเรียนรายวิชา */}
        <div style={{ textAlign: 'center', fontWeight: 700, margin: '12px 0 4px', fontSize: 14 }}>ผลการเรียนรายวิชา</div>
        <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>{groups.map((g, i) => group(g, i))}</div>

        {/* สรุป + ลายเซ็นนายทะเบียน */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>
          <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
            <div>ผลการประเมินการอ่าน คิดวิเคราะห์ และเขียน: <b>{a?.readingThinkingWriting || '—'}</b></div>
            <div>ผลการประเมินคุณลักษณะอันพึงประสงค์: <b>{a?.characteristicsOverall || '—'}</b></div>
            <div>ผลการประเมินกิจกรรมพัฒนาผู้เรียน: <b>{a?.learnerActivities || '—'}</b></div>
            <div style={{ marginTop: 4, fontWeight: 700 }}>ผลการเรียนเฉลี่ยตลอดหลักสูตร (GPAX): {t.gpax !== null ? t.gpax.toFixed(2) : '—'}</div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 13 }}>
            <div style={{ borderBottom: '1px dotted #333', width: 210, margin: '18px auto 6px' }} />
            ({s.directorName || '...........................'})<br /><b>นายทะเบียน</b>
          </div>
        </div>
      </div>
    );
  }

  // ── ปพ.2 ประกาศนียบัตร (รูปแบบตามแบบราชการ · ใช้โลโก้โรงเรียนแทนตราควบคุม) ──
  function PP2() {
    const level = classroomLabel.startsWith('ม.6')
      ? 'ระดับมัธยมศึกษาตอนปลาย'
      : classroomLabel.startsWith('ม.3')
        ? 'ระดับมัธยมศึกษาตอนต้น (จบการศึกษาภาคบังคับ)'
        : `ระดับชั้น ${classroomLabel}`;
    return (
      <div style={{ border: '3px double #6b4f2f', padding: 6 }}>
        <div style={{ border: '1px solid #b79a6b', padding: '26px 42px', textAlign: 'center', position: 'relative', minHeight: 430 }}>
          <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 11, textAlign: 'left', color: '#333', lineHeight: 1.6 }}>ปพ.2 : บ<br />ชุดที่ ..........<br />เลขที่ ..........</div>
          <div style={{ width: 58, height: 58, margin: '2px auto 6px', border: '1px dashed #bbb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#999', textAlign: 'center', lineHeight: 1.1 }}>โลโก้<br />โรงเรียน</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{s.schoolName || 'ชื่อสถานศึกษา'}</div>
          <div style={{ fontSize: 15, marginTop: 6 }}>ประกาศนียบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า</div>
          <div style={{ fontSize: 25, fontWeight: 800, margin: '14px 0' }}>{student!.name}</div>
          <div style={{ fontSize: 13.5, lineHeight: 2.2 }}>
            เลขประจำตัวนักเรียน {student!.code}<br />
            เป็นผู้สำเร็จการศึกษาตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน <b>{level}</b><br />
            จาก <b>{s.schoolName || 'สถานศึกษา'}</b>{s.address ? ` ${s.address}` : ''} · ปีการศึกษา {academicYear}
          </div>
          <div style={{ fontSize: 13.5, marginTop: 12 }}>ให้ไว้ ณ วันที่ {meta.issueDate}</div>
          <div style={{ fontSize: 15, marginTop: 6 }}>ขอให้มีความสุขสวัสดิ์เจริญยิ่ง</div>
          <div style={{ marginTop: 30, fontSize: 13 }}>
            <div style={{ borderBottom: '1px dotted #333', width: 220, margin: '0 auto 6px' }} />
            ({s.directorName || '...........................'})<br />{s.directorTitle}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(18,10,4,0.65)', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '1.25rem' }}>
      {/* แถบเครื่องมือ (ไม่พิมพ์) */}
      <div className="pp-noprint" style={{ width: 'min(820px, 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, color: 'var(--cream)' }}>
        <div style={{ fontWeight: 700 }}>{doc.name} — {doc.title}{student ? ` · ${student.name}` : ''}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ padding: '0.55rem 1.1rem', background: 'var(--cream)', color: 'var(--brown-dark)', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>พิมพ์ / บันทึก PDF</button>
          <button onClick={onClose} style={{ padding: '0.55rem 1rem', background: 'transparent', color: 'var(--cream)', border: '1px solid var(--cream)', borderRadius: 8, cursor: 'pointer' }}>ปิด</button>
        </div>
      </div>
      {/* กระดาษเอกสาร */}
      <div className="pp-paper" style={{ width: 'min(820px, 100%)', background: '#fff', color: '#1a1a1a', padding: '2.4rem 2.6rem', borderRadius: 4, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', fontFamily: "'Sarabun','TH Sarabun New','TH SarabunPSK',sans-serif", fontSize: 14 }}>
        {doc.id === 'pp1' && student ? <PP1 /> : doc.id === 'pp2' && student ? <PP2 /> : (
          <>
            <SchoolHeader />
            <Body />
            <div style={{ textAlign: 'right', fontSize: 11, color: '#888', marginTop: 24 }}>ออกเอกสาร ณ วันที่ {meta.issueDate} · โดยระบบ EduFlow{s.note ? ` · ${s.note}` : ''}</div>
          </>
        )}
      </div>
    </div>
  );
}
