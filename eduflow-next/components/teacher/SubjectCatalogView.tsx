'use client';

/**
 * จัดการวิชา (คลังรายวิชา) — ขั้นที่ 1 ของ pipeline
 * เพิ่ม/แก้ไข/ลบ นิยามวิชา: รหัส · ชื่อไทย · ชื่ออังกฤษ · หน่วยกิต · กลุ่มสาระ · ประเภท · วิธีตัดสินผล
 * เสร็จแล้วกด "ไปต่อที่แผนการเรียน" เพื่อนำวิชาไปจัดลงวัน/เวลา
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getCatalogSubjects, createCatalogSubject, updateCatalogSubject, deleteCatalogSubject, canManageSubjects,
  type CatalogSubject, type SubjectInput,
} from '@/lib/api/subject-catalog.store';
import { SUBJECT_KEYS, SUBJECT_TYPES, defaultGradingMode, suggestSubjectCode, type SubjectType } from '@/lib/api/schedule.store';
import type { GradingMode } from '@/lib/api/academic.store';
import { subjectColor } from '@/lib/ui/subject-colors';
import { useDialog } from '@/context/DialogContext';

interface Props { onGoToPlan?: () => void }

const emptyForm = (): SubjectInput => ({
  code: '', name: '', nameEn: '', credit: 1.0, subjectKey: 'math', subjectType: 'พื้นฐาน', gradingMode: 'numeric',
});

const TYPE_BADGE: Record<SubjectType, string> = {
  'พื้นฐาน': 'sched-type-core', 'เพิ่มเติม': 'sched-type-elective',
  'กิจกรรมพัฒนาผู้เรียน': 'sched-type-activity', 'ชุมนุม/ชมรม': 'sched-type-club',
};

export default function SubjectCatalogView({ onGoToPlan }: Props) {
  const { confirm, notify } = useDialog();
  const allowed = canManageSubjects();

  const [subjects, setSubjects] = useState<CatalogSubject[]>([]);
  const [form, setForm] = useState<SubjectInput>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(() => setSubjects(getCatalogSubjects()), []);
  useEffect(() => { refresh(); }, [refresh]);

  /** เปลี่ยนกลุ่มสาระ/ประเภท → เดารหัส + วิธีตัดสินผลให้ (แก้ทับได้) */
  function autoFill(next: Partial<SubjectInput>) {
    setForm(prev => {
      const m = { ...prev, ...next };
      if (next.subjectType) m.gradingMode = defaultGradingMode(next.subjectType);
      if ((next.subjectKey || next.subjectType) && !editingId) {
        m.code = suggestSubjectCode(m.subjectKey, 'ม.1', m.subjectType);
        if (next.subjectKey && !prev.name) m.name = SUBJECT_KEYS.find(s => s.key === next.subjectKey)?.label || '';
      }
      return m;
    });
  }

  async function submit() {
    setError('');
    if (!form.code.trim() || !form.name.trim()) { notify({ title: 'ข้อมูลไม่ครบ', message: 'กรอกรหัสวิชาและชื่อวิชา (ไทย) ก่อน', variant: 'warning' }); return; }
    if (editingId) {
      if (!(await confirm({ title: 'บันทึกการแก้ไขวิชา?', message: <><b>{form.name}</b> ({form.code})</>, confirmText: 'บันทึกการแก้ไข' }))) return;
      if (updateCatalogSubject(editingId, form)) { setEditingId(null); setForm(emptyForm()); refresh(); notify({ title: 'แก้ไขวิชาแล้ว', message: `${form.name} (${form.code})`, variant: 'success' }); }
      else { setError('บันทึกไม่สำเร็จ (รหัสวิชาอาจซ้ำ หรือไม่มีสิทธิ์)'); notify({ title: 'บันทึกไม่สำเร็จ', message: 'รหัสวิชาอาจซ้ำ หรือไม่มีสิทธิ์', variant: 'danger' }); }
      return;
    }
    if (!(await confirm({ title: 'เพิ่มวิชาเข้าคลัง?', message: <><b>{form.name}</b> ({form.code}) · {form.subjectType}</>, confirmText: 'เพิ่มวิชา' }))) return;
    const r = createCatalogSubject(form);
    if (!r.ok) { setError(r.error); notify({ title: 'เพิ่มวิชาไม่สำเร็จ', message: r.error, variant: 'danger' }); return; }
    setForm(emptyForm());
    refresh();
    notify({ title: 'เพิ่มวิชาแล้ว', message: <>{r.subject.name} ({r.subject.code}) เข้าคลังเรียบร้อย</>, variant: 'success' });
  }

  function startEdit(s: CatalogSubject) {
    setEditingId(s.id);
    setError('');
    setForm({ code: s.code, name: s.name, nameEn: s.nameEn, credit: s.credit, subjectKey: s.subjectKey, subjectType: s.subjectType, gradingMode: s.gradingMode });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(s: CatalogSubject) {
    if (!(await confirm({ title: 'ลบวิชาออกจากคลัง?', message: <><b>{s.name}</b> ({s.code})<br /><span style={{ color: 'var(--text-muted)' }}>วิชาที่จัดลงตารางสอนไว้แล้วจะไม่ถูกลบ</span></>, variant: 'danger', confirmText: 'ลบวิชา' }))) return;
    deleteCatalogSubject(s.id);
    if (editingId === s.id) { setEditingId(null); setForm(emptyForm()); }
    refresh();
    notify({ title: 'ลบวิชาแล้ว', message: `${s.name} (${s.code})`, variant: 'success' });
  }

  if (!allowed) {
    return (
      <div className="panel-shell">
        <div className="panel-card">
          <div className="perm-denied">
            <span className="perm-denied-icon">🔒</span>
            บัญชีของท่านไม่ได้รับสิทธิ์ <b>จัดการรายวิชา</b><br />
            ติดต่อผู้ดูแลระบบเพื่อขอเปิดสิทธิ์ “จัดการรายวิชา (คลังวิชา)”
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-shell panel-shell-wide">
      <div className="panel-card">
        <div className="panel-head">
          <h2 className="panel-title">จัดการ<em>รายวิชา</em></h2>
          <p className="panel-sub">
            ขั้นที่ 1 — สร้างคลังรายวิชา (รหัส · ชื่อไทย · ชื่ออังกฤษ · หน่วยกิต) ·
            เสร็จแล้วนำไปจัดลงวัน/เวลาในหน้าแผนการเรียน
          </p>
        </div>

        {/* ── ฟอร์มเพิ่ม/แก้ไขวิชา ── */}
        <div className="panel-body" style={{ marginBottom: '1.25rem' }}>
          <div className="stu-info-card-title">{editingId ? '✏️ แก้ไขวิชา' : '➕ เพิ่มวิชาใหม่'}</div>
          {error && <div className="sched-error">{error}</div>}
          <div className="sched-form-grid">
            <div className="sched-form-field">
              <label className="sched-form-label">กลุ่มสาระ</label>
              <select className="sched-select" value={form.subjectKey} onChange={e => autoFill({ subjectKey: e.target.value })}>
                {SUBJECT_KEYS.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
              </select>
            </div>
            <div className="sched-form-field">
              <label className="sched-form-label">ประเภทวิชา</label>
              <select className="sched-select" value={form.subjectType} onChange={e => autoFill({ subjectType: e.target.value as SubjectType })}>
                {SUBJECT_TYPES.map(t => <option key={t} value={t}>วิชา{t}</option>)}
              </select>
            </div>
            <div className="sched-form-field">
              <label className="sched-form-label">รหัสวิชา *</label>
              <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={form.code} placeholder="เช่น ค21101" onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            </div>
            <div className="sched-form-field">
              <label className="sched-form-label">ชื่อวิชา (ไทย) *</label>
              <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={form.name} placeholder="เช่น คณิตศาสตร์พื้นฐาน" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="sched-form-field">
              <label className="sched-form-label">ชื่อวิชา (อังกฤษ)</label>
              <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} value={form.nameEn} placeholder="e.g. Basic Mathematics" onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} />
            </div>
            <div className="sched-form-field">
              <label className="sched-form-label">หน่วยกิต</label>
              <input className="ez-input" style={{ minHeight: 44, fontSize: '0.92rem' }} type="number" min={0} step={0.5} value={form.credit} onChange={e => setForm(f => ({ ...f, credit: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="sched-form-field">
              <label className="sched-form-label">การตัดสินผล</label>
              <select className="sched-select" value={form.gradingMode} onChange={e => setForm(f => ({ ...f, gradingMode: e.target.value as GradingMode }))}>
                <option value="numeric">คิดเกรด 4 – 0</option>
                <option value="symbol">ไม่คิดเกรด (ผ/มผ)</option>
              </select>
            </div>
          </div>
          <div className="sched-modal-actions">
            <button className="ez-btn ez-btn-primary" onClick={submit}>{editingId ? '💾 บันทึกการแก้ไข' : '➕ เพิ่มวิชาเข้าคลัง'}</button>
            {editingId && <button className="ez-btn ez-btn-ghost" onClick={() => { setEditingId(null); setForm(emptyForm()); setError(''); }}>ยกเลิก</button>}
          </div>
        </div>

        {/* ── รายการวิชาในคลัง ── */}
        <div className="panel-body">
          <div className="stu-info-card-title">วิชาในคลัง ({subjects.length})</div>
          {subjects.length === 0 ? (
            <div className="stu-empty">ยังไม่มีวิชาในคลัง — เพิ่มด้านบน</div>
          ) : (
            <div className="sched-scroll">
              <table className="sched-course-table">
                <thead>
                  <tr>
                    <th>รหัสวิชา</th>
                    <th style={{ textAlign: 'left' }}>ชื่อวิชา</th>
                    <th style={{ textAlign: 'left' }}>English</th>
                    <th>ประเภท</th>
                    <th>หน่วยกิต</th>
                    <th>เกรด</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(s => (
                    <tr key={s.id}>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: 'var(--brown-deep)' }}>{s.code}</td>
                      <td><span className="sched-course-dot" style={{ background: subjectColor(s.subjectKey).dot }} />{s.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{s.nameEn || '—'}</td>
                      <td style={{ textAlign: 'center' }}><span className={`sched-type-badge ${TYPE_BADGE[s.subjectType]}`}>{s.subjectType}</span></td>
                      <td style={{ textAlign: 'center' }}>{s.gradingMode === 'symbol' ? '—' : s.credit.toFixed(1)}</td>
                      <td style={{ textAlign: 'center' }}>{s.gradingMode === 'symbol' ? 'ผ/มผ' : '4–0'}</td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button className="ez-btn ez-btn-ghost acad-btn" style={{ marginRight: 4 }} onClick={() => startEdit(s)}>✏️</button>
                        <button className="ez-btn ez-btn-ghost acad-btn" style={{ color: 'var(--absent)' }} onClick={() => remove(s)}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── ไปต่อที่แผน ── */}
        {onGoToPlan && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button className="ez-btn ez-btn-primary" style={{ minWidth: 280 }} onClick={onGoToPlan}>
              จัดวิชาเสร็จแล้ว — ไปต่อที่แผนการเรียน →
            </button>
            <div className="sched-log-meta" style={{ marginTop: '0.5rem' }}>นำวิชาในคลังไปกำหนดวัน/เวลา แล้วตารางสอนจะสร้างให้อัตโนมัติ</div>
          </div>
        )}
      </div>
    </div>
  );
}
