'use client';

/**
 * ตั้งค่าเอกสารผลการเรียน (ปพ.) — หัวกระดาษ / ผู้ลงนาม / ตัวเลือกการแสดงผล
 *
 * ตอนนี้เก็บใน localStorage (eduflow_doc_settings) แบบเดียวกับส่วนอื่นของแอป
 * TODO(PostgreSQL): ย้ายไปตาราง school_doc_settings (คีย์ตามโรงเรียน)
 * ค่าเหล่านี้เตรียมไว้ให้หน้า "เอกสารผลการเรียน (ปพ.)" ดึงไปประกอบหัวเอกสารตอนออกไฟล์
 */

import { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';

const STORAGE_KEY = 'eduflow_doc_settings';

export interface DocSettings {
  schoolName: string;
  address: string;
  directorName: string;
  directorTitle: string;
  academicYear: string;
  showLogo: boolean;
  showSignature: boolean;
  note: string;
}

const DEFAULTS: DocSettings = {
  schoolName: '', address: '', directorName: '', directorTitle: 'ผู้อำนวยการโรงเรียน',
  academicYear: '2567', showLogo: true, showSignature: true, note: '',
};

export function getDocSettings(): DocSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return DEFAULTS; }
}

export default function DocSettingsView({ defaultSchool = '' }: { defaultSchool?: string }) {
  const { showToast } = useToast();
  const [form, setForm] = useState<DocSettings>(DEFAULTS);

  // โหลดค่าที่เคยบันทึก — ถ้ายังไม่เคยตั้งชื่อโรงเรียน ใช้ชื่อจากโปรไฟล์ครูเป็นค่าตั้งต้น
  useEffect(() => {
    const saved = getDocSettings();
    setForm({ ...saved, schoolName: saved.schoolName || defaultSchool });
  }, [defaultSchool]);

  const set = <K extends keyof DocSettings>(k: K, v: DocSettings[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  function save() {
    if (!form.schoolName.trim()) { showToast('กรุณากรอกชื่อโรงเรียนก่อน'); return; }
    if (!form.directorName.trim()) { showToast('กรุณากรอกชื่อผู้ลงนามก่อน'); return; }
    if (form.academicYear.trim() && !/^\d{4}$/.test(form.academicYear.trim())) {
      showToast('ปีการศึกษาต้องเป็นตัวเลข 4 หลัก (พ.ศ.) เช่น 2567'); return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    showToast('บันทึกการตั้งค่าเอกสารแล้ว — จะใช้กับเอกสาร ปพ. ที่ออกจากระบบ');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border)',
    borderRadius: 10, background: 'var(--warm-white)', fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.9rem', color: 'var(--text-body)', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: '0.35rem', display: 'block',
  };
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>{label}</label>{children}</div>
  );

  return (
    <div className="panel-shell">
      <div className="panel-card">
        <div className="panel-head">
          <h2 className="panel-title">ตั้งค่า<em>เอกสาร</em></h2>
          <p className="panel-sub">กำหนดหัวเอกสาร ปพ. · ผู้ลงนาม · ตัวเลือกการแสดงผล — ใช้ตอนออกเอกสารผลการเรียน</p>
        </div>

        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div className="stu-info-card" style={{ marginBottom: '1.25rem' }}>
            <div className="stu-info-card-title">หัวเอกสาร</div>
            <Field label="ชื่อโรงเรียน *">
              <input style={inputStyle} value={form.schoolName} onChange={e => set('schoolName', e.target.value)} placeholder="เช่น โรงเรียนทดสอบ EduFlow" />
            </Field>
            <Field label="ที่อยู่โรงเรียน">
              <input style={inputStyle} value={form.address} onChange={e => set('address', e.target.value)} placeholder="เช่น เขตบางนา กรุงเทพฯ" />
            </Field>
            <Field label="ปีการศึกษา">
              <input style={inputStyle} value={form.academicYear} onChange={e => set('academicYear', e.target.value)} placeholder="2567" />
            </Field>
          </div>

          <div className="stu-info-card" style={{ marginBottom: '1.25rem' }}>
            <div className="stu-info-card-title">ผู้ลงนาม</div>
            <Field label="ชื่อผู้ลงนาม *">
              <input style={inputStyle} value={form.directorName} onChange={e => set('directorName', e.target.value)} placeholder="เช่น นายสมชาย ใจดี" />
            </Field>
            <Field label="ตำแหน่ง">
              <input style={inputStyle} value={form.directorTitle} onChange={e => set('directorTitle', e.target.value)} placeholder="ผู้อำนวยการโรงเรียน" />
            </Field>
          </div>

          <div className="stu-info-card" style={{ marginBottom: '1.25rem' }}>
            <div className="stu-info-card-title">ตัวเลือกการแสดงผล</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--text-body)', cursor: 'pointer', padding: '0.35rem 0' }}>
              <input type="checkbox" checked={form.showLogo} onChange={e => set('showLogo', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--brown-deep)' }} />
              แสดงตราโรงเรียนบนหัวเอกสาร
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--text-body)', cursor: 'pointer', padding: '0.35rem 0' }}>
              <input type="checkbox" checked={form.showSignature} onChange={e => set('showSignature', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--brown-deep)' }} />
              แสดงช่องลายเซ็นผู้ลงนามท้ายเอกสาร
            </label>
            <Field label="หมายเหตุท้ายเอกสาร (ถ้ามี)">
              <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={form.note} onChange={e => set('note', e.target.value)} placeholder="เช่น เอกสารนี้ออกโดยระบบ EduFlow" />
            </Field>
          </div>

          <button className="ez-btn ez-btn-primary" style={{ width: '100%', minHeight: 48, fontSize: '0.95rem' }} onClick={save}>
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>
    </div>
  );
}
